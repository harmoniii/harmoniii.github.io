// managers/AchievementManager.js - Система достижений
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';

// Определения достижений
export const ACHIEVEMENT_DEFS = [
  // Достижения за клики
  {
    id: 'clicks_100',
    name: '🖱️ First Clicks',
    description: 'Click 100 times',
    category: 'clicks',
    target: 100,
    reward: { skillPoints: 2 },
    icon: '🖱️'
  },
  {
    id: 'clicks_500',
    name: '🖱️ Clicking Master',
    description: 'Click 500 times',
    category: 'clicks',
    target: 500,
    reward: { skillPoints: 5 },
    icon: '🖱️'
  },
  {
    id: 'clicks_1000',
    name: '🖱️ Click Champion',
    description: 'Click 1000 times',
    category: 'clicks',
    target: 1000,
    reward: { skillPoints: 10 },
    icon: '🖱️'
  },
  {
    id: 'clicks_5000',
    name: '🖱️ Click Legend',
    description: 'Click 5000 times',
    category: 'clicks',
    target: 5000,
    reward: { skillPoints: 25 },
    icon: '🖱️'
  },

  // Достижения за комбо
  {
    id: 'combo_10',
    name: '🔥 Combo Starter',
    description: 'Reach combo of 10',
    category: 'combo',
    target: 10,
    reward: { skillPoints: 1 },
    icon: '🔥'
  },
  {
    id: 'combo_50',
    name: '🔥 Combo Expert',
    description: 'Reach combo of 50',
    category: 'combo',
    target: 50,
    reward: { skillPoints: 5 },
    icon: '🔥'
  },
  {
    id: 'combo_100',
    name: '🔥 Combo Master',
    description: 'Reach combo of 100',
    category: 'combo',
    target: 100,
    reward: { skillPoints: 15 },
    icon: '🔥'
  },

  // Достижения за общие ресурсы
  {
    id: 'total_resources_100',
    name: '💰 Resource Gatherer',
    description: 'Collect 100 total resources',
    category: 'total_resources',
    target: 100,
    reward: { skillPoints: 2 },
    icon: '💰'
  },
  {
    id: 'total_resources_500',
    name: '💰 Resource Collector',
    description: 'Collect 500 total resources',
    category: 'total_resources',
    target: 500,
    reward: { skillPoints: 5 },
    icon: '💰'
  },
  {
    id: 'total_resources_1000',
    name: '💰 Resource Hoarder',
    description: 'Collect 1000 total resources',
    category: 'total_resources',
    target: 1000,
    reward: { skillPoints: 10 },
    icon: '💰'
  },
  {
    id: 'total_resources_5000',
    name: '💰 Resource Tycoon',
    description: 'Collect 5000 total resources',
    category: 'total_resources',
    target: 5000,
    reward: { skillPoints: 25 },
    icon: '💰'
  },

  // Достижения за конкретные ресурсы
  {
    id: 'gold_100',
    name: '🪙 Gold Collector',
    description: 'Collect 100 gold',
    category: 'gold',
    target: 100,
    reward: { skillPoints: 1 },
    icon: '🪙'
  },
  {
    id: 'gold_1000',
    name: '🪙 Gold Hoarder',
    description: 'Collect 1000 gold',
    category: 'gold',
    target: 1000,
    reward: { skillPoints: 3 },
    icon: '🪙'
  },
  {
    id: 'wood_100',
    name: '🌲 Lumberjack',
    description: 'Collect 100 wood',
    category: 'wood',
    target: 100,
    reward: { skillPoints: 1 },
    icon: '🌲'
  },
  {
    id: 'wood_1000',
    name: '🌲 Forest Master',
    description: 'Collect 1000 wood',
    category: 'wood',
    target: 1000,
    reward: { skillPoints: 3 },
    icon: '🌲'
  },
  {
    id: 'stone_100',
    name: '🪨 Stone Gatherer',
    description: 'Collect 100 stone',
    category: 'stone',
    target: 100,
    reward: { skillPoints: 1 },
    icon: '🪨'
  },
  {
    id: 'stone_1000',
    name: '🪨 Quarry Master',
    description: 'Collect 1000 stone',
    category: 'stone',
    target: 1000,
    reward: { skillPoints: 3 },
    icon: '🪨'
  }
];

export class AchievementManager extends CleanupMixin {
  constructor(gameState) {
    super();
    
    this.gameState = gameState;
    this.statistics = {
      totalClicks: 0,
      maxCombo: 0,
      resourcesCollected: {},
      totalResourcesCollected: 0
    };
    
    this.initializeAchievements();
    this.bindEvents();
    
    console.log('🏆 AchievementManager initialized');
  }

