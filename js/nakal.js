var Nakal = {
  run: -1,

  max: function () { return CFG.nakal.max; },
  rank: function (id) {
    var d = Save.data && Maps.rec(id);
    return d ? Math.max(0, Math.min(this.max(), d.prestige | 0)) : 0;
  },
  sel: function (id) {
    var d = Save.data && Maps.rec(id), r = this.rank(id);
    if (!d) return 0;
    var s = d.nakal;
    return (typeof s === 'number' && s >= 0 && s < r) ? s : r;
  },
  pick: function (n, id) {
    var r = this.rank(id);
    n = Math.max(0, Math.min(r, n | 0));
    Maps.rec(id).nakal = n === r ? -1 : n;
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

  cardHtml: function (id, on) {
    var r = this.rank(id), s = this.sel(id), html, i;
    if (r <= 0) return '';
    html = '<span class="map-nk"><span class="nk-head"><b>' + I18N.t('nakal') + '</b>' +
      '<button type="button" class="nk-q" data-tip="nk">?</button><span class="nk-steps">';
    for (i = 0; i <= r; i++) {
      html += '<button type="button" class="nk-st' + (i === s ? ' on' : '') + '" data-n="' + i + '">' + i + '</button>';
    }
    html += '</span></span>';
    if (on) {
      html += '<span class="nk-add">' + (s > 0 ? '+ ' : '') + this.add(s) +
        (s === r && r < this.max() ? ' · ' + I18N.t('nkNext', { m: r + 1 }) : '') + '</span>' +
        '<span class="nk-bon">' + this.bonus(s) + '</span>';
    }
    return html + '</span>';
  }
};
