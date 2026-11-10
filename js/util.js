var U = {
  clamp: function (v, a, b) { return v < a ? a : (v > b ? b : v); },
  lerp: function (a, b, t) { return a + (b - a) * t; },
  rand: function (a, b) { return a + Math.random() * (b - a); },
  irand: function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
  chance: function (p) { return Math.random() < p; },
  pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  dist2: function (ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; },
  dist: function (ax, ay, bx, by) { return Math.sqrt(U.dist2(ax, ay, bx, by)); },
  angleTo: function (ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); },

  turn: function (cur, want, maxStep) {
    var d = want - cur;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return cur + U.clamp(d, -maxStep, maxStep);
  },

  time: function (sec) {
    sec = Math.max(0, Math.floor(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  },

  num: function (n) {
    n = Math.floor(n);
    if (n < 10000) return '' + n;
    if (n < 1000000) return (n / 1000).toFixed(n < 100000 ? 1 : 0) + 'K';
    return (n / 1000000).toFixed(1) + 'M';
  },

  weighted: function (list) {
    var total = 0, i;
    for (i = 0; i < list.length; i++) total += list[i].w || 1;
    var r = Math.random() * total;
    for (i = 0; i < list.length; i++) {
      r -= (list[i].w || 1);
      if (r <= 0) return list[i];
    }
    return list[list.length - 1];
  },

  shuffle: function (a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i];
      a[i] = a[j]; a[j] = t;
    }
    return a;
  },

  ring: function (cx, cy, rmin, rmax) {
    var a = Math.random() * Math.PI * 2, r = U.rand(rmin, rmax);
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  }
};

function HashGrid(cell) {
  this.cell = cell || 96;
  this.map = new Map();
  this.used = [];
}
HashGrid.prototype.clear = function () {
  for (var i = 0; i < this.used.length; i++) this.used[i].length = 0;
  this.used.length = 0;
  if (this.map.size > 4096) this.map.clear();
};
HashGrid.prototype.insert = function (obj) {
  var cx = Math.floor(obj.x / this.cell), cy = Math.floor(obj.y / this.cell);
  var k = ((cx & 0x7fff) << 15) | (cy & 0x7fff), bucket = this.map.get(k);
  if (!bucket) { bucket = []; this.map.set(k, bucket); }
  if (!bucket.length) this.used.push(bucket);
  bucket.push(obj);
};
HashGrid.prototype.bucket = function (cx, cy) {
  return this.map.get(((cx & 0x7fff) << 15) | (cy & 0x7fff));
};
HashGrid.prototype.query = function (x, y, r, out) {
  out.length = 0;
  var c = this.cell;
  var x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
  var y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
  for (var cx = x0; cx <= x1; cx++) {
    for (var cy = y0; cy <= y1; cy++) {
      var b = this.bucket(cx, cy);
      if (!b) continue;
      for (var i = 0; i < b.length; i++) out.push(b[i]);
    }
  }
  return out;
};

function Pool(factory, reset) {
  this.items = [];
  this.factory = factory;
  this.resetFn = reset;
}
Pool.prototype.get = function () {
  for (var i = 0; i < this.items.length; i++) {
    if (this.items[i].dead) { this.resetFn(this.items[i]); return this.items[i]; }
  }
  var o = this.factory();
  this.items.push(o);
  return o;
};
Pool.prototype.alive = function () {
  var n = 0;
  for (var i = 0; i < this.items.length; i++) if (!this.items[i].dead) n++;
  return n;
};

var GlowCache = {
  map: {},
  get: function (color, r) {
    r = Math.max(1, Math.ceil(r));
    var key = color + '_' + r;
    if (this.map[key]) return this.map[key];
    var size = r * 2;
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, color);
    grad.addColorStop(0.35, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(r, r, r, 0, Math.PI * 2);
    g.fill();
    this.map[key] = c;
    return c;
  },
  draw: function (ctx, color, x, y, r, alpha) {
    var img = this.get(color, Math.ceil(r));
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  }
};
