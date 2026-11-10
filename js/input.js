var Input = {
  keys: {},
  move: { x: 0, y: 0 },
  dashWanted: false,
  touch: false,
  stick: { active: false, id: -1, ox: 0, oy: 0, x: 0, y: 0, max: 62 },
  mouse: { x: 0, y: 0, down: false },

  codeOf: function (e) {
    if (e.code) return e.code;
    var k = (e.key || '').toLowerCase();
    var map = {
      w: 'KeyW', a: 'KeyA', s: 'KeyS', d: 'KeyD', p: 'KeyP',
      'ц': 'KeyW', 'ф': 'KeyA', 'ы': 'KeyS', 'в': 'KeyD', 'з': 'KeyP',
      arrowup: 'ArrowUp', arrowdown: 'ArrowDown', arrowleft: 'ArrowLeft', arrowright: 'ArrowRight',
      ' ': 'Space', escape: 'Escape', shift: 'ShiftLeft',
      '1': 'Digit1', '2': 'Digit2', '3': 'Digit3'
    };
    return map[k] || '';
  },

  clear: function () {
    this.keys = {};
    this.move.x = this.move.y = 0;
    this.stick.active = false;
    this.stick.id = -1;
  },

  reset: function () {
    this.clear();
    this.dashWanted = false;
  },

  isTouch: function () {
    return this.touch || !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  },

  markTouch: function () {
    document.documentElement.classList.add('touch');
  },

  init: function (canvas) {
    var self = this;
    if (this.isTouch()) this.markTouch();

    window.addEventListener('keydown', function (e) {
      var code = self.codeOf(e);
      if (!code) return;
      self.keys[code] = true;
      if (code === 'Space' || code === 'ShiftLeft') self.dashWanted = true;
      if (code === 'Escape' && UI.escapeScreen()) return;
      if (code === 'Escape' || code === 'KeyP') UI.togglePause();
      if (code === 'Tab') { e.preventDefault(); UI.toggleAim(); }
      if (code === 'Digit1' || code === 'Digit2' || code === 'Digit3') UI.pickByKey(+code.charAt(5) - 1);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(code) >= 0) e.preventDefault();
    });

    window.addEventListener('keyup', function (e) {
      var code = self.codeOf(e);
      if (!code) { self.clear(); return; }
      self.keys[code] = false;
    });

    window.addEventListener('wheel', function (e) {
      e.preventDefault();
      if (Game.running && e.deltaY) Game.zoomBy(e.deltaY);
    }, { passive: false });

    window.addEventListener('focus', function () { self.clear(); });
    window.addEventListener('blur', function () { self.clear(); });
    document.addEventListener('visibilitychange', function () { self.clear(); });
    window.addEventListener('pagehide', function () { self.clear(); });

    canvas.addEventListener('mousemove', function (e) { self.mouse.x = e.clientX; self.mouse.y = e.clientY; });
    canvas.addEventListener('mousedown', function () { self.mouse.down = true; });
    window.addEventListener('mouseup', function () { self.mouse.down = false; });

    canvas.addEventListener('touchstart', function (e) { self.onTouchStart(e); }, { passive: false });
    canvas.addEventListener('touchmove', function (e) { self.onTouchMove(e); }, { passive: false });
    canvas.addEventListener('touchend', function (e) { self.onTouchEnd(e); }, { passive: false });
    canvas.addEventListener('touchcancel', function (e) { self.onTouchEnd(e); }, { passive: false });

    var dash = document.getElementById('dashBtn');
    dash.addEventListener('touchstart', function (e) { e.preventDefault(); self.dashWanted = true; }, { passive: false });
    dash.addEventListener('mousedown', function (e) { e.preventDefault(); self.dashWanted = true; });
    this.dashSide();
  },

  dashSide: function () {
    var b = document.getElementById('dashBtn');
    if (b) b.classList.toggle('left', !!(Save.data && Save.data.set.dashL));
  },

  tap: { end: 0, x: 0, y: 0, t0: 0 },

  onTouchStart: function (e) {
    this.touch = true;
    this.markTouch();
    document.getElementById('dashBtn').classList.remove('hidden');
    if (!Game.running || Game.paused) return;
    e.preventDefault();
    var now = performance.now();
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (this.stick.active) continue;
      var tp = this.tap;
      if (tp.end && now - tp.end < 280 && Math.abs(t.clientX - tp.x) < 70 && Math.abs(t.clientY - tp.y) < 70) {
        this.dashWanted = true;
        tp.end = 0;
      }
      tp.t0 = now;
      this.stick.active = true;
      this.stick.id = t.identifier;
      this.stick.ox = t.clientX;
      this.stick.oy = t.clientY;
      this.stick.x = t.clientX;
      this.stick.y = t.clientY;
    }
  },

  onTouchMove: function (e) {
    if (!this.stick.active) return;
    e.preventDefault();
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier !== this.stick.id) continue;
      this.stick.x = t.clientX;
      this.stick.y = t.clientY;
    }
  },

  onTouchEnd: function (e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.stick.id) {
        var s = this.stick, now = performance.now();
        var moved = Math.abs(s.x - s.ox) + Math.abs(s.y - s.oy);
        if (now - this.tap.t0 < 220 && moved < 16) { this.tap.end = now; this.tap.x = s.ox; this.tap.y = s.oy; }
        else this.tap.end = 0;
        this.stick.active = false;
        this.stick.id = -1;
      }
    }
  },

  gamepad: function () {
    if (!navigator.getGamepads) return null;
    var pads = navigator.getGamepads();
    for (var i = 0; i < pads.length; i++) {
      if (pads[i] && pads[i].connected) return pads[i];
    }
    return null;
  },

  update: function () {
    if (document.hasFocus && !document.hasFocus()) {
      for (var kk in this.keys) { if (this.keys[kk]) { this.keys = {}; break; } }
    }
    var mx = 0, my = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) my -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) my += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) mx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) mx += 1;

    if (this.stick.active) {
      var dx = this.stick.x - this.stick.ox, dy = this.stick.y - this.stick.oy;
      var len = Math.sqrt(dx * dx + dy * dy);
      if (len > 8) {
        var k = Math.min(1, len / this.stick.max) / len;
        mx = dx * k;
        my = dy * k;
      }
    }

    var gp = this.gamepad();
    if (gp && !this.stick.active) {
      var ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      if (Math.abs(ax) > 0.18 || Math.abs(ay) > 0.18) { mx = ax; my = ay; }
      if (gp.buttons[0] && gp.buttons[0].pressed) this.dashWanted = true;
    }

    var l = Math.sqrt(mx * mx + my * my);
    if (l > 1) { mx /= l; my /= l; }
    this.move.x = mx;
    this.move.y = my;
  },

  worldMouse: function () {
    if (View3D.on) return View3D.toGround(this.mouse.x, this.mouse.y);
    return {
      x: (this.mouse.x - Game.w / 2) / Game.scale + Game.cam.x,
      y: (this.mouse.y - Game.h / 2) / Game.scale + Game.cam.y
    };
  },

  takeDash: function () {
    var d = this.dashWanted;
    this.dashWanted = false;
    return d;
  },

  draw: function (ctx) {
    if (!this.stick.active) return;
    var s = this.stick;
    var dx = s.x - s.ox, dy = s.y - s.oy;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var k = Math.min(1, s.max / len);
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#8fd3c8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.ox, s.oy, s.max, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#8fd3c8';
    ctx.beginPath();
    ctx.arc(s.ox + dx * k, s.oy + dy * k, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};
