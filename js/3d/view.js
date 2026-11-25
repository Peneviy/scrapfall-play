var View3D = {
  on: false,
  renderer: null, scene: null, camera: null,
  w: 0, h: 0,
  radius: 700,
  ppu: 1,
  off: null,
  last: 0,

  init: function (canvas) {
    if (typeof THREE === 'undefined' || !canvas) return false;
    if (/[?&]2d\b/.test(location.search)) return false;
    var r;
    try {
      r = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: (window.devicePixelRatio || 1) < 2,
        powerPreference: 'high-performance'
      });
    } catch (e) { return false; }
    if (!r || !r.getContext()) return false;
    this.renderer = r;
    r.setClearColor(CFG.view3d.fog, 1);

    var s = this.scene = new THREE.Scene();
    s.fog = new THREE.Fog(CFG.view3d.fog, 900, 2300);
    this.camera = new THREE.PerspectiveCamera(CFG.view3d.fov, 1, 20, 5000);

    var hemi = this.hemi = new THREE.HemisphereLight('#d6e6f5', '#b08458', 1.45);
    s.add(hemi);
    this.lamp = new THREE.PointLight('#ffd9a0', 0, 460, 1);
    s.add(this.lamp);
    this.head = new THREE.SpotLight('#fff1d0', 0, 650, 0.42, 0.55, 1);
    s.add(this.head);
    s.add(this.head.target);
    var sun = this.sun = new THREE.DirectionalLight('#fff0d8', 2.5);
    this.sunDir = new THREE.Vector3(-0.6, 1.25, 0.45).normalize();
    s.add(sun);
    s.add(sun.target);
    this.weak = this.weakGpu(r);
    if (Save.data) Quality.start(this.weak);
    var lvl = Quality.level();
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    sun.shadow.mapSize.set(Quality.shadowSize(lvl), Quality.shadowSize(lvl));
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.6;
    this.shadowsOn = lvl > 0;
    r.shadowMap.enabled = this.shadowsOn;
    sun.castShadow = this.shadowsOn;

    this.matLit = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    this.matGlow = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.matFlat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.matTint = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, flatShading: true });
    this.matWallFade = [0.72, 0.5, 0.32].map(function (o) {
      return new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: o });
    });

    if (this.walls) for (var wi = 0; wi < this.walls.length; wi++) this.walls[wi].mesh3 = null;
    this.halos = null;
    this.buildGround();
    this.buildBatches();
    this.buildAtmos();
    this.walls = [];
    this.bossMeshes = {};
    this.turretPool = [];
    this.pl = null;
    this.decoKey = '';
    this.decoCache = {};
    this.decoBatches = null;

    this._v = new THREE.Vector3();
    this._ndc = new THREE.Vector2();
    this._ray = new THREE.Raycaster();
    this._plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._hit = new THREE.Vector3();
    this._dummy = new THREE.Object3D();
    this._dummy.rotation.order = 'YXZ';

    this.on = true;
    this.watchContext(canvas);
    return true;
  },

  gpuName: function (r) {
    try {
      var gl = r.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
      return String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
    } catch (e) { return ''; }
  },

  weakGpu: function (r) {
    var n = this.gpuName(r);
    this.gpu = n;
    return /PowerVR|Mali-(4\d\d|T\d|G(31|51|52)\b)|Adreno[^0-9]*([34]\d\d|50\d)\b|SwiftShader|llvmpipe|Software/i.test(n);
  },

  watchContext: function (canvas) {
    var self = this;
    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      self.lost = true;
      if (Game.running && !Game.paused && !Game.over) UI.togglePause();
      self.lostWait();
    }, false);
    canvas.addEventListener('webglcontextrestored', function () {
      self.lost = false;
      clearTimeout(self.lostT);
      Game.resize();
    }, false);
  },

  lostWait: function () {
    var self = this;
    clearTimeout(this.lostT);
    this.lostT = setTimeout(function () {
      if (!self.lost) return;
      if (document.hidden) { self.lostWait(); return; }
      self.rebuild();
    }, 2500);
  },

  rebuild: function () {
    var old = this.renderer.domElement, c = old.cloneNode(false);
    old.parentNode.replaceChild(c, old);
    try { this.renderer.dispose(); } catch (e) {}
    this.on = false;
    this.lost = false;
    this.renderer = null;
    if (this.init(c)) {
      Game.resize();
      return;
    }
    c.style.display = 'none';
    Game.canvas.classList.remove('overlay');
    Game.ctx = Game.canvas.getContext('2d');
    Game.resize();
  },

  resize: function (w, h, dpr) {
    if (!this.on) return;
    this.w = w; this.h = h;
    this.renderer.setPixelRatio(Quality.pixelRatio(Quality.level(), dpr));
    this.renderer.setSize(w, h, false);

    var cfg = CFG.view3d;
    var cam = this.camera;
    cam.aspect = w / Math.max(1, h);
    var groundH = h / Game.scale;
    var pitch = cfg.pitch * Math.PI / 180, half = cfg.fov * Math.PI / 360;
    this.tanPitch = Math.tan(pitch);
    var dist = groundH * Math.sin(pitch) / (2 * Math.tan(half)) * cfg.zoom;
    this.off = new THREE.Vector3(0, Math.sin(pitch) * dist, Math.cos(pitch) * dist);
    if (this.scene.fog) { this.scene.fog.near = dist * 1.35; this.scene.fog.far = dist * 3.45; }
    this.ppu = h / (2 * dist * Math.tan(half));
    cam.position.copy(this.off);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    var far = 0;
    for (var i = 0; i < 4; i++) {
      var g = this.toGround(i % 2 ? w : 0, i < 2 ? 0 : h, true);
      far = Math.max(far, Math.sqrt(g.x * g.x + g.y * g.y));
    }
    this.radius = Math.min(1400, far);
    this.billboardTilt = pitch;
    if (this.shadowsOn) {
      var sc = this.sun.shadow.camera, ext = this.radius * 1.05;
      sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext;
      sc.near = 10; sc.far = 4000;
      sc.updateProjectionMatrix();
    }
    if (this.halos) this.halos.mesh.geometry.dispose();
    this.rebuildHalos();
  },

  buildAtmos: function () {
    var keys = [
      { t: 0.00, sky: '#d6e6f5', bounce: '#b08458', hemi: 1.45, sun: '#fff0d8', sunI: 2.5, fog: '#dcb98f', ground: '#ffffff', sunDir: [-0.6, 1.25, 0.45], dark: 0 },
      { t: 0.32, sky: '#d6e6f5', bounce: '#b08458', hemi: 1.45, sun: '#fff0d8', sunI: 2.5, fog: '#dcb98f', ground: '#ffffff', sunDir: [-0.6, 1.25, 0.45], dark: 0 },
      { t: 0.46, sky: '#9a7a8e', bounce: '#6e3a22', hemi: 1.15, sun: '#ffa868', sunI: 2.6, fog: '#7a4430', ground: '#cf9479', sunDir: [-1, 0.55, 0.25], dark: 0.3 },
      { t: 0.60, sky: '#46598a', bounce: '#1c1622', hemi: 0.8, sun: '#86a2dc', sunI: 0.75, fog: '#141a2a', ground: '#7d88aa', sunDir: [0.5, 1, 0.6], dark: 1 },
      { t: 0.80, sky: '#46598a', bounce: '#1c1622', hemi: 0.8, sun: '#86a2dc', sunI: 0.75, fog: '#141a2a', ground: '#7d88aa', sunDir: [0.5, 1, 0.6], dark: 1 },
      { t: 0.91, sky: '#e2b0a6', bounce: '#8a5a48', hemi: 1.2, sun: '#ffc2a2', sunI: 2.1, fog: '#c99c88', ground: '#f0d2c2', sunDir: [0.9, 0.6, 0.35], dark: 0.2 },
      { t: 1.00, sky: '#d6e6f5', bounce: '#b08458', hemi: 1.45, sun: '#fff0d8', sunI: 2.5, fog: '#dcb98f', ground: '#ffffff', sunDir: [-0.6, 1.25, 0.45], dark: 0 }
    ];
    var col = function (h) { return new THREE.Color(h); };
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      k.sky = col(k.sky); k.bounce = col(k.bounce); k.sun = col(k.sun); k.fog = col(k.fog); k.ground = col(k.ground);
      k.sunDir = new THREE.Vector3(k.sunDir[0], k.sunDir[1], k.sunDir[2]).normalize();
    }
    this.atmosKeys = keys;
    this.dark = 0;
    this.vig = { k: 0.25, rgb: '60,35,15' };
    this._fog = new THREE.Color();
  },

  syncAtmos: function () {
    var keys = this.atmosKeys;
    var day = CFG.view3d.day || 420;
    var t = Game.running ? (Game.time / day) % 1 : 0;
    if (this.forceT !== undefined) t = this.forceT;
    var a = keys[0], b = keys[1];
    for (var i = 0; i < keys.length - 1; i++) {
      if (t >= keys[i].t && t <= keys[i + 1].t) { a = keys[i]; b = keys[i + 1]; break; }
    }
    var k = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0;
    k = k * k * (3 - 2 * k);
    this.hemi.color.copy(a.sky).lerp(b.sky, k);
    this.hemi.groundColor.copy(a.bounce).lerp(b.bounce, k);
    this.hemi.intensity = U.lerp(a.hemi, b.hemi, k);
    this.sun.color.copy(a.sun).lerp(b.sun, k);
    this.sun.intensity = U.lerp(a.sunI, b.sunI, k);
    this.sunDir.copy(a.sunDir).lerp(b.sunDir, k).normalize();
    this._fog.copy(a.fog).lerp(b.fog, k);
    this.scene.fog.color.copy(this._fog);
    this.renderer.setClearColor(this._fog, 1);
    this.ground.material.color.copy(a.ground).lerp(b.ground, k);
    var red = Game.running && window.Finale ? Finale.red : 0;
    if (red > 0.01) {
      var R = this._red || (this._red = { sky: new THREE.Color('#d0583a'), sun: new THREE.Color('#ff6a3a'),
        fog: new THREE.Color('#8a2a16'), ground: new THREE.Color('#e07858') });
      var rk = red * 0.75;
      this.hemi.color.lerp(R.sky, rk);
      this.sun.color.lerp(R.sun, rk);
      this._fog.lerp(R.fog, rk);
      this.scene.fog.color.copy(this._fog);
      this.renderer.setClearColor(this._fog, 1);
      this.ground.material.color.lerp(R.ground, rk * 0.8);
    }
    var dark = this.dark = U.lerp(a.dark, b.dark, k);
    var glowMode = dark > 0.45 ? THREE.AdditiveBlending : THREE.NormalBlending;
    if (this.glows.mesh.material.blending !== glowMode) this.glows.mesh.material.blending = glowMode;
    this.lamp.intensity = dark * 300;
    this.head.intensity = dark * 1700;
    this.vig.k = 0.22 + dark * 0.4;
    this.vig.rgb = dark > 0.5 ? '4,6,16' : '70,40,18';
  },

  buildGround: function () {
    var c = document.createElement('canvas');
    c.width = c.height = 512;
    var g = c.getContext('2d');
    var r = World.rng(11, 7);
    g.fillStyle = CFG.view3d.ground;
    g.fillRect(0, 0, 512, 512);

    var wrap = function (fn) {
      for (var ox = -512; ox <= 512; ox += 512) for (var oy = -512; oy <= 512; oy += 512) fn(ox, oy);
    };
    var blobs = [['#ead0a0', 0.22], ['#9e7650', 0.16], ['#b9875a', 0.18], ['#f2dcb0', 0.16]];
    var i;
    for (i = 0; i < 70; i++) {
      var b = blobs[i % blobs.length];
      var x = r() * 512, y = r() * 512, rad = 20 + r() * 70;
      wrap(function (ox, oy) {
        var gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
        gr.addColorStop(0, b[0]);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.globalAlpha = b[1];
        g.fillStyle = gr;
        g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
      });
    }
    g.globalAlpha = 1;
    for (i = 0; i < 26; i++) {
      var ry = r() * 512, rx = r() * 512, len = 120 + r() * 220, amp = 2 + r() * 4, ph = r() * 6;
      var drawRipple = function (dy, col) {
        wrap(function (ox, oy) {
          g.beginPath();
          for (var q = 0; q <= len; q += 6) {
            var yy = ry + dy + Math.sin(q * 0.045 + ph) * amp + q * 0.12;
            if (q === 0) g.moveTo(rx + q + ox, yy + oy); else g.lineTo(rx + q + ox, yy + oy);
          }
          g.strokeStyle = col;
          g.stroke();
        });
      };
      g.lineWidth = 2;
      drawRipple(0, 'rgba(255,240,210,.14)');
      drawRipple(2.5, 'rgba(120,85,50,.1)');
    }
    g.strokeStyle = 'rgba(120,84,52,.4)';
    for (i = 0; i < 16; i++) {
      var px = r() * 512, py = r() * 512, n = 3 + Math.floor(r() * 4);
      var pts = [[px, py]];
      for (var k = 0; k < n; k++) {
        px += (r() - 0.5) * 50; py += (r() - 0.5) * 50;
        pts.push([px, py]);
      }
      g.lineWidth = 1 + r() * 1.2;
      wrap(function (ox, oy) {
        g.beginPath();
        g.moveTo(pts[0][0] + ox, pts[0][1] + oy);
        for (var q = 1; q < pts.length; q++) g.lineTo(pts[q][0] + ox, pts[q][1] + oy);
        g.stroke();
      });
    }
    for (i = 0; i < 700; i++) {
      var sx = r() * 512, sy = r() * 512, sz = 1 + r() * 2.5;
      g.fillStyle = r() < 0.5 ? 'rgba(110,78,48,.45)' : 'rgba(255,238,205,.4)';
      g.fillRect(sx, sy, sz, sz * (0.6 + r() * 0.6));
    }

    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.tile = 300;
    var size = 7200;
    tex.repeat.set(size / this.tile, size / this.tile);
    var geo = new THREE.PlaneGeometry(size, size);
    geo.rotateX(-Math.PI / 2);
    this.ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex }));
    this.ground.renderOrder = -1;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
  },

  buildBatches: function () {
    var self = this;
    this.batches = [];
    var add = function (b) { self.batches.push(b); self.scene.add(b.mesh); return b; };
    var M = Models;

    this.matGhost = View3D.ghostMat('#e2503a', 0.5);
    this.foes = {};
    for (var k in Enemies.defs) {
      if (k === 'boss' || Enemies.defs[k].decoy) continue;
      var mdl = M.enemy(k, Enemies.defs[k]);
      var max = CFG.scale.capHard + 20;
      var b = add(new View3D.Batch(mdl.geo, this.matLit, max, true));
      b.mesh.castShadow = true;
      b.mesh.renderOrder = 2;
      if (mdl.glow) {
        b.glow = add(new View3D.Batch(mdl.glow, this.matGlow, max, false, b));
        b.glow.mesh.renderOrder = 2;
      }
      add(new View3D.Batch(mdl.geo, this.matGhost, max, false, b)).mesh.renderOrder = 1;
      this.foes[k] = b;
    }

    var crate = M.crate();
    this.crates = add(new View3D.Batch(crate.geo, this.matLit, 80, true));
    this.crates.mesh.castShadow = true;
    this.crates.glow = add(new View3D.Batch(crate.glow, this.matGlow, 80, false, this.crates));
    var xb = M.xbarrel();
    this.xbarrels = add(new View3D.Batch(xb.geo, this.matLit, 120, true));
    this.xbarrels.mesh.castShadow = true;
    add(new View3D.Batch(xb.glow, this.matGlow, 120, false, this.xbarrels));
    var bl = M.blade();
    this.blades = add(new View3D.Batch(bl.geo, this.matLit, 16, false));
    this.blades.mesh.castShadow = true;
    add(new View3D.Batch(bl.glow, this.matGlow, 16, false, this.blades));
    var sw = M.saw();
    this.saws = add(new View3D.Batch(sw.geo, this.matLit, 24, false));
    this.saws.mesh.castShadow = true;
    add(new View3D.Batch(sw.glow, this.matGlow, 24, false, this.saws));
    var dr = M.drill();
    this.drills = add(new View3D.Batch(dr.geo, this.matLit, 2, false));
    this.drills.mesh.castShadow = true;
    add(new View3D.Batch(dr.glow, this.matGlow, 2, false, this.drills));
    this.motes = add(new View3D.Batch(new THREE.BoxGeometry(1, 1, 1), this.matFlat, 500, true));
    this.fireballs = add(new View3D.Batch(new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88, depthWrite: false }), 40, true));
    this.fireballs.mesh.renderOrder = 7;
    this.smoke = add(new View3D.Batch(new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), 90, true));
    this.shockwalls = add(View3D.makeWalls(80));
    this._c = new THREE.Color();

    this.props = {};
    var kinds = ['tire', 'barrel', 'barrelDown', 'plate', 'pipe', 'rock', 'bush', 'grass', 'yucca', 'deadtree', 'pole', 'sign'];
    this.wireCol = M.color('#2a2420');
    for (var i = 0; i < kinds.length; i++) {
      this.props[kinds[i]] = add(new View3D.Batch(M.prop(kinds[i]).geo, this.matTint, 260, true));
      this.props[kinds[i]].mesh.castShadow = true;
    }

    var sphere = new THREE.SphereGeometry(1, 8, 6);
    this.shots = add(new View3D.Batch(sphere, this.matFlat, 700, true));
    this.eshots = add(new View3D.Batch(sphere, this.matFlat, 500, true));
    var spear = M.build(function (a) {
      a(M.B(4.2, 0.6, 0.6), '#ffffff', -0.6, 0, 0);
      a(M.K(0.95, 1.8, 4), '#ffffff', 2.4, 0, 0, Math.PI / 4, 0, -Math.PI / 2);
    });
    this.spears = add(new View3D.Batch(spear.geo, this.matTint, 320, true));
    var rimAlly = new THREE.MeshBasicMaterial({ color: '#2b1705', side: THREE.BackSide });
    var rimFoe = new THREE.MeshBasicMaterial({ color: '#2a0309', side: THREE.BackSide });
    this.shotRims = add(new View3D.Batch(sphere, rimAlly, 700, false));
    this.eshotRims = add(new View3D.Batch(sphere, rimFoe, 500, false));
    this.spearRims = add(new View3D.Batch(spear.geo, rimFoe, 320, false));
    this.colAlly = M.color('#fff1c2');
    this.colCrit = M.color('#ffffff');
    this.colFoe = M.color('#ff2e4d');

    this.gems = add(new View3D.Batch(new THREE.OctahedronGeometry(1), this.matFlat, 600, true));
    var cross = M.build(function (a) {
      a(M.B(2, 0.6, 0.6), CFG.col.heal);
      a(M.B(0.6, 2, 0.6), CFG.col.heal);
    });
    this.heals = add(new View3D.Batch(cross.geo, this.matGlow, 120, false));
    this.drops = add(new View3D.Batch(new THREE.BoxGeometry(1.2, 1.2, 1.2), this.matFlat, 120, true));
    this.orbs = add(new View3D.Batch(new THREE.OctahedronGeometry(1), this.matFlat, 16, true));
    var mine = M.build(function (a) {
      a(M.C(0.9, 1, 0.45, 8), '#2b2826', 0, 0.22, 0);
      a(M.C(0.35, 0.35, 0.2, 8), '#5d5752', 0, 0.5, 0);
    });
    this.mines = add(new View3D.Batch(mine.geo, this.matLit, 60, false));
    this.mineLights = add(new View3D.Batch(new THREE.SphereGeometry(0.3, 6, 4), this.matFlat, 60, true));
    this.debris = add(new View3D.Batch(new THREE.BoxGeometry(1, 1, 1), this.matFlat, 900, true));

    this.decals = add(View3D.makeDiscs(400, THREE.NormalBlending, 1));
    this.shadows = add(View3D.makeDiscs(1600, THREE.NormalBlending, 2));
    this.shadows.k = this.shadowsOn ? 0.55 : 1;
    this.rings = add(View3D.makeDiscs(800, THREE.NormalBlending, 3));
    this.glows = add(View3D.makeDiscs(500, THREE.AdditiveBlending, 4));
    this.strips = add(View3D.makeStrips(240, THREE.AdditiveBlending, 5));
    this.lines = add(View3D.makeStrips(240, THREE.NormalBlending, 5));
  },

  rebuildHalos: function () {
    if (this.halos) {
      this.scene.remove(this.halos.mesh);
      this.batches.splice(this.batches.indexOf(this.halos), 1);
    }
    this.halos = View3D.makeDiscs(1600, THREE.AdditiveBlending, 6, this.billboardTilt);
    this.batches.push(this.halos);
    this.scene.add(this.halos.mesh);
  },

  toScreen: function (x, y, h, out) {
    var v = this._v.set(x, h || 0, y).project(this.camera);
    out = out || {};
    out.x = (v.x + 1) / 2 * this.w;
    out.y = (1 - v.y) / 2 * this.h;
    out.z = v.z;
    return out;
  },

  toGround: function (sx, sy, local) {
    this._ndc.set(sx / this.w * 2 - 1, -(sy / this.h) * 2 + 1);
    this._ray.setFromCamera(this._ndc, this.camera);
    var hit = this._ray.ray.intersectPlane(this._plane, this._hit);
    if (!hit) return { x: local ? 0 : Game.cam.x, y: local ? 0 : Game.cam.y };
    return { x: hit.x, y: hit.z };
  },

  render: function () {
    var now = performance.now() / 1000;
    var dt = Math.min(0.05, now - (this.last || now));
    this.last = now;
    var p = Game.player;
    if (!p) return;
    this.idleOn = false;

    var cx = Game.cam.x, cy = Game.cam.y;
    var sh = 0.7;
    this.camera.position.set(cx + this.off.x + FX.shakeX * sh, this.off.y, cy + this.off.z + FX.shakeY * sh);
    this.camera.updateMatrixWorld();

    var t = this.tile;
    this.ground.position.set(Math.round(cx / t) * t, 0, Math.round(cy / t) * t);
    var snap = this.radius * 2.1 / this.sun.shadow.mapSize.x;
    var sx = Math.round(cx / snap) * snap, sy = Math.round(cy / snap) * snap;
    this.sun.target.position.set(sx, 0, sy);
    this.sun.position.set(sx + this.sunDir.x * 1500, this.sunDir.y * 1500, sy + this.sunDir.z * 1500);

    this.syncAtmos();
    for (var i = 0; i < this.batches.length; i++) this.batches[i].begin();

    this.syncDeco(cx, cy);
    this.syncWalls(cx, cy);
    this.fadeWalls(dt);
    this.syncCrates();
    this.syncEnemies();
    this.syncBosses(dt);
    this.syncPlayer(p, dt);
    this.syncShots();
    this.syncPickups();
    this.syncHazards();
    this.syncMarks();
    if (p.trN) this.syncTrophy(p);
    if (Spells.on(p)) this.syncSpells(p);
    this.syncFx();

    for (i = 0; i < this.batches.length; i++) this.batches[i].end();
    this.renderer.render(this.scene, this.camera);
  },

  thumbInit: function () {
    if (this.th) return this.th;
    var r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.setSize(256, 256, false);
    r.setClearColor(0x000000, 0);
    var s = new THREE.Scene();
    s.add(new THREE.HemisphereLight('#dfe9f2', '#8a6644', 1.7));
    var sun = new THREE.DirectionalLight('#fff0d8', 2.6);
    sun.position.set(-1, 2.2, 1.5);
    s.add(sun);
    var base = Models.build(function (add) {
      add(Models.C(1.55, 1.7, 0.18, 24), '#b98d5e', 0, -0.09, 0);
      add(Models.C(1.35, 1.5, 0.06, 24), '#cfa472', 0, 0.02, 0);
    });
    var plate = new THREE.Mesh(base.geo, this.matLit);
    s.add(plate);
    this.th = { r: r, s: s, plate: plate, cam: new THREE.PerspectiveCamera(30, 1, 0.1, 100), cache: {} };
    return this.th;
  },

  thumbModel: function (kind, id, skin, dark, gun) {
    var th = this.thumbInit();
    var key = kind + ':' + id + ':' + skin + ':' + (dark ? 1 : 0) + ':' + gun;
    if (th.cache[key]) return th.cache[key];
    var g = new THREE.Group();
    var mat = dark ? new THREE.MeshBasicMaterial({ color: '#241b14' }) : this.matLit;
    var glow = dark ? mat : this.matGlow;
    var add = function (parent, geo, m) { if (geo) parent.add(new THREE.Mesh(geo, m)); };
    if (kind === 'car') {
      var m = Models.player(id, Content.skin(skin), gun || 'pistol');
      add(g, m.chassis.geo, mat); add(g, m.chassis.glow, glow);
      var tur = new THREE.Group();
      add(tur, m.turret.geo, mat); add(tur, m.turret.glow, glow); add(tur, m.barrel.geo, mat);
      tur.rotation.y = 0.35;
      g.add(tur);
    } else {
      var bm = Models.boss(Bosses.byId(id));
      add(g, bm.main.geo, mat); add(g, bm.main.glow, glow);
      if (bm.spin) {
        var sp = new THREE.Group();
        add(sp, bm.spin.geo, mat); add(sp, bm.spin.glow, glow);
        sp.position.set(bm.spin.at[0], bm.spin.at[1], bm.spin.at[2]);
        g.add(sp);
      }
      g.scale.setScalar(bm.main.geo.boundingSphere ? 1.25 / Math.max(1, bm.main.geo.boundingSphere.radius * 0.8) : 1);
    }
    th.cache[key] = g;
    return g;
  },

  thumb: function (canvas, kind, id, skin, ang, dark, gun) {
    if (!this.on) return false;
    var th = this.thumbInit();
    var obj = this.thumbModel(kind, id, skin, dark, gun);
    th.s.add(obj);
    obj.rotation.y = ang === undefined ? -0.7 : ang;
    var far = kind === 'car' ? 7.6 : 8.6;
    th.cam.position.set(far * 0.62, far * 0.55, far * 0.62);
    th.cam.lookAt(0, kind === 'car' ? 0.55 : 0.95, 0);
    th.r.render(th.s, th.cam);
    th.s.remove(obj);
    var g = canvas.getContext('2d');
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(th.r.domElement, 0, 0, canvas.width, canvas.height);
    return true;
  },

  heroSpin: function () {
    var c = document.getElementById('heroPreview');
    if (!c || !c.offsetParent || !Save.data) return;
    var t = performance.now() / 1000;
    this.thumb(c, 'car', Save.data.char, Save.data.skin, -0.7 + t * 0.5, false, Save.data.gun);
  },

  idle: function () {
    var now = performance.now() / 1000;
    if (now - (this.idleLast || 0) < 1 / 31) return;
    this.idleLast = now;
    if (!this.idleOn) {
      this.idleOn = true;
      var ctx = Game.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, Game.canvas.width, Game.canvas.height);
      if (this.pl) this.pl.group.visible = false;
      for (var id in this.bossMeshes) { this.bossMeshes[id].group.visible = false; if (this.bossMeshes[id].twin) this.bossMeshes[id].twin.visible = false; }
      for (var i = 0; i < this.turretPool.length; i++) this.turretPool[i].group.visible = false;
    }
    var cx = 900 + now * 16, cy = -300 - now * 6;
    World.refresh(cx, cy, this.radius + 400);
    this.camera.position.set(cx + this.off.x, this.off.y, cy + this.off.z);
    this.camera.updateMatrixWorld();
    var t = this.tile;
    this.ground.position.set(Math.round(cx / t) * t, 0, Math.round(cy / t) * t);
    var snap = this.radius * 2.1 / this.sun.shadow.mapSize.x;
    var sx = Math.round(cx / snap) * snap, sy = Math.round(cy / snap) * snap;
    this.sun.target.position.set(sx, 0, sy);
    this.sun.position.set(sx + this.sunDir.x * 1500, this.sunDir.y * 1500, sy + this.sunDir.z * 1500);
    this.forceT = 0.39;
    this.syncAtmos();
    this.forceT = undefined;
    for (i = 0; i < this.batches.length; i++) this.batches[i].begin();
    this.syncDeco(cx, cy);
    this.syncWalls(cx, cy);
    this.syncCrates();
    for (i = 0; i < this.batches.length; i++) this.batches[i].end();
    this.renderer.render(this.scene, this.camera);
    this.heroSpin();
  },

  syncDeco: function (cx, cy) {
    var b = World.block;
    var x0 = Math.floor((cx - 1500) / b), x1 = Math.floor((cx + 1500) / b);
    var y0 = Math.floor((cy - 1300) / b), y1 = Math.floor((cy + 1700) / b);
    var key = x0 + ':' + x1 + ':' + y0 + ':' + y1;
    if (key === this.decoKey) return;
    this.decoKey = key;
    var list = [];
    for (var gx = x0; gx <= x1; gx++) for (var gy = y0; gy <= y1; gy++) list.push(this.deco(gx, gy));
    this.decoList = list;
    var keys = Object.keys(this.decoCache);
    if (keys.length > 200) this.decoCache = {};
    var stat = this.decoBatches || (this.decoBatches = [this.decals, this.lines].concat(
      Object.keys(this.props).map(function (k) { return this.props[k]; }, this)));
    var i, j, d;
    for (i = 0; i < stat.length; i++) stat[i].base = stat[i].n = 0;
    for (i = 0; i < this.decoList.length; i++) {
      var c = this.decoList[i];
      for (j = 0; j < c.stains.length; j++) {
        d = c.stains[j];
        var di = this.decals.put(d.x, 0.4, d.y, d.a, d.r, 1, d.r);
        this.decals.disc(di, d.c, 0, 1.4, 1, d.alpha);
      }
      for (j = 0; j < c.props.length; j++) {
        d = c.props[j];
        var pb = this.props[d.k];
        var pi = pb.put(d.x, d.up ? d.s * 0.62 : 0, d.y, d.a, d.s, d.s, d.s);
        if (pi >= 0) pb.tint(pi, d.c, 1);
      }
      for (j = 0; j < c.wires.length; j++) {
        var wr = c.wires[j], wx = Math.cos(Math.atan2(wr[3] - wr[1], wr[2] - wr[0]) + Math.PI / 2) * 11;
        var wy = Math.sin(Math.atan2(wr[3] - wr[1], wr[2] - wr[0]) + Math.PI / 2) * 11;
        for (var side = -1; side <= 1; side += 2) {
          var wl = this.lines.line(wr[0] + wx * side, wr[1] + wy * side, wr[2] + wx * side, wr[3] + wy * side, 1.2, 104);
          this.lines.strip(wl, this.wireCol, U.dist(wr[0], wr[1], wr[2], wr[3]), 0, 0, 0.8);
        }
      }
    }
    for (i = 0; i < stat.length; i++) { stat[i].base = stat[i].n; stat[i].fresh = true; }
  },

  deco: function (cx, cy) {
    var key = cx + ':' + cy;
    if (this.decoCache[key]) return this.decoCache[key];
    var r = World.rng(cx * 31 + 7, cy * 17 + 3);
    var walls = World.chunk(cx, cy).walls;
    var b = World.block, ox = cx * b, oy = cy * b;
    var free = function (x, y, pad) {
      for (var i = 0; i < walls.length; i++) {
        var w = walls[i];
        if (x > w.x - pad && x < w.x + w.w + pad && y > w.y - pad && y < w.y + w.h + pad) return false;
      }
      return !(cx === 0 && cy === 0 && x * x + y * y < 140 * 140);
    };
    var res = { stains: [], props: [] };
    var stainCols = ['#3a2a1c', '#4a3422', '#fff1d6', '#5a3c26'];
    var n = 3 + Math.floor(r() * 4), i;
    for (i = 0; i < n; i++) {
      var dark = r() < 0.7;
      res.stains.push({
        x: ox + r() * b, y: oy + r() * b, a: r() * 6.28, r: 30 + r() * 90,
        c: Models.color(dark ? stainCols[i % 2 ? 0 : 3] : stainCols[2]),
        alpha: dark ? 0.22 + r() * 0.16 : 0.2
      });
    }
    var palettes = {
      tire: ['#ffffff'],
      barrel: ['#7a3b2a', '#2f5560', '#8a6a2f', '#4a4f58', '#6b2f2a'],
      barrelDown: ['#7a3b2a', '#2f5560', '#8a6a2f'],
      plate: ['#5d5752', '#6b4a2a', '#3d4a4f', '#7a5a3a'],
      pipe: ['#5d5752', '#6e4a30'],
      rock: ['#c08a5a', '#a8744a', '#d4a06c'],
      bush: ['#ffffff', '#efe4c8'],
      grass: ['#ffffff', '#f2e2b8'],
      yucca: ['#ffffff'],
      deadtree: ['#ffffff', '#d9d0c2'],
      sign: ['#ffffff']
    };
    var sizes = { tire: 12, barrel: 11, barrelDown: 11, plate: 15, pipe: 12, rock: 16,
      bush: 13, grass: 10, yucca: 17, deadtree: 21, sign: 13 };
    var kinds = ['tire', 'tire', 'barrel', 'barrelDown', 'plate', 'plate', 'pipe', 'rock', 'rock',
      'bush', 'bush', 'bush', 'grass', 'grass', 'grass', 'yucca', 'deadtree', 'sign'];
    var m = 8 + Math.floor(r() * 9);
    for (i = 0; i < m; i++) {
      var x = ox + r() * b, y = oy + r() * b;
      var k = kinds[Math.floor(r() * kinds.length)];
      if (!free(x, y, 24)) continue;
      var pal = palettes[k];
      res.props.push({
        k: k, x: x, y: y, a: r() * 6.28, s: sizes[k] * (0.8 + r() * 0.5),
        c: Models.color(pal[Math.floor(r() * pal.length)])
      });
      if (k === 'tire' && r() < 0.4) {
        res.props.push({ k: 'tire', x: x + 2, y: y - 1, a: r() * 6.28, s: sizes.tire, c: Models.color('#ffffff'), up: 1 });
      }
    }
    res.wires = [];
    if (r() < 0.35) {
      var la = r() * Math.PI, lx = ox + b * 0.2 + r() * b * 0.6, ly = oy + b * 0.2 + r() * b * 0.6;
      var prev = null;
      for (var pl = -2; pl <= 2; pl++) {
        var qx = lx + Math.cos(la) * pl * 170, qy = ly + Math.sin(la) * pl * 170;
        if (!free(qx, qy, 16)) { prev = null; continue; }
        res.props.push({ k: 'pole', x: qx, y: qy, a: la + Math.PI / 2, s: 11, c: Models.color('#ffffff') });
        if (prev) res.wires.push([prev[0], prev[1], qx, qy]);
        prev = [qx, qy];
      }
    }
    this.decoCache[key] = res;
    return res;
  },

  syncWalls: function (cx, cy) {
    var near = World.near, i, built = 0, seen = this.radius + 250;
    var frame = this.frameNo = (this.frameNo || 0) + 1;
    for (i = 0; i < near.length; i++) {
      var w = near[i];
      if (!w.mesh3) {
        if (built > 0) {
          var dx = Math.max(w.x - cx, 0, cx - w.x - w.w), dy = Math.max(w.y - cy, 0, cy - w.y - w.h);
          if (dx * dx + dy * dy > seen * seen) continue;
        }
        w.mesh3 = this.wallMesh(w);
        this.scene.add(w.mesh3);
        this.walls.push(w);
        built++;
      }
      w.frame3 = frame;
    }
    for (i = this.walls.length - 1; i >= 0; i--) {
      var o = this.walls[i];
      if (o.frame3 === frame) continue;
      this.scene.remove(o.mesh3);
      o.mesh3.traverse(function (m) { if (m.geometry) m.geometry.dispose(); });
      o.mesh3 = null;
      this.walls.splice(i, 1);
    }
  },

  fadeWalls: function (dt) {
    var p = Game.player, grid = Game.grid, gc = grid.cell, tp = this.tanPitch || 1.48;
    for (var i = 0; i < this.walls.length; i++) {
      var w = this.walls[i], g = w.mesh3;
      if (!g) continue;
      var u = g.userData, reach = Math.max(0, (u.h - 12) / tp);
      var x0 = w.x - 18, x1 = w.x + w.w + 18, y0 = w.y - reach, y1 = w.y + w.h;
      var hide = reach > 10 && p.x > x0 && p.x < x1 && p.y > y0 - 10 && p.y < y1;
      if (!hide && reach > 24) {
        var cx0 = Math.floor(x0 / gc), cx1 = Math.floor(x1 / gc), cy0 = Math.floor(y0 / gc), cy1 = Math.floor(y1 / gc);
        for (var gx = cx0; gx <= cx1 && !hide; gx++) {
          for (var gy = cy0; gy <= cy1 && !hide; gy++) {
            var bk = grid.bucket(gx, gy);
            if (!bk) continue;
            for (var j = 0; j < bk.length; j++) {
              var e = bk[j];
              if (!e.dead && e.x > x0 && e.x < x1 && e.y > y0 && e.y < y1) { hide = true; break; }
            }
          }
        }
      }
      if (hide) u.hold = 0.4;
      else if (u.hold > 0) u.hold -= dt;
      u.k += ((u.hold > 0 ? 1 : 0) - u.k) * Math.min(1, dt * 9);
      var lvl = u.k > 0.75 ? 3 : (u.k > 0.45 ? 2 : (u.k > 0.15 ? 1 : 0));
      if (lvl !== u.lvl) {
        u.lvl = lvl;
        u.main.material = lvl ? this.matWallFade[lvl - 1] : this.matLit;
      }
    }
  },

  wallMesh: function (w) {
    var M = Models, B = M.fastBox;
    var C = function (rt, rb, h, n) {
      return M.tpl('C' + rt + ',' + rb + ',' + h + ',' + n, function () { return M.C(rt, rb, h, n); });
    };
    var r = World.rng(Math.floor(w.x), Math.floor(w.y));
    var long = Math.max(w.w, w.h), short = Math.min(w.w, w.h);
    var alongX = w.w >= w.h;
    var style = r();
    var mdl = M.fast(function (add) {
      var put = add;
      var container = function (cx, y0, len, dep, hgt, col, yaw) {
        var c = Math.cos(yaw), s = Math.sin(yaw);
        var at = function (dx) { return [cx + dx * c, -dx * s]; };
        put(B(len, hgt, dep), col, cx, y0 + hgt / 2, 0, 0, yaw);
        var shade = M.shade(col, 0.72);
        for (var x = -len / 2 + 7; x < len / 2 - 4; x += 9) {
          var q = at(x);
          put(B(2.4, hgt * 0.92, dep + 1.6), shade, q[0], y0 + hgt * 0.47, q[1], 0, yaw);
        }
        put(B(len + 1.2, 2.6, dep + 1.2), shade, cx, y0 + hgt, 0, 0, yaw);
        var roof = M.shade(col, 1.18);
        for (var rx = -len / 2 + 5; rx < len / 2 - 3; rx += 6) {
          var rr = at(rx);
          put(B(2.2, 1.2, dep - 3), roof, rr[0], y0 + hgt + 1.6, rr[1], 0, yaw);
        }
        for (var k = 0; k < 3; k++) {
          var rq = at((r() - 0.5) * len * 0.8);
          put(B(6 + r() * 10, hgt * (0.3 + r() * 0.4), dep + 2.2), M.RUST, rq[0], y0 + hgt * 0.5, rq[1], 0, yaw);
          var tq = at((r() - 0.5) * len * 0.7);
          put(B(8 + r() * 14, 1.4, dep * (0.3 + r() * 0.4)), M.RUST, tq[0], y0 + hgt + 2, tq[1] + (r() - 0.5) * dep * 0.3, 0, yaw + (r() - 0.5) * 0.4);
        }
      };
      if (style < 0.28) {
        var cols = ['#7a3424', '#2f5560', '#6b6a3a', '#8a6a2f', '#4a4f58', '#5a2f3a'];
        var hgt = 46 + r() * 10;
        container(0, 0, long, short, hgt, cols[Math.floor(r() * cols.length)], 0);
        if (r() < 0.5) {
          container((r() - 0.5) * long * 0.12, hgt + 1, long * 0.82, short * 0.95, hgt * 0.95,
            cols[Math.floor(r() * cols.length)], (r() - 0.5) * 0.1);
        } else if (r() < 0.6) {
          put(M.tpl('T9', function () { return M.T(9, 3.6, 5, 10); }), '#1f1c1a', (r() - 0.5) * long * 0.5, hgt + 3.6, 0, Math.PI / 2);
        }
      } else if (style < 0.5) {
        var carCols = ['#6b2f2a', '#2f5560', '#8a6a2f', '#4a4f58', '#3f5a3a', '#7a5a3a'];
        var rows = Math.max(1, Math.round(short / 40));
        var per = Math.max(1, Math.round(long / 62));
        var cl = long / per, cw = short / rows;
        for (var layer = 0; layer < 4; layer++) {
          var y0 = layer * 17;
          for (var a = 0; a < per; a++) {
            for (var b = 0; b < rows; b++) {
              if (layer >= 2 && r() < layer * 0.25) continue;
              var cc = carCols[Math.floor(r() * carCols.length)];
              var x0 = -long / 2 + cl * (a + 0.5) + (r() - 0.5) * 6;
              var z0 = -short / 2 + cw * (b + 0.5);
              var yaw = (r() - 0.5) * 0.12;
              put(B(cl - 4, 9, cw - 4), cc, x0, y0 + 4.5, z0, 0, yaw, (r() - 0.5) * 0.05);
              put(B(cl * 0.5, 6, cw * 0.8), cc, x0 - cl * 0.05, y0 + 12, z0, 0, yaw, 0);
              put(B(cl * 0.52, 2.4, cw * 0.82), '#1a1a1c', x0 - cl * 0.05, y0 + 12.5, z0, 0, yaw, 0);
            }
          }
        }
      } else if (style < 0.72) {
        var junk = ['#5d5752', '#6b4a2a', '#3d4a4f', '#7a3b2a', '#4a3e34', '#8a6a2f'];
        var cnt = Math.min(34, Math.max(8, Math.floor(long * short / 700)));
        put(B(long, 6, short), '#5a4636', 0, 3, 0);
        for (var j = 0; j < cnt; j++) {
          var jx = (r() - 0.5) * (long - 14), jz = (r() - 0.5) * (short - 10);
          var edge = 1 - Math.max(Math.abs(jx) / (long / 2), Math.abs(jz) / (short / 2));
          var jh = 10 + r() * 34 * (0.4 + edge);
          var jc = junk[Math.floor(r() * junk.length)];
          var kind = r();
          if (kind < 0.55) put(B(10 + r() * 22, jh, 6 + r() * 16), jc, jx, jh / 2 + 4, jz, (r() - 0.5) * 0.4, r() * 3, (r() - 0.5) * 0.4);
          else if (kind < 0.8) put(C(5.5, 5.5, 15, 8), jc, jx, 10 + r() * 12, jz, r() * 1.5, 0, r() * 1.5);
          else put(C(2.5, 2.5, 30, 6), '#5d5752', jx, 14 + r() * 14, jz, 0.4 + r(), r() * 3, 1.2);
        }
        if (r() < 0.55) {
          var mx = (r() - 0.5) * long * 0.4, mh = 90 + r() * 50;
          put(M.C(1.4, 2.2, mh, 6), '#5d5752', mx, mh / 2, 0);
          put(B(26, 2, 2), '#5d5752', mx, mh - 6, 0);
          put(B(12, 8, 0.6), '#a8402c', mx + 8, mh - 14, 0, 0, 0, 0.1);
        }
      } else {
        var bands = ['#c98e5c', '#b77a4c', '#d9a46e', '#a86c42', '#c48452'];
        var pillars = Math.max(1, Math.round(long / 70));
        var pw = long / pillars;
        for (var pi = 0; pi < pillars; pi++) {
          var px = -long / 2 + pw * (pi + 0.5);
          var H = 60 + r() * 100, y = 0, li = Math.floor(r() * 5);
          while (y < H) {
            var lh = 10 + r() * 16;
            var k2 = 1 - (y / H) * 0.3;
            put(B(pw * k2 * (0.92 + r() * 0.14), lh, short * k2 * (0.9 + r() * 0.15)), bands[li++ % bands.length],
              px + (r() - 0.5) * 6, y + lh / 2, (r() - 0.5) * 6, 0, (r() - 0.5) * 0.3, 0);
            y += lh;
          }
          put(B(pw * 0.78, 4, short * 0.78), '#e2b07a', px, y + 2, 0, 0, r());
          put(new THREE.DodecahedronGeometry(9 + r() * 6), bands[li % bands.length],
            px + (r() - 0.5) * pw * 0.6, 5, (r() < 0.5 ? -1 : 1) * short * 0.45, r(), r(), r(), 1, 0.7, 1);
        }
      }
    });
    var g = new THREE.Group();
    var main = new THREE.Mesh(mdl.geo, this.matLit);
    main.castShadow = main.receiveShadow = true;
    g.add(main);
    if (!mdl.geo.boundingBox) mdl.geo.computeBoundingBox();
    g.userData = { main: main, h: mdl.geo.boundingBox.max.y, k: 0, lvl: 0, hold: 0 };
    if (mdl.glow) g.add(new THREE.Mesh(mdl.glow, this.matGlow));
    g.position.set(w.x + w.w / 2, 0, w.y + w.h / 2);
    if (!alongX) g.rotation.y = Math.PI / 2;
    return g;
  },

  syncCrates: function () {
    var list = World.crates, white = Models.color('#ffffff');
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      var spin = ((c.x * 13 + c.y * 7) % 100) / 100 * 0.6;
      if (c.ex) {
        var bk = this.xbarrels.put(c.x, 0, c.y, spin * 5, 19, 19, 19);
        this.xbarrels.tint(bk, white, c.hit > 0 ? 5 : 1);
        var bsd = this.shadows.put(c.x + 3, 0.6, c.y + 4, 0, c.r * 1.3, 1, c.r * 1.3);
        this.shadows.disc(bsd, null, 0, 1.2, 1, 0.45);
        continue;
      }
      var k = this.crates.put(c.x, 0, c.y, spin, c.r, c.r, c.r);
      if (k < 0) break;
      this.crates.tint(k, white, c.hit > 0 ? 5 : 1);
      if (c.loot === 'heal') {
        var hy = c.r * 2.7 + 6 + Math.sin(Game.time * 3 + c.x * 0.1) * 2;
        this.heals.put(c.x, hy, c.y, Game.time * 1.5, 5, 5, 5);
        this.halo(c.x, hy, c.y, 24, Models.color(CFG.col.heal), 0.6);
      }
      var s = this.shadows.put(c.x + 4, 0.6, c.y + 4, 0, c.r * 1.6, 1, c.r * 1.6);
      this.shadows.disc(s, null, 0, 1.2, 1, 0.45);
    }
  },

  syncEnemies: function () {
    var list = Game.enemies, t = Game.time;
    var white = Models.color('#ffffff'), elite = Models.color('#c48cff'), purple = Models.color('#a24bd6');
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if ((e.boss && e.bd) || e.def.decoy) continue;
      var b = this.foes[e.boss ? 'brute' : e.type] || this.foes.grunt;
      var r = e.boss ? e.r * 0.8 : e.r;
      var ph = t * (e.def.heavy ? 7 : 11) + e.phase;
      var hover = e.type === 'swarm' ? r * 0.5 + Math.sin(ph * 0.7) * r * 0.15 : 0;
      var nest = e.type === 'nest' || e.type === 'pylon' || e.type === 'comb';
      var hop = nest ? 0 : Math.abs(Math.sin(ph)) * r * 0.1;
      var swell = nest && e.shootCd < 0.7 ? 1 - e.shootCd / 0.7 : 0;
      if (e.def.larva && e.aim > 0) swell = 1 - e.aim / Bosses.K.hive.fuse;
      var blink = false;
      if (e.fuse > 0) { swell = 1 - e.fuse / Enemies.K.beetle.fuse; blink = Math.sin(t * 40) > 0; }
      if (e.cast === 1) blink = Math.sin(t * 30) > 0;
      if (swell > 0) {
        r *= 1 + swell * 0.22 + Math.sin(t * 30) * 0.03 * swell;
        var sg = this.glows.put(e.x, 1, e.y, 0, r * 2.4, 1, r * 2.4);
        this.glows.disc(sg, Models.color(e.def.trim), 0, 1.4, 1, 0.6 * swell);
      }
      var k;
      if (e.def.roller) {
        var jx = e.roll === 1 ? Math.sin(t * 70) * 2.5 : 0;
        k = b.putR(e.x + jx, r * 0.75, e.y, 0, -e.ang, -e.spin, r);
      } else {
        k = b.putR(e.x, hover + hop, e.y, Math.sin(ph) * 0.07, nest ? e.phase : -e.ang,
          nest ? 0 : Math.cos(ph * 2) * 0.03, r);
      }
      if (k < 0) continue;
      if (e.flash > 0 || blink || (swell > 0 && e.def.larva && Math.sin(t * 40) > 0)) b.tint(k, white, 6);
      else if (e.def.hooker && e.cast >= 2) b.tint(k, this.markCol(e.def.trim), 2.4);
      else if (e.elite) {
        if (e.esp === 1) b.tint(k, this.espCol(1), 1.25);
        else if (e.esp === 3 && Math.sin(t * 9) > 0.4) b.tint(k, this.espCol(3), 1.8);
        else b.tint(k, elite, 1);
      }
      else if (e.chain) {
        var lit = !e.inv, nx = e.chain.next === e && Math.sin(t * 30) > 0;
        b.tint(k, white, lit ? 1.7 : (nx ? 1.3 : 0.5));
        if (lit) {
          var lg = this.glows.put(e.x, 1, e.y, 0, r * 2.6, 1, r * 2.6);
          this.glows.disc(lg, Models.color(e.def.trim), 0, 1.4, 1, 0.8);
        }
      } else b.tint(k, white, 1);

      var s = this.shadows.put(e.x + r * 0.15, 0.6, e.y + r * 0.2, 0, r * 1.25, 1, r * 1.25);
      this.shadows.disc(s, null, 0, 1.1, 1, 0.5);
      if (e.elite) {
        var g = this.glows.put(e.x, 1, e.y, 0, r * 2.2, 1, r * 2.2);
        if (e.esp === 1 || e.esp === 3) this.glows.disc(g, this.espCol(e.esp), 0, 1.6, 1, e.esp === 3 ? 0.5 + 0.35 * Math.sin(t * 9) : 0.6);
        else this.glows.disc(g, purple, 0, 1.6, 1, 0.55);
        if (e.esp === 1 && (e.vx || e.vy)) {
          var tv = Math.sqrt(e.vx * e.vx + e.vy * e.vy) || 1, tl = r * 3.2;
          var tr = this.strips.line(e.x, e.y, e.x - e.vx / tv * tl, e.y - e.vy / tv * tl, r * 0.9, 6);
          this.strips.strip(tr, this.espCol(1), tl, 0, 0, 0.55);
        } else if (e.esh > 0) {
          var ek = 0.35 + 0.6 * e.esh / e.eshMax;
          var er = this.rings.put(e.x, 2, e.y, 0, r * 2, 1, r * 2);
          this.rings.disc(er, this.espCol(2), 0.24, 0, 0.1, ek);
          var eg = this.glows.put(e.x, 1, e.y, 0, r * 2.5, 1, r * 2.5);
          this.glows.disc(eg, this.espCol(2), 0, 1.4, 1, 0.5 * ek);
        }
      }
      if (e.aim > 0 && !e.def.larva) {
        var pa = Game.player, al = Math.min(720, Math.max(60, U.dist(e.x, e.y, pa.x, pa.y)));
        var ln = this.lines.line(e.x, e.y, e.x + Math.cos(e.ang) * al, e.y + Math.sin(e.ang) * al, 2.5, 5);
        this.lines.strip(ln, Models.color(e.def.trim), al, 0, 0, 0.6);
      }
      if (e.ward > 0) {
        var wc = this.markCol('#7dffa8'), wk = Math.min(1, e.ward / 0.4);
        var wr = this.rings.put(e.x, 2, e.y, 0, r * 1.9, 1, r * 1.9);
        this.rings.disc(wr, wc, 0.22, 0, 0.1, 0.8 * wk);
        var wg = this.glows.put(e.x, 1, e.y, 0, r * 2.4, 1, r * 2.4);
        this.glows.disc(wg, wc, 0, 1.4, 1, 0.45 * wk);
      }
      if (e.def.medic && e.tgt && e.tgt.ward > 0) {
        var mt = e.tgt, mL = U.dist(e.x, e.y, mt.x, mt.y);
        var mb = this.strips.line(e.x, e.y, mt.x, mt.y, 5 + Math.sin(t * 20) * 1.5, 16);
        this.strips.strip(mb, this.markCol('#7dffa8'), mL, 0, 0, 0.85);
      } else if (e.def.hooker && e.cast >= 1) {
        var hc = this.markCol(e.def.trim), hpu = 0.5 + 0.5 * Math.sin(t * 18), pull = e.cast === 3;
        var hcw = this.shockwalls.put(e.x, 0, e.y, 0, r * 1.3, 110, r * 1.3);
        this.shockwalls.wall(hcw, hc, e.cast === 1 ? 0.3 + 0.45 * hpu : 0.75);
        var hri = this.rings.put(e.x, 2, e.y, 0, r * 2.4, 1, r * 2.4);
        this.rings.disc(hri, hc, 0.22, 0, 0.15, 0.95);
        this.halo(e.x, r * 1.6, e.y, r * 2.6, hc, e.cast === 1 ? 0.4 + 0.5 * hpu : 0.85);
        if (e.cast >= 2) {
          var hx = e.x + Math.cos(e.castA) * e.castL, hy = e.y + Math.sin(e.castA) * e.castL;
          if (pull) { hx = Game.player.x; hy = Game.player.y; }
          var hL = U.dist(e.x, e.y, hx, hy);
          var hl = this.lines.line(e.x, e.y, hx, hy, pull ? 8 : 5, 14);
          this.lines.strip(hl, this.ropeCol || (this.ropeCol = Models.color('#2a3038')), hL, 0, 0, 0.9);
          var hs = this.strips.line(e.x, e.y, hx, hy, pull ? 5 : 3, 14.5);
          this.strips.strip(hs, hc, hL, 0, 0, 1);
          if (pull) {
            var hg = this.strips.line(e.x, e.y, hx, hy, 20 + 4 * hpu, 14.2);
            this.strips.strip(hg, hc, hL, 0, 1, 0.5);
            var hpr = this.rings.put(hx, 2.2, hy, 0, Game.player.r * 2.1, 1, Game.player.r * 2.1);
            this.rings.disc(hpr, hc, 0.25, 0, 0.1, 0.9);
          }
          var hh = this.glows.put(hx, 14, hy, 0, pull ? 26 : 18, 1, pull ? 26 : 18);
          this.glows.disc(hh, hc, 0, 1.4, 1, 0.95);
        }
      }
    }
    var pm = Game.player;
    if (pm && pm.muteT > 0) {
      var mk = Math.min(1, pm.muteT / 0.4), mc = this.markCol(Enemies.K.muter.c);
      var mr = this.rings.put(pm.x, 2.2, pm.y, 0, pm.r * 2 + Math.sin(t * 10) * 3, 1, pm.r * 2 + Math.sin(t * 10) * 3);
      this.rings.disc(mr, mc, 0.2, 0, 0.1, 0.85 * mk);
      var mg = this.glows.put(pm.x, 1.2, pm.y, 0, pm.r * 2.6, 1, pm.r * 2.6);
      this.glows.disc(mg, mc, 0, 1.4, 1, 0.5 * mk);
    }
    var C = Enemies.chains;
    if (C.length) {
      var rope = this.ropeCol || (this.ropeCol = Models.color('#2a3038')), rc = this.markCol('#7ae0ff');
      for (i = 0; i < C.length; i++) {
        if (C[i].lk) continue;
        var cm = C[i].m, hit = C[i].cd > 0.6;
        for (var j = 0; j + 1 < cm.length; j++) {
          var a = cm[j], q = cm[j + 1], L = U.dist(a.x, a.y, q.x, q.y);
          var rl = this.lines.line(a.x, a.y, q.x, q.y, 5, 9);
          this.lines.strip(rl, rope, L, 0, 0, 0.85);
          var rg = this.strips.line(a.x, a.y, q.x, q.y, hit ? 7 : 2.5, 9.5);
          this.strips.strip(rg, rc, L, 0, 0, hit ? 1 : 0.45);
        }
      }
    }
    var LK = Enemies.locks;
    if (LK.length) {
      var rope2 = this.ropeCol || (this.ropeCol = Models.color('#2a3038')), c2 = this._c;
      for (i = 0; i < LK.length; i++) {
        var lk = LK[i], sg = lk.seg, ht = lk.heat, hc = this.markCol(Enemies.heatHex(ht)), lh = lk.cd > 0.6;
        var gw = lh ? 7 : 2.5 + ht * 2.5, ga = lh ? 1 : 0.45 + ht * 0.45;
        var hk = Math.round(ht * 10), RH = this.ropeHeat || (this.ropeHeat = []);
        if (!RH[hk]) RH[hk] = rope2.clone().lerp(Models.color(Enemies.heatHex(hk / 10)), U.clamp((hk / 10 - 0.1) * 1.1, 0, 0.9));
        for (var s2 = 0; s2 < sg.length; s2 += 2) {
          var a2 = sg[s2], q2 = sg[s2 + 1], L2 = U.dist(a2.x, a2.y, q2.x, q2.y);
          var rl2 = this.lines.line(a2.x, a2.y, q2.x, q2.y, 5 + ht * 2, 9);
          this.lines.strip(rl2, RH[hk], L2, 0, 0, 0.9);
          var rg2 = this.strips.line(a2.x, a2.y, q2.x, q2.y, gw, 9.5);
          this.strips.strip(rg2, hc, L2, 0, 0, ga);
          if (!lk.burn) continue;
          var fl = this.strips.line(a2.x, a2.y, q2.x, q2.y, 13 + 4 * Math.sin(t * 13 + s2), 11);
          this.strips.strip(fl, this.markCol('#ff7a1a'), L2, 0, 0, 0.55 + 0.2 * Math.sin(t * 17 + s2 * 1.3));
          for (var f2 = 0; f2 < 3; f2++) {
            var fph = (t * 1.5 + s2 * 0.29 + f2 * 0.33) % 1, fu = 0.2 + 0.3 * f2 + 0.1 * Math.sin(s2 + t), fsz = 3.5 + 6 * (1 - fph);
            c2.setRGB(1, 0.75 - fph * 0.5, 0.2 - fph * 0.15);
            var fm = this.motes.put(a2.x + (q2.x - a2.x) * fu, 9 + fph * 38, a2.y + (q2.y - a2.y) * fu, s2 + f2, fsz, fsz * 1.6, fsz);
            this.motes.tint(fm, c2, 1.5);
          }
        }
      }
    }
  },

  bossMesh: function (bd) {
    var c = this.bossMeshes[bd.id];
    if (c) return c;
    var mdl = Models.boss(bd);
    var mat = this.matLit.clone();
    mat.emissive = new THREE.Color(0x000000);
    if (bd.id === 'phantom') { mat.transparent = true; mat.opacity = 0.72; }
    var g = new THREE.Group();
    var main = new THREE.Mesh(mdl.main.geo, mat);
    main.castShadow = true;
    g.add(main);
    if (mdl.main.glow) g.add(new THREE.Mesh(mdl.main.glow, this.matGlow));
    var spin = null;
    if (mdl.spin) {
      spin = new THREE.Group();
      if (mdl.spin.geo) {
        var sm = new THREE.Mesh(mdl.spin.geo, mat);
        sm.castShadow = true;
        spin.add(sm);
      }
      if (mdl.spin.glow) spin.add(new THREE.Mesh(mdl.spin.glow, this.matGlow));
      spin.position.set(mdl.spin.at[0], mdl.spin.at[1], mdl.spin.at[2]);
      spin.userData.axis = mdl.spin.axis;
      g.add(spin);
    }
    g.visible = false;
    this.scene.add(g);
    c = { group: g, mat: mat, spin: spin, ghosts: [] };
    if (bd.id === 'phantom') {
      for (var i = 0; i < 5; i++) {
        var gm = mat.clone();
        gm.transparent = true;
        gm.depthWrite = false;
        var gh = new THREE.Mesh(mdl.main.geo, gm);
        gh.visible = false;
        this.scene.add(gh);
        c.ghosts.push(gh);
      }
      var tw = new THREE.Group();
      tw.add(new THREE.Mesh(mdl.main.geo, mat));
      if (mdl.main.glow) tw.add(new THREE.Mesh(mdl.main.glow, this.matGlow));
      tw.visible = false;
      this.scene.add(tw);
      c.twin = tw;
    }
    this.bossMeshes[bd.id] = c;
    return c;
  },

  syncBosses: function (dt) {
    var id, used = {};
    var list = Game.enemies;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (!e.boss || !e.bd) continue;
      var bd = e.bd, c = this.bossMesh(bd), mid = e.mech || bd.id;
      used[bd.id] = true;
      var g = c.group, r = e.r, st = e.state;
      var zz = st === 'sleep', rise = st === 'rise';
      var hover = bd.id === 'phantom' ? r * 0.25 + Math.sin(Game.time * 2) * r * 0.08 : 0;
      var stomp = (bd.id === 'titan' || bd.id === 'crusher') && !zz ? Math.abs(Math.sin(Game.time * 4 + e.phase)) * r * 0.04 : 0;
      var sink = zz ? 0.32 : (rise ? 0.32 * e.riseT / CFG.boss.lair.rise : 0);
      g.visible = true;
      var ow = e.openT > 0 ? e.openW : '', tilt = 0, roll = 0;
      if (ow === 'stuck') { tilt = -0.32; roll = Math.sin(Game.time * 40) * 0.03; }
      else if (ow === 'dig') tilt = -0.22;
      else if (ow === 'stun' || ow === 'dizzy' || ow === 'snap' || ow === 'tired') roll = Math.sin(Game.time * 7) * 0.18;
      else if (ow === 'heat' || ow === 'cool') roll = Math.sin(Game.time * 31) * 0.025;
      else if (ow === 'sit') { tilt = 0.12; sink = Math.max(sink, 0.12); }
      else if (ow === 'empty') roll = Math.sin(Game.time * 3) * 0.1;
      g.position.set(e.x, hover + stomp - r * sink + (e.lift || 0), e.y);
      g.rotation.set(roll, -e.ang, tilt, 'YXZ');
      var ms = r * (bd.mdl || 1);
      g.scale.set(ms, zz ? ms * (1 + 0.035 * Math.sin(Game.time * 1.7 + e.phase)) : ms, ms);
      if (e.flash > 0) c.mat.emissive.setScalar(e.inv ? 0.12 : 0.4);
      else if (ow === 'heat') c.mat.emissive.setRGB(0.55 + 0.2 * Math.sin(Game.time * 9), 0.16, 0.02);
      else if (e.inv) c.mat.emissive.copy(this.colInv || (this.colInv = Models.color('#b6e07a'))).multiplyScalar(0.18 + 0.06 * Math.sin(Game.time * 5));
      else if (e.qs) c.mat.emissive.copy(Models.color(bd.trim)).multiplyScalar(0.3 + 0.2 * Math.sin(Game.time * 14));
      else if (e.aim > 0 || e.shield > 0 || rise) c.mat.emissive.copy(Models.color(bd.trim)).multiplyScalar(0.22 + 0.14 * Math.sin(Game.time * 20));
      else if (zz) c.mat.emissive.copy(Models.color(bd.trim)).multiplyScalar(0.06 + 0.05 * Math.sin(Game.time * 1.7 + e.phase));
      else c.mat.emissive.setScalar(0);
      if (zz || rise || st === 'return') this.lair(e, rise ? e.riseT / CFG.boss.lair.rise : 1, st !== 'return');

      if (c.spin) {
        var ax = c.spin.userData.axis;
        if (ax === 'x') c.spin.rotation.x += dt * (e.charge > 0 ? 30 : (e.aim > 0 ? 16 : 5));
        else if (ax === 'y') c.spin.rotation.y += dt * 1.5;
        else if (ax === 'beam' && e.beamA !== undefined) c.spin.rotation.y = -(e.beamA - e.ang);
      }

      for (var gi = 0; gi < c.ghosts.length; gi++) {
        var gh = c.ghosts[gi], tr = e.trail && e.trail[gi];
        gh.visible = !!tr;
        if (!tr) continue;
        gh.position.set(tr.x, hover, tr.y);
        gh.rotation.set(0, -tr.a, 0);
        gh.scale.set(r, r, r);
        gh.material.opacity = 0.06 + gi * 0.05;
      }
      if (bd.id === 'phantom') c.mat.opacity = ow === 'solid' ? 1 : 0.72;
      if (c.twin) {
        var tw = e.twin && !e.twin.dead ? e.twin : null;
        c.twin.visible = !!tw;
        if (tw) {
          c.twin.position.set(tw.x, hover, tw.y);
          c.twin.rotation.set(0, -tw.ang, 0);
          c.twin.scale.set(ms, ms, ms);
          var tg0 = this.glows.put(tw.x, 1, tw.y, 0, r * 2.6, 1, r * 2.6);
          this.glows.disc(tg0, Models.color(bd.trim), 0, 2.2, 1, 0.35);
        }
      }

      var s = this.shadows.put(e.x + r * 0.2, 0.6, e.y + r * 0.25, 0, r * 1.4, 1, r * 1.4);
      this.shadows.disc(s, null, 0, 1.0, 1, 0.55);
      var gl = this.glows.put(e.x, 1, e.y, 0, r * 2.6, 1, r * 2.6);
      this.glows.disc(gl, Models.color(e.mech ? Bosses.byId(e.mech).trim : bd.trim), 0, 2.2, 1, e.mech ? 0.5 : 0.35);

      if (mid === 'warden' && e.beamA !== undefined && st === 'fight') {
        var bw = Bosses.beamW, rin = (e.m && e.m.safe) || 0, wc = Models.color(bd.trim);
        if (rin) {
          var sr0 = this.rings.put(e.x, 1.8, e.y, 0, rin, 1, rin);
          this.rings.disc(sr0, this.colSafe || (this.colSafe = Models.color('#ffe0ee')), 5 / rin, 0, 0.06, 0.55 + 0.15 * Math.sin(Game.time * 4));
        }
        var bon = !(e.openT > 0) ? (e.aim > 0 ? 0.35 + 0.65 * (Math.sin(Game.time * 40) > 0 ? 1 : 0) : 1) : 0;
        for (var bi = 0; bon > 0 && bi < (e.beams || 1); bi++) {
          var ba = e.beamA + bi * Math.PI, cb = Math.cos(ba), sb = Math.sin(ba), L = e.beamLen - rin;
          var bx0 = e.x + cb * rin, by0 = e.y + sb * rin;
          var ex = e.x + cb * e.beamLen, ey = e.y + sb * e.beamLen;
          var s1 = this.strips.line(bx0, by0, ex, ey, bw * 1.15, 13);
          this.strips.strip(s1, wc, L, 0, 1, 0.8 * bon);
          var s2 = this.strips.line(bx0, by0, ex, ey, 9, 13.5);
          this.strips.strip(s2, Models.color('#ffe0ee'), L, 0, 1, 0.95 * bon);
          var s3 = this.lines.line(bx0, by0, ex, ey, bw, 1.5);
          this.lines.strip(s3, wc, L, 0, 1, 0.45 * bon);
        }
      }
      if (e.aim > 0 && (mid === 'driller' || (mid === 'lancer' && e.mode !== 1))) {
        var al = mid === 'lancer' ? 250 : (e.m && e.m.x) || 700;
        var tc0 = Models.color(bd.trim);
        var l = this.lines.line(e.x, e.y, e.x + Math.cos(e.chargeAng) * al, e.y + Math.sin(e.chargeAng) * al, 8, 2);
        this.lines.strip(l, tc0, al, 24, 0, 0.6);
        if (mid === 'driller') {
          var lw = this.lines.line(e.x, e.y, e.x + Math.cos(e.chargeAng) * al, e.y + Math.sin(e.chargeAng) * al, e.r * 1.6, 1.6);
          this.lines.strip(lw, tc0, al, 0, 1, 0.3);
          if (e.m.y) {
            var hx = e.x + Math.cos(e.chargeAng) * (al - 10), hy = e.y + Math.sin(e.chargeAng) * (al - 10);
            for (var xi = 0; xi < 2; xi++) {
              var xa = e.chargeAng + Math.PI / 4 + xi * Math.PI / 2;
              var xl = this.strips.line(hx - Math.cos(xa) * 34, hy - Math.sin(xa) * 34, hx + Math.cos(xa) * 34, hy + Math.sin(xa) * 34, 10, 2.5);
              this.strips.strip(xl, tc0, 68, 0, 1, 0.9);
            }
          }
        }
      }
      if (e.openT > 0 && e.openK > 1) {
        var gold = this.colOpen || (this.colOpen = Models.color('#ffd27d'));
        var orr = r + 22 + 6 * Math.sin(Game.time * 10);
        var og = this.rings.put(e.x, 2.2, e.y, 0, orr, 1, orr);
        this.rings.disc(og, gold, 7 / orr, 0, 0.08, 0.85);
        if (ow === 'heat' || ow === 'stuck' || ow === 'dig' || ow === 'cool' || ow === 'sit') {
          var smk = ow === 'heat' || ow === 'cool' ? (this.colSteam || (this.colSteam = Models.color('#d9d2c8'))) : (this.colDust || (this.colDust = Models.color('#c9b08a')));
          for (var pm = 0; pm < 5; pm++) {
            var pph = (Game.time * 0.9 + pm * 0.2) % 1, pa = pm * 1.7 + e.phase, psz = 5 + pph * 8;
            var pk = this.motes.put(e.x + Math.cos(pa) * r * 0.5, r * 1.2 + pph * 70, e.y + Math.sin(pa) * r * 0.5, pph * 4, psz, psz, psz);
            this.motes.tint(pk, smk, 0.9 * (1 - pph));
          }
        } else {
          for (var st3 = 0; st3 < 3; st3++) {
            var sa3 = Game.time * 5 + st3 * 2.09;
            var sk3 = this.motes.put(e.x + Math.cos(sa3) * r * 0.7, r * 2.3, e.y + Math.sin(sa3) * r * 0.7, sa3, 6, 6, 6);
            this.motes.tint(sk3, gold, 1.6);
          }
        }
      }
      if (e.pyl && e.pyl.length && mid === 'weaver') {
        var tg = Models.color(bd.trim);
        for (var pi = 0; pi < e.pyl.length; pi++) {
          var py = e.pyl[pi];
          if (py.dead) continue;
          var ps = this.strips.line(py.x, py.y, e.x, e.y, 7, 24);
          this.strips.strip(ps, tg, U.dist(py.x, py.y, e.x, e.y), 0, 1, 0.55 + 0.25 * Math.sin(Game.time * 6 + pi));
          var pw2 = this.shockwalls.put(py.x, 0, py.y, 0, 14, 120, 14);
          this.shockwalls.wall(pw2, tg, 0.35);
        }
      }
      if (e.tie > 0 || (mid === 'weaver' && e.ph > 0 && e.aim > 0)) {
        var pl = Game.player, tg2 = Models.color(bd.trim), dl = U.dist(e.x, e.y, pl.x, pl.y);
        var ts = this.strips.line(e.x, e.y, pl.x, pl.y, e.tie > 0 ? 9 : 4, 20);
        this.strips.strip(ts, tg2, dl, e.tie > 0 ? 0 : 30, 1, e.tie > 0 ? 0.9 : 0.5 + 0.4 * Math.sin(Game.time * 30));
      }
      if (e.shield > 0) {
        var sr = this.rings.put(e.x, 3, e.y, 0, r + 14, 1, r + 14);
        this.rings.disc(sr, Models.color('#b79ad6'), 4 / (r + 14), 0, 0, 0.8);
        var sg = this.glows.put(e.x, 2, e.y, 0, r + 16, 1, r + 16);
        this.glows.disc(sg, Models.color('#b79ad6'), 0, 0.6, 1, 0.25);
      }
    }
    for (id in this.bossMeshes) {
      if (used[id]) continue;
      var bm = this.bossMeshes[id];
      bm.group.visible = false;
      if (bm.twin) bm.twin.visible = false;
      for (var q = 0; q < bm.ghosts.length; q++) bm.ghosts[q].visible = false;
    }
  },

  markCol: function (c) {
    var cc = this.markCols || (this.markCols = {});
    return cc[c] || (cc[c] = Models.color(c));
  },
  espCol: function (n) { return this.markCol(Enemies.K.esp.c[n]); },
  syncMarks: function () {
    var B = Bosses, i, k, M = B.marks, white = this.markCol('#ffffff');
    for (i = 0; i < M.length; i++) {
      var m = M[i], c = this.markCol(m.c);
      k = 1 - m.t / m.T;
      if (m.k === 'line') {
        var ca = Math.cos(m.a), sa = Math.sin(m.a);
        var mf = m.fade ? -Math.min(m.len * 0.4, 180) : 0, mo = m.out > 0 ? Math.min(1, m.t / m.out) : 1;
        var l = this.lines.line(m.x, m.y, m.x + ca * m.len, m.y + sa * m.len, m.w, 1.8);
        this.lines.strip(l, c, m.len, mf, 1, (0.22 + 0.4 * k) * mo);
        var l2 = this.strips.line(m.x, m.y, m.x + ca * m.len * k, m.y + sa * m.len * k, m.w * 0.3, 2.2);
        this.strips.strip(l2, c, m.len * k + 1, m.fade ? -Math.min(m.len * k * 0.4, 180) : 0, 1, 0.85 * mo);
      } else if (m.k === 'disc') {
        var d1 = this.rings.put(m.x, 1.7, m.y, 0, m.r, 1, m.r);
        this.rings.disc(d1, c, Math.min(0.5, 6 / m.r), 0, 0.1, 0.55 + 0.35 * k);
        var rr = Math.max(4, m.r * k);
        var d2 = this.glows.put(m.x, 1.5, m.y, 0, rr, 1, rr);
        this.glows.disc(d2, c, 0, 0, 0.4, 0.9);
      } else if (m.k === 'fan') {
        for (var f = -3; f <= 3; f++) {
          var fa = m.a + f / 3 * m.hw * 0.85;
          var fl = this.strips.line(m.x, m.y, m.x + Math.cos(fa) * m.r, m.y + Math.sin(fa) * m.r, 64, 2);
          this.strips.strip(fl, c, m.r, 0, 1, (0.12 + 0.3 * k) * (1 - Math.abs(f) / 6));
        }
        for (var ed = -1; ed <= 1; ed += 2) {
          var ea = m.a + ed * m.hw;
          var el = this.lines.line(m.x, m.y, m.x + Math.cos(ea) * m.r, m.y + Math.sin(ea) * m.r, 5, 2.4);
          this.lines.strip(el, white, m.r, 0, 0, 0.35 + 0.4 * k);
        }
        if (m.ring) {
          var rcc = this.markCol(m.rc), rsp = Math.PI * 2 - m.hw * 2, rl0 = m.rin + 6, rl1 = 70 + 230 * k;
          for (var ri2 = 0; ri2 < m.ring; ri2++) {
            var rra = m.a + m.hw + (ri2 + 0.5) / m.ring * rsp, rcs = Math.cos(rra), rsn = Math.sin(rra);
            var rrl = this.lines.line(m.x + rcs * rl0, m.y + rsn * rl0, m.x + rcs * (rl0 + rl1), m.y + rsn * (rl0 + rl1), 9, 2.3);
            this.lines.strip(rrl, rcc, rl1, -rl1 * 0.7, 1, 0.35 + 0.5 * k);
          }
          var rdi = this.rings.put(m.x, 1.9, m.y, 0, rl0 + 4, 1, rl0 + 4);
          this.rings.disc(rdi, rcc, Math.min(0.5, 7 / (rl0 + 4)), 0, 0.1, 0.5 + 0.4 * k);
        }
      }
    }
    var ice = this.markCol('#bfe8ff');
    for (i = 0; i < B.frost.length; i++) {
      var w = B.frost[i], wk = Math.min(1, (1 - w.r / w.max) * 4), band = w.band || B.K.frostmaw.band;
      var wcol = w.q ? this.markCol(w.c) : ice;
      var wr = this.rings.put(w.x, 2, w.y, 0, w.r + band / 2, 1, w.r + band / 2);
      this.rings.disc(wr, wcol, Math.min(0.9, band / (w.r + band / 2)), 0, 0, 0.7 * wk);
      var wc = this.rings.put(w.x, 2.4, w.y, 0, w.r + 2, 1, w.r + 2);
      this.rings.disc(wc, white, Math.min(0.5, 5 / (w.r + 2)), 0, 0, 0.9 * wk);
      var ww = this.shockwalls.put(w.x, 0, w.y, 0, w.r, w.q ? 30 : 18, w.r);
      this.shockwalls.wall(ww, wcol, 0.5 * wk);
    }
    for (i = 0; i < B.zones.length; i++) {
      var z = B.zones[i], zc = this.markCol(z.c), zk = Math.min(1, z.t / 0.5);
      if (z.k === 'disc') {
        var za = this.glows.put(z.x, 1.3, z.y, 0, z.r, 1, z.r);
        this.glows.disc(za, zc, 0.1, 0.4, 0.6, 0.75 * zk);
        var zr = this.rings.put(z.x, 1.6, z.y, 0, z.r, 1, z.r);
        this.rings.disc(zr, zc, Math.min(0.5, 5 / z.r), 0, 0.1, 0.6 * zk);
        var bp = (Game.time * 1.3 + i * 0.37) % 1, bpa = i * 2.3 + Game.time * 0.5;
        var bk = this.motes.put(z.x + Math.cos(bpa) * z.r * 0.5, 3 + bp * 14, z.y + Math.sin(bpa) * z.r * 0.5, 0, 6, 6, 6);
        this.motes.tint(bk, zc, 1.2 * (1 - bp) * zk);
      } else {
        var zx1 = z.x + Math.cos(z.a) * z.len, zy1 = z.y + Math.sin(z.a) * z.len;
        var zl = this.strips.line(z.x, z.y, zx1, zy1, z.w, 3);
        this.strips.strip(zl, zc, z.len, 0, 1, 0.95 * zk);
      }
    }
    var rockC = this.colRock || (this.colRock = Models.color('#8a7a66')), KT = B.K.titan;
    for (i = 0; i < B.rocks.length; i++) {
      var rk = B.rocks[i], rs = rk.k < 1 ? 34 : KT.wallR * 1.15;
      var rb = this.debris.put(rk.x, rk.h + rs * 0.5, rk.y, rk.x * 0.01 + (rk.k < 1 ? Game.time * 4 : 0), rs * 1.7, rs * 1.2, rs * 1.6);
      if (rb >= 0) this.debris.tint(rb, rockC, rk.k < 1 ? 1 : 0.8 + 0.2 * Math.min(1, rk.t));
      if (rk.k >= 1) {
        var rg = this.glows.put(rk.x, 1.2, rk.y, 0, KT.wallR * 1.6, 1, KT.wallR * 1.6);
        this.glows.disc(rg, this.markCol('#ffb35c'), 0, 1.4, 1, 0.3 * Math.min(1, rk.t / 0.8));
      }
    }
    var acid = this.markCol('#9fe05a');
    for (i = 0; i < B.globs.length; i++) {
      var gb = B.globs[i];
      var gk = this.motes.put(gb.x, 10 + gb.h, gb.y, Game.time * 6, 14, 14, 14);
      this.motes.tint(gk, acid, 1.6);
    }
    var gold = this.markCol('#ffcf4a'), scrapC = this.colScrap || (this.colScrap = Models.color('#9a8a70'));
    for (i = 0; i < B.scrap.length; i++) {
      var sc = B.scrap[i], sh = sc.st === 0 ? 520 * Math.max(0, sc.t / sc.T) : (sc.st === 2 ? 22 : 0);
      if (sc.st === 3) {
        var ws = this.debris.put(sc.x, 26, sc.y, i * 1.3, 72, 46, 64);
        if (ws >= 0) this.debris.tint(ws, scrapC, 0.9);
        var wr2 = this.rings.put(sc.x, 1.6, sc.y, 0, B.K.queen.wallR + 8, 1, B.K.queen.wallR + 8);
        this.rings.disc(wr2, this.markCol(B.K.queen.wallC), 0.18, 0, 0.1, 0.5 * Math.min(1, sc.t));
        continue;
      }
      var sb = this.debris.put(sc.x, sh + 12, sc.y, i * 1.3 + (sc.st !== 1 ? Game.time * 6 : 0), 30, 18, 24);
      if (sb >= 0) this.debris.tint(sb, sc.st === 1 && Math.sin(Game.time * 18 + i) > 0.3 ? gold : scrapC, 1.2);
    }
    var lc = this.markCol('#c0a8ff'), wl = B.K.lancer.wall;
    for (i = 0; i < B.spears.length; i++) {
      var s = B.spears[i];
      if (s.fly < 0) continue;
      if (s.fly < 1) {
        k = this.spears.put(s.x, 14, s.y, s.a, 10, 10, 10);
        if (k >= 0) this.spears.tint(k, lc, 1.7);
        var st = this.strips.line(s.x - Math.cos(s.a) * 90, s.y - Math.sin(s.a) * 90, s.x, s.y, 10, 13);
        this.strips.strip(st, lc, 90, 0, 1, 0.6);
        continue;
      }
      var sk = Math.min(1, s.t / 0.8);
      k = this.spears.put(s.x, 6, s.y, s.a, 10, 10, 10);
      if (k >= 0) this.spears.tint(k, lc, 1.3 * sk);
      var wb = this.debris.put(s.x, 13, s.y, s.a + Math.PI / 2, wl, 26, 7);
      if (wb >= 0) this.debris.tint(wb, lc, 0.9 * sk + 0.1);
      var wg = this.glows.put(s.x, 1.2, s.y, s.a, wl * 0.6, 1, wl * 0.6);
      this.glows.disc(wg, lc, 0, 1.4, 1, 0.35 * sk);
    }
    var Mi = Game.mines;
    if (Mi.length > 1) {
      var pink = this.markCol(CFG.col.enemyShot);
      for (i = 0; i < Mi.length; i++) {
        for (var j = i + 1; j < Mi.length; j++) {
          var a = Mi[i], b = Mi[j], dd = U.dist(a.x, a.y, b.x, b.y);
          if (dd > a.r) continue;
          var ml = this.lines.line(a.x, a.y, b.x, b.y, 3, 1.9);
          this.lines.strip(ml, pink, dd, 14, 0, 0.5);
        }
      }
    }
  },

  lair: function (e, k, pillar) {
    var L = CFG.boss.lair, R = L.r, tc = Models.color(e.bd.trim);
    var pulse = 0.5 + 0.5 * Math.sin(Game.time * 2.2 + e.phase);
    var ax = e.anchorX, ay = e.anchorY;
    var lr = this.rings.put(ax, 1.6, ay, 0, R, 1, R);
    this.rings.disc(lr, tc, 9 / R, 0, 0.1, (0.55 + 0.3 * pulse) * k);
    var lg = this.glows.put(ax, 1.4, ay, 0, R, 1, R);
    this.glows.disc(lg, tc, 0.16, 0, 0, (0.18 + 0.12 * pulse) * k);
    if (!pillar) return;
    var pw = this.shockwalls.put(e.x, 0, e.y, 0, 40, 600, 40);
    this.shockwalls.wall(pw, tc, (0.5 + 0.15 * pulse) * k);
    var pc = this.shockwalls.put(e.x, 0, e.y, 0, 9, 820, 9);
    this.shockwalls.wall(pc, this.colLair || (this.colLair = Models.color('#fff4d6')), 0.5 * k);
    var bg = this.glows.put(e.x, 1.2, e.y, 0, e.r * 3.2, 1, e.r * 3.2);
    this.glows.disc(bg, tc, 0, 1.6, 1, 0.45 * k);
  },

  playerMesh: function (p) {
    var key = p.char.id + ':' + p.skin + ':' + p.gun.id;
    if (this.pl && this.pl.key === key) return this.pl;
    if (this.pl) {
      this.scene.remove(this.pl.group);
      this.pl.group.traverse(function (m) { if (m.geometry) m.geometry.dispose(); });
    }
    var sk = Content.skin(p.skin);
    var mdl = Models.player(p.char.id, sk, p.gun.id);
    var g = new THREE.Group();
    var mat = this.matLit.clone();
    mat.emissive = new THREE.Color(0x000000);
    var ghost = View3D.ghostMat(sk.trim, 0.6);
    var part = function (parent, geo, m, order) {
      var mesh = new THREE.Mesh(geo, m);
      mesh.renderOrder = order;
      mesh.castShadow = m === mat;
      parent.add(mesh);
      return mesh;
    };
    var chassis = new THREE.Group();
    part(chassis, mdl.chassis.geo, mat, 2);
    if (mdl.chassis.glow) part(chassis, mdl.chassis.glow, this.matGlow, 2);
    part(chassis, mdl.chassis.geo, ghost, 1);
    var turret = new THREE.Group();
    part(turret, mdl.turret.geo, mat, 2);
    if (mdl.turret.glow) part(turret, mdl.turret.glow, this.matGlow, 2);
    part(turret, mdl.turret.geo, ghost, 1);
    var barrel = part(turret, mdl.barrel.geo, mat, 2);
    g.add(chassis);
    g.add(turret);

    this.scene.add(g);
    this.pl = {
      key: key, group: g, chassis: chassis, turret: turret, barrel: barrel, mat: mat,
      heading: p.ang, px: p.x, py: p.y, fire: p.fireCd, recoil: 0
    };
    return this.pl;
  },

  syncPlayer: function (p, dt) {
    var v = this.playerMesh(p);
    var sk = Content.skin(p.skin);
    var g = v.group, r = p.r;
    g.visible = p.alive || !Game.over;

    var mx = p.x - v.px, my = p.y - v.py;
    v.px = p.x; v.py = p.y;
    if (p.dashT > 0) v.heading = U.turn(v.heading, p.dashAng, 30 * dt);
    else if (mx * mx + my * my > 0.04) v.heading = U.turn(v.heading, Math.atan2(my, mx), 9 * dt);
    if (p.fireCd > v.fire + 0.01) v.recoil = 1;
    v.fire = p.fireCd;
    v.recoil = Math.max(0, v.recoil - dt * 9);

    if (this.dark > 0.01) {
      var ca = Math.cos(p.ang), sa = Math.sin(p.ang);
      this.lamp.position.set(p.x, 140, p.y);
      this.head.position.set(p.x + ca * 10, 24, p.y + sa * 10);
      this.head.target.position.set(p.x + ca * 320, 0, p.y + sa * 320);
      this.head.target.updateMatrixWorld();
    }
    var bob = (mx || my) ? Math.sin(Game.time * 26) * 0.35 : 0;
    g.position.set(p.x, bob, p.y);
    g.scale.set(r, r, r);
    v.chassis.rotation.y = -v.heading;
    v.turret.rotation.y = -p.ang;
    v.barrel.position.x = -v.recoil * 0.22;
    var blink = p.inv > 0 && Math.floor(p.inv * 20) % 2 === 0;
    v.mat.emissive.setScalar(p.dashT > 0 ? 0.5 : (blink ? 0.35 : 0));

    var trail = Models.color(sk.trail), gold = Models.color('#ffd27d'), white = Models.color('#ffffff');
    var s = this.shadows.put(p.x + 3, 0.6, p.y + 4, 0, r * 1.7, 1, r * 1.7);
    this.shadows.disc(s, null, 0, 1.0, 1, 0.55);
    var gl = this.glows.put(p.x, 1, p.y, 0, r * 3.4, 1, r * 3.4);
    this.glows.disc(gl, gold, 0, 1.8, 1, 0.28);
    var rg = this.rings.put(p.x, 1.5, p.y, 0, r + 11, 1, r + 11);
    this.rings.disc(rg, white, 2.2 / (r + 11), 0, 0, 0.5);
    var pk = this.rings.put(p.x, 1.2, p.y, 0, p.st.pickup, 1, p.st.pickup);
    this.rings.disc(pk, trail, 1.5 / p.st.pickup, 0, 0, 0.12);

    if (p.st.frost > 0) {
      var fr = (140 + p.st.frost * 60) * p.st.radius;
      var f = this.glows.put(p.x, 1.1, p.y, 0, fr, 1, fr);
      this.glows.disc(f, Models.color('#6ec8ff'), 0, 0.8, 1, 0.16);
    }
    if (p.st.burn > 0) {
      var br = (130 + p.st.burn * 45) * p.st.radius;
      var bg = this.glows.put(p.x, 1.1, p.y, 0, br, 1, br);
      this.glows.disc(bg, Models.color('#ff7a5c'), 0, 0.8, 1, 0.14);
      var bri = this.rings.put(p.x, 1.6, p.y, 0, br, 1, br);
      this.rings.disc(bri, Models.color('#ff7a5c'), 2 / br, 0, 0, 0.4);
    }
    if (p.tideT >= 0 && p.tideR > 8) {
      var tr = p.tideR, tk = p.tideT < 0.65 ? 1 : 0.75;
      var tw = this.rings.put(p.x, 2, p.y, 0, tr + 18, 1, tr + 18);
      this.rings.disc(tw, gold, Math.min(0.9, 36 / (tr + 18)), 0, 0, 0.55 * tk);
      var tc = this.rings.put(p.x, 2.4, p.y, 0, tr + 2, 1, tr + 2);
      this.rings.disc(tc, white, Math.min(0.5, 5 / (tr + 2)), 0, 0, 0.85 * tk);
      var tws = this.shockwalls.put(p.x, 0, p.y, 0, tr, 30, tr);
      this.shockwalls.wall(tws, gold, 0.5 * tk);
    }
    if (p.st.nova > 0 && !(p.evo.nova && p.tideT >= 0)) {
      var nr = (180 + p.st.nova * 70) * p.st.radius;
      var k = U.clamp(1 - p.novaCd / 6, 0, 1);
      var ng = this.glows.put(p.x, 1.2, p.y, 0, nr, 1, nr);
      this.glows.disc(ng, gold, 0, 0.7, 1, 0.06 + k * 0.14);
      var nri = this.rings.put(p.x, 1.7, p.y, 0, nr, 1, nr);
      this.rings.disc(nri, gold, (1 + k * 2) / nr, 0, 0, 0.25 + k * 0.5);
    }

    if (p.st.orbit > 0) {
      var mill = p.millK > 0, tech = Models.color(mill ? '#f2c46a' : CFG.col.tech), bs = mill ? 15 : 11;
      for (var o = 0; o < p.st.orbit; o++) {
        var a = p.orbA + o / p.st.orbit * Math.PI * 2;
        var ox = p.x + Math.cos(a) * p.orbR, oy = p.y + Math.sin(a) * p.orbR;
        this.blades.put(ox, 14, oy, Game.time * (mill ? 24 : 16) + o, bs, bs, bs);
        this.halo(ox, 14, oy, mill ? 30 : 20, tech, mill ? 0.8 : 0.6);
        if (mill) {
          var og = this.glows.put(ox, 1.3, oy, 0, 26, 1, 26);
          this.glows.disc(og, tech, 0, 1.4, 1, 0.4);
        }
        var os = this.shadows.put(ox + 4, 0.6, oy + 4, 0, 11, 1, 11);
        this.shadows.disc(os, null, 0, 1, 1, 0.35);
      }
    }

    var t = Game.time, mk, ph, i2;
    if (p.st.frost > 0) {
      var frr = (140 + p.st.frost * 60) * p.st.radius, snow = Models.color('#e6f6ff');
      for (i2 = 0; i2 < 26; i2++) {
        var sa = i2 * 2.39996 + t * 0.7;
        var srad = frr * (0.2 + 0.8 * ((i2 * 0.618) % 1));
        ph = (t * 0.35 + i2 * 0.137) % 1;
        mk = this.motes.put(p.x + Math.cos(sa) * srad, 4 + 46 * (1 - ph), p.y + Math.sin(sa) * srad, sa * 3, 2.4, 2.4, 2.4);
        this.motes.tint(mk, snow, 1.3);
      }
    }
    if (p.st.burn > 0) {
      var brr = (130 + p.st.burn * 45) * p.st.radius, c0 = this._c;
      for (i2 = 0; i2 < 30; i2++) {
        var fa = i2 * 2.39996 + t * 0.4;
        var frad = brr * (0.82 + 0.18 * Math.sin(i2 * 1.7 + t));
        ph = (t * 1.3 + i2 * 0.217) % 1;
        c0.setRGB(1, 0.85 - ph * 0.6, 0.35 - ph * 0.3);
        var fs = 1 + 4 * (1 - ph);
        mk = this.motes.put(p.x + Math.cos(fa) * frad, 3 + ph * 30, p.y + Math.sin(fa) * frad, fa, fs, fs * 1.5, fs);
        this.motes.tint(mk, c0, 1.4);
      }
    }

    if (p.trail.length) {
      var ember = Models.color('#ff8a4a'), soot2 = Models.color('#1a120b'), c1 = this._c;
      for (i2 = 0; i2 < p.trail.length; i2++) {
        var tp = p.trail[i2], ta = U.clamp(1 - (t - tp.t) / 3, 0, 1);
        var td = this.decals.put(tp.x, 0.5, tp.y, i2, 17, 1, 17);
        this.decals.disc(td, soot2, 0, 0.9, 1, 0.5 * Math.min(1, ta * 2));
        var tg = this.glows.put(tp.x, 1.05, tp.y, 0, 26, 1, 26);
        this.glows.disc(tg, ember, 0, 1.3, 1, 0.75 * ta);
        for (var tf = 0; tf < 2; tf++) {
          var tph = (t * 1.6 + i2 * 0.37 + tf * 0.5) % 1, tfs = (2 + 5 * (1 - tph)) * (0.35 + 0.65 * ta);
          c1.setRGB(1, 0.85 - tph * 0.6, 0.35 - tph * 0.3);
          mk = this.motes.put(tp.x + Math.sin(i2 * 2.3 + tf * 2) * 8, 3 + tph * 26 * ta, tp.y + Math.cos(i2 * 1.7 + tf * 2) * 8, i2, tfs, tfs * 1.5, tfs);
          this.motes.tint(mk, c1, 1.5);
        }
      }
    }

    var tlist = p.evo.tether ? p.tethers : (p.tetherTarget ? [p.tetherTarget] : null);
    if (tlist) {
      var tcol = Models.color(CFG.col.tech);
      for (i2 = 0; i2 < tlist.length; i2++) {
        var te = tlist[i2];
        if (te.dead) continue;
        var tl = U.dist(p.x, p.y, te.x, te.y);
        var ts = this.strips.line(p.x, p.y, te.x, te.y, 10, 14);
        this.strips.strip(ts, tcol, tl, 0, 1, 0.9);
      }
    }

    this.syncTurrets();
  },

  syncTurrets: function () {
    var list = Game.turrets, pool = this.turretPool, i;
    while (pool.length < list.length) {
      var mdl = Models.turret();
      var g = new THREE.Group();
      var base = new THREE.Mesh(mdl.base.geo, this.matLit);
      base.castShadow = true;
      g.add(base);
      var head = new THREE.Group();
      var hm = new THREE.Mesh(mdl.head.geo, this.matLit);
      hm.castShadow = true;
      head.add(hm);
      head.add(new THREE.Mesh(mdl.head.glow, this.matGlow));
      head.position.y = 1.05;
      g.add(head);
      g.scale.setScalar(12);
      this.scene.add(g);
      pool.push({ group: g, head: head });
    }
    for (i = 0; i < pool.length; i++) {
      var t = list[i], v = pool[i];
      v.group.visible = !!t && !(t.life < 3 && Math.sin(t.life * 16) < 0);
      if (!t) continue;
      v.group.position.set(t.x, 0, t.y);
      v.head.rotation.y = -t.ang;
      var s = this.shadows.put(t.x, 0.6, t.y, 0, 14, 1, 14);
      this.shadows.disc(s, null, 0, 1, 1, 0.4);
      var gl = this.glows.put(t.x, 1, t.y, 0, t.rk ? 32 : 26, 1, t.rk ? 32 : 26);
      this.glows.disc(gl, Models.color(t.rk ? '#f2c46a' : CFG.col.tech), 0, 1.5, 1, t.rk ? 0.45 : 0.35);
    }
  },

  setQuality: function (lvl) {
    if (!this.on) return;
    var sh = this.sun.shadow, size = Quality.shadowSize(lvl), on = lvl > 0;
    if (sh.mapSize.x !== size) {
      sh.mapSize.set(size, size);
      if (sh.map) { sh.map.dispose(); sh.map = null; }
    }
    if (on === this.shadowsOn) return;
    this.shadowsOn = on;
    this.renderer.shadowMap.enabled = on;
    this.sun.castShadow = on;
    this.scene.traverse(function (o) {
      var m = o.material;
      if (!m) return;
      if (m.length) { for (var i = 0; i < m.length; i++) m[i].needsUpdate = true; }
      else m.needsUpdate = true;
    });
    this.shadows.k = on ? 0.55 : 1;
  },

  halo: function (x, h, y, r, col, a) {
    if (Save.data.set.low) return;
    var k = this.halos.put(x, h, y, 0, r, r, r);
    this.halos.disc(k, col, 0, 1.8, 1, a);
  },

  syncShots: function () {
    var i, b, k;
    var list = Game.bullets;
    var glow = list.length < 140;
    var core = this.colAlly, hot = this.colCrit, red = this.colFoe;
    for (i = 0; i < list.length; i++) {
      b = list[i];
      var a = Math.atan2(b.vy, b.vx);
      var r = U.clamp(b.r, 3, 6) * (b.crit ? 1.3 : 1);
      k = this.shots.put(b.x, 13, b.y, a, r * 2.8, r * 0.85, r * 0.85);
      if (k < 0) break;
      this.shots.tint(k, b.crit ? hot : core, 1.8);
      this.shotRims.put(b.x, 13, b.y, a, r * 2.8 + 2.2, r * 0.85 + 1.6, r * 0.85 + 1.6);
      if (glow) this.halo(b.x, 13, b.y, r * 3, core, 0.6);
      var bs = this.shadows.put(b.x + 6, 0.7, b.y + 4, 0, r * 1.3, 1, r * 1.3);
      this.shadows.disc(bs, null, 0, 1.2, 1, 0.5);
    }
    list = Game.ebullets;
    var pulse = 1 + Math.sin(Game.time * 14) * 0.08, tt = Game.time, hotW = this.colCrit;
    for (i = 0; i < list.length; i++) {
      b = list[i];
      var er = U.clamp(b.r, 6, 9) * pulse;
      var ec = b.bc ? this.markCol(b.bc) : red, gr = er * 1.9;
      if (b.bk === 1) {
        var fa = Math.atan2(b.vy, b.vx), fc = Math.cos(fa), fs = Math.sin(fa);
        k = this.spears.put(b.x, 13, b.y, fa, er * 0.85, er * 1.05, er * 1.05);
        if (k >= 0) this.spears.tint(k, ec, 3.2);
        this.spearRims.put(b.x, 13, b.y, fa, er * 0.85 + 1.2, er * 1.05 * 1.4, er * 1.05 * 1.4);
        var ft = this.strips.line(b.x - fc * er * 6, b.y - fs * er * 6, b.x, b.y, er * 1.6, 12.5);
        this.strips.strip(ft, ec, er * 6, 0, 1, 0.75);
        this.halo(b.x + fc * er * 1.5, 13, b.y + fs * er * 1.5, er * 2.2, hotW, 0.75);
      } else if (b.bk === 2) {
        var qr = er * 1.55;
        k = this.gems.put(b.x, 14, b.y, tt * 7 + i, qr, qr * 1.25, qr);
        if (k >= 0) this.gems.tint(k, ec, 1.9);
        this.eshotRims.put(b.x, 14, b.y, 0, qr + 3.2, qr * 1.25 + 3.2, qr + 3.2);
        this.halo(b.x, 15, b.y, qr * 1.3, hotW, 1);
        gr = qr * 1.7;
      } else if (b.spear) {
        k = this.spears.put(b.x, 14, b.y, b.ang, er, er, er);
        if (k >= 0) this.spears.tint(k, ec, 1.6);
        this.spearRims.put(b.x, 14, b.y, b.ang, er * 1.25, er * 1.4, er * 1.4);
      } else {
        k = this.eshots.put(b.x, 12, b.y, 0, er, er, er);
        if (k >= 0) this.eshots.tint(k, ec, b.bc ? 1.9 : 1.6);
        this.eshotRims.put(b.x, 12, b.y, 0, er + 2.6, er + 2.6, er + 2.6);
      }
      this.halo(b.x, 12, b.y, er * 2.8, ec, 0.8);
      var es = this.shadows.put(b.x + 6, 0.7, b.y + 4, 0, er * 1.2, 1, er * 1.2);
      this.shadows.disc(es, null, 0, 1.2, 1, 0.5);
      var gk = this.rings.put(b.x, 1.2, b.y, 0, gr, 1, gr);
      this.rings.disc(gk, ec, 0.22, 1.2, 0.35, 0.75);
    }
  },

  syncPickups: function () {
    var i, t = Game.time;
    var gem = Models.color(CFG.col.gem);
    for (i = 0; i < Game.gems.length; i++) {
      var g = Game.gems[i];
      var y = 6 + Math.sin(t * 3 + g.x * 0.1) * 2;
      var k = this.gems.put(g.x, y, g.y, t * 2 + g.x, g.r * 0.9, g.r * 1.3, g.r * 0.9);
      if (k < 0) break;
      this.gems.tint(k, gem, 1.3);
      this.halo(g.x, y, g.y, g.r * 2.6, gem, 0.45);
    }
    var full = Game.player && Game.player.hp >= Game.player.st.maxHp;
    for (i = 0; i < Game.heals.length; i++) {
      var h = Game.heals[i];
      if (h.life < 4 && Math.floor(h.life * 6) % 2 === 0) continue;
      if (full) { this.heals.put(h.x, 5, h.y, 0.6, 3.6, 3.6, 3.6); continue; }
      this.heals.put(h.x, 9 + Math.sin(t * 3) * 2, h.y, t * 1.5, 5, 5, 5);
      this.halo(h.x, 9, h.y, 22, Models.color(CFG.col.heal), 0.6);
    }
    var cols = { scrap: '#ffd27d', heal: '#7ee08a', rage: '#ff7a5c', haste: '#7ec8ff', shield: '#b07ef5' };
    for (i = 0; i < Game.drops.length; i++) {
      var d = Game.drops[i];
      if (d.life < 5 && Math.floor(d.life * 6) % 2 === 0) continue;
      var c = Models.color(cols[d.t] || '#ffd27d');
      var yy = 10 + Math.sin(d.bob) * 3;
      var dk = this.drops.put(d.x, yy, d.y, t * 1.2, d.r * 0.9, d.r * 0.9, d.r * 0.9);
      if (dk >= 0) this.drops.tint(dk, c, 1.3);
      this.halo(d.x, yy, d.y, d.r * 2.6, c, 0.6);
      var ds = this.glows.put(d.x, 1, d.y, 0, d.r * 2, 1, d.r * 2);
      this.glows.disc(ds, c, 0, 1.4, 1, 0.4);
    }
  },

  syncHazards: function () {
    var i, pink = Models.color(CFG.col.enemyShot), white = Models.color('#ffffff');
    for (i = 0; i < Game.mines.length; i++) {
      var m = Game.mines[i];
      var blink = m.t < 0.8 ? (Math.floor(m.t * 12) % 2 === 0) : (Math.floor(m.t * 4) % 2 === 0);
      this.mines.put(m.x, 0, m.y, 0, 9, 9, 9);
      var li = this.mineLights.put(m.x, 6, m.y, 0, 9, 9, 9);
      if (li >= 0) this.mineLights.tint(li, blink ? white : pink, 1.5);
      if (blink) this.halo(m.x, 6, m.y, 20, pink, 0.9);
      var rr = this.rings.put(m.x, 1.4, m.y, 0, m.r, 1, m.r);
      this.rings.disc(rr, pink, 2.5 / m.r, 0, 0, 0.45);
      var rf = this.glows.put(m.x, 1.2, m.y, 0, m.r, 1, m.r);
      this.glows.disc(rf, pink, 0, 0, 0.12 * (1 - m.t / 2.6) + 0.04, 1);
    }
    var shock = Models.color(CFG.col.shock);
    for (i = 0; i < Game.waves.length; i++) {
      var w = Game.waves[i];
      var k = Math.min(1, (1 - w.r / w.max) * 3);
      var wr = this.rings.put(w.x, 2, w.y, 0, w.r + 22, 1, w.r + 22);
      this.rings.disc(wr, shock, Math.min(0.9, 44 / (w.r + 22)), 0, 0, 0.62 * k);
      var wc = this.rings.put(w.x, 2.4, w.y, 0, w.r + 3, 1, w.r + 3);
      this.rings.disc(wc, white, Math.min(0.5, 6 / (w.r + 3)), 0, 0, 0.9 * k);
      var wg = this.glows.put(w.x, 2, w.y, 0, w.r + 30, 1, w.r + 30);
      this.glows.disc(wg, shock, Math.min(0.9, 60 / (w.r + 30)), 0, 0, 0.45 * k);
      var ww = this.shockwalls.put(w.x, 0, w.y, 0, w.r, 26, w.r);
      this.shockwalls.wall(ww, shock, 0.55 * k);
    }
    var green0 = Models.color(CFG.col.heal), sick = Models.color('#c9e86a'), green;
    for (i = 0; i < Game.clouds.length; i++) {
      var c = Game.clouds[i];
      var a = Math.min(1, c.life / 2);
      green = c.evo ? sick : green0;
      var cg = this.glows.put(c.x, 1.5, c.y, Game.time * 0.3, c.r, 1, c.r);
      this.glows.disc(cg, green, 0, 0.5, 1, 0.22 * a);
      var cr = this.rings.put(c.x, 1.8, c.y, 0, c.r * 0.95, 1, c.r * 0.95);
      this.rings.disc(cr, green, 2 / c.r, 0, 0, 0.5 * a);
      for (var sp = 0; sp < 12; sp++) {
        var sa = sp * 2.39996 + i;
        var srad = c.r * 0.85 * ((sp * 0.618) % 1);
        var ph = (Game.time * 0.25 + sp * 0.11) % 1;
        var ss = 2 + 2 * Math.sin(ph * Math.PI);
        var mk = this.motes.put(c.x + Math.cos(sa) * srad, 3 + ph * 34, c.y + Math.sin(sa) * srad, ph * 6, ss, ss, ss);
        this.motes.tint(mk, green, 1.2 * a);
      }
    }
  },

  syncTrophy: function (p) {
    var T = Trophy, N = T.N, i, k, t = Game.time, white = Models.color('#ffffff');
    var cc = this.trCol || (this.trCol = {
      mine: Models.color('#ffd27d'), post: Models.color('#b6e07a'), ice: Models.color('#7ec8ff'),
      spear: Models.color('#c0a8ff'), beam: Models.color('#ff4d8d'), wasp: Models.color('#ffd24a')
    });
    if (p.tr.driller && p.alive && p.trs) {
      var ts = p.trs, ND = N.drill, dc = Math.cos(ts.da), dsn = Math.sin(ts.da), hit = ts.drHit > 0;
      var jt = Math.sin(t * (hit ? 95 : 45)) * (hit ? 1.4 : 0.5), dpx = -dsn, dpy = dc;
      var bx = p.x + dc * (p.r * 0.85 + jt), by = p.y + dsn * (p.r * 0.85 + jt);
      var sxl = ND.len / 2.4, syw = ND.w / 0.9;
      this.drills.put(bx, ND.w * 0.75, by, ts.da, sxl, syw, syw);
      var dcol = this.markCol(Bosses.byId('driller').trim), ph = (t * 150) % 14;
      for (var dl = -1; dl <= 1; dl++) {
        var off = dl * (ND.w + 5), lx = bx + dpx * off * (dl ? 1 : 0), ly = by + dpy * off * (dl ? 1 : 0);
        var lL = ND.len + 14 - Math.abs(dl) * 8 + ph;
        var dli = this.strips.line(lx - dc * ph, ly - dsn * ph, lx - dc * ph + dc * lL, ly - dsn * ph + dsn * lL, dl ? 2.5 : 4, 1.6);
        this.strips.strip(dli, dcol, lL, 14, 0, hit ? 0.95 : 0.55);
      }
      var tx = bx + dc * ND.len, ty = by + dsn * ND.len;
      var dg = this.glows.put(tx, 1.3, ty, 0, ND.w * (hit ? 2.4 : 1.4), 1, ND.w * (hit ? 2.4 : 1.4));
      this.glows.disc(dg, dcol, 0, 1.4, 1, hit ? 0.8 : 0.35);
      if (hit) {
        for (var sp = 0; sp < 4; sp++) {
          var sph = (t * 3.5 + sp * 0.25) % 1, spa = ts.da + Math.PI + (sp - 1.5) * 0.7;
          var sm = this.motes.put(tx + Math.cos(spa) * sph * 26, 5 + Math.sin(sph * 3.1) * 14, ty + Math.sin(spa) * sph * 26, sph * 9, 3, 3, 3);
          this.motes.tint(sm, white, 2 * (1 - sph));
        }
      }
    }
    for (i = 0; i < T.mines.length; i++) {
      var m = T.mines[i], on = m.arm <= 0, bl = on && Math.floor(t * 6) % 2 === 0;
      this.mines.put(m.x, 0, m.y, 0, 8, 8, 8);
      k = this.mineLights.put(m.x, 5.5, m.y, 0, 8, 8, 8);
      if (k >= 0) this.mineLights.tint(k, bl ? white : cc.mine, on ? 1.5 : 0.6);
      if (on) {
        var mr = this.rings.put(m.x, 1.3, m.y, 0, N.mine.trig + 10, 1, N.mine.trig + 10);
        this.rings.disc(mr, cc.mine, 2 / (N.mine.trig + 10), 0, 0, 0.35);
        if (bl) this.halo(m.x, 6, m.y, 16, cc.mine, 0.8);
      }
    }
    for (i = 0; i < T.posts.length; i++) {
      var o = T.posts[i], oa = Math.min(1, o.life / 1.2), ol = U.dist(o.x1, o.y1, o.x2, o.y2);
      for (var e2 = 0; e2 < 2; e2++) {
        var px = e2 ? o.x2 : o.x1, py = e2 ? o.y2 : o.y1;
        var pw = this.shockwalls.put(px, 0, py, 0, 7, 46, 7);
        this.shockwalls.wall(pw, cc.post, 0.95 * oa);
        var pg = this.glows.put(px, 1.2, py, 0, 30, 1, 30);
        this.glows.disc(pg, cc.post, 0, 1.4, 1, 0.55 * oa);
        this.halo(px, 40, py, 14, cc.post, 0.7 * oa);
      }
      var os = this.strips.line(o.x1, o.y1, o.x2, o.y2, 9, 22);
      this.strips.strip(os, cc.post, ol, 0, 1, 0.85 * oa);
      var oc = this.strips.line(o.x1, o.y1, o.x2, o.y2, 2.5, 22.2);
      this.strips.strip(oc, white, ol, 0, 0, 0.7 * oa);
      var og = this.lines.line(o.x1, o.y1, o.x2, o.y2, 5, 0.9);
      this.lines.strip(og, cc.post, ol, 14, 0, 0.4 * oa);
    }
    var R = N.chill.r * p.st.radius;
    for (i = 0; i < T.chills.length; i++) {
      var c = T.chills[i], ca = U.clamp(1 - (c.t - N.chill.t) / 0.35, 0, 1), cr = Math.max(8, c.r);
      var cw = this.rings.put(c.x, 2, c.y, 0, cr + 16, 1, cr + 16);
      this.rings.disc(cw, cc.ice, Math.min(0.9, 30 / (cr + 16)), 0, 0, 0.55 * ca);
      var ce = this.rings.put(c.x, 2.4, c.y, 0, cr + 2, 1, cr + 2);
      this.rings.disc(ce, white, Math.min(0.5, 5 / (cr + 2)), 0, 0, 0.8 * ca);
      var cs = this.shockwalls.put(c.x, 0, c.y, 0, cr, 22, cr);
      this.shockwalls.wall(cs, cc.ice, 0.45 * ca);
      if (c.r < R) {
        var cg = this.glows.put(c.x, 1.4, c.y, 0, cr, 1, cr);
        this.glows.disc(cg, cc.ice, 0, 0.8, 1, 0.12 * ca);
      }
    }
    if (p.tr.frostmaw) {
      var en = Game.enemies;
      for (i = 0; i < en.length; i++) {
        var fe = en[i];
        if (fe.frz <= 0 || fe.dead) continue;
        var fg = this.glows.put(fe.x, 1.5, fe.y, 0, fe.r * 1.7, 1, fe.r * 1.7);
        if (fg < 0) break;
        this.glows.disc(fg, cc.ice, 0, 1.2, 1, 0.7 * Math.min(1, fe.frz * 2));
        this.halo(fe.x, 12, fe.y, fe.r * 1.6, cc.ice, 0.5 * Math.min(1, fe.frz * 2));
      }
    }
    for (i = 0; i < T.spears.length; i++) {
      var s = T.spears[i], sa = s.fly ? 1 : Math.min(1, s.life / 0.8);
      if (s.fly) {
        k = this.spears.put(s.x, 14, s.y, s.a, 9, 9, 9);
        if (k >= 0) this.spears.tint(k, cc.spear, 1.7);
        this.halo(s.x, 14, s.y, 26, cc.spear, 0.8);
        var st = this.strips.line(s.x - Math.cos(s.a) * 90, s.y - Math.sin(s.a) * 90, s.x, s.y, 10, 13);
        this.strips.strip(st, cc.spear, 90, 0, 1, 0.6);
        continue;
      }
      k = this.spears.put(s.x, 6, s.y, s.a, 9, 9, 9);
      if (k >= 0) this.spears.tint(k, cc.spear, 1.3 * sa);
      var wb = this.debris.put(s.x, 13, s.y, s.a + Math.PI / 2, N.spear.len, 26, 7);
      if (wb >= 0) this.debris.tint(wb, cc.spear, 0.9 * sa + 0.1);
      var wg = this.glows.put(s.x, 1.2, s.y, s.a, N.spear.len * 0.6, 1, N.spear.len * 0.6);
      this.glows.disc(wg, cc.spear, 0, 1.4, 1, 0.35 * sa);
    }
    if (p.tr.warden) {
      var ba = p.trs.beamA, bx = Math.cos(ba), by = Math.sin(ba), L = N.beam.len;
      var x0 = p.x + bx * 18, y0 = p.y + by * 18, x1 = p.x + bx * L, y1 = p.y + by * L;
      var bs = this.strips.line(x0, y0, x1, y1, N.beam.w * 2.6, 6);
      this.strips.strip(bs, cc.beam, L - 18, 0, 1, 0.9);
      var bc = this.strips.line(x0, y0, x1, y1, N.beam.w * 0.6, 6.2);
      this.strips.strip(bc, white, L - 18, 0, 0, 0.75);
      var bg = this.glows.put(x1, 1.4, y1, 0, 26, 1, 26);
      this.glows.disc(bg, cc.beam, 0, 1.4, 1, 0.6);
    }
    for (i = 0; i < T.drones.length; i++) {
      var d = T.drones[i], dh = 20 + Math.sin(t * 9 + i) * 3;
      k = this.orbs.put(d.x, dh, d.y, t * 8 + i, 7, 4.5, 7);
      if (k >= 0) this.orbs.tint(k, cc.wasp, 1.6);
      this.halo(d.x, dh, d.y, 15, cc.wasp, 0.8);
      var ds = this.shadows.put(d.x + 5, 0.6, d.y + 4, 0, 5, 1, 5);
      this.shadows.disc(ds, null, 0, 1, 1, 0.35);
    }
  },

  syncSpells: function (p) {
    var S = Spells, i, k, t = Game.time, white = Models.color('#ffffff');
    var cc = this.spCol || (this.spCol = {
      saw: Models.color('#ff9a3c'), gold: Models.color('#f2c46a'), rk: Models.color('#ff9a3c'),
      dome: Models.color('#7ee0ff'), mir: Models.color('#e8f4ff'), ram: Models.color('#ffb35c')
    });
    for (i = 0; i < S.saws.length; i++) {
      var s = S.saws[i], ss = s.circ ? 17 : 13, sc = s.circ ? cc.gold : cc.saw;
      this.saws.put(s.x, 12, s.y, s.spin, ss, ss, ss);
      this.halo(s.x, 12, s.y, ss * 1.8, sc, 0.6);
      var sg = this.glows.put(s.x, 1.2, s.y, 0, ss * 1.6, 1, ss * 1.6);
      this.glows.disc(sg, sc, 0, 1.4, 1, 0.45);
    }
    for (i = 0; i < S.rockets.length; i++) {
      var r = S.rockets[i], ca = Math.cos(r.a), sa = Math.sin(r.a), rz = r.h ? 0.55 : 1;
      k = this.spears.put(r.x, 18 * (r.h ? 0.8 : 1), r.y, r.a, 7 * rz, 7 * rz, 7 * rz);
      if (k >= 0) this.spears.tint(k, cc.rk, 2.4);
      var tl = Math.min(120 * rz, r.t * 420);
      var rs = this.strips.line(r.x - ca * tl, r.y - sa * tl, r.x - ca * 10 * rz, r.y - sa * 10 * rz, 10 * rz, 18 * (r.h ? 0.8 : 1));
      this.strips.strip(rs, cc.rk, tl, 0, 1, 0.85);
      this.halo(r.x - ca * 12 * rz, 18, r.y - sa * 12 * rz, 22 * rz, white, 0.9);
      var rg = this.glows.put(r.x, 1.3, r.y, 0, 26 * rz, 1, 26 * rz);
      this.glows.disc(rg, cc.rk, 0, 1.4, 1, 0.45 * (r.h ? 0.7 : 1));
    }
    if (p.domeT > 0) {
      var dc = p.evo.dome ? cc.mir : cc.dome, R = p.domeR, da = Math.min(1, p.domeT * 3);
      var dw = this.shockwalls.put(p.x, 0, p.y, 0, R, R * 0.55, R);
      this.shockwalls.wall(dw, dc, 0.5 * da);
      var de = this.rings.put(p.x, 1.6, p.y, 0, R, 1, R);
      this.rings.disc(de, dc, Math.min(0.5, 8 / R), 0, 0, 0.85 * da);
      var dg = this.glows.put(p.x, 1.3, p.y, 0, R, 1, R);
      this.glows.disc(dg, dc, 0, 0.6, 1, (0.12 + 0.05 * Math.sin(t * 9)) * da);
      this.halo(p.x, R * 0.5, p.y, R * 0.5, dc, 0.18 * da);
    }
    if (p.skills.ram && p.dashT > 0) {
      var ra = p.dashAng, W = p.r + S.N.ram.w(S.lv(p, 'ram'));
      var fx = p.x + Math.cos(ra) * W * 0.6, fy = p.y + Math.sin(ra) * W * 0.6;
      var pg = this.glows.put(fx, 1.4, fy, ra, W, 1, W);
      this.glows.disc(pg, cc.ram, 0, 1.2, 1, 0.8);
      var px = -Math.sin(ra) * W, py = Math.cos(ra) * W;
      var pl = this.strips.line(fx - px, fy - py, fx + px, fy + py, 8, 10);
      this.strips.strip(pl, cc.ram, W * 2, 0, 1, 0.9);
      this.halo(fx, 10, fy, W * 0.8, cc.ram, 0.6);
    }
  },

  syncFx: function () {
    var i, list = FX.parts;
    for (i = 0; i < list.length; i++) {
      var p = list[i];
      var a = U.clamp(p.life / p.max, 0, 1);
      var h = 3 + Math.sin((1 - a) * Math.PI) * 14 * Math.min(1.5, p.r / 3);
      var s = p.r * 1.3 * (0.35 + 0.65 * a);
      var k = this.debris.put(p.x, h, p.y, p.life * 9 + i, s, s, s);
      if (k < 0) break;
      this.debris.tint(k, Models.color(p.c), 1.2);
    }
    for (i = 0; i < FX.rings.length; i++) {
      var r = FX.rings[i];
      var kk = 1 - r.life / r.max;
      var rad = Math.max(2, U.lerp(r.r, r.r1, kk));
      var ri = this.rings.put(r.x, 2.2, r.y, 0, rad, 1, rad);
      this.rings.disc(ri, Models.color(r.c), Math.min(0.6, r.w * (1 - kk * 0.6) / rad), 0, 0, 1 - kk);
      if (r.r1 >= 60 && !r.flat) {
        var wi = this.shockwalls.put(r.x, 0, r.y, 0, rad, Math.min(70, r.r1 * 0.32) * (1 - kk * 0.4), rad);
        this.shockwalls.wall(wi, Models.color(r.c), (1 - kk) * 0.6);
      }
    }
    var core0 = Models.color('#ffffff');
    for (i = 0; i < FX.bolts.length; i++) {
      var bo = FX.bolts[i];
      var al = bo.life / bo.max, bc = Models.color(bo.c), core = core0;
      for (var q = 1; q < bo.pts.length; q++) {
        var p0 = bo.pts[q - 1], p1 = bo.pts[q];
        var len = U.dist(p0.x, p0.y, p1.x, p1.y);
        var sl = this.strips.line(p0.x, p0.y, p1.x, p1.y, 12, 16);
        this.strips.strip(sl, bc, len, 0, 1, al);
        var sc = this.strips.line(p0.x, p0.y, p1.x, p1.y, 2.5, 16);
        this.strips.strip(sc, core, len, 0, 0, al);
      }
    }
    var sky = this.colSky || (this.colSky = Models.color('#bfe3ff'));
    for (i = 0; i < FX.strikes.length; i++) {
      var st = FX.strikes[i], sa = st.life / st.max;
      var sw = this.shockwalls.put(st.x, 0, st.y, 0, 7, 900, 7);
      this.shockwalls.wall(sw, sky, 0.9 * sa);
      var sw2 = this.shockwalls.put(st.x, 0, st.y, 0, 2.5, 900, 2.5);
      this.shockwalls.wall(sw2, core0, sa);
      var sg = this.glows.put(st.x, 1.6, st.y, 0, 60, 1, 60);
      this.glows.disc(sg, sky, 0, 1.4, 1, 0.7 * sa);
      var sr = this.rings.put(st.x, 2.2, st.y, 0, 20 + 30 * (1 - sa), 1, 20 + 30 * (1 - sa));
      this.rings.disc(sr, core0, 0.18, 0, 0, sa);
    }
    var rcol = this.colRail || (this.colRail = Models.color('#ff9a4a'));
    for (i = 0; i < Game.rails.length; i++) {
      var rl = Game.rails[i], ra = U.clamp(rl.life / 1.3, 0, 1);
      var rlen = U.dist(rl.x1, rl.y1, rl.x2, rl.y2);
      if (rlen < 4) continue;
      var rs = this.strips.line(rl.x1, rl.y1, rl.x2, rl.y2, 22, 2);
      this.strips.strip(rs, rcol, rlen, 0, 1, 0.75 * ra);
      var rc = this.strips.line(rl.x1, rl.y1, rl.x2, rl.y2, 4, 2.2);
      this.strips.strip(rc, core0, rlen, 0, 0, 0.6 * ra);
    }
    var bcol = this.colBomb || (this.colBomb = Models.color('#ffb35c'));
    for (i = 0; i < Game.bomblets.length; i++) {
      var bm = Game.bomblets[i], bk = 1 - bm.t / bm.max;
      var bh = 6 + Math.sin(bk * Math.PI) * 22;
      var bi = this.shots.put(bm.x, bh, bm.y, 0, 4.5, 4.5, 4.5);
      if (bi >= 0) this.shots.tint(bi, bcol, 1.8);
      this.halo(bm.x, bh, bm.y, 12, bcol, 0.7);
    }

    var c0 = this._c, hot = Models.color('#fff3c8'), ember = Models.color('#3a1607'), smoke = Models.color('#5e5146');
    for (i = 0; i < FX.blasts.length; i++) {
      var bl = FX.blasts[i];
      var k = 1 - bl.life / bl.max;
      var grow = k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75 * 0.85;
      var bs = bl.r * (bl.pop ? 0.17 : (bl.rk ? 0.3 : 0.32)) * grow;
      if (k < 0.4) c0.copy(hot).lerp(Models.color(bl.c), k / 0.4);
      else c0.copy(Models.color(bl.c)).lerp(ember, (k - 0.4) / 0.6);
      var fb = this.fireballs.put(bl.x, bs * 0.45, bl.y, k * 2, bs, bs * 0.85, bs);
      this.fireballs.tint(fb, c0, 1.3);
      if (bl.rk) {
        var fa = 1 - k, rR = bl.r;
        var rgl = this.glows.put(bl.x, 1.5, bl.y, 0, rR, 1, rR);
        this.glows.disc(rgl, Models.color(bl.c), 0, 1.3, 1, 0.6 * fa * fa);
        var rri = this.rings.put(bl.x, 2.4, bl.y, 0, rR, 1, rR);
        this.rings.disc(rri, hot, Math.min(0.5, 6 / rR), 0, 0, 0.95 * fa);
        this.halo(bl.x, bs * 0.6 + 6, bl.y, bs * 2.4, hot, 0.85 * fa);
        continue;
      }
      if (bl.pop) {
        var pg = this.glows.put(bl.x, 1.4, bl.y, 0, bl.r * 0.55, 1, bl.r * 0.55);
        this.glows.disc(pg, Models.color(bl.c), 0, 1.4, 1, 0.4 * (1 - k));
        continue;
      }
      if (k > 0.2) {
        var sk = (k - 0.2) / 0.8;
        for (var j = 0; j < 3; j++) {
          var sa = j * 2.1 + bl.x * 0.013;
          var ss = bl.r * 0.1 * (0.5 + sk * 0.8) * (1 - sk * 0.5);
          var si = this.smoke.put(bl.x + Math.cos(sa) * bl.r * 0.12, ss * 0.7 + sk * 38, bl.y + Math.sin(sa) * bl.r * 0.12, sa, ss, ss * 0.85, ss);
          this.smoke.tint(si, smoke, 1 - sk * 0.4);
        }
      }
      var fg = this.glows.put(bl.x, 1.4, bl.y, 0, bl.r, 1, bl.r);
      this.glows.disc(fg, Models.color(bl.c), 0, 1.4, 1, 0.55 * (1 - k));
    }
    var soot = Models.color('#1a120b');
    for (i = 0; i < FX.scorch.length; i++) {
      var sc2 = FX.scorch[i];
      var sd = this.decals.put(sc2.x, 0.45, sc2.y, sc2.a, sc2.r, 1, sc2.r);
      this.decals.disc(sd, soot, 0, 0.9, 1, 0.55 * Math.min(1, sc2.life / 3));
    }
  },

  drawZz: function (ctx, e, s) {
    this.toScreen(e.x, e.y, e.r * 1.6, s);
    if (s.x < -60 || s.x > this.w + 60 || s.y < -60 || s.y > this.h + 60) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f3e4cc';
    ctx.strokeStyle = 'rgba(28,21,15,.7)';
    ctx.lineWidth = 3;
    for (var z = 0; z < 3; z++) {
      var ph = (Game.time * 0.45 + z / 3 + e.phase) % 1;
      ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.85;
      ctx.font = '900 ' + Math.round(13 + ph * 10) + 'px Verdana, sans-serif';
      ctx.strokeText('z', s.x + 12 + ph * 22, s.y - ph * 40);
      ctx.fillText('z', s.x + 12 + ph * 22, s.y - ph * 40);
    }
    ctx.restore();
  },

  drawOverlay: function (ctx) {
    var i, s = this._s || (this._s = {});
    var list = Game.enemies;
    for (i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.zz) { this.drawZz(ctx, e, s); continue; }
      var hb = e.def.decoy && e.owner ? e.owner : e;
      if (!(hb.boss || e.elite || e.def.heavy) || hb.hp >= hb.maxHp || e.dead) continue;
      var top = e.r * (hb.boss ? 2.4 : 1.9) + 6;
      this.toScreen(e.x, e.y, top, s);
      var w = Math.max(24, e.r * 2 * this.ppu);
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(s.x - w / 2, s.y - 4, w, 5);
      ctx.fillStyle = hb.boss ? (hb.bd ? hb.bd.trim : '#f0a24a') : '#e2503a';
      ctx.fillRect(s.x - w / 2, s.y - 4, w * (hb.hp / hb.maxHp), 5);
      if (e.boss && e.state === 'return') {
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#e8d5bd';
        ctx.font = '700 14px Verdana, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('...', s.x, s.y - 10);
        ctx.globalAlpha = 1;
      }
    }
    var p = Game.player;
    if (p && p.alive) {
      this.toScreen(p.x, p.y, p.r * 2.4 + 10, s);
      var pw = 48, hk = U.clamp(p.hp / p.st.maxHp, 0, 1);
      ctx.fillStyle = 'rgba(20,14,9,.8)';
      ctx.fillRect(s.x - pw / 2 - 2, s.y - 2, pw + 4, 9);
      ctx.fillStyle = hk > 0.3 ? '#e85a3c' : (Math.floor(Game.time * 6) % 2 ? '#ff9a7a' : '#e85a3c');
      ctx.fillRect(s.x - pw / 2, s.y, pw * hk, 5);
      ctx.fillStyle = 'rgba(0,0,0,.4)';
      for (var tk = 1; tk < 5; tk++) ctx.fillRect(s.x - pw / 2 + pw * tk / 5, s.y, 1, 5);
    }
    ctx.save();
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.7)';
    var fs = -1;
    for (i = 0; i < FX.texts.length; i++) {
      var t = FX.texts[i];
      this.toScreen(t.x, t.y, 28, s);
      ctx.globalAlpha = U.clamp(t.life / 0.8, 0, 1);
      if (t.s !== fs) { fs = t.s; ctx.font = '900 ' + fs + 'px Verdana, sans-serif'; }
      ctx.strokeText(t.t, s.x, s.y);
      ctx.fillStyle = t.c;
      ctx.fillText(t.t, s.x, s.y);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
};

