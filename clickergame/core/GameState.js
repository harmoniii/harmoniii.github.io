// core/GameState.js - Централизованное управление состоянием
import { RESOURCES } from '../config/ResourceConfig.js';
import { BUILDING_DEFS } from '../managers/BuildingManager.js';
import { SKILL_DEFS } from '../managers/SkillManager.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';

export class GameState {
  constructor() {
    this.initializeState();
  }

  initializeState() {
    // Основные ресурсы
    this.resources = RESOURCES.reduce((obj, resource) => {
      obj[resource] = 0;
      return obj;
    }, {});

    // Комбо система
    this.combo = {
      lastZone: null,
      count: 0,
      deadline: 0,
      lastAngle: null
    };

    // Целевые зоны
    this.targetZone = 0;
    this.previousTargetZone = 0;

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
      reputation: 0
    };

    // Системные поля
    this.lastTimestamp = Date.now();
    this.currentRotation = 0;
    this.flags = {};
  }

  // Методы валидации
  validateResource(resourceName, value) {
    if (!RESOURCES.includes(resourceName)) {
      console.warn(`Invalid resource: ${resourceName}`);
      return 0;
    }
    
    if (typeof value !== 'number' || isNaN(value) || value < 0) {
      return 0;
    }
    
    return Math.min(value, GAME_CONSTANTS.MAX_SAFE_RESOURCE_VALUE);
  }

  validateSkillPoints(value) {
    if (typeof value !== 'number' || isNaN(value) || value < 0) {
      return 0;
    }
    return Math.min(Math.floor(value), GAME_CONSTANTS.MAX_SKILL_POINTS);
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

  // Методы для работы с ресурсами
  addResource(resourceName, amount) {
    if (!RESOURCES.includes(resourceName)) return false;
    
    const currentAmount = this.resources[resourceName] || 0;
    const newAmount = this.validateResource(resourceName, currentAmount + amount);
    this.resources[resourceName] = newAmount;
    return true;
  }

  spendResource(resourceName, amount) {
    if (!RESOURCES.includes(resourceName)) return false;
    
    const currentAmount = this.resources[resourceName] || 0;
    if (currentAmount < amount) return false;
    
    this.resources[resourceName] = currentAmount - amount;
    return true;
  }

  canAffordResources(costs) {
    return Object.entries(costs).every(([resource, amount]) => {
      const available = this.resources[resource] || 0;
      return available >= amount;
    });
  }

  spendResources(costs) {
    if (!this.canAffordResources(costs)) return false;
    
    Object.entries(costs).forEach(([resource, amount]) => {
      this.spendResource(resource, amount);
    });
    
    return true;
  }

  // Получить состояние для сохранения
  getSaveData() {
    return {
      resources: { ...this.resources },
      combo: { ...this.combo },
      skillPoints: this.validateSkillPoints(this.skillPoints),
      targetZone: this.targetZone,
      previousTargetZone: this.previousTargetZone,
      buildings: { ...this.buildings },
      skills: { ...this.skills },
      skillStates: { ...this.skillStates },
      market: { ...this.market },
      
      // Временные эффекты не сохраняем
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
      saveVersion: '0.8.0'
    };
  }

  // Загрузить состояние
  loadSaveData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid save data');
    }

    // Валидируем и загружаем ресурсы
    if (data.resources && typeof data.resources === 'object') {
      Object.entries(data.resources).forEach(([resource, value]) => {
        if (RESOURCES.includes(resource)) {
          this.resources[resource] = this.validateResource(resource, value);
        }
      });
    }

    // Загружаем остальные данные
    this.combo = this.validateCombo(data.combo);
    this.skillPoints = this.validateSkillPoints(data.skillPoints);
    this.targetZone = typeof data.targetZone === 'number' ? data.targetZone : 0;
    this.previousTargetZone = typeof data.previousTargetZone === 'number' ? data.previousTargetZone : this.targetZone;

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
        reputation: Math.max(0, Math.floor(data.market.reputation || 0))
      };
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
  }
}