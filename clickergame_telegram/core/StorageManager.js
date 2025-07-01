// core/StorageManager.js - Обновленная версия с поддержкой Telegram Cloud Storage
export class StorageManager {
  constructor() {
    this.STORAGE_KEY = 'advancedClickerState';
    this.CURRENT_VERSION = '0.8.0';
    this.telegramAdapter = window.telegramAdapter;
    this.CLOUD_KEY = 'gamestate';
    this.isCloudEnabled = !!this.telegramAdapter;
  }

  // ===== ОБЫЧНОЕ СОХРАНЕНИЕ/ЗАГРУЗКА =====

  // Сохранить состояние игры
  save(gameState) {
    try {
      if (!gameState) {
        console.warn('⚠️ StorageManager.save: gameState is null/undefined');
        return false;
      }

      if (typeof gameState.getSaveData !== 'function') {
        console.warn('⚠️ StorageManager.save: gameState.getSaveData is not a function');
        return false;
      }

      const saveData = gameState.getSaveData();
      
      if (!saveData) {
        console.warn('⚠️ StorageManager.save: getSaveData returned null/undefined');
        return false;
      }

      if (typeof saveData !== 'object') {
        console.warn('⚠️ StorageManager.save: saveData is not an object:', typeof saveData);
        return false;
      }

      // Добавляем метаданные
      saveData.saveVersion = this.CURRENT_VERSION;
      saveData.saveTimestamp = Date.now();

      // Кодируем и сохраняем локально
      const jsonString = JSON.stringify(saveData);
      const encodedData = this.encodeData(jsonString);
      
      localStorage.setItem(this.STORAGE_KEY, encodedData);
      
      // Также сохраняем в облако Telegram если доступно
      if (this.isCloudEnabled) {
        this.saveToCloudAsync(saveData);
      }
      
      console.log('✅ Game state saved successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to save game state:', error);
      return false;
    }
  }

  // Загрузить состояние игры
  load() {
    try {
      // Сначала пытаемся загрузить из облака
      if (this.isCloudEnabled) {
        return this.loadFromCloudSync();
      }
      
      // Fallback к локальному сохранению
      return this.loadFromLocal();
      
    } catch (error) {
      console.error('❌ Failed to load game state:', error);
      return null;
    }
  }

  // Загрузка из локального хранилища
  loadFromLocal() {
    try {
      const encodedData = localStorage.getItem(this.STORAGE_KEY);
      
      if (!encodedData) {
        console.log('ℹ️ No local save found');
        return null;
      }

      const jsonString = this.decodeData(encodedData);
      const saveData = JSON.parse(jsonString);
      
      // Валидируем данные
      this.validateSaveData(saveData);
      
      console.log('✅ Game state loaded from local storage');
      return saveData;
      
    } catch (error) {
      console.error('❌ Failed to load from local storage:', error);
      return null;
    }
  }

  // ===== TELEGRAM CLOUD STORAGE =====

