var Metrics = {
  url: '',
  uid: '',
  first: '',
  q: [],
  sent: false,
  fails: 0,
  MAX: 40,

  init: function () {
    var m = CFG.metrics || {};
    var u = m.url || '';
    if (!u && CFG.platform === 'local' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) u = m.dev || '';
    if (CFG.platform === 'friend') u = '';
    this.url = u;
    if (!u) return;
    try {
      this.uid = localStorage.getItem('sf_mid') || '';
      if (!this.uid) { this.uid = this._id(); localStorage.setItem('sf_mid', this.uid); }
      this.first = localStorage.getItem('sf_m0') || '';
      if (!this.first) { this.first = this._day(); localStorage.setItem('sf_m0', this.first); }
      var q = JSON.parse(localStorage.getItem('sf_mq') || '[]');
      if (q && q.length) this.q = q.slice(-this.MAX);
    } catch (e) {
      if (!this.uid) this.uid = this._id();
      if (!this.first) this.first = this._day();
    }
    var self = this;
    document.addEventListener('visibilitychange', function () { if (document.hidden) self.flush(true); });
    window.addEventListener('pagehide', function () { self.flush(true); });
    window.addEventListener('online', function () { self.fails = 0; self.flush(); });
    window.addEventListener('error', function (ev) {
      if (!ev || !ev.filename || /Script error/i.test(ev.message || '')) return;
      self.error(ev.error || { message: ev.message, stack: ev.filename + ':' + ev.lineno + ':' + ev.colno }, 'win');
    });
    window.addEventListener('unhandledrejection', function (ev) {
      var r = ev && ev.reason;
      if (r && r.stack && /\/js\/[\w.-]+\.js/.test(r.stack)) self.error(r, 'promise');
    });
  },

  _id: function () { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); },
  _day: function () { return new Date().toISOString().slice(0, 10); },
  _ref: function () {
    try { return document.referrer ? new URL(document.referrer).hostname.slice(0, 60) : ''; } catch (e) { return ''; }
  },
  _store: function () {
    try { localStorage.setItem('sf_mq', JSON.stringify(this.q)); } catch (e) {}
  },

  session: function () {
    if (!this.url || this.sent) return;
    this.sent = true;
    this.push({ t: 's' });
  },

  run: function (res) {
    if (!this.url || !res) return;
    this.push({
      t: 'r', d: Math.round(res.time || 0), k: res.kills | 0, l: res.level | 0,
      p: (Save.data && Save.data.prestige) | 0, s: res.score | 0
    });
  },

  errSeen: {},
  errN: 0,
  error: function (e, where) {
    if (!this.url || this.errN >= 5) return;
    var msg = String((e && e.message) || e || '?').slice(0, 120);
    var at = '', st = e && e.stack ? String(e.stack).split('\n') : [];
    for (var i = 0; i < st.length; i++) {
      var m = st[i].match(/([\w.-]+\.(?:js|html)):(\d+):(\d+)/);
      if (m) { at = m[1] + ':' + m[2] + ':' + m[3]; break; }
    }
    var key = msg + '@' + at;
    if (this.errSeen[key]) return;
    this.errSeen[key] = 1;
    this.errN++;
    var g = window.Game || {};
    this.push({
      t: 'x', m: msg, w: (String(where || '') + ' ' + at).trim().slice(0, 60),
      g: Math.round(g.time || 0), l: (g.player && g.player.level) | 0
    });
  },

  push: function (e) {
    e.at = Date.now();
    this.q.push(e);
    if (this.q.length > this.MAX) this.q = this.q.slice(-this.MAX);
    this._store();
    this.flush();
  },

  flush: function (final) {
    if (!this.url || !this.q.length) return;
    if (!final && (navigator.onLine === false || this.fails >= 3)) return;
    var batch = this.q;
    this.q = [];
    var body = JSON.stringify({
      v: 1, id: this.uid, f: this.first, pf: CFG.platform, ver: CFG.version,
      lang: (window.I18N && I18N.lang) || '', h: location.hostname.slice(0, 60), r: this._ref(), e: batch
    });
    var self = this;
    var back = function () { self.fails++; self.q = batch.concat(self.q).slice(-self.MAX); self._store(); };
    if (final || typeof fetch !== 'function') {
      var ok = false;
      try { if (navigator.sendBeacon) ok = navigator.sendBeacon(this.url, body); } catch (e) {}
      if (ok) { this._store(); return; }
      if (typeof fetch !== 'function') { back(); return; }
    }
    try {
      fetch(this.url, { method: 'POST', body: body, keepalive: true, mode: 'cors', headers: { 'Content-Type': 'text/plain' } })
        .then(function (r) { if (r.ok) { self.fails = 0; self._store(); } else back(); })
        .catch(back);
    } catch (e) { back(); }
  }
};
Metrics.init();
