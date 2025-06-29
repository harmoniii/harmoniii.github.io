// core/GameState.js - Упрощенная версия БЕЗ управления зонами
import { RESOURCES } from '../config/ResourceConfig.js';
import { BUILDING_DEFS } from '../managers/BuildingManager.js';
import { SKILL_DEFS } from '../managers/SkillManager.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';

export class GameState {
  constructor() {
    this.isDestroyed = false;
    this.initializeState();
  }

  initializeState() {
    // Основные ресурсы (БЕЗ энергии - отдельная система)
    this.resources = RESOURCES.reduce((obj, resource) => {
      obj[resource] = 0;
      return obj;
    }, {});

    // Энергетическая система (отдельно от ресурсов)
    this.energy = {
      current: ENERGY_CONSTANTS.INITIAL_ENERGY,
      max: ENERGY_CONSTANTS.INITIAL_MAX_ENERGY,
      lastRegenTime: Date.now(),
      totalConsumed: 0,
      totalRegenerated: 0
    };

    // Комбо система
    this.combo = {
      lastZone: null,
      count: 0,
      deadline: 0,
      lastAngle: null
    };

    // УДАЛЕНО: targetZone и previousTargetZone теперь управляются ZoneManager
    // Зоны больше НЕ хранятся в GameState!

    // Временные блокировки
    this.blockedUntil = 0;

    // Активные эффекты (не сохраняются)
    this.buffs = [];
    this.debuffs = [];

    // Состояния эффектов
    this.effectStates = {
      starPowerClicks: 0,
      shieldBlocks: 0,
      heavyClickRequired: {},
      reverseDirection: 1,
      frozenCombo: false
    };

    // Здания
    this.buildings = BUILDING_DEFS.reduce((obj, def) => {
      obj[def.id] = { level: 0, active: false };
      return obj;
    }, {});

    // Навыки
    this.skills = SKILL_DEFS.reduce((obj, def) => {
      obj[def.id] = { level: 0 };
      return obj;
    }, {});

    this.skillPoints = 0;
    this.skillStates = {
      missProtectionCharges: 0,
      autoClickerActive: false
    };

    // Маркет
    this.market = {
      dailyDeals: [],
      purchaseHistory: [],
      reputation: 0,
      permanentBonuses: {}
    };

    // Система достижений
    this.achievements = {
      completed: new Set(),
      statistics: {
        totalClicks: 0,
        maxCombo: 0,
        resourcesCollected: {},
        totalResourcesCollected: 0
      }
    };

    // Системные поля
    this.lastTimestamp = Date.now();
    this.currentRotation = 0;
    this.flags = {};
  }

  // Методы валидации
validateNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER, shouldFloor = false) {
    if (typeof value !== 'number' || isNaN(value) || value < min) {
      return min;
    }
    const result = Math.min(value, max);
    return shouldFloor ? Math.floor(result) : result;
}

validateResource(resourceName, value) {
    if (!RESOURCES.includes(resourceName)) {
      console.warn(`Invalid resource: ${resourceName}`);
      return 0;
    }
    return this.validateNumber(value, 0, GAME_CONSTANTS.MAX_SAFE_RESOURCE_VALUE);
}

