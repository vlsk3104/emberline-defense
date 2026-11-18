// Emberline Defense — every balance number in one place (spec sections 3-5).
// No DOM, no rendering: this module is safe to import from plain Node.

export const STEP = 1 / 60;
export const TILE = 80;
export const COLS = 14;
export const ROWS = 9;
export const PANEL_X = 1120;
export const WIDTH = 1280;
export const HEIGHT = 720;

export const START_GOLD = 200;
export const START_LIVES = 20;
export const SELL_REFUND = 0.7;
export const INTEREST_RATE = 0.05;
export const INTEREST_CAP = 30;

export function waveBonus(wave) { return 20 + 2 * wave; }
export function hpMultiplier(wave) { return 1 + 0.22 * (wave - 1); }

// mulberry32 seeded RNG: gameplay cosmetics only; the sim itself needs none.
export function createRandom(seed) {
  let a = (seed >>> 0) || 1;
  return function random() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tower base stats (level 1). Projectile speeds: Arrow 520, Cannon 380,
// Frost 420, Arc is instant-hit.
export const TOWERS = {
  arrow:  { key: 'arrow',  name: 'Arrow',  cost: 50,  range: 150, interval: 0.5,  damage: 6,  projSpeed: 520 },
  cannon: { key: 'cannon', name: 'Cannon', cost: 100, range: 140, interval: 1.6,  damage: 22, projSpeed: 380, splash: 60 },
  frost:  { key: 'frost',  name: 'Frost',  cost: 75,  range: 130, interval: 0.8,  damage: 2,  projSpeed: 420, slow: 0.4, slowDur: 1.5 },
  arc:    { key: 'arc',    name: 'Arc',    cost: 125, range: 160, interval: 1.1,  damage: 14, chains: 3, jumpRadius: 90 },
};
export const TOWER_ORDER = ['arrow', 'cannon', 'frost', 'arc'];
// Upgrade cost to go from level 1->2 and 2->3, per tower type.
export const UPGRADE_COSTS = {
  arrow: [40, 80], cannon: [80, 150], frost: [60, 110], arc: [100, 180],
};

// Effective stats of a tower of `type` at `level` (1..3), spec section 3.
export function towerStats(type, level) {
  const b = TOWERS[type];
  const s = { ...b, level };
  if (type === 'arrow') {
    if (level === 2) s.damage = 11;
    if (level === 3) { s.damage = 19; s.interval = 0.4; }
  } else if (type === 'cannon') {
    if (level === 2) { s.damage = 40; s.splash = 70; }
    if (level === 3) { s.damage = 70; s.splash = 85; s.interval = 1.4; }
  } else if (type === 'frost') {
    if (level === 2) { s.damage = 4; s.slow = 0.5; s.slowDur = 2.0; }
    if (level === 3) { s.damage = 7; s.slow = 0.6; s.slowDur = 2.5; }
  } else if (type === 'arc') {
    if (level === 2) { s.damage = 25; s.chains = 4; }
    if (level === 3) { s.damage = 42; s.chains = 5; s.interval = 0.9; }
  }
  return s;
}

export const ENEMIES = {
  grunt:    { key: 'grunt',    name: 'Grunt',    hp: 30,   speed: 38, reward: 6,   leak: 1,  radius: 14 },
  runner:   { key: 'runner',   name: 'Runner',   hp: 16,   speed: 78, reward: 5,   leak: 1,  radius: 12 },
  swarm:    { key: 'swarm',    name: 'Swarm',    hp: 8,    speed: 52, reward: 2,   leak: 1,  radius: 9 },
  brute:    { key: 'brute',    name: 'Brute',    hp: 130,  speed: 30, reward: 9,   leak: 1,  radius: 17 },
  shielded: { key: 'shielded', name: 'Shielded', hp: 55,   speed: 34, reward: 10,  leak: 1,  radius: 14, shield: true },
  tank:     { key: 'tank',     name: 'Tank',     hp: 220,  speed: 22, reward: 18,  leak: 2,  radius: 19 },
  boss:     { key: 'boss',     name: 'Ember Tyrant', hp: 9000, speed: 18, reward: 300, leak: 10, radius: 26, boss: true },
};
// Damage multiplier a Shielded enemy takes from non-Arc sources.
export const SHIELD_FACTOR = 0.3;
