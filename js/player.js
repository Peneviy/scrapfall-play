var Player = {

  create: function (charId, gunId, skinId) {
    var ch = Content.char(charId), gun = Content.gun(gunId), m = Save.mult();
    var p = {
      x: 0, y: 0, vx: 0, vy: 0,
      r: CFG.player.radius,
      ang: 0,
      char: ch, gun: gun, skin: skinId,
      skills: {},
      level: 1, xp: 0, xpNeed: 0,
      fireCd: 0, frzT: 0, dashT: 0, dashCdT: 0, inv: 0, slowT: 0, novaCd: 6, burnCd: 0, killCount: 0,
      muteT: 0, hook: null,
      fireT: 0, fireD: 0, fireTk: 0,
      orbA: 0, turretCd: 6, fragN: 0,
      evo: {}, evoN: 0, gunN: 0, sporeCd: 3,
      orbR: 62, millT: 3, millK: 0,
      stormCd: 4,
      tideT: -1, tideR: 0,
      tethers: [],
      trail: [], trailT: 0,
      discCd: 1, rocketCd: 1.5, domeCd: 3, domeT: 0, domeR: 0,
      ramN: 0, ramOn: false, ramHit: null, ramSnd: false, dashQ: 0, dashQT: 0, dashGapT: 0,
      tr: {}, trN: 0, trKill: {}, trs: null,
      alive: true,
      st: {
        dmg: ch.dmg * m.dmg,
        rate: (1 / ch.rate) * m.cd,
        speed: CFG.player.speed * ch.speed * m.spd,
        maxHp: Math.round(CFG.player.hp * ch.hp * m.hp),
        regen: CFG.player.regen,
        pickup: CFG.player.pickup * ch.pickup,
        xp: m.xp,
        count: 0, spread: 0, pierce: 0, splash: 0, ricochet: 0, chain: 0,
        crit: 0.05, arcs: 0, orbit: 0, turret: 0, frost: 0, thorns: 0, vamp: 0,
        nova: 0, tether: 0, spore: 0, siphon: 0, burn: 0, turretLife: 0, grab: 0,
        dashCd: CFG.player.dashCd, armor: ch.armor,
        radius: m.radius, tech: m.tech
      },
      buffs: { rage: 0, haste: 0, shield: 0 },
      healK: Nakal.healK(),
      heal: function (n) { this.hp = Math.min(this.st.maxHp, this.hp + n * this.healK); },
      hurt: function (n, dot) { Player.hurt(this, n, dot); }
    };
    p.hp = p.st.maxHp;
    p.xpNeed = Player.xpFor(1);
    if (ch.turret) p.st.turret = 1;

    var boost = Nakal.tier() * CFG.nakal.startLevel;
    for (var i = 0; i < boost; i++) {
      var cards = Skills.roll(p, 1);
      if (cards.length) Player.take(p, cards[0]);
      p.level++;
      p.xpNeed = Player.xpFor(p.level);
    }
    return p;
  },

  xpFor: function (level) {
    var x = CFG.xp, s = x.soft, lt = x.late;
    if (lt && level > lt.from) return Math.round(this.xpFor(lt.from) * Math.pow(lt.growth, level - lt.from));
    if (s && level > s.from) return Math.round(this.xpFor(s.from) * Math.pow(s.growth, level - s.from));
    return Math.round(x.base * Math.pow(x.growth, level - 1) + x.flat * level);
  },

  take: function (p, skill) {
    p.skills[skill.id] = (p.skills[skill.id] || 0) + 1;
    skill.apply(p, p.skills[skill.id]);
  },

  grantLevel: function (p) {
    p.level++;
    PF.reportLevel(p.level);
    p.xpNeed = this.xpFor(p.level);
    Game.score += CFG.score.perLvl;
    Game.scoreParts.levels += CFG.score.perLvl;
    Game.pendingLevels++;
  },

  addXp: function (p, n) {
    p.xp += n * p.st.xp;
    while (p.xp >= p.xpNeed) {
      p.xp -= p.xpNeed;
      p.level++;
      PF.reportLevel(p.level);
      p.xpNeed = this.xpFor(p.level);
      Game.score += CFG.score.perLvl;
    Game.scoreParts.levels += CFG.score.perLvl;
      Game.pendingLevels++;
    }
  },

  hurt: function (p, dmg, dot) {
    if (dot) {
      if (!p.alive || p.dashT > 0) return;
      p.hp -= dmg * (1 - p.st.armor);
      if (p.hp <= 0) { p.hp = 0; p.alive = false; Game.onDeath(); }
      return;
    }
    if (!p.alive || p.inv > 0 || p.dashT > 0) return;
    if (p.buffs.shield > 0) {
      p.buffs.shield--;
      p.inv = CFG.player.iframes;
      FX.ring(p.x, p.y, p.r, p.r + 40, CFG.col.tech, 0.3, 3);
      Snd.play('dash');
      return;
    }
    dmg = dmg * (1 - p.st.armor);
    p.hp -= dmg;
    p.inv = CFG.player.iframes;
    FX.shake(6 + Math.min(10, dmg * 0.2));
    FX.burst(p.x, p.y, 8, '#e2503a', 160, 0.4, 3);
    Snd.play('hurt');

    if (p.st.thorns > 0) {
      var rad = (120 + p.st.thorns * 50) * p.st.radius;
      FX.ring(p.x, p.y, 10, rad, '#f0a24a', 0.35, 4);
      var near = [];
      Game.grid.query(p.x, p.y, rad, near);
      for (var i = 0; i < near.length; i++) {
        var e = near[i];
        if (e.dead) continue;
        if (U.dist2(p.x, p.y, e.x, e.y) < rad * rad) {
          Enemies.damage(e, 18 * p.st.thorns * p.st.dmg, false, p.x, p.y, 34);
        }
      }
    }

    if (p.hp <= 0) {
      p.hp = 0;
      p.alive = false;
      Game.onDeath();
    }
  },

  update: function (p, dt) {
    if (!p.alive) return;

    if (p.inv > 0) p.inv -= dt;
    if (p.dashCdT > 0) p.dashCdT -= dt;
    if (p.dashGapT > 0) p.dashGapT -= dt;
    if (p.dashCdT <= 0 && p.dashQ < Spells.dashMax(p) - 1 && (p.dashQT -= dt) <= 0) { p.dashQ++; p.dashQT = Spells.dashCd(p); }
    if (p.slowT > 0) p.slowT -= dt;
    if (p.buffs.rage > 0) p.buffs.rage -= dt;
    if (p.buffs.haste > 0) p.buffs.haste -= dt;
    if (p.st.regen > 0) p.heal(p.st.regen * dt);
    if (p.fireT > 0) {
      p.fireT -= dt;
      if ((p.fireTk -= dt) <= 0) {
        p.fireTk = 0.25;
        FX.burst(p.x, p.y, 3, '#ff9a3a', 90, 0.4, 3);
        p.hurt(p.fireD * 0.25, true);
        if (!p.alive) return;
      }
    }

    var mv = Input.move;
    if (p.frzT > 0) { p.frzT -= dt; mv = Bosses.still; Input.takeDash(); }
    var mute = p.muteT > 0, hooked = !!p.hook && p.frzT <= 0;
    if (mute && (p.muteT -= dt) <= 0) Snd.play('unmute');
    if (p.dashT > 0) {
      p.dashT -= dt;
      p.x += Math.cos(p.dashAng) * CFG.player.dashSpeed * dt;
      p.y += Math.sin(p.dashAng) * CFG.player.dashSpeed * dt;
      World.resolve(p);
      World.touchCrates(p);
      if (!Save.data.set.low) FX.burst(p.x, p.y, 2, Content.skin(p.skin).trail, 40, 0.3, 3);
    } else {
      var spd = p.st.speed * (p.slowT > 0 ? 0.55 : 1);
      if (!hooked) {
        p.x += mv.x * spd * dt;
        p.y += mv.y * spd * dt;
      }
      World.resolve(p);
      World.touchCrates(p);
      var dashOk = p.dashCdT <= 0 || (p.dashQ > 0 && p.dashGapT <= 0);
      if (p.frzT <= 0 && !mute && Input.takeDash() && dashOk && (mv.x || mv.y)) {
        if (hooked) Enemies.unhook(p);
        p.dashT = CFG.player.dashTime;
        if (p.dashCdT <= 0) { p.dashCdT = Spells.dashCd(p); p.dashQT = Spells.dashCd(p); }
        else p.dashQ--;
        p.dashGapT = CFG.player.dashTime + Spells.N.ram.gap;
        p.dashAng = Math.atan2(mv.y, mv.x);
        Snd.play('dash');
        FX.ring(p.x, p.y, 8, 50, Content.skin(p.skin).trail, 0.25, 2);
      } else {
        Input.takeDash();
      }
    }

    if (p.st.frost > 0) {
      var fr = (140 + p.st.frost * 60) * p.st.radius;
      var near = [];
      Game.grid.query(p.x, p.y, fr, near);
      for (var i = 0; i < near.length; i++) {
        if (U.dist2(p.x, p.y, near[i].x, near[i].y) < fr * fr) near[i].slowT = 0.2;
      }
    }

    var manual = Save.data.set.aim === 'mouse' && !Input.touch;
    var target = Game.nearestEnemy(p.x, p.y, p.gun.range + 120);
    p.target = target;
    if (manual) {
      var m = Input.worldMouse();
      p.ang = U.turn(p.ang, U.angleTo(p.x, p.y, m.x, m.y), 20 * dt);
    } else if (target) {
      p.ang = U.turn(p.ang, U.angleTo(p.x, p.y, target.x, target.y), 12 * dt);
    } else if (mv.x || mv.y) {
      p.ang = U.turn(p.ang, Math.atan2(mv.y, mv.x), 10 * dt);
    }

    p.fireCd -= dt;
    if ((manual || target) && p.fireCd <= 0) {
      p.fireCd = p.gun.cd * p.st.rate * (p.buffs.haste > 0 ? 0.7 : 1);
      this.shoot(p, p.ang);
    }

    if (p.st.orbit > 0) {
      var om = 1;
      if (p.evo.orbit) {
        if (p.millK > 0) {
          p.millK += dt / 1.2;
          if (p.millK >= 1) { p.millK = 0; p.millT = 3; }
        } else if ((p.millT -= dt) <= 0) p.millK = 0.001;
        if (p.millK > 0) om = 2;
      }
      p.orbR = 62 + (p.millK > 0 ? 158 * Math.sin(Math.PI * p.millK) : 0);
      p.orbA += dt * (om > 1 ? 4.2 : 2.6);
      var rad = p.orbR, orr = om > 1 ? 24 : 18;
      for (var k = 0; k < p.st.orbit; k++) {
        var a = p.orbA + k / p.st.orbit * Math.PI * 2;
        var ox = p.x + Math.cos(a) * rad, oy = p.y + Math.sin(a) * rad;
        var hits = [];
        Game.grid.query(ox, oy, orr, hits);
        for (var j = 0; j < hits.length; j++) {
          var e = hits[j];
          if (e.dead || (e.orbCd || 0) > Game.time) continue;
          if (U.dist2(ox, oy, e.x, e.y) < (orr + e.r) * (orr + e.r)) {
            e.orbCd = Game.time + 0.45;
            Enemies.damage(e, 14 * om * p.st.dmg * p.st.tech, false, p.x, p.y, 16);
          }
        }
        World.damageArea(ox, oy, orr, 14 * om * p.st.dmg * p.st.tech, 0.45);
      }
    }

    if (p.st.nova > 0) {
      if (!mute) p.novaCd -= dt;
      if (mute) {
      } else if (p.novaCd <= 0 && p.evo.nova) {
        p.novaCd = 6;
        p.tideT = 0; p.tideR = 0;
      } else if (p.novaCd <= 0) {
        p.novaCd = 6;
        var nr = (180 + p.st.nova * 70) * p.st.radius;
        FX.ring(p.x, p.y, 20, nr, CFG.col.ally, 0.5, 5);
        var hit = [];
        Game.grid.query(p.x, p.y, nr, hit);
        for (var n = 0; n < hit.length; n++) {
          if (hit[n].dead) continue;
          if (U.dist2(p.x, p.y, hit[n].x, hit[n].y) < nr * nr) {
            Enemies.damage(hit[n], 34 * p.st.nova * p.st.dmg * p.st.tech, false, p.x, p.y, 40);
          }
        }
        World.damageArea(p.x, p.y, nr, 34 * p.st.nova * p.st.dmg * p.st.tech);
      }
      if (p.tideT >= 0) this.tide(p, dt);
    }

    if (!mute && p.evo.chain && p.st.chain > 0 && (p.stormCd -= dt) <= 0) {
      p.stormCd = 4;
      this.storm(p);
    }

    if (!mute && p.st.spore > 0 && (p.sporeCd -= dt) <= 0) {
      p.sporeCd = 5;
      this.spores(p);
    }

    if (p.st.burn > 0 && !mute) {
      if (p.evo.burn) this.exhaust(p, dt);
      p.burnCd -= dt;
      if (p.burnCd <= 0) {
        p.burnCd = 0.5;
        var br = (130 + p.st.burn * 45) * p.st.radius;
        var bh = [];
        Game.grid.query(p.x, p.y, br, bh);
        for (var q = 0; q < bh.length; q++) {
          if (bh[q].dead) continue;
          if (U.dist2(p.x, p.y, bh[q].x, bh[q].y) < br * br) {
            Enemies.damage(bh[q], 11 * p.st.burn * p.st.dmg * p.st.tech, false, p.x, p.y, 0);
          }
        }
        FX.ring(p.x, p.y, br * 0.75, br, '#ff7a5c', 0.3, 2);
        World.damageArea(p.x, p.y, br, 11 * p.st.burn * p.st.dmg * p.st.tech);
        if (p.evo.burn) this.burnTrail(p);
      }
    }

    p.tetherTarget = null;
    if (mute) {
    } else if (p.st.tether > 0 && p.evo.tether) this.web(p, dt);
    else if (p.st.tether > 0) {
      var tg = Game.nearestEnemy(p.x, p.y, 240 + p.st.tether * 40);
      if (tg) {
        p.tetherTarget = tg;
        tg.slowT = 0.3;
        Enemies.damage(tg, 26 * p.st.tether * p.st.dmg * p.st.tech * dt, false, p.x, p.y, 0);
      }
    }

    if (p.st.turret > 0 && !mute) {
      p.turretCd -= dt;
      var bat = p.evo.turret ? 2 : 1;
      if (p.turretCd <= 0 && Game.turrets.length < (p.st.turret + 1) * bat) {
        p.turretCd = 12;
        for (var ti = 0; ti < bat; ti++) {
          var tx = bat > 1 ? (ti ? 34 : -34) : 0;
          Game.turrets.push({
            x: p.x + tx + U.rand(-30, 30), y: p.y + U.rand(-30, 30),
            life: ((p.char.turret ? 30 : 15) + p.st.turretLife) * bat, cd: ti * 0.35, ang: 0, rk: bat > 1
          });
        }
        FX.ring(p.x, p.y, 6, 40, CFG.col.tech, 0.3, 2);
      }
    }
  },

  shoot: function (p, ang) {
    var angles = [{ a: ang, k: 1 }];
    if (p.st.arcs >= 1) angles.push({ a: ang + Math.PI, k: CFG.aim.arcDamage });
    if (p.st.arcs >= 2) {
      angles.push({ a: ang + Math.PI / 2, k: CFG.aim.arcDamage });
      angles.push({ a: ang - Math.PI / 2, k: CFG.aim.arcDamage });
    }

    var count = p.gun.count + p.st.count;
    var fan = (p.gun.spread + p.st.spread) * Math.min(1, (count - 1) / 3);
    var frag = -1;
    if (p.st.splash > 0 && ++p.fragN >= CFG.frag.every) { p.fragN = 0; frag = count >> 1; }
    var g = p.gun.id, dbl = g === 'pistol' && p.evo.pistol, n = p.evo[g] ? ++p.gunN : 0;
    var thru = dbl && n % 4 === 0;
    for (var a = 0; a < angles.length; a++) {
      for (var i = 0; i < count; i++) {
        var off = count < 3 ? 0 : (i / (count - 1) - 0.5) * fan * 2;
        var side = count === 2 ? (i ? 5 : -5) : 0;
        var ba = angles[a].a + off + U.rand(-0.02, 0.02);
        if (dbl && a === 0) {
          var b1 = this.bullet(p, ba, angles[a].k, side - 6, a === 0 && i === frag);
          var b2 = this.bullet(p, ba, angles[a].k, side + 6, false);
          if (thru) { b1.pierce = b2.pierce = 99; b1.r = b2.r = p.gun.size + 1.5; }
        } else this.bullet(p, ba, angles[a].k, side, a === 0 && i === frag);
      }
    }
    if (g === 'scatter' && p.evo.scatter && n % 3 === 0) {
      for (var q = 0; q < 16; q++) this.bullet(p, ang + q / 16 * Math.PI * 2 + 0.1, 1, 0, false);
    }
    FX.spray(p.x + Math.cos(ang) * 18, p.y + Math.sin(ang) * 18, ang, 3, '#ffd27d', 160);
    Snd.play(p.gun.sfx);
  },

  bullet: function (p, ang, power, side, frag) {
    var crit = U.chance(p.st.crit);
    var dmg = p.gun.dmg * p.st.dmg * (crit ? 2 : 1) * (power === undefined ? 1 : power);
    if (p.buffs.rage > 0) dmg *= 1.5;
    var t = p.target;
    var close = t && !t.dead && U.dist2(p.x, p.y, t.x, t.y) < (p.r + t.r) * (p.r + t.r);
    var off = close ? 0 : 16;
    side = side || 0;
    var g = p.gun.id, ev = p.evo[g];
    var b = {
      dead: false, fresh: !!close,
      x: p.x + Math.cos(ang) * off - Math.sin(ang) * side, y: p.y + Math.sin(ang) * off + Math.cos(ang) * side,
      vx: Math.cos(ang) * p.gun.speed, vy: Math.sin(ang) * p.gun.speed,
      r: p.gun.size, dmg: dmg, crit: crit, c: CFG.col.ally,
      pierce: ev && g === 'rail' ? 999 : p.gun.pierce + p.st.pierce,
      splash: (p.gun.splash || 0) * p.st.radius,
      frag: frag ? (CFG.frag.r0 + CFG.frag.rPer * p.st.splash) * p.st.radius : 0,
      ricochet: p.st.ricochet + (ev && g === 'smg' ? 1 : 0), chain: p.st.chain,
      life: p.gun.range / p.gun.speed,
      hits: [],
      rail: null, cluster: ev && g === 'flak'
    };
    if (ev && g === 'rail' && Game.rails.length < 12) {
      b.rail = { x1: b.x, y1: b.y, x2: b.x, y2: b.y, life: 1.3, tick: 0.1, dmg: dmg * 0.25 };
      Game.rails.push(b.rail);
    }
    Game.bullets.push(b);
    return b;
  },

  updateBullets: function (dt) {
    var list = Game.bullets, near = [];
    for (var i = list.length - 1; i >= 0; i--) {
      var b = list[i];
      if (b.dead) { list.splice(i, 1); continue; }
      b.life -= dt;
      if (b.life <= 0) { list.splice(i, 1); continue; }
      if (b.fresh) b.fresh = false;
      else { b.x += b.vx * dt; b.y += b.vy * dt; }
      if (b.rail) { b.rail.x2 = b.x; b.rail.y2 = b.y; }

      if (World.blocked(b.x, b.y)) {
        FX.spray(b.x, b.y, Math.atan2(-b.vy, -b.vx), 3, '#9ec7d6', 120);
        list.splice(i, 1);
        continue;
      }
      var cr = World.crates, hitCrate = false;
      for (var q = 0; q < cr.length; q++) {
        var rc = cr[q].r + b.r;
        if (U.dist2(b.x, b.y, cr[q].x, cr[q].y) < rc * rc) {
          World.hitCrate(cr[q], b.dmg);
          hitCrate = true;
          break;
        }
      }
      if (hitCrate) { list.splice(i, 1); continue; }
      if (Enemies.locks.length && Enemies.ropeBlock(b.x - b.vx * dt, b.y - b.vy * dt, b.x, b.y)) {
        Enemies.ropeHit(Math.atan2(-b.vy, -b.vx));
        list.splice(i, 1);
        continue;
      }

      Game.grid.query(b.x, b.y, b.r + 30, near);
      for (var j = 0; j < near.length; j++) {
        var e = near[j];
        if (e.dead || b.hits.indexOf(e) >= 0) continue;
        var rr = e.r + b.r;
        if (U.dist2(b.x, b.y, e.x, e.y) > rr * rr) continue;

        b.hits.push(e);
        var ex = e.x, ey = e.y;
        Enemies.damage(e, b.dmg, b.crit, b.x, b.y, 12);

        if (b.splash > 0) this.blast(ex, ey, b.splash, b.dmg * 0.6);
        if (b.cluster) this.cluster(ex, ey, b.dmg);
        if (b.frag > 0) { this.blast(ex, ey, b.frag, b.dmg * CFG.frag.dmg); b.frag = 0; }
        if (b.chain > 0) this.arc(ex, ey, b.chain, b.dmg * 0.45 * Game.player.st.tech, b.hits);

        if (b.pierce > 0) {
          b.pierce--;
        } else if (b.ricochet > 0) {
          var next = Game.nearestEnemy(b.x, b.y, 260, b.hits);
          if (next) {
            b.ricochet--;
            var a = U.angleTo(b.x, b.y, next.x, next.y);
            var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            b.vx = Math.cos(a) * sp;
            b.vy = Math.sin(a) * sp;
            b.life = Math.max(b.life, 0.5);
          } else {
            b.dead = true;
          }
        } else {
          b.dead = true;
        }
        if (b.dead) break;
      }
      if (b.dead) list.splice(i, 1);
    }
  },

  blast: function (x, y, radius, dmg) {
    if (FX.pop(x, y, radius)) {
      FX.ring(x, y, radius * 0.2, radius * 0.75, '#ffb35c', 0.25, 2, true);
      FX.burst(x, y, 3, '#f0a24a', 180, 0.3, 2.5);
    }
    Snd.play('splash');
    var near = [];
    Game.grid.query(x, y, radius, near);
    for (var i = 0; i < near.length; i++) {
      var e = near[i];
      if (e.dead) continue;
      if (U.dist2(x, y, e.x, e.y) < radius * radius) Enemies.damage(e, dmg, false, x, y, 20);
    }
    World.damageArea(x, y, radius, dmg);
  },

  arc: function (x, y, jumps, dmg, skip) {
    var from = { x: x, y: y };
    for (var n = 0; n < jumps; n++) {
      var e = Game.nearestEnemy(from.x, from.y, 170, skip);
      if (!e) break;
      FX.bolt(from.x, from.y, e.x, e.y, CFG.col.tech);
      Enemies.damage(e, dmg, false, from.x, from.y, 0);
      skip.push(e);
      from = { x: e.x, y: e.y };
    }
  },

  tide: function (p, dt) {
    var out = 0.65, back = 0.8, far = 520 * p.st.radius, near = 120;
    var t0 = p.tideT, r0 = p.tideR, r, i, e, d2;
    var t = p.tideT += dt;
    var dmg = 34 * p.st.nova * p.st.dmg * p.st.tech, list = Game.enemies;
    if (t < out) {
      r = far * t / out;
      for (i = 0; i < list.length; i++) {
        e = list[i];
        if (e.dead || e.zz) continue;
        d2 = U.dist2(p.x, p.y, e.x, e.y);
        if (d2 > r0 * r0 && d2 <= r * r) Enemies.damage(e, dmg, false, p.x, p.y, 0);
      }
    } else if (t < out + back) {
      if (t0 < out) World.damageArea(p.x, p.y, far, dmg);
      r = far - (far - near) * (t - out) / back;
      var top = (r0 + 26) * (r0 + 26);
      for (i = 0; i < list.length; i++) {
        e = list[i];
        if (e.dead || e.zz || e.boss || e.def.nest || e.def.roller || e.cast || e.lk) continue;
        d2 = U.dist2(p.x, p.y, e.x, e.y);
        if (d2 > r * r && d2 <= top) {
          var k = r / Math.sqrt(d2);
          e.x = p.x + (e.x - p.x) * k;
          e.y = p.y + (e.y - p.y) * k;
          e.slowT = 0.4;
        }
      }
    } else {
      r = near;
      p.tideT = -1;
      FX.ring(p.x, p.y, 30, near + 70, CFG.col.ally, 0.35, 5);
      var hit = [];
      Game.grid.query(p.x, p.y, near + 50, hit);
      for (i = 0; i < hit.length; i++) {
        e = hit[i];
        if (e.dead || e.zz) continue;
        if (U.dist2(p.x, p.y, e.x, e.y) < (near + 50) * (near + 50)) Enemies.damage(e, dmg, false, p.x, p.y, 40);
      }
    }
    p.tideR = r;
  },

  storm: function (p) {
    var list = Game.enemies, R2 = 560 * 560, best = [], keys = [], i, j, e;
    for (i = 0; i < list.length; i++) {
      e = list[i];
      if (e.dead || e.zz || e.inv) continue;
      var d2 = U.dist2(p.x, p.y, e.x, e.y);
      if (d2 > R2) continue;
      var key = (e.boss ? 0 : (e.elite ? 1 : 2)) * 1e7 + d2;
      if (best.length < 6) { best.push(e); keys.push(key); j = best.length - 1; }
      else if (key < keys[5]) { best[5] = e; keys[5] = key; j = 5; }
      else continue;
      while (j > 0 && keys[j - 1] > keys[j]) {
        var tk = keys[j]; keys[j] = keys[j - 1]; keys[j - 1] = tk;
        var te = best[j]; best[j] = best[j - 1]; best[j - 1] = te;
        j--;
      }
    }
    if (!best.length) return;
    var dmg = 36 * p.st.chain * p.st.dmg * p.st.tech, near = [];
    for (i = 0; i < best.length; i++) {
      e = best[i];
      var x = e.x, y = e.y;
      FX.strike(x, y);
      Enemies.damage(e, dmg, false, x, y, 0);
      Game.grid.query(x, y, 50, near);
      for (j = 0; j < near.length; j++) {
        var n = near[j];
        if (n === e || n.dead || n.zz) continue;
        if (U.dist2(x, y, n.x, n.y) < 50 * 50) Enemies.damage(n, dmg * 0.5, false, x, y, 10);
      }
      World.damageArea(x, y, 50, dmg * 0.5);
    }
    FX.shake(3);
    Snd.play('splash');
  },

  spores: function (p) {
    var list = Game.enemies, n = list.length, step = Math.max(1, Math.floor(n / 48)), near = [];
    var best = null, bn = -1, tried = 0;
    for (var i = (Math.random() * step) | 0; i < n && tried < 16; i += step) {
      var e = list[i];
      if (e.dead || e.zz || U.dist2(p.x, p.y, e.x, e.y) > 520 * 520) continue;
      tried++;
      Game.grid.query(e.x, e.y, 90, near);
      if (near.length > bn) { bn = near.length; best = e; }
    }
    if (!best) { p.sporeCd = 1; return; }
    Game.spawnCloud(best.x, best.y, (120 + p.st.spore * 40) * p.st.radius, 14 * p.st.spore * p.st.dmg, 7, false);
  },

  epiGens: 7,
  epidemic: function (e) {
    var p = Game.player, cl = Game.clouds;
    if (!p.evo.spore || !p.st.spore || cl.length >= 14) return;
    if (U.dist2(p.x, p.y, e.x, e.y) > 640 * 640) return;
    var par = null;
    for (var i = 0; i < cl.length; i++) {
      var d2 = U.dist2(e.x, e.y, cl[i].x, cl[i].y), r = cl[i].r;
      if (d2 < r * r * 0.36) return;
      if (d2 < r * r && (!par || cl[i].gen < par.gen)) par = cl[i];
    }
    var g = par ? (par.gen || 0) + 1 : 0;
    if (!par || g >= this.epiGens) return;
    Game.spawnCloud(e.x, e.y, par.r * 0.5, par.dmg * 0.5, 4.5, true, g);
  },

  web: function (p, dt) {
    var ts = p.tethers, R = 240 + p.st.tether * 40, i, e;
    for (i = ts.length - 1; i >= 0; i--) {
      e = ts[i];
      if (e.dead || e.zz || e.inv || U.dist2(p.x, p.y, e.x, e.y) > R * R * 1.3) {
        ts.splice(i, 1);
        if (e.dead) {
          var nx = Game.nearestEnemy(e.x, e.y, R, ts);
          if (nx && U.dist2(p.x, p.y, nx.x, nx.y) < R * R) { ts.push(nx); FX.bolt(e.x, e.y, nx.x, nx.y, CFG.col.tech); }
        }
      }
    }
    while (ts.length < 4) {
      e = Game.nearestEnemy(p.x, p.y, R, ts);
      if (!e) break;
      ts.push(e);
    }
    var dmg = 26 * p.st.tether * p.st.dmg * p.st.tech * dt;
    for (i = 0; i < ts.length; i++) {
      ts[i].slowT = 0.3;
      Enemies.damage(ts[i], dmg, false, p.x, p.y, 0);
    }
    p.tetherTarget = ts[0] || null;
  },

  exhaust: function (p, dt) {
    var tr = p.trail;
    while (tr.length && tr[0].t <= Game.time - 3) tr.shift();
    if ((p.trailT -= dt) > 0) return;
    var last = tr[tr.length - 1];
    if (!last || U.dist2(last.x, last.y, p.x, p.y) > 400) { tr.push({ x: p.x, y: p.y, t: Game.time }); p.trailT = 0.1; }
  },

  burnTrail: function (p) {
    var tr = p.trail, seen = this._seen || (this._seen = []), near = this._near || (this._near = []);
    var dmg = 11 * p.st.burn * p.st.dmg * p.st.tech, R = 34;
    seen.length = 0;
    for (var i = 0; i < tr.length; i++) {
      Game.grid.query(tr[i].x, tr[i].y, R, near);
      for (var j = 0; j < near.length; j++) {
        var e = near[j];
        if (e.dead || e.zz || seen.indexOf(e) >= 0) continue;
        if (U.dist2(tr[i].x, tr[i].y, e.x, e.y) < (R + e.r) * (R + e.r)) {
          seen.push(e);
          Enemies.damage(e, dmg, false, tr[i].x, tr[i].y, 0);
        }
      }
    }
  },

  cluster: function (x, y, dmg) {
    var list = Game.bomblets;
    for (var i = 0; i < 3 && list.length < 18; i++) {
      var a = Math.random() * 6.28, sp = U.rand(150, 230);
      list.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0.35, max: 0.35, dmg: dmg * 0.45 });
    }
  },

  updateEvo: function (dt) {
    var i, j, list = Game.rails, en = Game.enemies;
    for (i = list.length - 1; i >= 0; i--) {
      var L = list[i];
      if ((L.life -= dt) <= 0) { list.splice(i, 1); continue; }
      if ((L.tick -= dt) > 0) continue;
      L.tick = 0.2;
      var dx = L.x2 - L.x1, dy = L.y2 - L.y1, len2 = dx * dx + dy * dy || 1;
      for (j = 0; j < en.length; j++) {
        var e = en[j];
        if (e.dead || e.zz) continue;
        var k = U.clamp(((e.x - L.x1) * dx + (e.y - L.y1) * dy) / len2, 0, 1);
        var qx = L.x1 + dx * k - e.x, qy = L.y1 + dy * k - e.y, rr = e.r + 12;
        if (qx * qx + qy * qy < rr * rr) Enemies.damage(e, L.dmg, false, e.x, e.y, 0);
      }
    }
    var bl = Game.bomblets, rad = 44 * Game.player.st.radius;
    for (i = bl.length - 1; i >= 0; i--) {
      var b = bl[i];
      b.x += b.vx * dt; b.y += b.vy * dt;
      if ((b.t -= dt) > 0) continue;
      bl.splice(i, 1);
      this.blast(b.x, b.y, rad, b.dmg);
    }
  },

  updateTurrets: function (dt) {
    var p = Game.player;
    for (var i = Game.turrets.length - 1; i >= 0; i--) {
      var t = Game.turrets[i];
      t.life -= dt;
      if (t.life <= 0) {
        FX.burst(t.x, t.y, 8, CFG.col.tech, 140, 0.4, 3);
        Game.turrets.splice(i, 1);
        continue;
      }
      t.cd -= dt;
      var e = Game.nearestEnemy(t.x, t.y, 420);
      if (!e) continue;
      t.ang = U.angleTo(t.x, t.y, e.x, e.y);
      if (t.cd <= 0) {
        var rk = t.rk, sp = rk ? 430 : 560;
        t.cd = rk ? 0.7 : 0.5;
        Game.bullets.push({
          dead: false, fresh: false,
          x: t.x, y: t.y,
          vx: Math.cos(t.ang) * sp, vy: Math.sin(t.ang) * sp,
          r: rk ? 5 : 3.5, dmg: (rk ? 12 : 9) * p.st.dmg * p.st.tech, crit: false, c: CFG.col.tech,
          pierce: 0, splash: rk ? 60 * p.st.radius : 0, frag: 0, ricochet: 0, chain: 0,
          life: rk ? 1.05 : 0.8, hits: [],
          rail: null, cluster: false
        });
        Snd.play('shot');
      }
    }
  },

  draw: function (ctx, p) {
    var sk = Content.skin(p.skin);

    ctx.globalAlpha = 0.07;
    ctx.strokeStyle = sk.trail;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.st.pickup, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (p.st.frost > 0) {
      var fr = (140 + p.st.frost * 60) * p.st.radius;
      GlowCache.draw(ctx, 'rgba(110,200,255,.10)', p.x, p.y, fr, 1);
    }

    if (p.st.burn > 0) {
      var brr = (130 + p.st.burn * 45) * p.st.radius;
      GlowCache.draw(ctx, 'rgba(255,122,92,.10)', p.x, p.y, brr, 1);
      ctx.strokeStyle = 'rgba(255,122,92,.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, brr, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (p.st.nova > 0) {
      var nr2 = (180 + p.st.nova * 70) * p.st.radius;
      var k = U.clamp(1 - p.novaCd / 6, 0, 1);
      GlowCache.draw(ctx, 'rgba(255,210,125,.13)', p.x, p.y, nr2, 0.25 + k * 0.75);
      ctx.strokeStyle = 'rgba(255,210,125,' + (0.2 + k * 0.5).toFixed(2) + ')';
      ctx.lineWidth = 1 + k * 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, nr2, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (var tq = 0; tq < p.trail.length; tq++) {
      var tp = p.trail[tq], ta = U.clamp(1 - (Game.time - tp.t) / 3, 0, 1);
      GlowCache.draw(ctx, 'rgba(255,122,92,.35)', tp.x, tp.y, 30, ta);
    }

    GlowCache.draw(ctx, 'rgba(255,210,125,.22)', p.x, p.y, p.r * 3.2, 1);
    ctx.strokeStyle = 'rgba(255,255,255,.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 6, 0, Math.PI * 2);
    ctx.stroke();

    if (p.inv > 0 && Math.floor(p.inv * 20) % 2 === 0) ctx.globalAlpha = 0.45;
    Content.drawChar(ctx, p.x, p.y, p.r, p.char.id, p.skin, p.ang, p.dashT > 0);
    ctx.globalAlpha = 1;

    var tl = p.evo.tether ? p.tethers : (p.tetherTarget ? [p.tetherTarget] : null);
    if (tl && tl.length) {
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = CFG.col.tech;
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (var ti = 0; ti < tl.length; ti++) {
        if (tl[ti].dead) continue;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(tl[ti].x, tl[ti].y);
      }
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    if (p.tideT >= 0) {
      ctx.strokeStyle = 'rgba(255,210,125,.8)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(4, p.tideR), 0, Math.PI * 2);
      ctx.stroke();
    }

    if (p.st.orbit > 0) {
      for (var k = 0; k < p.st.orbit; k++) {
        var a = p.orbA + k / p.st.orbit * Math.PI * 2;
        var ox = p.x + Math.cos(a) * p.orbR, oy = p.y + Math.sin(a) * p.orbR;
        GlowCache.draw(ctx, CFG.col.techGlow, ox, oy, 16, 1);
        ctx.fillStyle = p.millK > 0 ? '#f2c46a' : CFG.col.tech;
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(a * 3);
        ctx.fillRect(-6, -3, 12, 6);
        ctx.restore();
      }
    }
  },

  drawTurrets: function (ctx) {
    for (var i = 0; i < Game.turrets.length; i++) {
      var t = Game.turrets[i];
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.globalAlpha = t.life < 3 ? (0.35 + 0.65 * Math.abs(Math.sin(t.life * 8))) : 1;
      ctx.fillStyle = '#2a2140';
      ctx.strokeStyle = CFG.col.tech;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.rotate(t.ang);
      ctx.fillStyle = CFG.col.tech;
      ctx.fillRect(4, -2.5, 14, 5);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  },

  drawBullets: function (ctx) {
    var list = Game.bullets;
    var i, rl = Game.rails;
    ctx.lineWidth = 6;
    for (i = 0; i < rl.length; i++) {
      ctx.globalAlpha = U.clamp(rl[i].life / 1.3, 0, 1) * 0.7;
      ctx.strokeStyle = '#ff9a4a';
      ctx.beginPath();
      ctx.moveTo(rl[i].x1, rl[i].y1);
      ctx.lineTo(rl[i].x2, rl[i].y2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffb35c';
    for (i = 0; i < Game.bomblets.length; i++) {
      ctx.beginPath();
      ctx.arc(Game.bomblets[i].x, Game.bomblets[i].y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    var glow = list.length < 90 && !Save.data.set.low;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      var isTech = b.c === CFG.col.tech;
      if (glow) GlowCache.draw(ctx, isTech ? CFG.col.techGlow : CFG.col.allyGlow, b.x, b.y, b.r * 3, 1);
      ctx.fillStyle = b.crit ? '#fff2cc' : (b.c || CFG.col.ally);
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};
