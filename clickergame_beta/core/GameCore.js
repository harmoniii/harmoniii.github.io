// core/GameCore.js - Обновленная версия с правильной инициализацией зон
import { CleanupMixin } from './CleanupManager.js';
import { GameState } from './GameState.js';
import { StorageManager } from './StorageManager.js';
import { eventBus, GameEvents } from './GameEvents.js';
import { ZoneManager } from '../managers/ZoneManager.js';
import { FeatureManager } from '../managers/FeatureManager.js';
import { BuildingManager } from '../managers/BuildingManager.js';
import { SkillManager } from '../managers/SkillManager.js';
import { MarketManager } from '../managers/MarketManager.js';
import { BuffManager } from '../effects/BuffManager.js';
import { AchievementManager } from '../managers/AchievementManager.js';
import { EnergyManager } from '../managers/EnergyManager.js';
import UIManager from '../ui/UIManager.js';
import { GameLoop } from './GameLoop.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';

export class GameCore extends CleanupMixin {
  constructor() {
    super();
    
    this.gameState = null;
    this.storageManager = new StorageManager();
    this.zoneManager = null; // Создаем здесь!
    this.managers = {};
    this.gameLoop = null;
    
    this.initialize();
  }

  async initialize() {
    try {
      console.log('🎮 Initializing Clicker...');
      
      // Шаг 1: Инициализируем состояние игры
      await this.initializeGameState();
      
      // Шаг 2: Создаем ZoneManager ПЕРВЫМ
      await this.initializeZoneManager();
      
      // Шаг 3: Инициализируем остальные менеджеры
      await this.initializeManagers();
      
      // Шаг 4: Настраиваем ссылки между менеджерами
      await this.setupManagerReferences();
      
      // Шаг 5: Инициализируем UI
      await this.initializeUI();
      
      // Шаг 6: Запускаем игровой цикл (последним!)
      await this.startGameLoop();
      
      this.bindSystemEvents();
      
      console.log('✅ Game initialized successfully');
      eventBus.emit(GameEvents.NOTIFICATION, '🎮 Game loaded successfully!');
      
    } catch (error) {
      console.error('💀 Critical error during initialization:', error);
      this.handleInitializationError(error);
    }
  }

  async initializeGameState() {
    console.log('📊 Initializing game state...');
    
    const saveData = this.storageManager.load();
    this.gameState = new GameState();
    
    if (saveData) {
      try {
        this.gameState.loadSaveData(saveData);
        console.log('✅ Save data loaded');
      } catch (error) {
        console.warn('⚠️ Failed to load save data:', error);
      }
    }
    
    this.cleanupManager.registerComponent(this.gameState, 'GameState');
  }

  // НОВОЕ: Создаем ZoneManager первым
  async initializeZoneManager() {
    console.log('🎯 Initializing ZoneManager...');
    
    this.zoneManager = new ZoneManager();
    this.cleanupManager.registerComponent(this.zoneManager, 'ZoneManager');
    
    // Устанавливаем целевую зону из сохранения
    if (this.gameState.targetZone !== undefined) {
      this.zoneManager.setTargetZone(this.gameState.targetZone);
    }
    
    console.log('✅ ZoneManager initialized');
  }

  async initializeManagers() {
    console.log('🔧 Initializing managers...');
    
    try {
      // Базовые менеджеры
      this.managers.energy = new EnergyManager(this.gameState);
      this.managers.achievement = new AchievementManager(this.gameState);
      this.managers.building = new BuildingManager(this.gameState);
      this.managers.skill = new SkillManager(this.gameState);
      this.managers.market = new MarketManager(this.gameState);
      this.managers.buff = new BuffManager(this.gameState);
      
      // FeatureManager получает готовый ZoneManager
      this.managers.feature = new FeatureManager(this.gameState, this.zoneManager, this.managers.buff);
      
      // Регистрируем для очистки
      Object.entries(this.managers).forEach(([name, manager]) => {
        this.cleanupManager.registerComponent(manager, `${name}Manager`);
      });
      
      console.log('✅ All managers initialized');
      
    } catch (error) {
      console.error('💀 Failed to initialize managers:', error);
      throw error;
    }
  }

  async setupManagerReferences() {
    console.log('🔗 Setting up manager references...');
    
    // Устанавливаем ссылки в gameState
    this.gameState.zoneManager = this.zoneManager; // НОВОЕ!
    this.gameState.buffManager = this.managers.buff;
    this.gameState.energyManager = this.managers.energy;
    this.gameState.achievementManager = this.managers.achievement;
    this.gameState.buildingManager = this.managers.building;
    this.gameState.skillManager = this.managers.skill;
    this.gameState.marketManager = this.managers.market;
    this.gameState.featureManager = this.managers.feature;
    this.gameState.managers = this.managers;
    
    console.log('✅ Manager references set up');
  }

  async initializeUI() {
    console.log('🖥️ Initializing UI...');
    
    this.managers.ui = new UIManager(this.gameState);
    this.cleanupManager.registerComponent(this.managers.ui, 'UIManager');
    
    console.log('✅ UI initialized');
  }

