// All drawing: map, towers, enemies, projectiles, lightning, HUD, side
// panel, overlays. Canvas 2D only, no assets. The UI rects exported here
// are the same ones main.js hit-tests, so what you see is what you click.

import { HEIGHT, PANEL_X, TILE, TOWERS, TOWER_ORDER, WIDTH, createRandom, towerStats } from './config.js';
import { DECOR_TILES, HEART, PATH_TILES, tileCenter } from './map.js';
import { canPlace, sellValue, upgradeCost } from './engine.js';

export const UI = {
  shopCard: (i) => ({ x: 1132, y: 118 + i * 94, w: 136, h: 86 }),
  send: { x: 1132, y: 498, w: 136, h: 42 },
  speed: { x: 1132, y: 550, w: 64, h: 34 },
  pause: { x: 1204, y: 550, w: 64, h: 34 },
  upgrade: { x: 1132, y: 636, w: 136, h: 30 },
  sell: { x: 1132, y: 672, w: 136, h: 30 },
};

const TOWER_COLORS = { arrow: '#aed581', cannon: '#ffb74d', frost: '#81d4fa', arc: '#ce93d8' };
const ENEMY_COLORS = {
  grunt: '#e2574c', runner: '#f2a541', swarm: '#c86dd7', brute: '#8d6e63',
  shielded: '#64b5f6', tank: '#b0bec5', boss: '#ff7043',
};

function buildBackground(seed) {
  const cv = document.createElement('canvas');
  cv.width = WIDTH; cv.height = HEIGHT;
  const g = cv.getContext('2d');
  const rand = createRandom(seed ^ 0x9e3779b9);
  // grass checker
  for (let r = 0; r < 9; r += 1) for (let c = 0; c < 14; c += 1) {
    g.fillStyle = (c + r) % 2 === 0 ? '#2f4d31' : '#2a452c';
    g.fillRect(c * TILE, r * TILE, TILE, TILE);
  }
  // seeded scatter: pebbles, tufts, tiny flowers
  for (let i = 0; i < 340; i += 1) {
    const x = rand() * PANEL_X; const y = rand() * HEIGHT;
    const kind = rand();
    if (kind < 0.4) { g.fillStyle = 'rgba(255,255,255,0.07)'; g.beginPath(); g.arc(x, y, 1.6 + rand() * 1.6, 0, 7); g.fill(); }
    else if (kind < 0.85) { g.strokeStyle = 'rgba(120,180,110,0.5)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 3, y - 6 - rand() * 4); g.moveTo(x + 4, y); g.lineTo(x + 6, y - 5 - rand() * 4); g.stroke(); }
    else { g.fillStyle = 'rgba(255,183,77,0.55)'; g.beginPath(); g.arc(x, y, 1.8, 0, 7); g.fill(); }
  }
  // path: packed dirt with darker edge stones + chevrons
  g.lineCap = 'round'; g.lineJoin = 'round';
  const pts = [[-40, 120], [520, 120], [520, 360], [200, 360], [200, 600], [920, 600], [920, 360], [1080, 360], [1080, 600]];
  const trace = () => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const [x, y] of pts.slice(1)) g.lineTo(x, y); };
  trace(); g.strokeStyle = '#4e342e'; g.lineWidth = 74; g.stroke();
  trace(); g.strokeStyle = '#795548'; g.lineWidth = 64; g.stroke();
  trace(); g.strokeStyle = '#8d6e63'; g.lineWidth = 52; g.stroke();
  // edge stones
  g.fillStyle = 'rgba(62,39,35,0.8)';
  for (const key of PATH_TILES) {
    const [c, r] = key.split(',').map(Number);
    for (let i = 0; i < 3; i += 1) {
      g.beginPath(); g.arc(c * TILE + rand() * TILE, r * TILE + rand() * TILE, 2 + rand() * 2.4, 0, 7); g.fill();
    }
  }
  // direction chevrons
  g.strokeStyle = 'rgba(255,213,79,0.20)'; g.lineWidth = 3;
  for (const [x, y, a] of [[240, 120, 0], [520, 240, Math.PI / 2], [360, 360, Math.PI], [200, 480, Math.PI / 2], [560, 600, 0], [920, 480, -Math.PI / 2], [1000, 360, 0], [1080, 480, Math.PI / 2]]) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.beginPath(); g.moveTo(-7, -8); g.lineTo(5, 0); g.lineTo(-7, 8); g.stroke(); g.restore();
  }
  // decorations
  for (const [key, kind] of DECOR_TILES) {
    const [c, r] = key.split(',').map(Number);
    const { x, y } = tileCenter(c, r);
    if (kind === 'pine') {
      g.fillStyle = '#1b3320';
      for (const [dx, dy, s] of [[-16, 8, 26], [14, 12, 32], [0, -12, 36]]) {
        g.beginPath(); g.moveTo(x + dx, y + dy - s); g.lineTo(x + dx - s * 0.42, y + dy + s * 0.5); g.lineTo(x + dx + s * 0.42, y + dy + s * 0.5); g.closePath(); g.fill();
      }
    } else if (kind === 'rock') {
      g.fillStyle = '#616161'; g.beginPath(); g.ellipse(x, y + 6, 26, 16, 0, 0, 7); g.fill();
      g.fillStyle = '#757575'; g.beginPath(); g.ellipse(x - 8, y, 15, 11, 0, 0, 7); g.fill();
    } else if (kind === 'pond') {
      g.fillStyle = '#1e4d6b'; g.beginPath(); g.ellipse(x, y, 32, 22, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(129,212,250,0.5)'; g.beginPath(); g.ellipse(x - 8, y - 5, 14, 7, -0.4, 0, 7); g.fill();
    } else if (kind === 'shrine') {
      g.fillStyle = '#4e342e'; g.fillRect(x - 18, y + 8, 36, 10);
      g.fillStyle = '#ff9800'; g.beginPath(); g.arc(x, y - 2, 7 + Math.sin(seed) * 1, 0, 7); g.fill();
      g.fillStyle = '#ffd54f'; g.beginPath(); g.arc(x, y - 2, 3.4, 0, 7); g.fill();
    }
  }
  // spawn portal
  g.strokeStyle = '#ce93d8'; g.lineWidth = 4;
  g.beginPath(); g.ellipse(6, 120, 10, 30, 0, 0, 7); g.stroke();
  g.strokeStyle = 'rgba(206,147,216,0.4)'; g.beginPath(); g.ellipse(6, 120, 17, 40, 0, 0, 7); g.stroke();
  // side panel backdrop
  g.fillStyle = '#1d1424'; g.fillRect(PANEL_X, 0, 160, HEIGHT);
  g.fillStyle = '#ff7043'; g.fillRect(PANEL_X, 0, 2, HEIGHT);
  return cv;
}

