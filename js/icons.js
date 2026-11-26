var Icons = {
  paths: {
    car: '<rect x="3" y="12" width="18" height="6" rx="2"/><path d="M6 12V9h7l2 3"/><path d="M13 10h8"/><circle cx="7" cy="18" r="1.4"/><circle cx="12" cy="18" r="1.4"/><circle cx="17" cy="18" r="1.4"/>',
    gun: '<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/><circle cx="12" cy="12" r="1.4"/>',
    paint: '<rect x="7" y="9" width="10" height="12" rx="2"/><path d="M9 9V6h6v3"/><path d="M12 6V3"/><path d="M15 3h3M16 5.5l2 1"/>',
    module: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/><rect x="10" y="10" width="4" height="4"/>',
    skull: '<path d="M12 3a7 7 0 0 0-7 7v4l2 2v3h10v-3l2-2v-4a7 7 0 0 0-7-7z"/><circle cx="9" cy="11" r="1.6"/><circle cx="15" cy="11" r="1.6"/><path d="M10 19v-2M14 19v-2"/>',
    hangar: '<path d="M3 21V9l9-6 9 6v12"/><path d="M7 21v-8h10v8"/><path d="M7 16h10"/>',
    board: '<path d="M3 21h18"/><rect x="9" y="9" width="6" height="12"/><rect x="3" y="14" width="6" height="7"/><rect x="15" y="16" width="6" height="5"/><path d="M12 3l1 2 2 .3-1.5 1.4.4 2.1-1.9-1-1.9 1 .4-2.1L9 5.3 11 5z"/>',
    crate: '<rect x="3" y="7" width="18" height="13" rx="1"/><path d="M3 11h18M8 7v13M16 7v13"/><path d="M7 7l2-3h6l2 3"/>',
    dmg: '<path d="M12 3c2 2 3 5 3 8v8H9v-8c0-3 1-6 3-8z"/><path d="M9 15h6"/>',
    hp: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/><path d="M12 8v8M8 12h8"/>',
    spd: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/><path d="M12 4v5.5M12 14.5V20M4 12h5.5M14.5 12H20"/>',
    xp: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 12l6-6"/>',
    loot: '<path d="M5 3h4v9a3 3 0 0 0 6 0V3h4v9a7 7 0 0 1-14 0z"/><path d="M5 7h4M15 7h4"/>',
    cd: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    radius: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="10" stroke-dasharray="3 3"/>',
    tech: '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 9h6v6H9z"/><path d="M5 9H2M5 15H2M22 9h-3M22 15h-3"/>',
    regen: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3"/><path d="M12 10.5v6M9 13.5h6"/>'
  },

  svg: function (name, size) {
    var p = this.paths[name];
    if (!p) return '';
    size = size || 16;
    return '<svg class="ico" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  },

  apply: function () {
    var nodes = document.querySelectorAll('[data-icon]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.querySelector('svg.ico')) continue;
      el.insertAdjacentHTML('afterbegin', this.svg(el.getAttribute('data-icon'), +(el.getAttribute('data-icon-size') || 16)));
      el.classList.add('with-ic');
    }
  }
};

var Glyph = {
  S: 64,
  B: 84,
  font: '"Segoe UI Symbol","Apple Symbols","Noto Sans Symbols 2","DejaVu Sans",sans-serif',
  cache: {},

  url: function (ch) {
    if (this.cache[ch] !== undefined) return this.cache[ch];
    var out = '';
    try {
      var B = this.B, S = this.S, c = this._c || (this._c = document.createElement('canvas'));
      c.width = c.height = B;
      var g = c.getContext('2d'), txt = '', i;
      for (i = 0; i < ch.length; i++) {
        var cc = ch.charCodeAt(i);
        txt += ch.charAt(i);
        if (cc >= 0xD800 && cc <= 0xDBFF && i + 1 < ch.length) txt += ch.charAt(++i);
        txt += '\uFE0E';
      }
      g.font = S + 'px ' + this.font;
      g.textBaseline = 'alphabetic';
      var m = g.measureText(txt);
      var l = m.actualBoundingBoxLeft, r = m.actualBoundingBoxRight, a = m.actualBoundingBoxAscent, d = m.actualBoundingBoxDescent;
      if (!(l + r > 0 && a + d > 0)) { l = 0; r = m.width || S; a = S * 0.76; d = S * 0.14; }
      var w = l + r, h = a + d, k = Math.min(1, (B - 6) / w, (B - 6) / h);
      g.clearRect(0, 0, B, B);
      g.fillStyle = '#fff';
      g.setTransform(k, 0, 0, k, B / 2, B / 2);
      g.fillText(txt, l - w / 2, a - h / 2);
      g.setTransform(1, 0, 0, 1, 0, 0);
      out = c.toDataURL('image/png');
    } catch (e) { out = ''; }
    return (this.cache[ch] = out);
  },

  html: function (ch, col, cls) {
    var u = this.url(ch), st = col ? 'color:' + col + ';' : '';
    if (!u) return '<i' + (cls ? ' class="' + cls + '"' : '') + (st ? ' style="' + st + '"' : '') + '>' + ch + '</i>';
    return '<i class="gl' + (cls ? ' ' + cls : '') + '" style="' + st + '-webkit-mask-image:url(' + u + ');mask-image:url(' + u + ')"></i>';
  }
};
