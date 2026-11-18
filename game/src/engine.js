// Emberline Defense core simulation: towers, enemies, projectiles, economy.
// Pure logic — no DOM, no canvas, no audio — so plain Node can import this
// file and step a whole run headlessly (see sim.js). The browser layer
// (main.js / render.js / fx.js) only reads state and consumes `events`.
//
// Events are plain objects pushed onto state.events during step(); the
// consumer clears the array each frame. Types: shoot, explosion, zap, die,
// leak, gold, place, upgrade, sell, wave, victory, defeat, hit.

import {
  ENEMIES, INTEREST_CAP, INTEREST_RATE, SHIELD_FACTOR, START_GOLD,
  START_LIVES, TOWERS, UPGRADE_COSTS, hpMultiplier, towerStats, waveBonus,
} from './config.js';
import { PATH_LENGTH, isDecorTile, isPathTile, posAt, tileCenter } from './map.js';
import { WAVES, WAVE_COUNT } from './waves.js';

let nextId = 1;

export function createGame() {
  const state = {
    phase: 'build', // build | combat | victory | defeat | title
    time: 0,
    gold: START_GOLD,
    lives: START_LIVES,
    wave: 0, // last wave started / in progress; next is wave+1 in build
    towers: [],
    enemies: [],
    projectiles: [],
    lightning: [], // {points:[{x,y}...], ttl, max}
    events: [],
    spawner: null,
    kills: 0,
    leaks: 0,
    earned: 0,
    preview: null, // staged placement preview for scenes: {col,row,type}
    selected: null, // selected tower id (UI)
    shopPick: null, // tower type picked in the shop (UI)
    hover: null, // {col,row} hovered tile (UI)
    banner: null, // {text, t} wave banner (UI timing lives in fx, this is data)
    shake: 0, // requested shake magnitude, consumed by fx
  };
  return state;
}

export function towerAt(state, col, row) {
  return state.towers.find((t) => t.col === col && t.row === row) || null;
}

export function canPlace(state, col, row) {
  if (col < 0 || col > 13 || row < 0 || row > 8) return false;
  if (isPathTile(col, row) || isDecorTile(col, row)) return false;
  return !towerAt(state, col, row);
}

export function placeTower(state, type, col, row, free = false) {
  const def = TOWERS[type];
  if (!def || !canPlace(state, col, row)) return null;
  if (!free && state.gold < def.cost) return null;
  if (!free) state.gold -= def.cost;
  const c = tileCenter(col, row);
  const tower = {
    id: nextId++, type, col, row, x: c.x, y: c.y, level: 1,
    invested: free ? def.cost : def.cost, cooldown: 0, flash: 0, angle: -Math.PI / 2,
  };
  state.towers.push(tower);
  state.events.push({ type: 'place', x: c.x, y: c.y });
  return tower;
}

export function upgradeCost(tower) {
  if (tower.level >= 3) return null;
  return UPGRADE_COSTS[tower.type][tower.level - 1];
}

export function upgradeTower(state, tower, free = false) {
  const cost = upgradeCost(tower);
  if (cost === null) return false;
  if (!free && state.gold < cost) return false;
  if (!free) { state.gold -= cost; tower.invested += cost; }
  tower.level += 1;
  state.events.push({ type: 'upgrade', x: tower.x, y: tower.y });
  return true;
}

export function sellValue(tower) { return Math.floor(tower.invested * 0.7); }

export function sellTower(state, tower) {
  const idx = state.towers.indexOf(tower);
  if (idx < 0) return false;
  state.gold += sellValue(tower);
  state.towers.splice(idx, 1);
  state.events.push({ type: 'sell', x: tower.x, y: tower.y });
  return true;
}

// Force-place helpers for screenshot scenes (bypass economy, set level).
export function stageTower(state, type, col, row, level) {
  const t = placeTower(state, type, col, row, true);
  if (t) while (t.level < level) { t.level += 1; t.invested += UPGRADE_COSTS[type][t.level - 2]; }
  state.events.length = 0;
  return t;
}

function spawnEnemy(state, type) {
  const def = ENEMIES[type];
  const mult = def.boss ? 1 : hpMultiplier(state.wave);
  const hp = def.boss ? def.hp : Math.round(def.hp * mult);
  const e = {
    id: nextId++, type, def, hp, maxHp: hp, dist: 0, x: -40, y: 120,
    slowPct: 0, slowUntil: -1, flash: 0, shieldFx: 0, dead: false, leaked: false,
  };
  state.enemies.push(e);
  return e;
}

