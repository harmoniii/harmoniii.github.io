// TelegramCloudSaveManager.js - Система облачных сохранений для Telegram Web App
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';

export class TelegramCloudSaveManager extends CleanupMixin {
  constructor(gameState, telegramWebApp) {
    super();
    
    this.gameState = gameState;
    this.tg = telegramWebApp;
    this.isEnabled = this.tg && this.tg.isInitialized;
    
    // Состояние синхронизации
    this.lastCloudSave = 0;
    this.saveInterval = null;
    this.syncInProgress = false;
    this.pendingSave = false;
    
    // Настройки
    this.autoSaveInterval = 120000; // 2 минуты
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 секунд
    
    if (this.isEnabled) {
      this.initialize();
    }
    
    console.log('☁️ TelegramCloudSaveManager initialized:', this.isEnabled ? 'Enabled' : 'Disabled');
  }

  initialize() {
    // Настройка автосохранения
    this.setupAutoSave();
    
    // Привязка событий игры
    this.bindGameEvents();
    
    // Привязка событий Telegram
    this.bindTelegramEvents();
    
    // Загружаем сохранение при старте
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
    if (this.tg.tg) {
      this.tg.tg.onEvent('webAppClose', () => {
        this.performEmergencySave();
      });
    }
    
    // Сохранение при потере фокуса
    this.addEventListener(document, 'visibilitychange', () => {
      if (document.hidden && !this.syncInProgress) {
        this.saveToCloud(true); // Force save
      }
    });
    
    console.log('☁️ Auto-save configured');
  }

  bindGameEvents() {
    // Важные события игры, требующие сохранения
    const criticalEvents = [
      GameEvents.BUILDING_BOUGHT,
      GameEvents.SKILL_BOUGHT,
      GameEvents.ITEM_PURCHASED,
      'raid:completed',
      GameEvents.ACHIEVEMENT_UNLOCKED
    ];
    
    criticalEvents.forEach(event => {
      eventBus.subscribe(event, () => {
        this.scheduleSave();
      });
    });
    
    // Менее критичные события - отложенное сохранение
    const normalEvents = [
      GameEvents.RESOURCE_CHANGED,
      GameEvents.SKILL_POINTS_CHANGED
    ];
    
    normalEvents.forEach(event => {
      eventBus.subscribe(event, () => {
        this.scheduleSave(10000); // Сохранение через 10 секунд
      });
    });
  }

  bindTelegramEvents() {
    // Обработка входящих данных от бота
    if (this.tg.tg) {
      this.tg.tg.onEvent('webAppDataReceived', (data) => {
        this.handleCloudData(data);
      });
    }
  }

  // Запланировать сохранение
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

  // Сохранить в облако
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
    
    // Проверяем cooldown
    if (!force && now - this.lastCloudSave < 30000) { // 30 секунд минимум
      return false;
    }
    
    try {
      this.syncInProgress = true;
      console.log('☁️ Starting cloud save...');
      
      // Получаем данные игры
      const saveData = this.gameState.getSaveData();
      if (!saveData) {
        throw new Error('No save data available');
      }
      
      // Добавляем метаданные для облака
      const cloudSaveData = this.createCloudSaveData(saveData);
      
      // Отправляем через Telegram Web App
      const success = await this.sendToBot(cloudSaveData);
      
      if (success) {
        this.lastCloudSave = now;
        console.log('☁️ Cloud save successful');
        
        // Показываем уведомление пользователю
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
      
      // Выполняем отложенное сохранение если было запланировано
      if (this.pendingSave) {
        this.pendingSave = false;
        this.createTimeout(() => {
          this.saveToCloud();
        }, 1000);
      }
    }
  }

  // Загрузить из облака
  async loadFromCloud() {
    if (!this.isEnabled) {
      console.log('☁️ Cloud load disabled - using local save');
      return false;
    }
    
    try {
      console.log('☁️ Requesting cloud save...');
      
      const loadRequest = {
        type: 'cloud_load_request',
        userId: this.tg.user?.id,
        timestamp: Date.now()
      };
      
      // Отправляем запрос на загрузку
      const success = await this.sendToBot(loadRequest);
      
      if (success) {
        console.log('☁️ Cloud load request sent');
        this.showCloudNotification('📥 Loading from cloud...', 'info');
        return true;
      } else {
        console.warn('☁️ Cloud load request failed');
        return false;
      }
      
    } catch (error) {
      console.error('☁️ Cloud load failed:', error);
      this.showCloudNotification('❌ Cloud load failed', 'error');
      return false;
    }
  }

  // Обработка данных от бота
  handleCloudData(data) {
    try {
      if (data.type === 'cloud_save_data' && data.saveData) {
        console.log('☁️ Received cloud save data');
        
        // Применяем данные к игре
        this.applyCloudSave(data.saveData);
        
        this.showCloudNotification('✅ Loaded from cloud', 'success');
        
      } else if (data.type === 'leaderboard_data' && data.leaderboard) {
        console.log('🏆 Received leaderboard data');
        
        // Обрабатываем данные лидерборда
        this.handleLeaderboardData(data.leaderboard);
        
      } else if (data.type === 'sync_conflict') {
        console.log('⚠️ Cloud sync conflict detected');
        
        // Обрабатываем конфликт синхронизации
        this.handleSyncConflict(data);
        
      } else {
        console.log('☁️ Unknown cloud data type:', data.type);
      }
      
    } catch (error) {
      console.error('☁️ Error handling cloud data:', error);
    }
  }

