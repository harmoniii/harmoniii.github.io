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
    this.autoSaveInterval = 120000; // Увеличен до 2 минут
    this.maxRetries = 3;
    this.retryDelay = 5000;
    this.lastStatsSent = 0;
    this.statsInterval = 300000; // 5 минут между отправкой статистики

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
    this.saveInterval = this.createInterval(() => {
      if (!this.syncInProgress && !this.pendingSave) {
        this.saveToCloud();
      }
    }, this.autoSaveInterval, 'cloud-auto-save');

    // Отправка статистики отдельно от сохранений
    this.createInterval(() => {
      this.sendGameStatistics();
    }, this.statsInterval, 'stats-sender');

    this.addEventListener(window, 'beforeunload', () => {
      this.performEmergencySave();
    });

    this.addEventListener(document, 'visibilitychange', () => {
      if (document.hidden && !this.syncInProgress) {
        this.saveToCloud(true);
        this.sendGameStatistics();
      }
    });
  }

  bindGameEvents() {
    const criticalEvents = [
      GameEvents.BUILDING_BOUGHT,
      GameEvents.SKILL_BOUGHT,
      GameEvents.ITEM_PURCHASED,
      'raid:completed',
      GameEvents.ACHIEVEMENT_UNLOCKED
    ];

    criticalEvents.forEach(event => {
      eventBus.subscribe(event, (data) => {
        console.log(`📊 Critical event detected: ${event}`, data);
        this.scheduleSave(5000);
        this.scheduleStatsUpdate(2000);
      });
    });

    const normalEvents = [
      GameEvents.RESOURCE_CHANGED,
      GameEvents.SKILL_POINTS_CHANGED,
      GameEvents.COMBO_CHANGED
    ];

    normalEvents.forEach(event => {
      eventBus.subscribe(event, () => {
        this.scheduleSave(30000);
      });
    });
  }

  bindTelegramEvents() {
    // Если есть обработчики от Telegram WebApp
    if (this.tg && this.tg.onEvent) {
      this.tg.onEvent('mainButtonClicked', () => {
        this.forceSyncToCloud();
      });
    }
  }

  scheduleStatsUpdate(delay = 5000) {
    const now = Date.now();
    if (now - this.lastStatsSent < 10000) return; // Не чаще раза в 10 секунд

    this.createTimeout(() => {
      this.sendGameStatistics();
    }, delay);
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
      return false;
    }

    try {
      this.syncInProgress = true;
      console.log('☁️ Starting cloud save...');

      const saveData = this.getCompleteSaveData();
      if (!saveData) {
        throw new Error('No save data available');
      }

      const cloudSaveData = this.createCloudSaveData(saveData);
      const success = await this.sendToBot(cloudSaveData);

      if (success) {
        this.lastCloudSave = now;
        console.log('☁️ Cloud save successful');
        if (force) {
          this.showCloudNotification('✅ Saved to cloud', 'success');
        }
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

  getCompleteSaveData() {
    try {
      if (!this.gameState || this.gameState.isDestroyed) {
        console.warn('⚠️ GameState not available for save');
        return null;
      }

      // Сохраняем активный рейд если есть
      if (this.gameState.raidManager && this.gameState.raidManager.isRaidInProgress) {
        this.gameState.raids.activeRaid = this.gameState.raidManager.activeRaid;
        this.gameState.raids.isRaidInProgress = this.gameState.raidManager.isRaidInProgress;
        this.gameState.raids.raidStartTime = this.gameState.raidManager.raidStartTime;
        this.gameState.raids.raidProgress = this.gameState.raidManager.raidProgress;
        this.gameState.raids.autoClickerWasActive = this.gameState.raidManager.autoClickerWasActive;
      }

      const saveData = this.gameState.getSaveData();
      if (!saveData) {
        console.warn('⚠️ getSaveData returned null');
        return null;
      }

      // Добавляем метаданные
      saveData.cloudSaveVersion = '1.2';
      saveData.saveTimestamp = Date.now();
      saveData.gameVersion = '1.0.10';
      
      return saveData;
    } catch (error) {
      console.error('❌ Error getting complete save data:', error);
      return null;
    }
  }

  createCloudSaveData(saveData) {
    const userData = this.tg?.user || this.tg?.initDataUnsafe?.user || {};
    
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
      cloudSaveVersion: '1.2'
    };
  }

  async sendGameStatistics() {
    try {
      const now = Date.now();
      if (now - this.lastStatsSent < 30000) return; // Не чаще раза в 30 секунд

      if (!this.gameState || this.gameState.isDestroyed) return;

      const saveData = this.gameState.getSaveData();
      if (!saveData) return;

      const userData = this.tg?.user || this.tg?.initDataUnsafe?.user || {};
      
      const statisticsData = {
        type: 'game_statistics',
        userId: userData.id || Date.now(),
        stats: this.gatherDetailedGameStatistics(saveData),
        timestamp: now
      };

      const success = await this.sendToBot(statisticsData);
      if (success) {
        this.lastStatsSent = now;
        console.log('📊 Game statistics sent successfully');
      }
    } catch (error) {
      console.error('📊 Error sending statistics:', error);
    }
  }

  gatherDetailedGameStatistics(saveData = null) {
    try {
      if (!this.gameState) return {};

      const data = saveData || this.gameState.getSaveData() || {};
      const resources = data.resources || {};
      const buildings = data.buildings || {};
      const skills = data.skills || {};
      const achievements = data.achievements || {};
      const raids = data.raids || {};

      // Подсчитываем общие ресурсы
      const totalResources = Object.values(resources).reduce((sum, val) => sum + (val || 0), 0);
      
      // Подсчитываем уровни зданий
      const buildingLevels = Object.values(buildings).reduce((sum, building) => sum + (building.level || 0), 0);
      
      // Подсчитываем уровни навыков
      const skillLevels = Object.values(skills).reduce((sum, skill) => sum + (skill.level || 0), 0);
      
      // Количество достижений
      const achievementsCount = achievements.completed ? 
        (achievements.completed.size || achievements.completed.length || 0) : 0;

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
        science: resources.science || 0,
        faith: resources.faith || 0,
        chaos: resources.chaos || 0,
        
        // Очки навыков и комбо
        skillPoints: data.skillPoints || 0,
        maxCombo: data.combo?.count || 0,
        
        // Статистика достижений
        totalClicks: achievements.statistics?.totalClicks || 0,
        
        // Здания и навыки
        buildingLevels,
        skillLevels,
        totalBuildings: Object.values(buildings).filter(b => (b.level || 0) > 0).length,
        totalSkills: Object.values(skills).filter(s => (s.level || 0) > 0).length,
        
        // Рейды
        raidsCompleted: raids.statistics?.totalRaids || 0,
        successfulRaids: raids.statistics?.successfulRaids || 0,
        peopleLost: raids.statistics?.peopleLost || 0,
        raidSystemUnlocked: !!(buildings.watchTower?.level),
        
        // Достижения
        achievementsCount,
        
        // Время игры (приблизительная оценка)
        playtimeEstimate: Math.floor((totalResources + buildingLevels * 100 + skillLevels * 200) / 60),
        
        // Активные эффекты
        activeBuffs: (data.buffs || []).length,
        activeDebuffs: (data.debuffs || []).length,
        
        // Энергия
        currentEnergy: data.energy?.current || 0,
        maxEnergy: data.energy?.max || 0,
        
        // Рынок
        marketReputation: data.market?.reputation || 0,
        marketPurchases: data.market?.purchaseHistory?.length || 0,
        
        // Метаданные
        lastPlayTime: Date.now(),
        saveCount: (data._saveCount || 0) + 1,
        gameVersion: data.gameVersion || '1.0.10'
      };
    } catch (error) {
      console.error('☁️ Error gathering detailed statistics:', error);
      return {
        error: 'Failed to gather statistics',
        timestamp: Date.now()
      };
    }
  }

  gatherGameStatistics() {
    // Упрощенная версия для обратной совместимости
    return this.gatherDetailedGameStatistics();
  }

  async sendToBot(data) {
    try {
      if (!this.tg?.sendData) {
        console.warn('☁️ Telegram Web App sendData not available');
        return false;
      }

      const jsonData = JSON.stringify(data);
      const maxSize = 4000; // Немного уменьшаем лимит для надежности

      if (jsonData.length > maxSize) {
        console.warn(`☁️ Data too large (${jsonData.length} bytes), compressing...`);
        const compressedData = this.compressData(data);
        const compressedJson = JSON.stringify(compressedData);
        
        if (compressedJson.length > maxSize) {
          console.error('☁️ Data still too large after compression');
          // Попытка отправить только критически важные данные
          const criticalData = this.extractCriticalData(data);
          this.tg.sendData(JSON.stringify(criticalData));
        } else {
          this.tg.sendData(compressedJson);
        }
      } else {
        this.tg.sendData(jsonData);
      }

      return true;
    } catch (error) {
      console.error('☁️ Error sending data to bot:', error);
      return false;
    }
  }

  extractCriticalData(data) {
    // Извлекаем только самые важные данные если размер слишком большой
    if (data.type === 'cloud_save') {
      return {
        type: 'cloud_save',
        userId: data.userId,
        userInfo: data.userInfo,
        saveData: {
          resources: data.saveData?.resources || {},
          combo: data.saveData?.combo || {},
          skillPoints: data.saveData?.skillPoints || 0,
          buildings: data.saveData?.buildings || {},
          skills: data.saveData?.skills || {},
          energy: data.saveData?.energy || {},
          saveTimestamp: data.saveData?.saveTimestamp || Date.now()
        },
        timestamp: data.timestamp,
        compressed: true,
        critical: true
      };
    }
    return data;
  }

  compressData(data) {
    const compressed = { ...data };
    
    if (compressed.saveData) {
      // Сжимаем историю покупок
      if (compressed.saveData.market?.purchaseHistory) {
        compressed.saveData.market.purchaseHistory = compressed.saveData.market.purchaseHistory.slice(-5);
      }
      
      // Сжимаем историю рейдов
      if (compressed.saveData.raids?.completed) {
        compressed.saveData.raids.completed = compressed.saveData.raids.completed.slice(-3);
      }
      
      // Сжимаем статистику достижений
      if (compressed.saveData.achievements?.statistics?.resourcesCollected) {
        const resources = compressed.saveData.achievements.statistics.resourcesCollected;
        compressed.saveData.achievements.statistics.resourcesCollected = {
          total: Object.values(resources).reduce((sum, val) => sum + (val || 0), 0)
        };
      }
      
      // Удаляем неактивные эффекты
      compressed.saveData.buffs = [];
      compressed.saveData.debuffs = [];
      compressed.saveData.blockedUntil = 0;
    }
    
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

      const userData = this.tg?.user || this.tg?.initDataUnsafe?.user || {};
      
      const emergencyData = {
        type: 'emergency_save',
        userId: userData.id || Date.now(),
        saveData: saveData,
        timestamp: Date.now(),
        emergencyFlag: true
      };

      if (this.tg?.sendData) {
        const jsonData = JSON.stringify(emergencyData);
        if (jsonData.length <= 4000) {
          this.tg.sendData(jsonData);
          console.log('🚨 Emergency save sent');
        } else {
          const compressedData = this.extractCriticalData(emergencyData);
          this.tg.sendData(JSON.stringify(compressedData));
          console.log('🚨 Compressed emergency save sent');
        }
      }
    } catch (error) {
      console.error('🚨 Emergency save failed:', error);
    }
  }

  async loadFromCloud() {
    // Запрос данных из облака при инициализации
    try {
      const userData = this.tg?.user || this.tg?.initDataUnsafe?.user || {};
      
      const requestData = {
        type: 'cloud_load_request',
        userId: userData.id || Date.now(),
        timestamp: Date.now()
      };

      await this.sendToBot(requestData);
      console.log('☁️ Cloud load request sent');
    } catch (error) {
      console.error('☁️ Failed to request cloud load:', error);
    }
  }

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

    if (this.tg?.HapticFeedback) {
      const hapticType = type === 'success' ? 'success' :
                        type === 'error' ? 'error' : 'selection';
      this.tg.HapticFeedback.notificationOccurred(hapticType);
    }
  }

  getSyncStatus() {
    return {
      isEnabled: this.isEnabled,
      syncInProgress: this.syncInProgress,
      lastCloudSave: this.lastCloudSave,
      lastStatsSent: this.lastStatsSent,
      pendingSave: this.pendingSave,
      timeSinceLastSave: Date.now() - this.lastCloudSave,
      timeSinceLastStats: Date.now() - this.lastStatsSent,
      nextAutoSave: this.lastCloudSave + this.autoSaveInterval,
      userId: this.tg?.user?.id || this.tg?.initDataUnsafe?.user?.id,
      saveCount: this.gameState?._saveCount || 0
    };
  }

  forceSyncToCloud() {
    console.log('🔄 Force sync requested');
    this.saveToCloud(true);
    this.sendGameStatistics();
    return true;
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

if (typeof window !== 'undefined') {
  window.getCloudSaveStatus = () => {
    const cloudSaveManager = window.gameCore?.cloudSaveManager;
    return cloudSaveManager ? cloudSaveManager.getSyncStatus() : 'CloudSaveManager not available';
  };
}