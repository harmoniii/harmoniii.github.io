// config.js
export const CONFIG = {
  canvasSize: 500,
  rotationSpeed: 0.005,
  blockDuration: 3000,
  offlineRate: 0.2, // 20% of passive per hour offline
  storageSecret: 'my-secret-key' // key for XOR encoding
};

export const ZONE_DEFS = [
  { type: 'block', color: '#d53e07', score: 0 },
  { type: 'score', color: '#838383', score: 1 },
  { type: 'score', color: '#b87333', score: 2 },
  { type: 'score', color: '#000090', score: 5 },
  { type: 'score', color: '#d53e07', score: 10 },
  // add more zones here
];

export const UPGRADE_DEFS = [
  {
    id: 'clickBoost',
    name: 'Click Boost',
    baseCost: 50,
    costMultiplier: 1.15,
    apply(state, level) {
      state.clickValueBase = 1 * Math.pow(1 + 0.1, level);
    }
  },
  {
    id: 'passiveIncome',
    name: 'Passive Income',
    baseCost: 100,
    costMultiplier: 1.2,
    apply(state, level) {
      state.passive.interval = 10000;
      state.passive.amount = level;
    }
  },
  // add more upgrades here
];

export const ACHIEVEMENT_DEFS = [
  {
    id: 'firstClick',
    name: 'First Click',
    condition: state => state.totalClicks >= 1
  },
  {
    id: 'hundredClicks',
    name: 'Century Click',
    condition: state => state.totalClicks >= 100
  }
  // add more achievements here
];

export const SKILL_TREE_DEFS = [
  // stub for future skill tree
];

export const LOCALES = {
  en: {
    score: 'Score',
    reset: 'Reset Progress',
    block: 'Blocked',
  },
  ru: {
    score: 'Очки',
    reset: 'Сброс прогресса',
    block: 'Блокировка',
  }
  // add more languages here
};