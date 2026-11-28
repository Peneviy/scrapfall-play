var Fit = {
  T: { day: 0.1, dusk: 0.46, night: 0.7 },
  tod: 'day',
  drive: false,
  kind: 'skins',
  X: 360, Y: 360,
  bound: false,

  on: function () { return !!Game.fit; },

  open: function (kind, map) {
    if (Game.running) return;
    this.bind();
    Snd.unlock();
    Input.reset();
    Cos.fitClear();
    this.drive = false;
    if (kind && Cos.kinds.indexOf(kind) >= 0) this.kind = kind;
    UI.hideAll();
    UI.el('hud').classList.add('hidden');
    UI.el('fitUi').classList.remove('hidden');
    this.enter(map && Maps.byId(map) ? map : Maps.sel());
  },

  enter: function (id) {
    var st, p;
    this.begin(id);
    this.render();
    st = Game.fit; p = Game.player;
    p.x = this.X; p.y = this.Y + st.R;
    st.cx = this.X; st.cy = this.Y - st.dy;
    Game.cam.x = st.cx; Game.cam.y = st.cy;
  },

  begin: function (id) {
    var G = Game, d = Save.data;
    var st = { map: id, t: this.T[this.tod], tg: null, R: 200, dy: 0, cx: this.X, cy: this.Y, w: 0, h: 0, layN: 0 };
    G.fit = st;
    G.running = true;
    G.paused = false; G.over = false; G.hold = false;
    Maps.run = id;
    Nakal.run = 0;
    View3D.setTheme(Maps.theme());
    G.mapUp = ''; G.nakalUp = 0;
    G.time = 0; G.spawnT = 1e9; G.nextBoss = 1e9;
    G.kills = 0; G.score = 0; G.runCoins = 0; G.pendingLevels = 0; G.pendingEvo = 0; G.bossKills = 0;
    G.scoreParts = { kills: 0, levels: 0, bosses: 0, time: 0 };
    G.rerollsLeft = 0; G.reviveLeft = 0; G.doubled = false; G.adLevelCounter = 0; G.bossIndex = 0;
    Finale.start();
    this.wipe();
    Trophy.reset();
    Spells.reset();
    Bosses.clear();
    Bosses.fighting = false;
    Enemies.clear();
    World.reset();
    FX.reset();
    G.stageN = 0; G.flags = null;

    G.player = Player.create(d.char, d.gun, Cos.cur('skins').id);
    G.player.x = this.X; G.player.y = this.Y + st.R;
    st.tg = this.target();
    G.cam.x = st.cx; G.cam.y = st.cy;
    G.acc = 0;
    G.redraw = true;
  },

  wipe: function () {
    var G = Game;
    G.enemies.length = 0; G.bullets.length = 0; G.ebullets.length = 0;
    G.gems.length = 0; G.heals.length = 0; G.turrets.length = 0; G.clouds.length = 0;
    G.drops.length = 0; G.mines.length = 0; G.waves.length = 0;
    G.rails.length = 0; G.bomblets.length = 0;
  },

  target: function () {
    var e = Enemies.spawn('dummy', this.X, this.Y, false, true);
    e.phase = 0;
    e.shootCd = 99;
    return e;
  },

  end: function () {
    if (!Game.fit) return;
    Cos.fitClear();
    Game.fit = null;
    Game.running = false;
    Game.paused = false;
    Game.over = false;
    this.wipe();
    FX.reset();
    Input.reset();
    UI.el('fitUi').classList.add('hidden');
    View3D.setTheme(Maps.theme());
    World.reset(Maps.theme());
  },

  close: function () {
    if (!Game.fit) return;
    this.end();
    UI.cosKind = this.kind;
    UI.openShop('skins');
  },

  held: function () {
    return !!(document.hidden || View3D.lost || PF.adRunning || PF.pausedByPf);
  },

  step: function (dt) {
    var st = Game.fit, p = Game.player, T = st.tg, mv = Input.move;
    if (Game.w !== st.w || Game.h !== st.h || ++st.layN >= 45) this.lay();
    if (!T || T.dead || Game.enemies.indexOf(T) < 0) T = st.tg = this.target();
    var want = this.T[this.tod];
    if (st.t !== want) st.t += U.clamp(want - st.t, -dt * 0.45, dt * 0.45);
    var sk = Cos.cur('skins').id;
    if (p.skin !== sk) p.skin = sk;

    if (this.drive) {
      st.cx = p.x; st.cy = p.y - st.dy;
      return;
    }
    Input.stick.active = false; Input.stick.id = -1;
    Input.dashWanted = false;
    var dx = p.x - T.x, dy = p.y - T.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
    if (d > st.R + 420) {
      p.x = T.x; p.y = T.y + st.R;
      dx = 0; dy = st.R; d = st.R;
    }
    var nx = dx / d, ny = dy / d, k = U.clamp((st.R - d) / 50, -1, 1);
    var mx = -ny + nx * k, my = nx + ny * k, l = Math.sqrt(mx * mx + my * my) || 1;
    var sp = 0.5 + 0.35 * U.clamp((st.R - 100) / 130, 0, 1);
    mv.x = mx / l * sp; mv.y = my / l * sp;
    st.cx = T.x; st.cy = T.y - st.dy;
  },

  lay: function () {
    var st = Game.fit;
    if (!st) return;
    var w = Game.w, h = Game.h, p = Game.player, hx, hy;
    var top = UI.el('fitTop').getBoundingClientRect().bottom, bot = UI.el('fitPanel').getBoundingClientRect().top;
    if (!(bot > top + 40)) { top = 0; bot = h; }
    var y0 = top + 6, y1 = bot - 6, ym = (y0 + y1) / 2;
    if (View3D.on) {
      var c = View3D.toGround(w / 2, h / 2), a = View3D.toGround(w / 2, y0), b = View3D.toGround(w / 2, y1);
      var le = View3D.toGround(6, ym), ri = View3D.toGround(w - 6, ym);
      st.dy = (a.y + b.y) / 2 - c.y;
      hy = (b.y - a.y) / 2;
      hx = (ri.x - le.x) / 2;
    } else {
      st.dy = (ym - h / 2) / Game.scale;
      hy = (y1 - y0) / 2 / Game.scale;
      hx = (w - 12) / 2 / Game.scale;
    }
    var pad = (p ? p.r : 13) * 2.4;
    st.R = Math.max(84, Math.min(230, (p ? p.gun.range : 500) * 0.62, hy - pad, hx - pad));
    st.w = w; st.h = h; st.layN = 0;
  },

  bind: function () {
    if (this.bound) return;
    this.bound = true;
    var self = this, i;
    UI.el('fitBack').onclick = function () { Snd.play('pick'); self.close(); };
    var tb = UI.el('fitTime').querySelectorAll('button');
    for (i = 0; i < tb.length; i++) {
      tb[i].onclick = function () {
        self.tod = this.getAttribute('data-t');
        Snd.play('pick');
        self.renderTop();
      };
    }
    UI.el('fitDrive').onclick = function () {
      self.drive = !self.drive;
      Input.reset();
      Snd.play('pick');
      self.renderTop();
    };
    var strip = UI.el('fitStrip');
    strip.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) strip.scrollLeft += e.deltaY * (e.deltaMode === 1 ? 32 : 1);
    }, { passive: true });
  },

  worn: function (kind) {
    var f = Cos.fit[kind];
    delete Cos.fit[kind];
    var it = Cos.cur(kind);
    if (f) Cos.fit[kind] = f;
    return it;
  },

  tidy: function () {
    for (var i = 0; i < Cos.kinds.length; i++) {
      var k = Cos.kinds[i], f = Cos.fit[k];
      if (f && this.worn(k).id === f) delete Cos.fit[k];
    }
  },

  num: function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); },

  render: function () {
    if (!Game.fit) return;
    this.tidy();
    this.renderTop();
    this.renderKinds();
    this.renderStrip();
    this.renderLine();
    this.lay();
  },

  renderTop: function () {
    var st = Game.fit, self = this, L = Maps.list(), box = UI.el('fitMaps'), html = '', i;
    UI.el('fitCoins').textContent = U.num(Save.data.coins);
    for (i = 0; i < L.length; i++) {
      var m = L[i], open = Maps.open(m.id);
      html += '<button type="button" class="sm-chip th-' + m.theme + (m.id === st.map ? (open ? ' on' : ' peek') : '') +
        (open ? '' : ' lock') + '" data-id="' + m.id + '"><i></i>' + Maps.name(m.id) + '</button>';
    }
    box.innerHTML = html;
    box.classList.toggle('hidden', L.length < 2);
    var bs = box.querySelectorAll('.sm-chip');
    for (i = 0; i < bs.length; i++) {
      bs[i].onclick = function () {
        var id = this.getAttribute('data-id');
        Snd.play('pick');
        if (Maps.open(id)) { if (id !== Maps.sel()) Maps.pick(id); }
        else UI.toast(I18N.t('mapNeed', { n: Maps.name(Maps.byId(id).need) }));
        if (id !== Game.fit.map) self.enter(id);
        else self.renderTop();
      };
    }
    var tm = UI.el('fitTime'), tb = tm.querySelectorAll('button');
    tm.classList.toggle('hidden', !View3D.on);
    for (i = 0; i < tb.length; i++) tb[i].classList.toggle('on', tb[i].getAttribute('data-t') === this.tod);
    UI.el('fitDrive').classList.toggle('on', this.drive);
  },

  renderKinds: function () {
    var self = this, K = Cos.kinds, box = UI.el('fitKinds'), html = '', i;
    for (i = 0; i < K.length; i++) {
      html += '<button type="button" class="sm-chip' + (K[i] === this.kind ? ' on' : '') + '" data-k="' + K[i] + '">' +
        I18N.t('cosK_' + K[i]) + '</button>';
    }
    box.innerHTML = html;
    var bs = box.querySelectorAll('.sm-chip');
    for (i = 0; i < bs.length; i++) {
      bs[i].onclick = function () {
        self.kind = this.getAttribute('data-k');
        Snd.play('pick');
        self.render();
      };
    }
  },

  renderStrip: function () {
    var self = this, kind = this.kind, L = Cos.list(kind), d = Save.data, box = UI.el('fitStrip'), i;
    box.innerHTML = '';
    for (i = 0; i < L.length; i++) {
      (function (it) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'fit-it';
        b.setAttribute('data-id', it.id);
        b.title = I18N.name(it);
        b.style.setProperty('--rar', Cos.rarCol(it.rar));
        var c = document.createElement('canvas');
        c.width = c.height = 96;
        if (kind === 'skins') {
          if (!View3D.on || !View3D.thumb(c, 'car', d.char, it.id, -0.5, false, d.gun)) {
            Content.drawChar(c.getContext('2d'), 48, 48, 26, d.char, it.id, -Math.PI / 2, false);
          }
        } else Cos.sample(c.getContext('2d'), 96, 96, kind, it, 0);
        b.appendChild(c);
        b.onclick = function () { self.pick(it.id); };
        box.appendChild(b);
      })(L[i]);
    }
    this.markStrip(true);
  },

  markStrip: function (scroll) {
    var kind = this.kind, cur = Cos.cur(kind).id, worn = this.worn(kind).id, box = UI.el('fitStrip');
    var bs = box.querySelectorAll('.fit-it'), sel = null;
    for (var i = 0; i < bs.length; i++) {
      var id = bs[i].getAttribute('data-id');
      bs[i].classList.toggle('sel', id === cur);
      bs[i].classList.toggle('worn', id === worn);
      bs[i].classList.toggle('lock', !Cos.owned(kind, id));
      if (id === cur) sel = bs[i];
    }
    if (scroll && sel) box.scrollLeft = sel.offsetLeft - (box.clientWidth - sel.offsetWidth) / 2;
  },

  pick: function (id) {
    var kind = this.kind;
    if (this.worn(kind).id === id) delete Cos.fit[kind];
    else Cos.fit[kind] = id;
    Snd.play('pick');
    if (kind === 'bangs' && !(Game.player && Game.player.target)) Snd.play('shot', true);
    this.markStrip();
    this.renderLine();
    this.lay();
  },

  renderLine: function () {
    var self = this, kind = this.kind, it = Cos.cur(kind), box = UI.el('fitLine');
    var owned = Cos.owned(kind, it.id), way = Cos.way(it), html, pr;
    box.style.setProperty('--rar', Cos.rarCol(it.rar));
    html = '<div class="fit-what"><u class="cos-rar">' + Cos.rarName(it.rar) + '</u><b>' + I18N.name(it) + '</b></div>';
    if (owned) {
      html += it === this.worn(kind) ? '<span class="fit-worn">' + I18N.t('equipped') + '</span>' :
        '<button type="button" class="buy-btn fit-act">' + I18N.t('fitWear') + '</button>';
    } else if (way === 'ach') {
      pr = Cos.achProg(it.src.ach);
      html += pr.n >= pr.of ? '<button type="button" class="buy-btn fit-act">' + I18N.t('cosClaim') + '</button>' :
        '<span class="fit-ach"><em>' + Cos.achText(it.src.ach) + '</em><b>' + pr.n + ' / ' + pr.of + '</b></span>';
    } else if (way === 'rub') {
      html += '<button type="button" class="buy-btn fit-act">' + I18N.t('buy') + ' <b class="cos-rub"></b></button>';
    } else {
      html += '<button type="button" class="buy-btn fit-act' + (Save.canPay(Cos.cost(it)) ? '' : ' poor') + '">' + I18N.t('buy') +
        ' <b class="coin">' + this.num(Cos.cost(it)) + '</b></button>';
    }
    box.innerHTML = html;
    var rub = box.querySelector('.cos-rub');
    if (rub) rub.textContent = Shop.price[it.src.sku];
    var btn = box.querySelector('.fit-act');
    if (btn) btn.onclick = function () { self.act(); };
  },

  act: function () {
    var kind = this.kind, it = Cos.cur(kind), had = Cos.owned(kind, it.id);
    var r = Cos.get(kind, it.id), p;
    if (r === 'poor') {
      Snd.play('deny');
      UI.toast(I18N.t('noCoins'));
      return;
    }
    if (r === 'lock') {
      p = Cos.achProg(it.src.ach);
      Snd.play('deny');
      UI.toast(Cos.achText(it.src.ach) + ': ' + p.n + ' / ' + p.of);
      return;
    }
    if (r !== 'ok') return;
    Snd.play('buy');
    if (!had) UI.toast(Cos.gotText(it));
    this.render();
  }
};
