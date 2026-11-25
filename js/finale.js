var Finale = {
  stage: 'bosses',
  t: 0,
  frozenAt: -1,
  frozenDur: 0,
  eliteT: 0,
  red: 0,
  marks: null,
  t0: 0,
  reps: [],
  repN: 0,
  repWait: 0,

  start: function () {
    this.stage = 'bosses'; this.t = 0; this.frozenAt = -1; this.frozenDur = 0;
    this.eliteT = 0; this.red = 0; this.marks = {};
    this.t0 = 0; this.reps = []; this.repN = 0; this.repWait = 0;
    Game.endless = false; Game.won = false; Game.pendingWin = false;
    var sd = this.seedNext != null ? this.seedNext : (Date.now() ^ ((Save.data && Save.data.runs) | 0) * 7919);
    this.seedNext = null;
    Game.bossOrder = Bosses.order(Save.data && Save.data.runs ? null : 'crusher', this.rng(sd));
  },

  rng: function (a) {
    a = a >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  frenzy: function () { return this.stage === 'frenzy'; },
  growT: function () { return this.frozenAt >= 0 ? this.frozenAt : Game.time - this.frozenDur; },
  freeze: function () { if (this.frozenAt < 0) this.frozenAt = Game.time - this.frozenDur; },
  thaw: function () { if (this.frozenAt >= 0) { this.frozenDur = Game.time - this.frozenAt; this.frozenAt = -1; } },

  bossLeft: function () {
    var list = Game.enemies;
    for (var i = 0; i < list.length; i++) if (list[i].boss && list[i].bd && !list[i].dead) return true;
    return false;
  },

  tick: function (dt) {
    dt = dt || Game.fixed;
    var hot = this.stage === 'frenzy' || this.stage === 'queen';
    this.red = U.clamp(this.red + (hot ? dt * 0.5 : -dt * 0.35), 0, 1);
    if (Game.endless) return false;
    if (this.stage === 'bosses') {
      if (Game.bossIndex < Bosses.list.length) return false;
      if (!this.bossLeft()) {
        this.stage = 'wait';
        this.t = Game.time + CFG.finale.delay;
        Game.stageN = (Game.stageN || 0) + 1;
        Game.stageT0 = Game.time; Game.nextBoss = this.t; Game.flags = [];
      } else if (!Bosses.fighting && Game.time >= Game.nextBoss) {
        var w = Bosses.waiting();
        if (w.length) Bosses.wake(w[0], true);
        Game.nextBoss = Game.time + CFG.boss.every;
      }
      return true;
    }
    if (this.stage === 'wait') {
      if (Game.time >= this.t) this.startFrenzy();
      return true;
    }
    if (this.stage === 'frenzy') {
      this.eliteT -= dt;
      if (this.eliteT <= 0) { this.eliteT = CFG.finale.eliteEvery / (Nakal.has(3) ? CFG.nakal.eliteK : 1); this.elite(null); }
      var alive = this.repAlive();
      if (alive) this.repWait = Game.time + CFG.nakal.repGap;
      else if (this.repN < this.reps.length && Game.time >= Math.max(this.t0 + CFG.nakal.repAt[this.repN], this.repWait)) { this.spawnRep(this.reps[this.repN++]); alive = true; }
      if (Game.time >= this.t && !alive && this.repN >= this.reps.length) this.spawnQueen();
      return true;
    }
    return true;
  },

  elite: function (type) {
    var pool = Enemies.flagPool();
    type = type || pool[Math.floor(Math.random() * Math.min(4, pool.length))];
    var p = Game.player, pos = U.ring(p.x, p.y, Enemies.ringMin(), Enemies.ringMax());
    var e = Enemies.summon(type, pos.x, pos.y, true);
    if (e) e.wave = true;
    return e;
  },

  startFrenzy: function () {
    var F = CFG.finale;
    this.stage = 'frenzy';
    var six = Nakal.has(6);
    this.t0 = Game.time;
    this.t = Game.time + (six ? CFG.nakal.frenzy : F.frenzy);
    this.reps = six ? this.repPicks(CFG.nakal.repeats) : [];
    this.repN = 0; this.repWait = 0;
    this.marks.frenzy = Math.round(Game.time);
    if (six) this.marks.rep = [];
    this.freeze();
    this.eliteT = 4;
    Game.stageN++; Game.stageT0 = Game.time; Game.nextBoss = this.t; Game.flags = [];
    var p = Game.player;
    for (var i = 0; i < F.heavies && Enemies.nRoll < Enemies.K.roller.max; i++) {
      var pos = U.ring(p.x, p.y, Enemies.ringMin(), Enemies.ringMax());
      var e = Enemies.summon('roller', pos.x, pos.y);
      if (e) e.wave = true;
    }
    FX.shake(14);
    Snd.play('frenzy');
    UI.banner(I18N.t('frenzyKind'), I18N.t('frenzyName'));
  },

  queenPicks: function () {
    var kill = Game.player.trKill || {}, T = CFG.finale.tiers, Q = CFG.finale.queenTiers || [1, 1, 3];
    var rest = this.picks(), out = [], ti = 0, i, j;
    for (var ph = 0; ph < 3; ph++) {
      var pool = [];
      for (j = 0; j < Q[ph]; j++, ti++) for (i = 0; T[ti] && i < T[ti].length; i++) if (kill[T[ti][i]] && out.indexOf(T[ti][i]) < 0) pool.push(T[ti][i]);
      out.push(pool.length ? pool[Math.floor(Math.random() * pool.length)] : null);
    }
    for (ph = 0; ph < 3; ph++) {
      if (out[ph]) continue;
      for (i = 0; i < rest.length && out.indexOf(rest[i]) >= 0; i++);
      out[ph] = rest[i] || rest[0];
    }
    return out;
  },

  picks: function () {
    var kill = Game.player.trKill || {}, pool = [], i;
    for (i = 0; i < Bosses.list.length; i++) if (kill[Bosses.list[i].id]) pool.push(Bosses.list[i].id);
    for (i = 0; pool.length < 3 && i < Bosses.list.length; i++) if (pool.indexOf(Bosses.list[i].id) < 0) pool.push(Bosses.list[i].id);
    for (i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = pool[i]; pool[i] = pool[j]; pool[j] = x; }
    return pool.slice(0, 3);
  },

  repPicks: function (n) {
    var pool = this.picks();
    return pool.slice(0, n);
  },
  repAlive: function () {
    var list = Game.enemies;
    for (var i = 0; i < list.length; i++) if (list[i].rep && !list[i].dead) return true;
    return false;
  },
  spawnRep: function (id) {
    var bd = Bosses.byId(id), p = Game.player, N = CFG.nakal;
    var pos = Bosses.spot(p.x, p.y, 520, 640);
    var e = Enemies.spawn('boss', pos.x, pos.y, false);
    e.bd = bd; e.rep = true;
    e.r = bd.r * (View3D.on ? 1.2 : 1);
    e.speed = bd.speed;
    e.dmg *= bd.dmgMul;
    e.hp = e.maxHp = e.maxHp * bd.hpMul * N.repHp;
    e.coins = Math.floor(e.coins * N.repCoin);
    e.anchorX = pos.x; e.anchorY = pos.y;
    e.state = 'sleep'; e.zz = true; e.hunt = false;
    e.lairT = Game.time; e.sleepT = 0; e.riseT = 0; e.farT = 0; e.hk = 1;
    e.baseHp = e.maxHp; e.baseDmg = e.dmg;
    e.ang = e.sleepAng = U.angleTo(pos.x, pos.y, p.x, p.y);
    e.aim = 0; e.charge = 0; e.chargeAng = 0; e.shield = 0; e.beamA = Math.random() * 6.28;
    e.idx = -1;
    e.ph = 0; e.m = {}; e.pyl = [];
    FX.ring(e.x, e.y, 10, 320, bd.trim, 0.9, 6, true);
    Bosses.emit('lair', e);
    Bosses.wake(e, true);
    UI.banner(I18N.t('repKind'), I18N.name(bd));
    this.marks.rep.push(Math.round(Game.time));
    return e;
  },
  repDead: function () { this.marks.rep.push(-Math.round(Game.time)); },

  spawnQueen: function () {
    var Q = CFG.finale.queen, bd = Bosses.queen, p = Game.player;
    this.stage = 'queen';
    this.marks.queen = Math.round(Game.time);
    var pos = Bosses.spot(p.x, p.y, Q.dist, Q.dist + 120);
    var e = Enemies.spawn('boss', pos.x, pos.y, false);
    e.bd = bd;
    e.r = bd.r * (View3D.on ? 1.2 : 1);
    e.speed = bd.speed;
    e.dmg *= Q.dmgMul;
    e.hp = e.maxHp = e.maxHp * Q.hpMul;
    e.coins = Math.floor(e.coins * 3);
    e.anchorX = pos.x; e.anchorY = pos.y;
    e.zz = false; e.state = 'rise'; e.riseT = 2.2; e.hunt = true;
    e.lairT = Game.time; e.sleepT = 0; e.farT = 0; e.hk = 1;
    e.baseHp = e.maxHp; e.baseDmg = e.dmg;
    e.ang = e.sleepAng = U.angleTo(pos.x, pos.y, p.x, p.y);
    e.t1 = 2; e.t2 = 4; e.aim = 0; e.charge = 0; e.chargeAng = 0; e.shield = 0; e.beamA = Math.random() * 6.28;
    e.idx = -1;
    e.ph = 0; e.m = {}; e.pyl = []; e.twin = null;
    e.qs = 0; e.q1 = Bosses.K.queen.first;
    e.qm = this.queenPicks(); e.qph = -1; e.mech = e.qm[0];
    FX.ring(e.x, e.y, 10, 420, bd.trim, 1.1, 8, true);
    FX.burst(e.x, e.y, 40, bd.trim, 320, 0.8, 5);
    FX.shake(16);
    Snd.play('queen');
    UI.banner(I18N.t('queenKind'), I18N.name(bd));
    Bosses.emit('lair', e);
    Bosses.emit('wake', e);
    return e;
  },

  queenPhase: function (e, ph) {
    var first = e.qph < 0;
    e.qph = ph;
    e.mech = e.qm[ph] || e.qm[0];
    var m = Bosses.byId(e.mech);
    e.speed = Math.max(40, m.speed * 1.1);
    e.t1 = U.rand(1.2, 2); e.t2 = U.rand(3, 5);
    e.aim = 0; e.charge = 0; e.shield = 0; e.burst = undefined; e.trail = null; e.beams = 1;
    Bosses.reset(e);
    if (first) return;
    e.q1 = Bosses.K.queen.again;
    FX.ring(e.x, e.y, e.r, e.r + 300, m.trim, 0.8, 7, true);
    FX.burst(e.x, e.y, 30, m.trim, 280, 0.6, 4);
    FX.shake(ph === 3 ? 18 : 12);
    if (ph === 3) { e.q1 = 1.2; FX.ring(e.x, e.y, e.r, e.r + 520, '#ff8a3a', 1.1, 9, true); this.marks.q4 = Math.round(Game.time); }
    Snd.play(ph === 3 ? 'collapse' : 'phase');
    Bosses.open(e, 1.2, 1, 'phase');
  },

  win: function () {
    var d = Save.data;
    this.stage = 'won';
    this.marks.win = Math.round(Game.time);
    Game.won = true;
    Game.score += CFG.score.winBonus;
    Game.scoreParts.win = CFG.score.winBonus;
    d.wins = (d.wins || 0) + 1;
    if (!d.winBest || Game.time < d.winBest) d.winBest = Math.floor(Game.time);
    Game.nakalUp = Nakal.win();
    Save.flush(true);
    FX.shake(18);
    Snd.play('win');
    Game.pendingWin = true;
  },

  cont: function () {
    this.stage = 'endless';
    Game.endless = true;
    this.thaw();
    Game.stageT0 = Game.time;
  },

  goal: function () {
    if (this.stage !== 'wait' && this.stage !== 'frenzy') return null;
    var left = U.time(Math.max(0, Math.ceil(this.t - Game.time)));
    return I18N.t(this.stage === 'wait' ? 'frenzySoon' : 'frenzyLeft', { t: left });
  },

  words: function () {
    var W = {
      ru: { repKind: 'Повтор', frenzyKind: 'Финал', frenzyName: 'ЖАРИШКА', frenzySoon: 'ЖАРИШКА через {t}', frenzyLeft: 'ЖАРИШКА · держись {t}',
        queenKind: 'Финал', winTitle: 'ПОБЕДА', winSub: 'Королева лома повержена', winNext: 'Дальше', winTake: 'Забрать добычу',
        winsN: 'Побед: {n}', breakWin: 'Победа', winLootX: 'лом x2', overWon: 'Рейд окончен' },
      en: { repKind: 'Rematch', frenzyKind: 'Finale', frenzyName: 'SCORCHER', frenzySoon: 'SCORCHER in {t}', frenzyLeft: 'SCORCHER · hold on {t}',
        queenKind: 'Finale', winTitle: 'VICTORY', winSub: 'The Scrap Queen has fallen', winNext: 'Keep going', winTake: 'Take the loot',
        winsN: 'Wins: {n}', breakWin: 'Victory', winLootX: 'scrap x2', overWon: 'Raid over' },
      tr: { repKind: 'Rövanş', frenzyKind: 'Final', frenzyName: 'KAVURUCU', frenzySoon: 'KAVURUCU {t} sonra', frenzyLeft: 'KAVURUCU · dayan {t}',
        queenKind: 'Final', winTitle: 'ZAFER', winSub: 'Hurda Kraliçesi düştü', winNext: 'Devam et', winTake: 'Ganimeti al',
        winsN: 'Zafer: {n}', breakWin: 'Zafer', winLootX: 'hurda x2', overWon: 'Baskın bitti' },
      de: { repKind: 'Revanche', frenzyKind: 'Finale', frenzyName: 'GLUTHITZE', frenzySoon: 'GLUTHITZE in {t}', frenzyLeft: 'GLUTHITZE · halte durch {t}',
        queenKind: 'Finale', winTitle: 'SIEG', winSub: 'Die Schrottkönigin ist gefallen', winNext: 'Weiter', winTake: 'Beute nehmen',
        winsN: 'Siege: {n}', breakWin: 'Sieg', winLootX: 'Schrott x2', overWon: 'Raid vorbei' },
      es: { repKind: 'Revancha', frenzyKind: 'Final', frenzyName: 'INFIERNO', frenzySoon: 'INFIERNO en {t}', frenzyLeft: 'INFIERNO · aguanta {t}',
        queenKind: 'Final', winTitle: 'VICTORIA', winSub: 'La Reina Chatarra ha caído', winNext: 'Seguir', winTake: 'Llevar el botín',
        winsN: 'Victorias: {n}', breakWin: 'Victoria', winLootX: 'chatarra x2', overWon: 'Incursión terminada' },
      pt: { repKind: 'Revanche', frenzyKind: 'Final', frenzyName: 'FORNALHA', frenzySoon: 'FORNALHA em {t}', frenzyLeft: 'FORNALHA · aguente {t}',
        queenKind: 'Final', winTitle: 'VITÓRIA', winSub: 'A Rainha da Sucata caiu', winNext: 'Continuar', winTake: 'Pegar o saque',
        winsN: 'Vitórias: {n}', breakWin: 'Vitória', winLootX: 'sucata x2', overWon: 'Incursão encerrada' }
    };
    for (var l in W) {
      if (!I18N[l]) continue;
      for (var k in W[l]) if (I18N[l][k] === undefined) I18N[l][k] = W[l][k];
    }
  }
};
Finale.words();
Bosses.on('kill', function (e) { if (e.bd === Bosses.queen && !Game.won) Finale.win(); });
