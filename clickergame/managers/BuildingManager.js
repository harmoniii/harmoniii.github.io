// managers/BuildingManager.js - Fixed version with correct cleanup methods
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';

// Определения зданий
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

export class BuildingManager extends CleanupMixin {
  constructor(gameState) {
    super();
    
    this.gameState = gameState;
    this.productionIntervals = new Map();
    
    this.initializeBuildings();
    this.startProduction();
    
    console.log('🏗️ BuildingManager initialized');
  }

  // Инициализация зданий
  initializeBuildings() {
    // Создаем объект зданий если его нет
    if (!this.gameState.buildings) {
      this.gameState.buildings = {};
    }
    
    // Инициализируем все здания из определений
    BUILDING_DEFS.forEach(def => {
      if (!this.gameState.buildings[def.id]) {
        this.gameState.buildings[def.id] = { 
          level: 0, 
          active: false 
        };
      }
    });
    
    // Валидируем существующие здания
    this.validateBuildings();
  }

  // Валидация зданий после загрузки
  validateBuildings() {
    Object.keys(this.gameState.buildings).forEach(buildingId => {
      const building = this.gameState.buildings[buildingId];
      const def = this.getBuildingDefinition(buildingId);
      
      if (!def) {
        // Удаляем неизвестные здания
        delete this.gameState.buildings[buildingId];
        return;
      }
      
      // Валидируем уровень
      building.level = Math.max(0, Math.min(
        Math.floor(building.level || 0), 
        def.maxLevel
      ));
      
      // Валидируем активность
      building.active = Boolean(building.active && building.level > 0);
    });
  }

  // Получить определение здания
  getBuildingDefinition(buildingId) {
    return BUILDING_DEFS.find(def => def.id === buildingId);
  }

  // Проверить, можем ли позволить себе здание
  canAfford(buildingId) {
    const def = this.getBuildingDefinition(buildingId);
    if (!def) return false;
    
    const building = this.gameState.buildings[buildingId];
    if (building.level >= def.maxLevel) return false;
    
    const price = this.calculatePrice(def.price, building.level);
    return this.gameState.canAffordResources(price);
  }

  // Рассчитать цену здания для текущего уровня
  calculatePrice(basePrice, level) {
    const scalingFactor = Math.pow(1.5, level);
    const scaledPrice = {};
    
    Object.entries(basePrice).forEach(([resource, amount]) => {
      scaledPrice[resource] = Math.max(1, Math.floor(amount * scalingFactor));
    });
    
    return scaledPrice;
  }

  // Купить/улучшить здание
  buyBuilding(buildingId) {
    const def = this.getBuildingDefinition(buildingId);
    if (!def) {
      console.warn(`Unknown building: ${buildingId}`);
      return false;
    }

    const building = this.gameState.buildings[buildingId];
    if (building.level >= def.maxLevel) {
      console.warn(`Building ${buildingId} is already at max level`);
      return false;
    }

    const price = this.calculatePrice(def.price, building.level);
    
    if (!this.gameState.spendResources(price)) {
      console.warn(`Cannot afford building ${buildingId}`);
      return false;
    }

    // Повышаем уровень
    building.level++;
    building.active = true;

    // Запускаем производство если это первый уровень
    if (building.level === 1) {
      this.startBuildingProduction(buildingId);
    }

    eventBus.emit(GameEvents.BUILDING_BOUGHT, { 
      buildingId, 
      level: building.level,
      name: def.name 
    });
    
    eventBus.emit(GameEvents.RESOURCE_CHANGED);
    
    console.log(`Building ${def.name} upgraded to level ${building.level}`);
    return true;
  }

  // Запустить производство для всех активных зданий
  startProduction() {
    BUILDING_DEFS.forEach(def => {
      const building = this.gameState.buildings[def.id];
      if (building && building.level > 0 && building.active) {
        this.startBuildingProduction(def.id);
      }
    });
  }

