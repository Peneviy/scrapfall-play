var Bosses = {

  list: [
    {
      id: 'crusher', shape: 4, hpMul: 1, dmgMul: 1, speed: 40, r: 46,
      body: '#3a4a56', trim: '#f0a24a',
      ru: { n: 'ДРОБИТЕЛЬ', d: 'Бьет кольцом пуль, но в кольце всегда есть дыра' },
      en: { n: 'CRUSHER', d: 'Fires a ring of bullets, but the ring always has a gap' },
      ai: function (e, dt, d) {
        var K = Bosses.K.crusher;
        if (e.aim > 0) {
          e.vx = e.vy = 0;
          e.aim -= dt;
          if (e.aim <= 0) {
            FX.ring(e.x, e.y, e.r, e.r + 100, CFG.col.enemyShot, 0.4, 3);
            var hw = K.gap / 2, n = K.n, span = Math.PI * 2 - K.gap;
            for (var i = 0; i < n; i++) {
              Game.spawnEnemyBullet(e.x, e.y, e.chargeAng + hw + (i + 0.5) / n * span, K.sp, e.dmg * 0.5, CFG.col.enemyShot);
            }
            Snd.play('shotBig');
            if (++e.n1 >= K.salvos) { e.n1 = 0; Bosses.open(e, K.heat, K.heatK, 'heat'); }
          }
          return;
        }
        Bosses.approach(e, d, 260, 1.2, 0.5);
        e.t1 -= dt;
        if (e.t1 <= 0) {
          e.t1 = U.rand(K.cd[0], K.cd[1]);
          e.aim = K.tell;
          e.chargeAng = Math.random() < K.back ? e.ang + Math.PI + U.rand(-0.5, 0.5)
            : e.ang + (Math.random() < 0.5 ? -1 : 1) * U.rand(K.off[0], K.off[1]);
          Bosses.mark({ k: 'fan', x: e.x, y: e.y, a: e.chargeAng, hw: K.gap / 2, r: 560, t: K.tell, c: '#d8f6ff', o: e, safe: true, follow: true,
            ring: K.n, rc: e.bd.trim, rin: e.r });
          Snd.play('tell');
        }
        e.t2 -= dt;
        if (e.t2 <= 0) {
          e.t2 = U.rand(7, 10);
          for (var k = 0; k < 4; k++) {
            var a = Math.random() * 6.28;
            Enemies.summon('runner', e.x + Math.cos(a) * 80, e.y + Math.sin(a) * 80);
          }
          FX.burst(e.x, e.y, 14, e.bd.trim, 200, 0.5, 3);
        }
      }
    },

    {
      id: 'driller', shape: 3, hpMul: 0.85, dmgMul: 1.4, speed: 34, r: 42,
      body: '#5a3b2c', trim: '#ffb07a',
      ru: { n: 'БУРИЛЬЩИК', d: 'Таранит по прямой, не разбирая стен' },
      en: { n: 'DRILLER', d: 'Rams in a straight line, walls or not' },
      ai: function (e, dt, d) {
        var K = Bosses.K.driller;
        if (e.charge > 0) {
          e.charge -= dt;
          e.vx = Math.cos(e.chargeAng) * K.sp;
          e.vy = Math.sin(e.chargeAng) * K.sp;
          FX.spray(e.x, e.y, e.chargeAng + Math.PI, 2, e.bd.trim, 200);
          var fx = e.x + Math.cos(e.chargeAng) * e.r * 0.9, fy = e.y + Math.sin(e.chargeAng) * e.r * 0.9;
          if (World.blocked(fx, fy)) {
            e.charge = 0;
            FX.shake(12);
            FX.burst(fx, fy, 22, '#c9b08a', 260, 0.6, 4);
            Snd.play('boom');
            Bosses.open(e, K.stuck, K.stuckK, 'stuck');
          } else if (e.charge <= 0) {
            FX.burst(fx, fy, 14, '#c9b08a', 160, 0.5, 3);
            Bosses.open(e, K.dig, K.digK, 'dig');
          }
          return;
        }
        if (e.aim > 0) {
          e.aim -= dt;
          e.vx = e.vy = 0;
          e.chargeAng = U.turn(e.chargeAng, e.ang, 2.2 * dt);
          var ray = Bosses.ray(e.x, e.y, e.chargeAng, K.sp * K.time + e.r);
          e.m.x = ray.d; e.m.y = ray.hit ? 1 : 0;
          if (e.aim <= 0) {
            e.charge = K.time;
            Snd.play('boom');
            FX.shake(6);
          }
          return;
        }
        Bosses.approach(e, d, 200, 1, 0.4);
        e.t1 -= dt;
        if (e.t1 <= 0 && d < 720) {
          e.t1 = U.rand(3.2, 4.4);
          e.aim = 0.85;
          e.chargeAng = e.ang;
          FX.ring(e.x, e.y, e.r, e.r + 40, e.bd.trim, 0.8, 2);
          Snd.play('tell');
        }
      }
    },

    {
      id: 'weaver', shape: 6, hpMul: 0.95, dmgMul: 0.9, speed: 46, r: 40,
      body: '#3f5c3a', trim: '#b6e07a',
      ru: { n: 'ТКАЧ', d: 'Прячется за опорами и тянет нити' },
      en: { n: 'WEAVER', d: 'Hides behind pylons and pulls threads' },
      phases: [0.5],
      ai: function (e, dt, d) {
        var K = Bosses.K.weaver, ph = e.mech ? 0 : e.ph, p = Game.player;
        if (ph === 0) {
          if (e.inv) {
            Bosses.approach(e, d, 430, 0.25, -0.3);
            var ox = e.x - e.m.px, oy = e.y - e.m.py;
            if (ox * ox + oy * oy > K.stay * K.stay && e.vx * ox + e.vy * oy > 0) e.vx = e.vy = 0;
          } else Bosses.approach(e, d, 430, 1, -1);
          var alive = Bosses.pylonsAlive(e);
          if (e.inv && alive && U.dist2(e.x, e.y, e.m.px, e.m.py) > K.lost * K.lost) {
            Bosses.plant(e, true);
            alive = Bosses.pylonsAlive(e);
          }
          if (e.inv && !alive) {
            e.inv = false; e.n1 = K.bare;
            FX.ring(e.x, e.y, e.r, e.r + 160, e.bd.trim, 0.6, 5);
            Bosses.open(e, K.snap, K.snapK, 'snap');
            return;
          } else if (!e.inv && !alive) {
            e.n1 -= dt;
            if (e.n1 <= 0) Bosses.plant(e);
          }
        } else {
          Bosses.approach(e, d, 300, 1, 0.3);
          if (e.tie > 0) {
            e.tie -= dt;
            var r = Bosses.ray(e.x, e.y, e.ang, d);
            if (r.hit) {
              e.tie = 0;
              FX.burst((e.x + p.x) / 2, (e.y + p.y) / 2, 16, e.bd.trim, 220, 0.5, 3);
              Snd.play('snap');
              Bosses.open(e, K.snap, K.snapK, 'snap');
              return;
            }
            if (p.dashT <= 0 && d > e.r + p.r + 20) {
              p.x -= Math.cos(e.ang) * K.pull * dt;
              p.y -= Math.sin(e.ang) * K.pull * dt;
              World.resolve(p);
            }
          } else if (e.aim > 0) {
            e.aim -= dt;
            if (e.aim <= 0) { e.tie = K.tieT; Snd.play('thread'); }
          } else {
            e.t2 -= dt;
            if (e.t2 <= 0 && d < 680 && !Bosses.ray(e.x, e.y, e.ang, d).hit) {
              e.t2 = U.rand(K.tieCd[0], K.tieCd[1]);
              e.aim = K.tieTell;
              Snd.play('threadTell');
            }
          }
        }
        e.t1 -= dt;
        if (e.t1 <= 0) {
          e.t1 = U.rand(2.2, 3);
          for (var i = -1; i <= 1; i++) {
            Game.spawnEnemyBullet(e.x, e.y, e.ang + i * 0.22, 250, e.dmg * 0.45, CFG.col.spit);
          }
        }
      },
      onPhase: function (e) {
        Bosses.dropPylons(e);
        e.inv = false;
        e.t2 = 1.5;
      }
    },

    {
      id: 'frostmaw', shape: 5, hpMul: 1.15, dmgMul: 1.1, speed: 52, r: 44,
      body: '#2f4f66', trim: '#7ec8ff',
      ru: { n: 'МОРОЗНИК', d: 'Пускает по земле ледяное кольцо' },
      en: { n: 'FROSTMAW', d: 'Sends an icy ring crawling across the ground' },
      ai: function (e, dt, d) {
        if (e.charge > 0) {
          e.charge -= dt;
          e.vx = Math.cos(e.chargeAng) * 620;
          e.vy = Math.sin(e.chargeAng) * 620;
          return;
        }
        var K = Bosses.K.frostmaw;
        if (e.aim > 0) {
          e.vx = e.vy = 0;
          e.aim -= dt;
          if (e.aim <= 0) {
            Bosses.frost.push({ x: e.x, y: e.y, r: e.r, max: K.max, sp: K.sp, dmg: e.dmg * 0.35, hit: false, o: e });
            FX.ring(e.x, e.y, e.r, e.r + 60, e.bd.trim, 0.4, 4);
            Snd.play('frostRing');
            Bosses.open(e, K.tired, K.tiredK, 'tired');
          }
          return;
        }
        Bosses.approach(e, d, 300, 1.1, 0.6);
        e.t1 -= dt;
        if (e.t1 <= 0) {
          e.t1 = U.rand(K.cd[0], K.cd[1]);
          e.aim = K.tell;
          Bosses.mark({ k: 'disc', x: e.x, y: e.y, r: e.r * 2.4, t: K.tell, c: e.bd.trim, o: e, follow: true });
          Snd.play('frostTell');
        }
        e.t2 -= dt;
        if (e.t2 <= 0 && d < 300) {
          e.t2 = U.rand(5.5, 7.5);
          e.charge = 0.5;
          e.chargeAng = e.ang;
        }
      }
    },

    {
      id: 'hive', shape: 8, hpMul: 1.5, dmgMul: 2.0, speed: 32, r: 52,
      body: '#4a3a5c', trim: '#b79ad6',
      ru: { n: 'УЛЕЙ', d: 'Рожает рой, потом сбрасывает соты, а под конец пускает личинок' },
      en: { n: 'HIVE', d: 'Breeds swarms, then sheds combs, and at the end lets loose larvae' },
      phases: [0.66, 0.33],
      ai: function (e, dt, d) {
        var K = Bosses.K.hive, ph = e.mech ? 0 : e.ph;
        if (e.shield > 0) e.shield -= dt;
        if (e.aim > 0) {
          e.vx = e.vy = 0;
          e.aim -= dt;
          if (e.aim > 0) return;
          if (ph === 2) {
            Bosses.larvae(e);
            Bosses.open(e, K.spent, K.spentK, 'empty');
            return;
          }
          e.shield = 1.6;
          FX.shake(4);
          Snd.play('swarm');
          var n = ph === 1 ? K.brood2 : K.brood;
          for (var k = 0; k < n; k++) {
            var a = e.ang + U.rand(-1.1, 1.1), rr = U.rand(70, 120);
            Enemies.summon('swarm', e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr);
          }
          FX.ring(e.x, e.y, e.r, e.r + 130, e.bd.trim, 0.7, 5);
          if (ph === 0 && ++e.n1 >= K.broods) { e.n1 = 0; Bosses.open(e, K.empty, K.emptyK, 'empty'); }
          return;
        }
        Bosses.approach(e, d, 300, 1, 0.6);
        if (ph === 1) {
          var alive = Bosses.pylonsAlive(e);
          if (alive < e.m.cn) { e.m.cn = alive; Bosses.open(e, K.snap, K.snapK, 'snap'); if (!alive) e.n2 = K.replant; return; }
          if (!alive) { e.n2 -= dt; if (e.n2 <= 0) Bosses.combs(e); }
        }
        e.t1 -= dt;
        if (e.t1 <= 0) {
          var cd = ph === 2 ? K.larvaCd : (ph === 1 ? K.cd2 : K.cd);
          e.t1 = U.rand(cd[0], cd[1]);
          e.aim = K.tell;
          Bosses.mark({ k: 'disc', x: e.x, y: e.y, r: e.r * 2.2, t: K.tell, c: ph === 2 ? '#ff9a4a' : e.bd.trim, o: e, follow: true });
          Snd.play('hiveTell');
        }
      },
      onPhase: function (e, ph) {
        if (ph === 1) Bosses.combs(e);
        e.t1 = ph === 2 ? 1.2 : 2.5;
      }
    },

    {
      id: 'warden', shape: 4, hpMul: 1.35, dmgMul: 1.9, speed: 36, r: 48,
      body: '#5c2f3f', trim: '#ff4d8d',
      ru: { n: 'СТРАЖ', d: 'Крутит луч у земли, а вплотную к корпусу луч не достает' },
      en: { n: 'WARDEN', d: 'Sweeps a low beam, but it cannot reach right next to him' },
      ai: function (e, dt, d) {
        var K = Bosses.K.warden, p = Game.player, rin = e.r + K.safe;
        e.m.safe = rin;
        e.beamLen = K.len; e.beams = 1;
        if (d > K.walk) Bosses.approach(e, d, K.walk, 1, 0);
        else e.vx = e.vy = 0;
        if (!e.m.dir) e.m.dir = 1;
        if (e.aim > 0) { e.aim -= dt; if (e.aim <= 0) e.m.dir = -e.m.dir; }
        else {
          e.t2 -= dt;
          if (e.t2 <= 0) { e.t2 = U.rand(K.revCd[0], K.revCd[1]); e.aim = K.revTell; Snd.play('wardRev'); }
        }
        e.beamA = (e.beamA || 0) + dt * K.spin * e.m.dir * (e.aim > 0 ? 0.3 : 1);
        var px = p.x - e.x, py = p.y - e.y, bx = Math.cos(e.beamA), by = Math.sin(e.beamA);
        var proj = px * bx + py * by;
        if (proj > rin && proj < e.beamLen) {
          var perp = Math.abs(px * by - py * bx);
          if (perp < Bosses.beamW / 2 + p.r * 0.5) p.hurt(e.dmg * 0.6);
        }
        if (e.mode === 2) {
          e.m.pt -= dt;
          if (e.m.pt <= 0) {
            e.mode = 0; e.m.inT = 0;
            FX.ring(e.x, e.y, e.r, rin + 90, e.bd.trim, 0.45, 6);
            FX.shake(9);
            Snd.play('wardBlast');
            if (d < rin + 40 && p.dashT <= 0) {
              p.hurt(e.dmg * 0.8);
              var pa = U.angleTo(e.x, e.y, p.x, p.y);
              p.x = e.x + Math.cos(pa) * (rin + K.push); p.y = e.y + Math.sin(pa) * (rin + K.push);
              World.resolve(p);
            }
            Bosses.open(e, K.cool, K.coolK, 'cool');
            return;
          }
        } else if (d < rin + 10) {
          e.m.inT = (e.m.inT || 0) + dt;
          if (e.m.inT > K.inMax) {
            e.mode = 2; e.m.pt = K.pulseTell;
            Bosses.mark({ k: 'disc', x: e.x, y: e.y, r: rin + 40, t: K.pulseTell, c: e.bd.trim, o: e, follow: true });
            Snd.play('wardPush');
          }
        } else if (e.m.inT > 0) e.m.inT = Math.max(0, e.m.inT - dt * 0.5);
        e.t1 -= dt;
        if (e.t1 <= 0) {
          e.t1 = U.rand(4, 5.5);
          for (var i = 0; i < 6; i++) {
            Game.spawnEnemyBullet(e.x, e.y, e.beamA + 0.5 + i * 1.05, 220, e.dmg * 0.45, CFG.col.enemyShot);
          }
        }
      }
    }
,
    {
      id: 'sapper', shape: 3, hpMul: 0.9, dmgMul: 1.1, speed: 58, r: 40,
      body: '#5a4a2c', trim: '#ffd27d',
      ru: { n: 'ПОДРЫВНИК', d: 'Сыплет минами, а мины рвутся цепью' },
      en: { n: 'SAPPER', d: 'Scatters mines that blow up in a chain' },
      ai: function (e, dt, d) {
        Bosses.approach(e, d, 380, 1, -0.9);
        e.t1 -= dt;
        if (e.t1 <= 0) {
          e.t1 = U.rand(1.6, 2.4);
          var p = Game.player;
          Game.spawnMine(p.x + U.rand(-70, 70), p.y + U.rand(-70, 70), e.dmg * 0.8, 2.2);
          Game.spawnMine(e.x, e.y, e.dmg * 0.8, 2.6);
          if (++e.n1 >= 3) {
            e.n1 = 0;
            for (var k = 1; k <= 2; k++) Game.spawnMine(e.x + (p.x - e.x) * k / 3, e.y + (p.y - e.y) * k / 3, e.dmg * 0.8, 3.2);
          }
        }
      }
    },
    {
      id: 'lancer', shape: 4, hpMul: 1, dmgMul: 1.25, speed: 64, r: 38,
      body: '#40325c', trim: '#c0a8ff',
      ru: { n: 'КОПЕЙЩИК', d: 'Мечет копья, и они встают стеной' },
      en: { n: 'LANCER', d: 'Throws spears that stick up as walls' },
      phases: [0.5],
      ai: function (e, dt, d) {
        if (e.burst === undefined) { e.burst = 0; e.t2 = 0.8; }
        if (e.charge > 0) {
          e.charge -= dt;
          e.vx = Math.cos(e.chargeAng) * 780;
          e.vy = Math.sin(e.chargeAng) * 780;
          FX.spray(e.x, e.y, e.chargeAng + Math.PI, 2, e.bd.trim, 220);
          return;
        }
        var K = Bosses.K.lancer, p = Game.player, ph = e.mech ? 0 : e.ph;
        if (e.jump > 0) {
          e.jump -= dt;
          var jk = 1 - e.jump / K.jumpT;
          e.x = e.m.x + (e.m.tx - e.m.x) * jk;
          e.y = e.m.y + (e.m.ty - e.m.y) * jk;
          e.vx = e.vy = 0;
          e.lift = Math.sin(Math.PI * jk) * 160;
          if (e.jump <= 0) {
            e.lift = 0;
            FX.ring(e.x, e.y, 20, K.slamR, e.bd.trim, 0.45, 5);
            FX.burst(e.x, e.y, 20, '#c9b08a', 240, 0.5, 4);
            FX.shake(10);
            Snd.play('boom');
            if (U.dist2(e.x, e.y, p.x, p.y) < K.slamR * K.slamR) p.hurt(e.dmg * 0.8);
            Bosses.dropSpear(e.m.sp);
            if (++e.n2 >= 3) { e.n2 = 0; Bosses.open(e, K.dizzy, K.dizzyK, 'dizzy'); }
          }
          return;
        }
        if (e.aim > 0) {
          e.aim -= dt;
          e.vx = e.vy = 0;
          if (e.mode === 1) {
            if (e.aim <= 0) { e.jump = K.jumpT; Snd.play('leap'); }
            return;
          }
          e.chargeAng = U.turn(e.chargeAng, e.ang, 2.6 * dt);
          if (e.aim <= 0) { e.charge = 0.3; Snd.play('dash'); }
          return;
        }
        e.t2 -= dt;
        if (d < 250 && e.t2 <= 0) {
          e.t2 = U.rand(2.2, 3);
          e.aim = 0.5; e.mode = 0;
          e.chargeAng = e.ang;
          FX.ring(e.x, e.y, e.r, e.r + 40, e.bd.trim, 0.5, 2);
          return;
        }

        var want = 340;
        var radial = d > want + 40 ? 1 : (d < want - 40 ? -1 : 0);
        var sp = e.speed;
        e.vx = Math.cos(e.ang) * sp * radial + Math.cos(e.ang + Math.PI / 2) * sp * 0.9;
        e.vy = Math.sin(e.ang) * sp * radial + Math.sin(e.ang + Math.PI / 2) * sp * 0.9;

        e.t1 -= dt;
        if (e.t1 > 0) return;
        var mine = Bosses.spearsOf(e);
        if (ph > 0 && mine.length && e.n1 === 0) {
          var best = mine[0], bd2 = 1e12;
          for (var si = 0; si < mine.length; si++) {
            var dd = U.dist2(mine[si].x, mine[si].y, p.x, p.y);
            if (dd < bd2) { bd2 = dd; best = mine[si]; }
          }
          e.t1 = K.jumpCd;
          e.aim = K.jumpTell; e.mode = 1;
          e.m.x = e.x; e.m.y = e.y; e.m.tx = best.x; e.m.ty = best.y; e.m.sp = best;
          Bosses.mark({ k: 'disc', x: best.x, y: best.y, r: K.slamR, t: K.jumpTell + K.jumpT, c: e.bd.trim, o: e });
          Snd.play('leapTell');
          return;
        }
        e.t1 = U.rand(K.cd[0], K.cd[1]);
        var lead = 0.5, sp2 = p.st.speed;
        var tx = p.x + Input.move.x * sp2 * lead, ty = p.y + Input.move.y * sp2 * lead;
        var a = U.angleTo(e.x, e.y, tx, ty), len = Math.min(K.len, U.dist(e.x, e.y, tx, ty) + 120);
        Bosses.throwSpear(e, a, len);
        if (++e.n1 >= 3) {
          e.n1 = 0;
          if (ph === 0) Bosses.open(e, K.tell + K.unarmed, K.unarmedK, 'unarmed');
        }
      }
    },
    {
      id: 'titan', shape: 6, hpMul: 2.2, dmgMul: 2.8, speed: 24, r: 62,
      body: '#3b3b46', trim: '#ffb35c',
      ru: { n: 'ТИТАН', d: 'Бьет о землю волной, а раненый швыряет глыбы' },
      en: { n: 'TITAN', d: 'Slams shockwaves into the ground, and when hurt hurls boulders' },
      phases: [0.5],
      ai: function (e, dt, d) {
        var K = Bosses.K.titan, ph = e.mech ? 0 : e.ph, p = Game.player;
        if (e.aim > 0) {
          e.vx = e.vy = 0;
          e.aim -= dt;
          if (e.mode === 1) {
            e.lift = 0;
            if (e.aim <= 0) { Bosses.throwRock(e, e.m.tx, e.m.ty); e.mode = 0; }
            return;
          }
          e.lift = (1 - Math.max(0, e.aim) / K.tell) * 30;
          if (e.aim <= 0) {
            e.lift = 0;
            FX.shake(11);
            FX.burst(e.x, e.y, 22, '#c9b08a', 260, 0.6, 4);
            Snd.play('quake');
            Bosses.frost.push({ x: e.x, y: e.y, r: e.r, max: K.max, sp: K.sp, dmg: e.dmg * 0.7, hit: false, o: e, q: true, band: K.band, c: e.bd.trim });
            if (++e.n1 >= K.slams) { e.n1 = 0; Bosses.open(e, K.sit, K.sitK, 'sit'); }
          }
          return;
        }
        Bosses.approach(e, d, 240, 1.1, 0.35);
        e.t1 -= dt;
        if (e.t1 > 0) return;
        if (ph > 0 && e.n2 < K.throws) {
          e.n2++;
          e.t1 = K.throwCd;
          e.mode = 1; e.aim = K.throwTell;
          var lead = 0.6, sp2 = p.st.speed;
          e.m.tx = p.x + Input.move.x * sp2 * lead; e.m.ty = p.y + Input.move.y * sp2 * lead;
          Bosses.mark({ k: 'disc', x: e.m.tx, y: e.m.ty, r: K.rockR, t: K.throwTell + K.fly, c: '#ffb35c', o: e });
          Snd.play('rockTell');
          return;
        }
        e.n2 = 0; e.mode = 0;
        e.t1 = U.rand(K.cd[0], K.cd[1]);
        e.aim = K.tell;
        Bosses.mark({ k: 'disc', x: e.x, y: e.y, r: e.r * 1.9, t: K.tell, c: e.bd.trim, o: e, follow: true });
        Snd.play('titanTell');
      },
      onPhase: function (e) { e.n2 = 0; e.t1 = 0.6; }
    },
    {
      id: 'phantom', shape: 5, hpMul: 1.1, dmgMul: 2.8, speed: 70, r: 38,
      body: '#0d2a2c', trim: '#8ff0e0',
      ru: { n: 'ФАНТОМ', d: 'Прыгает и бьет веером, делится надвое, а под конец режет шлейфом' },
      en: { n: 'PHANTOM', d: 'Blinks and fans out, splits in two, and at the end slices with its trail' },
      phases: [0.6, 0.25],
      ai: function (e, dt, d) {
        var K = Bosses.K.phantom, ph = e.mech ? 0 : e.ph, p = Game.player;
        if (!e.trail) e.trail = [];
        e.trailT = (e.trailT || 0) + dt;
        if (e.trailT > 0.06) {
          e.trailT = 0;
          e.trail.push({ x: e.x, y: e.y, a: e.ang });
          if (e.trail.length > 5) e.trail.shift();
        }
        if (ph === 2) { Bosses.rush(e, dt, d, K); return; }
        var tw = e.twin && !e.twin.dead ? e.twin : null;
        if (e.aim > 0) {
          e.vx = e.vy = 0;
          e.aim -= dt;
          if (e.aim > 0) return;
          Bosses.blink(e, e.m.tx, e.m.ty);
          if (tw) Bosses.blink(tw, e.m.ux, e.m.uy, e);
          if (ph === 0 && ++e.n1 >= K.every) { e.n1 = 0; Bosses.open(e, K.solid, K.solidK, 'solid'); }
          return;
        }
        Bosses.approach(e, d, 300, 0.9, 0.2);
        if (ph === 1) {
          if (!tw) {
            if (e.twin) { e.twin = null; e.n2 = K.resplit; }
            e.n2 -= dt;
            if (e.n2 <= 0) Bosses.split(e);
          } else {
            var ta = U.angleTo(tw.x, tw.y, p.x, p.y), td = U.dist(tw.x, tw.y, p.x, p.y);
            var tsp = e.speed * (td > 300 ? 0.9 : 0.2);
            tw.x += Math.cos(ta) * tsp * dt; tw.y += Math.sin(ta) * tsp * dt; tw.ang = ta;
            if (e.m.hp0 - e.hp > e.maxHp * K.breakHp) {
              FX.burst(tw.x, tw.y, 26, e.bd.trim, 260, 0.5, 4);
              FX.ring(tw.x, tw.y, tw.r, tw.r + 120, e.bd.trim, 0.4, 4);
              tw.dead = true; e.twin = null; e.n2 = K.resplit;
              Snd.play('decoyPop');
              Bosses.open(e, K.snap, K.snapK, 'snap');
              return;
            }
          }
        }
        e.t1 -= dt;
        if (e.t1 <= 0) {
          e.t1 = U.rand(K.cd[0], K.cd[1]);
          e.aim = K.tell;
          var a = Math.random() * 6.28, dist = U.rand(170, 260);
          e.m.tx = p.x + Math.cos(a) * dist; e.m.ty = p.y + Math.sin(a) * dist;
          Bosses.mark({ k: 'disc', x: e.m.tx, y: e.m.ty, r: e.r * 1.3, t: K.tell, c: e.bd.trim, o: e });
          Snd.play('blinkTell');
          if (tw) {
            var a2 = a + U.rand(1.6, 4.7), d2 = U.rand(170, 260);
            e.m.ux = p.x + Math.cos(a2) * d2; e.m.uy = p.y + Math.sin(a2) * d2;
            Bosses.mark({ k: 'disc', x: e.m.ux, y: e.m.uy, r: e.r * 1.3, t: K.tell, c: e.bd.trim, o: e });
          }
        }
      },
      onPhase: function (e, ph) {
        if (ph === 1) e.n2 = 0.2;
        e.t1 = ph === 2 ? 0.8 : 1.5;
      }
    }
  ],

  byId: function (id) {
    for (var i = 0; i < this.list.length; i++) if (this.list[i].id === id) return this.list[i];
    if (id === 'queen') return this.queen;
    return this.list[0];
  },

  order: function (first, rnd) {
    var out = [], T = CFG.finale.tiers;
    rnd = rnd || Math.random;
    for (var t = 0; t < T.length; t++) {
      var tier = T[t].slice();
      for (var i = tier.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), x = tier[i]; tier[i] = tier[j]; tier[j] = x; }
      if (t === 0 && first) { var k = tier.indexOf(first); if (k > 0) { tier.splice(k, 1); tier.unshift(first); } }
      out = out.concat(tier);
    }
    return out;
  },
  forIndex: function (i) {
    var o = Game.bossOrder;
    return o && o.length ? this.byId(o[i % o.length]) : this.list[i % this.list.length];
  },
  cycle: function (i) { return Math.floor(i / this.list.length); },

  auto: function (bd) {
    var A = CFG.boss.auto, T = CFG.finale.tiers, top = A.queen;
    for (var t = 0; t < T.length; t++) if (T[t].indexOf(bd.id) >= 0) top = A.tiers[Math.min(t, A.tiers.length - 1)];
    return 1 + top * U.clamp(Save.upTotal() / A.full, 0, 1);
  },

  queen: {
    id: 'queen', shape: 8, hpMul: 1, dmgMul: 1, speed: 46, r: 56, mdl: 0.7,
    body: '#4a2a38', trim: '#ffcf4a',
    ru: { n: 'КОРОЛЕВА ЛОМА', d: 'Берет приемы тех, кого ты победил, и обрушивает дождь лома' },
    en: { n: 'SCRAP QUEEN', d: 'Uses the tricks of the bosses you beat and brings down a scrap rain' },
    tr: { n: 'HURDA KRALİÇESİ', d: 'Yendiğin bossların hilelerini kullanır ve hurda yağdırır' },
    de: { n: 'SCHROTTKÖNIGIN', d: 'Nutzt die Tricks der besiegten Bosse und lässt Schrott regnen' },
    es: { n: 'REINA CHATARRA', d: 'Usa los trucos de los jefes que venciste y hace llover chatarra' },
    pt: { n: 'RAINHA DA SUCATA', d: 'Usa os truques dos chefes que você venceu e faz chover sucata' },
    ai: function (e, dt, d) {
      var f = e.hp / e.maxHp, ph = f > 0.66 ? 0 : (f > 0.33 ? 1 : 2);
      if (ph === 2 && f <= CFG.nakal.queen4 && Nakal.has(7)) ph = 3;
      if (ph !== e.qph) { Finale.queenPhase(e, ph); if (e.openT > 0) return; }
      if (Bosses.queenScrap(e, dt, d)) return;
      Bosses.byId(e.mech).ai(e, dt, d);
    }
  },

  defeated: function () {
    var n = 0;
    for (var i = 0; i < this.list.length; i++) if (Save.data.bosses[this.list[i].id]) n++;
    return n;
  },

  hooks: {},
  on: function (ev, fn) { (this.hooks[ev] || (this.hooks[ev] = [])).push(fn); },
  off: function (ev, fn) {
    var h = this.hooks[ev], i = h ? h.indexOf(fn) : -1;
    if (i >= 0) h.splice(i, 1);
  },
  emit: function (ev, e) {
    var h = this.hooks[ev];
    if (h) for (var i = 0; i < h.length; i++) h[i](e);
  },

  headX: 1, headY: 0,
  fighting: false,

  tick: function (dt) {
    var mv = Input.move;
    if (mv.x || mv.y) { this.headX = mv.x; this.headY = mv.y; }
    this.fighting = !!Game.activeBoss();
    if (Finale.tick(dt)) return;
    if (Game.time < Game.nextBoss || this.fighting) return;
    Game.nextBoss = Game.time + CFG.boss.every;
    this.newLair(Game.bossIndex++);
    Enemies.newStage();
    Enemies.announceUnlock();
  },

  waiting: function (out) {
    out = out || [];
    out.length = 0;
    var list = Game.enemies;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.boss && e.bd && !e.dead && (e.state === 'sleep' || e.state === 'return')) out.push(e);
    }
    if (out.length > 1) out.sort(function (a, b) { return a.lairT - b.lairT; });
    return out;
  },

  newLair: function (index) {
    var w = this.waiting();
    if (w.length >= Nakal.sleepMax()) this.wake(w[0], true);
    var e = Enemies.spawnBoss(index);
    FX.ring(e.x, e.y, 10, CFG.boss.lair.r, e.bd.trim, 0.9, 4, true);
    Snd.play('boss');
    if (Game.endless) UI.bossBanner(I18N.name(e.bd), true);
    else UI.banner(I18N.t('bossIn') + ' · ' + (index + 1) + '/' + this.list.length, I18N.name(e.bd));
    this.emit('lair', e);
    return e;
  },

  spot: function (x, y, dMin, dMax, ang, self) {
    var best = null, head = Math.atan2(this.headY, this.headX);
    var moving = Input.move.x || Input.move.y;
    for (var t = 0; t < 16; t++) {
      var a;
      if (ang !== undefined) a = ang + (Math.random() < 0.5 ? -1 : 1) * U.rand(0.5, 1);
      else {
        a = Math.random() * Math.PI * 2;
        if (moving && t < 12 && Math.abs(Math.atan2(Math.sin(a - head), Math.cos(a - head))) < 0.6) continue;
      }
      var d = U.rand(dMin, dMax);
      best = { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d };
      if (World.freeAt(best.x, best.y, 110) && !this.crowded(best.x, best.y, self)) return best;
    }
    return best;
  },
  crowded: function (x, y, self) {
    var list = Game.enemies, rr = CFG.boss.lair.r * 2.2;
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (!o.boss || !o.bd || o.dead || o === self) continue;
      if (U.dist2(x, y, o.anchorX, o.anchorY) < rr * rr) return true;
    }
    return false;
  },

  wake: function (e, hunt) {
    var L = CFG.boss.lair;
    e.zz = false;
    e.state = 'rise';
    e.riseT = L.rise;
    e.t1 = U.rand(1.5, 2.5); e.t2 = U.rand(4, 6);
    e.aim = 0; e.charge = 0;
    this.reset(e);
    if (hunt && !e.hunt) { e.hunt = true; e.speed *= L.hunt; }
    FX.ring(e.anchorX, e.anchorY, L.r, e.r, e.bd.trim, 0.7, 6, true);
    FX.burst(e.x, e.y, 24, e.bd.trim, 240, 0.6, 4);
    FX.shake(10);
    Snd.play(e.rep ? 'rep' : 'boss');
    UI.banner(I18N.t(hunt ? 'bossHunt' : 'bossWake'), I18N.name(e.bd));
    this.emit('wake', e);
  },

  hit: function (e) {
    if (e.state === 'sleep') this.wake(e, false);
    else if (e.state === 'return') e.state = 'fight';
  },

  grow: function (e) {
    var L = CFG.boss.lair, m = e.sleepT / 60 * Nakal.lairK();
    var hk = 1 + Math.min(L.hpMax, L.hpPerMin * m);
    if (hk === e.hk) return;
    var full = e.hp / e.maxHp;
    e.hk = hk;
    e.maxHp = e.baseHp * hk;
    e.hp = e.maxHp * full;
    e.dmg = e.baseDmg * (1 + Math.min(L.dmgMax, L.dmgPerMin * m));
  },
  power: function (e) { return Math.round((e.hk || 1) * 100); },

  move: function (e) {
    var L = CFG.boss.lair, p = Game.player;
    var s = this.spot(p.x, p.y, L.move, L.moveMax, Math.atan2(this.headY, this.headX), e);
    FX.burst(e.x, e.y, 14, e.bd.trim, 200, 0.4, 3);
    e.x = e.anchorX = s.x;
    e.y = e.anchorY = s.y;
    e.farT = 0;
    FX.ring(e.x, e.y, 10, L.r, e.bd.trim, 0.8, 4, true);
    this.emit('move', e);
  },

  step: function (e, dt, d) {
    var L = CFG.boss.lair, st = e.state;
    if (st === 'sleep' || (e.hunt && (e.rep || e.bd === this.queen))) {
      if (d > L.far) { e.farT += dt; if (e.farT > L.farT) { this.move(e); return; } }
      else e.farT = 0;
    }
    if (st === 'sleep') {
      e.vx = e.vy = 0;
      e.ang = e.sleepAng;
      e.sleepT += dt;
      this.grow(e);
      if (d < L.r) this.wake(e, false);
      return;
    }
    if (st === 'rise') {
      e.vx = e.vy = 0;
      e.riseT -= dt;
      if (e.riseT <= 0) e.state = 'fight';
      return;
    }
    if (st === 'return') {
      if (d < Math.max(CFG.boss.engage, Game.viewRadius() + 80)) { e.state = 'fight'; }
      else {
        var da = U.dist(e.x, e.y, e.anchorX, e.anchorY);
        if (da > 30) {
          var a = U.angleTo(e.x, e.y, e.anchorX, e.anchorY);
          e.vx = Math.cos(a) * e.speed * 1.6;
          e.vy = Math.sin(a) * e.speed * 1.6;
        } else {
          e.vx = e.vy = 0;
          e.hp = Math.min(e.maxHp, e.hp + e.maxHp * CFG.boss.regen * dt);
          if (e.hp >= e.maxHp) { e.state = 'sleep'; e.zz = true; e.sleepAng = e.ang; }
        }
        e.aim = 0; e.charge = 0;
        return;
      }
    }
    if (this.chase(e, dt, d)) return;
    if (e.openT > 0) {
      e.openT -= dt;
      e.vx = e.vy = 0;
      if (e.openT <= 0) { e.openK = 1; e.openW = ''; }
      return;
    }
    var bd = e.bd;
    if (bd.phases && !e.mech) {
      var ph = 0, f = e.hp / e.maxHp;
      for (var i = 0; i < bd.phases.length; i++) if (f < (i ? bd.phases[i] : Nakal.phase(bd.phases[0]))) ph = i + 1;
      if (ph > e.ph) { this.phaseUp(e, ph); return; }
    }
    bd.ai(e, dt, d);
    if (d > this.K.chase.from && !(e.aim > 0) && !(e.charge > 0) && !(e.openT > 0) && !e.mech && !e.rep && !e.inv) {
      var asp = this.chaseSpeed(e, d);
      if (e.vx * e.vx + e.vy * e.vy < asp * asp) {
        var ca = Math.atan2(Game.player.y - e.y, Game.player.x - e.x);
        e.vx = Math.cos(ca) * asp; e.vy = Math.sin(ca) * asp;
      }
    }
  },

  chaseSpeed: function (e, d) {
    var C = this.K.chase;
    return Math.min(Math.max(e.speed, C.max), e.speed + Math.max(0, d - C.from) * C.k);
  },
  chase: function (e, dt, d) {
    if (e.rep || e.bd === this.queen) return false;
    var C = this.K.chase, p = Game.player;
    if (e.tpW > 0) {
      e.tpW -= dt;
      if (e.tpW <= 0) {
        FX.burst(e.x, e.y, 14, e.bd.trim, 200, 0.4, 3);
        e.x = e.tpX; e.y = e.tpY;
        e.tpT = 0;
        FX.ring(e.x, e.y, e.r, e.r + 240, e.bd.trim, 0.7, 6, true);
        FX.burst(e.x, e.y, 24, e.bd.trim, 260, 0.6, 4);
        FX.shake(8);
        d = U.dist(e.x, e.y, p.x, p.y);
      }
    } else if (d > C.tp) {
      e.tpT += dt;
      if (e.tpT > C.tpT) {
        var s = this.spot(p.x, p.y, C.tpMin, C.tpMax, Math.atan2(this.headY, this.headX), e);
        e.tpX = s.x; e.tpY = s.y; e.tpW = C.tpTell;
        this.mark({ k: 'disc', x: s.x, y: s.y, r: e.r * 2.2, t: C.tpTell, c: e.bd.trim, o: e });
        FX.ring(s.x, s.y, 10, e.r * 2.2, e.bd.trim, C.tpTell, 4, true);
        Snd.play('tell');
        this.emit('move', e);
      }
    } else e.tpT = 0;
    if (!e.chase && d > C.on) {
      e.chase = true;
      var tw = e.tpW, keep = e.inv && this.pylonsAlive(e) ? e.pyl : null;
      if (keep) e.pyl = [];
      this.reset(e);
      if (keep) { e.pyl = keep; e.inv = true; }
      if (tw > 0) this.mark({ k: 'disc', x: e.tpX, y: e.tpY, r: e.r * 2.2, t: tw, c: e.bd.trim, o: e });
      e.aim = 0; e.charge = 0;
    } else if (e.chase && d < C.off && !(e.tpW > 0)) {
      e.chase = false;
      e.t1 = U.rand(1.5, 2.5); e.t2 = U.rand(4, 6);
    }
    if (!e.chase) return false;
    var sp = this.chaseSpeed(e, d), a = Math.atan2(p.y - e.y, p.x - e.x);
    e.ang = a;
    e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp;
    return true;
  },

  beamW: 36,

  K: {
    chase: { from: 650, k: 0.9, max: 720, on: 950, off: 700, tp: 1600, tpT: 3, tpTell: 1.1, tpMin: 560, tpMax: 720 },
    crusher: { n: 20, gap: 1.05, sp: 200, tell: 0.8, cd: [2.2, 2.8], off: [0.65, 1.15], back: 0.25, salvos: 3, heat: 3, heatK: 2 },
    driller: { sp: 900, time: 1.0, stuck: 3, stuckK: 2, dig: 1.0, digK: 1.3 },
    sapper: { stun: 2, stunK: 1.5, self: 0.02, chain: 0.12 },
    frostmaw: { tell: 0.75, cd: [4, 5], sp: 150, max: 560, band: 34, frz: 1, tired: 2, tiredK: 1.5 },
    weaver: { pylons: 3, pylonR: 200, stay: 110, lost: 600, maxPyl: 9, pylonHp: 0.03, bare: 10, pull: 120, tieT: 4, tieTell: 0.6, tieCd: [4, 6], snap: 2, snapK: 1.5 },
    lancer: { tell: 0.8, cd: [1.6, 2.2], len: 620, w: 34, fly: 1500, stand: 6, wall: 150, max: 4, unarmed: 2.5, unarmedK: 1.5,
      jumpCd: 1.4, jumpTell: 0.7, jumpT: 0.5, slamR: 130, dizzy: 2, dizzyK: 1.6 },
    warden: { safe: 58, len: 540, spin: 0.9, walk: 320, revCd: [8, 11], revTell: 0.7, inMax: 2.4, pulseTell: 0.9, push: 80, cool: 2.2, coolK: 1.6 },
    titan: { tell: 0.7, cd: [2.4, 3.2], sp: 230, max: 560, band: 40, slams: 3, sit: 3, sitK: 2,
      throws: 2, throwTell: 0.6, throwCd: 1.3, fly: 1.0, arc: 220, rockR: 95, wallR: 55, stand: 8, rocks: 4 },
    hive: { tell: 0.8, cd: [3.2, 4.2], brood: 9, broods: 3, empty: 2.5, emptyK: 1.6,
      combs: 3, combR: 230, combHp: 0.05, replant: 10, cd2: [5.5, 7], brood2: 5,
      spitCd: [3.2, 4.4], spitT: 0.9, acidR: 80, acidT: 4, snap: 1.5, snapK: 1.5,
      larvae: 9, larvaCd: [5.5, 7], fuseD: 75, fuse: 0.55, popR: 85, popK: 0.7, spent: 2, spentK: 1.5 },
    phantom: { cd: [2.6, 3.6], tell: 0.45, every: 3, solid: 1.6, solidK: 1.5, breakHp: 0.08, snap: 1.6, snapK: 1.5, resplit: 3,
      rushCd: [1.0, 1.5], rushTell: 0.5, rushSp: 950, over: 260, cutW: 30, cutT: 1.4, rushes: 3, tired: 2, tiredK: 1.6 },
    queen: { first: 5, cd: [8, 10], again: 2.5, rainT: 1.1, n: [5, 6, 8, 7], r: 70, lie: 0.9, back: 760, dmg: 0.8, over: 2.6, overK: 1.8,
      cd4: [2.6, 3.4], wallT: 8, walls: 8, wallR: 46, over4: 1.8, wallC: '#ff8a3a' }
  },
  marks: [],
  still: { x: 0, y: 0 },
  frost: [],
  spears: [],
  zones: [],
  rocks: [],
  globs: [],
  scrap: [],
  tmpA: [],

  clear: function () {
    this.marks.length = 0; this.frost.length = 0; this.spears.length = 0;
    this.zones.length = 0; this.rocks.length = 0; this.globs.length = 0; this.scrap.length = 0;
  },

  mark: function (m) { m.T = m.t; this.marks.push(m); return m; },
  zone: function (z) { z.T = z.t; this.zones.push(z); return z; },

  open: function (e, sec, k, kind) {
    e.openT = sec; e.openK = k; e.openW = kind;
    e.aim = 0; e.charge = 0; e.tie = 0; e.lift = 0;
    if (k > 1) {
      FX.ring(e.x, e.y, e.r, e.r + 70, '#ffd27d', 0.5, 4);
      Snd.play('open');
    }
  },

  reset: function (e) {
    e.openT = 0; e.openK = 1; e.openW = '';
    e.inv = false; e.n1 = 0; e.n2 = 0; e.mode = 0; e.tie = 0; e.jump = 0; e.lift = 0;
    e.ph = e.ph || 0;
    e.m = e.m || {};
    e.m.safe = 0; e.m.inT = 0;
    if (e.twin) { e.twin.dead = true; e.twin = null; }
    if (e.qs) e.qs = 0;
    this.dropPylons(e);
    var A = [this.spears, this.frost, this.marks, this.zones, this.rocks, this.globs, this.scrap];
    for (var a = 0; a < A.length; a++) {
      var L = A[a];
      for (var i = L.length - 1; i >= 0; i--) if (L[i].o === e) L.splice(i, 1);
    }
  },

  phaseUp: function (e, ph) {
    e.ph = ph;
    this.reset(e);
    e.ph = ph;
    FX.ring(e.x, e.y, e.r, e.r + 260, e.bd.trim, 0.8, 7, true);
    FX.burst(e.x, e.y, 30, e.bd.trim, 280, 0.6, 4);
    FX.shake(12);
    Snd.play('phase');
    if (e.bd.onPhase) e.bd.onPhase(e, ph);
    this.open(e, 1.2, 1, 'phase');
  },

  rayOut: { d: 0, hit: false },
  ray: function (x, y, a, max) {
    var cx = Math.cos(a), cy = Math.sin(a), o = this.rayOut;
    for (var s = 16; s < max; s += 16) {
      if (World.blocked(x + cx * s, y + cy * s)) { o.d = s; o.hit = true; return o; }
    }
    o.d = max; o.hit = false;
    return o;
  },

  plant: function (e, more) {
    var K = this.K.weaver, n = K.pylons, a0 = Math.random() * 6.28, had = 0;
    e.pyl = e.pyl || [];
    if (more) {
      for (var j = e.pyl.length - 1; j >= 0; j--) if (e.pyl[j].dead) e.pyl.splice(j, 1);
      had = e.pyl.length;
      n = Math.min(n, K.maxPyl - had);
    } else e.pyl.length = 0;
    e.m.px = e.x; e.m.py = e.y;
    var OFF = [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05], RK = [1, 0.65];
    for (var i = 0; i < n; i++) {
      var x = 0, y = 0, ok = false;
      for (var t = 0; t < OFF.length * RK.length && !ok; t++) {
        var a = a0 + i / K.pylons * Math.PI * 2 + OFF[t % OFF.length], rr = K.pylonR * RK[Math.floor(t / OFF.length)];
        x = e.x + Math.cos(a) * rr; y = e.y + Math.sin(a) * rr;
        ok = World.freeAt(x, y, 30);
      }
      if (!ok) continue;
      var s = Enemies.summon('pylon', x, y);
      if (!s) continue;
      s.hp = s.maxHp = e.maxHp * K.pylonHp;
      s.owner = e;
      e.pyl.push(s);
      FX.ring(x, y, 6, 60, e.bd.trim, 0.4, 3);
    }
    e.inv = e.pyl.length > 0;
    if (!e.inv) { e.n1 = 2; return; }
    if (e.pyl.length > had) Snd.play('tell');
  },
  pylonsAlive: function (e) {
    var n = 0, P = e.pyl;
    if (P) for (var i = 0; i < P.length; i++) if (!P[i].dead) n++;
    return n;
  },
  dropPylons: function (e) {
    var P = e.pyl;
    if (!P) return;
    for (var i = 0; i < P.length; i++) {
      if (P[i].dead) continue;
      P[i].dead = true;
      FX.burst(P[i].x, P[i].y, 10, e.bd.trim, 160, 0.4, 3);
    }
    P.length = 0;
  },

  throwSpear: function (e, a, len) {
    var K = this.K.lancer;
    this.mark({ k: 'line', x: e.x, y: e.y, a: a, len: len, w: K.w, t: K.tell, c: '#ff4d6d', o: e });
    this.spears.push({ x0: e.x, y0: e.y, x: e.x, y: e.y, a: a, len: len, fly: -K.tell, t: K.stand, hit: false, o: e });
    Snd.play('tell');
    var mine = this.spearsOf(e);
    if (mine.length > K.max) this.dropSpear(mine[0]);
  },
  spearsOf: function (e) {
    var out = this.tmpA;
    out.length = 0;
    for (var i = 0; i < this.spears.length; i++) { var s = this.spears[i]; if (s.o === e && s.fly >= 1) out.push(s); }
    return out;
  },
  dropSpear: function (s) {
    var i = this.spears.indexOf(s);
    if (i >= 0) this.spears.splice(i, 1);
    FX.burst(s.x, s.y, 10, '#c0a8ff', 160, 0.4, 3);
  },

  combs: function (e) {
    var K = this.K.hive, a0 = Math.random() * 6.28;
    e.pyl = e.pyl || [];
    e.pyl.length = 0;
    for (var i = 0; i < K.combs; i++) {
      var a = a0 + i / K.combs * Math.PI * 2, x = e.x + Math.cos(a) * K.combR, y = e.y + Math.sin(a) * K.combR;
      for (var t = 0; t < 4 && !World.freeAt(x, y, 30); t++) { a += 0.5; x = e.x + Math.cos(a) * K.combR; y = e.y + Math.sin(a) * K.combR; }
      var s = Enemies.summon('comb', x, y);
      if (!s) continue;
      s.hp = s.maxHp = e.maxHp * K.combHp;
      s.owner = e;
      s.shootCd = U.rand(1.2, 2.6);
      e.pyl.push(s);
      FX.burst(e.x, e.y, 10, e.bd.trim, 200, 0.4, 3);
      FX.ring(x, y, 6, 60, e.bd.trim, 0.4, 3);
    }
    e.m.cn = e.pyl.length;
    Snd.play('shotBig');
  },
  combStep: function (s, dt) {
    var o = s.owner, K = this.K.hive, p = Game.player;
    if (!o || o.state !== 'fight' || o.openT > 0) return;
    s.shootCd -= dt;
    if (s.shootCd > 0 || U.dist2(s.x, s.y, p.x, p.y) > 700 * 700) return;
    s.shootCd = U.rand(K.spitCd[0], K.spitCd[1]);
    var tx = p.x + Input.move.x * p.st.speed * 0.4, ty = p.y + Input.move.y * p.st.speed * 0.4;
    this.mark({ k: 'disc', x: tx, y: ty, r: K.acidR, t: K.spitT, c: '#9fe05a', o: s });
    this.globs.push({ x0: s.x, y0: s.y, x: s.x, y: s.y, tx: tx, ty: ty, k: 0, h: 0, T: K.spitT, dmg: o.dmg * 0.45, o: o });
    Snd.play('spit');
  },
  larvae: function (e) {
    var K = this.K.hive;
    for (var i = 0; i < K.larvae; i++) {
      var a = e.ang + (i / (K.larvae - 1) - 0.5) * 2.4, rr = e.r + 20;
      var s = Enemies.summon('larva', e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr);
      if (!s) continue;
      s.owner = e;
      s.speed *= U.rand(0.85, 1.15);
    }
    FX.ring(e.x, e.y, e.r, e.r + 140, '#ff9a4a', 0.6, 5);
    FX.shake(5);
    Snd.play('larvae');
  },
  larvaStep: function (s, dt, d, sp) {
    var K = this.K.hive, o = s.owner;
    if (!o || o.dead || o.state !== 'fight') { s.dead = true; return; }
    if (s.aim > 0) {
      s.vx = s.vy = 0;
      s.aim -= dt;
      if (s.aim <= 0) {
        var p = Game.player;
        s.dead = true;
        FX.burst(s.x, s.y, 16, '#ff9a4a', 220, 0.45, 4);
        FX.ring(s.x, s.y, 10, K.popR, '#ff9a4a', 0.3, 4);
        Snd.play('pop');
        if (U.dist2(s.x, s.y, p.x, p.y) < (K.popR + p.r * 0.5) * (K.popR + p.r * 0.5) && p.dashT <= 0) p.hurt(o.dmg * K.popK);
      }
      return;
    }
    s.vx = Math.cos(s.ang) * sp; s.vy = Math.sin(s.ang) * sp;
    if (d < K.fuseD) {
      s.aim = K.fuse;
      this.mark({ k: 'disc', x: s.x, y: s.y, r: K.popR, t: K.fuse, c: '#ff7a3a', o: s });
      Snd.play('larvaFuse');
    }
  },

  blink: function (e, x, y, owner) {
    var o = owner || e, p = Game.player;
    FX.ring(e.x, e.y, e.r, 10, o.bd.trim, 0.3, 3);
    FX.burst(e.x, e.y, 14, o.bd.trim, 200, 0.4, 3);
    e.x = x; e.y = y;
    e.ang = U.angleTo(e.x, e.y, p.x, p.y);
    FX.ring(e.x, e.y, 10, e.r + 40, o.bd.trim, 0.35, 3);
    for (var i = -2; i <= 2; i++) {
      Game.spawnEnemyBullet(e.x, e.y, e.ang + i * 0.16, 300, o.dmg * 0.45, CFG.col.enemyShot);
    }
    if (!owner) Snd.play('blink');
  },
  split: function (e) {
    var p = Game.player, a = U.angleTo(p.x, p.y, e.x, e.y) + (Math.random() < 0.5 ? 1 : -1) * U.rand(1.2, 2.2);
    var d = U.dist(p.x, p.y, e.x, e.y);
    var tw = Enemies.summon('decoy', p.x + Math.cos(a) * d, p.y + Math.sin(a) * d);
    if (!tw) { e.n2 = 1; return; }
    tw.owner = e; tw.r = e.r; tw.ang = e.ang;
    e.twin = tw;
    e.m.hp0 = e.hp;
    FX.burst(e.x, e.y, 24, e.bd.trim, 260, 0.5, 4);
    FX.ring(tw.x, tw.y, 10, tw.r + 60, e.bd.trim, 0.4, 4);
    FX.ring(e.x, e.y, 10, e.r + 60, e.bd.trim, 0.4, 4);
    Snd.play('decoy');
  },
  rush: function (e, dt, d, K) {
    var p = Game.player;
    if (e.charge > 0) {
      e.charge -= dt;
      e.vx = e.vy = 0;
      e.x += Math.cos(e.chargeAng) * K.rushSp * dt;
      e.y += Math.sin(e.chargeAng) * K.rushSp * dt;
      var sl = U.dist(e.m.cx, e.m.cy, e.x, e.y);
      if (sl > 60 || e.charge <= 0) {
        this.zone({ k: 'line', x: e.m.cx, y: e.m.cy, a: e.chargeAng, len: sl + 4, w: K.cutW, t: K.cutT, dmg: e.dmg * 0.4, c: e.bd.trim, o: e });
        e.m.cx = e.x; e.m.cy = e.y;
      }
      if (U.dist2(e.x, e.y, p.x, p.y) < (e.r + p.r) * (e.r + p.r) && p.dashT <= 0) p.hurt(e.dmg * 0.6);
      if (e.charge <= 0) {
        for (var i = -1; i <= 1; i++) Game.spawnEnemyBullet(e.x, e.y, e.ang + i * 0.2, 300, e.dmg * 0.4, CFG.col.enemyShot);
        if (++e.n1 >= K.rushes) { e.n1 = 0; this.open(e, K.tired, K.tiredK, 'tired'); }
      }
      return;
    }
    if (e.aim > 0) {
      e.vx = e.vy = 0;
      e.aim -= dt;
      if (e.aim <= 0) { e.charge = e.m.len / K.rushSp; e.m.cx = e.x; e.m.cy = e.y; Snd.play('slash'); }
      return;
    }
    this.approach(e, d, 280, 1.6, 0.6);
    e.t1 -= dt;
    if (e.t1 <= 0) {
      e.t1 = U.rand(K.rushCd[0], K.rushCd[1]);
      e.chargeAng = e.ang;
      e.m.len = Math.min(900, d + K.over);
      e.aim = K.rushTell;
      this.mark({ k: 'line', x: e.x, y: e.y, a: e.chargeAng, len: e.m.len, w: e.r * 1.4, t: K.rushTell, c: e.bd.trim, o: e });
      Snd.play('rushTell');
    }
  },

  throwRock: function (e, tx, ty) {
    var K = this.K.titan, n = 0, first = -1;
    for (var i = 0; i < this.rocks.length; i++) if (this.rocks[i].o === e) { n++; if (first < 0) first = i; }
    if (n >= K.rocks) this.rocks.splice(first, 1);
    this.rocks.push({ x0: e.x, y0: e.y, x: e.x, y: e.y, tx: tx, ty: ty, k: 0, h: 0, t: K.stand, dmg: e.dmg * 0.8, o: e });
    FX.burst(e.x, e.y, 16, '#c9b08a', 220, 0.5, 4);
    Snd.play('rockThrow');
  },

  scrapOf: function (e) {
    for (var i = 0; i < this.scrap.length; i++) if (this.scrap[i].o === e && this.scrap[i].st !== 3) return true;
    return false;
  },
  wallCap: function (q) {
    var n = 0, old = -1, ot = 1e9, SC = this.scrap;
    for (var i = 0; i < SC.length; i++) {
      if (SC[i].o !== q || SC[i].st !== 3) continue;
      n++;
      if (SC[i].t < ot) { ot = SC[i].t; old = i; }
    }
    if (n > this.K.queen.walls && old >= 0) SC[old].t = 0.01;
  },
  queenScrap: function (e, dt, d) {
    var K = this.K.queen, p = Game.player;
    if (e.qs) {
      e.vx = e.vy = 0;
      if (!this.scrapOf(e)) {
        e.qs = 0;
        var four = e.qph === 3;
        e.q1 = four ? U.rand(K.cd4[0], K.cd4[1]) : U.rand(K.cd[0], K.cd[1]);
        this.open(e, four ? K.over4 : K.over, K.overK, 'heat');
      }
      return true;
    }
    e.q1 -= dt;
    if (e.q1 > 0 || e.aim > 0 || e.charge > 0 || e.jump > 0 || e.tie > 0 || e.mode === 2) return false;
    e.qs = 1;
    var n = K.n[Math.max(0, e.qph)] || K.n[0];
    for (var i = 0; i < n; i++) {
      var x = p.x + Input.move.x * p.st.speed * 0.5, y = p.y + Input.move.y * p.st.speed * 0.5;
      if (i > 0) { var a = i / (n - 1) * Math.PI * 2 + Math.random(), rr = U.rand(100, 270); x += Math.cos(a) * rr; y += Math.sin(a) * rr; }
      var t = K.rainT + i * 0.07, wall = e.qph === 3 && i % 2 === 1;
      this.scrap.push({ x: x, y: y, st: 0, t: t, T: t, hit: false, o: e, wall: wall });
      this.mark({ k: 'disc', x: x, y: y, r: K.r, t: t, c: wall ? K.wallC : '#ffcf4a', o: e });
    }
    FX.ring(e.x, e.y, e.r, e.r + 160, '#ffcf4a', 0.6, 5);
    Snd.play('rainTell');
    return true;
  },

  update: function (dt) {
    var p = Game.player, i, M = this.marks;
    for (i = M.length - 1; i >= 0; i--) {
      var m = M[i];
      m.t -= dt;
      if (m.follow) { m.x = m.o.x; m.y = m.o.y; }
      if (m.t <= 0 || (m.o && (m.o.dead || (m.o.boss && m.o.state !== 'fight')))) M.splice(i, 1);
    }
    var F = this.frost, KF = this.K.frostmaw;
    for (i = F.length - 1; i >= 0; i--) {
      var w = F[i];
      w.r += w.sp * dt;
      if (!w.hit && p.alive) {
        var d = U.dist(w.x, w.y, p.x, p.y);
        if (Math.abs(d - w.r) < (w.band || KF.band) / 2 + p.r * 0.5 && p.dashT <= 0 && p.inv <= 0) {
          w.hit = true;
          p.hurt(w.dmg);
          if (!w.q) { p.frzT = KF.frz; Player.debuffText(p, 'frz'); FX.burst(p.x, p.y, 14, '#bfe8ff', 160, 0.5, 3); Snd.play('freeze'); }
        }
      }
      if (w.r >= w.max || w.o.dead) F.splice(i, 1);
    }
    var Z = this.zones;
    for (i = Z.length - 1; i >= 0; i--) {
      var z = Z[i];
      z.t -= dt;
      if (z.t <= 0 || z.o.dead || z.o.state !== 'fight') { Z.splice(i, 1); continue; }
      if (p.alive && p.dashT <= 0 && p.inv <= 0 && this.inZone(z, p.x, p.y, p.r * 0.5)) p.hurt(z.dmg);
    }
    var G = this.globs, KH = this.K.hive;
    for (i = G.length - 1; i >= 0; i--) {
      var g = G[i];
      if (g.o.dead || g.o.state !== 'fight') { G.splice(i, 1); continue; }
      g.k = Math.min(1, g.k + dt / g.T);
      g.x = g.x0 + (g.tx - g.x0) * g.k; g.y = g.y0 + (g.ty - g.y0) * g.k;
      g.h = Math.sin(Math.PI * g.k) * 150;
      if (g.k >= 1) {
        G.splice(i, 1);
        FX.burst(g.x, g.y, 12, '#9fe05a', 160, 0.4, 3);
        Snd.play('acid');
        this.zone({ k: 'disc', x: g.x, y: g.y, r: KH.acidR, t: KH.acidT, dmg: g.dmg, c: '#9fe05a', o: g.o });
      }
    }
    var R = this.rocks, KT = this.K.titan;
    for (i = R.length - 1; i >= 0; i--) {
      var rk = R[i];
      if (rk.o.dead || rk.o.state !== 'fight') { R.splice(i, 1); continue; }
      if (rk.k < 1) {
        rk.k = Math.min(1, rk.k + dt / KT.fly);
        rk.x = rk.x0 + (rk.tx - rk.x0) * rk.k; rk.y = rk.y0 + (rk.ty - rk.y0) * rk.k;
        rk.h = Math.sin(Math.PI * rk.k) * KT.arc;
        if (rk.k >= 1) {
          rk.h = 0;
          FX.burst(rk.x, rk.y, 22, '#c9b08a', 260, 0.6, 4);
          FX.ring(rk.x, rk.y, 20, KT.rockR, '#ffb35c', 0.35, 4);
          FX.shake(8);
          Snd.play('rockLand');
          if (p.alive && p.dashT <= 0 && U.dist2(rk.x, rk.y, p.x, p.y) < (KT.rockR + p.r * 0.5) * (KT.rockR + p.r * 0.5)) p.hurt(rk.dmg);
        }
        continue;
      }
      rk.t -= dt;
      if (rk.t <= 0) { FX.burst(rk.x, rk.y, 14, '#c9b08a', 180, 0.5, 3); R.splice(i, 1); continue; }
      this.pushRound(p, rk.x, rk.y, KT.wallR);
    }
    var SC = this.scrap, KQ = this.K.queen;
    for (i = SC.length - 1; i >= 0; i--) {
      var c = SC[i], q = c.o;
      if (q.dead || q.state !== 'fight') { SC.splice(i, 1); continue; }
      if (c.st === 0) {
        c.t -= dt;
        if (c.t <= 0) {
          c.st = 1; c.t = KQ.lie;
          FX.burst(c.x, c.y, 14, '#ffcf4a', 220, 0.45, 3);
          FX.ring(c.x, c.y, 10, KQ.r, '#ffcf4a', 0.3, 3);
          Snd.play(c.wall ? 'scrapWall' : 'scrapLand');
          if (p.alive && p.dashT <= 0 && U.dist2(c.x, c.y, p.x, p.y) < (KQ.r + p.r * 0.5) * (KQ.r + p.r * 0.5)) p.hurt(q.dmg * KQ.dmg);
          if (c.wall) { c.st = 3; c.t = KQ.wallT; this.wallCap(q); FX.shake(6); continue; }
          var dq = U.dist(c.x, c.y, q.x, q.y);
          this.mark({ k: 'line', x: c.x, y: c.y, a: U.angleTo(c.x, c.y, q.x, q.y), len: dq, w: 30, t: KQ.lie, c: '#ffcf4a', o: q });
        }
      } else if (c.st === 1) {
        c.t -= dt;
        if (c.t <= 0) { c.st = 2; Snd.play('scrapBack'); }
      } else if (c.st === 3) {
        c.t -= dt;
        if (c.t <= 0) { FX.burst(c.x, c.y, 14, '#c9b08a', 180, 0.5, 3); SC.splice(i, 1); continue; }
        this.pushRound(p, c.x, c.y, KQ.wallR);
      } else {
        var ca = U.angleTo(c.x, c.y, q.x, q.y);
        c.x += Math.cos(ca) * KQ.back * dt; c.y += Math.sin(ca) * KQ.back * dt;
        if (!c.hit && p.alive && p.dashT <= 0 && U.dist2(c.x, c.y, p.x, p.y) < (p.r + 22) * (p.r + 22)) { c.hit = true; p.hurt(q.dmg * KQ.dmg); }
        if (U.dist2(c.x, c.y, q.x, q.y) < q.r * q.r) { FX.burst(q.x, q.y, 8, '#ffcf4a', 160, 0.3, 3); SC.splice(i, 1); }
      }
    }
    var S = this.spears, KL = this.K.lancer;
    for (i = S.length - 1; i >= 0; i--) {
      var s = S[i];
      if (s.o.dead || s.o.state !== 'fight') { S.splice(i, 1); continue; }
      if (s.fly < 0) { s.fly += dt; if (s.fly >= 0) { s.fly = 0.0001; Snd.play('shot'); } continue; }
      if (s.fly < 1) {
        s.fly = Math.min(1, s.fly + KL.fly * dt / s.len);
        s.x = s.x0 + Math.cos(s.a) * s.len * s.fly;
        s.y = s.y0 + Math.sin(s.a) * s.len * s.fly;
        if (!s.hit && U.dist2(s.x, s.y, p.x, p.y) < (p.r + 14) * (p.r + 14)) { s.hit = true; p.hurt(s.o.dmg * 0.6); }
        if (s.fly >= 1) { FX.burst(s.x, s.y, 12, '#c9b08a', 180, 0.4, 3); FX.shake(4); }
        continue;
      }
      s.t -= dt;
      if (s.t <= 0) { S.splice(i, 1); continue; }
      this.pushOut(p, s, KL.wall / 2);
    }
  },

  inZone: function (z, x, y, pad) {
    var dx = x - z.x, dy = y - z.y;
    if (z.k === 'disc') return dx * dx + dy * dy < (z.r + pad) * (z.r + pad);
    var ca = Math.cos(z.a), sa = Math.sin(z.a), al = dx * ca + dy * sa;
    return al > -pad && al < z.len + pad && Math.abs(-dx * sa + dy * ca) < z.w / 2 + pad;
  },
  pushRound: function (o, x, y, R) {
    var dx = o.x - x, dy = o.y - y, d2 = dx * dx + dy * dy, rr = R + o.r;
    if (d2 >= rr * rr) return;
    var d = Math.sqrt(d2) || 0.01;
    if (d2 < 0.0001) { dx = 1; dy = 0; d = 1; }
    o.x = x + dx / d * rr;
    o.y = y + dy / d * rr;
  },

  pushOut: function (o, s, half) {
    var nx = -Math.sin(s.a), ny = Math.cos(s.a);
    var dx = o.x - s.x, dy = o.y - s.y;
    var along = U.clamp(dx * nx + dy * ny, -half, half);
    var cx = s.x + nx * along, cy = s.y + ny * along;
    var ex = o.x - cx, ey = o.y - cy, d2 = ex * ex + ey * ey, rr = o.r + 8;
    if (d2 >= rr * rr) return;
    var d = Math.sqrt(d2) || 0.01;
    if (d2 < 0.0001) { ex = Math.cos(s.a); ey = Math.sin(s.a); d = 1; }
    o.x = cx + ex / d * rr;
    o.y = cy + ey / d * rr;
  },

  mineBlast: function (m) {
    var list = Game.enemies, K = this.K.sapper;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (!e.boss || e.dead || e.state !== 'fight' || (e.mech || e.bd.id) !== 'sapper') continue;
      if (U.dist2(e.x, e.y, m.x, m.y) > m.r * m.r) continue;
      if (e.openT > 0) continue;
      Enemies.damage(e, e.maxHp * K.self * (e.mech ? 0.35 : 1), true, m.x, m.y, 0);
      if (!e.dead) this.open(e, K.stun, K.stunK, 'stun');
    }
  },

  drawMarks: function (ctx) {
    var i, M = this.marks;
    ctx.save();
    for (i = 0; i < M.length; i++) {
      var m = M[i], k = 1 - m.t / m.T;
      ctx.globalAlpha = 0.18 + 0.3 * k;
      ctx.fillStyle = ctx.strokeStyle = m.c;
      ctx.beginPath();
      if (m.k === 'line') {
        ctx.lineWidth = m.w;
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x + Math.cos(m.a) * m.len, m.y + Math.sin(m.a) * m.len);
        ctx.stroke();
      } else if (m.k === 'disc') {
        ctx.arc(m.x, m.y, m.r * Math.max(0.15, k), 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (m.k === 'fan') {
        if (!m.ring) {
          ctx.moveTo(m.x, m.y);
          ctx.arc(m.x, m.y, m.r, m.a - m.hw, m.a + m.hw);
          ctx.closePath();
          ctx.fill();
        }
        if (m.ring) {
          ctx.strokeStyle = m.rc; ctx.lineWidth = 6;
          ctx.beginPath();
          for (var ri = 0; ri < m.ring; ri++) {
            var ra = m.a + m.hw + (ri + 0.5) / m.ring * (Math.PI * 2 - m.hw * 2), rl = m.rin + 70 + 200 * k;
            ctx.moveTo(m.x + Math.cos(ra) * m.rin, m.y + Math.sin(ra) * m.rin);
            ctx.lineTo(m.x + Math.cos(ra) * rl, m.y + Math.sin(ra) * rl);
          }
          ctx.stroke();
        }
      }
    }
    for (i = 0; i < this.zones.length; i++) {
      var z = this.zones[i];
      ctx.globalAlpha = 0.45 * Math.min(1, z.t / 0.4);
      ctx.fillStyle = ctx.strokeStyle = z.c;
      ctx.beginPath();
      if (z.k === 'disc') { ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.lineWidth = z.w; ctx.moveTo(z.x, z.y); ctx.lineTo(z.x + Math.cos(z.a) * z.len, z.y + Math.sin(z.a) * z.len); ctx.stroke(); }
    }
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#8a7a66';
    for (i = 0; i < this.rocks.length; i++) {
      var rk = this.rocks[i], rr = rk.k < 1 ? 28 + rk.h * 0.08 : this.K.titan.wallR;
      ctx.beginPath(); ctx.arc(rk.x, rk.y - rk.h * 0.5, rr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#9fe05a';
    for (i = 0; i < this.globs.length; i++) { var g = this.globs[i]; ctx.beginPath(); ctx.arc(g.x, g.y - g.h * 0.5, 9, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#ffcf4a';
    for (i = 0; i < this.scrap.length; i++) {
      var c = this.scrap[i];
      if (c.st === 0) continue;
      if (c.st === 3) { ctx.fillStyle = '#8a7a60'; ctx.fillRect(c.x - 40, c.y - 30, 80, 60); ctx.fillStyle = '#ffcf4a'; continue; }
      ctx.fillRect(c.x - 12, c.y - 8, 24, 16);
    }
    ctx.globalAlpha = 0.8;
    for (i = 0; i < this.frost.length; i++) {
      var w = this.frost[i];
      ctx.strokeStyle = w.q ? w.c : '#bfe8ff';
      ctx.lineWidth = w.band || this.K.frostmaw.band;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = '#c0a8ff';
    for (i = 0; i < this.spears.length; i++) {
      var s = this.spears[i];
      if (s.fly < 0) continue;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(s.x - Math.cos(s.a) * 60, s.y - Math.sin(s.a) * 60);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
      if (s.fly >= 1) {
        var h = this.K.lancer.wall / 2, nx = -Math.sin(s.a), ny = Math.cos(s.a);
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(s.x - nx * h, s.y - ny * h);
        ctx.lineTo(s.x + nx * h, s.y + ny * h);
        ctx.stroke();
      }
    }
    ctx.restore();
  },

  approach: function (e, d, want, farMul, nearMul) {
    var sp = e.speed * (d > want ? farMul : nearMul);
    e.vx = Math.cos(e.ang) * sp;
    e.vy = Math.sin(e.ang) * sp;
  },

  body: function (ctx, e, bd, x, y, ang, alpha, noShadow) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(ang);

    ctx.globalAlpha = noShadow ? 0 : alpha * 0.25;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, e.r * 0.3, e.r, e.r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;

    var charging = (e.aim > 0) || (e.shield > 0);
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : (charging ? '#8a97a4' : bd.body);
    ctx.strokeStyle = bd.trim;
    ctx.lineWidth = 3;

    if (bd.id === 'lancer') {
      ctx.beginPath();
      ctx.moveTo(e.r * 2.1, 0);
      ctx.lineTo(e.r * 0.5, -e.r * 0.62);
      ctx.lineTo(-e.r * 1.5, -e.r * 0.5);
      ctx.lineTo(-e.r * 1.9, 0);
      ctx.lineTo(-e.r * 1.5, e.r * 0.5);
      ctx.lineTo(e.r * 0.5, e.r * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = bd.trim;
      ctx.fillRect(-e.r * 1.2, -e.r * 0.16, e.r * 2.2, e.r * 0.32);
    } else {
      ctx.beginPath();
      var sides = bd.shape;
      for (var i = 0; i < sides; i++) {
        var a = i / sides * Math.PI * 2 + Math.PI / sides;
        var px = Math.cos(a) * e.r, py = Math.sin(a) * e.r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = bd.trim;
      ctx.beginPath();
      ctx.arc(e.r * 0.3, 0, e.r * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  },

  draw: function (ctx, e) {
    var bd = e.bd, st = e.state, mid = e.mech || bd.id;
    if (st === 'sleep' || st === 'rise' || st === 'return') {
      var k = st === 'rise' ? e.riseT / CFG.boss.lair.rise : 1;
      ctx.save();
      ctx.globalAlpha = (0.35 + 0.15 * Math.sin(Game.time * 2.2 + e.phase)) * k;
      ctx.strokeStyle = bd.trim;
      ctx.lineWidth = 4;
      ctx.setLineDash([20, 14]);
      ctx.beginPath();
      ctx.arc(e.anchorX, e.anchorY, CFG.boss.lair.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.setLineDash([]);
    }
    if (st === 'sleep') {
      this.body(ctx, e, bd, e.x, e.y, e.ang, 0.55);
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#e8d5bd';
      ctx.font = '700 16px Verdana, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('z z', e.x, e.y - e.r - 12);
      ctx.globalAlpha = 1;
      return;
    }
    GlowCache.draw(ctx, 'rgba(240,162,74,.22)', e.x, e.y, e.r * 2.4, 1);
    ctx.save();
    ctx.strokeStyle = bd.trim;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 3;
    if (e.pyl && mid === 'weaver') for (var pi = 0; pi < e.pyl.length; pi++) {
      if (e.pyl[pi].dead) continue;
      ctx.beginPath(); ctx.moveTo(e.pyl[pi].x, e.pyl[pi].y); ctx.lineTo(e.x, e.y); ctx.stroke();
    }
    if (e.tie > 0) { ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(Game.player.x, Game.player.y); ctx.stroke(); }
    if (e.openT > 0 && e.openK > 1) {
      ctx.strokeStyle = '#ffd27d'; ctx.lineWidth = 4; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 18 + 5 * Math.sin(Game.time * 10), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();

    if (mid === 'warden' && e.beamA !== undefined && !(e.openT > 0)) {
      var rin = e.m && e.m.safe || 0;
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = bd.trim;
      ctx.lineWidth = Bosses.beamW;
      for (var bi = 0; bi < (e.beams || 1); bi++) {
        var ba = e.beamA + bi * Math.PI;
        ctx.beginPath();
        ctx.moveTo(e.x + Math.cos(ba) * rin, e.y + Math.sin(ba) * rin);
        ctx.lineTo(e.x + Math.cos(ba) * e.beamLen, e.y + Math.sin(ba) * e.beamLen);
        ctx.stroke();
      }
      if (rin) { ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, rin, 0, Math.PI * 2); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    if (mid === 'phantom' && e.trail) {
      for (var t = 0; t < e.trail.length; t++) {
        this.body(ctx, e, bd, e.trail[t].x, e.trail[t].y, e.trail[t].a, 0.06 + t * 0.05);
      }
    }
    this.body(ctx, e, bd, e.x, e.y, e.ang, bd.id === 'phantom' ? 0.72 : 1);

    if (e.aim > 0) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = bd.trim;
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 10]);
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x + Math.cos(e.chargeAng) * 700, e.y + Math.sin(e.chargeAng) * 700);
      ctx.stroke();
      ctx.restore();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    if (e.shield > 0) {
      ctx.strokeStyle = 'rgba(183,154,214,.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 12, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (e.state === 'return') {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#7e9aa0';
      ctx.font = '700 13px Verdana, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('...', e.x, e.y - e.r - 14);
      ctx.globalAlpha = 1;
    }
  }
};
