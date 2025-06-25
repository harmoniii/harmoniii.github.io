// ui.js - Полная исправленная версия с новой системой Reset и улучшенным сохранением
import { EventBus } from './eventBus.js';
import { SKILL_CATEGORIES, SKILL_DEFS } from './skills.js';
import { BUILDING_DEFS } from './buildings.js';
import { BUFF_DEFS, DEBUFF_DEFS } from './buffs.js';
import { MARKET_CATEGORIES } from './market.js';
import { GAME_CONSTANTS } from './config.js';

export default class UIManager {
  constructor(state) {
    this.state = state;
    this.currentPanel = null;
    this.isDestroyed = false; // ИСПРАВЛЕНИЕ 2: Флаг для предотвращения утечек
    
    // ИСПРАВЛЕНИЕ 19: Отслеживание DOM элементов для очистки
    this.activeSaveElements = new Set();
    this.managedTimeouts = new Set();
    this.eventHandlers = new Map(); // Отслеживание обработчиков событий
    
    this.initElements();
    this.bindControls();
    this.bindEvents();
    this.updateResources();
    this.createEffectIndicators();
  }

  initElements() {
    this.btnBuildings    = document.getElementById('toggle-buildings');
    this.btnSkills       = document.getElementById('toggle-skills');
    this.btnMarket       = document.getElementById('toggle-market');
    this.btnInfo         = document.getElementById('info-button');
    this.resourcesLeft   = document.getElementById('resources-left');
    this.resourcesRight  = document.getElementById('resources-right');
    this.panel           = document.getElementById('panel-container');
    this.btnLoad         = document.getElementById('load-button');
    this.btnSave         = document.getElementById('save-button');
    this.btnReset        = document.getElementById('reset-button');
    this.notifications   = document.getElementById('notifications');
    this.infoModal       = document.getElementById('info-modal');
    this.mysteryModal    = document.getElementById('mystery-modal');
  }

  // ИСПРАВЛЕНИЕ 19: Улучшенная система управления таймаутами
  createManagedTimeout(callback, delay) {
    if (this.isDestroyed) return null;
    
    const timeoutId = setTimeout(() => {
      this.managedTimeouts.delete(timeoutId);
      if (!this.isDestroyed) {
        callback();
      }
    }, delay);
    
    this.managedTimeouts.add(timeoutId);
    return timeoutId;
  }

  bindControls() {
    // ИСПРАВЛЕНИЕ 19: Отслеживание обработчиков событий
    const buildingsHandler = () => {
      this.currentPanel === 'buildings' ? this.hidePanel() : this.showBuildings();
    };
    this.btnBuildings.addEventListener('click', buildingsHandler);
    this.eventHandlers.set(this.btnBuildings, { event: 'click', handler: buildingsHandler });

    const skillsHandler = () => {
      this.currentPanel === 'skills' ? this.hidePanel() : this.showSkills();
    };
    this.btnSkills.addEventListener('click', skillsHandler);
    this.eventHandlers.set(this.btnSkills, { event: 'click', handler: skillsHandler });

    const marketHandler = () => {
      this.currentPanel === 'market' ? this.hidePanel() : this.showMarket();
    };
    this.btnMarket.addEventListener('click', marketHandler);
    this.eventHandlers.set(this.btnMarket, { event: 'click', handler: marketHandler });

    const infoHandler = () => {
      this.currentPanel === 'info' ? this.hidePanel() : this.showInfo();
    };
    this.btnInfo.addEventListener('click', infoHandler);
    this.eventHandlers.set(this.btnInfo, { event: 'click', handler: infoHandler });
    
    // Modal handlers
    const infoModalHandler = () => this.infoModal.classList.add('hidden');
    this.infoModal.addEventListener('click', infoModalHandler);
    this.eventHandlers.set(this.infoModal, { event: 'click', handler: infoModalHandler });

    const mysteryModalHandler = () => this.mysteryModal.classList.add('hidden');
    this.mysteryModal.addEventListener('click', mysteryModalHandler);
    this.eventHandlers.set(this.mysteryModal, { event: 'click', handler: mysteryModalHandler });

    // ИСПРАВЛЕНИЕ 5: Улучшенная функция Save с защитой от дублирования
    const saveHandler = () => this.performSave();
    this.btnSave.addEventListener('click', saveHandler);
    this.eventHandlers.set(this.btnSave, { event: 'click', handler: saveHandler });

    // ИСПРАВЛЕНИЕ 5, 20: Улучшенная функция Load с защитой от ошибок
    const loadHandler = () => this.performLoad();
    this.btnLoad.addEventListener('click', loadHandler);
    this.eventHandlers.set(this.btnLoad, { event: 'click', handler: loadHandler });
    
    // ИСПРАВЛЕНИЕ 1: Полностью переписанная функция Reset
    const resetHandler = () => this.performCompleteReset();
    this.btnReset.addEventListener('click', resetHandler);
    this.eventHandlers.set(this.btnReset, { event: 'click', handler: resetHandler });
  }

