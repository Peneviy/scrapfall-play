var Enemies = {
  defs: {
    grunt: { hp: 20, speed: 62, dmg: 9, r: 15, coins: 0.5, xp: 2, body: '#7d5a44', trim: '#c98b5a', from: 0, w: 10 },
    runner: { hp: 15, speed: 118, dmg: 7, r: 12, coins: 0.5, xp: 2, body: '#b8563a', trim: '#ffb07a', from: 15, w: 8 },
    swarm: { hp: 9, speed: 96, dmg: 5, r: 9, coins: 0.35, xp: 1.5, body: '#6e5a7a', trim: '#b79ad6', from: 32, w: 7, pack: 6 },
    spitter: { hp: 30, speed: 52, dmg: 11, r: 14, coins: 1, xp: 4, body: '#5c7a48', trim: '#b6e07a', from: 70, w: 3.5, ranged: true, keep: 250 },
    brute: { hp: 120, speed: 44, dmg: 18, r: 24, coins: 2, xp: 9, body: '#33505e', trim: '#e2a05c', from: 100, w: 3, heavy: true },
    charger: { hp: 55, speed: 60, dmg: 22, r: 18, coins: 1.2, xp: 5, body: '#8a4030', trim: '#ffc27a', from: 150, w: 4, charger: true, fromBoss: 1, ru: 'Таран', en: 'Rammer' },
    shellback: { hp: 260, speed: 34, dmg: 24, r: 27, coins: 3, xp: 12, body: '#2c4a44', trim: '#8fe0c8', from: 200, w: 2, heavy: true, armor: 0.45, fromBoss: 2, ru: 'Панцирь', en: 'Shellback' },
    splitter: { hp: 90, speed: 70, dmg: 14, r: 20, coins: 1.5, xp: 6, body: '#6a4a7a', trim: '#d0a6ff', from: 240, w: 3.5, split: true, fromBoss: 3, ru: 'Делитель', en: 'Splitter' },
    nest: { hp: 420, speed: 0, dmg: 0, r: 30, coins: 6, xp: 26, body: '#2f5a3a', trim: '#9ff2a8', from: 300, w: 2.5, nest: true, fromBoss: 4, ru: 'Гнездо', en: 'Nest' },
    beetle: { hp: 45, speed: 160, dmg: 32, r: 12, coins: 0.2, xp: 0.8, body: '#5a2a24', trim: '#ff5a3a', from: 180, w: 0, beetle: true, ru: 'Жук', en: 'Beetle' },
    link: { hp: 45, speed: 82, dmg: 12, r: 14, coins: 0.4, xp: 1.5, body: '#3a3f4a', trim: '#7ae0ff', from: 240, w: 0, link: true, ru: 'Звено', en: 'Link' },
    roller: { hp: 240, speed: 46, dmg: 20, r: 30, coins: 2.5, xp: 8, body: '#7a6650', trim: '#ffb35c', from: 300, w: 0, heavy: true, armor: 0.6, roller: true, ru: 'Каток', en: 'Roller' },
    medic: { hp: 16, speed: 74, dmg: 6, r: 13, coins: 0.6, xp: 3, body: '#35574a', trim: '#7dffa8', from: 360, w: 0, caster: true, medic: true, keep: 240, ru: 'Лекарь', en: 'Medic' },
    hooker: { hp: 70, speed: 66, dmg: 14, r: 17, coins: 1, xp: 4, body: '#5c4a36', trim: '#ffd84a', from: 480, w: 0, caster: true, hooker: true, keep: 300, ru: 'Крючник', en: 'Grappler' },
    muter: { hp: 55, speed: 60, dmg: 8, r: 16, coins: 1, xp: 4, body: '#3a3352', trim: '#c58bff', from: 600, w: 0, caster: true, muter: true, keep: 380, ru: 'Глушитель', en: 'Silencer' },
    pylon: { hp: 100, speed: 0, dmg: 0, r: 20, coins: 0.3, xp: 3, body: '#34502f', trim: '#b6e07a', from: 1e9, w: 0, pylon: true, heavy: true },
    comb: { hp: 100, speed: 0, dmg: 0, r: 24, coins: 0.3, xp: 3, body: '#4a3a5c', trim: '#d9c26a', from: 1e9, w: 0, pylon: true, comb: true, heavy: true },
    larva: { hp: 12, speed: 150, dmg: 0, r: 12, coins: 0, xp: 1, body: '#6e4a3a', trim: '#ff9a4a', from: 1e9, w: 0, larva: true },
    decoy: { hp: 100, speed: 0, dmg: 0, r: 38, coins: 0, xp: 0, body: '#0d2a2c', trim: '#8ff0e0', from: 1e9, w: 0, pylon: true, decoy: true, heavy: true },
    boss: { hp: 1400, speed: 38, dmg: 26, r: 46, coins: 70, xp: 60, body: '#2f3f4a', trim: '#f0a24a', w: 0 }
  },

  K: {
    nests: 2,
    spitAim: 0.45,
    beetle: { every: 6, n: 3, flank: 150, touchK: 0.4, fuseD: 60, fuse: 1.0, shell: 0.7, r: 110, foeDmg: 25, c: '#ff3b3b' },
    link: { every: 15, n: 4, gap: 92, ropeMax: 240, ropeK: 1.5, slow: 1.2, ropeCd: 1.0, pass: 7, passTell: 0.6, orbit: 120, max: 2,
      grow: [480, 720, 960],
      taut: 190, snapT: 0.5, wrapOn: 420, wrapOff: 600, wrapR: 135, wrapIn: 55, wrapSpin: 0.3, wrapSp: 1.4 },
    lock: { from: [330, 540, 780], gap: 100, near: 1100, R: 42, hexR: 40, gather: 170, come: 420, formMax: 4, turn: 0.5, stuck: 1.5, ghost: 2.5, ring2: 10, out: 12,
      grow: 600, cellEvery: 55, chainEvery: 75, cells: 7, links: 24, joinMax: 8, big: 4, bigTurn: 0.6,
      heatFrom: 600, h0: 0.2, n0: 4, n1: 18, hot: 0.3, burnK: 1.4, fire: 3, fireK: 0.12, burnR: 12,
      payCells: 5, payCoins: 4, payXp: 15, payScore: 60 },
    roller: { every: 20, cd: 8, first: [2.5, 4], near: 620, tell: 1.0, sp: 560, len: 1300, hit: 0.35, stun: 1.2, max: 2, c: '#ffb35c' },
    medic: { every: 10, max: 3, cd: 6, first: [1.5, 3], range: 300, ward: 3, cut: 0.6, c: '#7dffa8' },
    hooker: { every: 13, max: 2, cd: 7, first: [2, 4], near: 520, len: 560, tell: 0.6, lead: 0.35, sp: 1500, w: 30, pull: 950, pullT: 0.8, catchK: 0.6, c: '#ffd84a' },
    muter: { every: 16, max: 2, cd: 10, first: [2, 4], near: 640, r: 125, tell: 1.0, mute: 3, c: '#c58bff' },
    esp: { xp: 0.6, fast: 1.6, fastMax: 180, shield: 0.6, r: 120, t: 1.0, k: 1.4, c: ['', '#ffe066', '#5fd4ff', '#ff3b3b'] }
  },
  booms: [],
  extraT: { beetle: 0, link: 0, roller: 0, medic: 0, hooker: 0, muter: 0 },
  nCast: { medic: 0, hooker: 0, muter: 0 },
  chains: [],
  locks: [],
  lockCd: 0,
  hexDebt: 0,
  lockStat: { made: 0, big: 0, done: 0, hits: 0, dmg: 0, burn: 0 },
  cbT: -1,
  seen: {},
  nRoll: 0, nNest: 0,

  clear: function () {
    this.chains.length = 0; this.seen = {}; this.nRoll = 0; this.nNest = 0; this.booms.length = 0;
    this.locks.length = 0; this.lockCd = 0; this.hexDebt = 0; this.cbT = -1;
    var S = this.lockStat; S.made = S.big = S.done = S.hits = S.dmg = S.burn = 0;
    for (var k in this.extraT) this.extraT[k] = 0;
    for (k in this.nCast) this.nCast[k] = 0;
  },

  extraTick: function (dt) {
    var T = this.extraT, K = this.K;
    for (var k in T) {
      if (Game.time < this.defs[k].from) continue;
      if ((T[k] -= dt) > 0) continue;
      T[k] = K[k].every;
      if (k === 'link' && this.freeChains() >= K.link.max) continue;
      if (k === 'roller' && this.nRoll >= K.roller.max) continue;
      if (this.defs[k].caster && this.nCast[k] >= K[k].max) continue;
      this.spawnGroup(0, k);
    }
  },

  freeChains: function () {
    var n = 0;
    for (var i = 0; i < this.chains.length; i++) if (!this.chains[i].lk) n++;
    return n;
  },

  cap: function () {
    var m = Game.time / 60;
    return Math.min(CFG.scale.capHard, Math.floor(CFG.scale.capBase + CFG.scale.capPerMin * m));
  },

  cycleMult: function () { return 1 + 0.4 * Math.floor(Game.bossIndex / Bosses.list.length); },
  hpMult: function () {
    var m = Finale.growT() / 60, s = CFG.scale;
    return (1 + s.hpPerMin * m + s.hpLate * Math.max(0, m - s.lateFrom)) * Save.mult().enemyHp * this.cycleMult();
  },
  dmgMult: function () { return (1 + CFG.scale.dmgPerMin * (Finale.growT() / 60)) * this.cycleMult(); },
  speedMult: function () { return Math.min(1.6, 1 + CFG.scale.speedPerMin * (Finale.growT() / 60)); },

  pickType: function (plain) {
    var pool = [], K = this.K;
    for (var k in this.defs) {
      var d = this.defs[k];
      if (k === 'boss' || !d.w || Game.time < d.from) continue;
      if (d.fromBoss && Game.bossIndex < d.fromBoss) continue;
      if (d.nest && this.nNest >= K.nests) continue;
      if (d.roller && this.nRoll >= K.roller.max) continue;
      if (d.link && (plain || this.freeChains() >= K.link.max)) continue;
      var w = d.w;
      if (k === 'grunt' && Game.time > 120) w *= 0.5;
      pool.push({ w: w, k: k });
    }
    if (!pool.length) return 'grunt';
    var pk = U.weighted(pool).k;
    if (pk === 'shellback' && this.hexDebt > 0) { this.hexDebt--; return 'grunt'; }
    return pk;
  },

  spawn: function (type, x, y, elite, force) {
    if (type !== 'boss' && !force && Game.enemies.length >= CFG.scale.capHard) return null;
    var d = this.defs[type];
    var e = {
      dead: false, type: type, def: d,
      x: x, y: y, vx: 0, vy: 0,
      r: d.r, ang: 0,
      hp: d.hp * this.hpMult(), maxHp: d.hp * this.hpMult(),
      speed: d.speed * this.speedMult() * U.rand(0.92, 1.08),
      dmg: d.dmg * this.dmgMult(),
      atkCd: 0, shootCd: U.rand(1, 2.5), aim: 0, charge: 0, chargeAng: 0, shield: 0, slide: 0,
      slowT: 0, frz: 0, flash: 0, elite: !!elite,
      coins: d.coins, xp: d.xp,
      phase: Math.random() * 6.28, burstCd: 4, summonCd: 8, boss: type === 'boss',
      stuckT: 0, aggro: false, wave: false, flagLoot: false, orbCd: 0, areaCd: 0,
      zz: false,
      chase: false, tpT: 0, tpW: 0, tpX: 0, tpY: 0,
      openT: 0, openK: 1, inv: false, owner: null, lift: 0, pylon: type === 'pylon' || type === 'comb',
      fuse: 0, chain: null, roll: 0, rollT: 0, rollA: 0, rollL: 0, rm: null, spin: 0,
      cast: 0, castT: 0, castA: 0, castL: 0, castM: 0, castX: 0, castY: 0, tgt: null, ward: 0, wardBy: null,
      esp: 0, esh: 0, eshMax: 0, rep: false,
      lk: null, lkI: 0, lkX: 0, lkY: 0, lkA: 0, lkIn: false, lkU: 0, lkV: 0,
      tautT: 0
    };
    if (d.caster) { this.nCast[type]++; e.shootCd = U.rand(this.K[type].first[0], this.K[type].first[1]); }
    if (d.roller) this.nRoll++;
    if (d.nest) this.nNest++;
    if (d.roller) e.shootCd = U.rand(this.K.roller.first[0], this.K.roller.first[1]);
    if (elite) {
      e.hp *= 3.2; e.maxHp = e.hp;
      e.dmg *= 1.5; e.coins *= 4; e.xp *= 3;
      e.r *= 1.2; e.speed *= 0.92;
      if (Nakal.has(3)) this.eliteSpell(e);
    }
    if (type === 'boss') {
      var lvl = Math.floor(Game.time / CFG.boss.every);
      e.hp *= 1 + lvl * 0.55; e.maxHp = e.hp;
      e.coins = Math.floor(e.coins * (1 + lvl * 0.4));
    }
    Game.enemies.push(e);
    return e;
  },

  summon: function (type, x, y, elite) {
    var list = Game.enemies;
    if (list.length < CFG.scale.capHard) return this.spawn(type, x, y, !!elite);
    var p = Game.player, far = Game.viewRadius() * 1.05, best = null, bd = far * far;
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o.dead || o.boss || o.elite || o.wave || o.def.nest || o.def.pylon || o.lk) continue;
      var dx = o.x - p.x, dy = o.y - p.y, d2 = dx * dx + dy * dy;
      if (d2 > bd) { bd = d2; best = o; }
    }
    if (!best) return null;
    best.dead = true;
    return this.spawn(type, x, y, !!elite, true);
  },

  eliteSpell: function (e) {
    var K = this.K.esp;
    e.esp = 1 + Math.floor(Math.random() * 3);
    e.xp *= K.xp;
    if (e.esp === 1) e.speed = Math.max(e.speed, Math.min(K.fastMax, e.speed * K.fast));
    else if (e.esp === 2) e.esh = e.eshMax = e.maxHp * K.shield;
  },
  eliteShield: function (e, amount) {
    e.esh -= amount;
    if (e.esh > 0) { e.flash = 0.04; return 0; }
    var left = -e.esh;
    e.esh = 0;
    var c = this.K.esp.c[2];
    FX.ring(e.x, e.y, e.r, e.r * 3.2, c, 0.35, 4);
    FX.burst(e.x, e.y, 14, c, 220, 0.4, 3);
    Snd.play('bubble');
    return left;
  },
  eliteBomb: function (e) {
    var K = this.K.esp;
    this.booms.push({ x: e.x, y: e.y, t: K.t, dmg: e.dmg * K.k });
    Bosses.mark({ k: 'disc', x: e.x, y: e.y, r: K.r, t: K.t, c: K.c[3], o: null, foe: true });
    Snd.play('fuse');
  },
  boomStep: function (dt) {
    var B = this.booms, p = Game.player, R = this.K.esp.r;
    for (var i = B.length - 1; i >= 0; i--) {
      var b = B[i];
      if ((b.t -= dt) > 0) continue;
      B.splice(i, 1);
      FX.burst(b.x, b.y, 18, '#ff7a3a', 260, 0.5, 4);
      FX.ring(b.x, b.y, 10, R, this.K.esp.c[3], 0.3, 4);
      FX.blast(b.x, b.y, R * 0.8, '#ff7a3a');
      FX.shake(5);
      Snd.play('boom');
      var pr = R + p.r * 0.5;
      if (p.alive && U.dist2(b.x, b.y, p.x, p.y) < pr * pr) p.hurt(b.dmg);
    }
  },

  ringMin: function () { return Math.max(CFG.spawn.distMin, Game.viewRadius() + 60); },
  ringMax: function () { return this.ringMin() + (CFG.spawn.distMax - CFG.spawn.distMin); },

  spawnAround: function (type, elite) {
    var p = U.ring(Game.player.x, Game.player.y, this.ringMin(), this.ringMax());
    return this.spawn(type, p.x, p.y, elite);
  },

  director: function (dt) {
    Game.spawnT -= dt;
    Bosses.tick(dt);
    this.flagTick();
    this.extraTick(dt);
    if (Game.spawnT > 0) return;

    var min = this.spawnMin(), fz = Finale.frenzy();
    var rate = Math.max(CFG.spawn.minInterval, CFG.spawn.interval / (1 + CFG.scale.spawnPerMin * min));
    if (fz) rate /= CFG.finale.spawnK;
    Game.spawnT = rate;
    if (Game.enemies.length >= this.cap()) return;

    var batch = Math.min(fz ? CFG.finale.batch : CFG.spawn.batchMax, 1 + Math.floor(min * CFG.spawn.batchPerMin));
    for (var b = 0; b < batch; b++) {
      if (Game.enemies.length >= this.cap()) return;
      this.spawnGroup(min);
    }
  },

  spawnMin: function () {
    var s = CFG.spawn, t = Game.time;
    var m = Math.max(t / 60, s.plateau * U.clamp(t / s.rampT, 0, 1));
    var lv = Game.player ? Game.player.level : 1;
    var ahead = lv - (1 + t / s.lvlPace);
    if (t < s.adaptUntil && ahead > 0) m += Math.min(s.adaptMax, ahead * s.adaptPerLvl);
    return m;
  },

  opening: function () {
    var p = Game.player, list = CFG.spawn.opening, total = 0, n = 0, type, i;
    for (type in list) total += list[type];
    for (type in list) {
      var def = this.defs[type];
      var packA = Math.random() * Math.PI * 2;
      for (i = 0; i < list[type]; i++) {
        var a = def.pack ? packA + U.rand(-0.25, 0.25) : (n / total) * Math.PI * 2 + U.rand(-0.2, 0.2);
        var d = U.rand(330, 470);
        n++;
        var e = this.spawn(type, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, false);
        if (e) { e.hp *= 0.6; e.maxHp = e.hp; }
      }
    }
  },

  newStage: function () {
    var s = CFG.stage;
    Game.stageN = (Game.stageN || 0) + 1;
    Game.stageT0 = Game.time;
    if (Game.stageN === 1) {
      Game.flags = s.first.map(function (f) {
        return { at: f.at, elites: f.elites, escort: f.escort, kind: 'elite', done: false };
      });
    } else {
      var at = Game.time + Math.max(10, Game.nextBoss - Game.time) * s.mid;
      Game.flags = [{ at: at, kind: Game.stageN % 2 === 0 ? 'heavy' : 'pack', done: false }];
    }
  },

  flagTick: function () {
    var fl = Game.flags;
    if (!fl) return;
    for (var i = 0; i < fl.length; i++) {
      var f = fl[i];
      if (f.done || Game.time < f.at) continue;
      if (Bosses.fighting) { f.at = Game.time; continue; }
      f.done = true;
      if (Game.time - f.at < 3) this.flagWave(f);
    }
  },

  retimeFlags: function () {
    var fl = Game.flags;
    if (!fl) return;
    var at = Game.time + Math.max(10, Game.nextBoss - Game.time) * CFG.stage.mid;
    for (var i = 0; i < fl.length; i++) if (!fl[i].done) fl[i].at = at;
  },

  flagPool: function () {
    var out = [], defs = this.defs;
    for (var k in defs) {
      var d = defs[k];
      if (k === 'boss' || d.nest || d.link || d.roller || d.caster || Game.time < d.from) continue;
      if (d.fromBoss && Game.bossIndex < d.fromBoss) continue;
      out.push(k);
    }
    out.sort(function (a, b) { return defs[b].hp - defs[a].hp; });
    return out.length ? out : ['grunt'];
  },

  flagWave: function (f) {
    var p = Game.player, pool = this.flagPool(), a = Math.random() * Math.PI * 2;
    var d = this.ringMin() + 40, bx = p.x + Math.cos(a) * d, by = p.y + Math.sin(a) * d;
    var elites = [], esc, swarm = 6, name = 'waveElite', i, e;
    var at = function (j) { return pool[Math.min(j, pool.length - 1)]; };
    if (f.kind === 'heavy') { elites = [at(0)]; esc = 4; name = 'waveHeavy'; }
    else if (f.kind === 'pack') { elites = [at(1), at(2)]; esc = 12; swarm = 12; name = 'wavePack'; }
    else { for (i = 0; i < f.elites; i++) elites.push(at(i)); esc = f.escort; }
    for (i = 0; i < elites.length; i++) {
      e = this.spawn(elites[i], bx + U.rand(-50, 50), by + U.rand(-50, 50), true);
      if (!e) continue;
      e.wave = true;
      if (i === 0) e.flagLoot = true;
    }
    for (i = 0; i < esc; i++) {
      e = this.spawn(i < swarm ? 'swarm' : this.pickType(true), bx + U.rand(-110, 110), by + U.rand(-110, 110), false);
      if (e) e.wave = true;
    }
    Snd.play('wave');
    UI.banner(I18N.t('waveKind'), I18N.t(name));
  },

  spawnGroup: function (min, type) {
    type = type || this.pickType();
    var elite = Game.time > CFG.elite.after && U.chance(CFG.elite.chance * (Nakal.has(3) ? CFG.nakal.eliteK : 1));
    var def = this.defs[type];
    var packChance = Math.min(0.6, CFG.spawn.packChance + min * 0.05);
    if (def.beetle || def.link || def.roller || def.caster) this.firstSeen(type, def);
    if (def.caster) {
      var cb = U.ring(Game.player.x, Game.player.y, this.ringMin(), this.ringMax());
      this.put(type, cb.x, cb.y);
      return;
    }
    if (def.beetle) {
      var bb = U.ring(Game.player.x, Game.player.y, this.ringMin(), this.ringMax());
      var ba = U.angleTo(Game.player.x, Game.player.y, bb.x, bb.y);
      for (var bi = 0; bi < this.K.beetle.n; bi++) {
        var be = this.put(type, bb.x + U.rand(-40, 40), bb.y + U.rand(-40, 40));
        if (be) be.rollA = ba + bi * Math.PI * 2 / this.K.beetle.n;
      }
      return;
    }
    if (def.link || def.roller) {
      var lb = U.ring(Game.player.x, Game.player.y, this.ringMin(), this.ringMax());
      var plan = def.link ? this.lockPlan() : null;
      if (plan) this.lockStart(plan);
      else if (def.link) this.spawnChain(lb.x, lb.y);
      else this.put(type, lb.x, lb.y);
      return;
    }

    if (def.pack && U.chance(packChance + 0.2)) {
      var base = U.ring(Game.player.x, Game.player.y, this.ringMin(), this.ringMax());
      for (var i = 0; i < def.pack; i++) {
        this.spawn(type, base.x + U.rand(-70, 70), base.y + U.rand(-70, 70), false);
      }
      return;
    }
    if (U.chance(packChance)) {
      var b2 = U.ring(Game.player.x, Game.player.y, this.ringMin(), this.ringMax());
      var n = U.irand(2, 4);
      for (var j = 0; j < n; j++) this.spawn(type, b2.x + U.rand(-60, 60), b2.y + U.rand(-60, 60), elite && j === 0);
      return;
    }
    this.spawnAround(type, elite);
  },

  firstSeen: function (type, d) {
    if (this.seen[type]) return;
    this.seen[type] = true;
    UI.toast(I18N.t('newFoe', { n: I18N.foe(type, d) }));
  },

  put: function (type, x, y) { return this.spawn(type, x, y, false) || this.summon(type, x, y); },

  spawnChain: function (x, y, n) {
    var K = this.K.link, p = Game.player, a = U.angleTo(p.x, p.y, x, y);
    var c = { m: [], lit: null, next: null, passT: K.pass, cd: 0, lk: null, wrap: false, wA: 0, wR: 0, wDir: 1 };
    n = n || this.chainN();
    for (var i = 0; i < n; i++) {
      var e = this.put('link', x + Math.cos(a) * K.gap * i, y + Math.sin(a) * K.gap * i);
      if (!e) continue;
      e.chain = c;
      c.m.push(e);
    }
    if (!c.m.length) return null;
    c.lit = c.m[0];
    this.chains.push(c);
    this.lightChain(c);
    return c;
  },
  lightChain: function (c) {
    for (var i = 0; i < c.m.length; i++) c.m[i].inv = c.m[i] !== c.lit;
  },
  passLight: function (c, to) {
    var from = c.lit;
    c.lit = to; c.next = null;
    c.passT = this.K.link.pass;
    this.lightChain(c);
    if (from && to && from !== to) { FX.bolt(from.x, from.y, to.x, to.y, to.def.trim); Snd.play('linkPass'); }
    if (to) FX.ring(to.x, to.y, to.r, to.r + 26, to.def.trim, 0.3, 3);
  },
  chainStep: function (dt) {
    var K = this.K.link, p = Game.player, C = this.chains;
    for (var ci = C.length - 1; ci >= 0; ci--) {
      var c = C[ci], m = c.m, i, idx = -1;
      for (i = 0; i < m.length; i++) if (m[i] === c.lit) idx = i;
      var nb = null;
      if (c.lit && c.lit.dead) {
        for (var s = 1; s < m.length && !nb; s++) {
          if (idx + s < m.length && !m[idx + s].dead) nb = m[idx + s];
          else if (idx - s >= 0 && !m[idx - s].dead) nb = m[idx - s];
        }
      }
      for (i = m.length - 1; i >= 0; i--) if (m[i].dead) m.splice(i, 1);
      if (!m.length) { C.splice(ci, 1); continue; }
      if (c.lit.dead) this.passLight(c, nb || m[0]);
      if (c.next && c.next.dead) c.next = null;
      if (m.length > 1 && !(c.lit.frz > 0)) {
        c.passT -= dt;
        if (c.passT <= K.passTell && !c.next) {
          var far = null, fd = -1;
          for (i = 0; i < m.length; i++) {
            if (m[i] === c.lit) continue;
            var d2 = U.dist2(p.x, p.y, m[i].x, m[i].y);
            if (d2 > fd) { fd = d2; far = m[i]; }
          }
          c.next = far;
        }
        if (c.passT <= 0) this.passLight(c, c.next || c.lit);
      }
      if (!c.lk) this.chainWrap(c, dt);
      if (c.cd > 0) c.cd -= dt;
      if (c.cd <= 0 && p.alive && p.dashT <= 0 && !c.lk) {
        for (i = 0; i + 1 < m.length; i++) {
          var a = m[i], b = m[i + 1], bx = b.x - a.x, by = b.y - a.y, L2 = bx * bx + by * by;
          if (L2 > K.ropeMax * K.ropeMax || L2 < 1 || !this.ropeOk(a, b)) continue;
          var t = U.clamp(((p.x - a.x) * bx + (p.y - a.y) * by) / L2, 0, 1);
          var qx = a.x + bx * t - p.x, qy = a.y + by * t - p.y;
          if (t > 0.08 && t < 0.92 && qx * qx + qy * qy < (p.r + 5) * (p.r + 5)) {
            c.cd = K.ropeCd;
            p.hurt(c.lit.dmg * K.ropeK);
            p.slowT = Math.max(p.slowT, K.slow);
            FX.bolt(a.x, a.y, b.x, b.y, c.lit.def.trim);
            Snd.play('rope');
            FX.burst(p.x, p.y, 8, c.lit.def.trim, 160, 0.35, 3);
            break;
          }
        }
      }
    }
  },
  linkStep: function (e, dt, d, dx, dy, sp) {
    if (e.lk) { e.vx = e.vy = 0; return; }
    var K = this.K.link, c = e.chain, m = c ? c.m : null, i = m ? m.indexOf(e) : 0;
    if (c && c.wrap) {
      var pw = Game.player, wa = c.wA + c.wDir * (i - (m.length - 1) / 2) * this.wrapStep(c);
      var wx = pw.x + Math.cos(wa) * c.wR - e.x, wy = pw.y + Math.sin(wa) * c.wR - e.y, wd = Math.sqrt(wx * wx + wy * wy) || 1;
      var wv = sp * K.wrapSp * U.clamp(wd / 40, 0.15, 1.6);
      e.vx = wx / wd * wv; e.vy = wy / wd * wv;
      return;
    }
    if (!m || i <= 0) {
      var p = Game.player;
      if (d > 380) { e.vx = dx / d * sp; e.vy = dy / d * sp; return; }
      var a = Math.atan2(e.y - p.y, e.x - p.x) + 0.9;
      var tx = p.x + Math.cos(a) * K.orbit - e.x, ty = p.y + Math.sin(a) * K.orbit - e.y, td = Math.sqrt(tx * tx + ty * ty) || 1;
      e.vx = tx / td * sp * 1.15; e.vy = ty / td * sp * 1.15;
      return;
    }
    var f = m[i - 1], fx = f.x - e.x, fy = f.y - e.y, fd = Math.sqrt(fx * fx + fy * fy) || 1;
    var k = U.clamp((fd - K.gap * 0.8) / (K.gap * 0.6), 0, 1.8);
    e.vx = fx / fd * sp * 1.3 * k; e.vy = fy / fd * sp * 1.3 * k;
    e.ang = Math.atan2(fy, fx);
  },
  chainWrap: function (c, dt) {
    var K = this.K.link, m = c.m, p = Game.player, n = m.length;
    var cx = 0, cy = 0;
    for (var i = 0; i < n; i++) { cx += m[i].x; cy += m[i].y; }
    cx /= n; cy /= n;
    var dc = U.dist(p.x, p.y, cx, cy);
    if (n < 2 || !p.alive || dc > K.wrapOff) { c.wrap = false; return; }
    if (!c.wrap) {
      if (dc > K.wrapOn) return;
      c.wrap = true;
      c.wA = Math.atan2(cy - p.y, cx - p.x);
      c.wR = Math.max(K.wrapR, dc);
      var h = m[0];
      c.wDir = (cx - p.x) * (h.y - cy) - (cy - p.y) * (h.x - cx) >= 0 ? 1 : -1;
    }
    c.wR = Math.max(K.wrapR, Math.min(c.wR - K.wrapIn * dt, dc + 60));
    c.wA += K.wrapSpin * c.wDir * dt;
  },
  wrapStep: function (c) {
    var K = this.K.link, n = c.m.length;
    return Math.min(K.gap / c.wR, 5.2 / Math.max(1, n - 1));
  },
  chainTaut: function (dt) {
    var K = this.K.link, C = this.chains, T = K.taut;
    for (var ci = 0; ci < C.length; ci++) {
      var c = C[ci], m = c.m;
      if (c.lk) continue;
      for (var i = 1; i < m.length; i++) {
        var f = m[i - 1], e = m[i], dx = e.x - f.x, dy = e.y - f.y, d2 = dx * dx + dy * dy;
        if (d2 <= T * T * 1.02) { e.tautT = 0; continue; }
        var d = Math.sqrt(d2);
        if ((e.tautT += dt) > K.snapT) {
          FX.burst(e.x, e.y, 6, e.def.trim, 140, 0.3, 3);
          e.x = f.x + dx / d * K.gap * 0.8; e.y = f.y + dy / d * K.gap * 0.8;
          World.resolve(e);
          FX.ring(e.x, e.y, e.r, e.r + 22, e.def.trim, 0.3, 3);
          e.tautT = 0;
          continue;
        }
        e.x = f.x + dx / d * T; e.y = f.y + dy / d * T;
        World.resolve(e);
      }
    }
  },
  chainCatchUp: function (c) {
    var p = Game.player, np = U.ring(p.x, p.y, this.ringMin(), this.ringMax()), a = U.angleTo(p.x, p.y, np.x, np.y);
    for (var i = 0; i < c.m.length; i++) {
      c.m[i].x = np.x + Math.cos(a) * this.K.link.gap * i;
      c.m[i].y = np.y + Math.sin(a) * this.K.link.gap * i;
    }
  },

  chainN: function () {
    var K = this.K.link, n = K.n;
    for (var i = 0; i < K.grow.length; i++) if (Game.time >= K.grow[i]) n++;
    return n;
  },
  ropeOk: function (a, b) { return !a.lk && !b.lk; },

  lockPlan: function () {
    var L = this.K.lock, t = Game.time, sb = this.defs.shellback;
    if (this.locks.length || this.lockCd > 0 || t < L.from[0] || t < sb.from || Game.bossIndex < sb.fromBoss) return null;
    if (Finale.frozenAt >= 0) return null;
    var want = t >= L.from[2] ? 3 : (t >= L.from[1] ? 2 : 1);
    var p = Game.player, list = Game.enemies, free = [], i, e;
    for (i = 0; i < list.length; i++) {
      e = list[i];
      if (e.type !== 'shellback' || e.dead || e.elite || e.lk || e.frz > 0) continue;
      if (U.dist2(e.x, e.y, p.x, p.y) < L.near * L.near) free.push(e);
    }
    if (!free.length) return null;
    var h0 = free[0], bd = 1e18;
    for (i = 0; i < free.length; i++) {
      var d2 = U.dist2(free[i].x, free[i].y, p.x, p.y);
      if (d2 < bd) { bd = d2; h0 = free[i]; }
    }
    free.sort(function (a, b) { return U.dist2(a.x, a.y, h0.x, h0.y) - U.dist2(b.x, b.y, h0.x, h0.y); });
    return { hx: free.slice(0, want), want: want };
  },
  lockFree: function (x, y, r) {
    var list = Game.enemies, best = null, bd = r * r;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.type !== 'shellback' || e.dead || e.elite || e.lk || e.frz > 0) continue;
      var d2 = U.dist2(e.x, e.y, x, y);
      if (d2 < bd) { bd = d2; best = e; }
    }
    return best;
  },

  lockOrder: [[1.5, 1], [1.5, -1], [0, 0], [0, 2], [0, -2], [-1.5, 1], [-1.5, -1]],
  lockShape: function (lk, n) {
    var R = this.K.lock.R, h = Math.sqrt(3) / 2 * R, O = this.lockOrder, C = [], gx = 0, gy = 0, t0 = 0, i, k, key;
    if (n === 1) { C.push([0, 0]); t0 = Math.PI / 6; }
    else {
      for (i = 0; i < n; i++) { gx += O[i][0] * R; gy += O[i][1] * h; }
      gx /= n; gy /= n;
      for (i = 0; i < n; i++) C.push([O[i][0] * R - gx, O[i][1] * h - gy]);
    }
    lk.gx = gx; lk.gy = gy;
    var V = [], E = {}, nb = {};
    var id = function (x, y) {
      for (var j = 0; j < V.length; j++) if (Math.abs(V[j][0] - x) < 0.5 && Math.abs(V[j][1] - y) < 0.5) return j;
      V.push([x, y]);
      return V.length - 1;
    };
    for (i = 0; i < n; i++) {
      var hi = [];
      for (k = 0; k < 6; k++) hi.push(id(C[i][0] + R * Math.cos(t0 + k * Math.PI / 3), C[i][1] + R * Math.sin(t0 + k * Math.PI / 3)));
      for (k = 0; k < 6; k++) {
        var u = hi[k], v = hi[(k + 1) % 6];
        key = u < v ? u + ',' + v : v + ',' + u;
        E[key] = (E[key] || 0) + 1;
      }
    }
    for (key in E) {
      if (E[key] !== 1) continue;
      var uv = key.split(','), a = +uv[0], b = +uv[1];
      (nb[a] = nb[a] || []).push(b);
      (nb[b] = nb[b] || []).push(a);
    }
    var start = +Object.keys(nb)[0], loop = [V[start]], prev = -1, cur = start;
    for (k = 0; k < 60; k++) {
      var nx = nb[cur][0] === prev ? nb[cur][1] : nb[cur][0];
      if (nx === start) break;
      loop.push(V[nx]);
      prev = cur; cur = nx;
    }
    lk.C = C; lk.loop = loop; lk.P = loop.length * R;
    var bx = -1e9, L = loop.length;
    lk.sF = 0;
    for (k = 0; k < L; k++) {
      var p0 = loop[k], p1 = loop[(k + 1) % L];
      if (p0[1] === p1[1] || (p0[1] > 0 && p1[1] > 0) || (p0[1] < 0 && p1[1] < 0)) continue;
      var w = p0[1] / (p0[1] - p1[1]), x = p0[0] + (p1[0] - p0[0]) * w;
      if (x > bx) { bx = x; lk.sF = (k + w) * R; }
    }
  },
  lockOut: function (lk, x, y) {
    var C = lk.C, R = this.K.lock.R, ox = 0, oy = 0;
    for (var i = 0; i < C.length; i++) {
      var dx = x - C[i][0], dy = y - C[i][1], d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d < R + 1) { ox += dx / d; oy += dy / d; }
    }
    var l = Math.sqrt(ox * ox + oy * oy) || 1;
    return [ox / l, oy / l];
  },
  lockAt: function (lk, s, out) {
    var R = this.K.lock.R, pts = lk.loop, L = pts.length;
    s = ((s % lk.P) + lk.P) % lk.P;
    var j = Math.floor(s / R), u = s / R - j, a = pts[j % L], b = pts[(j + 1) % L];
    out.x = a[0] + (b[0] - a[0]) * u; out.y = a[1] + (b[1] - a[1]) * u;
    out.a = Math.atan2(b[1] - a[1], b[0] - a[0]);
    return out;
  },
  lq: { x: 0, y: 0, a: 0 },
  lockLay: function (lk) {
    var L = this.K.lock, sl = lk.sl, S = sl.length, q = this.lq, sp, s0;
    if (!S) return;
    if (S >= lk.loop.length) lk.ring = true;
    if (lk.ring) { sp = lk.P / S; s0 = lk.sF - (lk.sl0 - 1) * sp / 2; }
    else {
      sp = Math.min(L.R, lk.P / (S + 1));
      s0 = lk.sF - (S - 1) * sp / 2;
      if (sp === L.R) s0 = Math.round(s0 / L.R) * L.R;
    }
    for (var k = 0; k < S; k++) {
      var e = sl[k];
      if (!e) continue;
      this.lockAt(lk, s0 + k * sp, q);
      var on = this.lockOut(lk, q.x, q.y);
      e.lkI = k; e.lkX = q.x + on[0] * L.out; e.lkY = q.y + on[1] * L.out; e.lkA = q.a;
    }
  },
  lockTake: function (lk, c) {
    var sl = lk.sl, k = 0;
    c.lk = lk;
    if (lk.ch.indexOf(c) < 0) lk.ch.push(c);
    for (var i = 0; i < c.m.length; i++) {
      var e = c.m[i];
      while (k < sl.length && sl[k]) k++;
      if (k < sl.length) sl[k] = e; else sl.push(e);
      e.lk = lk; e.lkIn = false;
    }
  },
  lockAddHex: function (lk, e) {
    var L = this.K.lock, hx = lk.hx, used = [], spot = -1, i;
    for (i = 0; i < hx.length; i++) used.push(hx[i].lkI);
    for (i = 0; i < lk.C.length; i++) if (used.indexOf(i) < 0) { spot = i; break; }
    if (spot < 0) {
      if (lk.C.length >= L.cells) return false;
      spot = lk.C.length;
      this.lockRegrow(lk, spot + 1);
    }
    hx.push(e);
    e.lk = lk; e.lkI = spot; e.lkX = lk.C[spot][0]; e.lkY = lk.C[spot][1]; e.lkIn = false;
    e.lkA = lk.C.length === 1 ? 0 : Math.PI / 6;
    e.r = L.hexR;
    return true;
  },
  lockRegrow: function (lk, n) {
    var gx = lk.gx, gy = lk.gy, n0 = lk.C.length, i, e;
    this.lockShape(lk, n);
    var dx = n0 > 1 ? lk.gx - gx : 0, dy = n0 > 1 ? lk.gy - gy : 0;
    var ca = Math.cos(lk.a), sa = Math.sin(lk.a);
    lk.x += ca * dx - sa * dy; lk.y += sa * dx + ca * dy;
    for (i = 0; i < lk.hx.length; i++) {
      e = lk.hx[i];
      e.lkU -= dx; e.lkV -= dy;
      e.lkX = lk.C[e.lkI][0]; e.lkY = lk.C[e.lkI][1]; e.lkA = Math.PI / 6;
    }
    for (i = 0; i < lk.sl.length; i++) if (lk.sl[i]) { lk.sl[i].lkU -= dx; lk.sl[i].lkV -= dy; }
    this.lockLay(lk);
  },

  lockStart: function (plan) {
    var L = this.K.lock, p = Game.player, hx = plan.hx, i, k, e;
    var cx = 0, cy = 0;
    for (i = 0; i < hx.length; i++) { cx += hx[i].x; cy += hx[i].y; }
    cx /= hx.length; cy /= hx.length;
    var back = U.angleTo(p.x, p.y, cx, cy), rd = Math.max(this.ringMin(), U.dist(p.x, p.y, cx, cy) + 240);
    var bx = p.x + Math.cos(back) * rd, by = p.y + Math.sin(back) * rd;
    for (i = hx.length; i < plan.want; i++) {
      e = this.put('shellback', bx + U.rand(-60, 60), by + U.rand(-60, 60));
      if (!e) break;
      hx.push(e);
      this.hexDebt++;
    }
    var c = this.spawnChain(bx + Math.cos(back) * 80, by + Math.sin(back) * 80);
    if (!c) return null;
    var lk = { st: 1, t: 0, x: cx, y: cy, a: U.angleTo(cx, cy, p.x, p.y), hx: hx, ch: [], sl: [], sl0: c.m.length, seg: [], ring: false, whole: false,
      C: null, loop: null, P: 0, sF: 0, gx: 0, gy: 0, stuckT: 0, ghostT: 0, cd: 0, cellT: L.cellEvery, chainT: L.chainEvery, joinT: -1,
      peak: hx.length, nl: 0, heat: 0, burn: false, paid: false };
    this.lockShape(lk, hx.length);
    this.lockTake(lk, c);
    if (hx.length === 1) {
      for (i = 0; i < this.chains.length; i++) {
        var o = this.chains[i];
        if (o === c || o.lk || !o.m.length || o.m.length + c.m.length > L.ring2) continue;
        if (U.dist2(o.m[0].x, o.m[0].y, cx, cy) < L.near * L.near * 1.4) { this.lockTake(lk, o); break; }
      }
    }
    this.lockLay(lk);
    var used = [], ca = Math.cos(lk.a), sa = Math.sin(lk.a);
    for (i = 0; i < hx.length; i++) {
      e = hx[i];
      var best = 0, bd = 1e18;
      for (k = 0; k < lk.C.length; k++) {
        if (used.indexOf(k) >= 0) continue;
        var wx = cx + ca * lk.C[k][0] - sa * lk.C[k][1], wy = cy + sa * lk.C[k][0] + ca * lk.C[k][1];
        var d2 = U.dist2(e.x, e.y, wx, wy);
        if (d2 < bd) { bd = d2; best = k; }
      }
      used.push(best);
      e.lk = lk; e.lkI = best; e.lkX = lk.C[best][0]; e.lkY = lk.C[best][1]; e.lkIn = false;
      e.lkA = hx.length === 1 ? 0 : Math.PI / 6;
      e.r = L.hexR;
    }
    this.locks.push(lk);
    this.lockStat.made++;
    return lk;
  },

  lockEnd: function (lk) {
    var i, j, e;
    for (i = 0; i < lk.hx.length; i++) { e = lk.hx[i]; e.lk = null; e.lkIn = false; e.r = e.def.r; }
    for (i = 0; i < lk.sl.length; i++) { e = lk.sl[i]; if (e && e.lk === lk) { e.lk = null; e.lkIn = false; } }
    for (i = 0; i < lk.ch.length; i++) {
      lk.ch[i].lk = null;
      for (j = 0; j < lk.ch[i].m.length; j++) { e = lk.ch[i].m[j]; e.lk = null; e.lkIn = false; }
    }
    this.lockCd = this.K.lock.gap;
    if (lk.peak >= this.K.lock.payCells && !lk.paid) this.lockPay(lk);
  },
  lockPay: function (lk) {
    var L = this.K.lock, n = lk.peak, pl = Game.player;
    lk.paid = true;
    this.lockStat.done++;
    Game.runCoins += L.payCoins * n * Save.mult().loot * pl.char.loot;
    Game.score += L.payScore * n;
    Game.scoreParts.kills += L.payScore * n;
    var xp = L.payXp * n * (Finale.frenzy() ? CFG.finale.xp : 1) / 6;
    for (var i = 0; i < 6; i++) Game.spawnGem(lk.x + Math.cos(i * Math.PI / 3) * 46, lk.y + Math.sin(i * Math.PI / 3) * 46, xp);
    FX.ring(lk.x, lk.y, 20, 280, '#ffd84a', 0.7, 5);
    FX.burst(lk.x, lk.y, 34, '#ffd84a', 280, 0.6, 4);
    FX.shake(8);
    Snd.play('lockJoin');
  },

  lockStep: function (dt, lost) {
    var L = this.K.lock, p = Game.player, LK = this.locks;
    if (!LK.length) { if (this.lockCd > 0) this.lockCd -= dt; return; }
    for (var li = LK.length - 1; li >= 0; li--) {
      var lk = LK[li], hx = lk.hx, sl = lk.sl, i, e, nl = 0;
      for (i = hx.length - 1; i >= 0; i--) if (hx[i].dead) hx.splice(i, 1);
      for (i = lk.ch.length - 1; i >= 0; i--) if (!lk.ch[i].m.length || this.chains.indexOf(lk.ch[i]) < 0) lk.ch.splice(i, 1);
      for (i = 0; i < sl.length; i++) {
        if (sl[i] && (sl[i].dead || sl[i].lk !== lk)) sl[i] = null;
        if (sl[i]) nl++;
      }
      lk.nl = nl;
      if (!hx.length || (hx.length < 2 && !nl)) { this.lockEnd(lk); LK.splice(li, 1); continue; }
      if (hx.length > lk.peak) {
        if (lk.peak < L.payCells && hx.length >= L.payCells) this.lockStat.big++;
        lk.peak = hx.length;
      }
      var sp = 1e9, stop = false, snap = false, all = true;
      for (i = 0; i < hx.length; i++) {
        e = hx[i];
        sp = Math.min(sp, e.speed * (e.slowT > 0 ? 0.6 : 1));
        if (e.frz > 0) stop = true;
      }
      for (i = 0; i < sl.length; i++) {
        e = sl[i];
        if (!e) continue;
        sp = Math.min(sp, e.speed * (e.slowT > 0 ? 0.6 : 1));
        if (e.frz > 0) stop = true;
      }
      var dx = p.x - lk.x, dy = p.y - lk.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d > lost) {
        var np = U.ring(p.x, p.y, this.ringMin(), this.ringMax());
        lk.x = np.x; lk.y = np.y; lk.a = U.angleTo(np.x, np.y, p.x, p.y);
        snap = true; lk.st = 2;
      } else if (!stop) {
        if (d > Game.viewRadius() * 1.1) sp *= 1.3;
        lk.a = U.turn(lk.a, Math.atan2(dy, dx), L.turn * (hx.length >= L.big ? L.bigTurn : 1) * dt);
        var ox = lk.x, oy = lk.y, want = d > 40 ? sp * dt : 0;
        lk.x += Math.cos(lk.a) * want; lk.y += Math.sin(lk.a) * want;
        if (lk.ghostT > 0) {
          if ((lk.ghostT -= dt) <= 0 && this.lockInWall(lk)) lk.ghostT = 0.25;
        } else {
          var ca0 = Math.cos(lk.a), sa0 = Math.sin(lk.a), px = 0, py = 0, pb = 0, pr = this.probe;
          for (i = 0; i < hx.length; i++) {
            e = hx[i];
            if (!e.lkIn) continue;
            pr.x = lk.x + ca0 * e.lkU - sa0 * e.lkV; pr.y = lk.y + sa0 * e.lkU + ca0 * e.lkV; pr.r = e.r;
            var wx0 = pr.x, wy0 = pr.y;
            World.resolve(pr);
            var ddx = pr.x - wx0, ddy = pr.y - wy0, dd = ddx * ddx + ddy * ddy;
            if (dd > pb) { pb = dd; px = ddx; py = ddy; }
          }
          lk.x += px; lk.y += py;
          if (want > 0.01 && Math.hypot(lk.x - ox, lk.y - oy) < want * 0.45) {
            if ((lk.stuckT += dt) > L.stuck) { lk.stuckT = 0; lk.ghostT = L.ghost; }
          } else lk.stuckT = 0;
        }
      }
      if (lk.joinT >= 0 && (lk.joinT += dt) > L.joinMax) snap = true;
      var ca = Math.cos(lk.a), sa = Math.sin(lk.a);
      for (i = 0; i < hx.length; i++) {
        if (!this.lockPut(lk, hx[i], ca, sa, L.gather * dt, snap)) all = false;
      }
      for (i = 0; i < sl.length; i++) {
        if (sl[i] && !this.lockPut(lk, sl[i], ca, sa, L.come * dt, snap)) all = false;
      }
      if (lk.st === 1 && ((lk.t += dt) > L.formMax || all)) {
        lk.st = 2;
        for (i = 0; i < hx.length; i++) this.lockPut(lk, hx[i], ca, sa, 0, true);
        for (i = 0; i < sl.length; i++) if (sl[i]) this.lockPut(lk, sl[i], ca, sa, 0, true);
        FX.ring(lk.x, lk.y, L.R, L.R * 3.2, '#7ae0ff', 0.45, 4);
        Snd.play('lockDone');
        all = true;
      }
      if (lk.st === 2 && lk.joinT >= 0 && all) {
        lk.joinT = -1;
        FX.ring(lk.x, lk.y, L.R, L.R * (2.4 + hx.length * 0.5), this.heatHex(lk.heat), 0.5, 4);
        Snd.play('lockJoin');
      }
      this.lockSegs(lk);
      this.lockHeat(lk);
      this.lockRope(lk, dt);
      this.lockGrow(lk, dt);
    }
  },
  probe: { x: 0, y: 0, r: 0 },
  lockInWall: function (lk) {
    var ca = Math.cos(lk.a), sa = Math.sin(lk.a), pr = this.probe;
    for (var i = 0; i < lk.hx.length; i++) {
      var e = lk.hx[i];
      if (!e.lkIn) continue;
      var x = lk.x + ca * e.lkU - sa * e.lkV, y = lk.y + sa * e.lkU + ca * e.lkV;
      pr.x = x; pr.y = y; pr.r = e.r;
      World.resolve(pr);
      if (Math.abs(pr.x - x) + Math.abs(pr.y - y) > 1) return true;
    }
    return false;
  },
  clT: -1,
  lockPut: function (lk, e, ca, sa, step, snap) {
    e.vx = e.vy = 0;
    e.ang = lk.a + e.lkA;
    if (!e.lkIn) {
      if (!snap) {
        var tx = lk.x + ca * e.lkX - sa * e.lkY, ty = lk.y + sa * e.lkX + ca * e.lkY;
        var mx = tx - e.x, my = ty - e.y, md = Math.sqrt(mx * mx + my * my);
        if (md > step + 1) { e.x += mx / md * step; e.y += my / md * step; return false; }
        FX.ring(tx, ty, e.r * 0.6, e.r + 16, e.def.trim, 0.25, 2);
        if (Math.abs(Game.time - this.clT) > 0.06) { this.clT = Game.time; Snd.play('lockClick'); }
      }
      e.lkIn = true; e.lkU = e.lkX; e.lkV = e.lkY;
    } else {
      var du = e.lkX - e.lkU, dv = e.lkY - e.lkV;
      if (du !== 0 || dv !== 0) {
        var dd = Math.sqrt(du * du + dv * dv);
        if (snap || dd <= step) { e.lkU = e.lkX; e.lkV = e.lkY; }
        else { e.lkU += du / dd * step; e.lkV += dv / dd * step; }
      }
    }
    e.x = lk.x + ca * e.lkU - sa * e.lkV; e.y = lk.y + sa * e.lkU + ca * e.lkV;
    return true;
  },

  lockSegs: function (lk) {
    var sl = lk.sl, S = sl.length, seg = lk.seg, whole = lk.ring && lk.st === 2 && S > 2;
    seg.length = 0;
    for (var k = 0; k < S; k++) {
      var nk = k + 1;
      if (nk === S) { if (!lk.ring || S < 3) break; nk = 0; }
      var a = sl[k], b = sl[nk];
      if (!a || !b) { whole = false; continue; }
      if (a.lkIn && b.lkIn) seg.push(a, b);
      else {
        whole = false;
        if (a.chain === b.chain && (lk.st === 1 || (!a.lkIn && !b.lkIn))) seg.push(a, b);
      }
    }
    lk.whole = whole;
  },
  lockHeat: function (lk) {
    var L = this.K.lock, on = Game.time >= L.heatFrom, burn = on && lk.whole;
    lk.heat = burn ? 1 : (on ? L.h0 + (0.85 - L.h0) * U.clamp((lk.nl - L.n0) / (L.n1 - L.n0), 0, 1) : 0);
    if (burn && !lk.burn) {
      this.lockStat.burn++;
      FX.ring(lk.x, lk.y, L.R, L.R * 4.2, '#ffb35c', 0.55, 5);
      Snd.play('cableBurn');
    }
    lk.burn = burn;
  },
  lockRope: function (lk, dt) {
    var L = this.K.lock, K = this.K.link, p = Game.player, seg = lk.seg;
    if (lk.cd > 0) lk.cd -= dt;
    if (lk.cd > 0 || !p.alive || p.dashT > 0 || !seg.length) return;
    var rr = p.r + (lk.burn ? L.burnR : 5), lim = K.ropeMax * K.ropeMax;
    for (var i = 0; i < seg.length; i += 2) {
      var a = seg[i], b = seg[i + 1], bx = b.x - a.x, by = b.y - a.y, L2 = bx * bx + by * by;
      if (L2 > lim || L2 < 1) continue;
      var t = U.clamp(((p.x - a.x) * bx + (p.y - a.y) * by) / L2, 0, 1);
      if (t <= 0.08 || t >= 0.92) continue;
      var qx = a.x + bx * t - p.x, qy = a.y + by * t - p.y;
      if (qx * qx + qy * qy >= rr * rr) continue;
      var n = a.dmg * K.ropeK * (1 + L.hot * lk.heat) * (lk.burn ? L.burnK : 1), col = this.heatHex(lk.heat);
      lk.cd = K.ropeCd;
      this.lockStat.hits++; this.lockStat.dmg += n;
      p.hurt(n);
      if (lk.burn) {
        p.fireD = p.fireT > 0 ? Math.max(p.fireD, n * L.fireK) : n * L.fireK;
        p.fireT = L.fire;
        FX.burst(p.x, p.y, 14, '#ffb35c', 200, 0.5, 4);
      } else p.slowT = Math.max(p.slowT, K.slow);
      FX.bolt(a.x, a.y, b.x, b.y, col);
      Snd.play('rope');
      FX.burst(p.x, p.y, 8, col, 160, 0.35, 3);
      break;
    }
  },
  lockGrow: function (lk, dt) {
    var L = this.K.lock, p = Game.player;
    if (Game.time < L.grow || Finale.frozenAt >= 0 || lk.st !== 2) return;
    var back = U.angleTo(p.x, p.y, lk.x, lk.y), rd = Math.max(this.ringMin(), U.dist(p.x, p.y, lk.x, lk.y) + 260);
    var bx = p.x + Math.cos(back) * rd, by = p.y + Math.sin(back) * rd, e, c;
    if ((lk.cellT -= dt) <= 0) {
      lk.cellT = L.cellEvery;
      if (lk.hx.length < L.cells) {
        e = this.lockFree(lk.x, lk.y, L.near * 0.7);
        if (!e) { e = this.put('shellback', bx + U.rand(-50, 50), by + U.rand(-50, 50)); if (e) this.hexDebt++; }
        if (e && this.lockAddHex(lk, e)) { if (lk.joinT < 0) lk.joinT = 0; }
        else lk.cellT = 5;
      }
    }
    if ((lk.chainT -= dt) <= 0) {
      lk.chainT = L.chainEvery;
      var n = Math.min(this.chainN(), L.links - lk.nl);
      if (n > 0) {
        c = this.spawnChain(bx + Math.cos(back) * 80, by + Math.sin(back) * 80, n);
        if (c) {
          this.lockTake(lk, c);
          this.lockLay(lk);
          if (lk.joinT < 0) lk.joinT = 0;
        } else lk.chainT = 5;
      }
    }
  },

  ropeX: 0, ropeY: 0, ropeL: null,
  ropeBlock: function (x0, y0, x1, y1) {
    var LK = this.locks;
    for (var li = 0; li < LK.length; li++) {
      if (LK[li].st !== 2) continue;
      var seg = LK[li].seg;
      for (var i = 0; i < seg.length; i += 2) {
        var a = seg[i], b = seg[i + 1];
        if (a.dead || b.dead || !a.lkIn || !b.lkIn) continue;
        var rx = b.x - a.x, ry = b.y - a.y, sx = x1 - x0, sy = y1 - y0;
        var den = rx * sy - ry * sx;
        if (den > -1e-6 && den < 1e-6) continue;
        var qx = x0 - a.x, qy = y0 - a.y;
        var u = (qx * sy - qy * sx) / den, v = (qx * ry - qy * rx) / den;
        if (v < 0 || v > 1 || u < 0 || u > 1) continue;
        var ar = a.r + 6;
        if (U.dist2(x1, y1, a.x, a.y) < ar * ar || U.dist2(x1, y1, b.x, b.y) < ar * ar) continue;
        var cut = 6 / Math.sqrt(rx * rx + ry * ry);
        if (u < cut || u > 1 - cut) continue;
        this.ropeX = a.x + rx * u; this.ropeY = a.y + ry * u; this.ropeL = LK[li];
        return true;
      }
    }
    return false;
  },
  ropeHit: function (ang) {
    var lk = this.ropeL, t = Game.time;
    FX.spray(this.ropeX, this.ropeY, ang, 3, this.heatHex(lk ? lk.heat : 0), 150);
    if (t - this.cbT > 0.2 || t < this.cbT) { this.cbT = t; Snd.play('cableBlock'); }
  },
  heatCols: null,
  heatHex: function (h) {
    var P = this.heatCols, i;
    if (!P) {
      P = this.heatCols = [];
      var st = [[0, 122, 224, 255], [0.6, 255, 138, 42], [1, 255, 240, 196]];
      for (i = 0; i <= 10; i++) {
        var k = i / 10, s = k <= 0.6 ? 0 : 1, a = st[s], b = st[s + 1], w = (k - a[0]) / (b[0] - a[0]), hex = '#';
        for (var j = 1; j < 4; j++) { var v = Math.round(a[j] + (b[j] - a[j]) * w); hex += (v < 16 ? '0' : '') + v.toString(16); }
        P.push(hex);
      }
    }
    return P[Math.round(U.clamp(h, 0, 1) * 10)];
  },

  beetleStep: function (e, dt, d, dx, dy, sp) {
    var K = this.K.beetle;
    if (e.fuse > 0) {
      e.vx = e.vy = 0;
      e.fuse -= dt;
      if (e.fuse <= 0) { e.dead = true; this.beetleBoom(e, false); }
      return;
    }
    if (d < K.flank && d > K.fuseD) {
      var p = Game.player, tx = p.x + Math.cos(e.rollA) * K.fuseD * 0.7 - e.x, ty = p.y + Math.sin(e.rollA) * K.fuseD * 0.7 - e.y;
      var td = Math.sqrt(tx * tx + ty * ty) || 1;
      e.vx = tx / td * sp; e.vy = ty / td * sp;
    } else { e.vx = dx / d * sp; e.vy = dy / d * sp; }
    if (d < K.fuseD) {
      e.fuse = K.fuse;
      e.rm = Bosses.mark({ k: 'disc', x: e.x, y: e.y, r: K.r, t: K.fuse, c: K.c, o: e, follow: true });
      Snd.play('beetleTell');
    }
  },
  beetleBoom: function (e, foes) {
    var K = this.K.beetle, p = Game.player, R = K.r;
    FX.burst(e.x, e.y, 16, '#ff7a3a', 240, 0.45, 4);
    FX.ring(e.x, e.y, 10, R, K.c, 0.3, 4);
    FX.blast(e.x, e.y, R * 0.8, '#ff7a3a');
    FX.shake(4);
    Snd.play('beetleBoom');
    if (!foes) {
      var pr = R + p.r * 0.5;
      if (U.dist2(e.x, e.y, p.x, p.y) < pr * pr) p.hurt(e.dmg);
      return;
    }
    var near = [], dmg = K.foeDmg * this.hpMult();
    Game.grid.query(e.x, e.y, R + 30, near);
    for (var i = 0; i < near.length; i++) {
      var o = near[i], rr = R + o.r * 0.5;
      if (o === e || o.dead || o.zz) continue;
      if (U.dist2(e.x, e.y, o.x, o.y) < rr * rr) this.damage(o, dmg, false, e.x, e.y, 30);
    }
    World.damageArea(e.x, e.y, R, dmg);
  },

  rollerStep: function (e, dt, d, dx, dy, sp) {
    var K = this.K.roller, p = Game.player;
    if (e.roll === 1) {
      e.vx = e.vy = 0;
      e.ang = e.rollA;
      if ((e.rollT -= dt) <= 0) { e.roll = 2; e.rollT = 0; Snd.play('roll'); }
      else if (Math.random() < dt * 14) FX.burst(e.x + U.rand(-e.r, e.r), e.y + U.rand(-e.r, e.r), 2, '#c9b08a', 90, 0.5, 4);
      return;
    }
    if (e.roll === 2) {
      var v = K.sp * (e.slowT > 0 ? 0.6 : 1);
      e.ang = e.rollA;
      e.vx = Math.cos(e.rollA) * v; e.vy = Math.sin(e.rollA) * v;
      e.rollL -= v * dt;
      e.spin += v * dt / e.r;
      if (e.rm) { e.rm.x = e.x; e.rm.y = e.y; e.rm.len = Math.max(0, e.rollL); }
      var hr = e.r + p.r;
      if (!e.rollT && U.dist2(e.x, e.y, p.x, p.y) < hr * hr && p.dashT <= 0 && p.inv <= 0) {
        e.rollT = 1;
        p.hurt(p.st.maxHp * K.hit);
        FX.shake(12);
      }
      var fx = e.x + Math.cos(e.rollA) * (e.r + 8), fy = e.y + Math.sin(e.rollA) * (e.r + 8);
      var wall = World.blocked(fx, fy);
      if (e.rollL <= 0 || wall) this.rollStop(e, wall);
      return;
    }
    if (e.roll === 3) {
      e.vx = e.vy = 0;
      e.ang = e.rollA;
      if ((e.rollT -= dt) <= 0) e.roll = 0;
      return;
    }
    e.vx = dx / d * sp; e.vy = dy / d * sp;
    e.spin += sp * dt / e.r;
    e.shootCd -= dt;
    if (e.shootCd <= 0 && d < K.near) {
      e.shootCd = K.cd;
      e.roll = 1; e.rollT = K.tell; e.rollA = e.ang;
      var len = Bosses.ray(e.x, e.y, e.rollA, K.len).d;
      e.rollL = len;
      e.rm = Bosses.mark({ k: 'line', x: e.x, y: e.y, a: e.rollA, len: len, w: e.r * 2, t: K.tell + len / K.sp, c: K.c, o: e, fade: true, out: 0 });
      Snd.play('rollTell');
    }
  },
  rollStop: function (e, wall) {
    if (e.rm) { e.rm.t = Math.min(e.rm.t, 0.35); e.rm.out = 0.35; e.rm.len = Math.max(0, e.rollL); e.rm = null; }
    e.roll = 3; e.rollT = wall ? this.K.roller.stun : 0.4;
    e.vx = e.vy = 0;
    if (wall) {
      FX.burst(e.x + Math.cos(e.rollA) * e.r, e.y + Math.sin(e.rollA) * e.r, 14, '#c9b08a', 200, 0.6, 5);
      FX.shake(6);
      Snd.play('rollCrash');
    }
  },

  keepMove: function (e, d, dx, dy, sp, want) {
    var dir = d > want + 40 ? 1 : (d < want - 40 ? -1 : 0);
    e.vx = dx / d * sp * dir; e.vy = dy / d * sp * dir;
  },

  medicStep: function (e, dt, d, dx, dy, sp) {
    var K = this.K.medic;
    this.keepMove(e, d, dx, dy, sp, e.def.keep);
    if (e.tgt && (e.tgt.dead || e.tgt.wardBy !== e || !(e.tgt.ward > 0))) e.tgt = null;
    if ((e.shootCd -= dt) > 0) return;
    var t = this.wardPick(e, K.range);
    e.shootCd = t ? K.cd : 1;
    if (!t) return;
    t.ward = K.ward; t.wardBy = e; e.tgt = t;
    FX.bolt(e.x, e.y, t.x, t.y, K.c);
    FX.ring(t.x, t.y, t.r, t.r + 26, K.c, 0.35, 3);
    Snd.play('heal');
  },
  tmpW: [],
  wardPick: function (e, R) {
    var near = this.tmpW, best = null, bh = 0;
    near.length = 0;
    Game.grid.query(e.x, e.y, R, near);
    for (var i = 0; i < near.length; i++) {
      var o = near[i];
      if (o === e || o.dead || o.boss || o.zz || o.inv || o.def.pylon || o.def.larva || o.def.medic || o.ward > 0) continue;
      if (o.maxHp > bh && U.dist2(e.x, e.y, o.x, o.y) < R * R) { bh = o.maxHp; best = o; }
    }
    return best;
  },

  hookerStep: function (e, dt, d, dx, dy, sp) {
    var K = this.K.hooker, p = Game.player;
    if (!e.cast) {
      this.keepMove(e, d, dx, dy, sp, e.def.keep);
      if ((e.shootCd -= dt) > 0 || d > K.near || !p.alive) return;
      var mv = Input.move, sd = p.st.speed * (p.slowT > 0 ? 0.55 : 1) * K.lead;
      var a = U.angleTo(e.x, e.y, p.x + mv.x * sd, p.y + mv.y * sd);
      var len = Bosses.ray(e.x, e.y, a, K.len).d;
      e.cast = 1; e.castT = K.tell; e.castA = e.ang = a; e.castM = len; e.castL = 0;
      e.castX = e.x; e.castY = e.y;
      e.rm = Bosses.mark({ k: 'line', x: e.x, y: e.y, a: a, len: len, w: K.w, t: K.tell, c: K.c, o: e });
      Snd.play('tell');
      return;
    }
    e.vx = e.vy = 0;
    e.ang = e.castA;
    if (e.cast === 1) {
      if ((e.castT -= dt) <= 0) { e.cast = 2; e.rm = null; Snd.play('hook'); }
      return;
    }
    var ca = Math.cos(e.castA), sa = Math.sin(e.castA);
    if (e.cast === 2) {
      e.castL += K.sp * dt;
      var hx = e.x + ca * e.castL, hy = e.y + sa * e.castL, hr = p.r + K.w / 2;
      if (p.alive && p.dashT <= 0 && U.dist2(hx, hy, p.x, p.y) < hr * hr) {
        e.cast = 3; e.castT = K.pullT;
        p.hook = e;
        p.hurt(e.dmg * K.catchK);
        FX.burst(p.x, p.y, 10, K.c, 180, 0.35, 3);
        FX.shake(5);
      } else if (e.castL >= e.castM) e.cast = 4;
      return;
    }
    if (e.cast === 3) {
      var px = e.x - p.x, py = e.y - p.y, pd = Math.sqrt(px * px + py * py) || 1;
      e.castL = pd;
      if (p.hook !== e || !p.alive || (e.castT -= dt) <= 0 || pd < e.r + p.r + 10) {
        if (p.hook === e) p.hook = null;
        e.cast = 4;
        return;
      }
      var st = Math.min(pd - e.r - p.r - 8, K.pull * dt);
      p.x += px / pd * st; p.y += py / pd * st;
      World.resolve(p);
      return;
    }
    e.castL -= K.sp * 2 * dt;
    if (e.castL <= 0) { e.cast = 0; e.castL = 0; e.shootCd = K.cd; }
  },
  unhook: function (p) {
    var e = p.hook;
    p.hook = null;
    if (e && e.cast === 3) e.cast = 4;
    if (e) FX.burst(p.x, p.y, 8, this.K.hooker.c, 160, 0.3, 3);
  },

  muterStep: function (e, dt, d, dx, dy, sp) {
    var K = this.K.muter, p = Game.player;
    if (!e.cast) {
      this.keepMove(e, d, dx, dy, sp, e.def.keep);
      if ((e.shootCd -= dt) > 0 || d > K.near || !p.alive) return;
      e.cast = 1; e.castT = K.tell; e.castX = p.x; e.castY = p.y;
      e.rm = Bosses.mark({ k: 'disc', x: p.x, y: p.y, r: K.r, t: K.tell, c: K.c, o: e });
      Snd.play('muteTell');
      return;
    }
    e.vx = e.vy = 0;
    if ((e.castT -= dt) > 0) return;
    e.cast = 0; e.shootCd = K.cd;
    if (e.rm) { e.rm.t = 0; e.rm = null; }
    FX.ring(e.castX, e.castY, K.r * 0.3, K.r, K.c, 0.4, 4);
    if (p.alive && U.dist2(p.x, p.y, e.castX, e.castY) < K.r * K.r) {
      p.muteT = Math.max(p.muteT, K.mute);
      if (p.tethers) p.tethers.length = 0;
      FX.burst(p.x, p.y, 12, K.c, 140, 0.5, 3);
      Snd.play('mute');
    }
  },

  update: function (dt) {
    var p = Game.player, list = Game.enemies, grid = Game.grid;
    grid.clear();
    for (var i = 0; i < list.length; i++) grid.insert(list[i]);
    var lost = this.ringMax() * 1.3, offscreen = Game.viewRadius() * 1.1;
    this.chainStep(dt);
    this.lockStep(dt, lost);
    if (this.booms.length) this.boomStep(dt);
    for (i = 0; i < this.chains.length; i++) {
      if (this.chains[i].lk) continue;
      var hd = this.chains[i].m[0];
      if (U.dist2(hd.x, hd.y, p.x, p.y) > lost * lost) this.chainCatchUp(this.chains[i]);
    }
    var nRoll = 0, nNest = 0, NC = this.nCast;
    NC.medic = NC.hooker = NC.muter = 0;

    for (i = list.length - 1; i >= 0; i--) {
      var e = list[i];
      if (e.dead) { list.splice(i, 1); continue; }
      if (e.def.roller) nRoll++;
      else if (e.def.nest) nNest++;
      else if (e.def.caster) NC[e.type]++;

      if (e.flash > 0) e.flash -= dt;
      if (e.ward > 0 && ((e.ward -= dt) <= 0 || e.wardBy.dead)) { e.ward = 0; e.wardBy = null; }
      var sp = e.speed;
      if (e.slowT > 0) { e.slowT -= dt; sp *= 0.6; }

      var dx = p.x - e.x, dy = p.y - e.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (!e.lk) e.ang = Math.atan2(dy, dx);
      if (e.elite && !e.aggro && d < 380) { e.aggro = true; Snd.play('aggro'); }

      if (d > lost && !e.boss && !e.def.pylon && !e.chain && !e.lk) {
        var np = U.ring(p.x, p.y, this.ringMin(), this.ringMax());
        e.x = np.x; e.y = np.y;
        if (e.roll || e.cast) {
          if (e.rm) e.rm.t = 0;
          e.rm = null; e.roll = 0; e.cast = 0; e.castL = 0;
          if (p.hook === e) p.hook = null;
        }
        continue;
      }
      if (d > offscreen) sp *= 1.3;

      var fz = e.frz > 0;
      if (fz) {
        e.frz -= dt;
        e.vx = e.vy = 0;
        if (e.rm) e.rm.t += dt;
      } else if (e.lk) {
        e.vx = e.vy = 0;
      } else if (e.boss) {
        this.bossAI(e, dt, d);
      } else if (e.def.pylon) {
        e.vx = e.vy = 0;
        if (!e.owner || e.owner.dead) e.dead = true;
        else if (e.def.comb) Bosses.combStep(e, dt);
      } else if (e.def.larva) {
        Bosses.larvaStep(e, dt, d, sp);
      } else if (e.def.beetle) {
        this.beetleStep(e, dt, d, dx, dy, sp);
      } else if (e.def.link) {
        this.linkStep(e, dt, d, dx, dy, sp);
      } else if (e.def.roller) {
        this.rollerStep(e, dt, d, dx, dy, sp);
      } else if (e.def.medic) {
        this.medicStep(e, dt, d, dx, dy, sp);
      } else if (e.def.hooker) {
        this.hookerStep(e, dt, d, dx, dy, sp);
      } else if (e.def.muter) {
        this.muterStep(e, dt, d, dx, dy, sp);
      } else if (e.def.ranged) {
        var want = e.def.keep;
        var dir = d > want + 40 ? 1 : (d < want - 40 ? -1 : 0);
        if (e.aim > 0) {
          e.vx = e.vy = 0;
          e.aim -= dt;
          if (e.aim <= 0) Game.spawnEnemyBullet(e.x, e.y, e.ang, 230, e.dmg * 0.8, e.elite ? CFG.col.enemyShot : CFG.col.spit);
        } else {
          e.vx = (dx / d) * sp * dir;
          e.vy = (dy / d) * sp * dir;
          e.shootCd -= dt;
          if (e.shootCd <= 0 && d < want + 160) {
            e.shootCd = U.rand(2.2, 3.4);
            e.aim = this.K.spitAim;
          }
        }
      } else if (e.def.nest) {
        e.vx = e.vy = 0;
        e.shootCd -= dt;
        if (e.shootCd <= 0) {
          e.shootCd = U.rand(3.5, 5);
          FX.ring(e.x, e.y, e.r, e.r + 60, e.def.trim, 0.4, 3);
          FX.burst(e.x, e.y, 8, e.def.trim, 160, 0.4, 3);
          var seen = d < Game.viewRadius();
          for (var sw = 0; sw < 4; sw++) {
            var sa2 = Math.random() * 6.28;
            if (seen) this.summon('swarm', e.x + Math.cos(sa2) * 42, e.y + Math.sin(sa2) * 42);
            else this.spawn('swarm', e.x + Math.cos(sa2) * 42, e.y + Math.sin(sa2) * 42, false);
          }
        }
      } else if (e.def.charger) {
        if (e.charge > 0) {
          e.charge -= dt;
          e.vx = Math.cos(e.chargeAng) * 620;
          e.vy = Math.sin(e.chargeAng) * 620;
        } else if (e.aim > 0) {
          e.aim -= dt;
          e.vx = e.vy = 0;
          if (e.aim <= 0) { e.charge = 0.45; e.chargeAng = e.ang; }
        } else {
          e.vx = (dx / d) * sp;
          e.vy = (dy / d) * sp;
          e.shootCd -= dt;
          if (e.shootCd <= 0 && d < 340) { e.shootCd = U.rand(3, 4.5); e.aim = 0.5; }
        }
      } else {
        e.vx = (dx / d) * sp;
        e.vy = (dy / d) * sp;
      }

      var gc = grid.cell, qr = e.r * 2.2;
      var gx1 = e.lk ? -1e9 : Math.floor((e.x + qr) / gc), gy0 = Math.floor((e.y - qr) / gc), gy1 = Math.floor((e.y + qr) / gc);
      for (var gx = Math.floor((e.x - qr) / gc); gx <= gx1; gx++) {
        for (var gy = gy0; gy <= gy1; gy++) {
          var bk = grid.bucket(gx, gy);
          if (!bk) continue;
          for (var j = 0; j < bk.length; j++) {
            var o = bk[j];
            if (o === e || o.dead) continue;
            var ox = e.x - o.x, oy = e.y - o.y;
            var od2 = ox * ox + oy * oy;
            var minD = e.r + o.r;
            if (od2 < minD * minD && od2 > 0.01) {
              var od = Math.sqrt(od2);
              var push = (minD - od) / minD * 60;
              e.vx += (ox / od) * push;
              e.vy += (oy / od) * push;
            }
          }
        }
      }

      if (e.def.nest || e.def.pylon || e.zz || fz || e.cast) e.vx = e.vy = 0;
      var wasX = e.x, wasY = e.y;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (!e.boss && !e.lk) {
        World.resolve(e);
        var moved = Math.hypot(e.x - wasX, e.y - wasY);
        var want = Math.hypot(e.vx, e.vy) * dt;
        if (want > 0.01 && moved < want * 0.45) {
          if (e.roll === 2 && e.def.roller) { this.rollStop(e, true); continue; }
          e.stuckT = (e.stuckT || 0) + dt;
          var bw = e.stuckT > CFG.walls.patience ? World.blockingWall(e) : null;
          if (bw) {
            var tx, ty;
            if (bw.w >= bw.h) {
              tx = (e.x - bw.x) < (bw.x + bw.w - e.x) ? bw.x - 45 : bw.x + bw.w + 45;
              ty = e.y;
            } else {
              tx = e.x;
              ty = (e.y - bw.y) < (bw.y + bw.h - e.y) ? bw.y - 45 : bw.y + bw.h + 45;
            }
            var sa = U.angleTo(e.x, e.y, tx, ty);
            e.x += Math.cos(sa) * sp * dt * CFG.walls.slide;
            e.y += Math.sin(sa) * sp * dt * CFG.walls.slide;
            World.resolve(e);
            e.slide = 1;
          }
        } else if (moved > want * 0.8) {
          e.slide = 0;
          e.stuckT = 0;
        }
      }

      e.atkCd -= dt;
      var touch = e.r + p.r;
      if (d < touch && e.atkCd <= 0 && !e.def.ranged && !e.zz && !fz && !e.def.pylon && !e.def.larva && !(e.fuse > 0) && e.roll !== 2 && !(e.lift > 20)) {
        e.atkCd = 0.8;
        p.hurt(e.def.beetle ? e.dmg * this.K.beetle.touchK : e.dmg);
      }
    }
    this.nRoll = nRoll; this.nNest = nNest;
    if (this.chains.length) this.chainTaut(dt);
    if (p.hook && (p.hook.dead || p.hook.cast !== 3 || p.hook.frz > 0)) p.hook = null;
  },

  spawnBoss: function (index) {
    var bd = Bosses.forIndex(index);
    var cycle = Bosses.cycle(index);
    var L = CFG.boss.lair, p = Game.player;
    var pos = Bosses.spot(p.x, p.y, L.dMin, L.dMax);
    var e = this.spawn('boss', pos.x, pos.y, false);
    e.bd = bd;
    e.r = bd.r * 1.2;
    e.speed = bd.speed * (1 + cycle * 0.12);
    e.dmg *= bd.dmgMul;
    e.hp = e.maxHp = e.maxHp * bd.hpMul * (1 + cycle * 0.8);
    e.coins = Math.floor(e.coins * (1 + cycle * 0.5));
    e.anchorX = pos.x; e.anchorY = pos.y;
    e.state = 'sleep'; e.zz = true; e.hunt = false;
    e.lairT = Game.time; e.sleepT = 0; e.riseT = 0; e.farT = 0; e.hk = 1;
    e.baseHp = e.maxHp; e.baseDmg = e.dmg;
    e.ang = e.sleepAng = U.angleTo(pos.x, pos.y, p.x, p.y);
    e.t1 = U.rand(1.5, 2.5); e.t2 = U.rand(4, 6);
    e.aim = 0; e.charge = 0; e.chargeAng = 0; e.shield = 0; e.beamA = Math.random() * 6.28;
    e.idx = index;
    e.ph = 0; e.m = {}; e.pyl = [];
    Bosses.reset(e);
    return e;
  },

  bossAI: function (e, dt, d) { Game.shooter = e; Bosses.step(e, dt, d); Game.shooter = null; },

  announceUnlock: function () {
    for (var k in this.defs) {
      var d = this.defs[k];
      if (d.fromBoss === Game.bossIndex && d.ru) {
        var name = I18N.foe(k, d);
        setTimeout(function () { UI.toast(I18N.t('newFoe', { n: name })); }, 2800);
        return;
      }
    }
  },

  drawHpBar: function (ctx, e) {
    if (e.hp >= e.maxHp) return;
    var w = e.r * 2.2;
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(e.x - w / 2, e.y - e.r - 14, w, 5);
    ctx.fillStyle = e.bd ? e.bd.trim : '#e2503a';
    ctx.fillRect(e.x - w / 2, e.y - e.r - 14, w * (e.hp / e.maxHp), 5);
  },

  damage: function (e, amount, crit, srcX, srcY, knock) {
    if (e.dead) return;
    if (e.boss && e.state !== 'fight' && e.bd) Bosses.hit(e);
    if (e.inv) { e.flash = 0.04; FX.spray(e.x, e.y, U.angleTo(e.x, e.y, srcX, srcY), 2, '#b6e07a', 140); return; }
    if (e.def.decoy) { FX.spray(e.x, e.y, U.angleTo(e.x, e.y, srcX, srcY), 1, e.def.trim, 120); return; }
    var open = e.openT > 0 && e.openK > 1;
    if (open) amount *= e.openK;
    if (e.shield > 0) amount *= 0.45;
    if (e.def.armor) amount *= 1 - e.def.armor;
    if (e.fuse > 0) amount *= 1 - this.K.beetle.shell;
    if (e.ward > 0) amount *= 1 - this.K.medic.cut;
    if (e.esh > 0 && (amount = this.eliteShield(e, amount)) <= 0) {
      FX.spray(e.x, e.y, U.angleTo(e.x, e.y, srcX, srcY), 1, this.K.esp.c[2], 140);
      Snd.play('hit');
      return;
    }
    e.hp -= amount;
    e.flash = 0.08;
    if (knock && !e.def.heavy && !e.boss && !e.def.nest && !(e.def.ranged && e.aim > 0) && !(e.fuse > 0) && !(e.ward > 0) && !e.cast && !e.lk) {
      var a = U.angleTo(srcX, srcY, e.x, e.y);
      e.x += Math.cos(a) * knock;
      e.y += Math.sin(a) * knock;
    }
    if (crit || e.boss || e.elite || e.def.heavy) {
      FX.text(e.x + U.rand(-6, 6), e.y - e.r - 4, Math.round(amount), crit || open ? '#ffd27d' : '#ffffff', crit || open ? 17 : 13);
    }
    if (e.hp <= 0) this.kill(e);
    else Snd.play('hit');
  },

  kill: function (e) {
    e.dead = true;
    var mult = Save.mult().loot * Game.player.char.loot;
    var coins = e.coins * mult * (e.boss ? CFG.coins.boss : CFG.coins.mob);
    Game.runCoins += coins;
    Game.kills++;
    Game.score += CFG.score.perKill + (e.boss ? CFG.score.bossBonus : 0) + (e.elite ? 40 : 0);
    Game.scoreParts.kills += CFG.score.perKill + (e.elite ? 40 : 0);
    if (e.boss) { Game.scoreParts.bosses += CFG.score.bossBonus; if (!e.rep) Game.bossKills++; }

    var pl = Game.player;
    pl.killCount++;
    if (pl.st.siphon > 0 && pl.killCount % 20 === 0) pl.heal(pl.st.maxHp * 0.02);
    if (pl.evo.spore && Game.clouds.length) Player.epidemic(e);
    Game.spawnGem(e.x, e.y, Finale.frenzy() ? e.xp * CFG.finale.xp : e.xp);
    if (e.flagLoot) World.drop(e.x, e.y, U.pick(['rage', 'haste', 'shield', 'heal']));
    if (U.chance(Game.player.st.vamp)) Game.spawnHeal(e.x, e.y);

    if (e.def.beetle && e.fuse > 0) { e.fuse = 0; this.beetleBoom(e, true); }
    if (e.esp === 3) this.eliteBomb(e);
    if (e.def.split && !e.splitChild) {
      for (var s = 0; s < 3; s++) {
        var sa = Math.random() * 6.28;
        var kid = this.spawn('swarm', e.x + Math.cos(sa) * 26, e.y + Math.sin(sa) * 26, false);
        if (kid) kid.splitChild = true;
      }
    }
    FX.burst(e.x, e.y, e.boss ? 40 : (e.elite ? 18 : 8), e.def.trim, e.boss ? 320 : 180, 0.55, e.boss ? 5 : 3);
    if (e.boss) {
      if (e.bd) Bosses.reset(e);
      FX.ring(e.x, e.y, 20, 300, e.bd ? e.bd.trim : '#f0a24a', 0.7, 5);
      FX.blast(e.x, e.y, e.r * 3, '#ffb35c');
      FX.shake(14);
      Snd.play('boom');
      if (e.rep) { UI.bossBanner(I18N.name(e.bd), false); Finale.repDead(e); return; }
      if (e.bd) {
        Save.data.bosses[e.bd.id] = (Save.data.bosses[e.bd.id] || 0) + 1;
        Save.flush(true);
        if (e.bd !== Bosses.queen) UI.bossBanner(I18N.name(e.bd), false);
      }
      Game.nextBoss = Game.time + U.clamp(Game.nextBoss - Game.time, CFG.boss.grace, CFG.boss.graceMax);
      Enemies.retimeFlags();
      Player.grantLevel(Game.player);
      var restored = false;
      if (Game.reviveLeft < CFG.ads.revivePerRun) {
        Game.reviveLeft = CFG.ads.revivePerRun;
        restored = true;
      }
      if (e.bd !== Bosses.queen) UI.toast(I18N.t(restored ? 'bossRewardBack' : 'bossReward'));
      PF.happyMoment();
      Bosses.emit('kill', e);
    } else {
      Snd.play('kill');
      if (e.elite) FX.ring(e.x, e.y, 10, 90, '#a24bd6', 0.4, 3);
    }
  },

  draw: function (ctx) {
    var list = Game.enemies;
    for (var ci = 0; ci < this.chains.length; ci++) {
      var cm = this.chains[ci].m;
      ctx.strokeStyle = this.chains[ci].cd > 0.6 ? '#ffffff' : '#7ae0ff';
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (var cj = 0; cj < cm.length; cj++) { if (cj && this.ropeOk(cm[cj - 1], cm[cj])) ctx.lineTo(cm[cj].x, cm[cj].y); else ctx.moveTo(cm[cj].x, cm[cj].y); }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (var li = 0; li < this.locks.length; li++) {
      var lk = this.locks[li], sg = lk.seg;
      ctx.strokeStyle = lk.cd > 0.6 ? '#ffffff' : this.heatHex(lk.heat);
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = lk.burn ? 5 : 3;
      ctx.beginPath();
      for (var si = 0; si < sg.length; si += 2) { ctx.moveTo(sg[si].x, sg[si].y); ctx.lineTo(sg[si + 1].x, sg[si + 1].y); }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      var d = e.def;
      if (e.boss && e.bd) { Bosses.draw(ctx, e); this.drawHpBar(ctx, e); continue; }
      if (d.decoy && e.owner) { Bosses.body(ctx, e, e.owner.bd, e.x, e.y, e.ang, 0.72, true); continue; }

      if (e.elite) GlowCache.draw(ctx, e.esp === 1 ? 'rgba(255,224,102,.4)' : (e.esp === 3 ? 'rgba(255,59,59,.45)' : 'rgba(162,75,214,.35)'), e.x, e.y, e.r * 2.1, 1);
      if (e.esp === 1 && (e.vx || e.vy)) {
        var tv = Math.sqrt(e.vx * e.vx + e.vy * e.vy) || 1;
        ctx.strokeStyle = this.K.esp.c[1]; ctx.globalAlpha = 0.45; ctx.lineWidth = e.r;
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x - e.vx / tv * e.r * 3, e.y - e.vy / tv * e.r * 3); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (e.boss) GlowCache.draw(ctx, 'rgba(240,162,74,.3)', e.x, e.y, e.r * 2.3, 1);
      if (e.chain && !e.inv) GlowCache.draw(ctx, 'rgba(122,224,255,.45)', e.x, e.y, e.r * 2.4, 1);

      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.ang);

      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(0, e.r * 0.3, e.r * 0.95, e.r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      var blink = (e.fuse > 0 || e.roll === 1 || e.cast === 1) && Math.sin(Game.time * 40) > 0;
      if (e.chain && e.inv) ctx.globalAlpha = 0.6;
      if (e.esp === 3 && Math.sin(Game.time * 9) > 0.4) blink = true;
      ctx.fillStyle = e.flash > 0 || blink ? (e.esp === 3 && !e.flash ? '#ff3b3b' : '#ffffff') : (e.elite ? (e.esp === 1 ? '#c9a23a' : '#8b4bd6') : d.body);
      ctx.strokeStyle = d.trim;
      ctx.lineWidth = e.boss ? 3 : 2;
      ctx.beginPath();
      if (e.type === 'runner' || e.type === 'charger' || e.type === 'hooker') {
        ctx.moveTo(e.r, 0);
        ctx.lineTo(-e.r * 0.8, -e.r * 0.7);
        ctx.lineTo(-e.r * 0.4, 0);
        ctx.lineTo(-e.r * 0.8, e.r * 0.7);
        ctx.closePath();
      } else if (e.type === 'brute' || e.type === 'roller' || e.boss) {
        ctx.rect(-e.r * 0.85, -e.r * 0.85, e.r * 1.7, e.r * 1.7);
      } else if (e.type === 'nest') {
        for (var nk = 0; nk < 8; nk++) {
          var na = nk / 8 * Math.PI * 2;
          var nx = Math.cos(na) * e.r * (nk % 2 ? 0.62 : 1);
          var ny = Math.sin(na) * e.r * (nk % 2 ? 0.62 : 1);
          if (nk === 0) ctx.moveTo(nx, ny); else ctx.lineTo(nx, ny);
        }
        ctx.closePath();
      } else if (e.type === 'splitter') {
        ctx.moveTo(e.r, 0); ctx.lineTo(0, -e.r); ctx.lineTo(-e.r, 0); ctx.lineTo(0, e.r);
        ctx.closePath();
      } else if (e.type === 'spitter' || e.type === 'shellback' || e.type === 'muter') {
        var sides = e.type === 'shellback' ? 6 : 5;
        for (var k = 0; k < sides; k++) {
          var a = k / sides * Math.PI * 2;
          var px = Math.cos(a) * e.r, py = Math.sin(a) * e.r;
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else {
        ctx.arc(0, 0, e.r, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (d.medic) {
        ctx.fillStyle = d.trim;
        ctx.fillRect(-e.r * 0.5, -e.r * 0.15, e.r, e.r * 0.3);
        ctx.fillRect(-e.r * 0.15, -e.r * 0.5, e.r * 0.3, e.r);
      }

      ctx.fillStyle = e.elite ? '#ffd27d' : d.trim;
      ctx.beginPath();
      ctx.arc(e.r * 0.35, 0, e.r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (e.esh > 0) {
        ctx.strokeStyle = this.K.esp.c[2]; ctx.lineWidth = 1 + 4 * e.esh / e.eshMax; ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 9, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (e.ward > 0) {
        ctx.strokeStyle = '#7dffa8'; ctx.lineWidth = 3; ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 7, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if ((d.medic && e.tgt && e.tgt.ward > 0) || (d.hooker && e.cast >= 2)) {
        var hx = d.medic ? e.tgt.x : e.x + Math.cos(e.castA) * e.castL, hy = d.medic ? e.tgt.y : e.y + Math.sin(e.castA) * e.castL;
        if (d.hooker && e.cast === 3) { hx = Game.player.x; hy = Game.player.y; }
        ctx.strokeStyle = d.trim; ctx.lineWidth = d.medic ? 3 : 4; ctx.globalAlpha = 0.75;
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(hx, hy); ctx.stroke();
        if (d.hooker) { ctx.fillStyle = d.trim; ctx.beginPath(); ctx.arc(hx, hy, 7, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = 1;
      }

      if (e.aim > 0) {
        ctx.strokeStyle = e.def.trim;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        var al2 = Math.min(720, U.dist(e.x, e.y, Game.player.x, Game.player.y));
        ctx.lineTo(e.x + Math.cos(e.ang) * al2, e.y + Math.sin(e.ang) * al2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      if ((e.boss || e.elite || e.def.heavy) && e.hp < e.maxHp) {
        var w = e.r * 2;
        ctx.fillStyle = 'rgba(0,0,0,.6)';
        ctx.fillRect(e.x - w / 2, e.y - e.r - 10, w, 4);
        ctx.fillStyle = e.boss ? '#f0a24a' : '#e2503a';
        ctx.fillRect(e.x - w / 2, e.y - e.r - 10, w * (e.hp / e.maxHp), 4);
      }
    }
    var pl = Game.player;
    if (pl && pl.muteT > 0) {
      ctx.strokeStyle = this.K.muter.c; ctx.lineWidth = 3; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(Game.time * 12);
      ctx.beginPath(); ctx.arc(pl.x, pl.y, pl.r + 12, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
};
