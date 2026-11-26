var Nakal = {
  run: -1,

  max: function () { return CFG.nakal.max; },
  rank: function () {
    var d = Save.data && Maps.rec();
    return d ? Math.max(0, Math.min(this.max(), d.prestige | 0)) : 0;
  },
  sel: function () {
    var d = Save.data && Maps.rec(), r = this.rank();
    if (!d) return 0;
    var s = d.nakal;
    return (typeof s === 'number' && s >= 0 && s < r) ? s : r;
  },
  pick: function (n) {
    var r = this.rank();
    n = Math.max(0, Math.min(r, n | 0));
    Maps.rec().nakal = n === r ? -1 : n;
    Save.flush(true);
  },
  begin: function () { this.run = this.sel(); },
  tier: function () { return (window.Game && Game.running && this.run >= 0) ? this.run : this.sel(); },
  has: function (n) { return this.tier() >= n; },

  scoreK: function (t) { var S = CFG.nakal.score; t = t === undefined ? this.tier() : t; return S[Math.max(0, Math.min(S.length - 1, t))]; },
  phase: function (thr) { return this.has(2) ? Math.max(thr, CFG.nakal.phase2) : thr; },
  lairK: function () { return this.has(4) ? CFG.nakal.lairK : 1; },
  sleepMax: function () { return this.has(4) ? CFG.nakal.sleepMax : CFG.boss.lair.sleepMax; },
  healK: function () { return this.has(5) ? CFG.nakal.heal : 1; },

  win: function () {
    var d = Maps.rec(), r = this.rank(), t = this.run >= 0 ? this.run : this.sel();
    if (t !== r || r >= this.max()) return 0;
    var keep = d.nakal;
    d.prestige = r + 1;
    if (keep !== -1 && keep >= r) d.nakal = -1;
    return r + 1;
  },

  add: function (n) { return n > 0 ? I18N.t('nkAdd' + n) : I18N.t('nkAdd0'); },
  bonus: function (n) {
    var N = CFG.nakal;
    return I18N.t('nkBonus', { s: this.scoreK(n), c: Math.round(n * N.coin * 100), l: n * N.startLevel, h: Math.round(n * N.hp * 100) });
  },
  winText: function () {
    var t = this.tier(), up = window.Game && Game.nakalUp;
    return up ? I18N.t('nkWinUp', { n: t, m: up }) : I18N.t('nkWin', { n: t });
  },
  pauseText: function () {
    var t = this.tier();
    return (this.rank() > 0 || t > 0) ? I18N.t('nkPause', { n: t, s: this.scoreK(t) }) : '';
  },

  renderBox: function () {
    var box = document.getElementById('nakalBox'), shop = document.getElementById('scrShop');
    if (!box) return;
    var r = this.rank(), s = this.sel(), self = this;
    box.classList.toggle('hidden', r <= 0);
    if (shop) shop.classList.toggle('nk-on', r > 0);
    if (r <= 0) { var sl = document.getElementById('shopList'); if (sl) sl.style.bottom = ''; return; }
    var steps = box.querySelector('.nk-steps');
    steps.innerHTML = '';
    for (var i = 0; i <= r; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'nk-st' + (i === s ? ' on' : '');
      b.textContent = i;
      b.setAttribute('data-n', i);
      b.onclick = function () { self.pick(+this.getAttribute('data-n')); Snd.play('pick'); self.renderBox(); if (window.UI) UI.refreshMenu(); };
      steps.appendChild(b);
    }
    box.querySelector('.nk-add').textContent = (s > 0 ? '+ ' : '') + this.add(s) +
      (s === r && r < this.max() ? ' · ' + I18N.t('nkNext', { m: r + 1 }) : '');
    box.querySelector('.nk-bon').textContent = this.bonus(s);
    var list = document.getElementById('shopList');
    if (list && box.offsetHeight) list.style.bottom = (box.offsetHeight + 6) + 'px';
  }
};
