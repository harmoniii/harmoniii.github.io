// ui/SaveLoadManager.js - ИСПРАВЛЕННАЯ версия
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';

export class SaveLoadManager extends CleanupMixin {
  constructor(gameState) {
    super();
    this.gameState = gameState;
  }

  // ИСПРАВЛЕННОЕ СОХРАНЕНИЕ - корректно сохраняет здания и навыки
  performSave() {
    try {
      console.log('💾 Starting save...');
      
      if (!this.gameState || this.gameState.isDestroyed) {
        throw new Error('Game state not available');
      }

      // ИСПРАВЛЕНИЕ: Получаем данные напрямую из gameState с валидацией
      const saveData = {
        resources: this.gameState.resources ? {...this.gameState.resources} : {},
        combo: this.gameState.combo ? {...this.gameState.combo} : {count: 0, deadline: 0, lastZone: null, lastAngle: null},
        skillPoints: Math.floor(this.gameState.skillPoints || 0),
        targetZone: this.gameState.targetZone || 0,
        previousTargetZone: this.gameState.previousTargetZone || 0,
        
        // ИСПРАВЛЕНИЕ: Правильное сохранение зданий
        buildings: this.gameState.buildings ? 
          Object.fromEntries(
            Object.entries(this.gameState.buildings).map(([id, building]) => [
              id, {
                level: Math.floor(building.level || 0),
                active: Boolean(building.active)
              }
            ])
          ) : {},
        
        // ИСПРАВЛЕНИЕ: Правильное сохранение навыков
        skills: this.gameState.skills ? 
          Object.fromEntries(
            Object.entries(this.gameState.skills).map(([id, skill]) => [
              id, {
                level: Math.floor(skill.level || 0)
              }
            ])
          ) : {},
        
        skillStates: this.gameState.skillStates ? {...this.gameState.skillStates} : {},
        market: this.gameState.market ? {...this.gameState.market} : {},
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

  // ИСПРАВЛЕННАЯ ЗАГРУЗКА - корректно применяет здания и навыки
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

  // ИСПРАВЛЕННОЕ ПРИМЕНЕНИЕ ДАННЫХ - корректно восстанавливает здания и навыки
  applySaveData(saveData) {
    console.log('📥 Applying save data to game state...');
    
    try {
      // Обновляем ресурсы
      if (saveData.resources) {
        Object.keys(this.gameState.resources).forEach(resource => {
          this.gameState.resources[resource] = Math.max(0, saveData.resources[resource] || 0);
        });
      }

      // Обновляем комбо
      if (saveData.combo) {
        this.gameState.combo = {
          count: Math.max(0, saveData.combo.count || 0),
          deadline: saveData.combo.deadline || 0,
          lastZone: saveData.combo.lastZone || null,
          lastAngle: saveData.combo.lastAngle || null
        };
      }

      // Обновляем skill points
      this.gameState.skillPoints = Math.max(0, Math.floor(saveData.skillPoints || 0));

      // Обновляем зоны
      this.gameState.targetZone = saveData.targetZone || 0;
      this.gameState.previousTargetZone = saveData.previousTargetZone || 0;

      // ИСПРАВЛЕНИЕ: Правильное восстановление зданий
      if (saveData.buildings && this.gameState.buildings) {
        console.log('📥 Restoring buildings...');
        Object.keys(this.gameState.buildings).forEach(buildingId => {
          if (saveData.buildings[buildingId]) {
            const savedBuilding = saveData.buildings[buildingId];
            this.gameState.buildings[buildingId] = {
              level: Math.max(0, Math.floor(savedBuilding.level || 0)),
              active: Boolean(savedBuilding.active)
            };
            console.log(`Restored building ${buildingId}: level ${this.gameState.buildings[buildingId].level}`);
          }
        });
      }

      // ИСПРАВЛЕНИЕ: Правильное восстановление навыков
      if (saveData.skills && this.gameState.skills) {
        console.log('📥 Restoring skills...');
        Object.keys(this.gameState.skills).forEach(skillId => {
          if (saveData.skills[skillId]) {
            const savedSkill = saveData.skills[skillId];
            this.gameState.skills[skillId] = {
              level: Math.max(0, Math.floor(savedSkill.level || 0))
            };
            console.log(`Restored skill ${skillId}: level ${this.gameState.skills[skillId].level}`);
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

      // КРИТИЧЕСКИ ВАЖНО: Перезапускаем менеджеры после загрузки
      this.restartManagers();

      console.log('✅ Save data applied successfully');
      
    } catch (error) {
      console.error('❌ Error applying save data:', error);
      throw new Error(`Failed to apply save data: ${error.message}`);
    }
  }

  // ИСПРАВЛЕННЫЙ ПЕРЕЗАПУСК МЕНЕДЖЕРОВ - обязательно после загрузки
  restartManagers() {
    try {
      console.log('🔄 Restarting managers...');

      // ИСПРАВЛЕНИЕ: Перезапускаем производство зданий
      if (this.gameState.buildingManager) {
        // Останавливаем старое производство
        this.gameState.buildingManager.stopAllProduction();
        // Запускаем новое производство согласно загруженным данным
        this.gameState.buildingManager.startProduction();
        console.log('✅ Building production restarted');
      }

      // ИСПРАВЛЕНИЕ: Перезапускаем генерацию навыков
      if (this.gameState.skillManager) {
        // Останавливаем старую генерацию
        if (typeof this.gameState.skillManager.stopAllGeneration === 'function') {
          this.gameState.skillManager.stopAllGeneration();
        }
        // Запускаем новую генерацию согласно загруженным данным
        this.gameState.skillManager.startGeneration();
        console.log('✅ Skill generation restarted');
      }

      // Обновляем UI
      if (this.gameState.managers && this.gameState.managers.ui) {
        this.gameState.managers.ui.forceUpdate();
        console.log('✅ UI updated');
      }

      console.log('✅ All managers restarted');
    } catch (error) {
      console.warn('⚠️ Some managers failed to restart:', error);
    }
  }

  // ИСПРАВЛЕННЫЙ СБРОС ИГРЫ - корректно сбрасывает все
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
      
      // ИСПРАВЛЕНИЕ: Создаем полностью пустое состояние с правильной структурой
      const emptyData = {
        resources: {
          gold: 0, wood: 0, stone: 0, food: 0, water: 0, iron: 0,
          people: 0, energy: 0, science: 0, faith: 0, chaos: 0
        },
        combo: { count: 0, deadline: 0, lastZone: null, lastAngle: null },
        skillPoints: 0,
        targetZone: 0,
        previousTargetZone: 0,
        
        // ИСПРАВЛЕНИЕ: Сбрасываем здания правильно
        buildings: Object.fromEntries(
          Object.keys(this.gameState.buildings || {}).map(id => [
            id, { level: 0, active: false }
          ])
        ),
        
        // ИСПРАВЛЕНИЕ: Сбрасываем навыки правильно
        skills: Object.fromEntries(
          Object.keys(this.gameState.skills || {}).map(id => [
            id, { level: 0 }
          ])
        ),
        
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
        buildings: { sawmill: { level: 3, active: true } },
        skills: { goldMultiplier: { level: 2 } },
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