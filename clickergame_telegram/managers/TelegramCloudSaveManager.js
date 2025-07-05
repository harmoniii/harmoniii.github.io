import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';

export class TelegramCloudSaveManager extends CleanupMixin {
  constructor(gameState, telegramWebApp) {
    super();
    this.gameState = gameState;
    this.tg = telegramWebApp;
    this.isEnabled = this.tg && this.tg.isReady;
    this.lastCloudSave = 0;
    this.saveInterval = null;
    this.syncInProgress = false;
    this.pendingSave = false;
    this.autoSaveInterval = 120000; // 2 минуты
    this.maxRetries = 3;
    this.retryDelay = 5000;

    if (this.isEnabled) {
      this.initialize();
    }
    console.log('☁️ TelegramCloudSaveManager initialized:', this.isEnabled ? 'Enabled' : 'Disabled');
  }

  initialize() {
    this.setupAutoSave();
    this.bindGameEvents();
    this.bindTelegramEvents();
    this.loadFromCloud();
  }

  setupAutoSave() {
    // Автосохранение каждые 2 минуты
    this.saveInterval = this.createInterval(() => {
      if (!this.syncInProgress && !this.pendingSave) {
        this.saveToCloud();
      }
    }, this.autoSaveInterval, 'cloud-auto-save');

    // Сохранение при закрытии приложения
    this.addEventListener(window, 'beforeunload', () => {
      this.performEmergencySave();
    });

    // Сохранение при сворачивании приложения
    this.addEventListener(document, 'visibilitychange', () => {
      if (document.hidden && !this.syncInProgress) {
        this.saveToCloud(true);
      }
    });
  }

  bindGameEvents() {
    // Критические события - сохраняем сразу
    const criticalEvents = [
      GameEvents.BUILDING_BOUGHT,
      GameEvents.SKILL_BOUGHT,
      GameEvents.ITEM_PURCHASED,
      'raid:completed',
      GameEvents.ACHIEVEMENT_UNLOCKED
    ];

    criticalEvents.forEach(event => {
      eventBus.subscribe(event, () => {
        this.scheduleSave(5000); // Сохранение через 5 секунд
      });
    });

    // Обычные события - сохраняем реже
    const normalEvents = [
      GameEvents.RESOURCE_CHANGED,
      GameEvents.SKILL_POINTS_CHANGED,
      GameEvents.COMBO_CHANGED
    ];

    normalEvents.forEach(event => {
      eventBus.subscribe(event, () => {
        this.scheduleSave(30000); // Сохранение через 30 секунд
      });
    });
  }

  scheduleSave(delay = 5000) {
    if (this.syncInProgress) {
      this.pendingSave = true;
      return;
    }

    this.createTimeout(() => {
      if (!this.syncInProgress) {
        this.saveToCloud();
      }
    }, delay);
  }

  async saveToCloud(force = false) {
    if (!this.isEnabled) {
      console.warn('☁️ Cloud save disabled - Telegram Web App not available');
      return false;
    }

    if (this.syncInProgress && !force) {
      this.pendingSave = true;
      return false;
    }

    const now = Date.now();
    if (!force && now - this.lastCloudSave < 30000) {
      return false; // Не чаще чем раз в 30 секунд
    }

    try {
      this.syncInProgress = true;
      console.log('☁️ Starting cloud save...');

      // ИСПРАВЛЕНО: Получаем полные данные игры
      const saveData = this.getCompleteSaveData();
      if (!saveData) {
        throw new Error('No save data available');
      }

      // Создаем данные для облака
      const cloudSaveData = this.createCloudSaveData(saveData);
      
      // Отправляем в бота
      const success = await this.sendToBot(cloudSaveData);
      
      if (success) {
        this.lastCloudSave = now;
        console.log('☁️ Cloud save successful');
        
        if (force) {
          this.showCloudNotification('✅ Saved to cloud', 'success');
        }
        
        // Отправляем статистику
        this.sendGameStatistics();
        return true;
      } else {
        throw new Error('Failed to send data to bot');
      }
    } catch (error) {
      console.error('☁️ Cloud save failed:', error);
      this.showCloudNotification('❌ Cloud save failed', 'error');
      return false;
    } finally {
      this.syncInProgress = false;
      
      if (this.pendingSave) {
        this.pendingSave = false;
        this.createTimeout(() => {
          this.saveToCloud();
        }, 1000);
      }
    }
  }

  // НОВЫЙ МЕТОД: Получение полных данных сохранения
  getCompleteSaveData() {
    try {
      if (!this.gameState || this.gameState.isDestroyed) {
        console.warn('⚠️ GameState not available for save');
        return null;
      }

      // Принудительно обновляем состояние рейдов
      if (this.gameState.raidManager && this.gameState.raidManager.isRaidInProgress) {
        this.gameState.raids.activeRaid = this.gameState.raidManager.activeRaid;
        this.gameState.raids.isRaidInProgress = this.gameState.raidManager.isRaidInProgress;
        this.gameState.raids.raidStartTime = this.gameState.raidManager.raidStartTime;
        this.gameState.raids.raidProgress = this.gameState.raidManager.raidProgress;
        this.gameState.raids.autoClickerWasActive = this.gameState.raidManager.autoClickerWasActive;
      }

      // Получаем данные сохранения
      const saveData = this.gameState.getSaveData();
      if (!saveData) {
        console.warn('⚠️ getSaveData returned null');
        return null;
      }

      // ИСПРАВЛЕНО: Добавляем метаданные
      saveData.cloudSaveVersion = '1.1';
      saveData.saveTimestamp = Date.now();
      saveData.gameVersion = '1.0.10';

      return saveData;
    } catch (error) {
      console.error('❌ Error getting complete save data:', error);
      return null;
    }
  }

