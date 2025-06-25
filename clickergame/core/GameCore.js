// core/GameCore.js - Fixed version with correct cleanup method calls
import { CleanupMixin } from './CleanupManager.js';
import { GameState } from './GameState.js';
import { StorageManager } from './StorageManager.js';
import { eventBus, GameEvents } from './GameEvents.js';
import { FeatureManager } from '../managers/FeatureManager.js';
import { BuildingManager } from '../managers/BuildingManager.js';
import { SkillManager } from '../managers/SkillManager.js';
import { MarketManager } from '../managers/MarketManager.js';
import { BuffManager } from '../effects/BuffManager.js';
import UIManager from '../ui/UIManager.js';
import { GameLoop } from './GameLoop.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';

export class GameCore extends CleanupMixin {
  constructor() {
    super();
    
    this.gameState = null;
    this.storageManager = new StorageManager();
    this.managers = {};
    this.gameLoop = null;
    this.achievementTimers = {
      combo: 0,
      resource: 0
    };
    
    this.initialize();
  }

  // Инициализация игры
  async initialize() {
    try {
      console.log('🎮 Initializing Advanced Clicker v1.0.3...');
      
      await this.initializeGameState();
      await this.initializeManagers();
      await this.initializeUI();
      await this.startGameLoop();
      
      // Подписываемся на системные события
      this.bindSystemEvents();
      
      console.log('✅ Game initialized successfully');
      eventBus.emit(GameEvents.NOTIFICATION, '🎮 Game loaded successfully!');
      
    } catch (error) {
      console.error('💀 Critical error during initialization:', error);
      this.handleInitializationError(error);
    }
  }

  // Инициализация состояния игры
  async initializeGameState() {
    console.log('📊 Initializing game state...');
    
    // Пытаемся загрузить сохранение
    const saveData = this.storageManager.load();
    
    this.gameState = new GameState();
    
    if (saveData) {
      try {
        this.gameState.loadSaveData(saveData);
        console.log('✅ Save data loaded');
      } catch (error) {
        console.warn('⚠️ Failed to load save data, using default state:', error);
      }
    } else {
      console.log('ℹ️ No save data found, using default state');
    }
    
    // FIXED: Register GameState properly with name
    this.cleanupManager.registerComponent(this.gameState, 'GameState');
  }

  // Инициализация менеджеров
  async initializeManagers() {
    console.log('🔧 Initializing managers...');
    
    try {
      // Создаем менеджеры в правильном порядке
      this.managers.buff = new BuffManager(this.gameState);
      this.managers.feature = new FeatureManager(this.gameState, this.managers.buff);
      this.managers.building = new BuildingManager(this.gameState);
      this.managers.skill = new SkillManager(this.gameState);
      this.managers.market = new MarketManager(this.gameState);
      
      // Устанавливаем ссылки в состоянии игры (без циклических зависимостей)
      this.gameState.buffManager = this.managers.buff;
      this.gameState.buildingManager = this.managers.building;
      this.gameState.skillManager = this.managers.skill;
      this.gameState.marketManager = this.managers.market;
      
      // Регистрируем менеджеры для очистки
      Object.entries(this.managers).forEach(([name, manager]) => {
        this.cleanupManager.registerComponent(manager, name);
      });
      
      console.log('✅ Managers initialized');
      
    } catch (error) {
      console.error('💀 Failed to initialize managers:', error);
      throw error;
    }
  }

  // Инициализация UI
  async initializeUI() {
    console.log('🖥️ Initializing UI...');
    
    try {
      this.managers.ui = new UIManager(this.gameState);
      this.cleanupManager.registerComponent(this.managers.ui);
      
      console.log('✅ UI initialized');
      
    } catch (error) {
      console.error('💀 Failed to initialize UI:', error);
      throw error;
    }
  }

  // Запуск игрового цикла
  async startGameLoop() {
    console.log('🔄 Starting game loop...');
    
    try {
      this.gameLoop = new GameLoop(this.gameState, this.managers);
      this.cleanupManager.registerComponent(this.gameLoop);
      
      this.gameLoop.start();
      console.log('✅ Game loop started');
      
    } catch (error) {
      console.error('💀 Failed to start game loop:', error);
      throw error;
    }
  }