  // Инициализация достижений
  initializeAchievements() {
    if (!this.gameState.achievements) {
      this.gameState.achievements = {
        completed: new Set(),
        statistics: { ...this.statistics }
      };
    }
    
    // Восстанавливаем статистику из сохранения
    if (this.gameState.achievements.statistics) {
      this.statistics = { ...this.gameState.achievements.statistics };
    }
    
    // Преобразуем массив в Set если нужно
    if (Array.isArray(this.gameState.achievements.completed)) {
      this.gameState.achievements.completed = new Set(this.gameState.achievements.completed);
    }
  }

  // Привязка событий
  bindEvents() {
    // Отслеживаем клики
    eventBus.subscribe(GameEvents.CLICK, () => {
      this.statistics.totalClicks++;
      this.checkAchievements('clicks');
    });

    // Отслеживаем изменения комбо
    eventBus.subscribe(GameEvents.COMBO_CHANGED, (data) => {
      const comboCount = data.count || 0;
      if (comboCount > this.statistics.maxCombo) {
        this.statistics.maxCombo = comboCount;
        this.checkAchievements('combo');
      }
    });

    // Отслеживаем изменения ресурсов
    eventBus.subscribe(GameEvents.RESOURCE_GAINED, (data) => {
      if (data.resource && data.amount) {
        this.addResourceStatistic(data.resource, data.amount);
      }
    });

    // Также отслеживаем общие изменения ресурсов
    eventBus.subscribe(GameEvents.RESOURCE_CHANGED, () => {
      this.updateResourceStatistics();
    });
  }

  // Добавить статистику ресурса
  addResourceStatistic(resourceName, amount) {
    if (!this.statistics.resourcesCollected[resourceName]) {
      this.statistics.resourcesCollected[resourceName] = 0;
    }
    
    this.statistics.resourcesCollected[resourceName] += amount;
    this.statistics.totalResourcesCollected += amount;
    
    // Проверяем достижения для конкретного ресурса
    this.checkAchievements(resourceName);
    this.checkAchievements('total_resources');
  }

  // Обновить статистику ресурсов (fallback)
  updateResourceStatistics() {
    if (!this.gameState.resources) return;
    
    let totalResources = 0;
    Object.entries(this.gameState.resources).forEach(([resource, amount]) => {
      if (typeof amount === 'number' && amount > 0) {
        if (!this.statistics.resourcesCollected[resource]) {
          this.statistics.resourcesCollected[resource] = 0;
        }
        // Обновляем только если текущее значение больше сохраненного
        if (amount > this.statistics.resourcesCollected[resource]) {
          this.statistics.resourcesCollected[resource] = amount;
        }
        totalResources += this.statistics.resourcesCollected[resource];
      }
    });
    
    if (totalResources > this.statistics.totalResourcesCollected) {
      this.statistics.totalResourcesCollected = totalResources;
      this.checkAchievements('total_resources');
    }
  }

  // Проверить достижения для категории
  checkAchievements(category) {
    const relevantAchievements = ACHIEVEMENT_DEFS.filter(achievement => 
      achievement.category === category && 
      !this.gameState.achievements.completed.has(achievement.id)
    );

    relevantAchievements.forEach(achievement => {
      if (this.isAchievementCompleted(achievement)) {
        this.completeAchievement(achievement);
      }
    });

    // Сохраняем статистику
    this.gameState.achievements.statistics = { ...this.statistics };
  }

  // Проверить, выполнено ли достижение
  isAchievementCompleted(achievement) {
    const currentValue = this.getCurrentValue(achievement.category);
    return currentValue >= achievement.target;
  }

  // Получить текущее значение для категории
  getCurrentValue(category) {
    switch (category) {
      case 'clicks':
        return this.statistics.totalClicks;
      case 'combo':
        return this.statistics.maxCombo;
      case 'total_resources':
        return this.statistics.totalResourcesCollected;
      default:
        // Для конкретных ресурсов
        return this.statistics.resourcesCollected[category] || 0;
    }
  }

  // Завершить достижение
  completeAchievement(achievement) {
    console.log(`🏆 Achievement completed: ${achievement.name}`);
    
    // Добавляем в список завершенных
    this.gameState.achievements.completed.add(achievement.id);
    
    // Выдаем награды
    this.giveRewards(achievement.reward);
    
    // Показываем уведомление
    this.showAchievementNotification(achievement);
    
    // Эмитируем событие
    eventBus.emit(GameEvents.SKILL_NOTIFICATION, {
      title: `🏆 Achievement Unlocked!`,
      description: `${achievement.name}: ${achievement.description}`
    });
  }