  createCloudSaveData(saveData) {
    const userData = this.tg.user || {};
    
    return {
      type: 'cloud_save',
      userId: userData.id || Date.now(),
      userInfo: {
        firstName: userData.first_name || 'Unknown',
        username: userData.username || null,
        languageCode: userData.language_code || 'en',
        isPremium: userData.is_premium || false
      },
      saveData: saveData,
      gameStatistics: this.gatherGameStatistics(),
      timestamp: Date.now(),
      version: saveData.saveVersion || '1.0.10',
      platform: 'telegram_webapp',
      cloudSaveVersion: '1.1'
    };
  }

  // ИСПРАВЛЕННЫЙ МЕТОД: Сбор статистики игры
  gatherGameStatistics() {
    try {
      if (!this.gameState) {
        return {};
      }

      const resources = this.gameState.resources || {};
      const totalResources = Object.values(resources).reduce((sum, val) => sum + (val || 0), 0);
      
      const buildingLevels = Object.values(this.gameState.buildings || {})
        .reduce((sum, building) => sum + (building.level || 0), 0);
      
      const skillLevels = Object.values(this.gameState.skills || {})
        .reduce((sum, skill) => sum + (skill.level || 0), 0);

      const achievements = this.gameState.achievements || {};
      const achievementsCount = achievements.completed ? 
        (achievements.completed.size || achievements.completed.length || 0) : 0;

      const raidStats = this.gameState.raids?.statistics || {};
      
      return {
        // Основные ресурсы
        totalResources,
        gold: resources.gold || 0,
        wood: resources.wood || 0,
        stone: resources.stone || 0,
        food: resources.food || 0,
        water: resources.water || 0,
        iron: resources.iron || 0,
        people: resources.people || 0,
        energy: resources.energy || 0,
        science: resources.science || 0,
        faith: resources.faith || 0,
        chaos: resources.chaos || 0,
        
        // Прогресс
        skillPoints: this.gameState.skillPoints || 0,
        maxCombo: this.gameState.combo?.count || 0,
        totalClicks: achievements.statistics?.totalClicks || 0,
        
        // Постройки и навыки
        buildingLevels,
        skillLevels,
        totalBuildings: Object.values(this.gameState.buildings || {}).filter(b => (b.level || 0) > 0).length,
        totalSkills: Object.values(this.gameState.skills || {}).filter(s => (s.level || 0) > 0).length,
        
        // Рейды
        raidsCompleted: raidStats.totalRaids || 0,
        successfulRaids: raidStats.successfulRaids || 0,
        peopleLost: raidStats.peopleLost || 0,
        raidSystemUnlocked: this.gameState.buildingManager?.isRaidSystemUnlocked() || false,
        
        // Достижения
        achievementsCount,
        
        // Оценка времени игры
        playtimeEstimate: Math.floor((totalResources + buildingLevels * 100 + skillLevels * 200) / 60),
        
        // Активные эффекты
        activeBuffs: (this.gameState.buffs || []).length,
        activeDebuffs: (this.gameState.debuffs || []).length,
        
        // Энергия
        currentEnergy: this.gameState.energy?.current || 0,
        maxEnergy: this.gameState.energy?.max || 0,
        
        // Дополнительная статистика
        lastPlayTime: Date.now(),
        saveCount: (this.gameState._saveCount || 0) + 1
      };
    } catch (error) {
      console.error('☁️ Error gathering statistics:', error);
      return {
        error: 'Failed to gather statistics',
        timestamp: Date.now()
      };
    }
  }

  sendGameStatistics() {
    try {
      const statisticsData = {
        type: 'game_statistics',
        userId: this.tg.user?.id || Date.now(),
        stats: this.gatherGameStatistics(),
        timestamp: Date.now()
      };
      
      this.sendToBot(statisticsData);
      console.log('📊 Game statistics sent');
    } catch (error) {
      console.error('📊 Error sending statistics:', error);
    }
  }

  async sendToBot(data) {
    try {
      if (!this.tg.tg || !this.tg.tg.sendData) {
        console.warn('☁️ Telegram Web App sendData not available');
        return false;
      }

      const jsonData = JSON.stringify(data);
      
      // ИСПРАВЛЕНО: Проверяем размер данных
      const maxSize = 4096; // Максимальный размер для Telegram
      
      if (jsonData.length > maxSize) {
        console.warn(`☁️ Data too large (${jsonData.length} bytes), compressing...`);
        
        // Сжимаем данные, убирая менее важную информацию
        const compressedData = this.compressData(data);
        const compressedJson = JSON.stringify(compressedData);
        
        if (compressedJson.length > maxSize) {
          console.error('☁️ Data still too large after compression');
          return false;
        }
        
        this.tg.tg.sendData(compressedJson);
      } else {
        this.tg.tg.sendData(jsonData);
      }
      
      return true;
    } catch (error) {
      console.error('☁️ Error sending data to bot:', error);
      return false;
    }
  }

