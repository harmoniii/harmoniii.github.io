// config.js

export const CONFIG = {
  canvasSize:    500,
  rotationSpeed: 0.005,
  blockDuration: 3000,
  // Новые настройки баланса
  comboTimeout: 5000,
  maxComboMultiplier: 10, // ограничение на множитель комбо
  baseChance: 50, // базовый шанс получить бафф
  chanceRange: { min: 5, max: 25 } // пределы шанса
};

export const ZONE_COUNT = 8;
export const ZONE_DEFS = Array.from({ length: ZONE_COUNT }, () => ({ type: 'random' }));

export const RESOURCES = [
  'gold','wood','stone','food','water','iron',
  'people','energy','science','faith','chaos'
];

// Улучшенные определения баффов с балансом
export const BUFF_DEFS = [
  { 
    id: 'frenzy', 
    name: '🔥 Frenzy', 
    duration: 15, 
    description: 'Double gold gain',
    rarity: 'common'
  },
  { 
    id: 'lucky', 
    name: '💎 Lucky Zone', 
    duration: 10, 
    description: 'Increased buff chance',
    rarity: 'common'
  },
  { 
    id: 'waterfall', 
    name: '⚙️ Resource Waterfall', 
    duration: 10, 
    description: 'Gain random resource every second',
    rarity: 'uncommon'
  },
  { 
    id: 'roll', 
    name: '🎰 Roll', 
    duration: null, 
    description: 'Random resource gambling',
    rarity: 'rare'
  },
  { 
    id: 'mysteryBox', 
    name: '📦 Mystery Box', 
    duration: null, 
    description: 'Choose from 3 random resources',
    rarity: 'rare'
  }
];

export const DEBUFF_DEFS = [
  { 
    id: 'rapid', 
    name: '🐌 Rapid Time', 
    duration: 5, 
    description: 'Wheel spins much faster',
    severity: 'mild'
  },
  { 
    id: 'ghost', 
    name: '👻 Ghost Click', 
    duration: 2, 
    description: 'Clicks sometimes ignored',
    severity: 'mild'
  },
  { 
    id: 'explosion', 
    name: '💣 Explosion', 
    duration: null, 
    description: 'Lose 10% of random resource',
    severity: 'severe'
  },
  { 
    id: 'lock', 
    name: '🔒 Zone Lock', 
    duration: 1, 
    description: 'Cannot click for 1 second',
    severity: 'moderate'
  }
];

// Конфигурация эффектов
export const EFFECT_CONFIG = {
  roll: {
    outcomes: [
      { chance: 0.25, type: 'big_win', amount: 50 },
      { chance: 0.25, type: 'small_win', amount: 5 },
      { chance: 0.25, type: 'nothing', amount: 0 },
      { chance: 0.25, type: 'loss', amount: -5 }
    ]
  },
  explosion: {
    damagePercent: 0.1 // 10% урон
  },
  waterfall: {
    intervalMs: 1000,
    amount: 1
  }
};