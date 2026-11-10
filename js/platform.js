var PF = {
  kind: CFG.platform,
  ready: false,
  ysdk: null,
  cg: null,
  gp: null,
  gpush: null,
  pkb: null,
  fsGap: 0,
  player: null,
  lb: null,
  lang: 'en',
  authorized: false,
  playerName: '',
  playerPhoto: '',
  lastFullscreen: 0,
  bootTime: 0,
  adRunning: false,
  adsOff: '',
  onAdStart: null,
  onAdSound: null,
  onAdEnd: null,
  onAdsOff: null,
  muteAudio: false,
  onMuteAudio: null,
  net: null,
  _netWait: null,
  noFill: 0,

  now: function () { return performance.now() / 1000; },

  init: function (done) {
    this.bootTime = this.now();
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

    if (this.kind === 'friend') {
      this.adsOff = 'free';
      fallback();
      return;
    }

    if (this.kind === 'gamepix') {
      if (typeof GamePix === 'undefined') { fallback(); return; }
      this.gp = GamePix;
      try { GamePix.loading(100); } catch (e) {}
      try { GamePix.loaded(); } catch (e) {}
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
          var loc = sys && sys.systemInfo ? String(sys.systemInfo.locale || '') : '';
          self.lang = I18N.pick(loc);
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
    this.lang = 'ru';
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
      gp.on('pause', function () {
        if (Game.running && !Game.paused) { self.pausedByPf = true; UI.togglePause(); }
      });
      gp.on('resume', function () {
        if (self.pausedByPf && Game.running && Game.paused) UI.togglePause();
        self.pausedByPf = false;
      });
      if (gp.ads && gp.ads.isAdblockEnabled) this.setAdsOff('adblock');
      gp.ads.on('fullscreen:close', function (ok) { self._gpFsOk = !!ok; });
      if (gp.sounds) {
        if (gp.sounds.isMuted) this._setMute(true);
        gp.sounds.on('mute', function () { self._setMute(true); });
        gp.sounds.on('unmute', function () { self._setMute(false); });
      }
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
          setTimeout(function () { end(true, w.rewarded); }, 50);
        }).catch(function () { end(false, false); });
      } else {
        if (!window.sdk || !window.sdk.showBanner) { end(false, false); return; }
        window.sdk.showBanner();
      }
    } catch (e) { end(false, false); }
  },

  _consolation: function () { this.noFill++; return this.noFill >= 2; },

  setSound: function (on) {
    try {
      if (this.gpush && this.gpush.sounds) { if (on) this.gpush.sounds.unmute(); else this.gpush.sounds.mute(); }
    } catch (e) {}
  },

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

  fullscreenLeft: function () {
    return Math.max(0, Math.ceil((this.fsGap || CFG.ads.fullscreenGap) - (this.now() - this.lastFullscreen)));
  },
  canFullscreen: function (where) {
    if (this.adsOff) return false;
    if (this.cg && where) return false;
    return !this.adRunning && this.fullscreenLeft() === 0;
  },

  canReward: function () { return this.adsOff !== 'adblock'; },

  setAdsOff: function (why) {
    if (this.adsOff === why) return;
    this.adsOff = why;
    if (this.onAdsOff) this.onAdsOff(why);
  },

  _cgError: function (err) {
    var code = err && err.code;
    if (code === 'adsDisabledBasicLaunch') this.setAdsOff('basic');
    else if (code === 'adblock') this.setAdsOff('adblock');
  },

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
    this.refocus();
    if (this.onAdEnd) this.onAdEnd();
  },

  refocus: function () {
    var go = function () {
      try { window.focus(); } catch (e) {}
      try {
        var c = document.getElementById('game');
        if (c && c.focus) c.focus({ preventScroll: true });
      } catch (e) {}
    };
    go();
    setTimeout(go, 120);
    setTimeout(go, 500);
  },

  _backInGame: function (cb) {
    var t0 = Date.now(), evs = ['pointerdown', 'keydown'];
    var off = function () { evs.forEach(function (ev) { window.removeEventListener(ev, h, true); }); };
    var h = function () {
      if (Date.now() - t0 < 1500) return;
      off();
      cb();
    };
    evs.forEach(function (ev) { window.addEventListener(ev, h, true); });
    var self = this, iv = setInterval(function () { if (!self.adRunning) { clearInterval(iv); off(); } }, 1000);
  },

  showFullscreen: function (done, where) {
    done = done || function () {};
    if (!this.canFullscreen(where)) { done(false); return; }
    this.lastFullscreen = this.now();
    var self = this;
    var raw = function (shown) {
      self._adEnd();
      done(!!shown);
    };
    var pass = this._guard(function () {
      Metrics.error({ message: 'ad fullscreen timeout' }, 'ad ' + self.kind);
      raw(false);
    }, this.pkb ? 240 : CFG.ads.timeout);
    var finish = function (shown) { if (pass()) raw(shown); };
    if (this.pkb) this._backInGame(function () { finish(false); });
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
    this._fakeAd(function () { finish(true); }, 2);
  },

  showRewarded: function (onReward, onFail) {
    onReward = onReward || function () {};
    onFail = onFail || function () {};
    if (this.adRunning || !this.canReward()) { onFail(); return; }
    if (this.adsOff === 'basic' || this.adsOff === 'free') { onReward(); return; }
    var self = this, rewarded = false, shown = false;
    this._adStart(!!this.cg);
    var raw = function () {
      if (shown || rewarded) self.lastFullscreen = self.now();
      self._adEnd();
      if (rewarded) onReward(); else onFail(shown ? 'closed' : 'none');
    };
    var pass = this._guard(function () { rewarded = false; raw(); }, this.pkb ? 240 : CFG.ads.rewardTimeout);
    var finish = function () { if (pass()) raw(); };

    if (this.ysdk) {
      try {
        this.ysdk.adv.showRewardedVideo({
          callbacks: {
            onOpen: function () { shown = true; },
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
          adStarted: function () { shown = true; self._sound(false); },
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
      var prw = this.pkb.ads.rewarded;
      var pkFail = function () { rewarded = self._consolation(); finish(); };
      try {
        prw.canShow().then(function (ok) { return ok ? prw.show() : { rendered: false, reward: false }; })
          .then(function (r) {
            if (r && r.rendered) shown = true;
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
      this._netAd('reward', function (seen, got) {
        if (seen) shown = true;
        if (got) { self.noFill = 0; rewarded = true; }
        else rewarded = seen ? false : self._consolation();
        finish();
      });
      return;
    }
    this._fakeAd(function () { shown = true; rewarded = true; finish(); }, 1.5);
  },

  _fakeAd: function (cb, sec) {
    var cover = document.getElementById('adCover');
    cover.classList.remove('hidden');
    setTimeout(function () {
      cover.classList.add('hidden');
      cb();
    }, sec * 1000);
  },

  banner: function (show) {
    if (!this.ysdk) return;
    try {
      if (show) this.ysdk.adv.showBannerAdv();
      else this.ysdk.adv.hideBannerAdv();
    } catch (e) {}
  },

  noSave: (function () { try { return /[?&]nosave=1/.test(location.search); } catch (e) { return false; } })(),

  save: function (data) {
    if (this.noSave) return;
    try { localStorage.setItem('scrapfall_save', JSON.stringify(data)); } catch (e) {}
    if (this.player && this.player.setData) {
      try { this.player.setData({ sf: data }, false); } catch (e) {}
    }
    if (this.cg && this.cg.data) {
      try { this.cg.data.setItem('scrapfall_save', JSON.stringify(data)); } catch (e) {}
    }
    if (this.gp && this.gp.localStorage) {
      try { this.gp.localStorage.setItem('scrapfall_save', JSON.stringify(data)); } catch (e) {}
    }
    if (this.gpush && this.gpush.player) {
      try { this.gpush.player.set('sf', JSON.stringify(data)); } catch (e) {}
      this._gpSync();
    }
    if (this.pkb && this.pkb.storage) {
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
        if (cloud && (!local || (cloud.runs || 0) >= (local.runs || 0))) cb(cloud);
        else cb(local);
      }).catch(function () { cb(local); });
      return;
    }
    cb(local);
  },

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
