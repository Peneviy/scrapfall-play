var World = {
  block: 720,
  chunks: {},
  near: [],
  crates: [],
  tmp: [],
  sea: false,
  isles: [],
  isleSets: [],
  camps: [],
  isleDefs: {},
  nDefs: 0,
  K: {
    isle: { chance: 0.2, camp: 0.6, depth: 2400, tiers: 4, grow: 0.22 },
    camp: { spawn: 1100, wake: 240, drop: 2000, guards: 3, guardEvery: 3, guardsMax: 4, bossHp: 1.5,
            chest: 6, chestPerMin: 0.5, chestMax: 14,
            tierHp: 0.3, tierGuard: 1, tierGuardHp: 0.2, tierChest: 0.5, tierMax: 3, buff: 1, card: 3 },
    mine: { touch: 2 }
  },

  reset: function (theme) {
    this.chunks = {};
    this.nChunks = 0;
    this.near.length = 0;
    this.crates.length = 0;
    this.isles.length = 0;
    this.isleSets.length = 0;
    this.camps.length = 0;
    this.isleDefs = {};
    this.nDefs = 0;
    this.sea = (theme || (window.Maps ? Maps.theme() : 'scrap')) === 'sea';
  },

  rng: function (cx, cy) {
    var s = (cx * 374761393 + cy * 668265263) >>> 0;
    s = (s ^ (s >>> 13)) * 1274126177 >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  inWalls: function (walls, x, y, pad) {
    for (var i = 0; i < walls.length; i++) {
      var w = walls[i];
      if (x > w.x - pad && x < w.x + w.w + pad && y > w.y - pad && y < w.y + w.h + pad) return true;
    }
    return false;
  },

  chunk: function (cx, cy) {
    var key = cx + ':' + cy;
    var c = this.chunks[key];
    if (c) return c;

    c = { walls: [], crates: [], isles: [], camp: null };
    if (this.sea) this.fillSea(c, cx, cy);
    else if (!(cx === 0 && cy === 0)) {
      var r = this.rng(cx, cy);
      if (r() < 0.55) {
        var ox = cx * this.block, oy = cy * this.block;
        var count = 1 + Math.floor(r() * 3);
        for (var i = 0; i < count; i++) {
          var horiz = r() < 0.5;
          var w = horiz ? 90 + r() * 200 : 40 + r() * 60;
          var h = horiz ? 40 + r() * 60 : 90 + r() * 200;
          var x = ox + 60 + r() * (this.block - w - 120);
          var y = oy + 60 + r() * (this.block - h - 120);
          c.walls.push({ x: x, y: y, w: w, h: h });
        }
        if (r() < 0.75 && c.walls.length) {
          var base = c.walls[Math.floor(r() * c.walls.length)];
          var side = r() < 0.5 ? -1 : 1;
          var kx = base.x + base.w / 2 + side * (base.w / 2 + 26), ky = base.y + base.h / 2 + (r() - 0.5) * base.h;
          if (this.inWalls(c.walls, kx, ky, 14)) kx = base.x + base.w / 2 - side * (base.w / 2 + 26);
          if (!this.inWalls(c.walls, kx, ky, 14)) c.crates.push({ x: kx, y: ky, r: 15, hp: 40, dead: false, hit: 0 });
        }
      }
      var nb = r() < 0.55 ? 1 + Math.floor(r() * 3) : 0;
      var bx0 = cx * this.block, by0 = cy * this.block;
      for (var bi = 0; bi < nb; bi++) {
        var bx = bx0 + 60 + r() * (this.block - 120), by = by0 + 60 + r() * (this.block - 120);
        var clear = true;
        for (var wi = 0; wi < c.walls.length; wi++) {
          var ww = c.walls[wi];
          if (bx > ww.x - 24 && bx < ww.x + ww.w + 24 && by > ww.y - 24 && by < ww.y + ww.h + 24) clear = false;
        }
        if (!clear) continue;
        c.crates.push({ x: bx, y: by, r: 11, hp: 12, dead: false, hit: 0, ex: true });
        if (r() < 0.4 && !this.inWalls(c.walls, bx + 22, by + 8, 10)) c.crates.push({ x: bx + 22, y: by + 8, r: 11, hp: 12, dead: false, hit: 0, ex: true });
      }
      for (var ci = 0; ci < c.crates.length; ci++) {
        if (c.crates[ci].ex) continue;
        var roll = r() * 12;
        c.crates[ci].loot = roll < 4 ? 'scrap' : (roll < 7 ? 'heal' : (roll < 9 ? 'rage' : (roll < 11 ? 'haste' : 'shield')));
      }
    }
    this.chunks[key] = c;
    this.nChunks = (this.nChunks || 0) + 1;
    return c;
  },

  fillSea: function (c, cx, cy) {
    if (cx === 0 && cy === 0) return;
    var b = this.block, ox = cx * b, oy = cy * b, i, j, K = this.K;
    var r = this.rng(cx + 131, cy - 977);
    var def = this.isleDef(cx, cy);
    var over = [];
    for (i = -1; i <= 1; i++) {
      for (j = -1; j <= 1; j++) {
        var nd = (i || j) ? this.isleDef(cx + i, cy + j) : null;
        if (!nd) continue;
        for (var oq = 0; oq < nd.set.length; oq++) {
          var os = nd.set[oq];
          if (os.x + os.r > ox && os.x - os.r < ox + b && os.y + os.r > oy && os.y - os.r < oy + b) over.push(os);
        }
      }
    }
    var roll = r();
    if (def) {
      var ix = def.x, iy = def.y, R0 = def.r, tier = def.tier;
      c.isles = def.set;
      var nr = 1 + Math.floor(r() * 2) + (tier >> 1);
      for (i = 0; i < nr; i++) {
        var ra = r() * 6.28, rd = R0 * (0.55 + r() * 0.2);
        var rh = r() < 0.5, rw = rh ? 60 + r() * 40 : 24 + r() * 8, rhh = rh ? 24 + r() * 8 : 60 + r() * 40;
        c.walls.push({ x: ix + Math.cos(ra) * rd - rw / 2, y: iy + Math.sin(ra) * rd - rhh / 2, w: rw, h: rhh, kind: 'ruin' });
      }
      var camp = r() < K.isle.camp;
      if (def.first || camp) c.camp = { x: ix, y: iy, st: 0, list: [], crates: c.crates, tier: tier, seed: def.seed };
      else if (r() < 0.6) {
        var ca = r() * 6.28, kx0 = ix + Math.cos(ca) * R0 * 0.3, ky0 = iy + Math.sin(ca) * R0 * 0.3;
        if (!this.inWalls(c.walls, kx0, ky0, 16)) c.crates.push({ x: kx0, y: ky0, r: 15, hp: 40, dead: false, hit: 0 });
      }
      if (tier >= 2 && def.set.length > 2) {
        var far = def.set[def.set.length - 1];
        if (!this.inWalls(c.walls, far.x, far.y, 16)) c.crates.push({ x: far.x, y: far.y, r: 15, hp: 40, dead: false, hit: 0 });
      }
    } else if (roll < 0.775) {
      var count = 1 + Math.floor(r() * 3), wreck = false;
      for (i = 0; i < count; i++) {
        var kr = r(), kind = kr < 0.34 ? 'box' : (kr < 0.64 ? 'heap' : (kr < 0.92 ? 'rock' : 'wreck'));
        if (kind === 'wreck' && wreck) kind = 'rock';
        var hz = r() < 0.5, lw, sh;
        if (kind === 'box') { lw = 90 + r() * 200; sh = 40 + r() * 60; }
        else if (kind === 'heap') { lw = 90 + r() * 70; sh = 70 + r() * 50; }
        else if (kind === 'rock') { lw = 70 + r() * 120; sh = 50 + r() * 60; }
        else { lw = 150 + r() * 60; sh = 56 + r() * 16; wreck = true; }
        var w2 = hz ? lw : sh, h2 = hz ? sh : lw;
        var wx = ox + 60 + r() * (b - w2 - 120), wy = oy + 60 + r() * (b - h2 - 120);
        if (kind !== 'rock' && this.inIsles(over, wx + w2 / 2, wy + h2 / 2, 30)) { if (kind === 'wreck') wreck = false; kind = 'rock'; }
        c.walls.push({ x: wx, y: wy, w: w2, h: h2, kind: kind });
      }
      if (r() < 0.75) {
        var base = c.walls[Math.floor(r() * c.walls.length)];
        var side = r() < 0.5 ? -1 : 1;
        var kx = base.x + base.w / 2 + side * (base.w / 2 + 28), ky = base.y + base.h / 2 + (r() - 0.5) * base.h;
        if (this.inWalls(c.walls, kx, ky, 14)) kx = base.x + base.w / 2 - side * (base.w / 2 + 28);
        if (!this.inWalls(c.walls, kx, ky, 14)) c.crates.push({ x: kx, y: ky, r: 15, hp: 40, dead: false, hit: 0 });
      }
    }
    var nb = r() < 0.55 ? 1 + Math.floor(r() * 3) : 0;
    for (var bi = 0; bi < nb; bi++) {
      var bx = ox + 60 + r() * (b - 120), by = oy + 60 + r() * (b - 120), pair = r() < 0.4;
      if (this.inWalls(c.walls, bx, by, 24) || this.inIsles(c.isles, bx, by, 40) || this.inIsles(over, bx, by, 40)) continue;
      c.crates.push({ x: bx, y: by, r: 11, hp: 12, dead: false, hit: 0, ex: true });
      if (pair && !this.inWalls(c.walls, bx + 26, by + 10, 10)) c.crates.push({ x: bx + 26, y: by + 10, r: 11, hp: 12, dead: false, hit: 0, ex: true });
    }
    for (var ci = 0; ci < c.crates.length; ci++) {
      if (c.crates[ci].ex) continue;
      var lr2 = r() * 12;
      c.crates[ci].loot = lr2 < 4 ? 'scrap' : (lr2 < 7 ? 'heal' : (lr2 < 9 ? 'rage' : (lr2 < 11 ? 'haste' : 'shield')));
    }
  },

  tier: function (x, y) {
    var K = this.K.isle;
    return Math.min(K.tiers, Math.floor(Math.sqrt(x * x + y * y) / K.depth));
  },

  isleDef: function (cx, cy) {
    var key = cx + ':' + cy, D = this.isleDefs, d = D[key];
    if (d !== undefined) return d;
    d = null;
    var K = this.K.isle, b = this.block, ox = cx * b, oy = cy * b;
    var r = this.rng(cx + 7919, cy - 3571);
    var first = cx === 0 && cy === -1, roll = r();
    if (!(cx === 0 && cy === 0) && (first || roll < K.chance)) {
      var ix = ox + 260 + r() * (b - 520), iy = oy + 260 + r() * (b - 520);
      if (first) { ix = ox + 430; iy = oy + 330; }
      var t = first ? 0 : this.tier(ix, iy);
      var R0 = (135 + r() * 65) * (1 + K.grow * t), n = 2 + Math.floor(r() * 3) + (t >> 1);
      var set = [{ x: ix, y: iy, r: R0, main: 1 }];
      for (var i = 1; i < n; i++) {
        var la = r() * 6.28, lr = R0 * (0.5 + r() * 0.3);
        set.push({ x: ix + Math.cos(la) * R0 * 0.85, y: iy + Math.sin(la) * R0 * 0.85, r: lr, main: 0 });
      }
      d = { x: ix, y: iy, r: R0, tier: t, set: set, first: first, seed: Math.floor(r() * 1e6) };
    }
    if (this.nDefs > 1500) { D = this.isleDefs = {}; this.nDefs = 0; }
    D[key] = d;
    this.nDefs++;
    return d;
  },

  inIsles: function (isles, x, y, pad) {
    for (var i = 0; i < isles.length; i++) {
      var q = isles[i], dx = x - q.x, dy = y - q.y, rr = q.r + pad;
      if (rr > 0 && dx * dx + dy * dy < rr * rr) return true;
    }
    return false;
  },
  isleAt: function (x, y) {
    var b = this.block, cx0 = Math.floor(x / b), cy0 = Math.floor(y / b);
    for (var cx = cx0 - 1; cx <= cx0 + 1; cx++) {
      for (var cy = cy0 - 1; cy <= cy0 + 1; cy++) if (this.inIsles(this.chunk(cx, cy).isles, x, y, 0)) return true;
    }
    return false;
  },
  land: function (x, y, pad) { return this.isles.length > 0 && this.inIsles(this.isles, x, y, pad || 0); },

  campTick: function () {
    var p = Game.player, K = this.K.camp, i, j;
    for (i = 0; i < this.camps.length; i++) {
      var c = this.camps[i], d2 = U.dist2(p.x, p.y, c.x, c.y);
      if (c.st === 0) {
        if (d2 < K.spawn * K.spawn && d2 > 420 * 420) this.campSpawn(c);
      } else if (c.st === 1) {
        if (d2 > K.drop * K.drop) {
          for (j = 0; j < c.list.length; j++) c.list[j].dead = true;
          c.list.length = 0; c.st = 0;
          continue;
        }
        var hit = d2 < K.wake * K.wake;
        for (j = 0; j < c.list.length && !hit; j++) hit = c.list[j].dead || c.list[j].hp < c.list[j].maxHp;
        if (hit) this.campWake(c);
      } else if (c.st === 2) {
        var alive = 0;
        for (j = 0; j < c.list.length; j++) if (!c.list[j].dead) alive++;
        if (!alive) this.campClear(c);
      }
    }
  },
  campLead: [['brute'], ['brute', 'charger'], ['shellback', 'splitter', 'charger'], ['shellback', 'splitter', 'brute'], ['shellback', 'splitter']],
  leadHp: { brute: 1, charger: 2, shellback: 0.3, splitter: 1.2 },
  campGuard: ['grunt', 'grunt', 'spitter', 'runner', 'spitter', 'charger', 'brute'],
  campSpawn: function (c) {
    var K = this.K.camp, T = c.tier || 0, seed = c.seed || 0, i, e;
    c.list.length = 0;
    var pool = this.campLead[Math.min(T, this.campLead.length - 1)], lead = pool[seed % pool.length];
    e = Enemies.spawn(lead, c.x, c.y - 14, true, true);
    if (e) {
      e.hp *= K.bossHp * (1 + K.tierHp * T) * (this.leadHp[lead] || 1); e.maxHp = e.hp;
      e.r *= 1.12 + 0.04 * T; e.coins *= 2 + T; e.xp *= 2 + T; e.mini = true;
      if (T >= 2 && !e.esp) { var xp0 = e.xp; Enemies.eliteSpell(e); e.xp = xp0; }
      if (e.esp === 2) e.esh = e.eshMax = e.maxHp * Enemies.K.esp.shield;
      c.list.push(e);
    }
    for (i = 0; i < T - 2; i++) {
      e = Enemies.spawn(i ? 'spitter' : 'brute', c.x + (i ? 60 : -60), c.y + 30, true, true);
      if (e) c.list.push(e);
    }
    var n = K.guards + Math.min(K.guardsMax, Math.floor(Game.time / 60 / K.guardEvery)) + K.tierGuard * T;
    var kinds = Math.min(this.campGuard.length, 3 + T);
    for (i = 0; i < n; i++) {
      var a = i / n * 6.283 + 0.4, rad = 66 + (i % 3) * 22 + T * 16;
      e = Enemies.spawn(this.campGuard[(i + seed) % kinds], c.x + Math.cos(a) * rad, c.y + Math.sin(a) * rad, false, true);
      if (e) { e.hp *= 1 + K.tierGuardHp * T; e.maxHp = e.hp; e.ang = a; c.list.push(e); }
    }
    for (i = 0; i < c.list.length; i++) { c.list[i].zz = true; c.list[i].camp = c; }
    c.st = c.list.length ? 1 : 0;
  },
  campWake: function (c) {
    c.st = 2;
    for (var i = 0; i < c.list.length; i++) c.list[i].zz = false;
    FX.text(c.x, c.y - 44, I18N.t((c.tier || 0) >= 2 ? 'campWake2' : 'campWake'), CFG.col.debuff, 16);
    FX.ring(c.x, c.y, 20, 150, CFG.col.debuff, 0.5, 3);
    Snd.play('aggro');
  },
  campClear: function (c) {
    c.st = 3;
    c.list.length = 0;
    c.crates.push({ x: c.x, y: c.y, r: 17, hp: 60, dead: false, hit: 0, chest: true, loot: 'chest', tier: c.tier || 0 });
    FX.ring(c.x, c.y, 10, 120, CFG.col.ally, 0.6, 4);
    FX.burst(c.x, c.y, 16, '#e8d2a0', 180, 0.6, 3);
    FX.text(c.x, c.y - 40, I18N.t('campChest'), CFG.col.ally, 16);
    Snd.play('buy');
  },
  chestOpen: function (c) {
    var K = this.K.camp, T = c.tier || 0, i;
    c.dead = true;
    for (i = 0; i < this.camps.length; i++) if (this.camps[i].crates.indexOf(c) >= 0) this.camps[i].st = 4;
    FX.blast(c.x, c.y, 70, '#ffd27d');
    FX.burst(c.x, c.y, 26, '#ffd27d', 280, 0.8, 4);
    FX.ring(c.x, c.y, 8, 110, '#ffd27d', 0.5, 4);
    FX.shake(2);
    Snd.play('crateBreak');
    var n = Math.min(K.chestMax + K.tierMax * T, Math.round((K.chest + Game.time / 60 * K.chestPerMin) * (1 + K.tierChest * T)));
    for (i = 0; i < n; i++) {
      var a = i / n * 6.283, rad = 30 + (i % (n > 14 ? 3 : 2)) * 16;
      Game.drops.push({ x: c.x + Math.cos(a) * rad, y: c.y + Math.sin(a) * rad, r: 13, t: 'scrap', life: 45, bob: i, crate: true });
    }
    Game.drops.push({ x: c.x, y: c.y, r: 13, t: 'heal', life: 45, bob: 0, crate: true });
    if (T >= K.buff) {
      var bf = ['rage', 'haste', 'shield'], b0 = Math.floor(Math.random() * 3);
      for (i = 0; i < Math.min(2, T); i++) {
        Game.drops.push({ x: c.x + (i ? 24 : -24), y: c.y - 84, r: 13, t: this.freshBuff(bf[(b0 + i) % 3]), life: 45, bob: i * 2, crate: true });
      }
    }
    if (T >= K.card && Game.player && Game.player.alive) {
      Player.grantLevel(Game.player);
      FX.text(c.x, c.y - 62, I18N.t('campCard'), CFG.col.tech, 18);
    }
  },

  mineTick: function () {
    var p = Game.player, near = this.tmp, pad = this.K.mine.touch, i, j, rr;
    for (i = 0; i < this.crates.length; i++) {
      var c = this.crates[i];
      if (!c.ex || c.dead || this.land(c.x, c.y)) continue;
      rr = p.r + c.r + pad;
      if (p.alive && U.dist2(p.x, p.y, c.x, c.y) < rr * rr) { this.explode(c); continue; }
      near.length = 0;
      Game.grid.query(c.x, c.y, c.r + 40, near);
      for (j = 0; j < near.length; j++) {
        var e = near[j];
        if (e.dead || e.zz || e.type === 'swarm' || e.def.decoy) continue;
        rr = e.r + c.r + pad;
        if (U.dist2(e.x, e.y, c.x, c.y) < rr * rr) { this.explode(c); break; }
      }
    }
  },

  refresh: function (x, y, radius) {
    this.near.length = 0;
    this.crates.length = 0;
    this.isles.length = 0;
    this.isleSets.length = 0;
    this.camps.length = 0;
    var b = this.block;
    var x0 = Math.floor((x - radius) / b), x1 = Math.floor((x + radius) / b);
    var y0 = Math.floor((y - radius) / b), y1 = Math.floor((y + radius) / b);
    for (var cx = x0; cx <= x1; cx++) {
      for (var cy = y0; cy <= y1; cy++) {
        var c = this.chunk(cx, cy);
        for (var i = 0; i < c.walls.length; i++) this.near.push(c.walls[i]);
        for (var j = 0; j < c.crates.length; j++) if (!c.crates[j].dead) this.crates.push(c.crates[j]);
        for (var q = 0; q < c.isles.length; q++) this.isles.push(c.isles[q]);
        if (c.isles.length) this.isleSets.push(c.isles);
        if (c.camp) this.camps.push(c.camp);
      }
    }
    if (this.nChunks > 220) {
      var keys = Object.keys(this.chunks);
      for (var k = 0; k < keys.length; k++) {
        var p = keys[k].split(':');
        if (Math.abs(p[0] - x / b) > 6 || Math.abs(p[1] - y / b) > 6) { delete this.chunks[keys[k]]; this.nChunks--; }
      }
    }
  },

  blocked: function (x, y) {
    for (var i = 0; i < this.near.length; i++) {
      var w = this.near[i];
      if (x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h) return true;
    }
    return false;
  },

  segBlocked: function (x0, y0, x1, y1) {
    var dx = x1 - x0, dy = y1 - y0;
    for (var i = 0; i < this.near.length; i++) {
      var w = this.near[i], t0 = 0, t1 = 1, a, b, c;
      if (Math.abs(dx) < 1e-6) { if (x0 <= w.x || x0 >= w.x + w.w) continue; }
      else {
        a = (w.x - x0) / dx; b = (w.x + w.w - x0) / dx;
        if (a > b) { c = a; a = b; b = c; }
        if (a > t0) t0 = a;
        if (b < t1) t1 = b;
        if (t0 > t1) continue;
      }
      if (Math.abs(dy) < 1e-6) { if (y0 <= w.y || y0 >= w.y + w.h) continue; }
      else {
        a = (w.y - y0) / dy; b = (w.y + w.h - y0) / dy;
        if (a > b) { c = a; a = b; b = c; }
        if (a > t0) t0 = a;
        if (b < t1) t1 = b;
        if (t0 > t1) continue;
      }
      return true;
    }
    return false;
  },

  freeAt: function (x, y, pad) {
    var b = this.block, cx0 = Math.floor(x / b), cy0 = Math.floor(y / b);
    for (var cx = cx0 - 1; cx <= cx0 + 1; cx++) {
      for (var cy = cy0 - 1; cy <= cy0 + 1; cy++) {
        var ws = this.chunk(cx, cy).walls;
        for (var i = 0; i < ws.length; i++) {
          var w = ws[i];
          if (x > w.x - pad && x < w.x + w.w + pad && y > w.y - pad && y < w.y + w.h + pad) return false;
        }
      }
    }
    return true;
  },

  blockingWall: function (o, pad) {
    pad = pad || 6;
    for (var i = 0; i < this.near.length; i++) {
      var w = this.near[i];
      var cx = U.clamp(o.x, w.x, w.x + w.w);
      var cy = U.clamp(o.y, w.y, w.y + w.h);
      var dx = o.x - cx, dy = o.y - cy;
      if (dx * dx + dy * dy < (o.r + pad) * (o.r + pad)) return w;
    }
    return null;
  },

  resolve: function (o) {
    var rr = o.r + 1;
    for (var i = 0; i < this.near.length; i++) {
      var w = this.near[i];
      if (o.x + rr < w.x || o.x - rr > w.x + w.w || o.y + rr < w.y || o.y - rr > w.y + w.h) continue;
      var cx = U.clamp(o.x, w.x, w.x + w.w);
      var cy = U.clamp(o.y, w.y, w.y + w.h);
      var dx = o.x - cx, dy = o.y - cy;
      var d2 = dx * dx + dy * dy;
      if (d2 > o.r * o.r) continue;

      if (d2 > 0.0001) {
        var d = Math.sqrt(d2);
        var push = o.r - d;
        o.x += dx / d * push;
        o.y += dy / d * push;
      } else {
        var left = o.x - w.x, right = w.x + w.w - o.x;
        var top = o.y - w.y, bottom = w.y + w.h - o.y;
        var m = Math.min(left, right, top, bottom);
        if (m === left) o.x = w.x - o.r;
        else if (m === right) o.x = w.x + w.w + o.r;
        else if (m === top) o.y = w.y - o.r;
        else o.y = w.y + w.h + o.r;
      }
    }
  },

  hitCrate: function (c, dmg) {
    c.hp -= dmg;
    c.hit = 0.1;
    if (c.hp > 0) { Snd.play('crate'); return; }
    if (c.ex) { this.explode(c); return; }
    if (c.chest) { this.chestOpen(c); return; }
    c.dead = true;
    FX.blast(c.x, c.y, 40, '#ffcf7a');
    FX.burst(c.x, c.y, 14, '#c9a06a', 200, 0.5, 3);
    FX.ring(c.x, c.y, 6, 60, '#ffd27d', 0.3, 2);
    Snd.play('crateBreak');
    this.drop(c.x, c.y, c.loot, true);
  },

  touchCrates: function (p) {
    for (var i = 0; i < this.crates.length; i++) {
      var c = this.crates[i];
      if (c.ex || c.dead) continue;
      var rr = p.r + c.r;
      if (U.dist2(p.x, p.y, c.x, c.y) < rr * rr) this.hitCrate(c, c.hp);
    }
  },

  damageArea: function (x, y, rad, dmg, cd) {
    for (var i = 0; i < this.crates.length; i++) {
      var o = this.crates[i];
      if (o.dead) continue;
      var rr = rad + o.r;
      if (U.dist2(x, y, o.x, o.y) > rr * rr) continue;
      if (o.ex) { this.explode(o); continue; }
      if (cd) {
        if ((o.areaCd || 0) > Game.time) continue;
        o.areaCd = Game.time + cd;
      }
      this.hitCrate(o, dmg);
    }
  },

  boomR: 125,
  explode: function (c) {
    if (c.dead) return;
    c.dead = true;
    var R = this.boomR, p = Game.player;
    FX.blast(c.x, c.y, R, '#ff8a3c');
    FX.ring(c.x, c.y, 10, R, '#ff8a3c', 0.35, 5);
    FX.burst(c.x, c.y, 18, '#ff7a2c', 260, 0.6, 4);
    FX.shake(3);
    Snd.play('barrel');
    var dmg = 42 * Enemies.hpMult();
    var near = [];
    Game.grid.query(c.x, c.y, R, near);
    for (var i = 0; i < near.length; i++) {
      var e = near[i];
      if (e.dead || U.dist2(c.x, c.y, e.x, e.y) > R * R) continue;
      Enemies.damage(e, e.boss ? dmg * 0.35 : dmg, false, c.x, c.y, 40);
    }
    if (p && p.alive && U.dist2(c.x, c.y, p.x, p.y) < R * R * 0.4) p.hurt(p.st.maxHp * 0.12);
    this.igniteNear(c.x, c.y, R * 0.8);
  },

  igniteNear: function (x, y, rad) {
    for (var i = 0; i < this.crates.length; i++) {
      var o = this.crates[i];
      if (o.ex && !o.dead && U.dist2(x, y, o.x, o.y) < rad * rad) this.explode(o);
    }
  },

  drop: function (x, y, t, crate) {
    var roll = t || U.weighted([
      { w: 4, t: 'scrap' },
      { w: 3, t: 'heal' },
      { w: 2, t: 'rage' },
      { w: 2, t: 'haste' },
      { w: 1, t: 'shield' }
    ]).t;
    Game.drops.push({ x: x, y: y, r: 13, t: this.freshBuff(roll), life: 25, bob: Math.random() * 6.28, crate: !!crate });
  },

  freshBuff: function (t) {
    var p = Game.player, b = p && p.buffs;
    if (!b || !(t === 'rage' || t === 'haste' || t === 'shield') || !(b[t] > 0)) return t;
    var free = [];
    if (!(b.rage > 0)) free.push('rage');
    if (!(b.haste > 0)) free.push('haste');
    if (!(b.shield > 0)) free.push('shield');
    if (free.length) return U.pick(free);
    return p.hp < p.st.maxHp ? 'heal' : 'scrap';
  },

  draw: function (ctx) {
    var i;
    for (i = 0; i < this.isles.length; i++) {
      var q = this.isles[i];
      ctx.fillStyle = '#b8a070';
      ctx.beginPath(); ctx.arc(q.x, q.y, q.r + 10, 0, Math.PI * 2); ctx.fill();
    }
    for (i = 0; i < this.isles.length; i++) {
      q = this.isles[i];
      ctx.fillStyle = '#e2cf9c';
      ctx.beginPath(); ctx.arc(q.x, q.y, q.r - 4, 0, Math.PI * 2); ctx.fill();
    }
    for (i = 0; i < this.near.length; i++) {
      var w = this.near[i];
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.fillRect(w.x + 6, w.y + 8, w.w, w.h);
      ctx.fillStyle = '#26404b';
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = '#35606e';
      ctx.fillRect(w.x, w.y, w.w, 7);
      ctx.strokeStyle = '#4e8496';
      ctx.lineWidth = 2;
      ctx.strokeRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = '#7fb3c2';
      ctx.fillRect(w.x + 4, w.y + 11, 3, 3);
      ctx.fillRect(w.x + w.w - 7, w.y + 11, 3, 3);
    }
    for (i = 0; i < this.crates.length; i++) {
      var c = this.crates[i];
      if (c.hit > 0) c.hit -= 0.016;
      if (c.ex) {
        ctx.fillStyle = c.hit > 0 ? '#ffffff' : '#b8301e';
        ctx.strokeStyle = '#e8ab2f';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        continue;
      }
      var med = c.loot === 'heal';
      if (c.chest) GlowCache.draw(ctx, 'rgba(255,210,125,.5)', c.x, c.y, c.r * 2.8, 0.6 + 0.4 * Math.sin(Game.time * 5));
      if (med) GlowCache.draw(ctx, 'rgba(126,224,138,.45)', c.x, c.y, c.r * 2.6, 0.55 + 0.45 * Math.sin(Game.time * 5));
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.fillStyle = c.hit > 0 ? '#ffffff' : (med ? '#e9f3ea' : '#7a5a34');
      ctx.strokeStyle = med ? CFG.col.heal : '#ffd27d';
      ctx.lineWidth = 2;
      ctx.fillRect(-c.r, -c.r, c.r * 2, c.r * 2);
      ctx.strokeRect(-c.r, -c.r, c.r * 2, c.r * 2);
      if (med) {
        ctx.fillStyle = CFG.col.heal;
        ctx.fillRect(-c.r * 0.6, -c.r * 0.2, c.r * 1.2, c.r * 0.4);
        ctx.fillRect(-c.r * 0.2, -c.r * 0.6, c.r * 0.4, c.r * 1.2);
      } else {
        ctx.beginPath();
        ctx.moveTo(-c.r, -c.r); ctx.lineTo(c.r, c.r);
        ctx.moveTo(c.r, -c.r); ctx.lineTo(-c.r, c.r);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
};