  // Привязка системных событий
  bindSystemEvents() {
    // Автосохранение
    this.createInterval(() => {
      this.autoSave();
    }, 30000, 'auto-save'); // Каждые 30 секунд
    
    // Проверка достижений
    this.createInterval(() => {
      this.checkAchievements();
    }, GAME_CONSTANTS.COMBO_CHECK_INTERVAL, 'achievement-check');
    
    // Событие сброса игры
    eventBus.subscribe(GameEvents.GAME_RESET, () => {
      this.handleGameReset();
    });
    
    // События сохранения/загрузки
    eventBus.subscribe(GameEvents.SAVE_COMPLETED, () => {
      console.log('💾 Save completed');
    });
    
    eventBus.subscribe(GameEvents.LOAD_COMPLETED, () => {
      console.log('📁 Load completed');
    });
    
    // Обработка закрытия страницы
    this.addEventListener(window, 'beforeunload', (e) => {
      this.handlePageUnload(e);
    });
    
    this.addEventListener(window, 'unload', () => {
      this.destroy(); // Use correct method name
    });
    
    // Обработка потери фокуса для автосохранения
    this.addEventListener(document, 'visibilitychange', () => {
      if (document.hidden) {
        this.autoSave();
      }
    });
  }

autoSave() {
  // КРИТИЧЕСКИЕ ПРОВЕРКИ перед сохранением
  if (!this.gameState) {
    console.warn('⚠️ AutoSave: gameState is null, skipping save');
    return false;
  }

  if (this.isDestroyed === true) {
    console.warn('⚠️ AutoSave: GameCore is destroyed, skipping save');
    return false;
  }

  if (this.gameState.isDestroyed === true) {
    console.warn('⚠️ AutoSave: GameState is destroyed, skipping save');
    return false;
  }

  if (!this.storageManager) {
    console.warn('⚠️ AutoSave: storageManager is null, skipping save');
    return false;
  }

  try {
    // Используем безопасное сохранение
    const success = this.storageManager.safeSave(this.gameState);
    
    if (success) {
      console.log('💾 Auto-save completed successfully');
    } else {
      console.warn('⚠️ Auto-save failed but no error thrown');
    }
    
    return success;
    
  } catch (error) {
    console.error('❌ Auto-save failed with error:', error);
    return false;
  }
}

  // Проверка достижений
  checkAchievements() {
    if (!this.gameState || !this.managers.skill) return;
    
    const now = Date.now();
    
    // Проверка достижений комбо
    if (now - this.achievementTimers.combo > GAME_CONSTANTS.COMBO_CHECK_INTERVAL) {
      this.achievementTimers.combo = now;
      this.checkComboAchievements();
    }
    
    // Проверка достижений ресурсов
    if (now - this.achievementTimers.resource > GAME_CONSTANTS.RESOURCE_CHECK_INTERVAL) {
      this.achievementTimers.resource = now;
      this.checkResourceAchievements();
    }
  }

  // Проверка достижений комбо
  checkComboAchievements() {
    try {
      const comboCount = this.gameState.combo?.count || 0;
      
      if (comboCount >= GAME_CONSTANTS.COMBO_MILESTONE_3) {
        this.managers.skill.addSkillPoints(5);
        eventBus.emit(GameEvents.NOTIFICATION, '🏆 Master Combo! +5 Skill Points');
      } else if (comboCount >= GAME_CONSTANTS.COMBO_MILESTONE_2) {
        this.managers.skill.addSkillPoints(2);
        eventBus.emit(GameEvents.NOTIFICATION, '🎯 Great Combo! +2 Skill Points');
      } else if (comboCount >= GAME_CONSTANTS.COMBO_MILESTONE_1) {
        this.managers.skill.addSkillPoints(1);
        eventBus.emit(GameEvents.NOTIFICATION, '⭐ Nice Combo! +1 Skill Point');
      }
    } catch (error) {
      console.warn('⚠️ Error in combo achievements:', error);
    }
  }

