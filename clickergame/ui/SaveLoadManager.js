// ui/SaveLoadManager.js - ИСПРАВЛЕННАЯ версия с рабочим сбросом
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
    if (!this.gameState || this.gameState.isDestroyed === true) {
      eventBus.emit(GameEvents.NOTIFICATION, '❌ Cannot save - game state not available');
      return;
    }

    if (this.activeSaveElements.size > 0) {
      eventBus.emit(GameEvents.NOTIFICATION, '💾 Save already in progress...');
      return;
    }

    try {
      const saveCode = this.storageManager.exportToString(this.gameState);
      
      if (!saveCode) {
        throw new Error('Export returned empty save code');
      }

      this.displaySaveCode(saveCode);
      eventBus.emit(GameEvents.NOTIFICATION, '💾 Save created successfully!');
      
    } catch (error) {
      console.error('❌ Save error:', error);
      eventBus.emit(GameEvents.NOTIFICATION, `❌ Save failed: ${error.message}`);
    }
  }

  // Отобразить код сохранения
  displaySaveCode(saveCode) {
    const textarea = this.createSaveTextarea(saveCode);
    this.activeSaveElements.add(textarea);
    document.body.appendChild(textarea);
    
    textarea.focus();
    textarea.select();
    
    this.copyToClipboard(saveCode);
    
    this.createTimeout(() => {
      this.cleanupSaveElement(textarea);
    }, GAME_CONSTANTS.SAVE_ELEMENT_TIMEOUT);
    
    const blurHandler = () => this.cleanupSaveElement(textarea);
    textarea.addEventListener('blur', blurHandler);
    textarea._blurHandler = blurHandler;
  }

  // Создать textarea для кода сохранения
  createSaveTextarea(saveCode) {
    const textarea = document.createElement('textarea');
    textarea.value = saveCode;
    textarea.readOnly = true;
    
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
    
    if (textarea._blurHandler) {
      textarea.removeEventListener('blur', textarea._blurHandler);
      delete textarea._blurHandler;
    }
    
    if (document.body.contains(textarea)) {
      document.body.removeChild(textarea);
    }
    
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
      
      const saveData = this.storageManager.importFromString(code.trim());
      this.storageManager.createBackup();
      
      // ИСПРАВЛЕНИЕ: Сохраняем данные в localStorage перед перезагрузкой
      localStorage.setItem('advancedClickerState', JSON.stringify(saveData));
      
      eventBus.emit(GameEvents.NOTIFICATION, '✅ Save loaded! Reloading...');
      
      this.createTimeout(() => {
        this.performReload('load');
      }, GAME_CONSTANTS.RELOAD_DELAY);
      
    } catch (error) {
      console.error('❌ Load error:', error);
      eventBus.emit(GameEvents.NOTIFICATION, `❌ Load failed: ${error.message}`);
    }
  }

  // ИСПРАВЛЕНИЕ: Создаем тестовый сейв с нулевыми данными
  createEmptySaveData() {
    return {
      // Все ресурсы = 0
      resources: {
        gold: 0,
        wood: 0,
        stone: 0,
        food: 0,
        water: 0,
        iron: 0,
        people: 0,
        energy: 0,
        science: 0,
        faith: 0,
        chaos: 0
      },
      
      // Сброс комбо
      combo: {
        lastZone: null,
        count: 0,
        deadline: 0,
        lastAngle: null
      },
      
      // Сброс skill points
      skillPoints: 0,
      
      // Сброс зон
      targetZone: 0,
      previousTargetZone: 0,
      
      // Сброс зданий
      buildings: {},
      
      // Сброс навыков
      skills: {},
      
      // Сброс состояний навыков
      skillStates: {
        missProtectionCharges: 0,
        autoClickerActive: false
      },
      
      // Сброс маркета
      market: {
        dailyDeals: [],
        purchaseHistory: [],
        reputation: 0,
        permanentBonuses: {}
      },
      
      // Очистка эффектов
      buffs: [],
      debuffs: [],
      blockedUntil: 0,
      effectStates: {
        starPowerClicks: 0,
        shieldBlocks: 0,
        heavyClickRequired: {},
        reverseDirection: 1,
        frozenCombo: false
      },
      
      saveTimestamp: Date.now(),
      saveVersion: '0.8.0'
    };
  }

  // ИСПРАВЛЕНИЕ: Новый метод сброса через загрузку пустого сейва
  performCompleteReset() {
    if (!this.confirmNuclearReset()) return;

    try {
      console.log('🔥💀 NUCLEAR RESET INITIATED 💀🔥');
      eventBus.emit(GameEvents.NOTIFICATION, '🔥 NUCLEAR RESET IN PROGRESS...');
      
      // Создаем резервную копию
      try {
        this.storageManager.createBackup();
        console.log('✅ Backup created before nuclear reset');
      } catch (e) {
        console.warn('⚠️ Backup failed, continuing reset:', e);
      }
      
      // ИСПРАВЛЕНИЕ: Используем пустой сейв вместо очистки localStorage
      const emptySave = this.createEmptySaveData();
      
      // Сохраняем пустые данные в localStorage
      localStorage.setItem('advancedClickerState', JSON.stringify(emptySave));
      
      // Дополнительно очищаем основной ключ
      this.storageManager.deleteSave();
      
      // Эмитируем событие сброса
      eventBus.emit(GameEvents.GAME_RESET);
      
      eventBus.emit(GameEvents.NOTIFICATION, '💀 NUCLEAR RESET COMPLETE');
      eventBus.emit(GameEvents.NOTIFICATION, '🔄 Reloading with empty data...');
      
      // Принудительная перезагрузка
      this.createTimeout(() => {
        this.performNuclearReload();
      }, GAME_CONSTANTS.NUCLEAR_RELOAD_DELAY);
      
    } catch (error) {
      console.error('💀 CRITICAL ERROR in nuclear reset:', error);
      this.emergencyNuclearReset(error);
    }
  }

  // Подтверждение сброса
  confirmNuclearReset() {
    const warnings = [
      '🔥💀 NUCLEAR GAME RESET 💀🔥\n\nThis will COMPLETELY DESTROY:\n• All progress\n• All resources\n• All buildings\n• All skills\n• All reputation\n• EVERYTHING!\n\nAre you absolutely sure?',
      '⚠️💀 FINAL WARNING 💀⚠️\n\nThere is NO UNDO!\nALL data will be PERMANENTLY DESTROYED!\n\nType "DESTROY" to confirm:'
    ];
    
    if (!confirm(warnings[0])) {
      return false;
    }
    
    const confirmation = prompt(warnings[1]);
    if (confirmation !== 'DESTROY') {
      eventBus.emit(GameEvents.NOTIFICATION, '❌ Reset cancelled - incorrect confirmation');
      return false;
    }
    
    return true;
  }

  // Ядерная перезагрузка
  performNuclearReload() {
    console.log('🔥 Performing nuclear reload...');
    
    // Принудительная перезагрузка с очисткой кэша
    try {
      window.location.href = window.location.protocol + '//' + 
                             window.location.host + 
                             window.location.pathname + 
                             '?nuclear_reset=' + Date.now() + 
                             '&cache_bust=' + Math.random();
    } catch (e) {
      try {
        window.location.reload(true);
      } catch (e2) {
        this.showManualReloadDialog('nuclear');
      }
    }
  }

  // Безопасная перезагрузка страницы
  performReload(type) {
    console.log(`🔄 Performing ${type} reload...`);
    
    try {
      const url = new URL(window.location);
      url.searchParams.set(type, Date.now().toString());
      window.location.replace(url.toString());
    } catch (e) {
      try {
        window.location.reload(true);
      } catch (e2) {
        this.showManualReloadDialog(type);
      }
    }
  }

  // Показать диалог ручной перезагрузки
  showManualReloadDialog(type) {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8); display: flex; 
      align-items: center; justify-content: center;
      z-index: 99999; font-family: Arial, sans-serif;
      color: white;
    `;
    
    const isNuclear = type === 'nuclear';
    const title = isNuclear ? '🔥💀 NUCLEAR RESET COMPLETE 💀🔥' : `🔄 ${type.toUpperCase()} COMPLETE`;
    const message = isNuclear ? 'All game data has been <strong>COMPLETELY DESTROYED</strong>!' : `${type} operation completed successfully!`;
    
    dialog.innerHTML = `
      <div style="
        background: ${isNuclear ? 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)' : '#333'}; 
        padding: 40px; border-radius: 20px; text-align: center;
        max-width: 500px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      ">
        <h2 style="margin-top: 0; font-size: 2em;">${title}</h2>
        <p style="font-size: 1.2em; margin: 20px 0;">
          ${message}
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
          background: white; color: ${isNuclear ? '#ff4444' : '#333'}; border: none;
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
      // Принудительная очистка localStorage
      localStorage.clear();
      sessionStorage.clear();
      
      // Устанавливаем пустые данные
      const emptySave = this.createEmptySaveData();
      localStorage.setItem('advancedClickerState', JSON.stringify(emptySave));
      
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

  // БОНУС: Метод для создания тестового сейва с нулевыми данными
  generateEmptySaveCode() {
    try {
      const emptySave = this.createEmptySaveData();
      return this.storageManager.encodeData(JSON.stringify(emptySave));
    } catch (error) {
      console.error('Failed to generate empty save code:', error);
      return null;
    }
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