var Quality = {
  start: function (weak) {
    var s = Save.data, set = s.set;
    if (!set.q) {
      if (set.low && !s.lowAuto) set.q = 'low';
      else if (!set.low && s.lowAuto) set.q = 'high';
      else {
        set.q = 'auto';
        if (set.low) s.qLevel = s.lowRes ? -1 : 0;
      }
    }
    if (set.q === 'auto' && s.qLevel === undefined) s.qLevel = weak ? 0 : 2;
    this.sync();
  },

  level: function () {
    var s = Save.data;
    if (!s || !s.set.q || s.set.q === 'high') return 2;
    if (s.set.q === 'low') return 0;
    return s.qLevel === undefined ? 2 : s.qLevel;
  },

  sync: function () {
    var s = Save.data, l = this.level();
    s.set.low = l <= 0 ? 1 : 0;
    s.lowRes = l < 0 ? 1 : 0;
  },

  shadowSize: function (l) { return l >= 2 ? 2048 : 1024; },
  pixelRatio: function (l, dpr) {
    if (l < 0) return 0.75;
    if (l === 0) return 1;
    return Math.min(dpr || 1, l === 1 ? 1.25 : 1.75);
  },

  apply: function () {
    this.sync();
    View3D.setQuality(this.level());
    Game.resize();
  },

  choose: function (q) {
    var s = Save.data;
    s.set.q = q;
    if (q === 'auto') s.qLevel = View3D.weak ? 0 : 2;
    this.apply();
    Save.flush(true);
  },

  down: function () {
    var s = Save.data, l = this.level();
    if (s.set.q !== 'auto' || l <= -1) return false;
    s.qLevel = l - 1;
    this.apply();
    Save.flush(false);
    return true;
  }
};