  async startGameLoop() {
    console.log('🔄 Starting game loop...');
    
    // Передаем ZoneManager в GameLoop
    this.gameLoop = new GameLoop(this.gameState, this.zoneManager);
    this.cleanupManager.registerComponent(this.gameLoop, 'GameLoop');
    
    this.gameLoop.start();
    console.log('✅ Game loop started');
  }

  bindSystemEvents() {
    // Автосохранение
    this.createInterval(() => {
      this.autoSave();
    }, 30000, 'auto-save');
    
    // События сброса игры
    eventBus.subscribe(GameEvents.GAME_RESET, () => {
      this.handleGameReset();
    });
    
    // Обработка закрытия страницы
    this.addEventListener(window, 'beforeunload', (e) => {
      this.autoSave();
    });
    
    this.addEventListener(window, 'unload', () => {
      this.destroy();
    });
    
    this.addEventListener(document, 'visibilitychange', () => {
      if (document.hidden) {
        this.autoSave();
      }
    });
  }

  autoSave() {
    if (!this.gameState || this.gameState.isDestroyed || !this.storageManager) {
      return false;
    }

    try {
      // Сохраняем текущую целевую зону
      if (this.zoneManager) {
        this.gameState.targetZone = this.zoneManager.getTargetZone();
      }
      
      const saveData = this.gameState.getSaveData();
      if (!saveData) return false;
      
      const success = this.storageManager.safeSave({
        ...saveData,
        getSaveData: () => saveData
      });
      
      if (success) {
        console.log('💾 Auto-save completed');
      }
      
      return success;
      
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
      return false;
    }
  }

  handleGameReset() {
    console.log('🔥 Handling game reset...');
    
    try {
      if (this.gameLoop) {
        this.gameLoop.stop();
      }
      
      this.destroy();
      
    } catch (error) {
      console.error('💀 Error handling game reset:', error);
    }
  }

  handleInitializationError(error) {
    const errorMessage = `Game initialization failed: ${error.message}`;
    
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: #ff4444; color: white; padding: 20px; border-radius: 10px;
      z-index: 10000; text-align: center; font-family: Arial, sans-serif;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    errorDiv.innerHTML = `
      <h3>💀 Game Initialization Error</h3>
      <p>${errorMessage}</p>
      <button onclick="location.reload()" style="
        background: white; color: #ff4444; border: none;
        padding: 10px 20px; border-radius: 5px; cursor: pointer;
        font-weight: bold; margin-top: 10px;
      ">🔄 Reload Page</button>
    `;
    
    document.body.appendChild(errorDiv);
  }

  getGameState() {
    return this.gameState;
  }

  getZoneManager() {
    return this.zoneManager;
  }

  getManagers() {
    return this.managers;
  }

  isGameActive() {
    return this.isActive() && 
           this.gameState && 
           this.zoneManager?.isManagerReady() &&
           this.gameLoop?.running === true;
  }

  enableDebugMode() {
    console.log('🐛 Enabling debug mode...');
    
    window.gameDebug = {
      getGameState: () => this.gameState,
      getZoneManager: () => this.zoneManager,
      getManagers: () => this.managers,
      getGameCore: () => this,
      
      // Зоны
      zones: {
        getInfo: () => this.zoneManager?.getDebugInfo(),
        getStats: () => this.zoneManager?.getStats(),
        shuffle: () => this.zoneManager?.shuffleZones(),
        setTarget: (index) => this.zoneManager?.setTargetZone(index),
        isReady: () => this.zoneManager?.isManagerReady()
      },
      
      // Энергия
      energy: {
        getCurrent: () => this.managers.energy?.getEnergyInfo(),
        restore: (amount) => this.managers.energy?.restoreEnergy(amount, 'debug'),
        consume: (amount) => this.managers.energy?.consumeEnergy(amount)
      },
      
      // Достижения
      achievements: {
        getAll: () => this.managers.achievement?.getAllAchievements(),
        getCompleted: () => this.managers.achievement?.getCompletedAchievements()
      },
      
      triggerAutoSave: () => this.autoSave(),
      
      getStats: () => ({
        gameState: this.getGameStats(),
        zones: this.zoneManager?.getStats(),
        cleanup: this.cleanupManager.getStats(),
        gameLoop: this.gameLoop?.getRenderStats()
      })
    };
    
    console.log('✅ Debug mode enabled');
    console.log('🔧 Available commands: window.gameDebug.*');
  }

  getGameStats() {
    if (!this.gameState) return null;
    
    return {
      totalResources: Object.values(this.gameState.resources).reduce((sum, val) => sum + val, 0),
      currentCombo: this.gameState.combo.count,
      skillPoints: this.gameState.skillPoints,
      activeBuffs: this.gameState.buffs.length,
      activeDebuffs: this.gameState.debuffs.length,
      targetZone: this.zoneManager?.getTargetZone(),
      zonesReady: this.zoneManager?.isManagerReady()
    };
  }

  destroy() {
    console.log('🧹 GameCore cleanup started');
    
    // Останавливаем игровой цикл
    if (this.gameLoop) {
      this.gameLoop.stop();
    }
    
    super.destroy();
    
    console.log('✅ GameCore destroyed');
  }
}