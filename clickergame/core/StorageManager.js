// core/StorageManager.js - Исправленная версия с защитой от null
export class StorageManager {
  constructor() {
    this.STORAGE_KEY = 'advancedClickerState';
    this.CURRENT_VERSION = '0.8.0';
  }

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

      // Добавляем метаданные ТОЛЬКО если saveData валиден
      saveData.saveVersion = this.CURRENT_VERSION;
      saveData.saveTimestamp = Date.now();

      // Кодируем и сохраняем
      const jsonString = JSON.stringify(saveData);
      const encodedData = this.encodeData(jsonString);
      
      localStorage.setItem(this.STORAGE_KEY, encodedData);
      
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
      const encodedData = localStorage.getItem(this.STORAGE_KEY);
      
      if (!encodedData) {
        console.log('ℹ️ No saved state found');
        return null;
      }

      const jsonString = this.decodeData(encodedData);
      const saveData = JSON.parse(jsonString);
      
      // Валидируем данные
      this.validateSaveData(saveData);
      
      console.log('✅ Game state loaded successfully');
      return saveData;
      
    } catch (error) {
      console.error('❌ Failed to load game state:', error);
      return null;
    }
  }

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
        size: encodedData.length,
        hasResources: !!saveData.resources,
        hasBuildings: !!saveData.buildings,
        hasSkills: !!saveData.skills
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
}