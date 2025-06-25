// ui/SaveLoadManager.js - ИСПРАВЛЕННАЯ версия с генерацией пустого кода
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
      
      // Сохраняем данные в localStorage перед перезагрузкой
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

  // ИСПРАВЛЕНИЕ: Создаем пустой сейв с нулевыми данными
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

  // ИСПРАВЛЕНИЕ: Генерация кода сброса вместо ядерного уничтожения
  performReset() {
    if (!this.confirmReset()) return;

    try {
      console.log('🔄 Generating reset save code...');
      
      // Создаем пустые данные
      const emptySave = this.createEmptySaveData();
      
      // Генерируем код для пустого сейва
      const resetCode = this.storageManager.encodeData(JSON.stringify(emptySave));
      
      if (!resetCode) {
        throw new Error('Failed to generate reset code');
      }

      // Отображаем код сброса
      this.displayResetCode(resetCode);
      
      eventBus.emit(GameEvents.NOTIFICATION, '🔄 Reset code generated! Load it to reset your game.');
      
    } catch (error) {
      console.error('❌ Reset code generation failed:', error);
      eventBus.emit(GameEvents.NOTIFICATION, `❌ Reset failed: ${error.message}`);
    }
  }

  // Отобразить код сброса
  displayResetCode(resetCode) {
    const textarea = this.createResetTextarea(resetCode);
    this.activeSaveElements.add(textarea);
    document.body.appendChild(textarea);
    
    textarea.focus();
    textarea.select();
    
    this.copyToClipboard(resetCode);
    
    this.createTimeout(() => {
      this.cleanupSaveElement(textarea);
    }, GAME_CONSTANTS.SAVE_ELEMENT_TIMEOUT);
    
    const blurHandler = () => this.cleanupSaveElement(textarea);
    textarea.addEventListener('blur', blurHandler);
    textarea._blurHandler = blurHandler;
  }

  // Создать textarea для кода сброса
  createResetTextarea(resetCode) {
    const textarea = document.createElement('textarea');
    textarea.value = resetCode;
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
      background: '#ffeeee',
      border: '3px solid #ff4444',
      borderRadius: '8px',
      padding: '10px',
      fontSize: '12px',
      fontFamily: 'monospace',
      boxShadow: '0 4px 20px rgba(255,68,68,0.3)',
      resize: 'none'
    });
    
    return textarea;
  }

  // Подтверждение сброса
  confirmReset() {
    const message = `🔄 GAME RESET

This will generate a save code that resets:
• All resources to 0
• All buildings to level 0
• All skills to level 0
• All progress to beginning

The reset code will be generated for you to load manually.
Your current save will NOT be automatically deleted.

Continue?`;
    
    return confirm(message);
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
    
    dialog.innerHTML = `
      <div style="
        background: #333; padding: 40px; border-radius: 20px; text-align: center;
        max-width: 500px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      ">
        <h2 style="margin-top: 0; font-size: 2em;">🔄 ${type.toUpperCase()} COMPLETE</h2>
        <p style="font-size: 1.2em; margin: 20px 0;">
          ${type} operation completed successfully!
        </p>
        <p style="margin: 20px 0;">
          Please manually refresh the page:
        </p>
        <div style="font-size: 1.1em; margin: 20px 0;">
          <div>• Press <strong>F5</strong></div>
          <div>• Press <strong>Ctrl+R</strong> (or Cmd+R on Mac)</div>
          <div>• Close and reopen the page</div>
        </div>
        <button onclick="window.location.reload(true)" style="
          background: #4CAF50; color: white; border: none;
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

  // Генерация кода с пустыми данными (для отладки)
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