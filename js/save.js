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
      bosses: {},
      prestige: 0,
      set: { sfx: 1, music: 1, shake: 1, low: 0, lang: null, aim: 'auto', zoom: 1, vol: 0.7 }
    };
  },

  load: function (cb) {
    var self = this;
    PF.load(function (raw) {
      var d = self.def();
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
      self.data = d;
      cb(d);
    });
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

  upMax: 5,
  upCost: function (key) {
    var lvl = this.data.up[key] || 0;
    var base = { dmg: 280, hp: 240, spd: 320, xp: 360, loot: 400, cd: 440, radius: 500, tech: 520 }[key] || 300;
    return Math.floor(base * Math.pow(2, lvl));
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
    var u = this.data.up, p = this.data.prestige;
    return {
      dmg: 1 + 0.08 * u.dmg,
      hp: 1 + 0.10 * u.hp,
      spd: 1 + 0.03 * u.spd,
      xp: 1 + 0.08 * u.xp,
      loot: (1 + 0.1 * u.loot) * (1 + p * CFG.prestige.coinMult),
      cd: 1 - 0.05 * u.cd,
      radius: 1 + 0.07 * (u.radius || 0),
      tech: 1 + 0.08 * (u.tech || 0),
      enemyHp: 1 + p * CFG.prestige.enemyHp,
      startLevel: 1 + p * CFG.prestige.startLevel
    };
  },

  prestigeReady: function () {
    return this.upTotal() >= CFG.prestige.reqUpgrades && Bosses.defeated() >= CFG.prestige.reqBosses;
  },
  doPrestige: function () {
    if (!this.prestigeReady()) return false;
    this.data.prestige++;
    this.data.coins = 0;
    this.data.up = { dmg: 0, hp: 0, spd: 0, xp: 0, loot: 0, cd: 0, radius: 0, tech: 0 };
    this.flush(true);
    return true;
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
