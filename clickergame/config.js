// config.js - Исправленная версия с константами

export const CONFIG = {
  canvasSize: 500,
  rotationSpeed: 0.005,
  blockDuration: 3000,
  comboTimeout: 5000,
  maxComboMultiplier: 10,
  zoneShuffleChance: 75,
  baseChance: 10,
  chanceRange: { min: 5, max: 25 },
};

// ИСПРАВЛЕНИЕ 17: Вынесение magic numbers в константы
export const GAME_CONSTANTS = {
  // Timing constants
  NOTIFICATION_DURATION: 3000,
  SKILL_NOTIFICATION_DURATION: 4000,
  SAVE_ELEMENT_TIMEOUT: 10000,
  RELOAD_DELAY: 2000,
  NUCLEAR_RELOAD_DELAY: 3000,
  
  // Effect constants
  FRENZY_MULTIPLIER: 2,
  DOUBLE_TAP_MULTIPLIER: 2,
  SPEED_BOOST_MULTIPLIER: 0.5,
  RAPID_SPEED_MULTIPLIER: 5,
  LUCKY_BUFF_BONUS: 25,
  GHOST_CLICK_CHANCE: 0.5,
  SLOT_MACHINE_CHANCE: 0.3,
  SLOT_MACHINE_AMOUNT: 3,
  STAR_POWER_CLICKS: 10,
  STAR_POWER_BONUS: 5,
  SHIELD_BLOCKS: 3,
  HEAVY_CLICK_REQUIRED: 3,
  TAX_COLLECTOR_PERCENT: 0.05,
  TAX_COLLECTOR_INTERVAL: 3000,
  EXPLOSION_DAMAGE_PERCENT: 0.1,
  WATERFALL_INTERVAL: 1000,
  WATERFALL_AMOUNT: 1,
  
  // Market constants
  BASIC_RESOURCE_PRICE: 2000,
  ENERGY_PACK_PRICE: 5000,
  SCIENCE_BOOK_PRICE: 8000,
  FAITH_RELIC_PRICE: 10000,
  CHAOS_NEUTRALIZER_PRICE: 15000,
  SKILL_CRYSTAL_PRICE: 20000,
  
  // Auto clicker constants
  AUTO_CLICKER_BASE_INTERVAL: 10000,
  AUTO_CLICKER_MIN_INTERVAL: 1000,
  
  // Achievement constants
  COMBO_CHECK_INTERVAL: 10000,
  RESOURCE_CHECK_INTERVAL: 30000,
  COMBO_MILESTONE_1: 10,
  COMBO_MILESTONE_2: 25,
  COMBO_MILESTONE_3: 50,
  RESOURCE_MILESTONE_1: 1000,
  RESOURCE_MILESTONE_2: 5000,
  RESOURCE_MILESTONE_3: 10000,
  
  // UI constants
  MAX_TIMER_ID: 100000, // Для очистки таймеров
  TOOLTIP_OFFSET: 10,
  CANVAS_BORDER_WIDTH: 10,
  TARGET_ZONE_BORDER_WIDTH: 4,
  PREVIEW_ZONE_BORDER_WIDTH: 2,
  
  // Validation constants
  MAX_SAFE_RESOURCE_VALUE: Number.MAX_SAFE_INTEGER,
  MIN_RESOURCE_VALUE: 0,
  MAX_COMBO_COUNT: 999999,
  MAX_SKILL_POINTS: 999999,
};

export const ZONE_COUNT = 8;
export const ZONE_DEFS = Array.from({ length: ZONE_COUNT }, () => ({ type: 'random' }));

export const RESOURCES = [
  'gold', 'wood', 'stone', 'food', 'water', 'iron',
  'people', 'energy', 'science', 'faith', 'chaos'
];