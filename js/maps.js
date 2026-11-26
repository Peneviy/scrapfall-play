var Maps = {
  run: null,
  force: null,

  init: function () {
    try {
      var m = /[?&]map=([a-z]+)/.exec(location.search);
      if (m && this.byId(m[1])) this.force = m[1];
    } catch (e) {}
  },

  list: function () { return CFG.maps.list; },
  byId: function (id) {
    var L = CFG.maps.list;
    for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i];
    return null;
  },
  idx: function (id) {
    var L = CFG.maps.list;
    id = id || this.cur();
    for (var i = 0; i < L.length; i++) if (L[i].id === id) return i;
    return 0;
  },

  blank: function () { return { prestige: 0, nakal: -1, wins: 0, winBest: 0, best: { score: 0, time: 0, level: 1 } }; },
  rec: function (id) {
    var d = Save.data;
    id = id || this.cur();
    if (!d) return this.blank();
    if (id === CFG.maps.list[0].id || !this.byId(id)) return d;
    if (!d.m || typeof d.m !== 'object') d.m = {};
    if (!d.m[id]) d.m[id] = this.blank();
    return d.m[id];
  },

  open: function (id) {
    var m = this.byId(id);
    if (!m) return false;
    if (!m.need || this.force === id) return true;
    return (this.rec(m.need).wins | 0) > 0;
  },
  sel: function () {
    var d = Save.data, id = this.force || (d && d.map);
    return (id && this.byId(id) && this.open(id)) ? id : CFG.maps.list[0].id;
  },
  pick: function (id) {
    if (!this.open(id)) return false;
    if (this.force && this.force !== id) this.force = null;
    Save.data.map = id;
    Save.flush(true);
    return true;
  },
  begin: function () { this.run = this.sel(); },
  cur: function () { return (window.Game && Game.running && this.run) ? this.run : this.sel(); },
  def: function () { return this.byId(this.cur()) || CFG.maps.list[0]; },

  k: function (key) { var v = this.def()[key]; return v > 0 ? v : 1; },
  theme: function () { return this.def().theme || 'scrap'; },

  lbTier: function (n, id) { return this.idx(id) * 8 + (n | 0); },

  name: function (id) { return I18N.t('map_' + (id || this.cur())); },
  num: function (id) { return this.idx(id) + 1; },

  win: function () {
    var L = CFG.maps.list, was = {}, i, got = '';
    for (i = 0; i < L.length; i++) was[L[i].id] = this.open(L[i].id);
    var r = this.rec(this.run);
    r.wins = (r.wins | 0) + 1;
    if (!r.winBest || Game.time < r.winBest) r.winBest = Math.floor(Game.time);
    for (i = 0; i < L.length; i++) if (!was[L[i].id] && this.open(L[i].id) && !got) got = L[i].id;
    return got;
  }
};
Maps.init();
