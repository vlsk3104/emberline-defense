// Wave compositions (spec section 4). Each wave is a list of groups,
// spawned in order; a group is [enemyKey, count, intervalSeconds].
export const WAVES = [
  null, // waves are 1-indexed
  [['grunt', 4, 1.4]],
  [['grunt', 6, 1.2], ['runner', 2, 1.2]],
  [['grunt', 6, 1.1], ['runner', 3, 1.1], ['brute', 1, 1.1]],
  [['grunt', 12, 0.9], ['runner', 5, 0.9]],
  [['swarm', 24, 0.35], ['grunt', 8, 1.0]],
  [['tank', 3, 1.6], ['grunt', 12, 1.0]],
  [['shielded', 12, 0.8], ['runner', 10, 0.8]],
  [['swarm', 30, 0.35], ['tank', 4, 1.6]],
  [['shielded', 14, 0.7], ['grunt', 12, 0.7], ['runner', 8, 0.7]],
  [['tank', 6, 1.4], ['grunt', 18, 0.9]],
  [['swarm', 36, 0.35], ['shielded', 10, 0.8], ['tank', 5, 1.6]],
  [['boss', 1, 0.1], ['grunt', 10, 2.0], ['runner', 6, 2.0], ['shielded', 4, 2.0]],
];
export const WAVE_COUNT = 12;
