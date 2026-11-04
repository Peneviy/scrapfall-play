var Models = {
  _col: {},

  color: function (hex) {
    var c = this._col[hex];
    if (!c) { c = new THREE.Color(hex); this._col[hex] = c; }
    return c;
  },

  build: function (fn) {
    var body = [], glow = [];
    var m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    var p = new THREE.Vector3(), s = new THREE.Vector3();
    var add = function (geo, hex, x, y, z, rx, ry, rz, sx, sy, sz, lit) {
      var g = geo.index ? geo.toNonIndexed() : geo;
      if (g.attributes.uv) g.deleteAttribute('uv');
      e.set(rx || 0, ry || 0, rz || 0);
      q.setFromEuler(e);
      p.set(x || 0, y || 0, z || 0);
      s.set(sx || 1, sy === undefined ? (sx || 1) : sy, sz === undefined ? (sx || 1) : sz);
      m.compose(p, q, s);
      g.applyMatrix4(m);
      var c = Models.color(hex), n = g.attributes.position.count, arr = new Float32Array(n * 3);
      for (var i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      (lit === 'glow' ? glow : body).push(g);
    };
    fn(add);
    return {
      geo: body.length ? THREE.mergeGeometries(body) : null,
      glow: glow.length ? THREE.mergeGeometries(glow) : null
    };
  },

  shade: function (hex, k) {
    return '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
  },

  B: function (w, h, d) { return new THREE.BoxGeometry(w, h, d); },
  C: function (rt, rb, h, n) { return new THREE.CylinderGeometry(rt, rb, h, n || 8); },
  K: function (r, h, n) { return new THREE.ConeGeometry(r, h, n || 6); },
  S: function (r, w, h) { return new THREE.SphereGeometry(r, w || 7, h || 5); },
  O: function (r) { return new THREE.OctahedronGeometry(r); },
  T: function (r, t, rs, ts) { return new THREE.TorusGeometry(r, t, rs || 4, ts || 10); },

  DARK: '#1f1c1a',
  METAL: '#5d5752',
  STEEL: '#3d3f42',
  RUST: '#8a4a2a',

  enemy: function (type, d) {
    var M = this, B = M.B, C = M.C, K = M.K, S = M.S, O = M.O, T = M.T;
    var body = d.body, trim = d.trim, dark = M.DARK, metal = M.METAL;
    var top = M.shade(body, 1.6);
    var HALF = Math.PI / 2;
    return this.build(function (add) {
      if (type === 'grunt') {
        add(B(1.3, 1.0, 1.4), body, -0.05, 1.0, 0);
        add(B(1.42, 0.16, 1.52), top, -0.05, 1.56, 0);
        add(B(1.0, 0.06, 0.18), trim, -0.1, 1.66, 0);
        add(B(0.5, 0.75, 1.0), metal, -0.78, 1.05, 0);
        add(B(0.34, 0.6, 0.34), dark, 0.05, 0.3, 0.42);
        add(B(0.34, 0.6, 0.34), dark, 0.05, 0.3, -0.42);
        add(B(0.95, 0.22, 0.22), metal, 0.45, 0.95, 0.82);
        add(B(0.95, 0.22, 0.22), metal, 0.45, 0.95, -0.82);
        add(B(0.14, 0.24, 0.7), trim, 0.66, 1.18, 0, 0, 0, 0, 1, 1, 1, 'glow');
      } else if (type === 'runner') {
        add(B(1.4, 0.5, 0.8), body, -0.15, 0.78, 0);
        add(B(1.0, 0.06, 0.5), top, -0.2, 1.05, 0);
        add(K(0.42, 0.95, 4), body, 0.98, 0.78, 0, HALF / 2, 0, -HALF);
        add(K(0.13, 0.55, 4), metal, -0.25, 1.2, 0);
        add(K(0.13, 0.5, 4), metal, -0.65, 1.15, 0);
        for (var i = 0; i < 4; i++) {
          var lx = i < 2 ? 0.4 : -0.6, lz = i % 2 ? 0.38 : -0.38;
          add(B(0.13, 0.75, 0.13), dark, lx, 0.38, lz, lz * 0.6, 0, lx * 0.4);
        }
        add(B(0.1, 0.12, 0.5), trim, 0.82, 0.95, 0, 0, 0, 0, 1, 1, 1, 'glow');
      } else if (type === 'swarm') {
        add(S(0.7, 7, 4), body, 0, 0.8, 0, 0, 0, 0, 1, 0.6, 1);
        add(C(0.78, 0.78, 0.12, 7), dark, 0, 0.78, 0);
        for (var k = 0; k < 4; k++) {
          var a = k * HALF + HALF / 2;
          add(B(0.95, 0.09, 0.09), dark, Math.cos(a) * 0.55, 0.5, -Math.sin(a) * 0.55, 0, a, -0.55);
        }
        add(S(0.2, 5, 4), trim, 0.58, 0.9, 0, 0, 0, 0, 1, 1, 1, 'glow');
      } else if (type === 'spitter') {
        add(C(0.72, 0.82, 1.1, 7), body, 0, 0.95, 0);
        add(C(0.8, 0.8, 0.12, 7), top, 0, 1.54, 0);
        add(C(0.17, 0.24, 0.95, 6), metal, 0.42, 1.7, 0, 0, 0, -1.1);
        for (var j = 0; j < 3; j++) {
          var la = j / 3 * Math.PI * 2;
          add(B(0.2, 0.5, 0.2), dark, Math.cos(la) * 0.55, 0.22, Math.sin(la) * 0.55);
        }
        add(T(0.8, 0.07, 4, 12), trim, 0, 1.12, 0, HALF, 0, 0, 1, 1, 1, 'glow');
        add(S(0.14, 5, 4), trim, 0.85, 2.05, 0, 0, 0, 0, 1, 1, 1, 'glow');
      } else if (type === 'brute') {
        add(B(1.4, 1.2, 1.6), body, -0.1, 1.08, 0);
        add(B(0.8, 0.45, 2.15), top, 0.05, 1.62, 0);
        add(B(0.5, 1.1, 0.5), dark, 0.35, 0.72, 1.05);
        add(B(0.5, 1.1, 0.5), dark, 0.35, 0.72, -1.05);
        add(B(0.62, 0.5, 0.62), metal, 0.45, 0.25, 1.05);
        add(B(0.62, 0.5, 0.62), metal, 0.45, 0.25, -1.05);
        add(B(0.48, 0.5, 0.5), dark, -0.25, 0.25, 0.42);
        add(B(0.48, 0.5, 0.5), dark, -0.25, 0.25, -0.42);
        add(B(0.1, 0.18, 0.9), trim, 0.62, 1.32, 0, 0, 0, 0, 1, 1, 1, 'glow');
      } else if (type === 'charger') {
        add(B(1.35, 0.7, 1.15), body, -0.18, 0.72, 0);
        add(B(0.9, 0.06, 0.8), top, -0.25, 1.1, 0);
        add(B(0.25, 0.95, 1.9), metal, 0.68, 0.58, 0, 0, 0, -0.35);
        add(K(0.14, 0.75, 4), metal, 1.0, 0.95, 0.6, 0, 0, -HALF);
        add(K(0.14, 0.75, 4), metal, 1.0, 0.95, -0.6, 0, 0, -HALF);
        add(B(1.3, 0.42, 0.26), dark, -0.15, 0.26, 0.62);
        add(B(1.3, 0.42, 0.26), dark, -0.15, 0.26, -0.62);
        add(C(0.08, 0.1, 0.7, 5), dark, -0.72, 1.3, 0.35);
        add(B(0.1, 0.12, 0.62), trim, 0.55, 1.08, 0, 0, 0, 0, 1, 1, 1, 'glow');
      } else if (type === 'shellback') {
        add(C(0.95, 1.05, 0.45, 6), body, 0, 0.48, 0);
        add(K(0.98, 0.75, 6), body, 0, 1.08, 0);
        add(B(0.48, 0.38, 0.52), dark, 0.98, 0.45, 0);
        for (var t = 0; t < 4; t++) {
          var ta = t * HALF + HALF / 2;
          add(B(0.32, 0.4, 0.32), dark, Math.cos(ta) * 0.75, 0.2, Math.sin(ta) * 0.75);
        }
        add(T(0.98, 0.06, 4, 6), trim, 0, 0.72, 0, HALF, 0, 0, 1, 1, 1, 'glow');
        add(B(0.08, 0.1, 0.36), trim, 1.22, 0.5, 0, 0, 0, 0, 1, 1, 1, 'glow');
      } else if (type === 'splitter') {
        add(O(0.75), body, 0, 1.05, 0, 0, 0, 0, 1, 1.3, 1);
        for (var sp = 0; sp < 3; sp++) {
          var sa = sp / 3 * Math.PI * 2;
          add(S(0.32, 6, 4), metal, Math.cos(sa) * 0.8, 0.62, Math.sin(sa) * 0.8);
        }
        add(T(0.66, 0.06, 4, 12), trim, 0, 1.05, 0, HALF, 0, 0, 1, 1, 1, 'glow');
        add(S(0.12, 5, 4), trim, 0.58, 1.25, 0, 0, 0, 0, 1, 1, 1, 'glow');
      } else if (type === 'nest') {
        add(K(1.0, 1.15, 7), body, 0, 0.58, 0);
        add(C(1.05, 1.18, 0.25, 7), dark, 0, 0.12, 0);
        add(B(0.55, 0.3, 0.4), metal, 0.45, 0.62, 0.3, 0.3, 0.5, 0.2);
        add(B(0.4, 0.25, 0.6), M.RUST, -0.4, 0.5, -0.35, -0.2, 0.9, 0.1);
        add(C(0.12, 0.12, 0.7, 5), dark, -0.2, 0.9, 0.45, 0.5, 0, 0.3);
        for (var h = 0; h < 4; h++) {
          var ha = h / 4 * Math.PI * 2 + 0.4;
          add(S(0.17, 5, 4), trim, Math.cos(ha) * 0.6, 0.42, Math.sin(ha) * 0.6, 0, 0, 0, 1, 1, 1, 'glow');
        }
        add(S(0.24, 6, 4), trim, 0, 1.18, 0, 0, 0, 0, 1, 1, 1, 'glow');
      } else {
        add(B(1.4, 1.2, 1.4), body, 0, 0.9, 0);
        add(B(0.12, 0.2, 0.7), trim, 0.72, 1.1, 0, 0, 0, 0, 1, 1, 1, 'glow');
      }
    });
  },

  player: function (charId, sk, gunId) {
    var M = this, B = M.B, C = M.C, K = M.K, S = M.S, T = M.T;
    var body = sk.body, trim = sk.trim, dark = M.DARK, metal = M.METAL, steel = M.STEEL;
    var HALF = Math.PI / 2;
    var chassis = this.build(function (add) {
      if (charId === 'brute') {
        add(B(2.1, 0.6, 0.6), dark, 0, 0.32, 0.85);
        add(B(2.1, 0.6, 0.6), dark, 0, 0.32, -0.85);
        add(B(2.15, 0.12, 0.62), steel, 0, 0.66, 0.85);
        add(B(2.15, 0.12, 0.62), steel, 0, 0.66, -0.85);
        add(B(1.8, 0.7, 1.3), body, -0.05, 0.85, 0);
        add(B(0.3, 0.9, 2.3), metal, 1.15, 0.5, 0, 0, 0, -0.45);
        add(B(0.7, 0.3, 1.0), steel, -0.7, 1.3, 0);
        add(B(0.1, 0.14, 0.24), trim, 1.0, 1.0, 0.45, 0, 0, 0, 1, 1, 1, 'glow');
        add(B(0.1, 0.14, 0.24), trim, 1.0, 1.0, -0.45, 0, 0, 0, 1, 1, 1, 'glow');
      } else if (charId === 'ranger') {
        add(B(2.0, 0.45, 0.42), dark, 0, 0.26, 0.62);
        add(B(2.0, 0.45, 0.42), dark, 0, 0.26, -0.62);
        add(B(1.9, 0.45, 0.85), body, 0, 0.62, 0);
        add(K(0.42, 0.7, 4), body, 1.2, 0.6, 0, HALF / 2, 0, -HALF, 1, 1, 0.8);
        add(B(0.06, 1.3, 0.06), steel, -0.75, 1.4, 0.3);
        add(B(0.7, 0.08, 1.4), metal, -0.85, 0.95, 0);
        add(B(0.1, 0.12, 0.3), trim, 1.0, 0.75, 0, 0, 0, 0, 1, 1, 1, 'glow');
        add(B(0.12, 0.12, 0.12), trim, -0.75, 2.08, 0.3, 0, 0, 0, 1, 1, 1, 'glow');
      } else if (charId === 'rigger') {
        add(B(1.8, 0.5, 0.48), dark, 0, 0.28, 0.75);
        add(B(1.8, 0.5, 0.48), dark, 0, 0.28, -0.75);
        add(C(0.95, 1.0, 0.6, 6), body, 0, 0.78, 0);
        add(B(0.5, 0.45, 0.6), metal, -0.75, 1.15, 0.45);
        add(B(0.08, 0.95, 0.08), steel, -0.5, 1.5, -0.55, 0, 0, 0.4);
        add(K(0.32, 0.22, 7), steel, -0.75, 1.95, -0.55, Math.PI);
        add(B(0.1, 0.12, 0.26), trim, 0.88, 0.95, 0.3, 0, 0, 0, 1, 1, 1, 'glow');
        add(B(0.1, 0.12, 0.26), trim, 0.88, 0.95, -0.3, 0, 0, 0, 1, 1, 1, 'glow');
      } else {
        add(B(1.9, 0.55, 0.5), dark, 0, 0.3, 0.75);
        add(B(1.9, 0.55, 0.5), dark, 0, 0.3, -0.75);
        add(B(1.95, 0.12, 0.52), steel, 0, 0.6, 0.75);
        add(B(1.95, 0.12, 0.52), steel, 0, 0.6, -0.75);
        add(B(1.6, 0.6, 1.1), body, 0, 0.78, 0);
        add(B(0.3, 0.55, 1.1), body, 0.88, 0.66, 0, 0, 0, -0.5);
        add(C(0.08, 0.1, 0.8, 6), dark, -0.75, 1.3, 0.42);
        add(B(0.06, 0.6, 0.06), metal, -0.55, 1.35, -0.45);
        add(B(0.06, 0.06, 0.9), metal, -0.55, 1.62, 0);
        add(B(0.1, 0.14, 0.2), trim, 0.98, 0.86, 0.35, 0, 0, 0, 1, 1, 1, 'glow');
        add(B(0.1, 0.14, 0.2), trim, 0.98, 0.86, -0.35, 0, 0, 0, 1, 1, 1, 'glow');
      }
    });

    var turret = this.build(function (add) {
      if (charId === 'brute') {
        add(C(0.55, 0.62, 0.4, 8), body, 0, 1.38, 0);
        add(B(0.7, 0.32, 0.8), dark, -0.05, 1.68, 0);
      } else if (charId === 'ranger') {
        add(C(0.38, 0.45, 0.3, 8), body, 0, 1.0, 0);
        add(B(0.65, 0.25, 0.45), dark, -0.05, 1.22, 0);
      } else if (charId === 'rigger') {
        add(C(0.42, 0.48, 0.32, 6), body, 0, 1.25, 0);
        add(B(0.5, 0.28, 0.5), dark, -0.05, 1.48, 0);
      } else {
        add(C(0.45, 0.5, 0.35, 8), body, 0, 1.22, 0);
        add(B(0.52, 0.3, 0.56), dark, -0.05, 1.48, 0);
      }
      add(B(0.1, 0.12, 0.36), trim, 0.24, charId === 'ranger' ? 1.24 : 1.5, 0, 0, 0, 0, 1, 1, 1, 'glow');
    });

    var my = { brute: 1.62, ranger: 1.2, rigger: 1.42 }[charId] || 1.38;
    var barrel = this.build(function (add) {
      var gun = '#2a3236', g = 'glow';
      if (gunId === 'smg') {
        add(C(0.06, 0.07, 1.15, 6), gun, 0.72, my, 0.1, 0, 0, -HALF);
        add(C(0.06, 0.07, 1.15, 6), gun, 0.72, my, -0.1, 0, 0, -HALF);
        add(C(0.2, 0.2, 0.16, 10), '#5d5752', 0.35, my - 0.05, 0.3, HALF);
        add(B(0.14, 0.12, 0.34), steel, 1.3, my, 0);
      } else if (gunId === 'scatter') {
        add(B(0.7, 0.26, 0.62), '#3a3330', 0.55, my, 0);
        for (var i = -2; i <= 2; i++) {
          add(C(0.06, 0.08, 0.55, 6), gun, 1.05, my, i * 0.12, 0, i * 0.18, -HALF);
        }
        add(B(0.1, 0.3, 0.68), metal, 0.22, my, 0);
      } else if (gunId === 'rail') {
        add(C(0.05, 0.07, 2.3, 6), gun, 1.3, my, 0, 0, 0, -HALF);
        for (var r = 0; r < 4; r++) add(T(0.11, 0.035, 4, 10), metal, 0.55 + r * 0.32, my, 0, 0, HALF, 0);
        add(B(0.5, 0.2, 0.26), steel, 0.32, my, 0);
        add(S(0.08, 5, 4), '#9fe8ff', 2.48, my, 0, 0, 0, 0, 1, 1, 1, g);
      } else if (gunId === 'flak') {
        add(C(0.18, 0.22, 0.9, 9), gun, 0.62, my + 0.12, 0, 0, 0, -HALF + 0.35);
        add(T(0.21, 0.05, 4, 10), metal, 1.0, my + 0.28, 0, 0, HALF, 0.35);
        add(B(0.36, 0.28, 0.3), '#5a4a2c', 0.1, my - 0.02, 0.32);
        add(C(0.06, 0.06, 0.22, 6), '#c9a24a', 0.1, my + 0.18, 0.32);
      } else {
        add(C(0.09, 0.11, 1.35, 8), gun, 0.78, my, 0, 0, 0, -HALF);
        add(B(0.22, 0.17, 0.22), steel, 1.48, my, 0);
        add(B(0.4, 0.2, 0.24), '#3a3330', 0.3, my, 0);
      }
    });
    return { chassis: chassis, turret: turret, barrel: barrel };
  },

  boss: function (bd) {
    var M = this, B = M.B, C = M.C, K = M.K, S = M.S, O = M.O, T = M.T;
    var body = bd.body, trim = bd.trim, dark = M.DARK, metal = M.METAL, steel = M.STEEL;
    var HALF = Math.PI / 2;
    var spin = null;
    var main = this.build(function (add) {
      var g = 'glow';
      if (bd.id === 'crusher') {
        add(B(1.6, 0.9, 1.6), body, 0, 1.0, 0);
        add(B(1.7, 0.18, 1.7), dark, 0, 1.52, 0);
        add(C(0.5, 0.6, 0.4, 8), metal, -0.2, 1.8, 0);
        for (var i = 0; i < 4; i++) {
          var la = i * HALF + HALF / 2;
          add(B(0.35, 0.8, 0.35), dark, Math.cos(la) * 0.85, 0.4, Math.sin(la) * 0.85);
        }
        add(B(0.9, 0.35, 0.35), metal, 0.55, 1.05, 1.0);
        add(B(0.5, 0.55, 0.55), steel, 1.05, 1.05, 1.0);
        add(B(0.9, 0.35, 0.35), metal, 0.55, 1.05, -1.0);
        add(B(0.5, 0.55, 0.55), steel, 1.05, 1.05, -1.0);
        for (var p = 0; p < 8; p++) {
          var pa = p / 8 * Math.PI * 2;
          add(B(0.14, 0.14, 0.14), trim, Math.cos(pa) * 0.82, 1.3, Math.sin(pa) * 0.82, 0, -pa, 0, 1, 1, 1, g);
        }
        add(B(0.1, 0.2, 0.8), trim, 0.82, 1.15, 0, 0, 0, 0, 1, 1, 1, g);
      } else if (bd.id === 'driller') {
        add(B(1.6, 0.8, 1.3), body, -0.3, 0.8, 0);
        add(B(1.8, 0.45, 0.35), dark, -0.3, 0.3, 0.7);
        add(B(1.8, 0.45, 0.35), dark, -0.3, 0.3, -0.7);
        add(C(0.5, 0.55, 0.35, 8), metal, 0.55, 0.85, 0, 0, 0, -HALF);
        add(C(0.12, 0.14, 0.9, 6), dark, -0.9, 1.5, 0.35);
        add(C(0.12, 0.14, 0.9, 6), dark, -0.9, 1.5, -0.35);
        add(B(0.1, 0.15, 0.7), trim, 0.5, 1.25, 0, 0, 0, 0, 1, 1, 1, g);
      } else if (bd.id === 'weaver') {
        add(S(0.8, 8, 6), body, 0, 1.6, 0, 0, 0, 0, 1.1, 0.75, 1.1);
        for (var w = 0; w < 6; w++) {
          var wa = w / 6 * Math.PI * 2;
          add(B(1.3, 0.1, 0.1), dark, Math.cos(wa) * 0.75, 1.0, -Math.sin(wa) * 0.75, 0, wa, -0.9);
        }
        add(B(0.06, 1.0, 0.06), steel, -0.2, 2.4, 0.3, 0.3, 0, 0.2);
        add(B(0.06, 1.0, 0.06), steel, -0.2, 2.4, -0.3, -0.3, 0, 0.2);
        add(S(0.28, 6, 4), trim, -0.55, 1.3, 0, 0, 0, 0, 1, 1, 1, g);
        add(S(0.16, 5, 4), trim, 0.75, 1.65, 0.2, 0, 0, 0, 1, 1, 1, g);
        add(S(0.16, 5, 4), trim, 0.75, 1.65, -0.2, 0, 0, 0, 1, 1, 1, g);
      } else if (bd.id === 'frostmaw') {
        add(B(1.5, 1.0, 1.4), body, -0.15, 1.1, 0, 0, 0, 0.15);
        add(B(0.8, 0.45, 1.2), dark, 0.75, 0.55, 0);
        add(B(0.8, 0.25, 1.1), metal, 0.8, 0.95, 0, 0, 0, 0.25);
        for (var f = 0; f < 5; f++) {
          add(K(0.16, 0.8, 4), '#cfefff', -0.6 + f * 0.25, 1.85, (f % 2 ? 0.3 : -0.3), (f % 2 ? 0.3 : -0.3), 0, 0.2);
        }
        add(B(0.4, 0.7, 0.4), dark, -0.3, 0.35, 0.55);
        add(B(0.4, 0.7, 0.4), dark, -0.3, 0.35, -0.55);
        add(B(0.08, 0.12, 1.0), trim, 1.16, 0.75, 0, 0, 0, 0, 1, 1, 1, g);
        add(B(0.1, 0.15, 0.5), trim, 0.62, 1.4, 0, 0, 0, 0, 1, 1, 1, g);
      } else if (bd.id === 'hive') {
        add(S(1.0, 10, 6), body, 0, 0.55, 0, 0, 0, 0, 1, 0.9, 1);
        add(C(1.05, 1.15, 0.3, 10), dark, 0, 0.15, 0);
        for (var hv = 0; hv < 7; hv++) {
          var ha = hv / 7 * Math.PI * 2;
          add(S(0.16, 5, 4), trim, Math.cos(ha) * 0.75, 0.85, Math.sin(ha) * 0.75, 0, 0, 0, 1, 1, 1, g);
        }
        add(S(0.24, 6, 4), trim, 0, 1.45, 0, 0, 0, 0, 1, 1, 1, g);
        add(B(0.35, 0.25, 0.25), metal, 0.6, 1.2, 0.4, 0.3, 0.4, 0);
      } else if (bd.id === 'warden') {
        add(C(0.75, 0.95, 1.4, 8), body, 0, 0.75, 0);
        add(C(0.98, 1.0, 0.18, 8), dark, 0, 0.12, 0);
        add(T(0.78, 0.06, 4, 16), trim, 0, 1.0, 0, HALF, 0, 0, 1, 1, 1, g);
      } else if (bd.id === 'sapper') {
        add(B(1.5, 0.55, 1.2), body, 0, 0.55, 0);
        add(B(1.55, 0.3, 0.3), dark, 0, 0.22, 0.62);
        add(B(1.55, 0.3, 0.3), dark, 0, 0.22, -0.62);
        for (var mn = 0; mn < 6; mn++) {
          add(C(0.18, 0.18, 0.12, 8), '#c9a24a', -0.45 + (mn % 3) * 0.35, 0.95 + Math.floor(mn / 3) * 0.14, (mn % 2 ? 0.25 : -0.25));
        }
        add(B(0.05, 1.2, 0.05), steel, -0.6, 1.4, 0.4);
        add(S(0.12, 5, 4), trim, -0.6, 2.05, 0.4, 0, 0, 0, 1, 1, 1, g);
        add(B(0.1, 0.12, 0.6), trim, 0.76, 0.7, 0, 0, 0, 0, 1, 1, 1, g);
      } else if (bd.id === 'lancer') {
        add(K(0.55, 2.2, 6), body, 1.1, 0.9, 0, 0, 0, -HALF);
        add(B(1.6, 0.6, 0.9), body, -0.6, 0.9, 0);
        add(B(1.0, 0.1, 1.9), dark, -0.7, 1.0, 0);
        add(B(0.7, 0.45, 0.5), metal, -1.2, 1.25, 0);
        add(B(2.4, 0.12, 0.12), trim, 0.2, 1.25, 0, 0, 0, 0, 1, 1, 1, g);
        add(B(0.12, 0.12, 0.7), trim, -1.55, 1.0, 0, 0, 0, 0, 1, 1, 1, g);
      } else if (bd.id === 'titan') {
        add(B(1.5, 1.3, 1.7), body, -0.1, 1.45, 0);
        add(B(0.7, 0.5, 2.3), metal, 0.1, 2.05, 0);
        add(B(0.7, 1.0, 0.6), dark, 0, 0.5, 0.6);
        add(B(0.7, 1.0, 0.6), dark, 0, 0.5, -0.6);
        add(B(0.95, 0.25, 0.75), steel, 0.12, 0.12, 0.6);
        add(B(0.95, 0.25, 0.75), steel, 0.12, 0.12, -0.6);
        add(C(0.16, 0.2, 0.9, 6), dark, -0.65, 2.4, 0.4);
        add(C(0.16, 0.2, 0.9, 6), dark, -0.65, 2.4, -0.4);
        add(B(0.1, 0.2, 1.0), trim, 0.66, 1.7, 0, 0, 0, 0, 1, 1, 1, g);
        add(B(0.3, 0.1, 0.3), trim, -0.65, 2.88, 0.4, 0, 0, 0, 1, 1, 1, g);
        add(B(0.3, 0.1, 0.3), trim, -0.65, 2.88, -0.4, 0, 0, 0, 1, 1, 1, g);
      } else if (bd.id === 'phantom') {
        add(O(0.8), body, 0, 1.3, 0, 0, 0, 0, 1.5, 0.6, 0.9);
        add(B(1.1, 0.08, 1.6), dark, -0.5, 1.3, 0, 0, 0, 0.1);
        add(K(0.3, 0.9, 4), body, -1.1, 1.3, 0, 0, 0, HALF);
        add(B(0.1, 0.14, 0.8), trim, 0.95, 1.35, 0, 0, 0, 0, 1, 1, 1, g);
        add(T(0.6, 0.05, 4, 12), trim, -0.2, 1.3, 0, HALF, 0, 0, 1, 1, 1, g);
      } else {
        add(B(1.6, 1.2, 1.6), body, 0, 1.0, 0);
        add(B(0.1, 0.2, 0.8), trim, 0.82, 1.2, 0, 0, 0, 0, 1, 1, 1, g);
      }
    });

    var back = { crusher: 1.62, driller: 1.22, weaver: 1.95, frostmaw: 1.62, hive: 1.4, warden: 1.5,
      sapper: 1.1, lancer: 1.3, titan: 2.3, phantom: 1.62 }[bd.id] || 1.6;
    var menace = this.build(function (add) {
      for (var i = 0; i < 5; i++) {
        var x = -0.95 + i * 0.32;
        var h = 0.3 + (2 - Math.abs(i - 2)) * 0.12;
        add(K(0.09, h, 4), '#2a2420', x, back + h / 2 - 0.05, 0, 0, 0, 0.35);
      }
      add(S(0.09, 5, 4), '#ff3b2e', 0.78, back - 0.28, 0.24, 0, 0, 0, 1, 1, 1, 'glow');
      add(S(0.09, 5, 4), '#ff3b2e', 0.78, back - 0.28, -0.24, 0, 0, 0, 1, 1, 1, 'glow');
    });
    if (bd.id !== 'phantom' && bd.id !== 'hive') {
      main = { geo: THREE.mergeGeometries([main.geo, menace.geo]), glow: main.glow ? THREE.mergeGeometries([main.glow, menace.glow]) : menace.glow };
    }

    if (bd.id === 'driller') {
      spin = this.build(function (add) {
        add(K(0.45, 1.2, 6), steel, 0, 0, 0, 0, 0, -HALF);
        add(T(0.36, 0.05, 3, 6), metal, -0.2, 0, 0, 0, HALF, 0);
        add(T(0.22, 0.05, 3, 6), metal, 0.15, 0, 0, 0, HALF, 0);
      });
      spin.at = [1.3, 0.85, 0];
      spin.axis = 'x';
    } else if (bd.id === 'warden') {
      spin = this.build(function (add) {
        add(S(0.55, 8, 6), metal, 0, 0, 0);
        add(C(0.16, 0.22, 0.9, 8), dark, 0.55, 0, 0, 0, 0, -HALF);
        add(S(0.16, 6, 4), trim, 1.02, 0, 0, 0, 0, 0, 1, 1, 1, 'glow');
      });
      spin.at = [0, 1.75, 0];
      spin.axis = 'beam';
    } else if (bd.id === 'hive' || bd.id === 'crusher') {
      spin = this.build(function (add) {
        add(T(1.15, 0.05, 3, 18), trim, 0, 0, 0, HALF, 0, 0, 1, 1, 1, 'glow');
      });
      spin.at = [0, 0.4, 0];
      spin.axis = 'y';
    }
    return { main: main, spin: spin };
  },

  crate: function () {
    var B = this.B;
    var box = function (add, y, s, ry, col) {
      add(B(2 * s, 1.7 * s, 2 * s), col, 0, y + 0.85 * s, 0, 0, ry);
      for (var i = -1; i <= 1; i += 2) {
        add(B(0.1 * s, 1.72 * s, 2.04 * s), '#4a3220', Math.cos(ry) * i * 0.5 * s, y + 0.85 * s, -Math.sin(ry) * i * 0.5 * s, 0, ry);
      }
      add(B(2.08 * s, 0.2 * s, 2.08 * s), '#c9a24a', 0, y + 0.45 * s, 0, 0, ry);
      add(B(2.08 * s, 0.2 * s, 2.08 * s), '#c9a24a', 0, y + 1.3 * s, 0, 0, ry);
    };
    return this.build(function (add) {
      box(add, 0, 1, 0, '#6b4a2a');
      box(add, 1.7, 0.85, 0.35, '#7a5530');
      add(B(0.9, 0.7, 0.7), '#5d5752', 0.1, 3.5, 0.1, 0, 0.9);
      add(B(0.5, 0.06, 0.5), '#ffd27d', 0.1, 3.86, 0.1, 0, 0.9, 0, 1, 1, 1, 'glow');
    });
  },

  turret: function () {
    var B = this.B, C = this.C, M = this;
    var base = this.build(function (add) {
      for (var i = 0; i < 3; i++) {
        var a = i / 3 * Math.PI * 2;
        add(B(0.9, 0.1, 0.1), M.DARK, Math.cos(a) * 0.4, 0.35, -Math.sin(a) * 0.4, 0, a, -0.7);
      }
      add(C(0.3, 0.35, 0.3, 6), '#2a2140', 0, 0.75, 0);
    });
    var head = this.build(function (add) {
      add(B(0.7, 0.4, 0.55), '#3a2f58', 0, 0, 0);
      add(C(0.07, 0.09, 0.8, 6), '#1a1426', 0.6, 0.02, 0, 0, 0, -Math.PI / 2);
      add(B(0.08, 0.1, 0.4), CFG.col.tech, 0.36, 0.12, 0, 0, 0, 0, 1, 1, 1, 'glow');
    });
    return { base: base, head: head };
  },

  blade: function () {
    var M = this, C = M.C, B = M.B;
    return this.build(function (add) {
      add(C(1, 1, 0.12, 16), '#8f8a84', 0, 0, 0);
      add(C(0.3, 0.3, 0.22, 8), '#3d3f42', 0, 0, 0);
      for (var i = 0; i < 10; i++) {
        var a = i / 10 * Math.PI * 2;
        add(B(0.38, 0.1, 0.22), '#c4beb4', Math.cos(a) * 1.05, 0, -Math.sin(a) * 1.05, 0, a + 0.5, 0);
      }
      add(M.T(0.82, 0.05, 3, 20), CFG.col.tech, 0, 0.08, 0, Math.PI / 2, 0, 0, 1, 1, 1, 'glow');
    });
  },

  xbarrel: function () {
    var C = this.C;
    return this.build(function (add) {
      add(C(0.55, 0.55, 1.5, 10), '#b3301c', 0, 0.75, 0);
      add(C(0.58, 0.58, 0.14, 10), '#2a1d16', 0, 0.42, 0);
      add(C(0.58, 0.58, 0.14, 10), '#2a1d16', 0, 1.12, 0);
      add(C(0.565, 0.565, 0.24, 10), '#e8ab2f', 0, 0.78, 0);
      add(C(0.45, 0.45, 0.04, 10), '#7a2014', 0, 1.51, 0);
      add(C(0.09, 0.09, 0.12, 6), '#ffb347', 0.25, 1.57, 0, 0, 0, 0, 1, 1, 1, 'glow');
    });
  },

  prop: function (kind) {
    var M = this, B = M.B, C = M.C, T = M.T;
    return this.build(function (add) {
      if (kind === 'tire') {
        add(T(0.75, 0.32, 5, 10), '#211e1c', 0, 0.3, 0, Math.PI / 2);
      } else if (kind === 'barrel') {
        add(C(0.55, 0.55, 1.5, 9), '#ffffff', 0, 0.75, 0);
        add(C(0.58, 0.58, 0.1, 9), '#3a3632', 0, 0.45, 0);
        add(C(0.58, 0.58, 0.1, 9), '#3a3632', 0, 1.1, 0);
      } else if (kind === 'barrelDown') {
        add(C(0.55, 0.55, 1.5, 9), '#ffffff', 0, 0.55, 0, Math.PI / 2, 0, 0);
        add(C(0.58, 0.58, 0.1, 9), '#3a3632', 0, 0.55, 0.4, Math.PI / 2, 0, 0);
      } else if (kind === 'plate') {
        add(B(2.2, 0.12, 1.4), '#ffffff', 0, 0.06, 0);
        add(B(0.5, 0.14, 0.4), '#5d3a22', 0.5, 0.1, 0.3);
      } else if (kind === 'pipe') {
        add(C(0.22, 0.22, 3.0, 7), '#ffffff', 0, 0.22, 0, 0, 0, Math.PI / 2);
        add(C(0.28, 0.28, 0.2, 7), '#3a3632', 1.4, 0.22, 0, 0, 0, Math.PI / 2);
      } else if (kind === 'rock') {
        add(new THREE.DodecahedronGeometry(0.8), '#ffffff', 0, 0.3, 0, 0.3, 0.5, 0.2, 1.2, 0.6, 1);
      } else if (kind === 'bush') {
        var bush = ['#7f8a48', '#99904f', '#6c7a3e', '#a39a5c'];
        for (var b = 0; b < 6; b++) {
          var ba = b / 6 * Math.PI * 2;
          add(new THREE.IcosahedronGeometry(0.45 + (b % 3) * 0.1), bush[b % 4],
            Math.cos(ba) * 0.45, 0.35 + (b % 2) * 0.2, Math.sin(ba) * 0.45, b, b * 2, 0);
        }
        add(new THREE.IcosahedronGeometry(0.5), bush[1], 0, 0.7, 0);
      } else if (kind === 'grass') {
        for (var gq = 0; gq < 7; gq++) {
          var ga = gq / 7 * Math.PI * 2;
          add(M.K(0.08, 1.0 + (gq % 3) * 0.3, 3), gq % 2 ? '#c2a65e' : '#a8964e',
            Math.cos(ga) * 0.2, 0.5, Math.sin(ga) * 0.2, Math.sin(ga) * 0.4, 0, Math.cos(ga) * 0.4);
        }
      } else if (kind === 'yucca') {
        add(C(0.16, 0.24, 2.2, 6), '#7a5f44', 0, 1.1, 0, 0, 0, 0.08);
        add(C(0.1, 0.14, 1.0, 5), '#7a5f44', 0.35, 2.0, 0, 0, 0, -0.7);
        var crowns = [[0.1, 2.3, 0], [0.75, 2.45, 0]];
        for (var c = 0; c < crowns.length; c++) {
          for (var s = 0; s < 9; s++) {
            var sa = s / 9 * Math.PI * 2;
            add(M.K(0.07, 0.75, 3), s % 2 ? '#6f7f3e' : '#87924c', crowns[c][0] + Math.cos(sa) * 0.15, crowns[c][1] + 0.2,
              Math.sin(sa) * 0.15, Math.sin(sa) * 0.9, 0, -Math.cos(sa) * 0.9);
          }
        }
      } else if (kind === 'deadtree') {
        add(C(0.14, 0.26, 2.6, 6), '#8a7764', 0, 1.3, 0, 0, 0, 0.05);
        var br = [[0.4, 2.0, 0.6, 0.9], [-0.3, 2.3, -0.5, -0.8], [0.1, 2.6, 0.4, 0.3], [-0.2, 1.5, 0.3, -1.1]];
        for (var t = 0; t < br.length; t++) {
          add(C(0.05, 0.09, 1.1, 5), '#8a7764', br[t][0], br[t][1], br[t][2] * 0.5, br[t][2], 0, br[t][3]);
        }
      } else if (kind === 'pole') {
        add(C(0.18, 0.24, 10, 6), '#6e5a44', 0, 5, 0);
        add(B(2.4, 0.22, 0.22), '#6e5a44', 0, 9.2, 0);
        add(B(1.6, 0.18, 0.18), '#6e5a44', 0, 8.4, 0, 0, 0, 0.12);
        add(C(0.1, 0.1, 0.35, 5), '#d8d0c0', -1.0, 9.5, 0);
        add(C(0.1, 0.1, 0.35, 5), '#d8d0c0', 1.0, 9.5, 0);
      } else if (kind === 'sign') {
        add(B(0.14, 3.2, 0.14), '#5d5752', -0.7, 1.6, 0);
        add(B(0.14, 3.2, 0.14), '#5d5752', 0.7, 1.6, 0);
        add(B(2.0, 1.1, 0.08), '#b8452e', 0, 2.8, 0, 0, 0, 0.06);
        add(B(1.6, 0.18, 0.1), '#e8d8b8', 0, 2.85, 0, 0, 0, 0.06);
      }
    });
  }
};
