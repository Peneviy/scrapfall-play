// Весь интерфейс на обычном DOM: так быстрее верстать и проще править тексты.
var UI = {
  screens: ['scrLoading', 'scrMenu', 'scrShop', 'scrBoard', 'scrSettings', 'scrLevel', 'scrPause', 'scrOver'],
  tab: 'chars',
  lastCrate: -999,
  prestigeArmed: 0,
  cards: [],
  toastT: 0,

  el: function (id) { return document.getElementById(id); },

  init: function () {
    var self = this;
    Icons.apply();
    this.el('verText').textContent = CFG.version;

    this.el('btnPlay').onclick = function () { self.startRun(); };
    this.el('btnShop').onclick = function () { self.openShop(); };
    this.el('btnModules').onclick = function () { self.openShop('upgrades'); };
    this.el('btnBoard').onclick = function () { self.openBoard(); };
    this.el('btnSettings').onclick = function () { self.show('scrSettings'); };
    this.el('btnFreeCoins').onclick = function () { self.freeCoins(); };

    var backs = document.querySelectorAll('[data-back]');
    for (var i = 0; i < backs.length; i++) backs[i].onclick = function () { self.show('scrMenu'); self.refreshMenu(); };

    var tabs = document.querySelectorAll('.tab');
    for (var j = 0; j < tabs.length; j++) {
      tabs[j].onclick = function () {
        var t = this.getAttribute('data-tab');
        var all = document.querySelectorAll('.tab');
        for (var k = 0; k < all.length; k++) all[k].classList.toggle('active', all[k] === this);
        self.tab = t;
        self.renderShop();
      };
    }

    this.el('btnPause').onclick = function () { self.togglePause(); };
    this.el('btnResume').onclick = function () { self.togglePause(); };
    this.el('btnQuit').onclick = function () { self.quitRun(); };
    this.el('btnAimMode').onclick = function () { self.toggleAim(); };
    this.el('abAim').onclick = function () { self.toggleAim(); };

    this.el('btnReroll').onclick = function () { self.reroll(); };
    this.el('btnRevive').onclick = function () { self.revive(); };
    this.el('btnDouble').onclick = function () { self.doubleCoins(); };
    this.el('btnAgain').onclick = function () { self.again(); };
    this.el('btnToMenu').onclick = function () { self.finishToMenu(); };
    this.el('btnPrestige').onclick = function () { self.prestige(); };
    this.el('btnAuth').onclick = function () {
      PF.auth(function (ok) { if (ok) self.openBoard(); });
    };

    var set = Save.data.set;
    this.el('setSfx').checked = !!set.sfx;
    this.el('setMusic').checked = !!set.music;
    this.el('setShake').checked = !!set.shake;
    this.el('setLow').checked = !!set.low;
    this.el('setSfx').onchange = function () { set.sfx = this.checked ? 1 : 0; Snd.setSfx(set.sfx); Save.flush(true); };
    this.el('setMusic').onchange = function () { set.music = this.checked ? 1 : 0; Snd.setMusic(set.music); Save.flush(true); };
    this.el('setShake').onchange = function () { set.shake = this.checked ? 1 : 0; Save.flush(true); };
    this.el('setLow').onchange = function () { set.low = this.checked ? 1 : 0; Save.flush(true); };

    // кнопки языков строим из списка, чтобы новый язык не требовал правки разметки
    var row = document.querySelector('.lang-row');
    if (row) {
      row.innerHTML = '';
      for (var li = 0; li < I18N.langs.length; li++) {
        var lb = document.createElement('button');
        lb.className = 'btn lang';
        lb.setAttribute('data-lang', I18N.langs[li]);
        lb.textContent = I18N.langs[li].toUpperCase();
        row.appendChild(lb);
      }
    }
    var langs = document.querySelectorAll('.btn.lang');
    for (var m = 0; m < langs.length; m++) {
      langs[m].onclick = function () {
        var l = this.getAttribute('data-lang');
        Save.data.set.lang = l;
        Save.flush(true);
        I18N.set(l);
        self.markLang();
        self.syncAim();
        self.refreshMenu();
      };
    }
    this.markLang();
    this.syncAim();
  },

  // Ручной прицел мышкой или авто по ближайшему. Пригодится под пвп,
  // а пока это просто выбор стиля игры.
  toggleAim: function () {
    var s = Save.data.set;
    s.aim = s.aim === 'mouse' ? 'auto' : 'mouse';
    Save.flush(true);
    this.syncAim();
    this.toast(I18N.t(s.aim === 'mouse' ? 'aimMouse' : 'aimAuto'));
  },

  syncAim: function () {
    var txt = I18N.t(Save.data.set.aim === 'mouse' ? 'aimMouse' : 'aimAuto');
    this.el('abAimText').textContent = txt;
    this.el('btnAimMode').textContent = txt;
  },

  markLang: function () {
    var langs = document.querySelectorAll('.btn.lang');
    for (var i = 0; i < langs.length; i++) {
      langs[i].classList.toggle('active', langs[i].getAttribute('data-lang') === I18N.lang);
    }
  },

  show: function (id) {
    for (var i = 0; i < this.screens.length; i++) {
      this.el(this.screens[i]).classList.toggle('hidden', this.screens[i] !== id);
    }
    this.el('hud').classList.add('hidden');
  },

  hideAll: function () {
    for (var i = 0; i < this.screens.length; i++) this.el(this.screens[i]).classList.add('hidden');
  },

  toast: function (text) {
    var t = this.el('toast');
    t.textContent = text;
    t.classList.remove('hidden');
    clearTimeout(this.toastT);
    this.toastT = setTimeout(function () { t.classList.add('hidden'); }, 1900);
  },

  // ---------- меню ----------

  // кнопки AD: при блокировщике прячем, чтобы не жались впустую
  syncAdButtons: function () {
    var off = !PF.canReward();
    this.el('btnFreeCoins').classList.toggle('hidden', off);
    this.el('btnReroll').classList.toggle('hidden', off);
    if (off) {
      this.el('btnRevive').classList.add('hidden');
      this.el('btnDouble').classList.add('hidden');
    }
  },

  refreshMenu: function () {
    var d = Save.data;
    this.syncAdButtons();
    this.el('menuBest').textContent = U.num(d.best.score);
    this.el('menuPrestige').textContent = d.prestige;
    this.el('menuCoins').textContent = U.num(d.coins);
    this.el('menuBosses').textContent = Bosses.defeated() + ' / ' + Bosses.list.length;

    var ch = Content.char(d.char), gun = Content.gun(d.gun);
    this.el('heroName').textContent = I18N.name(ch);
    this.el('heroWeapon').textContent = I18N.name(gun);
    this.el('heroPerk').textContent = I18N.desc(ch);

    var c = this.el('heroPreview');
    // в 3D машину в меню рисует и крутит сама сцена, плоская фигурка - запасной путь
    if (!View3D.thumb(c, 'car', ch.id, d.skin, undefined, false, d.gun)) {
      var g = c.getContext('2d');
      g.clearRect(0, 0, c.width, c.height);
      Content.drawChar(g, c.width / 2, c.height / 2, 46, ch.id, d.skin, -Math.PI / 2, false);
    }
    I18N.apply();
  },

  startRun: function () {
    Snd.unlock();
    this.hideAll();
    this.el('hud').classList.remove('hidden');
    Game.start();
    this.updateHud();
    if (!Save.data.hintSeen) this.showCtrlHint();
  },

  // Подсказка управления в первом забеге: клавиши или жест по экрану, и что
  // стрелять не надо. Висит, пока игрок не поедет секунды полторы, и не
  // дольше восьми секунд. Второй раз не показываем.
  showCtrlHint: function () {
    var el = this.el('ctrlHint');
    var touch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    el.classList.toggle('is-touch', touch);
    el.classList.toggle('is-pc', !touch);
    el.classList.remove('hidden', 'fade');
    this.ctrlHintT = 0;
    this.ctrlHintMoved = 0;
    I18N.apply();
  },

  tickCtrlHint: function (dt) {
    var el = this.el('ctrlHint');
    if (el.classList.contains('hidden') || el.classList.contains('fade')) return;
    this.ctrlHintT += dt;
    if (Input.move.x || Input.move.y) this.ctrlHintMoved += dt;
    if (this.ctrlHintMoved < 1.5 && this.ctrlHintT < 8) return;
    el.classList.add('fade');
    setTimeout(function () { el.classList.add('hidden'); }, 600);
    Save.data.hintSeen = true;
    Save.flush(false);
  },

  quitRun: function () {
    Game.settle();
    Game.commit();
    Game.quit();
    this.show('scrMenu');
    this.refreshMenu();
  },

  togglePause: function () {
    if (!Game.running || Game.over) return;
    if (!this.el('scrLevel').classList.contains('hidden')) return;  // во время выбора карт пауза уже есть
    if (Game.paused) {
      this.el('scrPause').classList.add('hidden');
      this.el('hud').classList.remove('hidden');
      Game.pause(false);
    } else {
      Game.pause(true);
      this.renderPauseSkills();
      this.el('scrPause').classList.remove('hidden');
      this.el('hud').classList.add('hidden');
    }
  },

  // На паузе: взятые карты с уровнем и текущим эффектом. Описание карты
  // в title, на компьютере всплывает при наведении.
  renderPauseSkills: function () {
    var p = Game.player, html = '';
    for (var id in p.skills) {
      var s = Skills.byId(id), lvl = p.skills[id];
      if (!s || !lvl) continue;
      var now = s.at ? s.at(lvl - 1) : I18N.desc(s);
      html += '<div class="ps" title="' + I18N.desc(s) + '">' +
        '<i style="color:' + (s.col || '#ffd27d') + '">' + s.ic + '</i>' +
        '<b>' + I18N.name(s) + '</b><span>' + lvl + '/' + s.max + '</span>' +
        '<em>' + now + '</em></div>';
    }
    this.el('pauseSkills').innerHTML = html;
  },

  // ---------- HUD ----------

  updateHud: function () {
    var p = Game.player;
    if (!p) return;
    this.el('xpFill').style.width = U.clamp(p.xp / p.xpNeed * 100, 0, 100) + '%';
    this.el('lvlText').textContent = p.level;
    this.el('timeText').textContent = U.time(Game.time);
    this.el('coinText').textContent = U.num(Game.runCoins);
    this.el('killText').textContent = Game.kills;
    this.el('scoreText').textContent = U.num(Game.finalScore()) + ' ' + I18N.t('scoreShort');
    this.el('hpFill').style.width = U.clamp(p.hp / p.st.maxHp * 100, 0, 100) + '%';
    this.el('hpText').textContent = Math.ceil(p.hp) + ' / ' + Math.round(p.st.maxHp);

    var dash = this.el('dashBtn');
    dash.classList.toggle('cd', p.dashCdT > 0);

    // откат рывка показываем полоской прямо в плашке с клавишей
    var ab = this.el('abDash');
    var onCd = p.dashCdT > 0;
    ab.classList.toggle('cool', onCd);
    this.el('abDashCd').style.width = onCd ? (100 - p.dashCdT / p.st.dashCd * 100) + '%' : '0';

    var bsig = Math.ceil(p.buffs.rage) + ':' + Math.ceil(p.buffs.haste) + ':' + p.buffs.shield;
    if (bsig !== this.buffSig) {
      this.buffSig = bsig;
      var bh = '';
      // Что именно делает бафф, пишем прямо в плашке: HUD не ловит наведение,
      // да и на телефоне наводить нечем.
      if (p.buffs.rage > 0) bh += '<div style="color:#ff7a5c;border-color:#ff7a5c">' + I18N.t('buff_rage') + ' <s>' + I18N.t('buffEff_rage') + '</s> ' + Math.ceil(p.buffs.rage) + '</div>';
      if (p.buffs.haste > 0) bh += '<div style="color:#7ec8ff;border-color:#7ec8ff">' + I18N.t('buff_haste') + ' <s>' + I18N.t('buffEff_haste') + '</s> ' + Math.ceil(p.buffs.haste) + '</div>';
      if (p.buffs.shield > 0) bh += '<div style="color:#b07ef5;border-color:#b07ef5">' + I18N.t('buff_shield') + ' <s>' + I18N.t('buffEff_shield') + '</s> ' + p.buffs.shield + '</div>';
      this.el('buffStrip').innerHTML = bh;
    }

    // полоска босса: висит, только пока он реально дерется
    var boss = Game.activeBoss();
    var bar = this.el('bossBar');
    if (boss) {
      bar.classList.remove('hidden');
      if (this.barBoss !== boss) {
        this.barBoss = boss;
        this.el('bossName').textContent = I18N.name(boss.bd);
      }
      this.el('bossFill').style.width = U.clamp(boss.hp / boss.maxHp * 100, 0, 100) + '%';
      this.el('bossHpText').textContent = Math.ceil(boss.hp / boss.maxHp * 100) + '%';
    } else {
      bar.classList.add('hidden');
      this.barBoss = null;
    }

    // строку скиллов перерисовываем только когда что-то изменилось
    var sig = '';
    for (var k in p.skills) sig += k + p.skills[k];
    if (sig !== this.skillSig) {
      this.skillSig = sig;
      var html = '';
      for (var id in p.skills) {
        var s = Skills.byId(id);
        if (!s) continue;
        html += '<div title="' + I18N.name(s) + '"><i style="color:' + (s.col || '#ffd27d') + '">' + s.ic + '</i> <b>' + p.skills[id] + '</b></div>';
      }
      this.el('skillStrip').innerHTML = html;
    }
  },

  // Плашка на пол-экрана: пришел босс / пройден босс.
  bossBanner: function (name, incoming) {
    var b = this.el('bossBanner');
    this.el('bannerKind').textContent = I18N.t(incoming ? 'bossIn' : 'bossOut');
    this.el('bannerName').textContent = name;
    b.classList.remove('hidden');
    // перезапуск анимации: без этого вторая плашка подряд появляется молча
    b.style.animation = 'none';
    void b.offsetWidth;
    b.style.animation = '';
    clearTimeout(this.bannerT);
    this.bannerT = setTimeout(function () { b.classList.add('hidden'); }, 2600);
  },

  // ---------- выбор карт ----------

  showLevelUp: function () {
    var cards = Skills.roll(Game.player, 3);
    // Все карты выкачаны в максимум: экран был бы пустой и игрок застрял бы.
    // Вместо выбора даем лечение и немного лома.
    if (!cards.length) {
      var p = Game.player;
      p.heal(p.st.maxHp * 0.35);
      Game.runCoins += 25;
      FX.text(p.x, p.y - 30, I18N.t('hpFull'), '#7ee08a', 15);
      Snd.play('level');
      return;
    }
    Game.pause(true);
    Snd.play('level');
    this.el('lvlNum').textContent = Game.player.level;
    this.el('hud').classList.add('hidden');
    this.el('scrLevel').classList.remove('hidden');
    this.renderCards(cards);
    var rr = this.el('btnReroll');
    rr.disabled = Game.rerollsLeft <= 0;
    this.syncAdButtons();
  },

  renderCards: function (cards) {
    var row = this.el('cardRow'), self = this;
    row.innerHTML = '';
    this.cards = cards;
    // с клавиатуры карта берется цифрой 1-3, значок с цифрой только там
    var touch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    row.classList.toggle('kb', !touch);
    for (var i = 0; i < cards.length; i++) {
      (function (s, n) {
        var lvl = Game.player.skills[s.id] || 0;
        var div = document.createElement('div');
        div.className = 'card ' + (s.rar === 'leg' ? 'leg' : (s.rar === 'epic' ? 'epic' : (s.rar === 'rare' ? 'rare' : '')));
        div.innerHTML = '<div class="key">' + (n + 1) + '</div>' +
          '<div class="ic" style="color:' + (s.col || '#ffd27d') + '">' + s.ic + '</div>' +
          '<h3>' + I18N.name(s) + '</h3>' +
          '<p>' + I18N.desc(s) + '</p>' +
          '<div class="stack">' + (lvl ? I18N.t('stack', { n: lvl + 1, m: s.max }) : I18N.t('newSkill')) + '</div>' +
          (s.at && lvl ? '<div class="next">' + I18N.t('willBe', { v: s.at(lvl) }) + '</div>' : '');
        div.onclick = function () { self.pickCard(s); };
        row.appendChild(div);
      })(cards[i], i);
    }
  },

  // цифра 1-3 на экране выбора карт
  pickByKey: function (n) {
    if (this.el('scrLevel').classList.contains('hidden')) return;
    if (this.cards && this.cards[n]) this.pickCard(this.cards[n]);
  },

  pickCard: function (skill) {
    Player.take(Game.player, skill);
    Snd.play('buy');
    this.el('scrLevel').classList.add('hidden');
    this.skillSig = null;

    // каждый N-й уровень пробуем показать межстраничную, если кулдаун прошел
    Game.adLevelCounter++;
    var self = this;
    if (Game.adLevelCounter % CFG.ads.levelEvery === 0 && PF.canFullscreen('run')) {
      PF.showFullscreen(function () { self.resumeAfterCards(); }, 'run');
    } else {
      this.resumeAfterCards();
    }
  },

  resumeAfterCards: function () {
    if (Game.over) return;
    this.el('hud').classList.remove('hidden');
    Game.pause(false);
  },

  reroll: function () {
    var self = this;
    if (Game.rerollsLeft <= 0) { this.toast(I18N.t('rerollOut')); Snd.play('deny'); return; }
    PF.showRewarded(function () {
      Game.rerollsLeft--;
      self.renderCards(Skills.roll(Game.player, 3));
      self.el('btnReroll').disabled = Game.rerollsLeft <= 0;
    }, function () {
      self.toast(I18N.t('adFail'));
    });
  },

  // ---------- итоги ----------

  showGameOver: function () {
    var res = Game.settle();
    this.el('hud').classList.add('hidden');
    this.el('scrLevel').classList.add('hidden');
    this.el('ovScore').textContent = U.num(res.score);
    this.el('ovTime').textContent = U.time(res.time);
    this.el('ovKills').textContent = res.kills;
    this.el('ovCoins').textContent = U.num(Game.payout);
    var sp = Game.scoreParts;
    this.el('ovBreak').innerHTML =
      '<div><span>' + I18N.t('breakKills') + '</span><b>' + U.num(sp.kills) + '</b></div>' +
      '<div><span>' + I18N.t('breakLevels') + '</span><b>' + U.num(sp.levels) + '</b></div>' +
      (sp.bosses ? '<div><span>' + I18N.t('breakBosses') + '</span><b>' + U.num(sp.bosses) + '</b></div>' : '') +
      '<div><span>' + I18N.t('breakTime') + '</span><b>' + U.num(sp.time) + '</b></div>';
    this.el('ovNewBest').classList.toggle('hidden', res.score <= Save.data.best.score);
    this.el('btnRevive').classList.toggle('hidden', Game.reviveLeft <= 0);
    this.el('btnDouble').classList.remove('hidden');
    this.syncAdButtons();
    this.el('scrOver').classList.remove('hidden');
  },

  revive: function () {
    var self = this;
    if (Game.reviveLeft <= 0) { this.toast(I18N.t('reviveOut')); return; }
    PF.showRewarded(function () {
      Game.reviveLeft--;
      self.el('scrOver').classList.add('hidden');
      self.el('hud').classList.remove('hidden');
      Game.unsettle();
      Game.revive();
    }, function () {
      self.toast(I18N.t('adFail'));
    });
  },

  doubleCoins: function () {
    var self = this;
    PF.showRewarded(function () {
      Game.payout *= 2;
      self.el('ovCoins').textContent = U.num(Game.payout);
      self.el('btnDouble').classList.add('hidden');
      Snd.play('coin');
    }, function () {
      self.toast(I18N.t('adFail'));
    });
  },

  again: function () {
    Game.commit();
    var self = this;
    // реклама между рейдами, но только если прошел кулдаун
    if (PF.canFullscreen()) {
      PF.showFullscreen(function () { self.startRun(); });
    } else {
      this.startRun();
    }
  },

  finishToMenu: function () {
    Game.commit();
    Game.quit();
    var self = this;
    if (PF.canFullscreen('nav')) {
      PF.showFullscreen(function () { self.show('scrMenu'); self.refreshMenu(); }, 'nav');
    } else {
      this.show('scrMenu');
      this.refreshMenu();
    }
  },

  // ---------- ангар ----------

  openShop: function (tab) {
    if (tab) {
      this.tab = tab;
      var tabs = document.querySelectorAll('.tab');
      for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === tab);
      }
    }
    this.show('scrShop');
    this.renderShop();
  },

  renderShop: function () {
    var list = this.el('shopList'), d = Save.data, self = this;
    this.el('shopCoins').textContent = U.num(d.coins);
    list.innerHTML = '';
    this.el('prestigeBox').classList.toggle('hidden', this.tab !== 'upgrades');

    if (this.tab === 'upgrades') {
      this.renderUpgrades(list);
      this.renderPrestige();
      return;
    }
    if (this.tab === 'trophies') {
      this.renderTrophies(list);
      return;
    }

    var kind = this.tab === 'chars' ? 'chars' : (this.tab === 'weapons' ? 'guns' : 'skins');
    var items = this.tab === 'chars' ? Content.chars : (this.tab === 'weapons' ? Content.guns : Content.skins);
    var cur = kind === 'chars' ? d.char : (kind === 'guns' ? d.gun : d.skin);

    for (var i = 0; i < items.length; i++) {
      (function (it) {
        var owned = Save.has(kind, it.id);
        var active = cur === it.id;
        var div = document.createElement('div');
        div.className = 'item' + (owned ? ' owned' : ' locked') + (active ? ' active' : '');

        var extra = '';
        if (kind === 'guns') {
          // Голый dps вводил в заблуждение: у медленных пушек он ниже, хотя они
          // сильнее с прокачкой. Показываем составляющие, а не одно число.
          extra = '<div class="stats">' + I18N.t('dps', {
            d: it.dmg * it.count,
            r: (1 / it.cd).toFixed(1),
            g: it.range
          }) + (it.tag ? ' · ' + I18N.t(it.tag) : '') + '</div>';
        }
        div.innerHTML =
          (active ? '<div class="tag">' + I18N.t('equipped') + '</div>' : '') +
          '<h4>' + I18N.name(it) + '</h4>' +
          '<p>' + I18N.desc(it) + '</p>' + extra +
          '<div class="price">' + (owned ? (active ? '' : I18N.t('equip')) : I18N.t('unlockAt', { n: it.cost })) + '</div>';

        if (kind === 'chars') {
          var c = document.createElement('canvas');
          c.width = c.height = 96;
          if (View3D.on) self.bigThumb(c, it.id, d.skin, d.gun);
          else Content.drawChar(c.getContext('2d'), 48, 48, 26, it.id, d.skin, -Math.PI / 2, false);
          div.insertBefore(c, div.firstChild);
        }
        if (kind === 'skins') {
          var c2 = document.createElement('canvas');
          c2.width = c2.height = 96;
          if (View3D.on) self.bigThumb(c2, d.char, it.id, d.gun);
          else Content.drawChar(c2.getContext('2d'), 48, 48, 26, d.char, it.id, -Math.PI / 2, false);
          div.insertBefore(c2, div.firstChild);
        }
        // пушка на твоей текущей машине: видно, как она встанет на башню
        if (kind === 'guns' && View3D.on) {
          var c3 = document.createElement('canvas');
          self.bigThumb(c3, d.char, d.skin, it.id);
          div.insertBefore(c3, div.firstChild);
        }

        div.onclick = function () {
          if (owned) {
            Save.equip(kind, it.id);
            Snd.play('buy');
          } else if (Save.pay(it.cost)) {
            Save.unlock(kind, it.id);
            Save.equip(kind, it.id);
            Snd.play('buy');
          } else {
            Snd.play('deny');
            self.toast(I18N.t('noCoins'));
            return;
          }
          self.renderShop();
        };
        list.appendChild(div);
      })(items[i]);
    }
  },

  // 3D-картинка в карточке ангара: буфер вдвое больше, чтобы не мылилось
  bigThumb: function (c, charId, skinId, gunId) {
    c.width = c.height = 192;
    c.style.width = c.style.height = '112px';
    View3D.thumb(c, 'car', charId, skinId, -0.5, false, gunId);
  },

  renderUpgrades: function (list) {
    var self = this;
    for (var i = 0; i < Content.upgrades.length; i++) {
      (function (u) {
        var lvl = Save.data.up[u.id] || 0;
        var max = lvl >= Save.upMax;
        var cost = Save.upCost(u.id);
        var dots = '';
        for (var k = 0; k < Save.upMax; k++) dots += '<i class="' + (k < lvl ? 'on' : '') + '"></i>';
        var div = document.createElement('div');
        div.className = 'item' + (lvl > 0 ? ' owned' : '');
        div.innerHTML = '<div class="u-ic">' + Icons.svg(u.id, 30) + '</div>' +
          '<h4>' + I18N.name(u) + '</h4><p>' + I18N.desc(u) + '</p>' +
          '<div class="lvl-dots">' + dots + '</div>' +
          '<div class="price">' + (max ? I18N.t('lvlMax') : cost) + '</div>';
        div.onclick = function () {
          if (max) return;
          if (Save.upBuy(u.id)) { Snd.play('buy'); self.renderShop(); }
          else { Snd.play('deny'); self.toast(I18N.t('noCoins')); }
        };
        list.appendChild(div);
      })(Content.upgrades[i]);
    }
  },

  renderTrophies: function (list) {
    for (var i = 0; i < Bosses.list.length; i++) {
      var b = Bosses.list[i];
      var wins = Save.data.bosses[b.id] || 0;
      var div = document.createElement('div');
      div.className = 'item trophy' + (wins ? ' done' : '');

      var c = document.createElement('canvas');
      c.width = c.height = 96;
      // в 3D трофей - модель босса, непобежденный остается темным силуэтом
      if (View3D.on) {
        c.width = c.height = 192;
        c.style.width = c.style.height = '112px';
        View3D.thumb(c, 'boss', b.id, null, -0.7, !wins);
        div.innerHTML = '<h4>' + (wins ? I18N.name(b) : '???') + '</h4>' +
          '<p>' + (wins ? I18N.desc(b) : I18N.t('trophyNone')) + '</p>' +
          '<div class="cnt">' + (wins ? I18N.t('trophyWins', { n: wins }) : '') + '</div>';
        div.insertBefore(c, div.firstChild);
        list.appendChild(div);
        continue;
      }
      var g = c.getContext('2d');
      // рисуем силуэт босса тем же многоугольником, что и в бою
      g.fillStyle = wins ? b.body : '#1b2a31';
      g.strokeStyle = wins ? b.trim : '#2c4750';
      g.lineWidth = 3;
      g.beginPath();
      for (var k = 0; k < b.shape; k++) {
        var a = k / b.shape * Math.PI * 2 + Math.PI / b.shape;
        var px = 48 + Math.cos(a) * 30, py = 48 + Math.sin(a) * 30;
        if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
      g.fill();
      g.stroke();
      div.innerHTML = '<h4>' + (wins ? I18N.name(b) : '???') + '</h4>' +
        '<p>' + (wins ? I18N.desc(b) : I18N.t('trophyNone')) + '</p>' +
        '<div class="cnt">' + (wins ? I18N.t('trophyWins', { n: wins }) : '') + '</div>';
      div.insertBefore(c, div.firstChild);
      list.appendChild(div);
    }
  },

  renderPrestige: function () {
    var ready = Save.prestigeReady();
    var btn = this.el('btnPrestige');
    this.el('prestigeDesc').textContent = ready
      ? I18N.t('prestigeDesc', { c: Math.round(CFG.prestige.coinMult * 100), h: Math.round(CFG.prestige.enemyHp * 100) })
      : I18N.t('prestigeReqBoss', { u: CFG.prestige.reqUpgrades, b: CFG.prestige.reqBosses });
    btn.disabled = !ready;
    btn.textContent = I18N.t('prestigeDo');
    this.prestigeArmed = 0;
  },

  prestige: function () {
    var t = performance.now() / 1000;
    var btn = this.el('btnPrestige');
    // подтверждение вторым кликом, без системного confirm
    if (t - this.prestigeArmed > 4) {
      this.prestigeArmed = t;
      btn.textContent = I18N.t('prestigeConfirm', { r: Save.data.prestige + 1 });
      return;
    }
    if (Save.doPrestige()) {
      Snd.play('level');
      this.toast(I18N.t('prestigeDone', { r: Save.data.prestige }));
      this.renderShop();
      this.refreshMenu();
    }
  },

  // ---------- рейтинг ----------

  openBoard: function () {
    this.show('scrBoard');
    var list = this.el('boardList'), self = this;
    list.innerHTML = '';
    this.el('btnAuth').classList.toggle('hidden', !PF.needAuthForBoard());

    if (PF.kind !== 'yandex' || !PF.lb) {
      list.innerHTML = '<div class="board-row"><span class="nm">' +
        I18N.t('boardLocal', { n: U.num(Save.data.best.score) }) + '</span></div>';
      return;
    }

    PF.lbLoad(function (res) {
      if (!res || !res.entries || !res.entries.length) {
        list.innerHTML = '<div class="board-row"><span class="nm">' + I18N.t('boardEmpty') + '</span></div>';
        return;
      }
      var html = '';
      for (var i = 0; i < res.entries.length; i++) {
        var e = res.entries[i];
        var me = res.userRank && e.rank === res.userRank;
        var nm = (e.player && e.player.publicName) ? e.player.publicName : I18N.t('raider', { n: e.rank });
        var av = '';
        try { av = e.player.getAvatarSrc ? e.player.getAvatarSrc('small') : ''; } catch (err) {}
        html += '<div class="board-row' + (me ? ' me' : '') + '">' +
          '<span class="rank">' + e.rank + '</span>' +
          (av ? '<img src="' + av + '" alt="">' : '') +
          '<span class="nm">' + nm + '</span>' +
          '<span class="sc">' + U.num(e.score) + '</span></div>';
      }
      list.innerHTML = html;
      self.el('btnAuth').classList.add('hidden');
    });
  },

  // ---------- ящик с ломом за рекламу ----------

  freeCoins: function () {
    var t = PF.now(), self = this;
    var left = Math.ceil(CFG.ads.freeCoinsGap - (t - this.lastCrate));
    if (left > 0) { this.toast(I18N.t('adWait', { n: left })); return; }
    PF.showRewarded(function () {
      self.lastCrate = PF.now();
      var amount = Math.round(CFG.ads.freeCoins * Save.mult().loot);
      Save.addCoins(amount);
      Snd.play('coin');
      self.toast(I18N.t('rewardCoins', { n: amount }));
      self.refreshMenu();
    }, function () {
      self.toast(I18N.t('adFail'));
    });
  }
};
