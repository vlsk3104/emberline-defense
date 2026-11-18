// Tower definitions and economy helpers — thin, documented facade over
// config.js + engine.js so the module layout matches the design spec.
export { TOWERS, TOWER_ORDER, UPGRADE_COSTS, towerStats } from './config.js';
export { canPlace, placeTower, sellTower, sellValue, towerAt, upgradeCost, upgradeTower } from './engine.js';
