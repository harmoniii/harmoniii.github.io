// managers/MarketManager.js - Система торговли
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';
import { getResourceEmoji } from '../config/ResourceConfig.js';

// Категории маркета
export const MARKET_CATEGORIES = {
  resources: 'Basic Resources',
  advanced: 'Advanced Materials',
  special: 'Special Items',
  premium: 'Premium Goods',
  energy: 'Enegry Replenish'
};

// Товары маркета
export const ADAPTIVE_MARKET_ITEMS = [
  {
    id: 'wood',
    name: 'Wood',
    icon: '🌲',
    description: 'Basic building material',
    basePrice: { gold: 500 }, // снижено
    reward: { wood: 1 },
    category: 'resources',
    adaptive: true, // новое поле
    scalingFactor: 1.1 // цена растет на 10% за каждую покупку
  },
  {
    id: 'stone',
    name: 'Stone',
    icon: '🪨',
    description: 'Construction material',
    basePrice: { gold: 500 },
    reward: { stone: 1 },
    category: 'resources',
    adaptive: true,
    scalingFactor: 1.1
  },
  {
    id: 'energy_pack',
    name: 'Energy Pack',
    icon: '⚡',
    description: 'Immediate energy restoration',
    basePrice: { gold: 1000 }, // снижено
    reward: { energy: 25 }, // уменьшено
    category: 'advanced',
    adaptive: true,
    scalingFactor: 1.15 // растет быстрее
  },
  {
    id: 'skill_crystal',
    name: 'Skill Crystal',
    icon: '💎',
    description: 'Crystallized knowledge',
    basePrice: { gold: 5000, science: 3, faith: 2 }, // снижено
    reward: { skillPoints: 2 }, // уменьшено с 3
    category: 'premium',
    adaptive: true,
    scalingFactor: 1.25 // растет значительно
  }
];

export class MarketManager extends CleanupMixin {
  constructor(gameState) {
    super();
    
    this.gameState = gameState;
    
    this.initializeMarket();
    
    console.log('🛒 MarketManager initialized');
  }

  // Инициализация маркета
  initializeMarket() {
    // Создаем объект маркета если его нет
    if (!this.gameState.market) {
      this.gameState.market = {
        dailyDeals: [],
        purchaseHistory: [],
        reputation: 0,
        permanentBonuses: {}
      };
    }
    
    // Валидируем данные маркета
    this.validateMarketData();
  }

  // Валидация данных маркета
  validateMarketData() {
    const market = this.gameState.market;
    
    // Валидируем репутацию
    if (typeof market.reputation !== 'number' || isNaN(market.reputation)) {
      market.reputation = 0;
    } else {
      market.reputation = Math.max(0, Math.floor(market.reputation));
    }
    
    // Валидируем массивы
    if (!Array.isArray(market.dailyDeals)) {
      market.dailyDeals = [];
    }
    
    if (!Array.isArray(market.purchaseHistory)) {
      market.purchaseHistory = [];
    }
    
    // Валидируем постоянные бонусы
    if (!market.permanentBonuses || typeof market.permanentBonuses !== 'object') {
      market.permanentBonuses = {};
    }
    
    // Очищаем историю если она слишком большая
    if (market.purchaseHistory.length > 1000) {
      market.purchaseHistory = market.purchaseHistory.slice(-500);
    }
  }

  // Получить определение товара
  getItemDefinition(itemId) {
    return MARKET_ITEMS.find(item => item.id === itemId);
  }

calculateAdaptivePrice(itemId) {
  const item = this.getItemDefinition(itemId);
  if (!item || !item.adaptive) {
    return item.price;
  }
  
  // Считаем количество покупок этого товара
  const purchaseCount = this.gameState.market.purchaseHistory.filter(
    purchase => purchase.itemId === itemId
  ).length;
  
  // Рассчитываем масштабированную цену
  const scalingFactor = Math.pow(item.scalingFactor || 1.1, purchaseCount);
  const scaledPrice = {};
  
  Object.entries(item.basePrice).forEach(([resource, amount]) => {
    scaledPrice[resource] = Math.floor(amount * scalingFactor);
  });
  
  return scaledPrice;
}

  // Проверить, можем ли позволить себе товар
canAffordAdaptive(itemId) {
  const item = this.getItemDefinition(itemId);
  if (!item) return false;

  const price = item.adaptive ? 
    this.calculateAdaptivePrice(itemId) : 
    this.calculateEffectivePrice(item.price);
    
  return this.gameState.canAffordResources(price);
}

// Получить количество покупок товара
getPurchaseCount(itemId) {
  return this.gameState.market.purchaseHistory.filter(
    purchase => purchase.itemId === itemId
  ).length;
}

