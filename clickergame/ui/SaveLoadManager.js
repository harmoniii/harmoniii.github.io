// ui/SaveLoadManager.js - Управление сохранением и загрузкой через UI
import { CleanupMixin } from '../core/CleanupManager.js';
import { StorageManager } from '../core/StorageManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';

export class SaveLoadManager extends CleanupMixin {
  constructor(gameState) {
    super();
    this.gameState = gameState;
    this.storageManager = new StorageManager();
    this.activeSaveElements = new Set();
  }

  // Выполнить сохранение
  performSave() {
    if (this.activeSaveElements.size > 0) {
      eventBus.emit(GameEvents.NOTIFICATION, '💾 Save already in progress...');
      return;
    }

    try {
      const saveCode = this.storageManager.exportToString(this.gameState);
      this.displaySaveCode(saveCode);
      eventBus.emit(GameEvents.NOTIFICATION, '💾 Save created successfully!');
    } catch (error) {
      console.error('Save error:', error);
      eventBus.emit(GameEvents.NOTIFICATION, '❌ Error creating save');
    }
  }

  // Отобразить код сохранения
  displaySaveCode(saveCode) {
    const textarea = this.createSaveTextarea(saveCode);
    this.activeSaveElements.add(textarea);
    document.body.appendChild(textarea);
    
    // Фокусируемся и выделяем текст
    textarea.focus();
    textarea.select();
    
    // Пытаемся скопировать в буфер обмена
    this.copyToClipboard(saveCode);
    
    // Автоматическое удаление через время
    this.createTimeout(() => {
      this.cleanupSaveElement(textarea);
    }, GAME_CONSTANTS.SAVE_ELEMENT_TIMEOUT);
    
    // Удаление по потере фокуса
    const blurHandler = () => this.cleanupSaveElement(textarea);
    textarea.addEventListener('blur', blurHandler);
    textarea._blurHandler = blurHandler;
  }

  // Создать textarea для кода сохранения
  createSaveTextarea(saveCode) {
    const textarea = document.createElement('textarea');
    textarea.value = saveCode;
    textarea.readOnly = true;
    
    // Стили
    Object.assign(textarea.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '80%',
      maxWidth: '600px',
      height: '200px',
      zIndex: '9999',
      background: 'white',
      border: '2px solid #333',
      borderRadius: '8px',
      padding: '10px',
      fontSize: '12px',
      fontFamily: 'monospace',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      resize: 'none'
    });
    
