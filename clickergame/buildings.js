// buildings.js - Исправленная версия с общими методами валидации
import { EventBus } from './eventBus.js';
import { GAME_CONSTANTS } from './config.js';

export const BUILDING_DEFS = [
  {
    id: 'sawmill',
    img: '🪚',
    name: 'Sawmill',
    description: 'Produces wood automatically',
    price: { wood: 0, stone: 10, iron: 5 },
    production: { resource: 'wood', amount: 1, interval: 10000 },
    maxLevel: 10,
    category: 'production'
  },
  {
    id: 'quarry',
    img: '⛏️',
    name: 'Stone Quarry',
    description: 'Mines stone continuously',
    price: { wood: 15, stone: 0, iron: 10 },
    production: { resource: 'stone', amount: 1, interval: 12000 },
    maxLevel: 10,
    category: 'production'
  },
  {
    id: 'farm',
    img: '🌾',
    name: 'Farm',
    description: 'Grows food for your people',
    price: { wood: 20, stone: 5, water: 10 },
    production: { resource: 'food', amount: 2, interval: 8000 },
    maxLevel: 15,
    category: 'production'
  },
  {
    id: 'well',
    img: '🪣',
    name: 'Water Well',
    description: 'Provides fresh water',
    price: { wood: 10, stone: 25, iron: 5 },
    production: { resource: 'water', amount: 1, interval: 6000 },
    maxLevel: 8,
    category: 'production'
  },
  {
    id: 'mine',
    img: '⚒️',
    name: 'Iron Mine',
    description: 'Extracts iron ore',
    price: { wood: 30, stone: 20, people: 5 },
    production: { resource: 'iron', amount: 1, interval: 15000 },
    maxLevel: 12,
    category: 'production'
  },
  {
    id: 'house',
    img: '🏠',
    name: 'House',
    description: 'Attracts new people',
    price: { wood: 25, stone: 15, food: 10 },
    production: { resource: 'people', amount: 1, interval: 30000 },
    maxLevel: 20,
    category: 'population'
  },
  {
    id: 'generator',
    img: '⚡',
    name: 'Generator',
    description: 'Produces energy',
    price: { iron: 20, stone: 15, people: 3 },
    production: { resource: 'energy', amount: 2, interval: 10000 },
    maxLevel: 8,
    category: 'advanced'
  },
  {
    id: 'laboratory',
    img: '🔬',
    name: 'Laboratory',
    description: 'Researches new technologies',
    price: { iron: 30, energy: 10, people: 5 },
    production: { resource: 'science', amount: 1, interval: 20000 },
    maxLevel: 10,
    category: 'advanced'
  },
  {
    id: 'temple',
    img: '⛪',
    name: 'Temple',
    description: 'Increases faith, reduces chaos',
    price: { wood: 40, stone: 50, gold: 100 },
    production: { resource: 'faith', amount: 1, interval: 25000 },
    special: { reduces: 'chaos', amount: 0.5, interval: 25000 },
    maxLevel: 5,
    category: 'special'
  },
  {
    id: 'fortress',
    img: '🏰',
    name: 'Fortress',
    description: 'Provides protection and order',
    price: { stone: 100, iron: 50, people: 10 },
    special: { 
      effect: 'protection',
      description: 'Reduces debuff duration by 20%',
      value: 0.2
    },
    maxLevel: 3,
    category: 'special'
  }
];

// ИСПРАВЛЕНИЕ 16: Базовый класс для валидации ресурсов
class ResourceValidator {
  static validateResources(state, price) {
    if (!state || !state.resources || !price) return false;
    
    return Object.entries(price).every(([resource, amount]) => {
      const available = state.resources[resource] || 0;
      return typeof available === 'number' && available >= amount;
    });
  }
  
  static spendResources(state, price) {
    if (!this.validateResources(state, price)) return false;
    
    try {
      Object.entries(price).forEach(([resource, amount]) => {
        const currentAmount = state.resources[resource] || 0;
        const newAmount = Math.max(0, currentAmount - amount);
        
        // Проверяем на валидность
        if (typeof newAmount === 'number' && !isNaN(newAmount)) {
          state.resources[resource] = newAmount;
        } else {
          throw new Error(`Invalid resource calculation for ${resource}`);
        }
      });
      return true;
    } catch (error) {
      console.warn('Error spending resources:', error);
      return false;
    }
  }
  
  static calculateScaledPrice(basePrice, level, multiplier = 1.5) {
    const scaledPrice = {};
    const scalingFactor = Math.pow(multiplier, Math.max(0, level));
    
    Object.entries(basePrice).forEach(([resource, amount]) => {
      scaledPrice[resource] = Math.max(1, Math.floor(amount * scalingFactor));
    });
    
    return scaledPrice;
  }
}

export class BuildingManager {
  constructor(state) {
    this.state = state;
    this.buildings = state.buildings || {};
    this.intervals = new Map(); // ИСПРАВЛЕНИЕ 2: Используем Map для лучшего управления
    this.isDestroyed = false; // ИСПРАВЛЕНИЕ 2: Флаг для предотвращения утечек
    
    this.initBuildings();
    this.startProduction();
  }

  initBuildings() {
    // Инициализируем здания если их нет в сохранении
    if (!this.state.buildings) {
      this.state.buildings = {};
      BUILDING_DEFS.forEach(def => {
        this.state.buildings[def.id] = { level: 0, active: false };
      });
    }
    
    // Валидируем существующие здания
    this.validateBuildings();
    this.buildings = this.state.buildings;
  }

