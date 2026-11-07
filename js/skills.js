var Skills = {
  list: [
    {
      id: 'split', max: 4, w: 10, rar: 'rare', ic: '⟩⟩', col: '#ffd27d',
      syn: ['rapid', 'triple'],
      ru: { n: 'Расщепитель', d: '+1 пуля в веере' },
      en: { n: 'Splitter', d: '+1 bullet in the fan' },
      apply: function (p) { p.st.count += 1; p.st.spread += 0.06; },
      at: function (l) { return I18N.t('at_split', { n: l + 2 }); },
    },
    {
      id: 'triple', max: 2, w: 7, rar: 'rare', ic: '✵', col: '#ffd27d',
      syn: ['split', 'rapid'],
      ru: { n: 'Веер во все стороны', d: 'Сначала выстрел назад, на втором уровне - ещё и вбок' },
      en: { n: 'All directions', d: 'First a shot backwards, at level two also to the sides' },
      apply: function (p) { p.st.arcs += 1; },
      at: function (l) { return I18N.t(l ? 'at_triple1' : 'at_triple0'); },
    },
    {
      id: 'splash', max: 3, w: 9, rar: 'rare', ic: '◉', col: '#f0a24a',
      syn: ['nova', 'burn', 'flak'],
      ru: { n: 'Осколки', d: 'Пули взрываются, +40 к радиусу' },
      en: { n: 'Frag rounds', d: 'Bullets explode, +40 blast radius' },
      apply: function (p) { p.st.splash += 40; },
      at: function (l) { return I18N.t('at_splash', { n: (l + 1) * 40 }); },
    },
    {
      id: 'pierce', max: 3, w: 9, rar: 'common', ic: '→', col: '#ffd27d',
      syn: ['ricochet', 'crit'],
      ru: { n: 'Сердечник', d: 'Пуля пробивает ещё одного' },
      en: { n: 'Hard core', d: 'Bullets pierce one more enemy' },
      apply: function (p) { p.st.pierce += 1; },
      at: function (l) { return I18N.t('at_pierce', { n: l + 1 }); },
    },
    {
      id: 'ricochet', max: 2, w: 7, rar: 'rare', ic: '↻', col: '#ffd27d',
      syn: ['pierce', 'chain'],
      ru: { n: 'Рикошет', d: 'Пуля отскакивает в другого врага рядом' },
      en: { n: 'Ricochet', d: 'Bullets bounce to another enemy nearby' },
      apply: function (p) { p.st.ricochet += 1; },
      at: function (l) { return I18N.t('at_ricochet', { n: l + 1 }); },
    },
    {
      id: 'rapid', max: 5, w: 12, rar: 'common', ic: '▶▶', col: '#ffd27d',
      syn: ['split', 'crit'],
      ru: { n: 'Смазка', d: '-15% времени между выстрелами' },
      en: { n: 'Grease', d: '-15% time between shots' },
      apply: function (p) { p.st.rate *= 0.85; },
      at: function (l) { return I18N.t('at_rapid', { n: Math.round((1 / Math.pow(0.85, l + 1) - 1) * 100) }); },
    },
    {
      id: 'heavy', max: 5, w: 12, rar: 'common', ic: '■', col: '#ffd27d',
      syn: ['crit', 'rapid'],
      ru: { n: 'Тяжелые пули', d: '+26% урона' },
      en: { n: 'Heavy slugs', d: '+26% damage' },
      apply: function (p) { p.st.dmg *= 1.26; },
      at: function (l) { return I18N.t('at_heavy', { n: Math.round((Math.pow(1.26, l + 1) - 1) * 100) }); },
    },
    {
      id: 'crit', max: 4, w: 9, rar: 'common', ic: '✖', col: '#ffd27d',
      syn: ['heavy', 'pierce'],
      ru: { n: 'Слабое место', d: '+10% шанса крита, крит бьет вдвое' },
      en: { n: 'Weak spot', d: '+10% crit chance, crits hit twice as hard' },
      apply: function (p) { p.st.crit += 0.1; },
      at: function (l) { return I18N.t('at_crit', { n: Math.round(5 + (l + 1) * 10) }); },
    },
    {
      id: 'orbit', max: 3, w: 8, rar: 'epic', ic: '●', col: '#b07ef5',
      syn: ['turret', 'chain', 'burn'],
      ru: { n: 'Спутник', d: 'Вокруг крутится обломок и режет врагов' },
      en: { n: 'Satellite', d: 'A shard orbits you and cuts enemies' },
      apply: function (p) { p.st.orbit += 1; },
      at: function (l) { return I18N.t('at_orbit', { n: l + 1 }); },
    },
    {
      id: 'turret', max: 3, w: 8, rar: 'epic', ic: '▣', col: '#b07ef5',
      syn: ['orbit', 'chain', 'reactor'],
      ru: { n: 'Турель', d: 'Ставит автотурель рядом, раз в 12 секунд' },
      en: { n: 'Turret', d: 'Drops an auto turret every 12 seconds' },
      apply: function (p) { p.st.turret += 1; },
      at: function (l) { return I18N.t('at_turret', { n: l + 2 }); },
    },
    {
      id: 'chain', max: 3, w: 7, rar: 'epic', ic: '⌁', col: '#b07ef5',
      syn: ['turret', 'orbit', 'tether'],
      ru: { n: 'Разряд', d: 'Попадание бьет молнией по соседям' },
      en: { n: 'Arc', d: 'Hits zap nearby enemies' },
      apply: function (p) { p.st.chain += 1; },
      at: function (l) { return I18N.t('at_chain', { n: l + 1 }); },
    },
    {
      id: 'boots', def: true, max: 4, w: 11, rar: 'common', ic: '▲', col: '#6fe3c3',
      ru: { n: 'Подошвы', d: '+8% скорости хода' },
      en: { n: 'Soles', d: '+8% move speed' },
      apply: function (p) { p.st.speed *= 1.08; },
      at: function (l) { return I18N.t('at_boots', { n: Math.round((Math.pow(1.1, l + 1) - 1) * 100) }); },
    },
    {
      id: 'plate', def: true, max: 5, w: 11, rar: 'common', ic: '⬟', col: '#7ee08a',
      syn: ['regen', 'thorns'],
      ru: { n: 'Броневставка', d: '+28 к максимуму здоровья и лечит столько же' },
      en: { n: 'Armor insert', d: '+28 max health and heals the same' },
      apply: function (p) { p.st.maxHp += 28; p.heal(28); },
      at: function (l) { return I18N.t('at_plate', { n: (l + 1) * 28 }); },
    },
    {
      id: 'regen', def: true, max: 3, w: 8, rar: 'rare', ic: '✚', col: '#7ee08a',
      syn: ['vamp', 'plate'],
      ru: { n: 'Нанопаста', d: '+0.45 здоровья в секунду' },
      en: { n: 'Nanopaste', d: '+0.45 health per second' },
      apply: function (p) { p.st.regen += 0.45; },
      at: function (l) { return I18N.t('at_regen', { n: ((l + 1) * 0.45).toFixed(2) }); },
    },
    {
      id: 'magnet', def: true, max: 3, w: 9, rar: 'common', ic: '⌘', col: '#6fe3c3',
      ru: { n: 'Улов', d: '+40% радиуса подбора, +12% опыта' },
      en: { n: 'Haul', d: '+40% pickup radius, +12% XP' },
      apply: function (p) { p.st.pickup *= 1.4; p.st.xp *= 1.12; },
      at: function (l) { return I18N.t('at_magnet', { n: Math.round((Math.pow(1.4, l + 1) - 1) * 100) }); },
    },
    {
      id: 'grab', def: true, max: 2, w: 7, rar: 'common', ic: '⊙', col: '#ffd27d',
      ru: { n: 'Длинные руки', d: 'Лом, аптечки и баффы с земли сами летят к тебе' },
      en: { n: 'Long Arms', d: 'Scrap, medkits and buffs on the ground fly to you' },
      apply: function (p) { p.st.grab += 1; },
      at: function (l) { return I18N.t('at_grab', { n: 70 + (l + 1) * 80 }); },
    },
    {
      id: 'frost', def: true, max: 2, w: 6, rar: 'rare', ic: '❄', col: '#7ec8ff',
      syn: ['burn', 'thorns', 'nova'],
      ru: { n: 'Морозильник', d: 'Враги рядом двигаются на 25% медленнее' },
      en: { n: 'Chiller', d: 'Nearby enemies move 25% slower' },
      apply: function (p) { p.st.frost += 1; },
      at: function (l) { return I18N.t('at_frost', { n: 140 + (l + 1) * 60 }); },
    },
    {
      id: 'thorns', def: true, max: 2, w: 6, rar: 'rare', ic: '✹', col: '#f0a24a',
      syn: ['plate', 'frost'],
      ru: { n: 'Отдача', d: 'Удар по тебе отбрасывает и ранит всех рядом' },
      en: { n: 'Kickback', d: 'Taking a hit blasts everyone around you' },
      apply: function (p) { p.st.thorns += 1; },
      at: function (l) { return I18N.t('at_thorns', { n: 120 + (l + 1) * 50 }); },
    },
    {
      id: 'vamp', def: true, max: 2, w: 6, rar: 'epic', ic: '♥', col: '#7ee08a',
      syn: ['regen', 'plate'],
      ru: { n: 'Падальщик', d: '3.5% убитых роняют аптечку' },
      en: { n: 'Scavenger', d: '3.5% of kills drop a medkit' },
      apply: function (p) { p.st.vamp += 0.035; },
      at: function (l) { return I18N.t('at_vamp', { n: ((l + 1) * 3.5).toFixed(1) }); },
    },
    {
      id: 'dash', def: true, max: 2, w: 7, rar: 'common', ic: '↯', col: '#6fe3c3',
      ru: { n: 'Рывок', d: 'Рывок откатывается на 35% быстрее' },
      en: { n: 'Dash tune', d: 'Dash cooldown 35% shorter' },
      apply: function (p) { p.st.dashCd *= 0.65; },
      at: function (l) { return I18N.t('at_dash', { n: Math.round((1 - Math.pow(0.65, l + 1)) * 100) }); },
    },
    {
      id: 'nova', max: 3, w: 6, rar: 'epic', ic: '◎', col: '#ffd27d',
      syn: ['burn', 'splash', 'frost'],
      ru: { n: 'КОЛЬЦО', d: 'Раз в 6 секунд от тебя раскатывается ударное кольцо' },
      en: { n: 'RING', d: 'Every 6 seconds a shock ring rolls out from you' },
      apply: function (p) { p.st.nova += 1; },
      at: function (l) { return I18N.t('at_nova', { n: 180 + (l + 1) * 70 }); },
    },
    {
      id: 'tether', max: 3, w: 4, rar: 'leg', ic: '⌇', col: '#b07ef5',
      syn: ['chain', 'frost'],
      ru: { n: 'ЛЕНТА', d: 'Луч цепляется за ближайшего, жжет его и держит на месте' },
      en: { n: 'TETHER', d: 'A beam latches onto the nearest enemy, burns and slows it' },
      apply: function (p) { p.st.tether += 1; },
      at: function (l) { return I18N.t('at_tether', { n: l + 1 }); },
    },
    {
      id: 'spore', max: 2, w: 4, rar: 'leg', ic: '☁', col: '#7ee08a',
      ru: { n: 'СПОРЫ', d: 'Элитные машины и боссы оставляют ядовитое облако' },
      en: { n: 'SPORES', d: 'Elites and bosses leave a poison cloud behind' },
      apply: function (p) { p.st.spore += 1; },
      at: function (l) { return I18N.t('at_spore', { n: 120 + (l + 1) * 40 }); },
    },
    {
      id: 'siphon', def: true, max: 2, w: 4, rar: 'leg', ic: '∞', col: '#7ee08a',
      ru: { n: 'ОТБОР', d: 'Каждое двадцатое убийство возвращает 3% здоровья' },
      en: { n: 'SIPHON', d: 'Every twentieth kill returns 3% health' },
      apply: function (p) { p.st.siphon += 1; },
      at: function (l) { return I18N.t('at_siphon', { n: (l + 1) * 3 }); },
    },
    {
      id: 'reactor', max: 2, w: 6, rar: 'rare', ic: '⚙', col: '#b07ef5', req: 'turret',
      ru: { n: 'Реактор', d: 'Турели живут на 18 секунд дольше' },
      en: { n: 'Reactor', d: 'Turrets last 18 seconds longer' },
      apply: function (p) { p.st.turretLife += 18; },
      at: function (l) { return I18N.t('at_reactor', { n: 15 + (l + 1) * 18 }); },
    },
    {
      id: 'burn', max: 3, w: 4, rar: 'leg', ic: '♨', col: '#ff7a5c',
      syn: ['nova', 'frost', 'thorns'],
      ru: { n: 'ГОРН', d: 'Корабль постоянно жжет всех вокруг себя' },
      en: { n: 'FORGE', d: 'The ship constantly burns everything around it' },
      apply: function (p) { p.st.burn += 1; },
      at: function (l) { return I18N.t('at_burn', { n: 130 + (l + 1) * 45 }); },
    },
  ],

  byId: function (id) {
    for (var i = 0; i < this.list.length; i++) if (this.list[i].id === id) return this.list[i];
    return null;
  },

  roll: function (player, count) {
    var pool = [];
    for (var i = 0; i < this.list.length; i++) {
      var s = this.list[i];
      var lvl = player.skills[s.id] || 0;
      if (lvl >= s.max) continue;
      if (s.req && !player.skills[s.req]) continue;
      var w = s.w;
      if (s.rar === 'epic' && Game.time < 45) w *= 0.25;
      if (s.rar === 'leg') { if (Game.time < 180) continue; w *= 1; }
      if (lvl > 0) w *= 1.35;
      if (s.id === 'turret' && player.char.turret) w *= 1.6;
      if (s.syn) {
        for (var q = 0; q < s.syn.length; q++) {
          if (player.skills[s.syn[q]]) { w *= 1.55; break; }
        }
      }
      pool.push({ w: w, s: s });
    }
    var out = [];
    count = count || 3;
    while (out.length < count && pool.length) {
      var picked = U.weighted(pool);
      out.push(picked.s);
      pool.splice(pool.indexOf(picked), 1);
    }
    if (out.length >= 2 && pool.length) {
      var side = !!out[0].def, same = true, j;
      for (j = 1; j < out.length; j++) if (!!out[j].def !== side) { same = false; break; }
      if (same) {
        var other = [];
        for (j = 0; j < pool.length; j++) if (!!pool[j].s.def !== side) other.push(pool[j]);
        if (other.length) out[out.length - 1] = U.weighted(other).s;
      }
    }
    return out;
  }
};
