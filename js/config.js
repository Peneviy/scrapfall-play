var CFG = {
  version: '0.20.78',
  platform: 'pikabu',
  debug: false,
  metrics: { url: 'https://scrapfall-metrics.peneviy.workers.dev/e', dev: '' },

  view: { targetH: 760, targetW: 560, minScale: 0.5, maxScale: 1.35, camLerp: 6, zoomMin: 0.85, zoomMax: 1.18 },
  view3d: { fov: 34, pitch: 56, zoom: 0.92, fog: '#dcb98f', ground: '#c9a06c', day: 420 },
  grid: 96,

  player: {
    hp: 120,
    speed: 205,
    radius: 13,
    pickup: 105,
    iframes: 0.7,
    dashCd: 2.2,
    dashTime: 0.16,
    dashSpeed: 780,
    regen: 0
  },

  aim: { arcDamage: 0.6, mouseDefault: false },

  frag: { every: 3, r0: 45, rPer: 20, dmg: 1.8 },

  xp: { base: 9, growth: 1.4, flat: 8, soft: { from: 10, growth: 1.12 }, late: { from: 30, growth: 1.18 } },

  scale: {
    hpPerMin: 0.5,
    hpLate: 0.3, lateFrom: 4,
    dmgPerMin: 0.16,
    speedPerMin: 0.045,
    spawnPerMin: 0.62,
    capBase: 90,
    capPerMin: 26,
    capHard: 340
  },
  spawn: { interval: 1.35, distMin: 520, distMax: 760, packChance: 0.18,
           batchPerMin: 0.7, batchMax: 5, minInterval: 0.3,
           opening: { grunt: 11, runner: 4, swarm: 8 }, plateau: 1.15, rampT: 10,
           lvlPace: 16, adaptUntil: 210, adaptPerLvl: 0.15, adaptMax: 0.6 },
  walls: { patience: 1.2, slide: 0.45 },
  boss: { first: 150, every: 130, grace: 60, graceMax: 90, leash: 1500, engage: 900, regen: 0.05,
    lair: { dMin: 650, dMax: 900, r: 320, rise: 1.5, sleepMax: 2,
            hpPerMin: 0.12, hpMax: 0.6, dmgPerMin: 0.06, dmgMax: 0.3,
            far: 1500, farT: 5, move: 700, moveMax: 900, hunt: 1.25 } },
  stage: { first: [{ at: 45, elites: 2, escort: 8 }, { at: 100, elites: 3, escort: 12 }], mid: 0.5 },
  elite: { after: 90, chance: 0.06 },

  coins: { timeBonus: 1, lvlBonus: 10, waveBonus: 12, mob: 0.03, boss: 0.45 },
  score: { perKill: 12, perSec: 8, perLvl: 70, bossBonus: 400, winBonus: 5000 },

  finale: { tiers: [['crusher', 'driller', 'sapper'], ['weaver', 'frostmaw', 'lancer'], ['warden', 'hive'], ['titan'], ['phantom']],
    queenTiers: [1, 1, 3],
    delay: 5, frenzy: 150, spawnK: 2, batch: 8, eliteEvery: 12, heavies: 2, xp: 2,
    queen: { hpMul: 1.6, dmgMul: 0.85, dist: 620 }, winLoot: 2 },

  nakal: {
    max: 7, coin: 0.2, startLevel: 1, hp: 0.12,
    score: [1, 1.2, 1.4, 1.6, 1.8, 2, 2.3, 2.6],
    phase2: 0.66, lairK: 2, sleepMax: 1, heal: 0.5,
    eliteK: 2, frenzy: 210, repeats: 2, repAt: [30, 110], repGap: 15, repHp: 0.7, repCoin: 0.5,
    queen4: 0.2
  },

  shop: {
    packs: [
      { id: 'scrap_1', name: 'pack1', coins: 10000, bonus: 0 },
      { id: 'scrap_2', name: 'pack2', coins: 25000, bonus: 10 },
      { id: 'scrap_3', name: 'pack3', coins: 50000, bonus: 20 },
      { id: 'scrap_4', name: 'pack4', coins: 100000, bonus: 30 },
      { id: 'scrap_5', name: 'pack5', coins: 500000, bonus: 50 }
    ],
    noAds: 'no_ads'
  },

  ads: {
    fullscreenGap: 120,
    rewardQuiet: 30,
    firstFullscreenAfter: 90,
    levelEvery: 3,
    rerollPerRun: 5,
    revivePerRun: 1,
    reviveMax: 4,
    timeout: 12,
    rewardTimeout: 60,
    freeCoinsGap: 90,
    freeCoins: 120
  },

  col: {
    ally: '#ffd27d',
    allyGlow: 'rgba(255,210,125,.45)',
    tech: '#b07ef5',
    techGlow: 'rgba(176,126,245,.5)',
    enemyShot: '#ff4d8d',
    enemyShotGlow: 'rgba(255,77,141,.35)',
    spit: '#b6e07a',
    shock: '#ff2e74',
    gem: '#6fe3c3',
    heal: '#7ee08a'
  },

  lb: { name: 'raidScore', top: 10, season: 1, tier: 0 }
};