  // Валидация зданий после загрузки
  validateBuildings() {
    BUILDING_DEFS.forEach(def => {
      if (!this.state.buildings[def.id]) {
        this.state.buildings[def.id] = { level: 0, active: false };
      } else {
        const building = this.state.buildings[def.id];
        // Валидируем уровень
        building.level = Math.max(0, Math.min(Math.floor(building.level || 0), def.maxLevel));
        building.active = Boolean(building.active && building.level > 0);
      }
    });
  }

  // ИСПРАВЛЕНИЕ 16: Использование общего метода валидации
  canAfford(buildingId, level = null) {
    const def = BUILDING_DEFS.find(b => b.id === buildingId);
    if (!def) return false;
    
    const currentLevel = level !== null ? level : this.buildings[buildingId].level;
    const price = this.calculatePrice(def.price, currentLevel);
    
    return ResourceValidator.validateResources(this.state, price);
  }

  // ИСПРАВЛЕНИЕ 16: Использование общего метода для расчета цены
  calculatePrice(basePrice, level) {
    return ResourceValidator.calculateScaledPrice(basePrice, level, 1.5);
  }

  buyBuilding(buildingId) {
    if (this.isDestroyed) return false;
    
    const def = BUILDING_DEFS.find(b => b.id === buildingId);
    if (!def) return false;

    const currentLevel = this.buildings[buildingId].level;
    if (currentLevel >= def.maxLevel) return false;

    const price = this.calculatePrice(def.price, currentLevel);
    
    // ИСПРАВЛЕНИЕ 16: Использование общего метода для списания ресурсов
    if (!ResourceValidator.spendResources(this.state, price)) return false;

    // Повышаем уровень
    this.buildings[buildingId].level++;
    this.buildings[buildingId].active = true;

    // Запускаем производство если это первый уровень
    if (this.buildings[buildingId].level === 1) {
      this.startBuildingProduction(buildingId);
    }

    EventBus.emit('buildingBought', { buildingId, level: this.buildings[buildingId].level });
    EventBus.emit('resourceChanged');
    return true;
  }

  startProduction() {
    if (this.isDestroyed) return;
    
    BUILDING_DEFS.forEach(def => {
      if (this.buildings[def.id] && this.buildings[def.id].level > 0) {
        this.startBuildingProduction(def.id);
      }
    });
  }

  startBuildingProduction(buildingId) {
    if (this.isDestroyed) return;
    
    const def = BUILDING_DEFS.find(b => b.id === buildingId);
    if (!def || !def.production) return;

    // ИСПРАВЛЕНИЕ 2: Очищаем предыдущий интервал если есть
    this.stopBuildingProduction(buildingId);

    const building = this.buildings[buildingId];
    if (!building.active || building.level <= 0) return;

    const interval = setInterval(() => {
      if (this.isDestroyed) {
        clearInterval(interval);
        return;
      }
      
      try {
        const level = building.level;
        const production = def.production;
        
        // Количество ресурса зависит от уровня
        const amount = production.amount * level;
        
        // Проверяем на переполнение ресурсов
        const currentAmount = this.state.resources[production.resource] || 0;
        const newAmount = Math.min(
          currentAmount + amount,
          GAME_CONSTANTS.MAX_SAFE_RESOURCE_VALUE
        );
        this.state.resources[production.resource] = newAmount;
        
        // Специальные эффекты
        if (def.special && def.special.reduces) {
          const reduceAmount = def.special.amount * level;
          const currentNegative = this.state.resources[def.special.reduces] || 0;
          const newNegative = Math.max(0, currentNegative - reduceAmount);
          this.state.resources[def.special.reduces] = newNegative;
        }

        EventBus.emit('resourceChanged');
        EventBus.emit('buildingProduced', { 
          buildingId, 
          resource: production.resource, 
          amount 
        });
      } catch (error) {
        console.warn(`Error in building production for ${buildingId}:`, error);
      }
    }, def.production.interval);
    
    this.intervals.set(buildingId, interval);
  }

  stopBuildingProduction(buildingId) {
    if (this.intervals.has(buildingId)) {
      clearInterval(this.intervals.get(buildingId));
      this.intervals.delete(buildingId);
    }
  }

  getBuildingInfo(buildingId) {
    const def = BUILDING_DEFS.find(b => b.id === buildingId);
    const building = this.buildings[buildingId];
    
    if (!def || !building) return null;

    return {
      ...def,
      currentLevel: building.level,
      nextPrice: building.level < def.maxLevel ? 
        this.calculatePrice(def.price, building.level) : null,
      canAfford: building.level < def.maxLevel ? 
        this.canAfford(buildingId) : false,
      isMaxLevel: building.level >= def.maxLevel,
      productionRate: def.production ? 
        `${def.production.amount * building.level}/${def.production.interval/1000}s` : null
    };
  }

  getAllBuildings() {
    return BUILDING_DEFS.map(def => this.getBuildingInfo(def.id));
  }

  // Получить бонус от зданий (например, защита от крепости)
  getBuildingBonus(type) {
    let bonus = 0;
    BUILDING_DEFS.forEach(def => {
      const building = this.buildings[def.id];
      if (building && building.level > 0 && def.special && def.special.effect === type) {
        bonus += def.special.value * building.level;
      }
    });
    return Math.min(bonus, 1.0); // Ограничиваем максимальный бонус
  }

  // ИСПРАВЛЕНИЕ 2: Полная очистка всех интервалов
  stopAllProduction() {
    this.isDestroyed = true;
    
    // Останавливаем все интервалы
    for (const [buildingId, interval] of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();
    
    console.log('🧹 BuildingManager production stopped');
  }
}