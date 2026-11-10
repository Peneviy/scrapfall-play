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
      fireCd: 0, dashT: 0, dashCdT: 0, inv: 0, slowT: 0, novaCd: 6, burnCd: 0, killCount: 0,
      orbA: 0, turretCd: 6,
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
      heal: function (n) { this.hp = Math.min(this.st.maxHp, this.hp + n); },
      hurt: function (n) { Player.hurt(this, n); }
    };
    p.hp = p.st.maxHp;
    p.xpNeed = Player.xpFor(1);
    if (ch.turret) p.st.turret = 1;

    var boost = Save.data.prestige * CFG.prestige.startLevel;
    for (var i = 0; i < boost; i++) {
      var cards = Skills.roll(p, 1);
      if (cards.length) Player.take(p, cards[0]);
      p.level++;
      p.xpNeed = Player.xpFor(p.level);
    }
    return p;
  },

  xpFor: function (level) {
    return Math.round(CFG.xp.base * Math.pow(CFG.xp.growth, level - 1) + CFG.xp.flat * level);
  },

  take: function (p, skill) {
    p.skills[skill.id] = (p.skills[skill.id] || 0) + 1;
    skill.apply(p);
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

  hurt: function (p, dmg) {
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
    if (p.slowT > 0) p.slowT -= dt;
    if (p.buffs.rage > 0) p.buffs.rage -= dt;
    if (p.buffs.haste > 0) p.buffs.haste -= dt;
    if (p.st.regen > 0) p.heal(p.st.regen * dt);

    var mv = Input.move;
    if (p.dashT > 0) {
      p.dashT -= dt;
      p.x += Math.cos(p.dashAng) * CFG.player.dashSpeed * dt;
      p.y += Math.sin(p.dashAng) * CFG.player.dashSpeed * dt;
      World.resolve(p);
      World.touchCrates(p);
      if (!Save.data.set.low) FX.burst(p.x, p.y, 2, Content.skin(p.skin).trail, 40, 0.3, 3);
    } else {
      var spd = p.st.speed * (p.slowT > 0 ? 0.55 : 1);
      p.x += mv.x * spd * dt;
      p.y += mv.y * spd * dt;
      World.resolve(p);
      World.touchCrates(p);
      if (Input.takeDash() && p.dashCdT <= 0 && (mv.x || mv.y)) {
        p.dashT = CFG.player.dashTime;
        p.dashCdT = p.st.dashCd;
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
      p.orbA += dt * 2.6;
      var rad = 62;
      for (var k = 0; k < p.st.orbit; k++) {
        var a = p.orbA + k / p.st.orbit * Math.PI * 2;
        var ox = p.x + Math.cos(a) * rad, oy = p.y + Math.sin(a) * rad;
        var hits = [];
        Game.grid.query(ox, oy, 18, hits);
        for (var j = 0; j < hits.length; j++) {
          var e = hits[j];
          if (e.dead || (e.orbCd || 0) > Game.time) continue;
          if (U.dist2(ox, oy, e.x, e.y) < (18 + e.r) * (18 + e.r)) {
            e.orbCd = Game.time + 0.45;
            Enemies.damage(e, 14 * p.st.dmg * p.st.tech, false, p.x, p.y, 16);
          }
        }
        World.damageArea(ox, oy, 18, 14 * p.st.dmg * p.st.tech, 0.45);
      }
    }

    if (p.st.nova > 0) {
      p.novaCd -= dt;
      if (p.novaCd <= 0) {
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
    }

    if (p.st.burn > 0) {
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
      }
    }

    p.tetherTarget = null;
    if (p.st.tether > 0) {
      var tg = Game.nearestEnemy(p.x, p.y, 240 + p.st.tether * 40);
      if (tg) {
        p.tetherTarget = tg;
        tg.slowT = 0.3;
        Enemies.damage(tg, 26 * p.st.tether * p.st.dmg * p.st.tech * dt, false, p.x, p.y, 0);
      }
    }

    if (p.st.turret > 0) {
      p.turretCd -= dt;
      if (p.turretCd <= 0 && Game.turrets.length < p.st.turret + 1) {
        p.turretCd = 12;
        Game.turrets.push({
          x: p.x + U.rand(-30, 30), y: p.y + U.rand(-30, 30),
          life: (p.char.turret ? 30 : 15) + p.st.turretLife, cd: 0, ang: 0
        });
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
    for (var a = 0; a < angles.length; a++) {
      for (var i = 0; i < count; i++) {
        var off = count < 3 ? 0 : (i / (count - 1) - 0.5) * fan * 2;
        var side = count === 2 ? (i ? 5 : -5) : 0;
        this.bullet(p, angles[a].a + off + U.rand(-0.02, 0.02), angles[a].k, side);
      }
    }
    FX.spray(p.x + Math.cos(ang) * 18, p.y + Math.sin(ang) * 18, ang, 3, '#ffd27d', 160);
    Snd.play(p.gun.sfx);
  },

  bullet: function (p, ang, power, side) {
    var crit = U.chance(p.st.crit);
    var dmg = p.gun.dmg * p.st.dmg * (crit ? 2 : 1) * (power === undefined ? 1 : power);
    if (p.buffs.rage > 0) dmg *= 1.5;
    var t = p.target;
    var close = t && !t.dead && U.dist2(p.x, p.y, t.x, t.y) < (p.r + t.r) * (p.r + t.r);
    var off = close ? 0 : 16;
    side = side || 0;
    Game.bullets.push({
      dead: false, fresh: !!close,
      x: p.x + Math.cos(ang) * off - Math.sin(ang) * side, y: p.y + Math.sin(ang) * off + Math.cos(ang) * side,
      vx: Math.cos(ang) * p.gun.speed, vy: Math.sin(ang) * p.gun.speed,
      r: p.gun.size, dmg: dmg, crit: crit, c: CFG.col.ally,
      pierce: p.gun.pierce + p.st.pierce,
      splash: ((p.gun.splash || 0) + p.st.splash) * p.st.radius,
      ricochet: p.st.ricochet, chain: p.st.chain,
      life: p.gun.range / p.gun.speed,
      hits: []
    });
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
    FX.ring(x, y, radius * 0.25, radius, '#ffb35c', 0.3, 3);
    FX.burst(x, y, 6, '#f0a24a', 220, 0.4, 3);
    FX.blast(x, y, radius);
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
        t.cd = 0.5;
        Game.bullets.push({
          dead: false, fresh: false,
          x: t.x, y: t.y,
          vx: Math.cos(t.ang) * 560, vy: Math.sin(t.ang) * 560,
          r: 3.5, dmg: 9 * p.st.dmg * p.st.tech, crit: false, c: CFG.col.tech,
          pierce: 0, splash: p.st.splash * 0.5, ricochet: 0, chain: 0,
          life: 0.8, hits: []
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

    GlowCache.draw(ctx, 'rgba(255,210,125,.22)', p.x, p.y, p.r * 3.2, 1);
    ctx.strokeStyle = 'rgba(255,255,255,.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 6, 0, Math.PI * 2);
    ctx.stroke();

    if (p.inv > 0 && Math.floor(p.inv * 20) % 2 === 0) ctx.globalAlpha = 0.45;
    Content.drawChar(ctx, p.x, p.y, p.r, p.char.id, p.skin, p.ang, p.dashT > 0);
    ctx.globalAlpha = 1;

    if (p.tetherTarget && !p.tetherTarget.dead) {
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = CFG.col.tech;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.tetherTarget.x, p.tetherTarget.y);
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    if (p.st.orbit > 0) {
      for (var k = 0; k < p.st.orbit; k++) {
        var a = p.orbA + k / p.st.orbit * Math.PI * 2;
        var ox = p.x + Math.cos(a) * 62, oy = p.y + Math.sin(a) * 62;
        GlowCache.draw(ctx, CFG.col.techGlow, ox, oy, 16, 1);
        ctx.fillStyle = CFG.col.tech;
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
