// managers/BuildingManager.js - ОБНОВЛЕНО: добавлена Watch Tower для рейдов
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';

// ОБНОВЛЕННЫЕ определения зданий с Watch Tower
export const BUILDING_DEFS = [
  { 
    id: 'sawmill',
    img: '🪚',
    name: 'Sawmill',
    description: 'Last surviving woodworking workshop from the Old World. Each cut brings hope, transforming fallen trees into the building blocks of a new civilization. Survivors work tirelessly, knowing that every plank is a step towards reconstruction. Produces wood automatically',
    price: { wood: 0, stone: 10, iron: 5 },
    production: { resource: 'wood', amount: 1, interval: 10000 },
    maxLevel: 10,
    category: 'production'
  },
  {
    id: 'quarry',
    img: '⛏️',
    name: 'Stone Quarry',
    description: 'A massive excavation site where the last stonemasons extract precious building materials from the scarred earth. Each stone pulled from the ground is a testament to human resilience and the dream of rebuilding what was lost. Mines stone continuously',
    price: { wood: 15, stone: 0, iron: 10 },
    production: { resource: 'stone', amount: 1, interval: 12000 },
    maxLevel: 10,
    category: 'production'
  },
  {
    id: 'farm',
    img: '🌾',
    name: 'Farm',
    description: 'A carefully cultivated patch of land, reclaimed from the wasteland. Here, determined farmers fight against environmental chaos, growing food that sustains the last remnants of humanity. Every seed planted is an act of defiance against total extinction. Grows food for your people',
    price: { wood: 20, stone: 5, water: 10 },
    production: { resource: 'food', amount: 2, interval: 8000 },
    maxLevel: 15,
    category: 'production'
  },
  {
    id: 'well',
    img: '🪣',
    name: 'Water Well',
    description: 'More than just a source of water - a lifeline in a world where clean water is more precious than gold. Dug by hand through layers of debris and hope, this well represents survival against all odds. Provides fresh water',
    price: { wood: 10, stone: 25, iron: 5 },
    production: { resource: 'water', amount: 1, interval: 6000 },
    maxLevel: 8,
    category: 'production'
  },
  {
    id: 'mine',
    img: '⚒️',
    name: 'Iron Mine',
    description: 'Deep within the scarred mountains, brave miners extract the metal that will forge new tools, new weapons, and new hope. Each piece of iron represents potential - the potential to rebuild, to defend, to survive. Extracts iron ore',
    price: { wood: 30, stone: 20, people: 5 },
    production: { resource: 'iron', amount: 1, interval: 15000 },
    maxLevel: 12,
    category: 'production'
  },
  {
    id: 'house',
    img: '🏠',
    name: 'House',
    description: 'Not just a shelter, but a beacon of hope. Each new house signals the gradual rebirth of community, attracting survivors who dream of something more than mere survival. Here, humanity begins to heal. Attracts new people',
    price: { wood: 25, stone: 15, food: 10 },
    production: { resource: 'people', amount: 1, interval: 30000 },
    maxLevel: 20,
    category: 'population'
  },
  {
    id: 'generator',
    img: '⚡',
    name: 'Generator',
    description: 'A salvaged piece of pre-catastrophe technology, carefully restored to provide energy in a world of darkness. Its hum is a promise - civilization can be restarted, one spark at a time. Produces energy',
    price: { iron: 20, stone: 15, people: 3 },
    production: { resource: 'energy', amount: 2, interval: 10000 },
    maxLevel: 8,
    category: 'advanced'
  },
  {
    id: 'laboratory',
    img: '🔬',
    name: 'Laboratory',
    description: 'The crucible of human knowledge, where surviving scientists piece together lost technologies. Every discovery is a weapon against chaos, every experiment a step towards understanding the cataclysm that nearly destroyed everything. Researches new technologies',
    price: { iron: 30, energy: 10, people: 5 },
    production: { resource: 'science', amount: 1, interval: 20000 },
    maxLevel: 10,
    category: 'advanced'
  },
  {
    id: 'temple',
    img: '⛪',
    name: 'Temple',
    description: 'A sanctuary of spiritual resistance against the encroaching chaos. More than a religious site, it\'s a place of collective healing, where faith is both a shield and a weapon against the destructive energies that threaten to consume the world. Increases faith, reduces chaos',
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
    description: 'The last line of defense against the unknown threats that lurk beyond the reconstructed borders. Part shelter, part beacon, this fortress represents humanity\'s unbreakable will to protect what has been rebuilt at such great cost. Provides protection and order',
    price: { stone: 100, iron: 50, people: 10 },
    special: { 
      effect: 'protection',
      description: 'Reduces debuff duration by 20%',
      value: 0.2
    },
    maxLevel: 3,
    category: 'special'
  },
  // НОВОЕ ЗДАНИЕ: Watch Tower для рейдов
  {
    id: 'watchTower',
    img: '🗼',
    name: 'Watch Tower',
    description: 'A tall fortified structure that serves as both lookout post and command center for expeditions into the wasteland. From its heights, scouts can identify potential raid targets and coordinate dangerous missions to recover lost resources and technology. Unlocks raid system',
    price: { wood: 50, stone: 80, iron: 30, people: 8 },
    special: {
      effect: 'unlock_raids',
      description: 'Unlocks the raid system for expeditions',
      value: 1
    },
    maxLevel: 5,
    category: 'military'
  }
];

