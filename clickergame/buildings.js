// buildings.js
import { EventBus } from './eventBus.js';

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

export class BuildingManager {
  constructor(state) {
    this.state = state;
    this.buildings = state.buildings || {};
    this.intervals = {};
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
    this.buildings = this.state.buildings;
  }

  canAfford(buildingId, level = null) {
    const def = BUILDING_DEFS.find(b => b.id === buildingId);
    if (!def) return false;
    
    const currentLevel = level !== null ? level : this.buildings[buildingId].level;
    const price = this.calculatePrice(def.price, currentLevel);
    
    return Object.entries(price).every(([resource, amount]) => 
      this.state.resources[resource] >= amount
    );
  }

  calculatePrice(basePrice, level) {
    const multiplier = Math.pow(1.5, level);
    const price = {};
    Object.entries(basePrice).forEach(([resource, amount]) => {
      price[resource] = Math.floor(amount * multiplier);
    });
    return price;
  }

  buyBuilding(buildingId) {
    const def = BUILDING_DEFS.find(b => b.id === buildingId);
    if (!def) return false;

    const currentLevel = this.buildings[buildingId].level;
    if (currentLevel >= def.maxLevel) return false;

    const price = this.calculatePrice(def.price, currentLevel);
    if (!this.canAfford(buildingId)) return false;

    // Списываем ресурсы
    Object.entries(price).forEach(([resource, amount]) => {
      this.state.resources[resource] -= amount;
    });

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
    BUILDING_DEFS.forEach(def => {
      if (this.buildings[def.id] && this.buildings[def.id].level > 0) {
        this.startBuildingProduction(def.id);
      }
    });
  }

  startBuildingProduction(buildingId) {
    const def = BUILDING_DEFS.find(b => b.id === buildingId);
    if (!def || !def.production) return;

    // Очищаем предыдущий интервал если есть
    if (this.intervals[buildingId]) {
      clearInterval(this.intervals[buildingId]);
    }

    const building = this.buildings[buildingId];
    if (!building.active || building.level <= 0) return;

    this.intervals[buildingId] = setInterval(() => {
      const level = building.level;
      const production = def.production;
      
      // Количество ресурса зависит от уровня
      const amount = production.amount * level;
      this.state.resources[production.resource] += amount;
      
      // Специальные эффекты
      if (def.special) {
        if (def.special.reduces) {
          const reduceAmount = def.special.amount * level;
          this.state.resources[def.special.reduces] = Math.max(0, 
            this.state.resources[def.special.reduces] - reduceAmount);
        }
      }

      EventBus.emit('resourceChanged');
      EventBus.emit('buildingProduced', { 
        buildingId, 
        resource: production.resource, 
        amount 
      });
    }, def.production.interval);
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
    return bonus;
  }

  stopAllProduction() {
    Object.values(this.intervals).forEach(interval => clearInterval(interval));
    this.intervals = {};
  }
}