View3D.ghostMat = function (hex, alpha) {
  return new THREE.MeshBasicMaterial({
    color: hex, opacity: alpha,
    blending: THREE.CustomBlending,
    blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    depthFunc: THREE.GreaterDepth, depthWrite: false
  });
};

View3D.Batch = function (geo, mat, max, colored, shareWith) {
  this.mesh = new THREE.InstancedMesh(geo, mat, max);
  this.mesh.frustumCulled = false;
  if (shareWith) {
    this.mesh.instanceMatrix = shareWith.mesh.instanceMatrix;
    this.follow = shareWith;
  } else {
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }
  this.m = this.mesh.instanceMatrix.array;
  this.c = null;
  if (colored) {
    var arr = new Float32Array(max * 3);
    arr.fill(1);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(arr, 3);
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.c = arr;
  }
  this.max = max;
  this.n = 0;
  this.base = 0;
  this.fresh = false;
  this.mesh.count = 0;
};

View3D.Batch.prototype = {
  begin: function () { this.n = this.base; },

  put: function (x, y, z, ang, sx, sy, sz) {
    if (this.n >= this.max) return -1;
    var o = this.n * 16, a = this.m;
    var c = Math.cos(ang), s = Math.sin(ang);
    a[o] = c * sx; a[o + 1] = 0; a[o + 2] = s * sx; a[o + 3] = 0;
    a[o + 4] = 0; a[o + 5] = sy; a[o + 6] = 0; a[o + 7] = 0;
    a[o + 8] = -s * sz; a[o + 9] = 0; a[o + 10] = c * sz; a[o + 11] = 0;
    a[o + 12] = x; a[o + 13] = y; a[o + 14] = z; a[o + 15] = 1;
    return this.n++;
  },

  putR: function (x, y, z, ax, ay, az, k) {
    if (this.n >= this.max) return -1;
    var c1 = Math.cos(ax / 2), c2 = Math.cos(ay / 2), c3 = Math.cos(az / 2);
    var s1 = Math.sin(ax / 2), s2 = Math.sin(ay / 2), s3 = Math.sin(az / 2);
    var qx = s1 * c2 * c3 + c1 * s2 * s3, qy = c1 * s2 * c3 - s1 * c2 * s3;
    var qz = c1 * c2 * s3 - s1 * s2 * c3, qw = c1 * c2 * c3 + s1 * s2 * s3;
    var x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
    var xx = qx * x2, xy = qx * y2, xz = qx * z2, yy = qy * y2, yz = qy * z2, zz = qz * z2;
    var wx = qw * x2, wy = qw * y2, wz = qw * z2;
    var o = this.n * 16, a = this.m;
    a[o] = (1 - (yy + zz)) * k; a[o + 1] = (xy + wz) * k; a[o + 2] = (xz - wy) * k; a[o + 3] = 0;
    a[o + 4] = (xy - wz) * k; a[o + 5] = (1 - (xx + zz)) * k; a[o + 6] = (yz + wx) * k; a[o + 7] = 0;
    a[o + 8] = (xz + wy) * k; a[o + 9] = (yz - wx) * k; a[o + 10] = (1 - (xx + yy)) * k; a[o + 11] = 0;
    a[o + 12] = x; a[o + 13] = y; a[o + 14] = z; a[o + 15] = 1;
    return this.n++;
  },

  putM: function (mat) {
    if (this.n >= this.max) return -1;
    mat.toArray(this.m, this.n * 16);
    return this.n++;
  },

  tint: function (i, col, k) {
    if (!this.c || i < 0) return;
    var o = i * 3;
    this.c[o] = col.r * k; this.c[o + 1] = col.g * k; this.c[o + 2] = col.b * k;
  },

  end: function () {
    var n = this.follow ? this.follow.n : this.n, mesh = this.mesh;
    mesh.count = n;
    mesh.visible = n > 0;
    var from = this.fresh ? 0 : this.base;
    this.fresh = false;
    if (n <= from) return;
    if (!this.follow) View3D.upload(mesh.instanceMatrix, from, n);
    if (this.c) View3D.upload(mesh.instanceColor, from, n);
    if (this.extra) for (var i = 0; i < this.extra.length; i++) View3D.upload(this.extra[i], from, n);
  }
};

