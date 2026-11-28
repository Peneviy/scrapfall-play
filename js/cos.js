var Cos = {
  kinds: ['skins', 'auras', 'shapes', 'tints', 'tails', 'bangs'],
  base: { skins: 'rust', auras: 'none', shapes: 'bolt', tints: 'stock', tails: 'none', bangs: 'stock' },

  fit: {},

  auras: [
    { id: 'none', tid: 'aura_none', rar: 0, col: '',
      ru: { n: 'БЕЗ АУРЫ', d: 'Под машиной чистая земля.' },
      en: { n: 'No Aura', d: 'Bare ground under the machine.' } },
    { id: 'dust', tid: 'aura_dust', rar: 1, src: { coins: 1500 }, col: '#d8b98a',
      ru: { n: 'ДОРОЖНАЯ ПЫЛЬ', d: 'Мягкое песочное кольцо, у земли кружат пылинки.' },
      en: { n: 'Road Dust', d: 'A soft sandy ring, dust motes drift near the ground.' } },
    { id: 'deep', tid: 'aura_deep', rar: 2, src: { coins: 8000 }, col: '#5cc8ff',
      ru: { n: 'ХОЛОД ГЛУБИНЫ', d: 'Два синих кольца расходятся волной.' },
      en: { n: 'Chill of the Deep', d: 'Two blue rings spread out like a wave.' } },
    { id: 'void', tid: 'aura_void', rar: 3, src: { coins: 25000 }, col: '#b06bff',
      ru: { n: 'ШЕПОТ ПУСТОТЫ', d: 'Фиолетовый круг, искры тянутся к центру.' },
      en: { n: 'Whisper of the Void', d: 'A violet circle, sparks are drawn to its center.' } },
    { id: 'wrath', tid: 'aura_wrath', rar: 4, src: { ach: 'queen3' }, col: '#ff6a3d',
      ru: { n: 'ГНЕВ КОРОЛЕВЫ', d: 'Красно-золотые языки пламени по кругу.' },
      en: { n: 'Wrath of the Queen', d: 'Red and gold tongues of flame in a circle.' } },
    { id: 'sun', tid: 'aura_sun', rar: 5, src: { sku: 'cos_aura_sun', coins: 100000 }, col: '#ffd24a',
      ru: { n: 'КОРОНА ПАДШЕГО СОЛНЦА', d: 'Золотые лучи вращаются, искры поднимаются вверх.' },
      en: { n: 'Crown of the Fallen Sun', d: 'Golden rays turn, sparks rise upward.' } }
  ],

  shapes: [
    { id: 'bolt', tid: 'shape_bolt', rar: 0,
      ru: { n: 'ЗАВОДСКАЯ ПУЛЯ', d: 'Круглая пуля, как с завода.' },
      en: { n: 'Factory Round', d: 'A round bullet, straight from the factory.' } },
    { id: 'sting', tid: 'shape_sting', rar: 1, src: { coins: 1500 },
      ru: { n: 'ЖАЛО ОСЫ', d: 'Тонкая длинная игла.' },
      en: { n: 'Wasp Sting', d: 'A long thin needle.' } },
    { id: 'shard', tid: 'shape_shard', rar: 2, src: { coins: 8000 },
      ru: { n: 'ОСКОЛОК ЗЕРКАЛА', d: 'Плоский ромб, одна грань блестит.' },
      en: { n: 'Mirror Shard', d: 'A flat diamond with one gleaming facet.' } },
    { id: 'fang', tid: 'shape_fang', rar: 3, src: { coins: 25000 },
      ru: { n: 'ЗУБ ДРАКОНА', d: 'Широкий клин, как наконечник копья.' },
      en: { n: 'Dragon Fang', d: 'A wide wedge, like a spearhead.' } },
    { id: 'star', tid: 'shape_star', rar: 4, src: { ach: 'bosses10' },
      ru: { n: 'ЗВЕЗДА МЕРТВЕЦА', d: 'Звезда в четыре луча, крутится в полете.' },
      en: { n: 'Dead Man\'s Star', d: 'A four-pointed star that spins in flight.' } },
    { id: 'tear', tid: 'shape_tear', rar: 5, src: { sku: 'cos_shape_tear', coins: 100000 },
      ru: { n: 'СЛЕЗА ТИТАНА', d: 'Капля-комета с белым ядром.' },
      en: { n: 'Titan\'s Tear', d: 'A comet-like drop with a white core.' } }
  ],

  tints: [
    { id: 'stock', tid: 'tint_stock', rar: 0, col: CFG.col.ally,
      ru: { n: 'ЗАВОДСКОЕ ЗОЛОТО', d: 'Теплые золотые пули, как с завода.' },
      en: { n: 'Factory Gold', d: 'Warm golden bullets, straight from the factory.' } },
    { id: 'acid', tid: 'tint_acid', rar: 1, src: { coins: 1500 }, col: '#9cff3d',
      ru: { n: 'КИСЛОТНЫЙ ДОЖДЬ', d: 'Ядовито-зеленые пули.' },
      en: { n: 'Acid Rain', d: 'Toxic green bullets.' } },
    { id: 'ice', tid: 'tint_ice', rar: 2, src: { coins: 8000 }, col: '#6fe9ff',
      ru: { n: 'ЛЕД СЕВЕРНЫХ МОРЕЙ', d: 'Холодные голубые пули.' },
      en: { n: 'Ice of the Northern Seas', d: 'Cold pale-blue bullets.' } },
    { id: 'dusk', tid: 'tint_dusk', rar: 3, src: { coins: 25000 }, col: '#ff6ad5',
      ru: { n: 'ЗАКАТ НАД ПУСТОШЬЮ', d: 'Розовые пули, как небо на закате.' },
      en: { n: 'Dusk over the Wasteland', d: 'Pink bullets, like the sky at dusk.' } },
    { id: 'heat', tid: 'tint_heat', rar: 4, src: { ach: 'sea' }, col: '#fff6e0', halo: '#ff8a3c',
      ru: { n: 'БЕЛОЕ КАЛЕНИЕ', d: 'Белое ядро в рыжем ореоле.' },
      en: { n: 'White Heat', d: 'A white core in an orange halo.' } },
    { id: 'rainbow', tid: 'tint_rainbow', rar: 5, src: { sku: 'cos_tint_rainbow', coins: 100000 }, col: '#ffffff', hue: true,
      ru: { n: 'РАДУГА ПОСЛЕ БУРИ', d: 'Цвет переливается, пока пуля летит.' },
      en: { n: 'Rainbow After the Storm', d: 'The color shifts while the bullet flies.' } }
  ],

  tails: [
    { id: 'none', tid: 'tail_none', rar: 0,
      ru: { n: 'БЕЗ СЛЕДА', d: 'Пуля летит чисто, без следа.' },
      en: { n: 'No Trail', d: 'The bullet flies clean, no trail.' } },
    { id: 'smoke', tid: 'tail_smoke', rar: 1, src: { coins: 1500 },
      ru: { n: 'ДЫХАНИЕ КОСТРА', d: 'Серые дымки тают за пулей.' },
      en: { n: 'Campfire Breath', d: 'Grey wisps of smoke melt behind the bullet.' } },
    { id: 'comet', tid: 'tail_comet', rar: 2, src: { coins: 8000 },
      ru: { n: 'ХВОСТ КОМЕТЫ', d: 'Светящаяся полоса цвета пули.' },
      en: { n: 'Comet Tail', d: 'A glowing streak in the color of the bullet.' } },
    { id: 'sparks', tid: 'tail_sparks', rar: 3, src: { coins: 25000 },
      ru: { n: 'ИСКРЫ НАКОВАЛЬНИ', d: 'Искры разлетаются в стороны.' },
      en: { n: 'Anvil Sparks', d: 'Sparks scatter to the sides.' } },
    { id: 'ash', tid: 'tail_ash', rar: 4, src: { ach: 'lvl30' },
      ru: { n: 'ПЕПЕЛ ФЕНИКСА', d: 'Угольки поднимаются и гаснут.' },
      en: { n: 'Phoenix Ash', d: 'Embers rise and fade out.' } },
    { id: 'stars', tid: 'tail_stars', rar: 5, src: { sku: 'cos_tail_stars', coins: 100000 },
      ru: { n: 'МЛЕЧНЫЙ ПУТЬ', d: 'Мерцающая звездная пыль.' },
      en: { n: 'Milky Way', d: 'Twinkling stardust.' } }
  ],

  bangs: [
    { id: 'stock', tid: 'bang_stock', rar: 0,
      ru: { n: 'ЗАВОДСКОЙ ХЛОПОК', d: 'Круглый деревянный хлопок, как пробка.' },
      en: { n: 'Factory Pop', d: 'A round wooden pop, like a cork.' } },
    { id: 'rain', tid: 'bang_rain', rar: 1, src: { coins: 1500 },
      ru: { n: 'СТУК ДОЖДЯ', d: 'Мягкий деревянный тик.' },
      en: { n: 'Rain Tap', d: 'A soft wooden tick.' } },
    { id: 'latch', tid: 'bang_latch', rar: 2, src: { coins: 8000 },
      ru: { n: 'ЩЕЛЧОК ЗАТВОРА', d: 'Сухой механический щелчок.' },
      en: { n: 'Bolt Click', d: 'A dry mechanical click.' } },
    { id: 'beam', tid: 'bang_beam', rar: 3, src: { coins: 25000 },
      ru: { n: 'ПЕСНЯ ЛУЧА', d: 'Короткое "пиу" лазера.' },
      en: { n: 'Song of the Beam', d: 'A short laser "pew".' } },
    { id: 'forge', tid: 'bang_forge', rar: 4, src: { ach: 'queen5' },
      ru: { n: 'ГРОМ КУЗНИЦЫ', d: 'Тяжелый низкий удар.' },
      en: { n: 'Forge Thunder', d: 'A heavy low thud.' } },
    { id: 'choir', tid: 'bang_choir', rar: 5, src: { sku: 'cos_bang_choir', coins: 100000 },
      ru: { n: 'ХОР ХРУСТАЛЯ', d: 'Колокольчик, ноты звенят по очереди.' },
      en: { n: 'Crystal Choir', d: 'A little bell, its notes ring one after another.' } }
  ],

  ach: {
    queen3: { of: 4, n: function () {
      var R = Cos.recs(), m = 0, i;
      for (i = 0; i < R.length; i++) m = Math.max(m, R[i].prestige | 0);
      return m;
    } },
    bosses10: { of: function () { return Bosses.list.length; }, n: function () { return Bosses.defeated(); } },
    sea: { of: 1, vars: function () { return { m: Maps.name('sea') }; }, n: function () {
      var m = Save.data.m && Save.data.m.sea;
      return m && (m.wins | 0) > 0 ? 1 : 0;
    } },
    lvl30: { of: 30, n: function () {
      var R = Cos.recs(), m = 0, i;
      for (i = 0; i < R.length; i++) m = Math.max(m, (R[i].best && R[i].best.level) | 0);
      return m;
    } },
    queen5: { of: 5, n: function () {
      var R = Cos.recs(), s = 0, i;
      for (i = 0; i < R.length; i++) s += R[i].wins | 0;
      return s;
    } }
  },

  recs: function () {
    var d = Save.data, L = CFG.maps.list, out = [d], i;
    for (i = 1; i < L.length; i++) if (d.m && d.m[L[i].id]) out.push(d.m[L[i].id]);
    return out;
  },

  achProg: function (id) {
    var a = this.ach[id];
    if (!a || !Save.data) return { n: 0, of: 1 };
    var of = typeof a.of === 'function' ? a.of() : a.of;
    return { n: Math.max(0, Math.min(of, a.n() | 0)), of: of };
  },

  achText: function (id) {
    var a = this.ach[id];
    return I18N.t('ach_' + id, a && a.vars ? a.vars() : null);
  },

  field: function (kind) { return kind.slice(0, -1); },

  list: function (kind) {
    if (kind === 'skins') return Content.skins;
    return this.kinds.indexOf(kind) > 0 ? this[kind] : [];
  },

  gotText: function (it) {
    var s = I18N.t('cosGot', { n: I18N.name(it) });
    return it && it.col && this.item('auras', it.id) === it ? s + '. ' + I18N.t('cosNickGot') : s;
  },

  item: function (kind, id) {
    var L = this.list(kind);
    for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i];
    return null;
  },

  bySku: function (sku) {
    for (var k = 0; k < this.kinds.length; k++) {
      var L = this.list(this.kinds[k]);
      for (var i = 0; i < L.length; i++) if (L[i].src && L[i].src.sku === sku) return { kind: this.kinds[k], it: L[i] };
    }
    return null;
  },

  owned: function (kind, id) {
    var d = Save.data;
    return id === this.base[kind] || !!(d && d[kind] && d[kind][id]);
  },

  fitOn: function () { return !(window.Game && Game.running && !Game.fit); },
  fitClear: function () { for (var k in this.fit) delete this.fit[k]; },

  cur: function (kind) {
    var d = Save.data, id = d ? d[this.field(kind)] : null, f = this.fit[kind];
    if (f && this.fitOn() && this.item(kind, f)) id = f;
    else if (!this.owned(kind, id)) id = null;
    return this.item(kind, id) || this.item(kind, this.base[kind]);
  },

  way: function (it) {
    var s = it && it.src;
    if (!s) return 'base';
    if (s.ach) return 'ach';
    if (s.sku && window.Shop && Shop.price[s.sku]) return 'rub';
    return 'coins';
  },

  cost: function (it) { return (it && it.src && it.src.coins) || 0; },

  can: function (kind, id) {
    var it = this.item(kind, id), w = this.way(it);
    if (!it) return false;
    if (w === 'ach') { var p = this.achProg(it.src.ach); return p.n >= p.of; }
    if (w === 'coins') return Save.canPay(this.cost(it));
    return true;
  },

  wear: function (kind, id) {
    if (!this.item(kind, id) || !this.owned(kind, id)) return false;
    Save.equip(kind, id);
    return true;
  },

  get: function (kind, id) {
    var it = this.item(kind, id), w = this.way(it);
    if (!it) return '';
    if (this.owned(kind, id)) { Save.equip(kind, id); return 'ok'; }
    if (w === 'rub') { Shop.buy(it.src.sku); return 'shop'; }
    if (w === 'ach') { if (!this.can(kind, id)) return 'lock'; }
    else if (!Save.pay(this.cost(it))) return 'poor';
    Save.unlock(kind, id);
    Save.equip(kind, id);
    return 'ok';
  },

  rarCol: function (r) { var R = CFG.cos.rar; return R[r] || R[0]; },
  rarName: function (r) { return I18N.t('rar' + (r | 0)); },

  rnd: function (i) {
    var x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  },

  tintHue: function (t, x, y) {
    return Math.floor((((t || 0) * 90 + ((x || 0) + (y || 0)) * 0.35) % 360 + 360) % 360);
  },
  tintCol: function (tint, t, x, y) {
    if (tint && tint.hue) return 'hsl(' + this.tintHue(t, x, y) + ',100%,66%)';
    return (tint && tint.col) || CFG.col.ally;
  },
  shotHue: function (t, x, y) { return 25 + this.tintHue(t, x, y) * 310 / 360; },

  bullet: function (ctx, x, y, r, ang, shape, tint, t) {
    var id = shape ? shape.id : 'bolt', col = this.tintCol(tint, t, x, y), halo = (tint && tint.halo) || col, i, a, k;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
    g.addColorStop(0, halo);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = tint && tint.halo ? 0.8 : 0.5;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(id === 'star' ? ang + t * 5 : ang);
    ctx.fillStyle = col;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (id === 'sting') {
      ctx.moveTo(r * 2.8, 0); ctx.lineTo(-r * 1.6, -r * 0.42); ctx.lineTo(-r * 2.3, 0); ctx.lineTo(-r * 1.6, r * 0.42);
    } else if (id === 'shard') {
      ctx.moveTo(r * 2, 0); ctx.lineTo(0, -r); ctx.lineTo(-r * 2, 0); ctx.lineTo(0, r);
    } else if (id === 'fang') {
      ctx.moveTo(r * 1.9, 0); ctx.lineTo(-r * 1.4, -r * 1.3); ctx.lineTo(-r * 0.6, 0); ctx.lineTo(-r * 1.4, r * 1.3);
    } else if (id === 'star') {
      for (i = 0; i < 8; i++) {
        a = i * Math.PI / 4; k = i % 2 ? r * 0.55 : r * 2;
        if (i) ctx.lineTo(Math.cos(a) * k, Math.sin(a) * k); else ctx.moveTo(k, 0);
      }
    } else if (id === 'tear') {
      ctx.arc(r * 0.6, 0, r * 1.1, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(-r * 2.8, 0);
    } else {
      ctx.arc(0, 0, r, 0, Math.PI * 2);
    }
    ctx.closePath();
    ctx.fill();
    if (tint && tint.halo) {
      ctx.strokeStyle = tint.halo;
      ctx.lineWidth = Math.max(1, r * 0.3);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    if (id === 'shard') {
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.moveTo(r * 2, 0); ctx.lineTo(0, -r); ctx.lineTo(-r * 2, 0);
      ctx.closePath();
      ctx.fill();
    } else if (id === 'tear') {
      ctx.beginPath();
      ctx.arc(r * 0.7, 0, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  tail: function (ctx, x, y, r, ang, tail, tint, t) {
    var id = tail ? tail.id : 'none';
    if (id === 'none') return;
    var bx = -Math.cos(ang), by = -Math.sin(ang), nx = -by, ny = bx, L = r * 9;
    var i, a, d, s, px, py, q;
    ctx.save();
    ctx.lineCap = 'round';
    if (id === 'comet') {
      var g = ctx.createLinearGradient(x, y, x + bx * L, y + by * L);
      g.addColorStop(0, this.tintCol(tint, t, x, y));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x + nx * r * 0.85, y + ny * r * 0.85);
      ctx.lineTo(x + bx * L, y + by * L);
      ctx.lineTo(x - nx * r * 0.85, y - ny * r * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }
    var N = id === 'smoke' ? 6 : 9;
    for (i = 0; i < N; i++) {
      a = ((t * 0.9 + i / N) % 1 + 1) % 1;
      d = r * 1.2 + a * L;
      s = (this.rnd(i + 1) - 0.5) * 2;
      px = x + bx * d; py = y + by * d;
      if (id === 'smoke') {
        px += nx * s * r * 1.1 * a; py += ny * s * r * 1.1 * a;
        ctx.globalAlpha = 0.55 * (1 - a);
        ctx.fillStyle = '#b9b3aa';
        ctx.beginPath();
        ctx.arc(px, py, r * (0.5 + a * 1.2), 0, Math.PI * 2);
        ctx.fill();
      } else if (id === 'sparks') {
        px += nx * s * r * 3.4 * a; py += ny * s * r * 3.4 * a;
        ctx.globalAlpha = 1 - a;
        ctx.strokeStyle = a < 0.4 ? '#fff3c4' : '#ffb347';
        ctx.lineWidth = Math.max(1, r * 0.24);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + (bx * 0.5 + nx * s * 0.9) * r, py + (by * 0.5 + ny * s * 0.9) * r);
        ctx.stroke();
      } else if (id === 'ash') {
        px += nx * s * r * 0.9; py += ny * s * r * 0.9 - a * a * r * 3.4;
        ctx.globalAlpha = 1 - a * 0.9;
        ctx.fillStyle = a < 0.35 ? '#ffd27a' : (a < 0.7 ? '#ff7a2e' : '#9a3118');
        ctx.beginPath();
        ctx.arc(px, py, r * (0.36 - a * 0.16), 0, Math.PI * 2);
        ctx.fill();
      } else {
        px += nx * s * r * 1.4; py += ny * s * r * 1.4;
        var tw = 0.5 + 0.5 * Math.sin(t * 9 + i * 2.4);
        ctx.globalAlpha = (1 - a * 0.8) * (0.35 + 0.65 * tw);
        ctx.fillStyle = i % 3 ? '#ffffff' : '#bcd4ff';
        q = r * (0.2 + 0.3 * tw) * (i % 2 ? 1 : 0.65);
        ctx.beginPath();
        ctx.moveTo(px, py - q * 2); ctx.lineTo(px + q * 0.45, py - q * 0.45);
        ctx.lineTo(px + q * 2, py); ctx.lineTo(px + q * 0.45, py + q * 0.45);
        ctx.lineTo(px, py + q * 2); ctx.lineTo(px - q * 0.45, py + q * 0.45);
        ctx.lineTo(px - q * 2, py); ctx.lineTo(px - q * 0.45, py - q * 0.45);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  },

  aura: function (ctx, x, y, R, it, t) {
    var id = it ? it.id : 'none', col = (it && it.col) || '#9aa3ad', i, a, k, N;
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = 'round';
    if (id === 'none') {
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(1, R * 0.025);
      if (ctx.setLineDash) ctx.setLineDash([R * 0.09, R * 0.09]);
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.82, 0, Math.PI * 2);
      ctx.stroke();
    } else if (id === 'dust') {
      ctx.strokeStyle = col;
      for (i = 0; i < 3; i++) {
        ctx.globalAlpha = 0.16 + i * 0.14;
        ctx.lineWidth = R * (0.3 - i * 0.1);
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.8, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#f1dcb8';
      for (i = 0; i < 7; i++) {
        a = i * 0.9 + t * (0.25 + this.rnd(i) * 0.2);
        k = R * (0.68 + this.rnd(i + 9) * 0.3);
        ctx.globalAlpha = 0.35 + 0.45 * Math.abs(Math.sin(t * 1.3 + i));
        ctx.beginPath();
        ctx.arc(Math.cos(a) * k, Math.sin(a) * k, R * 0.035, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'deep') {
      ctx.globalAlpha = 0.13;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.98, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = col;
      for (i = 0; i < 2; i++) {
        a = ((t * 0.45 + i * 0.5) % 1 + 1) % 1;
        ctx.globalAlpha = 0.95 * (1 - a * 0.85);
        ctx.lineWidth = R * 0.08 * (1.2 - a * 0.6);
        ctx.beginPath();
        ctx.arc(0, 0, R * (0.3 + a * 0.66), 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (id === 'void') {
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = col;
      ctx.lineWidth = R * 0.06;
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.92, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#e6ccff';
      ctx.lineWidth = Math.max(1, R * 0.035);
      for (i = 0; i < 9; i++) {
        k = 1 - ((t * 0.6 + this.rnd(i + 3)) % 1 + 1) % 1;
        a = i * 0.698 + this.rnd(i) + (1 - k) * 0.7;
        ctx.globalAlpha = Math.min(1, k * 1.6) * 0.9;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * R * (0.3 + k * 0.6), Math.sin(a) * R * (0.3 + k * 0.6));
        ctx.lineTo(Math.cos(a - 0.08) * R * (0.42 + k * 0.6), Math.sin(a - 0.08) * R * (0.42 + k * 0.6));
        ctx.stroke();
      }
    } else if (id === 'wrath') {
      N = 16;
      for (i = 0; i < N; i++) {
        a = i / N * Math.PI * 2 + t * 0.3;
        k = R * (0.2 + 0.1 * Math.sin(t * 5 + i * 1.7) + 0.06 * Math.sin(t * 8.3 + i * 0.9));
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#ff3d2e';
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.15) * R * 0.66, Math.sin(a - 0.15) * R * 0.66);
        ctx.lineTo(Math.cos(a + 0.14) * (R * 0.66 + k), Math.sin(a + 0.14) * (R * 0.66 + k));
        ctx.lineTo(Math.cos(a + 0.15) * R * 0.66, Math.sin(a + 0.15) * R * 0.66);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffd24a';
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.08) * R * 0.66, Math.sin(a - 0.08) * R * 0.66);
        ctx.lineTo(Math.cos(a + 0.08) * (R * 0.66 + k * 0.55), Math.sin(a + 0.08) * (R * 0.66 + k * 0.55));
        ctx.lineTo(Math.cos(a + 0.09) * R * 0.66, Math.sin(a + 0.09) * R * 0.66);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = col;
      ctx.lineWidth = R * 0.06;
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.65, 0, Math.PI * 2);
      ctx.stroke();
    } else if (id === 'sun') {
      N = 12;
      ctx.fillStyle = col;
      for (i = 0; i < N; i++) {
        a = i / N * Math.PI * 2 + t * 0.5;
        k = R * (i % 2 ? 0.8 : 0.98);
        ctx.globalAlpha = i % 2 ? 0.6 : 0.9;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.1) * R * 0.58, Math.sin(a - 0.1) * R * 0.58);
        ctx.lineTo(Math.cos(a) * k, Math.sin(a) * k);
        ctx.lineTo(Math.cos(a + 0.1) * R * 0.58, Math.sin(a + 0.1) * R * 0.58);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#fff2b8';
      ctx.lineWidth = R * 0.055;
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.57, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#fff6c9';
      for (i = 0; i < 8; i++) {
        a = ((t * 0.5 + this.rnd(i)) % 1 + 1) % 1;
        ctx.globalAlpha = 1 - a;
        ctx.beginPath();
        ctx.arc((this.rnd(i + 5) - 0.5) * R * 1.5, R * 0.45 - a * R * 1.35, R * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  },

  speaker: function (ctx, x, y, S, it, t) {
    var u = S * 0.085, i;
    ctx.save();
    ctx.translate(x - u * 1.1, y);
    ctx.fillStyle = ctx.strokeStyle = this.rarCol(it ? it.rar : 0);
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-u * 1.9, -u * 0.8); ctx.lineTo(-u * 0.8, -u * 0.8); ctx.lineTo(u * 0.5, -u * 1.9);
    ctx.lineTo(u * 0.5, u * 1.9); ctx.lineTo(-u * 0.8, u * 0.8); ctx.lineTo(-u * 1.9, u * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = u * 0.42;
    for (i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.4 + 0.6 * Math.max(0, Math.sin(t * 4 - i * 0.9));
      ctx.beginPath();
      ctx.arc(u * 0.4, 0, u * (1.3 + i * 0.95), -0.8, 0.8);
      ctx.stroke();
    }
    ctx.restore();
  },

  sample: function (ctx, w, h, kind, it, t) {
    var cx = w / 2, cy = h / 2, S = Math.min(w, h), d = Save.data;
    t = t || 0;
    ctx.clearRect(0, 0, w, h);
    var g = ctx.createRadialGradient(cx, cy, S * 0.1, cx, cy, S * 0.5);
    g.addColorStop(0, 'rgba(8,6,4,.74)');
    g.addColorStop(0.75, 'rgba(8,6,4,.52)');
    g.addColorStop(1, 'rgba(8,6,4,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (kind === 'auras') {
      this.aura(ctx, cx, cy, S * 0.43, it, t);
      Content.drawChar(ctx, cx, cy, S * 0.1, d.char, d.skin, -Math.PI / 2, false);
    } else if (kind === 'bangs') {
      this.speaker(ctx, cx, cy, S, it, t);
    } else {
      var o = { shapes: this.cur('shapes'), tints: this.cur('tints'), tails: this.cur('tails') };
      o[kind] = it;
      var ang = -0.5, r = S * 0.075, x = cx + Math.cos(ang) * S * 0.2, y = cy + Math.sin(ang) * S * 0.2;
      this.tail(ctx, x, y, r, ang, o.tails, o.tints, t);
      this.bullet(ctx, x, y, r, ang, o.shapes, o.tints, t);
    }
  }
};

(function () {
  var L = Content.skins;
  for (var i = 0; i < L.length; i++) if (L[i].cost > 0 && !L[i].src) L[i].src = { coins: L[i].cost };
})();