// Stage an enemy at a fixed path distance (screenshot scenes).
export function stageEnemy(state, type, dist, waveForHp = 3) {
  const saved = state.wave;
  state.wave = waveForHp;
  const e = spawnEnemy(state, type);
  state.wave = saved;
  e.dist = dist;
  const p = posAt(dist);
  e.x = p.x; e.y = p.y;
  return e;
}

export function startWave(state) {
  if (state.phase !== 'build') return false;
  state.wave += 1;
  const groups = WAVES[state.wave].map(([type, count, interval]) => ({ type, left: count, interval }));
  state.spawner = { groups, groupIdx: 0, timer: 0 };
  state.phase = 'combat';
  state.banner = { text: state.wave === WAVE_COUNT ? 'FINAL WAVE' : `WAVE ${state.wave}`, t: 0 };
  state.events.push({ type: 'wave', wave: state.wave });
  return true;
}

function updateSpawner(state, dt) {
  const sp = state.spawner;
  if (!sp) return;
  sp.timer -= dt;
  while (sp.groupIdx < sp.groups.length) {
    const g = sp.groups[sp.groupIdx];
    if (g.left <= 0) { sp.groupIdx += 1; continue; }
    if (sp.timer > 0) return;
    spawnEnemy(state, g.type);
    g.left -= 1;
    sp.timer = g.interval;
    if (g.left <= 0) sp.groupIdx += 1;
    return; // at most one spawn per step keeps ordering exact
  }
}

function applyDamage(state, enemy, amount, source) {
  if (enemy.dead || enemy.leaked) return;
  let dmg = amount;
  if (enemy.def.shield && source !== 'arc') {
    dmg *= SHIELD_FACTOR;
    enemy.shieldFx = 0.25;
  }
  enemy.hp -= dmg;
  enemy.flash = 0.06;
  if (enemy.hp <= 0) {
    enemy.dead = true;
    state.gold += enemy.def.reward;
    state.earned += enemy.def.reward;
    state.kills += 1;
    state.events.push({ type: 'die', x: enemy.x, y: enemy.y, enemyType: enemy.type, boss: !!enemy.def.boss });
    state.events.push({ type: 'gold', x: enemy.x, y: enemy.y, amount: enemy.def.reward });
    if (enemy.def.boss) state.shake = Math.max(state.shake, 14);
  }
}

function applySlow(state, enemy, pct, dur) {
  const active = enemy.slowUntil > state.time ? enemy.slowPct : 0;
  if (pct >= active) {
    enemy.slowPct = pct;
    enemy.slowUntil = state.time + dur;
  }
}

function enemiesInRange(state, tower, stats) {
  // Range is measured to the enemy's edge, the usual tower-defence reading:
  // a tower fires when any part of the enemy is inside its range circle.
  return state.enemies.filter((e) => !e.dead && !e.leaked
    && Math.hypot(e.x - tower.x, e.y - tower.y) <= stats.range + e.def.radius);
}

function pickTarget(state, tower, stats) {
  const inRange = enemiesInRange(state, tower, stats);
  if (!inRange.length) return null;
  if (tower.type === 'frost') {
    const unslowed = inRange.filter((e) => e.slowUntil <= state.time);
    const pool = unslowed.length ? unslowed : inRange;
    return pool.reduce((a, b) => (b.dist > a.dist ? b : a));
  }
  return inRange.reduce((a, b) => (b.dist > a.dist ? b : a));
}

function fireArc(state, tower, stats, target) {
  const hit = new Set();
  const points = [{ x: tower.x, y: tower.y }];
  let current = target;
  let dmg = stats.damage;
  for (let jump = 0; jump < stats.chains && current; jump += 1) {
    hit.add(current.id);
    points.push({ x: current.x, y: current.y });
    applyDamage(state, current, Math.round(dmg), 'arc');
    dmg *= 0.7;
    // next: nearest unhit enemy within jump radius of `current`
    let best = null; let bestD = stats.jumpRadius;
    for (const e of state.enemies) {
      if (e.dead || e.leaked || hit.has(e.id)) continue;
      const d = Math.hypot(e.x - current.x, e.y - current.y);
      if (d <= bestD) { bestD = d; best = e; }
    }
    current = best;
  }
  state.lightning.push({ points, ttl: 0.09, max: 0.09 });
  state.events.push({ type: 'zap', x: tower.x, y: tower.y });
}

function fire(state, tower, stats, target) {
  tower.flash = 0.07;
  tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
  if (tower.type === 'arc') { fireArc(state, tower, stats, target); return; }
  state.projectiles.push({
    id: nextId++, type: tower.type, x: tower.x, y: tower.y,
    target, lastX: target.x, lastY: target.y, speed: stats.projSpeed,
    damage: stats.damage, splash: stats.splash || 0,
    slow: stats.slow || 0, slowDur: stats.slowDur || 0, trail: [],
  });
  state.events.push({ type: 'shoot', shootType: tower.type, x: tower.x, y: tower.y });
}

