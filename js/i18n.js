var I18N = {
  lang: 'ru',
  langs: ['ru', 'en', 'tr', 'de', 'es', 'pt'],
  packs: {},

  ru: {
    play: 'В рейд', shop: 'Ангар', board: 'Рейтинг', settings: 'Настройки', back: 'Вернуться',
    best: 'Рекорд', prestige: 'Престиж', coins: 'Лом',
    freeCoins: 'Ящик с ломом',
    tabChars: 'Машины', tabWeapons: 'Оружие', tabSkins: 'Окрас', tabUp: 'Модули',
    prestigeTitle: 'Сброс прогресса',
    prestigeDo: 'Сбросить',
    prestigeDesc: 'Обнуляет лом и модули, но каждый ранг дает +{c}% лома и +1 стартовый уровень. Враги крепче на {h}%.',
    prestigeReq: 'Откроется после {n} купленных уровней модулей',
    prestigeConfirm: 'Точно сбросить? Лом и модули обнулятся, ранг станет {r}.',
    prestigeDone: 'Ранг престижа {r}. Враги злее, лома больше.',
    auth: 'Войти, чтобы попасть в рейтинг',
    sfx: 'Звук', music: 'Музыка', shake: 'Тряска камеры', lowfx: 'Меньше эффектов',
    lvlUp: 'Уровень', reroll: 'Другие карты',
    pause: 'Пауза', resume: 'Продолжить', quit: 'Бросить рейд',
    over: 'Рейд провален', score: 'Очки', survived: 'Продержался', killed: 'Убито',
    loot: 'Лом за рейд', newBest: 'Новый рекорд!',
    revive: 'Вторая жизнь', double: 'Удвоить лом', again: 'Ещё рейд', toMenu: 'В меню',
    buy: 'Купить', equip: 'Взять', equipped: 'В деле', owned: 'Есть',
    noCoins: 'Не хватает лома',
    adFail: 'Реклама сейчас недоступна',
    adClosed: 'Награда только за ролик до конца', focusGate: 'Кликни по игре, чтобы продолжить', volume: 'Громкость',
    adBlocked: 'Стоит блокировщик рекламы, бонусы за рекламу отключены',
    at_split: 'пуль в очереди: {n}', at_triple0: 'добавится выстрел назад', at_triple1: 'выстрелы назад и вбок',
    at_splash: 'радиус взрыва: {n}', at_pierce: 'пробивает целей: {n}', at_ricochet: 'отскоков: {n}',
    lowAuto: 'Слабый компьютер: тени выключены, вернуть можно в настройках',
    at_rapid: 'темп стрельбы: +{n}%', at_heavy: 'урон всего: +{n}%', at_crit: 'шанс крита: {n}%',
    at_orbit: 'обломков: {n}', at_turret: 'турелей: до {n}', at_chain: 'прыжков: {n}', at_boots: 'скорость: +{n}%',
    at_plate: 'здоровья всего: +{n}', at_regen: 'лечит {n} в секунду', at_magnet: 'радиус подбора: +{n}%, опыт: +{x}%', at_grab: 'дальность подбора: {n}',
    at_frost: 'радиус холода: {n}', at_thorns: 'радиус отдачи: {n}', at_vamp: 'шанс аптечки: {n}%',
    at_dash: 'откат рывка: -{n}%', at_nova: 'радиус кольца: {n}', at_tether: 'урон луча: x{n}',
    at_spore: 'радиус облака: {n}', at_siphon: 'каждое 20-е убийство вернет {n}% здоровья',
    at_reactor: 'жизнь турели: {n} сек', at_burn: 'радиус горна: {n}',
    tag_scatter: '5 дробин', tag_rail: 'пробивает 3', tag_flak: 'взрыв', raider: 'рейдер {n}',
    adWait: 'Реклама будет доступна через {n} с',
    rewardCoins: '+{n} лома',
    rerollOut: 'Рероллы на этот рейд кончились',
    reviveOut: 'Вторую жизнь уже брал',
    boardEmpty: 'Пока никого. Будь первым.',
    boardLocal: 'Общей таблицы рекордов здесь пока нет. Твой лучший результат: {n}',
    bossSoon: 'Сигнал: идет крупный',
    bossDown: 'Крупный повержен',
    bossReward: 'Босс повержен: сразу уровень',
    bossRewardBack: 'Босс повержен: уровень и вернулась вторая жизнь',
    scoreChip: 'очки',
    scoreShort: 'очк',
    newFoe: 'Появился новый противник: {n}',
    modules: 'Магазин',
    breakKills: 'за убитых',
    breakLevels: 'за уровни',
    breakBosses: 'за боссов',
    breakTime: 'за время',
    willBe: 'после взятия {v}',
    dps: 'Урон {d} · темп {r}/с · дальность {g}',
    bossIn: 'На горизонте',
    bossOut: 'Пройден',
    stageGoal: 'Выживи. Босс через {t}', stageBossNear: 'Босс на подходе',
    waveKind: 'Волна', waveElite: 'Элитный отряд', waveHeavy: 'Тяжеловес', wavePack: 'Стая',
    tabTrophies: 'Трофеи',
    bossesStat: 'Боссы',
    trophyNone: 'Еще не встречал',
    trophyWins: 'Побед: {n}',
    prestigeReqBoss: 'Нужно {u} уровней модулей и {b} разных боссов',
    buffEff_rage: '+50% урона',
    buffEff_haste: '+30% темпа',
    buffEff_shield: 'поглощает удары',
    buffTip_rage: 'Ярость: +50% урона оружия, пока горит',
    buffTip_haste: 'Разгон: +30% скорострельности, пока горит',
    buffTip_shield: 'Щит: поглощает ближайшие удары, цифра - сколько осталось',
    buff_rage: 'ЯРОСТЬ',
    buff_haste: 'РАЗГОН',
    buff_shield: 'ЩИТ',
    aimAuto: 'Прицел: авто',
    aimMouse: 'Прицел: мышь',
    keyDash: 'Рывок',
    hintMove: 'ехать', hintDrag: 'тяни по экрану, чтобы ехать', hintAuto: 'стреляет сама, целится в ближнего',
    keyPause: 'Пауза',
    lvlMax: 'Максимум',
    stack: 'Уровень {n}/{m}',
    newSkill: 'Новое',
    hpFull: 'Здоровье полное',
    tapStart: 'Нажми, чтобы начать',
    unlockAt: 'Открывается за {n} лома'
  },

  en: {
    play: 'Raid', shop: 'Hangar', board: 'Ranking', settings: 'Settings', back: 'Back',
    best: 'Best', prestige: 'Prestige', coins: 'Scrap',
    freeCoins: 'Scrap crate',
    tabChars: 'Machines', tabWeapons: 'Guns', tabSkins: 'Paint', tabUp: 'Modules',
    prestigeTitle: 'Reset progress',
    prestigeDo: 'Reset',
    prestigeDesc: 'Wipes scrap and modules, but every rank grants +{c}% scrap and +1 starting level. Enemies get {h}% tougher.',
    prestigeReq: 'Unlocks after {n} module levels bought',
    prestigeConfirm: 'Reset for real? Scrap and modules go to zero, rank becomes {r}.',
    prestigeDone: 'Prestige rank {r}. Meaner enemies, fatter loot.',
    auth: 'Log in to join the ranking',
    sfx: 'Sound', music: 'Music', shake: 'Screen shake', lowfx: 'Fewer effects',
    lvlUp: 'Level', reroll: 'Other cards',
    pause: 'Paused', resume: 'Resume', quit: 'Abandon raid',
    over: 'Raid failed', score: 'Score', survived: 'Survived', killed: 'Kills',
    loot: 'Scrap earned', newBest: 'New record!',
    revive: 'Second life', double: 'Double scrap', again: 'Raid again', toMenu: 'Menu',
    buy: 'Buy', equip: 'Select', equipped: 'Active', owned: 'Owned',
    noCoins: 'Not enough scrap',
    adFail: 'Ad not available right now',
    adClosed: 'Reward only for watching to the end', focusGate: 'Click the game to continue', volume: 'Volume',
    adBlocked: 'Ad blocker is on, ad bonuses are disabled',
    at_split: 'bullets in a burst: {n}', at_triple0: 'adds a shot backwards', at_triple1: 'shots back and to the sides',
    at_splash: 'blast radius: {n}', at_pierce: 'pierces targets: {n}', at_ricochet: 'bounces: {n}',
    lowAuto: 'Slow device: shadows are off, turn them back on in settings',
    at_rapid: 'fire rate: +{n}%', at_heavy: 'total damage: +{n}%', at_crit: 'crit chance: {n}%',
    at_orbit: 'shards: {n}', at_turret: 'turrets: up to {n}', at_chain: 'jumps: {n}', at_boots: 'speed: +{n}%',
    at_plate: 'total health: +{n}', at_regen: 'heals {n} per second', at_magnet: 'pickup radius: +{n}%, XP: +{x}%', at_grab: 'pickup reach: {n}',
    at_frost: 'chill radius: {n}', at_thorns: 'recoil radius: {n}', at_vamp: 'medkit chance: {n}%',
    at_dash: 'dash cooldown: -{n}%', at_nova: 'ring radius: {n}', at_tether: 'beam damage: x{n}',
    at_spore: 'cloud radius: {n}', at_siphon: 'every 20th kill restores {n}% health',
    at_reactor: 'turret life: {n} s', at_burn: 'burn radius: {n}',
    tag_scatter: '5 pellets', tag_rail: 'pierces 3', tag_flak: 'blast', raider: 'raider {n}',
    adWait: 'Ad available in {n}s',
    rewardCoins: '+{n} scrap',
    rerollOut: 'No rerolls left this raid',
    reviveOut: 'Second life already used',
    boardEmpty: 'Empty so far. Be the first.',
    boardLocal: 'No global leaderboard here yet. Your best: {n}',
    bossSoon: 'Signal: big one incoming',
    bossDown: 'Big one is down',
    bossReward: 'Boss down: an instant level',
    bossRewardBack: 'Boss down: a level and your second life is back',
    scoreChip: 'score',
    scoreShort: 'pts',
    newFoe: 'A new enemy appeared: {n}',
    modules: 'Shop',
    breakKills: 'for kills',
    breakLevels: 'for levels',
    breakBosses: 'for bosses',
    breakTime: 'for time',
    willBe: 'after taking {v}',
    dps: 'Damage {d} · rate {r}/s · range {g}',
    bossIn: 'Incoming',
    bossOut: 'Cleared',
    stageGoal: 'Survive. Boss in {t}', stageBossNear: 'Boss incoming',
    waveKind: 'Wave', waveElite: 'Elite squad', waveHeavy: 'Heavy hitter', wavePack: 'Swarm',
    tabTrophies: 'Trophies',
    bossesStat: 'Bosses',
    trophyNone: 'Not met yet',
    trophyWins: 'Wins: {n}',
    prestigeReqBoss: 'Need {u} module levels and {b} different bosses',
    buffEff_rage: '+50% damage',
    buffEff_haste: '+30% fire rate',
    buffEff_shield: 'soaks hits',
    buffTip_rage: 'Rage: +50% weapon damage while it lasts',
    buffTip_haste: 'Haste: +30% fire rate while it lasts',
    buffTip_shield: 'Shield: soaks the next hits, the number is how many are left',
    buff_rage: 'RAGE',
    buff_haste: 'HASTE',
    buff_shield: 'SHIELD',
    aimAuto: 'Aim: auto',
    aimMouse: 'Aim: mouse',
    keyDash: 'Dash',
    hintMove: 'drive', hintDrag: 'drag anywhere to drive', hintAuto: 'fires by itself at the nearest enemy',
    keyPause: 'Pause',
    lvlMax: 'Maxed',
    stack: 'Level {n}/{m}',
    newSkill: 'New',
    hpFull: 'Health is full',
    tapStart: 'Tap to start',
    unlockAt: 'Unlocks for {n} scrap'
  },

  add: function (lang, pack) {
    this.packs[lang] = pack;
    this[lang] = pack.ui || {};
  },

  pick: function (raw) {
    var l = String(raw || '').toLowerCase().replace('_', '-').split('-')[0];
    return this.langs.indexOf(l) >= 0 && this[l] ? l : 'en';
  },

  set: function (lang) {
    if (this.langs.indexOf(lang) < 0 || !this[lang]) lang = 'en';
    this.lang = lang;
    document.documentElement.lang = lang;
    this.apply();
  },

  t: function (key, vars) {
    var dict = this[this.lang] || this.en;
    var s = dict[key];
    if (s === undefined) s = this.en[key];
    if (s === undefined) s = this.ru[key] !== undefined ? this.ru[key] : key;
    if (vars) {
      for (var k in vars) s = s.split('{' + k + '}').join(vars[k]);
    }
    return s;
  },

  _item: function (obj) {
    var p = this.packs[this.lang];
    return p && p.items && obj.id ? p.items[obj.id] : null;
  },
  name: function (obj) {
    var o = obj[this.lang], it = this._item(obj);
    return (o && o.n) || (it && it[0]) || (obj.en && obj.en.n) || obj.ru.n;
  },
  desc: function (obj) {
    var o = obj[this.lang], it = this._item(obj);
    return (o && o.d) || (it && it[1]) || (obj.en && obj.en.d) || obj.ru.d;
  },
  foe: function (key, d) {
    var p = this.packs[this.lang], it = p && p.items && p.items[key];
    return (it && it[0]) || d[this.lang] || (this.lang === 'ru' ? d.ru : d.en);
  },

  apply: function () {
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = this.t(nodes[i].getAttribute('data-i18n'));
    }
  }
};
