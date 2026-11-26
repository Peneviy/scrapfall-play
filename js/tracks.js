var Tracks = {
  hist: [],
  pos: -1,
  nav: false,
  maxHist: 20,
  maxFav: 30,

  discs: [
    { s: 1239734142, n: 0, m: 0, v: 1, f: null },
    { s: 3753746610, n: 0, m: 0, f: { tonic: 1, minor: false, tone: 'piano', mot: [14, 17, 5], prog: [0, 1, 2, 1] } },
    { s: 1511296218, n: 0, m: 0, f: { tonic: 1, minor: false, tone: 'piano', mot: [14, 17, 5], prog: [0, 1, 2, 1] } },
    { s: 743432245, n: 0, m: 1, f: { tonic: 1, minor: false, tone: 'piano', mot: [14, 17, 5], prog: [0, 1, 2, 1] } },
    { s: 3363980925, n: 0, m: 1, f: { tonic: 9, minor: false, tone: 'box', mot: [3, 13, 0], prog: [0, 1, 2, 1] } }
  ],
  fixed: {
    1239734142: ['ДОМ ПОСРЕДИ ПУСТОШИ', 'HOME IN THE WASTELAND'],
    3753746610: ['КОЛОКОЛ НА РАССВЕТЕ', 'BELL AT DAWN']
  },
  W: {
    ru: {
      day: ['ЭХО', 'СВЕТ', 'ПЫЛЬ', 'ВЕТЕР', 'СЛЕД', 'ГОЛОС', 'ПАМЯТЬ', 'УТРО', 'ТЕПЛО', 'ШЕПОТ', 'ПОЛДЕНЬ', 'ОСКОЛОК',
        'МИРАЖ', 'ПРИВАЛ', 'ГОРИЗОНТ', 'ПУЛЬС'],
      night: ['СОН', 'ТЕНЬ', 'ТИШИНА', 'ПОЛНОЧЬ', 'ХОЛОД', 'ПЕПЕЛ', 'ДРЕЙФ', 'ПОМЕХИ', 'ТУМАН', 'ОЖИДАНИЕ', 'БЕССОННИЦА',
        'ГЛУБИНА', 'ЗАТМЕНИЕ', 'ОТБЛЕСК', 'МЕРЦАНИЕ', 'БЕЗМОЛВИЕ'],
      of: ['ОРБИТЫ', 'РЕАКТОРА', 'МАЯКА', 'АНТЕНН', 'ПУСТОШИ', 'СТАРЫХ МАШИН', 'ДАЛЬНЕГО СИГНАЛА', 'РЖАВЫХ ЗВЕЗД',
        'ПОКИНУТОЙ СТАНЦИИ', 'МЕДНЫХ ПРОВОДОВ', 'ПОСЛЕДНЕГО СПУТНИКА', 'ПУСТЫХ ТРАСС', 'СПЯЩЕГО ЗАВОДА', 'НЕОНОВОГО ДОЖДЯ',
        'ЧУЖОГО НЕБА', 'ЗАБЫТОГО КОДА', 'СТЕКЛЯННЫХ ДЮН', 'НУЛЕВОГО ЧАСА', 'ТИХОГО КОСМОСА', 'ОСТЫВШЕГО ЯДРА',
        'ЖЕЛЕЗНОГО МОРЯ', 'ДОЛГОЙ ДОРОГИ', 'СЕВЕРНОГО ШЛЮЗА', 'ПЕРВОЙ ИСКРЫ']
    },
    en: {
      day: ['ECHO', 'LIGHT', 'DUST', 'WIND', 'TRACE', 'VOICE', 'MEMORY', 'MORNING', 'WARMTH', 'WHISPER', 'NOON', 'SHARD',
        'MIRAGE', 'REST', 'HORIZON', 'PULSE'],
      night: ['DREAM', 'SHADOW', 'SILENCE', 'MIDNIGHT', 'COLD', 'ASH', 'DRIFT', 'STATIC', 'FOG', 'WAITING', 'INSOMNIA',
        'DEPTH', 'ECLIPSE', 'GLINT', 'FLICKER', 'STILLNESS'],
      of: ['OF THE ORBIT', 'OF THE REACTOR', 'OF THE BEACON', 'OF ANTENNAS', 'OF THE WASTELAND', 'OF OLD MACHINES',
        'OF A DISTANT SIGNAL', 'OF RUSTED STARS', 'OF AN ABANDONED STATION', 'OF COPPER WIRES', 'OF THE LAST SATELLITE',
        'OF EMPTY HIGHWAYS', 'OF A SLEEPING FACTORY', 'OF NEON RAIN', 'OF A FOREIGN SKY', 'OF FORGOTTEN CODE',
        'OF GLASS DUNES', 'OF THE ZERO HOUR', 'OF QUIET SPACE', 'OF A COOLED CORE', 'OF THE IRON SEA', 'OF THE LONG ROAD',
        'OF THE NORTH GATE', 'OF THE FIRST SPARK']
    }
  },

  ICON: {
    prev: '<svg viewBox="0 0 16 16"><path d="M3 3h2v10H3zM13 3v10L6 8z"/></svg>',
    next: '<svg viewBox="0 0 16 16"><path d="M11 3h2v10h-2zM3 3v10l7-5z"/></svg>',
    fav: '<svg viewBox="0 0 16 16"><path d="M8 14S2 10 2 5.8C2 3.7 3.6 2.5 5.2 2.5c1.1 0 2.2.6 2.8 1.6.6-1 1.7-1.6 2.8-1.6C12.4 2.5 14 3.7 14 5.8 14 10 8 14 8 14z"/></svg>',
    list: '<svg viewBox="0 0 16 16"><path d="M2 3.6h12v1.7H2zM2 7.1h12v1.7H2zM2 10.6h12v1.7H2z"/></svg>'
  },

  rec: function (p) {
    return { s: p.seed >>> 0, n: p.night ? 1 : 0, m: p.minor ? 1 : 0, v: p.fav ? 1 : 0, f: p.from || null };
  },
  key: function (r) { return r.s + ':' + (r.n ? 1 : 0); },
  same: function (a, b) { return !!a && !!b && this.key(a) === this.key(b); },

  name: function (r) {
    var en = I18N.lang !== 'ru', fx = this.fixed[r.s];
    if (fx) return fx[en ? 1 : 0];
    var w = this.W[en ? 'en' : 'ru'], a = (r.n || r.m) ? w.night : w.day, s = r.s >>> 0;
    return a[s % a.length] + ' ' + w.of[Math.floor(s / 131) % w.of.length];
  },

  code: function (r) {
    var f = r.f, c = 'sf:' + (r.s >>> 0).toString(36) + '.' + (r.n ? 1 : 0) + (r.m ? 1 : 0) + (r.v ? 1 : 0);
    if (f) c += '.' + f.tonic + '-' + (f.minor ? 1 : 0) + '-' + f.tone + '-' + (f.mot || []).join('_') + '-' + (f.prog || []).join('_');
    return c;
  },
  parse: function (c) {
    var m = /sf:([0-9a-z]+)\.([01])([01])([01])(?:\.(\d+)-([01])-([a-z]+)-([\d_]*)-([\d_]*))?/.exec(String(c || ''));
    if (!m) return null;
    var nums = function (s) { return s ? s.split('_').map(Number) : []; };
    return { s: parseInt(m[1], 36) >>> 0, n: +m[2], m: +m[3], v: +m[4],
      f: m[5] === undefined ? null : { tonic: +m[5], minor: m[6] === '1', tone: m[7], mot: nums(m[8]), prog: nums(m[9]) } };
  },

  ready: function () { return !!(window.Snd && Snd.mb && Snd.ctx && Snd.pc); },
  cur: function () { return this.ready() ? this.rec(Snd.pc) : null; },
  time: function () {
    if (!this.ready()) return null;
    var p = Snd.pc;
    return { t: Math.max(0, Snd.ctx.currentTime - p.t0), d: p.plan.length * p.len };
  },

  onStart: function (p) {
    if (this.nav) return;
    var r = this.rec(p), h = this.hist;
    if (!this.same(h[h.length - 1], r)) h.push(r);
    if (h.length > this.maxHist) h.shift();
    this.pos = -1;
  },

  play: function (r, quiet) {
    if (!this.ready() || !r) return false;
    this.nav = !!quiet;
    try { Snd.musReplay({ seed: r.s, night: !!r.n, fav: !!r.v, from: r.f }); } finally { this.nav = false; }
    return true;
  },
  next: function () {
    if (!this.ready()) return false;
    var h = this.hist;
    if (this.pos >= 0 && this.pos < h.length - 1) { this.pos++; return this.play(h[this.pos], true); }
    this.pos = -1;
    Snd.newPiece(Snd.ctx.currentTime + 0.1);
    return true;
  },
  prev: function () {
    if (!this.ready()) return false;
    var h = this.hist, i = this.pos >= 0 ? this.pos : h.length - 1, tm = this.time();
    if (i < 0) return false;
    if (tm && tm.t < 6 && i > 0) i--;
    this.pos = i;
    return this.play(h[i], true);
  },

  favs: function () {
    var set = Save.data && Save.data.set;
    if (!set) return [];
    if (!Array.isArray(set.mfav)) set.mfav = [];
    return set.mfav;
  },
  isDisc: function (r) { for (var i = 0; i < this.discs.length; i++) if (this.same(this.discs[i], r)) return true; return false; },
  isFav: function (r) {
    if (!r) return false;
    if (this.isDisc(r)) return true;
    var f = this.favs();
    for (var i = 0; i < f.length; i++) if (this.same(f[i], r)) return true;
    return false;
  },
  fav: function () {
    var r = this.cur();
    if (!r || this.isDisc(r)) return;
    var f = this.favs(), i;
    for (i = 0; i < f.length; i++) if (this.same(f[i], r)) break;
    if (i < f.length) { f.splice(i, 1); UI.toast(I18N.t('mpFavOff')); }
    else { f.push(r); if (f.length > this.maxFav) f.shift(); UI.toast(I18N.t('mpFavOn')); }
    Save.flush(true);
  },

  copy: function () {
    var r = this.cur(), tm = this.time();
    if (!r) { UI.toast(I18N.t('mpWait')); return; }
    var text = this.name(r) + ' · ' + U.time(tm ? tm.t : 0) + ' · ' + this.code(r);
    var done = function () { UI.toast(I18N.t('mpCopied')); };
    try { navigator.clipboard.writeText(text).then(done, function () { UI.toast(text); }); } catch (e) { UI.toast(text); }
  },

  bars: [],
  mount: function (el, listEl) {
    if (!el) return;
    var I = this.ICON;
    el.innerHTML = '<button type="button" class="mp-b" data-mp="prev">' + I.prev + '</button>' +
      '<button type="button" class="mp-b" data-mp="next">' + I.next + '</button>' +
      '<button type="button" class="mp-b mp-fav" data-mp="fav">' + I.fav + '</button>' +
      '<button type="button" class="mp-name" data-mp="copy"><b></b><i></i></button>' +
      (listEl ? '<button type="button" class="mp-b" data-mp="list">' + I.list + '</button>' : '');
    this.bars.push({ el: el, list: listEl || null, name: el.querySelector('.mp-name b'), time: el.querySelector('.mp-name i'),
      fav: el.querySelector('.mp-fav'), shown: '' });
  },

  init: function () {
    var self = this;
    this.mount(document.getElementById('mpSet'), document.getElementById('mpList'));
    this.mount(document.getElementById('mpPause'), null);
    document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-mp]') : null;
      if (!b) return;
      var a = b.getAttribute('data-mp');
      if (a === 'list') { self.toggleList(b); return; }
      if (a === 'play') {
        var it = self._items && self._items[+b.getAttribute('data-i')];
        if (it && !self.play(it)) UI.toast(I18N.t('mpWait'));
      } else if (a === 'copy') self.copy();
      else if (a === 'fav') { if (self.ready()) self.fav(); else UI.toast(I18N.t('mpWait')); }
      else if (!self[a]()) UI.toast(I18N.t('mpWait'));
      if (a !== 'copy') { try { Snd.play('pick'); } catch (er) {} }
      self.sync(true);
    });
    setInterval(function () { self.sync(false); }, 500);
  },

  toggleList: function (btn) {
    for (var i = 0; i < this.bars.length; i++) {
      var B = this.bars[i];
      if (!B.list || !B.el.contains(btn)) continue;
      B.list.classList.toggle('hidden');
      btn.classList.toggle('on', !B.list.classList.contains('hidden'));
    }
    this.sync(true);
  },

  sync: function (force) {
    var r = this.cur(), tm = this.time(), i;
    var name = r ? this.name(r) : '- - -', key = r ? this.key(r) + I18N.lang : '';
    for (i = 0; i < this.bars.length; i++) {
      var B = this.bars[i];
      if (!B.el.offsetParent) continue;
      B.name.textContent = name;
      B.time.textContent = tm ? U.time(tm.t) + ' / ' + U.time(tm.d) : '';
      B.fav.classList.toggle('on', this.isFav(r));
      if (B.list && !B.list.classList.contains('hidden') && (force || B.shown !== key + this.hist.length)) {
        B.shown = key + this.hist.length;
        this.renderList(B.list, r);
      }
    }
  },

  renderList: function (box, cur) {
    var items = this._items = [], html = '', self = this;
    var part = function (title, list) {
      if (!list.length) return;
      html += '<u>' + title + '</u>';
      for (var i = 0; i < list.length; i++) {
        html += '<button type="button" class="mp-it' + (self.same(list[i], cur) ? ' on' : '') + '" data-mp="play" data-i="' + items.length + '">' +
          self.name(list[i]) + (list[i].n ? '<s></s>' : '') + '</button>';
        items.push(list[i]);
      }
    };
    part(I18N.t('mpDiscs'), this.discs);
    part(I18N.t('mpFavs'), this.favs());
    var seen = {}, rec = [];
    for (var i = this.hist.length - 1; i >= 0; i--) {
      var r = this.hist[i], k = this.key(r);
      if (seen[k] || this.isFav(r)) continue;
      seen[k] = 1;
      rec.push(r);
    }
    part(I18N.t('mpRecent'), rec.slice(0, 8));
    box.innerHTML = html;
  }
};
Tracks.init();
