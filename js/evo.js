var Evo = {
  max: 6,
  list: [
    { id: 'evo_orbit', skill: 'orbit', ic: '●',
      ru: { n: 'ЖЕРНОВА', d: 'Раз в 3 секунды обломки разлетаются далеко и возвращаются, по пути бьют вдвое сильнее' },
      en: { n: 'MILLSTONES', d: 'Every 3 seconds the shards fly far out and come back, hitting twice as hard on the way' } },
    { id: 'evo_turret', skill: 'turret', ic: '▣',
      ru: { n: 'БАТАРЕЯ', d: 'Турели ставятся парой, бьют ракетами со взрывом и живут вдвое дольше' },
      en: { n: 'BATTERY', d: 'Turrets come in pairs, fire exploding rockets and last twice as long' } },
    { id: 'evo_chain', skill: 'chain', ic: '⌁',
      ru: { n: 'ГРОЗА', d: 'Раз в 4 секунды молнии с неба бьют 6 врагов, первыми элиту и босса' },
      en: { n: 'STORM', d: 'Every 4 seconds lightning strikes 6 enemies, elites and the boss first' } },
    { id: 'evo_nova', skill: 'nova', ic: '◎',
      ru: { n: 'ПРИЛИВ', d: 'Кольцо катится далеко от машины и возвращается, стягивая врагов к тебе' },
      en: { n: 'TIDE', d: 'The ring rolls far out from your machine and back, dragging enemies to you' } },
    { id: 'evo_tether', skill: 'tether', ic: '⌇',
      ru: { n: 'СЕТЬ', d: 'Лучей становится четыре, с убитой цели луч сразу прыгает на следующую' },
      en: { n: 'WEB', d: 'You get four beams, and a beam jumps to the next target the moment its target dies' } },
    { id: 'evo_burn', skill: 'burn', ic: '♨',
      ru: { n: 'ВЫХЛОП', d: 'За машиной 3 секунды горит колея' },
      en: { n: 'EXHAUST', d: 'Your tracks burn behind you for 3 seconds' } },
    { id: 'evo_spore', skill: 'spore', ic: '☁',
      ru: { n: 'ЭПИДЕМИЯ', d: 'Враг, умерший в облаке, оставляет новое облако, а своё падает раз в 10 секунд' },
      en: { n: 'EPIDEMIC', d: 'An enemy that dies in a cloud leaves a new cloud, your own drops every 10 seconds' } },
    { id: 'evo_disc', skill: 'disc', ic: '⊚', swap: true,
      ru: { n: 'ЦИРКУЛЯРКА', d: '3 пилы не пропадают и постоянно носятся вокруг, режут всех на пути' },
      en: { n: 'BUZZSAW', d: '3 saws never vanish and keep racing around you, cutting everyone in their way' } },
    { id: 'evo_rocket', skill: 'rocket', ic: '⇮', swap: true,
      ru: { n: 'ГРАД', d: 'Раз в 5 секунд 10 ракет летят веером, каждая в своего толстого врага, урон в полтора раза выше' },
      en: { n: 'HAIL', d: 'Every 5 seconds 10 rockets fly out in a fan, each at its own tough enemy, with 1.5x damage' } },
    { id: 'evo_ram', skill: 'ram', ic: '⇛',
      ru: { n: 'БУЛЬДОЗЕР', d: 'Каждый рывок кончается ударной волной, а зарядов рывка становится 2' },
      en: { n: 'BULLDOZER', d: 'Every dash ends in a shockwave, and you get 2 dash charges' } },
    { id: 'evo_dome', skill: 'dome', ic: '◓',
      ru: { n: 'ЗЕРКАЛО', d: 'Купол отбивает пули обратно, отбитая пуля бьет втрое сильнее твоей' },
      en: { n: 'MIRROR', d: 'The dome bounces bullets back, a returned bullet hits three times harder than yours' } },
    { id: 'evo_pistol', gun: 'pistol', ic: '⇉',
      ru: { n: 'ДВУСТВОЛ', d: 'Пушка стреляет парой пуль, каждый 4-й залп прошивает всю линию' },
      en: { n: 'DOUBLE BARREL', d: 'Your gun fires bullets in pairs, every 4th volley pierces the whole line' } },
    { id: 'evo_smg', gun: 'smg', ic: '≋',
      ru: { n: 'ШКВАЛ', d: 'Каждая пуля один раз рикошетит в соседа' },
      en: { n: 'SQUALL', d: 'Every bullet ricochets once into a neighbour' } },
    { id: 'evo_scatter', gun: 'scatter', ic: '✺',
      ru: { n: 'ВИХРЬ', d: 'Каждый 3-й выстрел добавляет кольцо из 16 дробин во все стороны' },
      en: { n: 'WHIRL', d: 'Every 3rd shot adds a ring of 16 pellets in all directions' } },
    { id: 'evo_rail', gun: 'rail', ic: '⟶',
      ru: { n: 'РЕЛЬСА', d: 'Пуля прошивает всех на линии, а её след ещё секунду жжёт врагов' },
      en: { n: 'RAIL', d: 'Shots pierce everyone in line, and the trace burns enemies for another second' } },
    { id: 'evo_flak', gun: 'flak', ic: '❋',
      ru: { n: 'КАССЕТА', d: 'Взрыв раскидывает 3 мини-заряда' },
      en: { n: 'CLUSTER', d: 'The blast scatters 3 mini charges' } }
  ],

  key: function (ev) { return ev.skill || ev.gun; },

  of: function (key) {
    for (var i = 0; i < this.list.length; i++) if (this.key(this.list[i]) === key) return this.list[i];
    return null;
  },

  level: function (p, id) { return id === 'turret' ? p.st.turret : (p.skills[id] || 0); },

  offer: function (p, count) {
    var pool = [];
    if (p.evoN >= this.max) return pool;
    for (var i = 0; i < this.list.length; i++) {
      var ev = this.list[i], k = this.key(ev);
      if (p.evo[k]) continue;
      if (ev.skill && this.level(p, ev.skill) < 2) continue;
      if (ev.gun && ev.gun !== p.gun.id) continue;
      pool.push(ev);
    }
    var out = [];
    count = count || 3;
    while (out.length < count && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return out;
  },

  take: function (p, ev) {
    var k = this.key(ev);
    if (p.evo[k]) return;
    p.evo[k] = 1;
    p.evoN++;
    if (k === 'turret') for (var i = 0; i < Game.turrets.length; i++) Game.turrets[i].life *= 2;
    if (k === 'ram') p.dashQ = 1;
    FX.ring(p.x, p.y, 20, 260, '#f2c46a', 0.7, 6);
    FX.burst(p.x, p.y, 24, '#f2c46a', 240, 0.6, 4);
  },

  base: function (p, ev) {
    if (ev.gun) return I18N.name(p.gun);
    var s = Skills.byId(ev.skill);
    return I18N.name(s) + ' ' + Math.min(this.level(p, ev.skill), s.max) + '/' + s.max;
  },

  none: function (p, n) { return window.Trophy ? Trophy.offer(p, n === undefined ? 3 : n) : []; },

  cards: function (p, opt) {
    opt = opt || {};
    var c = opt.noEvo ? [] : this.offer(p, 3);
    if (c.length < 3 && !opt.noTrophy) c = c.concat(this.none(p, 3 - c.length));
    return c;
  },

  pick: function (p, card) {
    if (card.boss) Trophy.take(p, card);
    else this.take(p, card);
  }
};

Bosses.on('kill', function () { if (Game.running && !Game.over) Game.pendingEvo++; });
