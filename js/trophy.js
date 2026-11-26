var Trophy = {
  max: 4,
  col: '#d77bff',
  list: [
    { id: 'tr_crusher', boss: 'crusher', ic: '✹',
      ru: { n: 'ЗАЛП', d: 'Раз в 8 секунд кольцо из 12 твоих пуль' },
      en: { n: 'SALVO', d: 'Every 8 seconds a ring of 12 of your bullets' } },
    { id: 'tr_driller', boss: 'driller', ic: '➤',
      ru: { n: 'БУР', d: 'Бур на носу сверлит всех, в кого упираешься. По буру урон не проходит, по корпусу проходит' },
      en: { n: 'DRILL', d: 'A drill on your nose grinds down everyone you push into. Hits on the drill do nothing, hits on the hull still hurt' } },
    { id: 'tr_sapper', boss: 'sapper', ic: '⊛',
      ru: { n: 'МИНЕР', d: 'Раз в 4 секунды мина за кормой, рвется, когда враг рядом' },
      en: { n: 'MINER', d: 'Every 4 seconds a mine drops behind you and blows when an enemy comes close' } },
    { id: 'tr_weaver', boss: 'weaver', ic: '⋈',
      ru: { n: 'ОПОРЫ', d: 'Раз в 15 секунд по бокам появляются две опоры, нить между ними режет врагов' },
      en: { n: 'PYLONS', d: 'Every 15 seconds two pylons appear at your sides, the thread between them cuts enemies' } },
    { id: 'tr_frostmaw', boss: 'frostmaw', ic: '✻',
      ru: { n: 'СТУЖА', d: 'Раз в 7 секунд волна холода замораживает врагов вокруг на секунду, а крупных тормозит' },
      en: { n: 'CHILL', d: 'Every 7 seconds a cold wave freezes enemies around you for a second and slows the big ones' } },
    { id: 'tr_lancer', boss: 'lancer', ic: '↟',
      ru: { n: 'КОПЬЕ', d: 'Раз в 6 секунд копье в самого толстого, втыкается стеной' },
      en: { n: 'SPEAR', d: 'Every 6 seconds a spear at the toughest enemy, it sticks in as a wall' } },
    { id: 'tr_warden', boss: 'warden', ic: '⊹',
      ru: { n: 'ЛУЧ', d: 'Вокруг машины медленно крутится короткий луч' },
      en: { n: 'BEAM', d: 'A short beam slowly sweeps around you' } },
    { id: 'tr_hive', boss: 'hive', ic: '⁂',
      ru: { n: 'РОЙ', d: '6 дронов-ос летают за тобой и жалят ближних врагов' },
      en: { n: 'SWARM', d: '6 wasp drones follow you and sting nearby enemies' } },
    { id: 'tr_titan', boss: 'titan', ic: '◉',
      ru: { n: 'УДАР', d: 'Каждый 3-й рывок кончается ударной волной' },
      en: { n: 'SLAM', d: 'Every 3rd dash ends in a shockwave' } },
    { id: 'tr_phantom', boss: 'phantom', ic: '◐',
      ru: { n: 'ТЕНЬ', d: 'Рывок становится длиннее, в конце выпускает веер пуль и дает миг неуязвимости' },
      en: { n: 'SHADOW', d: 'Your dash goes farther, ends with a fan of bullets and grants a moment of invulnerability' } }
  ],

  N: {
    salvo: { cd: 8, n: 12, pow: 1 },
    drill: { dmg: 70, tick: 0.2, len: 40, w: 17, knock: 10, boss: 0.5 },
    mine: { cd: 4, arm: 0.5, life: 8, trig: 46, r: 105, dmg: 80, cap: 6 },
    post: { cd: 15, life: 10, off: 150, tick: 0.25, dmg: 22, w: 12 },
    chill: { cd: 7, r: 340, t: 0.6, frz: 1, dmg: 18 },
    spear: { cd: 6, range: 620, sp: 1100, dmg: 110, wall: 5, len: 150, cap: 3 },
    beam: { len: 230, spin: 1.1, tick: 0.15, dmg: 12, w: 12 },
    drone: { n: 6, range: 340, sp: 560, cd: 0.55, dmg: 10, orbit: 46 },
    slam: { every: 3, r: 230, dmg: 100, knock: 60 },
    shade: { dash: 1.35, n: 11, fan: 0.9, pow: 0.9, inv: 0.6 }
  },

  mines: [], posts: [], spears: [], drones: [], chills: [],
  reset: function () {
    this.mines.length = 0; this.posts.length = 0; this.spears.length = 0;
    this.drones.length = 0; this.chills.length = 0;
  },

  byBoss: function (b) {
    for (var i = 0; i < this.list.length; i++) if (this.list[i].boss === b) return this.list[i];
    return null;
  },
  of: function (id) {
    for (var i = 0; i < this.list.length; i++) if (this.list[i].id === id) return this.list[i];
    return null;
  },
  bossName: function (t) { return I18N.name(Bosses.byId(t.boss)); },

  offer: function (p, count) {
    var pool = [], out = [];
    if (p.trN >= this.max) return out;
    for (var i = 0; i < this.list.length; i++) {
      var t = this.list[i];
      if (p.trKill[t.boss] && !p.tr[t.boss]) pool.push(t);
    }
    while (out.length < count && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return out;
  },

  take: function (p, t) {
    if (p.tr[t.boss]) return;
    p.tr[t.boss] = 1;
    p.trN++;
    var s = this.state(p);
    if (t.boss === 'hive') {
      for (var i = 0; i < this.N.drone.n; i++) {
        this.drones.push({ x: p.x, y: p.y, a: i / this.N.drone.n * Math.PI * 2, tg: null, cd: i * 0.08, look: i * 0.07 });
      }
    }
    s.dashN = 0;
    FX.ring(p.x, p.y, 20, 260, this.col, 0.7, 6);
    FX.burst(p.x, p.y, 24, this.col, 240, 0.6, 4);
  },

  state: function (p) {
    return p.trs || (p.trs = { salvo: 2, mine: 1, post: 1.5, chill: 2, spear: 1.5, beamA: 0, beamT: 0,
      dashN: 0, dashing: false, hit: [], hx: 1, hy: 0, da: 0, drT: 0, drHit: 0 });
  },

  update: function (p, dt) {
    if (!p.trN || !p.alive) return;
    var s = p.trs, N = this.N, k = p.st.dmg * p.st.tech, tr = p.tr;
    var mv = Input.move;
    if (mv.x || mv.y) { var ml = Math.sqrt(mv.x * mv.x + mv.y * mv.y); s.hx = mv.x / ml; s.hy = mv.y / ml; }

    var dashing = p.dashT > 0;
    if (dashing && !s.dashing) {
      s.dashN++;
      s.hit.length = 0;
      if (tr.phantom) p.dashT *= N.shade.dash;
    }
    if (tr.driller) this.drill(p, s, dt, k);
    if (!dashing && s.dashing) this.dashEnd(p, s, k);
    s.dashing = dashing;

    if (tr.crusher && (s.salvo -= dt) <= 0) { s.salvo = N.salvo.cd; this.salvo(p); }
    if (tr.sapper && (s.mine -= dt) <= 0) {
      s.mine = N.mine.cd;
      if (this.mines.length < N.mine.cap) this.mines.push({ x: p.x - s.hx * 26, y: p.y - s.hy * 26, arm: N.mine.arm, life: N.mine.life });
    }
    if (tr.weaver && (s.post -= dt) <= 0) { s.post = N.post.cd; this.plant(p, s); }
    if (tr.frostmaw && (s.chill -= dt) <= 0) {
      s.chill = N.chill.cd;
      this.chills.push({ x: p.x, y: p.y, r: 0, t: 0 });
      Snd.play('hurt');
    }
    if (tr.lancer && (s.spear -= dt) <= 0) { s.spear = this.throwSpear(p) ? N.spear.cd : 1; }
    if (tr.warden) this.beam(p, s, dt, k);

    if (this.mines.length) this.stepMines(dt, k);
    if (this.posts.length) this.stepPosts(dt, k);
    if (this.chills.length) this.stepChills(p, dt, k);
    if (this.spears.length) this.stepSpears(dt, k);
    if (this.drones.length) this.stepDrones(p, dt, k);
  },

  salvo: function (p) {
    var n = this.N.salvo.n, off = Math.random() * 6.28;
    for (var i = 0; i < n; i++) Player.bullet(p, off + i / n * Math.PI * 2, this.N.salvo.pow, 0, false);
    FX.ring(p.x, p.y, p.r, p.r + 70, Bosses.byId('crusher').trim, 0.35, 3);
    Snd.play('shotBig');
  },

  drill: function (p, s, dt, k) {
    var N = this.N.drill;
    s.da = U.turn(s.da, p.dashT > 0 ? p.dashAng : Math.atan2(s.hy, s.hx), 10 * dt);
    if (s.drHit > 0) s.drHit -= dt;
    if ((s.drT -= dt) > 0) return;
    s.drT = N.tick;
    var near = this._near || (this._near = []), ca = Math.cos(s.da), sa = Math.sin(s.da);
    var bx = p.x + ca * p.r * 0.85, by = p.y + sa * p.r * 0.85, n = 0;
    Game.grid.query(bx + ca * N.len / 2, by + sa * N.len / 2, N.len + 70, near);
    for (var i = 0; i < near.length; i++) {
      var e = near[i];
      if (e.dead || e.zz) continue;
      var px = e.x - bx, py = e.y - by, al = px * ca + py * sa;
      if (al < -e.r || al > N.len + e.r) continue;
      if (Math.abs(px * -sa + py * ca) > N.w * (1 - U.clamp(al / N.len, 0, 1)) + e.r + 3) continue;
      Enemies.damage(e, N.dmg * k * (e.boss ? N.boss : 1), false, bx - ca * 40, by - sa * 40, e.boss ? 0 : N.knock);
      n++;
    }
    var tx = bx + ca * N.len * 0.7, ty = by + sa * N.len * 0.7;
    World.damageArea(tx, ty, N.w, N.dmg * k);
    if (n) {
      s.drHit = N.tick + 0.05;
      FX.spray(tx, ty, s.da + Math.PI, 3, Bosses.byId('driller').trim, 220);
    }
  },

  dashEnd: function (p, s, k) {
    var tr = p.tr;
    if (tr.titan && s.dashN % this.N.slam.every === 0 && !(p.skills.ram && p.evo.ram)) {
      var N = this.N.slam, R = N.r * p.st.radius, near = this._near || (this._near = []);
      Game.grid.query(p.x, p.y, R, near);
      for (var i = 0; i < near.length; i++) {
        var e = near[i];
        if (e.dead || e.zz) continue;
        if (U.dist2(p.x, p.y, e.x, e.y) < R * R) Enemies.damage(e, N.dmg * k, false, p.x, p.y, e.boss ? 0 : N.knock);
      }
      World.damageArea(p.x, p.y, R, N.dmg * k);
      FX.ring(p.x, p.y, 20, R, Bosses.byId('titan').trim, 0.45, 9);
      FX.ring(p.x, p.y, 10, R * 0.7, '#ffffff', 0.3, 3, true);
      FX.shake(8);
      Snd.play('boom');
    }
    if (tr.phantom) {
      var S = this.N.shade, tg = Game.nearestEnemy(p.x, p.y, 420);
      var a0 = tg ? U.angleTo(p.x, p.y, tg.x, tg.y) : p.dashAng;
      for (var j = 0; j < S.n; j++) Player.bullet(p, a0 + (j / (S.n - 1) - 0.5) * S.fan, S.pow, 0, false);
      p.inv = Math.max(p.inv, S.inv);
      FX.burst(p.x, p.y, 14, Bosses.byId('phantom').trim, 200, 0.4, 3);
    }
  },

  plant: function (p, s) {
    var N = this.N.post, nx = -s.hy, ny = s.hx;
    if (this.posts.length >= 2) this.posts.shift();
    this.posts.push({ x1: p.x + nx * N.off, y1: p.y + ny * N.off, x2: p.x - nx * N.off, y2: p.y - ny * N.off,
      life: N.life, tick: 0 });
    var c = Bosses.byId('weaver').trim;
    FX.ring(p.x + nx * N.off, p.y + ny * N.off, 6, 46, c, 0.35, 3);
    FX.ring(p.x - nx * N.off, p.y - ny * N.off, 6, 46, c, 0.35, 3);
  },

  stepPosts: function (dt, k) {
    var N = this.N.post, near = this._near || (this._near = []);
    for (var i = this.posts.length - 1; i >= 0; i--) {
      var o = this.posts[i];
      if ((o.life -= dt) <= 0) { this.posts.splice(i, 1); continue; }
      if ((o.tick -= dt) > 0) continue;
      o.tick = N.tick;
      var dx = o.x2 - o.x1, dy = o.y2 - o.y1, len2 = dx * dx + dy * dy || 1;
      Game.grid.query((o.x1 + o.x2) / 2, (o.y1 + o.y2) / 2, N.off + 40, near);
      for (var j = 0; j < near.length; j++) {
        var e = near[j];
        if (e.dead || e.zz) continue;
        var q = U.clamp(((e.x - o.x1) * dx + (e.y - o.y1) * dy) / len2, 0, 1);
        var qx = o.x1 + dx * q - e.x, qy = o.y1 + dy * q - e.y, rr = e.r + N.w;
        if (qx * qx + qy * qy < rr * rr) { e.slowT = 0.3; Enemies.damage(e, N.dmg * k, false, e.x, e.y, 0); }
      }
    }
  },

  stepMines: function (dt, k) {
    var N = this.N.mine, near = this._near || (this._near = []);
    for (var i = this.mines.length - 1; i >= 0; i--) {
      var m = this.mines[i], go = (m.life -= dt) <= 0;
      if (m.arm > 0) { m.arm -= dt; if (!go) continue; }
      if (!go) {
        Game.grid.query(m.x, m.y, N.trig + 30, near);
        for (var j = 0; j < near.length; j++) {
          var e = near[j], rr = N.trig + e.r;
          if (!e.dead && !e.zz && U.dist2(m.x, m.y, e.x, e.y) < rr * rr) { go = true; break; }
        }
      }
      if (!go) continue;
      this.mines.splice(i, 1);
      var R = N.r * Game.player.st.radius;
      Player.blast(m.x, m.y, R, N.dmg * k);
      FX.blast(m.x, m.y, R * 0.8, Bosses.byId('sapper').trim);
    }
  },

  stepChills: function (p, dt, k) {
    var N = this.N.chill, list = Game.enemies, R = N.r * p.st.radius;
    for (var i = this.chills.length - 1; i >= 0; i--) {
      var c = this.chills[i], r0 = c.r;
      c.t += dt;
      c.r = Math.min(R, R * c.t / N.t);
      for (var j = 0; j < list.length; j++) {
        var e = list[j];
        if (e.dead || e.zz) continue;
        var d2 = U.dist2(c.x, c.y, e.x, e.y);
        if (d2 <= r0 * r0 || d2 > c.r * c.r) continue;
        if (e.boss || e.elite || e.def.heavy || e.def.nest) e.slowT = Math.max(e.slowT, 1.5);
        else e.frz = N.frz;
        Enemies.damage(e, N.dmg * k, false, c.x, c.y, 0);
      }
      if (c.t >= N.t + 0.35) this.chills.splice(i, 1);
    }
  },

  throwSpear: function (p) {
    var N = this.N.spear, list = Game.enemies, best = null, bh = 0, R2 = N.range * N.range;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.dead || e.zz || e.inv || e.hp <= bh) continue;
      if (U.dist2(p.x, p.y, e.x, e.y) < R2) { bh = e.hp; best = e; }
    }
    if (!best) return false;
    var a = U.angleTo(p.x, p.y, best.x, best.y), d = U.dist(p.x, p.y, best.x, best.y) + 30;
    this.spears.push({ x: p.x, y: p.y, a: a, left: d, fly: true, life: N.wall, hits: [] });
    Snd.play('dash');
    return true;
  },

  stepSpears: function (dt, k) {
    var N = this.N.spear, near = this._near || (this._near = []);
    var stuck = 0;
    for (var i = this.spears.length - 1; i >= 0; i--) {
      var s = this.spears[i], j, e;
      if (s.fly) {
        var step = Math.min(s.left, N.sp * dt), ca = Math.cos(s.a), sa = Math.sin(s.a);
        s.x += ca * step; s.y += sa * step; s.left -= step;
        Game.grid.query(s.x, s.y, 50, near);
        for (j = 0; j < near.length; j++) {
          e = near[j];
          if (e.dead || e.zz || s.hits.indexOf(e) >= 0) continue;
          var rr = e.r + 10;
          if (U.dist2(s.x, s.y, e.x, e.y) < rr * rr) { s.hits.push(e); Enemies.damage(e, N.dmg * k, true, s.x, s.y, e.boss ? 0 : 18); }
        }
        if (s.left <= 0) {
          s.fly = false; s.hits = null;
          FX.ring(s.x, s.y, 8, 50, Bosses.byId('lancer').trim, 0.3, 3);
          FX.shake(3);
        }
        continue;
      }
      if ((s.life -= dt) <= 0 || ++stuck > N.cap) { this.spears.splice(i, 1); continue; }
      var nx = -Math.sin(s.a), ny = Math.cos(s.a), h = N.len / 2;
      var x1 = s.x - nx * h, y1 = s.y - ny * h, dx = nx * N.len, dy = ny * N.len, len2 = N.len * N.len;
      Game.grid.query(s.x, s.y, h + 30, near);
      for (j = 0; j < near.length; j++) {
        e = near[j];
        if (e.dead || e.boss || e.def.nest) continue;
        var q = U.clamp(((e.x - x1) * dx + (e.y - y1) * dy) / len2, 0, 1);
        var qx = e.x - (x1 + dx * q), qy = e.y - (y1 + dy * q), d2 = qx * qx + qy * qy, rr2 = e.r + 7;
        if (d2 >= rr2 * rr2) continue;
        var dd = Math.sqrt(d2) || 1;
        if (d2 < 0.01) { qx = Math.cos(s.a); qy = Math.sin(s.a); dd = 1; }
        e.x += qx / dd * (rr2 - dd);
        e.y += qy / dd * (rr2 - dd);
      }
    }
  },

  beam: function (p, s, dt, k) {
    var N = this.N.beam;
    s.beamA += N.spin * dt;
    if ((s.beamT -= dt) > 0) return;
    s.beamT = N.tick;
    var near = this._near || (this._near = []), bx = Math.cos(s.beamA), by = Math.sin(s.beamA);
    Game.grid.query(p.x + bx * N.len / 2, p.y + by * N.len / 2, N.len / 2 + 30, near);
    for (var i = 0; i < near.length; i++) {
      var e = near[i];
      if (e.dead || e.zz) continue;
      var px = e.x - p.x, py = e.y - p.y, proj = px * bx + py * by;
      if (proj < 0 || proj > N.len + e.r) continue;
      if (Math.abs(px * by - py * bx) < N.w + e.r) Enemies.damage(e, N.dmg * k, false, p.x, p.y, 0);
    }
  },

  stepDrones: function (p, dt, k) {
    var N = this.N.drone, ds = this.drones, R2 = N.range * N.range, claimed = this._cl || (this._cl = []);
    claimed.length = 0;
    for (var i = 0; i < ds.length; i++) if (ds[i].tg && !ds[i].tg.dead) claimed.push(ds[i].tg);
    for (i = 0; i < ds.length; i++) {
      var d = ds[i], tg = d.tg;
      d.a += dt * 2.4;
      if (tg && (tg.dead || tg.zz || tg.inv || U.dist2(p.x, p.y, tg.x, tg.y) > R2 * 1.4)) tg = d.tg = null;
      if ((d.look -= dt) <= 0) {
        d.look = 0.4;
        if (!tg) {
          tg = d.tg = Game.nearestEnemy(p.x, p.y, N.range, claimed);
          if (!tg) tg = d.tg = Game.nearestEnemy(p.x, p.y, N.range);
          if (tg) claimed.push(tg);
        }
      }
      var wx, wy;
      if (tg) { wx = tg.x + Math.cos(d.a * 2) * tg.r * 0.6; wy = tg.y + Math.sin(d.a * 2) * tg.r * 0.6; }
      else { wx = p.x + Math.cos(d.a) * N.orbit; wy = p.y + Math.sin(d.a) * N.orbit; }
      var dx = wx - d.x, dy = wy - d.y, dl = Math.sqrt(dx * dx + dy * dy), st = N.sp * dt;
      if (dl > st) { d.x += dx / dl * st; d.y += dy / dl * st; } else { d.x = wx; d.y = wy; }
      if ((d.cd -= dt) <= 0 && tg) {
        var rr = tg.r + 10;
        if (U.dist2(d.x, d.y, tg.x, tg.y) < rr * rr) { d.cd = N.cd; Enemies.damage(tg, N.dmg * k, false, d.x, d.y, 0); }
      }
    }
  },

  draw: function (ctx) {
    var p = Game.player, i, N = this.N;
    if (!p || !p.trN) return;
    ctx.save();
    if (p.tr.driller && p.trs) {
      var dc = Math.cos(p.trs.da), dsn = Math.sin(p.trs.da), bx = p.x + dc * p.r * 0.85, by = p.y + dsn * p.r * 0.85;
      ctx.fillStyle = p.trs.drHit > 0 ? '#ffe0c0' : '#aab2ba';
      ctx.beginPath();
      ctx.moveTo(bx + dc * N.drill.len, by + dsn * N.drill.len);
      ctx.lineTo(bx - dsn * N.drill.w, by + dc * N.drill.w);
      ctx.lineTo(bx + dsn * N.drill.w, by - dc * N.drill.w);
      ctx.closePath(); ctx.fill();
    }
    for (i = 0; i < this.mines.length; i++) {
      var m = this.mines[i];
      ctx.fillStyle = m.arm > 0 ? '#7a6a40' : (Math.floor(Game.time * 6) % 2 ? '#ffd27d' : '#fff4d6');
      ctx.beginPath(); ctx.arc(m.x, m.y, 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#b6e07a'; ctx.lineWidth = 3;
    for (i = 0; i < this.posts.length; i++) {
      var o = this.posts[i];
      ctx.globalAlpha = Math.min(1, o.life);
      ctx.beginPath(); ctx.moveTo(o.x1, o.y1); ctx.lineTo(o.x2, o.y2); ctx.stroke();
      ctx.fillStyle = '#3f5c3a';
      ctx.fillRect(o.x1 - 7, o.y1 - 7, 14, 14); ctx.fillRect(o.x2 - 7, o.y2 - 7, 14, 14);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#7ec8ff';
    for (i = 0; i < this.chills.length; i++) {
      var c = this.chills[i];
      ctx.globalAlpha = U.clamp(1 - c.t / (N.chill.t + 0.35), 0, 1);
      ctx.lineWidth = 14;
      ctx.beginPath(); ctx.arc(c.x, c.y, Math.max(1, c.r), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#c0a8ff';
    for (i = 0; i < this.spears.length; i++) {
      var s = this.spears[i], ca = Math.cos(s.a), sa = Math.sin(s.a);
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(s.x - ca * 26, s.y - sa * 26); ctx.lineTo(s.x + ca * 8, s.y + sa * 8); ctx.stroke();
      if (!s.fly) {
        ctx.lineWidth = 6; ctx.globalAlpha = Math.min(1, s.life);
        ctx.beginPath(); ctx.moveTo(s.x + sa * N.spear.len / 2, s.y - ca * N.spear.len / 2);
        ctx.lineTo(s.x - sa * N.spear.len / 2, s.y + ca * N.spear.len / 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    if (p.tr.warden) {
      var bx = Math.cos(p.trs.beamA), by = Math.sin(p.trs.beamA);
      ctx.strokeStyle = '#ff4d8d'; ctx.lineWidth = N.beam.w * 1.4; ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.moveTo(p.x + bx * 20, p.y + by * 20); ctx.lineTo(p.x + bx * N.beam.len, p.y + by * N.beam.len); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#ffd24a';
    for (i = 0; i < this.drones.length; i++) {
      var d = this.drones[i];
      ctx.beginPath(); ctx.arc(d.x, d.y, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
};

Bosses.on('kill', function (e) { var p = Game.player; if (p && e.bd) p.trKill[e.bd.id] = 1; });
