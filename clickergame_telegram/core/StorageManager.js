// core/TelegramStorageManager.js - Расширенный StorageManager для Telegram
import { StorageManager } from './StorageManager.js';

export class TelegramStorageManager extends StorageManager {
  constructor() {
    super();
    this.telegramAdapter = window.telegramAdapter;
    this.CLOUD_KEY = 'gamestate';
    this.USER_KEY = 'userdata';
    this.STATS_KEY = 'statistics';
  }

  // Сохранить в облако Telegram
  async saveToCloud(gameState) {
    try {
      console.log('☁️ Saving to Telegram Cloud Storage...');
      
      if (!gameState) {
        throw new Error('GameState is null or undefined');
      }

      const saveData = gameState.getSaveData ? gameState.getSaveData() : gameState;
      if (!saveData) {
        throw new Error('Failed to get save data');
      }

      // Добавляем метаданные для облака
      const cloudSaveData = {
        ...saveData,
        cloudSave: true,
        cloudSaveTimestamp: Date.now(),
        telegramUserId: this.telegramAdapter?.getUserInfo()?.id,
        version: this.CURRENT_VERSION
      };

      // Сохраняем в облако Telegram
      const success = await this.telegramAdapter?.cloudStorageSave(this.CLOUD_KEY, cloudSaveData);
      
      if (success) {
        console.log('✅ Game saved to Telegram cloud successfully');
        
        // Также сохраняем локально как backup
        this.saveToLocal(cloudSaveData);
        
        return true;
      } else {
        throw new Error('Cloud storage failed');
      }
      
    } catch (error) {
      console.error('❌ Failed to save to Telegram cloud:', error);
      
      // Fallback к локальному сохранению
      console.log('🔄 Falling back to local storage...');
      return this.save(gameState);
    }
  }

  // Загрузить из облака Telegram
  async loadFromCloud() {
    try {
      console.log('☁️ Loading from Telegram Cloud Storage...');
      
      const cloudData = await this.telegramAdapter?.cloudStorageLoad(this.CLOUD_KEY);
      
      if (cloudData) {
        console.log('✅ Game loaded from Telegram cloud successfully');
        this.validateCloudData(cloudData);
        return cloudData;
      } else {
        console.log('ℹ️ No cloud save found, checking local storage...');
        return this.load();
      }
      
    } catch (error) {
      console.error('❌ Failed to load from Telegram cloud:', error);
      
      // Fallback к локальному сохранению
      console.log('🔄 Falling back to local storage...');
      return this.load();
    }
  }

  // Сохранить локально (как backup)
  saveToLocal(saveData) {
    try {
      const jsonString = JSON.stringify(saveData);
      const encodedData = this.encodeData(jsonString);
      localStorage.setItem(this.STORAGE_KEY, encodedData);
      return true;
    } catch (error) {
      console.error('❌ Local backup save failed:', error);
      return false;
    }
  }

