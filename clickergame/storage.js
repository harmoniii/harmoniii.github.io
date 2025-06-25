// storage.js - Исправленная версия с улучшенной валидацией и безопасностью
import { RESOURCES, GAME_CONSTANTS } from './config.js';
import { BUILDING_DEFS } from './buildings.js';
import { SKILL_DEFS } from './skills.js';

const DEFAULT_STATE = {
  blockedUntil: 0,
  combo: {
    lastZone: null,
    count: 0,
    deadline: 0,
    lastAngle: null
  },
  resources: RESOURCES.reduce((o, k) => (o[k] = 0, o), {}),
  buffs: [],
  debuffs: [],
  flags: {},
  lastTimestamp: Date.now(),
  
  // Здания
  buildings: BUILDING_DEFS.reduce((obj, def) => {
    obj[def.id] = { level: 0, active: false };
    return obj;
  }, {}),
  
  // Навыки
  skills: SKILL_DEFS.reduce((obj, def) => {
    obj[def.id] = { level: 0 };
    return obj;
  }, {}),
  
  skillPoints: 0,
  skillStates: {
    missProtectionCharges: 0,
    autoClickerActive: false
  },
  
  // Состояния эффектов
  effectStates: {
    starPowerClicks: 0,
    shieldBlocks: 0,
    heavyClickRequired: {},
    reverseDirection: 1,
    frozenCombo: false
  },
  
  // Маркет
  market: {
    dailyDeals: [],
    purchaseHistory: [],
    reputation: 0
  },
  
  // Целевые зоны
  targetZone: 0,
  previousTargetZone: 0
};

// ИСПРАВЛЕНИЕ 5: Безопасное сохранение с валидацией
export function saveState(state) {
  try {
    // Создаем чистую копию состояния для сохранения
    const cleanState = createCleanStateForSaving(state);
    
    // Валидируем данные перед сохранением
    validateStateData(cleanState);
    
    // Кодируем и сохраняем
    const jsonString = JSON.stringify(cleanState);
    const encoded = btoa(encodeURIComponent(jsonString));
    localStorage.setItem('gameState', encoded);
    
    console.log('✅ Game state saved successfully');
  } catch (error) {
    console.warn('Failed to save game state:', error);
    // Не показываем ошибку пользователю, просто логируем
  }
}

// ИСПРАВЛЕНИЕ 5: Создание чистого состояния для сохранения
function createCleanStateForSaving(state) {
  const { featureMgr, buildingManager, skillManager, marketManager, CONFIG, ...toSave } = state;
  
  // ИСПРАВЛЕНИЕ 3: Валидация skill points
  const cleanState = {
    ...toSave,
    skillPoints: validateSkillPoints(toSave.skillPoints),
    resources: validateResources(toSave.resources),
    combo: validateCombo(toSave.combo),
    targetZone: validateTargetZone(toSave.targetZone),
    previousTargetZone: validateTargetZone(toSave.previousTargetZone),
    
    // Всегда очищаем временные эффекты при сохранении
    buffs: [],
    debuffs: [],
    blockedUntil: 0,
    effectStates: {
      starPowerClicks: 0,
      shieldBlocks: 0,
      heavyClickRequired: {},
      reverseDirection: 1,
      frozenCombo: false
    }
  };
  
  return cleanState;
}

// ИСПРАВЛЕНИЕ 3: Валидация skill points
function validateSkillPoints(skillPoints) {
  if (typeof skillPoints !== 'number' || isNaN(skillPoints)) {
    return 0;
  }
  if (skillPoints < 0) {
    return 0;
  }
  if (skillPoints > GAME_CONSTANTS.MAX_SKILL_POINTS) {
    return GAME_CONSTANTS.MAX_SKILL_POINTS;
  }
  return Math.floor(skillPoints);
}

// Валидация ресурсов
function validateResources(resources) {
  const validatedResources = {};
  
  RESOURCES.forEach(resourceName => {
    const value = resources[resourceName];
    if (typeof value === 'number' && !isNaN(value) && value >= 0) {
      validatedResources[resourceName] = Math.min(value, GAME_CONSTANTS.MAX_SAFE_RESOURCE_VALUE);
    } else {
      validatedResources[resourceName] = 0;
    }
  });
  
  return validatedResources;
}

// Валидация комбо
function validateCombo(combo) {
  if (!combo || typeof combo !== 'object') {
    return { ...DEFAULT_STATE.combo };
  }
  
  return {
    lastZone: typeof combo.lastZone === 'number' ? combo.lastZone : null,
    count: Math.max(0, Math.min(combo.count || 0, GAME_CONSTANTS.MAX_COMBO_COUNT)),
    deadline: Math.max(0, combo.deadline || 0),
    lastAngle: typeof combo.lastAngle === 'number' ? combo.lastAngle : null
  };
}

// Валидация целевой зоны
function validateTargetZone(zone) {
  if (typeof zone === 'number' && zone >= 0 && zone < 8) {
    return zone;
  }
  return 0;
}

