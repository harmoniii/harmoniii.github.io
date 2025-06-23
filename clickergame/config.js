// config.js
export const CONFIG = {
  canvasSize: 500,
  rotationSpeed: 0.005,
  blockDuration: 3000,
  offlineRate: 0.2, // 20% of passive per hour offline
  storageSecret: 'my-secret-key'
};

export const ZONE_DEFS = [
  {
    type: 'random',
    generate: () => {
      const colors = ['#FFC107', '#E91E63', '#9C27B0', '#00BCD4', '#8BC34A'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const score = Math.floor(Math.random() * 2) + 1; // 1–2
      return { type: 'score', color, score };
    }
  },
  {
    type: 'random',
    generate: () => {
      const colors = ['#FFC107', '#E91E63', '#9C27B0', '#00BCD4', '#8BC34A'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const score = Math.floor(Math.random() * 4) + 1; // 1–4
      return { type: 'score', color, score };
    }
  },
  {
    type: 'random',
    generate: () => {
      const colors = ['#FFC107', '#E91E63', '#9C27B0', '#00BCD4', '#8BC34A'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const score = Math.floor(Math.random() * 6) + 1; // 1–6
      return { type: 'score', color, score };
    }
  },
  {
    type: 'random',
    generate: () => {
      const colors = ['#FFC107', '#E91E63', '#9C27B0', '#00BCD4', '#8BC34A'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const score = Math.floor(Math.random() * 10) + 1; // 1–10
      return { type: 'score', color, score };
    }
  }
];

export const UPGRADE_DEFS = [
  {
    id: 'clickBoost',
    name: 'Click Boost',
    baseCost: 50,
    costMultiplier: 1.15,
    apply(state, level) {
      state.clickValueBase = 1 * Math.pow(1.005, level);
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
  }
];

export const ACHIEVEMENT_DEFS = [
  { id: 'firstClick', name: 'First Click', condition: state => state.totalClicks >= 1 },
  { id: 'hundredClicks', name: 'Century Click', condition: state => state.totalClicks >= 100 }
];

export const SKILL_TREE_DEFS = [
  {
    id: 'removeBlock',
    name: 'Remove Block Zone',
    cost: 1,
    description: 'Removes all blocking zones',
    apply(state) {
      state.flags = state.flags || {};
      state.flags.removeBlock = true;
    }
  },
  {
    id: 'clickPlus',
    name: 'Click +10',
    cost: 1,
    description: 'Gives +10 points per click',
    apply(state) {
      state.clickValueBase += 10;
    }
  }
];

export const LOCALES = {
  en: { score: 'Score', reset: 'Reset Progress', block: 'Blocked', skillPoints: 'Skill Points' },
  ru: { score: 'Очки', reset: 'Сброс прогресса', block: 'Блокировка', skillPoints: 'Очки навыков' }
};