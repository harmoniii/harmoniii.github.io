// market.js - Исправленная версия с константами и общей валидацией
import { EventBus } from './eventBus.js';
import { GAME_CONSTANTS } from './config.js';

// ИСПРАВЛЕНИЕ 17: Использование констант вместо magic numbers
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
  }
];

export const MARKET_CATEGORIES = {
  resources: 'Basic Resources',
  advanced: 'Advanced Materials',
  special: 'Special Items',
  premium: 'Premium Goods'
};

// ИСПРАВЛЕНИЕ 16: Базовый класс для валидации ресурсов (импортирован из buildings.js)
class MarketValidator {
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
  
  static giveRewards(state, rewards, skillManager = null) {
    try {
      Object.entries(rewards).forEach(([resource, amount]) => {
        if (resource === 'skillPoints') {
          // Специальная обработка для skill points
          if (skillManager && typeof skillManager.addSkillPoints === 'function') {
            skillManager.addSkillPoints(amount);
          } else {
            const currentSP = Math.floor(state.skillPoints || 0);
            const newSP = Math.min(currentSP + Math.floor(amount), GAME_CONSTANTS.MAX_SKILL_POINTS);
            state.skillPoints = newSP;
            EventBus.emit('skillPointsChanged', state.skillPoints);
          }
        } else if (resource === 'chaos' && amount < 0) {
          // Специальная обработка для уменьшения хаоса
          const currentChaos = state.resources[resource] || 0;
          const newChaos = Math.max(0, currentChaos + amount);
          state.resources[resource] = newChaos;
        } else {
          // Обычные ресурсы
          const currentAmount = state.resources[resource] || 0;
          const newAmount = Math.min(
            currentAmount + amount,
            GAME_CONSTANTS.MAX_SAFE_RESOURCE_VALUE
          );
          state.resources[resource] = newAmount;
        }
      });
      return true;
    } catch (error) {
      console.warn('Error giving rewards:', error);
      return false;
    }
  }
}

export class MarketManager {
  constructor(state) {
    this.state = state;
    this.initMarket();
  }

  initMarket() {
    // Инициализация состояния маркета если нужно
    if (!this.state.market) {
      this.state.market = {
        dailyDeals: [],
        purchaseHistory: [],
        reputation: 0
      };
    }
    
    // Валидируем существующие данные маркета
    this.validateMarketData();
  }

  validateMarketData() {
    const market = this.state.market;
    
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
    
    // Очищаем историю если она слишком большая (оптимизация памяти)
    if (market.purchaseHistory.length > 1000) {
      market.purchaseHistory = market.purchaseHistory.slice(-500);
    }
  }

  // ИСПРАВЛЕНИЕ 16: Использование общего метода валидации
  canAfford(itemId) {
    const item = MARKET_ITEMS.find(i => i.id === itemId);
    if (!item) return false;

    return MarketValidator.validateResources(this.state, item.price);
  }

  getItemInfo(itemId) {
    const item = MARKET_ITEMS.find(i => i.id === itemId);
    if (!item) return null;

    return {
      ...item,
      canAfford: this.canAfford(itemId),
      priceText: this.formatPrice(item.price),
      rewardText: this.formatReward(item.reward),
      effectivePrice: this.calculateEffectivePrice(item.price)
    };
  }

  calculateEffectivePrice(price) {
    const discount = this.getReputationDiscount();
    const effectivePrice = {};
    
    Object.entries(price).forEach(([resource, amount]) => {
      effectivePrice[resource] = Math.max(1, Math.floor(amount * discount));
    });
    
    return effectivePrice;
  }

  formatPrice(price) {
    return Object.entries(price)
      .map(([resource, amount]) => `${amount} ${this.getEmoji(resource)}`)
      .join(' + ');
  }

  formatReward(reward) {
    return Object.entries(reward)
      .map(([resource, amount]) => {
        const prefix = amount > 0 ? '+' : '';
        return `${prefix}${amount} ${this.getEmoji(resource)}`;
      })
      .join(' + ');
  }

  getEmoji(resource) {
    const emojis = {
      gold: '🪙', wood: '🌲', stone: '🪨', food: '🍎',
      water: '💧', iron: '⛓️', people: '👥', energy: '⚡',
      science: '🔬', faith: '🙏', chaos: '🌪️', skillPoints: '✨'
    };
    return emojis[resource] || resource;
  }

  buyItem(itemId) {
    const item = MARKET_ITEMS.find(i => i.id === itemId);
    if (!item) return false;

    // Проверяем можем ли купить (с учетом скидки)
    const effectivePrice = this.calculateEffectivePrice(item.price);
    if (!MarketValidator.validateResources(this.state, effectivePrice)) return false;

    // ИСПРАВЛЕНИЕ 16: Используем общие методы для транзакции
    if (!MarketValidator.spendResources(this.state, effectivePrice)) return false;
    if (!MarketValidator.giveRewards(this.state, item.reward, this.state.skillManager)) {
      // Если не удалось выдать награды, возвращаем ресурсы
      this.refundResources(effectivePrice);
      return false;
    }

    // Записываем покупку в историю
    this.recordPurchase(item, effectivePrice);

    // Увеличиваем репутацию
    this.state.market.reputation = Math.min(
      this.state.market.reputation + 1,
      1000 // Максимальная репутация
    );

    EventBus.emit('resourceChanged');
    EventBus.emit('itemPurchased', { 
      item: item, 
      reputation: this.state.market.reputation 
    });

    return true;
  }

  refundResources(price) {
    try {
      Object.entries(price).forEach(([resource, amount]) => {
        const currentAmount = this.state.resources[resource] || 0;
        const newAmount = Math.min(
          currentAmount + amount,
          GAME_CONSTANTS.MAX_SAFE_RESOURCE_VALUE
        );
        this.state.resources[resource] = newAmount;
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
        reputation: this.state.market.reputation
      };

      this.state.market.purchaseHistory.push(purchaseRecord);

      // Ограничиваем размер истории
      if (this.state.market.purchaseHistory.length > 1000) {
        this.state.market.purchaseHistory = this.state.market.purchaseHistory.slice(-500);
      }
    } catch (error) {
      console.warn('Error recording purchase:', error);
    }
  }

  getAllItems() {
    return MARKET_ITEMS.map(item => this.getItemInfo(item.id));
  }

  getItemsByCategory() {
    const categories = {};
    Object.keys(MARKET_CATEGORIES).forEach(cat => {
      categories[cat] = MARKET_ITEMS
        .filter(item => item.category === cat)
        .map(item => this.getItemInfo(item.id));
    });
    return categories;
  }

  // Функция для генерации ежедневных предложений
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
    
    this.state.market.dailyDeals = deals;
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
    return this.state.market.reputation || 0;
  }

  getPurchaseHistory() {
    return this.state.market.purchaseHistory || [];
  }

  // Получить скидку на основе репутации
  getReputationDiscount() {
    const reputation = this.getMarketReputation();
    if (reputation >= 100) return 0.85; // 15% скидка
    if (reputation >= 50) return 0.9;   // 10% скидка
    if (reputation >= 25) return 0.95;  // 5% скидка
    return 1.0; // Без скидки
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
      totalSpent: this.calculateTotalSpent(history)
    };
  }

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

  calculateTotalSpent(history) {
    const totalSpent = {};
    
    history.forEach(purchase => {
      Object.entries(purchase.price).forEach(([resource, amount]) => {
        totalSpent[resource] = (totalSpent[resource] || 0) + amount;
      });
    });
    
    return totalSpent;
  }
}