// effects/EffectDefinitions.js - ИСПРАВЛЕНО: убраны эффекты для колеса
import { GAME_CONSTANTS } from '../config/GameConstants.js';

// ===== ОПРЕДЕЛЕНИЯ БАФФОВ (ПОЛОЖИТЕЛЬНЫЕ ЭФФЕКТЫ) =====
export const BUFF_DEFS = [
  { 
    id: 'frenzy', 
    name: '🔥 Frenzy', 
    duration: 15, 
    description: 'Double gold gain from clicks',
    rarity: 'common',
    category: 'combat'
  },
  { 
    id: 'lucky', 
    name: '💎 Lucky Zone', 
    duration: 10, 
    description: 'Increased chance of getting buffs',
    rarity: 'common',
    category: 'luck'
  },
  { 
    id: 'waterfall', 
    name: '⚙️ Resource Waterfall', 
    duration: 10, 
    description: 'Gain random resource every second',
    rarity: 'uncommon',
    category: 'resource'
  },
  { 
    id: 'roll', 
    name: '🎰 Roll', 
    duration: null, 
    description: 'Random resource gambling - win big or lose small',
    rarity: 'rare',
    category: 'gamble'
  },
  { 
    id: 'mysteryBox', 
    name: '📦 Mystery Box', 
    duration: null, 
    description: 'Choose from 3 random resources',
    rarity: 'rare',
    category: 'choice'
  },
  { 
    id: 'starPower', 
    name: '⭐ Star Power', 
    duration: null, 
    description: 'Next 10 clicks give +5 bonus to any resource',
    rarity: 'uncommon',
    category: 'enhancement'
  },
  { 
    id: 'doubleTap', 
    name: '🔄 Double Tap', 
    duration: 12, 
    description: 'Each click counts as 2 clicks',
    rarity: 'uncommon',
    category: 'combat'
  },
  { 
    id: 'slotMachine', 
    name: '🎰 Slot Machine', 
    duration: 15, 
    description: 'Each click has 30% chance for random resource',
    rarity: 'uncommon',
    category: 'luck'
  },
  { 
    id: 'shield', 
    name: '🛡️ Shield', 
    duration: null, 
    description: 'Blocks next 3 debuffs',
    rarity: 'rare',
    category: 'protection'
  },
  { 
    id: 'goldenTouch', 
    name: '👑 Golden Touch', 
    duration: 8, 
    description: 'Triple gold gain from all sources',
    rarity: 'epic',
    category: 'combat'
  },
  { 
    id: 'timeWarp', 
    name: '⏰ Time Warp', 
    duration: 6, 
    description: 'All production buildings work 5x faster',
    rarity: 'epic',
    category: 'enhancement'
  }
];

// ===== ОПРЕДЕЛЕНИЯ ДЕБАФФОВ (ОТРИЦАТЕЛЬНЫЕ ЭФФЕКТЫ) =====
export const DEBUFF_DEFS = [
  { 
    id: 'ghost', 
    name: '👻 Ghost Click', 
    duration: 2, 
    description: 'Clicks sometimes ignored (50% chance)',
    severity: 'mild',
    category: 'interference'
  },
  { 
    id: 'explosion', 
    name: '💣 Explosion', 
    duration: null, 
    description: 'Lose 10% of a random resource instantly',
    severity: 'severe',
    category: 'destruction'
  },
  { 
    id: 'lock', 
    name: '🔒 Zone Lock', 
    duration: 1, 
    description: 'Cannot click for 1 second',
    severity: 'moderate',
    category: 'control'
  },
  { 
    id: 'freeze', 
    name: '❄️ Freeze', 
    duration: 10, 
    description: 'Combo counter frozen, cannot grow',
    severity: 'moderate',
    category: 'interference'
  },
  { 
    id: 'taxCollector', 
    name: '💸 Tax Collector', 
    duration: 9, 
    description: 'Lose 5% of all resources every 3 seconds',
    severity: 'severe',
    category: 'destruction'
  },
  { 
    id: 'heavyClick', 
    name: '⚖️ Heavy Click', 
    duration: 8, 
    description: 'Need to click cell 3 times to register',
    severity: 'moderate',
    category: 'interference'
  },
  { 
    id: 'curse', 
    name: '🌙 Curse', 
    duration: 12, 
    description: 'All buff chances reduced by 50%',
    severity: 'severe',
    category: 'curse'
  },
  { 
    id: 'decay', 
    name: '☠️ Decay', 
    duration: 15, 
    description: 'Lose 1% of all resources every second',
    severity: 'severe',
    category: 'destruction'
  }
];