  // НОВЫЙ МЕТОД: Сжатие данных
  compressData(data) {
    const compressed = { ...data };
    
    // Убираем или сжимаем большие объекты
    if (compressed.saveData) {
      // Убираем историю покупок в маркете
      if (compressed.saveData.market?.purchaseHistory) {
        compressed.saveData.market.purchaseHistory = compressed.saveData.market.purchaseHistory.slice(-10);
      }
      
      // Убираем подробную историю рейдов
      if (compressed.saveData.raids?.completed) {
        compressed.saveData.raids.completed = compressed.saveData.raids.completed.slice(-5);
      }
      
      // Убираем детальную статистику достижений
      if (compressed.saveData.achievements?.statistics?.resourcesCollected) {
        const resources = compressed.saveData.achievements.statistics.resourcesCollected;
        compressed.saveData.achievements.statistics.resourcesCollected = {
          total: Object.values(resources).reduce((sum, val) => sum + (val || 0), 0)
        };
      }
    }
    
    // Отмечаем, что данные сжаты
    compressed.compressed = true;
    
    return compressed;
  }

  performEmergencySave() {
    try {
      console.log('🚨 Performing emergency cloud save...');
      
      const saveData = this.getCompleteSaveData();
      if (!saveData) {
        console.error('🚨 No save data for emergency save');
        return;
      }

      const emergencyData = {
        type: 'emergency_save',
        userId: this.tg.user?.id || Date.now(),
        saveData: saveData,
        timestamp: Date.now(),
        emergencyFlag: true
      };

      if (this.tg.tg && this.tg.tg.sendData) {
        const jsonData = JSON.stringify(emergencyData);
        if (jsonData.length <= 4096) {
          this.tg.tg.sendData(jsonData);
          console.log('🚨 Emergency save sent');
        } else {
          // Если данные слишком большие, отправляем сжатые
          const compressedData = this.compressData(emergencyData);
          this.tg.tg.sendData(JSON.stringify(compressedData));
          console.log('🚨 Compressed emergency save sent');
        }
      }
    } catch (error) {
      console.error('🚨 Emergency save failed:', error);
    }
  }

  // Методы для работы с конфликтами и восстановлением данных
  handleCloudData(data) {
    try {
      if (data.type === 'cloud_save_data' && data.saveData) {
        console.log('☁️ Received cloud save data');
        this.applyCloudSave(data.saveData);
        this.showCloudNotification('✅ Loaded from cloud', 'success');
      } else if (data.type === 'leaderboard_data' && data.leaderboard) {
        console.log('🏆 Received leaderboard data');
        this.handleLeaderboardData(data.leaderboard);
      } else if (data.type === 'sync_conflict') {
        console.log('⚠️ Cloud sync conflict detected');
        this.handleSyncConflict(data);
      } else {
        console.log('☁️ Unknown cloud data type:', data.type);
      }
    } catch (error) {
      console.error('☁️ Error handling cloud data:', error);
    }
  }

  showCloudNotification(message, type = 'info') {
    if (typeof eventBus !== 'undefined') {
      eventBus.emit(GameEvents.NOTIFICATION, message);
    }

    // Тактильная обратная связь в Telegram
    if (this.tg.tg && this.tg.tg.HapticFeedback) {
      const hapticType = type === 'success' ? 'success' :
                        type === 'error' ? 'error' : 'selection';
      this.tg.tg.HapticFeedback.notificationOccurred(hapticType);
    }
  }

  getSyncStatus() {
    return {
      isEnabled: this.isEnabled,
      syncInProgress: this.syncInProgress,
      lastCloudSave: this.lastCloudSave,
      pendingSave: this.pendingSave,
      timeSinceLastSave: Date.now() - this.lastCloudSave,
      nextAutoSave: this.lastCloudSave + this.autoSaveInterval,
      userId: this.tg.user?.id,
      saveCount: this.gameState?._saveCount || 0
    };
  }

  forceSyncToCloud() {
    return this.saveToCloud(true);
  }

  destroy() {
    console.log('🧹 TelegramCloudSaveManager cleanup started');
    
    if (this.isEnabled && !this.syncInProgress) {
      this.performEmergencySave();
    }

    if (this.saveInterval) {
      this.cleanupManager.clearInterval(this.saveInterval);
      this.saveInterval = null;
    }

    super.destroy();
    console.log('✅ TelegramCloudSaveManager destroyed');
  }
}

// Добавляем в window для отладки
if (typeof window !== 'undefined') {
  window.getCloudSaveStatus = () => {
    const cloudSaveManager = window.gameCore?.cloudSaveManager;
    return cloudSaveManager ? cloudSaveManager.getSyncStatus() : 'CloudSaveManager not available';
  };
}