validateSkillPoints(value) {
    return this.validateNumber(value, 0, GAME_CONSTANTS.MAX_SKILL_POINTS, true);
}

  validateCombo(combo) {
    if (!combo || typeof combo !== 'object') {
      return { ...this.combo };
    }
    
    return {
      lastZone: typeof combo.lastZone === 'number' ? combo.lastZone : null,
      count: Math.max(0, Math.min(combo.count || 0, GAME_CONSTANTS.MAX_COMBO_COUNT)),
      deadline: Math.max(0, combo.deadline || 0),
      lastAngle: typeof combo.lastAngle === 'number' ? combo.lastAngle : null
    };
  }

  // Валидация энергии
  validateEnergy(energy) {
    if (!energy || typeof energy !== 'object') {
      return { ...this.energy };
    }
    
    return {
      current: Math.max(0, energy.current || ENERGY_CONSTANTS.INITIAL_ENERGY),
      max: Math.max(ENERGY_CONSTANTS.INITIAL_MAX_ENERGY, energy.max || ENERGY_CONSTANTS.INITIAL_MAX_ENERGY),
      lastRegenTime: energy.lastRegenTime || Date.now(),
      totalConsumed: Math.max(0, energy.totalConsumed || 0),
      totalRegenerated: Math.max(0, energy.totalRegenerated || 0)
    };
  }

  // Валидация достижений
  validateAchievements(achievements) {
    if (!achievements || typeof achievements !== 'object') {
      return { ...this.achievements };
    }
    
    return {
      completed: new Set(Array.isArray(achievements.completed) ? achievements.completed : []),
      statistics: {
        totalClicks: Math.max(0, achievements.statistics?.totalClicks || 0),
        maxCombo: Math.max(0, achievements.statistics?.maxCombo || 0),
        resourcesCollected: achievements.statistics?.resourcesCollected || {},
        totalResourcesCollected: Math.max(0, achievements.statistics?.totalResourcesCollected || 0)
      }
    };
  }

  // Методы для работы с ресурсами
  addResource(resourceName, amount) {
    if (this.isDestroyed || !RESOURCES.includes(resourceName)) return false;
    
    const currentAmount = this.resources[resourceName] || 0;
    const newAmount = this.validateResource(resourceName, currentAmount + amount);
    this.resources[resourceName] = newAmount;
    return true;
  }

  spendResource(resourceName, amount) {
    if (this.isDestroyed || !RESOURCES.includes(resourceName)) return false;
    
    const currentAmount = this.resources[resourceName] || 0;
    if (currentAmount < amount) return false;
    
    this.resources[resourceName] = currentAmount - amount;
    return true;
  }

  canAffordResources(costs) {
    if (this.isDestroyed) return false;
    
    return Object.entries(costs).every(([resource, amount]) => {
      const available = this.resources[resource] || 0;
      return available >= amount;
    });
  }

  spendResources(costs) {
    if (this.isDestroyed || !this.canAffordResources(costs)) return false;
    
    Object.entries(costs).forEach(([resource, amount]) => {
      this.spendResource(resource, amount);
    });
    
    return true;
  }

  // ИСПРАВЛЕНИЕ: Получить состояние для сохранения БЕЗ данных зон
  getSaveData() {
    if (this.isDestroyed) {
      console.warn('⚠️ GameState.getSaveData: Object is destroyed, returning null');
      return null;
    }
  
    try {
      const saveData = {
        // Основные ресурсы (БЕЗ энергии)
        resources: this.resources ? { ...this.resources } : {},
        
        // Энергетическая система
        energy: this.energy ? { ...this.energy } : {
          current: ENERGY_CONSTANTS.INITIAL_ENERGY,
          max: ENERGY_CONSTANTS.INITIAL_MAX_ENERGY,
          lastRegenTime: Date.now(),
          totalConsumed: 0,
          totalRegenerated: 0
        },
        
        // Комбо
        combo: this.combo ? { ...this.combo } : { 
          count: 0, 
          deadline: 0, 
          lastZone: null, 
          lastAngle: null 
        },
        
        // Skill Points
        skillPoints: this.validateSkillPoints(this.skillPoints || 0),
        
        // ИСПРАВЛЕНИЕ: Сохраняем текущую целевую зону из ZoneManager
        // (будет установлено в GameCore.autoSave перед сохранением)
        targetZone: 0, // По умолчанию, будет перезаписано
        
        // Здания
        buildings: this.buildings ? { ...this.buildings } : {},
        
        // Навыки
        skills: this.skills ? { ...this.skills } : {},
        
        // Состояния навыков
        skillStates: this.skillStates ? { ...this.skillStates } : {},
        
        // Маркет
        market: this.market ? { ...this.market } : {},
        
        // Достижения
        achievements: {
          completed: Array.from(this.achievements.completed || []),
          statistics: { ...this.achievements.statistics }
        },
        
        // НЕ сохраняем временные эффекты
        buffs: [],
        debuffs: [],
        blockedUntil: 0,
        effectStates: {
          starPowerClicks: 0,
          shieldBlocks: 0,
          heavyClickRequired: {},
          reverseDirection: 1,
          frozenCombo: false
        },
        
        // Метаданные
        saveTimestamp: Date.now(),
        saveVersion: '1.0.9'
      };

      // Валидация ресурсов
      Object.keys(saveData.resources).forEach(resource => {
        const value = saveData.resources[resource];
        if (typeof value !== 'number' || isNaN(value) || value < 0) {
          console.warn(`Invalid resource value for ${resource}: ${value}, setting to 0`);
          saveData.resources[resource] = 0;
        }
      });

      // Валидация энергии
      saveData.energy = this.validateEnergy(saveData.energy);
  
      console.log('✅ GameState.getSaveData: Save data created successfully');
      return saveData;
  
    } catch (error) {
      console.error('❌ GameState.getSaveData: Error creating save data:', error);
      
      // Возвращаем минимальные безопасные данные
      return {
        resources: {},
        energy: {
          current: ENERGY_CONSTANTS.INITIAL_ENERGY,
          max: ENERGY_CONSTANTS.INITIAL_MAX_ENERGY,
          lastRegenTime: Date.now(),
          totalConsumed: 0,
          totalRegenerated: 0
        },
        combo: { count: 0, deadline: 0, lastZone: null, lastAngle: null },
        skillPoints: 0,
        targetZone: 0, // Будет установлено из ZoneManager
        buildings: {},
        skills: {},
        skillStates: {},
        market: {},
        achievements: {
          completed: [],
          statistics: {
            totalClicks: 0,
            maxCombo: 0,
            resourcesCollected: {},
            totalResourcesCollected: 0
          }
        },
        buffs: [],
        debuffs: [],
        blockedUntil: 0,
        effectStates: {
          starPowerClicks: 0,
          shieldBlocks: 0,
          heavyClickRequired: {},
          reverseDirection: 1,
          frozenCombo: false
        },
        saveTimestamp: Date.now(),
        saveVersion: '1.0.9'
      };
    }
  }
  
  // ИСПРАВЛЕНИЕ: Загрузить состояние БЕЗ управления зонами
  loadSaveData(data) {
    if (this.isDestroyed || !data || typeof data !== 'object') {
      throw new Error('Invalid save data or GameState is destroyed');
    }

    console.log('📥 Loading save data into GameState...');

    // Валидируем и загружаем ресурсы
    if (data.resources && typeof data.resources === 'object') {
      Object.entries(data.resources).forEach(([resource, value]) => {
        if (RESOURCES.includes(resource)) {
          this.resources[resource] = this.validateResource(resource, value);
        }
      });
    }

    // Загружаем энергию
    if (data.energy && typeof data.energy === 'object') {
      this.energy = this.validateEnergy(data.energy);
    } else {
      this.energy = {
        current: ENERGY_CONSTANTS.INITIAL_ENERGY,
        max: ENERGY_CONSTANTS.INITIAL_MAX_ENERGY,
        lastRegenTime: Date.now(),
        totalConsumed: 0,
        totalRegenerated: 0
      };
    }

    // Загружаем комбо
    this.combo = this.validateCombo(data.combo);
    
    // Загружаем skill points
    this.skillPoints = this.validateSkillPoints(data.skillPoints);

    // ИСПРАВЛЕНИЕ: Сохраняем targetZone для передачи в ZoneManager
    // (но не управляем зонами в GameState)
    this.targetZone = data.targetZone || 0;

    // Загружаем здания
    if (data.buildings && typeof data.buildings === 'object') {
      Object.entries(this.buildings).forEach(([buildingId, defaultBuilding]) => {
        if (data.buildings[buildingId]) {
          const building = data.buildings[buildingId];
          this.buildings[buildingId] = {
            level: Math.max(0, Math.floor(building.level || 0)),
            active: Boolean(building.active)
          };
        }
      });
    }

    // Загружаем навыки
    if (data.skills && typeof data.skills === 'object') {
      Object.entries(this.skills).forEach(([skillId, defaultSkill]) => {
        if (data.skills[skillId]) {
          const skill = data.skills[skillId];
          this.skills[skillId] = {
            level: Math.max(0, Math.floor(skill.level || 0))
          };
        }
      });
    }

    // Загружаем состояния навыков
    if (data.skillStates && typeof data.skillStates === 'object') {
      this.skillStates = {
        ...this.skillStates,
        ...data.skillStates
      };
    }

    // Загружаем маркет
    if (data.market && typeof data.market === 'object') {
      this.market = {
        dailyDeals: Array.isArray(data.market.dailyDeals) ? data.market.dailyDeals : [],
        purchaseHistory: Array.isArray(data.market.purchaseHistory) ? data.market.purchaseHistory : [],
        reputation: Math.max(0, Math.floor(data.market.reputation || 0)),
        permanentBonuses: data.market.permanentBonuses || {}
      };
    }

    // Загружаем достижения
    if (data.achievements && typeof data.achievements === 'object') {
      this.achievements = this.validateAchievements(data.achievements);
    }

    // Сбрасываем временные эффекты
    this.buffs = [];
    this.debuffs = [];
    this.blockedUntil = 0;
    this.effectStates = {
      starPowerClicks: 0,
      shieldBlocks: 0,
      heavyClickRequired: {},
      reverseDirection: 1,
      frozenCombo: false
    };

    this.lastTimestamp = Date.now();
    
    console.log('✅ GameState data loaded successfully');
  }

  // Проверить валидность состояния
  isValid() {
    return !this.isDestroyed && 
           this.resources && 
           this.combo && 
           this.energy &&
           typeof this.skillPoints === 'number';
  }

  // Сбросить к состоянию по умолчанию
  reset() {
    if (this.isDestroyed) return;
    
    console.log('🔄 Resetting GameState to defaults...');
    this.initializeState();
  }

  // ОБЯЗАТЕЛЬНЫЙ метод destroy для CleanupManager
  destroy() {
    if (this.isDestroyed) return;
    
    console.log('🧹 Destroying GameState...');
    
    this.isDestroyed = true;
    
    // Очищаем все ссылки
    this.resources = null;
    this.energy = null;
    this.combo = null;
    this.buildings = null;
    this.skills = null;
    this.skillStates = null;
    this.market = null;
    this.achievements = null;
    this.buffs = null;
    this.debuffs = null;
    this.effectStates = null;
    
    // Очищаем ссылки на менеджеры
    this.buffManager = null;
    this.energyManager = null;
    this.achievementManager = null;
    this.buildingManager = null;
    this.skillManager = null;
    this.marketManager = null;
    this.zoneManager = null; // НОВОЕ: ссылка на ZoneManager
    
    console.log('✅ GameState destroyed');
  }
}