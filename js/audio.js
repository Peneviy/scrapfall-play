// Звук целиком синтезируем через WebAudio: ноль файлов в архиве и никаких лицензий.
// Тема - свалка в пустыне: железо, скрежет, рык моторов. Музыка - пустынный рок,
// который сам собирается из кусков и набирает плотность вместе с боем.
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
  muted: false,           // итог: глушит реклама или площадка
  adMuted: false,
  pfMuted: false,
  bgMuted: false,         // вкладка в фоне: площадки требуют тишину
  strings: {},

  init: function () {
    if (this.ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { this.on = false; return; }
    var c = this.ctx = new AC();
    // компрессор на выходе склеивает звук и не дает толпе захрипеть
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -16;
    this.comp.knee.value = 12;
    this.comp.ratio.value = 4;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.2;
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : 0.85;
    this.comp.connect(this.master);
    this.master.connect(c.destination);
    this.sfxGain = c.createGain();
    this.sfxGain.gain.value = 0.55;
    this.sfxGain.connect(this.comp);
    this.musGain = c.createGain();
    this.musGain.gain.value = this.musicOn ? this.musVol : 0;
    this.musGain.connect(this.comp);
    // эхо каньона: самодельный ревербератор на затухающем шуме
    var verb = c.createConvolver();
    verb.buffer = this.impulse(1.8, 3);
    this.verbSend = c.createGain();
    this.verbSend.gain.value = 0.4;
    this.verbSend.connect(verb);
    verb.connect(this.comp);
    this.buildBuffers();
  },

  // браузеры не дают звук до первого клика
  unlock: function () {
    this.init();
    // на каждый клик и при возврате во вкладку: Safari после звонка держит
    // контекст в 'interrupted', поднять его можно только из жеста
    if (this.ctx && this.ctx.state !== 'running') { try { this.ctx.resume(); } catch (e) {} }
  },

  setSfx: function (v) { this.on = !!v; },
  setMusic: function (v) {
    this.musicOn = !!v;
    if (this.musGain) this.musGain.gain.value = v ? this.musVol : 0;
  },

  // на время рекламы звук обязан замолкать, иначе прилетит от модерации
  mute: function (m) {
    this.adMuted = !!m;
    this.applyMute();
  },

  // кнопка звука на самой площадке. Она главнее настроек в игре: пока она
  // выключена, галки звука и музыки в настройках ничего не включают.
  pfMute: function (m) {
    this.pfMuted = !!m;
    this.applyMute();
  },

  // вкладка ушла в фон или браузер свернули: музыка и эмбиент у нас на
  // таймерах и сами не замолкают, а Пикабу и Яндекс требуют тишины в фоне
  bgMute: function (m) {
    this.bgMuted = !!m;
    this.applyMute();
  },

  applyMute: function () {
    var m = this.adMuted || this.pfMuted || this.bgMuted;
    this.muted = m;
    if (!this.ctx) return;
    this.master.gain.value = m ? 0 : 0.85;
    // без suspend(): Firefox и Safari не возвращают контекст из suspend без
    // клика, и после ролика звук пропадал насовсем
  },

  // ---------- заготовки ----------

  buildBuffers: function () {
    var c = this.ctx, sr = c.sampleRate, i;
    this.white = c.createBuffer(1, sr, sr);
    var d = this.white.getChannelData(0);
    for (i = 0; i < sr; i++) d[i] = Math.random() * 2 - 1;
    // бурый шум: глухой, под взрывы и ветер
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
    var n = 1024, a = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var x = i * 2 / n - 1;
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

  // Щипок струны по Карплусу-Стронгу: шум в линии задержки, которая сама себя
  // сглаживает. На слух как настоящая струна, а считается один раз на ноту.
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

  // выход звука: перегруз, эхо и шина по желанию
  route: function (node, o) {
    var out = node;
    if (o.shape) {
      var ws = this.ctx.createWaveShaper();
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
  },

  // шум через фильтр с огибающей
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
    this.route(g, o);
    src.start(t, Math.random() * 0.5, o.dur + 0.05);
  },

  // генератор с огибающей и фильтром
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
    this.route(out, o);
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  },

  // щипок струны или аккорд из нескольких струн через общий перегруз:
  // так квинты дают тот самый грязный "пауэр-аккорд"
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
      // чистую струну приглушаем фильтром, иначе она звенит поверх всего
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
      // перегруз упирает сигнал в потолок при любой громкости на входе,
      // поэтому громкость гитары крутим уже после него
      var post = c.createGain();
      post.gain.value = o.post || 0.3;
      lp.connect(post);
      out = post;
    }
    this.route(out, { bus: o.bus || this.musGain, verb: o.verb });
  },

  // ---------- эффекты ----------

  // Троттлинг: после пятой минуты на экране сотни врагов, и без ограничителя
  // попадания сливаются в сплошной скрежет.
  gaps: { hit: 0.085, kill: 0.06, shot: 0.05, shotBig: 0.09, boom: 0.13, pick: 0.045, coin: 0.05, aggro: 25, barrel: 0.3 },
  last: {},
  recent: [],
  pickN: 0,
  pickT: 0,
  // ступени для камней опыта: собираешь подряд - звук лезет вверх по пентатонике
  pickSteps: [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24],

  // чем плотнее толпа, тем тише общий уровень эффектов
  duck: function () {
    if (!this.sfxGain) return;
    var n = Game.running ? Game.enemies.length : 0;
    var k = 1 / (1 + n / 120);
    this.sfxGain.gain.value = 0.55 * Math.max(0.32, k);
  },

  play: function (name) {
    if (!this.on || !this.ctx || this.muted) return;

    var now = this.ctx.currentTime;
    var gap = this.gaps[name];
    if (gap) {
      if (this.last[name] !== undefined && now - this.last[name] < gap) return;
      this.last[name] = now;
    }
    // общий лимит голосов: больше 14 за 100 мс человек все равно не различает
    while (this.recent.length && now - this.recent[0] > 0.1) this.recent.shift();
    if (this.recent.length > 14 && name !== 'boss' && name !== 'level' && name !== 'over') return;
    this.recent.push(now);

    // разброс высоты: очередь не должна звучать одним и тем же сэмплом
    var r = 1 + (Math.random() - 0.5) * 0.14;
    var k, self = this;
    switch (name) {
      case 'shot':
        this.burst({ f0: 2300 * r, f1: 800, q: 0.8, dur: 0.06, vol: 0.2, shape: this.soft });
        this.osc({ type: 'sine', f0: 170 * r, f1: 65, dur: 0.07, vol: 0.26 });
        break;
      case 'shotBig':
        this.burst({ brown: true, type: 'lowpass', f0: 2400 * r, f1: 280, q: 0.6, dur: 0.24, vol: 0.6, shape: this.soft, verb: 0.25 });
        this.osc({ type: 'sine', f0: 110 * r, f1: 38, dur: 0.22, vol: 0.4 });
        break;
      case 'hit':
        // глухой лязг железа без звона: звон за пять минут боя достает
        this.osc({ type: 'triangle', f0: 480 * r, dur: 0.05, vol: 0.06, lp: 1300 });
        this.osc({ type: 'triangle', f0: 710 * r, dur: 0.035, vol: 0.035, lp: 1300 });
        this.burst({ f0: 1100, q: 1.2, dur: 0.03, vol: 0.05 });
        break;
      case 'kill':
        // корпус разваливается, сверху сыплется мелочь
        this.burst({ type: 'lowpass', f0: 2000 * r, f1: 380, dur: 0.13, vol: 0.2, shape: this.soft });
        this.osc({ type: 'square', f0: 170 * r, f1: 55, dur: 0.09, vol: 0.05, lp: 900 });
        for (k = 0; k < 2; k++) {
          this.osc({ t: now + 0.035 + k * 0.04 + Math.random() * 0.015, type: 'triangle',
            f0: 800 + Math.random() * 700, dur: 0.03, vol: 0.03 });
        }
        break;
      case 'boom':
        this.burst({ brown: true, type: 'lowpass', f0: 1700, f1: 110, dur: 0.75, vol: 0.95, shape: this.soft, verb: 0.55 });
        this.osc({ type: 'sine', f0: 72, f1: 27, dur: 0.6, vol: 0.6 });
        this.burst({ t: now + 0.05, f0: 3000, f1: 900, q: 0.7, dur: 0.25, vol: 0.12 });
        break;
      case 'hurt':
        // удар по своей броне: глухо, с коротким звоном корпуса
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
        // Теплый перезвон: мягкий аккорд колокольчиками снизу вверх, под ним
        // тихий вдох и искорки сверху. Без щипков - они звенели резко.
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
        // свист воздуха и короткий рык мотора
        this.burst({ f0: 500, f1: 2800, q: 1.4, dur: 0.2, vol: 0.2 });
        this.osc({ type: 'sawtooth', f0: 70, f1: 150, dur: 0.18, vol: 0.09, lp: 650, shape: this.soft });
        break;
      case 'boss':
        // Грозно: земля гудит, удар снизу, потом двухтонный гудок фуры
        // на октаву ниже прежнего, с хрипом и эхом каньона.
        this.burst({ brown: true, type: 'lowpass', f0: 160, f1: 420, dur: 2.2, vol: 0.7, atk: 0.6, verb: 0.4 });
        this.osc({ type: 'sine', f0: 48, f1: 30, dur: 1.4, vol: 0.55, atk: 0.02 });
        this.burst({ brown: true, type: 'lowpass', f0: 1400, f1: 90, dur: 0.9, vol: 0.6, shape: this.soft, verb: 0.5 });
        [[73.4, 0.35], [61.7, 1.0]].forEach(function (n) {
          self.osc({ t: now + n[1], type: 'sawtooth', f0: n[0], dur: 1.1, vol: 0.3, atk: 0.08, lp: 300, lp1: 1300, shape: self.hard, verb: 0.65 });
          self.osc({ t: now + n[1], type: 'sawtooth', f0: n[0] * 1.008, dur: 1.1, vol: 0.24, atk: 0.08, lp: 360, lp1: 1400, verb: 0.55 });
          self.osc({ t: now + n[1], type: 'square', f0: n[0] / 2, dur: 1.1, vol: 0.14, atk: 0.1, lp: 200 });
        });
        break;
      case 'buy':
        // трещотка и звякнувший лом
        for (k = 0; k < 3; k++) this.burst({ t: now + k * 0.03, f0: 2600, q: 3, dur: 0.02, vol: 0.12 });
        this.osc({ t: now + 0.1, type: 'sine', f0: 1800, dur: 0.12, vol: 0.08 });
        this.osc({ t: now + 0.12, type: 'sine', f0: 2700, dur: 0.1, vol: 0.05 });
        break;
      case 'deny':
        this.osc({ type: 'square', f0: 110, dur: 0.08, vol: 0.12, lp: 700 });
        this.osc({ t: now + 0.11, type: 'square', f0: 104, dur: 0.1, vol: 0.12, lp: 700 });
        break;
      case 'barrel':
        // бочка хлопает глуше и короче большого взрыва: цепочка не должна глушить
        this.burst({ brown: true, type: 'lowpass', f0: 1100, f1: 160, dur: 0.4, vol: 0.45, shape: this.soft, verb: 0.25 });
        this.osc({ type: 'sine', f0: 85, f1: 40, dur: 0.3, vol: 0.25 });
        break;
      case 'aggro':
        // Самый первый звук босса из ранней версии, один в один. Теперь он
        // редкий: элитка заметила тебя. Для тех, кто играл с самого начала.
        this.osc({ type: 'sawtooth', f0: 90, f1: 45, dur: 1.1, vol: 0.3 });
        break;
      case 'over':
        // мотор глохнет: тон падает, звук чихает
        this.osc({ type: 'sawtooth', f0: 210, f1: 32, dur: 1.5, vol: 0.28, lp: 1600, lp1: 140, shape: this.soft, verb: 0.4 });
        for (k = 0; k < 5; k++) this.burst({ t: now + 0.2 + k * k * 0.06, brown: true, type: 'lowpass', f0: 600, dur: 0.08, vol: 0.3 - k * 0.05 });
        break;
    }
  },

  // ---------- музыка ----------
  // Пустыня в духе Soulmask: племенные барабаны, гул, флейта с дыханием,
  // низкие рога у босса. Перегруженную гитару убрали - она резала ухо.
  // Слои включаются от напряжения, настроение - от времени суток: днем
  // восточный лад и флейта, ночью темнее, реже и с колокольчиками.

  bpm: 96,
  nextT: 0,
  step16: 0,
  layer: 0,
  mood: 0,               // 0 - день, 1 - ночь, обновляется на границе такта
  E1: 41.2,
  // корни по тактам относительно ми: ми, ми, соль, фа - фригийский оборот
  roots: [0, 0, 3, 1, 0, 0, 5, 1],
  // раз в 32 такта гармония сменяется, чтобы долгий рейд не звучал по кругу
  rootSets: [[0, 0, 3, 1, 0, 0, 5, 1], [0, 5, 3, 1, 0, 8, 7, 1], [0, 0, 10, 8, 0, 3, 1, 0]],
  // днем ми фригийский доминантный (пустынный вестерн), ночью натуральный минор
  dayScale: [0, 1, 4, 5, 7, 8, 10, 12, 13, 16],
  nightScale: [0, 2, 3, 5, 7, 8, 10, 12, 14, 15],

  note: function (base, semi) { return base * Math.pow(2, semi / 12); },

  // сколько слоев играет: решаем на границе такта, чтобы смена была в ритм
  wantLayer: function () {
    if (!Game.running || Game.over) return 0;
    if (Game.activeBoss && Game.activeBoss()) return 3;
    if (Game.time > 75 || Game.enemies.length > 70) return 2;
    return 1;
  },

  music: function () {
    var c = this.ctx;
    if (!c || c.state !== 'running') return;
    this.ambience();
    var step = 60 / this.bpm / 4;
    if (this.nextT < c.currentTime - 0.2) this.nextT = c.currentTime + 0.05;
    while (this.nextT < c.currentTime + 0.15) {
      if (this.step16 % 16 === 0) {
        this.layer = this.wantLayer();
        this.mood = (typeof View3D !== 'undefined' && View3D.on && Game.running) ? View3D.dark : 0;
      }
      if (this.musicOn) this.beat(this.step16, this.nextT);
      this.nextT += step;
      this.step16++;
    }
  },

  // ветер и низкий гул: играют всегда, громкость зависит от слоя и ночи
  ambience: function () {
    var c = this.ctx;
    if (!this.amb) {
      var wind = c.createBufferSource();
      wind.buffer = this.brown;
      wind.loop = true;
      var wf = c.createBiquadFilter();
      wf.type = 'bandpass';
      wf.frequency.value = 500;
      wf.Q.value = 0.6;
      var wl = c.createOscillator(), wlg = c.createGain();
      wl.frequency.value = 0.07;
      wlg.gain.value = 260;
      wl.connect(wlg);
      wlg.connect(wf.frequency);
      var wg = c.createGain();
      wg.gain.value = 0;
      wind.connect(wf);
      wf.connect(wg);
      wg.connect(this.musGain);
      var drone = c.createOscillator(), drone2 = c.createOscillator();
      drone.type = drone2.type = 'sawtooth';
      drone.frequency.value = this.E1;
      drone2.frequency.value = this.E1 * 1.5;
      drone2.detune.value = 7;
      var df = c.createBiquadFilter();
      df.type = 'lowpass';
      df.frequency.value = 180;
      var dg = c.createGain();
      dg.gain.value = 0;
      drone.connect(df);
      drone2.connect(df);
      df.connect(dg);
      dg.connect(this.musGain);
      wind.start();
      wl.start();
      drone.start();
      drone2.start();
      this.amb = { wind: wg, drone: dg, df: df };
    }
    var t = c.currentTime;
    var calm = this.layer === 0, night = this.mood;
    this.amb.wind.gain.setTargetAtTime(this.musicOn ? (calm ? 0.5 : 0.16 + night * 0.1) : 0, t, 1.5);
    this.amb.drone.gain.setTargetAtTime(this.musicOn ? (calm ? 0.11 : 0.06 + this.layer * 0.015 + night * 0.04) : 0, t, 1.5);
    this.amb.df.frequency.setTargetAtTime(150 + this.layer * 60 - night * 40, t, 2);
  },

  // ---------- инструменты ----------

  // том: туго натянутая кожа, у ночи глуше
  tom: function (t, f, vol, M) {
    this.osc({ t: t, type: 'sine', f0: f * 1.6, f1: f, glide: 0.05, dur: 0.32, vol: vol * 1.35, bus: M });
    this.burst({ t: t, type: 'bandpass', f0: f * 6, q: 1.5, dur: 0.03, vol: vol * 0.25, bus: M });
  },

  // большой барабан как тайко: удар в грудь с хвостом эха
  taiko: function (t, vol, M) {
    this.osc({ t: t, type: 'sine', f0: 95, f1: 38, glide: 0.12, dur: 0.7, vol: vol, bus: M, verb: 0.35 });
    this.burst({ t: t, brown: true, type: 'lowpass', f0: 900, f1: 120, dur: 0.25, vol: vol * 0.45, bus: M });
  },

  shaker: function (t, vol, M) {
    this.burst({ t: t, type: 'highpass', f0: 6500, dur: 0.05, vol: vol, atk: 0.012, bus: M });
  },

  // флейта: чистый тон с легким вибрато, мягкой атакой и дыханием
  flute: function (t, f, dur, vol, M) {
    var c = this.ctx;
    var o = c.createOscillator(), o2 = c.createOscillator();
    o.type = 'sine';
    o2.type = 'triangle';
    o.frequency.value = f;
    o2.frequency.value = f * 2;
    var vib = c.createOscillator(), vg = c.createGain();
    vib.frequency.value = 5.2;
    vg.gain.value = f * 0.006;
    vib.connect(vg);
    vg.connect(o.frequency);
    vg.connect(o2.frequency);
    var g = c.createGain(), g2 = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.09);
    g.gain.setValueAtTime(vol, t + Math.max(0.1, dur - 0.15));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
    g2.gain.value = 0.12;
    o.connect(g);
    o2.connect(g2);
    g2.connect(g);
    var lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    g.connect(lp);
    this.route(lp, { bus: M, verb: 0.55 });
    this.burst({ t: t, type: 'bandpass', f0: f * 3, q: 2, dur: dur * 0.6, vol: vol * 0.12, atk: 0.06, bus: M });
    o.start(t); o2.start(t); vib.start(t);
    o.stop(t + dur + 0.3); o2.stop(t + dur + 0.3); vib.stop(t + dur + 0.3);
  },

  // рог: два расстроенных пилообразных, фильтр раскрывается - низкая медь
  horn: function (t, f, dur, vol, M) {
    var self = this;
    [1, 1.007, 1.5].forEach(function (k, i) {
      self.osc({ t: t, type: 'sawtooth', f0: f * k, dur: dur, vol: vol * (i === 2 ? 0.5 : 1), atk: 0.25,
        lp: 300, lp1: 1100, bus: M, verb: 0.45 });
    });
  },

  // колокольчик для ночи: высокий чистый звон далеко в темноте
  bell: function (t, f, vol, M) {
    this.osc({ t: t, type: 'sine', f0: f, dur: 1.6, vol: vol, atk: 0.005, bus: M, verb: 0.7 });
    this.osc({ t: t, type: 'sine', f0: f * 2.76, dur: 0.6, vol: vol * 0.3, atk: 0.005, bus: M, verb: 0.7 });
  },

  beat: function (s, t) {
    var L = this.layer, b = s % 16, bar = Math.floor(s / 16);
    var night = this.mood > 0.5;
    var roots = this.rootSets[Math.floor(bar / 32) % this.rootSets.length];
    var root = this.note(this.E1, roots[bar % roots.length]);
    var scale = night ? this.nightScale : this.dayScale;
    var M = this.musGain;
    var rnd = function (k) { var x = Math.sin(s * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
    // мотив на два такта, одинаковый внутри фразы: так мелодия запоминается
    var phrase = Math.floor(bar / 2);
    var mot = function (k) { var x = Math.sin(phrase * 31.7 + k * 17.3) * 43758.5453; return x - Math.floor(x); };

    // флейта: днем мотивом, ночью редко и ниже
    var fluteSteps = night ? [0, 10] : [0, 3, 6, 10, 12];
    var fi = fluteSteps.indexOf(b);
    if (fi >= 0 && L <= 2 && mot(fi + (bar % 2) * 7) < (night ? 0.35 : (L === 0 ? 0.45 : 0.3))) {
      var nt = scale[Math.floor(mot(fi * 3 + 1) * scale.length)];
      var oct = night ? 4 : 8;
      var len = (night ? 1.6 : 0.4 + Math.floor(mot(fi + 5) * 3) * 0.3);
      this.flute(t, this.note(this.E1 * oct, nt), len, night ? 0.05 : 0.06, M);
    }
    // ночью далекие колокольчики
    if (night && (b === 4 || b === 13) && rnd(9) < 0.25) {
      this.bell(t, this.note(this.E1 * 16, scale[Math.floor(rnd(10) * 5)]), 0.035, M);
    }
    if (L === 0) return;

    // низкий том держит пульс, ночью вдвое реже
    var lowSteps = night ? [0, 8] : [0, 6, 8, 14];
    if (lowSteps.indexOf(b) >= 0) this.tom(t, 62, b === 0 ? 0.55 : 0.4, M);
    // шейкер: шорох песка
    if (b % 2 === 0 || (L >= 3 && !night)) this.shaker(t, b % 4 === 0 ? 0.05 : 0.03, M);
    // бас: мягкий, без перегруза, на сильные доли
    if (b === 0 || b === 8 || (L >= 2 && (b === 6 || b === 14))) {
      this.osc({ t: t, type: 'triangle', f0: root, dur: night ? 0.7 : 0.35, vol: 0.32, lp: 260, bus: M });
    }
    if (L === 1) return;

    // средние томы перекликаются с низким
    if (b === 4 || b === 12 || (b === 11 && rnd(4) < 0.5)) this.tom(t, 110, 0.3, M);
    if (!night && (b === 2 || b === 10) && rnd(5) < 0.4) this.tom(t, 150, 0.18, M);
    // в конце фразы - дробь
    if (bar % 4 === 3 && b >= 12) this.tom(t, 120 + (b - 12) * 12, 0.22, M);
    if (L === 2) return;

    // босс: тайко на сильные доли, рога на начало такта, дробь чаще
    if (b === 0 || b === 8) this.taiko(t, 0.75, M);
    if (b === 0 && bar % 2 === 0) this.horn(t, root * 2, 1.4, 0.07, M);
    if (b % 2 === 1 && rnd(6) < 0.35) this.tom(t, 130, 0.16, M);
  },

  // новый рейд - музыка начинается с начала фразы
  musicStop: function () {
    this.step16 = 0;
    if (this.ctx) this.nextT = this.ctx.currentTime + 0.05;
  }
};