View3D.upload = function (attr, from, n) {
  attr.clearUpdateRanges();
  attr.addUpdateRange(from * attr.itemSize, (n - from) * attr.itemSize);
  attr.needsUpdate = true;
};

View3D.makeDiscs = function (max, blending, order, tilt) {
  var geo = new THREE.PlaneGeometry(2, 2);
  if (tilt) geo.rotateX(-tilt);
  else geo.rotateX(-Math.PI / 2);
  var disc = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
  var col = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
  disc.setUsage(THREE.DynamicDrawUsage);
  col.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aDisc', disc);
  geo.setAttribute('aColor', col);
  var mat = new THREE.ShaderMaterial({
    vertexShader: [
      'attribute vec4 aDisc;',
      'attribute vec3 aColor;',
      'varying vec4 vDisc;',
      'varying vec3 vColor;',
      'varying vec2 vP;',
      'void main() {',
      '  vDisc = aDisc; vColor = aColor; vP = uv * 2.0 - 1.0;',
      '  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'varying vec4 vDisc;',
      'varying vec3 vColor;',
      'varying vec2 vP;',
      'void main() {',
      '  float d = length(vP);',
      '  if (d > 1.0) discard;',
      '  float aa = fwidth(d) * 1.2 + 0.001;',
      '  float a = 0.0;',
      '  if (vDisc.x > 0.0) {',
      '    float hw = vDisc.x * 0.5;',
      '    a = 1.0 - smoothstep(hw - aa, hw + aa, abs(d - (1.0 - hw - aa)));',
      '  }',
      '  if (vDisc.z > 0.0) {',
      '    float f = vDisc.y > 0.0 ? pow(1.0 - d, vDisc.y) : 1.0 - smoothstep(1.0 - aa * 2.0, 1.0, d);',
      '    a = max(a, f * vDisc.z);',
      '  }',
      '  gl_FragColor = vec4(vColor, a * vDisc.w);',
      '  #include <colorspace_fragment>',
      '}'
    ].join('\n'),
    transparent: true,
    depthWrite: false,
    blending: blending
  });
  var b = new View3D.Batch(geo, mat, max, false);
  b.mesh.renderOrder = order;
  b.d = disc.array;
  b.col = col.array;
  b.extra = [disc, col];
  b.k = 1;
  b.disc = function (i, color, ring, soft, fill, alpha) {
    if (i < 0) return;
    var o = i * 4;
    this.d[o] = ring; this.d[o + 1] = soft; this.d[o + 2] = fill; this.d[o + 3] = alpha * this.k;
    o = i * 3;
    if (color) { this.col[o] = color.r; this.col[o + 1] = color.g; this.col[o + 2] = color.b; }
    else { this.col[o] = 0; this.col[o + 1] = 0; this.col[o + 2] = 0; }
  };
  return b;
};

