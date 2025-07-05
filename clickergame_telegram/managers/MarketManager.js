import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';
import { getResourceEmoji } from '../config/ResourceConfig.js';
import { dataLoader } from '../utils/DataLoader.js';

export const MARKET_CATEGORIES = {
  resources: 'Basic Resources',
  advanced: 'Advanced Materials',
  special: 'Special Items',
  premium: 'Premium Goods',
  energy: 'Energy Replenish',
  consumables: 'Consumables',
  building_materials: 'Building Materials',
  rare: 'Rare Artifacts'
};

export class MarketManager extends CleanupMixin {
  constructor(gameState) {
    super();
    this.gameState = gameState;
    this.marketItems = [];
    this.marketCategories = {};
    this.isDataLoaded = false;
    this.initializeMarket();
    console.log('🛒 MarketManager initialized');
  }

  async initializeMarket() {
    try {
      await this.loadMarketData();
      this.setupGameStateMarket();
      this.validateMarketData();
      console.log(`✅ MarketManager: Loaded ${this.marketItems.length} market items`);
    } catch (error) {
      console.error('❌ MarketManager initialization failed:', error);
      throw new Error(`Failed to initialize MarketManager: ${error.message}`);
    }
  }

  async loadMarketData() {
    try {
      const data = await dataLoader.loadMarketData();
      if (dataLoader.validateMarketData(data)) {
        this.marketItems = data.items;
        this.marketCategories = data.categories || MARKET_CATEGORIES;
        this.isDataLoaded = true;
        console.log('✅ Market data loaded and validated');
      } else {
        throw new Error('Market data validation failed');
      }
    } catch (error) {
      console.error('❌ Failed to load market data:', error);
      throw error;
    }
  }

  setupGameStateMarket() {
    if (!this.gameState.market) {
      this.gameState.market = {
        dailyDeals: [],
        purchaseHistory: [],
        reputation: 0,
        permanentBonuses: {}
      };
    }
    this.validateGameStateMarket();
  }

  validateGameStateMarket() {
    const market = this.gameState.market;
    
    if (typeof market.reputation !== 'number' || isNaN(market.reputation)) {
      market.reputation = 0;
    } else {
      market.reputation = Math.max(0, Math.floor(market.reputation));
    }

    if (!Array.isArray(market.dailyDeals)) {
      market.dailyDeals = [];
    }

    if (!Array.isArray(market.purchaseHistory)) {
      market.purchaseHistory = [];
    }

    if (!market.permanentBonuses || typeof market.permanentBonuses !== 'object') {
      market.permanentBonuses = {};
    }

    // Ограничиваем историю покупок
    if (market.purchaseHistory.length > 1000) {
      market.purchaseHistory = market.purchaseHistory.slice(-500);
    }
  }

  validateMarketData() {
    // Проверяем целостность данных о товарах
    this.marketItems = this.marketItems.filter(item => {
      if (!item.id || !item.name || !item.basePrice || !item.reward) {
        console.warn(`Invalid market item removed:`, item);
        return false;
      }
      return true;
    });

    if (this.marketItems.length === 0) {
      throw new Error('No valid market items found in data');
    }
  }

  getItemDefinition(itemId) {
    return this.marketItems.find(item => item.id === itemId);
  }

  calculateAdaptivePrice(itemId) {
    const item = this.getItemDefinition(itemId);
    if (!item || !item.adaptive) {
      return item?.basePrice || {};
    }

    const purchaseCount = this.gameState.market.purchaseHistory.filter(
      purchase => purchase.itemId === itemId
    ).length;

    const scalingFactor = Math.pow(item.scalingFactor || 1.1, purchaseCount);
    const scaledPrice = {};

    Object.entries(item.basePrice).forEach(([resource, amount]) => {
      scaledPrice[resource] = Math.floor(amount * scalingFactor);
    });

    return scaledPrice;
  }