  // Создать данные для облачного сохранения
  createCloudSaveData(saveData) {
    return {
      type: 'cloud_save',
      userId: this.tg.user?.id,
      userInfo: {
        firstName: this.tg.user?.firstName,
        username: this.tg.user?.username,
        isPremium: this.tg.user?.isPremium || false
      },
      saveData: saveData,
      gameStatistics: this.gatherGameStatistics(),
      timestamp: Date.now(),
      version: saveData.saveVersion || '1.0',
      platform: 'telegram_webapp',
      cloudSaveVersion: '1.0'
    };
  }

  // Применить облачное сохранение
  applyCloudSave(cloudSaveData) {
    try {
      if (!cloudSaveData || !this.gameState) {
        throw new Error('Invalid cloud save data or game state');
      }
      
      // Проверяем версию сохранения
      if (cloudSaveData.cloudSaveVersion !== '1.0') {
        console.warn('☁️ Cloud save version mismatch');
      }
      
      // Применяем данные через gameState
      this.gameState.loadSaveData(cloudSaveData);
      
      // Обновляем UI
      eventBus.emit(GameEvents.LOAD_COMPLETED);
      eventBus.emit(GameEvents.RESOURCE_CHANGED);
      
      console.log('☁️ Cloud save applied successfully');
      
    } catch (error) {
      console.error('☁️ Error applying cloud save:', error);
      throw error;
    }
  }

  // Собрать статистику игры
  gatherGameStatistics() {
    try {
      const resources = this.gameState.resources || {};
      const totalResources = Object.values(resources).reduce((sum, val) => sum + (val || 0), 0);
      
      const buildingLevels = Object.values(this.gameState.buildings || {})
        .reduce((sum, building) => sum + (building.level || 0), 0);
      
      const skillLevels = Object.values(this.gameState.skills || {})
        .reduce((sum, skill) => sum + (skill.level || 0), 0);
      
      return {
        totalResources,
        maxCombo: this.gameState.combo?.count || 0,
        totalClicks: this.gameState.achievements?.statistics?.totalClicks || 0,
        buildingLevels,
        skillLevels,
        raidsCompleted: this.gameState.raids?.statistics?.totalRaids || 0,
        peopleLost: this.gameState.raids?.statistics?.peopleLost || 0,
        playtimeEstimate: Math.floor((totalResources + buildingLevels * 100 + skillLevels * 200) / 60),
        achievementsCount: this.gameState.achievements?.completed?.size || 0
      };
    } catch (error) {
      console.error('☁️ Error gathering statistics:', error);
      return {};
    }
  }

  // Отправить статистику игры
  sendGameStatistics() {
    try {
      const statisticsData = {
        type: 'game_statistics',
        userId: this.tg.user?.id,
        stats: this.gatherGameStatistics(),
        timestamp: Date.now()
      };
      
      this.sendToBot(statisticsData);
      console.log('📊 Game statistics sent');
      
    } catch (error) {
      console.error('📊 Error sending statistics:', error);
    }
  }

  // Отправить данные боту
  async sendToBot(data) {
    try {
      if (!this.tg.tg || !this.tg.tg.sendData) {
        console.warn('☁️ Telegram Web App sendData not available');
        return false;
      }
      
      const jsonData = JSON.stringify(data);
      
      // Проверяем размер данных
      if (jsonData.length > 64 * 1024) { // 64KB лимит Telegram
        console.warn('☁️ Data too large for Telegram, compressing...');
        // Можно добавить сжатие здесь
      }
      
      this.tg.tg.sendData(jsonData);
      return true;
      
    } catch (error) {
      console.error('☁️ Error sending data to bot:', error);
      return false;
    }
  }

  // Экстренное сохранение
  performEmergencySave() {
    try {
      console.log('🚨 Performing emergency cloud save...');
      
      // Синхронное сохранение для критических ситуаций
      const saveData = this.gameState.getSaveData();
      if (saveData) {
        const emergencyData = {
          type: 'emergency_save',
          userId: this.tg.user?.id,
          saveData: saveData,
          timestamp: Date.now(),
          emergencyFlag: true
        };
        
        if (this.tg.tg && this.tg.tg.sendData) {
          this.tg.tg.sendData(JSON.stringify(emergencyData));
          console.log('🚨 Emergency save sent');
        }
      }
      
    } catch (error) {
      console.error('🚨 Emergency save failed:', error);
    }
  }