  // Асинхронное сохранение в облако (не блокирует основной поток)
  async saveToCloudAsync(saveData) {
    try {
      if (!this.telegramAdapter) return false;
      
      console.log('☁️ Saving to Telegram Cloud...');
      
      // Добавляем метаданные для облака
      const cloudSaveData = {
        ...saveData,
        cloudSave: true,
        cloudSaveTimestamp: Date.now(),
        telegramUserId: this.telegramAdapter.getUserInfo()?.id,
        version: this.CURRENT_VERSION
      };

      const success = await this.telegramAdapter.cloudStorageSave(this.CLOUD_KEY, cloudSaveData);
      
      if (success) {
        console.log('✅ Game saved to Telegram cloud');
        return true;
      } else {
        console.warn('⚠️ Cloud save failed, using local only');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Failed to save to cloud:', error);
      return false;
    }
  }

  // Синхронная попытка загрузки из облака (с fallback)
  loadFromCloudSync() {
    try {
      // Запускаем асинхронную загрузку из облака
      this.loadFromCloudAsync().then(cloudData => {
        if (cloudData) {
          console.log('☁️ Cloud data will be applied on next game start');
          // Сохраняем облачные данные локально для следующего запуска
          this.saveCloudDataToLocal(cloudData);
        }
      }).catch(error => {
        console.error('❌ Async cloud load failed:', error);
      });
      
      // Пока возвращаем локальные данные
      return this.loadFromLocal();
      
    } catch (error) {
      console.error('❌ Cloud sync load failed:', error);
      return this.loadFromLocal();
    }
  }

  // Асинхронная загрузка из облака
  async loadFromCloudAsync() {
    try {
      if (!this.telegramAdapter) return null;
      
      console.log('☁️ Loading from Telegram Cloud...');
      
      const cloudData = await this.telegramAdapter.cloudStorageLoad(this.CLOUD_KEY);
      
      if (cloudData) {
        // Проверяем, не очищено ли сохранение
        if (cloudData.cleared) {
          console.log('🗑️ Cloud storage was cleared');
          return null;
        }
        
        this.validateCloudData(cloudData);
        console.log('✅ Game loaded from Telegram cloud');
        return cloudData;
      } else {
        console.log('ℹ️ No cloud save found');
        return null;
      }
      
    } catch (error) {
      console.error('❌ Failed to load from cloud:', error);
      return null;
    }
  }

  // Сохранение облачных данных локально
  saveCloudDataToLocal(cloudData) {
    try {
      const jsonString = JSON.stringify(cloudData);
      const encodedData = this.encodeData(jsonString);
      localStorage.setItem(this.STORAGE_KEY, encodedData);
      console.log('💾 Cloud data saved to local storage');
    } catch (error) {
      console.error('❌ Failed to save cloud data locally:', error);
    }
  }

  // Автосохранение (с поддержкой облака)
  async autoSaveToLocalStorage(gameState) {
    try {
      if (!gameState || gameState.isDestroyed) {
        console.warn('⚠️ Cannot auto-save: game state not available');
        return false;
      }

      console.log('💾 Performing auto-save...');
      
      const saveData = gameState.getSaveData ? gameState.getSaveData() : null;
      if (!saveData) {
        console.warn('⚠️ Cannot get save data for auto-save');
        return false;
      }

      // Добавляем метаданные автосохранения
      saveData.autoSave = true;
      saveData.autoSaveTimestamp = Date.now();
      
      // Сохраняем локально
      const jsonString = JSON.stringify(saveData);
      const encodedData = this.encodeData(jsonString);
      localStorage.setItem(this.STORAGE_KEY, encodedData);
      
      // Также сохраняем в облако если доступно
      if (this.isCloudEnabled) {
        await this.saveToCloudAsync(saveData);
      }
      
      console.log('✅ Auto-save completed');
      return true;
      
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
      return false;
    }
  }

  // ===== TELEGRAM СПЕЦИФИЧЕСКИЕ МЕТОДЫ =====

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

  // Экспорт для Telegram бота
  async exportForTelegramBot(gameState) {
    try {
      if (!this.telegramAdapter) {
        console.warn('⚠️ Telegram adapter not available for export');
        return false;
      }

      const saveData = gameState.getSaveData ? gameState.getSaveData() : gameState;
      if (!saveData) {
        throw new Error('No save data available');
      }

      const exportData = {
        type: 'game_export',
        data: saveData,
        user: this.telegramAdapter.getUserInfo(),
        timestamp: Date.now(),
        stats: this.generateGameStats(saveData)
      };

      // Отправляем боту
      const success = this.telegramAdapter.sendData(exportData);
      
      if (success) {
        console.log('📤 Game data exported to Telegram bot');
        return true;
      } else {
        throw new Error('Failed to send data to bot');
      }
      
    } catch (error) {
      console.error('❌ Export to Telegram bot failed:', error);
      return false;
    }
  }

  // Генерация статистики игры для Telegram
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

  // Синхронизация облачного и локального хранилищ
  async syncStorages() {
    try {
      if (!this.isCloudEnabled) {
        return this.loadFromLocal();
      }

      console.log('🔄 Syncing local and cloud storages...');
      
      const cloudData = await this.loadFromCloudAsync();
      const localData = this.loadFromLocal();
      
      if (!cloudData && !localData) {
        console.log('ℹ️ No data to sync');
        return null;
      }
      
      if (!cloudData) {
        // Есть только локальные данные - загружаем в облако
        console.log('📤 Uploading local data to cloud...');
        if (localData) {
          await this.saveToCloudAsync(localData);
        }
        return localData;
      }
      
      if (!localData) {
        // Есть только облачные данные - сохраняем локально
        console.log('📥 Downloading cloud data to local...');
        this.saveCloudDataToLocal(cloudData);
        return cloudData;
      }
      
      // Есть оба - используем более новые данные
      const cloudTime = cloudData.cloudSaveTimestamp || cloudData.saveTimestamp || 0;
      const localTime = localData.saveTimestamp || 0;
      
      if (cloudTime > localTime) {
        console.log('☁️ Using cloud data (newer)');
        this.saveCloudDataToLocal(cloudData);
        return cloudData;
      } else {
        console.log('💾 Using local data (newer)');
        await this.saveToCloudAsync(localData);
        return localData;
      }
      
    } catch (error) {
      console.error('❌ Storage sync failed:', error);
      return this.loadFromLocal(); // Fallback к локальным данным
    }
  }

  // ===== ОСТАЛЬНЫЕ МЕТОДЫ (БЕЗ ИЗМЕНЕНИЙ) =====

  // Экспортировать в строку для пользователя
  exportToString(gameState) {
    try {
      if (!gameState) {
        throw new Error('GameState is null or undefined');
      }

      if (typeof gameState.getSaveData !== 'function') {
        throw new Error('GameState does not have getSaveData method');
      }

      const saveData = gameState.getSaveData();
      
      if (!saveData) {
        throw new Error('getSaveData returned null or undefined');
      }

      // Создаем копию для экспорта
      const exportData = { ...saveData };
      exportData.exportVersion = this.CURRENT_VERSION;
      exportData.exportTimestamp = Date.now();
      
      const jsonString = JSON.stringify(exportData);
      return this.encodeData(jsonString);
      
    } catch (error) {
      console.error('❌ Failed to export save:', error);
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  // Импортировать из строки пользователя
  importFromString(saveString) {
    try {
      if (!saveString || typeof saveString !== 'string') {
        throw new Error('Invalid save string');
      }

      const jsonString = this.decodeData(saveString.trim());
      const saveData = JSON.parse(jsonString);
      
      this.validateSaveData(saveData);
      
      return saveData;
      
    } catch (error) {
      console.error('❌ Failed to import save:', error);
      throw new Error('Import failed: Invalid save format');
    }
  }

  // Кодирование данных
  encodeData(jsonString) {
    try {
      return btoa(encodeURIComponent(jsonString));
    } catch (error) {
      console.error('❌ Failed to encode data:', error);
      throw new Error('Failed to encode save data');
    }
  }

  // Декодирование данных с поддержкой старых форматов
  decodeData(encodedData) {
    try {
      // Новый формат (с encodeURIComponent)
      return decodeURIComponent(atob(encodedData));
    } catch (e1) {
      try {
        // Старый формат (без encodeURIComponent)
        return atob(encodedData);
      } catch (e2) {
        throw new Error('Could not decode save data');
      }
    }
  }

  // Валидация данных сохранения
  validateSaveData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Save data is not a valid object');
    }

    // Проверяем обязательные поля
    const requiredFields = ['resources', 'combo'];
    for (const field of requiredFields) {
      if (!data[field]) {
        console.warn(`Missing field: ${field}, will use default`);
      }
    }

    // Проверяем версию
    if (data.saveVersion || data.exportVersion) {
      const version = data.saveVersion || data.exportVersion;
      console.log(`Loading save version: ${version}`);
      
      if (version !== this.CURRENT_VERSION) {
        console.warn(`Version mismatch: ${version} vs ${this.CURRENT_VERSION}`);
      }
    }

    // Валидация ресурсов
    if (data.resources && typeof data.resources === 'object') {
      Object.entries(data.resources).forEach(([resource, value]) => {
        if (typeof value !== 'number' || isNaN(value) || value < 0) {
          console.warn(`Invalid resource value for ${resource}: ${value}`);
          data.resources[resource] = 0;
        }
      });
    }

    // Валидация skill points
    if (typeof data.skillPoints === 'number') {
      if (isNaN(data.skillPoints) || data.skillPoints < 0) {
        console.warn('Invalid skill points, resetting to 0');
        data.skillPoints = 0;
      } else {
        data.skillPoints = Math.floor(data.skillPoints);
      }
    } else {
      data.skillPoints = 0;
    }
  }

  // Проверить наличие сохранения
  hasSave() {
    try {
      return localStorage.getItem(this.STORAGE_KEY) !== null;
    } catch (error) {
      console.error('❌ Failed to check save existence:', error);
      return false;
    }
  }

  // Удалить сохранение
  deleteSave() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🗑️ Save deleted');
      return true;
    } catch (error) {
      console.error('❌ Failed to delete save:', error);
      return false;
    }
  }

  // Получить информацию о сохранении
  getSaveInfo() {
    try {
      const encodedData = localStorage.getItem(this.STORAGE_KEY);
      if (!encodedData) return null;

      const jsonString = this.decodeData(encodedData);
      const saveData = JSON.parse(jsonString);
      
      return {
        version: saveData.saveVersion || 'unknown',
        timestamp: saveData.saveTimestamp || 0,
        cloudTimestamp: saveData.cloudSaveTimestamp || 0,
        size: encodedData.length,
        hasResources: !!saveData.resources,
        hasBuildings: !!saveData.buildings,
        hasSkills: !!saveData.skills,
        isCloudSave: !!saveData.cloudSave
      };
      
    } catch (error) {
      console.error('❌ Failed to get save info:', error);
      return null;
    }
  }

  // Создать резервную копию
  createBackup() {
    try {
      const currentSave = localStorage.getItem(this.STORAGE_KEY);
      if (!currentSave) return false;

      const backupKey = `${this.STORAGE_KEY}_backup_${Date.now()}`;
      localStorage.setItem(backupKey, currentSave);
      
      console.log('💾 Backup created:', backupKey);
      return backupKey;
      
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      return false;
    }
  }

  // Восстановить из резервной копии
  restoreFromBackup(backupKey) {
    try {
      const backupData = localStorage.getItem(backupKey);
      if (!backupData) {
        throw new Error('Backup not found');
      }

      localStorage.setItem(this.STORAGE_KEY, backupData);
      console.log('♻️ Restored from backup:', backupKey);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to restore from backup:', error);
      return false;
    }
  }

  // Очистить все данные (для полного сброса)
  clearAllData() {
    try {
      // Очищаем основное сохранение
      localStorage.removeItem(this.STORAGE_KEY);
      
      // Очищаем все резервные копии
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${this.STORAGE_KEY}_backup_`)) {
          localStorage.removeItem(key);
          i--; // Уменьшаем индекс, так как длина массива изменилась
        }
      }
      
      console.log('🧹 All save data cleared');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to clear all data:', error);
      return false;
    }
  }

  // Безопасное сохранение с проверками
  safeSave(gameState) {
    if (!gameState) {
      console.warn('⚠️ SafeSave: gameState is null, skipping save');
      return false;
    }

    // Проверяем, что объект не уничтожен
    if (gameState.isDestroyed === true) {
      console.warn('⚠️ SafeSave: gameState is destroyed, skipping save');
      return false;
    }

    // Проверяем наличие метода getSaveData
    if (typeof gameState.getSaveData !== 'function') {
      console.warn('⚠️ SafeSave: gameState does not have getSaveData method');
      return false;
    }

    // Выполняем сохранение
    return this.save(gameState);
  }

  // Получить отладочную информацию
  getDebugInfo() {
    return {
      hasLocalSave: this.hasSave(),
      localSaveInfo: this.getSaveInfo(),
      isTelegramEnabled: this.isCloudEnabled,
      telegramUser: this.telegramAdapter?.getUserInfo(),
      storageCapabilities: {
        localStorage: typeof Storage !== 'undefined',
        telegramCloud: !!this.telegramAdapter?.tg?.CloudStorage,
        hapticFeedback: !!this.telegramAdapter?.tg?.HapticFeedback
      }
    };
  }
}