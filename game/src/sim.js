// Headless simulations (spec section 5). Runnable in plain Node:
//   node game/src/sim.js reference   -> reference build order, expect VICTORY
//   node game/src/sim.js none        -> no towers, expect defeat around wave 3
// Also imported by main.js for the ?sim=reference / ?sim=none URL hooks.

import { STEP } from './config.js';
import { createGame, placeTower, startWave, stepGame, towerAt, upgradeTower } from './engine.js';

// Reference build order (spec section 5). Keys are the wave about to start.
const REFERENCE = {
  1: [['buy', 'arrow', 5, 2], ['buy', 'cannon', 7, 3]],
  3: [['up', 5, 2]],
  4: [['up', 7, 3], ['buy', 'frost', 10, 6]],
  5: [['buy', 'arrow', 3, 5]],
  6: [['buy', 'arc', 12, 5], ['up', 5, 2]],
  7: [['up', 10, 6], ['buy', 'arrow', 12, 3]],
  8: [['buy', 'cannon', 5, 5], ['up', 3, 5]],
  9: [['up', 7, 3], ['up', 12, 5]],
  10: [['up', 10, 6], ['up', 12, 3], ['up', 5, 5]],
  11: [['up', 12, 5], ['up', 3, 5]],
  12: [['up', 5, 5], ['up', 12, 3], ['buy', 'cannon', 10, 5], ['up', 10, 5]],
};

export function runSim(mode, log = () => {}) {
  const state = createGame();
  const maxSteps = 60 * 60 * 40; // 40 sim-minutes hard cap
  let steps = 0;
  let defeatWave = null;
  while (steps < maxSteps) {
    if (state.phase === 'victory' || state.phase === 'defeat') break;
    if (state.phase === 'build') {
      const nextWave = state.wave + 1;
      if (mode === 'reference') {
        for (const action of REFERENCE[nextWave] || []) {
          if (action[0] === 'buy') {
            const t = placeTower(state, action[1], action[2], action[3]);
            if (!t) log(`  WARN pre-W${nextWave}: could not buy ${action[1]} at ${action[2]},${action[3]} (gold ${state.gold})`);
          } else {
            const t = towerAt(state, action[1], action[2]);
            if (!t || !upgradeTower(state, t)) log(`  WARN pre-W${nextWave}: could not upgrade ${action[1]},${action[2]} (gold ${state.gold})`);
          }
        }
      }
      log(`pre-W${nextWave}: gold=${state.gold} lives=${state.lives} towers=${state.towers.length}`);
      startWave(state);
    }
    const waveNow = state.wave;
    stepGame(state, STEP);
    state.events.length = 0;
    steps += 1;
    if (state.phase === 'defeat' && defeatWave === null) defeatWave = waveNow;
    if (state.phase === 'build' || state.phase === 'victory') {
      log(`after W${waveNow}: gold=${state.gold} lives=${state.lives} phase=${state.phase}`);
    }
  }
  return {
    mode, result: state.phase, lives: state.lives, gold: state.gold,
    wave: state.wave, defeatWave, kills: state.kills, leaks: state.leaks,
    towers: state.towers.length, simSeconds: steps * STEP,
  };
}

// Direct Node execution: `node sim.js [reference|none|both]`
const isDirect = typeof process !== 'undefined' && process.argv
  && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isDirect) {
  const which = process.argv[2] || 'both';
  for (const mode of which === 'both' ? ['reference', 'none'] : [which]) {
    const r = runSim(mode, (m) => console.log(m));
    console.log(`SIM ${mode}: result=${r.result} lives=${r.lives} gold=${r.gold} wave=${r.wave} defeatWave=${r.defeatWave} kills=${r.kills} leaks=${r.leaks} towers=${r.towers} time=${r.simSeconds.toFixed(1)}s`);
  }
}