// ===== КОНФИГУРАЦИЯ ЭФФЕКТОВ =====
export const EFFECT_CONFIG = {
  // Buff configurations
  frenzy: {
    goldMultiplier: GAME_CONSTANTS.FRENZY_MULTIPLIER,
    stackable: false
  },
  
  lucky: {
    buffChanceBonus: GAME_CONSTANTS.LUCKY_BUFF_BONUS,
    stackable: false
  },
  
  waterfall: {
    intervalMs: GAME_CONSTANTS.WATERFALL_INTERVAL,
    amount: GAME_CONSTANTS.WATERFALL_AMOUNT,
    stackable: false
  },
  
  roll: {
    outcomes: [
      { chance: 0.15, type: 'jackpot', amount: 100, message: 'JACKPOT!' },
      { chance: 0.20, type: 'big_win', amount: 50, message: 'Big Win!' },
      { chance: 0.30, type: 'small_win', amount: 15, message: 'Small Win' },
      { chance: 0.25, type: 'nothing', amount: 0, message: 'Nothing...' },
      { chance: 0.10, type: 'loss', amount: -10, message: 'Bad Luck!' }
    ]
  },
  
  starPower: {
    clicksCount: GAME_CONSTANTS.STAR_POWER_CLICKS,
    bonusAmount: GAME_CONSTANTS.STAR_POWER_BONUS,
    stackable: true
  },
  
  doubleTap: {
    clickMultiplier: GAME_CONSTANTS.DOUBLE_TAP_MULTIPLIER,
    stackable: false
  },
  
  slotMachine: {
    chance: GAME_CONSTANTS.SLOT_MACHINE_CHANCE,
    amount: GAME_CONSTANTS.SLOT_MACHINE_AMOUNT,
    stackable: false
  },
  
  shield: {
    blocksCount: GAME_CONSTANTS.SHIELD_BLOCKS,
    stackable: true
  },
  
  goldenTouch: {
    goldMultiplier: 3,
    stackable: false
  },
  
  timeWarp: {
    productionMultiplier: 5,
    stackable: false
  },

  // Debuff configurations
  ghost: {
    ignoreChance: GAME_CONSTANTS.GHOST_CLICK_CHANCE,
    stackable: false
  },
  
  explosion: {
    damagePercent: GAME_CONSTANTS.EXPLOSION_DAMAGE_PERCENT,
    instantEffect: true
  },
  
  lock: {
    blockDuration: 1000, // 1 second in milliseconds
    instantEffect: true
  },
  
  freeze: {
    freezeCombo: true,
    stackable: false
  },
  
  taxCollector: {
    intervalMs: GAME_CONSTANTS.TAX_COLLECTOR_INTERVAL,
    taxPercent: GAME_CONSTANTS.TAX_COLLECTOR_PERCENT,
    stackable: false
  },
  
  heavyClick: {
    requiredClicks: GAME_CONSTANTS.HEAVY_CLICK_REQUIRED,
    stackable: false
  },
  
  curse: {
    buffChanceReduction: 0.5,
    stackable: false
  },
  
  decay: {
    intervalMs: 1000,
    damagePercent: 0.01,
    stackable: false
  }
};