  calculateEffectivePrice(basePrice) {
    const reputationDiscount = this.getReputationDiscount();
    const marketDiscount = this.getMarketDiscount();
    const totalDiscount = Math.min(0.5, reputationDiscount + marketDiscount); // Максимум 50% скидка

    const effectivePrice = {};
    Object.entries(basePrice).forEach(([resource, amount]) => {
      effectivePrice[resource] = Math.max(1, Math.floor(amount * (1 - totalDiscount)));
    });

    return effectivePrice;
  }

  getMarketDiscount() {
    // Проверяем активный Tax Boom buff
    if (this.gameState.buffManager && 
        typeof this.gameState.buffManager.getMarketDiscount === 'function') {
      return this.gameState.buffManager.getMarketDiscount();
    }
    
    // Проверяем напрямую через эффекты
    if (this.gameState.effectStates?.taxBoomActive) {
      return 0.33; // 33% скидка от Tax Boom
    }
    
    return 0;
  }

  canAfford(itemId) {
    return this.canAffordAdaptive(itemId);
  }

  canAffordAdaptive(itemId) {
    const item = this.getItemDefinition(itemId);
    if (!item) return false;

    const basePrice = item.adaptive ? 
      this.calculateAdaptivePrice(itemId) : 
      item.basePrice;
    
    const effectivePrice = this.calculateEffectivePrice(basePrice);
    
    return this.gameState.canAffordResources(effectivePrice);
  }

  getPurchaseCount(itemId) {
    return this.gameState.market.purchaseHistory.filter(
      purchase => purchase.itemId === itemId
    ).length;
  }

  buyItem(itemId) {
    const item = this.getItemDefinition(itemId);
    if (!item) {
      console.warn(`Unknown item: ${itemId}`);
      return false;
    }

    const basePrice = item.adaptive ? 
      this.calculateAdaptivePrice(itemId) : 
      item.basePrice;
    
    const effectivePrice = this.calculateEffectivePrice(basePrice);

    if (!this.gameState.canAffordResources(effectivePrice)) {
      console.warn(`Cannot afford item ${itemId}`);
      return false;
    }

    if (!this.gameState.spendResources(effectivePrice)) {
      console.warn(`Failed to spend resources for ${itemId}`);
      return false;
    }

    if (!this.giveRewardsWithLimits(item.reward, itemId)) {
      this.refundResources(effectivePrice);
      return false;
    }

    this.recordPurchase(item, effectivePrice);
    this.updateReputation(itemId);

    eventBus.emit(GameEvents.RESOURCE_CHANGED);
    eventBus.emit(GameEvents.ITEM_PURCHASED, {
      item: item,
      reputation: this.gameState.market.reputation,
      adaptivePrice: effectivePrice
    });

    console.log(`Purchased ${item.name} for`, effectivePrice);
    return true;
  }

  updateReputation(itemId) {
    const purchaseCount = this.getPurchaseCount(itemId);
    const reputationGain = Math.max(1, Math.floor(10 / Math.sqrt(purchaseCount + 1)));
    
    this.gameState.market.reputation = Math.min(
      this.gameState.market.reputation + reputationGain,
      1000 // Максимальная репутация
    );
  }

  giveRewardsWithLimits(rewards, itemId) {
    try {
      Object.entries(rewards).forEach(([resource, amount]) => {
        if (resource === 'skillPoints') {
          this.handleSkillPointsReward(amount, itemId);
        } else if (resource === 'energy') {
          this.handleEnergyReward(amount);
        } else if (resource === 'chaos' && amount < 0) {
          this.handleChaosReduction(amount);
        } else if (resource === 'maxEnergyBonus') {
          this.handleMaxEnergyBonus(amount);
        } else if (resource === 'shieldCharges') {
          this.handleShieldCharges(amount);
        } else if (resource === 'buildingDiscount') {
          this.handleBuildingDiscount(amount);
        } else if (resource === 'allResourcesPercent') {
          this.handleAllResourcesPercent(amount);
        } else {
          // Обычный ресурс
          this.gameState.addResource(resource, amount);
        }
      });
      return true;
    } catch (error) {
      console.warn('Error giving rewards:', error);
      return false;
    }
  }

