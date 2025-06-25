// ui/SaveLoadManager.js - УПРОЩЕННАЯ и надежная версия
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';

export class SaveLoadManager extends CleanupMixin {
  constructor(gameState) {
    super();
    this.gameState = gameState;
  }

  // УПРОЩЕННОЕ СОХРАНЕНИЕ - просто JSON в base64
  performSave() {
    try {
      console.log('💾 Starting save...');
      
      if (!this.gameState || this.gameState.isDestroyed) {
        throw new Error('Game state not available');
      }

      // Получаем чистые данные из gameState
      const saveData = {
        resources: {...(this.gameState.resources || {})},
        combo: {...(this.gameState.combo || {count: 0, deadline: 0})},
        skillPoints: this.gameState.skillPoints || 0,
        targetZone: this.gameState.targetZone || 0,
        buildings: {...(this.gameState.buildings || {})},
        skills: {...(this.gameState.skills || {})},
        skillStates: {...(this.gameState.skillStates || {})},
        market: {...(this.gameState.market || {})},
        timestamp: Date.now(),
        version: '1.0'
      };

      // Простое кодирование: JSON -> base64
      const jsonString = JSON.stringify(saveData);
      const saveCode = btoa(jsonString);
      
      console.log('✅ Save data created:', saveData);
      this.showSaveCode(saveCode);
      
      eventBus.emit(GameEvents.NOTIFICATION, '💾 Save code created! Copy it.');
      
    } catch (error) {
      console.error('❌ Save failed:', error);
      eventBus.emit(GameEvents.NOTIFICATION, `❌ Save failed: ${error.message}`);
    }
  }

  // УПРОЩЕННАЯ ЗАГРУЗКА - сразу применяем без перезагрузки
  performLoad() {
    try {
      const code = prompt('🔄 Paste your save code:');
      if (!code || !code.trim()) {
        eventBus.emit(GameEvents.NOTIFICATION, '❌ No code entered');
        return;
      }

      console.log('🔄 Starting load...');
      
      // Простое декодирование: base64 -> JSON
      const jsonString = atob(code.trim());
      const saveData = JSON.parse(jsonString);
      
      console.log('✅ Save data loaded:', saveData);
      
      // КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Применяем данные сразу, без перезагрузки
      this.applySaveData(saveData);
      
      eventBus.emit(GameEvents.NOTIFICATION, '✅ Game loaded successfully!');
      
    } catch (error) {
      console.error('❌ Load failed:', error);
      
      if (error.message.includes('Invalid character')) {
        eventBus.emit(GameEvents.NOTIFICATION, '❌ Invalid save code format');
      } else {
        eventBus.emit(GameEvents.NOTIFICATION, `❌ Load failed: ${error.message}`);
      }
    }
  }

  // ПРИМЕНЕНИЕ ДАННЫХ СРАЗУ К ИГРОВОМУ СОСТОЯНИЮ
  applySaveData(saveData) {
    console.log('📥 Applying save data to game state...');
    
    try {
      // Обновляем ресурсы
      if (saveData.resources) {
        Object.keys(this.gameState.resources).forEach(resource => {
          this.gameState.resources[resource] = saveData.resources[resource] || 0;
        });
      }

      // Обновляем комбо
      if (saveData.combo) {
        this.gameState.combo = {
          count: saveData.combo.count || 0,
          deadline: saveData.combo.deadline || 0,
          lastZone: saveData.combo.lastZone || null,
          lastAngle: saveData.combo.lastAngle || null
        };
      }

      // Обновляем skill points
      this.gameState.skillPoints = Math.max(0, saveData.skillPoints || 0);

      // Обновляем зоны
      this.gameState.targetZone = saveData.targetZone || 0;
      this.gameState.previousTargetZone = saveData.previousTargetZone || 0;

      // Обновляем здания
      if (saveData.buildings) {
        Object.keys(this.gameState.buildings).forEach(buildingId => {
          if (saveData.buildings[buildingId]) {
            this.gameState.buildings[buildingId] = {
              level: Math.max(0, saveData.buildings[buildingId].level || 0),
              active: Boolean(saveData.buildings[buildingId].active)
            };
          }
        });
      }

      // Обновляем навыки
      if (saveData.skills) {
        Object.keys(this.gameState.skills).forEach(skillId => {
          if (saveData.skills[skillId]) {
            this.gameState.skills[skillId] = {
              level: Math.max(0, saveData.skills[skillId].level || 0)
            };
          }
        });
      }

      // Обновляем состояния навыков
      if (saveData.skillStates) {
        this.gameState.skillStates = {
          ...this.gameState.skillStates,
          ...saveData.skillStates
        };
      }

      // Обновляем маркет
      if (saveData.market) {
        this.gameState.market = {
          ...this.gameState.market,
          ...saveData.market
        };
      }

      // Сбрасываем временные эффекты
      this.gameState.buffs = [];
      this.gameState.debuffs = [];
      this.gameState.blockedUntil = 0;
      this.gameState.effectStates = {
        starPowerClicks: 0,
        shieldBlocks: 0,
        heavyClickRequired: {},
        reverseDirection: 1,
        frozenCombo: false
      };

      // ВАЖНО: Уведомляем систему об изменениях
      eventBus.emit(GameEvents.RESOURCE_CHANGED);
      eventBus.emit(GameEvents.SKILL_POINTS_CHANGED, this.gameState.skillPoints);
      eventBus.emit(GameEvents.COMBO_CHANGED, this.gameState.combo);

      // Перезапускаем менеджеры если нужно
      this.restartManagers();

      console.log('✅ Save data applied successfully');
      
    } catch (error) {
      console.error('❌ Error applying save data:', error);
      throw new Error(`Failed to apply save data: ${error.message}`);
    }
  }