  // Проверка достижений ресурсов
  checkResourceAchievements() {
    try {
      const totalResources = Object.values(this.gameState.resources || {})
        .filter(val => typeof val === 'number' && !isNaN(val))
        .reduce((sum, val) => sum + val, 0);
      
      if (totalResources >= GAME_CONSTANTS.RESOURCE_MILESTONE_3) {
        this.managers.skill.addSkillPoints(5);
        eventBus.emit(GameEvents.NOTIFICATION, '💰 Resource Master! +5 Skill Points');
      } else if (totalResources >= GAME_CONSTANTS.RESOURCE_MILESTONE_2) {
        this.managers.skill.addSkillPoints(3);
        eventBus.emit(GameEvents.NOTIFICATION, '📈 Resource Collector! +3 Skill Points');
      } else if (totalResources >= GAME_CONSTANTS.RESOURCE_MILESTONE_1) {
        this.managers.skill.addSkillPoints(1);
        eventBus.emit(GameEvents.NOTIFICATION, '💎 First Milestone! +1 Skill Point');
      }
    } catch (error) {
      console.warn('⚠️ Error in resource achievements:', error);
    }
  }

  // Обработка сброса игры - FIXED: Use correct cleanup method
  handleGameReset() {
    console.log('🔥 Handling game reset...');
    
    try {
      // Останавливаем игровой цикл
      if (this.gameLoop) {
        this.gameLoop.stop();
      }

      // Останавливаем все процессы менеджеров
      this.stopAllGameProcesses();
      
      // Выполняем полную очистку - Use destroy() instead of cleanup()
      this.destroy();
      
      console.log('✅ Game reset handled');
      
    } catch (error) {
      console.error('💀 Error handling game reset:', error);
    }
  }

  // Остановить все игровые процессы
  stopAllGameProcesses() {
    try {
      console.log('🛑 Stopping all game processes...');
      
      // Останавливаем все менеджеры которые имеют методы остановки
      if (this.managers.buff && typeof this.managers.buff.clearAllEffects === 'function') {
        this.managers.buff.clearAllEffects();
      }
      
      if (this.managers.building && typeof this.managers.building.stopAllProduction === 'function') {
        this.managers.building.stopAllProduction();
      }
      
      if (this.managers.skill && typeof this.managers.skill.stopAllGeneration === 'function') {
        this.managers.skill.stopAllGeneration();
      }
      
      console.log('✅ All game processes stopped');
    } catch (error) {
      console.warn('⚠️ Error stopping game processes:', error);
    }
  }

  // Обработка закрытия страницы
  handlePageUnload(event) {
    console.log('👋 Page unloading, saving...');
    
    try {
      this.autoSave();
    } catch (error) {
      console.warn('⚠️ Failed to save on page unload:', error);
    }
  }

  // Обработка ошибок инициализации
  handleInitializationError(error) {
    const errorMessage = `Game initialization failed: ${error.message}`;
    
    // Показываем ошибку пользователю
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #ff4444;
      color: white;
      padding: 20px;
      border-radius: 10px;
      z-index: 10000;
      text-align: center;
      font-family: Arial, sans-serif;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    errorDiv.innerHTML = `
      <h3>💀 Game Initialization Error</h3>
      <p>${errorMessage}</p>
      <button onclick="location.reload()" style="
        background: white;
        color: #ff4444;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
        margin-top: 10px;
      ">🔄 Reload Page</button>
    `;
    
    document.body.appendChild(errorDiv);
  }

  // Получить текущее состояние игры
  getGameState() {
    return this.gameState;
  }

  // Получить менеджеры
  getManagers() {
    return this.managers;
  }

  // Получить статистику игры
  getGameStats() {
    if (!this.gameState) return null;
    
    return {
      totalResources: Object.values(this.gameState.resources).reduce((sum, val) => sum + val, 0),
      currentCombo: this.gameState.combo.count,
      skillPoints: this.gameState.skillPoints,
      activeBuffs: this.gameState.buffs.length,
      activeDebuffs: this.gameState.debuffs.length,
      buildingsBuilt: Object.values(this.gameState.buildings).filter(b => b.level > 0).length,
      skillsLearned: Object.values(this.gameState.skills).filter(s => s.level > 0).length
    };
  }

  // Проверка активности игры - FIXED: Remove recursive call
  isGameActive() {
    return this.isActive() && this.gameState && this.gameLoop && this.gameLoop.isRunning();
  }

  // Деструктор - FIXED: Use proper cleanup method name
  destroy() {
    console.log('🧹 Destroying GameCore...');
    
    try {
      // Сохраняем перед уничтожением
      this.autoSave();
      
      // Останавливаем все процессы
      this.stopAllGameProcesses();
      
      // Вызываем родительский деструктор
      super.destroy();
      
      console.log('✅ GameCore destroyed');
    } catch (error) {
      console.error('💀 Error during GameCore destruction:', error);
    }
  }
}