function drawTowerShape(ctx, type, x, y, level, angle, ghost = false) {
  ctx.save();
  ctx.translate(x, y);
  if (ghost) ctx.globalAlpha = 0.55;
  // stone base
  ctx.fillStyle = '#5d4037';
  ctx.beginPath(); ctx.arc(0, 0, 25, 0, 7); ctx.fill();
  ctx.fillStyle = '#6d4c41';
  ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7); ctx.fill();
  if (type === 'arrow') {
    ctx.fillStyle = '#8d6e63'; ctx.fillRect(-4, -18, 8, 22);
    ctx.save(); ctx.rotate(angle);
    ctx.strokeStyle = '#d7ccc8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(12, 0, 11, -1.1, 1.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12 + 8.8, -9.7); ctx.lineTo(12 - 2, 0); ctx.lineTo(12 + 8.8, 9.7); ctx.stroke();
    ctx.restore();
  } else if (type === 'cannon') {
    ctx.save(); ctx.rotate(angle);
    ctx.fillStyle = '#37474f'; ctx.fillRect(0, -7, 26, 14);
    ctx.fillStyle = '#263238'; ctx.fillRect(20, -8.5, 8, 17);
    ctx.restore();
    ctx.fillStyle = '#546e7a'; ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.fill();
  } else if (type === 'frost') {
    ctx.fillStyle = '#81d4fa';
    ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(10, -4); ctx.lineTo(4, 14); ctx.lineTo(-4, 14); ctx.lineTo(-10, -4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e1f5fe'; ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(5, -6); ctx.lineTo(0, 6); ctx.lineTo(-5, -6); ctx.closePath(); ctx.fill();
  } else if (type === 'arc') {
    ctx.fillStyle = '#4a148c'; ctx.beginPath(); ctx.moveTo(-7, 16); ctx.lineTo(0, -14); ctx.lineTo(7, 16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ea80fc'; ctx.beginPath(); ctx.arc(0, -17, 6.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#f3e5f5'; ctx.beginPath(); ctx.arc(0, -17, 2.6, 0, 7); ctx.fill();
  }
  // level pips
  ctx.fillStyle = '#ffd54f';
  for (let i = 0; i < level; i += 1) { ctx.beginPath(); ctx.arc(-8 + i * 8, 30, 2.6, 0, 7); ctx.fill(); }
  ctx.restore();
}

function drawEnemy(ctx, e, time) {
  const color = ENEMY_COLORS[e.type];
  const r = e.def.radius;
  ctx.save(); ctx.translate(e.x, e.y);
  if (e.type === 'runner') { // speed lines
    ctx.strokeStyle = 'rgba(242,165,65,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-r - 4, -4); ctx.lineTo(-r - 12, -4); ctx.moveTo(-r - 4, 3); ctx.lineTo(-r - 10, 3); ctx.stroke();
  }
  if (e.def.shield) { // hex shield
    ctx.strokeStyle = e.shieldFx > 0 ? '#bbdefb' : 'rgba(100,181,246,0.75)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + 0.5;
      const px = Math.cos(a) * (r + 6); const py = Math.sin(a) * (r + 6);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.arc(0, r * 0.35, r * 0.8, 0, Math.PI); ctx.fill();
  // wraith eyes
  ctx.fillStyle = '#fff8e1';
  ctx.beginPath(); ctx.arc(-r * 0.32, -r * 0.15, r * 0.14 + 1, 0, 7); ctx.arc(r * 0.32, -r * 0.15, r * 0.14 + 1, 0, 7); ctx.fill();
  ctx.fillStyle = '#212121';
  ctx.beginPath(); ctx.arc(-r * 0.32, -r * 0.15, r * 0.07 + 0.6, 0, 7); ctx.arc(r * 0.32, -r * 0.15, r * 0.07 + 0.6, 0, 7); ctx.fill();
  if (e.type === 'brute' || e.type === 'boss') { // horns
    ctx.strokeStyle = '#d7ccc8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.6); ctx.lineTo(-r * 1.05, -r * 1.05); ctx.moveTo(r * 0.7, -r * 0.6); ctx.lineTo(r * 1.05, -r * 1.05); ctx.stroke();
  }
  if (e.type === 'tank') { // armour plates
    ctx.strokeStyle = 'rgba(38,50,56,0.7)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0.4, 2.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 3.5, 5.3); ctx.stroke();
  }
  if (e.slowUntil > time) { // slow tint
    ctx.fillStyle = 'rgba(129,212,250,0.42)';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  }
  if (e.flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  }
  ctx.restore();
  if (e.hp < e.maxHp && !e.def.boss) {
    const w = Math.max(26, r * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(e.x - w / 2, e.y - r - 13, w, 5);
    ctx.fillStyle = e.hp / e.maxHp > 0.35 ? '#9ccc65' : '#ef5350';
    ctx.fillRect(e.x - w / 2 + 0.5, e.y - r - 12.5, (w - 1) * Math.max(0, e.hp / e.maxHp), 4);
  }
}

function drawHeart(ctx, state, t) {
  const { x, y } = HEART;
  const pulse = 1 + Math.sin(t * 3) * 0.07;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#4e342e'; ctx.fillRect(-30, 18, 60, 14); // plinth
  ctx.fillStyle = '#6d4c41'; ctx.fillRect(-24, 10, 48, 10);
  const glow = ctx.createRadialGradient(0, -4, 4, 0, -4, 44 * pulse);
  glow.addColorStop(0, 'rgba(255,138,101,0.55)'); glow.addColorStop(1, 'rgba(255,138,101,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, -4, 44 * pulse, 0, 7); ctx.fill();
  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#ff7043';
  ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(13, -8); ctx.lineTo(6, 14); ctx.lineTo(-6, 14); ctx.lineTo(-13, -8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffccbc'; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(6, -10); ctx.lineTo(0, 4); ctx.lineTo(-6, -10); ctx.closePath(); ctx.fill();
  ctx.restore();
  if (state.lives <= 5 && state.phase !== 'victory') { // smoulder smoke
    ctx.fillStyle = 'rgba(120,120,120,0.35)';
    for (let i = 0; i < 3; i += 1) {
      const yy = y - 40 - ((t * 22 + i * 17) % 51);
      ctx.beginPath(); ctx.arc(x + Math.sin(t * 2 + i * 2.1) * 7, yy, 5 + (y - yy) * 0.08, 0, 7); ctx.fill();
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export function createRenderer(canvas, seed = 16) {
  const ctx = canvas.getContext('2d');
  const bg = buildBackground(seed);
  function draw(state, fx, view) {
    const t = view.time;
    ctx.save();
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    const off = view.shakeOff || { x: 0, y: 0 };
    ctx.translate(off.x, off.y);
    ctx.drawImage(bg, 0, 0);
    drawHeart(ctx, state, t);
    // placement preview
    const preview = state.preview || (state.shopPick && state.hover ? { ...state.hover, type: state.shopPick } : null);
    // An explicitly staged preview (screenshot scenes) shows even mid-wave;
    // the live hover preview only appears during the build phase.
    if (preview && (state.preview || state.phase === 'build')) {
      const c = tileCenter(preview.col, preview.row);
      const stats = towerStats(preview.type, 1);
      const ok = canPlace(state, preview.col, preview.row) && state.gold >= TOWERS[preview.type].cost;
      ctx.fillStyle = ok ? 'rgba(139,195,74,0.4)' : 'rgba(239,83,80,0.4)';
      ctx.fillRect(preview.col * TILE + 2, preview.row * TILE + 2, TILE - 4, TILE - 4);
      ctx.strokeStyle = ok ? 'rgba(174,213,129,0.8)' : 'rgba(239,83,80,0.8)';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(c.x, c.y, stats.range, 0, 7); ctx.stroke();
      ctx.fillStyle = ok ? 'rgba(174,213,129,0.10)' : 'rgba(239,83,80,0.08)';
      ctx.beginPath(); ctx.arc(c.x, c.y, stats.range, 0, 7); ctx.fill();
      drawTowerShape(ctx, preview.type, c.x, c.y, 1, -Math.PI / 2, true);
    } else if (state.hover && state.selected) {
      const tw = state.towers.find((x) => x.id === state.selected);
      if (tw) {
        ctx.strokeStyle = 'rgba(255,213,79,0.7)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(tw.x, tw.y, towerStats(tw.type, tw.level).range, 0, 7); ctx.stroke();
      }
    }
    // selected tower ring
    const sel = state.towers.find((x) => x.id === state.selected);
    if (sel) {
      ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(sel.x, sel.y, 29, 0, 7); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,213,79,0.5)';
      ctx.beginPath(); ctx.arc(sel.x, sel.y, towerStats(sel.type, sel.level).range, 0, 7); ctx.stroke();
    }
    for (const tw of state.towers) {
      drawTowerShape(ctx, tw.type, tw.x, tw.y, tw.level, tw.angle);
      if (tw.flash > 0) { // muzzle flash
        const fx2 = tw.x + Math.cos(tw.angle) * 30; const fy2 = tw.y + Math.sin(tw.angle) * 30;
        ctx.fillStyle = 'rgba(255,241,118,0.9)';
        ctx.beginPath(); ctx.arc(fx2, fy2, 6, 0, 7); ctx.fill();
      }
    }
    for (const e of state.enemies) drawEnemy(ctx, e, state.time);
    // projectiles + trails
    for (const p of state.projectiles) {
      if (p.trail.length > 1) {
        ctx.strokeStyle = p.type === 'cannon' ? 'rgba(120,120,120,0.45)' : 'rgba(255,255,255,0.3)';
        ctx.lineWidth = p.type === 'cannon' ? 4 : 1.6;
        ctx.beginPath(); ctx.moveTo(p.trail[0].x, p.trail[0].y);
        for (const tp of p.trail) ctx.lineTo(tp.x, tp.y);
        ctx.lineTo(p.x, p.y); ctx.stroke();
      }
      ctx.fillStyle = p.type === 'arrow' ? '#ffe082' : p.type === 'cannon' ? '#37474f' : '#b3e5fc';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.type === 'cannon' ? 6 : 3.6, 0, 7); ctx.fill();
    }
    // chain lightning polylines
    for (const bolt of state.lightning) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, bolt.ttl / bolt.max);
      for (const pass of [[7, 'rgba(234,128,252,0.35)'], [3, '#ea80fc'], [1.4, '#ffffff']]) {
        ctx.strokeStyle = pass[1]; ctx.lineWidth = pass[0];
        ctx.beginPath();
        for (let i = 0; i < bolt.points.length; i += 1) {
          const a = bolt.points[i];
          if (i === 0) { ctx.moveTo(a.x, a.y); continue; }
          const b = bolt.points[i - 1];
          const mx = (a.x + b.x) / 2 + Math.sin(i * 37.7 + a.x) * 7;
          const my = (a.y + b.y) / 2 + Math.cos(i * 29.3 + a.y) * 7;
          ctx.lineTo(mx, my); ctx.lineTo(a.x, a.y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    if (fx) fx.draw(ctx);
    ctx.restore();
    drawPanel(ctx, state, view);
    drawBanner(ctx, state);
    const boss = state.enemies.find((e) => e.def.boss);
    if (boss) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(240, 10, 640, 16);
      ctx.fillStyle = '#ff7043'; ctx.fillRect(242, 12, 636 * Math.max(0, boss.hp / boss.maxHp), 12);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('EMBER TYRANT', 560, 21);
    }
    if (state.phase === 'title') drawTitle(ctx, t);
    if (state.phase === 'victory') drawEnd(ctx, state, true);
    if (state.phase === 'defeat') drawEnd(ctx, state, false);
    if (view.paused) {
      ctx.fillStyle = 'rgba(10,6,16,0.45)'; ctx.fillRect(0, 0, PANEL_X, HEIGHT);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 44px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('PAUSED', PANEL_X / 2, HEIGHT / 2);
    }
  }
  return { draw };
}

function drawPanel(ctx, state, view) {
  const x0 = PANEL_X;
  ctx.fillStyle = '#ffccbc'; ctx.font = 'bold 15px system-ui, sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('EMBERLINE', x0 + 14, 28);
  ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = '#d7ccc8';
  ctx.fillText(`Wave  ${state.phase === 'build' ? state.wave + 1 : Math.max(1, state.wave)} / 12`, x0 + 14, 52);
  ctx.fillStyle = '#ffd54f'; ctx.fillText(`Gold  ${state.gold}`, x0 + 14, 72);
  ctx.fillStyle = state.lives <= 5 ? '#ef9a9a' : '#ffab91';
  ctx.fillText(`Lives  ${state.lives}`, x0 + 84, 72);
  ctx.fillStyle = '#bcaaa4'; ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('— TOWERS —', x0 + 14, 106);
  TOWER_ORDER.forEach((type, i) => {
    const r = UI.shopCard(i);
    const def = TOWERS[type];
    const picked = state.shopPick === type;
    const afford = state.gold >= def.cost;
    ctx.fillStyle = picked ? '#4a2c50' : '#2a1e33';
    ctx.strokeStyle = picked ? '#ea80fc' : afford ? '#5d4037' : '#3a2c44';
    ctx.lineWidth = picked ? 2.4 : 1.2;
    roundRect(ctx, r.x, r.y, r.w, r.h, 8); ctx.fill(); ctx.stroke();
    drawTowerShape(ctx, type, r.x + 30, r.y + 36, 1, -Math.PI / 2);
    ctx.fillStyle = afford ? '#fff' : '#8d7f8a';
    ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(def.name, r.x + 58, r.y + 26);
    ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = '#ffd54f';
    ctx.fillText(`${def.cost}g`, r.x + 58, r.y + 44);
    ctx.fillStyle = '#bcaaa4'; ctx.font = '10px system-ui, sans-serif';
    const blurb = { arrow: 'fast single', cannon: 'splash', frost: 'slows 40%', arc: 'chain zap' }[type];
    ctx.fillText(blurb, r.x + 58, r.y + 60);
    ctx.fillText(`dmg ${def.damage}`, r.x + 58, r.y + 74);
  });
  // Send Wave
  const s = UI.send;
  const canSend = state.phase === 'build';
  ctx.fillStyle = canSend ? '#e64a19' : '#4a3428';
  roundRect(ctx, s.x, s.y, s.w, s.h, 9); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui, sans-serif'; ctx.textAlign = 'center';
  const sendLabel = canSend ? `▶ Send Wave ${state.wave + 1}`
    : state.phase === 'combat' ? 'Wave running…'
    : state.phase === 'title' ? '▶ Send Wave 1' : '—';
  ctx.fillText(sendLabel, s.x + s.w / 2, s.y + 27);
  // speed / pause
  for (const [rect, label] of [[UI.speed, view.speed === 2 ? '2×' : '1×'], [UI.pause, view.paused ? '▶' : '❚❚']]) {
    ctx.fillStyle = '#2a1e33'; ctx.strokeStyle = '#5d4037';
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffccbc'; ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + 22);
  }
  ctx.textAlign = 'left';
  // selected tower panel
  const sel = state.towers.find((x) => x.id === state.selected);
  if (sel) {
    const stats = towerStats(sel.type, sel.level);
    ctx.fillStyle = '#ffccbc'; ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText(`${TOWERS[sel.type].name} · Lv ${sel.level}`, x0 + 14, 612);
    ctx.fillStyle = '#bcaaa4'; ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(`dmg ${stats.damage} · rng ${stats.range}`, x0 + 14, 628);
    const up = UI.upgrade; const cost = upgradeCost(sel);
    ctx.fillStyle = cost !== null && state.gold >= cost ? '#33691e' : '#333';
    roundRect(ctx, up.x, up.y, up.w, up.h, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(cost !== null ? `Upgrade · ${cost}g` : 'MAX LEVEL', up.x + up.w / 2, up.y + 19);
    const sv = UI.sell;
    ctx.fillStyle = '#4e342e'; roundRect(ctx, sv.x, sv.y, sv.w, sv.h, 7); ctx.fill();
    ctx.fillText(`Sell · +${sellValue(sel)}g`, sv.x + sv.w / 2, sv.y + 19);
    ctx.textAlign = 'left';
  } else {
    ctx.fillStyle = '#8d7f8a'; ctx.font = '10.5px system-ui, sans-serif';
    ctx.fillText(state.shopPick ? 'Click a grass tile to place.' : 'Pick a tower, then a tile.', x0 + 14, 612);
    ctx.fillText('Click a placed tower to', x0 + 14, 652);
    ctx.fillText('upgrade or sell it.', x0 + 14, 666);
    ctx.fillText('Clear bonus + 5% interest', x0 + 14, 692);
    ctx.fillText('(max +30) rewards saving.', x0 + 14, 706);
  }
}

function drawBanner(ctx, state) {
  if (!state.banner || state.phase !== 'combat') return;
  const t = state.banner.t;
  const a = t < 0.25 ? t / 0.25 : t > 1.3 ? Math.max(0, (1.6 - t) / 0.3) : 1;
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(20,8,4,0.55)'; ctx.fillRect(0, 300, PANEL_X, 84);
  ctx.fillStyle = '#ffccbc'; ctx.font = 'bold 46px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(state.banner.text, PANEL_X / 2, 356);
  ctx.restore();
}

function drawTitle(ctx, t) {
  ctx.fillStyle = 'rgba(16,8,20,0.62)'; ctx.fillRect(0, 0, PANEL_X, HEIGHT);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffab91'; ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('EMBERLINE', PANEL_X / 2, 268);
  ctx.fillStyle = '#ffd54f';
  ctx.fillText('DEFENSE', PANEL_X / 2, 336);
  ctx.fillStyle = '#ffccbc'; ctx.font = '19px system-ui, sans-serif';
  ctx.fillText('Protect the Ember Heart — 12 waves', PANEL_X / 2, 386);
  ctx.globalAlpha = 0.65 + Math.sin(t * 3.2) * 0.35;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 21px system-ui, sans-serif';
  ctx.fillText('Click to Start', PANEL_X / 2, 452);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#bcaaa4'; ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('Place towers on grass · Frost slows · Arc melts shields · Save gold for interest', PANEL_X / 2, 492);
}

function drawEnd(ctx, state, won) {
  ctx.fillStyle = won ? 'rgba(24,14,4,0.66)' : 'rgba(8,4,12,0.72)';
  ctx.fillRect(0, 0, PANEL_X, HEIGHT);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#ffd54f' : '#ef9a9a';
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.fillText(won ? 'VICTORY' : 'DEFEAT', PANEL_X / 2, 250);
  ctx.fillStyle = '#ffccbc'; ctx.font = '22px system-ui, sans-serif';
  ctx.fillText(won ? 'The Ember Endures' : 'The Ember Has Gone Out', PANEL_X / 2, 292);
  ctx.fillStyle = '#fff'; ctx.font = '17px system-ui, sans-serif';
  const stats = won
    ? `Lives ${state.lives} · Gold ${state.gold} · Waves 12/12 · Towers ${state.towers.length} · Kills ${state.kills}`
    : `Reached wave ${state.wave} · Kills ${state.kills}`;
  ctx.fillText(stats, PANEL_X / 2, 344);
  ctx.fillStyle = '#bcaaa4'; ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText('Press R to Play Again', PANEL_X / 2, 392);
}
