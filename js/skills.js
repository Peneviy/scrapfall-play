var Skills = {
  list: [
    {
      id: 'split', max: 4, w: 10, rar: 'rare', ic: '⟩⟩', col: '#ffd27d',
      syn: ['rapid', 'triple'],
      ru: { n: 'Расщепитель', d: 'В каждом выстреле на 1 пулю больше, пули летят веером' },
      en: { n: 'Splitter', d: 'Each shot fires 1 more bullet, spread in a fan' },
      apply: function (p) { p.st.count += 1; p.st.spread += 0.06; },
      at: function (l) { return I18N.t('at_split', { n: l + 2 }); },
    },
    {
      id: 'triple', max: 2, w: 7, rar: 'rare', ic: '✵', col: '#ffd27d',
      syn: ['split', 'rapid'],
      ru: { n: 'Веер во все стороны', d: 'Пушка стреляет ещё и назад, а со 2-го уровня и в стороны' },
      en: { n: 'All directions', d: 'Your gun also fires backwards, and from level 2 to the sides too' },
      apply: function (p) { p.st.arcs += 1; },
      at: function (l) { return I18N.t(l ? 'at_triple1' : 'at_triple0'); },
    },
    {
      id: 'splash', max: 3, w: 9, rar: 'rare', ic: '◉', col: '#f0a24a',
      syn: ['nova', 'burn', 'flak'],
      ru: { n: 'Осколки', d: 'В каждом третьем залпе одна пуля рвётся осколками, с уровнем взрыв шире' },
      en: { n: 'Frag rounds', d: 'In every third volley one bullet bursts into shrapnel, the blast grows each level' },
      apply: function (p) { p.st.splash += 1; },
      at: function (l) { return I18N.t('at_splash', { n: CFG.frag.r0 + CFG.frag.rPer * (l + 1) }); },
    },
    {
      id: 'pierce', max: 3, w: 9, rar: 'common', ic: '→', col: '#ffd27d',
      syn: ['ricochet', 'crit'],
      ru: { n: 'Сердечник', d: 'Пуля пробивает насквозь ещё одного врага' },
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
      ru: { n: 'Смазка', d: 'Пушка стреляет чаще: пауза между выстрелами на 15% короче' },
      en: { n: 'Grease', d: 'Your gun fires faster: the pause between shots is 15% shorter' },
      apply: function (p) { p.st.rate *= 0.85; },
      at: function (l) { return I18N.t('at_rapid', { n: Math.round((1 / Math.pow(0.85, l + 1) - 1) * 100) }); },
    },
    {
      id: 'heavy', max: 5, w: 12, rar: 'common', ic: '■', col: '#ffd27d',
      syn: ['crit', 'rapid'],
      ru: { n: 'Тяжелые пули', d: 'Всё твоё оружие бьёт на 26% сильнее' },
      en: { n: 'Heavy slugs', d: 'All your weapons hit 26% harder' },
      apply: function (p) { p.st.dmg *= 1.26; },
      at: function (l) { return I18N.t('at_heavy', { n: Math.round((Math.pow(1.26, l + 1) - 1) * 100) }); },
    },
    {
      id: 'crit', max: 4, w: 9, rar: 'common', ic: '✖', col: '#ffd27d',
      syn: ['heavy', 'pierce'],
      ru: { n: 'Слабое место', d: 'Шанс крита растёт на 10%, крит бьёт вдвое сильнее' },
      en: { n: 'Weak spot', d: 'Crit chance goes up by 10%, a crit hits twice as hard' },
      apply: function (p) { p.st.crit += 0.1; },
      at: function (l) { return I18N.t('at_crit', { n: Math.round(5 + (l + 1) * 10) }); },
    },
    {
      id: 'orbit', kind: 'spell', max: 5, w: 8, rar: 'epic', ic: '●', col: '#b07ef5',
      syn: ['turret', 'chain', 'burn'],
      ru: { n: 'Спутник', d: 'Вокруг машины крутится обломок и режет врагов, с каждым уровнем обломков больше' },
      en: { n: 'Satellite', d: 'A shard circles your machine and cuts enemies, each level adds one more' },
      apply: function (p) { p.st.orbit += 1; },
      at: function (l) { return I18N.t('at_orbit', { n: l + 1 }); },
    },
    {
      id: 'turret', kind: 'spell', max: 5, w: 8, rar: 'epic', ic: '▣', col: '#b07ef5',
      syn: ['orbit', 'chain'],
      ru: { n: 'Турель', d: 'Ставит автотурель рядом раз в 12 секунд, с 4-го уровня турели живут дольше' },
      en: { n: 'Turret', d: 'Drops an auto turret every 12 seconds, from level 4 turrets last longer' },
      apply: function (p, l) { if (l <= 3) p.st.turret += 1; else p.st.turretLife += 18; },
      at: function (l) {
        var t = I18N.t('at_turret', { n: Math.min(l + 1, 3) + 1 });
        return l >= 3 ? t + ', ' + I18N.t('at_reactor', { n: 15 + (l - 2) * 18 }) : t;
      },
    },
    {
      id: 'chain', kind: 'spell', max: 5, w: 7, rar: 'epic', ic: '⌁', col: '#b07ef5',
      syn: ['turret', 'orbit', 'tether'],
      ru: { n: 'Разряд', d: 'Попавшая пуля бьёт молнией по врагам рядом' },
      en: { n: 'Arc', d: 'A bullet that hits zaps nearby enemies with lightning' },
      apply: function (p) { p.st.chain += 1; },
      at: function (l) { return I18N.t('at_chain', { n: l + 1 }); },
    },
    {
      id: 'boots', def: true, max: 4, w: 11, rar: 'common', ic: '▲', col: '#6fe3c3',
      ru: { n: 'Подошвы', d: 'Машина едет на 8% быстрее' },
      en: { n: 'Soles', d: 'Your machine drives 8% faster' },
      apply: function (p) { p.st.speed *= 1.08; },
      at: function (l) { return I18N.t('at_boots', { n: Math.round((Math.pow(1.08, l + 1) - 1) * 100) }); },
    },
    {
      id: 'plate', def: true, max: 5, w: 11, rar: 'common', ic: '⬟', col: '#7ee08a',
      syn: ['regen', 'thorns'],
      ru: { n: 'Броневставка', d: 'Максимум здоровья растёт на 28, и машина сразу чинится на столько же' },
      en: { n: 'Armor insert', d: 'Max health goes up by 28, and you heal the same amount right away' },
      apply: function (p) { p.st.maxHp += 28; p.heal(28); },
      at: function (l) { return I18N.t('at_plate', { n: (l + 1) * 28 }); },
    },
    {
      id: 'regen', def: true, max: 3, w: 8, rar: 'rare', ic: '✚', col: '#7ee08a',
      syn: ['vamp', 'plate'],
      ru: { n: 'Нанопаста', d: 'Машина сама чинится на 0.45 здоровья в секунду' },
      en: { n: 'Nanopaste', d: 'Your machine repairs itself for 0.45 health per second' },
      apply: function (p) { p.st.regen += 0.45; },
      at: function (l) { return I18N.t('at_regen', { n: ((l + 1) * 0.45).toFixed(2) }); },
    },
    {
      id: 'magnet', def: true, max: 3, w: 9, rar: 'common', ic: '⌘', col: '#6fe3c3',
      ru: { n: 'Улов', d: 'Радиус подбора растёт на 40%, опыт на 12%, а лом и аптечки с земли сами летят к тебе' },
      en: { n: 'Haul', d: 'Pickup radius grows 40%, XP 12%, and scrap and medkits on the ground fly to you' },
      apply: function (p, l) { p.st.pickup *= 1.4; p.st.xp *= 1.12; if (l !== 2) p.st.grab += 1; },
      at: function (l) {
        return I18N.t('at_magnet', { n: Math.round((Math.pow(1.4, l + 1) - 1) * 100), x: Math.round((Math.pow(1.12, l + 1) - 1) * 100) }) +
          ', ' + I18N.t('at_grab', { n: 70 + (l >= 2 ? 2 : 1) * 80 });
      },
    },
    {
      id: 'frost', def: true, max: 2, w: 6, rar: 'rare', ic: '❄', col: '#7ec8ff',
      syn: ['burn', 'thorns', 'nova'],
      ru: { n: 'Морозильник', d: 'Враги рядом с машиной двигаются на 40% медленнее' },
      en: { n: 'Chiller', d: 'Enemies near your machine move 40% slower' },
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
      id: 'vamp', def: true, max: 3, w: 6, rar: 'epic', ic: '♥', col: '#7ee08a',
      syn: ['regen', 'plate'],
      ru: { n: 'Падальщик', d: 'Убитые иногда роняют аптечку, она лечит 7% здоровья' },
      en: { n: 'Scavenger', d: 'Kills sometimes drop a medkit that heals 7% health' },
      vampK: [0.02, 0.035, 0.05],
      apply: function (p, l) { var K = this.vampK; p.st.vamp += K[l - 1] - (l > 1 ? K[l - 2] : 0); },
      at: function (l) {
        return I18N.t('at_vamp', { n: String(Math.round(this.vampK[Math.min(l, 2)] * 1000) / 10) });
      },
    },
    {
      id: 'siphon', kind: 'spell', def: true, max: 1, w: 3, rar: 'leg', ic: '♡', col: '#b07ef5',
      syn: ['vamp', 'regen'],
      ru: { n: 'ОТБОР', d: 'Каждое двадцатое убийство лечит 2% здоровья' },
      en: { n: 'SIPHON', d: 'Every twentieth kill heals 2% health' },
      apply: function (p) { p.st.siphon += 1; },
      at: function () { return I18N.t('at_siphon', { n: 2 }); },
    },
    {
      id: 'dash', def: true, max: 2, w: 7, rar: 'common', ic: '↯', col: '#6fe3c3',
      ru: { n: 'Рывок', d: 'Пауза между рывками становится на 35% короче' },
      en: { n: 'Dash tune', d: 'The pause between dashes is 35% shorter' },
      apply: function (p) { p.st.dashCd *= 0.65; },
      at: function (l) { return I18N.t('at_dash', { n: Math.round((1 - Math.pow(0.65, l + 1)) * 100) }); },
    },
    {
      id: 'nova', kind: 'spell', max: 5, w: 6, rar: 'epic', ic: '◎', col: '#ffd27d',
      syn: ['burn', 'splash', 'frost'],
      ru: { n: 'КОЛЬЦО', d: 'Раз в 6 секунд от тебя раскатывается ударное кольцо' },
      en: { n: 'RING', d: 'Every 6 seconds a shock ring rolls out from you' },
      apply: function (p) { p.st.nova += 1; },
      at: function (l) { return I18N.t('at_nova', { n: 180 + (l + 1) * 70 }); },
    },
    {
      id: 'tether', kind: 'spell', max: 5, w: 4, rar: 'leg', ic: '⌇', col: '#b07ef5',
      syn: ['chain', 'frost'],
      ru: { n: 'ЛЕНТА', d: 'Луч цепляется за ближайшего врага, жжёт и замедляет его' },
      en: { n: 'TETHER', d: 'A beam latches onto the nearest enemy, burns and slows it' },
      apply: function (p) { p.st.tether += 1; },
      at: function (l) { return I18N.t('at_tether', { n: l + 1 }); },
    },
    {
      id: 'spore', kind: 'spell', max: 5, w: 4, rar: 'leg', ic: '☁', col: '#7ee08a',
      ru: { n: 'СПОРЫ', d: 'Раз в 5 секунд ядовитое облако падает в самую гущу врагов' },
      en: { n: 'SPORES', d: 'Every 5 seconds a poison cloud drops into the thickest crowd' },
      apply: function (p) { p.st.spore += 1; },
      at: function (l) { return I18N.t('at_spore', { n: 120 + (l + 1) * 40 }); },
    },
    {
      id: 'burn', kind: 'spell', max: 5, w: 4, rar: 'leg', ic: '♨', col: '#ff7a5c',
      syn: ['nova', 'frost', 'thorns'],
      ru: { n: 'ГОРН', d: 'Машина постоянно жжёт всех вокруг себя' },
      en: { n: 'FORGE', d: 'Your machine constantly burns everything around it' },
      apply: function (p) { p.st.burn += 1; },
      at: function (l) { return I18N.t('at_burn', { n: 130 + (l + 1) * 45 }); },
    },
    {
      id: 'disc', kind: 'spell', max: 5, w: 7, rar: 'epic', ic: '⊚', col: '#ffb35c',
      syn: ['ricochet', 'orbit'],
      ru: { n: 'ДИСК', d: 'Пила летит в ближнего врага и 5 раз отскакивает от врагов и стен' },
      en: { n: 'DISC', d: 'A saw flies at the nearest enemy and bounces 5 times off enemies and walls' },
      apply: function () {},
      at: function (l) {
        var N = Spells.N.disc, p = Game.player;
        if (p && p.evo && p.evo.disc) return I18N.t('at_circ', { n: N.circN(l + 1), d: N.dmg(l + 1) });
        return I18N.t('at_disc', { n: N.n(l + 1), d: N.dmg(l + 1) });
      },
    },
    {
      id: 'rocket', kind: 'spell', max: 5, w: 7, rar: 'epic', ic: '⇮', col: '#ffb35c',
      syn: ['splash', 'turret'],
      ru: { n: 'РАКЕТЫ', d: 'Раз в 3.5 секунды 2 самонаводящиеся ракеты летят в самого толстого врага' },
      en: { n: 'ROCKETS', d: 'Every 3.5 seconds 2 homing rockets fly at the toughest enemy' },
      apply: function () {},
      at: function (l) {
        var N = Spells.N.rocket, p = Game.player, h = p && p.evo && p.evo.rocket;
        return I18N.t('at_rocket', { n: h ? N.hailN : N.n(l + 1), t: (h ? N.hailCd : N.cd(l + 1)).toFixed(1), d: Math.round(N.dmg(l + 1) * (h ? N.hailK : 1)) });
      },
    },
    {
      id: 'ram', kind: 'spell', max: 5, w: 6, rar: 'epic', ic: '⇛', col: '#ffb35c',
      syn: ['dash', 'plate', 'thorns'],
      ru: { n: 'ТАРАН', d: 'Рывок бьёт и отбрасывает всех на пути, а пауза между рывками на 6% короче' },
      en: { n: 'RAM', d: 'Your dash hits and throws aside everyone in the way, and the pause between dashes is 6% shorter' },
      apply: function (p) { p.st.dashCd *= Spells.N.ram.cdK; },
      at: function (l) { return I18N.t('at_ram', { n: Spells.N.ram.dmg(l + 1) }); },
    },
    {
      id: 'dome', kind: 'spell', max: 5, w: 6, rar: 'epic', ic: '◓', col: '#7ee0ff',
      syn: ['plate', 'regen', 'thorns'],
      ru: { n: 'КУПОЛ', d: 'Раз в 9 секунд раскрывается купол: отталкивает врагов и 2 секунды гасит их пули' },
      en: { n: 'DOME', d: 'Every 9 seconds a dome opens: it pushes enemies back and stops their bullets for 2 seconds' },
      apply: function () {},
      at: function (l) { var N = Spells.N.dome; return I18N.t('at_dome', { n: String(Math.round(N.dur(l + 1) * 100) / 100), r: N.r(l + 1) }); },
    },
  ],

  byId: function (id) {
    for (var i = 0; i < this.list.length; i++) if (this.list[i].id === id) return this.list[i];
    return null;
  },

  slots: { spell: 5, part: 7 },
  kindOf: function (s) { return s.kind === 'spell' ? 'spell' : 'part'; },

  taken: function (player) {
    var out = { spell: [], part: [] };
    for (var id in player.skills) {
      var s = this.byId(id);
      if (s && player.skills[id] > 0) out[this.kindOf(s)].push(s);
    }
    return out;
  },

  roll: function (player, count) {
    var pool = [], tk = this.taken(player);
    for (var i = 0; i < this.list.length; i++) {
      var s = this.list[i];
      var lvl = player.skills[s.id] || 0;
      if (lvl >= s.max) continue;
      if (!lvl && tk[this.kindOf(s)].length >= this.slots[this.kindOf(s)]) continue;
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
