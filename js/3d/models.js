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

  fast: function (fn) {
    var M = this, acc = this._accs || (this._accs = [this._acc(), this._acc()]);
    acc[0].len = acc[1].len = 0;
    var m = new THREE.Matrix4(), nm = new THREE.Matrix3(), q = new THREE.Quaternion(), e = new THREE.Euler();
    var p = new THREE.Vector3(), s = new THREE.Vector3();
    var unit = this._unitBox || (this._unitBox = this.tpl('box', function () { return new THREE.BoxGeometry(2, 2, 2); }));
    var boxP = this._boxP || (this._boxP = new Float32Array(unit.p.length));
    var add = function (geo, hex, x, y, z, rx, ry, rz, sx, sy, sz, lit) {
      var src = geo, tmp = null;
      if (geo.isBufferGeometry) {
        tmp = geo.index ? geo.toNonIndexed() : geo;
        src = { p: tmp.attributes.position.array, n: tmp.attributes.normal.array };
      } else if (!geo.p) {
        var hw = geo.w / 2, hh = geo.h / 2, hd = geo.d / 2, up = unit.p;
        for (var j = 0; j < up.length; j += 3) {
          boxP[j] = up[j] * hw; boxP[j + 1] = up[j + 1] * hh; boxP[j + 2] = up[j + 2] * hd;
        }
        src = { p: boxP, n: unit.n };
      }
      e.set(rx || 0, ry || 0, rz || 0);
      q.setFromEuler(e);
      p.set(x || 0, y || 0, z || 0);
      s.set(sx || 1, sy === undefined ? (sx || 1) : sy, sz === undefined ? (sx || 1) : sz);
      m.compose(p, q, s);
      nm.getNormalMatrix(m);
      M._emit(acc[lit === 'glow' ? 1 : 0], src.p, src.n, m.elements, nm.elements, M.color(hex));
      if (tmp) { tmp.dispose(); if (tmp !== geo) geo.dispose(); }
    };
    fn(add);
    return { geo: this._geo(acc[0]), glow: this._geo(acc[1]) };
  },

  fastBox: function (w, h, d) { return { w: w, h: h, d: d }; },

  _tpl: {},
  tpl: function (key, make) {
    var t = this._tpl[key];
    if (!t) {
      var g = make(), ni = g.index ? g.toNonIndexed() : g;
      t = this._tpl[key] = { p: ni.attributes.position.array, n: ni.attributes.normal.array };
      g.dispose();
    }
    return t;
  },

  _acc: function () { return { p: new Float32Array(1 << 15), n: new Float32Array(1 << 15), c: new Float32Array(1 << 15), len: 0 }; },

  _emit: function (a, sp, sn, e, E, c) {
    var need = a.len + sp.length;
    if (need > a.p.length) {
      var size = a.p.length * 2;
      while (size < need) size *= 2;
      ['p', 'n', 'c'].forEach(function (k) { var b = new Float32Array(size); b.set(a[k]); a[k] = b; });
    }
    var P = a.p, N = a.n, C = a.c, o = a.len;
    for (var k = 0; k < sp.length; k += 3, o += 3) {
      var x = sp[k], y = sp[k + 1], z = sp[k + 2];
      var w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);
      P[o] = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
      P[o + 1] = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
      P[o + 2] = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
      x = sn[k]; y = sn[k + 1]; z = sn[k + 2];
      var nx = E[0] * x + E[3] * y + E[6] * z, ny = E[1] * x + E[4] * y + E[7] * z, nz = E[2] * x + E[5] * y + E[8] * z;
      var inv = 1 / (Math.sqrt(nx * nx + ny * ny + nz * nz) || 1);
      N[o] = nx * inv; N[o + 1] = ny * inv; N[o + 2] = nz * inv;
      C[o] = c.r; C[o + 1] = c.g; C[o + 2] = c.b;
    }
    a.len = o;
  },

  _geo: function (a) {
    if (!a.len) return null;
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(a.p.slice(0, a.len), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(a.n.slice(0, a.len), 3));
    g.setAttribute('color', new THREE.BufferAttribute(a.c.slice(0, a.len), 3));
    return g;
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

  enemy: function (type, d, hull) {
    var M = this, B = M.B, C = M.C, K = M.K, S = M.S, O = M.O, T = M.T;
    var body = d.body, trim = d.trim, dark = M.DARK, metal = M.METAL;
    var top = M.shade(body, 1.6);
    var HALF = Math.PI / 2;
    var boat = hull === 'boat';
    var afloat = { grunt: 1, runner: 1, brute: 1, charger: 1, hooker: 1, spitter: 1, shellback: 1, splitter: 1, medic: 1, muter: 1 };
    var ks = boat && afloat[type] ? 0.8 : 1;
    return this.build(function (raw) {
      var add = ks === 1 ? raw : function (g, c, x, y, z, rx, ry, rz, sx, sy, sz, lit) {
        sx = sx || 1;
        raw(g, c, (x || 0) * ks, (y || 0) * ks + 0.08, (z || 0) * ks, rx, ry, rz,
          sx * ks, (sy === undefined ? sx : sy) * ks, (sz === undefined ? sx : sz) * ks, lit);
      };
      var leg = boat ? function () {} : add;
      var iron = M.shade(body, 0.5), rim = '#26221f', gun = '#d6c39a', foam = '#8fd0d8';
      var boatH = function (len, hw, x, bow) {
        if (!boat) return;
        var R = hw / 0.866, bz = bow / (1.5 * R), x1 = x + len / 2, x0 = x - len / 2;
        raw(B(len, 0.4, hw * 2 + 0.14), gun, x, 0.2, 0);
        raw(C(R * 1.08, R * 1.08, 0.4, 3), gun, x1 + bow * 1.08 / 3, 0.2, 0, 0, HALF, 0, 1, 1, bz);
        raw(B(len - 0.04, 0.1, hw * 2 - 0.1), iron, x, 0.4, 0);
        raw(C(R * 0.9, R * 0.9, 0.1, 3), iron, x1 - 0.04 + bow * 0.9 / 3, 0.4, 0, 0, HALF, 0, 1, 1, bz);
        raw(B(0.24, 0.36, 0.4), metal, x0 - 0.1, 0.34, 0);
        var wl = 0.8, wr = hw * 0.72 / 0.866;
        raw(C(wr, wr, 0.02, 3), foam, x0 - 0.16 - wl * 2 / 3, 0.02, 0, 0, HALF, 0, 1, 1, wl / (1.5 * wr));
      };
      var boatR = function (r) {
        if (!boat) return;
        raw(C(r, r * 0.92, 0.36, 10), iron, 0, 0.18, 0);
        raw(T(r, 0.15, 5, 12), gun, 0, 0.3, 0, HALF);
        raw(T(r * 0.62, 0.05, 4, 10), rim, 0, 0.37, 0, HALF);
      };
      if (type === 'grunt') {
        add(B(1.3, 1.0, 1.4), body, -0.05, 1.0, 0);
        add(B(1.42, 0.16, 1.52), top, -0.05, 1.56, 0);
        add(B(1.0, 0.06, 0.18), trim, -0.1, 1.66, 0);
        add(B(0.5, 0.75, 1.0), metal, -0.78, 1.05, 0);
        leg(B(0.34, 0.6, 0.34), dark, 0.05, 0.3, 0.42);
        leg(B(0.34, 0.6, 0.34), dark, 0.05, 0.3, -0.42);
        boatH(1.7, 0.8, -0.2, 0.75);
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
          leg(B(0.13, 0.75, 0.13), dark, lx, 0.38, lz, lz * 0.6, 0, lx * 0.4);
        }
        boatH(1.6, 0.46, -0.25, 1.0);
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
          leg(B(0.2, 0.5, 0.2), dark, Math.cos(la) * 0.55, 0.22, Math.sin(la) * 0.55);
        }
        boatR(0.98);
        add(T(0.8, 0.07, 4, 12), trim, 0, 1.12, 0, HALF, 0, 0, 1, 1, 1, 'glow');
        add(S(0.14, 5, 4), trim, 0.85, 2.05, 0, 0, 0, 0, 1, 1, 1, 'glow');
      } else if (type === 'brute') {
        add(B(1.4, 1.2, 1.6), body, -0.1, 1.08, 0);
        add(B(0.8, 0.45, 2.15), top, 0.05, 1.62, 0);
        leg(B(0.5, 1.1, 0.5), dark, 0.35, 0.72, 1.05);
        leg(B(0.5, 1.1, 0.5), dark, 0.35, 0.72, -1.05);
        leg(B(0.62, 0.5, 0.62), metal, 0.45, 0.25, 1.05);
        leg(B(0.62, 0.5, 0.62), metal, 0.45, 0.25, -1.05);
        leg(B(0.48, 0.5, 0.5), dark, -0.25, 0.25, 0.42);
        leg(B(0.48, 0.5, 0.5), dark, -0.25, 0.25, -0.42);
        boatH(1.9, 1.12, -0.15, 0.85);
        add(B(0.1, 0.18, 0.9), trim, 0.62, 1.32, 0, 0, 0, 0, 1, 1, 1, 'glow');
      } else if (type === 'charger') {
        add(B(1.35, 0.7, 1.15), body, -0.18, 0.72, 0);
        add(B(0.9, 0.06, 0.8), top, -0.25, 1.1, 0);
        add(B(0.25, 0.95, 1.9), metal, 0.68, 0.58, 0, 0, 0, -0.35);
        add(K(0.14, 0.75, 4), metal, 1.0, 0.95, 0.6, 0, 0, -HALF);
        add(K(0.14, 0.75, 4), metal, 1.0, 0.95, -0.6, 0, 0, -HALF);
        leg(B(1.3, 0.42, 0.26), dark, -0.15, 0.26, 0.62);
        leg(B(1.3, 0.42, 0.26), dark, -0.15, 0.26, -0.62);
        boatH(1.5, 0.7, -0.3, 1.1);
        add(C(0.08, 0.1, 0.7, 5), dark, -0.72, 1.3, 0.35);
        add(B(0.1, 0.12, 0.62), trim, 0.55, 1.08, 0, 0, 0, 0, 1, 1, 1, 'glow');
      } else if (type === 'shellback') {
        add(C(0.95, 1.05, 0.45, 6), body, 0, 0.48, 0);
        add(K(0.98, 0.75, 6), body, 0, 1.08, 0);
        add(B(0.48, 0.38, 0.52), dark, 0.98, 0.45, 0);
        for (var t = 0; t < 4; t++) {
          var ta = t * HALF + HALF / 2;
          leg(B(0.32, 0.4, 0.32), dark, Math.cos(ta) * 0.75, 0.2, Math.sin(ta) * 0.75);
        }
        boatR(1.14);
        add(T(0.98, 0.06, 4, 6), trim, 0, 0.72, 0, HALF, 0, 0, 1, 1, 1, 'glow');
        add(B(0.08, 0.1, 0.36), trim, 1.22, 0.5, 0, 0, 0, 0, 1, 1, 1, 'glow');
      } else if (type === 'splitter') {
        add(O(0.75), body, 0, 1.05, 0, 0, 0, 0, 1, 1.3, 1);
        for (var sp = 0; sp < 3; sp++) {
          var sa = sp / 3 * Math.PI * 2;
          add(S(0.32, 6, 4), metal, Math.cos(sa) * 0.8, 0.62, Math.sin(sa) * 0.8);
        }
        boatR(0.92);
        add(T(0.66, 0.06, 4, 12), trim, 0, 1.05, 0, HALF, 0, 0, 1, 1, 1, 'glow');
        add(S(0.12, 5, 4), trim, 0.58, 1.25, 0, 0, 0, 0, 1, 1, 1, 'glow');
      } else if (type === 'nest') {
        add(K(1.0, 1.15, 7), body, 0, 0.58, 0);
        add(C(1.05, 1.18, 0.25, 7), dark, 0, 0.12, 0);
        if (boat) add(T(1.16, 0.15, 5, 12), rim, 0, 0.2, 0, HALF);
        add(B(0.55, 0.3, 0.4), metal, 0.45, 0.62, 0.3, 0.3, 0.5, 0.2);
        add(B(0.4, 0.25, 0.6), M.RUST, -0.4, 0.5, -0.35, -0.2, 0.9, 0.1);
        add(C(0.12, 0.12, 0.7, 5), dark, -0.2, 0.9, 0.45, 0.5, 0, 0.3);
        for (var h = 0; h < 4; h++) {
          var ha = h / 4 * Math.PI * 2 + 0.4;
          add(S(0.17, 5, 4), trim, Math.cos(ha) * 0.6, 0.42, Math.sin(ha) * 0.6, 0, 0, 0, 1, 1, 1, 'glow');
        }
        add(S(0.24, 6, 4), trim, 0, 1.18, 0, 0, 0, 0, 1, 1, 1, 'glow');
      } else if (type === 'pylon') {
        add(C(0.9, 1.05, 0.3, 6), dark, 0, 0.15, 0);
        if (boat) add(T(1.02, 0.14, 5, 12), rim, 0, 0.2, 0, HALF);
        for (var pl = 0; pl < 3; pl++) {
          var pa = pl / 3 * Math.PI * 2;
          add(B(0.22, 1.3, 0.22), metal, Math.cos(pa) * 0.45, 0.8, Math.sin(pa) * 0.45, Math.sin(pa) * 0.35, 0, -Math.cos(pa) * 0.35);
        }
        add(C(0.2, 0.26, 2.6, 6), body, 0, 1.6, 0);
        add(T(0.42, 0.07, 4, 10), trim, 0, 2.2, 0, HALF, 0, 0, 1, 1, 1, 'glow');
        add(O(0.42), trim, 0, 3.05, 0, 0, 0, 0, 1, 1.4, 1, 'glow');
      } else if (type === 'comb') {
        add(C(0.95, 1.05, 1.1, 6), body, 0, 0.55, 0);
        if (boat) add(T(1.08, 0.14, 5, 12), rim, 0, 0.2, 0, HALF);
        add(C(1.0, 1.0, 0.12, 6), dark, 0, 1.12, 0);
        for (var cb = 0; cb < 6; cb++) {
          var cba = cb / 6 * Math.PI * 2;
          add(C(0.2, 0.2, 0.14, 6), trim, Math.cos(cba) * 0.55, 1.2, Math.sin(cba) * 0.55, 0, 0, 0, 1, 1, 1, 'glow');
        }
        add(C(0.24, 0.24, 0.16, 6), trim, 0, 1.22, 0, 0, 0, 0, 1, 1, 1, 'glow');
      } else if (type === 'larva') {
        add(S(0.55, 6, 4), body, 0.5, 0.5, 0, 0, 0, 0, 1, 0.8, 0.9);
        add(S(0.6, 6, 4), body, -0.1, 0.55, 0, 0, 0, 0, 1, 0.85, 1);
        add(S(0.62, 6, 4), trim, -0.75, 0.62, 0, 0, 0, 0, 1, 0.9, 1, 'glow');
        add(B(0.1, 0.12, 0.5), dark, 0.95, 0.55, 0);
      } else if (type === 'beetle') {
        add(S(0.85, 8, 5), body, -0.1, 0.5, 0, 0, 0, 0, 1.1, 0.6, 0.9);
        add(B(1.6, 0.05, 0.06), dark, -0.15, 1.0, 0);
        add(S(0.36, 6, 4), dark, 0.78, 0.42, 0);
        add(B(0.4, 0.08, 0.08), dark, 1.1, 0.35, 0.16, 0, 0.5, 0);
        add(B(0.4, 0.08, 0.08), dark, 1.1, 0.35, -0.16, 0, -0.5, 0);
        for (var bl = 0; bl < 6; bl++) {
          var bx = (bl % 3 - 1) * 0.45, bz = bl < 3 ? 0.7 : -0.7;
          leg(B(0.09, 0.09, 0.6), dark, bx, 0.2, bz, bz * 0.5, 0, 0);
        }
        if (boat) {
          add(T(0.82, 0.11, 5, 12), rim, -0.1, 0.22, 0, HALF);
          for (var hn = 0; hn < 5; hn++) {
            var hna = hn / 5 * Math.PI * 2;
            add(C(0.05, 0.07, 0.3, 5), metal, -0.1 + Math.cos(hna) * 0.62, 0.78, Math.sin(hna) * 0.5, Math.sin(hna) * 0.7, 0, -Math.cos(hna) * 0.7);
          }
        }
        add(S(0.3, 6, 4), trim, -0.3, 1.0, 0, 0, 0, 0, 1, 0.7, 1, 'glow');
      } else if (type === 'link') {
        add(C(0.5, 0.62, 0.22, 7), dark, 0, 0.11, 0);
        add(T(0.62, 0.2, 6, 12), body, 0, 0.98, 0, 0, HALF, 0);
        add(B(0.3, 0.3, 0.3), metal, 0, 1.66, 0);
        add(O(0.34), trim, 0, 0.98, 0, 0, 0, 0, 1, 1.3, 1, 'glow');
      } else if (type === 'roller') {
        add(C(0.75, 0.75, 1.6, 10), body, 0, 0, 0, HALF, 0, 0);
        for (var rs = 0; rs < 8; rs++) {
          var ra = rs / 8 * Math.PI * 2;
          add(B(0.2, 0.2, 1.5), metal, Math.cos(ra) * 0.76, Math.sin(ra) * 0.76, 0, 0, 0, ra);
        }
        add(C(0.88, 0.88, 0.1, 8), dark, 0, 0, 0.84, HALF, 0, 0);
        add(C(0.88, 0.88, 0.1, 8), dark, 0, 0, -0.84, HALF, 0, 0);
        add(C(0.26, 0.26, 0.1, 6), trim, 0, 0, 0.9, HALF, 0, 0, 1, 1, 1, 'glow');
        add(C(0.26, 0.26, 0.1, 6), trim, 0, 0, -0.9, HALF, 0, 0, 1, 1, 1, 'glow');
        add(T(0.8, 0.05, 4, 14), trim, 0, 0, 0, 0, 0, 0, 1, 1, 1, 'glow');
      } else if (type === 'medic') {
        add(C(0.55, 0.65, 1.1, 7), body, -0.1, 0.85, 0);
        add(C(0.6, 0.6, 0.1, 7), top, -0.1, 1.42, 0);
        add(B(0.9, 0.12, 0.26), trim, -0.15, 1.52, 0, 0, 0, 0, 1, 1, 1, 'glow');
        add(B(0.26, 0.12, 0.9), trim, -0.15, 1.52, 0, 0, 0, 0, 1, 1, 1, 'glow');
        add(C(0.08, 0.1, 0.7, 5), metal, 0.45, 1.25, 0, 0, 0, -1.0);
        add(S(0.16, 5, 4), trim, 0.8, 1.48, 0, 0, 0, 0, 1, 1, 1, 'glow');
        leg(B(0.16, 0.55, 0.16), dark, 0.1, 0.27, 0.32);
        leg(B(0.16, 0.55, 0.16), dark, 0.1, 0.27, -0.32);
        leg(B(0.16, 0.55, 0.16), dark, -0.35, 0.27, 0);
        boatR(0.8);
      } else if (type === 'hooker') {
        add(B(1.2, 0.9, 1.1), body, -0.15, 0.85, 0, 0, 0, 0.15);
        add(C(0.42, 0.42, 0.9, 8), dark, -0.55, 1.45, 0, HALF, 0, 0);
        add(C(0.46, 0.46, 0.12, 8), trim, -0.55, 1.45, 0.48, HALF, 0, 0, 1, 1, 1, 'glow');
        add(B(1.1, 0.18, 0.18), metal, 0.6, 1.2, 0.45, 0, 0, 0.2);
        add(T(0.26, 0.07, 4, 8), trim, 1.18, 1.0, 0.45, 0, 0, 0, 1, 1, 1, 'glow');
        leg(B(0.3, 0.7, 0.3), dark, 0.1, 0.32, 0.38);
        leg(B(0.3, 0.7, 0.3), dark, 0.1, 0.32, -0.38);
        boatH(1.5, 0.68, -0.25, 0.8);
        add(B(0.1, 0.12, 0.5), trim, 0.48, 1.12, -0.1, 0, 0, 0, 1, 1, 1, 'glow');
      } else if (type === 'muter') {
        add(B(1.3, 0.8, 1.3), body, 0, 0.6, 0);
        add(B(1.4, 0.1, 1.4), top, 0, 1.03, 0);
        add(C(0.75, 0.32, 0.8, 8), metal, 0, 1.5, 0);
        add(T(0.7, 0.07, 4, 12), trim, 0, 1.9, 0, HALF, 0, 0, 1, 1, 1, 'glow');
        add(S(0.2, 5, 4), trim, 0, 1.55, 0, 0, 0, 0, 1, 1, 1, 'glow');
        for (var mu = 0; mu < 4; mu++) {
          var mua = mu * HALF + HALF / 2;
          leg(B(0.3, 0.4, 0.3), dark, Math.cos(mua) * 0.6, 0.2, Math.sin(mua) * 0.6);
        }
        boatR(1.05);
        add(B(0.1, 0.12, 0.55), trim, 0.68, 0.7, 0, 0, 0, 0, 1, 1, 1, 'glow');
      } else {
        add(B(1.4, 1.2, 1.4), body, 0, 0.9, 0);
        add(B(0.12, 0.2, 0.7), trim, 0.72, 1.1, 0, 0, 0, 0, 1, 1, 1, 'glow');
      }
    });
  },

  boatDims: {
    scav: { hw: 1.1, x0: -1.4, x1: 1.0, bow: 1.2 },
    brute: { hw: 1.28, x0: -1.5, x1: 1.15, bow: 1.3 },
    ranger: { hw: 0.95, x0: -1.4, x1: 1.1, bow: 1.25 },
    rigger: { hw: 1.2, x0: -1.4, x1: 0.95, bow: 1.2 }
  },

  player: function (charId, sk, gunId, hull) {
    var M = this, B = M.B, C = M.C, K = M.K, S = M.S, T = M.T;
    var body = sk.body, trim = sk.trim, dark = M.DARK, metal = M.METAL, steel = M.STEEL;
    var HALF = Math.PI / 2;
    var boat = hull === 'boat';
    var chassis = this.build(function (add) {
      var trk = boat ? function () {} : add;
      if (boat) {
        var bd = M.boatDims[charId] || M.boatDims.scav;
        var hw = bd.hw, bx0 = bd.x0, bx1 = bd.x1, bow = bd.bow, bl = bx1 - bx0, bc = (bx0 + bx1) / 2;
        var wood = '#3a2c26', deck = '#8a6a45', seam = '#6b4f33';
        var R = hw / 0.866, bz = bow / (1.5 * R);
        var tri = function (k, h, col, y) {
          add(C(R * k, R * k, h, 3), col, bx1 + bow * k / 3, y, 0, 0, HALF, 0, 1, 1, bz);
        };
        add(B(bl, 0.55, hw * 2), wood, bc, 0.28, 0);
        tri(1, 0.55, wood, 0.28);
        add(B(bl + 0.02, 0.12, hw * 2 + 0.04), '#7a2f24', bc, 0.09, 0);
        tri(1.02, 0.12, '#7a2f24', 0.09);
        add(B(bl + 0.04, 0.14, hw * 2 + 0.08), body, bc, 0.5, 0);
        tri(1.04, 0.14, body, 0.5);
        add(B(bl - 0.12, 0.06, hw * 2 - 0.22), deck, bc, 0.6, 0);
        tri(0.86, 0.06, deck, 0.6);
        for (var sx = bx0 + 0.35; sx < bx1 - 0.1; sx += 0.45) add(B(0.03, 0.065, hw * 2 - 0.26), seam, sx, 0.6, 0);
        for (var sd = -1; sd <= 1; sd += 2) {
          add(B(bl, 0.07, 0.07), steel, bc, 0.67, sd * (hw - 0.04));
          add(T(0.17, 0.07, 4, 8), dark, bx0 + 0.5, 0.3, sd * (hw + 0.07));
          add(T(0.17, 0.07, 4, 8), dark, bx1 - 0.3, 0.3, sd * (hw + 0.07));
        }
        add(C(0.06, 0.06, 0.18, 5), steel, bx1 + bow * 0.55, 0.72, 0);
        add(T(0.19, 0.07, 4, 10), '#e8672e', bx0 + 0.3, 0.68, -(hw - 0.42), HALF);
        add(B(0.3, 0.55, 0.55), metal, bx0 - 0.12, 0.5, 0);
        add(B(0.16, 0.16, 0.34), dark, bx0 - 0.3, 0.16, 0);
      }
      if (charId === 'brute') {
        trk(B(2.1, 0.6, 0.6), dark, 0, 0.32, 0.85);
        trk(B(2.1, 0.6, 0.6), dark, 0, 0.32, -0.85);
        trk(B(2.15, 0.12, 0.62), steel, 0, 0.66, 0.85);
        trk(B(2.15, 0.12, 0.62), steel, 0, 0.66, -0.85);
        add(B(1.8, 0.7, 1.3), body, -0.05, 0.85, 0);
        add(B(0.3, 0.9, 2.3), metal, 1.15, 0.5, 0, 0, 0, -0.45);
        add(B(0.7, 0.3, 1.0), steel, -0.7, 1.3, 0);
        add(B(0.1, 0.14, 0.24), trim, 1.0, 1.0, 0.45, 0, 0, 0, 1, 1, 1, 'glow');
        add(B(0.1, 0.14, 0.24), trim, 1.0, 1.0, -0.45, 0, 0, 0, 1, 1, 1, 'glow');
      } else if (charId === 'ranger') {
        trk(B(2.0, 0.45, 0.42), dark, 0, 0.26, 0.62);
        trk(B(2.0, 0.45, 0.42), dark, 0, 0.26, -0.62);
        add(B(1.9, 0.45, 0.85), body, 0, 0.62, 0);
        add(K(0.42, 0.7, 4), body, 1.2, 0.6, 0, HALF / 2, 0, -HALF, 1, 1, 0.8);
        add(B(0.06, 1.3, 0.06), steel, -0.75, 1.4, 0.3);
        add(B(0.7, 0.08, 1.4), metal, -0.85, 0.95, 0);
        add(B(0.1, 0.12, 0.3), trim, 1.0, 0.75, 0, 0, 0, 0, 1, 1, 1, 'glow');
        add(B(0.12, 0.12, 0.12), trim, -0.75, 2.08, 0.3, 0, 0, 0, 1, 1, 1, 'glow');
      } else if (charId === 'rigger') {
        trk(B(1.8, 0.5, 0.48), dark, 0, 0.28, 0.75);
        trk(B(1.8, 0.5, 0.48), dark, 0, 0.28, -0.75);
        add(C(0.95, 1.0, 0.6, 6), body, 0, 0.78, 0);
        add(B(0.5, 0.45, 0.6), metal, -0.75, 1.15, 0.45);
        add(B(0.08, 0.95, 0.08), steel, -0.5, 1.5, -0.55, 0, 0, 0.4);
        add(K(0.32, 0.22, 7), steel, -0.75, 1.95, -0.55, Math.PI);
        add(B(0.1, 0.12, 0.26), trim, 0.88, 0.95, 0.3, 0, 0, 0, 1, 1, 1, 'glow');
        add(B(0.1, 0.12, 0.26), trim, 0.88, 0.95, -0.3, 0, 0, 0, 1, 1, 1, 'glow');
      } else {
        trk(B(1.9, 0.55, 0.5), dark, 0, 0.3, 0.75);
        trk(B(1.9, 0.55, 0.5), dark, 0, 0.3, -0.75);
        trk(B(1.95, 0.12, 0.52), steel, 0, 0.6, 0.75);
        trk(B(1.95, 0.12, 0.52), steel, 0, 0.6, -0.75);
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

  kitDims: {
    scav: { side: 1.0, fy: 0.66, fz: 0.8, hl: 0.95, deck: 1.08, bw: 0.55, tt: 1.63, tr: 0.5, my: 1.38, front: 1.05, x0: -0.55, x1: 0.74 },
    brute: { side: 1.15, fy: 0.72, fz: 0.9, hl: 1.05, deck: 1.2, bw: 0.65, tt: 1.84, tr: 0.62, my: 1.62, front: 1.33, x0: -0.6, x1: 0.75 },
    ranger: { side: 0.83, fy: 0.49, fz: 0.64, hl: 1.0, deck: 0.85, bw: 0.43, tt: 1.35, tr: 0.45, my: 1.2, front: 1.25, x0: -0.3, x1: 0.84 },
    rigger: { side: 0.99, fy: 0.53, fz: 0.82, hl: 0.9, deck: 1.08, bw: 0.95, tt: 1.62, tr: 0.48, my: 1.42, front: 0.95, x0: -0.6, x1: 0.6 }
  },

  kitRack: function (charId, d, n) {
    if (charId === 'rigger') {
      return [[-0.6, d.fy, d.fz], [-0.6, d.fy, -d.fz], [-0.08, d.deck, 0.74], [-0.08, d.deck, -0.74],
        [0.42, d.deck, 0.66], [0.42, d.deck, -0.66], [0.6, d.fy, d.fz], [0.6, d.fy, -d.fz], [-0.75, 1.38, 0.45]];
    }
    var pts = [], per = Math.max(4, Math.ceil(n / 2)), step = (d.x1 - d.x0) / (per - 1);
    for (var i = 0; i < per; i++) pts.push([d.x0 + i * step, d.fy, d.fz], [d.x0 + i * step, d.fy, -d.fz]);
    return pts;
  },

  kitMods: {
    frost: function (m, lv, M) {
      var H = Math.PI / 2;
      m(M.C(0.11, 0.11, 0.3, 8), '#dff1ff', 0, 0.13, 0, 0, 0, H);
      m(M.C(0.118, 0.118, 0.08, 8), '#7ec8ff', 0, 0.13, 0, 0, 0, H, 1, 1, 1, 'glow');
      if (lv >= 2) {
        m(M.C(0.09, 0.09, 0.26, 8), '#dff1ff', 0, 0.33, 0, 0, 0, H);
        m(M.C(0.098, 0.098, 0.07, 8), '#7ec8ff', 0, 0.33, 0, 0, 0, H, 1, 1, 1, 'glow');
      }
    },
    regen: function (m, lv, M) {
      m(M.B(0.24, 0.2, 0.24), '#e9ede4', 0, 0.1, 0);
      m(M.B(0.19, 0.03, 0.065), '#7ee08a', 0, 0.21, 0, 0, 0, 0, 1, 1, 1, 'glow');
      m(M.B(0.065, 0.03, 0.19), '#7ee08a', 0, 0.21, 0, 0, 0, 0, 1, 1, 1, 'glow');
    },
    vamp: function (m, lv, M) {
      m(M.C(0.035, 0.045, 0.26, 5), M.DARK, -0.06, 0.13, 0);
      m(M.B(0.24, 0.04, 0.05), M.STEEL, 0.03, 0.27, 0);
      m(M.K(0.03, 0.12, 4), M.STEEL, 0.13, 0.2, 0.07, Math.PI);
      m(M.K(0.03, 0.12, 4), M.STEEL, 0.13, 0.2, -0.07, Math.PI);
      m(M.B(0.1, 0.1, 0.1), '#7ee08a', 0.13, 0.07, 0, 0, 0, 0, 1, 1, 1, 'glow');
    },
    siphon: function (m, lv, M) {
      m(M.C(0.08, 0.1, 0.22, 7), M.DARK, 0, 0.11, 0);
      m(M.T(0.13, 0.03, 4, 10), '#7ee08a', 0, 0.08, 0, Math.PI / 2, 0, 0, 1, 1, 1, 'glow');
      m(M.S(0.07, 7, 5), '#ff6f8c', 0, 0.27, 0, 0, 0, 0, 1, 1, 1, 'glow');
    },
    orbit: function (m, lv, M) {
      m(M.C(0.03, 0.04, 0.2, 5), M.STEEL, 0, 0.1, 0);
      m(M.S(0.095, 7, 5), '#b07ef5', 0, 0.3, 0, 0, 0, 0, 1, 1, 1, 'glow');
      m(M.T(0.16, 0.02, 4, 12), '#8d93a0', 0, 0.3, 0, Math.PI * 0.38, 0, 0.3);
    },
    turret: function (m, lv, M) {
      m(M.C(0.11, 0.13, 0.1, 6), M.STEEL, 0, 0.05, 0);
      m(M.B(0.17, 0.12, 0.17), '#4a3f63', 0, 0.16, 0);
      m(M.C(0.03, 0.035, 0.22, 5), '#2a3236', 0.16, 0.17, 0, 0, 0, -Math.PI / 2);
      m(M.B(0.07, 0.03, 0.07), '#b07ef5', -0.02, 0.235, 0, 0, 0, 0, 1, 1, 1, 'glow');
    },
    chain: function (m, lv, M) {
      var H = Math.PI / 2;
      m(M.C(0.045, 0.08, 0.3, 6), M.DARK, 0, 0.15, 0);
      m(M.T(0.1, 0.025, 4, 10), '#8d93a0', 0, 0.12, 0, H, 0, 0);
      m(M.T(0.08, 0.022, 4, 10), '#8d93a0', 0, 0.22, 0, H, 0, 0);
      m(M.S(0.08, 7, 5), '#b07ef5', 0, 0.36, 0, 0, 0, 0, 1, 1, 1, 'glow');
    },
    nova: function (m, lv, M) {
      m(M.C(0.08, 0.11, 0.1, 7), M.STEEL, 0, 0.05, 0);
      m(M.T(0.13, 0.03, 4, 12), '#ffd27d', 0, 0.14, 0, Math.PI / 2, 0, 0, 1, 1, 1, 'glow');
      m(M.S(0.05, 6, 4), '#fff3c4', 0, 0.16, 0, 0, 0, 0, 1, 1, 1, 'glow');
    },
    tether: function (m, lv, M) {
      var H = Math.PI / 2;
      m(M.B(0.2, 0.06, 0.26), M.STEEL, 0, 0.03, 0);
      m(M.C(0.1, 0.1, 0.18, 8), M.DARK, 0, 0.15, 0, H, 0, 0);
      m(M.C(0.105, 0.105, 0.07, 8), '#b07ef5', 0, 0.15, 0, H, 0, 0, 1, 1, 1, 'glow');
      m(M.K(0.045, 0.16, 5), '#cfd3d6', 0.17, 0.15, 0, 0, 0, -H);
    },
    spore: function (m, lv, M) {
      m(M.S(0.14, 7, 5), '#3d6a3a', 0, 0.12, 0, 0, 0, 0, 1, 0.8, 1);
      m(M.S(0.05, 5, 4), '#7ee08a', 0.06, 0.23, 0.04, 0, 0, 0, 1, 1, 1, 'glow');
      m(M.S(0.04, 5, 4), '#7ee08a', -0.07, 0.21, 0.03, 0, 0, 0, 1, 1, 1, 'glow');
      m(M.S(0.04, 5, 4), '#7ee08a', 0, 0.21, -0.08, 0, 0, 0, 1, 1, 1, 'glow');
    },
    burn: function (m, lv, M) {
      m(M.C(0.1, 0.13, 0.14, 7), M.DARK, 0, 0.07, 0);
      m(M.K(0.085, 0.26, 6), '#ff7a5c', 0, 0.27, 0, 0, 0, 0, 1, 1, 1, 'glow');
      m(M.S(0.035, 5, 4), '#ffd27d', 0, 0.41, 0, 0, 0, 0, 1, 1, 1, 'glow');
    },
    disc: function (m, lv, M) {
      m(M.C(0.035, 0.045, 0.2, 5), M.STEEL, 0, 0.1, 0);
      m(M.C(0.17, 0.17, 0.035, 10), '#c9ccd0', 0, 0.22, 0);
      for (var i = 0; i < 6; i++) {
        var a = i * Math.PI / 3;
        m(M.B(0.07, 0.035, 0.05), '#c9ccd0', Math.cos(a) * 0.18, 0.22, Math.sin(a) * 0.18, 0, -a, 0);
      }
      m(M.C(0.06, 0.06, 0.05, 8), '#ffb35c', 0, 0.23, 0, 0, 0, 0, 1, 1, 1, 'glow');
    },
    rocket: function (m, lv, M) {
      m(M.B(0.26, 0.18, 0.24), '#4c5140', 0, 0.15, 0, 0, 0, 0.4);
      for (var i = 0; i < 4; i++) {
        var r = i >> 1;
        m(M.K(0.04, 0.1, 5), '#ffb35c', 0.145 - r * 0.03, 0.17 + r * 0.075, i % 2 ? 0.06 : -0.06, 0, 0, 0.4 - Math.PI / 2, 1, 1, 1, 'glow');
      }
    },
    dome: function (m, lv, M) {
      m(M.C(0.15, 0.16, 0.08, 8), M.DARK, 0, 0.04, 0);
      m(M.S(0.13, 8, 5), '#7ee0ff', 0, 0.08, 0, 0, 0, 0, 1, 1, 1, 'glow');
    }
  },

  kit: function (charId, sk, gunId, hull, skills, evo) {
    var M = this, B = M.B, C = M.C, K = M.K, S = M.S, T = M.T;
    var HALF = Math.PI / 2, g = 'glow';
    var dark = M.DARK, steel = M.STEEL, gun = '#2a3236';
    var GOLD = '#ffd27d', GREEN = '#7ee08a', TEAL = '#6fe3c3';
    var boat = hull === 'boat';
    var d = {}, src = M.kitDims[charId] || M.kitDims.scav, k;
    for (k in src) d[k] = src[k];
    if (boat) {
      var bd = M.boatDims[charId] || M.boatDims.scav;
      d.side = bd.hw; d.fy = 0.63; d.fz = bd.hw - 0.2;
      d.hl = -bd.x0 - 0.05; d.front = bd.x1 + bd.bow - 0.12; d.x0 = -0.75; d.x1 = 0.7;
    }
    skills = skills || {};
    evo = evo || {};
    var L = function (id) { return skills[id] || 0; };
    var at = function (add, px, py, pz, s) {
      return function (geo, hex, x, y, z, rx, ry, rz, sx, sy, sz, lit) {
        sx = sx || 1;
        add(geo, hex, px + (x || 0) * s, py + (y || 0) * s, pz + (z || 0) * s, rx, ry, rz,
          sx * s, (sy === undefined ? sx : sy) * s, (sz === undefined ? sx : sz) * s, lit);
      };
    };
    var rackIds = [], id;
    for (id in skills) if (skills[id] > 0 && M.kitMods[id]) rackIds.push(id);

    var chassis = this.build(function (add) {
      var i, n, z, sg, cnt;
      n = L('plate');
      if (n) {
        cnt = Math.min(3, n);
        var len = n >= 4 ? 0.6 : 0.5, pc = '#7d8388';
        for (i = 0; i < cnt; i++) for (sg = -1; sg <= 1; sg += 2) {
          var px = (i - (cnt - 1) / 2) * 0.62;
          add(B(len, 0.06, 0.22), pc, px, d.fy + 0.04, sg * (d.side + 0.07));
          add(B(len, 0.32, 0.06), pc, px, d.fy - 0.12, sg * (d.side + 0.15));
          if (n >= 5 || i === Math.floor(cnt / 2)) add(B(0.1, 0.03, 0.1), GREEN, px, d.fy + 0.085, sg * (d.side + 0.09), 0, 0, 0, 1, 1, 1, g);
        }
      }
      n = L('thorns');
      if (n) {
        cnt = n >= 2 ? 5 : 3;
        for (i = 0; i < cnt; i++) for (sg = -1; sg <= 1; sg += 2) {
          var tx = (i - (cnt - 1) / 2) * (1.5 / cnt);
          add(K(0.09, 0.36, 5), '#d98a3a', tx, d.fy - 0.18, sg * (d.side + 0.2), sg * HALF, 0, 0);
          add(S(0.045, 5, 4), '#f0a24a', tx, d.fy - 0.18, sg * (d.side + 0.38), 0, 0, 0, 1, 1, 1, g);
        }
      }
      n = L('boots');
      if (n) {
        var ey = boat ? 0.84 : d.deck - 0.24;
        for (i = 0; i < n; i++) {
          z = (i - (n - 1) / 2) * 0.22;
          add(C(0.1, 0.07, 0.46, 6), steel, -d.hl - 0.12, ey, z, 0, 0, HALF);
          add(C(0.075, 0.075, 0.04, 6), TEAL, -d.hl - 0.36, ey, z, 0, 0, HALF, 1, 1, 1, g);
        }
      }
      n = L('dash');
      if (n) for (sg = -1; sg <= 1; sg += 2) {
        var ds = n >= 2 ? 1.25 : 1, dy = d.fy + 0.15;
        add(C(0.17 * ds, 0.1 * ds, 0.36, 7), '#4b5a5e', -d.hl + 0.02, dy, sg * d.fz, 0, 0, HALF);
        add(C(0.12 * ds, 0.12 * ds, 0.04, 7), TEAL, -d.hl - 0.17, dy, sg * d.fz, 0, 0, HALF, 1, 1, 1, g);
      }
      n = L('magnet');
      if (n) {
        var mg = at(add, d.tr + 0.14, d.deck + 0.07, 0, 0.85 + n * 0.15);
        mg(B(0.1, 0.12, 0.44), '#b8443a', 0, 0, 0);
        mg(B(0.3, 0.12, 0.11), '#b8443a', 0.18, 0, 0.165);
        mg(B(0.3, 0.12, 0.11), '#b8443a', 0.18, 0, -0.165);
        mg(B(0.08, 0.13, 0.12), TEAL, 0.36, 0, 0.165, 0, 0, 0, 1, 1, 1, g);
        mg(B(0.08, 0.13, 0.12), TEAL, 0.36, 0, -0.165, 0, 0, 0, 1, 1, 1, g);
      }
      n = L('ram');
      if (n) {
        var rw = boat ? 0.3 : d.bw + 0.2, rs = n >= 5 ? 1.25 : 1;
        cnt = boat ? (n >= 3 ? 3 : 1) : (n >= 3 ? 5 : 3);
        add(B(0.14, 0.3, rw * 2), '#8a5a34', d.front + 0.05, 0.4, 0);
        for (i = 0; i < cnt; i++) {
          z = cnt > 1 ? (i - (cnt - 1) / 2) * (rw * 2 - 0.2) / (cnt - 1) : 0;
          add(K(0.12 * rs, 0.42 * rs, 4), '#cfd3d6', d.front + 0.12 + 0.21 * rs, 0.4, z, 0, 0, -HALF);
          add(S(0.05, 5, 4), '#ffb35c', d.front + 0.12 + 0.42 * rs, 0.4, z, 0, 0, 0, 1, 1, 1, g);
        }
        if (evo.ram) add(B(0.05, 0.06, rw * 2), GOLD, d.front + 0.05, 0.58, 0, 0, 0, 0, 1, 1, 1, g);
      }
      var pts = M.kitRack(charId, d, rackIds.length);
      for (i = 0; i < rackIds.length && i < pts.length; i++) {
        var pt = pts[i], lv = skills[rackIds[i]];
        var mod = at(add, pt[0], pt[1], pt[2], 1.1 + 0.07 * Math.min(lv, 5));
        M.kitMods[rackIds[i]](mod, lv, M);
        if (evo[rackIds[i]]) mod(T(0.17, 0.025, 4, 10), GOLD, 0, 0.03, 0, HALF, 0, 0, 1, 1, 1, g);
      }
    });

    var turret = this.build(function (add) {
      var i, n, sg;
      n = L('rapid');
      if (n) {
        var bz = -(d.tr + 0.13);
        add(B(0.34, 0.2, 0.2), '#4a4436', -0.05, d.my - 0.04, bz);
        for (i = 0; i < n; i++) add(C(0.035, 0.035, 0.17, 5), '#e6b84a', -0.19 + i * 0.07, d.my + 0.085, bz, HALF, 0, 0);
        add(B(0.05, 0.04, 0.14), GOLD, 0.16, d.my + 0.04, bz + 0.12, 0, 0, 0, 1, 1, 1, g);
      }
      n = L('splash');
      if (n) {
        var sr = 0.15 + n * 0.02, pz = d.tr + 0.1 + sr * 0.5;
        add(C(sr, sr, 0.12, 9), '#5a4a2c', -0.08, d.my + 0.02, pz);
        add(C(sr * 0.4, sr * 0.4, 0.03, 7), '#f0a24a', -0.08, d.my + 0.09, pz, 0, 0, 0, 1, 1, 1, g);
      }
      n = L('crit');
      if (n) {
        var cs = at(add, -0.02, d.tt + 0.08, 0.15, 0.9 + n * 0.1);
        cs(C(0.05, 0.05, 0.36, 6), dark, 0, 0, 0, 0, 0, -HALF);
        cs(C(0.065, 0.05, 0.08, 6), dark, 0.2, 0, 0, 0, 0, -HALF);
        cs(C(0.05, 0.05, 0.03, 6), GOLD, 0.25, 0, 0, 0, 0, -HALF, 1, 1, 1, g);
        cs(B(0.06, 0.08, 0.06), steel, -0.05, -0.05, 0);
      }
      n = L('triple');
      if (n) {
        add(C(0.07, 0.08, 0.5, 6), gun, -(d.tr + 0.2), d.my, 0, 0, 0, HALF);
        add(C(0.075, 0.075, 0.04, 6), GOLD, -(d.tr + 0.46), d.my, 0, 0, 0, HALF, 1, 1, 1, g);
        if (n >= 2) for (sg = -1; sg <= 1; sg += 2) {
          add(C(0.06, 0.07, 0.4, 6), gun, 0.25, d.my + 0.02, sg * (d.tr + 0.08), sg * HALF, 0, 0);
          add(C(0.065, 0.065, 0.04, 6), GOLD, 0.25, d.my + 0.02, sg * (d.tr + 0.29), sg * HALF, 0, 0, 1, 1, 1, g);
        }
      }
    });

    var gd = { pistol: [0.3, 1.59, 0, 0.16], smg: [0.25, 1.37, 0, 0.2], scatter: [0.3, 1.33, 0, 0.36],
      rail: [0.3, 2.48, 0, 0.15], flak: [0.25, 1.06, 0.2, 0.26] }[gunId] || [0.3, 1.59, 0, 0.16];
    var x0 = gd[0], x1 = gd[1], by = d.my + gd[2], gr = gd[3];
    var barrel = this.build(function (add) {
      var i, n;
      n = L('split');
      if (n) {
        var len = (x1 - x0) * 0.78;
        for (i = 0; i < n; i++) {
          var sz = (i - (n - 1) / 2) * 0.15;
          add(C(0.045, 0.055, len, 6), gun, x0 + 0.05 + len / 2, by + 0.17, sz, 0, 0, -HALF);
          add(C(0.05, 0.05, 0.04, 6), GOLD, x0 + 0.07 + len, by + 0.17, sz, 0, 0, -HALF, 1, 1, 1, g);
        }
      }
      n = L('pierce');
      if (n) {
        var pl = 0.28 + n * 0.1;
        add(K(0.06, pl, 6), '#dfe6ea', x1 + pl / 2 - 0.02, by, 0, 0, 0, -HALF);
        add(T(0.075, 0.025, 4, 8), GOLD, x1, by, 0, 0, HALF, 0, 1, 1, 1, g);
      }
      n = L('ricochet');
      for (i = 0; i < n; i++) add(T(gr, 0.035, 4, 10), GOLD, x0 + 0.38 + i * 0.2, by, 0, 0, HALF, 0, 1, 1, 1, g);
      n = L('heavy');
      if (n) {
        var hx = x0 + (x1 - x0) * 0.62, hw2 = 0.34 + n * 0.04;
        add(B(0.3, 0.2, hw2), '#3a3330', hx, by - 0.06, 0);
        for (i = 0; i < n; i++) add(B(0.035, 0.03, hw2 * 0.9), GOLD, hx - 0.11 + i * 0.055, by + 0.05, 0, 0, 0, 0, 1, 1, 1, g);
      }
      if (evo[gunId]) add(T(gr * 0.9, 0.03, 4, 10), GOLD, x1 - 0.18, by, 0, 0, HALF, 0, 1, 1, 1, g);
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
      } else if (bd.id === 'queen') {
        add(C(0.9, 1.35, 1.1, 8), body, 0, 0.55, 0);
        for (var q = 0; q < 8; q++) {
          var qa = q / 8 * Math.PI * 2 + 0.2;
          add(B(0.55, 0.9, 0.08), q % 2 ? dark : metal, Math.cos(qa) * 1.2, 0.5, Math.sin(qa) * 1.2, 0, -qa + HALF, 0.28);
        }
        add(C(0.7, 0.9, 0.7, 8), dark, 0, 1.45, 0);
        add(B(1.0, 0.7, 0.9), body, 0.1, 2.05, 0);
        add(C(0.62, 0.55, 0.22, 8), '#c9a24a', 0, 2.55, 0);
        for (var qc = 0; qc < 7; qc++) {
          var ca = qc / 7 * Math.PI * 2;
          add(K(0.1, qc % 2 ? 0.45 : 0.7, 4), trim, Math.cos(ca) * 0.55, 2.9 + (qc % 2 ? 0 : 0.12), Math.sin(ca) * 0.55, 0, 0, 0, 1, 1, 1, g);
        }
        add(S(0.16, 6, 4), trim, 0.62, 2.15, 0, 0, 0, 0, 1, 1, 1, g);
        for (var qs = -1; qs <= 1; qs += 2) {
          add(B(1.2, 0.22, 0.22), metal, 0.55, 1.75, qs * 0.75, 0, qs * 0.35, -0.25);
          add(K(0.18, 0.7, 4), steel, 1.2, 1.55, qs * 0.95, 0, 0, -HALF - 0.3);
          add(B(0.12, 0.12, 0.6), trim, 0.95, 1.65, qs * 0.85, 0, 0, 0, 1, 1, 1, g);
        }
      } else {
        add(B(1.6, 1.2, 1.6), body, 0, 1.0, 0);
        add(B(0.1, 0.2, 0.8), trim, 0.82, 1.2, 0, 0, 0, 0, 1, 1, 1, g);
      }
    });

    var back = { crusher: 1.62, driller: 1.22, weaver: 1.95, frostmaw: 1.62, hive: 1.4, warden: 1.5,
      sapper: 1.1, lancer: 1.3, titan: 2.3, phantom: 1.62, queen: 2.0 }[bd.id] || 1.6;
    var menace = this.build(function (add) {
      for (var i = 0; i < 5; i++) {
        var x = -0.95 + i * 0.32;
        var h = 0.3 + (2 - Math.abs(i - 2)) * 0.12;
        add(K(0.09, h, 4), '#2a2420', x, back + h / 2 - 0.05, 0, 0, 0, 0.35);
      }
      add(S(0.09, 5, 4), '#ff3b2e', 0.78, back - 0.28, 0.24, 0, 0, 0, 1, 1, 1, 'glow');
      add(S(0.09, 5, 4), '#ff3b2e', 0.78, back - 0.28, -0.24, 0, 0, 0, 1, 1, 1, 'glow');
    });
    if (bd.id !== 'phantom' && bd.id !== 'hive' && bd.id !== 'queen') {
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
    } else if (bd.id === 'queen') {
      spin = this.build(function (add) {
        add(T(1.55, 0.05, 3, 20), trim, 0, 0, 0, HALF, 0, 0, 1, 1, 1, 'glow');
        for (var i = 0; i < 6; i++) {
          var a = i / 6 * Math.PI * 2;
          add(B(0.22, 0.16, 0.3), metal, Math.cos(a) * 1.55, 0, Math.sin(a) * 1.55, 0.4, a, 0.3);
        }
      });
      spin.at = [0, 1.1, 0];
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

  crateSea: function () {
    var M = this, B = M.B, C = M.C, T = M.T, HALF = Math.PI / 2;
    return this.build(function (add) {
      add(T(1.5, 0.32, 6, 14), '#e8672e', 0, 0.28, 0, HALF);
      for (var i = 0; i < 4; i++) {
        var a = i * HALF + 0.4;
        add(B(0.52, 0.7, 0.74), '#f2ead8', Math.cos(a) * 1.5, 0.28, Math.sin(a) * 1.5, 0, -a, 0);
      }
      add(C(1.3, 1.3, 0.14, 10), '#8a6a45', 0, 0.48, 0);
      add(B(1.8, 1.5, 1.8), '#6b4a2a', 0, 1.3, 0, 0, 0.3);
      add(B(1.87, 0.18, 1.87), '#c9a24a', 0, 0.9, 0, 0, 0.3);
      add(B(1.87, 0.18, 1.87), '#c9a24a', 0, 1.7, 0, 0, 0.3);
      add(B(0.8, 0.6, 0.6), '#5d5752', 0.1, 2.35, 0.1, 0, 1.1);
      add(B(0.07, 1.7, 0.07), '#3a3632', -0.6, 2.9, -0.6);
      add(B(0.55, 0.36, 0.05), '#ffd27d', -0.32, 3.55, -0.6, 0, 0, 0, 1, 1, 1, 'glow');
    });
  },

  seaMine: function () {
    var M = this, C = M.C, S = M.S, T = M.T, HALF = Math.PI / 2;
    return this.build(function (add) {
      add(S(0.74, 9, 6), '#2a2c30', 0, 0.5, 0);
      add(T(0.75, 0.08, 4, 12), '#b3301c', 0, 0.5, 0, HALF);
      for (var i = 0; i < 6; i++) {
        var a = i / 6 * Math.PI * 2;
        add(C(0.06, 0.1, 0.36, 5), '#6a6f76', Math.cos(a) * 0.72, 0.86, Math.sin(a) * 0.72, Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
      }
      add(C(0.07, 0.11, 0.34, 5), '#6a6f76', 0, 1.36, 0);
      add(C(0.1, 0.1, 0.1, 6), '#ffb347', 0, 1.56, 0, 0, 0, 0, 1, 1, 1, 'glow');
    });
  },

  chest: function () {
    var M = this, B = M.B, C = M.C, HALF = Math.PI / 2;
    return this.build(function (add) {
      add(B(2.4, 1.2, 1.6), '#6b4226', 0, 0.6, 0);
      add(C(0.8, 0.8, 2.4, 10), '#7a4d2c', 0, 1.2, 0, 0, 0, HALF);
      for (var i = -1; i <= 1; i += 2) {
        add(B(0.22, 1.26, 1.66), '#e8b84a', i * 0.8, 0.6, 0);
        add(C(0.84, 0.84, 0.22, 10), '#e8b84a', i * 0.8, 1.2, 0, 0, 0, HALF);
      }
      add(B(2.46, 0.12, 1.66), '#4a2c18', 0, 1.2, 0);
      add(B(0.34, 0.44, 0.1), '#ffd27d', 0, 1.0, 0.84, 0, 0, 0, 1, 1, 1, 'glow');
      add(B(1.2, 0.08, 0.08), '#ffd27d', 0, 1.26, 0.84, 0, 0, 0, 1, 1, 1, 'glow');
    });
  },

  raft: function () {
    var M = this, C = M.C, T = M.T, B = M.B, HALF = Math.PI / 2;
    return this.build(function (add) {
      add(C(1.3, 1.18, 0.34, 8), '#2c2a2a', 0, 0.12, 0);
      add(C(1.22, 1.22, 0.06, 8), '#4d4844', 0, 0.3, 0);
      add(T(1.3, 0.11, 5, 8), '#1c1a19', 0, 0.22, 0, HALF);
      add(C(0.62, 0.62, 0.34, 3), '#2c2a2a', 1.42, 0.12, 0, 0, HALF, 0);
      for (var i = 0; i < 4; i++) {
        var a = i * HALF + HALF / 2;
        add(B(0.3, 0.3, 0.3), '#6a5a4a', Math.cos(a) * 1.0, 0.42, Math.sin(a) * 1.0);
      }
    });
  },

  isle: function (set) {
    var M = this, C = M.C, x0 = set[0].x, y0 = set[0].y;
    return this.build(function (add) {
      var layer = function (pad, y, col, min, k) {
        for (var i = 0; i < set.length; i++) {
          var q = set[i], rr = q.r * (k || 1) + pad;
          if (q.r < (min || 0) || rr < 8) continue;
          add(C(rr, rr, 0.02, 30), col, q.x - x0, y, q.y - y0, 0, i * 0.37);
        }
      };
      layer(52, 0.05, '#3f9fb2');
      layer(30, 0.09, '#5cc0c2');
      layer(19, 0.13, '#eafaff');
      layer(15, 0.17, '#cdb37c');
      layer(-4, 0.25, '#ecdcae');
      layer(-34, 0.3, '#f3e6bd', 0, 1);
      layer(0, 0.34, '#8dbf5c', 105, 0.5);
      layer(0, 0.37, '#74a84c', 150, 0.3);
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

  drill: function () {
    var M = this, C = M.C, K = M.K;
    return this.build(function (add) {
      add(K(0.9, 2.4, 8), '#aab2ba', 1.2, 0, 0, 0, 0, -Math.PI / 2);
      add(C(1.05, 1.05, 0.42, 10), '#ffb07a', 0, 0, 0, 0, 0, -Math.PI / 2);
      for (var i = 0; i < 3; i++) {
        var x = 0.45 + i * 0.6, rr = 0.9 * (1 - x / 2.4) + 0.04;
        add(M.T(rr, 0.08, 3, 12), '#3a3530', x, 0, 0, 0, Math.PI / 2, 0);
      }
      add(K(0.24, 0.5, 6), '#fff1c2', 2.25, 0, 0, 0, 0, -Math.PI / 2, 1, 1, 1, 'glow');
    });
  },

  saw: function () {
    var M = this, C = M.C, K = M.K;
    return this.build(function (add) {
      add(C(1, 1, 0.14, 16), '#6e6862', 0, 0, 0);
      add(C(0.32, 0.32, 0.26, 8), '#2b2826', 0, 0, 0);
      for (var i = 0; i < 12; i++) {
        var a = i / 12 * Math.PI * 2;
        add(K(0.2, 0.42, 3), '#e8e2d6', Math.cos(a) * 1.1, 0, -Math.sin(a) * 1.1, 0, a, -Math.PI / 2);
      }
      add(M.T(0.66, 0.07, 3, 20), '#ff9a3c', 0, 0.09, 0, Math.PI / 2, 0, 0, 1, 1, 1, 'glow');
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
      } else if (kind === 'buoy') {
        add(C(0.55, 0.7, 0.5, 8), '#ffffff', 0, 0.2, 0);
        add(C(0.58, 0.58, 0.12, 8), '#e6ded0', 0, 0.48, 0);
        add(M.K(0.5, 1.0, 8), '#ffffff', 0, 1.0, 0);
        add(B(0.07, 0.9, 0.07), '#3a3632', 0, 1.85, 0);
        add(B(0.2, 0.2, 0.2), '#ffe9a8', 0, 2.3, 0);
      } else if (kind === 'palm') {
        var tk = '#8a6a48';
        add(C(0.2, 0.27, 1.3, 6), tk, 0, 0.65, 0, 0, 0, -0.1);
        add(C(0.17, 0.2, 1.3, 6), tk, 0.18, 1.85, 0, 0, 0, -0.2);
        add(C(0.14, 0.17, 1.2, 6), tk, 0.48, 3.0, 0, 0, 0, -0.3);
        for (var pf = 0; pf < 8; pf++) {
          var pfa = pf / 8 * Math.PI * 2 + 0.2;
          add(B(1.8, 0.07, 0.46), pf % 2 ? '#3f9a4a' : '#5cb85c', 0.68 + Math.cos(pfa) * 0.85, 3.42, Math.sin(pfa) * 0.85, 0, -pfa, -0.4);
        }
        add(M.S(0.34, 6, 4), '#4a8f48', 0.68, 3.7, 0);
        add(M.S(0.16, 5, 4), '#5a3f28', 0.56, 3.38, 0.17);
        add(M.S(0.16, 5, 4), '#5a3f28', 0.8, 3.36, -0.12);
      } else if (kind === 'fern') {
        for (var fl = 0; fl < 7; fl++) {
          var fla = fl / 7 * Math.PI * 2 + 0.3;
          add(B(1.1, 0.05, 0.36), fl % 2 ? '#4fa24e' : '#70c05c', Math.cos(fla) * 0.5, 0.36, Math.sin(fla) * 0.5, 0, -fla, 0.5);
        }
        add(M.S(0.2, 5, 4), '#ffffff', 0, 0.62, 0);
      } else if (kind === 'drift') {
        add(C(0.2, 0.27, 3.0, 6), '#ffffff', 0, 0.12, 0, 0, 0, Math.PI / 2);
        add(C(0.09, 0.12, 0.9, 5), '#ffffff', 0.5, 0.42, 0.2, 0.5, 0, 0.9);
      } else if (kind === 'sign') {
        add(B(0.14, 3.2, 0.14), '#5d5752', -0.7, 1.6, 0);
        add(B(0.14, 3.2, 0.14), '#5d5752', 0.7, 1.6, 0);
        add(B(2.0, 1.1, 0.08), '#b8452e', 0, 2.8, 0, 0, 0, 0.06);
        add(B(1.6, 0.18, 0.1), '#e8d8b8', 0, 2.85, 0, 0, 0, 0.06);
      }
    });
  }
};
