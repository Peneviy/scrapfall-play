// Боссы: реестр с отдельным поведением на каждого.
// Босс сидит на своей точке (anchor). Убежал - он вернется туда и будет ждать,
// подлечиваясь. Можно уйти, подкачаться и прийти добивать.
var Bosses = {

  list: [
    {
      id: 'crusher', shape: 4, hpMul: 1, dmgMul: 1, speed: 40, r: 46,
      body: '#3a4a56', trim: '#f0a24a',
      ru: { n: 'ДРОБИТЕЛЬ', d: 'Расстреливает кругом и зовет подмогу' },
      en: { n: 'CRUSHER', d: 'Fires in a circle and calls for help' },
      ai: function (e, dt, d) {
        Bosses.approach(e, d, 260, 1.2, 0.5);
        e.t1 -= dt;
        if (e.t1 <= 0) {
          e.t1 = U.rand(3.4, 4.6);
          FX.ring(e.x, e.y, e.r, e.r + 100, CFG.col.enemyShot, 0.4, 3);
          var n = 14, off = Math.random() * 6.28;
          for (var i = 0; i < n; i++) {
            Game.spawnEnemyBullet(e.x, e.y, off + i / n * Math.PI * 2, 200, e.dmg * 0.5, CFG.col.enemyShot);
          }
          Snd.play('shotBig');
        }
        e.t2 -= dt;
        if (e.t2 <= 0) {
          e.t2 = U.rand(7, 10);
          for (var k = 0; k < 4; k++) {
            var a = Math.random() * 6.28;
            Enemies.spawn('runner', e.x + Math.cos(a) * 80, e.y + Math.sin(a) * 80, false);
          }
          FX.burst(e.x, e.y, 14, e.bd.trim, 200, 0.5, 3);
        }
      }
    },

    {
      id: 'driller', shape: 3, hpMul: 0.85, dmgMul: 1.4, speed: 34, r: 42,
      body: '#5a3b2c', trim: '#ffb07a',
      ru: { n: 'БУРИЛЬЩИК', d: 'Замирает, целится и таранит по прямой' },
      en: { n: 'DRILLER', d: 'Stops, aims and rams in a straight line' },
      ai: function (e, dt, d) {
        if (e.charge > 0) {
          // сам таран: летит по запомненному направлению
          e.charge -= dt;
          e.vx = Math.cos(e.chargeAng) * 900;
          e.vy = Math.sin(e.chargeAng) * 900;
          FX.spray(e.x, e.y, e.chargeAng + Math.PI, 2, e.bd.trim, 200);
          return;
        }
        if (e.aim > 0) {
          // замах: стоит на месте и держит прицел, можно отойти
          e.aim -= dt;
          e.vx = e.vy = 0;
          e.chargeAng = U.turn(e.chargeAng, e.ang, 2.2 * dt);
          if (e.aim <= 0) {
            e.charge = 0.65;
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
        }
      }
    },

    {
      id: 'weaver', shape: 6, hpMul: 0.95, dmgMul: 0.9, speed: 46, r: 40,
      body: '#3f5c3a', trim: '#b6e07a',
      ru: { n: 'ТКАЧ', d: 'Держится вдали и расставляет стрелков' },
      en: { n: 'WEAVER', d: 'Keeps away and plants shooters' },
      ai: function (e, dt, d) {
        Bosses.approach(e, d, 430, 1, -1);   // отрицательный ближний множитель = пятится
        e.t1 -= dt;
        if (e.t1 <= 0) {
          e.t1 = U.rand(2.2, 3);
          for (var i = -1; i <= 1; i++) {
            Game.spawnEnemyBullet(e.x, e.y, e.ang + i * 0.22, 250, e.dmg * 0.45, CFG.col.spit);
          }
        }
        e.t2 -= dt;
        if (e.t2 <= 0) {
          e.t2 = U.rand(5, 7);
          for (var k = 0; k < 2; k++) {
            var a = Math.random() * 6.28;
            var s = Enemies.spawn('spitter', e.x + Math.cos(a) * 110, e.y + Math.sin(a) * 110, false);
            if (s) s.speed *= 0.4;
          }
        }
      }
    },

    {
      id: 'frostmaw', shape: 5, hpMul: 1.15, dmgMul: 1.1, speed: 52, r: 44,
      body: '#2f4f66', trim: '#7ec8ff',
      ru: { n: 'МОРОЗНИК', d: 'Волны холода замедляют, потом рывок в упор' },
      en: { n: 'FROSTMAW', d: 'Chill waves slow you down, then it lunges' },
      ai: function (e, dt, d) {
        if (e.charge > 0) {
          e.charge -= dt;
          e.vx = Math.cos(e.chargeAng) * 620;
          e.vy = Math.sin(e.chargeAng) * 620;
          return;
        }
        Bosses.approach(e, d, 300, 1.1, 0.6);
        e.t1 -= dt;
        if (e.t1 <= 0) {
          e.t1 = U.rand(3.6, 4.8);
          var rad = 340;
          FX.ring(e.x, e.y, e.r, rad, e.bd.trim, 0.6, 4);
          Snd.play('hurt');
          if (U.dist2(e.x, e.y, Game.player.x, Game.player.y) < rad * rad) {
            Game.player.slowT = 2.2;
            Game.player.hurt(e.dmg * 0.35);
          }
        }
        e.t2 -= dt;
        if (e.t2 <= 0 && d < 560) {
          e.t2 = U.rand(5.5, 7.5);
          e.charge = 0.5;
          e.chargeAng = e.ang;
        }
      }
    },

    {
      id: 'hive', shape: 8, hpMul: 1.5, dmgMul: 0.8, speed: 26, r: 52,
      body: '#4a3a5c', trim: '#b79ad6',
      ru: { n: 'УЛЕЙ', d: 'Выбрасывает рой мелких тварей и прикрывается щитом, пока рожает' },
      en: { n: 'HIVE', d: 'Pumps out swarms and shields itself while breeding' },
      ai: function (e, dt, d) {
        Bosses.approach(e, d, 340, 0.9, 0.3);
        e.t1 -= dt;
        if (e.shield > 0) e.shield -= dt;
        if (e.t1 <= 0) {
          e.t1 = U.rand(3, 4.2);
          e.shield = 1.6;                 // пока рожает, урона получает меньше
          FX.shake(4);
          Snd.play('shotBig');
          for (var k = 0; k < 9; k++) {
            var a = Math.random() * 6.28;
            Enemies.spawn('swarm', e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70, false);
          }
          FX.ring(e.x, e.y, e.r, e.r + 130, e.bd.trim, 0.7, 5);
        }
      }
    },

    {
      id: 'warden', shape: 4, hpMul: 1.35, dmgMul: 1.2, speed: 36, r: 48,
      body: '#5c2f3f', trim: '#ff4d8d',
      ru: { n: 'СТРАЖ', d: 'Крутит лучом, под него лучше не попадать' },
      en: { n: 'WARDEN', d: 'Sweeps a beam around, stay out of it' },
      ai: function (e, dt, d) {
        Bosses.approach(e, d, 280, 1, 0.4);
        e.beamA = (e.beamA || 0) + dt * 0.9;
        e.beamLen = 420;
        // ниже половины здоровья достает второй луч, напротив первого
        e.beams = e.hp < e.maxHp * 0.5 ? 2 : 1;
        var p = Game.player;
        var px = p.x - e.x, py = p.y - e.y;
        for (var bi = 0; bi < e.beams; bi++) {
          var a = e.beamA + bi * Math.PI;
          var bx = Math.cos(a), by = Math.sin(a);
          var proj = px * bx + py * by;
          if (proj > 0 && proj < e.beamLen) {
            var perp = Math.abs(px * by - py * bx);
            if (perp < 20) p.hurt(e.dmg * 0.6);
          }
        }
        e.t1 -= dt;
        if (e.t1 <= 0) {
          e.t1 = U.rand(4, 5.5);
          for (var i = 0; i < 6; i++) {
            Game.spawnEnemyBullet(e.x, e.y, e.beamA + i * 1.05, 220, e.dmg * 0.45, CFG.col.enemyShot);
          }
        }
      }
    }
,
    {
      id: 'sapper', shape: 3, hpMul: 0.9, dmgMul: 1.1, speed: 58, r: 40,
      body: '#5a4a2c', trim: '#ffd27d',
      ru: { n: 'ПОДРЫВНИК', d: 'Раскидывает мины и убегает от драки' },
      en: { n: 'SAPPER', d: 'Scatters mines and runs from the fight' },
      ai: function (e, dt, d) {
        Bosses.approach(e, d, 380, 1, -0.9);
        e.t1 -= dt;
        if (e.t1 <= 0) {
          e.t1 = U.rand(1.6, 2.4);
          var p = Game.player;
          // одну под ноги игроку, одну под себя - чтобы не подходили вплотную
          Game.spawnMine(p.x + U.rand(-70, 70), p.y + U.rand(-70, 70), e.dmg * 0.8, 2.2);
          if (U.chance(0.5)) Game.spawnMine(e.x, e.y, e.dmg * 0.8, 2.6);
        }
      }
    },
    {
      id: 'lancer', shape: 4, hpMul: 1, dmgMul: 1.25, speed: 64, r: 38,
      body: '#40325c', trim: '#c0a8ff',
      ru: { n: 'КОПЕЙЩИК', d: 'Кружит вокруг и бьет очередями точно в тебя' },
      en: { n: 'LANCER', d: 'Circles around and fires aimed bursts' },
      ai: function (e, dt, d) {
        // ходит по кругу: держит дистанцию и смещается вбок
        var want = 340;
        var radial = d > want + 40 ? 1 : (d < want - 40 ? -1 : 0);
        var sp = e.speed;
        e.vx = Math.cos(e.ang) * sp * radial + Math.cos(e.ang + Math.PI / 2) * sp * 0.9;
        e.vy = Math.sin(e.ang) * sp * radial + Math.sin(e.ang + Math.PI / 2) * sp * 0.9;

        e.t1 -= dt;
        if (e.t1 <= 0) {
          if (e.burst === undefined || e.burst <= 0) { e.burst = 3; e.t1 = U.rand(2.6, 3.6); }
          else { e.t1 = 0.14; }
          if (e.burst > 0) {
            e.burst--;
            Game.spawnEnemyBullet(e.x, e.y, e.ang + U.rand(-0.04, 0.04), 470, e.dmg * 0.5,
              e.bd.trim, { spear: true, pw: true, r: 5 });
            Snd.play('shot');
          }
        }
      }
    },
    {
      id: 'titan', shape: 6, hpMul: 2.2, dmgMul: 1.3, speed: 24, r: 62,
      body: '#3b3b46', trim: '#ffb35c',
      ru: { n: 'ТИТАН', d: 'Медленный, но от ударов расходятся волны' },
      en: { n: 'TITAN', d: 'Slow, but its slams send out shockwaves' },
      ai: function (e, dt, d) {
        Bosses.approach(e, d, 240, 1.1, 0.35);
        e.t1 -= dt;
        if (e.t1 <= 0) {
          e.t1 = U.rand(3.4, 4.6);
          FX.shake(10);
          Snd.play('boom');
          Game.spawnWave(e.x, e.y, 520, 320, e.dmg * 0.7);
        }
        e.t2 -= dt;
        if (e.t2 <= 0) {
          e.t2 = U.rand(9, 13);
          for (var k = 0; k < 2; k++) {
            var a = Math.random() * 6.28;
            Enemies.spawn('shellback', e.x + Math.cos(a) * 90, e.y + Math.sin(a) * 90, false);
          }
        }
      }
    },
    {
      id: 'phantom', shape: 5, hpMul: 1.1, dmgMul: 1.15, speed: 70, r: 38,
      body: '#0d2a2c', trim: '#8ff0e0',
      ru: { n: 'ФАНТОМ', d: 'Прыгает по полю и бьет веером сразу после прыжка' },
      en: { n: 'PHANTOM', d: 'Blinks around the field and fans out right after' },
      ai: function (e, dt, d) {
        Bosses.approach(e, d, 300, 0.9, 0.2);
        if (!e.trail) e.trail = [];
        e.trailT = (e.trailT || 0) + dt;
        if (e.trailT > 0.06) {
          e.trailT = 0;
          e.trail.push({ x: e.x, y: e.y, a: e.ang });
          if (e.trail.length > 5) e.trail.shift();
        }
        e.t1 -= dt;
        if (e.t1 <= 0) {
          e.t1 = U.rand(2.8, 4);
          var p = Game.player;
          FX.ring(e.x, e.y, e.r, 10, e.bd.trim, 0.3, 3);
          FX.burst(e.x, e.y, 14, e.bd.trim, 200, 0.4, 3);
          var a = Math.random() * 6.28, dist = U.rand(170, 260);
          e.x = p.x + Math.cos(a) * dist;
          e.y = p.y + Math.sin(a) * dist;
          e.ang = U.angleTo(e.x, e.y, p.x, p.y);
          FX.ring(e.x, e.y, 10, e.r + 40, e.bd.trim, 0.35, 3);
          for (var i = -2; i <= 2; i++) {
            Game.spawnEnemyBullet(e.x, e.y, e.ang + i * 0.16, 300, e.dmg * 0.45, CFG.col.enemyShot);
          }
          Snd.play('dash');
        }
      }
    }
  ],

  byId: function (id) {
    for (var i = 0; i < this.list.length; i++) if (this.list[i].id === id) return this.list[i];
    return this.list[0];
  },

  // круг за кругом: список кончился - идем по второму, но крепче
  forIndex: function (i) { return this.list[i % this.list.length]; },
  cycle: function (i) { return Math.floor(i / this.list.length); },

  defeated: function () {
    var n = 0;
    for (var i = 0; i < this.list.length; i++) if (Save.data.bosses[this.list[i].id]) n++;
    return n;
  },

  // общий кусок поведения: подходит на дистанцию want, рядом притормаживает
  approach: function (e, d, want, farMul, nearMul) {
    var sp = e.speed * (d > want ? farMul : nearMul);
    e.vx = Math.cos(e.ang) * sp;
    e.vy = Math.sin(e.ang) * sp;
  },

  // Корпус босса. Вынесен отдельно, чтобы рисовать им же шлейф фантома.
  body: function (ctx, e, bd, x, y, ang, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(ang);

    ctx.globalAlpha = alpha * 0.25;
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
      // вытянутый корпус с жалом: копейщик и должен выглядеть как копье
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
    var bd = e.bd;
    GlowCache.draw(ctx, 'rgba(240,162,74,.22)', e.x, e.y, e.r * 2.4, 1);

    // луч стража рисуем до корпуса
    if (bd.id === 'warden' && e.beamA !== undefined) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = bd.trim;
      ctx.lineWidth = 12;
      for (var bi = 0; bi < (e.beams || 1); bi++) {
        var ba = e.beamA + bi * Math.PI;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + Math.cos(ba) * e.beamLen, e.y + Math.sin(ba) * e.beamLen);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Фантом полупрозрачный и со шлейфом: он должен читаться как призрак,
    // а не как еще один многоугольник.
    if (bd.id === 'phantom' && e.trail) {
      for (var t = 0; t < e.trail.length; t++) {
        this.body(ctx, e, bd, e.trail[t].x, e.trail[t].y, e.trail[t].a, 0.06 + t * 0.05);
      }
    }
    this.body(ctx, e, bd, e.x, e.y, e.ang, bd.id === 'phantom' ? 0.72 : 1);

    // прицел бурильщика
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

    // щит улья
    if (e.shield > 0) {
      ctx.strokeStyle = 'rgba(183,154,214,.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 12, 0, Math.PI * 2);
      ctx.stroke();
    }

    // если босс ушел отдыхать на свою точку - показываем это
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
