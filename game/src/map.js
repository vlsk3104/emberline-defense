// The map: path waypoints, tile classification and geometry helpers.
// Pure data + math, safe for Node.

import { TILE } from './config.js';

// Pixel waypoints, centre to centre (spec section 2). Total length 2720.
export const WAYPOINTS = [
  [-40, 120], [520, 120], [520, 360], [200, 360], [200, 600],
  [920, 600], [920, 360], [1080, 360], [1080, 600],
];

export const SEGMENTS = [];
export const PATH_LENGTH = (() => {
  let total = 0;
  for (let i = 0; i < WAYPOINTS.length - 1; i += 1) {
    const [x1, y1] = WAYPOINTS[i];
    const [x2, y2] = WAYPOINTS[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    SEGMENTS.push({ x1, y1, x2, y2, start: total, len });
    total += len;
  }
  return total;
})();

export function posAt(dist) {
  if (dist <= 0) return { x: WAYPOINTS[0][0], y: WAYPOINTS[0][1] };
  for (const s of SEGMENTS) {
    if (dist <= s.start + s.len) {
      const t = s.len === 0 ? 0 : (dist - s.start) / s.len;
      return { x: s.x1 + (s.x2 - s.x1) * t, y: s.y1 + (s.y2 - s.y1) * t };
    }
  }
  const last = WAYPOINTS[WAYPOINTS.length - 1];
  return { x: last[0], y: last[1] };
}

export const HEART = { x: 1080, y: 600, col: 13, row: 7 };

// Path tiles (non-buildable), spec section 2.
export const PATH_TILES = new Set();
function addRow(row, c1, c2) { for (let c = c1; c <= c2; c += 1) PATH_TILES.add(`${c},${row}`); }
function addCol(col, r1, r2) { for (let r = r1; r <= r2; r += 1) PATH_TILES.add(`${col},${r}`); }
addRow(1, 0, 6); addCol(6, 1, 4); addRow(4, 2, 6); addCol(2, 4, 7);
addRow(7, 2, 11); addCol(11, 4, 7); addRow(4, 11, 13); addCol(13, 4, 7);

// Decorative non-buildable tiles (cosmetic only).
export const DECOR_TILES = new Map([
  ['1,0', 'pine'], ['13,0', 'rock'], ['0,5', 'pond'], ['8,8', 'shrine'],
]);

export function tileKey(col, row) { return `${col},${row}`; }
export function tileCenter(col, row) { return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 }; }
export function isPathTile(col, row) { return PATH_TILES.has(tileKey(col, row)); }
export function isDecorTile(col, row) { return DECOR_TILES.has(tileKey(col, row)); }