  // ИСПРАВЛЕНИЕ 5: Улучшенная функция сохранения
  performSave() {
    if (this.activeSaveElements.size > 0) {
      this.showNotification('💾 Save already in progress...');
      return;
    }
    
    try {
      const saveData = this.createCompleteSaveData();
      console.log('💾 Creating save data:', saveData);
      
      const jsonString = JSON.stringify(saveData);
      const saveCode = btoa(encodeURIComponent(jsonString));
      
      this.displaySaveCode(saveCode);
      
    } catch (error) {
      console.error('Save error:', error);
      this.showNotification('❌ Error creating save');
    }
  }

  createCompleteSaveData() {
    // ИСПРАВЛЕНИЕ 3: Валидация skill points при сохранении
    const validatedSkillPoints = Math.max(0, Math.floor(this.state.skillPoints || 0));
    
    return {
      // Основное состояние игры
      resources: { ...this.state.resources },
      combo: { ...this.state.combo },
      skillPoints: validatedSkillPoints,
      targetZone: this.state.targetZone,
      previousTargetZone: this.state.previousTargetZone,
      
      // Здания (уровни и активность)
      buildings: this.state.buildings ? { ...this.state.buildings } : {},
      
      // Навыки (уровни)
      skills: this.state.skills ? { ...this.state.skills } : {},
      
      // Состояния навыков (заряды и т.д.)
      skillStates: this.state.skillStates ? { ...this.state.skillStates } : {},
      
      // Состояние маркета
      market: this.state.market ? { ...this.state.market } : {},
      
      // ИСПРАВЛЕНИЕ 5: НЕ сохраняем временные эффекты
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
      
      // Метаданные
      saveTimestamp: Date.now(),
      saveVersion: '0.7.4',
      gameVersion: 'alpha'
    };
  }

  displaySaveCode(saveCode) {
    const textarea = document.createElement('textarea');
    this.setupSaveTextarea(textarea, saveCode);
    
    this.activeSaveElements.add(textarea);
    document.body.appendChild(textarea);
    textarea.select();
    
    // Автокопирование в буфер обмена
    this.copyToClipboard(saveCode);
    
    // Автоматическое удаление через 10 секунд
    this.createManagedTimeout(() => {
      this.cleanupSaveElement(textarea);
    }, GAME_CONSTANTS.SAVE_ELEMENT_TIMEOUT);
    
    // Удаление по клику вне области
    const blurHandler = () => this.cleanupSaveElement(textarea);
    textarea.addEventListener('blur', blurHandler);
    textarea._blurHandler = blurHandler;
  }

  setupSaveTextarea(textarea, saveCode) {
    textarea.value = saveCode;
    textarea.style.position = 'fixed';
    textarea.style.top = '50%';
    textarea.style.left = '50%';
    textarea.style.transform = 'translate(-50%, -50%)';
    textarea.style.width = '80%';
    textarea.style.height = '200px';
    textarea.style.zIndex = '9999';
    textarea.style.background = 'white';
    textarea.style.border = '2px solid #333';
    textarea.style.padding = '10px';
    textarea.style.fontSize = '12px';
    textarea.style.borderRadius = '8px';
    textarea.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    textarea.readOnly = true;
  }

