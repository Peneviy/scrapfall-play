// Контент: бойцы, пушки, окрасы, модули. Тут же отрисовка фигурки бойца.
var Content = {

  chars: [
    {
      id: 'scav', cost: 0, gun: 'pistol',
      ru: { n: 'СКАВ', d: 'Обычный мусорщик. Ничего особенного, зато находит на 15% больше лома.' },
      en: { n: 'SCAV', d: 'Plain scavenger. Nothing fancy, but finds 15% more scrap.' },
      hp: 1, speed: 1, dmg: 1, rate: 1, pickup: 1, loot: 1.15, armor: 0
    },
    {
      id: 'brute', cost: 2500, gun: 'scatter',
      ru: { n: 'КРУШИТЕЛЬ', d: 'Дробовик и толстая шкура. Урона получает на 20% меньше, но медленный.' },
      en: { n: 'BRUTE', d: 'Scattergun and thick hide. Takes 20% less damage, but slow.' },
      hp: 1.6, speed: 0.9, dmg: 1, rate: 0.95, pickup: 1, loot: 1, armor: 0.2
    },
    {
      id: 'ranger', cost: 6000, gun: 'rail',
      ru: { n: 'СТРЕЛОК', d: 'Бьет далеко и больно, но здоровья мало. Промахов не прощают.' },
      en: { n: 'RANGER', d: 'Hits far and hard, but paper thin. Mistakes are expensive.' },
      hp: 0.75, speed: 1.05, dmg: 1.35, rate: 0.9, pickup: 1.15, loot: 1, armor: 0
    },
    {
      id: 'rigger', cost: 12000, gun: 'smg',
      ru: { n: 'ТЕХНИК', d: 'Стартует с турелью, и все турели служат вдвое дольше. Пушка слабее.' },
      en: { n: 'RIGGER', d: 'Starts with a turret, and all turrets live twice as long. Weaker gun.' },
      hp: 1, speed: 1, dmg: 0.85, rate: 1.1, pickup: 1.2, loot: 1, armor: 0, turret: true
    }
  ],

  guns: [
    {
      id: 'pistol', cost: 0,
      ru: { n: 'Резак', d: 'Одиночные, средний темп. Надежно как лом.' },
      en: { n: 'Cutter', d: 'Single shots, steady rate. Reliable as a crowbar.' },
      dmg: 14, cd: 0.3, speed: 620, count: 1, spread: 0.05, pierce: 0, range: 520, size: 4, sfx: 'shot'
    },
    {
      id: 'smg', cost: 1500,
      ru: { n: 'Трещотка', d: 'Очень быстро, но слабо и разброс большой.' },
      en: { n: 'Rattler', d: 'Very fast, weak per shot, wide spread.' },
      dmg: 6, cd: 0.13, speed: 700, count: 1, spread: 0.23, pierce: 0, range: 470, size: 3, sfx: 'shot'
    },
    {
      id: 'scatter', cost: 3500,
      ru: { n: 'Веер', d: 'Пять дробин в конус. В упор рвет, издалека бесполезен.' },
      en: { n: 'Fan', d: 'Five pellets in a cone. Brutal up close, useless at range.' },
      dmg: 7, cd: 0.62, speed: 560, count: 5, spread: 0.42, pierce: 0, range: 330, size: 3.4, sfx: 'shotBig', tag: 'tag_scatter'
    },
    {
      id: 'rail', cost: 7000,
      ru: { n: 'Шило', d: 'Медленный прошивающий выстрел. Пробивает три цели насквозь.' },
      en: { n: 'Awl', d: 'Slow piercing shot. Punches through three targets.' },
      dmg: 26, cd: 0.78, speed: 1150, count: 1, spread: 0, pierce: 3, range: 760, size: 5, sfx: 'shotBig', tag: 'tag_rail'
    },
    {
      id: 'flak', cost: 11000,
      ru: { n: 'Хлопушка', d: 'Осколочный заряд, взрывается при попадании.' },
      en: { n: 'Popper', d: 'Frag charge, explodes on contact.' },
      dmg: 13, cd: 0.7, speed: 470, count: 1, spread: 0.06, pierce: 0, range: 500, size: 6, splash: 78, sfx: 'shotBig', tag: 'tag_flak'
    }
  ],

  skins: [
    { id: 'rust', cost: 0, ru: { n: 'Ржавчина', d: 'Заводской окрас.' }, en: { n: 'Rust', d: 'Factory paint.' }, body: '#c9713a', trim: '#ffd27d', trail: '#f0a24a' },
    { id: 'reef', cost: 800, ru: { n: 'Риф', d: 'Бирюза и соль.' }, en: { n: 'Reef', d: 'Teal and salt.' }, body: '#3fa38f', trim: '#a9f2dd', trail: '#6fe3c3' },
    { id: 'void', cost: 2200, ru: { n: 'Пустота', d: 'Фиолетовый, как элитники.' }, en: { n: 'Void', d: 'Purple, like the elites.' }, body: '#8b4bd6', trim: '#e0b3ff', trail: '#a24bd6' },
    { id: 'ash', cost: 4500, ru: { n: 'Пепел', d: 'Черный с золотой окантовкой.' }, en: { n: 'Ash', d: 'Black with gold trim.' }, body: '#2b3138', trim: '#ffd27d', trail: '#ffe6a8' }
  ],

  upgrades: [
    { id: 'dmg', ru: { n: 'Бронебой', d: '+8% урона всему твоему за уровень' }, en: { n: 'Piercer', d: '+8% damage to everything of yours per level' } },
    { id: 'hp', ru: { n: 'Пластины', d: '+10% здоровья за уровень' }, en: { n: 'Plating', d: '+10% health per level' } },
    { id: 'spd', ru: { n: 'Привод', d: '+3% скорости хода за уровень' }, en: { n: 'Drive', d: '+3% move speed per level' } },
    { id: 'xp', ru: { n: 'Сканер', d: '+8% опыта: уровни в рейде приходят чаще' }, en: { n: 'Scanner', d: '+8% XP: levels come faster in a raid' } },
    { id: 'loot', ru: { n: 'Магнит', d: '+10% лома за рейд' }, en: { n: 'Magnet', d: '+10% scrap per raid' } },
    { id: 'cd', ru: { n: 'Затвор', d: '-5% времени между выстрелами' }, en: { n: 'Bolt', d: '-5% time between shots' } },
    { id: 'radius', ru: { n: 'Резонатор', d: '+7% радиуса взрывов, колец и аур' }, en: { n: 'Resonator', d: '+7% radius of blasts, rings and auras' } },
    { id: 'tech', ru: { n: 'Балласт', d: '+8% урона турелей, спутников, разряда и ленты' }, en: { n: 'Ballast', d: '+8% damage from turrets, shards, arcs and tether' } }
  ],

  char: function (id) {
    for (var i = 0; i < this.chars.length; i++) if (this.chars[i].id === id) return this.chars[i];
    return this.chars[0];
  },
  gun: function (id) {
    for (var i = 0; i < this.guns.length; i++) if (this.guns[i].id === id) return this.guns[i];
    return this.guns[0];
  },
  skin: function (id) {
    for (var i = 0; i < this.skins.length; i++) if (this.skins[i].id === id) return this.skins[i];
    return this.skins[0];
  },

  // Фигурка бойца: корпус + ствол. Форма зависит от класса.
  drawChar: function (ctx, x, y, r, charId, skinId, ang, dashing) {
    var sk = this.skin(skinId);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);

    // тень под ногами
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.35, r * 1.05, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // ствол
    ctx.fillStyle = '#243840';
    if (charId === 'brute') ctx.fillRect(r * 0.2, -r * 0.55, r * 1.25, r * 1.1);
    else if (charId === 'ranger') ctx.fillRect(r * 0.2, -r * 0.2, r * 1.9, r * 0.4);
    else ctx.fillRect(r * 0.2, -r * 0.26, r * 1.45, r * 0.52);

    // корпус
    ctx.fillStyle = sk.body;
    ctx.strokeStyle = sk.trim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (charId === 'brute') {
      ctx.moveTo(-r * 0.9, -r);
      ctx.lineTo(r * 0.85, -r * 0.8);
      ctx.lineTo(r * 0.85, r * 0.8);
      ctx.lineTo(-r * 0.9, r);
      ctx.closePath();
    } else if (charId === 'ranger') {
      ctx.moveTo(r, 0);
      ctx.lineTo(-r * 0.75, -r * 0.85);
      ctx.lineTo(-r * 0.35, 0);
      ctx.lineTo(-r * 0.75, r * 0.85);
      ctx.closePath();
    } else if (charId === 'rigger') {
      var i;
      for (i = 0; i < 6; i++) {
        var a = i / 6 * Math.PI * 2;
        var px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else {
      ctx.arc(0, 0, r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();

    // визор
    ctx.fillStyle = dashing ? '#ffffff' : sk.trim;
    ctx.beginPath();
    ctx.arc(r * 0.25, 0, r * 0.26, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};
