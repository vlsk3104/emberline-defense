// Boot and the one loop. Fixed 1/60 s simulation steps, decoupled from
// rendering; 1x/2x speed multiplies steps per frame, never the step size.
//
// URL hooks:
//   ?scene=title|wave3|wave8|victory  (&seed=16, ?shot= also accepted)
//       stage a deterministic screenshot scene, paint it, set
//       window.__shotReady for the kit's screenshot tooling.
//   ?sim=reference|none
//       run the headless sim in-page and report the result (the same code
//       runs in plain Node via game/src/sim.js).

import { PANEL_X, STEP, TILE, TOWERS, TOWER_ORDER } from './config.js';
import { createGame, placeTower, sellTower, startWave, stepGame, towerAt, upgradeTower } from './engine.js';
import { createFx } from './fx.js';
import { createAudio } from './audio.js';
import { UI, createRenderer } from './render.js';
import { stageScene } from './scenes.js';
import { runSim } from './sim.js';

const params = new URLSearchParams(window.location.search);
const sceneName = params.get('scene') || params.get('shot');
const simMode = params.get('sim');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 16;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();

if (simMode) {
  const result = runSim(simMode === 'none' ? 'none' : 'reference', (m) => console.log(m));
  console.log(`SIM RESULT ${JSON.stringify(result)}`);
  window.__simResult = result;
  status.textContent = `sim ${result.mode}: ${result.result}, lives ${result.lives}, wave ${result.wave}`;
  document.title = `sim:${result.result}`;
  window.__shotReady = true;
} else if (sceneName) {
  const state = createGame();
  const fx = createFx(seed);
  stageScene(sceneName, state, fx);
  const renderer = createRenderer(canvas, seed);
  let painted = 0;
  function paint() {
    renderer.draw(state, fx, { time: 1.25, speed: 1, paused: false, shakeOff: { x: 0, y: 0 } });
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
} else {
  runGame();
}

function runGame() {
  let state = createGame();
  state.phase = 'title';
  const fx = createFx(seed);
  const renderer = createRenderer(canvas, seed);
  let speed = 1;
  let paused = false;
  let viewTime = 0;
  let accumulator = 0;
  let last = performance.now();

  function announce(msg) { status.textContent = msg; }

  function restart() {
    state = createGame();
    fx.reset();
    paused = false;
    accumulator = 0;
    announce('New run. Place towers, then send wave 1.');
  }

  function canvasPos(ev) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left) * (canvas.width / rect.width),
      y: (ev.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function inRect(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }

  canvas.addEventListener('mousemove', (ev) => {
    const { x, y } = canvasPos(ev);
    if (x < PANEL_X) {
      const col = Math.floor(x / TILE); const row = Math.floor(y / TILE);
      state.hover = { col, row };
    } else state.hover = null;
  });

  canvas.addEventListener('click', (ev) => {
    audio.unlock();
    const { x, y } = canvasPos(ev);
    if (state.phase === 'title') { state.phase = 'build'; announce('Build phase. Wave 1 when ready.'); return; }
    if (state.phase === 'victory' || state.phase === 'defeat') return;
    if (x >= PANEL_X) {
      // side panel
      for (let i = 0; i < TOWER_ORDER.length; i += 1) {
        if (inRect(x, y, UI.shopCard(i))) {
          const type = TOWER_ORDER[i];
          state.shopPick = state.shopPick === type ? null : type;
          state.selected = null;
          return;
        }
      }
      if (inRect(x, y, UI.send)) {
        if (startWave(state)) { audio.play('wave'); announce(`Wave ${state.wave} incoming.`); }
        return;
      }
      if (inRect(x, y, UI.speed)) { speed = speed === 1 ? 2 : 1; return; }
      if (inRect(x, y, UI.pause)) { paused = !paused; return; }
      const sel = state.towers.find((t) => t.id === state.selected);
      if (sel && inRect(x, y, UI.upgrade)) {
        if (upgradeTower(state, sel)) audio.play('upgrade');
        return;
      }
      if (sel && inRect(x, y, UI.sell)) {
        sellTower(state, sel);
        state.selected = null;
        audio.play('sell');
        return;
      }
      return;
    }
    // playfield
    const col = Math.floor(x / TILE); const row = Math.floor(y / TILE);
    const existing = towerAt(state, col, row);
    if (existing) {
      state.selected = existing.id;
      state.shopPick = null;
      return;
    }
    if (state.shopPick && state.phase === 'build') {
      const placed = placeTower(state, state.shopPick, col, row);
      if (placed) {
        audio.play('place');
        if (state.gold < TOWERS[state.shopPick].cost) state.shopPick = null;
      }
      return;
    }
    state.selected = null;
  });

  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'r' || ev.key === 'R') restart();
    else if (ev.key === 'Escape') { state.shopPick = null; state.selected = null; state.preview = null; }
    else if (ev.key === 'p' || ev.key === 'P') paused = !paused;
  });

  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    viewTime += dt;
    if (!paused && state.phase !== 'title') {
      accumulator += dt * speed;
      let guard = 0;
      while (accumulator >= STEP && guard < 12) {
        stepGame(state, STEP);
        fx.consume(state);
        audio.playEvents(state.events);
        if (state.events.some((e) => e.type === 'victory')) fx.confetti();
        state.events.length = 0;
        accumulator -= STEP;
        guard += 1;
      }
      if (guard >= 12) accumulator = 0;
      fx.update(dt * speed);
    }
    renderer.draw(state, fx, {
      time: viewTime, speed, paused,
      shakeOff: fx.shakeOffset(),
    });
  }
  requestAnimationFrame(frame);
}