  async copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        this.showNotification('💾 Save code copied to clipboard!');
      } else {
        this.showNotification('💾 Save code ready. Copy it manually.');
      }
    } catch (error) {
      console.warn('Clipboard copy failed:', error);
      this.showNotification('💾 Save code ready. Copy it manually.');
    }
  }

  // ИСПРАВЛЕНИЕ 19: Улучшенная очистка элементов сохранения
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

  // ИСПРАВЛЕНИЕ 5, 20: Улучшенная функция загрузки с защитой от ошибок
  performLoad() {
    const code = prompt('🔄 LOAD SAVE\n\nPaste your save code:');
    if (!code || code.trim() === '') {
      this.showNotification('❌ No save code entered');
      return;
    }
    
    try {
      console.log('🔄 Starting load process...');
      
      const decoded = this.decodeSaveData(code.trim());
      this.validateSaveData(decoded);
      
      console.log('✅ Save data validated:', decoded);
      
      // Останавливаем все процессы
      this.stopAllGameProcesses();
      
      // Очищаем хранилище
      this.clearAllStorage();
      
      // Подготавливаем данные для загрузки
      const cleanedData = this.prepareSaveDataForLoad(decoded);
      
      // Сохраняем в localStorage
      const jsonString = JSON.stringify(cleanedData);
      localStorage.setItem('gameState', btoa(encodeURIComponent(jsonString)));
      console.log('✅ New save data stored');
      
      this.showNotification('✅ Save loaded! Reloading...');
      
      // Перезагружаем страницу
      this.createManagedTimeout(() => {
        this.performReload('load');
      }, GAME_CONSTANTS.RELOAD_DELAY);
      
    } catch (error) {
      console.error('❌ Load error:', error);
      this.showNotification(`❌ Load failed: ${error.message}`);
    }
  }

  // ИСПРАВЛЕНИЕ 20: Безопасное декодирование с несколькими методами
  decodeSaveData(code) {
    let decoded;
    
    try {
      // Новый метод (с encodeURIComponent)
      decoded = JSON.parse(decodeURIComponent(atob(code)));
      console.log('✅ Decoded with new method');
    } catch (e1) {
      console.log('❌ New method failed, trying old method...');
      try {
        // Старый метод (без encodeURIComponent)
        decoded = JSON.parse(atob(code));
        console.log('✅ Decoded with old method');
      } catch (e2) {
        console.error('❌ Both decode methods failed:', e1, e2);
        throw new Error('Could not decode save code - format invalid');
      }
    }
    
    return decoded;
  }

  // ИСПРАВЛЕНИЕ 20: Валидация данных сохранения
  validateSaveData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid save data - not an object');
    }
    
    if (!data.resources || typeof data.resources !== 'object') {
      throw new Error('Invalid save data - missing or invalid resources');
    }
    
    // Проверяем критические поля
    const requiredFields = ['combo', 'targetZone'];
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        console.warn(`Missing field ${field}, will use default`);
      }
    }
    
    // ИСПРАВЛЕНИЕ 3: Валидация skill points
    if (typeof data.skillPoints === 'number') {
      if (isNaN(data.skillPoints) || data.skillPoints < 0) {
        console.warn('Invalid skill points, resetting to 0');
        data.skillPoints = 0;
      } else {
        data.skillPoints = Math.floor(data.skillPoints);
      }
    }
    
    console.log('✅ Save data validation passed');
  }

  prepareSaveDataForLoad(data) {
    // Очищаем временные эффекты
    data.buffs = [];
    data.debuffs = [];
    data.blockedUntil = 0;
    data.effectStates = {
      starPowerClicks: 0,
      shieldBlocks: 0,
      heavyClickRequired: {},
      reverseDirection: 1,
      frozenCombo: false
    };
    
    // Устанавливаем значения по умолчанию для отсутствующих полей
    if (!data.combo) data.combo = { count: 0, deadline: 0, lastZone: null, lastAngle: null };
    if (typeof data.targetZone !== 'number') data.targetZone = 0;
    if (typeof data.previousTargetZone !== 'number') data.previousTargetZone = data.targetZone;
    if (!data.buildings) data.buildings = {};
    if (!data.skills) data.skills = {};
    if (!data.skillStates) data.skillStates = {};
    if (!data.market) data.market = {};
    if (typeof data.skillPoints !== 'number') data.skillPoints = 0;
    
    return data;
  }

  // ИСПРАВЛЕНИЕ 1: Полностью переписанная функция Reset
  performCompleteReset() {
    if (!confirm('🔥 COMPLETE GAME RESET 🔥\n\nThis will delete ALL data forever!\nAre you sure?')) {
      return;
    }
    
    if (!confirm('⚠️ FINAL WARNING ⚠️\n\nAll progress will be lost!\nContinue reset?')) {
      return;
    }
    
    try {
      console.log('🔥 COMPLETE RESET INITIATED 🔥');
      this.showNotification('🔥 RESETTING GAME...');
      
      // 1. Останавливаем все игровые процессы
      this.stopAllGameProcesses();
      
      // 2. Полностью очищаем все хранилища
      this.performNuclearStorageClear();
      
      // 3. Очищаем все DOM элементы созданные игрой
      this.cleanupAllDOMElements();
      
      // 4. Очищаем EventBus
      EventBus.clearAll();
      
      // 5. Уничтожаем UIManager
      this.destroy();
      
      this.showNotification('💀 GAME DESTROYED');
      this.showNotification('🔄 Reloading...');
      
      // 6. Перезагружаем страницу через несколько секунд
      setTimeout(() => {
        this.performReload('reset');
      }, GAME_CONSTANTS.NUCLEAR_RELOAD_DELAY);
      
    } catch (error) {
      console.error('💀 CRITICAL ERROR in reset:', error);
      this.emergencyReset(error);
    }
  }

  stopAllGameProcesses() {
    try {
      console.log('🛑 Stopping all game processes...');
      
      if (this.state.featureMgr && typeof this.state.featureMgr.stopAllEffects === 'function') {
        this.state.featureMgr.stopAllEffects();
      }
      
      if (this.state.buildingManager && typeof this.state.buildingManager.stopAllProduction === 'function') {
        this.state.buildingManager.stopAllProduction();
      }
      
      if (this.state.skillManager && typeof this.state.skillManager.stopAllGeneration === 'function') {
        this.state.skillManager.stopAllGeneration();
      }
      
      if (this.state.buffManager && typeof this.state.buffManager.stopAllEffects === 'function') {
        this.state.buffManager.stopAllEffects();
      }
      
      console.log('✅ All game processes stopped');
    } catch (error) {
      console.warn('⚠️ Error stopping game processes:', error);
    }
  }

  performNuclearStorageClear() {
    try {
      console.log('💥 Nuclear storage clear...');
      
      // Очищаем localStorage полностью
      const localStorageKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        localStorageKeys.push(localStorage.key(i));
      }
      localStorageKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn(`Failed to remove localStorage key: ${key}`, e);
        }
      });
      
      // Очищаем sessionStorage полностью
      const sessionStorageKeys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        sessionStorageKeys.push(sessionStorage.key(i));
      }
      sessionStorageKeys.forEach(key => {
        try {
          sessionStorage.removeItem(key);
        } catch (e) {
          console.warn(`Failed to remove sessionStorage key: ${key}`, e);
        }
      });
      
      // Дополнительная очистка
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.warn('Failed to clear storage:', e);
      }
      
      console.log('✅ Storage completely cleared');
    } catch (error) {
      console.warn('⚠️ Error clearing storage:', error);
    }
  }

  cleanupAllDOMElements() {
    try {
      console.log('🧹 Cleaning up DOM elements...');
      
      // Очищаем все наши созданные элементы
      this.cleanupAllSaveElements();
      this.cleanupEffectIndicators();
      this.cleanupNotifications();
      
      // Сбрасываем панели
      if (this.panel) {
        this.panel.innerHTML = '';
        this.panel.classList.add('hidden');
      }
      
      console.log('✅ DOM cleanup complete');
    } catch (error) {
      console.warn('⚠️ Error cleaning DOM:', error);
    }
  }

  cleanupAllSaveElements() {
    // Очищаем все активные элементы сохранения
    const elementsToClean = Array.from(this.activeSaveElements);
    elementsToClean.forEach(element => {
      this.cleanupSaveElement(element);
    });
    this.activeSaveElements.clear();
  }

  cleanupEffectIndicators() {
    const container = document.getElementById('effect-indicators');
    if (container) {
      container.innerHTML = '';
    }
  }

  cleanupNotifications() {
    if (this.notifications) {
      this.notifications.innerHTML = '';
    }
  }

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

  emergencyReset(error) {
    console.error('💀 EMERGENCY RESET ACTIVATED');
    
    try {
      // Экстренная очистка
      localStorage.clear();
      sessionStorage.clear();
      
      // Удаляем все созданные элементы
      this.activeSaveElements.forEach(element => {
        try {
          if (document.body.contains(element)) {
            document.body.removeChild(element);
          }
        } catch (e) {
          console.warn('Failed to remove element:', e);
        }
      });
      
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

  clearAllStorage() {
    try {
      localStorage.clear();
      sessionStorage.clear();
      console.log('✅ Storage cleared for load');
    } catch (error) {
      console.warn('⚠️ Error clearing storage for load:', error);
    }
  }

  // ИСПРАВЛЕНИЕ 2, 19: Правильное уничтожение UIManager
  destroy() {
    this.isDestroyed = true;
    
    // Очищаем все таймауты
    for (const timeoutId of this.managedTimeouts) {
      clearTimeout(timeoutId);
    }
    this.managedTimeouts.clear();
    
    // Удаляем все обработчики событий
    for (const [element, { event, handler }] of this.eventHandlers) {
      try {
        element.removeEventListener(event, handler);
      } catch (e) {
        console.warn('Failed to remove event listener:', e);
      }
    }
    this.eventHandlers.clear();
    
    // Очищаем все элементы сохранения
    this.cleanupAllSaveElements();
    
    console.log('🧹 UIManager destroyed');
  }

  // Create effect indicators
  createEffectIndicators() {
    if (!document.getElementById('effect-indicators')) {
      const indicatorContainer = document.createElement('div');
      indicatorContainer.id = 'effect-indicators';
      indicatorContainer.className = 'effect-indicators';
      document.body.appendChild(indicatorContainer);
    }
  }

  // Update effect indicators
  updateEffectIndicators() {
    const container = document.getElementById('effect-indicators');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Show active buffs
    if (this.state.buffs && this.state.buffs.length > 0) {
      this.state.buffs.forEach(buffId => {
        const buffDef = BUFF_DEFS.find(b => b.id === buffId);
        if (buffDef) {
          const indicator = document.createElement('div');
          indicator.className = 'effect-indicator buff-indicator';
          indicator.innerHTML = `
            <span class="effect-icon">${buffDef.name.split(' ')[0]}</span>
            <span class="effect-name">${buffDef.name}</span>
          `;
          indicator.title = buffDef.description;
          container.appendChild(indicator);
        }
      });
    }
    
    // Show active debuffs
    if (this.state.debuffs && this.state.debuffs.length > 0) {
      this.state.debuffs.forEach(debuffId => {
        const debuffDef = DEBUFF_DEFS.find(d => d.id === debuffId);
        if (debuffDef) {
          const indicator = document.createElement('div');
          indicator.className = 'effect-indicator debuff-indicator';
          indicator.innerHTML = `
            <span class="effect-icon">${debuffDef.name.split(' ')[0]}</span>
            <span class="effect-name">${debuffDef.name}</span>
          `;
          indicator.title = debuffDef.description;
          container.appendChild(indicator);
        }
      });
    }
  }

  bindEvents() {
    // ИСПРАВЛЕНИЕ 7: Нормализованная обработка событий
    const eventHandlers = {
      'resourceChanged': () => this.updateResources(),
      'comboChanged': () => this.updateResources(),
      'skillPointsChanged': () => this.updateResources(),
      
      'buffApplied': (data) => {
        const message = data && data.name ? `✨ Buff: ${data.name}` : '✨ Buff applied';
        this.showNotification(message);
        this.updateEffectIndicators();
      },
      
      'debuffApplied': (data) => {
        const message = data && data.name ? `💀 Debuff: ${data.name}` : '💀 Debuff applied';
        this.showNotification(message);
        this.updateEffectIndicators();
      },
      
      'buffExpired': (data) => {
        const message = data && data.name ? `⏰ Buff expired: ${data.name}` : '⏰ Buff expired';
        this.showNotification(message);
        this.updateEffectIndicators();
      },
      
      'debuffExpired': (data) => {
        const message = data && data.name ? `⏰ Debuff expired: ${data.name}` : '⏰ Debuff expired';
        this.showNotification(message);
        this.updateEffectIndicators();
      },

      'tempNotification': (data) => {
        const message = (data && data.message) || data || 'Unknown notification';
        this.showNotification(message);
      },
      
      'mysteryBox': (data) => {
        if (data && Array.isArray(data)) {
          this.showMysteryModal(data);
        }
      },
      
      'buildingBought': () => {
        if (this.currentPanel === 'buildings') {
          this.showBuildings();
        }
      },
      
      'skillBought': () => {
        if (this.currentPanel === 'skills') {
          this.showSkills();
        }
      },
    
      'itemPurchased': () => {
        if (this.currentPanel === 'market') {
          this.showMarket();
        }
      },
    
      // Skill events
      'criticalHit': (data) => {
        const damage = (data && data.damage) || 'Unknown';
        this.showSkillNotification('💥 Critical Strike!', `Double damage: ${damage} gold`);
      },
    
      'bonusResourceFound': (data) => {
        const amount = (data && data.amount) || 'Unknown';
        const resource = (data && data.resource) || 'Unknown';
        this.showSkillNotification('🎰 Slot Win!', `+${amount} ${resource}`);
      },

      'shieldBlock': (data) => {
        const debuff = (data && data.debuff) || 'Unknown';
        const remaining = (data && data.remaining) || 0;
        this.showSkillNotification('🛡️ Shield Block!', `Blocked ${debuff} (${remaining} left)`);
      },

      'taxCollected': (data) => {
        const percent = (data && data.percent) || 'Unknown';
        this.showNotification(`💸 Tax Collector: -${percent}% all resources`);
      },

      'heavyClickProgress': (data) => {
        const current = (data && data.current) || 'Unknown';
        const required = (data && data.required) || 'Unknown';
        const zone = (data && data.zone !== undefined) ? ` (Zone ${data.zone})` : '';
        this.showNotification(`⚖️ Heavy Click: ${current}/${required}${zone}`);
      },

      'ghostClick': () => {
        this.showNotification('👻 Ghost Click: Ignored!');
      }
    };

    // Подписываемся на все события
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      EventBus.subscribe(event, handler);
    });
  }
  
  // New method for skill notifications
  showSkillNotification(title, description) {
    if (this.isDestroyed) return;
    
    const div = document.createElement('div');
    div.className = 'notification skill-notification';
    div.innerHTML = `
      <div class="skill-notification-title">${title}</div>
      <div class="skill-notification-desc">${description}</div>
    `;
    this.notifications.appendChild(div);
    
    this.createManagedTimeout(() => {
      if (div.parentNode) {
        div.remove();
      }
    }, GAME_CONSTANTS.SKILL_NOTIFICATION_DURATION);
  }

  updateResources() {
    if (this.isDestroyed) return;
    
    // Reset
    this.resourcesLeft.innerHTML  = '';
    this.resourcesRight.innerHTML = '';
    
    // Main resources
    ['gold','wood','stone','food','water','iron'].forEach(key => {
      const val = this.state.resources[key] || 0;
      this.resourcesLeft.appendChild(this.createResourceElem(key, val));
      this.resourcesLeft.appendChild(document.createElement('br'));
    });
    
    // Other resources
    Object.keys(this.state.resources)
      .filter(key => !['gold','wood','stone','food','water','iron'].includes(key))
      .forEach(key => {
        const val = this.state.resources[key];
        this.resourcesRight.appendChild(this.createResourceElem(key, val));
        this.resourcesRight.appendChild(document.createElement('br'));
      });
    
    // Combo
    const combo = document.createElement('div');
    combo.textContent = `Combo: ${this.state.combo.count}`;
    this.resourcesRight.appendChild(combo);
    
    // ИСПРАВЛЕНИЕ 3: Skill Points отображаются как целое число
    const sp = document.createElement('div');
    sp.textContent = `Skill Points: ${Math.floor(this.state.skillPoints || 0)}`;
    this.resourcesRight.appendChild(sp);

    // Update effect indicators
    this.updateEffectIndicators();
  }

  createResourceElem(key, val) {
    const span = document.createElement('span');
    span.textContent = `${this.getEmoji(key)} ${Number(val).toFixed(1)}`;
    span.addEventListener('mouseenter', e => this.showTooltip(e, key));
    span.addEventListener('mouseleave',  () => this.hideTooltip());
    return span;
  }

  getEmoji(res) {
    return {
      gold: '🪙', wood: '🌲', stone: '🪨', food: '🍎',
      water: '💧', iron: '⛓️', people: '👥', energy: '⚡',
      science: '🔬', faith: '🙏', chaos: '🌪️', skillPoints: '✨'
    }[res] || res;
  }

  showTooltip(e, key) {
    if (this.isDestroyed) return;
    
    if (!this.tooltip) {
      this.tooltip = document.createElement('div');
      this.tooltip.className = 'tooltip';
      document.body.appendChild(this.tooltip);
    }
    this.tooltip.textContent = key;
    this.tooltip.style.top     = `${e.pageY + GAME_CONSTANTS.TOOLTIP_OFFSET}px`;
    this.tooltip.style.left    = `${e.pageX + GAME_CONSTANTS.TOOLTIP_OFFSET}px`;
    this.tooltip.style.display = 'block';
  }

  hideTooltip() {
    if (this.tooltip) this.tooltip.style.display = 'none';
  }

  // INFO panel implementation
  showInfo() {
    this.currentPanel = 'info';
    this.panel.innerHTML = '<h2>📚 Effect Information</h2>';
    
    // Buffs section
    const buffsSection = document.createElement('div');
    buffsSection.className = 'category-section';
    buffsSection.innerHTML = '<h3>✨ Buffs (Positive Effects)</h3>';
    
    BUFF_DEFS.forEach(buff => {
      const buffCard = document.createElement('div');
      buffCard.className = 'item-card buff-card';
      buffCard.innerHTML = `
        <div class="item-header">
          <span class="item-icon">${buff.name.split(' ')[0]}</span>
          <span class="item-name">${buff.name}</span>
          <span class="item-level rarity-${buff.rarity}">${buff.rarity}</span>
        </div>
        <div class="item-description">${buff.description}</div>
        <div class="item-details">
          ${buff.duration ? `<div>⏱️ Duration: ${buff.duration} seconds</div>` : '<div>⚡ Instant effect</div>'}
        </div>
      `;
      buffsSection.appendChild(buffCard);
    });
    
    // Debuffs section
    const debuffsSection = document.createElement('div');
    debuffsSection.className = 'category-section';
    debuffsSection.innerHTML = '<h3>💀 Debuffs (Negative Effects)</h3>';
    
    DEBUFF_DEFS.forEach(debuff => {
      const debuffCard = document.createElement('div');
      debuffCard.className = 'item-card debuff-card';
      debuffCard.innerHTML = `
        <div class="item-header">
          <span class="item-icon">${debuff.name.split(' ')[0]}</span>
          <span class="item-name">${debuff.name}</span>
          <span class="item-level severity-${debuff.severity}">${debuff.severity}</span>
        </div>
        <div class="item-description">${debuff.description}</div>
        <div class="item-details">
          ${debuff.duration ? `<div>⏱️ Duration: ${debuff.duration} seconds</div>` : '<div>⚡ Instant effect</div>'}
        </div>
      `;
      debuffsSection.appendChild(debuffCard);
    });

    // Rules section
    const rulesSection = document.createElement('div');
    rulesSection.className = 'category-section';
    rulesSection.innerHTML = `
      <h3>⚖️ Effect Rules</h3>
      <div class="item-card rules-card">
        <div class="item-description">
          <p><strong>Base chance:</strong> 10% per click to get an effect</p>
          <p><strong>Resource influence:</strong></p>
          <ul>
            <li>🙏 <strong>Faith</strong> increases buff chance</li>
            <li>🌪️ <strong>Chaos</strong> increases debuff chance</li>
          </ul>
          <p><strong>Modifiers:</strong></p>
          <ul>
            <li>💎 <strong>Lucky Zone</strong> buff: +${GAME_CONSTANTS.LUCKY_BUFF_BONUS}% buff chance</li>
            <li>🍀 <strong>Lucky Charm</strong> skill: increases buff chance</li>
            <li>🛡️ <strong>Shield</strong> buff: blocks next ${GAME_CONSTANTS.SHIELD_BLOCKS} debuffs</li>
          </ul>
        </div>
      </div>
    `;

    this.panel.appendChild(buffsSection);
    this.panel.appendChild(debuffsSection);
    this.panel.appendChild(rulesSection);
    this.panel.classList.remove('hidden');
  }

  // Market function
  showMarket() {
    this.currentPanel = 'market';
    this.panel.innerHTML = '<h2>🛒 Market</h2>';
    
    const description = document.createElement('div');
    description.style.textAlign = 'center';
    description.style.marginBottom = '2rem';
    description.style.fontSize = '1.1rem';
    description.style.color = '#666';
    description.innerHTML = `
      <p>💰 Trade resources and special items</p>
      <p>Reputation: <strong>${this.state.marketManager ? this.state.marketManager.getMarketReputation() : 0}</strong></p>
    `;
    this.panel.appendChild(description);

    // Get item categories
    const categories = this.state.marketManager ? 
      this.state.marketManager.getItemsByCategory() : {};

    Object.entries(categories).forEach(([categoryId, items]) => {
      const categorySection = document.createElement('div');
      categorySection.className = 'category-section';
      categorySection.innerHTML = `<h3>${MARKET_CATEGORIES[categoryId] || categoryId}</h3>`;
      
      const itemsGrid = document.createElement('div');
      itemsGrid.className = 'market-grid';
      
      items.forEach(item => {
        const itemCard = this.createMarketItemCard(item);
        itemsGrid.appendChild(itemCard);
      });
      
      categorySection.appendChild(itemsGrid);
      this.panel.appendChild(categorySection);
    });

    this.panel.classList.remove('hidden');
  }

  createMarketItemCard(item) {
    const card = document.createElement('div');
    card.className = 'item-card market-card';
    
    card.innerHTML = `
      <div class="item-header">
        <span class="item-icon">${item.icon}</span>
        <span class="item-name">${item.name}</span>
      </div>
      <div class="item-description">${item.description}</div>
      <div class="item-details">
        <div>💰 Price: ${item.priceText}</div>
        <div>🎁 Reward: ${item.rewardText}</div>
      </div>
      <div class="item-footer">
        <button class="buy-button ${item.canAfford ? '' : 'disabled'}" 
                ${item.canAfford ? '' : 'disabled'}>
          Buy
        </button>
      </div>
    `;

    const buyButton = card.querySelector('.buy-button');
    const buyHandler = () => {
      if (this.state.marketManager && this.state.marketManager.buyItem(item.id)) {
        this.showNotification(`Bought: ${item.name}`);
        this.showMarket(); // Update panel
      } else {
        this.showNotification('Not enough resources!');
      }
    };
    buyButton.addEventListener('click', buyHandler);

    return card;
  }

  showBuildings() {
    this.currentPanel = 'buildings';
    this.panel.innerHTML = '<h2>🏗️ Buildings</h2>';
    
    // Group buildings by categories
    const categories = {};
    BUILDING_DEFS.forEach(def => {
      if (!categories[def.category]) {
        categories[def.category] = [];
      }
      categories[def.category].push(def);
    });

    Object.entries(categories).forEach(([category, buildings]) => {
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'category-section';
      categoryDiv.innerHTML = `<h3>${this.getCategoryName(category)}</h3>`;
      
      buildings.forEach(def => {
        const buildingInfo = this.state.buildingManager.getBuildingInfo(def.id);
        if (!buildingInfo) return;
        
        const buildingCard = this.createBuildingCard(def, buildingInfo);
        categoryDiv.appendChild(buildingCard);
      });
      
      this.panel.appendChild(categoryDiv);
    });
    
    this.panel.classList.remove('hidden');
  }

  // ИСПРАВЛЕНИЕ 16: Создание карточки здания с общими методами
  createBuildingCard(def, buildingInfo) {
    const card = document.createElement('div');
    card.className = 'item-card';
    
    const header = this.createItemHeader(def.img, def.name, `Level: ${buildingInfo.currentLevel}/${def.maxLevel}`);
    const description = this.createItemDescription(def.description);
    const details = this.createBuildingDetails(buildingInfo, def);
    const footer = this.createBuildingFooter(def, buildingInfo);
    
    card.appendChild(header);
    card.appendChild(description);
    card.appendChild(details);
    card.appendChild(footer);
    
    return card;
  }

  createBuildingDetails(buildingInfo, def) {
    const details = document.createElement('div');
    details.className = 'item-details';
    
    if (buildingInfo.productionRate) {
      details.innerHTML += `<div>📈 Production: ${buildingInfo.productionRate}</div>`;
    }
    
    if (def.special) {
      details.innerHTML += `<div>✨ Special: ${def.special.description || 'Special effect'}</div>`;
    }
    
    return details;
  }

  createBuildingFooter(def, buildingInfo) {
    const footer = document.createElement('div');
    footer.className = 'item-footer';
    
    if (buildingInfo.isMaxLevel) {
      footer.innerHTML = '<span class="max-level">🏆 MAX LEVEL</span>';
    } else {
      const priceText = Object.entries(buildingInfo.nextPrice)
        .map(([r, a]) => `${a} ${this.getEmoji(r)}`)
        .join(' ');
      
      footer.innerHTML = `
        <span class="price">Price: ${priceText}</span>
        <button class="buy-button ${buildingInfo.canAfford ? '' : 'disabled'}" 
                ${buildingInfo.canAfford ? '' : 'disabled'}>
          Upgrade
        </button>
      `;
      
      const buyButton = footer.querySelector('.buy-button');
      const buyHandler = () => {
        if (this.state.buildingManager.buyBuilding(def.id)) {
          this.showNotification(`${def.name} upgraded!`);
          this.showBuildings();
        } else {
          this.showNotification('Not enough resources');
        }
      };
      buyButton.addEventListener('click', buyHandler);
    }
    
    return footer;
  }

  showSkills() {
    this.currentPanel = 'skills';
    this.panel.innerHTML = '<h2>🎯 Skills</h2>';
    
    // Group skills by categories
    const categories = {};
    SKILL_DEFS.forEach(def => {
      if (!categories[def.category]) {
        categories[def.category] = [];
      }
      categories[def.category].push(def);
    });

    Object.entries(categories).forEach(([category, skills]) => {
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'category-section';
      categoryDiv.innerHTML = `<h3>${SKILL_CATEGORIES[category]}</h3>`;
      
      skills.forEach(def => {
        const skillInfo = this.state.skillManager.getSkillInfo(def.id);
        if (!skillInfo) return;
        
        const skillCard = this.createSkillCard(def, skillInfo);
        categoryDiv.appendChild(skillCard);
      });
      
      this.panel.appendChild(categoryDiv);
    });
    
    this.panel.classList.remove('hidden');
  }

  // ИСПРАВЛЕНИЕ 16: Создание карточки навыка с общими методами
  createSkillCard(def, skillInfo) {
    const card = document.createElement('div');
    card.className = 'item-card';
    
    const header = this.createItemHeader(def.icon, def.name, `Level: ${skillInfo.currentLevel}/${def.maxLevel}`);
    const description = this.createItemDescription(def.description);
    const details = this.createSkillDetails(skillInfo, def);
    const footer = this.createSkillFooter(def, skillInfo);
    
    card.appendChild(header);
    card.appendChild(description);
    card.appendChild(details);
    card.appendChild(footer);
    
    return card;
  }

  createSkillDetails(skillInfo, def) {
    const details = document.createElement('div');
    details.className = 'item-details';
    
    if (skillInfo.currentLevel > 0) {
      const currentEffect = (skillInfo.currentEffect * 100).toFixed(1);
      details.innerHTML += `<div>💪 Current effect: ${currentEffect}%</div>`;
    }
    
    const effectType = this.getEffectTypeDescription(def.effect.type);
    details.innerHTML += `<div>🎯 Type: ${effectType}</div>`;
    
    return details;
  }

  createSkillFooter(def, skillInfo) {
    const footer = document.createElement('div');
    footer.className = 'item-footer';
    
    if (skillInfo.isMaxLevel) {
      footer.innerHTML = '<span class="max-level">🏆 MAX LEVEL</span>';
    } else {
      footer.innerHTML = `
        <span class="price">Price: ${skillInfo.nextCost} ✨ SP</span>
        <button class="buy-button ${skillInfo.canAfford ? '' : 'disabled'}" 
                ${skillInfo.canAfford ? '' : 'disabled'}>
          Learn
        </button>
      `;
      
      const buyButton = footer.querySelector('.buy-button');
      const buyHandler = () => {
        if (this.state.skillManager.buySkill(def.id)) {
          this.showNotification(`${def.name} learned!`);
          this.showSkills();
        } else {
          this.showNotification('Not enough Skill Points');
        }
      };
      buyButton.addEventListener('click', buyHandler);
    }
    
    return footer;
  }

  // ИСПРАВЛЕНИЕ 16: Общие методы для создания элементов карточек
  createItemHeader(icon, name, level) {
    const header = document.createElement('div');
    header.className = 'item-header';
    header.innerHTML = `
      <span class="item-icon">${icon}</span>
      <span class="item-name">${name}</span>
      <span class="item-level">${level}</span>
    `;
    return header;
  }

  createItemDescription(description) {
    const desc = document.createElement('div');
    desc.className = 'item-description';
    desc.textContent = description;
    return desc;
  }

  getCategoryName(category) {
    const names = {
      'production': '🏭 Production',
      'population': '👥 Population', 
      'advanced': '🔬 Advanced',
      'special': '✨ Special'
    };
    return names[category] || category;
  }

  getEffectTypeDescription(type) {
    const types = {
      'multiplier': 'Multiplier',
      'chance': 'Chance',
      'generation': 'Generation',
      'reduction': 'Reduction',
      'duration': 'Duration',
      'automation': 'Automation',
      'protection': 'Protection',
      'charges': 'Charges',
      'preview': 'Preview'
    };
    return types[type] || type;
  }

  hidePanel() {
    this.currentPanel = null;
    this.panel.classList.add('hidden');
  }

  showMysteryModal(opts) {
    if (this.isDestroyed) return;
    
    this.mysteryModal.innerHTML = '<h3>📦 Mystery Box</h3><p>Choose your reward:</p>';
    
    opts.forEach(r => {
      const btn = document.createElement('button');
      btn.textContent = `${this.getEmoji(r)} +5 ${r}`;
      btn.style.margin = '5px';
      
      const clickHandler = () => {
        // Проверяем валидность ресурса
        if (this.state.resources.hasOwnProperty(r)) {
          const newAmount = Math.min(
            this.state.resources[r] + 5,
            GAME_CONSTANTS.MAX_SAFE_RESOURCE_VALUE
          );
          this.state.resources[r] = newAmount;
          EventBus.emit('resourceChanged', { resource: r, amount: this.state.resources[r] });
          this.mysteryModal.classList.add('hidden');
          this.showNotification(`Received: +5 ${r}`);
        } else {
          console.warn(`Invalid resource in mystery box: ${r}`);
          this.showNotification(`Invalid reward: ${r}`);
        }
      };
      
      btn.addEventListener('click', clickHandler);
      this.mysteryModal.appendChild(btn);
      this.mysteryModal.appendChild(document.createElement('br'));
    });
    
    this.mysteryModal.classList.remove('hidden');
  }

  showNotification(msg) {
    if (this.isDestroyed) return;
    
    const div = document.createElement('div');
    div.className = 'notification';
    div.textContent = msg || 'Unknown notification';
    this.notifications.appendChild(div);
    
    this.createManagedTimeout(() => {
      if (div.parentNode) {
        div.remove();
      }
    }, GAME_CONSTANTS.NOTIFICATION_DURATION);
  }
}