// ===== КАТЕГОРИИ ЭФФЕКТОВ =====
export const EFFECT_CATEGORIES = {
  // Buff categories
  combat: 'Combat Enhancement',
  luck: 'Luck & Fortune',
  resource: 'Resource Generation',
  gamble: 'Risk & Reward',
  choice: 'Player Choice',
  enhancement: 'Power Enhancement',
  protection: 'Defense & Protection',
  
  // Debuff categories
  interference: 'Game Interference',
  destruction: 'Resource Destruction',
  curse: 'Negative Influence',
  control: 'Game Control'
};

// ===== РЕДКОСТЬ ЭФФЕКТОВ =====
export const RARITY_INFO = {
  common: {
    name: 'Common',
    color: '#9E9E9E',
    weight: 50,
    description: 'Frequently occurring effects'
  },
  uncommon: {
    name: 'Uncommon',
    color: '#4CAF50',
    weight: 30,
    description: 'Moderately rare effects'
  },
  rare: {
    name: 'Rare',
    color: '#FF9800',
    weight: 15,
    description: 'Rarely occurring powerful effects'
  },
  epic: {
    name: 'Epic',
    color: '#9C27B0',
    weight: 4,
    description: 'Very rare game-changing effects'
  },
  legendary: {
    name: 'Legendary',
    color: '#F44336',
    weight: 1,
    description: 'Extremely rare ultimate effects'
  }
};

// ===== СЕРЬЕЗНОСТЬ ДЕБАФФОВ =====
export const SEVERITY_INFO = {
  mild: {
    name: 'Mild',
    color: '#FF9800',
    weight: 50,
    description: 'Minor inconvenience'
  },
  moderate: {
    name: 'Moderate',
    color: '#f44336',
    weight: 35,
    description: 'Noticeable hindrance'
  },
  severe: {
    name: 'Severe',
    color: '#8E24AA',
    weight: 15,
    description: 'Significant penalty'
  }
};

// ===== УТИЛИТЫ ДЛЯ РАБОТЫ С ЭФФЕКТАМИ =====

/**
 * Получить определение баффа по ID
 */
export function getBuffById(id) {
  return BUFF_DEFS.find(buff => buff.id === id);
}

/**
 * Получить определение дебаффа по ID
 */
export function getDebuffById(id) {
  return DEBUFF_DEFS.find(debuff => debuff.id === id);
}

/**
 * Получить конфигурацию эффекта
 */
export function getEffectConfig(effectId) {
  return EFFECT_CONFIG[effectId] || {};
}

/**
 * Проверить, является ли ID валидным баффом
 */
export function isValidBuff(id) {
  return BUFF_DEFS.some(buff => buff.id === id);
}

/**
 * Проверить, является ли ID валидным дебаффом
 */
export function isValidDebuff(id) {
  return DEBUFF_DEFS.some(debuff => debuff.id === id);
}

/**
 * Получить эффекты по редкости
 */
export function getEffectsByRarity(rarity) {
  return BUFF_DEFS.filter(buff => buff.rarity === rarity);
}

/**
 * Получить дебаффы по серьезности
 */
export function getEffectsBySeverity(severity) {
  return DEBUFF_DEFS.filter(debuff => debuff.severity === severity);
}

/**
 * Получить эффекты по категории
 */
export function getEffectsByCategory(category) {
  const buffs = BUFF_DEFS.filter(buff => buff.category === category);
  const debuffs = DEBUFF_DEFS.filter(debuff => debuff.category === category);
  return { buffs, debuffs };
}

/**
 * Получить случайный бафф по весу редкости
 */
