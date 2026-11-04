// 3D-картинка поверх той же логики. Мир остается плоским (x, y), в сцене это
// (x, 0, y). Игра считает все как раньше, этот модуль раз в кадр смотрит на
// Game.* и переставляет модели. Плоский канвас остается сверху для цифр урона,
// полосок здоровья, миникарты и стика.
var View3D = {
  on: false,
  renderer: null, scene: null, camera: null,
  w: 0, h: 0,
  radius: 700,        // докуда видно землю от центра экрана, нужно спавну
  ppu: 1,             // экранных пикселей на единицу мира у игрока
  off: null,          // смещение камеры от точки, на которую она смотрит
  last: 0,

  // ---------- запуск ----------

  init: function (canvas) {
    if (typeof THREE === 'undefined' || !canvas) return false;
    // ?2d в адресе - старая плоская картинка, удобно сравнивать
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

    // Выжженный полдень: солнце почти белое, небо светлое, от песка теплый
    // отсвет снизу. Песок светлый, поэтому ржавые враги читаются темными
    // силуэтами, а не сливаются с землей.
    var hemi = this.hemi = new THREE.HemisphereLight('#d6e6f5', '#b08458', 1.45);
    s.add(hemi);
    // фара и лампа над машиной: днем выключены, ночью без них ничего не видно.
    // Свет всегда в сцене, меняется только яркость, иначе шейдеры пересобираются.
    this.lamp = new THREE.PointLight('#ffd9a0', 0, 460, 1);
    s.add(this.lamp);
    this.head = new THREE.SpotLight('#fff1d0', 0, 650, 0.42, 0.55, 1);
    s.add(this.head);
    s.add(this.head.target);
    var sun = this.sun = new THREE.DirectionalLight('#fff0d8', 2.5);
    this.sunDir = new THREE.Vector3(-0.6, 1.25, 0.45).normalize();
    s.add(sun);
    s.add(sun.target);
    // Тени от солнца дают объем лучше любых текстур. На слабом режиме их нет,
    // остаются только круглые пятна под ногами.
    this.shadowsOn = !(Save.data && Save.data.set.low);
    if (this.shadowsOn) {
      r.shadowMap.enabled = true;
      r.shadowMap.type = THREE.PCFSoftShadowMap;
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.bias = -0.0006;
      sun.shadow.normalBias = 0.6;
    }

    this.matLit = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    this.matGlow = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.matFlat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.matTint = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, flatShading: true });

    this.buildGround();
    this.buildBatches();
    this.buildAtmos();
    this.walls = [];
    this.bossMeshes = {};
    this.turretPool = [];
    this.pl = null;
    this.decoKey = '';
    this.decoCache = {};

    this._v = new THREE.Vector3();
    this._ndc = new THREE.Vector2();
    this._ray = new THREE.Raycaster();
    this._plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._hit = new THREE.Vector3();
    this._dummy = new THREE.Object3D();
    this._dummy.rotation.order = 'YXZ';

    this.on = true;
    return true;
  },

  // Камеру ставим так, чтобы по земле было видно примерно столько же, сколько
  // в плоской версии: иначе поедет весь баланс спавна.
  resize: function (w, h, dpr) {
    if (!this.on) return;
    this.w = w; this.h = h;
    var low = Save.data && Save.data.set.low;
    this.renderer.setPixelRatio(low ? 1 : Math.min(dpr || 1, 1.75));
    this.renderer.setSize(w, h, false);

    var cfg = CFG.view3d;
    var cam = this.camera;
    cam.aspect = w / Math.max(1, h);
    var groundH = h / Game.scale;
    var pitch = cfg.pitch * Math.PI / 180, half = cfg.fov * Math.PI / 360;
    var dist = groundH * Math.sin(pitch) / (2 * Math.tan(half)) * cfg.zoom;
    this.off = new THREE.Vector3(0, Math.sin(pitch) * dist, Math.cos(pitch) * dist);
    this.ppu = h / (2 * dist * Math.tan(half));
    cam.position.copy(this.off);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    // самая дальняя видимая точка земли - по ней считаем кольцо спавна
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

  // ---------- время суток ----------
  // Сутки идут по кругу за забег: старт ярким полднем (первое впечатление
  // должно быть светлым), потом рыжий закат, ночь с фарами и рассвет.
  // t - доля суток, между точками все плавно смешивается.

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
    var dark = this.dark = U.lerp(a.dark, b.dark, k);
    // ночью свечение складываем, днем на светлом песке сложение не видно
    var glowMode = dark > 0.45 ? THREE.AdditiveBlending : THREE.NormalBlending;
    if (this.glows.mesh.material.blending !== glowMode) this.glows.mesh.material.blending = glowMode;
    this.lamp.intensity = dark * 300;
    this.head.intensity = dark * 1700;
    // днем виньетка теплая и легкая, ночью темная и плотная
    this.vig.k = 0.22 + dark * 0.4;
    this.vig.rgb = dark > 0.5 ? '4,6,16' : '70,40,18';
  },

  // ---------- пол ----------

  buildGround: function () {
    var c = document.createElement('canvas');
    c.width = c.height = 512;
    var g = c.getContext('2d');
    var r = World.rng(11, 7);
    g.fillStyle = CFG.view3d.ground;
    g.fillRect(0, 0, 512, 512);

    // рисуем каждую деталь девять раз со сдвигом, тогда текстура тайлится без швов
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
    // рябь от ветра на песке: волнистые полосы, светлая и темная рядом
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
    // трещины в сухой земле
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
    // камешки и мелкий мусор
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

  // ---------- пачки одинаковых объектов ----------

  buildBatches: function () {
    var self = this;
    this.batches = [];
    var add = function (b) { self.batches.push(b); self.scene.add(b.mesh); return b; };
    var M = Models;

    // Враги: на каждый тип своя пачка, свет отдельно. Рисуются после стен
    // (renderOrder 2), а перед ними (1) - силуэт с обратной проверкой глубины:
    // виден только там, где врага закрыли контейнер или скала.
    this.matGhost = View3D.ghostMat('#e2503a', 0.5);
    this.foes = {};
    for (var k in Enemies.defs) {
      if (k === 'boss') continue;
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
    // мелкие частицы навыков: снег, языки пламени, споры
    this.motes = add(new View3D.Batch(new THREE.BoxGeometry(1, 1, 1), this.matFlat, 500, true));
    // огненные шары взрывов: полупрозрачные, цвет от белого к углю
    this.fireballs = add(new View3D.Batch(new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88, depthWrite: false }), 40, true));
    this.fireballs.mesh.renderOrder = 7;
    this.smoke = add(new View3D.Batch(new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), 90, true));
    this.shockwalls = add(View3D.makeWalls(60));
    this._c = new THREE.Color();
    this.crates.glow = add(new View3D.Batch(crate.glow, this.matGlow, 80, false, this.crates));

    // хлам на полу, цвет каждой штуке свой
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
    this.spears = add(new View3D.Batch(spear.geo, this.matTint, 120, true));
    // обводки снарядов: та же форма наизнанку, чуть крупнее и темная
    var rimAlly = new THREE.MeshBasicMaterial({ color: '#2b1705', side: THREE.BackSide });
    var rimFoe = new THREE.MeshBasicMaterial({ color: '#2a0309', side: THREE.BackSide });
    this.shotRims = add(new View3D.Batch(sphere, rimAlly, 700, false));
    this.eshotRims = add(new View3D.Batch(sphere, rimFoe, 500, false));
    this.spearRims = add(new View3D.Batch(spear.geo, rimFoe, 120, false));
    this.colAlly = M.color('#fff1c2');
    this.colCrit = M.color('#ffffff');
    this.colFoe = M.color('#ff2e4d');

    this.gems = add(new View3D.Batch(new THREE.OctahedronGeometry(1), this.matFlat, 400, true));
    var cross = M.build(function (a) {
      a(M.B(2, 0.6, 0.6), CFG.col.heal);
      a(M.B(0.6, 2, 0.6), CFG.col.heal);
    });
    this.heals = add(new View3D.Batch(cross.geo, this.matGlow, 120, false));
    // у куба нет цвета в вершинах, поэтому материал без них, иначе лут черный
    this.drops = add(new View3D.Batch(new THREE.BoxGeometry(1.2, 1.2, 1.2), this.matFlat, 120, true));
    this.orbs = add(new View3D.Batch(new THREE.OctahedronGeometry(1), this.matFlat, 16, true));
    var mine = M.build(function (a) {
      a(M.C(0.9, 1, 0.45, 8), '#2b2826', 0, 0.22, 0);
      a(M.C(0.35, 0.35, 0.2, 8), '#5d5752', 0, 0.5, 0);
    });
    this.mines = add(new View3D.Batch(mine.geo, this.matLit, 60, false));
    this.mineLights = add(new View3D.Batch(new THREE.SphereGeometry(0.3, 6, 4), this.matFlat, 60, true));
    this.debris = add(new View3D.Batch(new THREE.BoxGeometry(1, 1, 1), this.matFlat, 900, true));

    // плоские круги и полосы считаются в шейдере, текстуры не нужны
    this.decals = add(View3D.makeDiscs(400, THREE.NormalBlending, 1));
    this.shadows = add(View3D.makeDiscs(1600, THREE.NormalBlending, 2));
    // при настоящих тенях пятно под ногами остается только легким затемнением
    this.shadows.k = this.shadowsOn ? 0.55 : 1;
    this.rings = add(View3D.makeDiscs(800, THREE.NormalBlending, 3));
    this.glows = add(View3D.makeDiscs(500, THREE.AdditiveBlending, 4));
    this.strips = add(View3D.makeStrips(160, THREE.AdditiveBlending, 5));
    this.lines = add(View3D.makeStrips(160, THREE.NormalBlending, 5));
  },

  rebuildHalos: function () {
    // ореолы смотрят в камеру; камера никогда не поворачивается, поэтому
    // хватает одного заранее наклоненного квадрата на всех
    if (this.halos) {
      this.scene.remove(this.halos.mesh);
      this.batches.splice(this.batches.indexOf(this.halos), 1);
    }
    this.halos = View3D.makeDiscs(1600, THREE.AdditiveBlending, 6, this.billboardTilt);
    this.batches.push(this.halos);
    this.scene.add(this.halos.mesh);
  },

  // ---------- координаты ----------

  toScreen: function (x, y, h, out) {
    var v = this._v.set(x, h || 0, y).project(this.camera);
    out = out || {};
    out.x = (v.x + 1) / 2 * this.w;
    out.y = (1 - v.y) / 2 * this.h;
    out.z = v.z;
    return out;
  },

  // точка на земле под экранной точкой; local - без учета положения камеры
  toGround: function (sx, sy, local) {
    this._ndc.set(sx / this.w * 2 - 1, -(sy / this.h) * 2 + 1);
    this._ray.setFromCamera(this._ndc, this.camera);
    var hit = this._ray.ray.intersectPlane(this._plane, this._hit);
    if (!hit) return { x: local ? 0 : Game.cam.x, y: local ? 0 : Game.cam.y };
    return { x: hit.x, y: hit.z };
  },

  // ---------- кадр ----------

  render: function () {
    var now = performance.now() / 1000;
    var dt = Math.min(0.05, now - (this.last || now));
    this.last = now;
    var p = Game.player;
    if (!p) return;
    this.idleOn = false;

    var cx = Game.cam.x, cy = Game.cam.y;
    var sh = 0.7;   // в объеме тряска ощущается сильнее, чем на плоском
    this.camera.position.set(cx + this.off.x + FX.shakeX * sh, this.off.y, cy + this.off.z + FX.shakeY * sh);
    this.camera.updateMatrixWorld();

    var t = this.tile;
    this.ground.position.set(Math.round(cx / t) * t, 0, Math.round(cy / t) * t);
    // солнце ездит за камерой, иначе карта теней кончится через пару экранов;
    // шагом в тексель, чтобы края теней не дрожали при движении
    var snap = this.radius * 2.1 / 2048;
    var sx = Math.round(cx / snap) * snap, sy = Math.round(cy / snap) * snap;
    this.sun.target.position.set(sx, 0, sy);
    this.sun.position.set(sx + this.sunDir.x * 1500, this.sunDir.y * 1500, sy + this.sunDir.z * 1500);

    this.syncAtmos();
    for (var i = 0; i < this.batches.length; i++) this.batches[i].begin();

    this.syncDeco(cx, cy);
    this.syncWalls();
    this.syncCrates();
    this.syncEnemies();
    this.syncBosses(dt);
    this.syncPlayer(p, dt);
    this.syncShots();
    this.syncPickups();
    this.syncHazards();
    this.syncFx();

    for (i = 0; i < this.batches.length; i++) this.batches[i].end();
    this.renderer.render(this.scene, this.camera);
  },

  // ---------- витрина: машины и боссы в меню и ангаре ----------
  // Отдельный маленький рендер: модель стоит на круглом пятачке песка, кадр
  // копируется в обычный канвас карточки. Один WebGL на все картинки.

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
    // непобежденный босс - темный силуэт, интрига остается
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

  // ang - поворот модели, чтобы в меню она медленно крутилась
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

  // машина в главном меню медленно поворачивается на своем пятачке
  heroSpin: function () {
    var c = document.getElementById('heroPreview');
    if (!c || !c.offsetParent || !Save.data) return;
    var t = performance.now() / 1000;
    this.thumb(c, 'car', Save.data.char, Save.data.skin, -0.7 + t * 0.5, false, Save.data.gun);
  },

  // В меню за кнопками медленно плывет та же свалка в закатном свете.
  // Пустой фон под меню выглядел бы как заглушка.
  idle: function () {
    var now = performance.now() / 1000;
    if (now - (this.idleLast || 0) < 1 / 31) return;   // меню хватит и 30 кадров
    this.idleLast = now;
    if (!this.idleOn) {
      this.idleOn = true;
      // плоский слой мог остаться с последнего кадра боя: миникарта, цифры
      var ctx = Game.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, Game.canvas.width, Game.canvas.height);
      if (this.pl) this.pl.group.visible = false;
      for (var id in this.bossMeshes) this.bossMeshes[id].group.visible = false;
      for (var i = 0; i < this.turretPool.length; i++) this.turretPool[i].group.visible = false;
    }
    var cx = 900 + now * 16, cy = -300 - now * 6;
    World.refresh(cx, cy, this.radius + 400);
    this.camera.position.set(cx + this.off.x, this.off.y, cy + this.off.z);
    this.camera.updateMatrixWorld();
    var t = this.tile;
    this.ground.position.set(Math.round(cx / t) * t, 0, Math.round(cy / t) * t);
    var snap = this.radius * 2.1 / 2048;
    var sx = Math.round(cx / snap) * snap, sy = Math.round(cy / snap) * snap;
    this.sun.target.position.set(sx, 0, sy);
    this.sun.position.set(sx + this.sunDir.x * 1500, this.sunDir.y * 1500, sy + this.sunDir.z * 1500);
    this.forceT = 0.39;
    this.syncAtmos();
    this.forceT = undefined;
    for (i = 0; i < this.batches.length; i++) this.batches[i].begin();
    this.syncDeco(cx, cy);
    this.syncWalls();
    this.syncCrates();
    for (i = 0; i < this.batches.length; i++) this.batches[i].end();
    this.renderer.render(this.scene, this.camera);
    this.heroSpin();
  },

  // пятна и хлам на полу: зависят только от координат куска мира
  syncDeco: function (cx, cy) {
    var b = World.block;
    var x0 = Math.floor((cx - 1500) / b), x1 = Math.floor((cx + 1500) / b);
    var y0 = Math.floor((cy - 1300) / b), y1 = Math.floor((cy + 1700) / b);
    var key = x0 + ':' + x1 + ':' + y0 + ':' + y1;
    if (key !== this.decoKey) {
      this.decoKey = key;
      var list = [];
      for (var gx = x0; gx <= x1; gx++) for (var gy = y0; gy <= y1; gy++) list.push(this.deco(gx, gy));
      this.decoList = list;
      // старые куски забываем, чтобы кеш не рос бесконечно
      var keys = Object.keys(this.decoCache);
      if (keys.length > 200) this.decoCache = {};
    }
    var i, j, d;
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
      // провода между столбами: два тонких, на высоте изоляторов
      for (j = 0; j < c.wires.length; j++) {
        var wr = c.wires[j], wx = Math.cos(Math.atan2(wr[3] - wr[1], wr[2] - wr[0]) + Math.PI / 2) * 11;
        var wy = Math.sin(Math.atan2(wr[3] - wr[1], wr[2] - wr[0]) + Math.PI / 2) * 11;
        for (var side = -1; side <= 1; side += 2) {
          var wl = this.lines.line(wr[0] + wx * side, wr[1] + wy * side, wr[2] + wx * side, wr[3] + wy * side, 1.2, 104);
          this.lines.strip(wl, this.wireCol, U.dist(wr[0], wr[1], wr[2], wr[3]), 0, 0, 0.8);
        }
      }
    }
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
      // покрышки любят лежать стопкой
      if (k === 'tire' && r() < 0.4) {
        res.props.push({ k: 'tire', x: x + 2, y: y - 1, a: r() * 6.28, s: sizes.tire, c: Models.color('#ffffff'), up: 1 });
      }
    }
    // иногда через кусок тянется старая линия столбов с проводами
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

  // Стены: из каждой генерим свою модель, держим, пока она рядом.
  syncWalls: function () {
    var near = World.near, i;
    var frame = this.frameNo = (this.frameNo || 0) + 1;
    for (i = 0; i < near.length; i++) {
      var w = near[i];
      if (!w.mesh3) {
        w.mesh3 = this.wallMesh(w);
        this.scene.add(w.mesh3);
        this.walls.push(w);
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

  wallMesh: function (w) {
    var M = Models, B = M.B, C = M.C;
    var r = World.rng(Math.floor(w.x), Math.floor(w.y));
    var long = Math.max(w.w, w.h), short = Math.min(w.w, w.h);
    var alongX = w.w >= w.h;
    var style = r();
    var mdl = M.build(function (add) {
      // все строим вдоль X, вертикальную стену потом поворачиваем целиком
      var put = add;
      // контейнер: ребристый ящик с ржавыми потеками
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
        // крышу видно лучше всего, поэтому на ней гофра и ржавые пятна
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
        // контейнеры, иногда второй сверху: вертикаль, которой в игре нет
        var cols = ['#7a3424', '#2f5560', '#6b6a3a', '#8a6a2f', '#4a4f58', '#5a2f3a'];
        var hgt = 46 + r() * 10;
        container(0, 0, long, short, hgt, cols[Math.floor(r() * cols.length)], 0);
        if (r() < 0.5) {
          container((r() - 0.5) * long * 0.12, hgt + 1, long * 0.82, short * 0.95, hgt * 0.95,
            cols[Math.floor(r() * cols.length)], (r() - 0.5) * 0.1);
        } else if (r() < 0.6) {
          put(M.T(9, 3.6, 5, 10), '#1f1c1a', (r() - 0.5) * long * 0.5, hgt + 3.6, 0, Math.PI / 2);
        }
      } else if (style < 0.5) {
        // штабель сплющенных машин, чем выше слой, тем реже
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
        // куча хлама: листы, трубы, бочки вперемешку, иногда торчит мачта
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
          put(C(1.4, 2.2, mh, 6), '#5d5752', mx, mh / 2, 0);
          put(B(26, 2, 2), '#5d5752', mx, mh - 6, 0);
          put(B(12, 8, 0.6), '#a8402c', mx + 8, mh - 14, 0, 0, 0, 0.1);
        }
      } else {
        // столбы песчаника слоями, сужаются кверху, как в каньоне
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
      // ящик с аптечкой: над стопкой парит зеленый крест, видно издалека
      if (c.loot === 'heal') {
        var hy = c.r * 2.7 + 6 + Math.sin(Game.time * 3 + c.x * 0.1) * 2;
        this.heals.put(c.x, hy, c.y, Game.time * 1.5, 5, 5, 5);
        this.halo(c.x, hy, c.y, 24, Models.color(CFG.col.heal), 0.6);
      }
      var s = this.shadows.put(c.x + 4, 0.6, c.y + 4, 0, c.r * 1.6, 1, c.r * 1.6);
      this.shadows.disc(s, null, 0, 1.2, 1, 0.45);
    }
  },

  // ---------- враги ----------

  syncEnemies: function () {
    var list = Game.enemies, t = Game.time, d = this._dummy;
    var white = Models.color('#ffffff'), elite = Models.color('#c48cff'), purple = Models.color('#a24bd6');
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.boss && e.bd) continue;
      var b = this.foes[e.boss ? 'brute' : e.type] || this.foes.grunt;
      var r = e.boss ? e.r * 0.8 : e.r;
      // походка: подпрыгивание и покачивание, у роя - зависание
      var ph = t * (e.def.heavy ? 7 : 11) + e.phase;
      var hover = e.type === 'swarm' ? r * 0.5 + Math.sin(ph * 0.7) * r * 0.15 : 0;
      var hop = e.type === 'nest' ? 0 : Math.abs(Math.sin(ph)) * r * 0.1;
      d.position.set(e.x, hover + hop, e.y);
      d.rotation.set(Math.sin(ph) * 0.07, -e.ang, e.type === 'nest' ? 0 : Math.cos(ph * 2) * 0.03);
      if (e.type === 'nest') d.rotation.y = e.phase;
      d.scale.set(r, r, r);
      d.updateMatrix();
      var k = b.putM(d.matrix);
      if (k < 0) continue;
      if (e.flash > 0) b.tint(k, white, 6);
      else if (e.elite) b.tint(k, elite, 1);
      else b.tint(k, white, 1);

      var s = this.shadows.put(e.x + r * 0.15, 0.6, e.y + r * 0.2, 0, r * 1.25, 1, r * 1.25);
      this.shadows.disc(s, null, 0, 1.1, 1, 0.5);
      if (e.elite) {
        var g = this.glows.put(e.x, 1, e.y, 0, r * 2.2, 1, r * 2.2);
        this.glows.disc(g, purple, 0, 1.6, 1, 0.55);
      }
      if (e.aim > 0) {
        var ln = this.lines.line(e.x, e.y, e.x + Math.cos(e.ang) * 260, e.y + Math.sin(e.ang) * 260, 2, 5);
        this.lines.strip(ln, Models.color(e.def.trim), 260, 0, 0, 0.5);
      }
    }
  },

  // ---------- боссы ----------

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
    // шлейф фантома: несколько полупрозрачных копий
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
      var bd = e.bd, c = this.bossMesh(bd);
      used[bd.id] = true;
      var g = c.group, r = e.r;
      var hover = bd.id === 'phantom' ? r * 0.25 + Math.sin(Game.time * 2) * r * 0.08 : 0;
      var stomp = (bd.id === 'titan' || bd.id === 'crusher') ? Math.abs(Math.sin(Game.time * 4 + e.phase)) * r * 0.04 : 0;
      g.visible = true;
      g.position.set(e.x, hover + stomp, e.y);
      g.rotation.set(0, -e.ang, 0);
      g.scale.set(r, r, r);
      // попадание - короткая вспышка, замах - пульсирует своим цветом
      if (e.flash > 0) c.mat.emissive.setScalar(0.4);
      else if (e.aim > 0 || e.shield > 0) c.mat.emissive.copy(Models.color(bd.trim)).multiplyScalar(0.22 + 0.14 * Math.sin(Game.time * 20));
      else c.mat.emissive.setScalar(0);

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

      var s = this.shadows.put(e.x + r * 0.2, 0.6, e.y + r * 0.25, 0, r * 1.4, 1, r * 1.4);
      this.shadows.disc(s, null, 0, 1.0, 1, 0.55);
      var gl = this.glows.put(e.x, 1, e.y, 0, r * 2.6, 1, r * 2.6);
      this.glows.disc(gl, Models.color(bd.trim), 0, 2.2, 1, 0.35);

      // луч стража
      if (bd.id === 'warden' && e.beamA !== undefined) {
        for (var bi = 0; bi < (e.beams || 1); bi++) {
          var ba = e.beamA + bi * Math.PI;
          var ex = e.x + Math.cos(ba) * e.beamLen, ey = e.y + Math.sin(ba) * e.beamLen;
          var s1 = this.strips.line(e.x, e.y, ex, ey, 40, r * 1.75);
          this.strips.strip(s1, Models.color(bd.trim), e.beamLen, 0, 1, 0.75);
          var s2 = this.strips.line(e.x, e.y, ex, ey, 9, r * 1.75);
          this.strips.strip(s2, Models.color('#ffe0ee'), e.beamLen, 0, 1, 0.9);
          var s3 = this.lines.line(e.x, e.y, ex, ey, 36, 1.5);
          this.lines.strip(s3, Models.color(bd.trim), e.beamLen, 0, 1, 0.35);
        }
      }
      // прицел бурильщика пунктиром по земле
      if (e.aim > 0) {
        var l = this.lines.line(e.x, e.y, e.x + Math.cos(e.chargeAng) * 700, e.y + Math.sin(e.chargeAng) * 700, 8, 2);
        this.lines.strip(l, Models.color(bd.trim), 700, 24, 0, 0.6);
      }
      // щит улья
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
      for (var q = 0; q < bm.ghosts.length; q++) bm.ghosts[q].visible = false;
    }
  },

  // ---------- игрок ----------

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
    // Сама машина рисуется после всех стен (renderOrder 2), а перед ней (1)
    // ее силуэт с обратной проверкой глубины: он виден только там, где машину
    // закрыло что-то из уже нарисованного. Без этого за контейнером себя
    // просто теряешь. Своей геометрии в буфере глубины в этот момент еще нет,
    // поэтому сама на себя машина силуэт не отбрасывает.
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

    // шасси поворачивается туда, куда реально едем, башня - куда стреляем
    var mx = p.x - v.px, my = p.y - v.py;
    v.px = p.x; v.py = p.y;
    if (p.dashT > 0) v.heading = U.turn(v.heading, p.dashAng, 30 * dt);
    else if (mx * mx + my * my > 0.04) v.heading = U.turn(v.heading, Math.atan2(my, mx), 9 * dt);
    if (p.fireCd > v.fire + 0.01) v.recoil = 1;
    v.fire = p.fireCd;
    v.recoil = Math.max(0, v.recoil - dt * 9);

    // ночью фара светит туда, куда смотрит пушка: так видно, по кому бьешь
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
    if (p.st.nova > 0) {
      var nr = (180 + p.st.nova * 70) * p.st.radius;
      var k = U.clamp(1 - p.novaCd / 6, 0, 1);
      var ng = this.glows.put(p.x, 1.2, p.y, 0, nr, 1, nr);
      this.glows.disc(ng, gold, 0, 0.7, 1, 0.06 + k * 0.14);
      var nri = this.rings.put(p.x, 1.7, p.y, 0, nr, 1, nr);
      this.rings.disc(nri, gold, (1 + k * 2) / nr, 0, 0, 0.25 + k * 0.5);
    }

    // спутники
    if (p.st.orbit > 0) {
      var tech = Models.color(CFG.col.tech);
      for (var o = 0; o < p.st.orbit; o++) {
        var a = p.orbA + o / p.st.orbit * Math.PI * 2;
        var ox = p.x + Math.cos(a) * 62, oy = p.y + Math.sin(a) * 62;
        // спутник - вращающаяся пила
        this.blades.put(ox, 14, oy, Game.time * 16 + o, 11, 11, 11);
        this.halo(ox, 14, oy, 20, tech, 0.6);
        var os = this.shadows.put(ox + 4, 0.6, oy + 4, 0, 11, 1, 11);
        this.shadows.disc(os, null, 0, 1, 1, 0.35);
      }
    }

    // мороз: вокруг машины кружат и падают снежинки
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
    // горение: языки пламени поднимаются по кругу ауры
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

    if (p.tetherTarget && !p.tetherTarget.dead) {
      var te = p.tetherTarget;
      var tl = U.dist(p.x, p.y, te.x, te.y);
      var ts = this.strips.line(p.x, p.y, te.x, te.y, 10, 14);
      this.strips.strip(ts, Models.color(CFG.col.tech), tl, 0, 1, 0.9);
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
      var gl = this.glows.put(t.x, 1, t.y, 0, 26, 1, 26);
      this.glows.disc(gl, Models.color(CFG.col.tech), 0, 1.5, 1, 0.35);
    }
  },

  // ---------- снаряды, подбор, ловушки ----------

  halo: function (x, h, y, r, col, a) {
    if (Save.data.set.low) return;
    var k = this.halos.put(x, h, y, 0, r, r, r);
    this.halos.disc(k, col, 0, 1.8, 1, a);
  },

  // Снаряды в 3D читаются хуже, чем на плоском фоне, поэтому дизайн жесткий:
  // все свое - бело-золотые трассеры, все чужое - красные шары. Разных
  // цветов и размеров больше нет. У обоих темная обводка (меш наизнанку чуть
  // крупнее), она держит контраст и на светлом песке, и ночью.
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
      // тень пули на песке: без нее пули теряются на светлой земле
      var bs = this.shadows.put(b.x + 6, 0.7, b.y + 4, 0, r * 1.3, 1, r * 1.3);
      this.shadows.disc(bs, null, 0, 1.2, 1, 0.5);
    }
    list = Game.ebullets;
    var pulse = 1 + Math.sin(Game.time * 14) * 0.08;
    for (i = 0; i < list.length; i++) {
      b = list[i];
      var er = U.clamp(b.r, 6, 9) * pulse;
      if (b.spear) {
        k = this.spears.put(b.x, 14, b.y, b.ang, er, er, er);
        if (k >= 0) this.spears.tint(k, red, 1.6);
        this.spearRims.put(b.x, 14, b.y, b.ang, er * 1.25, er * 1.4, er * 1.4);
      } else {
        k = this.eshots.put(b.x, 12, b.y, 0, er, er, er);
        if (k >= 0) this.eshots.tint(k, red, 1.6);
        this.eshotRims.put(b.x, 12, b.y, 0, er + 2.6, er + 2.6, er + 2.6);
      }
      this.halo(b.x, 12, b.y, er * 2.8, red, 0.8);
      var es = this.shadows.put(b.x + 6, 0.7, b.y + 4, 0, er * 1.2, 1, er * 1.2);
      this.shadows.disc(es, null, 0, 1.2, 1, 0.5);
      // красное кольцо на земле под каждым чужим снарядом: видно, куда летит
      var gk = this.rings.put(b.x, 1.2, b.y, 0, er * 1.9, 1, er * 1.9);
      this.rings.disc(gk, red, 0.22, 1.2, 0.35, 0.75);
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
    for (i = 0; i < Game.heals.length; i++) {
      var h = Game.heals[i];
      if (h.life < 4 && Math.floor(h.life * 6) % 2 === 0) continue;
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
    var orange = Models.color('#ffb35c');
    for (i = 0; i < Game.waves.length; i++) {
      var w = Game.waves[i];
      var k = 1 - w.r / w.max;
      var wr = this.rings.put(w.x, 2, w.y, 0, w.r, 1, w.r);
      this.rings.disc(wr, orange, Math.min(0.5, 14 / w.r), 0, 0, k);
      var wg = this.glows.put(w.x, 2, w.y, 0, w.r + 10, 1, w.r + 10);
      this.glows.disc(wg, orange, Math.min(0.5, 30 / w.r), 0, 0, k * 0.5);
    }
    var green = Models.color(CFG.col.heal);
    for (i = 0; i < Game.clouds.length; i++) {
      var c = Game.clouds[i];
      var a = Math.min(1, c.life / 2);
      var cg = this.glows.put(c.x, 1.5, c.y, Game.time * 0.3, c.r, 1, c.r);
      this.glows.disc(cg, green, 0, 0.5, 1, 0.22 * a);
      var cr = this.rings.put(c.x, 1.8, c.y, 0, c.r * 0.95, 1, c.r * 0.95);
      this.rings.disc(cr, green, 2 / c.r, 0, 0, 0.5 * a);
      // споры медленно поднимаются над облаком
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

  syncFx: function () {
    var i, list = FX.parts;
    for (i = 0; i < list.length; i++) {
      var p = list[i];
      var a = U.clamp(p.life / p.max, 0, 1);
      // осколки летят по дуге: в плоской игре высоты нет, придумываем ее
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
      // крупные кольца (нова, шипы, удары боссов) поднимаются стеной волны
      if (r.r1 >= 60) {
        var wi = this.shockwalls.put(r.x, 0, r.y, 0, rad, Math.min(70, r.r1 * 0.32) * (1 - kk * 0.4), rad);
        this.shockwalls.wall(wi, Models.color(r.c), (1 - kk) * 0.6);
      }
    }
    // разряд: мягкое свечение и белая жила внутри
    for (i = 0; i < FX.bolts.length; i++) {
      var bo = FX.bolts[i];
      var al = bo.life / bo.max, bc = Models.color(bo.c), core = Models.color('#ffffff');
      for (var q = 1; q < bo.pts.length; q++) {
        var p0 = bo.pts[q - 1], p1 = bo.pts[q];
        var len = U.dist(p0.x, p0.y, p1.x, p1.y);
        var sl = this.strips.line(p0.x, p0.y, p1.x, p1.y, 12, 16);
        this.strips.strip(sl, bc, len, 0, 1, al);
        var sc = this.strips.line(p0.x, p0.y, p1.x, p1.y, 2.5, 16);
        this.strips.strip(sc, core, len, 0, 0, al);
      }
    }
    // Взрыв: вспышка быстро раздувается, сжимается и темнеет до углей, над
    // ней поднимаются клубы дыма с нормальным светом, чтобы был объем.
    var c0 = this._c, hot = Models.color('#fff3c8'), ember = Models.color('#3a1607'), smoke = Models.color('#5e5146');
    for (i = 0; i < FX.blasts.length; i++) {
      var bl = FX.blasts[i];
      var k = 1 - bl.life / bl.max;
      var grow = k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75 * 0.85;
      var bs = bl.r * 0.32 * grow;
      if (k < 0.4) c0.copy(hot).lerp(Models.color(bl.c), k / 0.4);
      else c0.copy(Models.color(bl.c)).lerp(ember, (k - 0.4) / 0.6);
      var fb = this.fireballs.put(bl.x, bs * 0.45, bl.y, k * 2, bs, bs * 0.85, bs);
      this.fireballs.tint(fb, c0, 1.3);
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
    // выжженные пятна остаются на песке и тают
    var soot = Models.color('#1a120b');
    for (i = 0; i < FX.scorch.length; i++) {
      var sc2 = FX.scorch[i];
      var sd = this.decals.put(sc2.x, 0.45, sc2.y, sc2.a, sc2.r, 1, sc2.r);
      this.decals.disc(sd, soot, 0, 0.9, 1, 0.55 * Math.min(1, sc2.life / 3));
    }
  },

  // ---------- плоский слой сверху ----------

  drawOverlay: function (ctx) {
    var i, s = this._s || (this._s = {});
    // полоски здоровья у крупных
    var list = Game.enemies;
    for (i = 0; i < list.length; i++) {
      var e = list[i];
      if (!(e.boss || e.elite || e.def.heavy) || e.hp >= e.maxHp || e.dead) continue;
      var top = e.r * (e.boss ? 2.4 : 1.9) + 6;
      this.toScreen(e.x, e.y, top, s);
      var w = Math.max(24, e.r * 2 * this.ppu);
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(s.x - w / 2, s.y - 4, w, 5);
      ctx.fillStyle = e.boss ? (e.bd ? e.bd.trim : '#f0a24a') : '#e2503a';
      ctx.fillRect(s.x - w / 2, s.y - 4, w * (e.hp / e.maxHp), 5);
      if (e.boss && e.state === 'return') {
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#e8d5bd';
        ctx.font = '700 14px Verdana, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('...', s.x, s.y - 10);
        ctx.globalAlpha = 1;
      }
    }
    // Свое здоровье прямо над машиной: не надо уводить глаза в угол экрана.
    // Нижняя полоса остается, это дубль для боя.
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
    // всплывающие цифры
    ctx.save();
    ctx.textAlign = 'center';
    for (i = 0; i < FX.texts.length; i++) {
      var t = FX.texts[i];
      this.toScreen(t.x, t.y, 28, s);
      ctx.globalAlpha = U.clamp(t.life / 0.8, 0, 1);
      ctx.font = '900 ' + t.s + 'px Verdana, sans-serif';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,.7)';
      ctx.strokeText(t.t, s.x, s.y);
      ctx.fillStyle = t.c;
      ctx.fillText(t.t, s.x, s.y);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
};

// Силуэт сквозь препятствия. Материал непрозрачный по флагу, чтобы попасть в
// общий проход до самих машин, но смешивается по альфе через CustomBlending:
// на светлом песке сложение цветов было бы не видно.
View3D.ghostMat = function (hex, alpha) {
  return new THREE.MeshBasicMaterial({
    color: hex, opacity: alpha,
    blending: THREE.CustomBlending,
    blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    depthFunc: THREE.GreaterDepth, depthWrite: false
  });
};

// ---------- пачка одинаковых мешей ----------

View3D.Batch = function (geo, mat, max, colored, shareWith) {
  this.mesh = new THREE.InstancedMesh(geo, mat, max);
  this.mesh.frustumCulled = false;
  if (shareWith) {
    // светящиеся детали стоят ровно там же, где тело: матрицы общие
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
  this.mesh.count = 0;
};

View3D.Batch.prototype = {
  begin: function () { this.n = 0; },

  // поворот только вокруг вертикали: так быстрее, чем через Object3D
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
    var n = this.follow ? this.follow.n : this.n;
    this.mesh.count = n;
    if (!this.follow) this.mesh.instanceMatrix.needsUpdate = true;
    if (this.c) this.mesh.instanceColor.needsUpdate = true;
    if (this.extra) for (var i = 0; i < this.extra.length; i++) this.extra[i].needsUpdate = true;
  }
};

// Круги на земле: кольца, ауры, тени, свечение. Форму рисует шейдер по
// параметрам, поэтому один и тот же квадрат годится и под тень, и под волну.
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
    // x - толщина кольца в долях радиуса, y - мягкость заливки (степень),
    // z - сила заливки, w - общая прозрачность
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
  // col = null значит черный: тени
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

// Стена ударной волны: открытый цилиндр, к верху тает. Из плоского кольца
// нова, шипов и ударов боссов получается объемная волна.
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

// Полосы: лучи, разряды, прицелы. Квадрат вытягивается от точки до точки.
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
    // x - длина в мире, y - шаг пунктира (0 - сплошная), z - мягкие края, w - прозрачность
    fragmentShader: [
      'varying vec4 vS;',
      'varying vec3 vColor;',
      'varying vec2 vUv;',
      'void main() {',
      '  float across = abs(vUv.y * 2.0 - 1.0);',
      '  float a = vS.z > 0.5 ? pow(1.0 - across, 1.6) : 1.0 - smoothstep(0.6, 1.0, across);',
      '  if (vS.y > 0.0 && mod(vUv.x * vS.x, vS.y) > vS.y * 0.55) discard;',
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
