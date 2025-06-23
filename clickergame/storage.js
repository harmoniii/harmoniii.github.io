// storage.js
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
  }
};

export function saveState(state) {
  const { featureMgr, buildingManager, skillManager, ...toSave } = state;
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
      if (key !== 'buildings' && key !== 'skills' && key !== 'skillStates') {
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
    
    // Убеждаемся что skill points есть
    if (typeof loaded.skillPoints === 'number') {
      mergedState.skillPoints = loaded.skillPoints;
    }
    
    return mergedState;
  } catch (error) {
    console.log('Loading default state:', error.message);
    return { ...DEFAULT_STATE };
  }
}