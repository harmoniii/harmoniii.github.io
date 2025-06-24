// market.js - Модуль управления маркетом
import { EventBus } from './eventBus.js';

// Определения товаров в маркете
export const MARKET_ITEMS = [
  {
    id: 'wood',
    name: 'Wood',
    icon: '🌲',
    description: 'Essential building material',
    price: { gold: 2000 },
    reward: { wood: 1 },
    category: 'resources'
  },
  {
    id: 'stone',
    name: 'Stone',
    icon: '🪨',
    description: 'Durable construction material',
    price: { gold: 2000 },
    reward: { stone: 1 },
    category: 'resources'
  },
  {
    id: 'food',
    name: 'Food',
    icon: '🍎',
    description: 'Sustenance for your people',
    price: { gold: 2000 },
    reward: { food: 1 },
    category: 'resources'
  },
  {
    id: 'water',
    name: 'Water',
    icon: '💧',
    description: 'Life-giving liquid',
    price: { gold: 2000 },
    reward: { water: 1 },
    category: 'resources'
  },
  {
    id: 'iron',
    name: 'Iron',
    icon: '⛓️',
    description: 'Strong metal for tools and weapons',
    price: { gold: 2000 },
    reward: { iron: 1 },
    category: 'resources'
  },
  {
    id: 'energy_pack',
    name: 'Energy Pack',
    icon: '⚡',
    description: 'Instant energy boost',
    price: { gold: 5000 },
    reward: { energy: 3 },
    category: 'advanced'
  },
  {
    id: 'science_book',
    name: 'Science Book',
    icon: '📚',
    description: 'Knowledge compilation',
    price: { gold: 8000, iron: 5 },
    reward: { science: 2 },
    category: 'advanced'
  },
  {
    id: 'faith_relic',
    name: 'Faith Relic',
    icon: '✨',
    description: 'Sacred artifact that increases faith',
    price: { gold: 10000, stone: 20 },
    reward: { faith: 5 },
    category: 'special'
  },
  {
    id: 'chaos_neutralizer',
    name: 'Chaos Neutralizer',
    icon: '🕊️',
    description: 'Reduces chaos in your realm',
    price: { gold: 15000, science: 3 },
    reward: { chaos: -10 }, // Отрицательное значение - уменьшает хаос
    category: 'special'
  },
  {
    id: 'skill_crystal',
    name: 'Skill Crystal',
    icon: '💎',
    description: 'Crystallized knowledge that grants skill points',
    price: { gold: 20000, science: 5, faith: 3 },
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
  }

  canAfford(itemId) {
    const item = MARKET_ITEMS.find(i => i.id === itemId);
    if (!item) return false;

    return Object.entries(item.price).every(([resource, amount]) => 
      (this.state.resources[resource] || 0) >= amount
    );
  }

  getItemInfo(itemId) {
    const item = MARKET_ITEMS.find(i => i.id === itemId);
    if (!item) return null;

    return {
      ...item,
      canAfford: this.canAfford(itemId),
      priceText: this.formatPrice(item.price),
      rewardText: this.formatReward(item.reward)
    };
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

    if (!this.canAfford(itemId)) return false;

    // Списываем ресурсы
    Object.entries(item.price).forEach(([resource, amount]) => {
      this.state.resources[resource] -= amount;
    });

    // Выдаем награду
    Object.entries(item.reward).forEach(([resource, amount]) => {
      if (resource === 'skillPoints') {
        // Специальная обработка для skill points
        this.state.skillPoints = Math.floor((this.state.skillPoints || 0) + amount);
        EventBus.emit('skillPointsChanged', this.state.skillPoints);
      } else if (resource === 'chaos' && amount < 0) {
        // Специальная обработка для уменьшения хаоса
        this.state.resources[resource] = Math.max(0, 
          (this.state.resources[resource] || 0) + amount);
      } else {
        this.state.resources[resource] = 
          (this.state.resources[resource] || 0) + amount;
      }
    });

    // Добавляем в историю покупок
    this.state.market.purchaseHistory.push({
      itemId: itemId,
      timestamp: Date.now(),
      price: { ...item.price },
      reward: { ...item.reward }
    });

    // Увеличиваем репутацию
    this.state.market.reputation += 1;

    EventBus.emit('resourceChanged');
    EventBus.emit('itemPurchased', { 
      item: item, 
      reputation: this.state.market.reputation 
    });

    return true;
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

  // Функция для генерации ежедневных предложений (если потребуется)
  generateDailyDeals() {
    const dealCount = 3;
    const availableItems = MARKET_ITEMS.filter(item => 
      item.category !== 'premium' // Исключаем премиум товары из ежедневных предложений
    );
    
    const deals = [];
    while (deals.length < dealCount && deals.length < availableItems.length) {
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
    return this.state.market.reputation;
  }

  getPurchaseHistory() {
    return this.state.market.purchaseHistory;
  }

  // Получить скидку на основе репутации
  getReputationDiscount() {
    const reputation = this.state.market.reputation;
    if (reputation >= 50) return 0.9; // 10% скидка
    if (reputation >= 25) return 0.95; // 5% скидка
    return 1.0; // Без скидки
  }
}