  // Валидация облачных данных
  validateCloudData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid cloud data format');
    }

    // Проверяем принадлежность пользователю
    const currentUserId = this.telegramAdapter?.getUserInfo()?.id;
    if (data.telegramUserId && currentUserId && data.telegramUserId !== currentUserId) {
      console.warn('⚠️ Cloud save belongs to different user');
    }

    // Проверяем версию
    if (data.version && data.version !== this.CURRENT_VERSION) {
      console.warn(`⚠️ Version mismatch: ${data.version} vs ${this.CURRENT_VERSION}`);
    }

    // Стандартная валидация
    this.validateSaveData(data);
  }

  // Сохранить статистику пользователя
  async saveUserStats(stats) {
    try {
      const userInfo = this.telegramAdapter?.getUserInfo();
      const userStats = {
        ...stats,
        userId: userInfo?.id,
        username: userInfo?.username,
        firstName: userInfo?.firstName,
        lastUpdated: Date.now()
      };

      await this.telegramAdapter?.cloudStorageSave(this.STATS_KEY, userStats);
      console.log('📊 User stats saved to cloud');
      return true;
    } catch (error) {
      console.error('❌ Failed to save user stats:', error);
      return false;
    }
  }

  // Загрузить статистику пользователя
  async loadUserStats() {
    try {
      const userStats = await this.telegramAdapter?.cloudStorageLoad(this.STATS_KEY);
      return userStats || null;
    } catch (error) {
      console.error('❌ Failed to load user stats:', error);
      return null;
    }
  }

  // Сохранить пользовательские данные
  async saveUserData(userData) {
    try {
      const userInfo = this.telegramAdapter?.getUserInfo();
      const fullUserData = {
        ...userData,
        telegramInfo: userInfo,
        lastSeen: Date.now()
      };

      await this.telegramAdapter?.cloudStorageSave(this.USER_KEY, fullUserData);
      console.log('👤 User data saved to cloud');
      return true;
    } catch (error) {
      console.error('❌ Failed to save user data:', error);
      return false;
    }
  }

  // Автосохранение в облако
  async autoSaveToCloud(gameState) {
    try {
      if (!gameState || gameState.isDestroyed) {
        console.warn('⚠️ Cannot auto-save: game state not available');
        return false;
      }

      console.log('☁️ Performing auto-save to Telegram cloud...');
      
      const saveData = gameState.getSaveData ? gameState.getSaveData() : null;
      if (!saveData) {
        console.warn('⚠️ Cannot get save data for auto-save');
        return false;
      }

      // Добавляем метаданные автосохранения
      saveData.autoSave = true;
      saveData.autoSaveTimestamp = Date.now();
      saveData.cloudAutoSave = true;
      
      const success = await this.telegramAdapter?.cloudStorageSave(this.CLOUD_KEY, saveData);
      
      if (success) {
        console.log('✅ Auto-save to Telegram cloud completed');
        // Также сохраняем локально
        this.saveToLocal(saveData);
        return true;
      } else {
        // Fallback к обычному автосохранению
        return this.autoSaveToLocalStorage(gameState);
      }
      
    } catch (error) {
      console.error('❌ Auto-save to Telegram cloud failed:', error);
      return this.autoSaveToLocalStorage(gameState);
    }
  }

  // Синхронизация между локальным и облачным хранилищем
  async syncStorages() {
    try {
      console.log('🔄 Syncing local and cloud storages...');
      
      const cloudData = await this.telegramAdapter?.cloudStorageLoad(this.CLOUD_KEY);
      const localData = this.load();
      
      if (!cloudData && !localData) {
        console.log('ℹ️ No data to sync');
        return null;
      }
      
      if (!cloudData) {
        // Есть только локальные данные - загружаем в облако
        console.log('📤 Uploading local data to cloud...');
        await this.telegramAdapter?.cloudStorageSave(this.CLOUD_KEY, localData);
        return localData;
      }
      
      if (!localData) {
        // Есть только облачные данные - сохраняем локально
        console.log('📥 Downloading cloud data to local...');
        this.saveToLocal(cloudData);
        return cloudData;
      }
      
      // Есть оба - используем более новые данные
      const cloudTime = cloudData.cloudSaveTimestamp || cloudData.saveTimestamp || 0;
      const localTime = localData.saveTimestamp || 0;
      
      if (cloudTime > localTime) {
        console.log('☁️ Using cloud data (newer)');
        this.saveToLocal(cloudData);
        return cloudData;
      } else {
        console.log('💾 Using local data (newer)');
        await this.telegramAdapter?.cloudStorageSave(this.CLOUD_KEY, localData);
        return localData;
      }
      
    } catch (error) {
      console.error('❌ Storage sync failed:', error);
      return this.load(); // Fallback к локальным данным
    }
  }

  // Экспорт для отправки боту
  async exportForBot(gameState) {
    try {
      const saveData = gameState.getSaveData ? gameState.getSaveData() : gameState;
      if (!saveData) {
        throw new Error('No save data available');
      }

      const exportData = {
        type: 'game_export',
        data: saveData,
        user: this.telegramAdapter?.getUserInfo(),
        timestamp: Date.now(),
        stats: this.generateGameStats(saveData)
      };

      // Отправляем боту
      const success = this.telegramAdapter?.sendData(exportData);
      
      if (success) {
        console.log('📤 Game data exported to bot');
        return true;
      } else {
        throw new Error('Failed to send data to bot');
      }
      
    } catch (error) {
      console.error('❌ Export to bot failed:', error);
      return false;
    }
  }

  // Генерация статистики игры
  generateGameStats(saveData) {
    const resources = saveData.resources || {};
    const buildings = saveData.buildings || {};
    const skills = saveData.skills || {};
    const achievements = saveData.achievements || { statistics: {} };

    return {
      totalResources: Object.values(resources).reduce((sum, val) => sum + (val || 0), 0),
      maxCombo: achievements.statistics?.maxCombo || 0,
      totalClicks: achievements.statistics?.totalClicks || 0,
      skillPoints: saveData.skillPoints || 0,
      buildingLevels: Object.values(buildings).reduce((sum, building) => sum + (building.level || 0), 0),
      skillLevels: Object.values(skills).reduce((sum, skill) => sum + (skill.level || 0), 0),
      playtimeEstimate: this.estimatePlaytime(saveData)
    };
  }

  // Оценка времени игры
  estimatePlaytime(saveData) {
    const totalProgress = 
      (saveData.skillPoints || 0) + 
      Object.values(saveData.buildings || {}).reduce((sum, b) => sum + (b.level || 0), 0) * 10 +
      Object.values(saveData.skills || {}).reduce((sum, s) => sum + (s.level || 0), 0) * 5;
    
    // Примерная оценка: 1 час на 100 единиц прогресса
    return Math.floor(totalProgress / 100);
  }

  // Резервное копирование
  async createCloudBackup(gameState) {
    try {
      const saveData = gameState.getSaveData ? gameState.getSaveData() : gameState;
      const backupKey = `backup_${Date.now()}`;
      
      const backupData = {
        ...saveData,
        backupCreated: Date.now(),
        originalKey: this.CLOUD_KEY
      };

      await this.telegramAdapter?.cloudStorageSave(backupKey, backupData);
      console.log(`💾 Cloud backup created: ${backupKey}`);
      return backupKey;
      
    } catch (error) {
      console.error('❌ Failed to create cloud backup:', error);
      return null;
    }
  }

  // Получить информацию об облачном хранилище
  async getCloudStorageInfo() {
    try {
      const data = await this.telegramAdapter?.cloudStorageLoad(this.CLOUD_KEY);
      const userStats = await this.loadUserStats();
      
      return {
        hasCloudSave: !!data,
        cloudSaveTime: data?.cloudSaveTimestamp || data?.saveTimestamp,
        localSaveTime: this.getSaveInfo()?.timestamp,
        userStats: userStats,
        capabilities: this.telegramAdapter?.getCapabilities()
      };
      
    } catch (error) {
      console.error('❌ Failed to get cloud storage info:', error);
      return null;
    }
  }

  // Очистка облачного хранилища
  async clearCloudStorage() {
    try {
      // В Telegram WebApp нет прямого способа удалить данные
      // Поэтому сохраняем пустой объект
      const emptyData = {
        cleared: true,
        clearedAt: Date.now(),
        version: this.CURRENT_VERSION
      };

      await this.telegramAdapter?.cloudStorageSave(this.CLOUD_KEY, emptyData);
      console.log('🧹 Cloud storage cleared');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to clear cloud storage:', error);
      return false;
    }
  }
}