  // Запустить производство для конкретного здания
  startBuildingProduction(buildingId) {
    const def = this.getBuildingDefinition(buildingId);
    if (!def) return;

    // Останавливаем предыдущее производство
    this.stopBuildingProduction(buildingId);

    const building = this.gameState.buildings[buildingId];
    if (!building.active || building.level <= 0) return;

    // Проверяем, есть ли производство у здания
    if (!def.production) return;

    const intervalId = this.createInterval(() => {
      this.produceBuildingResource(buildingId);
    }, def.production.interval, `building-${buildingId}`);

    this.productionIntervals.set(buildingId, intervalId);
    
    console.log(`Started production for ${def.name}`);
  }

  // Произвести ресурс от здания
  produceBuildingResource(buildingId) {
    const def = this.getBuildingDefinition(buildingId);
    const building = this.gameState.buildings[buildingId];
    
    if (!def || !building || !building.active) return;

    const production = def.production;
    if (!production) return;

    // Количество ресурса зависит от уровня здания
    let amount = production.amount * building.level;

    // Time Warp buff - ускорение производства
    if (this.gameState.buffs && this.gameState.buffs.includes('timeWarp')) {
      amount *= 5;
    }

    // Добавляем ресурс
    this.gameState.addResource(production.resource, amount);

    // Обрабатываем специальные эффекты
    if (def.special && def.special.reduces) {
      const reduceAmount = def.special.amount * building.level;
      const currentAmount = this.gameState.resources[def.special.reduces] || 0;
      const newAmount = Math.max(0, currentAmount - reduceAmount);
      this.gameState.resources[def.special.reduces] = newAmount;
    }

    eventBus.emit(GameEvents.BUILDING_PRODUCED, {
      buildingId,
      resource: production.resource,
      amount,
      level: building.level
    });

    eventBus.emit(GameEvents.RESOURCE_CHANGED);
  }

  // Остановить производство здания - FIXED: Use correct CleanupManager method
  stopBuildingProduction(buildingId) {
    if (this.productionIntervals.has(buildingId)) {
      const intervalId = this.productionIntervals.get(buildingId);
      // FIXED: Use the CleanupManager method correctly
      this.cleanupManager.clearInterval(intervalId);
      this.productionIntervals.delete(buildingId);
    }
  }

  // Получить информацию о здании
  getBuildingInfo(buildingId) {
    const def = this.getBuildingDefinition(buildingId);
    const building = this.gameState.buildings[buildingId];
    
    if (!def || !building) return null;

    const nextPrice = building.level < def.maxLevel ? 
      this.calculatePrice(def.price, building.level) : null;

    return {
      ...def,
      currentLevel: building.level,
      nextPrice,
      canAfford: building.level < def.maxLevel ? this.canAfford(buildingId) : false,
      isMaxLevel: building.level >= def.maxLevel,
      isActive: building.active,
      productionRate: def.production ? 
        `${def.production.amount * building.level} per ${def.production.interval/1000}s` : null,
      specialEffect: def.special ? def.special.description : null
    };
  }

  // Получить все здания
  getAllBuildings() {
    return BUILDING_DEFS.map(def => this.getBuildingInfo(def.id)).filter(Boolean);
  }

  // Получить здания по категории
  getBuildingsByCategory() {
    const categories = {};
    
    BUILDING_DEFS.forEach(def => {
      const category = def.category || 'other';
      if (!categories[category]) {
        categories[category] = [];
      }
      
      const buildingInfo = this.getBuildingInfo(def.id);
      if (buildingInfo) {
        categories[category].push(buildingInfo);
      }
    });
    
    return categories;
  }

  // Получить бонус от зданий (например, защита от крепости)
  getBuildingBonus(effect) {
    let bonus = 0;
    
    BUILDING_DEFS.forEach(def => {
      const building = this.gameState.buildings[def.id];
      if (building && building.level > 0 && building.active && 
          def.special && def.special.effect === effect) {
        bonus += def.special.value * building.level;
      }
    });
    
    return Math.min(bonus, 1.0); // Ограничиваем максимальный бонус
  }

