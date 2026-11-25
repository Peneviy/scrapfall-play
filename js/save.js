var Save = {
  data: null,
  dirty: false,
  lastWrite: 0,

  def: function () {
    return {
      v: 1,
      coins: 0,
      runs: 0,
      hintSeen: false,
      kills: 0,
      best: { score: 0, time: 0, level: 1 },
      chars: { scav: 1 },
      char: 'scav',
      guns: { pistol: 1 },
      gun: 'pistol',
      skins: { rust: 1 },
      skin: 'rust',
      up: { dmg: 0, hp: 0, spd: 0, xp: 0, loot: 0, cd: 0, radius: 0, tech: 0 },
      up10: 1,
      bosses: {},
      prestige: 0, prestigeOld: 0, nakal: -1,
      wins: 0, winBest: 0,
      set: { sfx: 1, music: 1, shake: 1, low: 0, lang: null, aim: 'auto', zoom: 1, vol: 0.5 }
    };
  },

  load: function (cb) {
    var self = this;
    PF.load(function (raw) {
      var d = self.merge(raw);
      self.data = d;
      cb(d);
    });
  },

  merge: function (raw) {
      var d = this.def();
      if (raw && typeof raw === 'object') {
        for (var k in d) {
          if (raw[k] === undefined) continue;
          if (typeof d[k] === 'object' && d[k] !== null && !Array.isArray(d[k])) {
            for (var kk in d[k]) if (raw[k][kk] !== undefined) d[k][kk] = raw[k][kk];
            if (k === 'chars' || k === 'guns' || k === 'skins' || k === 'bosses' || k === 'set') {
              for (var id in raw[k]) d[k][id] = raw[k][id];
            }
          } else {
            d[k] = raw[k];
          }
        }
      }
      if (raw && typeof raw === 'object' && !raw.up10) {
        for (var uk in d.up) d.up[uk] = Math.min(this.upMax, 2 * Math.max(0, Math.floor(Number(d.up[uk]) || 0)));
        d.up10 = 1;
      }
      var top = CFG.nakal.max, pr = Math.max(0, Math.floor(Number(d.prestige) || 0));
      if (pr > top) { d.prestigeOld = Math.max(d.prestigeOld | 0, pr); pr = top; }
      d.prestige = pr;
      d.nakal = Math.floor(Number(d.nakal));
      if (!(d.nakal >= 0 && d.nakal < pr)) d.nakal = -1;
      return d;
  },

  flush: function (force) {
    if (!this.data) return;
    var t = performance.now() / 1000;
    if (!force && t - this.lastWrite < 2) { this.dirty = true; return; }
    this.lastWrite = t;
    this.dirty = false;
    PF.save(this.data);
  },

  tick: function () {
    if (this.dirty) this.flush(false);
  },

  addCoins: function (n) {
    this.data.coins = Math.max(0, Math.floor(this.data.coins + n));
    this.flush(false);
  },

  canPay: function (n) { return this.data.coins >= n; },

  pay: function (n) {
    if (!this.canPay(n)) return false;
    this.data.coins -= n;
    this.flush(true);
    return true;
  },

  has: function (kind, id) { return !!this.data[kind][id]; },

  unlock: function (kind, id) {
    this.data[kind][id] = 1;
    this.flush(true);
  },

  equip: function (kind, id) {
    var field = kind === 'chars' ? 'char' : (kind === 'guns' ? 'gun' : 'skin');
    this.data[field] = id;
    this.flush(true);
  },

  upMax: 10,
  upBase: { dmg: 400, hp: 350, spd: 460, xp: 520, loot: 580, cd: 630, radius: 720, tech: 750 },
  upCost: function (key, lvl) {
    if (lvl === undefined) lvl = this.data.up[key] || 0;
    var base = this.upBase[key] || 400;
    return Math.round(base * Math.pow(1.5, lvl) / 10) * 10;
  },
  upBuy: function (key) {
    if ((this.data.up[key] || 0) >= this.upMax) return false;
    var cost = this.upCost(key);
    if (!this.pay(cost)) return false;
    this.data.up[key]++;
    this.flush(true);
    return true;
  },
  upTotal: function () {
    var n = 0;
    for (var k in this.data.up) n += this.data.up[k];
    return n;
  },

  mult: function () {
    var u = this.data.up, p = Nakal.tier(), N = CFG.nakal;
    return {
      dmg: 1 + 0.05 * u.dmg,
      hp: 1 + 0.06 * u.hp,
      spd: 1 + 0.018 * u.spd,
      xp: 1 + 0.05 * u.xp,
      loot: (1 + 0.06 * u.loot) * (1 + p * N.coin),
      cd: 1 - 0.03 * u.cd,
      radius: 1 + 0.04 * (u.radius || 0),
      tech: 1 + 0.05 * (u.tech || 0),
      enemyHp: 1 + p * N.hp,
      startLevel: 1 + p * N.startLevel
    };
  },

  finishRun: function (res) {
    var d = this.data;
    d.runs++;
    d.kills += res.kills;
    if (res.score > d.best.score) {
      d.best.score = res.score;
      d.best.time = res.time;
      d.best.level = res.level;
      this.flush(true);
      return true;
    }
    this.flush(true);
    return false;
  }
};