View3D.makeWalls = function (max) {
  var geo = new THREE.CylinderGeometry(1, 1, 1, 48, 1, true);
  geo.translate(0, 0.5, 0);
  var col = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
  var al = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
  col.setUsage(THREE.DynamicDrawUsage);
  al.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aColor', col);
  geo.setAttribute('aAlpha', al);
  var mat = new THREE.ShaderMaterial({
    vertexShader: [
      'attribute vec3 aColor;',
      'attribute float aAlpha;',
      'varying vec3 vColor;',
      'varying float vA;',
      'varying float vY;',
      'void main() {',
      '  vColor = aColor; vA = aAlpha; vY = uv.y;',
      '  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'varying vec3 vColor;',
      'varying float vA;',
      'varying float vY;',
      'void main() {',
      '  float a = pow(1.0 - vY, 1.7) * vA;',
      '  gl_FragColor = vec4(vColor, a);',
      '  #include <colorspace_fragment>',
      '}'
    ].join('\n'),
    transparent: true, depthWrite: false, side: THREE.DoubleSide
  });
  var b = new View3D.Batch(geo, mat, max, false);
  b.mesh.renderOrder = 6;
  b.col = col.array;
  b.al = al.array;
  b.extra = [col, al];
  b.wall = function (i, color, alpha) {
    if (i < 0) return;
    this.col[i * 3] = color.r; this.col[i * 3 + 1] = color.g; this.col[i * 3 + 2] = color.b;
    this.al[i] = alpha;
  };
  return b;
};