export function getRandomBuffByRarity() {
  const totalWeight = Object.values(RARITY_INFO).reduce((sum, info) => sum + info.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const [rarity, info] of Object.entries(RARITY_INFO)) {
    random -= info.weight;
    if (random <= 0) {
      const buffsOfRarity = getEffectsByRarity(rarity);
      if (buffsOfRarity.length > 0) {
        return buffsOfRarity[Math.floor(Math.random() * buffsOfRarity.length)];
      }
    }
  }
  
  // Fallback to common
  return getEffectsByRarity('common')[0];
}

/**
 * Получить случайный дебафф по весу серьезности
 */
export function getRandomDebuffBySeverity() {
  const totalWeight = Object.values(SEVERITY_INFO).reduce((sum, info) => sum + info.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const [severity, info] of Object.entries(SEVERITY_INFO)) {
    random -= info.weight;
    if (random <= 0) {
      const debuffsOfSeverity = getEffectsBySeverity(severity);
      if (debuffsOfSeverity.length > 0) {
        return debuffsOfSeverity[Math.floor(Math.random() * debuffsOfSeverity.length)];
      }
    }
  }
  
  // Fallback to mild
  return getEffectsBySeverity('mild')[0];
}

/**
 * Проверить, может ли эффект стакаться
 */
export function isEffectStackable(effectId) {
  const config = getEffectConfig(effectId);
  return config.stackable === true;
}

/**
 * Получить все уникальные категории
 */
export function getAllCategories() {
  const buffCategories = [...new Set(BUFF_DEFS.map(buff => buff.category))];
  const debuffCategories = [...new Set(DEBUFF_DEFS.map(debuff => debuff.category))];
  return [...new Set([...buffCategories, ...debuffCategories])];
}

/**
 * Получить статистику эффектов
 */
export function getEffectStatistics() {
  return {
    totalBuffs: BUFF_DEFS.length,
    totalDebuffs: DEBUFF_DEFS.length,
    buffsByRarity: Object.fromEntries(
      Object.keys(RARITY_INFO).map(rarity => [
        rarity, 
        BUFF_DEFS.filter(buff => buff.rarity === rarity).length
      ])
    ),
    debuffsBySeverity: Object.fromEntries(
      Object.keys(SEVERITY_INFO).map(severity => [
        severity, 
        DEBUFF_DEFS.filter(debuff => debuff.severity === severity).length
      ])
    ),
    categories: getAllCategories().length
  };
}

/**
 * Валидировать определение эффекта
 */
export function validateEffectDefinition(effect, isDebuff = false) {
  const errors = [];
  
  if (!effect.id || typeof effect.id !== 'string') {
    errors.push('Effect must have a valid string ID');
  }
  
  if (!effect.name || typeof effect.name !== 'string') {
    errors.push('Effect must have a valid string name');
  }
  
  if (!effect.description || typeof effect.description !== 'string') {
    errors.push('Effect must have a valid string description');
  }
  
  if (effect.duration !== null && (typeof effect.duration !== 'number' || effect.duration <= 0)) {
    errors.push('Effect duration must be null or a positive number');
  }
  
  if (isDebuff) {
    if (!effect.severity || !SEVERITY_INFO[effect.severity]) {
      errors.push('Debuff must have a valid severity');
    }
  } else {
    if (!effect.rarity || !RARITY_INFO[effect.rarity]) {
      errors.push('Buff must have a valid rarity');
    }
  }
  
  return errors;
}

/**
 * Проверить валидность всех определений эффектов
 */
export function validateAllEffects() {
  const errors = [];
  
  BUFF_DEFS.forEach(buff => {
    const buffErrors = validateEffectDefinition(buff, false);
    if (buffErrors.length > 0) {
      errors.push(`Buff ${buff.id}: ${buffErrors.join(', ')}`);
    }
  });
  
  DEBUFF_DEFS.forEach(debuff => {
    const debuffErrors = validateEffectDefinition(debuff, true);
    if (debuffErrors.length > 0) {
      errors.push(`Debuff ${debuff.id}: ${debuffErrors.join(', ')}`);
    }
  });
  
  return errors;
}