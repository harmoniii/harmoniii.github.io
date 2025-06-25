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
  premium: 'Premium Goods'
};

// Товары маркета
export const MARKET_ITEMS = [
  {
    id: 'wood',
    name: 'Wood',
    icon: '🌲',
    description: 'Essential building material',
    price: { gold: GAME_CONSTANTS.BASIC_RESOURCE_PRICE },
    reward: { wood: 1 },
    category: 'resources'
  },
  {
    id: 'stone',
    name: 'Stone',
    icon: '🪨',
    description: 'Durable construction material',
    price: { gold: GAME_CONSTANTS.BASIC_RESOURCE_PRICE },
    reward: { stone: 1 },
    category: 'resources'
  },
  {
    id: 'food',
    name: 'Food',
    icon: '🍎',
    description: 'Sustenance for your people',
    price: { gold: GAME_CONSTANTS.BASIC_RESOURCE_PRICE },
    reward: { food: 1 },
    category: 'resources'
  },
  {
    id: 'water',
    name: 'Water',
    icon: '💧',
    description: 'Life-giving liquid',
    price: { gold: GAME_CONSTANTS.BASIC_RESOURCE_PRICE },
    reward: { water: 1 },
    category: 'resources'
  },
  {
    id: 'iron',
    name: 'Iron',
    icon: '⛓️',
    description: 'Strong metal for tools and weapons',
    price: { gold: GAME_CONSTANTS.BASIC_RESOURCE_PRICE },
    reward: { iron: 1 },
    category: 'resources'
  },
  {
    id: 'energy_pack',
    name: 'Energy Pack',
    icon: '⚡',
    description: 'Instant energy boost',
    price: { gold: GAME_CONSTANTS.ENERGY_PACK_PRICE },
    reward: { energy: 3 },
    category: 'advanced'
  },
  {
    id: 'science_book',
    name: 'Science Book',
    icon: '📚',
    description: 'Knowledge compilation',
    price: { gold: GAME_CONSTANTS.SCIENCE_BOOK_PRICE, iron: 5 },
    reward: { science: 2 },
    category: 'advanced'
  },
  {
    id: 'faith_relic',
    name: 'Faith Relic',
    icon: '✨',
    description: 'Sacred artifact that increases faith',
    price: { gold: GAME_CONSTANTS.FAITH_RELIC_PRICE, stone: 20 },
    reward: { faith: 5 },
    category: 'special'
  },
  {
    id: 'chaos_neutralizer',
    name: 'Chaos Neutralizer',
    icon: '🕊️',
    description: 'Reduces chaos in your realm',
    price: { gold: GAME_CONSTANTS.CHAOS_NEUTRALIZER_PRICE, science: 3 },
    reward: { chaos: -10 }, // Отрицательное значение - уменьшает хаос
    category: 'special'
  },
  {
    id: 'skill_crystal',
    name: 'Skill Crystal',
    icon: '💎',
    description: 'Crystallized knowledge that grants skill points',
    price: { gold: GAME_CONSTANTS.SKILL_CRYSTAL_PRICE, science: 5, faith: 3 },
    reward: { skillPoints: 3 },
    category: 'premium'
  },
  {
    id: 'resource_bundle',
    name: 'Resource Bundle',
    icon: '📦',
    description: 'Mixed package of basic resources',
    price: { gold: 50000 },
    reward: { wood: 10, stone: 10, food: 10, water: 10, iron: 5 },
    category: 'resources'
  },
  {
    id: 'golden_charm',
    name: 'Golden Charm',
    icon: '🏅',
    description: 'Increases gold generation permanently',
    price: { gold: 50000, faith: 10 },
    reward: { goldBonus: 0.1 }, // 10% постоянный бонус к золоту
    category: 'premium'
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

  // Проверить, можем ли позволить себе товар
  canAfford(itemId) {
    const item = this.getItemDefinition(itemId);
    if (!item) return false;

    const effectivePrice = this.calculateEffectivePrice(item.price);
    return this.gameState.canAffordResources(effectivePrice);
  }

  // Рассчитать эффективную цену с учетом скидок
  calculateEffectivePrice(basePrice) {
    const discount = this.getReputationDiscount();
    const effectivePrice = {};
    
    Object.entries(basePrice).forEach(([resource, amount]) => {
      effectivePrice[resource] = Math.max(1, Math.floor(amount * discount));
    });
    
    return effectivePrice;
  }

  // Купить товар
  buyItem(itemId) {
    const item = this.getItemDefinition(itemId);
    if (!item) {
      console.warn(`Unknown item: ${itemId}`);
      return false;
    }

    // Проверяем можем ли купить (с учетом скидки)
    const effectivePrice = this.calculateEffectivePrice(item.price);
    if (!this.gameState.canAffordResources(effectivePrice)) {
      console.warn(`Cannot afford item ${itemId}`);
      return false;
    }

    // Списываем ресурсы
    if (!this.gameState.spendResources(effectivePrice)) {
      console.warn(`Failed to spend resources for ${itemId}`);
      return false;
    }

    // Выдаем награды
    if (!this.giveRewards(item.reward)) {
      // Если не удалось выдать награды, возвращаем ресурсы
      this.refundResources(effectivePrice);
      return false;
    }

    // Записываем покупку в историю
    this.recordPurchase(item, effectivePrice);

    // Увеличиваем репутацию
    this.gameState.market.reputation = Math.min(
      this.gameState.market.reputation + 1,
      1000 // Максимальная репутация
    );

    eventBus.emit(GameEvents.RESOURCE_CHANGED);
    eventBus.emit(GameEvents.ITEM_PURCHASED, { 
      item: item, 
      reputation: this.gameState.market.reputation 
    });

    console.log(`Purchased ${item.name} for`, effectivePrice);
    return true;
  }

  // Выдать награды
  giveRewards(rewards) {
    try {
      Object.entries(rewards).forEach(([resource, amount]) => {
        if (resource === 'skillPoints') {
          // Специальная обработка для skill points
          if (this.gameState.skillManager && 
              typeof this.gameState.skillManager.addSkillPoints === 'function') {
            this.gameState.skillManager.addSkillPoints(amount);
          } else {
            const currentSP = Math.floor(this.gameState.skillPoints || 0);
            const newSP = Math.min(currentSP + Math.floor(amount), GAME_CONSTANTS.MAX_SKILL_POINTS);
            this.gameState.skillPoints = newSP;
            eventBus.emit(GameEvents.SKILL_POINTS_CHANGED, this.gameState.skillPoints);
          }
        } else if (resource === 'goldBonus') {
          // Постоянный бонус к золоту
          if (!this.gameState.market.permanentBonuses.goldBonus) {
            this.gameState.market.permanentBonuses.goldBonus = 0;
          }
          this.gameState.market.permanentBonuses.goldBonus += amount;
        } else if (resource === 'chaos' && amount < 0) {
          // Специальная обработка для уменьшения хаоса
          const currentChaos = this.gameState.resources[resource] || 0;
          const newChaos = Math.max(0, currentChaos + amount);
          this.gameState.resources[resource] = newChaos;
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

    return {
      ...item,
      canAfford: this.canAfford(itemId),
      priceText: this.formatPrice(item.price),
      rewardText: this.formatReward(item.reward),
      effectivePrice: this.calculateEffectivePrice(item.price)
    };
  }

  // Форматировать цену
  formatPrice(price) {
    return Object.entries(price)
      .map(([resource, amount]) => `${amount} ${getResourceEmoji(resource)}`)
      .join(' + ');
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