View3D.makeStrips = function (max, blending, order) {
  var geo = new THREE.PlaneGeometry(1, 1);
  geo.rotateX(-Math.PI / 2);
  var st = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
  var col = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
  st.setUsage(THREE.DynamicDrawUsage);
  col.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aStrip', st);
  geo.setAttribute('aColor', col);
  var mat = new THREE.ShaderMaterial({
    vertexShader: [
      'attribute vec4 aStrip;',
      'attribute vec3 aColor;',
      'varying vec4 vS;',
      'varying vec3 vColor;',
      'varying vec2 vUv;',
      'void main() {',
      '  vS = aStrip; vColor = aColor; vUv = uv;',
      '  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'varying vec4 vS;',
      'varying vec3 vColor;',
      'varying vec2 vUv;',
      'void main() {',
      '  float across = abs(vUv.y * 2.0 - 1.0);',
      '  float a = vS.z > 0.5 ? pow(1.0 - across, 1.6) : 1.0 - smoothstep(0.6, 1.0, across);',
      '  if (vS.y > 0.0 && mod(vUv.x * vS.x, vS.y) > vS.y * 0.55) discard;',
      '  if (vS.y < 0.0) a *= smoothstep(0.0, -vS.y, (1.0 - vUv.x) * vS.x);',
      '  gl_FragColor = vec4(vColor, a * vS.w);',
      '  #include <colorspace_fragment>',
      '}'
    ].join('\n'),
    transparent: true,
    depthWrite: false,
    blending: blending
  });
  var b = new View3D.Batch(geo, mat, max, false);
  b.mesh.renderOrder = order;
  b.s = st.array;
  b.col = col.array;
  b.extra = [st, col];
  b.line = function (x0, y0, x1, y1, width, h) {
    var dx = x1 - x0, dy = y1 - y0;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    return this.put((x0 + x1) / 2, h, (y0 + y1) / 2, Math.atan2(dy, dx), len, 1, width);
  };
  b.strip = function (i, color, len, dash, soft, alpha) {
    if (i < 0) return;
    var o = i * 4;
    this.s[o] = len; this.s[o + 1] = dash; this.s[o + 2] = soft; this.s[o + 3] = alpha;
    o = i * 3;
    this.col[o] = color.r; this.col[o + 1] = color.g; this.col[o + 2] = color.b;
  };
  return b;
};