  handleSkillPointsReward(amount, itemId) {
    const currentSP = Math.floor(this.gameState.skillPoints || 0);
    const purchaseCount = this.getPurchaseCount(itemId);
    const reducedAmount = Math.max(1, Math.floor(amount * Math.pow(0.9, purchaseCount)));
    
    if (this.gameState.skillManager &&
        typeof this.gameState.skillManager.addSkillPoints === 'function') {
      this.gameState.skillManager.addSkillPoints(reducedAmount);
    } else {
      const newSP = Math.min(currentSP + reducedAmount, GAME_CONSTANTS.MAX_SKILL_POINTS);
      this.gameState.skillPoints = newSP;
      eventBus.emit(GameEvents.SKILL_POINTS_CHANGED, this.gameState.skillPoints);
    }
  }

  handleEnergyReward(amount) {
    const maxRestore = Math.min(amount, 50);
    if (this.gameState.energyManager) {
      this.gameState.energyManager.restoreEnergy(maxRestore, 'market_purchase');
    }
  }

  handleChaosReduction(amount) {
    const currentChaos = this.gameState.resources.chaos || 0;
    const actualReduction = Math.min(Math.abs(amount), currentChaos);
    this.gameState.resources.chaos = currentChaos - actualReduction;
  }

  handleMaxEnergyBonus(amount) {
    if (this.gameState.energy) {
      this.gameState.energy.max += amount;
      if (this.gameState.energyManager) {
        this.gameState.energyManager.updateMaxEnergy();
      }
    }
  }

  handleShieldCharges(amount) {
    if (this.gameState.skillStates) {
      this.gameState.skillStates.missProtectionCharges = 
        (this.gameState.skillStates.missProtectionCharges || 0) + amount;
    }
  }

  handleBuildingDiscount(discount) {
    this.gameState.tempBuildingDiscount = {
      discount: discount,
      uses: 1
    };
    eventBus.emit(GameEvents.NOTIFICATION, `📜 Building discount: ${Math.floor(discount * 100)}% off next upgrade!`);
  }

  handleAllResourcesPercent(percent) {
    Object.entries(this.gameState.resources).forEach(([resource, amount]) => {
      if (amount > 0) {
        const bonus = Math.floor(amount * percent);
        this.gameState.addResource(resource, bonus);
      }
    });
    eventBus.emit(GameEvents.NOTIFICATION, `🪶 Phoenix Feather: +${Math.floor(percent * 100)}% to all resources!`);
  }

  refundResources(price) {
    try {
      Object.entries(price).forEach(([resource, amount]) => {
        this.gameState.addResource(resource, amount);
      });
    } catch (error) {
      console.warn('Error refunding resources:', error);
    }
  }

  recordPurchase(item, actualPrice) {
    try {
      const purchaseRecord = {
        itemId: item.id,
        timestamp: Date.now(),
        price: { ...actualPrice },
        reward: { ...item.reward },
        reputation: this.gameState.market.reputation
      };

      this.gameState.market.purchaseHistory.push(purchaseRecord);

      // Ограничиваем размер истории
      if (this.gameState.market.purchaseHistory.length > 1000) {
        this.gameState.market.purchaseHistory =
          this.gameState.market.purchaseHistory.slice(-500);
      }
    } catch (error) {
      console.warn('Error recording purchase:', error);
    }
  }

  getItemInfo(itemId) {
    const item = this.getItemDefinition(itemId);
    if (!item) return null;

    const basePrice = item.adaptive ? 
      this.calculateAdaptivePrice(itemId) : 
      item.basePrice;
    
    const effectivePrice = this.calculateEffectivePrice(basePrice);

    return {
      ...item,
      price: effectivePrice,
      originalPrice: basePrice,
      canAfford: this.canAffordAdaptive(itemId),
      priceText: this.formatPrice(effectivePrice),
      rewardText: this.formatReward(item.reward),
      effectivePrice: effectivePrice,
      purchaseCount: this.getPurchaseCount(itemId),
      hasDiscount: this.hasDiscount(basePrice, effectivePrice)
    };
  }

