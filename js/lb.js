var LB = {
  on: false,
  base: '',
  tag: 0,
  rows: null,
  total: 0,
  me: null,
  at: 0,
  loading: false,
  live: null,
  plate: null,

  init: function () {
    var m = window.Metrics;
    if (!m || !m.url || !m.uid || CFG.platform === 'yandex' || CFG.platform === 'crazygames') return;
    this.base = m.url.replace(/\/e$/, '');
    this.tag = this.tagOf(m.uid);
    try { this.words(); this.build(); this.on = true; } catch (e) { this.on = false; return; }
    var self = this;
    setTimeout(function () { self.resend(); }, 4000);
  },

  tagOf: function (uid) {
    var h = 0x811c9dc5;
    for (var i = 0; i < uid.length; i++) { h ^= uid.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return 1000 + h % 9000;
  },

  rawName: function () {
    var s = (Save.data && Save.data.set.nick) || PF.playerName || '';
    return String(s).replace(/\s+/g, ' ').trim().slice(0, 32);
  },
  nm: function (name, tag) { return name || I18N.t('lbAnon', { n: tag }); },
  myName: function () { return this.nm(this.rawName().slice(0, 16), this.tag); },

  _get: function (path, cb) {
    var done = false, fin = function (d) { if (!done) { done = true; cb(d); } };
    setTimeout(function () { fin(null); }, 8000);
    try {
      fetch(this.base + path, { mode: 'cors' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(fin).catch(function () { fin(null); });
    } catch (e) { fin(null); }
  },
  _post: function (path, body, cb) {
    try {
      fetch(this.base + path, { method: 'POST', mode: 'cors', body: JSON.stringify(body), headers: { 'Content-Type': 'text/plain' } })
        .then(function (r) { return r.json().then(function (j) { cb(r.status, j); }, function () { cb(r.status, null); }); })
        .catch(function () { cb(0, null); });
    } catch (e) { cb(0, null); }
  },

  load: function (cb) {
    var self = this;
    if (this.rows && Date.now() - this.at < 60000) { if (cb) cb(true); return; }
    if (this.loading) return;
    this.loading = true;
    this._get('/lb/near?id=' + encodeURIComponent(Metrics.uid), function (d) {
      self.loading = false;
      if (d && d.rows) {
        self.rows = d.rows; self.total = d.total | 0; self.at = Date.now();
        if (d.me) self.me = { s: d.me.s, r: d.me.r };
        self.syncBest();
      }
      if (cb) cb(!!(d && d.rows));
    });
  },

  syncBest: function () {
    if (this._synced) return;
    this._synced = true;
    var b = Save.data && Save.data.best, sc = CFG.score;
    if (!b || !(b.score > 0) || (this.me && this.me.s >= b.score)) return;
    var t = Math.floor(b.time), l = b.level | 0;
    var k = Math.max(0, Math.ceil((b.score - t * sc.perSec - l * sc.perLvl) / sc.perKill));
    this.send({ v: 1, id: Metrics.uid, pf: CFG.platform, ver: CFG.version, name: this.rawName(),
      s: Math.floor(b.score), t: t, l: l, b: 0, k: k, old: 1 });
  },

  runStart: function () {
    if (!this.on) return;
    this.live = { x: -1, j: -1, rank: 0, next: '', gap: '', prev: '', lead: '', flashT: 0, flashAt: -1e9, pend: 0, who: null, best: 1e9 };
    this.plate.classList.toggle('off', !!Save.data.set.lbHide);
    this.plate.classList.add('hidden');
    var self = this;
    this.load(function () { if (self.live) self.tick(); });
  },

  idx: function (x) {
    var a = this.rows, lo = 0, hi = a.length;
    while (lo < hi) { var m = (lo + hi) >> 1; if (a[m][1] > x) lo = m + 1; else hi = m; }
    return lo;
  },

  rankAt: function (x, j) {
    var a = this.rows;
    if (!a.length || j === 0) return 1;
    if (j >= a.length) return this.total + 1;
    var r = a[j - 1], q = a[j];
    var lo = Math.max(r[0], j), hi = q[0] - 1;
    if (hi <= lo) return lo + 1;
    var f = (r[1] - x) / Math.max(1, r[1] - q[1]);
    return Math.round(lo + (hi - lo) * Math.min(1, Math.max(0, f))) + 1;
  },

  tick: function () {
    var L = this.live;
    if (!this.on || !L || !this.rows || !Game.running) return;
    var now = Game.time * 1000;
    var x = Game.finalScore();
    if (x !== L.x) {
      L.x = x;
      var j = this.idx(x);
      if (L.j >= 0 && j < L.j) { L.pend += L.j - j; L.who = this.rows[j]; }
      L.j = j;
      L.rank = this.rankAt(x, j);
      var up = j > 0 ? this.rows[j - 1] : null;
      L.next = up ? this.nm(up[2], up[3]) : '';
      L.gap = up ? '+' + U.num(up[1] - x + 1) : '';
      var dn = j < this.rows.length ? this.rows[j] : null;
      L.prev = dn ? this.nm(dn[2], dn[3]) : '';
      L.lead = dn ? '-' + U.num(x - dn[1]) : '';
      if (L.rank < L.best) {
        if (L.rank === 1 && this.total > 0 && L.best > 1) this.flash(I18N.t('lbFirst'), now, true);
        else if (L.rank <= 10 && L.best > 10 && this.total >= 10) this.flash(I18N.t('lbTop10'), now, true);
        L.best = L.rank;
      }
    }
    if (L.pend && L.who && now - L.flashAt > 4000 && now > 2000) {
      this.flash(I18N.t('lbPassed', { n: this.nm(L.who[2], L.who[3]) }), now, false, L.pend > 1 ? '+' + (L.pend - 1) : '');
    }
    this.draw(now);
  },

  flash: function (text, now, big, more) {
    var L = this.live;
    L.flashT = now + (big ? 2200 : 1700);
    L.flashAt = now;
    L.flashText = text;
    L.flashMore = more || '';
    L.pend = 0; L.who = null;
    this.plate.classList.remove('flash');
    void this.plate.offsetWidth;
    this.plate.classList.add('flash');
  },

  draw: function (now) {
    var L = this.live, p = this.plate;
    p.classList.remove('hidden');
    var rank = '#' + L.rank;
    if (this._rank !== rank) { this._rank = rank; this._r.textContent = rank; }
    var fl = L.flashT > now;
    var n = L.next || I18N.t('lbLead'), g = L.next ? L.gap : '';
    var pt = fl ? L.flashText : L.prev, pg = fl ? L.flashMore : L.lead;
    if (this._n !== n) { this._n = n; this._nm.textContent = n; }
    if (this._g !== g) { this._g = g; this._gp.textContent = g; }
    if (this._p !== pt) { this._p = pt; this._pn.textContent = pt; this._pv.classList.toggle('hidden', !pt); }
    if (this._pl !== pg) { this._pl = pg; this._pg.textContent = pg; }
    if (!fl && p.classList.contains('flash') && now - L.flashAt > 1300) p.classList.remove('flash');
    p.classList.toggle('flashing', fl);
  },

  over: function (res) {
    var el = this.ovEl;
    if (!this.on || !el) return;
    if (!this.rows || !res) { el.classList.add('hidden'); return; }
    var r = this.rankAt(res.score, this.idx(res.score));
    var html = I18N.t('lbOver', { r: r });
    if (this.me && this.me.r && res.score > this.me.s && r < this.me.r) html += ' <s>' + I18N.t('lbUp', { r: this.me.r }) + '</s>';
    el.innerHTML = html;
    el.classList.remove('hidden');
  },

  submit: function (res) {
    if (!this.on || !res || !(res.score > 0)) return;
    var body = {
      v: 1, id: Metrics.uid, pf: CFG.platform, ver: CFG.version, name: this.rawName(),
      s: Math.floor(res.score), t: Math.floor(res.time), l: res.level | 0, b: Game.bossKills | 0, k: res.kills | 0
    };
    this.live = null;
    this.send(body);
  },

  send: function (body) {
    var self = this;
    this._post('/lb', body, function (st, d) {
      if (st === 200 && d && d.ok) {
        self.me = { s: d.best, r: d.rank };
        self._pend(null, body);
        var set = Save.data.set;
        if (set.nick && d.name !== set.nick) { set.nick = d.name; Save.flush(false); }
      } else if (st === 0 || st === 429 || st >= 500) {
        self._pend(body);
      } else {
        self._pend(null, body);
      }
    });
  },

  _pend: function (body, sent) {
    try {
      var old = JSON.parse(localStorage.getItem('sf_lbq') || 'null');
      if (body) {
        if (!old || body.s >= old.s) localStorage.setItem('sf_lbq', JSON.stringify(body));
      } else if (old && sent && old.s <= sent.s) localStorage.removeItem('sf_lbq');
    } catch (e) {}
  },

  resend: function () {
    try {
      var b = JSON.parse(localStorage.getItem('sf_lbq') || 'null');
      if (b && b.id === Metrics.uid) { b.name = this.rawName(); this.send(b); }
    } catch (e) {}
  },

  board: function (list) {
    var self = this;
    list.innerHTML = '';
    list.appendChild(this._line(I18N.t('lbLoading'), 'lb-head'));
    this.nickBtn.classList.remove('hidden');
    this._get('/lb/top?n=20&id=' + encodeURIComponent(Metrics.uid), function (d) {
      list.innerHTML = '';
      if (!d || !d.top) {
        list.appendChild(self._line(I18N.t('lbFail', { n: U.num(Save.data.best.score) }), 'lb-head'));
        return;
      }
      if (d.me) self.me = { s: d.me.s, r: d.me.r };
      list.appendChild(self._line(d.me ? I18N.t('lbYour', { r: d.me.r, t: d.total }) : I18N.t('lbNoRec'), 'lb-head'));
      if (!d.top.length) { list.appendChild(self._line(I18N.t('boardEmpty'), 'board-row')); return; }
      for (var i = 0; i < d.top.length; i++) list.appendChild(self._row(d.top[i]));
      if (d.around && d.around.length) {
        list.appendChild(self._line('...', 'lb-gap'));
        for (var k = 0; k < d.around.length; k++) list.appendChild(self._row(d.around[k]));
      }
    });
  },

  _line: function (text, cls) {
    var el = document.createElement('div');
    el.className = cls;
    el.textContent = text;
    return el;
  },

  _row: function (e) {
    var row = document.createElement('div');
    row.className = 'board-row' + (e.me ? ' me' : '');
    var a = document.createElement('span'); a.className = 'rank'; a.textContent = e.r;
    var b = document.createElement('span'); b.className = 'nm';
    b.textContent = e.me ? this.myName() : this.nm(e.n, e.g);
    var c = document.createElement('span'); c.className = 'lb-meta'; c.textContent = U.time(e.t) + ' · ' + I18N.t('lbLvl', { n: e.l });
    var d = document.createElement('span'); d.className = 'sc'; d.textContent = U.num(e.s);
    row.appendChild(a); row.appendChild(b); row.appendChild(c); row.appendChild(d);
    return row;
  },

  setNick: function (v) {
    var self = this, set = Save.data.set;
    v = String(v || '').replace(/\s+/g, ' ').trim().slice(0, 16);
    if (v === (set.nick || '')) return;
    set.nick = v;
    this._nickAt = Date.now();
    Save.flush(true);
    this._post('/lb/name', { v: 1, id: Metrics.uid, name: this.rawName() }, function (st, d) {
      if (st !== 200 || !d) { UI.toast(I18N.t('lbNickOk')); return; }
      if (v && d.name !== v) {
        set.nick = d.name; Save.flush(true);
        self.nickIn.value = d.name;
        UI.toast(I18N.t('lbNickBad', { n: self.myName() }));
      } else UI.toast(I18N.t('lbNickOk'));
    });
  },

  build: function () {
    var self = this, $ = function (id) { return document.getElementById(id); };

    var p = document.createElement('div');
    p.id = 'lbPlate';
    p.className = 'lb-plate hidden';
    p.innerHTML = '<div class="lbp-body"><div class="lbp-next"><span></span><s></s></div>' +
      '<div class="lbp-rank"><i data-i18n="lbWorld"></i><b></b></div>' +
      '<div class="lbp-prev hidden"><span></span><s></s></div></div>';
    $('hud').appendChild(p);
    this.plate = p;
    this._r = p.querySelector('.lbp-rank b');
    this._nm = p.querySelector('.lbp-next span');
    this._gp = p.querySelector('.lbp-next s');
    this._pv = p.querySelector('.lbp-prev');
    this._pn = p.querySelector('.lbp-prev span');
    this._pg = p.querySelector('.lbp-prev s');
    var toggle = function (e) {
      e.preventDefault(); e.stopPropagation();
      var off = !p.classList.contains('off');
      p.classList.toggle('off', off);
      Save.data.set.lbHide = off ? 1 : 0;
      Save.flush(false);
    };
    p.addEventListener('click', toggle);

    var ov = document.createElement('em');
    ov.id = 'ovWorld';
    ov.className = 'ov-world hidden';
    var sc = $('ovScore');
    sc.parentNode.insertBefore(ov, sc);
    this.ovEl = ov;

    var row = document.createElement('label');
    row.className = 'sw nick';
    row.innerHTML = '<span data-i18n="lbNick"></span><b class="nick-box"><input type="text" id="setNick" maxlength="16" autocomplete="off" spellcheck="false" enterkeyhint="done">' +
      '<button type="button" id="setNickOk" class="nick-ok">OK</button></b>';
    var list = document.querySelector('.settings-list');
    list.insertBefore(row, list.querySelector('.lang-row'));
    var inp = row.querySelector('input');
    this.nickIn = inp;
    ['keydown', 'keyup'].forEach(function (ev) {
      inp.addEventListener(ev, function (e) {
        e.stopPropagation();
        if (ev === 'keydown' && e.key === 'Enter') inp.blur();
      });
    });
    inp.addEventListener('change', function () { self.setNick(inp.value); });
    var ok = row.querySelector('.nick-ok');
    var norm = function (v) { return String(v || '').replace(/s+/g, ' ').trim().slice(0, 16); };
    var dirty = function () { ok.classList.toggle('on', norm(inp.value) !== (Save.data.set.nick || '')); };
    inp.addEventListener('input', dirty);
    ok.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (norm(inp.value) !== (Save.data.set.nick || '')) self.setNick(inp.value);
      else if (Date.now() - (self._nickAt || 0) > 1500) UI.toast(I18N.t('lbNickOk'));
      inp.blur(); dirty();
    });
    var fill = function () {
      inp.value = Save.data.set.nick || '';
      inp.placeholder = PF.playerName ? String(PF.playerName).slice(0, 16) : I18N.t('lbAnon', { n: self.tag });
      dirty();
    };
    $('btnSettings').addEventListener('click', fill);

    var nbtn = document.createElement('button');
    nbtn.id = 'lbNickBtn';
    nbtn.className = 'btn hidden';
    nbtn.setAttribute('data-i18n', 'lbNickBtn');
    nbtn.onclick = function () { UI.show('scrSettings'); fill(); setTimeout(function () { try { inp.focus(); } catch (e) {} }, 50); };
    $('scrBoard').appendChild(nbtn);
    this.nickBtn = nbtn;

    document.documentElement.classList.add('lb-on');
    I18N.apply();
  },

  words: function () {
    var W = {
      ru: { lbWorld: 'мир', lbAnon: 'Игрок #{n}', lbPassed: 'обогнал {n}', lbLead: 'впереди никого', lbTop10: 'ТОП-10 мира!', lbFirst: '№1 в мире!',
        lbYour: 'Твоё место в мире: #{r} из {t}', lbNoRec: 'Сыграй рейд, чтобы попасть в мировой рейтинг', lbLoading: 'Загружаю рейтинг...',
        lbFail: 'Рейтинг не загрузился. Твой рекорд: {n}', lbNick: 'Ник в рейтинге', lbNickBtn: 'Сменить ник', lbNickOk: 'Ник сохранён',
        lbNickBad: 'Такой ник не подойдёт, в рейтинге будет {n}', lbOver: '#{r} в мире', lbUp: 'было #{r}', lbLvl: 'ур. {n}' },
      en: { lbWorld: 'world', lbAnon: 'Player #{n}', lbPassed: 'passed {n}', lbLead: 'nobody ahead', lbTop10: 'World top 10!', lbFirst: '#1 in the world!',
        lbYour: 'Your world place: #{r} of {t}', lbNoRec: 'Play a raid to join the world ranking', lbLoading: 'Loading ranking...',
        lbFail: 'Ranking did not load. Your best: {n}', lbNick: 'Name in ranking', lbNickBtn: 'Change name', lbNickOk: 'Name saved',
        lbNickBad: 'That name will not do, the ranking shows {n}', lbOver: '#{r} world', lbUp: 'was #{r}', lbLvl: 'lv {n}' },
      tr: { lbWorld: 'dünya', lbAnon: 'Oyuncu #{n}', lbPassed: '{n} geçildi', lbLead: 'önünde kimse yok', lbTop10: 'Dünya ilk 10!', lbFirst: 'Dünyada 1 numara!',
        lbYour: 'Dünya sıran: #{r} / {t}', lbNoRec: 'Dünya sıralamasına girmek için bir baskın oyna', lbLoading: 'Sıralama yükleniyor...',
        lbFail: 'Sıralama yüklenmedi. En iyin: {n}', lbNick: 'Sıralamadaki adın', lbNickBtn: 'Adını değiştir', lbNickOk: 'Ad kaydedildi',
        lbNickBad: 'Bu ad olmaz, sıralamada {n} görünecek', lbOver: 'dünyada #{r}', lbUp: 'önce #{r}', lbLvl: 'sv {n}' },
      de: { lbWorld: 'welt', lbAnon: 'Spieler #{n}', lbPassed: '{n} überholt', lbLead: 'niemand vor dir', lbTop10: 'Welt-Top 10!', lbFirst: 'Platz 1 weltweit!',
        lbYour: 'Dein Weltplatz: #{r} von {t}', lbNoRec: 'Spiel einen Raid, um in die Weltrangliste zu kommen', lbLoading: 'Rangliste lädt...',
        lbFail: 'Rangliste nicht geladen. Dein Bestwert: {n}', lbNick: 'Name in der Rangliste', lbNickBtn: 'Namen ändern', lbNickOk: 'Name gespeichert',
        lbNickBad: 'Dieser Name geht nicht, angezeigt wird {n}', lbOver: 'Welt #{r}', lbUp: 'vorher #{r}', lbLvl: 'St. {n}' },
      es: { lbWorld: 'mundo', lbAnon: 'Jugador #{n}', lbPassed: 'superaste a {n}', lbLead: 'nadie delante', lbTop10: '¡Top 10 mundial!', lbFirst: '¡N.º 1 del mundo!',
        lbYour: 'Tu puesto mundial: #{r} de {t}', lbNoRec: 'Juega una incursión para entrar en el ranking mundial', lbLoading: 'Cargando ranking...',
        lbFail: 'El ranking no cargó. Tu mejor marca: {n}', lbNick: 'Nombre en el ranking', lbNickBtn: 'Cambiar nombre', lbNickOk: 'Nombre guardado',
        lbNickBad: 'Ese nombre no vale, se verá {n}', lbOver: 'mundo #{r}', lbUp: 'antes #{r}', lbLvl: 'nv {n}' },
      pt: { lbWorld: 'mundo', lbAnon: 'Jogador #{n}', lbPassed: 'passou {n}', lbLead: 'ninguém à frente', lbTop10: 'Top 10 mundial!', lbFirst: 'Nº 1 do mundo!',
        lbYour: 'Sua posição mundial: #{r} de {t}', lbNoRec: 'Jogue uma incursão para entrar no ranking mundial', lbLoading: 'Carregando ranking...',
        lbFail: 'O ranking não carregou. Seu melhor: {n}', lbNick: 'Nome no ranking', lbNickBtn: 'Mudar nome', lbNickOk: 'Nome salvo',
        lbNickBad: 'Esse nome não serve, aparecerá {n}', lbOver: 'mundo #{r}', lbUp: 'antes #{r}', lbLvl: 'nv {n}' }
    };
    for (var l in W) {
      if (!I18N[l]) continue;
      for (var k in W[l]) if (I18N[l][k] === undefined) I18N[l][k] = W[l][k];
    }
  }
};
LB.init();
