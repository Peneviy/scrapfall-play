// Ядро: цикл, мир, камера, жизненный цикл рейда.
var Game = {
  canvas: null, ctx: null,
  w: 0, h: 0, dpr: 1, scale: 1,
  running: false, paused: false, over: false,
  time: 0, spawnT: 0, nextBoss: 0,
  kills: 0, score: 0, runCoins: 0, pendingLevels: 0, bossKills: 0,
  scoreParts: { kills: 0, levels: 0, bosses: 0, time: 0 },
  rerollsLeft: 0, reviveLeft: 0, adLevelCounter: 0,
  enemies: [], bullets: [], ebullets: [], gems: [], heals: [], turrets: [], clouds: [], drops: [],
  mines: [], waves: [],
  grid: null, player: null,
  cam: { x: 0, y: 0 },
  lastTs: 0, acc: 0,
  fixed: 1 / 60,

  init: function (canvas) {
    this.canvas = canvas;
    // Если 3D завелось, плоский канвас остается сверху прозрачным слоем под
    // цифры, миникарту и стик. Не завелось - играем в плоскую версию.
    var c3 = document.getElementById('game3d');
    if (View3D.init(c3)) canvas.classList.add('overlay');
    else if (c3) c3.style.display = 'none';
    this.ctx = canvas.getContext('2d', { alpha: View3D.on });
    this.grid = new HashGrid(CFG.grid);
    var self = this;
    window.addEventListener('resize', function () { self.resize(); });
    window.addEventListener('orientationchange', function () { setTimeout(function () { self.resize(); }, 250); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && self.running && !self.paused) UI.togglePause();
      if (window.Snd && Snd.bgMute) Snd.bgMute(document.hidden);
    });
    this.resize();
  },

  resize: function () {
    var w = window.innerWidth, h = window.innerHeight;
    // на слабых телефонах dpr 3 убивает fps, хватает и двойки
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = w; this.h = h;
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    var zoom = (Save.data && Save.data.set.zoom) || 1;
    this.scale = U.clamp(Math.min(h / CFG.view.targetH, w / CFG.view.targetW) * zoom,
      CFG.view.minScale, CFG.view.maxScale);
    View3D.resize(w, h, this.dpr);
  },

  // Колесо мыши: чуть ближе или дальше. В 3D камера считается от того же
  // scale, так что отдельной логики там нет.
  zoomBy: function (dir) {
    var s = Save.data.set;
    s.zoom = U.clamp((s.zoom || 1) * (dir > 0 ? 0.94 : 1.06), CFG.view.zoomMin, CFG.view.zoomMax);
    Save.flush(false);
    this.resize();
  },

  // половина диагонали видимой области в мировых единицах
  viewRadius: function () {
    if (View3D.on) return View3D.radius;
    var hw = this.w / 2 / this.scale, hh = this.h / 2 / this.scale;
    return Math.sqrt(hw * hw + hh * hh);
  },

  // ---------- жизненный цикл ----------

  start: function () {
    var d = Save.data;
    this.time = 0; this.spawnT = 0.5; this.nextBoss = CFG.boss.first;
    this.kills = 0; this.score = 0; this.runCoins = 0; this.pendingLevels = 0; this.bossKills = 0;
    this.scoreParts = { kills: 0, levels: 0, bosses: 0, time: 0 };
    this.rerollsLeft = CFG.ads.rerollPerRun;
    this.reviveLeft = CFG.ads.revivePerRun;
    this.adLevelCounter = 0;
    this.bossIndex = 0;
    this.enemies.length = 0; this.bullets.length = 0; this.ebullets.length = 0;
    this.gems.length = 0; this.heals.length = 0; this.turrets.length = 0; this.clouds.length = 0;
    this.drops.length = 0; this.mines.length = 0; this.waves.length = 0;
    World.reset();
    FX.reset();

    this.player = Player.create(d.char, d.gun, d.skin);
    this.player.x = 0; this.player.y = 0;
    this.cam.x = 0; this.cam.y = 0;
    Enemies.opening();

    this.over = false;
    this.paused = false;
    this.running = true;
    this.settled = false;
    this.committed = false;
    this.payout = 0;
    this.res = null;
    Snd.musicStop();
    PF.banner(false);
    PF.gameplayStart();
  },

  pause: function (v) {
    this.paused = v;
    if (v) PF.gameplayStop(); else PF.gameplayStart();
  },

  onDeath: function () {
    if (this.over) return;
    this.over = true;
    this.paused = true;
    PF.gameplayStop();
    Snd.play('over');
    FX.shake(18);
    FX.burst(this.player.x, this.player.y, 30, '#e2503a', 260, 0.8, 4);
    UI.showGameOver();
  },

  // вторая жизнь за рекламу: чистим поле вокруг, чтобы не умереть сразу же
  revive: function () {
    this.player.alive = true;
    this.player.hp = this.player.st.maxHp;
    this.player.inv = 3;
    this.over = false;
    var blast = 420;
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (U.dist2(this.player.x, this.player.y, e.x, e.y) < blast * blast && !e.boss) Enemies.kill(e);
    }
    FX.ring(this.player.x, this.player.y, 20, blast, '#ffd27d', 0.7, 6);
    FX.shake(12);
    Snd.play('boom');
    this.pause(false);
  },

  finalScore: function () {
    return Math.floor(this.score + this.time * CFG.score.perSec);
  },

  // Подсчет итогов. Отделен от записи, потому что между ними игрок может
  // взять вторую жизнь за рекламу, и тогда рейд продолжается.
  settle: function () {
    if (this.settled) return this.res;
    this.settled = true;
    var bonus = Math.floor(this.time * CFG.coins.timeBonus + this.player.level * CFG.coins.lvlBonus);
    bonus = Math.floor(bonus * Save.mult().loot * this.player.char.loot);
    this.payout = this.runCoins + bonus;   // то, что реально уйдет в кошелек
    this.scoreParts.time = Math.floor(this.time * CFG.score.perSec);
    this.res = {
      score: this.finalScore(), time: this.time,
      level: this.player.level, kills: this.kills
    };
    return this.res;
  },

  unsettle: function () { this.settled = false; },

  // запись результата: лом в кошелек, рекорд в сейв, очки в рейтинг
  commit: function () {
    if (this.committed || !this.settled) return;
    this.committed = true;
    this.res.coins = this.payout;
    this.res.best = Save.finishRun({
      score: this.res.score, time: this.res.time,
      level: this.res.level, kills: this.res.kills
    });
    Save.addCoins(this.payout);
    PF.lbSubmit(this.res.score);
    PF.reportScore(this.res.score);
  },

  quit: function () {
    this.running = false;
    this.paused = false;
    Snd.musicStop();
    PF.gameplayStop();
    PF.banner(true);
  },

  // ---------- мир ----------

  bossCount: function () {
    var n = 0;
    for (var i = 0; i < this.enemies.length; i++) if (this.enemies[i].boss && !this.enemies[i].dead) n++;
    return n;
  },

  // босс, чью полоску показываем сверху: ближайший, кто реально дерется
  activeBoss: function () {
    var best = null, bd = 1e9;
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (!e.boss || e.dead || e.state !== 'fight') continue;
      var d = U.dist2(this.player.x, this.player.y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  },

  nearestEnemy: function (x, y, range, skip) {
    var best = null, bd = range * range;
    var list = this.enemies;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.dead) continue;
      if (skip && skip.indexOf(e) >= 0) continue;
      var d = U.dist2(x, y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  },

  gemCap: 140,
  spawnGem: function (x, y, value) {
    // Поле уже засыпано - вместо нового камня утяжеляем случайный старый.
    if (this.gems.length >= this.gemCap) {
      var g = this.gems[(Math.random() * this.gems.length) | 0];
      g.v += value;
      g.r = Math.min(13, g.r + 0.25);
      return;
    }
    this.gems.push({ x: x, y: y, vx: U.rand(-40, 40), vy: U.rand(-40, 40), v: value, r: 5 + Math.min(4, value), age: 0 });
  },

  // ядовитое облако от спор: тормозит и грызет всех внутри
  spawnCloud: function (x, y, r, dmg) {
    this.clouds.push({ x: x, y: y, r: r, dmg: dmg, life: 7, tick: 0 });
  },

  updateClouds: function (dt) {
    for (var i = this.clouds.length - 1; i >= 0; i--) {
      var c = this.clouds[i];
      c.life -= dt;
      if (c.life <= 0) { this.clouds.splice(i, 1); continue; }
      c.tick -= dt;
      if (c.tick > 0) continue;
      c.tick = 0.5;
      var near = [];
      this.grid.query(c.x, c.y, c.r, near);
      for (var j = 0; j < near.length; j++) {
        var e = near[j];
        if (e.dead) continue;
        if (U.dist2(c.x, c.y, e.x, e.y) < c.r * c.r) {
          e.slowT = 0.6;
          Enemies.damage(e, c.dmg, false, c.x, c.y, 0);
        }
      }
    }
  },

  spawnHeal: function (x, y) {
    this.heals.push({ x: x, y: y, r: 9, life: 20 });
  },

  spawnEnemyBullet: function (x, y, ang, speed, dmg, color, opts) {
    opts = opts || {};
    this.ebullets.push({
      x: x, y: y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
      r: opts.r || 6, dmg: dmg, life: opts.life || 4.5, c: color || CFG.col.spit,
      pw: !!opts.pw,          // летит сквозь строения
      spear: !!opts.spear,    // рисуется вытянутым копьем
      ang: ang
    });
  },

  // ---------- апдейт ----------

  update: function (dt) {
    this.time += dt;
    Input.update();
    UI.tickCtrlHint(dt);
    World.refresh(this.player.x, this.player.y, this.viewRadius() + 400);
    Player.update(this.player, dt);
    Enemies.director(dt);
    Enemies.update(dt);
    Player.updateBullets(dt);
    Player.updateTurrets(dt);
    this.updateEnemyBullets(dt);
    this.updateClouds(dt);
    this.updateDrops(dt);
    this.updateMines(dt);
    this.updateWaves(dt);
    this.updatePickups(dt);
    FX.update(dt);
    Snd.duck();
    Save.tick();

    // камера с запаздыванием
    this.cam.x = U.lerp(this.cam.x, this.player.x, U.clamp(CFG.view.camLerp * dt, 0, 1));
    this.cam.y = U.lerp(this.cam.y, this.player.y, U.clamp(CFG.view.camLerp * dt, 0, 1));

    if (this.pendingLevels > 0 && !this.over) {
      this.pendingLevels--;
      UI.showLevelUp();
    }
  },

  updateEnemyBullets: function (dt) {
    var p = this.player;
    for (var i = this.ebullets.length - 1; i >= 0; i--) {
      var b = this.ebullets[i];
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0) { this.ebullets.splice(i, 1); continue; }
      if (!b.pw && World.blocked(b.x, b.y)) { FX.spray(b.x, b.y, 0, 2, b.c, 90); this.ebullets.splice(i, 1); continue; }
      var rr = b.r + p.r;
      if (U.dist2(b.x, b.y, p.x, p.y) < rr * rr) {
        p.hurt(b.dmg);
        FX.burst(b.x, b.y, 5, b.c, 140, 0.3, 3);
        this.ebullets.splice(i, 1);
      }
    }
  },

  updatePickups: function (dt) {
    var p = this.player, i, g, d;
    for (i = this.gems.length - 1; i >= 0; i--) {
      g = this.gems[i];
      d = U.dist(g.x, g.y, p.x, p.y);
      if (d < p.st.pickup) {
        // притягиваем тем сильнее, чем ближе
        var pull = 340 * (1 - d / p.st.pickup) + 120;
        var a = U.angleTo(g.x, g.y, p.x, p.y);
        g.x += Math.cos(a) * pull * dt;
        g.y += Math.sin(a) * pull * dt;
      } else {
        g.x += g.vx * dt; g.y += g.vy * dt;
        g.vx *= 1 - 3 * dt; g.vy *= 1 - 3 * dt;
        // Полежавший камень сам ползет к игроку, и чем дольше лежит, тем быстрее.
        // Иначе тот, кто бегает без остановки, вообще перестает качаться.
        g.age += dt;
        if (g.age > 2.5 || this.gems.length > 25) {
          var pull = Math.min(300, 70 + g.age * 26);
          var a2 = U.angleTo(g.x, g.y, p.x, p.y);
          g.x += Math.cos(a2) * pull * dt;
          g.y += Math.sin(a2) * pull * dt;
        }
      }
      if (d < p.r + 6) {
        Player.addXp(p, g.v);
        this.gems.splice(i, 1);
        Snd.play('pick');
      }
    }
    for (i = this.heals.length - 1; i >= 0; i--) {
      var h = this.heals[i];
      h.life -= dt;
      if (h.life <= 0) { this.heals.splice(i, 1); continue; }
      if (U.dist2(h.x, h.y, p.x, p.y) < (p.r + h.r + 6) * (p.r + h.r + 6)) {
        p.heal(p.st.maxHp * 0.07);
        FX.text(p.x, p.y - 20, '+' + Math.round(p.st.maxHp * 0.07), CFG.col.heal, 15);
        this.heals.splice(i, 1);
        Snd.play('coin');
      }
    }
  },

  // Подбор из ящиков: лом, аптечка и временные баффы.
  updateDrops: function (dt) {
    var p = this.player;
    for (var i = this.drops.length - 1; i >= 0; i--) {
      var d = this.drops[i];
      d.life -= dt;
      d.bob += dt * 3;
      if (d.life <= 0) { this.drops.splice(i, 1); continue; }
      var rr = p.r + d.r + 8;
      if (U.dist2(d.x, d.y, p.x, p.y) > rr * rr) continue;
      // аптечку при полном здоровье не подбираем: ящик ломается телом, и
      // иначе она сгорала бы впустую прямо под машиной
      if (d.t === 'heal' && p.hp >= p.st.maxHp) continue;
      this.applyDrop(d);
      this.drops.splice(i, 1);
    }
  },

  applyDrop: function (d) {
    var p = this.player;
    if (d.t === 'scrap') {
      var n = Math.round(30 * Save.mult().loot * p.char.loot);
      this.runCoins += n;
      FX.text(p.x, p.y - 26, '+' + n, CFG.col.ally, 15);
      Snd.play('coin');
    } else if (d.t === 'heal') {
      p.heal(p.st.maxHp * 0.25);
      FX.text(p.x, p.y - 26, '+' + Math.round(p.st.maxHp * 0.25), CFG.col.heal, 15);
      Snd.play('coin');
    } else {
      if (d.t === 'shield') p.buffs.shield = 3;
      else p.buffs[d.t] = 14;
      FX.ring(p.x, p.y, 10, 70, CFG.col.tech, 0.35, 3);
      FX.text(p.x, p.y - 26, I18N.t('buff_' + d.t), CFG.col.tech, 15);
      Snd.play('level');
    }
  },

  drawDrops: function (ctx) {
    var colors = { scrap: '#ffd27d', heal: '#7ee08a', rage: '#ff7a5c', haste: '#7ec8ff', shield: '#b07ef5' };
    for (var i = 0; i < this.drops.length; i++) {
      var d = this.drops[i];
      var c = colors[d.t] || '#ffd27d';
      var yy = d.y + Math.sin(d.bob) * 3;
      if (d.life < 5 && Math.floor(d.life * 6) % 2 === 0) continue;
      GlowCache.draw(ctx, 'rgba(255,255,255,.18)', d.x, yy, d.r * 2.2, 1);
      ctx.fillStyle = c;
      ctx.save();
      ctx.translate(d.x, yy);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-d.r * 0.6, -d.r * 0.6, d.r * 1.2, d.r * 1.2);
      ctx.restore();
    }
  },

  // Мины подрывника: лежат, мигают, потом хлопают по площади.
  spawnMine: function (x, y, dmg, delay) {
    this.mines.push({ x: x, y: y, t: delay || 2.4, dmg: dmg, r: 110 });
  },

  updateMines: function (dt) {
    var p = this.player;
    for (var i = this.mines.length - 1; i >= 0; i--) {
      var m = this.mines[i];
      m.t -= dt;
      if (m.t > 0) continue;
      FX.ring(m.x, m.y, 10, m.r, CFG.col.enemyShot, 0.35, 4);
      FX.blast(m.x, m.y, m.r * 0.8, '#ff4d6d');
      FX.burst(m.x, m.y, 12, CFG.col.enemyShot, 220, 0.45, 3);
      Snd.play('boom');
      if (U.dist2(m.x, m.y, p.x, p.y) < m.r * m.r) p.hurt(m.dmg);
      this.mines.splice(i, 1);
    }
  },

  // Ударная волна титана: кольцо расходится и цепляет один раз.
  spawnWave: function (x, y, max, speed, dmg) {
    this.waves.push({ x: x, y: y, r: 20, max: max, sp: speed, dmg: dmg, hit: false });
  },

  updateWaves: function (dt) {
    var p = this.player;
    for (var i = this.waves.length - 1; i >= 0; i--) {
      var w = this.waves[i];
      var prev = w.r;
      w.r += w.sp * dt;
      if (!w.hit) {
        var d = U.dist(w.x, w.y, p.x, p.y);
        if (d > prev - 22 && d < w.r + 22) { p.hurt(w.dmg); w.hit = true; }
      }
      if (w.r >= w.max) this.waves.splice(i, 1);
    }
  },

  drawMines: function (ctx) {
    var i;
    for (i = 0; i < this.mines.length; i++) {
      var m = this.mines[i];
      var blink = m.t < 0.8 ? (Math.floor(m.t * 12) % 2 === 0) : (Math.floor(m.t * 4) % 2 === 0);
      GlowCache.draw(ctx, CFG.col.enemyShotGlow, m.x, m.y, 22, blink ? 1 : 0.4);
      ctx.fillStyle = blink ? '#ffffff' : CFG.col.enemyShot;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = CFG.col.enemyShot;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (i = 0; i < this.waves.length; i++) {
      var w = this.waves[i];
      ctx.strokeStyle = '#ffb35c';
      ctx.globalAlpha = 1 - w.r / w.max;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  },

  // ---------- отрисовка ----------

  render: function () {
    var ctx = this.ctx;
    if (View3D.on) {
      View3D.render();
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.w, this.h);
      View3D.drawOverlay(ctx);
      this.drawVignette(ctx);
      this.drawMinimap(ctx);
      this.drawBossMarker(ctx);
      Input.draw(ctx);
      return;
    }
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#0a1216';
    ctx.fillRect(0, 0, this.w, this.h);

    ctx.save();
    ctx.translate(this.w / 2 + FX.shakeX, this.h / 2 + FX.shakeY);
    ctx.scale(this.scale, this.scale);
    ctx.translate(-this.cam.x, -this.cam.y);

    this.drawFloor(ctx);
    World.draw(ctx);
    this.drawClouds(ctx);
    this.drawDrops(ctx);
    this.drawPickups(ctx);
    Player.drawTurrets(ctx);
    Enemies.draw(ctx);
    Player.draw(ctx, this.player);
    this.drawPlayerHp(ctx);
    Player.drawBullets(ctx);
    this.drawEnemyBullets(ctx);
    this.drawMines(ctx);
    FX.draw(ctx);
    FX.drawText(ctx);

    ctx.restore();

    this.drawVignette(ctx);
    this.drawMinimap(ctx);
    this.drawBossMarker(ctx);
    Input.draw(ctx);
  },

  // Миникарта в углу: строения, толпа, босс и ящики. Рисуем прямо на основном
  // холсте в экранных координатах, отдельный канвас тут ни к чему.
  mapRange: 2400,
  drawMinimap: function (ctx) {
    var size = Math.min(132, Math.max(92, this.w * 0.16));
    var pad = 10;
    var x0 = this.w - size - pad;
    var y0 = pad + 58;
    var k = size / (this.mapRange * 2);
    var p = this.player;

    // в 3D миникарта в тон интерфейсу: темное железо и выцветшая краска
    var iron = View3D.on;
    ctx.save();
    ctx.globalAlpha = iron ? 0.8 : 0.72;
    ctx.fillStyle = iron ? '#1c150f' : '#081418';
    ctx.strokeStyle = iron ? '#7a6a58' : '#1d4550';
    ctx.lineWidth = iron ? 2 : 1;
    ctx.fillRect(x0, y0, size, size);
    ctx.strokeRect(x0, y0, size, size);

    ctx.beginPath();
    ctx.rect(x0, y0, size, size);
    ctx.clip();

    var cx = x0 + size / 2, cy = y0 + size / 2;
    var i, o, mx, my;

    // строения
    ctx.fillStyle = iron ? '#a08566' : '#4e8496';
    for (i = 0; i < World.near.length; i++) {
      o = World.near[i];
      ctx.fillRect(cx + (o.x - p.x) * k, cy + (o.y - p.y) * k,
        Math.max(2, o.w * k), Math.max(2, o.h * k));
    }

    // ящики
    for (i = 0; i < World.crates.length; i++) {
      o = World.crates[i];
      ctx.fillStyle = o.ex ? '#ff5a3c' : (o.loot === 'heal' ? CFG.col.heal : CFG.col.ally);
      ctx.fillRect(cx + (o.x - p.x) * k - 1.5, cy + (o.y - p.y) * k - 1.5, 3, 3);
    }

    // толпа и боссы
    for (i = 0; i < this.enemies.length; i++) {
      o = this.enemies[i];
      if (o.dead) continue;
      mx = cx + (o.x - p.x) * k;
      my = cy + (o.y - p.y) * k;
      if (mx < x0 || mx > x0 + size || my < y0 || my > y0 + size) continue;
      if (o.boss) {
        ctx.fillStyle = o.bd ? o.bd.trim : '#f0a24a';
        ctx.fillRect(mx - 3, my - 3, 6, 6);
      } else {
        ctx.fillStyle = o.elite ? '#a24bd6' : '#c9563a';
        ctx.fillRect(mx - 1, my - 1, 2, 2);
      }
    }

    // сам игрок и куда смотрит
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(p.ang) * 8, cy + Math.sin(p.ang) * 8);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.globalAlpha = 1;
  },

  // Свое здоровье прямо над машиной в плоском режиме (в 3D то же рисует
  // View3D.drawOverlay). Полоса внизу остается, это дубль.
  drawPlayerHp: function (ctx) {
    var p = this.player;
    if (!p || !p.alive) return;
    var w = 44, k = U.clamp(p.hp / p.st.maxHp, 0, 1);
    var x = p.x - w / 2, y = p.y - p.r - 16;
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(x - 1, y - 1, w + 2, 6);
    ctx.fillStyle = k > 0.3 ? '#e2503a' : (Math.floor(this.time * 6) % 2 ? '#ff9a7a' : '#e2503a');
    ctx.fillRect(x, y, w * k, 4);
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    for (var t = 1; t < 5; t++) ctx.fillRect(x + w * t / 5, y, 1, 4);
  },

  // стрелка к боссу, если он уехал за край экрана
  drawBossMarker: function (ctx) {
    var boss = null;
    for (var i = 0; i < this.enemies.length; i++) if (this.enemies[i].boss) { boss = this.enemies[i]; break; }
    if (!boss) return;
    var sx, sy;
    if (View3D.on) {
      var s = View3D.toScreen(boss.x, boss.y, boss.r);
      sx = s.x; sy = s.y;
    } else {
      sx = (boss.x - this.cam.x) * this.scale + this.w / 2;
      sy = (boss.y - this.cam.y) * this.scale + this.h / 2;
    }
    var pad = 42;
    if (sx > pad && sx < this.w - pad && sy > pad && sy < this.h - pad) return;

    var cx = this.w / 2, cy = this.h / 2;
    var a = Math.atan2(sy - cy, sx - cx);
    var rx = Math.min(cx - pad, Math.abs(Math.cos(a)) > 0.001 ? Math.abs((cx - pad) / Math.cos(a)) : 1e9);
    var ry = Math.min(cy - pad, Math.abs(Math.sin(a)) > 0.001 ? Math.abs((cy - pad) / Math.sin(a)) : 1e9);
    var r = Math.min(rx, ry);
    var mx = cx + Math.cos(a) * r, my = cy + Math.sin(a) * r;

    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(a);
    ctx.fillStyle = '#f0a24a';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-10, -9);
    ctx.lineTo(-10, 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  },

  drawFloor: function (ctx) {
    var step = CFG.grid;
    var halfW = this.w / 2 / this.scale, halfH = this.h / 2 / this.scale;
    var x0 = Math.floor((this.cam.x - halfW) / step) * step;
    var x1 = this.cam.x + halfW;
    var y0 = Math.floor((this.cam.y - halfH) / step) * step;
    var y1 = this.cam.y + halfH;

    ctx.strokeStyle = 'rgba(42,88,99,.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = x0; x < x1 + step; x += step) {
      ctx.moveTo(x, y0); ctx.lineTo(x, y1 + step);
    }
    for (var y = y0; y < y1 + step; y += step) {
      ctx.moveTo(x0, y); ctx.lineTo(x1 + step, y);
    }
    ctx.stroke();

    // хлам на земле: позиция считается от координат клетки, поэтому не дергается
    ctx.fillStyle = 'rgba(30,62,72,.55)';
    for (var gx = x0; gx < x1 + step; gx += step) {
      for (var gy = y0; gy < y1 + step; gy += step) {
        var hash = ((gx * 73856093) ^ (gy * 19349663)) >>> 0;
        if ((hash % 11) !== 0) continue;
        var ox = (hash % 61) - 30, oy = ((hash >> 6) % 61) - 30;
        var size = 8 + (hash % 17);
        ctx.fillRect(gx + ox, gy + oy, size, size * 0.7);
      }
    }
  },

  drawClouds: function (ctx) {
    for (var i = 0; i < this.clouds.length; i++) {
      var c = this.clouds[i];
      var a = Math.min(1, c.life / 2) * 0.22;
      GlowCache.draw(ctx, 'rgba(126,224,138,.5)', c.x, c.y, c.r, a);
      ctx.globalAlpha = a + 0.1;
      ctx.strokeStyle = CFG.col.heal;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r * 0.92, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  },

  drawPickups: function (ctx) {
    var i, t = this.time;
    for (i = 0; i < this.gems.length; i++) {
      var g = this.gems[i];
      GlowCache.draw(ctx, 'rgba(111,227,195,.22)', g.x, g.y, g.r * 1.9, 1);
      ctx.fillStyle = '#6fe3c3';
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(t * 2 + g.x);
      ctx.fillRect(-g.r / 2, -g.r / 2, g.r, g.r);
      ctx.restore();
    }
    for (i = 0; i < this.heals.length; i++) {
      var h = this.heals[i];
      var blink = h.life < 4 && Math.floor(h.life * 6) % 2 === 0;
      if (blink) continue;
      GlowCache.draw(ctx, 'rgba(126,224,138,.4)', h.x, h.y, 22, 1);
      ctx.fillStyle = '#7ee08a';
      ctx.fillRect(h.x - 9, h.y - 3, 18, 6);
      ctx.fillRect(h.x - 3, h.y - 9, 6, 18);
    }
  },

  drawEnemyBullets: function (ctx) {
    for (var i = 0; i < this.ebullets.length; i++) {
      var b = this.ebullets[i];
      GlowCache.draw(ctx, b.c === CFG.col.spit ? 'rgba(182,224,122,.35)' : CFG.col.enemyShotGlow, b.x, b.y, b.r * 2.6, 1);
      ctx.fillStyle = b.c;
      if (b.spear) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.ang);
        ctx.fillRect(-b.r * 3, -b.r * 0.42, b.r * 6, b.r * 0.84);
        ctx.beginPath();
        ctx.moveTo(b.r * 3, -b.r * 0.9);
        ctx.lineTo(b.r * 4.6, 0);
        ctx.lineTo(b.r * 3, b.r * 0.9);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },

  vignetteCache: null,
  drawVignette: function (ctx) {
    // Окно бывает нулевого размера: в iframe площадки до первого показа и при
    // сворачивании. Канвас 0x0 роняет drawImage, поэтому просто пропускаем кадр.
    if (this.w < 2 || this.h < 2) return;
    // в 3D виньетка меняется со временем суток: днем теплая и легкая, ночью темная
    var rgb = View3D.on ? View3D.vig.rgb : '0,0,0';
    var a = View3D.on ? Math.round(View3D.vig.k * 20) / 20 : 0.55;
    var key = this.w + 'x' + this.h + ':' + rgb + ':' + a;
    if (!this.vignetteCache || this.vignetteCache.key !== key) {
      var c = document.createElement('canvas');
      c.width = this.w; c.height = this.h;
      var g = c.getContext('2d');
      var grad = g.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.35,
        this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.75);
      grad.addColorStop(0, 'rgba(' + rgb + ',0)');
      grad.addColorStop(1, 'rgba(' + rgb + ',' + a + ')');
      g.fillStyle = grad;
      g.fillRect(0, 0, this.w, this.h);
      this.vignetteCache = { c: c, key: key };
    }
    ctx.drawImage(this.vignetteCache.c, 0, 0, this.w, this.h);
  },

  // ---------- цикл ----------

  frame: function (ts) {
    var self = this;
    requestAnimationFrame(function (t) { self.frame(t); });

    var dt = (ts - this.lastTs) / 1000;
    this.lastTs = ts;
    if (!(dt > 0)) return;
    if (dt > 0.25) dt = 0.25;   // после сворачивания вкладки не проматываем полчаса боя

    if (this.running && !this.paused) {
      this.acc += dt;
      var steps = 0;
      while (this.acc >= this.fixed && steps < 5) {
        this.update(this.fixed);
        this.acc -= this.fixed;
        steps++;
      }
      if (steps === 5) this.acc = 0;
      UI.updateHud();
    }
    if (this.running) this.render();
    else if (View3D.on) View3D.idle();
    // музыку планируем по часам звука, а не по шагу игры: так ритм не плывет
    Snd.music();
  },

  run: function () {
    var self = this;
    this.lastTs = performance.now();
    requestAnimationFrame(function (t) { self.frame(t); });
  }
};