export const UPDATED_BUILDING_DEFS = [
  // Обновленный генератор
  {
    id: 'generator',
    img: '⚡',
    name: 'Generator',
    description: 'A salvaged piece of pre-catastrophe technology, carefully restored to provide energy in a world of darkness. Its hum is a promise - civilization can be restarted, one spark at a time. Produces energy and increases energy capacity.',
    price: { iron: 20, stone: 15, people: 3 },
    production: { resource: 'energy', amount: 2, interval: 10000 },
    energyBonus: {
      maxEnergy: 10, // +10 max energy per level
      regenBonus: 0.5 // +50% regen rate per level
    },
    maxLevel: 10,
    category: 'energy'
  },
  
  // Новое здание - Батарея
  {
    id: 'battery',
    img: '🔋',
    name: 'Energy Battery',
    description: 'Advanced energy storage systems recovered from the ruins of the old world. These batteries can store excess energy beyond normal capacity, ensuring no power is wasted in the struggle for survival.',
    price: { iron: 30, energy: 20, science: 5 },
    energyBonus: {
      maxEnergy: 25, // +25 max energy per level
      overflow: true // Allows energy above normal cap
    },
    maxLevel: 8,
    category: 'energy'
  },
  
  // Новое здание - Солнечная панель
  {
    id: 'solarPanel',
    img: '☀️',
    name: 'Solar Panel',
    description: 'Gleaming photovoltaic cells that capture the life-giving energy of the sun, converting light into hope. A symbol of humanities ability to harness nature for reconstruction.',
    price: { iron: 25, science: 10, gold: 500 },
    energyBonus: {
      passiveRegen: 0.5 // +0.5 energy regen per level
    },
    maxLevel: 5,
    category: 'energy'
  }
];

export class BuildingManager extends CleanupMixin {
  constructor(gameState) {
    super();
    
    this.gameState = gameState;
    this.productionIntervals = new Map();
    
    this.initializeBuildings();
    this.startProduction();
    
    console.log('🏗️ BuildingManager initialized with Watch Tower');
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
    
    // НОВОЕ: Проверяем скидку от Ancient Blueprint
    const finalPrice = this.applyBuildingDiscounts(price);
    
    return this.gameState.canAffordResources(finalPrice);
  }

  // НОВОЕ: Применить скидки на здания
  applyBuildingDiscounts(basePrice) {
    let finalPrice = { ...basePrice };
    
    // Проверяем временную скидку от Ancient Blueprint
    if (this.gameState.tempBuildingDiscount && this.gameState.tempBuildingDiscount.uses > 0) {
      const discount = this.gameState.tempBuildingDiscount.discount;
      Object.keys(finalPrice).forEach(resource => {
        finalPrice[resource] = Math.max(1, Math.floor(finalPrice[resource] * (1 - discount)));
      });
    }
    
    return finalPrice;
  }

