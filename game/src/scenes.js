// Deterministic screenshot scenes (spec section 7), selected with
// ?scene=title|wave3|wave8|victory (the kit's ?shot= name also works).
// Each stages a scripted snapshot on a fresh game, advances a fixed number
// of fixed steps where motion is wanted, and leaves a frozen frame.

import { STEP } from './config.js';
import { stageEnemy, stageTower, stepGame } from './engine.js';

export function stageScene(name, state, fx) {
  state.events.length = 0;
  if (name === 'wave3') {
    stageTower(state, 'arrow', 5, 2, 2);
    stageTower(state, 'cannon', 7, 3, 1);
    state.gold = 138; state.lives = 20; state.wave = 3; state.phase = 'combat';
    // Grunts / Runners mid-path on legs 1-2, one Brute entering leg 3.
    stageEnemy(state, 'grunt', 505, 3);
    stageEnemy(state, 'grunt', 430, 3);
    stageEnemy(state, 'runner', 350, 3);
    stageEnemy(state, 'grunt', 640, 3);
    stageEnemy(state, 'runner', 700, 3);
    stageEnemy(state, 'brute', 815, 3);
    for (let i = 0; i < 22; i += 1) stepGame(state, STEP);
    state.events.length = 0;
    for (const e of state.enemies) e.flash = 0; // no frozen damage-flash in the still
    state.phase = 'combat'; state.gold = 138; state.lives = 20; state.wave = 3;
    state.banner = null;
    state.preview = { col: 8, row: 3, type: 'arrow' };
    state.shopPick = 'arrow';
    return;
  }
  if (name === 'wave8') {
    stageTower(state, 'arrow', 5, 2, 3);
    stageTower(state, 'cannon', 7, 3, 2);
    stageTower(state, 'frost', 10, 6, 2);
    stageTower(state, 'arrow', 3, 5, 2);
    stageTower(state, 'arc', 12, 5, 1);
    stageTower(state, 'arrow', 12, 3, 1);
    state.gold = 242; state.lives = 20; state.wave = 8; state.phase = 'combat';
    // Swarm pack inside Arc range on the col-13 leg.
    const swarm = [];
    for (const d of [2525, 2560, 2595, 2630, 2665, 2700 - 12]) swarm.push(stageEnemy(state, 'swarm', d, 8));
    stageEnemy(state, 'swarm', 2470, 8);
    // Two Tanks slowed (blue tint) inside Frost's row-7 zone.
    for (const d of [1960, 2050]) {
      const tank = stageEnemy(state, 'tank', d, 8);
      tank.slowPct = 0.5; tank.slowUntil = 999;
      tank.hp = tank.maxHp * 0.72;
    }
    const grunt = stageEnemy(state, 'grunt', 1500, 8);
    grunt.hp = grunt.maxHp * 0.55;
    // Frozen chain-lightning volley: Arc tower -> swarm chain.
    const arcTower = state.towers.find((t) => t.type === 'arc');
    const points = [{ x: arcTower.x, y: arcTower.y }];
    for (const s of swarm.slice(0, 4)) points.push({ x: s.x, y: s.y });
    state.lightning.push({ points, ttl: 999, max: 999 });
    // A cannon shell mid-flight over row 7 + its last explosion still ringing.
    state.projectiles.push({
      id: 99991, type: 'cannon', x: 760, y: 560, lastX: 800, lastY: 600,
      target: null, speed: 0, damage: 0, splash: 70, slow: 0, slowDur: 0,
      trail: [{ x: 700, y: 520 }, { x: 725, y: 540 }, { x: 745, y: 552 }],
    });
    if (fx) {
      fx.rings.push({ x: 660, y: 600, r: 30, max: 78, t: 0.1, life: 9 });
      fx.burst(660, 600, '#ff9800', 16, 120, 9, 3.4);
      fx.burst(660, 600, '#6d4c41', 8, 55, 9, 5);
      for (const p of fx.particles) { p.vx = 0; p.vy = 0; p.grav = 0; }
    }
    state.banner = null;
    return;
  }
  if (name === 'victory') {
    stageTower(state, 'arrow', 5, 2, 3);
    stageTower(state, 'cannon', 7, 3, 3);
    stageTower(state, 'frost', 10, 6, 3);
    stageTower(state, 'arrow', 3, 5, 3);
    stageTower(state, 'arc', 12, 5, 3);
    stageTower(state, 'arrow', 12, 3, 3);
    stageTower(state, 'cannon', 5, 5, 3);
    stageTower(state, 'cannon', 10, 5, 2);
    state.gold = 207; state.lives = 20; state.wave = 12; state.kills = 272;
    state.phase = 'victory';
    if (fx) { fx.confetti(); for (const p of fx.particles) p.y += 120; }
    return;
  }
  // title (default): empty dusk map, one idle Arrow tower as a diorama.
  stageTower(state, 'arrow', 5, 2, 1);
  state.gold = 200; state.lives = 20; state.wave = 0;
  state.phase = 'title';
}