    return textarea;
  }

  // Скопировать в буфер обмена
  async copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        eventBus.emit(GameEvents.NOTIFICATION, '📋 Save code copied to clipboard!');
      } else {
        eventBus.emit(GameEvents.NOTIFICATION, '💾 Save code ready. Copy it manually.');
      }
    } catch (error) {
      console.warn('Clipboard copy failed:', error);
      eventBus.emit(GameEvents.NOTIFICATION, '💾 Save code ready. Copy it manually.');
    }
  }

  // Очистить элемент сохранения
  cleanupSaveElement(textarea) {
    if (!this.activeSaveElements.has(textarea)) return;
    
    // Удаляем обработчик событий
    if (textarea._blurHandler) {
      textarea.removeEventListener('blur', textarea._blurHandler);
      delete textarea._blurHandler;
    }
    
    // Удаляем из DOM
    if (document.body.contains(textarea)) {
      document.body.removeChild(textarea);
    }
    
    // Удаляем из отслеживания
    this.activeSaveElements.delete(textarea);
  }

  // Выполнить загрузку
  performLoad() {
    const code = prompt('🔄 LOAD SAVE\n\nPaste your save code:');
    if (!code || code.trim() === '') {
      eventBus.emit(GameEvents.NOTIFICATION, '❌ No save code entered');
      return;
    }

    try {
      console.log('🔄 Starting load process...');
      
      // Импортируем данные
      const saveData = this.storageManager.importFromString(code.trim());
      
      // Создаем резервную копию текущего состояния
      this.storageManager.createBackup();
      
      // Сохраняем новые данные
      this.gameState.loadSaveData(saveData);
      this.storageManager.save(this.gameState);
      
      eventBus.emit(GameEvents.NOTIFICATION, '✅ Save loaded! Reloading...');
      
      // Перезагружаем страницу
      this.createTimeout(() => {
        this.performReload('load');
      }, GAME_CONSTANTS.RELOAD_DELAY);
      
    } catch (error) {
      console.error('❌ Load error:', error);
      eventBus.emit(GameEvents.NOTIFICATION, `❌ Load failed: ${error.message}`);
    }
  }

  // Выполнить полный сброс
  performCompleteReset() {
    if (!this.confirmReset()) return;

    try {
      console.log('🔥 COMPLETE RESET INITIATED');
      eventBus.emit(GameEvents.NOTIFICATION, '🔥 RESETTING GAME...');
      
      // Создаем резервную копию перед сбросом
      this.storageManager.createBackup();
      
      // Очищаем все данные
      this.storageManager.clearAllData();
      
      // Эмитируем событие сброса
      eventBus.emit(GameEvents.GAME_RESET);
      
      eventBus.emit(GameEvents.NOTIFICATION, '💀 GAME RESET COMPLETE');
      eventBus.emit(GameEvents.NOTIFICATION, '🔄 Reloading...');
      
      // Перезагружаем страницу
      this.createTimeout(() => {
        this.performReload('reset');
      }, GAME_CONSTANTS.NUCLEAR_RELOAD_DELAY);
      
    } catch (error) {
      console.error('💀 CRITICAL ERROR in reset:', error);
      this.emergencyReset(error);
    }
  }

  // Подтверждение сброса
  confirmReset() {
    if (!confirm('🔥 COMPLETE GAME RESET 🔥\n\nThis will delete ALL data forever!\nAre you sure?')) {
      return false;
    }
    
    if (!confirm('⚠️ FINAL WARNING ⚠️\n\nAll progress will be lost!\nContinue reset?')) {
      return false;
    }
    
    return true;
  }

  // Перезагрузка страницы
  performReload(type) {
    console.log(`🔄 Performing ${type} reload...`);
    
    const reloadMethods = [
      () => {
        const url = new URL(window.location);
        url.searchParams.set(type, Date.now().toString());
        window.location.replace(url.toString());
      },
      () => {
        window.location.href = window.location.origin + window.location.pathname + `?${type}=` + Date.now();
      },
      () => {
        window.location.assign(window.location.href + `?${type}=` + Date.now());
      },
      () => {
        window.location.reload(true);
      },
      () => {
        window.location = window.location;
      }
    ];
    
    let methodIndex = 0;
    
    const tryReload = () => {
      if (methodIndex >= reloadMethods.length) {
        console.error('💀 ALL RELOAD METHODS FAILED!');
        alert(`🔥 ${type.toUpperCase()} COMPLETE! 🔥\n\nPlease manually refresh the page (F5 or Ctrl+R)`);
        return;
      }
      
      try {
        console.log(`🔄 Reload attempt ${methodIndex + 1}...`);
        reloadMethods[methodIndex]();
      } catch (error) {
        console.warn(`❌ Reload method ${methodIndex + 1} failed:`, error);
        methodIndex++;
        setTimeout(tryReload, 1000);
      }
    };
    
    tryReload();
  }

  // Экстренный сброс
  emergencyReset(error) {
    console.error('💀 EMERGENCY RESET ACTIVATED');
    
    try {
      // Экстренная очистка
      this.storageManager.clearAllData();
      
      // Очищаем активные элементы
      this.activeSaveElements.forEach(element => {
        try {
          if (document.body.contains(element)) {
            document.body.removeChild(element);
          }
        } catch (e) {
          console.warn('Failed to remove element:', e);
        }
      });
      this.activeSaveElements.clear();
      
    } catch (e) {
      console.error('Emergency cleanup failed:', e);
    }
    
    setTimeout(() => {
      alert(`🔥 EMERGENCY RESET COMPLETED 🔥

The game has been reset but some errors occurred.

Please manually refresh the page:
- Press F5, or
- Press Ctrl+R, or  
- Close and reopen the page

Error: ${error.message}`);
    }, 1000);
  }

  // Очистка всех активных элементов сохранения
  cleanupAllSaveElements() {
    const elementsToClean = Array.from(this.activeSaveElements);
    elementsToClean.forEach(element => {
      this.cleanupSaveElement(element);
    });
  }

  // Деструктор
  destroy() {
    this.cleanupAllSaveElements();
    super.destroy();
  }
}