// storage.js - Обновленная версия с поддержкой новых модулей
import { RESOURCES } from './config.js';
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
  
  // Новые поля для зданий
  buildings: BUILDING_DEFS.reduce((obj, def) => {
    obj[def.id] = { level: 0, active: false };
    return obj;
  }, {}),
  
  // Новые поля для навыков
  skills: SKILL_DEFS.reduce((obj, def) => {
    obj[def.id] = { level: 0 };
    return obj;
  }, {}),
  
  skillPoints: 0,
  skillStates: {
    missProtectionCharges: 0,
    autoClickerActive: false
  },
  
  // Новые поля для эффектов
  effectStates: {
    starPowerClicks: 0,
    shieldBlocks: 0,
    heavyClickRequired: {},
    reverseDirection: 1,
    frozenCombo: false
  },
  
  // Новые поля для маркета
  market: {
    dailyDeals: [],
    purchaseHistory: [],
    reputation: 0
  }
};

export function saveState(state) {
  const { featureMgr, buildingManager, skillManager, marketManager, CONFIG, ...toSave } = state;
  try {
    localStorage.setItem('gameState', btoa(JSON.stringify(toSave)));
  } catch (error) {
    console.warn('Failed to save game state:', error);
  }
}

export function loadState() {
  try {
    const enc = localStorage.getItem('gameState');
    if (!enc) throw new Error('No saved state found');
    
    const loaded = JSON.parse(atob(enc));
    
    // Объединяем загруженные данные с дефолтными, чтобы добавить новые поля
    const mergedState = { ...DEFAULT_STATE };
    
    // Копируем основные поля
    Object.keys(loaded).forEach(key => {
      if (!['buildings', 'skills', 'skillStates', 'effectStates', 'market'].includes(key)) {
        mergedState[key] = loaded[key];
      }
    });
    
    // Объединяем здания (добавляем новые, сохраняем существующие)
    if (loaded.buildings) {
      Object.keys(DEFAULT_STATE.buildings).forEach(buildingId => {
        if (loaded.buildings[buildingId]) {
          mergedState.buildings[buildingId] = loaded.buildings[buildingId];
        }
      });
    }
    
    // Объединяем навыки (добавляем новые, сохраняем существующие)
    if (loaded.skills) {
      Object.keys(DEFAULT_STATE.skills).forEach(skillId => {
        if (loaded.skills[skillId]) {
          mergedState.skills[skillId] = loaded.skills[skillId];
        }
      });
    }
    
    // Объединяем состояния навыков
    if (loaded.skillStates) {
      mergedState.skillStates = { ...DEFAULT_STATE.skillStates, ...loaded.skillStates };
    }
    
    // Объединяем состояния эффектов
    if (loaded.effectStates) {
      mergedState.effectStates = { ...DEFAULT_STATE.effectStates, ...loaded.effectStates };
    }
    
    // Объединяем состояние маркета
    if (loaded.market) {
      mergedState.market = { ...DEFAULT_STATE.market, ...loaded.market };
    }
    
    // Убеждаемся что skill points есть
    if (typeof loaded.skillPoints === 'number') {
      mergedState.skillPoints = Math.floor(loaded.skillPoints);
    }
    
    return mergedState;
  } catch (error) {
    console.log('Loading default state:', error.message);
    return { ...DEFAULT_STATE };
  }
}