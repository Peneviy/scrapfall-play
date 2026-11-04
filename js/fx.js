// Партиклы, всплывающие цифры, ударные волны и тряска камеры.
var FX = {
  parts: [],
  rings: [],
  texts: [],
  bolts: [],
  blasts: [],
  scorch: [],
  shakeAmt: 0,
  shakeX: 0,
  shakeY: 0,
  maxParts: 420,

  reset: function () {
    this.parts.length = 0;
    this.rings.length = 0;
    this.texts.length = 0;
    this.bolts.length = 0;
    this.blasts.length = 0;
    this.scorch.length = 0;
    this.shakeAmt = 0;
  },

  // Огненный шар взрыва и выжженное пятно после него. Рисуются только в 3D,
  // в плоской версии взрыв по-прежнему показывает кольцо.
  blast: function (x, y, r, color) {
    if (this.blasts.length > 30) this.blasts.shift();
    this.blasts.push({ x: x, y: y, r: r, c: color || '#ffb35c', life: 0.45, max: 0.45 });
    if (this.scorch.length > 40) this.scorch.shift();
    this.scorch.push({ x: x, y: y, r: r * 0.6, life: 9, a: Math.random() * 6.28 });
  },

  // молния от разряда: ломаная в несколько сегментов
  bolt: function (x1, y1, x2, y2, color) {
    var pts = [], n = 5;
    for (var i = 0; i <= n; i++) {
      var k = i / n;
      var off = (i === 0 || i === n) ? 0 : U.rand(-14, 14);
      var nx = -(y2 - y1), ny = (x2 - x1);
      var len = Math.sqrt(nx * nx + ny * ny) || 1;
      pts.push({ x: U.lerp(x1, x2, k) + nx / len * off, y: U.lerp(y1, y2, k) + ny / len * off });
    }
    this.bolts.push({ pts: pts, life: 0.18, max: 0.18, c: color || '#9fe8ff' });
  },

  lowFx: function () { return Save.data && Save.data.set.low; },

  burst: function (x, y, n, color, speed, life, size) {
    if (this.lowFx()) n = Math.ceil(n * 0.45);
    if (this.parts.length > this.maxParts) n = Math.min(n, 4);
    speed = speed || 160; life = life || 0.5; size = size || 3;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = speed * U.rand(0.35, 1);
      this.parts.push({
        x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: life * U.rand(0.6, 1.2), max: life,
        r: size * U.rand(0.6, 1.3), c: color, drag: 2.6
      });
    }
  },

  // направленный пшик, например из ствола
  spray: function (x, y, ang, n, color, speed) {
    if (this.lowFx()) n = Math.ceil(n * 0.5);
    for (var i = 0; i < n; i++) {
      var a = ang + U.rand(-0.35, 0.35);
      var sp = speed * U.rand(0.4, 1);
      this.parts.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: U.rand(0.12, 0.3), max: 0.3, r: U.rand(1.5, 3), c: color, drag: 4
      });
    }
  },

  ring: function (x, y, r0, r1, color, life, width) {
    this.rings.push({ x: x, y: y, r: r0, r1: r1, life: life || 0.35, max: life || 0.35, c: color, w: width || 3 });
  },

  text: function (x, y, str, color, size) {
    if (this.texts.length > 40) this.texts.shift();
    this.texts.push({ x: x, y: y, t: str, c: color || '#fff', s: size || 14, life: 0.8, vy: -46 });
  },

  shake: function (a) {
    if (Save.data && !Save.data.set.shake) return;
    this.shakeAmt = Math.min(22, this.shakeAmt + a);
  },

  update: function (dt) {
    var i, p;
    for (i = this.parts.length - 1; i >= 0; i--) {
      p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) { this.parts.splice(i, 1); continue; }
      var d = 1 - p.drag * dt;
      if (d < 0) d = 0;
      p.vx *= d; p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (i = this.rings.length - 1; i >= 0; i--) {
      var r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) { this.rings.splice(i, 1); continue; }
      var k = 1 - r.life / r.max;
      r.r = U.lerp(r.r, r.r1, Math.min(1, dt * 12));
      r.cur = U.lerp(r.r, r.r1, k);
    }
    for (i = this.texts.length - 1; i >= 0; i--) {
      var t = this.texts[i];
      t.life -= dt;
      if (t.life <= 0) { this.texts.splice(i, 1); continue; }
      t.y += t.vy * dt;
      t.vy *= 1 - 2.2 * dt;
    }
    for (i = this.bolts.length - 1; i >= 0; i--) {
      this.bolts[i].life -= dt;
      if (this.bolts[i].life <= 0) this.bolts.splice(i, 1);
    }
    for (i = this.blasts.length - 1; i >= 0; i--) {
      this.blasts[i].life -= dt;
      if (this.blasts[i].life <= 0) this.blasts.splice(i, 1);
    }
    for (i = this.scorch.length - 1; i >= 0; i--) {
      this.scorch[i].life -= dt;
      if (this.scorch[i].life <= 0) this.scorch.splice(i, 1);
    }
    if (this.shakeAmt > 0) {
      this.shakeAmt = Math.max(0, this.shakeAmt - dt * 34);
      this.shakeX = U.rand(-this.shakeAmt, this.shakeAmt);
      this.shakeY = U.rand(-this.shakeAmt, this.shakeAmt);
    } else {
      this.shakeX = this.shakeY = 0;
    }
  },

  draw: function (ctx) {
    var i;
    ctx.save();
    for (i = 0; i < this.parts.length; i++) {
      var p = this.parts[i];
      var a = U.clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x - p.r * 0.5, p.y - p.r * 0.5, p.r, p.r);
    }
    ctx.globalAlpha = 1;
    for (i = 0; i < this.rings.length; i++) {
      var r = this.rings[i];
      var k = 1 - r.life / r.max;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = r.c;
      ctx.lineWidth = r.w * (1 - k * 0.6);
      ctx.beginPath();
      ctx.arc(r.x, r.y, U.lerp(r.r, r.r1, k), 0, Math.PI * 2);
      ctx.stroke();
    }
    for (i = 0; i < this.bolts.length; i++) {
      var bo = this.bolts[i];
      ctx.globalAlpha = bo.life / bo.max;
      ctx.strokeStyle = bo.c;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(bo.pts[0].x, bo.pts[0].y);
      for (var q = 1; q < bo.pts.length; q++) ctx.lineTo(bo.pts[q].x, bo.pts[q].y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  },

  drawText: function (ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    for (var i = 0; i < this.texts.length; i++) {
      var t = this.texts[i];
      ctx.globalAlpha = U.clamp(t.life / 0.8, 0, 1);
      ctx.font = '900 ' + t.s + 'px Verdana, sans-serif';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,.65)';
      ctx.strokeText(t.t, t.x, t.y);
      ctx.fillStyle = t.c;
      ctx.fillText(t.t, t.x, t.y);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
};
