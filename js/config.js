var CFG = {
  version: '0.20.36',
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

  xp: { base: 9, growth: 1.4, flat: 8 },

  scale: {
    hpPerMin: 0.5,
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
  boss: { first: 150, every: 130, grace: 60, graceMax: 90, leash: 1500, engage: 900, regen: 0.05 },
  stage: { first: [{ at: 45, elites: 2, escort: 8 }, { at: 100, elites: 3, escort: 12 }], mid: 0.5 },
  elite: { after: 90, chance: 0.06 },

  coins: { timeBonus: 0.5, lvlBonus: 5, waveBonus: 12 },
  score: { perKill: 12, perSec: 8, perLvl: 130, bossBonus: 400 },

  prestige: {
    reqUpgrades: 12,
    reqBosses: 3,
    coinMult: 0.2,
    enemyHp: 0.12,
    startLevel: 1
  },

  ads: {
    fullscreenGap: 75,
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
    gem: '#6fe3c3',
    heal: '#7ee08a'
  },

  lb: { name: 'raidScore', top: 10 }
};