  // Купить товар
buyItem(itemId) {
  const item = this.getItemDefinition(itemId);
  if (!item) {
    console.warn(`Unknown item: ${itemId}`);
    return false;
  }

  // Используем адаптивную цену
  const effectivePrice = item.adaptive ? 
    this.calculateAdaptivePrice(itemId) : 
    this.calculateEffectivePrice(item.price);

  if (!this.gameState.canAffordResources(effectivePrice)) {
    console.warn(`Cannot afford item ${itemId}`);
    return false;
  }

  if (!this.gameState.spendResources(effectivePrice)) {
    console.warn(`Failed to spend resources for ${itemId}`);
    return false;
  }

  // Выдаем награды с возможными ограничениями
  if (!this.giveRewardsWithLimits(item.reward, itemId)) {
    this.refundResources(effectivePrice);
    return false;
  }

  // Записываем покупку с адаптивной ценой
  this.recordPurchase(item, effectivePrice);

  // Репутация растет медленнее для дорогих покупок
  const reputationGain = Math.max(1, Math.floor(10 / Math.sqrt(this.getPurchaseCount(itemId) + 1)));
  this.gameState.market.reputation = Math.min(
    this.gameState.market.reputation + reputationGain,
    1000
  );

  eventBus.emit(GameEvents.RESOURCE_CHANGED);
  eventBus.emit(GameEvents.ITEM_PURCHASED, { 
    item: item, 
    reputation: this.gameState.market.reputation,
    adaptivePrice: effectivePrice
  });

  console.log(`Purchased ${item.name} for`, effectivePrice);
  return true;
}

  // Выдать награды
giveRewardsWithLimits(rewards, itemId) {
  try {
    Object.entries(rewards).forEach(([resource, amount]) => {
      if (resource === 'skillPoints') {
        // Ограничиваем получение skill points
        const currentSP = Math.floor(this.gameState.skillPoints || 0);
        const purchaseCount = this.getPurchaseCount(itemId);
        
        // Уменьшаем награду skill points с каждой покупкой
        const reducedAmount = Math.max(1, Math.floor(amount * Math.pow(0.9, purchaseCount)));
        
        if (this.gameState.skillManager && 
            typeof this.gameState.skillManager.addSkillPoints === 'function') {
          this.gameState.skillManager.addSkillPoints(reducedAmount);
        } else {
          const newSP = Math.min(currentSP + reducedAmount, GAME_CONSTANTS.MAX_SKILL_POINTS);
          this.gameState.skillPoints = newSP;
          eventBus.emit(GameEvents.SKILL_POINTS_CHANGED, this.gameState.skillPoints);
        }
      } else if (resource === 'energy') {
        // Ограничиваем восстановление энергии
        const maxRestore = Math.min(amount, 50); // не больше 50 за раз
        if (this.gameState.energyManager) {
          this.gameState.energyManager.restoreEnergy(maxRestore, 'market_purchase');
        }
      } else if (resource === 'chaos' && amount < 0) {
        // Уменьшение хаоса
        const currentChaos = this.gameState.resources[resource] || 0;
        const actualReduction = Math.min(Math.abs(amount), currentChaos);
        this.gameState.resources[resource] = currentChaos - actualReduction;
      } else {
        // Обычные ресурсы
        this.gameState.addResource(resource, amount);
      }
    });
    return true;
  } catch (error) {
    console.warn('Error giving rewards:', error);
    return false;
  }
}

  // Вернуть ресурсы
  refundResources(price) {
    try {
      Object.entries(price).forEach(([resource, amount]) => {
        this.gameState.addResource(resource, amount);
      });
    } catch (error) {
      console.warn('Error refunding resources:', error);
    }
  }

  // Записать покупку в историю
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

  // Получить информацию о товаре
getItemInfo(itemId) {
  const item = this.getItemDefinition(itemId);
  if (!item) return null;

  // Используем адаптивную цену если доступна
  const effectivePrice = item.adaptive ? 
    this.calculateAdaptivePrice(itemId) : 
    this.calculateEffectivePrice(item.price);

  return {
    ...item,
    price: effectivePrice, // перезаписываем цену
    canAfford: this.canAffordAdaptive(itemId),
    priceText: this.formatPrice(effectivePrice),
    rewardText: this.formatReward(item.reward),
    effectivePrice: effectivePrice,
    purchaseCount: this.getPurchaseCount(itemId) // для отображения
  };
}

  // Форматировать награду
  formatReward(reward) {
    return Object.entries(reward)
      .map(([resource, amount]) => {
        const prefix = amount > 0 ? '+' : '';
        const emoji = getResourceEmoji(resource);
        return `${prefix}${amount} ${emoji}`;
      })
      .join(' + ');
  }

  // Получить все товары
  getAllItems() {
    return MARKET_ITEMS.map(item => this.getItemInfo(item.id)).filter(Boolean);
  }

  // Получить товары по категориям
  getItemsByCategory() {
    const categories = {};
    
    Object.keys(MARKET_CATEGORIES).forEach(cat => {
      categories[cat] = MARKET_ITEMS
        .filter(item => item.category === cat)
        .map(item => this.getItemInfo(item.id))
        .filter(Boolean);
    });
    
    return categories;
  }