// Валидация данных состояния
function validateStateData(state) {
  // Проверяем обязательные поля
  const requiredFields = ['resources', 'combo', 'skillPoints'];
  for (const field of requiredFields) {
    if (state[field] === undefined || state[field] === null) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Проверяем типы данных
  if (typeof state.skillPoints !== 'number') {
    throw new Error('Invalid skillPoints type');
  }
  
  if (typeof state.resources !== 'object') {
    throw new Error('Invalid resources type');
  }
  
  // Проверяем все ресурсы
  RESOURCES.forEach(resourceName => {
    if (typeof state.resources[resourceName] !== 'number') {
      throw new Error(`Invalid resource ${resourceName} type`);
    }
  });
}

// ИСПРАВЛЕНИЕ 5, 20: Безопасная загрузка с улучшенной обработкой ошибок
export function loadState() {
  try {
    const encoded = localStorage.getItem('gameState');
    if (!encoded) {
      console.log('No saved state found, using default');
      return createDefaultState();
    }
    
    // Декодируем данные
    const decoded = decodeStateData(encoded);
    
    // Валидируем загруженные данные
    validateLoadedData(decoded);
    
    // Создаем финальное состояние
    const finalState = createFinalLoadState(decoded);
    
    console.log('✅ State loaded successfully');
    return finalState;
    
  } catch (error) {
    console.warn('Failed to load state, using default:', error.message);
    return createDefaultState();
  }
}

// ИСПРАВЛЕНИЕ 20: Безопасное декодирование с множественными методами
function decodeStateData(encoded) {
  let decoded;
  
  try {
    // Новый метод (с encodeURIComponent)
    decoded = JSON.parse(decodeURIComponent(atob(encoded)));
    console.log('✅ Decoded with new method');
  } catch (e1) {
    try {
      // Старый метод (без encodeURIComponent)
      decoded = JSON.parse(atob(encoded));
      console.log('✅ Decoded with fallback method');
    } catch (e2) {
      throw new Error('Could not decode save data - format invalid');
    }
  }
  
  return decoded;
}

// ИСПРАВЛЕНИЕ 20: Валидация загруженных данных
function validateLoadedData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid save data - not an object');
  }
  
  if (!data.resources || typeof data.resources !== 'object') {
    throw new Error('Invalid save data - missing or invalid resources');
  }
  
  // Проверяем версию если она есть
  if (data.saveVersion) {
    console.log(`Loading save version: ${data.saveVersion}`);
  }
  
  // Базовые проверки безопасности
  if (data.skillPoints && (typeof data.skillPoints !== 'number' || data.skillPoints < 0)) {
    console.warn('Invalid skill points in save data');
    data.skillPoints = 0;
  }
}

// Создание финального состояния после загрузки
function createFinalLoadState(loaded) {
  const finalState = createDefaultState();
  
  // Безопасно копируем основные поля
  safelyCopyField(loaded, finalState, 'resources', validateResources);
  safelyCopyField(loaded, finalState, 'combo', validateCombo);
  safelyCopyField(loaded, finalState, 'skillPoints', validateSkillPoints);
  safelyCopyField(loaded, finalState, 'targetZone', validateTargetZone);
  safelyCopyField(loaded, finalState, 'previousTargetZone', validateTargetZone);
  
  // Копируем сложные объекты
  safeCopyBuildings(loaded, finalState);
  safeCopySkills(loaded, finalState);
  safeCopySkillStates(loaded, finalState);
  safeCopyMarket(loaded, finalState);
  
  // ИСПРАВЛЕНИЕ 10: НЕ загружаем временные эффекты, используем дефолтные
  finalState.buffs = [];
  finalState.debuffs = [];
  finalState.blockedUntil = 0;
  finalState.effectStates = { ...DEFAULT_STATE.effectStates };
  
  // Устанавливаем метку времени
  finalState.lastTimestamp = Date.now();
  
  return finalState;
}

// Безопасное копирование поля с валидацией
function safelyCopyField(source, target, fieldName, validator) {
  if (source[fieldName] !== undefined && source[fieldName] !== null) {
    try {
      target[fieldName] = validator(source[fieldName]);
    } catch (error) {
      console.warn(`Failed to validate ${fieldName}, using default`);
    }
  }
}

// Безопасное копирование зданий
function safeCopyBuildings(loaded, finalState) {
  if (loaded.buildings && typeof loaded.buildings === 'object') {
    Object.keys(DEFAULT_STATE.buildings).forEach(buildingId => {
      if (loaded.buildings[buildingId] && typeof loaded.buildings[buildingId] === 'object') {
        const building = loaded.buildings[buildingId];
        finalState.buildings[buildingId] = {
          level: Math.max(0, Math.floor(building.level || 0)),
          active: Boolean(building.active)
        };
      }
    });
  }
}

// Безопасное копирование навыков
function safeCopySkills(loaded, finalState) {
  if (loaded.skills && typeof loaded.skills === 'object') {
    Object.keys(DEFAULT_STATE.skills).forEach(skillId => {
      if (loaded.skills[skillId] && typeof loaded.skills[skillId] === 'object') {
        const skill = loaded.skills[skillId];
        finalState.skills[skillId] = {
          level: Math.max(0, Math.floor(skill.level || 0))
        };
      }
    });
  }
}

// Безопасное копирование состояний навыков
function safeCopySkillStates(loaded, finalState) {
  if (loaded.skillStates && typeof loaded.skillStates === 'object') {
    finalState.skillStates = {
      ...DEFAULT_STATE.skillStates,
      missProtectionCharges: Math.max(0, Math.floor(loaded.skillStates.missProtectionCharges || 0)),
      autoClickerActive: Boolean(loaded.skillStates.autoClickerActive)
    };
  }
}

// Безопасное копирование маркета
function safeCopyMarket(loaded, finalState) {
  if (loaded.market && typeof loaded.market === 'object') {
    finalState.market = {
      dailyDeals: Array.isArray(loaded.market.dailyDeals) ? loaded.market.dailyDeals : [],
      purchaseHistory: Array.isArray(loaded.market.purchaseHistory) ? loaded.market.purchaseHistory : [],
      reputation: Math.max(0, Math.floor(loaded.market.reputation || 0))
    };
  }
}

// Создание дефолтного состояния
function createDefaultState() {
  // Создаем глубокую копию дефолтного состояния
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}