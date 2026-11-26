var Snd = {
  ctx: null,
  master: null,
  comp: null,
  sfxGain: null,
  musGain: null,
  verbSend: null,
  on: true,
  musicOn: true,
  musVol: 0.5,
  vol: 0.5,
  outGain: 0.85,
  muted: false,
  adMuted: false,
  pfMuted: false,
  bgMuted: false,
  strings: {},

  init: function () {
    if (this.ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { this.on = false; return; }
    this.setup(new AC());
  },

  setup: function (c) {
    this.ctx = c;
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -16;
    this.comp.knee.value = 12;
    this.comp.ratio.value = 4;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.2;
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : this.outGain * this.vol;
    this.comp.connect(this.master);
    this.lim = c.createDynamicsCompressor();
    this.lim.threshold.value = -3;
    this.lim.knee.value = 0;
    this.lim.ratio.value = 20;
    this.lim.attack.value = 0.001;
    this.lim.release.value = 0.1;
    this.master.connect(this.lim);
    this.lim.connect(c.destination);
    this.sfxGain = c.createGain();
    this.sfxGain.gain.value = 0.55;
    this.sfxGain.connect(this.comp);
    this.musGain = c.createGain();
    this.musGain.gain.value = this.musicOn ? this.musVol : 0;
    this.musGain.connect(this.comp);
    var verb = c.createConvolver();
    verb.buffer = this.impulse(1.8, 3);
    this.verbSend = c.createGain();
    this.verbSend.gain.value = 0.4;
    this.verbSend.connect(verb);
    verb.connect(this.comp);
    this.musVerb = c.createGain();
    this.musVerb.gain.value = this.musicOn ? 1 : 0;
    this.musVerb.connect(this.verbSend);
    this.buildBuffers();
  },

  unlock: function () {
    var self = this;
    if (!this.ctx) {
      try { this.init(); } catch (e) { this.initErr = String((e && e.message) || e).slice(0, 80); }
    }
    this.iosSession();
    if (this.ctx && this.ctx.state !== 'running') {
      try {
        var pr = this.ctx.resume();
        if (pr && pr.then) pr.then(function () { self.resErr = ''; }, function (e) { self.resErr = String((e && e.name) || e).slice(0, 40); });
      } catch (e) { this.resErr = String((e && e.name) || e).slice(0, 40); }
    }
  },

  isIos: function () {
    var ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  },

  iosSession: function () {
    var self = this;
    try {
      if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback';
    } catch (e) { this.sesErr = String((e && e.name) || e).slice(0, 40); }
    if (!this.isIos() || !this.ctx || this._iosOk || this._iosBusy) return;
    try {
      var a = this._iosEl;
      if (!a) {
        a = document.createElement('audio');
        a.setAttribute('playsinline', '');
        a.setAttribute('x-webkit-airplay', 'deny');
        a.preload = 'auto';
        a.loop = true;
        a.src = this.silentWav(this.ctx.sampleRate);
        this._iosEl = a;
        try { a.load(); } catch (e) {}
      }
      this._iosBusy = true;
      var pr = a.play();
      if (pr && pr.then) {
        pr.then(function () { self._iosBusy = false; self._iosOk = true; self.elErr = ''; },
          function (e) { self._iosBusy = false; self.elErr = String((e && e.name) || e).slice(0, 40); });
      } else { this._iosBusy = false; this._iosOk = true; }
    } catch (e) { this._iosBusy = false; this.elErr = String((e && e.name) || e).slice(0, 40); }
  },

  silentWav: function (rate) {
    rate = Math.max(8000, Math.min(96000, Math.round(rate) || 44100));
    var n = Math.round(rate / 2), b = new Uint8Array(44 + n), v = new DataView(b.buffer), i, bin = '';
    var str = function (o, t) { for (var k = 0; k < t.length; k++) b[o + k] = t.charCodeAt(k); };
    str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate, true);
    v.setUint16(32, 1, true); v.setUint16(34, 8, true); str(36, 'data'); v.setUint32(40, n, true);
    for (i = 0; i < n; i++) b[44 + i] = 128;
    for (i = 0; i < b.length; i += 4096) bin += String.fromCharCode.apply(null, b.subarray(i, i + 4096));
    return 'data:audio/wav;base64,' + btoa(bin);
  },

  beep: function () {
    this.unlock();
    var c = this.ctx;
    if (!c) return;
    try {
      var o = c.createOscillator(), g = c.createGain();
      o.frequency.value = 660;
      g.gain.value = 0.25;
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + 0.35);
    } catch (e) { this.initErr = 'beep ' + String((e && e.message) || e).slice(0, 60); }
  },

  diag: function () {
    var c = this.ctx, ses = 'нет API', framed = 0;
    try { if (navigator.audioSession) ses = String(navigator.audioSession.type) + (navigator.audioSession.state ? ' / ' + navigator.audioSession.state : ''); } catch (e) { ses = 'ошибка'; }
    try { framed = window.top !== window ? 1 : 0; } catch (e) { framed = 1; }
    var el = this._iosEl;
    return [
      'v' + CFG.version + ' · ' + CFG.platform + ' · iOS ' + (this.isIos() ? 1 : 0) + ' · во встройке ' + framed,
      'контекст: ' + (c ? c.state + ' · ' + c.sampleRate + ' Гц · t ' + c.currentTime.toFixed(1) : 'нет'),
      'сессия: ' + ses + (this.sesErr ? ' · ' + this.sesErr : ''),
      'дорожка: ' + (el ? (this._iosOk ? 'играет' : (this._iosBusy ? 'ждет' : 'нет')) + (el.paused ? ' · на паузе' : '') + (this.elErr ? ' · ' + this.elErr : '') : 'не нужна или не создана'),
      'глушилки: реклама ' + (this.adMuted ? 1 : 0) + ' · площадка ' + (this.pfMuted ? 1 : 0) + ' · фон ' + (this.bgMuted ? 1 : 0),
      'громкость ' + (+this.vol).toFixed(2) + ' · звуки ' + (this.on ? 1 : 0) + ' · музыка ' + (this.musicOn ? 1 : 0) + ' · выход ' + (this.master ? this.master.gain.value.toFixed(2) : '-'),
      'ошибки: запуск ' + (this.initErr || '-') + ' · resume ' + (this.resErr || '-')
    ];
  },

  setSfx: function (v) { this.on = !!v; },
  setVol: function (v) {
    var n = +v;
    this.vol = n >= 0 ? Math.min(1, n) : 0.5;
    this.applyMute();
  },
  setMusic: function (v) {
    this.musicOn = !!v;
    if (this.musGain) this.musGain.gain.value = v ? this.musVol : 0;
    if (this.musVerb) this.musVerb.gain.value = v ? 1 : 0;
  },

  mute: function (m) {
    this.adMuted = !!m;
    this.applyMute();
  },

  pfMute: function (m) {
    this.pfMuted = !!m;
    this.applyMute();
  },

  bgMute: function (m) {
    this.bgMuted = !!m;
    this.applyMute();
    if (this._iosEl) {
      if (m) { try { this._iosEl.pause(); } catch (e) {} this._iosOk = false; }
      else this.iosSession();
    }
  },

  applyMute: function () {
    var m = this.adMuted || this.pfMuted || this.bgMuted;
    this.muted = m;
    if (!this.ctx) return;
    this.master.gain.value = m ? 0 : this.outGain * this.vol;
  },

  buildBuffers: function () {
    var c = this.ctx, sr = c.sampleRate, i;
    this.white = c.createBuffer(1, sr, sr);
    var d = this.white.getChannelData(0);
    for (i = 0; i < sr; i++) d[i] = Math.random() * 2 - 1;
    this.brown = c.createBuffer(1, sr * 2, sr);
    var b = this.brown.getChannelData(0), last = 0;
    for (i = 0; i < sr * 2; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      b[i] = last * 3.5;
    }
    this.soft = this.curve(5);
    this.hard = this.curve(30);
  },

  curve: function (k) {
    var n = 1025, a = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var x = i * 2 / (n - 1) - 1;
      a[i] = (1 + k) * x / (1 + k * Math.abs(x));
    }
    return a;
  },

  impulse: function (sec, decay) {
    var c = this.ctx, len = Math.floor(c.sampleRate * sec);
    var buf = c.createBuffer(2, len, c.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  },

  string: function (freq, bright) {
    var key = Math.round(freq * 10) + (bright ? 'b' : 'd');
    if (this.strings[key]) return this.strings[key];
    var c = this.ctx, sr = c.sampleRate, len = Math.floor(sr * 1.8);
    var buf = c.createBuffer(1, len, sr), out = buf.getChannelData(0);
    var p = Math.max(2, Math.round(sr / freq)), line = new Float32Array(p);
    for (var i = 0; i < p; i++) line[i] = Math.random() * 2 - 1;
    var damp = bright ? 0.997 : 0.992, idx = 0;
    for (i = 0; i < len; i++) {
      var cur = line[idx], nxt = line[(idx + 1) % p];
      line[idx] = (cur + nxt) * 0.5 * damp;
      out[i] = cur * 0.6;
      idx = (idx + 1) % p;
    }
    this.strings[key] = buf;
    return buf;
  },

  env: function (prm, t, vol, dur, atk) {
    atk = atk || 0.004;
    prm.setValueAtTime(0.0001, t);
    prm.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + atk);
    prm.exponentialRampToValueAtTime(0.0001, t + Math.max(atk + 0.01, dur));
  },

  route: function (node, o) {
    var out = node, ws = null;
    if (o.shape) {
      ws = this.ctx.createWaveShaper();
      ws.curve = o.shape;
      out.connect(ws);
      out = ws;
    }
    out.connect(o.bus || this.sfxGain);
    if (o.verb) {
      var s = this.ctx.createGain();
      s.gain.value = o.verb;
      out.connect(s);
      s.connect(this.verbSend);
    }
    return ws;
  },

  burst: function (o) {
    var c = this.ctx, t = o.t || c.currentTime;
    var src = c.createBufferSource();
    src.buffer = o.brown ? this.brown : this.white;
    var f = c.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.f0, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
    var g = c.createGain();
    this.env(g.gain, t, o.vol, o.dur, o.atk);
    src.connect(f);
    f.connect(g);
    var ws = this.route(g, o);
    src.start(t, Math.random() * 0.5, o.dur + 0.05);
    if (ws) src.onended = function () { ws.disconnect(); };
  },

  osc: function (o) {
    var c = this.ctx, t = o.t || c.currentTime;
    var osc = c.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + (o.glide || o.dur));
    if (o.detune) osc.detune.value = o.detune;
    var g = c.createGain();
    this.env(g.gain, t, o.vol, o.dur, o.atk);
    osc.connect(g);
    var out = g;
    if (o.lp) {
      var f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.Q.value = o.q || 0.7;
      f.frequency.setValueAtTime(o.lp, t);
      if (o.lp1) f.frequency.exponentialRampToValueAtTime(o.lp1, t + o.dur);
      g.connect(f);
      out = f;
    }
    var ws = this.route(out, o);
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
    if (ws) osc.onended = function () { ws.disconnect(); };
  },

  pluck: function (o) {
    var c = this.ctx, t = o.t || c.currentTime;
    var g = c.createGain();
    g.gain.setValueAtTime(o.vol, t);
    g.gain.setTargetAtTime(0.0001, t + (o.dur || 0.5), 0.07);
    var fs = o.fs || [o.f];
    for (var i = 0; i < fs.length; i++) {
      var src = c.createBufferSource();
      src.buffer = this.string(fs[i], o.bright);
      src.connect(g);
      src.start(t + i * (o.strum || 0));
      src.stop(t + (o.dur || 0.5) + 0.6);
    }
    var out = g;
    if (!o.dist && o.lp) {
      var soft = c.createBiquadFilter();
      soft.type = 'lowpass';
      soft.frequency.value = o.lp;
      g.connect(soft);
      out = soft;
    }
    if (o.dist) {
      var ws = c.createWaveShaper();
      ws.curve = this.hard;
      g.connect(ws);
      var lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = o.lp || 2400;
      ws.connect(lp);
      var post = c.createGain();
      post.gain.value = o.post || 0.3;
      lp.connect(post);
      out = post;
      src.onended = function () { ws.disconnect(); };
    }
    this.route(out, { bus: o.bus || this.musGain, verb: o.verb });
  },

  gaps: { hit: 0.11, kill: 0.09, shot: 0.05, shotBig: 0.09, boom: 0.13, splash: 0.22, crate: 0.05, crateBreak: 0.06, pick: 0.045, coin: 0.05, aggro: 25, barrel: 0.3, tell: 0.25, open: 0.4, heal: 0.3, hook: 0.2, saw: 0.12, rocket: 0.2, ram: 0.2, dome: 0.4,
    mute: 0.5, frostTell: 0.5, frostRing: 0.4, freeze: 0.6, threadTell: 0.5, thread: 0.4, snap: 0.3, leapTell: 0.5, leap: 0.3,
    wardRev: 0.5, wardPush: 0.6, wardBlast: 0.4, hiveTell: 0.5, swarm: 0.35, spit: 0.25, acid: 0.3,
    larvae: 0.5, larvaFuse: 0.25, pop: 0.09, titanTell: 0.5, quake: 0.3, rockTell: 0.4, rockThrow: 0.3,
    rockLand: 0.2, blinkTell: 0.3, blink: 0.2, decoy: 0.5, decoyPop: 0.3, rushTell: 0.3, slash: 0.25,
    rainTell: 0.8, scrapLand: 0.1, scrapWall: 0.15, scrapBack: 0.15, collapse: 1, beetleTell: 0.4,
    beetleBoom: 0.12, rope: 0.5, linkPass: 0.3, rollTell: 0.5, roll: 0.3, rollCrash: 0.3, muteTell: 0.5,
    unmute: 0.5, bubble: 0.15, fuse: 0.2, rep: 1,
    lockClick: 0.09, lockDone: 1, lockJoin: 0.5, cableBlock: 0.25, cableBurn: 0.8,
    mine: 0.25 },
  last: {},
  recent: [],
  pickN: 0,
  pickT: 0,
  pickSteps: [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24],

  duck: function () {
    if (!this.sfxGain) return;
    var n = Game.running ? Game.enemies.length : 0;
    var v = 0.55 * Math.max(0.32, 1 / (1 + n / 120));
    if (Math.abs(v - (this.duckV || 0)) < 0.01) return;
    this.duckV = v;
    this.sfxGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.12);
  },

  play: function (name) {
    if (!this.on || !this.ctx || this.muted) return;

    var now = this.ctx.currentTime;
    var gap = this.gaps[name];
    if (gap) {
      if (this.last[name] !== undefined && now - this.last[name] < gap) return;
      this.last[name] = now;
    }
    while (this.recent.length && now - this.recent[0] > 0.1) this.recent.shift();
    if (this.recent.length >= 9 && name !== 'boss' && name !== 'level' && name !== 'over' && name !== 'win' && name !== 'queen' && name !== 'frenzy') return;
    this.recent.push(now);

    var r = 1 + (Math.random() - 0.5) * 0.14;
    var k, self = this;
    switch (name) {
      case 'shot':
        this.osc({ type: 'triangle', f0: 380 * r, f1: 120, dur: 0.075, vol: 0.28, glide: 0.045, lp: 1400, lp1: 500, verb: 0.1 });
        this.burst({ brown: true, type: 'lowpass', f0: 1800, f1: 400, dur: 0.04, vol: 0.12, shape: this.soft });
        break;
      case 'shotBig':
        this.burst({ brown: true, type: 'lowpass', f0: 2400 * r, f1: 280, q: 0.6, dur: 0.24, vol: 0.6, shape: this.soft, verb: 0.25 });
        this.osc({ type: 'sine', f0: 110 * r, f1: 38, dur: 0.22, vol: 0.4 });
        break;
      case 'hit':
        this.osc({ type: 'sine', f0: 300 * r, f1: 110, dur: 0.055, vol: 0.085 });
        this.burst({ brown: true, type: 'lowpass', f0: 1000, f1: 350, dur: 0.035, vol: 0.05 });
        break;
      case 'kill':
        this.burst({ brown: true, type: 'lowpass', f0: 1300 * r, f1: 260, dur: 0.11, vol: 0.32 });
        this.osc({ type: 'sine', f0: 240 * r, f1: 60, dur: 0.1, vol: 0.14 });
        for (k = 0; k < 2; k++) {
          this.osc({ t: now + 0.04 + k * 0.045 + Math.random() * 0.015, type: 'sine',
            f0: 900 + Math.random() * 600, dur: 0.03, vol: 0.02 });
        }
        break;
      case 'boom':
        this.burst({ brown: true, type: 'lowpass', f0: 1700, f1: 110, dur: 0.75, vol: 0.95, shape: this.soft, verb: 0.55 });
        this.osc({ type: 'sine', f0: 72, f1: 27, dur: 0.6, vol: 0.6 });
        this.burst({ t: now + 0.05, f0: 1400, f1: 400, q: 0.5, dur: 0.18, vol: 0.06, shape: this.soft });
        break;
      case 'mine':
        this.burst({ brown: true, type: 'lowpass', f0: 520 * r, f1: 90, dur: 0.32, vol: 0.42, verb: 0.12 });
        this.osc({ type: 'sine', f0: 64 * r, f1: 30, dur: 0.3, vol: 0.34 });
        break;
      case 'splash':
        this.burst({ brown: true, type: 'lowpass', f0: 900 * r, f1: 140, dur: 0.18, vol: 0.3, verb: 0.12 });
        this.osc({ type: 'sine', f0: 95 * r, f1: 40, dur: 0.16, vol: 0.18 });
        break;
      case 'crate':
        this.burst({ type: 'bandpass', f0: 1500 * r, f1: 600, q: 1.2, dur: 0.045, vol: 0.14, shape: this.soft });
        this.osc({ type: 'sine', f0: 220 * r, f1: 120, dur: 0.05, vol: 0.08 });
        break;
      case 'crateBreak':
        this.burst({ brown: true, type: 'lowpass', f0: 1200 * r, f1: 300, dur: 0.12, vol: 0.3, shape: this.soft, verb: 0.2 });
        this.osc({ type: 'sine', f0: 160 * r, f1: 70, dur: 0.14, vol: 0.18 });
        for (k = 0; k < 3; k++) {
          this.burst({ t: now + 0.015 + k * 0.03 + Math.random() * 0.012, type: 'bandpass', f0: 2200 + Math.random() * 1200, q: 2.5, dur: 0.025, vol: 0.09 });
        }
        break;
      case 'hurt':
        this.osc({ type: 'sawtooth', f0: 150, f1: 65, dur: 0.2, vol: 0.2, lp: 1100, shape: this.soft });
        this.burst({ f0: 650, q: 2, dur: 0.12, vol: 0.22 });
        this.osc({ type: 'triangle', f0: 330, dur: 0.22, vol: 0.06 });
        break;
      case 'pick':
        if (now - this.pickT > 0.45) this.pickN = 0;
        this.pickT = now;
        var st = this.pickSteps[Math.min(this.pickN++, this.pickSteps.length - 1)];
        var pf = 640 * Math.pow(2, st / 12);
        this.osc({ type: 'sine', f0: pf, dur: 0.09, vol: 0.08 });
        this.osc({ type: 'triangle', f0: pf * 2, dur: 0.05, vol: 0.025 });
        break;
      case 'coin':
        this.osc({ type: 'sine', f0: 2100 * r, dur: 0.08, vol: 0.07 });
        this.osc({ t: now + 0.025, type: 'sine', f0: 2950 * r, dur: 0.06, vol: 0.05 });
        break;
      case 'level':
        [329.6, 415.3, 493.9, 659.3, 740].forEach(function (f, i) {
          var at = now + i * 0.07;
          self.osc({ t: at, type: 'sine', f0: f, dur: 1.3, vol: 0.13, atk: 0.015, verb: 0.5 });
          self.osc({ t: at, type: 'triangle', f0: f * 2, dur: 0.5, vol: 0.03, atk: 0.01, lp: 2500 });
        });
        this.burst({ type: 'bandpass', f0: 400, f1: 2400, q: 0.7, dur: 0.45, vol: 0.06, atk: 0.2 });
        this.osc({ t: now + 0.36, type: 'sine', f0: 1975, dur: 0.35, vol: 0.035, verb: 0.6 });
        this.osc({ t: now + 0.44, type: 'sine', f0: 2637, dur: 0.3, vol: 0.025, verb: 0.6 });
        break;
      case 'dash':
        this.burst({ f0: 500, f1: 2800, q: 1.4, dur: 0.2, vol: 0.2 });
        this.osc({ type: 'sawtooth', f0: 70, f1: 150, dur: 0.18, vol: 0.09, lp: 650, shape: this.soft });
        break;
      case 'boss':
        this.burst({ brown: true, type: 'lowpass', f0: 160, f1: 420, dur: 2.2, vol: 0.7, atk: 0.6, verb: 0.4 });
        this.osc({ type: 'sine', f0: 48, f1: 30, dur: 1.4, vol: 0.55, atk: 0.02 });
        this.burst({ brown: true, type: 'lowpass', f0: 1400, f1: 90, dur: 0.9, vol: 0.6, shape: this.soft, verb: 0.5 });
        [[73.4, 0.35], [61.7, 1.0]].forEach(function (n) {
          self.osc({ t: now + n[1], type: 'sawtooth', f0: n[0], dur: 1.1, vol: 0.3, atk: 0.08, lp: 300, lp1: 1300, shape: self.hard, verb: 0.65 });
          self.osc({ t: now + n[1], type: 'sawtooth', f0: n[0] * 1.008, dur: 1.1, vol: 0.24, atk: 0.08, lp: 360, lp1: 1400, verb: 0.55 });
          self.osc({ t: now + n[1], type: 'square', f0: n[0] / 2, dur: 1.1, vol: 0.14, atk: 0.1, lp: 200 });
        });
        break;
      case 'tell':
        this.osc({ type: 'sawtooth', f0: 70 * r, f1: 190, dur: 0.5, vol: 0.13, glide: 0.45, lp: 500, lp1: 1500, verb: 0.3 });
        this.burst({ brown: true, type: 'bandpass', f0: 300, f1: 1100, q: 1.2, dur: 0.45, vol: 0.12, atk: 0.3 });
        break;
      case 'open':
        this.burst({ brown: true, type: 'lowpass', f0: 900, f1: 220, q: 0.7, dur: 0.6, vol: 0.45, atk: 0.06, verb: 0.2 });
        this.osc({ type: 'triangle', f0: 420 * r, f1: 140, dur: 0.35, vol: 0.12, lp: 1200 });
        this.osc({ t: now + 0.08, type: 'square', f0: 95, f1: 60, dur: 0.18, vol: 0.06, lp: 400 });
        break;
      case 'phase':
        this.osc({ type: 'sawtooth', f0: 55, f1: 110, dur: 0.7, vol: 0.25, lp: 300, lp1: 1200, shape: this.hard, verb: 0.5 });
        this.burst({ brown: true, type: 'lowpass', f0: 1500, f1: 100, dur: 0.7, vol: 0.7, shape: this.soft, verb: 0.5 });
        this.osc({ type: 'sine', f0: 60, f1: 30, dur: 0.6, vol: 0.5 });
        break;
      case 'frenzy':
        for (k = 0; k < 3; k++) {
          this.osc({ t: now + k * 0.55, type: 'sawtooth', f0: 220, f1: 440, dur: 0.5, vol: 0.12, lp: 1400, verb: 0.5 });
        }
        this.burst({ brown: true, type: 'lowpass', f0: 200, f1: 600, dur: 1.8, vol: 0.55, atk: 0.4, verb: 0.4 });
        this.osc({ type: 'sine', f0: 55, f1: 32, dur: 1.6, vol: 0.5 });
        break;
      case 'queen':
        this.burst({ brown: true, type: 'lowpass', f0: 140, f1: 380, dur: 2.6, vol: 0.75, atk: 0.5, verb: 0.5 });
        this.osc({ type: 'sine', f0: 44, f1: 26, dur: 1.8, vol: 0.6, atk: 0.02 });
        [55, 65.4, 82.4].forEach(function (f, i) {
          self.osc({ t: now + 0.4 + i * 0.25, type: 'sawtooth', f0: f, dur: 1.8, vol: 0.2, atk: 0.15, lp: 280, lp1: 1500, shape: self.hard, verb: 0.7 });
        });
        break;
      case 'win':
        [[164.8, 0], [207.7, 0.22], [246.9, 0.44], [329.6, 0.7]].forEach(function (n) {
          self.osc({ t: now + n[1], type: 'sawtooth', f0: n[0], dur: n[1] > 0.6 ? 1.8 : 0.5, vol: 0.14, atk: 0.06, lp: 900, lp1: 2200, verb: 0.6 });
          self.osc({ t: now + n[1], type: 'triangle', f0: n[0] * 2, dur: 0.6, vol: 0.05, lp: 3000 });
        });
        [987.8, 1318.5, 1661.2, 1975.5].forEach(function (f, i) {
          self.osc({ t: now + 0.9 + i * 0.09, type: 'sine', f0: f, dur: 1.2, vol: 0.06, atk: 0.005, verb: 0.7 });
        });
        this.osc({ type: 'sine', f0: 60, f1: 40, dur: 0.6, vol: 0.4 });
        break;
      case 'buy':
        for (k = 0; k < 3; k++) this.burst({ t: now + k * 0.03, f0: 2600, q: 3, dur: 0.02, vol: 0.12 });
        this.osc({ t: now + 0.1, type: 'sine', f0: 1800, dur: 0.12, vol: 0.08 });
        this.osc({ t: now + 0.12, type: 'sine', f0: 2700, dur: 0.1, vol: 0.05 });
        break;
      case 'heal':
        this.osc({ type: 'sine', f0: 520 * r, f1: 880, dur: 0.28, vol: 0.07, glide: 0.25, verb: 0.4 });
        this.osc({ t: now + 0.06, type: 'triangle', f0: 1040 * r, dur: 0.18, vol: 0.03, verb: 0.4 });
        break;
      case 'hook':
        this.burst({ type: 'bandpass', f0: 900, f1: 3200, q: 2.5, dur: 0.22, vol: 0.14 });
        for (k = 0; k < 3; k++) this.burst({ t: now + 0.05 + k * 0.04, type: 'bandpass', f0: 2600 * r, q: 4, dur: 0.02, vol: 0.08 });
        break;
      case 'mute':
        this.burst({ brown: true, type: 'lowpass', f0: 2400, f1: 120, dur: 0.5, vol: 0.3, shape: this.soft, verb: 0.3 });
        this.osc({ type: 'sine', f0: 300 * r, f1: 60, dur: 0.45, vol: 0.14, glide: 0.4 });
        break;
      case 'saw':
        this.burst({ type: 'bandpass', f0: 3800 * r, f1: 2200, q: 6, dur: 0.12, vol: 0.07 });
        this.osc({ type: 'sawtooth', f0: 1400 * r, f1: 900, dur: 0.1, vol: 0.025, lp: 4000, glide: 0.1 });
        break;
      case 'rocket':
        this.burst({ type: 'bandpass', f0: 500, f1: 2400, q: 1.5, dur: 0.35, vol: 0.12 });
        this.osc({ type: 'triangle', f0: 180 * r, f1: 420, dur: 0.3, vol: 0.04, glide: 0.3 });
        break;
      case 'ram':
        this.burst({ brown: true, type: 'lowpass', f0: 900, f1: 140, dur: 0.25, vol: 0.35, shape: this.soft });
        this.burst({ t: now + 0.02, type: 'bandpass', f0: 1800 * r, q: 5, dur: 0.06, vol: 0.08 });
        break;
      case 'dome':
        this.osc({ type: 'sine', f0: 660 * r, f1: 990, dur: 0.4, vol: 0.06, glide: 0.35, verb: 0.5 });
        this.osc({ t: now + 0.05, type: 'sine', f0: 1320 * r, dur: 0.3, vol: 0.03, verb: 0.5 });
        break;
      case 'frostTell':
        this.osc({ type: 'triangle', f0: 392 * r, f1: 784, dur: 0.74, vol: 0.07, atk: 0.66, glide: 0.7, lp: 2000, verb: 0.35 });
        this.osc({ type: 'sine', f0: 588 * r, f1: 1176, dur: 0.74, vol: 0.035, atk: 0.66, glide: 0.7 });
        this.burst({ type: 'bandpass', f0: 900, f1: 2200, q: 3, dur: 0.74, vol: 0.08, atk: 0.62 });
        break;
      case 'frostRing':
        this.burst({ type: 'bandpass', f0: 1900 * r, f1: 900, q: 2.5, dur: 0.09, vol: 0.12 });
        this.burst({ type: 'bandpass', f0: 1200, f1: 300, q: 0.8, dur: 0.4, vol: 0.1, atk: 0.02, verb: 0.3 });
        this.osc({ type: 'sine', f0: 130 * r, f1: 55, dur: 0.22, vol: 0.18 });
        break;
      case 'freeze':
        this.burst({ type: 'bandpass', f0: 1600 * r, q: 1.5, dur: 0.12, vol: 0.14, shape: this.soft });
        this.osc({ t: now + 0.02, type: 'sine', f0: 1320 * r, dur: 0.12, vol: 0.05, verb: 0.3 });
        this.osc({ t: now + 0.09, type: 'sine', f0: 1760 * r, dur: 0.14, vol: 0.035, verb: 0.3 });
        this.osc({ type: 'triangle', f0: 220, f1: 110, dur: 0.18, vol: 0.08 });
        break;
      case 'threadTell':
        this.osc({ type: 'sawtooth', f0: 196 * r, f1: 330, dur: 0.6, vol: 0.06, atk: 0.52, glide: 0.58, lp: 900, lp1: 1600 });
        this.osc({ type: 'sawtooth', f0: 197.5 * r, f1: 332, dur: 0.6, vol: 0.05, atk: 0.52, glide: 0.58, lp: 900 });
        break;
      case 'thread':
        this.pluck({ f: 165 * r, bright: true, dur: 0.3, vol: 0.32, lp: 1800, bus: this.sfxGain });
        this.burst({ type: 'bandpass', f0: 1400, f1: 700, q: 3, dur: 0.06, vol: 0.07 });
        break;
      case 'snap':
        this.pluck({ f: 392 * r, bright: true, dur: 0.08, vol: 0.28, lp: 2200, bus: this.sfxGain });
        this.osc({ type: 'triangle', f0: 600, f1: 150, dur: 0.16, vol: 0.06, glide: 0.12 });
        break;
      case 'leapTell':
        this.osc({ type: 'triangle', f0: 130 * r, f1: 262, dur: 0.68, vol: 0.08, atk: 0.6, glide: 0.66, lp: 1200 });
        this.burst({ type: 'bandpass', f0: 400, f1: 1000, q: 2, dur: 0.68, vol: 0.07, atk: 0.6 });
        break;
      case 'leap':
        this.burst({ type: 'bandpass', f0: 400, f1: 1600, q: 1.5, dur: 0.26, vol: 0.28 });
        this.osc({ type: 'sawtooth', f0: 90 * r, f1: 200, dur: 0.22, vol: 0.1, lp: 700, glide: 0.2 });
        break;
      case 'wardRev':
        this.osc({ type: 'square', f0: 147 * r, f1: 220, dur: 0.68, vol: 0.045, atk: 0.55, glide: 0.65, lp: 650 });
        this.osc({ type: 'square', f0: 155 * r, f1: 232, dur: 0.68, vol: 0.045, atk: 0.55, glide: 0.65, lp: 650 });
        this.osc({ type: 'sine', f0: 294 * r, f1: 440, dur: 0.68, vol: 0.035, atk: 0.55, glide: 0.65, verb: 0.3 });
        break;
      case 'wardPush':
        this.burst({ brown: true, type: 'lowpass', f0: 140, f1: 800, q: 1.4, dur: 0.88, vol: 0.24, atk: 0.8 });
        this.osc({ type: 'sine', f0: 55 * r, f1: 110, dur: 0.88, vol: 0.09, atk: 0.8, glide: 0.85 });
        this.osc({ type: 'square', f0: 110 * r, f1: 220, dur: 0.88, vol: 0.025, atk: 0.8, glide: 0.85, lp: 500 });
        break;
      case 'wardBlast':
        this.burst({ brown: true, type: 'lowpass', f0: 1100, f1: 140, dur: 0.3, vol: 0.5, shape: this.soft, verb: 0.2 });
        this.osc({ type: 'sine', f0: 95 * r, f1: 38, dur: 0.28, vol: 0.32 });
        break;
      case 'hiveTell':
        this.osc({ type: 'sawtooth', f0: 110 * r, f1: 165, dur: 0.78, vol: 0.06, atk: 0.7, glide: 0.75, lp: 700, lp1: 1300 });
        this.osc({ type: 'sawtooth', f0: 116.5 * r, f1: 174, dur: 0.78, vol: 0.05, atk: 0.7, glide: 0.75, lp: 700 });
        this.burst({ type: 'bandpass', f0: 500, f1: 900, q: 4, dur: 0.78, vol: 0.06, atk: 0.7 });
        break;
      case 'swarm':
        for (k = 0; k < 4; k++) {
          var sf = (150 + k * 22 + Math.random() * 20) * r;
          this.osc({ t: now + k * 0.05, type: 'sawtooth', f0: sf, f1: sf * 1.25, dur: 0.22, vol: 0.04, lp: 1100, glide: 0.2 });
        }
        this.burst({ brown: true, type: 'lowpass', f0: 700, f1: 200, dur: 0.18, vol: 0.2 });
        break;
      case 'spit':
        this.osc({ type: 'sine', f0: 260 * r, f1: 620, dur: 0.12, vol: 0.2, glide: 0.08 });
        this.burst({ type: 'bandpass', f0: 900 * r, f1: 400, q: 2, dur: 0.08, vol: 0.15 });
        break;
      case 'acid':
        this.osc({ type: 'sine', f0: 180 * r, f1: 70, dur: 0.14, vol: 0.16 });
        this.burst({ type: 'bandpass', f0: 1500 * r, f1: 1100, q: 1.2, dur: 0.42, vol: 0.07, atk: 0.06 });
        break;
      case 'larvae':
        this.burst({ brown: true, type: 'lowpass', f0: 800, f1: 200, dur: 0.2, vol: 0.25 });
        for (k = 0; k < 5; k++) {
          var lf = (560 + Math.random() * 300) * r;
          this.osc({ t: now + 0.03 + k * 0.045, type: 'triangle', f0: lf, f1: lf * 1.4, dur: 0.04, vol: 0.04, glide: 0.035 });
        }
        break;
      case 'larvaFuse':
        this.burst({ type: 'bandpass', f0: 700 * r, f1: 1700, q: 3, dur: 0.54, vol: 0.06, atk: 0.48 });
        this.osc({ type: 'triangle', f0: 300 * r, f1: 600, dur: 0.54, vol: 0.03, atk: 0.48, glide: 0.52 });
        break;
      case 'pop':
        this.burst({ brown: true, type: 'lowpass', f0: 1000 * r, f1: 200, dur: 0.15, vol: 0.32 });
        this.osc({ type: 'sine', f0: 230 * r, f1: 80, dur: 0.12, vol: 0.14 });
        break;
      case 'titanTell':
        this.osc({ type: 'sine', f0: 38 * r, f1: 76, dur: 0.68, vol: 0.1, atk: 0.6, glide: 0.66 });
        this.osc({ type: 'sawtooth', f0: 41 * r, f1: 82, dur: 0.68, vol: 0.07, atk: 0.6, glide: 0.66, lp: 260, shape: this.soft });
        this.burst({ brown: true, type: 'lowpass', f0: 120, f1: 450, dur: 0.68, vol: 0.18, atk: 0.6 });
        break;
      case 'quake':
        this.burst({ brown: true, type: 'lowpass', f0: 700, f1: 60, dur: 0.48, vol: 0.7, shape: this.soft, verb: 0.35 });
        this.osc({ type: 'sine', f0: 52, f1: 24, dur: 0.45, vol: 0.45 });
        for (k = 0; k < 3; k++) this.burst({ t: now + 0.08 + k * 0.07, brown: true, type: 'bandpass', f0: 500 + Math.random() * 300, q: 2, dur: 0.05, vol: 0.12 });
        break;
      case 'rockTell':
        this.osc({ type: 'sawtooth', f0: 62 * r, f1: 98, dur: 0.58, vol: 0.07, atk: 0.48, glide: 0.55, lp: 420, shape: this.soft });
        this.burst({ brown: true, type: 'bandpass', f0: 300, f1: 650, q: 2, dur: 0.58, vol: 0.12, atk: 0.48 });
        break;
      case 'rockThrow':
        this.burst({ t: now + 0.2, brown: true, type: 'bandpass', f0: 250, f1: 650, q: 1.6, dur: 0.78, vol: 0.32, atk: 0.7 });
        this.burst({ brown: true, type: 'lowpass', f0: 600, f1: 150, dur: 0.16, vol: 0.2 });
        break;
      case 'rockLand':
        this.burst({ brown: true, type: 'lowpass', f0: 900, f1: 110, dur: 0.32, vol: 0.55, shape: this.soft, verb: 0.25 });
        this.osc({ type: 'sine', f0: 72 * r, f1: 34, dur: 0.3, vol: 0.32 });
        this.burst({ type: 'bandpass', f0: 850 * r, q: 3, dur: 0.05, vol: 0.12 });
        break;
      case 'blinkTell':
        this.burst({ type: 'bandpass', f0: 800, f1: 2000, q: 1.5, dur: 0.44, vol: 0.07, atk: 0.38 });
        this.osc({ type: 'sine', f0: 523 * r, f1: 1046, dur: 0.44, vol: 0.035, atk: 0.38, glide: 0.42, verb: 0.4 });
        break;
      case 'blink':
        this.osc({ type: 'sine', f0: 1100 * r, f1: 280, dur: 0.12, vol: 0.16, glide: 0.1, verb: 0.3 });
        this.burst({ type: 'bandpass', f0: 1600, f1: 500, q: 1.5, dur: 0.12, vol: 0.2 });
        break;
      case 'decoy':
        this.osc({ type: 'triangle', f0: 440 * r, f1: 392, dur: 0.45, vol: 0.06, verb: 0.5 });
        this.osc({ type: 'triangle', f0: 440 * r, f1: 494, dur: 0.45, vol: 0.06, verb: 0.5 });
        this.burst({ type: 'bandpass', f0: 1200, f1: 600, q: 1, dur: 0.3, vol: 0.05, atk: 0.05 });
        break;
      case 'decoyPop':
        this.burst({ type: 'bandpass', f0: 2100 * r, f1: 900, q: 2, dur: 0.14, vol: 0.22 });
        this.osc({ type: 'triangle', f0: 880 * r, f1: 260, dur: 0.2, vol: 0.12, glide: 0.18 });
        break;
      case 'rushTell':
        this.osc({ type: 'sawtooth', f0: 220 * r, f1: 440, dur: 0.48, vol: 0.05, atk: 0.42, glide: 0.46, lp: 1200 });
        this.burst({ type: 'bandpass', f0: 900, f1: 1900, q: 4, dur: 0.48, vol: 0.08, atk: 0.42 });
        break;
      case 'slash':
        this.burst({ type: 'bandpass', f0: 2300 * r, f1: 600, q: 2, dur: 0.2, vol: 0.3 });
        this.osc({ type: 'sawtooth', f0: 300 * r, f1: 110, dur: 0.16, vol: 0.1, lp: 1400, glide: 0.14 });
        break;
      case 'rainTell':
        this.osc({ t: now + 0.3, type: 'sawtooth', f0: 82 * r, f1: 123, dur: 0.78, vol: 0.035, atk: 0.7, glide: 0.75, lp: 600 });
        for (k = 0; k < 6; k++) {
          this.burst({ t: now + 0.3 + 0.75 * (1 - Math.pow(0.72, k + 1)) / 0.86, type: 'bandpass', f0: (900 + k * 90) * r, q: 7, dur: 0.05, vol: 0.09 + k * 0.02 });
        }
        break;
      case 'scrapLand':
        this.burst({ brown: true, type: 'lowpass', f0: 1000, f1: 160, dur: 0.2, vol: 0.38, shape: this.soft });
        this.burst({ type: 'bandpass', f0: 950 * r, q: 6, dur: 0.16, vol: 0.09 });
        this.osc({ type: 'sine', f0: 120 * r, f1: 60, dur: 0.16, vol: 0.14 });
        break;
      case 'scrapWall':
        this.burst({ brown: true, type: 'lowpass', f0: 800, f1: 90, dur: 0.36, vol: 0.5, shape: this.soft, verb: 0.3 });
        this.osc({ type: 'sine', f0: 70 * r, f1: 32, dur: 0.32, vol: 0.3 });
        this.burst({ t: now + 0.1, brown: true, type: 'bandpass', f0: 600, q: 2, dur: 0.08, vol: 0.12 });
        break;
      case 'scrapBack':
        this.burst({ type: 'bandpass', f0: 500 * r, f1: 1400, q: 3, dur: 0.34, vol: 0.08, atk: 0.26 });
        this.osc({ type: 'sawtooth', f0: 130 * r, f1: 260, dur: 0.34, vol: 0.03, atk: 0.26, lp: 900 });
        break;
      case 'collapse':
        this.burst({ brown: true, type: 'lowpass', f0: 500, f1: 70, dur: 0.8, vol: 0.4, shape: this.soft, verb: 0.5 });
        this.osc({ type: 'sine', f0: 46, f1: 26, dur: 0.75, vol: 0.26 });
        this.osc({ type: 'sawtooth', f0: 55, f1: 41, dur: 0.7, vol: 0.16, lp: 300, verb: 0.4 });
        for (k = 0; k < 4; k++) this.burst({ t: now + 0.1 + k * 0.13 + Math.random() * 0.04, type: 'bandpass', f0: 700 + Math.random() * 500, q: 5, dur: 0.06, vol: 0.07 });
        break;
      case 'beetleTell':
        for (k = 0; k < 6; k++) {
          this.osc({ t: now + 0.95 * (1 - Math.pow(0.7, k)) / 0.88, type: 'square', f0: 660 + k * 30, dur: 0.035, vol: 0.035, lp: 1400 });
        }
        this.burst({ type: 'bandpass', f0: 600, f1: 1400, q: 2, dur: 0.95, vol: 0.05, atk: 0.85 });
        break;
      case 'beetleBoom':
        this.burst({ brown: true, type: 'lowpass', f0: 1400 * r, f1: 150, dur: 0.3, vol: 0.5, shape: this.soft, verb: 0.2 });
        this.osc({ type: 'sine', f0: 110 * r, f1: 40, dur: 0.25, vol: 0.28 });
        break;
      case 'rope':
        this.osc({ type: 'square', f0: 140 * r, f1: 90, dur: 0.2, vol: 0.06, lp: 900 });
        this.burst({ type: 'bandpass', f0: 1300 * r, q: 5, dur: 0.12, vol: 0.12, shape: this.soft });
        this.burst({ t: now + 0.05, type: 'bandpass', f0: 1700 * r, q: 6, dur: 0.06, vol: 0.06 });
        break;
      case 'linkPass':
        this.osc({ type: 'sine', f0: 520 * r, f1: 780, dur: 0.1, vol: 0.04, glide: 0.06 });
        break;
      case 'lockClick':
        this.burst({ type: 'bandpass', f0: 1250 * r, q: 4, dur: 0.03, vol: 0.5 });
        this.osc({ type: 'sine', f0: 1180 * r, dur: 0.045, vol: 0.05 });
        this.osc({ type: 'sine', f0: 1730 * r, dur: 0.03, vol: 0.025 });
        this.burst({ t: now + 0.025, type: 'bandpass', f0: 800 * r, q: 4, dur: 0.04, vol: 0.35 });
        this.osc({ t: now + 0.025, type: 'triangle', f0: 240 * r, f1: 170, dur: 0.06, vol: 0.03 });
        break;
      case 'lockDone':
        this.burst({ brown: true, type: 'lowpass', f0: 900, f1: 140, dur: 0.22, vol: 0.32, shape: this.soft });
        this.burst({ type: 'bandpass', f0: 640 * r, q: 5, dur: 0.1, vol: 0.08 });
        this.osc({ type: 'sine', f0: 92 * r, f1: 55, dur: 0.3, vol: 0.22 });
        this.osc({ t: now + 0.04, type: 'sawtooth', f0: 110 * r, f1: 104, dur: 0.45, vol: 0.05, atk: 0.02, lp: 420, lp1: 260, verb: 0.3 });
        break;
      case 'lockJoin':
        this.burst({ brown: true, type: 'bandpass', f0: 600 * r, q: 3, dur: 0.1, vol: 0.14 });
        this.osc({ type: 'triangle', f0: 196 * r, f1: 294, dur: 0.16, vol: 0.06, glide: 0.12 });
        this.osc({ t: now + 0.06, type: 'triangle', f0: 247 * r, f1: 370, dur: 0.14, vol: 0.045, glide: 0.1 });
        break;
      case 'cableBlock':
        this.pluck({ f: 98 * r, dur: 0.18, vol: 0.13, lp: 700, bus: this.sfxGain });
        this.burst({ brown: true, type: 'bandpass', f0: 480 * r, q: 4, dur: 0.03, vol: 0.05 });
        break;
      case 'cableBurn':
        this.burst({ type: 'bandpass', f0: 600, f1: 1500, q: 1.1, dur: 0.72, vol: 0.16, atk: 0.5 });
        this.burst({ brown: true, type: 'lowpass', f0: 500, f1: 1100, q: 0.7, dur: 0.7, vol: 0.12, atk: 0.4 });
        this.osc({ type: 'sawtooth', f0: 58 * r, f1: 72, dur: 0.72, vol: 0.04, atk: 0.4, glide: 0.6, lp: 240 });
        break;
      case 'rollTell':
        for (k = 0; k < 7; k++) {
          this.burst({ t: now + 0.92 * (1 - Math.pow(0.75, k)) / 0.87, brown: true, type: 'bandpass', f0: 420 + k * 40, q: 2.5, dur: 0.05, vol: 0.1 + k * 0.02 });
        }
        this.osc({ type: 'sawtooth', f0: 48 * r, f1: 80, dur: 0.95, vol: 0.06, atk: 0.85, glide: 0.9, lp: 350 });
        break;
      case 'roll':
        this.osc({ type: 'sawtooth', f0: 65 * r, f1: 115, dur: 0.38, vol: 0.12, lp: 500, glide: 0.3, shape: this.soft });
        this.burst({ brown: true, type: 'lowpass', f0: 400, f1: 250, dur: 0.38, vol: 0.25, atk: 0.03 });
        break;
      case 'rollCrash':
        this.burst({ brown: true, type: 'lowpass', f0: 1300, f1: 120, dur: 0.4, vol: 0.55, shape: this.soft, verb: 0.3 });
        this.burst({ type: 'bandpass', f0: 700 * r, q: 3, dur: 0.18, vol: 0.12 });
        this.osc({ type: 'sine', f0: 80 * r, f1: 35, dur: 0.32, vol: 0.3 });
        break;
      case 'muteTell':
        this.burst({ type: 'lowpass', f0: 2400, f1: 300, q: 2, dur: 0.95, vol: 0.12, atk: 0.85 });
        this.osc({ type: 'triangle', f0: 330 * r, f1: 165, dur: 0.95, vol: 0.04, atk: 0.85, glide: 0.9 });
        break;
      case 'unmute':
        this.burst({ type: 'lowpass', f0: 300, f1: 2200, q: 1.5, dur: 0.28, vol: 0.09, atk: 0.04 });
        this.osc({ type: 'sine', f0: 392 * r, f1: 784, dur: 0.22, vol: 0.06, glide: 0.16, verb: 0.3 });
        break;
      case 'bubble':
        this.osc({ type: 'sine', f0: 360 * r, f1: 1100, dur: 0.09, vol: 0.12, glide: 0.06 });
        this.osc({ t: now + 0.05, type: 'triangle', f0: 900 * r, f1: 300, dur: 0.14, vol: 0.05, glide: 0.12, verb: 0.3 });
        this.burst({ t: now + 0.04, type: 'bandpass', f0: 1600, q: 1.5, dur: 0.08, vol: 0.06 });
        break;
      case 'fuse':
        this.burst({ type: 'bandpass', f0: 1100, f1: 2200, q: 2, dur: 0.95, vol: 0.06, atk: 0.85 });
        this.osc({ type: 'sine', f0: 62 * r, f1: 124, dur: 0.95, vol: 0.11, atk: 0.85, glide: 0.9 });
        break;
      case 'rep':
        this.burst({ brown: true, type: 'lowpass', f0: 1200, f1: 100, dur: 0.5, vol: 0.3, shape: this.soft, verb: 0.4 });
        this.osc({ type: 'sine', f0: 55, f1: 32, dur: 0.5, vol: 0.22 });
        this.osc({ t: now + 0.1, type: 'sawtooth', f0: 82.4, f1: 69.3, dur: 0.6, vol: 0.2, atk: 0.05, lp: 320, lp1: 900, verb: 0.5 });
        break;
      case 'deny':
        this.osc({ type: 'square', f0: 110, dur: 0.08, vol: 0.12, lp: 700 });
        this.osc({ t: now + 0.11, type: 'square', f0: 104, dur: 0.1, vol: 0.12, lp: 700 });
        break;
      case 'barrel':
        this.burst({ brown: true, type: 'lowpass', f0: 1100, f1: 160, dur: 0.4, vol: 0.45, shape: this.soft, verb: 0.25 });
        this.osc({ type: 'sine', f0: 85, f1: 40, dur: 0.3, vol: 0.25 });
        break;
      case 'wave':
        [[110, 0], [146.8, 0.2]].forEach(function (n) {
          self.osc({ t: now + n[1], type: 'sawtooth', f0: n[0], dur: 0.3, vol: 0.16, atk: 0.03, lp: 700, lp1: 1200, verb: 0.35 });
          self.osc({ t: now + n[1], type: 'square', f0: n[0] / 2, dur: 0.3, vol: 0.07, atk: 0.04, lp: 260 });
        });
        this.osc({ type: 'sine', f0: 60, f1: 38, dur: 0.5, vol: 0.28 });
        break;
      case 'aggro':
        this.osc({ type: 'sawtooth', f0: 90, f1: 45, dur: 1.1, vol: 0.3 });
        break;
      case 'over':
        this.osc({ type: 'sawtooth', f0: 210, f1: 32, dur: 1.5, vol: 0.28, lp: 1600, lp1: 140, shape: this.soft, verb: 0.4 });
        for (k = 0; k < 5; k++) this.burst({ t: now + 0.2 + k * k * 0.06, brown: true, type: 'lowpass', f0: 600, dur: 0.08, vol: 0.3 - k * 0.05 });
        break;
    }
  },

  mus: {
    vol: 1.4,
    bossAmb: 0.5,
    drums: 1,
    pad: 0.046,
    drone: 0.045,
    wind: 0.12,
    mel: 0.15,
    melCut: 2200,
    echo: 0.32,
    tempo: 1,
    tone: '',
    minPiece: 40,
    acc: 1.3,
    accOften: 1,
    accTail: 1.6,
    accUp: 1,
    lead: 1,
    leadAt: 0.5,
    sync: 1.8,
    follow: 0.75,
    arp: 0.25,
    arpShare: 0.5,
    arpStep: 0.2,
    arpCut: 1050,
    arpNight: 0.6,
    arpBass: 0,
    arpHot: 1,
    fzForm: 1,
    likeBias: 0.5,
    likeMenu: 1,
    leadKey: 1,
    avoid: 1,
    cut: 1,
    night: 0.35,
    heart: 0.16,
    drumIn: 5,
    drumOut: 8
  },

  motifs: [
    { n: 'подъем', q: 1, m: [[0, 0, 1], [1, 1, 1], [2, 2, 2], [4, 4, 4]] },
    { n: 'качели', q: 1, m: [[0, 4, 1], [1, 2, 1], [2, 4, 1], [3, 5, 1], [4, 4, 3]] },
    { n: 'звезда', q: 1, m: [[0, 7, 2], [2, 6, 1], [3, 4, 1], [4, 2, 2], [6, 4, 2]] },
    { n: 'шаг', q: 1, m: [[0, 2, 2], [2, 4, 1], [3, 3, 1], [4, 2, 2], [6, 1, 2]] },
    { n: 'долгая', q: 1, m: [[0, 4, 3], [3, 5, 1], [4, 4, 2], [6, 3, 2]] },
    { n: 'широкий', q: 1, m: [[0, 0, 1], [1, 4, 1], [2, 7, 3], [5, 6, 1], [6, 4, 2]] },
    { n: 'ручей', q: 1, m: [[0, 2, 1], [1, 3, 1], [2, 4, 1], [3, 3, 1], [4, 2, 2], [6, 4, 1], [7, 3, 1]] },
    { n: 'спуск', q: 0, m: [[0, 4, 1], [1, 3, 1], [2, 2, 1], [3, 1, 1], [4, 0, 4]] },
    { n: 'вздох', q: 0, m: [[0, 2, 1.5], [1.5, 1, 0.5], [2, 0, 3], [5, -1, 1], [6, 0, 2]] },
    { n: 'колыбель', q: 0, m: [[0, 4, 1], [1, 2, 2], [4, 4, 1], [5, 2, 1], [6, 0, 2]] },
    { n: 'капля', q: 0, m: [[0, 0, 0.5], [0.5, 2, 0.5], [1, 4, 2], [4, 3, 1], [5, 2, 3]] },
    { n: 'дом', q: 0, m: [[0, 7, 1], [1, 6, 1], [2, 4, 2], [4, 5, 1], [5, 4, 1], [6, 2, 2]] },
    { n: 'круг', q: 0, m: [[0, 2, 1], [1, 1, 1], [2, 0, 2], [4, 1, 1], [5, 2, 1], [6, 0, 2]] },
    { n: 'эхо', q: 0, m: [[0, 4, 2], [2, 2, 2], [4, 4, 1], [5, 3, 1], [6, 2, 2]] },
    { n: 'надежда', q: 1, h: 1, m: [[0, 0, 1], [1, 1, 1], [2, 2, 1], [3, 4, 1], [4, 7, 2], [6, 5, 2]] },
    { n: 'рассвет', q: 1, h: 1, m: [[0, 2, 1], [1, 4, 1], [2, 7, 2], [4, 5, 1], [5, 4, 1], [6, 2, 2]] },
    { n: 'вера', q: 0, h: 1, m: [[0, 4, 1], [1, 5, 1], [2, 4, 1], [3, 2, 1], [4, 1, 1], [5, 2, 1], [6, 0, 2]] },
    { n: 'тепло', q: 0, h: 1, m: [[0, 1, 1], [1, 2, 1], [2, 4, 2], [4, 2, 1], [5, 1, 1], [6, 0, 2]] }
  ],
  tailM: [[0, 2, 3], [4, 0, 4]],
  scMin: [0, 2, 3, 5, 7, 8, 10],
  scMaj: [0, 2, 4, 5, 7, 9, 11],
  tones: {
    piano: { h: [0, 1, 0.42, 0.2, 0.1, 0.05, 0.025], br: 5, dk: 1.3, atk: 0.008, rel: 0.7, bell: 0, reg: 0 },
    bell: { h: [0, 1, 0.1, 0.05, 0, 0.015], br: 3, dk: 1.9, atk: 0.009, rel: 1.0, bell: 2.76, bv: 0.17, btc: 0.26, reg: 1 },
    box: { h: [0, 1, 0.08, 0.04], br: 3, dk: 0.9, atk: 0.003, rel: 0.6, bell: 4.07, bv: 0.16, btc: 0.12, reg: 7 }
  },

  bpm: 96,
  nextT: 0,
  step16: 0,
  layer: 0,
  mood: 0,
  hot: false,
  E1: 41.2,
  mb: null,
  pc: null,
  mrs: 0,

  degMin: [[0, 1, 5], [8, 0, 4], [3, 0, 3], [5, 1, 3], [10, 0, 2], [5, 0, 1], [7, 1, 1]],
  degMaj: [[0, 0, 5], [9, 1, 4], [5, 0, 3], [4, 1, 2], [2, 1, 2], [7, 0, 1]],
  fluteMin: [0, 2, 3, 5, 7, 8, 10, 12, 14, 15],
  fluteMaj: [0, 2, 4, 5, 7, 9, 11, 12, 14, 16],
  vShapes: [[0, 100, 7, 12], [0, 7, 112, 19], [0, 7, 14, 112], [0, 100, 7, 200]],
  vLv: [1, 0.85, 0.75, 0.6],
  lowDay: [0, 6, 8, 14],
  lowNight: [0, 8],
  perms: null,

  note: function (base, semi) { return base * Math.pow(2, semi / 12); },

  mr: function () {
    this.mrs = (this.mrs * 1664525 + 1013904223) % 4294967296;
    return this.mrs / 4294967296;
  },
  pr: function () {
    this.prs = (this.prs * 1664525 + 1013904223) % 4294967296;
    return this.prs / 4294967296;
  },
  wantKills: function () { return (window.Game && Game.bossKills) | 0; },

  favPiece: { fav: 1, seed: 1239734142, tonic: 1, minor: false, prog: [0, 1, 2, 1], bpm: 43.4, cut: 741, q: 1.29,
    det: 6.2, wob: 5.9, voice: 0, tone: 'piano', center: 62, hope: 1 },
  likePiece: { seed: 3753746610, from: { tonic: 1, minor: false, tone: 'piano', mot: [14, 17, 5], prog: [0, 1, 2, 1] } },

  arpPat: {
    3: [[0, 2, 3, 2, 4, 2], [0, 1, 2, 3, 2, 1], [0, 2, 4, 3, 2, -1]],
    4: [[0, 2, 3, 2, 4, 2, 3, 2], [0, 2, 1, 2, 3, 2, 1, 2], [0, -1, 2, 3, -1, 2, 4, 2], [0, 3, 2, 3, 1, 3, 2, 3]],
    6: [[0, 2, 3, 2, 4, 2, 0, 2, 3, 5, 3, 2], [0, 1, 2, 3, 2, 1, 0, 2, 4, 3, 2, -1],
      [0, 2, 3, 4, 3, 2, 1, 2, 3, 5, 3, 2], [0, 3, 2, 4, 3, 2, 0, 3, 2, 5, 4, 3]]
  },
  arpArc: { 'развитие': [[0.15, 0.35], [0.35, 0.5], [0.5, 0.65], [0.65, 0.8]], 'вершина': [[0.85, 1], [1, 1]] },

  wantLayer: function () {
    if (!Game.running || Game.over) return 0;
    if (window.Finale && Finale.frenzy()) return 3;
    if (Game.activeBoss && Game.activeBoss()) return 3;
    if (Game.time > 75 || Game.enemies.length > 70) return 2;
    return 1;
  },
  wantMood: function () {
    return (typeof View3D !== 'undefined' && View3D.on && Game.running) ? View3D.dark : 0;
  },
  wantHot: function () { return !!(window.Finale && Finale.frenzy() && Game.running); },
  wantFz: function () {
    if (!window.Finale || !Finale.frenzy() || !Game.running) return null;
    return { el: Game.time - Finale.t0, len: Math.max(30, Finale.t - Finale.t0), rep: !!(Finale.repAlive && Finale.repAlive()) };
  },
  sh: function (seed, j) {
    var x = (seed + j * 104729 + 17) % 4294967296;
    for (var i = 0; i < 3; i++) x = (x * 1664525 + 1013904223) % 4294967296;
    return x / 4294967296;
  },

  music: function () {
    var c = this.ctx;
    if (!c || c.state !== 'running' || this.musDead) return;
    try { this.musicRun(); } catch (e) {
      this.musDead = true;
      if (window.console) console.error('music', e);
    }
  },

  musicRun: function () {
    var now = this.ctx.currentTime;
    if (!this.mb) this.musBuild();
    if (now >= this.tickT) {
      this.ambTick(now);
      this.tickT = now + 0.25;
    }
    if (this.drumOn || this.drumLv > 0) this.drumRun(now);
  },

  musBuild: function () {
    var c = this.ctx, i;
    if (!this.mrs) this.mrs = Date.now() % 4294967296;
    if (!this.perms) {
      var out = [], a = [0, 1, 2, 3];
      var go = function (k) {
        if (k === 4) { out.push(a.slice()); return; }
        for (var j = k; j < 4; j++) {
          var x = a[k]; a[k] = a[j]; a[j] = x;
          go(k + 1);
          x = a[k]; a[k] = a[j]; a[j] = x;
        }
      };
      go(0);
      this.perms = out;
    }
    this.vf = [0, 0, 0, 0];
    this.drumOn = false; this.drumLv = 0; this.heartLv = 0; this.heartT = 0;
    this.tickT = 0; this.tickLast = c.currentTime; this.step16 = 0; this.nextT = 0;
    this.mq = []; this.killSeen = this.wantKills(); this.nightSt = false; this.lastL = 0; this.favWant = false;
    var pan = function (p) {
      if (!c.createStereoPanner) return c.createGain();
      var n = c.createStereoPanner();
      n.pan.value = p;
      return n;
    };
    var mb = this.mb = { aim: {} };
    mb.bus = c.createGain();
    mb.bus.gain.value = 0;
    mb.bus.connect(this.musGain);
    var vs = c.createGain();
    vs.gain.value = 0.5;
    mb.bus.connect(vs);
    vs.connect(this.musVerb);

    var wind = c.createBufferSource();
    wind.buffer = this.brown;
    wind.loop = true;
    var wf = c.createBiquadFilter();
    wf.type = 'bandpass';
    wf.frequency.value = 420;
    wf.Q.value = 0.7;
    var wl = c.createOscillator(), wlg = c.createGain();
    wl.frequency.value = 0.06;
    wlg.gain.value = 200;
    wl.connect(wlg);
    wlg.connect(wf.frequency);
    mb.wind = c.createGain();
    mb.wind.gain.value = 0;
    wind.connect(wf);
    wf.connect(mb.wind);
    mb.wind.connect(mb.bus);

    var wob = c.createOscillator();
    wob.frequency.value = 0.11;
    mb.wob = c.createGain();
    mb.wob.gain.value = 4;
    wob.connect(mb.wob);

    mb.d1 = c.createOscillator();
    mb.d2 = c.createOscillator();
    mb.d1.type = 'sawtooth';
    mb.d2.type = 'triangle';
    mb.d1.frequency.value = 41.2;
    mb.d2.frequency.value = 164.8;
    mb.d2.detune.value = 6;
    var d2g = c.createGain();
    d2g.gain.value = 0.3;
    mb.dlp = c.createBiquadFilter();
    mb.dlp.type = 'lowpass';
    mb.dlp.frequency.value = 280;
    mb.dg = c.createGain();
    mb.dg.gain.value = 0;
    mb.d1.connect(mb.dlp);
    mb.d2.connect(d2g);
    d2g.connect(mb.dg);
    mb.dlp.connect(mb.dg);
    mb.dg.connect(mb.bus);
    mb.wob.connect(mb.d1.detune);
    mb.wob.connect(mb.d2.detune);

    mb.lp = c.createBiquadFilter();
    mb.lp.type = 'lowpass';
    mb.lp.frequency.value = 700;
    mb.lp.connect(mb.bus);
    var pl = pan(-0.85), pr = pan(0.85);
    pl.connect(mb.lp);
    pr.connect(mb.lp);
    mb.v = [];
    for (i = 0; i < 4; i++) {
      var v = { f: 200, oL: c.createOscillator(), oR: c.createOscillator(), gL: c.createGain(), gR: c.createGain() };
      v.oL.type = v.oR.type = 'sawtooth';
      v.gL.gain.value = v.gR.gain.value = 0;
      v.oL.connect(v.gL);
      v.oR.connect(v.gR);
      v.gL.connect(pl);
      v.gR.connect(pr);
      mb.wob.connect(v.oL.detune);
      mb.wob.connect(v.oR.detune);
      v.oL.start();
      v.oR.start();
      mb.v.push(v);
    }

    mb.keys = c.createGain();
    mb.keys.connect(mb.bus);
    var es = mb.es = c.createGain();
    es.gain.value = this.mus.echo;
    mb.keys.connect(es);
    var dL = mb.dL = c.createDelay(1), dR = mb.dR = c.createDelay(1);
    var lL = c.createBiquadFilter(), lR = c.createBiquadFilter();
    var fL = c.createGain(), fR = c.createGain();
    dL.delayTime.value = 0.47;
    dR.delayTime.value = 0.71;
    lL.frequency.value = lR.frequency.value = 1000;
    fL.gain.value = fR.gain.value = 0.42;
    es.connect(dL);
    dL.connect(lL); lL.connect(fL); fL.connect(dR);
    dR.connect(lR); lR.connect(fR); fR.connect(dL);
    var mg = c.createChannelMerger(2);
    lL.connect(mg, 0, 0);
    lR.connect(mg, 0, 1);
    mg.connect(mb.bus);
    mb.wMel = {};
    for (var tn in this.tones) {
      var th = this.tones[tn].h;
      mb.wMel[tn] = c.createPeriodicWave(new Float32Array(th.length), new Float32Array(th));
    }

    mb.drum = c.createGain();
    mb.drum.gain.value = 0;
    mb.fz = c.createGain();
    mb.fz.gain.value = 1;
    mb.drum.connect(mb.fz);
    mb.fz.connect(this.musGain);
    mb.arp = c.createGain();
    mb.arp.gain.value = 1;
    mb.arp.connect(mb.keys);
    this.arpT = 0; this.arpS = null; this.arpN = null; this.fzLv = 1; this.fzDip = 0; this.fzA = 0; this.fzOn = false;
    var dv = c.createGain();
    dv.gain.value = 0.25;
    mb.fz.connect(dv);
    dv.connect(this.musVerb);

    wind.start(0, Math.random() * 1.5);
    wl.start();
    wob.start();
    mb.d1.start();
    mb.d2.start();

    this.pc = this.makePiece(null, false, this.noFav ? null : this.favPiece);
    this.pieceStart(c.currentTime + 0.1, true);
  },

  makePiece: function (prev, night, o) {
    o = o || {};
    var seed = o.seed !== undefined ? o.seed : Math.floor(this.mr() * 4294967296);
    this.prs = seed;
    var self = this, r = function () { return self.pr(); };
    var M = this.mus, tonic, minor, i, x, tot, last;
    if (o.tonic !== undefined) { tonic = o.tonic; minor = !!o.minor; }
    else if (!prev) {
      tonic = Math.floor(r() * 12);
      minor = r() < (night ? 0.8 : 0.55);
    } else {
      tonic = prev.tonic;
      minor = prev.minor;
      if (night) {
        if (!minor) { tonic += 9; minor = true; } else tonic += r() < 0.5 ? 5 : 7;
      } else if (r() < (prev.minor ? 0.5 : 0.6)) {
        if (r() < 0.65) tonic += prev.minor ? 3 : 9;
        minor = !prev.minor;
      } else tonic += r() < 0.5 ? 5 : 7;
      tonic %= 12;
    }
    var deg = minor ? this.degMin : this.degMaj, prog;
    if (o.prog) prog = o.prog.slice();
    else if (r() < 0.4) {
      prog = minor ? [0, 2, r() < 0.6 ? 1 : 3, 2] : [0, 1, r() < 0.65 ? 2 : 4, 1];
    } else {
      prog = [r() < 0.7 ? 0 : (r() < 0.5 ? 1 : 3)];
      var w = function (i, n, last) {
        if (i === last) return 0;
        if (i === 0) return n === 2 ? 2 : 0;
        return deg[i][2];
      };
      while (prog.length < 4) {
        last = prog[prog.length - 1];
        tot = 0;
        for (i = 0; i < deg.length; i++) tot += w(i, prog.length, last);
        x = r() * tot;
        for (i = 0; i < deg.length - 1; i++) {
          x -= w(i, prog.length, last);
          if (x <= 0 && w(i, prog.length, last) > 0) break;
        }
        if (i === last) i = (i + 1) % deg.length || 1;
        prog.push(i);
      }
      var two = prog[2] === prog[0];
      if (prog[3] === prog[0] || prog[3] === prog[2] || (two && prog[3] === prog[1])) {
        x = 1 + Math.floor(r() * (deg.length - 1));
        for (i = 0; i < deg.length; i++, x = x % (deg.length - 1) + 1) {
          if (x !== prog[0] && x !== prog[2] && !(two && x === prog[1])) { prog[3] = x; break; }
        }
      }
    }
    if (prev && !o.prog && prev.tonic === tonic && prev.minor === minor && prev.prog.join() === prog.join()) {
      x = prog[1]; prog[1] = prog[2]; prog[2] = x;
    }
    var pool = night ? ['piano', 'bell'] : ['piano', 'bell', 'box'], tone = o.tone || M.tone;
    if (!tone) {
      if (prev && pool.length > 1 && pool.indexOf(prev.tone) >= 0) pool.splice(pool.indexOf(prev.tone), 1);
      tone = pool[Math.floor(r() * pool.length)];
    }
    var bpm = o.bpm || (night ? 44 + r() * 6 : 48 + r() * 12);
    var beat = 60 / (bpm * M.tempo);
    var center = o.center || ((night ? 62 : 66) + Math.floor(r() * 4) + this.tones[tone].reg);
    var hope = o.hope || (!minor && !night && r() < 0.5);
    var used = prev && !o.fav ? prev.mot : [];
    var pick = function (q, avoid) {
      var c = [], k;
      for (k = 0; k < self.motifs.length; k++) {
        var m = self.motifs[k];
        if (q >= 0 && m.q !== q) continue;
        if (avoid.indexOf(k) >= 0 || used.indexOf(k) >= 0) continue;
        if (hope && !m.h && q >= 0) continue;
        c.push(k);
      }
      if (!c.length) for (k = 0; k < self.motifs.length; k++) if (avoid.indexOf(k) < 0 && (q < 0 || self.motifs[k].q === q)) c.push(k);
      return c[Math.floor(r() * c.length)];
    };
    var mQ = pick(1, []), mA = pick(0, [mQ]), mD = pick(-1, [mQ, mA]);
    var p = {
      seed: seed, fav: !!o.fav, night: !!night,
      from: prev ? { tonic: prev.tonic, minor: prev.minor, tone: prev.tone, mot: prev.mot, prog: prev.prog } : null,
      tonic: tonic, minor: minor, prog: prog, idx: 0, k: 0,
      bpm: bpm, beat: beat, len: 8 * beat,
      t0: 0,
      cut: o.cut || 650 + r() * 450,
      q: o.q || 0.6 + r() * 1.4,
      det: o.det || 5 + r() * 3,
      wob: o.wob || 3 + r() * 4,
      voice: o.voice !== undefined ? o.voice : Math.floor(r() * 4),
      tone: tone, center: center, hope: !!hope, pan: (r() - 0.5) * 0.3,
      mot: [mQ, mA, mD],
      cutMul: 1, arcCut: 1, padLv: 1, varN: 2, breath: false, req: ''
    };
    p.plan = this.makePlan(mQ, mA, mD, r, !!o.fav);
    if (M.likeBias > 0 && o.tonic === undefined && !minor && !night && this.sh(seed, 5) < M.likeBias) {
      if (tone !== 'bell' && !M.tone && !o.tone && !(prev && prev.tone === 'bell')) {
        p.center += this.tones.bell.reg - this.tones[tone].reg;
        p.tone = 'bell';
      }
      if (p.cut < 900) p.cut = 900 + (p.cut - 650) * 0.6;
      if (p.det > 7.8) p.det = 7.8;
      p.likeLike = true;
    }
    p.arp = !!o.fav || this.sh(seed, 7) < M.arpShare * (night ? 0.5 : 1);
    p.arpP = Math.floor(this.sh(seed, 11) * 64);
    return p;
  },

  makePlan: function (Q, A, D, r, peak) {
    var S = function (sec, m, o) { o = o || {}; o.sec = sec; o.m = m; return o; };
    var plan = [
      S('вступление', Q, { frag: 2, at: 4, lv: 0.6, cut: 0.9, pad: 0.9 }),
      S('вступление', Q, { frag: 3, at: 2, lv: 0.75, cut: 0.95, pad: 0.95 }),
      S('тема', Q, { lv: 1 }),
      S('тема', A, { lv: 1 }),
      S('тема', Q, { lv: 1, v: r() < 0.5 ? 'dot' : 'orn' }),
      S('тема', A, { lv: 1, v: 'end' })
    ];
    if (r() < 0.5) plan.push(S('тема', -1, { breath: r() < 0.6 }));
    plan.push(
      S('развитие', D, { lv: 1.05, fill: 1, cut: 1.15, pad: 1.06 }),
      S('развитие', D, { lv: 1.05, fill: 1, v: r() < 0.5 ? 'end' : 'dot', cut: 1.15, pad: 1.06 }),
      S('развитие', Q, { lv: 1.1, h: 1, cut: 1.2, pad: 1.08 }),
      S('развитие', A, { lv: 1.1, h: 1, cut: 1.2, pad: 1.08 }));
    if (r() < 0.6 || peak) {
      plan.push(
        S('вершина', Q, { lv: 1.15, h: 1, o: 1, cut: 1.25, pad: 1.1 }),
        S('вершина', A, { lv: 1.15, h: 1, o: 1, cut: 1.25, pad: 1.1 }));
    }
    plan.push(
      S('затухание', A, { lv: 0.8, thin: 1, cut: 0.9, pad: 0.95 }),
      S('затухание', -2, { lv: 0.6, cut: 0.85, pad: 0.85 }),
      S('затухание', -1, { cut: 0.8, pad: 0.8 }));
    return plan;
  },

  pieceStart: function (T, first) {
    var p = this.pc, mb = this.mb, i;
    p.t0 = T;
    if (this === Snd && typeof Tracks !== 'undefined') Tracks.onStart(p);
    p.idx = 0;
    p.k = 0;
    var s = p.plan[0];
    p.arcCut = s.cut || 1;
    p.padLv = s.pad || 1;
    var df = 36.71 * Math.pow(2, ((p.tonic + 2) % 12) / 12);
    mb.d1.frequency.setTargetAtTime(df, T, first ? 0.01 : 2.5);
    mb.d2.frequency.setTargetAtTime(df * 4, T, first ? 0.01 : 2.5);
    mb.lp.Q.setTargetAtTime(p.q, T, 2);
    mb.wob.gain.setTargetAtTime(p.wob, T, 3);
    for (i = 0; i < 4; i++) {
      mb.v[i].oL.detune.setTargetAtTime(-p.det, T, 2);
      mb.v[i].oR.detune.setTargetAtTime(p.det, T, 2);
    }
    mb.dL.delayTime.setTargetAtTime(Math.min(0.98, p.beat * 0.5), T, 0.5);
    mb.dR.delayTime.setTargetAtTime(Math.min(0.98, p.beat * 0.75), T, 0.5);
    mb.es.gain.setTargetAtTime(this.mus.echo, T, 0.5);
    for (i = this.mq.length - 1; i >= 0; i--) if (this.mq[i].t > T + 0.5) this.mq.splice(i, 1);
    this.padTo(T, first ? 2 : 3);
    var t1 = T + (first ? 0 : 5);
    this.melSlot(t1, s);
    this.arpSeg(T, s);
    this.chordT = t1 + p.len;
  },

  vGain: function (v, val, t, tc) {
    v.gL.gain.setTargetAtTime(val, t, tc);
    v.gR.gain.setTargetAtTime(val, t, tc);
  },

  padTo: function (T, mode) {
    var p = this.pc, mb = this.mb, i, k, x;
    var d = (p.minor ? this.degMin : this.degMaj)[p.prog[p.idx]];
    var semi = (p.tonic + d[0]) % 12, minor = d[1];
    var root = 146.83 * Math.pow(2, ((semi + 2) % 12) / 12);
    var sh = this.vShapes[p.voice];
    for (i = 0; i < 4; i++) {
      x = sh[i];
      if (x >= 200) x = (minor ? 10 : 11) + x - 200;
      else if (x >= 100) x = (minor ? 3 : 4) + x - 100;
      this.vf[i] = root * Math.pow(2, x / 12);
    }
    var best = 0, bs = 1e9, s, pm;
    if (mode === 0 || mode === 3) {
      for (k = 0; k < this.perms.length; k++) {
        pm = this.perms[k];
        s = 0;
        for (i = 0; i < 4; i++) s += Math.abs(Math.log(this.vf[pm[i]] / mb.v[i].f));
        if (s < bs) { bs = s; best = k; }
      }
    }
    pm = this.perms[best];
    for (i = 0; i < 4; i++) {
      var v = mb.v[i], nf = this.vf[pm[i]], lv = this.mus.pad * this.vLv[pm[i]] * (p.padLv || 1);
      if (mode === 2) {
        v.oL.frequency.setValueAtTime(nf, T);
        v.oR.frequency.setValueAtTime(nf, T);
        this.vGain(v, lv, T, 2.5);
      } else if (mode === 1) {
        v.oL.frequency.setTargetAtTime(nf, T, 0.02);
        v.oR.frequency.setTargetAtTime(nf, T, 0.02);
        this.vGain(v, lv, T + 0.1, 2);
      } else if (mode === 3) {
        this.vGain(v, lv * 0.12, T, 1.3);
        v.oL.frequency.setTargetAtTime(nf, T + 3.2, 0.7);
        v.oR.frequency.setTargetAtTime(nf, T + 3.2, 0.7);
        this.vGain(v, lv, T + 4.6, 2);
      } else if (Math.abs(nf / v.f - 1) > 0.002) {
        this.vGain(v, lv * 0.3, T, 0.5);
        v.oL.frequency.setTargetAtTime(nf, T + 0.9, 0.3);
        v.oR.frequency.setTargetAtTime(nf, T + 0.9, 0.3);
        this.vGain(v, lv, T + 1.9, 1.3);
      } else this.vGain(v, lv, T, 1);
      v.f = nf;
    }
    this.lastChordT = T;
  },

  chordStep: function (T) {
    var p = this.pc, i, cur = p.plan[p.k];
    var frozen = this.drumLv >= 0.5 && !p.req && cur && cur.sec !== 'затухание';
    if (!frozen) p.k++;
    if (p.k >= p.plan.length) { this.newPiece(T); return; }
    p.idx = (p.idx + 1) % 4;
    var s = p.plan[p.k], wasB = p.breath;
    p.breath = false;
    p.arcCut = s.cut || 1;
    p.padLv = s.pad || 1;
    if (s.breath && !frozen) {
      p.breath = true;
      for (i = 0; i < 4; i++) this.vGain(this.mb.v[i], 0, T, 1.2);
      this.arpSeg(T, s);
      this.lastChordT = T;
      this.chordT = T + p.len;
      return;
    }
    if (--p.varN <= 0) this.vary(T);
    this.padTo(T, wasB ? 1 : 0);
    if (!frozen) this.melSlot(T, s);
    this.arpSeg(T, s);
    this.chordT = T + p.len;
  },

  newPiece: function (T) {
    var p = this.pc, fav = this.favWant || p.req === 'fav';
    this.favWant = false;
    if (!fav && p.fav && this.mus.likeMenu > 0 && this.layer === 0 && !this.nightSt) {
      this.favN = (this.favN || 0) + 1;
      if (this.favN % 2 === 1) {
        var lk = this.likePiece, f = lk.from;
        this.pc = this.makePiece({ tonic: f.tonic, minor: f.minor, tone: f.tone, mot: f.mot, prog: f.prog }, false, { seed: lk.seed });
        this.pc.like = 1;
        this.killSeen = this.wantKills();
        this.pieceStart(T, false);
        return;
      }
    }
    this.pc = this.makePiece(p, this.nightSt, fav ? this.favPiece : null);
    this.killSeen = this.wantKills();
    this.pieceStart(T, false);
  },

  musChange: function (why) {
    var p = this.pc;
    if (!p || p.req) return false;
    if (this.ctx.currentTime - p.t0 < this.mus.minPiece) return false;
    p.req = why;
    var cur = p.plan[p.k];
    if (cur && cur.sec === 'затухание') return true;
    p.plan = p.plan.slice(0, p.k + 1).concat([
      { sec: 'затухание', m: p.mot[1], lv: 0.8, thin: 1, cut: 0.9, pad: 0.95 },
      { sec: 'затухание', m: -2, lv: 0.6, cut: 0.85, pad: 0.85 }]);
    return true;
  },

  vary: function (T) {
    var p = this.pc, r = this.pr();
    p.varN = this.pr() < 0.5 ? 2 : 3;
    if (r < 0.5) p.voice = (p.voice + 1 + Math.floor(this.pr() * 3)) % 4;
    else p.cutMul = 0.8 + this.pr() * 0.4;
  },

  chordScale: function (p, d) {
    var sc = p.minor ? this.scMin : this.scMaj, root = d[0] % 12, j = sc.indexOf(root), cs = [], i;
    if (j < 0) j = 0;
    for (i = 0; i < 7; i++) cs.push((sc[(j + i) % 7] - root + 12) % 12);
    cs[1] = 2; cs[2] = d[1] ? 3 : 4; cs[4] = 7;
    if (cs[2] === 4 && cs[5] === 8) cs[5] = 9;
    return cs;
  },

  melShape: function (s) {
    var src = s.m === -2 ? this.tailM : this.motifs[s.m].m, a = [], i, n, b;
    for (i = 0; i < src.length; i++) a.push([src[i][0], src[i][1], src[i][2], 0]);
    if (s.frag) {
      a = a.slice(0, s.frag);
      b = a[0][0];
      for (i = 0; i < a.length; i++) a[i][0] += s.at - b;
      a[a.length - 1][2] = Math.max(a[a.length - 1][2], 8 - a[a.length - 1][0]);
    }
    if (s.thin) {
      var t = [];
      for (i = 0; i < a.length; i++) if (a[i][0] % 2 === 0) t.push(a[i]);
      for (i = 0; i < t.length; i++) t[i][2] = (i + 1 < t.length ? t[i + 1][0] : 8) - t[i][0];
      a = t;
    }
    if (s.v === 'dot') {
      for (i = 0; i < a.length - 1; i++) {
        if (a[i][2] === 1 && a[i + 1][0] === a[i][0] + 1 && a[i + 1][2] >= 1) {
          a[i][2] = 1.5; a[i + 1][0] += 0.5; a[i + 1][2] -= 0.5; i++;
        }
      }
    } else if (s.v === 'orn') {
      var o = [];
      for (i = 0; i < a.length; i++) {
        o.push(a[i]);
        n = a[i + 1];
        if (n && a[i][0] % 2 === 0 && n[0] - a[i][0] === 2 && Math.abs(n[1] - a[i][1]) === 2) {
          a[i][2] = 1;
          o.push([a[i][0] + 1, (a[i][1] + n[1]) / 2, 1, 0]);
        }
      }
      a = o;
    } else if (s.v === 'end') {
      n = a[a.length - 1];
      if (this.motifs[s.m] && this.motifs[s.m].q) n[1] = n[1] === 4 ? 2 : 4;
      else n[1] = n[1] === 0 ? 2 : 0;
      n[2] = Math.max(n[2], 8 - n[0]);
    }
    var L = a.length, up = function (st) {
      for (var x = st + 1; ; x++) { var m = ((x % 7) + 7) % 7; if (m === 0 || m === 2 || m === 4) return x; }
    };
    for (i = 0; i < L; i++) {
      n = a[i];
      if (s.fill && n[2] >= 3) a.push([n[0] + 2, up(n[1]), n[2] - 2, 3]);
      if (s.h && n[2] >= 1) a.push([n[0], n[1] - 2, n[2], 1]);
      if (s.o && n[0] % 2 === 0) a.push([n[0], n[1], n[2], 2]);
    }
    return a;
  },

  melFit: function (s, idx) {
    var p = this.pc, a = this.melShape(s), i;
    var d = (p.minor ? this.degMin : this.degMaj)[p.prog[idx]];
    var rs = (p.tonic + d[0]) % 12, cs = this.chordScale(p, d);
    if (this.mus.avoid && cs[2] === 4) {
      var moved = {};
      for (i = 0; i < a.length; i++) {
        if ((a[i][3] === 0 || a[i][3] === 2) && a[i][2] >= 2 && ((a[i][1] % 7) + 7) % 7 === 3) { a[i][1] -= 1; moved[a[i][0]] = 1; }
      }
      for (i = 0; i < a.length; i++) {
        if (a[i][3] === 1 && moved[a[i][0]] && ((a[i][1] % 7) + 7) % 7 === 1) a[i][1] -= 1;
      }
    }
    var semi = function (st) { return cs[((st % 7) + 7) % 7] + 12 * Math.floor(st / 7); };
    var sum = 0, cnt = 0;
    for (i = 0; i < a.length; i++) if (!a[i][3]) { sum += semi(a[i][1]); cnt++; }
    var r0 = 52 + rs, mean = sum / Math.max(1, cnt);
    r0 += 12 * Math.round((p.center - mean - r0) / 12);
    var c0 = (52 + rs) % 12;
    return { a: a, r0: r0, semi: semi, cs: cs, rs: rs, pcs: [c0, (c0 + cs[2]) % 12, (c0 + 7) % 12] };
  },

  accWant: function (p, k) {
    var M = this.mus, s = p.plan[k], pv = p.plan[k - 1];
    if (!(M.accOften > 0) || !s || !pv || k < 1 || s.m === undefined || s.m === -1 || (s.frag && s.at)) return false;
    if (pv.sec !== s.sec || (s.cut || 1) > (pv.cut || 1) + 0.01) return true;
    var P = { 'вступление': 0.3, 'тема': 0.6, 'развитие': 0.8, 'вершина': 0.9, 'затухание': 0.35 };
    var h = function (j) {
      var x = (p.seed + j * 7919) % 4294967296;
      for (var i = 0; i < 3; i++) x = (x * 1664525 + 1013904223) % 4294967296;
      return x / 4294967296;
    };
    var w = (P[s.sec] || 0.5) * M.accOften;
    var pw = (P[pv.sec] || 0.5) * M.accOften, pb = !p.plan[k - 2] || p.plan[k - 2].sec !== pv.sec;
    if (!pb && pv.m !== -1 && h(k - 1) < pw) w *= 0.5;
    return h(k) < w;
  },

  accPick: function (last, pcs, old) {
    var best = -1, bs = 1e9;
    for (var m = last; m <= last + 7; m++) {
      var pc = ((m % 12) + 12) % 12;
      if (pcs.indexOf(pc) < 0) continue;
      var sc = (m - last) + (m === last ? 3 : 0) - (old.indexOf(pc) < 0 ? 2.5 : 0) + (m > this.pc.center + 10 ? 8 : 0);
      if (sc < bs) { bs = sc; best = m; }
    }
    return best;
  },

  melSlot: function (T, s) {
    if (!s || s.m === undefined || s.m === -1) return;
    var p = this.pc, M = this.mus, F = this.melFit(s, p.idx), a = F.a, i, j, n;
    var r0 = F.r0, semi = F.semi, cs = F.cs;
    T += M.sync || 0;
    var ct = [0, cs[2], 7], PV = [1, 0.5, 0.26, 0.42], PP = [p.pan, -0.35, 0.4, -p.pan];
    var key = p.minor ? this.scMin : this.scMaj, B = p.beat;
    var folV = Math.pow(p.padLv || 1, 2 * (M.follow || 0));
    var acc = M.acc > 0 && this.accWant(p, p.k), accMidi = -1, last = p.lastMel;
    if (acc && M.accUp) {
      if (p.accA && p.accA.k === p.k) accMidi = p.accA.midi;
      else if (last && last.k === p.k - 1) {
        accMidi = this.accPick(last.midi, F.pcs, this.melFit(s, (p.idx + 3) % 4).pcs);
      }
    }
    if (accMidi > 0) {
      var own = -1, sm = 0, sc = 0;
      for (i = 0; i < a.length; i++) if (!a[i][3]) { sm += semi(a[i][1]); sc++; if (a[i][0] === 0) own = r0 + semi(a[i][1]); }
      if (own > 0 && accMidi - own >= 7 && r0 + 12 + sm / sc - p.center <= 8) r0 += 12;
    }
    var lastMidi = -1, lastOn = -1, held = null;
    for (i = 0; i < a.length; i++) {
      n = a[i];
      var st = semi(n[1]), part = n[3];
      var midi = r0 + st + (part === 2 ? 12 : 0);
      var even = n[0] % 2 === 0, isAcc = acc && !part && n[0] === 0;
      if (acc && n[0] === 0 && accMidi > 0) {
        if (!part) midi = accMidi;
        else if (part === 2) midi = accMidi + 12;
        else if (part === 1) for (j = accMidi - 1; j > accMidi - 6; j--) if (F.pcs.indexOf(((j % 12) + 12) % 12) >= 0) { midi = j; break; }
      }
      var q = {
        t: T + n[0] * B + (this.pr() - 0.5) * 0.02,
        f: 440 * Math.pow(2, (midi - 69) / 12),
        v: M.mel * (s.lv || 1) * PV[part] * (even ? 1 : 0.85) * (0.92 + 0.08 * this.pr()) * folV * (isAcc ? M.acc : 1),
        d: Math.max(0.3, (isAcc ? Math.max(n[2], 2) : n[2]) * B), tone: p.tone, pan: PP[part], tail: isAcc ? M.accTail : 1,
        part: part, k: p.k, sec: s.sec, mot: s.m, strong: !part && even,
        ct: F.pcs.indexOf(((midi % 12) + 12) % 12) >= 0, midi: midi, seed: p.seed, acc: isAcc ? 1 : 0, lead: 0
      };
      this.mq.push(q);
      if (isAcc && M.accOct) this.mq.push({ t: q.t + 0.01, f: q.f / 2, v: q.v * 0.4 * M.accOct, d: q.d, tone: p.tone, pan: -q.pan, tail: q.tail,
        part: 1, k: p.k, sec: s.sec, mot: s.m, strong: false, ct: q.ct, midi: midi - 12, seed: p.seed, acc: 1, lead: 0 });
      if (!part && n[0] >= lastOn) { lastOn = n[0]; lastMidi = midi; held = q; }
    }
    var ns = p.plan[p.k + 1], ni = (p.idx + 1) % 4;
    p.accA = null;
    if (ns && lastMidi > 0 && M.acc > 0 && this.accWant(p, p.k + 1)) {
      var NF = this.melFit(ns, ni), A = -1;
      if (M.accUp) A = this.accPick(lastMidi, NF.pcs, F.pcs);
      else for (i = 0; i < NF.a.length; i++) if (!NF.a[i][3] && NF.a[i][0] === 0) A = NF.r0 + NF.semi(NF.a[i][1]);
      if (A > 0) {
        p.accA = { k: p.k + 1, midi: A };
        var la = 8 - (M.leadAt || 1);
        if (M.lead && lastOn < la - 0.5) {
          var inKey = function (m) { return key.indexOf(((m - 52 - p.tonic) % 12 + 24) % 12) >= 0; };
          var L = A - 1;
          if (!inKey(L)) L = A - 2;
          if (L === lastMidi) {
            if (L === A - 2) L = A - 1;
            else if (M.leadKey) { L--; while (!inKey(L)) L--; }
            else L = A - 2;
          }
          if (held && held.d > (la - lastOn) * B) held.d = Math.max(0.3, (la - lastOn) * B);
          this.mq.push({ t: T + la * B, f: 440 * Math.pow(2, (L - 69) / 12), v: M.mel * (s.lv || 1) * 0.8 * folV, d: (8 - la) * B, tone: p.tone, pan: p.pan, tail: 1,
            part: 0, k: p.k, sec: s.sec, mot: s.m, strong: false, ct: NF.pcs.indexOf(((L % 12) + 12) % 12) >= 0, midi: L, seed: p.seed, acc: 0, lead: 1 });
          lastMidi = L;
        }
      }
    }
    p.lastMel = { k: p.k, midi: lastMidi };
    this.mq.sort(function (x, y) { return x.t - y.t; });
  },

  arpSeg: function (T, s) {
    var p = this.pc, M = this.mus;
    if (!(M.arp > 0)) return;
    var arc = s && this.arpArc[s.sec], j = 0;
    while (arc && p.k - j - 1 >= 0 && p.plan[p.k - j - 1].sec === s.sec) j++;
    var d = (p.minor ? this.degMin : this.degMaj)[p.prog[p.idx]];
    var night = p.night, st = M.arpStep * (night ? 1.5 : 1), sub = 4, b = 1e9;
    [3, 4, 6].forEach(function (n) { var e = Math.abs(p.beat / n - st); if (e < b) { b = e; sub = n; } });
    var cap = Math.min(p.center - 1, 64), pc = (4 + p.tonic + d[0]) % 12;
    var ra = cap - 12 - (((cap - 12 - pc) % 12) + 12) % 12;
    var pats = this.arpPat[sub];
    var seg = { t0: T + (M.sync || 0), sw: T + 0.9, len: p.len, step: p.beat / sub, sub: sub, ra: ra, third: d[1] ? 3 : 4,
      lv: p.arp && arc ? arc[Math.min(j, arc.length - 1)] : null, peak: s && s.sec === 'вершина',
      pat: pats[(p.arpP + (s && s.sec === 'вершина' ? 1 : 0)) % pats.length], seed: p.seed, cap: cap };
    this.arpN = seg;
    if (!this.arpS) { this.arpS = seg; this.arpT = seg.t0; this.arpI = 0; }
  },

  arpRun: function (now, L, on) {
    var S = this.arpS, M = this.mus;
    if (!S || !(M.arp > 0)) return;
    if (this.arpT < now - 1) this.arpT = now + 0.05;
    var guard = 0;
    while (this.arpT < now + 0.5 && guard++ < 64) {
      var N = this.arpN;
      if (N !== S && this.arpT >= N.t0 - S.step * 0.5) { S = this.arpS = N; this.arpT = N.t0; this.arpI = 0; }
      var t = this.arpT, i = this.arpI, pend = N !== S;
      var C = pend && t >= N.sw ? N : S;
      var lv = S.lv ? S.lv[0] + (S.lv[1] - S.lv[0]) * Math.min(1, Math.max(0, (t - S.t0) / S.len)) : 0;
      if (pend && t >= N.sw - 0.9) lv = N.lv ? lv * 0.6 : 0;
      var tn = S.pat[i % S.pat.length];
      if (lv > 0 && tn >= 0 && on && L > 0 && this.drumLv < 0.5 && t >= now - 0.02) {
        var pos = i % S.sub, acc = pos === 0 ? 1 : (S.sub % 2 === 0 && pos === S.sub / 2 ? 0.8 : 0.62);
        var v = M.arp * lv * acc * (this.pc.night ? M.arpNight : 1) * (0.94 + 0.12 * this.sh(S.seed, i + 31));
        this.arpPlay(t, C, tn, v, M.arpCut * (0.85 + 0.25 * lv) * (this.pc.night ? 0.8 : 1), S.step);
        if (S.peak && pos % 2 === 1 && this.sh(S.seed, i + 77) < 0.5) this.arpPlay(t + S.step * 0.5, C, 2, v * 0.35, M.arpCut * 0.7, S.step);
        if (M.arpBass > 0 && (S.sub === 3 ? pos === 0 : pos % (S.sub / 2) === 0)) this.arpBassNote(t, v / M.arp * M.arpBass, S.step);
      }
      this.arpT += S.step;
      this.arpI++;
    }
  },

  arpPlay: function (t, C, tn, vol, cut, step) {
    var st = [0, C.third, 7, 12, 14, 12 + C.third][tn], m = C.ra + st;
    while (m > C.cap + 2) m -= 12;
    var pan = [-0.1, 0.22, -0.28, 0.34, -0.42, 0.46][tn];
    this.arpNote(t, 440 * Math.pow(2, (m - 69) / 12), vol, cut, pan, step);
  },

  arpNote: function (t, f, vol, cut, pan, step) {
    var c = this.ctx, o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
    var pn = c.createStereoPanner ? c.createStereoPanner() : null;
    o.type = 'sawtooth';
    o.frequency.value = f;
    lp.type = 'lowpass';
    lp.Q.value = 1.1;
    lp.frequency.setValueAtTime(cut, t);
    var tau = step < 0.09 ? 0.11 : 0.26;
    lp.frequency.setTargetAtTime(Math.max(f * 1.5, cut * 0.42), t + 0.006, tau * 0.8);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.007);
    g.gain.setTargetAtTime(0, t + 0.007, tau);
    o.connect(lp);
    lp.connect(g);
    if (pn) { pn.pan.value = pan; g.connect(pn); pn.connect(this.mb.arp); } else g.connect(this.mb.arp);
    o.start(t);
    o.stop(t + 0.007 + tau * 5);
    o.onended = function () { g.disconnect(); lp.disconnect(); if (pn) pn.disconnect(); };
  },

  arpBassNote: function (t, vol, step) {
    var f = this.E1 * Math.pow(2, this.pc.tonic / 12);
    if (f < 55) f *= 2;
    this.osc({ t: t, type: 'triangle', f0: f, dur: Math.max(0.18, step * 1.1), vol: 0.16 * vol, atk: 0.012, lp: 320, bus: this.mb.bus });
  },

  arpHotStep: function (s, t) {
    var M = this.mus, p = this.pc;
    if (!(M.arpHot > 0) || !this.fzOn || !(M.arp > 0)) return;
    var b = s % 16, dip = this.fzDip, d = (p.minor ? this.degMin : this.degMaj)[p.prog[p.idx]];
    var root = dip > 0.5 ? 0 : d[0], third = dip > 0.5 ? (p.minor ? 3 : 4) : (d[1] ? 3 : 4);
    var cap = 64, pc = (4 + p.tonic + root) % 12;
    var C = { ra: cap - 12 - (((cap - 12 - pc) % 12) + 12) % 12, third: third, cap: cap };
    var pat = this.arpPat[4][p.arpP % 4], tn, v;
    var base = M.arp * M.arpHot * 1.25 * this.fzA * Math.min(1, 0.3 + this.drumLv), cut = M.arpCut * (1 - 0.45 * dip) * (0.9 + 0.2 * this.fzA);
    if (b % 2 === 0) {
      tn = pat[(b / 2) % 8];
      if (tn < 0) tn = 2;
      v = base * (b % 8 === 0 ? 1 : b % 4 === 0 ? 0.8 : 0.66);
    } else {
      if (dip < 0.5 && this.sh(p.seed, s) > 0.55) return;
      tn = dip > 0.5 ? (b % 4 === 1 ? 3 : 2) : 2;
      v = base * (dip > 0.5 ? 0.75 : 0.3);
    }
    this.arpPlay(t, C, tn, v, cut, dip > 0.5 ? 0.06 : 60 / this.bpm / 2);
  },

  fzTick: function (now, hot) {
    var M = this.mus, z = hot && M.fzForm > 0 ? this.wantFz() : null, mb = this.mb;
    this.fzOn = !!z;
    if (!z) {
      this.fzLv = 1; this.fzDip = 0; this.fzA = 0;
      if (this.fzWas) { this.aim(mb.fz.gain, 1, now, 0.25, 'fz'); this.fzWas = false; }
      return;
    }
    this.fzWas = true;
    var B = 0.4 * z.len, D = Math.min(35, 0.23 * z.len);
    var u = Math.min(1, Math.max(0, z.el / B)), up = u * u * (3 - 2 * u);
    var w = z.rep ? 0 : Math.min(1, Math.max(0, (z.el - (z.len - D)) / 4));
    this.fzDip = w;
    this.fzLv = Math.min(0.4 + 0.6 * up, 1 - 0.55 * w);
    this.fzA = (0.45 + 0.55 * up) * (1 - 0.3 * w);
    this.aim(mb.fz.gain, (0.67 + 0.33 * up) * (1 - 0.45 * w), now, w > 0 && w < 1 ? 1.2 : 0.8, 'fz');
  },

  aim: function (prm, v, now, tc, key) {
    var o = this.mb.aim[key];
    if (o !== undefined && Math.abs(v - o) <= 0.002 + Math.abs(o) * 0.02) return;
    prm.setTargetAtTime(v, now, tc);
    this.mb.aim[key] = v;
  },

  ambTick: function (now) {
    var mb = this.mb, p = this.pc, M = this.mus, on = this.musicOn;
    var dt = Math.min(1, Math.max(0, now - this.tickLast));
    this.tickLast = now;
    var L = this.layer = this.wantLayer();
    var night = this.mood = this.wantMood();
    this.hot = this.wantHot();
    var boss = L === 3 && on;
    if (boss !== this.drumOn) {
      this.drumOn = boss;
      if (boss && this.drumLv <= 0) { this.step16 = 0; this.nextT = now + 0.1; }
      var dg = mb.drum.gain, dd = boss ? M.drumIn : M.drumOut;
      dg.cancelScheduledValues(now);
      dg.setValueAtTime(dg.value, now);
      dg.linearRampToValueAtTime(M.drums * (boss ? 0.3 : 0.55), now + dd * (boss ? 0.6 : 0.45));
      dg.linearRampToValueAtTime(boss ? M.drums : 0, now + dd);
    }
    this.drumLv = boss ? Math.min(1, this.drumLv + dt / M.drumIn) : Math.max(0, this.drumLv - dt / M.drumOut);

    var dip = this.fzDip || 0;
    this.aim(mb.bus.gain, on ? M.vol * (boss ? M.bossAmb : 1) * (1 - 0.55 * dip) : 0, now, dip > 0 ? 1.5 : 2.5, 'bus');
    this.aim(mb.lp.frequency, p.cut * p.cutMul * p.arcCut * M.cut * (L >= 2 ? 1.3 : 1) * (1 - M.night * night) * (1 - 0.45 * dip), now, 3, 'cut');
    this.aim(mb.dg.gain, M.drone * (1 + 0.2 * night), now, 2, 'drone');
    this.aim(mb.dlp.frequency, 170 + (L >= 2 ? 40 : 0) - 40 * night, now, 2, 'dlp');
    this.aim(mb.wind.gain, M.wind * (1 + 0.5 * night) * (p.breath ? 1.5 : 1) * (boss ? 0.6 : 1), now, 2, 'wind');

    if (night > 0.6) this.nightSt = true;
    else if (night < 0.4) this.nightSt = false;
    var kills = this.wantKills();
    if (kills < this.killSeen) this.killSeen = kills;
    if (L === 0 && this.lastL > 0 && !p.fav) this.favWant = true;
    this.lastL = L;
    if (this.favWant) { if (p.fav && !p.req) this.favWant = false; else this.musChange('fav'); }
    if (kills > this.killSeen && this.musChange('boss')) this.killSeen = kills;
    if (L > 0 && this.nightSt !== p.night) this.musChange(this.nightSt ? 'night' : 'day');

    if (this.chordT < now - 2) this.chordT = now + 0.2;
    if (now + 0.3 >= this.chordT) this.chordStep(Math.max(this.chordT, now + 0.05));

    var q = this.mq, cm = Math.pow(p.cutMul * p.arcCut * (L >= 2 ? 1.3 : 1) * (1 - M.night * night), 0.5 * (M.follow || 0));
    while (q.length && q[0].t < now + 0.6) {
      var n = q.shift();
      if (n.t < now - 0.05 || !on || this.drumLv >= 0.5) continue;
      this.melNote(n.t, n.f, n.v * (L === 0 ? 0.9 : 1), n.d, n.tone, n.pan, n.tail, cm);
      if (this.mlog) this.mlog.push(n);
    }
    this.arpRun(now, L, on);
    this.fzTick(now, this.hot);
    if (this.fzOn && M.arpHot > 0 && M.arp > 0) {
      var q8 = 60 / (this.bpm || 118);
      this.aim(mb.dL.delayTime, q8 * 0.75, now, 0.5, 'dLh');
      this.aim(mb.dR.delayTime, q8 * 0.5, now, 0.5, 'dRh');
      this.dlyHot = true;
    } else if (this.dlyHot) {
      this.dlyHot = false;
      mb.aim.dLh = mb.aim.dRh = undefined;
      mb.dL.delayTime.setTargetAtTime(Math.min(0.98, p.beat * 0.5), now, 0.5);
      mb.dR.delayTime.setTargetAtTime(Math.min(0.98, p.beat * 0.75), now, 0.5);
    }

    var hw = (L === 2 && on) ? 1 : 0;
    this.heartLv += Math.max(-dt / 6, Math.min(dt / 6, hw - this.heartLv));
    if (this.heartT < now) this.heartT = now + 0.2;
    if (this.heartLv > 0.05 && now + 0.4 >= this.heartT) {
      this.heart(this.heartT, M.heart * this.heartLv);
      this.heartT += 60 / 54;
    }
  },

  heart: function (t, vol) {
    var B = this.mb.bus;
    this.osc({ t: t, type: 'sine', f0: 72, f1: 46, glide: 0.12, dur: 0.3, vol: vol, atk: 0.02, bus: B });
    this.osc({ t: t, type: 'triangle', f0: 144, f1: 92, glide: 0.1, dur: 0.2, vol: vol * 0.3, atk: 0.02, lp: 420, bus: B });
    this.osc({ t: t + 0.32, type: 'sine', f0: 64, f1: 44, glide: 0.12, dur: 0.26, vol: vol * 0.55, atk: 0.02, bus: B });
  },

  melNote: function (t, f, vol, dur, tone, pan, tail, cm) {
    var c = this.ctx, T = this.tones[tone] || this.tones.piano, dk = T.dk * (tail || 1);
    var o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(), o2 = null, g2 = null;
    o.setPeriodicWave(this.mb.wMel[tone] || this.mb.wMel.piano);
    o.frequency.value = f;
    lp.type = 'lowpass';
    lp.Q.value = 0.4;
    var top = Math.min(this.mus.melCut, f * T.br) * (cm || 1);
    lp.frequency.setValueAtTime(top, t);
    lp.frequency.setTargetAtTime(Math.max(f * 1.2, top * 0.4), t + 0.03, dk * 0.6);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + T.atk);
    g.gain.setTargetAtTime(0, t + T.atk, dk);
    g.gain.setTargetAtTime(0, t + dur, T.rel * (tail || 1));
    o.connect(lp);
    if (T.bell) {
      o2 = c.createOscillator();
      g2 = c.createGain();
      o2.frequency.value = f * T.bell;
      g2.gain.setValueAtTime(0, t);
      g2.gain.linearRampToValueAtTime(T.bv, t + T.atk);
      g2.gain.setTargetAtTime(0, t + T.atk, T.btc);
      o2.connect(g2);
      g2.connect(lp);
    }
    lp.connect(g);
    var pn = c.createStereoPanner ? c.createStereoPanner() : null;
    if (pn) {
      pn.pan.value = pan || 0;
      g.connect(pn);
      pn.connect(this.mb.keys);
    } else g.connect(this.mb.keys);
    var end = t + Math.min(dur, dk * 7) + T.rel * (tail || 1) * 6;
    o.start(t);
    o.stop(end);
    if (o2) { o2.start(t); o2.stop(t + T.atk + T.btc * 8); }
    o.onended = function () {
      g.disconnect(); lp.disconnect();
      if (g2) g2.disconnect();
      if (pn) pn.disconnect();
    };
  },

  musReplay: function (rec) {
    if (!this.mb || !rec) return;
    var f = rec.from;
    this.pc = this.makePiece(f ? { tonic: f.tonic, minor: f.minor, tone: f.tone, mot: f.mot, prog: f.prog } : null,
      !!rec.night, rec.fav ? this.favPiece : { seed: rec.seed });
    this.killSeen = this.wantKills();
    this.pieceStart(this.ctx.currentTime + 0.1, false);
  },

  like: function () {
    var p = this.pc;
    if (!p || !this.ctx) return;
    var self = this, list = [];
    var rec = {
      at: new Date().toISOString(), ver: window.CFG && CFG.version, seed: p.seed, fav: p.fav, night: p.night, from: p.from,
      tonic: p.tonic, minor: p.minor, prog: p.prog, bpm: Math.round(p.bpm * 10) / 10, tone: p.tone, center: p.center,
      mot: p.mot.map(function (k) { return self.motifs[k].n; }), cut: Math.round(p.cut), det: Math.round(p.det * 10) / 10,
      sec: Math.round((this.ctx.currentTime - p.t0) * 10) / 10, slot: p.k, part: p.plan[p.k] && p.plan[p.k].sec,
      layer: this.layer, dark: typeof View3D !== 'undefined' ? Math.round(View3D.dark * 100) / 100 : 0
    };
    try { list = JSON.parse(localStorage.getItem('scrapfall.likes') || '[]'); } catch (e) {}
    list.push(rec);
    try { localStorage.setItem('scrapfall.likes', JSON.stringify(list)); } catch (e) {}
    this.likesLoad(function (file) { self.likesSave(self.likesMerge(file, list)); });
    if (window.UI && UI.toast) UI.toast('пьеса запомнена');
  },
  likesSave: function (all) {
    try { localStorage.setItem('scrapfall.likes', JSON.stringify(all)); } catch (e) {}
    try {
      var body = JSON.stringify(all, null, 1);
      fetch('/save', { method: 'POST', body: JSON.stringify({ name: '_sim/music/likes.json',
        png: 'data:application/json;base64,' + btoa(unescape(encodeURIComponent(body))) }) });
    } catch (e) {}
  },

  likesLoad: function (cb) {
    var done = false, fin = function (a) { if (!done) { done = true; cb(Array.isArray(a) ? a : []); } };
    try {
      fetch('/art/_sim/music/likes.json?t=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : []; }).then(fin, function () { fin([]); });
    } catch (e) { fin([]); }
  },
  likesMerge: function (a, b) {
    var seen = {}, out = [];
    a.concat(b).forEach(function (x) { if (x && x.at && !seen[x.at]) { seen[x.at] = 1; out.push(x); } });
    out.sort(function (x, y) { return x.at < y.at ? -1 : x.at > y.at ? 1 : 0; });
    return out;
  },
  likeNext: function () {
    if (!this.mb || !this.ctx) return;
    var self = this, loc = [];
    try { loc = JSON.parse(localStorage.getItem('scrapfall.likes') || '[]'); } catch (e) {}
    this.likesLoad(function (file) {
      var all = self.likesMerge(file, loc);
      if (all.length > file.length) self.likesSave(all);
      if (!all.length) { if (window.UI && UI.toast) UI.toast('отмеченных пьес нет'); return; }
      var i = (self.likeI || 0) % all.length;
      self.likeI = i + 1;
      self.musReplay(all[i]);
      if (window.UI && UI.toast) UI.toast('пьеса ' + (i + 1) + ' из ' + all.length + ' (' + all[i].at.slice(11, 16) + ')');
    });
  },

  drumRun: function (now) {
    if (this.nextT < now - 0.2) this.nextT = now + 0.05;
    while (this.nextT < now + 0.15) {
      if (this.step16 % 16 === 0) this.bpm = this.hot ? 118 : 96;
      if (this.musicOn) {
        this.beat(this.step16, this.nextT, this.fzOn ? Math.min(this.drumLv, this.fzLv) : this.drumLv);
        if (this.fzOn) this.arpHotStep(this.step16, this.nextT);
      }
      this.nextT += 60 / this.bpm / 4;
      this.step16++;
    }
  },

  tom: function (t, f, vol, M) {
    this.osc({ t: t, type: 'sine', f0: f * 1.6, f1: f, glide: 0.05, dur: 0.32, vol: vol * 1.35, bus: M });
    this.burst({ t: t, type: 'bandpass', f0: f * 6, q: 1.5, dur: 0.03, vol: vol * 0.25, bus: M });
  },

  taiko: function (t, vol, M) {
    this.osc({ t: t, type: 'sine', f0: 95, f1: 38, glide: 0.12, dur: 0.7, vol: vol, bus: M, verb: 0.35 });
    this.burst({ t: t, brown: true, type: 'lowpass', f0: 900, f1: 120, dur: 0.25, vol: vol * 0.45, bus: M });
  },

  shaker: function (t, vol, M) {
    this.burst({ t: t, type: 'highpass', f0: 6500, dur: 0.05, vol: vol, atk: 0.012, bus: M });
  },

  flute: function (t, f, dur, vol, M) {
    var c = this.ctx;
    var o = c.createOscillator(), o2 = c.createOscillator();
    o.type = 'sine';
    o2.type = 'triangle';
    o.frequency.value = f;
    o2.frequency.value = f * 2;
    var vib = c.createOscillator(), vg = c.createGain();
    vib.frequency.value = 4.8;
    vg.gain.value = f * 0.005;
    vib.connect(vg);
    vg.connect(o.frequency);
    vg.connect(o2.frequency);
    var g = c.createGain(), g2 = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.14);
    g.gain.setValueAtTime(vol, t + Math.max(0.15, dur - 0.15));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4);
    g2.gain.value = 0.06;
    o.connect(g);
    o2.connect(g2);
    g2.connect(g);
    var lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    g.connect(lp);
    this.route(lp, { bus: M, verb: 0.8 });
    this.burst({ t: t, type: 'bandpass', f0: f * 3, q: 2, dur: dur * 0.6, vol: vol * 0.08, atk: 0.08, bus: M });
    o.start(t); o2.start(t); vib.start(t);
    o.stop(t + dur + 0.45); o2.stop(t + dur + 0.45); vib.stop(t + dur + 0.45);
  },

  horn: function (t, f, dur, vol, M) {
    var self = this;
    [1, 1.007, 1.5].forEach(function (k, i) {
      self.osc({ t: t, type: 'sawtooth', f0: f * k, dur: dur, vol: vol * (i === 2 ? 0.5 : 1), atk: 0.25,
        lp: 300, lp1: 950, bus: M, verb: 0.6 });
    });
  },

  beat: function (s, t, lv) {
    var b = s % 16, bar = Math.floor(s / 16), p = this.pc;
    var night = this.mood > 0.5, hot = this.hot, M = this.mb.drum;
    var d = (p.minor ? this.degMin : this.degMaj)[p.prog[p.idx]];
    var root = this.note(this.E1, (p.tonic + (this.fzDip > 0.5 ? 0 : d[0])) % 12);
    var rnd = function (k) { var x = Math.sin(s * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
    var phrase = Math.floor(bar / 2);
    var mot = function (k) { var x = Math.sin(phrase * 31.7 + k * 17.3) * 43758.5453; return x - Math.floor(x); };

    if (b === 0 || b === 8 || (hot && lv > 0.6 && b % 4 === 0)) this.taiko(t, 0.75 * (0.3 + 0.7 * lv), M);
    if (lv < 0.35) return;

    if ((night ? this.lowNight : this.lowDay).indexOf(b) >= 0) this.tom(t, 62, b === 0 ? 0.55 : 0.4, M);
    if (b === 0 || b === 8 || b === 6 || b === 14) {
      this.osc({ t: t, type: 'triangle', f0: root, dur: night ? 0.7 : 0.35, vol: 0.32, lp: 260, bus: M });
    }
    if (lv < 0.6) return;

    if (b % 2 === 0 || !night) this.shaker(t, b % 4 === 0 ? 0.02 : 0.012, M);
    if (b === 4 || b === 12 || (b === 11 && rnd(4) < 0.5)) this.tom(t, 110, 0.3, M);
    if (!night && (b === 2 || b === 10) && rnd(5) < 0.4) this.tom(t, 150, 0.18, M);
    if (bar % 4 === 3 && b >= 12) this.tom(t, 120 + (b - 12) * 12, 0.22, M);
    if (lv < 0.85) return;

    if (hot && b === 8) this.horn(t, root * 3, 0.9, 0.06, M);
    if (b === 0 && bar % 2 === 0) this.horn(t, root * 2, 1.4, 0.07, M);
    if (b % 2 === 1 && rnd(6) < 0.35) this.tom(t, 130, 0.16, M);
    if ((b === 0 || b === 6 || b === 10) && bar % 2 === 1 && mot(b) < 0.5) {
      var sc = p.minor ? this.fluteMin : this.fluteMaj;
      var fb = 220 * Math.pow(2, ((p.tonic + 7) % 12) / 12) * (night ? 0.5 : 1);
      this.flute(t, fb * Math.pow(2, sc[Math.floor(mot(b * 3 + 1) * sc.length)] / 12), 0.5 + Math.floor(mot(b + 5) * 3) * 0.35, 0.045, M);
    }
  },

  musicStop: function () {
    this.step16 = 0;
    if (!this.ctx) return;
    var now = this.ctx.currentTime, p = this.pc;
    this.nextT = now + 0.05;
    if (p && this.mb && now > p.t0 + 30 && p.k < p.plan.length - 2) {
      p.req = 'stop';
      p.k = p.plan.length - 1;
      this.mq.length = 0;
      this.chordT = Math.min(this.chordT, Math.max(now + 1.2, this.lastChordT + 3.5));
    }
  }
};

if (typeof window !== 'undefined' && window.CFG && CFG.platform === 'local' &&
    /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
  window.addEventListener('keydown', function (e) {
    if (e.code !== 'KeyL' || e.repeat) return;
    var tg = e.target && e.target.tagName;
    if (tg === 'INPUT' || tg === 'TEXTAREA') return;
    try { if (e.shiftKey) Snd.likeNext(); else Snd.like(); } catch (er) {}
  });
}
