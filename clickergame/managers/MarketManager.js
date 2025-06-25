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
    price: { gold: 5000 },
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
          // Специальная обработка