  hasDiscount(originalPrice, effectivePrice) {
    const originalTotal = Object.values(originalPrice).reduce((sum, val) => sum + val, 0);
    const effectiveTotal = Object.values(effectivePrice).reduce((sum, val) => sum + val, 0);
    return originalTotal > effectiveTotal;
  }

  formatPrice(price) {
    if (!price || typeof price !== 'object') {
      return 'Invalid price';
    }

    const validEntries = Object.entries(price).filter(([resource, amount]) => {
      return typeof amount === 'number' && !isNaN(amount) && amount >= 0;
    });

    if (validEntries.length === 0) {
      return 'Free';
    }

    return validEntries
      .map(([resource, amount]) => `${Math.floor(amount)} ${getResourceEmoji(resource)}`)
      .join(' + ');
  }

  formatReward(reward) {
    return Object.entries(reward)
      .map(([resource, amount]) => {
        const prefix = amount > 0 ? '+' : '';
        const emoji = getResourceEmoji(resource);
        return `${prefix}${amount} ${emoji}`;
      })
      .join(' + ');
  }

  getAllItems() {
    return this.marketItems.map(item => this.getItemInfo(item.id)).filter(Boolean);
  }

  getItemsByCategory() {
    const categories = {};
    Object.keys(this.marketCategories).forEach(cat => {
      categories[cat] = this.marketItems
        .filter(item => item.category === cat)
        .map(item => this.getItemInfo(item.id))
        .filter(Boolean);
    });
    return categories;
  }

  generateDailyDeals() {
    const dealCount = 3;
    const availableItems = this.marketItems.filter(item =>
      item.category !== 'premium'
    );

    const deals = [];
    const maxAttempts = availableItems.length * 2;
    let attempts = 0;

    while (deals.length < dealCount && attempts < maxAttempts) {
      const item = availableItems[Math.floor(Math.random() * availableItems.length)];
      if (!deals.find(deal => deal.id === item.id)) {
        const discountedItem = {
          ...item,
          id: `${item.id}_deal`,
          basePrice: this.applyDiscount(item.basePrice, 0.8),
          isDeal: true,
          originalPrice: { ...item.basePrice }
        };
        deals.push(discountedItem);
      }
      attempts++;
    }

    this.gameState.market.dailyDeals = deals;
    return deals;
  }

  applyDiscount(price, multiplier) {
    const discountedPrice = {};
    Object.entries(price).forEach(([resource, amount]) => {
      discountedPrice[resource] = Math.max(1, Math.floor(amount * multiplier));
    });
    return discountedPrice;
  }

  getMarketReputation() {
    return this.gameState.market.reputation || 0;
  }

  getPurchaseHistory() {
    return this.gameState.market.purchaseHistory || [];
  }

  getReputationDiscount() {
    const reputation = this.getMarketReputation();
    if (reputation >= 500) return 0.20; // 20% скидка
    if (reputation >= 250) return 0.15; // 15% скидка
    if (reputation >= 100) return 0.10; // 10% скидка
    if (reputation >= 50) return 0.05;  // 5% скидка
    return 0.0; // Нет скидки
  }

  getPermanentBonuses() {
    return this.gameState.market.permanentBonuses || {};
  }

  getMarketStats() {
    const history = this.getPurchaseHistory();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    return {
      totalPurchases: history.length,
      todayPurchases: history.filter(p => now - p.timestamp < dayMs).length,
      reputation: this.getMarketReputation(),
      reputationDiscount: Math.floor(this.getReputationDiscount() * 100),
      marketDiscount: Math.floor(this.getMarketDiscount() * 100),
      totalDiscount: Math.floor((this.getReputationDiscount() + this.getMarketDiscount()) * 100),
      favoriteCategory: this.getFavoriteCategory(history),
      totalSpent: this.calculateTotalSpent(history),
      permanentBonuses: this.getPermanentBonuses()
    };
  }

