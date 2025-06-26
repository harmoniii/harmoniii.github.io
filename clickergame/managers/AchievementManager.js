// managers/AchievementManager.js - ИСПРАВЛЕННАЯ система достижений с корректными milestones
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';

// ИСПРАВЛЕННЫЕ определения достижений с правильными milestones
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

  // ИСПРАВЛЕННЫЕ достижения за комбо - проверяют максимальное достигнутое комбо
  {
    id: 'combo_10',
    name: '🔥 Combo Starter',
    description: 'Reach a combo of 10',
    category: 'combo',
    target: 10,
    reward: { skillPoints: 1 },
    icon: '🔥'
  },
  {
    id: 'combo_25',
    name: '🔥 Combo Expert',
    description: 'Reach a combo of 25',
    category: 'combo',
    target: 25,
    reward: { skillPoints: 3 },
    icon: '🔥'
  },
  {
    id: 'combo_50',
    name: '🔥 Combo Master',
    description: 'Reach a combo of 50',
    category: 'combo',
    target: 50,
    reward: { skillPoints: 8 },
    icon: '🔥'
  },
  {
    id: 'combo_100',
    name: '🔥 Combo Legend',
    description: 'Reach a combo of 100',
    category: 'combo',
    target: 100,
    reward: { skillPoints: 20 },
    icon: '🔥'
  },

  // ИСПРАВЛЕННЫЕ достижения за общие ресурсы - проверяют накопленные ресурсы
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
    id: 'total_resources_1000',
    name: '💰 Resource Collector',
    description: 'Collect 1000 total resources',
    category: 'total_resources',
    target: 1000,
    reward: { skillPoints: 5 },
    icon: '💰'
  },
  {
    id: 'total_resources_5000',
    name: '💰 Resource Hoarder',
    description: 'Collect 5000 total resources',
    category: 'total_resources',
    target: 5000,
    reward: { skillPoints: 15 },
    icon: '💰'
  },
  {
    id: 'total_resources_10000',
    name: '💰 Resource Tycoon',
    description: 'Collect 10000 total resources',
    category: 'total_resources',
    target: 10000,
    reward: { skillPoints: 35 },
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
    id: 'gold_10000',
    name: '🪙 Gold Master',
    description: 'Collect 10000 gold',
    category: 'gold',
    target: 10000,
    reward: { skillPoints: 10 },
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
  },

  // НОВЫЕ достижения за энергию
  {
    id: 'energy_zones_10',
    name: '⚡ Energy Seeker',
    description: 'Hit 10 energy zones',
    category: 'energy_zones',
    target: 10,
    reward: { skillPoints: 2 },
    icon: '⚡'
  },
  {
    id: 'energy_zones_50',
    name: '⚡ Energy Master',
    description: 'Hit 50 energy zones',
    category: 'energy_zones',
    target: 50,
    reward: { skillPoints: 5 },
    icon: '⚡'
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
      totalResourcesCollected: 0,
      energyZonesHit: 0 // НОВЫЙ: счетчик энергетических зон
    };
    
    // ИСПРАВЛЕНИЕ: Добавляем проверку достижений при каждом событии
    this.lastCheckedValues = {
      clicks: 0,
      combo: 0,
      totalResources: 0,
      energyZones: 0
    };
    
    this.initializeAchievements();
    this.bindEvents();
    
    console.log('🏆 AchievementManager initialized with milestone tracking');
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
      // Добавляем новые поля если их нет
      if (this.statistics.energyZonesHit === undefined) {
        this.statistics.energyZonesHit = 0;
      }
    }
    
    // Преобразуем массив в Set если нужно
    if (Array.isArray(this.gameState.achievements.completed)) {
      this.gameState.achievements.completed = new Set(this.gameState.achievements.completed);
    }
    
    // Устанавливаем начальные проверочные значения
    this.lastCheckedValues = {
      clicks: this.statistics.totalClicks,
      combo: this.statistics.maxCombo,
      totalResources: this.statistics.totalResourcesCollected,
      energyZones: this.statistics.energyZonesHit
    };
  }

  // Привязка событий
  bindEvents() {
    // ИСПРАВЛЕНИЕ: Отслеживаем каждый клик и сразу проверяем достижения
    eventBus.subscribe(GameEvents.CLICK, () => {
      this.statistics.totalClicks++;
      this.checkClickAchievements();
      this.saveStatistics();
    });

    // ИСПРАВЛЕНИЕ: Отслеживаем изменения комбо и проверяем рекорды
    eventBus.subscribe(GameEvents.COMBO_CHANGED, (data) => {
      const comboCount = data.count || 0;
      if (comboCount > this.statistics.maxCombo) {
        this.statistics.maxCombo = comboCount;
        this.checkComboAchievements();
        this.saveStatistics();
      }
    });

    // ИСПРАВЛЕНИЕ: Отслеживаем получение ресурсов
    eventBus.subscribe(GameEvents.RESOURCE_GAINED, (data) => {
      if (data.resource && data.amount) {
        this.addResourceStatistic(data.resource, data.amount);
        this.checkResourceAchievements();
        this.saveStatistics();
      }
    });

    // НОВЫЙ: Отслеживаем попадания в энергетические зоны
    eventBus.subscribe(GameEvents.ENERGY_ZONE_HIT, (data) => {
      if (data.zoneType === 'energy') {
        this.statistics.energyZonesHit++;
        this.checkEnergyZoneAchievements();
        this.saveStatistics();
      }
    });

    // Также отслеживаем общие изменения ресурсов как fallback
    eventBus.subscribe(GameEvents.RESOURCE_CHANGED, () => {
      this.updateResourceStatistics();
    });
  }

  // ИСПРАВЛЕНИЕ: Новый метод для проверки достижений за клики
  checkClickAchievements() {
    const currentClicks = this.statistics.totalClicks;
    
    if (currentClicks !== this.lastCheckedValues.clicks) {
      console.log(`🏆 Checking click achievements: ${currentClicks} clicks`);
      this.checkAchievements('clicks');
      this.lastCheckedValues.clicks = currentClicks;
    }
  }

  // ИСПРАВЛЕНИЕ: Новый метод для проверки достижений за комбо
  checkComboAchievements() {
    const currentMaxCombo = this.statistics.maxCombo;
    
    if (currentMaxCombo !== this.lastCheckedValues.combo) {
      console.log(`🏆 Checking combo achievements: max combo ${currentMaxCombo}`);
      this.checkAchievements('combo');
      this.lastCheckedValues.combo = currentMaxCombo;
    }
  }

  // ИСПРАВЛЕНИЕ: Новый метод для проверки достижений за ресурсы
  checkResourceAchievements() {
    const currentTotalResources = this.statistics.totalResourcesCollected;
    
    if (currentTotalResources !== this.lastCheckedValues.totalResources) {
      console.log(`🏆 Checking resource achievements: ${currentTotalResources} total resources`);
      this.checkAchievements('total_resources');
      
      // Проверяем достижения за конкретные ресурсы
      Object.keys(this.statistics.resourcesCollected).forEach(resource => {
        this.checkAchievements(resource);
      });
      
      this.lastCheckedValues.totalResources = currentTotalResources;
    }
  }

  // НОВЫЙ: Метод для проверки достижений за энергетические зоны
  checkEnergyZoneAchievements() {
    const currentEnergyZones = this.statistics.energyZonesHit;
    
    if (currentEnergyZones !== this.lastCheckedValues.energyZones) {
      console.log(`🏆 Checking energy zone achievements: ${currentEnergyZones} energy zones hit`);
      this.checkAchievements('energy_zones');
      this.lastCheckedValues.energyZones = currentEnergyZones;
    }
  }

  // Добавить статистику ресурса
  addResourceStatistic(resourceName, amount) {
    if (!this.statistics.resourcesCollected[resourceName]) {
      this.statistics.resourcesCollected[resourceName] = 0;
    }
    
    this.statistics.resourcesCollected[resourceName] += amount;
    this.statistics.totalResourcesCollected += amount;
    
    // ИСПРАВЛЕНИЕ: Эмитируем событие получения ресурса для статистики
    eventBus.emit(GameEvents.RESOURCE_GAINED, {
      resource: resourceName,
      amount: amount
    });
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
        const currentCollected = this.statistics.resourcesCollected[resource];
        if (amount > currentCollected) {
          const newlyCollected = amount - currentCollected;
          this.statistics.resourcesCollected[resource] = amount;
          this.statistics.totalResourcesCollected += newlyCollected;
        }
        totalResources += this.statistics.resourcesCollected[resource];
      }
    });
  }

  // ИСПРАВЛЕНИЕ: Улучшенная проверка достижений для категории
  checkAchievements(category) {
    const relevantAchievements = ACHIEVEMENT_DEFS.filter(achievement => 
      achievement.category === category && 
      !this.gameState.achievements.completed.has(achievement.id)
    );

    if (relevantAchievements.length === 0) {
      return;
    }

    console.log(`🔍 Checking ${relevantAchievements.length} achievements for category: ${category}`);

    relevantAchievements.forEach(achievement => {
      const currentValue = this.getCurrentValue(achievement.category);
      const isCompleted = currentValue >= achievement.target;
      
      console.log(`📊 Achievement ${achievement.id}: ${currentValue}/${achievement.target} ${isCompleted ? '✅' : '❌'}`);
      
      if (isCompleted) {
        this.completeAchievement(achievement);
      }
    });

    // Сохраняем статистику
    this.saveStatistics();
  }

  // Проверить, выполнено ли достижение
  isAchievementCompleted(achievement) {
    const currentValue = this.getCurrentValue(achievement.category);
    return currentValue >= achievement.target;
  }

  // ИСПРАВЛЕНИЕ: Улучшенное получение текущего значения для категории
  getCurrentValue(category) {
    switch (category) {
      case 'clicks':
        return this.statistics.totalClicks;
      case 'combo':
        return this.statistics.maxCombo;
      case 'total_resources':
        return this.statistics.totalResourcesCollected;
      case 'energy_zones':
        return this.statistics.energyZonesHit;
      default:
        // Для конкретных ресурсов
        return this.statistics.resourcesCollected[category] || 0;
    }
  }

  // ИСПРАВЛЕНИЕ: Улучшенное завершение достижения
  completeAchievement(achievement) {
    console.log(`🏆 Achievement completed: ${achievement.name} (${achievement.id})`);
    
    // Добавляем в список завершенных
    this.gameState.achievements.completed.add(achievement.id);
    
    // Выдаем награды
    this.giveRewards(achievement.reward);
    
    // Показываем уведомление
    this.showAchievementNotification(achievement);
    
    // Эмитируем событие
    eventBus.emit(GameEvents.ACHIEVEMENT_UNLOCKED, {
      achievement: achievement,
      reward: achievement.reward
    });
    
    eventBus.emit(GameEvents.SKILL_NOTIFICATION, {
      title: `🏆 Achievement Unlocked!`,
      description: `${achievement.name}: ${achievement.description}\nReward: ${this.formatReward(achievement.reward)}`
    });
  }

  // Выдать награды
  giveRewards(reward) {
    if (reward.skillPoints && this.gameState.skillManager) {
      this.gameState.skillManager.addSkillPoints(reward.skillPoints);
      eventBus.emit(GameEvents.SKILL_POINTS_CHANGED, this.gameState.skillPoints);
      console.log(`💎 Awarded ${reward.skillPoints} skill points from achievement`);
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

  // ИСПРАВЛЕНИЕ: Принудительная проверка всех достижений при загрузке
  forceCheckAllAchievements() {
    console.log('🔍 Force checking all achievements...');
    
    // Получаем все уникальные категории
    const categories = [...new Set(ACHIEVEMENT_DEFS.map(a => a.category))];
    console.log(`📋 Checking categories: ${categories.join(', ')}`);
    
    categories.forEach(category => {
      console.log(`🔍 Checking category: ${category}`);
      this.checkAchievements(category);
    });
    
    // Обновляем проверочные значения
    this.lastCheckedValues = {
      clicks: this.statistics.totalClicks,
      combo: this.statistics.maxCombo,
      totalResources: this.statistics.totalResourcesCollected,
      energyZones: this.statistics.energyZonesHit
    };
    
    console.log('✅ Force check completed');
  }

  // Сохранить статистику
  saveStatistics() {
    this.gameState.achievements.statistics = { ...this.statistics };
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

  // ИСПРАВЛЕНИЕ: Улучшенная статистика достижений
  getAchievementStats() {
    const allAchievements = this.getAllAchievements();
    const completed = allAchievements.filter(a => a.completed);
    
    return {
      total: allAchievements.length,
      completed: completed.length,
      completionPercent: (completed.length / allAchievements.length) * 100,
      totalSkillPointsEarned: completed.reduce((sum, a) => sum + (a.reward.skillPoints || 0), 0),
      statistics: { ...this.statistics },
      lastCheckedValues: { ...this.lastCheckedValues },
      recentProgress: this.getRecentProgress()
    };
  }

  // НОВЫЙ: Получить недавний прогресс
  getRecentProgress() {
    return {
      clicksSinceLastCheck: this.statistics.totalClicks - this.lastCheckedValues.clicks,
      comboImprovement: this.statistics.maxCombo > this.lastCheckedValues.combo,
      resourcesGained: this.statistics.totalResourcesCollected - this.lastCheckedValues.totalResources,
      energyZonesGained: this.statistics.energyZonesHit - this.lastCheckedValues.energyZones
    };
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
        totalResourcesCollected: 0,
        energyZonesHit: 0
      }
    };
    
    this.statistics = { ...this.gameState.achievements.statistics };
    this.lastCheckedValues = {
      clicks: 0,
      combo: 0,
      totalResources: 0,
      energyZones: 0
    };
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
      
      // Добавляем новые поля если их нет
      if (this.statistics.energyZonesHit === undefined) {
        this.statistics.energyZonesHit = 0;
      }
      
      // Обновляем проверочные значения
      this.lastCheckedValues = {
        clicks: this.statistics.totalClicks,
        combo: this.statistics.maxCombo,
        totalResources: this.statistics.totalResourcesCollected,
        energyZones: this.statistics.energyZonesHit
      };
      
      // Проверяем достижения после загрузки
      this.createTimeout(() => {
        this.forceCheckAllAchievements();
      }, 1000);
    }
  }

  // Деструктор
  destroy() {
    console.log('🧹 AchievementManager cleanup started');
    
    // Сохраняем финальную статистику
    this.saveStatistics();
    
    super.destroy();
    
    console.log('✅ AchievementManager destroyed');
  }
}