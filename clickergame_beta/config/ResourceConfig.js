// config/ResourceConfig.js - Конфигурация ресурсов и зон
export const RESOURCES = [
    'gold', 'wood', 'stone', 'food', 'water', 'iron',
    'people', 'energy', 'science', 'faith', 'chaos'
  ];
  
  export const RESOURCE_EMOJIS = {
    gold: '🪙',
    wood: '🌲', 
    stone: '🪨',
    food: '🍎',
    water: '💧',
    iron: '⛓️',
    people: '👥',
    energy: '⚡',
    science: '🔬',
    faith: '🙏',
    chaos: '🌪️',
    skillPoints: '✨'
  };
  
  export const RESOURCE_NAMES = {
    gold: 'Gold',
    wood: 'Wood',
    stone: 'Stone', 
    food: 'Food',
    water: 'Water',
    iron: 'Iron',
    people: 'People',
    energy: 'Energy',
    science: 'Science',
    faith: 'Faith',
    chaos: 'Chaos',
    skillPoints: 'Skill Points'
  };
  
  export const ZONE_COUNT = 8;
  export const ZONE_DEFS = Array.from({ length: ZONE_COUNT }, () => ({ type: 'random' }));
  
  // Группы ресурсов для различных механик
  export const RESOURCE_GROUPS = {
    BASIC: ['gold', 'wood', 'stone', 'food', 'water', 'iron'],
    ADVANCED: ['people', 'energy', 'science'],
    SPECIAL: ['faith', 'chaos'],
    TRADEABLE: ['wood', 'stone', 'food', 'water', 'iron', 'people', 'energy', 'science'],
    NON_TRADEABLE: ['gold', 'faith', 'chaos']
  };
  
  // Валидация ресурсов
  export function isValidResource(resourceName) {
    return RESOURCES.includes(resourceName);
  }
  
  export function getResourceEmoji(resourceName) {
    return RESOURCE_EMOJIS[resourceName] || resourceName;
  }
  
  export function getResourceName(resourceName) {
    return RESOURCE_NAMES[resourceName] || resourceName;
  }
  
  export function getResourcesInGroup(groupName) {
    return RESOURCE_GROUPS[groupName] || [];
  }