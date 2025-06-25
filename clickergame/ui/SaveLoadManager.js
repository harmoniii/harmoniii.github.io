// ui/SaveLoadManager.js - ИСПРАВЛЕННАЯ версия с ПОЛНЫМ ядерным сбросом
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

  // ИСПРАВЛЕНИЕ: ПОЛНЫЙ ЯДЕРНЫЙ СБРОС
  performCompleteReset() {
    if (!this.confirmNuclearReset()) return;

    try {
      console.log('🔥💀 NUCLEAR RESET INITIATED 💀🔥');
      eventBus.emit(GameEvents.NOTIFICATION, '🔥 NUCLEAR RESET IN PROGRESS...');
      
      // Шаг 1: Создаем резервную копию перед уничтожением
      try {
        this.storageManager.createBackup();
        console.log('✅ Backup created before nuclear reset');
      } catch (e) {
        console.warn('⚠️ Backup failed, continuing reset:', e);
      }
      
      // Шаг 2: ПОЛНАЯ очистка всех возможных хранилищ
      this.executeNuclearStorageWipe();
      
      // Шаг 3: Очистка IndexedDB
      this.clearIndexedDB();
      
      // Шаг 4: Очистка WebSQL (для старых браузеров)
      this.clearWebSQL();
      
      // Шаг 5: Очистка всех cookies игры
      this.clearGameCookies();
      
      // Шаг 6: Очистка кэша приложения
      this.clearApplicationCache();
      
      // Шаг 7: Эмитируем событие полного сброса
      eventBus.emit(GameEvents.GAME_RESET);
      
      eventBus.emit(GameEvents.NOTIFICATION, '💀 NUCLEAR RESET COMPLETE');
      eventBus.emit(GameEvents.NOTIFICATION, '🔄 Initiating total reload...');
      
      // Шаг 8: Жесткая перезагрузка с очисткой кэша
      this.createTimeout(() => {
        this.performNuclearReload();
      }, GAME_CONSTANTS.NUCLEAR_RELOAD_DELAY);
      
    } catch (error) {
      console.error('💀 CRITICAL ERROR in nuclear reset:', error);
      this.emergencyNuclearReset(error);
    }
  }

  // ИСПРАВЛЕНИЕ: Более строгое подтверждение
  confirmNuclearReset() {
    const warnings = [
      '🔥💀 NUCLEAR GAME RESET 💀🔥\n\nThis will COMPLETELY DESTROY:\n• All progress\n• All resources\n• All buildings\n• All skills\n• All reputation\n• EVERYTHING!\n\nAre you absolutely sure?',
      '⚠️💀 FINAL WARNING 💀⚠️\n\nThere is NO UNDO!\nALL data will be PERMANENTLY DESTROYED!\n\nType "DESTROY" to confirm:'
    ];
    
    // Первое предупреждение
    if (!confirm(warnings[0])) {
      return false;
    }
    
    // Второе предупреждение с вводом текста
    const confirmation = prompt(warnings[1]);
    if (confirmation !== 'DESTROY') {
      eventBus.emit(GameEvents.NOTIFICATION, '❌ Reset cancelled - incorrect confirmation');
      return false;
    }
    
    return true;
  }

  // ИСПРАВЛЕНИЕ: Полное уничтожение всех хранилищ
  executeNuclearStorageWipe() {
    console.log('💥 Executing nuclear storage wipe...');
    
    try {
      // 1. Полная очистка localStorage
      const localStorageKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        localStorageKeys.push(localStorage.key(i));
      }
      
      localStorageKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
          console.log(`🗑️ Removed localStorage: ${key}`);
        } catch (e) {
          console.warn(`Failed to remove localStorage key: ${key}`, e);
        }
      });
      
      // 2. Полная очистка sessionStorage
      const sessionStorageKeys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        sessionStorageKeys.push(sessionStorage.key(i));
      }
      
      sessionStorageKeys.forEach(key => {
        try {
          sessionStorage.removeItem(key);
          console.log(`🗑️ Removed sessionStorage: ${key}`);
        } catch (e) {
          console.warn(`Failed to remove sessionStorage key: ${key}`, e);
        }
      });
      
      // 3. Принудительная очистка
      try {
        localStorage.clear();
        sessionStorage.clear();
        console.log('✅ Force cleared all storage');
      } catch (e) {
        console.warn('⚠️ Force clear failed:', e);
      }
      
    } catch (error) {
      console.error('💀 Nuclear storage wipe failed:', error);
    }
  }

  // ИСПРАВЛЕНИЕ: Очистка IndexedDB
  async clearIndexedDB() {
    try {
      if (!window.indexedDB) return;
      
      console.log('🗑️ Clearing IndexedDB...');
      
      // Получаем список всех баз данных
      if (indexedDB.databases) {
        const databases = await indexedDB.databases();
        
        await Promise.all(databases.map(async (db) => {
          return new Promise((resolve, reject) => {
            const deleteReq = indexedDB.deleteDatabase(db.name);
            deleteReq.onsuccess = () => {
              console.log(`✅ Deleted IndexedDB: ${db.name}`);
              resolve();
            };
            deleteReq.onerror = () => {
              console.warn(`⚠️ Failed to delete IndexedDB: ${db.name}`);
              resolve(); // Продолжаем даже при ошибке
            };
          });
        }));
      }
      
      // Очищаем известные базы данных игры
      const gameDBNames = ['gameState', 'advancedClicker', 'clickerGame'];
      await Promise.all(gameDBNames.map(async (name) => {
        return new Promise((resolve) => {
          const deleteReq = indexedDB.deleteDatabase(name);
          deleteReq.onsuccess = () => {
            console.log(`✅ Deleted game IndexedDB: ${name}`);
            resolve();
          };
          deleteReq.onerror = () => resolve(); // Игнорируем ошибки
        });
      }));
      
    } catch (error) {
      console.warn('⚠️ IndexedDB clear failed:', error);
    }
  }

  // ИСПРАВЛЕНИЕ: Очистка WebSQL (для старых браузеров)
  clearWebSQL() {
    try {
      if (!window.openDatabase) return;
      
      console.log('🗑️ Clearing WebSQL...');
      
      // Очищаем известные WebSQL базы
      const webSQLNames = ['gameState', 'advancedClicker'];
      webSQLNames.forEach(name => {
        try {
          const db = openDatabase(name, '', '', '');
          db.transaction(tx => {
            tx.executeSql('DELETE FROM data');
            console.log(`✅ Cleared WebSQL: ${name}`);
          });
        } catch (e) {
          // Игнорируем ошибки WebSQL
        }
      });
      
    } catch (error) {
      console.warn('⚠️ WebSQL clear failed:', error);
    }
  }

  // ИСПРАВЛЕНИЕ: Очистка cookies игры
  clearGameCookies() {
    try {
      console.log('🗑️ Clearing game cookies...');
      
      const cookies = document.cookie.split(';');
      const gameKeywords = ['game', 'clicker', 'save', 'state', 'advanced'];
      
      cookies.forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        
        // Удаляем cookie если содержит игровые ключевые слова
        if (gameKeywords.some(keyword => name.toLowerCase().includes(keyword))) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
          console.log(`✅ Cleared cookie: ${name}`);
        }
      });
      
    } catch (error) {
      console.warn('⚠️ Cookie clear failed:', error);
    }
  }

  // ИСПРАВЛЕНИЕ: Очистка Application Cache
  clearApplicationCache() {
    try {
      if (!window.applicationCache) return;
      
      console.log('🗑️ Clearing application cache...');
      window.applicationCache.update();
      
    } catch (error) {
      console.warn('⚠️ Application cache clear failed:', error);
    }
  }

  // ИСПРАВЛЕНИЕ: Ядерная перезагрузка
  performNuclearReload() {
    console.log('🔥 Performing nuclear reload...');
    
    const reloadMethods = [
      // Метод 1: Полная перезагрузка с очисткой кэша
      () => {
        window.location.href = window.location.protocol + '//' + 
                               window.location.host + 
                               window.location.pathname + 
                               '?nuclear_reset=' + Date.now() + 
                               '&cache_bust=' + Math.random();
      },
      
      // Метод 2: Замена с новыми параметрами
      () => {
        const url = new URL(window.location);
        url.searchParams.set('nuclear_reset', Date.now().toString());
        url.searchParams.set('cache_bust', Math.random().toString());
        url.searchParams.set('force_reload', 'true');
        window.location.replace(url.toString());
      },
      
      // Метод 3: Жесткая перезагрузка
      () => {
        window.location.reload(true);
      },
      
      // Метод 4: Assign с принудительными параметрами
      () => {
        window.location.assign(window.location.href + 
                              (window.location.href.includes('?') ? '&' : '?') + 
                              'nuclear_reset=' + Date.now());
      },
      
      // Метод 5: Полная замена URL
      () => {
        window.location = window.location.protocol + '//' + 
                         window.location.host + 
                         window.location.pathname;
      }
    ];
    
    let methodIndex = 0;
    
    const tryReload = () => {
      if (methodIndex >= reloadMethods.length) {
        console.error('💀 ALL NUCLEAR RELOAD METHODS FAILED!');
        this.showManualReloadDialog();
        return;
      }
      
      try {
        console.log(`🔥 Nuclear reload attempt ${methodIndex + 1}...`);
        reloadMethods[methodIndex]();
      } catch (error) {
        console.warn(`❌ Nuclear reload method ${methodIndex + 1} failed:`, error);
        methodIndex++;
        setTimeout(tryReload, 1000);
      }
    };
    
    tryReload();
  }

  // ИСПРАВЛЕНИЕ: Диалог ручной перезагрузки
  showManualReloadDialog() {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex; align-items: center; justify-content: center;
      z-index: 99999;
      font-family: Arial, sans-serif;
      color: white;
    `;
    
    dialog.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
        padding: 40px; border-radius: 20px; text-align: center;
        max-width: 500px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      ">
        <h2 style="margin-top: 0; font-size: 2em;">🔥💀 NUCLEAR RESET COMPLETE 💀🔥</h2>
        <p style="font-size: 1.2em; margin: 20px 0;">
          All game data has been <strong>COMPLETELY DESTROYED</strong>!
        </p>
        <p style="margin: 20px 0;">
          Please manually refresh the page to start fresh:
        </p>
        <div style="font-size: 1.1em; margin: 20px 0;">
          <div>• Press <strong>F5</strong></div>
          <div>• Press <strong>Ctrl+R</strong> (or Cmd+R on Mac)</div>
          <div>• Close and reopen the page</div>
        </div>
        <button onclick="window.location.reload(true)" style="
          background: white; color: #ff4444; border: none;
          padding: 15px 30px; border-radius: 10px; font-size: 1.1em;
          font-weight: bold; cursor: pointer; margin-top: 20px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        ">
          🔄 Try Auto-Reload Again
        </button>
      </div>
    `;
    
    document.body.appendChild(dialog);
  }

  // Экстренный ядерный сброс
  emergencyNuclearReset(error) {
    console.error('💀 EMERGENCY NUCLEAR RESET ACTIVATED');
    
    try {
      // Экстренная очистка всего что можно
      this.executeNuclearStorageWipe();
      
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
      console.error('Emergency nuclear cleanup failed:', e);
    }
    
    setTimeout(() => {
      alert(`🔥💀 EMERGENCY NUCLEAR RESET COMPLETED 💀🔥

CRITICAL ERROR OCCURRED DURING RESET!

ALL GAME DATA HAS BEEN DESTROYED!

Please manually refresh the page:
- Press F5
- Press Ctrl+R (or Cmd+R on Mac)  
- Close and reopen the page

Error: ${error.message}`);
    }, 1000);
  }

  // Перезагрузка страницы (для обычной загрузки)
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