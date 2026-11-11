var Enemies = {
  defs: {
    grunt: { hp: 20, speed: 62, dmg: 9, r: 15, coins: 0.5, xp: 2, body: '#7d5a44', trim: '#c98b5a', from: 0, w: 10 },
    runner: { hp: 15, speed: 118, dmg: 7, r: 12, coins: 0.5, xp: 2, body: '#b8563a', trim: '#ffb07a', from: 15, w: 8 },
    swarm: { hp: 9, speed: 96, dmg: 5, r: 9, coins: 0.35, xp: 1.5, body: '#6e5a7a', trim: '#b79ad6', from: 32, w: 7, pack: 6 },
    spitter: { hp: 30, speed: 52, dmg: 11, r: 14, coins: 1, xp: 4, body: '#5c7a48', trim: '#b6e07a', from: 70, w: 3.5, ranged: true, keep: 250 },
    brute: { hp: 120, speed: 44, dmg: 18, r: 24, coins: 2, xp: 9, body: '#33505e', trim: '#e2a05c', from: 100, w: 4, heavy: true },
    charger: { hp: 55, speed: 60, dmg: 22, r: 18, coins: 1.2, xp: 5, body: '#8a4030', trim: '#ffc27a', from: 150, w: 4, charger: true, fromBoss: 1, ru: 'Таран', en: 'Rammer' },
    shellback: { hp: 260, speed: 34, dmg: 24, r: 27, coins: 3, xp: 12, body: '#2c4a44', trim: '#8fe0c8', from: 200, w: 3, heavy: true, armor: 0.45, fromBoss: 2, ru: 'Панцирь', en: 'Shellback' },
    splitter: { hp: 90, speed: 70, dmg: 14, r: 20, coins: 1.5, xp: 6, body: '#6a4a7a', trim: '#d0a6ff', from: 240, w: 3.5, split: true, fromBoss: 3, ru: 'Делитель', en: 'Splitter' },
    nest: { hp: 420, speed: 0, dmg: 0, r: 30, coins: 6, xp: 26, body: '#2f5a3a', trim: '#9ff2a8', from: 300, w: 2.5, nest: true, fromBoss: 4, ru: 'Гнездо', en: 'Nest' },
    boss: { hp: 1400, speed: 38, dmg: 26, r: 46, coins: 70, xp: 60, body: '#2f3f4a', trim: '#f0a24a', w: 0 }
  },

  cap: function () {
    var m = Game.time / 60;
    return Math.min(CFG.scale.capHard, Math.floor(CFG.scale.capBase + CFG.scale.capPerMin * m));
  },

  cycleMult: function () { return 1 + 0.4 * Math.floor(Game.bossIndex / Bosses.list.length); },
  hpMult: function () {
    return (1 + CFG.scale.hpPerMin * (Game.time / 60)) * Save.mult().enemyHp * this.cycleMult();
  },
  dmgMult: function () { return (1 + CFG.scale.dmgPerMin * (Game.time / 60)) * this.cycleMult(); },
  speedMult: function () { return Math.min(1.6, 1 + CFG.scale.speedPerMin * (Game.time / 60)); },

  pickType: function () {
    var pool = [];
    for (var k in this.defs) {
      var d = this.defs[k];
      if (k === 'boss' || Game.time < d.from) continue;
      if (d.fromBoss && Game.bossIndex < d.fromBoss) continue;
      var w = d.w;
      if (k === 'grunt' && Game.time > 120) w *= 0.5;
      pool.push({ w: w, k: k });
    }
    if (!pool.length) return 'grunt';
    return U.weighted(pool).k;
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
      slowT: 0, flash: 0, elite: !!elite,
      coins: d.coins, xp: d.xp,
      phase: Math.random() * 6.28, burstCd: 4, summonCd: 8, boss: type === 'boss',
      stuckT: 0, aggro: false, wave: false, flagLoot: false, orbCd: 0, areaCd: 0
    };
    if (elite) {
      e.hp *= 3.2; e.maxHp = e.hp;
      e.dmg *= 1.5; e.coins *= 4; e.xp *= 3;
      e.r *= 1.2; e.speed *= 0.92;
    }
    if (type === 'boss') {
      var lvl = Math.floor(Game.time / CFG.boss.every);
      e.hp *= 1 + lvl * 0.55; e.maxHp = e.hp;
      e.coins = Math.floor(e.coins * (1 + lvl * 0.4));
    }
    Game.enemies.push(e);
    return e;
  },

  summon: function (type, x, y) {
    var list = Game.enemies;
    if (list.length < CFG.scale.capHard) return this.spawn(type, x, y, false);
    var p = Game.player, far = Game.viewRadius() * 1.05, best = null, bd = far * far;
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o.dead || o.boss || o.elite || o.wave || o.def.nest) continue;
      var dx = o.x - p.x, dy = o.y - p.y, d2 = dx * dx + dy * dy;
      if (d2 > bd) { bd = d2; best = o; }
    }
    if (!best) return null;
    best.dead = true;
    return this.spawn(type, x, y, false, true);
  },

  ringMin: function () { return Math.max(CFG.spawn.distMin, Game.viewRadius() + 60); },
  ringMax: function () { return this.ringMin() + (CFG.spawn.distMax - CFG.spawn.distMin); },

  spawnAround: function (type, elite) {
    var p = U.ring(Game.player.x, Game.player.y, this.ringMin(), this.ringMax());
    return this.spawn(type, p.x, p.y, elite);
  },

  director: function (dt) {
    Game.spawnT -= dt;
    if (Game.time >= Game.nextBoss && Game.bossCount() < 1) {
      Game.nextBoss = Game.time + CFG.boss.every;
      var b = this.spawnBoss(Game.bossIndex++);
      FX.ring(b.x, b.y, 10, 240, b.bd.trim, 0.9, 4);
      Snd.play('boss');
      UI.bossBanner(I18N.name(b.bd), true);
      this.announceUnlock();
    }
    this.flagTick();
    if (Game.spawnT > 0) return;

    var min = this.spawnMin();
    var rate = Math.max(CFG.spawn.minInterval, CFG.spawn.interval / (1 + CFG.scale.spawnPerMin * min));
    Game.spawnT = rate;
    if (Game.enemies.length >= this.cap()) return;

    var batch = Math.min(CFG.spawn.batchMax, 1 + Math.floor(min * CFG.spawn.batchPerMin));
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
      f.done = true;
      if (Game.time - f.at < 3) this.flagWave(f);
    }
  },

  flagPool: function () {
    var out = [], defs = this.defs;
    for (var k in defs) {
      var d = defs[k];
      if (k === 'boss' || d.nest || Game.time < d.from) continue;
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
      e = this.spawn(i < swarm ? 'swarm' : this.pickType(), bx + U.rand(-110, 110), by + U.rand(-110, 110), false);
      if (e) e.wave = true;
    }
    Snd.play('wave');
    UI.banner(I18N.t('waveKind'), I18N.t(name));
  },

  spawnGroup: function (min) {
    var type = this.pickType();
    var elite = Game.time > CFG.elite.after && U.chance(CFG.elite.chance);
    var def = this.defs[type];
    var packChance = Math.min(0.6, CFG.spawn.packChance + min * 0.05);

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

  update: function (dt) {
    var p = Game.player, list = Game.enemies, grid = Game.grid;
    grid.clear();
    for (var i = 0; i < list.length; i++) grid.insert(list[i]);
    var lost = this.ringMax() * 1.3, offscreen = Game.viewRadius() * 1.1;

    for (i = list.length - 1; i >= 0; i--) {
      var e = list[i];
      if (e.dead) { list.splice(i, 1); continue; }

      if (e.flash > 0) e.flash -= dt;
      var sp = e.speed;
      if (e.slowT > 0) { e.slowT -= dt; sp *= 0.6; }

      var dx = p.x - e.x, dy = p.y - e.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      e.ang = Math.atan2(dy, dx);
      if (e.elite && !e.aggro && d < 380) { e.aggro = true; Snd.play('aggro'); }

      if (d > lost && !e.boss) {
        var np = U.ring(p.x, p.y, this.ringMin(), this.ringMax());
        e.x = np.x; e.y = np.y;
        continue;
      }
      if (d > offscreen) sp *= 1.3;

      if (e.boss) {
        this.bossAI(e, dt, d);
      } else if (e.def.ranged) {
        var want = e.def.keep;
        var dir = d > want + 40 ? 1 : (d < want - 40 ? -1 : 0);
        e.vx = (dx / d) * sp * dir;
        e.vy = (dy / d) * sp * dir;
        e.shootCd -= dt;
        if (e.shootCd <= 0 && d < want + 160) {
          e.shootCd = U.rand(2.2, 3.4);
          Game.spawnEnemyBullet(e.x, e.y, e.ang, 230, e.dmg * 0.8, e.elite ? CFG.col.enemyShot : CFG.col.spit);
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
      var gx1 = Math.floor((e.x + qr) / gc), gy0 = Math.floor((e.y - qr) / gc), gy1 = Math.floor((e.y + qr) / gc);
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

      if (e.def.nest) e.vx = e.vy = 0;
      var wasX = e.x, wasY = e.y;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (!e.boss) {
        World.resolve(e);
        var moved = Math.hypot(e.x - wasX, e.y - wasY);
        var want = Math.hypot(e.vx, e.vy) * dt;
        if (want > 0.01 && moved < want * 0.45) {
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
      if (d < touch && e.atkCd <= 0 && !e.def.ranged) {
        e.atkCd = 0.8;
        p.hurt(e.dmg);
      }
    }
  },

  spawnBoss: function (index) {
    var bd = Bosses.forIndex(index);
    var cycle = Bosses.cycle(index);
    var pos = U.ring(Game.player.x, Game.player.y, this.ringMin() * 1.05, this.ringMax() * 1.15);
    var e = this.spawn('boss', pos.x, pos.y, false);
    e.bd = bd;
    e.r = bd.r * (View3D.on ? 1.2 : 1);
    e.speed = bd.speed * (1 + cycle * 0.12);
    e.dmg *= bd.dmgMul;
    e.hp = e.maxHp = e.maxHp * bd.hpMul * (1 + cycle * 0.8);
    e.coins = Math.floor(e.coins * (1 + cycle * 0.5));
    e.anchorX = pos.x; e.anchorY = pos.y;
    e.state = 'fight';
    e.t1 = U.rand(1.5, 2.5); e.t2 = U.rand(4, 6);
    e.aim = 0; e.charge = 0; e.chargeAng = 0; e.shield = 0; e.beamA = Math.random() * 6.28;
    e.idx = index;
    return e;
  },

  bossAI: function (e, dt, d) {
    var vr = Game.viewRadius();
    if (d > Math.max(CFG.boss.leash, this.ringMax() * 1.15 + 250)) e.state = 'return';
    else if (d < Math.max(CFG.boss.engage, vr + 80)) e.state = 'fight';

    if (e.state === 'return') {
      var da = U.dist(e.x, e.y, e.anchorX, e.anchorY);
      if (da > 30) {
        var a = U.angleTo(e.x, e.y, e.anchorX, e.anchorY);
        e.vx = Math.cos(a) * e.speed * 1.6;
        e.vy = Math.sin(a) * e.speed * 1.6;
      } else {
        e.vx = e.vy = 0;
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * CFG.boss.regen * dt);
      }
      e.aim = 0; e.charge = 0;
      return;
    }
    e.bd.ai(e, dt, d);
  },

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
    if (e.shield > 0) amount *= 0.45;
    if (e.def.armor) amount *= 1 - e.def.armor;
    e.hp -= amount;
    e.flash = 0.08;
    if (knock && !e.def.heavy && !e.boss && !e.def.nest) {
      var a = U.angleTo(srcX, srcY, e.x, e.y);
      e.x += Math.cos(a) * knock;
      e.y += Math.sin(a) * knock;
    }
    if (crit || e.boss || e.elite || e.def.heavy) {
      FX.text(e.x + U.rand(-6, 6), e.y - e.r - 4, Math.round(amount), crit ? '#ffd27d' : '#ffffff', crit ? 17 : 13);
    }
    if (e.hp <= 0) this.kill(e);
    else Snd.play('hit');
  },

  kill: function (e) {
    e.dead = true;
    var mult = Save.mult().loot * Game.player.char.loot;
    var coins = e.coins * mult;
    Game.runCoins += coins;
    Game.kills++;
    Game.score += CFG.score.perKill + (e.boss ? CFG.score.bossBonus : 0) + (e.elite ? 40 : 0);
    Game.scoreParts.kills += CFG.score.perKill + (e.elite ? 40 : 0);
    if (e.boss) { Game.scoreParts.bosses += CFG.score.bossBonus; Game.bossKills++; }

    var pl = Game.player;
    pl.killCount++;
    if (pl.st.siphon > 0 && pl.killCount % 20 === 0) pl.heal(pl.st.maxHp * 0.03 * pl.st.siphon);
    if (pl.st.spore > 0 && (e.elite || e.boss)) {
      Game.spawnCloud(e.x, e.y, 120 + pl.st.spore * 40, 14 * pl.st.spore * pl.st.dmg);
    }
    Game.spawnGem(e.x, e.y, e.xp);
    if (e.flagLoot) World.drop(e.x, e.y, U.pick(['rage', 'haste', 'shield', 'heal']));
    if (U.chance(Game.player.st.vamp)) Game.spawnHeal(e.x, e.y);

    if (e.def.split && !e.splitChild) {
      for (var s = 0; s < 3; s++) {
        var sa = Math.random() * 6.28;
        var kid = this.spawn('swarm', e.x + Math.cos(sa) * 26, e.y + Math.sin(sa) * 26, false);
        if (kid) kid.splitChild = true;
      }
    }
    FX.burst(e.x, e.y, e.boss ? 40 : (e.elite ? 18 : 8), e.def.trim, e.boss ? 320 : 180, 0.55, e.boss ? 5 : 3);
    if (e.boss) {
      FX.ring(e.x, e.y, 20, 300, e.bd ? e.bd.trim : '#f0a24a', 0.7, 5);
      FX.blast(e.x, e.y, e.r * 3, '#ffb35c');
      FX.shake(14);
      Snd.play('boom');
      if (e.bd) {
        Save.data.bosses[e.bd.id] = (Save.data.bosses[e.bd.id] || 0) + 1;
        Save.flush(true);
        UI.bossBanner(I18N.name(e.bd), false);
      }
      Game.nextBoss = Game.time + U.clamp(Game.nextBoss - Game.time, CFG.boss.grace, CFG.boss.graceMax);
      Enemies.newStage();
      Player.grantLevel(Game.player);
      var restored = false;
      if (Game.reviveLeft < CFG.ads.revivePerRun) {
        Game.reviveLeft = CFG.ads.revivePerRun;
        restored = true;
      }
      UI.toast(I18N.t(restored ? 'bossRewardBack' : 'bossReward'));
      PF.happyMoment();
    } else {
      Snd.play('kill');
      if (e.elite) FX.ring(e.x, e.y, 10, 90, '#a24bd6', 0.4, 3);
    }
  },

  draw: function (ctx) {
    var list = Game.enemies;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      var d = e.def;
      if (e.boss && e.bd) { Bosses.draw(ctx, e); this.drawHpBar(ctx, e); continue; }

      if (e.elite) GlowCache.draw(ctx, 'rgba(162,75,214,.35)', e.x, e.y, e.r * 2.1, 1);
      if (e.boss) GlowCache.draw(ctx, 'rgba(240,162,74,.3)', e.x, e.y, e.r * 2.3, 1);

      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.ang);

      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(0, e.r * 0.3, e.r * 0.95, e.r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = e.flash > 0 ? '#ffffff' : (e.elite ? '#8b4bd6' : d.body);
      ctx.strokeStyle = d.trim;
      ctx.lineWidth = e.boss ? 3 : 2;
      ctx.beginPath();
      if (e.type === 'runner' || e.type === 'charger') {
        ctx.moveTo(e.r, 0);
        ctx.lineTo(-e.r * 0.8, -e.r * 0.7);
        ctx.lineTo(-e.r * 0.4, 0);
        ctx.lineTo(-e.r * 0.8, e.r * 0.7);
        ctx.closePath();
      } else if (e.type === 'brute' || e.boss) {
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
      } else if (e.type === 'spitter' || e.type === 'shellback') {
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

      ctx.fillStyle = e.elite ? '#ffd27d' : d.trim;
      ctx.beginPath();
      ctx.arc(e.r * 0.35, 0, e.r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (e.aim > 0) {
        ctx.strokeStyle = e.def.trim;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + Math.cos(e.ang) * 260, e.y + Math.sin(e.ang) * 260);
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
  }
};
