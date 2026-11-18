// Juice: particles, floating gold text, explosion rings, screen shake,
// ember confetti. Purely cosmetic — driven by engine events, never feeds
// back into the simulation. Seeded RNG keeps screenshot scenes stable.

import { createRandom } from './config.js';

const ENEMY_COLORS = {
  grunt: '#e2574c', runner: '#f2a541', swarm: '#c86dd7', brute: '#8d6e63',
  shielded: '#64b5f6', tank: '#90a4ae', boss: '#ff7043',
};

export function createFx(seed = 16) {
  const rand = createRandom(seed);
  return {
    particles: [], floaters: [], rings: [],
    shakeT: 0, shakeDur: 0, shakeMag: 0,
    time: 0,
    reset() { this.particles.length = 0; this.floaters.length = 0; this.rings.length = 0; this.shakeT = 0; },
    shake(mag, dur = 0.25) {
      if (mag >= this.shakeMag || this.shakeT <= 0) { this.shakeMag = mag; this.shakeDur = dur; this.shakeT = dur; }
    },
    burst(x, y, color, n = 10, speed = 130, life = 0.55, size = 3) {
      for (let i = 0; i < n; i += 1) {
        const a = rand() * Math.PI * 2;
        const v = (0.3 + rand() * 0.7) * speed;
        this.particles.push({
          x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30,
          t: 0, life: life * (0.6 + rand() * 0.7), size: size * (0.6 + rand() * 0.8), color, grav: 160,
        });
      }
    },
    confetti() {
      const colors = ['#ffb74d', '#ff7043', '#ffd54f', '#ff8a65', '#ffe082'];
      for (let i = 0; i < 90; i += 1) {
        this.particles.push({
          x: rand() * 1120, y: -20 - rand() * 260, vx: (rand() - 0.5) * 40, vy: 40 + rand() * 80,
          t: 0, life: 3.2 + rand() * 2, size: 3 + rand() * 4, color: colors[i % colors.length], grav: 12, rect: true,
        });
      }
    },
    consume(state) {
      for (const ev of state.events) {
        if (ev.type === 'die') {
          this.burst(ev.x, ev.y, ENEMY_COLORS[ev.enemyType] || '#ffb74d', ev.boss ? 46 : 12, ev.boss ? 240 : 140);
          if (ev.boss) this.shake(14, 0.45);
        } else if (ev.type === 'gold') {
          this.floaters.push({ x: ev.x, y: ev.y - 14, text: `+${ev.amount}`, t: 0, life: 0.9, color: '#ffd54f' });
        } else if (ev.type === 'explosion') {
          this.rings.push({ x: ev.x, y: ev.y, r: 8, max: ev.r + 10, t: 0, life: 0.32 });
          this.burst(ev.x, ev.y, '#ff9800', 8, 110, 0.4, 3);
          this.burst(ev.x, ev.y, '#6d4c41', 5, 50, 0.7, 5);
        } else if (ev.type === 'leak') {
          this.shake(ev.enemyType === 'tank' ? 3 : 6, 0.2);
          this.burst(1080, 600, '#ff7043', 16, 170, 0.6, 3.5);
        } else if (ev.type === 'place') this.burst(ev.x, ev.y, '#a1887f', 6, 60, 0.35, 2.5);
        else if (ev.type === 'upgrade') this.burst(ev.x, ev.y, '#ffd54f', 14, 100, 0.5, 2.5);
      }
      if (state.shake) { this.shake(state.shake, state.shake >= 14 ? 0.45 : 0.2); state.shake = 0; }
    },
    update(dt) {
      this.time += dt;
      if (this.shakeT > 0) this.shakeT -= dt;
      for (const p of this.particles) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.grav || 0) * dt; }
      this.particles = this.particles.filter((p) => p.t < p.life);
      for (const f of this.floaters) { f.t += dt; f.y -= 34 * dt; }
      this.floaters = this.floaters.filter((f) => f.t < f.life);
      for (const r of this.rings) r.t += dt;
      this.rings = this.rings.filter((r) => r.t < r.life);
    },
    shakeOffset() {
      if (this.shakeT <= 0) return { x: 0, y: 0 };
      const k = (this.shakeT / this.shakeDur) * this.shakeMag;
      return { x: (rand() - 0.5) * 2 * k, y: (rand() - 0.5) * 2 * k };
    },
    draw(ctx) {
      for (const r of this.rings) {
        const t = r.t / r.life;
        ctx.strokeStyle = `rgba(255,167,38,${(1 - t) * 0.8})`;
        ctx.lineWidth = 3 * (1 - t) + 1;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r + (r.max - r.r) * t, 0, Math.PI * 2); ctx.stroke();
      }
      for (const p of this.particles) {
        const a = 1 - p.t / p.life;
        ctx.globalAlpha = Math.max(0, a);
        ctx.fillStyle = p.color;
        if (p.rect) ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size * 0.7);
        else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a + 0.6, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      for (const f of this.floaters) {
        ctx.globalAlpha = Math.max(0, 1 - f.t / f.life);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.globalAlpha = 1;
    },
  };
}