  getFavoriteCategory(history) {
    const categoryCount = {};
    history.forEach(purchase => {
      const item = this.marketItems.find(i => i.id === purchase.itemId);
      if (item) {
        categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
      }
    });

    let maxCount = 0;
    let favoriteCategory = 'none';
    Object.entries(categoryCount).forEach(([category, count]) => {
      if (count > maxCount) {
        maxCount = count;
        favoriteCategory = category;
      }
    });

    return this.marketCategories[favoriteCategory] || favoriteCategory;
  }

  calculateTotalSpent(history) {
    const totalSpent = {};
    history.forEach(purchase => {
      Object.entries(purchase.price).forEach(([resource, amount]) => {
        totalSpent[resource] = (totalSpent[resource] || 0) + amount;
      });
    });
    return totalSpent;
  }

  isItemUnlocked(itemId) {
    const basicItems = ['wood', 'stone', 'food', 'water', 'iron', 'food_package', 'water_container', 'iron_ingot'];
    if (basicItems.includes(itemId)) {
      return true;
    }

    const advancedItems = ['energy_pack', 'science_kit', 'population_beacon', 'energy_core', 'small_energy_cell'];
    if (advancedItems.includes(itemId)) {
      return this.gameState.resources.energy >= 1 || this.gameState.resources.science >= 1;
    }

    const specialItems = ['chaos_suppressor', 'experience_tome', 'energy_amplifier', 'protection_ward'];
    if (specialItems.includes(itemId)) {
      return this.gameState.resources.faith >= 5 || this.gameState.resources.science >= 3;
    }

    const premiumItems = ['skill_crystal', 'master_crystal', 'advanced_blueprint'];
    if (premiumItems.includes(itemId)) {
      return this.getMarketReputation() >= 50;
    }

    const rareItems = ['void_fragment', 'phoenix_feather'];
    if (rareItems.includes(itemId)) {
      return this.getMarketReputation() >= 200;
    }

    return true;
  }

  getRecommendedItems() {
    const recommendations = [];
    const currentResources = this.gameState.resources;

    // Рекомендации на основе нехватки ресурсов
    Object.entries(currentResources).forEach(([resource, amount]) => {
      if (amount < 10) {
        const item = this.marketItems.find(i =>
          i.reward[resource] && i.reward[resource] > 0
        );
        if (item && this.canAfford(item.id)) {
          recommendations.push({
            ...this.getItemInfo(item.id),
            reason: `Low ${resource} (${amount})`
          });
        }
      }
    });

    // Рекомендация по энергии
    if (this.gameState.energy && this.gameState.energy.current < 30) {
      const energyItem = this.marketItems.find(i => i.reward.energy && i.reward.energy > 0);
      if (energyItem && this.canAfford(energyItem.id)) {
        recommendations.push({
          ...this.getItemInfo(energyItem.id),
          reason: 'Low energy'
        });
      }
    }

    // Рекомендация для избытка золота
    if (currentResources.gold > 30000 && this.canAfford('skill_crystal')) {
      recommendations.push({
        ...this.getItemInfo('skill_crystal'),
        reason: 'Invest excess gold in skill points'
      });
    }

    return recommendations.slice(0, 3);
  }

  getDebugInfo() {
    return {
      isDataLoaded: this.isDataLoaded,
      marketItemsCount: this.marketItems.length,
      categoriesCount: Object.keys(this.marketCategories).length,
      gameStateMarketExists: !!this.gameState.market,
      reputation: this.getMarketReputation(),
      purchaseHistoryLength: this.getPurchaseHistory().length,
      reputationDiscount: this.getReputationDiscount(),
      marketDiscount: this.getMarketDiscount()
    };
  }

  async reloadMarketData() {
    try {
      console.log('🔄 Reloading market data...');
      dataLoader.clearCache();
      await this.loadMarketData();
      this.validateMarketData();
      console.log('✅ Market data reloaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to reload market data:', error);
      return false;
    }
  }

  destroy() {
    console.log('🧹 MarketManager cleanup started');
    super.destroy();
    console.log('✅ MarketManager destroyed');
  }
}