  // Выдать награды
  giveRewards(reward) {
    if (reward.skillPoints && this.gameState.skillManager) {
      this.gameState.skillManager.addSkillPoints(reward.skillPoints);
      eventBus.emit(GameEvents.SKILL_POINTS_CHANGED, this.gameState.skillPoints);
    }
    
    if (reward.resources) {
      Object.entries(reward.resources).forEach(([resource, amount]) => {
        this.gameState.addResource(resource, amount);
      });
      eventBus.emit(GameEvents.RESOURCE_CHANGED);
    }
  }

  // Показать уведомление о достижении
  showAchievementNotification(achievement) {
    const rewardText = this.formatReward(achievement.reward);
    eventBus.emit(GameEvents.NOTIFICATION, 
      `🏆 ${achievement.name} completed! Reward: ${rewardText}`
    );
  }

  // Форматировать награду для отображения
  formatReward(reward) {
    const parts = [];
    
    if (reward.skillPoints) {
      parts.push(`+${reward.skillPoints} ✨ Skill Points`);
    }
    
    if (reward.resources) {
      Object.entries(reward.resources).forEach(([resource, amount]) => {
        parts.push(`+${amount} ${resource}`);
      });
    }
    
    return parts.join(', ') || 'Experience';
  }

  // Получить все достижения с прогрессом
  getAllAchievements() {
    return ACHIEVEMENT_DEFS.map(achievement => ({
      ...achievement,
      completed: this.gameState.achievements.completed.has(achievement.id),
      progress: this.getCurrentValue(achievement.category),
      progressPercent: Math.min(100, (this.getCurrentValue(achievement.category) / achievement.target) * 100)
    }));
  }

  // Получить достижения по категориям
  getAchievementsByCategory() {
    const categories = {};
    
    this.getAllAchievements().forEach(achievement => {
      const category = achievement.category;
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(achievement);
    });
    
    return categories;
  }

  // Получить завершенные достижения
  getCompletedAchievements() {
    return this.getAllAchievements().filter(achievement => achievement.completed);
  }

  // Получить доступные достижения (не завершенные)
  getAvailableAchievements() {
    return this.getAllAchievements().filter(achievement => !achievement.completed);
  }

  // Получить ближайшие к завершению достижения
  getNearCompletionAchievements(threshold = 0.8) {
    return this.getAvailableAchievements()
      .filter(achievement => achievement.progressPercent >= threshold * 100)
      .sort((a, b) => b.progressPercent - a.progressPercent);
  }

  // Получить статистику достижений
  getAchievementStats() {
    const allAchievements = this.getAllAchievements();
    const completed = allAchievements.filter(a => a.completed);
    
    return {
      total: allAchievements.length,
      completed: completed.length,
      completionPercent: (completed.length / allAchievements.length) * 100,
      totalSkillPointsEarned: completed.reduce((sum, a) => sum + (a.reward.skillPoints || 0), 0),
      statistics: { ...this.statistics }
    };
  }

  // Принудительно проверить все достижения (для отладки)
  forceCheckAllAchievements() {
    console.log('🔍 Force checking all achievements...');
    
    const categories = [...new Set(ACHIEVEMENT_DEFS.map(a => a.category))];
    categories.forEach(category => {
      this.checkAchievements(category);
    });
  }

  // Сбросить достижения (для отладки)
  resetAchievements() {
    console.log('🔄 Resetting all achievements...');
    
    this.gameState.achievements = {
      completed: new Set(),
      statistics: {
        totalClicks: 0,
        maxCombo: 0,
        resourcesCollected: {},
        totalResourcesCollected: 0
      }
    };
    
    this.statistics = { ...this.gameState.achievements.statistics };
  }

  // Получить данные для сохранения
  getSaveData() {
    return {
      completed: Array.from(this.gameState.achievements.completed),
      statistics: { ...this.statistics }
    };
  }

  // Загрузить данные из сохранения
  loadSaveData(data) {
    if (data && typeof data === 'object') {
      this.gameState.achievements = {
        completed: new Set(data.completed || []),
        statistics: data.statistics || this.statistics
      };
      
      this.statistics = { ...this.gameState.achievements.statistics };
    }
  }

  // Деструктор
  destroy() {
    console.log('🧹 AchievementManager cleanup started');
    
    // Сохраняем финальную статистику
    this.gameState.achievements.statistics = { ...this.statistics };
    
    super.destroy();
    
    console.log('✅ AchievementManager destroyed');
  }
}