// config.js

export const CONFIG = {
  canvasSize:    500,
  rotationSpeed: 0.005,
  blockDuration: 3000,
  // Новые настройки баланса
  comboTimeout: 5000,
  maxComboMultiplier: 10, // ограничение на множитель комбо
  zoneShuffleChance: 75,       // % шанс, что после клика зона-мишень действительно поменяется
  baseChance: 10,             // базовый шанс получить бафф
  chanceRange: { min: 5, max: 25 }, // пределы шанса
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
    description: 'Double gold gain from clicks',
    rarity: 'common'
  },
  { 
    id: 'lucky', 
    name: '💎 Lucky Zone', 
    duration: 10, 
    description: 'Increased chance of getting buffs',
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
  },
  // НОВЫЕ БАФФЫ
  { 
    id: 'speedBoost', 
    name: '🏃 Speed Boost', 
    duration: 12, 
    description: 'Wheel rotates 50% slower, easier targeting',
    rarity: 'common'
  },
  { 
    id: 'starPower', 
    name: '⭐ Star Power', 
    duration: null, 
    description: 'Next 10 clicks give +5 bonus to any resource',
    rarity: 'uncommon'
  },
  { 
    id: 'doubleTap', 
    name: '🔄 Double Tap', 
    duration: 12, 
    description: 'Each click counts as 2 clicks',
    rarity: 'uncommon'
  },
  { 
    id: 'slotMachine', 
    name: '🎰 Slot Machine', 
    duration: 15, 
    description: 'Each click has 30% chance for random resource',
    rarity: 'uncommon'
  },
  { 
    id: 'shield', 
    name: '🛡️ Shield', 
    duration: null, 
    description: 'Blocks next 3 debuffs',
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
  },
  // НОВЫЕ ДЕБАФФЫ
  { 
    id: 'reverseControls', 
    name: '🙃 Reverse Controls', 
    duration: 8, 
    description: 'Target zone moves in opposite direction',
    severity: 'moderate'
  },
  { 
    id: 'freeze', 
    name: '❄️ Freeze', 
    duration: 10, 
    description: 'Combo counter frozen, cannot grow',
    severity: 'moderate'
  },
  { 
    id: 'taxCollector', 
    name: '💸 Tax Collector', 
    duration: 9, 
    description: 'Lose 5% of all resources every 3 seconds',
    severity: 'severe'
  },
  { 
    id: 'heavyClick', 
    name: '⚖️ Heavy Click', 
    duration: 8, 
    description: 'Need to click zone 3 times to register',
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
  },
  // НОВЫЕ ЭФФЕКТЫ
  speedBoost: {
    speedMultiplier: 0.5 // 50% от обычной скорости
  },
  starPower: {
    clicksCount: 10,
    bonusAmount: 5
  },
  slotMachine: {
    chance: 0.3, // 30% шанс
    amount: 3
  },
  shield: {
    blocksCount: 3
  },
  taxCollector: {
    intervalMs: 3000,
    taxPercent: 0.05 // 5%
  },
  heavyClick: {
    requiredClicks: 3
  }
};