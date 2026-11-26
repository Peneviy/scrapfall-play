var UI = {
  screens: ['scrLoading', 'scrMenu', 'scrShop', 'scrBuy', 'scrBoard', 'scrMaps', 'scrSettings', 'scrLevel', 'scrPause', 'scrOver'],
  tab: 'chars',
  lastCrate: -999,
  cards: [],
  toastT: 0,

  el: function (id) { return document.getElementById(id); },

  init: function () {
    var self = this;
    Icons.apply();
    this.el('verText').textContent = CFG.version;
    var vt = document.querySelectorAll('.ver-tag');
    for (var vi = 0; vi < vt.length; vi++) vt[vi].textContent = 'v' + CFG.version;
    var taps = document.querySelectorAll('.ver-tap'), tapN = 0, tapT = 0;
    var onTap = function () {
      var now = Date.now();
      tapN = now - tapT < 900 ? tapN + 1 : 1;
      tapT = now;
      if (tapN >= 3) { tapN = 0; self.sndDbg(); }
    };
    for (vi = 0; vi < taps.length; vi++) taps[vi].addEventListener('click', onTap);

    this.el('btnPlay').onclick = function () { self.startRun(); };
    this.el('btnShop').onclick = function () { self.openShop(); };
    this.el('btnModules').onclick = function () { self.openShop('upgrades'); };
    this.el('btnBoard').onclick = function () { self.openBoard(); };
    this.el('menuMap').onclick = function () { Snd.play('pick'); self.openMaps(); };
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
    this.el('gfxLostGo').onclick = function () { self.gfxLostEnd(false); };
    this.el('gfxLostQuit').onclick = function () { self.gfxLostEnd(true); };
    this.el('btnAimMode').onclick = function () { self.toggleAim(); this.blur(); };
    this.el('abAim').onclick = function () { self.toggleAim(); this.blur(); };

    this.el('btnReroll').onclick = function () { self.reroll(); };
    this.el('btnRevive').onclick = function () { self.revive(); };
    this.el('btnDouble').onclick = function () { self.doubleCoins(); };
    this.el('btnAgain').onclick = function () { self.again(); };
    this.el('btnToMenu').onclick = function () { self.finishToMenu(); };
    this.el('btnWinNext').onclick = function () { self.winNext(); };
    this.el('btnWinTake').onclick = function () { self.finishToMenu('upgrades'); };
    this.el('btnWinDouble').onclick = function () { self.winDouble(); };
    this.el('nkQ').onclick = function () {
      self.el('nkInfo').classList.toggle('hidden');
      Nakal.renderBox();
    };
    this.tipInit();
    this.el('btnAuth').onclick = function () {
      PF.auth(function (ok) { if (ok) self.openBoard(); });
    };

    var set = Save.data.set;
    this.el('setSfx').checked = !!set.sfx;
    this.el('setMusic').checked = !!set.music;
    this.el('setShake').checked = !!set.shake;
    this.el('pauseSfx').checked = !!set.sfx;
    this.el('pauseMusic').checked = !!set.music;
    this.el('setSfx').onchange = function () { self.setSound('sfx', this.checked); };
    this.el('setMusic').onchange = function () { self.setSound('music', this.checked); };
    this.el('pauseSfx').onchange = function () { self.setSound('sfx', this.checked); };
    this.el('pauseMusic').onchange = function () { self.setSound('music', this.checked); };
    this.syncVol();
    this.el('setVol').oninput = function () { self.setVol(this.value / 100, false); };
    this.el('pauseVol').oninput = function () { self.setVol(this.value / 100, false); };
    this.el('setVol').onchange = function () { self.setVol(this.value / 100, true); };
    this.el('pauseVol').onchange = function () { self.setVol(this.value / 100, true); };
    var zin = function () { Game.setZoomPct(+this.value); self.syncZoom(); };
    this.el('setZoom').oninput = zin; this.el('pauseZoom').oninput = zin;
    this.syncZoom();
    this.el('setShake').onchange = function () { set.shake = this.checked ? 1 : 0; Save.flush(true); };
    Quality.start(View3D.weak);
    var qb = document.querySelectorAll('#setQ .btn');
    for (var qi = 0; qi < qb.length; qi++) {
      qb[qi].onclick = function () { Quality.choose(this.getAttribute('data-q')); self.markQ(); };
    }
    this.markQ();
    var vb = document.querySelectorAll('#setView .btn');
    for (var vi = 0; vi < vb.length; vi++) {
      vb[vi].onclick = function () { self.setView(this.getAttribute('data-v')); };
    }
    this.markView();
    this.el('setDashL').checked = !!set.dashL;
    this.el('setDashL').onchange = function () { set.dashL = this.checked ? 1 : 0; Input.dashSide(); Save.flush(true); };

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

  toggleAim: function () {
    var s = Save.data.set;
    s.aim = s.aim === 'mouse' ? 'auto' : 'mouse';
    Save.flush(true);
    this.syncAim();
    this.toast(I18N.t(s.aim === 'mouse' ? 'aimMouse' : 'aimAuto'));
  },

  syncAim: function () {
    var key = Save.data.set.aim === 'mouse' ? 'aimMouse' : 'aimAuto', txt = I18N.t(key);
    this.el('abAimText').setAttribute('data-i18n', key);
    this.el('btnAimMode').setAttribute('data-i18n', key);
    this.el('abAimText').textContent = txt;
    this.el('btnAimMode').textContent = txt;
  },

  markQ: function () {
    var qb = document.querySelectorAll('#setQ .btn');
    for (var i = 0; i < qb.length; i++) qb[i].classList.toggle('active', qb[i].getAttribute('data-q') === Save.data.set.q);
  },

  setView: function (v) {
    var flat = v === '2d';
    if (flat === !View3D.on) { this.markView(); return; }
    if (!View3D.setFlat(flat)) { this.toast(I18N.t('view3dNo')); this.markView(); return; }
    Save.data.set.view = flat ? '2d' : '3d';
    Save.flush(true);
    this.markView();
    this.refreshMenu();
  },

  markView: function () {
    var flat = !View3D.on;
    var vb = document.querySelectorAll('#setView .btn');
    for (var i = 0; i < vb.length; i++) {
      var d3 = vb[i].getAttribute('data-v') === '3d';
      vb[i].classList.toggle('active', d3 !== flat);
      if (d3) vb[i].disabled = flat && !Game.ctxAlpha;
    }
    this.el('setViewNo').classList.toggle('hidden', !(flat && !Game.ctxAlpha));
    this.el('setQRow').classList.toggle('hidden', flat);
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
    this.tipHide();
  },

  hideAll: function () {
    for (var i = 0; i < this.screens.length; i++) this.el(this.screens[i]).classList.add('hidden');
    this.tipHide();
  },

  adToast: function (why) {
    this.toast(I18N.t(why === 'closed' ? 'adClosed' : 'adFail'));
  },

  toast: function (text) {
    var t = this.el('toast');
    t.textContent = text;
    var over = document.querySelector('.screen:not(.hidden)');
    t.classList.toggle('ingame', !!(Game.running && !over));
    t.classList.remove('hidden');
    clearTimeout(this.toastT);
    this.toastT = setTimeout(function () { t.classList.add('hidden'); }, 1900);
  },

  syncAdButtons: function () {
    var off = !PF.canReward();
    this.el('btnFreeCoins').classList.toggle('hidden', off);
    this.el('btnReroll').classList.toggle('hidden', off || (Game.running && Nakal.has(7)));
    if (off) {
      this.el('btnRevive').classList.add('hidden');
      this.el('btnDouble').classList.add('hidden');
    }
  },

  refreshMenu: function () {
    var d = Save.data;
    this.syncAdButtons();
    var mid = Maps.sel();
    this.el('menuBest').textContent = U.num(Maps.rec(mid).best.score);
    this.el('menuMapName').textContent = Maps.name(mid);
    this.el('menuMap').className = 'map-card th-' + Maps.byId(mid).theme;
    if (View3D.setTheme) View3D.setTheme(Maps.theme());
    var nr = Nakal.rank(), ns = Nakal.sel();
    this.el('menuPrestige').textContent = ns < nr ? ns + '/' + nr : ns;
    this.el('menuCoins').textContent = U.num(d.coins);
    this.el('menuBosses').textContent = Bosses.defeated() + ' / ' + Bosses.list.length;
    this.renderQuickUp();

    var ch = Content.char(d.char), gun = Content.gun(d.gun);
    this.el('heroName').textContent = I18N.name(ch);
    this.el('heroWeapon').textContent = I18N.name(gun);
    this.el('heroPerk').textContent = I18N.desc(ch);

    var c = this.el('heroPreview');
    if (!View3D.thumb(c, 'car', ch.id, d.skin, undefined, false, d.gun)) {
      var g = c.getContext('2d');
      g.clearRect(0, 0, c.width, c.height);
      Content.drawChar(g, c.width / 2, c.height / 2, 46, ch.id, d.skin, -Math.PI / 2, false);
    }
    I18N.apply();
  },

  startRun: function (hold) {
    Snd.unlock();
    Input.reset();
    this.hideAll();
    this.el('hud').classList.remove('hidden');
    Game.start();
    this.updateHud();
    Game.mmBox(true);
    if (hold) this.holdStart();
    if (hold || !Save.data.hintSeen) this.showCtrlHint();
    else if (Save.data.set.aim === 'mouse' && !Input.isTouch()) this.toast(I18N.t('aimMouse') + ' (TAB)');
  },

  crash: function () {
    try { Snd.mute(true); } catch (e) {}
    try { this.hideAll(); } catch (e) {}
    var el = this.el('crashScreen');
    if (!el) return;
    el.classList.remove('hidden');
    try { I18N.apply(); } catch (e) {}
    var go = function () {
      el.onclick = null;
      try {
        if (Game.running && !Game.settled) Game.settle();
        if (Game.running && !Game.committed) Game.commit();
        Save.flush(true);
      } catch (e) {}
      setTimeout(function () { location.reload(); }, 400);
    };
    el.onclick = go;
  },

  holdStart: function () {
    var self = this;
    Game.hold = true;
    var go = function () {
      ['pointerdown', 'touchstart', 'keydown'].forEach(function (ev) {
        window.removeEventListener(ev, go, true);
      });
      Game.hold = false;
      self.el('ctrlHint').classList.remove('hold');
    };
    ['pointerdown', 'touchstart', 'keydown'].forEach(function (ev) {
      window.addEventListener(ev, go, { capture: true, passive: true });
    });
  },

  showCtrlHint: function () {
    var el = this.el('ctrlHint');
    var touch = Input.isTouch();
    el.classList.toggle('is-touch', touch);
    el.classList.toggle('is-pc', !touch);
    el.classList.toggle('hold', !!Game.hold);
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

  gfxLost: function () {
    this.markView();
    if (!Game.running || Game.over) { this.toast(I18N.t('gfxLostToast')); return; }
    if (!Game.paused) this.togglePause();
    this.el('gfxLost').classList.remove('hidden');
  },
  gfxLostEnd: function (quit) {
    this.el('gfxLost').classList.add('hidden');
    if (quit) { this.quitRun(); return; }
    if (Game.running && Game.paused && !this.el('scrPause').classList.contains('hidden')) this.togglePause();
  },

  quitRun: function () {
    Game.settle();
    Game.commit();
    Game.quit();
    this.show('scrMenu');
    this.refreshMenu();
  },

  setSound: function (kind, on) {
    var set = Save.data.set;
    set[kind] = on ? 1 : 0;
    if (kind === 'sfx') Snd.setSfx(set.sfx); else Snd.setMusic(set.music);
    this.el('setSfx').checked = !!set.sfx; this.el('pauseSfx').checked = !!set.sfx;
    this.el('setMusic').checked = !!set.music; this.el('pauseMusic').checked = !!set.music;
    PF.setSound(set.sfx || set.music);
    Save.flush(true);
  },

  sndDbg: function () {
    var box = document.getElementById('sndDbg');
    if (box) { clearInterval(this.sndDbgT); box.parentNode.removeChild(box); return; }
    box = document.createElement('div');
    box.id = 'sndDbg';
    box.innerHTML = '<pre></pre><div><button type="button" class="btn" data-a="beep">ПИСК</button>' +
      '<button type="button" class="btn" data-a="play">ЗВУК ИГРЫ</button><button type="button" class="btn" data-a="x">ЗАКРЫТЬ</button></div>';
    document.body.appendChild(box);
    var pre = box.firstChild, self = this;
    var fill = function () { try { pre.textContent = Snd.diag().join('\n'); } catch (e) { pre.textContent = String(e); } };
    box.addEventListener('click', function (e) {
      var a = e.target && e.target.getAttribute && e.target.getAttribute('data-a');
      if (a === 'beep') Snd.beep();
      if (a === 'play') { Snd.unlock(); Snd.play('level'); }
      if (a === 'x') self.sndDbg();
      fill();
    });
    fill();
    this.sndDbgT = setInterval(fill, 500);
  },

  syncZoom: function () {
    var pct = Game.zoomPct();
    this.el('setZoom').value = pct; this.el('pauseZoom').value = pct;
    this.el('setZoomText').textContent = pct + '%'; this.el('pauseZoomText').textContent = pct + '%';
  },

  setVol: function (v, done) {
    var set = Save.data.set;
    set.vol = Math.round(U.clamp(v, 0, 1) * 100) / 100;
    Snd.setVol(set.vol);
    this.syncVol();
    if (done) { Save.flush(true); Snd.play('coin'); }
  },

  syncVol: function () {
    var v = Save.data.set.vol, pct = Math.round((v === undefined ? 0.5 : v) * 100);
    this.el('setVol').value = pct; this.el('pauseVol').value = pct;
    this.el('setVolText').textContent = pct + '%'; this.el('pauseVolText').textContent = pct + '%';
  },

  openMaps: function () { this.show('scrMaps'); this.renderMaps(); },
  renderMaps: function () {
    var L = Maps.list(), sel = Maps.sel(), html = '', self = this, i;
    for (i = 0; i < L.length; i++) {
      var m = L[i], open = Maps.open(m.id), r = Maps.rec(m.id), on = m.id === sel;
      html += '<button type="button" class="map-it th-' + m.theme + (on ? ' on' : '') + (open ? '' : ' lock') + '" data-id="' + m.id + '">' +
        '<i class="map-sw"></i><span class="map-tx"><b>' + I18N.t('map_' + m.id) + '</b>' +
        '<em>' + I18N.t('mapD_' + m.id) + '</em>' +
        (open ? '<s>' + I18N.t('mapRec', { s: U.num(r.best.score), n: Math.min(CFG.nakal.max, r.prestige | 0) }) + '</s>'
          : '<s class="need">' + I18N.t('mapNeed', { n: I18N.t('map_' + m.need) }) + '</s>') +
        '</span><strong>' + I18N.t(on ? 'mapOn' : (open ? 'mapGo' : 'mapLock')) + '</strong></button>';
    }
    for (i = 0; i < CFG.maps.soon; i++) {
      html += '<div class="map-it soon"><i class="map-sw"></i><span class="map-tx"><b>? ? ?</b><em>' +
        I18N.t('mapSecret') + '</em></span><strong>' + I18N.t('mapSoon') + '</strong></div>';
    }
    var list = this.el('mapsList');
    list.innerHTML = html;
    var its = list.querySelectorAll('button.map-it');
    for (i = 0; i < its.length; i++) {
      its[i].onclick = function () {
        var id = this.getAttribute('data-id');
        if (!Maps.open(id)) { Snd.play('deny'); self.toast(I18N.t('mapNeed', { n: Maps.name(Maps.byId(id).need) })); return; }
        Maps.pick(id);
        Snd.play('pick');
        self.show('scrMenu');
        self.refreshMenu();
      };
    }
  },

  escapeScreen: function () {
    var ids = ['scrShop', 'scrBoard', 'scrMaps', 'scrSettings'];
    for (var i = 0; i < ids.length; i++) {
      if (!this.el(ids[i]).classList.contains('hidden')) { this.show('scrMenu'); this.refreshMenu(); return true; }
    }
    return false;
  },

  togglePause: function () {
    if (!Game.running || Game.over) return;
    if (!this.el('scrLevel').classList.contains('hidden')) return;
    if (!this.el('scrOver').classList.contains('hidden')) return;
    Input.reset();
    if (Game.paused) {
      this.tipHide();
      this.el('scrPause').classList.add('hidden');
      this.el('hud').classList.remove('hidden');
      Game.pause(false);
    } else {
      Game.pause(true);
      this.syncZoom();
      this.renderPauseSkills();
      this.el('pauseSlots').innerHTML = this.slotsHtml();
      this.el('pauseLvl').textContent = I18N.t('lvlUp') + ' ' + Game.player.level;
      var nk = Nakal.pauseText(), pn = this.el('pauseNakal');
      pn.textContent = nk; pn.classList.toggle('hidden', !nk);
      this.el('pauseSfx').checked = !!Save.data.set.sfx;
      this.el('pauseMusic').checked = !!Save.data.set.music;
      this.el('scrPause').classList.remove('hidden');
      this.el('hud').classList.add('hidden');
    }
  },

  slotsHtml: function (cards) {
    var p = Game.player, tk = Skills.taken(p), html = '', kinds = ['spell', 'part'];
    var hl = this.slotMap(p, tk, cards);
    for (var k = 0; k < kinds.length; k++) {
      var kind = kinds[k], list = tk[kind], n = Skills.slots[kind];
      html += '<div class="slot-grp ' + kind + '"><u>' + I18N.t(kind === 'spell' ? 'slotSpells' : 'slotParts') + ' ' + list.length + '/' + n + '</u>';
      for (var i = 0; i < n; i++) {
        var s = list[i], h = hl[kind + i], hc = '';
        if (h) for (var j = 0; j < h.length; j++) hc += ' c' + h[j].c;
        if (!s) {
          if (!h) { html += '<div class="sl empty"></div>'; continue; }
          var ns = h[0].s, ics = '';
          for (j = 0; j < h.length; j++) ics += Glyph.html(h[j].s.ic, h[j].s.col || '#ffd27d', 'n' + h[j].c + (j ? ' alt' : ''));
          html += '<div class="sl empty hl new' + hc + '" data-tip="s:' + ns.id + '">' + ics + '<b>+</b></div>';
          continue;
        }
        var lvl = p.skills[s.id], ev = p.evo[s.id] && Evo.of(s.id);
        var mark = h ? (h[0].evo ? '<b class="ev">★</b>' : '<b class="cur">' + lvl + '</b><b class="up">▲' + (lvl + 1) + '</b>') : '<b>' + lvl + '</b>';
        html += '<div class="sl' + (ev ? ' evo' : '') + (lvl >= s.max ? ' max' : '') + (h ? ' hl' + (h[0].evo ? ' hlev' : '') + hc : '') +
          '" data-tip="s:' + s.id + '">' +
          (ev ? '<u class="ev-star">★</u>' : '') +
          Glyph.html(s.ic, s.col || '#ffd27d') + mark + '</div>';
      }
      html += '</div>';
    }
    return html;
  },

  slotMap: function (p, tk, cards) {
    var hl = {}, add = {};
    if (!cards) return hl;
    for (var c = 0; c < cards.length; c++) {
      var s = cards[c], evo = false;
      if (this.mode === 'evo') {
        if (s.boss || !s.skill) continue;
        s = Skills.byId(s.skill); evo = true;
        if (!s) continue;
      }
      var kind = Skills.kindOf(s), list = tk[kind], idx = -1;
      for (var i = 0; i < list.length; i++) if (list[i].id === s.id) idx = i;
      if (idx < 0) {
        if (evo) continue;
        add[kind] = add[kind] || 0;
        idx = list.length + add[kind] < Skills.slots[kind] ? list.length + add[kind] : list.length;
        add[kind]++;
        if (idx >= Skills.slots[kind]) continue;
      }
      (hl[kind + idx] = hl[kind + idx] || []).push({ c: c, s: s, evo: evo });
    }
    return hl;
  },

  slotHot: function (n) {
    var row = this.el('lvlSlots');
    row.classList.remove('hot', 'hot0', 'hot1', 'hot2');
    if (n >= 0) row.classList.add('hot', 'hot' + n);
  },

  renderPauseSkills: function () {
    var p = Game.player, html = '', tk = Skills.taken(p), own = tk.spell.concat(tk.part);
    for (var oi = 0; oi < own.length; oi++) {
      var s = own[oi], id = s.id, lvl = p.skills[id];
      var now = s.at ? s.at(lvl - 1) : I18N.desc(s);
      var ev = p.evo[id] && Evo.of(id);
      html += '<div class="ps' + (ev ? ' evo' : '') + '" data-tip="s:' + id + '">' +
        Glyph.html(s.ic, s.col || '#ffd27d') +
        '<b>' + (ev ? '★ ' + I18N.name(ev) : I18N.name(s)) + '</b><span>' + lvl + '/' + s.max + '</span>' +
        '<em>' + now + '</em></div>';
    }
    var gev = p.evo[p.gun.id] && Evo.of(p.gun.id);
    if (gev) html += '<div class="ps evo" data-tip="g:">' + Glyph.html(gev.ic) + '<b>★ ' + I18N.name(gev) + '</b><span></span>' +
      '<em>' + I18N.name(p.gun) + '</em></div>';
    for (var ti = 0; ti < Trophy.list.length; ti++) {
      var tr = Trophy.list[ti];
      if (!p.tr[tr.boss]) continue;
      html += '<div class="ps troph" data-tip="t:' + tr.boss + '">' + Glyph.html(tr.ic, Bosses.byId(tr.boss).trim) +
        '<b>' + I18N.name(tr) + '</b><span>' + Trophy.bossName(tr) + '</span><em>' + I18N.desc(tr) + '</em></div>';
    }
    this.el('pauseSkills').innerHTML = html;
  },

  tipInit: function () {
    var self = this;
    function find(t) {
      while (t && t.getAttribute) {
        if (t.getAttribute('data-tip')) return t;
        t = t.parentNode;
      }
      return null;
    }
    document.addEventListener('mouseover', function (e) {
      if (self.tipTouchT && Date.now() - self.tipTouchT < 800) return;
      var t = find(e.target);
      if (t) self.tipShow(t); else self.tipHide();
    });
    document.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      self.tipTouchT = Date.now();
      var t = find(e.target);
      if (t && t !== self.tipFor) self.tipShow(t); else self.tipHide();
    }, true);
    var ps = this.el('pauseSkills');
    if (ps) ps.addEventListener('scroll', function () { self.tipHide(); });
    window.addEventListener('resize', function () { self.tipHide(); });
  },

  tipHtml: function (key) {
    var p = Game.player, k = key.split(':'), html = '';
    if (k[0] === 'nk') {
      return '<h3>' + I18N.t('nakal') + '</h3><p>' + I18N.t('nkInfo1') + '</p><p>' + I18N.t('nkInfo2') + '</p><p>' + I18N.t('nkInfo3') + '</p>';
    }
    if (!p) return '';
    if (k[0] === 's') {
      var s = Skills.byId(k[1]);
      if (!s) return '';
      var lvl = p.skills[s.id] || 0, ev = p.evo[s.id] && Evo.of(s.id);
      html = '<h3>' + Glyph.html(s.ic, s.col || '#ffd27d') + ' ' + I18N.name(s) + '</h3>' +
        '<p' + (ev && ev.swap ? ' class="was"' : '') + '>' + I18N.desc(s) + '</p>' +
        '<div class="stack">' + I18N.t('stack', { n: lvl, m: s.max }) + ' · ' + I18N.t(Skills.kindOf(s) === 'spell' ? 'kindSpell' : 'kindPart') + '</div>' +
        (s.at && lvl ? '<div class="next">' + s.at(lvl - 1) + '</div>' : '');
      if (ev) html += '<div class="tip-evo"><h3>★ ' + I18N.name(ev) + '</h3><p>' + I18N.desc(ev) + '</p></div>';
      return html;
    }
    if (k[0] === 'g') {
      var gev = p.evo[p.gun.id] && Evo.of(p.gun.id);
      if (!gev) return '';
      return '<h3>' + I18N.name(p.gun) + '</h3><p>' + I18N.desc(p.gun) + '</p>' +
        '<div class="tip-evo"><h3>★ ' + I18N.name(gev) + '</h3><p>' + I18N.desc(gev) + '</p></div>';
    }
    if (k[0] === 't') {
      var tr = Trophy.byBoss(k[1]);
      if (!tr) return '';
      return '<h3 class="tip-tr">' + I18N.name(tr) + '</h3><p>' + I18N.desc(tr) + '</p>' +
        '<div class="stack tip-tr">' + I18N.t('trophyOf', { n: Trophy.bossName(tr) }) + '</div>';
    }
    return '';
  },

  tipShow: function (el) {
    var tip = this.el('tip'), html = this.tipHtml(el.getAttribute('data-tip'));
    if (!html) { this.tipHide(); return; }
    if (this.tipFor === el && !tip.classList.contains('hidden')) return;
    this.tipFor = el;
    tip.innerHTML = html;
    tip.className = 'tip' + (el.classList.contains('evo') ? ' evo' : '') + (el.classList.contains('troph') ? ' troph' : '');
    var r = el.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight, m = 8;
    tip.style.left = '0px'; tip.style.top = '0px';
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    var x = U.clamp(r.left + r.width / 2 - tw / 2, m, Math.max(m, W - tw - m));
    var y = r.top - th - 8;
    if (y < m) y = r.bottom + 8;
    if (y + th > H - m) y = Math.max(m, H - th - m);
    tip.style.left = Math.round(x) + 'px';
    tip.style.top = Math.round(y) + 'px';
  },

  tipHide: function () {
    this.tipFor = null;
    var tip = this.el('tip');
    if (tip && !tip.classList.contains('hidden')) tip.classList.add('hidden');
  },

  updateHud: function () {
    var p = Game.player;
    if (!p) return;
    this.el('xpFill').style.width = U.clamp(p.xp / p.xpNeed * 100, 0, 100) + '%';
    this.el('lvlText').textContent = p.level;
    this.el('timeText').textContent = U.time(Game.time);
    this.el('coinText').textContent = U.num(Game.runCoins);
    this.el('killText').textContent = Game.kills;
    this.el('scoreText').textContent = U.num(Game.finalScore()) + ' ' + I18N.t('scoreShort');
    LB.tick();
    this.el('hpFill').style.width = U.clamp(p.hp / p.st.maxHp * 100, 0, 100) + '%';
    this.el('hpText').textContent = Math.ceil(p.hp) + ' / ' + Math.round(p.st.maxHp);

    var dash = this.el('dashBtn');
    dash.classList.toggle('cd', (p.dashCdT > 0 && !p.dashQ) || p.muteT > 0);

    var ab = this.el('abDash');
    var onCd = (p.dashCdT > 0 && !p.dashQ) || p.muteT > 0;
    ab.classList.toggle('cool', onCd);
    var dmax = Spells.dashMax(p), dn = 0, dk = 0;
    if (dmax > 1) {
      dn = (p.dashCdT <= 0 ? 1 : 0) + p.dashQ;
      if (dn < dmax) dk = Math.floor(U.clamp(1 - (p.dashCdT > 0 ? p.dashCdT : p.dashQT) / Spells.dashCd(p), 0, 1) * 20);
    }
    var dsig = dmax > 1 ? dn + ':' + dmax + ':' + dk : '';
    if (dsig !== this.dashSig) {
      var dq = this.el('dashQ'), an = this.el('abDashN');
      if (this.dashSig === undefined || dsig.split(':', 2).join() !== String(this.dashSig).split(':', 2).join()) {
        var pips = '';
        for (var qi = 0; qi < dmax && dmax > 1; qi++) pips += '<i' + (qi < dn ? ' class="on"' : '') + '></i>';
        dq.innerHTML = pips; an.innerHTML = pips;
        dash.classList.toggle('q', dmax > 1);
        an.classList.toggle('hidden', dmax <= 1);
      }
      this.dashSig = dsig;
      dash.style.setProperty('--dq', (dk * 5) + '%');
      if (dmax > 1) this.el('abDashCd').style.width = dn < dmax ? (dk * 5) + '%' : '0';
    }
    if (dmax <= 1) this.el('abDashCd').style.width = onCd ? (100 - p.dashCdT / p.st.dashCd * 100) + '%' : '0';

    var dbf = Player.debuffs(p);
    var bsig = Math.ceil(p.buffs.rage) + ':' + Math.ceil(p.buffs.haste) + ':' + p.buffs.shield;
    for (var bi = 0; bi < dbf.length; bi += 2) bsig += ':' + dbf[bi] + Math.ceil(dbf[bi + 1]);
    if (bsig !== this.buffSig) {
      this.buffSig = bsig;
      var bh = '', BC = CFG.col.buff;
      for (bi = 0; bi < dbf.length; bi += 2) {
        bh += '<div class="bad" style="--dc:' + (CFG.col.debuffs[dbf[bi]] || CFG.col.debuff) + '">' + I18N.t('debuff_' + dbf[bi]) + ' <s>' + I18N.t('debuffEff_' + dbf[bi]) + '</s>' + (dbf[bi + 1] > 0 ? ' ' + Math.ceil(dbf[bi + 1]) : '') + '</div>';
      }
      if (p.buffs.rage > 0) bh += '<div style="color:' + BC.rage + ';border-color:' + BC.rage + '">' + I18N.t('buff_rage') + ' <s>' + I18N.t('buffEff_rage') + '</s> ' + Math.ceil(p.buffs.rage) + '</div>';
      if (p.buffs.haste > 0) bh += '<div style="color:' + BC.haste + ';border-color:' + BC.haste + '">' + I18N.t('buff_haste') + ' <s>' + I18N.t('buffEff_haste') + '</s> ' + Math.ceil(p.buffs.haste) + '</div>';
      if (p.buffs.shield > 0) bh += '<div style="color:' + BC.shield + ';border-color:' + BC.shield + '">' + I18N.t('buff_shield') + ' <s>' + I18N.t('buffEff_shield') + '</s> ' + p.buffs.shield + '</div>';
      this.el('buffStrip').innerHTML = bh;
    }

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

    var sb = this.el('stageBar');
    if (boss || !Game.flags) sb.classList.add('hidden');
    else {
      sb.classList.remove('hidden');
      var waiting = Bosses.waiting(this.lairList || (this.lairList = []));
      var t0 = Game.stageT0, t1 = Math.max(Game.nextBoss, t0 + 1), left = t1 - Game.time;
      this.el('stageFill').style.width = U.clamp((Game.time - t0) / (t1 - t0) * 100, 0, 100) + '%';
      var fsig = Game.stageN + ':' + Math.round(t1) + ':' + Game.flags.map(function (f) { return f.done ? 1 : 0; }).join('');
      if (fsig !== this.flagSig) {
        this.flagSig = fsig;
        this.el('stageNow').textContent = Game.stageN;
        this.el('stageNext').textContent = Game.stageN + 1;
        this.el('stageFlags').innerHTML = Game.flags.map(function (f) {
          return '<u class="' + (f.done ? 'done' : '') + '" style="left:' + U.clamp((f.at - t0) / (t1 - t0) * 100, 0, 100).toFixed(1) + '%"></u>';
        }).join('');
      }
      var soon = left <= 10;
      var w0 = waiting[0];
      var goal = Finale.goal() || (w0 ? I18N.t('lairWait', { n: I18N.name(w0.bd), p: Bosses.power(w0) }) + (waiting.length > 1 ? ' +' + (waiting.length - 1) : '')
        : I18N.t('stageGoal', { t: U.time(Math.max(0, Math.ceil(left))) }));
      if (goal !== this.goalText) { this.goalText = goal; this.el('stageGoal').textContent = goal; }
      sb.classList.toggle('soon', soon);
      sb.classList.toggle('intro', Game.stageN === 1 && Game.time < 5);
    }

    var sig = p.evoN + ':' + p.trN + ':';
    for (var k in p.skills) sig += k + p.skills[k] + (p.evo[k] ? '*' : '');
    if (sig !== this.skillSig) {
      this.skillSig = sig;
      var html = '', gev = p.evo[p.gun.id] && Evo.of(p.gun.id);
      if (gev) html += '<div class="evo" title="' + I18N.name(gev) + '">' + Glyph.html(gev.ic) + '</div>';
      for (var id in p.skills) {
        var s = Skills.byId(id), ev = p.evo[id] && Evo.of(id);
        if (!s) continue;
        html += '<div' + (ev ? ' class="evo"' : '') + ' title="' + (ev ? I18N.name(ev) : I18N.name(s)) + '">' + Glyph.html(s.ic, s.col || '#ffd27d') + ' <b>' + (ev ? '★' : '') + p.skills[id] + '</b></div>';
      }
      for (var ti = 0; ti < Trophy.list.length; ti++) {
        var tr = Trophy.list[ti];
        if (p.tr[tr.boss]) html += '<div class="troph" title="' + I18N.name(tr) + '">' + Glyph.html(tr.ic, Bosses.byId(tr.boss).trim) + '</div>';
      }
      this.el('skillStrip').innerHTML = html;
    }
  },

  bossBanner: function (name, incoming) {
    this.banner(I18N.t(incoming ? 'bossIn' : 'bossOut'), name);
  },

  banner: function (kind, name) {
    var b = this.el('bossBanner');
    this.el('bannerKind').textContent = kind;
    this.el('bannerName').textContent = name;
    b.classList.remove('hidden');
    var top = 0, bars = ['stageBar', 'bossBar'];
    for (var i = 0; i < bars.length; i++) {
      var bar = this.el(bars[i]);
      if (bar && !bar.classList.contains('hidden')) top = Math.max(top, bar.getBoundingClientRect().bottom);
    }
    b.style.top = '';
    if (top) {
      var bh = b.offsetHeight, mid = window.innerHeight / 2;
      top += 10;
      if (top + bh > mid - 28 && mid + 40 + bh < window.innerHeight - 40) top = mid + 40;
      b.style.top = Math.round(top) + 'px';
    }
    b.style.animation = 'none';
    void b.offsetWidth;
    b.style.animation = '';
    clearTimeout(this.bannerT);
    this.bannerT = setTimeout(function () { b.classList.add('hidden'); }, 2600);
  },

  showLevelUp: function () {
    var cards = Skills.roll(Game.player, 3);
    if (!cards.length) { this.noCards(Game.player); return; }
    Game.pause(true);
    Input.reset();
    Snd.play('level');
    this.mode = 'lvl';
    this.el('lvlNum').textContent = Game.player.level;
    this.el('hud').classList.add('hidden');
    this.el('scrLevel').classList.remove('evo');
    this.el('scrLevel').classList.remove('hidden');
    this.renderCards(cards);
    var rr = this.el('btnReroll');
    rr.disabled = Game.rerollsLeft <= 0;
    this.syncAdButtons();
  },

  noCards: function (p) {
    p.heal(p.st.maxHp * 0.35);
    Game.runCoins += 25;
    FX.text(p.x, p.y - 30, I18N.t('hpFull'), '#7ee08a', 15);
    Snd.play('level');
  },

  renderCards: function (cards) {
    var row = this.el('cardRow'), self = this, p = Game.player;
    row.innerHTML = '';
    this.cards = cards;
    row.classList.toggle('kb', !Input.isTouch());
    for (var i = 0; i < cards.length; i++) {
      (function (s, n) {
        var div = document.createElement('div');
        if (self.mode === 'evo' && s.boss) {
          div.className = 'card troph';
          div.innerHTML = '<div class="key">' + (n + 1) + '</div>' +
            '<div class="ic" style="color:' + Bosses.byId(s.boss).trim + '">' + Glyph.html(s.ic) + '</div>' +
            '<h3>' + I18N.name(s) + '</h3>' +
            '<p>' + I18N.desc(s) + '</p>' +
            '<div class="stack">' + I18N.t('trophyOf', { n: Trophy.bossName(s) }) + '</div>';
          div.onclick = function () { self.pickEvo(s); };
          row.appendChild(div);
          return;
        }
        if (self.mode === 'evo') {
          var base = s.skill ? Skills.byId(s.skill) : null;
          div.className = 'card evo';
          div.innerHTML = '<div class="key">' + (n + 1) + '</div>' +
            '<div class="ic" style="color:' + (base ? base.col : '#f2c46a') + '">' + Glyph.html(s.ic) + '</div>' +
            '<h3>' + I18N.name(s) + '</h3>' +
            '<p>' + I18N.desc(s) + '</p>' +
            '<div class="stack">' + Evo.base(p, s) + '</div>';
          div.onclick = function () { self.pickEvo(s); };
          row.appendChild(div);
          return;
        }
        var lvl = p.skills[s.id] || 0, ev = p.evo[s.id] && Evo.of(s.id);
        div.className = 'card ' + (s.rar === 'leg' ? 'leg' : (s.rar === 'epic' ? 'epic' : (s.rar === 'rare' ? 'rare' : ''))) + (ev ? ' evolved' : '');
        div.innerHTML = '<div class="key">' + (n + 1) + '</div>' +
          '<div class="ic" style="color:' + (s.col || '#ffd27d') + '">' + Glyph.html(s.ic) + '</div>' +
          '<h3>' + I18N.name(s) + (ev ? ' <s>' + I18N.name(ev) + '</s>' : '') + '</h3>' +
          '<p>' + (ev ? (ev.swap ? '<s class="was">' + I18N.desc(s) + '</s>' : I18N.desc(s)) + '<em>' + I18N.desc(ev) + '</em>' : I18N.desc(s)) + '</p>' +
          '<div class="stack">' + (lvl ? I18N.t('stackUp', { a: lvl, n: lvl + 1, m: s.max }) : I18N.t('newSkill') + ' · ' + I18N.t(Skills.kindOf(s) === 'spell' ? 'kindSpell' : 'kindPart')) + '</div>' +
          (s.at && lvl ? '<div class="next">' + I18N.t('willBe', { v: s.at(lvl) }) + '</div>' : '');
        div.onclick = function () { self.pickCard(s); };
        row.appendChild(div);
      })(cards[i], i);
    }
    for (var ci = 0; ci < row.children.length; ci++) {
      (function (n) {
        var d = row.children[n];
        d.onmouseenter = function () { self.slotHot(n); };
        d.onmouseleave = function () { self.slotHot(-1); };
      })(ci);
    }
    this.slotHot(-1);
    this.el('lvlSlots').innerHTML = this.slotsHtml(cards);
  },

  showEvo: function () {
    var p = Game.player, cards = Evo.cards(p);
    if (!cards.length) return;
    Game.pause(true);
    Input.reset();
    Snd.play('level');
    this.mode = 'evo';
    var allTr = true;
    for (var i = 0; i < cards.length; i++) if (!cards[i].boss) allTr = false;
    this.el('evoWord').textContent = I18N.t(allTr ? 'trophyTitle' : 'evoTitle');
    this.el('evoNum').textContent = allTr ? (p.trN + 1) + '/' + Trophy.max : (p.evoN + 1) + '/' + Evo.max;
    this.el('hud').classList.add('hidden');
    this.el('scrLevel').classList.add('evo');
    this.el('scrLevel').classList.toggle('troph', allTr);
    this.el('scrLevel').classList.remove('hidden');
    this.renderCards(cards);
  },

  pickEvo: function (ev) {
    Input.reset();
    Evo.pick(Game.player, ev);
    Snd.play('buy');
    this.el('scrLevel').classList.add('hidden');
    this.el('scrLevel').classList.remove('evo');
    this.el('scrLevel').classList.remove('troph');
    this.mode = 'lvl';
    this.skillSig = null;
    this.resumeAfterCards();
  },

  pickByKey: function (n) {
    if (this.el('scrLevel').classList.contains('hidden')) return;
    if (this.cards && this.cards[n]) {
      if (this.mode === 'evo') this.pickEvo(this.cards[n]);
      else this.pickCard(this.cards[n]);
    }
  },

  pickCard: function (skill) {
    Input.reset();
    Player.take(Game.player, skill);
    Snd.play('buy');
    this.el('scrLevel').classList.add('hidden');
    this.skillSig = null;

    Game.adLevelCounter++;
    var self = this;
    if (Game.adLevelCounter % CFG.ads.levelEvery === 0 && PF.canFullscreen('run')) {
      PF.showFullscreen(function () { self.resumeAfterCards(); }, 'run');
    } else {
      this.resumeAfterCards();
    }
  },

  afterAd: function () {
    var self = this;
    clearTimeout(this.gateT);
    this.gateT = setTimeout(function () {
      if (Input.touch || !document.hasFocus || document.hasFocus()) return;
      if (!Game.running || Game.paused || Game.over) return;
      var g = self.el('focusGate');
      var sp = g.querySelector('span');
      if (sp) sp.setAttribute('data-i18n', Input.isTouch() ? 'focusGateTouch' : 'focusGate');
      I18N.apply();
      Game.pause(true);
      g.classList.remove('hidden');
      var done = function () {
        window.removeEventListener('focus', done);
        g.removeEventListener('pointerdown', done);
        g.classList.add('hidden');
        PF.refocus();
        Input.reset();
        var overlay = !self.el('scrPause').classList.contains('hidden') ||
          !self.el('scrLevel').classList.contains('hidden');
        if (Game.running && Game.paused && !Game.over && !overlay) Game.pause(false);
      };
      window.addEventListener('focus', done);
      g.addEventListener('pointerdown', done);
    }, 700);
  },

  resumeAfterCards: function () {
    if (Game.over) return;
    Input.reset();
    this.el('hud').classList.remove('hidden');
    Game.pause(false);
  },

  reroll: function () {
    var self = this;
    if (Game.running && Nakal.has(7)) return;
    if (Game.rerollsLeft <= 0) { this.toast(I18N.t('rerollOut')); Snd.play('deny'); return; }
    PF.showRewarded(function () {
      Game.rerollsLeft--;
      var rc = Skills.roll(Game.player, 3);
      if (rc.length) self.renderCards(rc);
      self.el('btnReroll').disabled = Game.rerollsLeft <= 0;
    }, function (why) {
      self.adToast(why);
    });
  },

  showGameOver: function () {
    Input.reset();
    var res = Game.settle();
    this.fillOver(res, false);
    this.el('btnRevive').classList.toggle('hidden', Game.reviveLeft <= 0);
    this.el('btnDouble').classList.toggle('hidden', !!Game.doubled);
    this.syncAdButtons();
    this.el('scrOver').classList.remove('hidden');
  },

  showWin: function () {
    Input.reset();
    Game.pause(true);
    var res = Game.settle();
    this.fillOver(res, true);
    this.el('scrOver').classList.remove('hidden');
    PF.happyMoment();
  },

  winNext: function () {
    Input.reset();
    Game.unsettle();
    Finale.cont();
    this.el('scrOver').classList.add('hidden');
    this.el('scrOver').classList.remove('win');
    this.el('hud').classList.remove('hidden');
    Game.pause(false);
  },

  fillOver: function (res, win) {
    this.el('hud').classList.add('hidden');
    this.el('scrLevel').classList.add('hidden');
    var ov = this.el('scrOver'), title = ov.querySelector('.over-title');
    ov.classList.toggle('win', win);
    title.setAttribute('data-i18n', win ? 'winTitle' : (Game.won ? 'overWon' : 'over'));
    title.textContent = I18N.t(title.getAttribute('data-i18n'));
    this.el('ovWinSub').classList.toggle('hidden', !win);
    this.el('ovWinSub').innerHTML = I18N.t('winSub') + ' · ' + I18N.t('winsN', { n: Maps.rec(res.map).wins || 0 }) +
      '<span class="nk-win">' + Nakal.winText() + '</span>' +
      (Game.mapUp ? '<span class="nk-win map-win">' + I18N.t('mapOpened', { m: Maps.name(Game.mapUp) }) + '</span>' : '');
    ['btnRevive', 'btnDouble', 'btnAgain', 'btnToMenu'].forEach(function (id) { this.el(id).classList.toggle('hidden', win); }, this);
    this.el('winGoWrap').classList.toggle('hidden', !win);
    this.el('btnWinTake').classList.toggle('hidden', !win);
    this.el('btnWinDouble').classList.toggle('hidden', !win || !!Game.doubled || !PF.canReward());
    this.el('ovScore').textContent = U.num(res.score);
    this.el('ovTime').textContent = U.time(res.time);
    this.el('ovKills').textContent = res.kills;
    this.el('ovCoins').textContent = U.num(Game.payout);
    var sp = Game.scoreParts;
    this.el('ovBreak').innerHTML =
      '<div><span>' + I18N.t('breakKills') + '</span><b>' + U.num(sp.kills) + '</b></div>' +
      '<div><span>' + I18N.t('breakLevels') + '</span><b>' + U.num(sp.levels) + '</b></div>' +
      (sp.bosses ? '<div><span>' + I18N.t('breakBosses') + '</span><b>' + U.num(sp.bosses) + '</b></div>' : '') +
      (sp.win ? '<div class="bw"><span>' + I18N.t('breakWin') + ' · ' + I18N.t('winLootX') + '</span><b>' + U.num(sp.win) + '</b></div>' : '') +
      '<div><span>' + I18N.t('breakTime') + '</span><b>' + U.num(sp.time) + '</b></div>' +
      (res.nakal > 0 ? '<div class="nk-x"><span>' + I18N.t('nakal') + ' ' + res.nakal + '</span><b>x' + Nakal.scoreK(res.nakal) + '</b></div>' : '');
    this.el('ovNewBest').classList.toggle('hidden', res.score <= Maps.rec(res.map).best.score);
    LB.over(res);
  },

  revive: function () {
    var self = this;
    if (Game.reviveLeft <= 0) { this.toast(I18N.t('reviveOut')); return; }
    PF.showRewarded(function () {
      Game.reviveLeft--;
      Input.reset();
      self.el('scrOver').classList.add('hidden');
      self.el('hud').classList.remove('hidden');
      Game.unsettle();
      Game.revive();
    }, function (why) {
      self.adToast(why);
    });
  },

  doubleCoins: function () {
    var self = this;
    PF.showRewarded(function () {
      if (Game.doubled) return;
      Game.doubled = true;
      Game.payout *= 2;
      self.el('ovCoins').textContent = U.num(Game.payout);
      self.el('btnDouble').classList.add('hidden');
      Snd.play('coin');
    }, function (why) {
      self.adToast(why);
    });
  },

  winDouble: function () {
    var self = this;
    PF.showRewarded(function () {
      if (!Game.doubled) {
        Game.doubled = true;
        Game.payout *= 2;
        self.el('ovCoins').textContent = U.num(Game.payout);
        Snd.play('coin');
      }
      self.finishToMenu('upgrades', true);
    }, function (why) {
      self.adToast(why);
    });
  },

  again: function () {
    Game.commit();
    var self = this;
    if (PF.canFullscreen()) {
      PF.showFullscreen(function () { self.startRun(); });
    } else {
      this.startRun();
    }
  },

  finishToMenu: function (shopTab, noAd) {
    Game.commit();
    Game.quit();
    var self = this;
    function go() {
      self.show('scrMenu');
      self.refreshMenu();
      if (typeof shopTab === 'string') self.openShop(shopTab);
    }
    if (!noAd && PF.canFullscreen('nav')) PF.showFullscreen(go, 'nav');
    else go();
  },

  openShop: function (tab) {
    this.hgPeek = null;
    View3D.setTheme(Maps.theme());
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

  renderShopMaps: function (list) {
    var L = Maps.list(), self = this, i;
    if (!View3D.on || L.length < 2) return;
    var box = document.createElement('div');
    box.className = 'shop-maps';
    list.appendChild(box);
    var sel = Maps.sel(), peek = this.hgPeek && !Maps.open(this.hgPeek) ? this.hgPeek : null, html = '';
    for (i = 0; i < L.length; i++) {
      var m = L[i];
      html += '<button type="button" class="sm-chip th-' + m.theme + (m.id === sel ? ' on' : '') + (m.id === peek ? ' peek' : '') +
        (Maps.open(m.id) ? '' : ' lock') + '" data-id="' + m.id + '"><i></i>' + Maps.name(m.id) + '</button>';
    }
    if (peek) html += '<s>' + I18N.t('mapNeed', { n: Maps.name(Maps.byId(peek).need) }) + '</s>';
    box.innerHTML = html;
    var bs = box.querySelectorAll('.sm-chip');
    for (i = 0; i < bs.length; i++) {
      bs[i].onclick = function () {
        var id = this.getAttribute('data-id');
        if (Maps.open(id)) {
          self.hgPeek = null;
          if (id !== Maps.sel()) Maps.pick(id);
        } else self.hgPeek = self.hgPeek === id ? null : id;
        Snd.play('pick');
        View3D.setTheme(self.hgPeek ? Maps.byId(self.hgPeek).theme : Maps.theme());
        self.renderShop();
      };
    }
  },

  renderShop: function () {
    var list = this.el('shopList'), d = Save.data, self = this;
    this.el('shopCoins').textContent = U.num(d.coins);
    list.innerHTML = '';
    Nakal.renderBox();

    if (this.tab === 'upgrades') {
      this.renderUpgrades(list);
      return;
    }
    if (this.tab === 'trophies') {
      this.renderTrophies(list);
      return;
    }

    this.renderShopMaps(list);
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
          (owned ? '<div class="price">' + (active ? '' : I18N.t('equip')) + '</div>' : self.buyHtml(it.cost));

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

  buyHtml: function (cost) {
    var need = cost - Save.data.coins;
    function num(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
    return '<div class="buy' + (need > 0 ? ' poor' : '') + '"><span class="buy-btn">' + I18N.t('buy') +
      ' <b class="coin">' + num(cost) + '</b></span>' +
      (need > 0 ? '<s>' + I18N.t('upNeed', { n: num(need) }) + '</s>' : '') + '</div>';
  },

  bigThumb: function (c, charId, skinId, gunId) {
    c.width = c.height = 192;
    c.style.width = c.style.height = '112px';
    View3D.thumb(c, 'car', charId, skinId, -0.5, false, gunId);
  },

  buyUpgrade: function (id) {
    if ((Save.data.up[id] || 0) >= Save.upMax) return false;
    if (Save.upBuy(id)) { Snd.play('buy'); return true; }
    Snd.play('deny');
    this.toast(I18N.t('noCoins'));
    return false;
  },

  quickUp: ['dmg', 'hp', 'xp', 'loot', 'cd'],

  renderQuickUp: function () {
    var box = this.el('quickUp'), self = this;
    if (!box) return;
    box.innerHTML = '';
    for (var i = 0; i < this.quickUp.length; i++) {
      (function (u) {
        if (!u) return;
        var lvl = Save.data.up[u.id] || 0, max = lvl >= Save.upMax;
        var cost = max ? 0 : Save.upCost(u.id), need = cost - Save.data.coins;
        var dots = '';
        for (var k = 0; k < Save.upMax; k++) dots += '<i class="' + (k < lvl ? 'on' : '') + '"></i>';
        var b = document.createElement('button');
        b.className = 'qu ' + (max ? 'max' : (need <= 0 ? 'can' : 'poor'));
        b.title = I18N.desc(u);
        b.innerHTML = '<span class="qu-ic">' + Icons.svg(u.id, 22) + '</span>' +
          '<b>' + I18N.name(u) + '</b>' +
          '<span class="lvl-dots">' + dots + '</span>' +
          (max ? '<em>' + I18N.t('lvlMax') + '</em>'
            : '<em class="coin">' + U.num(cost) + '</em>' +
              (need > 0 ? '<s data-short="-' + U.num(need) + '">' + I18N.t('upNeed', { n: U.num(need) }) + '</s>' : ''));
        b.onclick = function () {
          if (max || !self.buyUpgrade(u.id)) return;
          self.refreshMenu();
          var nb = self.el('quickUp').children[self.quickUp.indexOf(u.id)];
          if (nb) nb.classList.add('bought');
        };
        box.appendChild(b);
      })(Content.upgrades.filter(function (x) { return x.id === self.quickUp[i]; })[0]);
    }
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
          (max ? '<div class="price">' + I18N.t('lvlMax') + '</div>' : self.buyHtml(cost));
        div.onclick = function () {
          if (self.buyUpgrade(u.id)) self.renderShop();
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

  openBoard: function () {
    this.show('scrBoard');
    var list = this.el('boardList'), self = this;
    list.innerHTML = '';
    this.el('btnAuth').classList.toggle('hidden', !PF.needAuthForBoard());

    if (LB.on) { LB.board(list); return; }
    if (PF.kind !== 'yandex' || !PF.lb) {
      var b = Maps.rec().best;
      list.innerHTML = '<div class="board-row"><span class="nm">' +
        I18N.t('boardLocal', { n: U.num(b.score) }) + '</span></div>' +
        (b.score ? '<div class="board-row me"><span class="nm">' + I18N.t('survived') + '</span><span class="sc">' + U.time(b.time) + '</span></div>' +
          '<div class="board-row me"><span class="nm">' + I18N.t('lvlUp') + '</span><span class="sc">' + b.level + '</span></div>' : '');
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
    }, function (why) {
      self.adToast(why);
    });
  }
};
