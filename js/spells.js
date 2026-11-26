var Spells = {
  N: {
    disc: { cd: function (L) { return 2.6 - 0.2 * (L - 1); }, n: function (L) { return L >= 5 ? 4 : (L >= 4 ? 3 : (L >= 2 ? 2 : 1)); },
      dmg: function (L) { return 28 + 10 * L; }, hops: 5, sp: 620, r: 13, seek: 300, life: 2.6,
      circN: function () { return 3; }, circSp: 540, hitCd: 0.3 },
    rocket: { cd: function (L) { return 3.5 - 0.5 * (L - 1); }, n: function (L) { return L >= 5 ? 5 : (L >= 3 ? 4 : (L >= 2 ? 3 : 2)); },
      dmg: function (L) { return 28 + 16 * L; }, blast: function (L) { return 60 + 8 * L; },
      range: 650, sp0: 300, sp1: 560, turn: 6, life: 3,
      hailN: 10, hailCd: 5, hailK: 1.5, hailFan: 1.2, cap: 40 },
    ram: { dmg: function (L) { return 100 + 40 * L; }, knock: function (L) { return 50 + 8 * L; },
      w: function (L) { return 34 + 6 * L; }, cdK: 0.94, cdMin: 0.8, gap: 0.3,
      waveR: function (L) { return 150 + 10 * L; }, waveDmg: function (L) { return 20 + 12 * L; }, waveKnock: 55 },
    dome: { cd: function (L) { return 9 - 0.75 * (L - 1); }, dur: function (L) { return 2 + 0.25 * (L - 1); },
      r: function (L) { return 120 + 16 * L; }, dmg: function (L) { return 80 * L; }, knock: 60,
      mirK: 3, mirSp: 520 }
  },

  saws: [], rockets: [],
  reset: function () { this.saws.length = 0; this.rockets.length = 0; },

  lv: function (p, id) { return p.skills[id] || 0; },
  on: function (p) {
    return this.saws.length || this.rockets.length || p.domeT > 0 || (p.skills.ram && p.dashT > 0);
  },

  update: function (p, dt) {
    if (!p.alive) return;
    var mute = p.muteT > 0, k = p.st.dmg * p.st.tech, L;
    if ((L = this.lv(p, 'disc'))) {
      if (p.evo.disc) this.circ(p, L, mute);
      else if (!mute && (p.discCd -= dt) <= 0) p.discCd = this.throwSaws(p, L) ? this.N.disc.cd(L) : 0.5;
    }
    if ((L = this.lv(p, 'rocket')) && !mute && (p.rocketCd -= dt) <= 0) {
      p.rocketCd = this.launch(p, L) ? (p.evo.rocket ? this.N.rocket.hailCd : this.N.rocket.cd(L)) : 0.5;
    }
    if ((L = this.lv(p, 'dome'))) this.dome(p, L, dt, mute, k);
    if ((L = this.lv(p, 'ram'))) this.ram(p, L, k);
    if (this.saws.length) this.stepSaws(p, dt, k, mute);
    if (this.rockets.length) this.stepRockets(p, dt, k);
  },

  throwSaws: function (p, L) {
    var N = this.N.disc, n = N.n(L), tg = Game.nearestEnemy(p.x, p.y, 520);
    if (!tg) return false;
    var a0 = U.angleTo(p.x, p.y, tg.x, tg.y);
    for (var i = 0; i < n; i++) {
      var a = a0 + (i - (n - 1) / 2) * 0.5;
      this.saws.push({ x: p.x, y: p.y, vx: Math.cos(a) * N.sp, vy: Math.sin(a) * N.sp, hops: N.hops, life: N.life,
        last: null, circ: false, hit: null, spin: Math.random() * 6 });
    }
    Snd.play('saw');
    return true;
  },

  circ: function (p, L, mute) {
    var N = this.N.disc, want = N.circN(L), have = 0, i, s;
    for (i = 0; i < this.saws.length; i++) if (this.saws[i].circ) have++;
    for (i = this.saws.length - 1; i >= 0; i--) {
      s = this.saws[i];
      if (s.circ) continue;
      if (have < want) {
        var sa = Math.atan2(s.vy, s.vx);
        s.circ = true; s.life = 1e9; s.hops = 0; s.hit = []; s.last = null;
        s.vx = Math.cos(sa) * N.circSp; s.vy = Math.sin(sa) * N.circSp;
        have++;
      } else this.saws.splice(i, 1);
    }
    while (have < want && !mute) {
      var a = Math.random() * 6.28;
      this.saws.push({ x: p.x, y: p.y, vx: Math.cos(a) * N.circSp, vy: Math.sin(a) * N.circSp, hops: 0, life: 1e9,
        last: null, circ: true, hit: [], spin: 0 });
      have++;
      Snd.play('saw');
    }
  },

  stepSaws: function (p, dt, k, mute) {
    var N = this.N.disc, L = this.lv(p, 'disc'), dmg = N.dmg(L) * k, near = this._near || (this._near = []);
    var hw = Math.min(Game.viewRadius(), Game.w / 2 / Game.scale) * 0.9;
    var hh = Math.min(Game.viewRadius(), Game.h / 2 / Game.scale) * 0.9;
    for (var i = this.saws.length - 1; i >= 0; i--) {
      var s = this.saws[i];
      s.spin += dt * 22;
      if (s.circ && mute) continue;
      if ((s.life -= dt) <= 0) { this.saws.splice(i, 1); continue; }
      var nx = s.x + s.vx * dt, ny = s.y + s.vy * dt;
      if (World.blocked(nx, ny) && !(s.circ && World.blocked(s.x, s.y))) {
        if (World.blocked(nx, s.y)) s.vx = -s.vx;
        if (World.blocked(s.x, ny)) s.vy = -s.vy;
        if (!World.blocked(nx, s.y) && !World.blocked(s.x, ny)) { s.vx = -s.vx; s.vy = -s.vy; }
        FX.spray(s.x, s.y, Math.atan2(s.vy, s.vx), 3, '#ffd27d', 160);
        if (!s.circ && --s.hops < 0) { this.saws.splice(i, 1); continue; }
        nx = s.x; ny = s.y;
      }
      s.x = nx; s.y = ny;
      if (s.circ) {
        var cx = Game.cam.x, cy = Game.cam.y;
        if (s.x < cx - hw && s.vx < 0 || s.x > cx + hw && s.vx > 0) s.vx = -s.vx;
        if (s.y < cy - hh && s.vy < 0 || s.y > cy + hh && s.vy > 0) s.vy = -s.vy;
        if (U.dist2(s.x, s.y, p.x, p.y) > 900 * 900) { s.x = p.x; s.y = p.y; }
      }
      Game.grid.query(s.x, s.y, N.r + 40, near);
      for (var j = 0; j < near.length; j++) {
        var e = near[j];
        if (e.dead || e.zz) continue;
        var rr = e.r + N.r;
        if (U.dist2(s.x, s.y, e.x, e.y) > rr * rr) continue;
        if (s.circ) {
          if ((e.sawCd || 0) > Game.time) continue;
          e.sawCd = Game.time + N.hitCd;
          Enemies.damage(e, dmg, false, s.x, s.y, 10);
          continue;
        }
        if (e === s.last) continue;
        Enemies.damage(e, dmg, false, s.x, s.y, 14);
        FX.spray(e.x, e.y, Math.atan2(s.vy, s.vx), 3, '#ffd27d', 180);
        s.last = e;
        if (--s.hops < 0) { s.life = 0; break; }
        var nb = Game.nearestEnemy(s.x, s.y, N.seek, [e]), sp = N.sp;
        if (nb) { var a = U.angleTo(s.x, s.y, nb.x, nb.y); s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp; }
        else { var b = Math.atan2(-s.vy, -s.vx) + U.rand(-0.8, 0.8); s.vx = Math.cos(b) * sp; s.vy = Math.sin(b) * sp; }
        Snd.play('saw');
        break;
      }
      if (s.life <= 0) this.saws.splice(i, 1);
    }
  },

  fattest: function (p, n) {
    var R2 = this.N.rocket.range * this.N.rocket.range, list = Game.enemies, best = this._best || (this._best = []);
    best.length = 0;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.dead || e.zz || e.inv || U.dist2(p.x, p.y, e.x, e.y) > R2) continue;
      if (best.length < n) best.push(e);
      else if (e.hp > best[n - 1].hp) best[n - 1] = e;
      else continue;
      for (var j = best.length - 1; j > 0 && best[j].hp > best[j - 1].hp; j--) { var t = best[j]; best[j] = best[j - 1]; best[j - 1] = t; }
    }
    return best;
  },

  launch: function (p, L) {
    var N = this.N.rocket, hail = !!p.evo.rocket, n = hail ? N.hailN : N.n(L);
    var tg = this.fattest(p, hail ? n : 1);
    if (!tg.length) return false;
    var a0 = U.angleTo(p.x, p.y, tg[0].x, tg[0].y);
    for (var i = 0; i < n && this.rockets.length < N.cap; i++) {
      var a = a0 + (n > 1 ? (i / (n - 1) - 0.5) : 0) * (hail ? N.hailFan * 2 : 0.9);
      this.rockets.push({ x: p.x, y: p.y, a: a, sp: N.sp0, tg: tg[i % tg.length], life: N.life, t: 0, h: hail });
    }
    FX.spray(p.x, p.y, a0, hail ? 14 : 10, '#ffe09a', 320);
    FX.burst(p.x, p.y, hail ? 8 : 5, '#9a9088', 70, 0.8, 5);
    FX.ring(p.x, p.y, 10, hail ? 60 : 44, '#ffd27d', 0.25, 3, true);
    Snd.play('rocket');
    return true;
  },

  stepRockets: function (p, dt, k) {
    var N = this.N.rocket, L = Math.max(1, this.lv(p, 'rocket')), near = this._near2 || (this._near2 = []);
    for (var i = this.rockets.length - 1; i >= 0; i--) {
      var r = this.rockets[i], boom = false;
      r.t += dt;
      if ((r.life -= dt) <= 0) boom = true;
      var tg = r.tg;
      if (!tg || tg.dead || tg.zz) {
        tg = r.tg = Game.nearestEnemy(r.x, r.y, 360);
      }
      if (tg) {
        var want = U.angleTo(r.x, r.y, tg.x, tg.y);
        r.a = U.turn(r.a, want, N.turn * dt);
      }
      r.sp = Math.min(N.sp1, r.sp + 600 * dt);
      r.x += Math.cos(r.a) * r.sp * dt;
      r.y += Math.sin(r.a) * r.sp * dt;
      if (World.blocked(r.x, r.y)) boom = true;
      if (!boom) {
        Game.grid.query(r.x, r.y, 40, near);
        for (var j = 0; j < near.length; j++) {
          var e = near[j], rr = e.r + 6;
          if (!e.dead && !e.zz && U.dist2(r.x, r.y, e.x, e.y) < rr * rr) { boom = true; break; }
        }
      }
      if (!boom) continue;
      this.rockets.splice(i, 1);
      this.blast(r.x, r.y, N.blast(L) * p.st.radius, N.dmg(L) * k * (r.h ? N.hailK : 1));
    }
  },

  blast: function (x, y, R, dmg) {
    var near = this._near3 || (this._near3 = []);
    Game.grid.query(x, y, R, near);
    for (var i = 0; i < near.length; i++) {
      var e = near[i];
      if (e.dead || e.zz) continue;
      if (U.dist2(x, y, e.x, e.y) < (R + e.r * 0.5) * (R + e.r * 0.5)) Enemies.damage(e, dmg, false, x, y, 18);
    }
    World.damageArea(x, y, R, dmg);
    FX.rocket(x, y, R);
    Snd.play('splash');
  },

  dome: function (p, L, dt, mute, k) {
    var N = this.N.dome;
    if (p.domeT > 0) {
      if (mute) { p.domeT = 0; FX.ring(p.x, p.y, p.domeR * 0.6, p.domeR, '#b07ef5', 0.3, 3); return; }
      p.domeT -= dt;
      this.eat(p, p.domeR);
      if (p.domeT <= 0) FX.ring(p.x, p.y, p.domeR, p.domeR + 30, '#7ee0ff', 0.3, 2);
      return;
    }
    if (mute) return;
    if ((p.domeCd -= dt) > 0) return;
    p.domeCd = N.cd(L);
    p.domeT = N.dur(L);
    p.domeR = N.r(L) * p.st.radius;
    var near = this._near4 || (this._near4 = []), R = p.domeR;
    Game.grid.query(p.x, p.y, R, near);
    for (var i = 0; i < near.length; i++) {
      var e = near[i];
      if (e.dead || e.zz) continue;
      if (U.dist2(p.x, p.y, e.x, e.y) < R * R) Enemies.damage(e, N.dmg(L) * k, false, p.x, p.y, N.knock);
    }
    FX.ring(p.x, p.y, 20, R, p.evo.dome ? '#e8f4ff' : '#7ee0ff', 0.4, 5);
    Snd.play('dome');
  },

  eat: function (p, R) {
    var eb = Game.ebullets, R2 = R * R, mir = !!p.evo.dome, N = this.N.dome;
    for (var i = eb.length - 1; i >= 0; i--) {
      var b = eb[i];
      if (U.dist2(p.x, p.y, b.x, b.y) > R2) continue;
      eb.splice(i, 1);
      if (mir) {
        var a = Math.atan2(-b.vy, -b.vx), q = Player.bullet(p, a, N.mirK, 0, false);
        q.x = b.x; q.y = b.y; q.vx = Math.cos(a) * N.mirSp; q.vy = Math.sin(a) * N.mirSp;
        q.life = 1.4; q.c = '#e8f4ff';
        FX.spray(b.x, b.y, a, 2, '#e8f4ff', 160);
        Snd.play('shot');
      } else FX.spray(b.x, b.y, Math.atan2(b.vy, b.vx) + Math.PI, 2, '#7ee0ff', 100);
    }
    var G = Bosses.globs;
    for (var j = G.length - 1; j >= 0; j--) {
      var g = G[j];
      if (U.dist2(p.x, p.y, g.x, g.y) > R2) continue;
      G.splice(j, 1);
      FX.burst(g.x, g.y, 6, '#9fe05a', 120, 0.3, 3);
    }
  },

  ram: function (p, L, k) {
    var N = this.N.ram, dashing = p.dashT > 0;
    if (dashing && !p.ramOn) { p.ramN++; (p.ramHit || (p.ramHit = [])).length = 0; }
    if (dashing) this.plow(p, L, k);
    if (!dashing && p.ramOn && p.evo.ram) this.wave(p, L, k);
    p.ramOn = dashing;
  },

  plow: function (p, L, k) {
    var N = this.N.ram, near = this._near5 || (this._near5 = []), hit = p.ramHit, W = N.w(L);
    var dmg = N.dmg(L) * k, knock = N.knock(L);
    var ca = Math.cos(p.dashAng), sa = Math.sin(p.dashAng);
    Game.grid.query(p.x, p.y, p.r + W + 90, near);
    for (var i = 0; i < near.length; i++) {
      var e = near[i];
      if (e.dead || e.zz || hit.indexOf(e) >= 0) continue;
      var rr = p.r + e.r + W;
      if (U.dist2(p.x, p.y, e.x, e.y) > rr * rr) continue;
      hit.push(e);
      var side = (e.x - p.x) * -sa + (e.y - p.y) * ca >= 0 ? 1 : -1;
      Enemies.damage(e, dmg, false, p.x - ca * 30 + sa * side * 30, p.y - sa * 30 - ca * side * 30, e.boss ? 0 : knock);
      FX.spray(e.x, e.y, p.dashAng + side * 0.8, 3, '#ffb35c', 220);
    }
    if (hit.length && !p.ramSnd) { p.ramSnd = true; Snd.play('ram'); FX.shake(3); }
  },

  wave: function (p, L, k) {
    var N = this.N.ram, R = N.waveR(L) * p.st.radius, dmg = N.waveDmg(L), near = this._near5 || (this._near5 = []);
    p.ramSnd = false;
    var slam = p.tr.titan && window.Trophy ? Trophy.N.slam : null;
    if (slam && p.ramN % slam.every === 0) { R = Math.max(R, slam.r * p.st.radius); dmg += slam.dmg; }
    dmg *= k;
    Game.grid.query(p.x, p.y, R, near);
    for (var i = 0; i < near.length; i++) {
      var e = near[i];
      if (e.dead || e.zz) continue;
      if (U.dist2(p.x, p.y, e.x, e.y) < R * R) Enemies.damage(e, dmg, false, p.x, p.y, e.boss ? 0 : N.waveKnock);
    }
    World.damageArea(p.x, p.y, R, dmg);
    FX.ring(p.x, p.y, 16, R, '#ffb35c', 0.4, 7);
    FX.ring(p.x, p.y, 8, R * 0.6, '#ffffff', 0.25, 3, true);
    FX.shake(5);
    Snd.play('boom');
  },

  dashCd: function (p) { return p.skills.ram ? Math.max(this.N.ram.cdMin, p.st.dashCd) : p.st.dashCd; },
  dashMax: function (p) { return p.skills.ram && p.evo.ram ? 2 : 1; },

  draw: function (ctx) {
    var p = Game.player, i;
    if (!p || !this.on(p)) return;
    ctx.save();
    for (i = 0; i < this.saws.length; i++) {
      var s = this.saws[i], sr = s.circ ? 17 : 13;
      ctx.save();
      ctx.translate(s.x, s.y); ctx.rotate(s.spin);
      ctx.fillStyle = s.circ ? '#f2c46a' : '#c4beb4';
      ctx.beginPath();
      for (var t = 0; t < 16; t++) { var ra = t % 2 ? sr * 0.72 : sr, aa = t / 16 * Math.PI * 2; ctx.lineTo(Math.cos(aa) * ra, Math.sin(aa) * ra); }
      ctx.fill();
      ctx.fillStyle = '#3d3f42'; ctx.beginPath(); ctx.arc(0, 0, sr * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#ff9a3c';
    for (i = 0; i < this.rockets.length; i++) {
      var r = this.rockets[i];
      ctx.strokeStyle = 'rgba(255,154,60,.45)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - Math.cos(r.a) * 26, r.y - Math.sin(r.a) * 26); ctx.stroke();
      ctx.beginPath(); ctx.arc(r.x, r.y, 4, 0, Math.PI * 2); ctx.fill();
    }
    if (p.domeT > 0) {
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = p.evo.dome ? '#e8f4ff' : '#7ee0ff';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.domeR, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.8; ctx.lineWidth = 3; ctx.strokeStyle = ctx.fillStyle;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (p.skills.ram && p.dashT > 0) {
      ctx.strokeStyle = '#ffb35c'; ctx.lineWidth = 5; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + this.N.ram.w(this.lv(p, 'ram')), p.dashAng - 1, p.dashAng + 1); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
};