function hitProjectile(state, p) {
  if (p.type === 'cannon') {
    state.events.push({ type: 'explosion', x: p.lastX, y: p.lastY, r: p.splash });
    for (const e of [...state.enemies]) {
      if (e.dead || e.leaked) continue;
      const d = Math.hypot(e.x - p.lastX, e.y - p.lastY);
      if (d <= p.splash + e.def.radius * 0.5) {
        applyDamage(state, e, d <= 40 + e.def.radius * 0.5 ? p.damage : p.damage * 0.5, 'cannon');
      }
    }
    return;
  }
  const t = p.target;
  if (t && !t.dead && !t.leaked) {
    if (p.type === 'frost') applySlow(state, t, p.slow, p.slowDur);
    applyDamage(state, t, p.damage, p.type);
  }
}

function stepProjectiles(state, dt) {
  for (const p of state.projectiles) {
    if (p.target && !p.target.dead && !p.target.leaked) { p.lastX = p.target.x; p.lastY = p.target.y; }
    const dx = p.lastX - p.x; const dy = p.lastY - p.y;
    const d = Math.hypot(dx, dy);
    const move = p.speed * dt;
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 6) p.trail.shift();
    if (d <= move + 4) { p.x = p.lastX; p.y = p.lastY; p.done = true; hitProjectile(state, p); }
    else { p.x += (dx / d) * move; p.y += (dy / d) * move; }
  }
  state.projectiles = state.projectiles.filter((p) => !p.done);
}

function stepEnemies(state, dt) {
  for (const e of state.enemies) {
    if (e.dead || e.leaked) continue;
    if (e.flash > 0) e.flash -= dt;
    if (e.shieldFx > 0) e.shieldFx -= dt;
    const slowFactor = e.slowUntil > state.time ? 1 - e.slowPct : 1;
    e.dist += e.def.speed * slowFactor * dt;
    if (e.dist >= PATH_LENGTH) {
      e.leaked = true;
      state.lives -= e.def.leak;
      state.leaks += 1;
      state.shake = Math.max(state.shake, e.def.boss ? 14 : e.type === 'tank' ? 3 : 6);
      state.events.push({ type: 'leak', x: 1080, y: 600, enemyType: e.type });
      continue;
    }
    const p = posAt(e.dist);
    e.x = p.x; e.y = p.y;
  }
  state.enemies = state.enemies.filter((e) => !e.dead && !e.leaked);
  if (state.lives <= 0 && state.phase === 'combat') {
    state.lives = 0;
    state.phase = 'defeat';
    state.events.push({ type: 'defeat' });
  }
}

function checkWaveClear(state) {
  if (state.phase !== 'combat' || !state.spawner) return;
  const sp = state.spawner;
  const doneSpawning = sp.groupIdx >= sp.groups.length;
  if (!doneSpawning || state.enemies.length > 0) return;
  state.spawner = null;
  const bonus = waveBonus(state.wave);
  const interest = Math.min(INTEREST_CAP, Math.floor(state.gold * INTEREST_RATE));
  state.gold += bonus + interest;
  state.earned += bonus + interest;
  state.events.push({ type: 'clear', wave: state.wave, bonus, interest });
  if (state.wave >= WAVE_COUNT) {
    state.phase = 'victory';
    state.events.push({ type: 'victory' });
  } else {
    state.phase = 'build';
  }
}

// One fixed 1/60 step.
export function stepGame(state, dt) {
  if (state.phase === 'victory' || state.phase === 'defeat' || state.phase === 'title') return;
  state.time += dt;
  if (state.banner) { state.banner.t += dt; if (state.banner.t > 1.6) state.banner = null; }
  for (const l of state.lightning) l.ttl -= dt;
  state.lightning = state.lightning.filter((l) => l.ttl > 0);
  if (state.phase === 'combat') {
    updateSpawner(state, dt);
    stepEnemies(state, dt);
    if (state.phase !== 'combat') return;
    for (const tower of state.towers) {
      if (tower.flash > 0) tower.flash -= dt;
      tower.cooldown -= dt;
      const stats = towerStats(tower.type, tower.level);
      const target = pickTarget(state, tower, stats);
      if (target) tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
      if (tower.cooldown <= 0 && target) {
        fire(state, tower, stats, target);
        // Carry the overshoot so the long-run fire rate is exactly
        // 1/interval, instead of losing up to one step per shot.
        tower.cooldown += stats.interval;
        if (tower.cooldown < 0) tower.cooldown = 0;
      }
    }
    stepProjectiles(state, dt);
    checkWaveClear(state);
  }
}

export { towerStats };
