// Строения и ящики. Карта бесконечная, поэтому куски генерятся на лету по
// хешу координат: одна и та же клетка всегда дает одни и те же стены.
var World = {
  block: 720,          // размер куска мира
  chunks: {},          // "cx:cy" -> { walls: [], crates: [] }
  near: [],            // стены рядом с игроком, пересчитываются раз в кадр
  crates: [],          // живые ящики рядом
  tmp: [],

  reset: function () {
    this.chunks = {};
    this.near.length = 0;
    this.crates.length = 0;
  },

  // детерминированный генератор: из координат куска делаем поток чисел
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

  chunk: function (cx, cy) {
    var key = cx + ':' + cy;
    var c = this.chunks[key];
    if (c) return c;

    c = { walls: [], crates: [] };
    // вокруг точки старта чисто, иначе можно родиться внутри стены
    if (!(cx === 0 && cy === 0)) {
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
        // ящик прижимаем к стене: так он выглядит как заначка, а не мусор в поле
        if (r() < 0.75 && c.walls.length) {
          var base = c.walls[Math.floor(r() * c.walls.length)];
          c.crates.push({
            x: base.x + base.w / 2 + (r() < 0.5 ? -1 : 1) * (base.w / 2 + 26),
            y: base.y + base.h / 2 + (r() - 0.5) * base.h,
            r: 15, hp: 40, dead: false, hit: 0
          });
        }
      }
      // Красные бочки с горючим. Генерятся после стен и ящиков, чтобы старая
      // раскладка мира не поменялась. Стрельнул - рвануло и раскидало толпу.
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
        // бочки любят стоять кучкой: тогда взрыв цепной
        if (r() < 0.4) c.crates.push({ x: bx + 22, y: by + 8, r: 11, hp: 12, dead: false, hit: 0, ex: true });
      }
      // Начинку ящика решаем здесь же, из того же потока: тогда ящик с аптечкой
      // можно пометить заранее, и при пересоздании куска он не сменит содержимое.
      for (var ci = 0; ci < c.crates.length; ci++) {
        if (c.crates[ci].ex) continue;
        var roll = r() * 12;
        c.crates[ci].loot = roll < 4 ? 'scrap' : (roll < 7 ? 'heal' : (roll < 9 ? 'rage' : (roll < 11 ? 'haste' : 'shield')));
      }
    }
    this.chunks[key] = c;
    return c;
  },

  // Собираем стены и ящики вокруг игрока один раз за кадр.
  refresh: function (x, y, radius) {
    this.near.length = 0;
    this.crates.length = 0;
    var b = this.block;
    var x0 = Math.floor((x - radius) / b), x1 = Math.floor((x + radius) / b);
    var y0 = Math.floor((y - radius) / b), y1 = Math.floor((y + radius) / b);
    for (var cx = x0; cx <= x1; cx++) {
      for (var cy = y0; cy <= y1; cy++) {
        var c = this.chunk(cx, cy);
        for (var i = 0; i < c.walls.length; i++) this.near.push(c.walls[i]);
        for (var j = 0; j < c.crates.length; j++) if (!c.crates[j].dead) this.crates.push(c.crates[j]);
      }
    }
    // карта бесконечная, но память не бесконечная: дальние куски забываем
    var keys = Object.keys(this.chunks);
    if (keys.length > 220) {
      for (var k = 0; k < keys.length; k++) {
        var p = keys[k].split(':');
        if (Math.abs(p[0] - x / b) > 6 || Math.abs(p[1] - y / b) > 6) delete this.chunks[keys[k]];
      }
    }
  },

  // точка внутри стены (для пуль)
  blocked: function (x, y) {
    for (var i = 0; i < this.near.length; i++) {
      var w = this.near[i];
      if (x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h) return true;
    }
    return false;
  },

  // Стена, в которую уперлись: нужна, чтобы знать, куда ее обходить.
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

  // Выталкиваем круг из стен. Двигаем по той оси, где перекрытие меньше,
  // тогда получается скольжение вдоль стены, а не залипание в углу.
  resolve: function (o) {
    for (var i = 0; i < this.near.length; i++) {
      var w = this.near[i];
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
        // центр внутри прямоугольника: выталкиваем через ближайшую грань
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

  // ящик получил урон
  hitCrate: function (c, dmg) {
    c.hp -= dmg;
    c.hit = 0.1;
    if (c.hp > 0) { Snd.play('hit'); return; }
    if (c.ex) { this.explode(c); return; }
    c.dead = true;
    FX.blast(c.x, c.y, 40, '#ffcf7a');
    FX.burst(c.x, c.y, 14, '#c9a06a', 200, 0.5, 3);
    FX.ring(c.x, c.y, 6, 60, '#ffd27d', 0.3, 2);
    Snd.play('boom');
    this.drop(c.x, c.y, c.loot);
  },

  // Ящик ломается и телом: автоприцел по ящикам не стреляет, и игроки не
  // понимали, как достать аптечку. Бочку телом не трогаем - она бьет и по нам.
  touchCrates: function (p) {
    for (var i = 0; i < this.crates.length; i++) {
      var c = this.crates[i];
      if (c.ex || c.dead) continue;
      var rr = p.r + c.r;
      if (U.dist2(p.x, p.y, c.x, c.y) < rr * rr) this.hitCrate(c, c.hp);
    }
  },

  // Урон по площади: взрывы, кольцо, горн, спутники. Бочки детонируют,
  // ящики ломаются. cd - пауза между ударами по одному ящику (спутники).
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

  // Бочка рванула. Урон растет вместе с врагами, иначе к десятой минуте
  // бочка их только щекочет. Боссу достается меньше, игроку - если стоял
  // рядом. Соседние бочки детонируют следом.
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

  // Выпадение из ящика. Баффы временные, поэтому не ломают баланс забега.
  drop: function (x, y, t) {
    var roll = t || U.weighted([
      { w: 4, t: 'scrap' },
      { w: 3, t: 'heal' },
      { w: 2, t: 'rage' },
      { w: 2, t: 'haste' },
      { w: 1, t: 'shield' }
    ]).t;
    Game.drops.push({ x: x, y: y, r: 13, t: roll, life: 25, bob: Math.random() * 6.28 });
  },

  draw: function (ctx) {
    var i;
    for (i = 0; i < this.near.length; i++) {
      var w = this.near[i];
      // тень, чтобы блок читался как объем, а не как дырка в полу
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.fillRect(w.x + 6, w.y + 8, w.w, w.h);
      ctx.fillStyle = '#26404b';
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = '#35606e';
      ctx.fillRect(w.x, w.y, w.w, 7);
      ctx.strokeStyle = '#4e8496';
      ctx.lineWidth = 2;
      ctx.strokeRect(w.x, w.y, w.w, w.h);
      // заклепки по углам
      ctx.fillStyle = '#7fb3c2';
      ctx.fillRect(w.x + 4, w.y + 11, 3, 3);
      ctx.fillRect(w.x + w.w - 7, w.y + 11, 3, 3);
    }
    for (i = 0; i < this.crates.length; i++) {
      var c = this.crates[i];
      if (c.hit > 0) c.hit -= 0.016;
      if (c.ex) {
        // бочка с горючим в плоской версии: красный круг в желтом ободе
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
      // аптечный ящик дышит зеленым: с тестов просили показать, что это не просто ящик
      if (med) GlowCache.draw(ctx, 'rgba(126,224,138,.45)', c.x, c.y, c.r * 2.6, 0.55 + 0.45 * Math.sin(Game.time * 5));
      ctx.save();
      ctx.translate(c.x, c.y);
      // аптечный ящик светлый с зеленым плюсом, как знак первой помощи;
      // красный крест на белом - эмблема Красного Креста, его в играх не рисуют
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