  // Рассчитать цену здания для текущего уровня
  calculatePrice(basePrice, level) {
    if (GAME_CONSTANTS.BUILDING_LINEAR_SCALING) {
      // ЛИНЕЙНОЕ масштабирование вместо экспоненциального
      const linearMultiplier = 1 + (level * 0.5); // +50% за каждый уровень
      const scaledPrice = {};
      
      Object.entries(basePrice).forEach(([resource, amount]) => {
        scaledPrice[resource] = Math.max(1, Math.floor(amount * linearMultiplier));
      });
      
      return scaledPrice;
    } else {
      // Старое экспоненциальное масштабирование
      const scalingFactor = Math.pow(1.5, level);
      const scaledPrice = {};
      
      Object.entries(basePrice).forEach(([resource, amount]) => {
        scaledPrice[resource] = Math.max(1, Math.floor(amount * scalingFactor));
      });
      
      return scaledPrice;
    }
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

    const basePrice = this.calculatePrice(def.price, building.level);
    const finalPrice = this.applyBuildingDiscounts(basePrice);
    
    if (!this.gameState.spendResources(finalPrice)) {
      console.warn(`Cannot afford building ${buildingId}`);
      return false;
    }

    // НОВОЕ: Используем скидку от Ancient Blueprint если есть
    if (this.gameState.tempBuildingDiscount && this.gameState.tempBuildingDiscount.uses > 0) {
      this.gameState.tempBuildingDiscount.uses--;
      if (this.gameState.tempBuildingDiscount.uses <= 0) {
        delete this.gameState.tempBuildingDiscount;
      }
      eventBus.emit(GameEvents.NOTIFICATION, '📜 Ancient Blueprint used! Discount applied');
    }

    // Повышаем уровень
    building.level++;
    building.active = true;

    // Запускаем производство если это первый уровень
    if (building.level === 1) {
      this.startBuildingProduction(buildingId);
    }

    // НОВОЕ: Проверяем разблокировку рейдов
    if (buildingId === 'watchTower' && building.level === 1) {
      eventBus.emit(GameEvents.NOTIFICATION, '🗼 Watch Tower built! Raid system unlocked!');
      eventBus.emit('raid:system_unlocked', { buildingId, level: building.level });
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

  // ИЗМЕНЕНО: Линейное увеличение производства
  let amount;
  if (GAME_CONSTANTS.BUILDING_LINEAR_SCALING) {
    amount = production.amount * building.level;
  } else {
    amount = production.amount * building.level;
  }

  // Time Warp buff - ограниченное ускорение
  if (this.gameState.buffs && this.gameState.buffs.includes('timeWarp')) {
    amount *= 2;
  }

  // НОВОЕ: Abundance skill - бонус ко всему производству
  const abundanceBonus = this.getAbundanceBonus();
  if (abundanceBonus > 0) {
    amount *= (1 + abundanceBonus);
    console.log(`🌟 Abundance bonus: +${Math.floor(abundanceBonus * 100)}% to ${production.resource} production`);
  }

  // Добавляем ресурс
  this.gameState.addResource(production.resource, amount);

  // Обрабатываем специальные эффекты с линейным масштабированием
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

// ДОБАВИТЬ новый метод в класс BuildingManager:
getAbundanceBonus() {
  if (this.gameState.skillManager && 
      typeof this.gameState.skillManager.getSkillBonus === 'function') {
    return this.gameState.skillManager.getSkillBonus('multiplier', 'all_production');
  }
  return 0;
}

  // Остановить производство здания
  stopBuildingProduction(buildingId) {
    if (this.productionIntervals.has(buildingId)) {
      const intervalId = this.productionIntervals.get(buildingId);
      this.cleanupManager.clearInterval(intervalId);
      this.productionIntervals.delete(buildingId);
    }
  }

  // Получить информацию о здании
  getBuildingInfo(buildingId) {
    const def = this.getBuildingDefinition(buildingId);
    const building = this.gameState.buildings[buildingId];
    
    if (!def || !building) return null;

    const basePrice = building.level < def.maxLevel ? 
      this.calculatePrice(def.price, building.level) : null;
    
    const nextPrice = basePrice ? this.applyBuildingDiscounts(basePrice) : null;

    return {
      ...def,
      currentLevel: building.level,
      nextPrice,
      basePrice, // Показываем и базовую цену для сравнения
      canAfford: building.level < def.maxLevel ? this.canAfford(buildingId) : false,
      isMaxLevel: building.level >= def.maxLevel,
      isActive: building.active,
      productionRate: def.production ? 
        `${def.production.amount * building.level} per ${def.production.interval/1000}s` : null,
      specialEffect: def.special ? def.special.description : null,
      hasDiscount: this.gameState.tempBuildingDiscount && this.gameState.tempBuildingDiscount.uses > 0
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

  // Проверить, разблокирована ли система рейдов
  isRaidSystemUnlocked() {
    const watchTower = this.gameState.buildings.watchTower;
    return watchTower && watchTower.level >= 1;
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
      militaryBuildings: 0, // НОВОЕ: военные здания
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

        // НОВОЕ: подсчет военных зданий
        if (def.category === 'military') {
          stats.militaryBuildings++;
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

    // НОВОЕ: военные здания требуют определенный прогресс
    if (buildingId === 'watchTower') {
      return this.gameState.resources.people >= 8 && this.gameState.resources.iron >= 20;
    }

    return true;
  }

  // Остановить все производство
  stopAllProduction() {
    console.log('🛑 Stopping all building production...');
    
    const intervalsToStop = Array.from(this.productionIntervals.entries());
    
    intervalsToStop.forEach(([buildingId, intervalId]) => {
      try {
        this.cleanupManager.clearInterval(intervalId);
        console.log(`Stopped production for ${buildingId}`);
      } catch (error) {
        console.warn(`Error stopping production for ${buildingId}:`, error);
      }
    });
    
    this.productionIntervals.clear();
    console.log('✅ All building production stopped');
  }

  // Деструктор
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
