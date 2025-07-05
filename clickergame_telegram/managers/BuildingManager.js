import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';
import { dataLoader } from '../utils/DataLoader.js';

export class BuildingManager extends CleanupMixin {
  constructor(gameState) {
    super();
    this.gameState = gameState;
    this.productionIntervals = new Map();
    this.buildingDefs = [];
    this.buildingCategories = {};
    this.isDataLoaded = false;
    this.initializeBuildings();
    console.log('🏗️ BuildingManager initialized');
  }

  async initializeBuildings() {
    try {
      await this.loadBuildingData();
      this.setupGameStateBuildings();
      this.validateBuildings();
      this.startProduction();
      console.log(`✅ BuildingManager: Loaded ${this.buildingDefs.length} building definitions`);
    } catch (error) {
      console.error('❌ BuildingManager initialization failed:', error);
      this.setupFallbackBuildings();
    }
  }

  async loadBuildingData() {
    try {
      const data = await dataLoader.loadBuildingsData();
      if (dataLoader.validateBuildingsData(data)) {
        this.buildingDefs = data.buildings;
        this.buildingCategories = data.categories;
        this.isDataLoaded = true;
        console.log('✅ Building data loaded and validated');
      } else {
        throw new Error('Building data validation failed');
      }
    } catch (error) {
      console.error('❌ Failed to load building data:', error);
      throw error;
    }
  }

  setupFallbackBuildings() {
    console.warn('⚠️ Using fallback building definitions');
    this.buildingDefs = [
      {
        id: 'sawmill',
        img: '🪚',
        name: 'Sawmill',
        description: 'Produces wood automatically',
        price: { wood: 0, stone: 10, iron: 5 },
        production: { resource: 'wood', amount: 1, interval: 10000 },
        maxLevel: 10,
        category: 'production'
      }
    ];
    this.buildingCategories = { production: '🏭 Production' };
    this.isDataLoaded = true;
    this.setupGameStateBuildings();
    this.startProduction();
  }

  setupGameStateBuildings() {
    if (!this.gameState.buildings) {
      this.gameState.buildings = {};
    }

    this.buildingDefs.forEach(def => {
      if (!this.gameState.buildings[def.id]) {
        this.gameState.buildings[def.id] = {
          level: 0,
          active: false
        };
      }
    });
  }

  validateBuildings() {
    Object.keys(this.gameState.buildings).forEach(buildingId => {
      const building = this.gameState.buildings[buildingId];
      const def = this.getBuildingDefinition(buildingId);
      
      if (!def) {
        delete this.gameState.buildings[buildingId];
        return;
      }

      building.level = Math.max(0, Math.min(
        Math.floor(building.level || 0),
        def.maxLevel
      ));
      building.active = Boolean(building.active && building.level > 0);
    });
  }

  getBuildingDefinition(buildingId) {
    return this.buildingDefs.find(def => def.id === buildingId);
  }

  canAfford(buildingId) {
    const def = this.getBuildingDefinition(buildingId);
    if (!def) return false;

    const building = this.gameState.buildings[buildingId];
    if (building.level >= def.maxLevel) return false;

    const price = this.calculatePrice(def.price, building.level);
    const finalPrice = this.applyBuildingDiscounts(price);
    return this.gameState.canAffordResources(finalPrice);
  }

  calculatePrice(basePrice, level) {
    if (GAME_CONSTANTS.BUILDING_LINEAR_SCALING) {
      const linearMultiplier = 1 + (level * 0.5);
      const scaledPrice = {};
      Object.entries(basePrice).forEach(([resource, amount]) => {
        scaledPrice[resource] = Math.max(1, Math.floor(amount * linearMultiplier));
      });
      return scaledPrice;
    } else {
      const scalingFactor = Math.pow(1.5, level);
      const scaledPrice = {};
      Object.entries(basePrice).forEach(([resource, amount]) => {
        scaledPrice[resource] = Math.max(1, Math.floor(amount * scalingFactor));
      });
      return scaledPrice;
    }
  }

  applyBuildingDiscounts(basePrice) {
    let finalPrice = { ...basePrice };
    
    if (this.gameState.tempBuildingDiscount && this.gameState.tempBuildingDiscount.uses > 0) {
      const discount = this.gameState.tempBuildingDiscount.discount;
      Object.keys(finalPrice).forEach(resource => {
        finalPrice[resource] = Math.max(1, Math.floor(finalPrice[resource] * (1 - discount)));
      });
    }
    
    return finalPrice;
  }

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

    // Use discount if available
    if (this.gameState.tempBuildingDiscount && this.gameState.tempBuildingDiscount.uses > 0) {
      this.gameState.tempBuildingDiscount.uses--;
      if (this.gameState.tempBuildingDiscount.uses <= 0) {
        delete this.gameState.tempBuildingDiscount;
      }
      eventBus.emit(GameEvents.NOTIFICATION, '📜 Ancient Blueprint used! Discount applied');
    }

    building.level++;
    building.active = true;

    if (building.level === 1) {
      this.startBuildingProduction(buildingId);
    }

    // Special case for Watch Tower unlocking raids
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

  startProduction() {
    this.buildingDefs.forEach(def => {
      const building = this.gameState.buildings[def.id];
      if (building && building.level > 0 && building.active) {
        this.startBuildingProduction(def.id);
      }
    });
  }