  // Получить общую статистику зданий
  getBuildingStatistics() {
    const stats = {
      totalBuildings: Object.keys(this.gameState.buildings).length,
      activeBuildings: 0,
      totalLevels: 0,
      productionBuildings: 0,
      specialBuildings: 0,
      maxLevelBuildings: 0,
      categories: {}
    };

    Object.entries(this.gameState.buildings).forEach(([buildingId, building]) => {
      const def = this.getBuildingDefinition(buildingId);
      if (!def) return;

      if (building.level > 0) {
        stats.activeBuildings++;
        stats.totalLevels += building.level;

        if (building.level >= def.maxLevel) {
          stats.maxLevelBuildings++;
        }

        if (def.production) {
          stats.productionBuildings++;
        }

        if (def.special) {
          stats.specialBuildings++;
        }

        // Статистика по категориям
        const category = def.category || 'other';
        if (!stats.categories[category]) {
          stats.categories[category] = { count: 0, levels: 0 };
        }
        stats.categories[category].count++;
        stats.categories[category].levels += building.level;
      }
    });

    return stats;
  }

  // Получить общую производительность
  getTotalProduction() {
    const production = {};

    BUILDING_DEFS.forEach(def => {
      const building = this.gameState.buildings[def.id];
      if (building && building.level > 0 && building.active && def.production) {
        const resource = def.production.resource;
        const amount = def.production.amount * building.level;
        const interval = def.production.interval;

        if (!production[resource]) {
          production[resource] = { amount: 0, interval };
        }
        production[resource].amount += amount;
      }
    });

    return production;
  }

  // Переключить активность здания
  toggleBuilding(buildingId, active = null) {
    const building = this.gameState.buildings[buildingId];
    if (!building || building.level === 0) return false;

    if (active === null) {
      building.active = !building.active;
    } else {
      building.active = Boolean(active);
    }

    if (building.active) {
      this.startBuildingProduction(buildingId);
    } else {
      this.stopBuildingProduction(buildingId);
    }

    const def = this.getBuildingDefinition(buildingId);
    console.log(`${def?.name || buildingId} ${building.active ? 'activated' : 'deactivated'}`);

    return true;
  }

  // Проверить доступность здания
  isBuildingUnlocked(buildingId) {
    // Простая система разблокировки - можно расширить
    const basicBuildings = ['sawmill', 'quarry', 'farm', 'well', 'house'];
    if (basicBuildings.includes(buildingId)) {
      return true;
    }

    // Продвинутые здания требуют определенных ресурсов
    const advancedBuildings = ['mine', 'generator', 'laboratory'];
    if (advancedBuildings.includes(buildingId)) {
      return this.gameState.resources.people >= 5;
    }

    // Специальные здания требуют много ресурсов
    const specialBuildings = ['temple', 'fortress'];
    if (specialBuildings.includes(buildingId)) {
      return this.gameState.resources.gold >= 50;
    }

    return true;
  }

  // Остановить все производство - FIXED: Use correct CleanupManager method
  stopAllProduction() {
    console.log('🛑 Stopping all building production...');
    
    // FIXED: Iterate safely and use correct cleanup method
    const intervalsToStop = Array.from(this.productionIntervals.entries());
    
    intervalsToStop.forEach(([buildingId, intervalId]) => {
      try {
        // Use the CleanupManager method correctly
        this.cleanupManager.clearInterval(intervalId);
        console.log(`Stopped production for ${buildingId}`);
      } catch (error) {
        console.warn(`Error stopping production for ${buildingId}:`, error);
      }
    });
    
    this.productionIntervals.clear();
    console.log('✅ All building production stopped');
  }

  // Деструктор - FIXED: Use correct cleanup method
  destroy() {
    if (this.isDestroyed) return;
    
    console.log('🧹 BuildingManager cleanup started');

    // Останавливаем все производство
    this.stopAllProduction();

    // Вызываем родительский деструктор
    super.destroy();

    console.log('✅ BuildingManager destroyed');
  }
}