  // Обработка конфликта синхронизации
  handleSyncConflict(data) {
    const { localData, cloudData, conflictInfo } = data;
    
    // Показываем пользователю диалог выбора
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8); display: flex;
      align-items: center; justify-content: center; z-index: 10000;
    `;
    
    modal.innerHTML = `
      <div style="background: white; padding: 2rem; border-radius: 15px; max-width: 400px; text-align: center;">
        <h3>⚠️ Sync Conflict</h3>
        <p>Found both local and cloud saves. Which one do you want to keep?</p>
        <div style="margin: 1rem 0;">
          <div><strong>Local:</strong> ${new Date(localData.timestamp).toLocaleString()}</div>
          <div><strong>Cloud:</strong> ${new Date(cloudData.timestamp).toLocaleString()}</div>
        </div>
        <button id="use-local" style="margin: 0.5rem; padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px;">
          📱 Use Local
        </button>
        <button id="use-cloud" style="margin: 0.5rem; padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 5px;">
          ☁️ Use Cloud
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Обработчики выбора
    modal.querySelector('#use-local').onclick = () => {
      this.saveToCloud(true); // Перезаписываем облако локальными данными
      document.body.removeChild(modal);
      this.showCloudNotification('📱 Using local save', 'success');
    };
    
    modal.querySelector('#use-cloud').onclick = () => {
      this.applyCloudSave(cloudData); // Применяем облачные данные
      document.body.removeChild(modal);
      this.showCloudNotification('☁️ Using cloud save', 'success');
    };
  }

  // Обработка данных лидерборда
  handleLeaderboardData(leaderboardData) {
    // Сохраняем данные лидерборда для показа
    this.lastLeaderboardData = leaderboardData;
    
    // Эмитируем событие для UI
    eventBus.emit('leaderboard:updated', leaderboardData);
  }

  // Показать уведомление о облаке
  showCloudNotification(message, type = 'info') {
    // Используем существующий NotificationManager если доступен
    if (typeof eventBus !== 'undefined') {
      eventBus.emit(GameEvents.NOTIFICATION, message);
    }
    
    // Дополнительно используем Telegram haptic feedback
    if (this.tg.tg && this.tg.tg.HapticFeedback) {
      const hapticType = type === 'success' ? 'success' : 
                        type === 'error' ? 'error' : 'selection';
      this.tg.showHapticFeedback(hapticType);
    }
  }

  // Запросить лидерборд
  requestLeaderboard(category = 'total_resources') {
    const leaderboardRequest = {
      type: 'leaderboard_request',
      userId: this.tg.user?.id,
      category: category,
      timestamp: Date.now()
    };
    
    this.sendToBot(leaderboardRequest);
    console.log('🏆 Leaderboard request sent');
  }

  // Отправить достижение
  reportAchievement(achievementId) {
    const achievementData = {
      type: 'achievement_unlocked',
      userId: this.tg.user?.id,
      achievementId: achievementId,
      stats: this.gatherGameStatistics(),
      timestamp: Date.now()
    };
    
    this.sendToBot(achievementData);
    console.log('🏆 Achievement reported:', achievementId);
  }

  // Получить статус синхронизации
  getSyncStatus() {
    return {
      isEnabled: this.isEnabled,
      syncInProgress: this.syncInProgress,
      lastCloudSave: this.lastCloudSave,
      pendingSave: this.pendingSave,
      timeSinceLastSave: Date.now() - this.lastCloudSave,
      nextAutoSave: this.lastCloudSave + this.autoSaveInterval,
      userId: this.tg.user?.id
    };
  }

  // Принудительная синхронизация
  forceSyncToCloud() {
    return this.saveToCloud(true);
  }

  // Принудительная загрузка из облака
  forceLoadFromCloud() {
    return this.loadFromCloud();
  }

  // Экспорт облачных данных
  exportCloudData() {
    try {
      const saveData = this.gameState.getSaveData();
      if (!saveData) {
        throw new Error('No save data available');
      }
      
      const exportData = {
        type: 'data_export',
        userId: this.tg.user?.id,
        saveData: saveData,
        statistics: this.gatherGameStatistics(),
        userInfo: {
          firstName: this.tg.user?.firstName,
          username: this.tg.user?.username
        },
        exportTimestamp: Date.now()
      };
      
      this.sendToBot(exportData);
      this.showCloudNotification('📤 Data export requested', 'info');
      
    } catch (error) {
      console.error('📤 Export failed:', error);
      this.showCloudNotification('❌ Export failed', 'error');
    }
  }

  // Деструктор
  destroy() {
    console.log('🧹 TelegramCloudSaveManager cleanup started');
    
    // Последнее сохранение перед закрытием
    if (this.isEnabled && !this.syncInProgress) {
      this.performEmergencySave();
    }
    
    // Очищаем интервалы
    if (this.saveInterval) {
      this.cleanupManager.clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
    
    super.destroy();
    
    console.log('✅ TelegramCloudSaveManager destroyed');
  }
}

// Глобальная функция для отладки
if (typeof window !== 'undefined') {
  window.getCloudSaveStatus = () => {
    const cloudSaveManager = window.gameCore?.cloudSaveManager;
    return cloudSaveManager ? cloudSaveManager.getSyncStatus() : 'CloudSaveManager not available';
  };
}