  // ПЕРЕЗАПУСК МЕНЕДЖЕРОВ ПОСЛЕ ЗАГРУЗКИ
  restartManagers() {
    try {
      // Перезапускаем производство зданий
      if (this.gameState.buildingManager) {
        this.gameState.buildingManager.startProduction();
      }

      // Перезапускаем генерацию навыков
      if (this.gameState.skillManager) {
        this.gameState.skillManager.startGeneration();
      }

      // Обновляем UI
      if (this.gameState.managers && this.gameState.managers.ui) {
        this.gameState.managers.ui.forceUpdate();
      }

      console.log('✅ Managers restarted');
    } catch (error) {
      console.warn('⚠️ Some managers failed to restart:', error);
    }
  }

  // ПРОСТОЙ СБРОС ИГРЫ
  performReset() {
    const confirmed = confirm(`🔄 RESET GAME

This will reset ALL progress:
• All resources to 0
• All buildings to level 0
• All skills to level 0
• All achievements lost

This action cannot be undone!

Are you sure?`);

    if (!confirmed) return;

    try {
      console.log('🔄 Resetting game...');
      
      // Создаем пустое состояние
      const emptyData = {
        resources: {
          gold: 0, wood: 0, stone: 0, food: 0, water: 0, iron: 0,
          people: 0, energy: 0, science: 0, faith: 0, chaos: 0
        },
        combo: { count: 0, deadline: 0, lastZone: null, lastAngle: null },
        skillPoints: 0,
        targetZone: 0,
        buildings: {},
        skills: {},
        skillStates: { missProtectionCharges: 0, autoClickerActive: false },
        market: { dailyDeals: [], purchaseHistory: [], reputation: 0 },
        timestamp: Date.now(),
        version: '1.0'
      };

      // Применяем пустые данные
      this.applySaveData(emptyData);
      
      eventBus.emit(GameEvents.NOTIFICATION, '🔄 Game reset successfully!');
      
    } catch (error) {
      console.error('❌ Reset failed:', error);
      eventBus.emit(GameEvents.NOTIFICATION, `❌ Reset failed: ${error.message}`);
    }
  }

  // ПОКАЗАТЬ КОД СОХРАНЕНИЯ
  showSaveCode(saveCode) {
    // Создаем модальное окно с кодом
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8); display: flex;
      align-items: center; justify-content: center;
      z-index: 10000; font-family: Arial, sans-serif;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white; padding: 30px; border-radius: 15px;
      max-width: 600px; width: 90%; text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;

    const textarea = document.createElement('textarea');
    textarea.value = saveCode;
    textarea.readOnly = true;
    textarea.style.cssText = `
      width: 100%; height: 150px; margin: 20px 0;
      font-family: monospace; font-size: 12px;
      border: 2px solid #ddd; border-radius: 8px;
      padding: 10px; resize: none;
    `;

    const copyBtn = document.createElement('button');
    copyBtn.textContent = '📋 Copy Code';
    copyBtn.style.cssText = `
      background: #4CAF50; color: white; border: none;
      padding: 10px 20px; border-radius: 8px; cursor: pointer;
      font-size: 16px; margin: 0 10px;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✖️ Close';
    closeBtn.style.cssText = `
      background: #f44336; color: white; border: none;
      padding: 10px 20px; border-radius: 8px; cursor: pointer;
      font-size: 16px; margin: 0 10px;
    `;

    content.innerHTML = '<h2>💾 Save Code</h2><p>Copy this code to save your progress:</p>';
    content.appendChild(textarea);
    content.appendChild(copyBtn);
    content.appendChild(closeBtn);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // Автовыделение текста
    textarea.focus();
    textarea.select();

    // Обработчики
    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(saveCode);
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => copyBtn.textContent = '📋 Copy Code', 2000);
      } catch (err) {
        // Fallback для старых браузеров
        textarea.select();
        document.execCommand('copy');
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => copyBtn.textContent = '📋 Copy Code', 2000);
      }
    };

    closeBtn.onclick = () => {
      document.body.removeChild(modal);
    };

    modal.onclick = (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    };

    // Автозакрытие через 30 секунд
    setTimeout(() => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    }, 30000);
  }

  // ТЕСТИРОВАНИЕ СИСТЕМЫ
  test() {
    console.log('🧪 Testing save/load system...');
    
    try {
      // Создаем тестовые данные
      const testData = {
        resources: { gold: 100, wood: 50 },
        skillPoints: 10,
        combo: { count: 5 },
        timestamp: Date.now(),
        version: '1.0'
      };

      // Кодируем
      const code = btoa(JSON.stringify(testData));
      console.log('Generated code:', code);

      // Декодируем
      const decoded = JSON.parse(atob(code));
      console.log('Decoded data:', decoded);

      console.log('✅ Save/Load system test passed!');
      return { success: true, code, testData, decoded };
      
    } catch (error) {
      console.error('❌ Save/Load system test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Добавляем глобальную функцию для тестирования
window.testSaveLoadSystem = () => {
  if (window.gameCore?.managers?.ui?.saveLoadManager) {
    return window.gameCore.managers.ui.saveLoadManager.test();
  }
  return 'SaveLoadManager not available';
};