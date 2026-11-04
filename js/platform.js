// Обертка над SDK площадок. Вся игра дергает только PF.*, чтобы не плодить if-ы по коду.
// Сборщик подставляет нужный скрипт SDK в index.html и меняет CFG.platform.
var PF = {
  kind: CFG.platform,
  ready: false,
  ysdk: null,
  cg: null,
  gp: null,
  gpush: null,            // SDK GamePush (дистрибуция: Пикабу, VK, OK, Y8 и др.)
  pkb: null,              // SDK Пикабу Игр напрямую (сборка pikabu на своем хостинге)
  fsGap: 0,               // кулдаун межстраничной площадки, если строже нашего
  player: null,
  lb: null,
  lang: 'en',
  authorized: false,
  playerName: '',
  playerPhoto: '',
  lastFullscreen: 0,      // время последней межстраничной, секунды от старта
  bootTime: 0,
  adRunning: false,
  // CrazyGames на Basic Launch рекламу не крутит вообще, а с блокировщиком она
  // не придет никогда. В обоих случаях кнопки AD не должны висеть впустую.
  adsOff: '',             // '' | 'basic' | 'adblock' | 'free'
  onAdStart: null,        // ставит игру на паузу
  onAdSound: null,        // глушит и возвращает звук
  onAdEnd: null,
  onAdsOff: null,
  muteAudio: false,       // звук выключен кнопкой самой площадки
  onMuteAudio: null,
  net: null,              // 'gd' | 'gm' - сети-раздатчики, у них общая схема событий
  _netWait: null,         // ожидание текущего ролика в сети
  // Сколько раз подряд рекламы не оказалось. На второй пустой раз награду
  // отдаем без ролика: кнопка-пустышка хуже лишнего ящика лома, а ролик мы все
  // равно спрашиваем на каждое нажатие - появится заполнение, будет и показ.
  noFill: 0,

  now: function () { return performance.now() / 1000; },

  init: function (done) {
    this.bootTime = this.now();
    // чтобы не дергать рекламу сразу после запуска
    this.lastFullscreen = this.now() - CFG.ads.fullscreenGap + CFG.ads.firstFullscreenAfter;

    var self = this;
    var fallback = function () {
      self.kind = 'local';
      self.lang = I18N.pick(navigator.language);
      self.ready = true;
      done();
    };

    if (this.kind === 'yandex') {
      if (typeof YaGames === 'undefined') { fallback(); return; }
      YaGames.init({ adv: { onAdvClose: function () {} } }).then(function (sdk) {
        self.ysdk = sdk;
        try { self.lang = I18N.pick(sdk.environment.i18n.lang); } catch (e) { self.lang = 'en'; }
        self.ready = true;
        // игрока и лидерборды тянем параллельно, игру не блокируем
        sdk.getPlayer({ scopes: false }).then(function (p) {
          self.player = p;
          try {
            self.authorized = p.getMode() !== 'lite';
            self.playerName = p.getName() || '';
            self.playerPhoto = p.getPhoto ? p.getPhoto('small') : '';
          } catch (e) {}
        }).catch(function () {});
        sdk.getLeaderboards().then(function (lb) { self.lb = lb; }).catch(function () {});
        done();
      }).catch(fallback);
      return;
    }

    // Сборка для друзей и тестов: рекламы нет совсем, награды за нее
    // выдаются сразу. Дальше живет как обычная локальная.
    if (this.kind === 'friend') {
      this.adsOff = 'free';
      fallback();
      return;
    }

    if (this.kind === 'gamepix') {
      if (typeof GamePix === 'undefined') { fallback(); return; }
      this.gp = GamePix;
      // loaded() обязателен и ровно один раз: без него остальные методы SDK
      // возвращают GAMEPIX_LOADED_NOT_CALLED.
      try { GamePix.loading(100); } catch (e) {}
      try { GamePix.loaded(); } catch (e) {}
      // Их страница шлет игре PAUSE/RESUME/SOUNDOFF/SOUNDON (уход со страницы,
      // оверлей рекламы, их кнопка звука), SDK зовет эти функции. Без них в
      // консоли "pause not defined" и звук во время их рекламы не глохнет.
      try {
        var hooks = {
          pause: function () {
            if (Game.running && !Game.paused) { self.pausedByPf = true; UI.togglePause(); }
          },
          resume: function () {
            if (self.pausedByPf && Game.running && Game.paused) UI.togglePause();
            self.pausedByPf = false;
          },
          soundOff: function () { self._setMute(true); },
          soundOn: function () { self._setMute(false); }
        };
        for (var hk in hooks) {
          GamePix[hk] = hooks[hk];
          if (GamePix.on && typeof GamePix.on === 'object') GamePix.on[hk] = hooks[hk];
        }
      } catch (e) {}
      try { self.lang = I18N.pick(GamePix.lang()); } catch (e) { self.lang = 'en'; }
      self.ready = true;
      done();
      return;
    }

    // Сети-раздатчики: их SDK грузится сниппетом из index.html (см. pack.ps1),
    // события копятся в PF_EVENTS, пока наших скриптов еще нет. Площадки у них
    // чужие и разные, язык берем из браузера.
    if (this.kind === 'gamedistribution' || this.kind === 'gamemonetize') {
      this.net = this.kind === 'gamedistribution' ? 'gd' : 'gm';
      this.lang = I18N.pick(navigator.language);
      var queued = window.PF_EVENTS || [];
      window.PF_EVENTS = [];
      for (var qi = 0; qi < queued.length; qi++) this.onSdkEvent(queued[qi]);
      this.ready = true;
      done();
      return;
    }

    if (this.kind === 'crazygames') {
      if (!window.CrazyGames || !window.CrazyGames.SDK) { fallback(); return; }
      this.cg = window.CrazyGames.SDK;
      var boot = function () {
        self.ready = true;
        try {
          var sys = self.cg.user;
          // язык по их требованию берем из locale, по умолчанию английский
          var loc = sys && sys.systemInfo ? String(sys.systemInfo.locale || '') : '';
          self.lang = I18N.pick(loc);
          // у CrazyGames своя кнопка звука, на Full ее обязаны слушаться
          var g = self.cg.game;
          if (g && g.settings) self._setMute(g.settings.muteAudio);
          if (g && g.addSettingsChangeListener) {
            g.addSettingsChangeListener(function (s) { self._setMute(s && s.muteAudio); });
          }
          if (self.cg.ad && self.cg.ad.hasAdblock) {
            self.cg.ad.hasAdblock().then(function (b) { if (b) self.setAdsOff('adblock'); }).catch(function () {});
          }
          if (sys && sys.getUser) {
            sys.getUser().then(function (u) { if (u) { self.playerName = u.username || ''; self.playerPhoto = u.profilePictureUrl || ''; self.authorized = true; } }).catch(function () {});
          }
        } catch (e) {}
        done();
      };
      if (this.cg.init) { this.cg.init().then(boot).catch(fallback); } else { boot(); }
      try { this.cg.game.loadingStart(); } catch (e) {}
      return;
    }

    // GamePush: их загрузчик сам тянет SDK и зовет window.onGPInit(gp), когда
    // проект поднялся. Сниппет в index.html (см. pack.ps1) кладет gp в
    // window.GP_READY, если мы еще не загрузились. Сборка без ключей или
    // загрузчик, задушенный блокировщиком: ждем ads.timeout и живем как для
    // друзей, награды сразу, иначе кнопки AD висят впустую.
    if (this.kind === 'gamepush') {
      if (!window.onGPInit) { this.adsOff = 'free'; fallback(); return; }
      var gpTimer = setTimeout(function () {
        if (self.ready) return;
        self.onGpInit = null;
        self.adsOff = 'free';
        fallback();
      }, CFG.ads.timeout * 1000);
      this.onGpInit = function (gp) {
        if (self.ready) return;
        clearTimeout(gpTimer);
        self.onGpInit = null;
        self._gpBoot(gp, done);
      };
      if (window.GP_READY) this.onGpInit(window.GP_READY);
      return;
    }

    // Пикабу Игры: SDK грузится async и работает только внутри их iframe (и в
    // тестовой среде Студии). Открыли сборку напрямую (наш GitHub Pages) -
    // живем как для друзей. Сниппет в index.html (pack.ps1) зовет
    // window.onPkbLoad(ok) по onload/onerror и запоминает результат в PKB_LOADED.
    if (this.kind === 'pikabu') {
      var pkFree = function () { self.onPkbLoad = null; self.adsOff = 'free'; fallback(); };
      if (typeof window.onPkbLoad !== 'function' || window.top === window) { pkFree(); return; }
      var pkTimer = setTimeout(function () { if (!self.ready) pkFree(); }, CFG.ads.timeout * 1000);
      this.onPkbLoad = function (ok) {
        if (self.ready) return;
        if (!ok || typeof PkbSDK === 'undefined') { clearTimeout(pkTimer); pkFree(); return; }
        try {
          PkbSDK.init().then(function (sdk) {
            if (self.ready) return;
            clearTimeout(pkTimer);
            self.onPkbLoad = null;
            self._pkbBoot(sdk, done);
          }).catch(function () { if (!self.ready) { clearTimeout(pkTimer); pkFree(); } });
        } catch (e) { clearTimeout(pkTimer); pkFree(); }
      };
      if (window.PKB_LOADED !== undefined) this.onPkbLoad(window.PKB_LOADED);
      return;
    }

    fallback();
  },

  _pkbBoot: function (sdk, done) {
    var self = this;
    this.pkb = sdk;
    this.kind = 'pikabu';
    // площадка русская, интерфейс по умолчанию русский (их требование)
    this.lang = 'ru';
    // у них повторная межстраничная не раньше чем через 120 с, иначе COOLDOWN_ACTIVE
    this.fsGap = Math.max(CFG.ads.fullscreenGap, 125);
    this._pkbPlayer();
    try { sdk.on('userAuthorized', function () { self._pkbPlayer(); }); } catch (e) {}
    this.ready = true;
    done();
  },

  _pkbPlayer: function () {
    try {
      var p = this.pkb.player;
      this.authorized = !!p.isAuthorized;
      this.playerName = p.name || '';
      this.playerPhoto = p.avatar || '';
    } catch (e) {}
  },

  _gpBoot: function (gp, done) {
    var self = this;
    this.gpush = gp;
    this.kind = 'gamepush';
    try { this.lang = I18N.pick(gp.language); } catch (e) { this.lang = 'en'; }
    try {
      // площадка сама ставит игру на паузу (уход со страницы, их оверлей)
      gp.on('pause', function () {
        if (Game.running && !Game.paused) { self.pausedByPf = true; UI.togglePause(); }
      });
      gp.on('resume', function () {
        if (self.pausedByPf && Game.running && Game.paused) UI.togglePause();
        self.pausedByPf = false;
      });
      if (gp.ads && gp.ads.isAdblockEnabled) this.setAdsOff('adblock');
      // был ли показ, приходит событием; промис showFullscreen может
      // закрыться и без него, поэтому флаг держим здесь
      gp.ads.on('fullscreen:close', function (ok) { self._gpFsOk = !!ok; });
      // игрока ждем в фоне: облачный сейв подтянет PF.load, когда дойдет
      if (gp.player && gp.player.ready) {
        gp.player.ready.then(function () {
          try {
            self.authorized = !!gp.player.isLoggedIn;
            self.playerName = gp.player.get('name') || '';
            self.playerPhoto = gp.player.get('avatar') || '';
          } catch (e) {}
        }).catch(function () {});
      }
    } catch (e) {}
    this.ready = true;
    done();
  },

  _setMute: function (m) {
    this.muteAudio = !!m;
    if (this.onMuteAudio) this.onMuteAudio(this.muteAudio);
  },

  // События сетей-раздатчиков. Схема у GameDistribution и GameMonetize одна:
  // SDK_GAME_PAUSE - ролик пошел, игру на паузу и в тишину; SDK_GAME_START -
  // ролик кончился или его не было; SDK_REWARDED_WATCH_COMPLETE - досмотрен
  // (только у GameDistribution; у GameMonetize отдельного ролика за награду
  // нет, крутим ту же межстраничную и досмотр считаем по паре пауза-старт).
  // Преролл может прийти раньше нашего запроса, поэтому пауза и без ожидания.
  onSdkEvent: function (e) {
    var name = e && e.name, w = this._netWait;
    if (name === 'SDK_GAME_PAUSE') {
      if (!this.adRunning) this._adStart(false);
      if (w) w.started();
    } else if (name === 'SDK_REWARDED_WATCH_COMPLETE') {
      if (w) w.rewarded = true;
    } else if (name === 'SDK_GAME_START') {
      if (w) w.done(); else if (this.adRunning) this._adEnd();
    }
  },

  // Запрос ролика в сети. kind: 'inter' | 'reward', cb(shown, rewarded).
  // У GameDistribution есть промис, у GameMonetize только события: ждем пару
  // пауза-старт, а если ролик не начался за timeout, считаем, что его нет.
  _netAd: function (kind, cb) {
    var self = this, seen = false, over = false;
    var end = function (shown, rewarded) {
      if (over) return;
      over = true;
      clearTimeout(startT);
      if (self._netWait === w) self._netWait = null;
      cb(shown, rewarded);
    };
    var startT = setTimeout(function () { if (!seen) end(false, false); }, CFG.ads.timeout * 1000);
    var w = this._netWait = {
      rewarded: false,
      started: function () { seen = true; clearTimeout(startT); },
      done: function () { end(seen, w.rewarded || (seen && self.net === 'gm')); }
    };
    try {
      if (this.net === 'gd') {
        if (!window.gdsdk) { end(false, false); return; }
        var p = kind === 'reward' ? window.gdsdk.showAd('rewarded') : window.gdsdk.showAd();
        p.then(function () {
          // событие о досмотре приходит до промиса, но на всякий случай даем тик
          setTimeout(function () { end(true, w.rewarded); }, 50);
        }).catch(function () { end(false, false); });
      } else {
        if (!window.sdk || !window.sdk.showBanner) { end(false, false); return; }
        window.sdk.showBanner();
      }
    } catch (e) { end(false, false); }
  },

  _consolation: function () { this.noFill++; return this.noFill >= 2; },

  // Загрузка кончилась: у Яндекса без этого вызова крутилка висит поверх игры.
  loadingDone: function () {
    try {
      if (this.ysdk && this.ysdk.features && this.ysdk.features.LoadingAPI) this.ysdk.features.LoadingAPI.ready();
      if (this.cg) this.cg.game.loadingStop();
      if (this.gpush) this.gpush.gameStart();
      if (this.pkb) this.pkb.gameStarted();
    } catch (e) {}
  },

  gameplayStart: function () {
    try {
      if (this.ysdk && this.ysdk.features && this.ysdk.features.GameplayAPI) this.ysdk.features.GameplayAPI.start();
      if (this.cg) this.cg.game.gameplayStart();
      if (this.gpush) this.gpush.gameplayStart();
    } catch (e) {}
  },

  gameplayStop: function () {
    try {
      if (this.ysdk && this.ysdk.features && this.ysdk.features.GameplayAPI) this.ysdk.features.GameplayAPI.stop();
      if (this.cg) this.cg.game.gameplayStop();
      if (this.gpush) this.gpush.gameplayStop();
    } catch (e) {}
  },

  // ---------- реклама ----------

  fullscreenLeft: function () {
    return Math.max(0, Math.ceil((this.fsGap || CFG.ads.fullscreenGap) - (this.now() - this.lastFullscreen)));
  },
  // where: 'run' - посреди забега, 'nav' - на кнопке навигации. CrazyGames
  // пускает межстраничную только после смерти или на смене уровня, поэтому
  // там такие места просто пропускаем.
  canFullscreen: function (where) {
    if (this.adsOff) return false;
    if (this.cg && where) return false;
    return !this.adRunning && this.fullscreenLeft() === 0;
  },

  // Можно ли вообще предлагать ролик за награду. С блокировщиком кнопки
  // прячем, иначе они жмутся и ничего не дают, за это CrazyGames отклоняет.
  canReward: function () { return this.adsOff !== 'adblock'; },

  setAdsOff: function (why) {
    if (this.adsOff === why) return;
    this.adsOff = why;
    if (this.onAdsOff) this.onAdsOff(why);
  },

  // код ошибки из adError у CrazyGames
  _cgError: function (err) {
    var code = err && err.code;
    if (code === 'adsDisabledBasicLaunch') this.setAdsOff('basic');
    else if (code === 'adblock') this.setAdsOff('adblock');
  },

  // Если SDK площадки не ответил, игра не должна остаться с заглушкой на
  // экране навсегда. Сторож добивает вызов и возвращает управление.
  _guard: function (fn, sec) {
    var done = false;
    var timer = setTimeout(function () {
      if (done) return;
      done = true;
      fn(true);
    }, sec * 1000);
    return function (fromTimeout) {
      if (done) return false;
      done = true;
      clearTimeout(timer);
      return true;
    };
  },

  // lateMute: звук глушим не сразу, а когда ролик реально пошел. CrazyGames
  // этого требует: запрос может вернуться пустым, и дерганье звука без
  // рекламы на экране выглядит как баг.
  _adStart: function (lateMute) {
    this.adRunning = true;
    if (this.onAdStart) this.onAdStart();
    if (!lateMute) this._sound(false);
  },
  _sound: function (on) {
    if (this.onAdSound) this.onAdSound(on);
  },
  _adEnd: function () {
    this.adRunning = false;
    this._sound(true);
    if (this.onAdEnd) this.onAdEnd();
  },

  // Межстраничная. done() дергается всегда, даже если рекламы не было.
  showFullscreen: function (done, where) {
    done = done || function () {};
    if (!this.canFullscreen(where)) { done(false); return; }
    this.lastFullscreen = this.now();
    var self = this;
    var raw = function (shown) {
      self._adEnd();
      done(!!shown);
    };
    var pass = this._guard(function () { raw(false); }, CFG.ads.timeout);
    var finish = function (shown) { if (pass()) raw(shown); };
    this._adStart(!!this.cg);

    if (this.ysdk) {
      try {
        this.ysdk.adv.showFullscreenAdv({
          callbacks: {
            onClose: function (wasShown) { finish(wasShown); },
            onError: function () { finish(false); }
          }
        });
      } catch (e) { finish(false); }
      return;
    }
    if (this.cg) {
      try {
        this.cg.ad.requestAd('midgame', {
          adStarted: function () { self._sound(false); },
          adFinished: function () { finish(true); },
          adError: function (err) { self._cgError(err); finish(false); }
        });
      } catch (e) { finish(false); }
      return;
    }
    if (this.pkb) {
      var pfs = this.pkb.ads.fullscreen;
      try {
        pfs.canShow().then(function (ok) { return ok ? pfs.show() : { rendered: false }; })
          .then(function (r) { finish(!!(r && r.rendered)); })
          .catch(function () { finish(false); });
      } catch (e) { finish(false); }
      return;
    }
    if (this.gpush) {
      this._gpFsOk = false;
      try {
        this.gpush.ads.showFullscreen().then(function (ok) {
          finish(typeof ok === 'boolean' ? ok : self._gpFsOk);
        }).catch(function () { finish(false); });
      } catch (e) { finish(false); }
      return;
    }
    if (this.gp) {
      try {
        this.gp.interstitialAd().then(function (res) {
          finish(res && res.success);
        }).catch(function () { finish(false); });
      } catch (e) { finish(false); }
      return;
    }
    if (this.net) {
      this._netAd('inter', function (shown) { finish(shown); });
      return;
    }
    // локально просто показываем заглушку на пару секунд
    this._fakeAd(function () { finish(true); }, 2);
  },

  // Rewarded. Только по нажатию игрока! Награду даем строго в onRewarded.
  showRewarded: function (onReward, onFail) {
    onReward = onReward || function () {};
    onFail = onFail || function () {};
    if (this.adRunning || !this.canReward()) { onFail(); return; }
    // на Basic Launch у CrazyGames и в сборке для друзей рекламы нет совсем,
    // награду отдаем сразу, иначе кнопка получается пустышкой
    if (this.adsOff === 'basic' || this.adsOff === 'free') { onReward(); return; }
    var self = this, rewarded = false;
    this._adStart(!!this.cg);
    var raw = function () {
      self._adEnd();
      if (rewarded) onReward(); else onFail();
    };
    // у ролика за награду свой запас: он честно может идти секунд тридцать
    var pass = this._guard(function () { rewarded = false; raw(); }, CFG.ads.rewardTimeout);
    var finish = function () { if (pass()) raw(); };

    if (this.ysdk) {
      try {
        this.ysdk.adv.showRewardedVideo({
          callbacks: {
            onRewarded: function () { rewarded = true; },
            onClose: finish,
            onError: function () { rewarded = false; finish(); }
          }
        });
      } catch (e) { rewarded = false; finish(); }
      return;
    }
    if (this.cg) {
      try {
        this.cg.ad.requestAd('rewarded', {
          adStarted: function () { self._sound(false); },
          adFinished: function () { rewarded = true; finish(); },
          adError: function (err) {
            self._cgError(err);
            rewarded = self.adsOff === 'basic';
            finish();
          }
        });
      } catch (e) { rewarded = false; finish(); }
      return;
    }
    if (this.pkb) {
      // reward: true только за досмотр. Закрыл раньше - без награды и без
      // утешения; ролика не было вовсе (rendered: false) - считаем как noFill.
      var prw = this.pkb.ads.rewarded;
      var pkFail = function () { rewarded = self._consolation(); finish(); };
      try {
        prw.canShow().then(function (ok) { return ok ? prw.show() : { rendered: false, reward: false }; })
          .then(function (r) {
            if (r && r.reward) { self.noFill = 0; rewarded = true; finish(); }
            else if (r && r.rendered) { rewarded = false; finish(); }
            else pkFail();
          }).catch(pkFail);
      } catch (e) { pkFail(); }
      return;
    }
    if (this.gpush) {
      try {
        this.gpush.ads.showRewardedVideo().then(function (ok) {
          if (ok) { self.noFill = 0; rewarded = true; }
          else rewarded = self._consolation();
          finish();
        }).catch(function () { rewarded = self._consolation(); finish(); });
      } catch (e) { rewarded = self._consolation(); finish(); }
      return;
    }
    if (this.gp) {
      // Ролики за награду у GamePix в бете, во многих странах их просто нет
      // (из Вьетнама пусто всегда). Пусто - пробуем межстраничную и отдаем
      // награду за нее, а если и ее нет - см. noFill.
      var gpFail = function () { rewarded = self._consolation(); finish(); };
      try {
        this.gp.rewardAd().then(function (res) {
          if (res && res.success) { self.noFill = 0; rewarded = true; finish(); return; }
          return self.gp.interstitialAd().then(function (r2) {
            if (!(r2 && r2.success)) { gpFail(); return; }
            self.noFill = 0;
            self.lastFullscreen = self.now();
            rewarded = true;
            finish();
          });
        }).catch(gpFail);
      } catch (e) { gpFail(); }
      return;
    }
    if (this.net) {
      this._netAd('reward', function (shown, got) {
        if (got) { self.noFill = 0; rewarded = true; }
        else rewarded = shown ? false : self._consolation();
        finish();
      });
      return;
    }
    this._fakeAd(function () { rewarded = true; finish(); }, 1.5);
  },

  _fakeAd: function (cb, sec) {
    var cover = document.getElementById('adCover');
    cover.classList.remove('hidden');
    setTimeout(function () {
      cover.classList.add('hidden');
      cb();
    }, sec * 1000);
  },

  // Баннер держим только в меню, в бою он лезет на HUD.
  banner: function (show) {
    if (!this.ysdk) return;
    try {
      if (show) this.ysdk.adv.showBannerAdv();
      else this.ysdk.adv.hideBannerAdv();
    } catch (e) {}
  },

  // ---------- сохранения ----------

  save: function (data) {
    try { localStorage.setItem('scrapfall_save', JSON.stringify(data)); } catch (e) {}
    if (this.player && this.player.setData) {
      try { this.player.setData({ sf: data }, false); } catch (e) {}
    }
    if (this.cg && this.cg.data) {
      try { this.cg.data.setItem('scrapfall_save', JSON.stringify(data)); } catch (e) {}
    }
    if (this.gp && this.gp.localStorage) {
      // у них строго строки, объект туда класть нельзя
      try { this.gp.localStorage.setItem('scrapfall_save', JSON.stringify(data)); } catch (e) {}
    }
    if (this.gpush && this.gpush.player) {
      // поле sf (строка) заводится в кабинете GamePush, раздел Players.
      // set локально, sync на их сервер и в облако площадки (Пикабу его
      // требует) не чаще раза в 15 секунд, хвост уходит таймером.
      try { this.gpush.player.set('sf', JSON.stringify(data)); } catch (e) {}
      this._gpSync();
    }
    if (this.pkb && this.pkb.storage) {
      // set синхронный, SDK сам дописывает на сервер с задержкой; flush не чаще
      // раза в 20 с (у них лимит 100 запросов за 5 минут), хвост таймером
      try { this.pkb.storage.set('sf', data); } catch (e) {}
      this._pkbFlush();
    }
  },

  _pkbFlush: function () {
    var self = this, gap = 20, t = this.now();
    var go = function () {
      self._pkbLastFlush = self.now();
      try { self.pkb.storage.flush().catch(function () {}); } catch (e) {}
    };
    if (t - (this._pkbLastFlush || -gap) >= gap) { go(); return; }
    if (this._pkbFlushTimer) return;
    this._pkbFlushTimer = setTimeout(function () { self._pkbFlushTimer = null; go(); }, (gap - (t - this._pkbLastFlush)) * 1000);
  },

  _gpSync: function () {
    var self = this, gap = 15, t = this.now();
    if (t - (this._gpLastSync || -gap) >= gap) {
      this._gpLastSync = t;
      try { this.gpush.player.sync(); } catch (e) {}
      return;
    }
    if (this._gpSyncTimer) return;
    this._gpSyncTimer = setTimeout(function () {
      self._gpSyncTimer = null;
      self._gpLastSync = self.now();
      try { self.gpush.player.sync(); } catch (e) {}
    }, (gap - (t - this._gpLastSync)) * 1000);
  },

  load: function (cb) {
    var local = null;
    try {
      var raw = localStorage.getItem('scrapfall_save');
      if (!raw && this.cg && this.cg.data) raw = this.cg.data.getItem('scrapfall_save');
      if (!raw && this.gp && this.gp.localStorage) raw = this.gp.localStorage.getItem('scrapfall_save');
      if (raw) local = JSON.parse(raw);
    } catch (e) {}

    if (this.pkb && this.pkb.storage) {
      var pcloud = null;
      try { pcloud = this.pkb.storage.get('sf') || null; if (typeof pcloud === 'string') pcloud = JSON.parse(pcloud); } catch (e) { pcloud = null; }
      if (pcloud && typeof pcloud === 'object' && (!local || (pcloud.runs || 0) >= (local.runs || 0))) cb(pcloud);
      else cb(local);
      return;
    }
    if (this.gpush && this.gpush.player && this.gpush.player.ready) {
      var gpp = this.gpush.player;
      // если игрок не поднялся за timeout, играем с локальным сейвом
      var gpPass = this._guard(function () { cb(local); }, CFG.ads.timeout);
      gpp.ready.then(function () {
        if (!gpPass()) return;
        var cloud = null;
        try { var cs = gpp.get('sf'); if (cs) cloud = typeof cs === 'string' ? JSON.parse(cs) : cs; } catch (e) {}
        if (cloud && (!local || (cloud.runs || 0) >= (local.runs || 0))) cb(cloud);
        else cb(local);
      }).catch(function () { if (gpPass()) cb(local); });
      return;
    }
    if (this.player && this.player.getData) {
      this.player.getData(['sf']).then(function (res) {
        var cloud = res && res.sf ? res.sf : null;
        // если облако новее по числу рейдов - берем его
        if (cloud && (!local || (cloud.runs || 0) >= (local.runs || 0))) cb(cloud);
        else cb(local);
      }).catch(function () { cb(local); });
      return;
    }
    cb(local);
  },

  // GamePix собирает свою статистику по этим вызовам, на других площадках
  // они просто ничего не делают.
  reportScore: function (n) {
    if (!this.gp) return;
    try { this.gp.updateScore(Math.max(0, Math.floor(n))); } catch (e) {}
  },

  reportLevel: function (n) {
    if (!this.gp) return;
    try { this.gp.updateLevel(Math.max(1, Math.floor(n))); } catch (e) {}
  },

  happyMoment: function () {
    if (!this.gp) return;
    try { this.gp.happyMoment(); } catch (e) {}
  },

  // ---------- рейтинг ----------

  lbSubmit: function (score) {
    if (!this.lb || !this.authorized) return;
    try { this.lb.setLeaderboardScore(CFG.lb.name, Math.floor(score)); } catch (e) {}
  },

  lbLoad: function (cb) {
    if (!this.lb) { cb(null); return; }
    try {
      this.lb.getLeaderboardEntries(CFG.lb.name, {
        quantityTop: CFG.lb.top, includeUser: true, quantityAround: 3
      }).then(function (res) { cb(res); }).catch(function () { cb(null); });
    } catch (e) { cb(null); }
  },

  auth: function (cb) {
    if (!this.ysdk) { cb(false); return; }
    var self = this;
    try {
      this.ysdk.auth.openAuthDialog().then(function () {
        self.authorized = true;
        self.ysdk.getPlayer({ scopes: false }).then(function (p) {
          self.player = p;
          try { self.playerName = p.getName() || ''; self.playerPhoto = p.getPhoto ? p.getPhoto('small') : ''; } catch (e) {}
          cb(true);
        }).catch(function () { cb(true); });
      }).catch(function () { cb(false); });
    } catch (e) { cb(false); }
  },

  needAuthForBoard: function () { return this.kind === 'yandex' && !this.authorized; }
};