  // Генерация ежедневных предложений
  generateDailyDeals() {
    const dealCount = 3;
    const availableItems = MARKET_ITEMS.filter(item => 
      item.category !== 'premium' // Исключаем премиум товары
    );
    
    const deals = [];
    const maxAttempts = availableItems.length * 2;
    let attempts = 0;
    
    while (deals.length < dealCount && attempts < maxAttempts) {
      const item = availableItems[Math.floor(Math.random() * availableItems.length)];
      if (!deals.find(deal => deal.id === item.id)) {
        // Создаем версию товара со скидкой
        const discountedItem = {
          ...item,
          id: `${item.id}_deal`,
          price: this.applyDiscount(item.price, 0.8), // 20% скидка
          isDeal: true,
          originalPrice: { ...item.price }
        };
        deals.push(discountedItem);
      }
      attempts++;
    }
    
    this.gameState.market.dailyDeals = deals;
    return deals;
  }

  // Применить скидку
  applyDiscount(price, multiplier) {
    const discountedPrice = {};
    Object.entries(price).forEach(([resource, amount]) => {
      discountedPrice[resource] = Math.max(1, Math.floor(amount * multiplier));
    });
    return discountedPrice;
  }

  // Получить репутацию маркета
  getMarketReputation() {
    return this.gameState.market.reputation || 0;
  }

  // Получить историю покупок
  getPurchaseHistory() {
    return this.gameState.market.purchaseHistory || [];
  }

  // Получить скидку на основе репутации
  getReputationDiscount() {
    const reputation = this.getMarketReputation();
    if (reputation >= 100) return 0.85; // 15% скидка
    if (reputation >= 50) return 0.9;   // 10% скидка
    if (reputation >= 25) return 0.95;  // 5% скидка
    return 1.0; // Без скидки
  }

  // Получить постоянные бонусы
  getPermanentBonuses() {
    return this.gameState.market.permanentBonuses || {};
  }

  // Получить статистику маркета
  getMarketStats() {
    const history = this.getPurchaseHistory();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    return {
      totalPurchases: history.length,
      todayPurchases: history.filter(p => now - p.timestamp < dayMs).length,
      reputation: this.getMarketReputation(),
      discount: Math.floor((1 - this.getReputationDiscount()) * 100),
      favoriteCategory: this.getFavoriteCategory(history),
      totalSpent: this.calculateTotalSpent(history),
      permanentBonuses: this.getPermanentBonuses()
    };
  }

  // Получить любимую категорию
  getFavoriteCategory(history) {
    const categoryCount = {};
    
    history.forEach(purchase => {
      const item = MARKET_ITEMS.find(i => i.id === purchase.itemId);
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
    
    return MARKET_CATEGORIES[favoriteCategory] || favoriteCategory;
  }

  // Рассчитать общие траты
  calculateTotalSpent(history) {
    const totalSpent = {};
    
    history.forEach(purchase => {
      Object.entries(purchase.price).forEach(([resource, amount]) => {
        totalSpent[resource] = (totalSpent[resource] || 0) + amount;
      });
    });
    
    return totalSpent;
  }

  // Проверить доступность товара
  isItemUnlocked(itemId) {
    // Простая система разблокировки - можно расширить
    const basicItems = ['wood', 'stone', 'food', 'water', 'iron', 'resource_bundle'];
    if (basicItems.includes(itemId)) {
      return true;
    }

    // Продвинутые товары требуют определенного прогресса
    const advancedItems = ['energy_pack', 'science_book'];
    if (advancedItems.includes(itemId)) {
      return this.gameState.resources.energy >= 1 || this.gameState.resources.science >= 1;
    }

    // Специальные товары требуют веры или науки
    const specialItems = ['faith_relic', 'chaos_neutralizer'];
    if (specialItems.includes(itemId)) {
      return this.gameState.resources.faith >= 5 || this.gameState.resources.science >= 3;
    }

    // Премиум товары требуют высокой репутации
    const premiumItems = ['skill_crystal', 'golden_charm'];
    if (premiumItems.includes(itemId)) {
      return this.getMarketReputation() >= 50;
    }

    return true;
  }

  // Получить рекомендованные товары
  getRecommendedItems() {
    const recommendations = [];
    const currentResources = this.gameState.resources;
    
    // Рекомендуем ресурсы, которых мало
    Object.entries(currentResources).forEach(([resource, amount]) => {
      if (amount < 10) {
        const item = MARKET_ITEMS.find(i => 
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
    
    // Рекомендуем skill crystal если много золота
    if (currentResources.gold > 30000 && this.canAfford('skill_crystal')) {
      recommendations.push({
        ...this.getItemInfo('skill_crystal'),
        reason: 'Invest excess gold in skill points'
      });
    }
    
    return recommendations.slice(0, 3); // Максимум 3 рекомендации
  }

  // Деструктор
  destroy() {
    console.log('🧹 MarketManager cleanup started');
    
    // Вызываем родительский деструктор
    super.destroy();
    
    console.log('✅ MarketManager destroyed');
  }
}