  startBuildingProduction(buildingId) {
    const def = this.getBuildingDefinition(buildingId);
    if (!def) return;

    this.stopBuildingProduction(buildingId);

    const building = this.gameState.buildings[buildingId];
    if (!building.active || building.level <= 0) return;

    // Skip if building has no production (like fortress, generator)
    if (!def.production) return;

    const intervalId = this.createInterval(() => {
      this.produceBuildingResource(buildingId);
    }, def.production.interval, `building-${buildingId}`);

    this.productionIntervals.set(buildingId, intervalId);
    console.log(`Started production for ${def.name}`);
  }

  stopBuildingProduction(buildingId) {
    if (this.productionIntervals.has(buildingId)) {
      const intervalId = this.productionIntervals.get(buildingId);
      this.cleanupManager.clearInterval(intervalId);
      this.productionIntervals.delete(buildingId);
    }
  }

  produceBuildingResource(buildingId) {
    const def = this.getBuildingDefinition(buildingId);
    const building = this.gameState.buildings[buildingId];

    if (!def || !building || !building.active) return;

    const production = def.production;
    if (!production) return;

    // Calculate production amount based on building level
    let amount;
    if (GAME_CONSTANTS.BUILDING_LINEAR_SCALING) {
      amount = production.amount * building.level;
    } else {
      amount = production.amount * building.level;
    }

    // Apply time warp buff
    if (this.gameState.buffs && this.gameState.buffs.includes('timeWarp')) {
      amount *= 2;
    }

    // Apply abundance skill bonus
    const abundanceBonus = this.getAbundanceBonus();
    if (abundanceBonus > 0) {
      amount *= (1 + abundanceBonus);
      console.log(`🌟 Abundance bonus: +${Math.floor(abundanceBonus * 100)}% to ${production.resource} production`);
    }

    this.gameState.addResource(production.resource, amount);

    eventBus.emit(GameEvents.BUILDING_PRODUCED, {
      buildingId,
      resource: production.resource,
      amount: amount,
      level: building.level
    });

    eventBus.emit(GameEvents.RESOURCE_CHANGED);
  }

  getAbundanceBonus() {
    if (this.gameState.skillManager && 
        typeof this.gameState.skillManager.getSkillBonus === 'function') {
      return this.gameState.skillManager.getSkillBonus('multiplier', 'all_production');
    }
    return 0;
  }

  stopAllProduction() {
    this.productionIntervals.forEach((intervalId, buildingId) => {
      this.cleanupManager.clearInterval(intervalId);
    });
    this.productionIntervals.clear();
    console.log('🛑 All building production stopped');
  }

  getAllBuildings() {
    return this.buildingDefs.map(def => this.getBuildingInfo(def.id)).filter(Boolean);
  }

  getBuildingInfo(buildingId) {
    const def = this.getBuildingDefinition(buildingId);
    const building = this.gameState.buildings[buildingId];
    if (!def || !building) return null;

    const nextPrice = building.level < def.maxLevel ? 
      this.calculatePrice(def.price, building.level) : null;
    const finalNextPrice = nextPrice ? this.applyBuildingDiscounts(nextPrice) : null;

    return {
      ...def,
      currentLevel: building.level,
      isActive: building.active,
      canAfford: building.level < def.maxLevel ? this.canAfford(buildingId) : false,
      isMaxLevel: building.level >= def.maxLevel,
      nextPrice: finalNextPrice,
      productionRate: def.production ? 
        `${def.production.amount * building.level}/${Math.ceil(def.production.interval/1000)}s` : 
        'No production',
      specialEffect: def.specialEffect || null
    };
  }

  getBuildingsByCategory() {
    const categories = {};
    
    Object.keys(this.buildingCategories).forEach(category => {
      categories[category] = this.buildingDefs
        .filter(def => def.category === category)
        .map(def => this.getBuildingInfo(def.id))
        .filter(Boolean);
    });

    return categories;
  }

  getBuildingStatistics() {
    return {
      totalBuildings: this.buildingDefs.length,
      ownedBuildings: Object.values(this.gameState.buildings).filter(b => b.level > 0).length,
      activeBuildings: Object.values(this.gameState.buildings).filter(b => b.active).length,
      totalLevels: Object.values(this.gameState.buildings).reduce((sum, b) => sum + b.level, 0),
      productionIntervals: this.productionIntervals.size,
      categoryCounts: Object.entries(this.buildingCategories).map(([category, name]) => ({
        category,
        name,
        count: this.buildingDefs.filter(def => def.category === category).length
      }))
    };
  }

  isRaidSystemUnlocked() {
    const watchTower = this.gameState.buildings?.watchTower;
    return watchTower && watchTower.level >= 1;
  }

  getDebugInfo() {
    return {
      isDataLoaded: this.isDataLoaded,
      buildingDefsCount: this.buildingDefs.length,
      categoriesCount: Object.keys(this.buildingCategories).length,
      activeProductionCount: this.productionIntervals.size,
      gameStateBuildingsCount: Object.keys(this.gameState.buildings || {}).length,
      raidSystemUnlocked: this.isRaidSystemUnlocked()
    };
  }

  // Method to reload building data (useful for hot-reloading during development)
  async reloadBuildingData() {
    try {
      console.log('🔄 Reloading building data...');
      dataLoader.clearCache();
      await this.loadBuildingData();
      this.validateBuildings();
      console.log('✅ Building data reloaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to reload building data:', error);
      return false;
    }
  }

  destroy() {
    console.log('🧹 BuildingManager cleanup started');
    this.stopAllProduction();
    super.destroy();
    console.log('✅ BuildingManager destroyed');
  }
}

// Export for fallback compatibility
export const BUILDING_DEFS = [];