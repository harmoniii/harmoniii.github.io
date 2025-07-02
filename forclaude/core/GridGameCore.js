// core/GridGameCore.js - ОБНОВЛЕНО: интеграция RaidManager
import { CleanupMixin } from './CleanupManager.js';
import { GameState } from './GameState.js';
import { StorageManager } from './StorageManager.js';
import { eventBus, GameEvents } from './GameEvents.js';
import { GridManager } from '../managers/GridManager.js';
import { GridFeatureManager } from '../managers/GridFeatureManager.js';
import { BuildingManager } from '../managers/BuildingManager.js';
import { SkillManager } from '../managers/SkillManager.js';
import { MarketManager } from '../managers/MarketManager.js';
import { RaidManager } from '../managers/RaidManager.js'; // НОВОЕ: RaidManager
import { BuffManager } from '../effects/BuffManager.js';
import { AchievementManager } from '../managers/AchievementManager.js';
import { EnergyManager } from '../managers/EnergyManager.js';
import UIManager from '../ui/UIManager.js';
import { GridGameLoop } from './GridGameLoop.js';

export class GridGameCore extends CleanupMixin {
  constructor() {
    super();
    
    this.gameState = null;
    this.storageManager = new StorageManager();
    this.gridManager = null;
    this.managers = {};
    this.gameLoop = null;
    
    this.initialize();
  }

  async initialize() {
    try {
      console.log('🎮 Initializing Grid Clicker with Raid System...');
      
      // Шаг 1: Инициализируем состояние игры
      await this.initializeGameState();
      
      // Шаг 2: Создаем GridManager ПЕРВЫМ
      await this.initializeGridManager();
      
      // Шаг 3: Инициализируем остальные менеджеры
      await this.initializeManagers();
      
      // Шаг 4: Настраиваем ссылки между менеджерами
      await this.setupManagerReferences();
      
      // Шаг 5: Инициализируем UI
      await this.initializeUI();
      
      // Шаг 6: Запускаем игровой цикл (последним!)
      await this.startGameLoop();
      
      this.bindSystemEvents();
      
      console.log('✅ Grid Game with Raids initialized successfully');
      eventBus.emit(GameEvents.NOTIFICATION, '🎮 Grid Game with Raid System loaded!');
      
    } catch (error) {
      console.error('💀 Critical error during initialization:', error);
      this.handleInitializationError(error);
    }
  }

  async initializeGameState() {
    console.log('📊 Initializing game state...');
    
    const saveData = this.storageManager.load();
    this.gameState = new GameState();
    
    if (!this.gameState.energy) {
      this.gameState.energy = {
        current: GAME_CONSTANTS.INITIAL_ENERGY || 100,
        max: GAME_CONSTANTS.INITIAL_MAX_ENERGY || 100,
        lastRegenTime: Date.now(),
        totalConsumed: 0,
        totalRegenerated: 0
      };
    }

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

  // Создаем GridManager первым
  async initializeGridManager() {
    console.log('🎯 Initializing GridManager...');
    
    this.gridManager = new GridManager();
    this.cleanupManager.registerComponent(this.gridManager, 'GridManager');
    
    // Устанавливаем целевую клетку из сохранения
    if (this.gameState.targetZone !== undefined) {
      this.gridManager.setTargetCell(this.gameState.targetZone);
    }
    
    console.log('✅ GridManager initialized');
  }

  async initializeManagers() {
    console.log('🔧 Initializing managers with raid support...');
    
    try {
      // Базовые менеджеры
      this.managers.energy = new EnergyManager(this.gameState);
      this.managers.achievement = new AchievementManager(this.gameState);
      this.managers.building = new BuildingManager(this.gameState);
      this.managers.skill = new SkillManager(this.gameState);
      this.managers.market = new MarketManager(this.gameState);
      this.managers.buff = new BuffManager(this.gameState);
      
      // НОВОЕ: RaidManager после BuildingManager
      this.managers.raid = new RaidManager(this.gameState);
      
      // GridFeatureManager получает готовый GridManager
      this.managers.feature = new GridFeatureManager(this.gameState, this.gridManager, this.managers.buff);
      
      // Регистрируем для очистки
      Object.entries(this.managers).forEach(([name, manager]) => {
        this.cleanupManager.registerComponent(manager, `${name}Manager`);
      });
      
      console.log('✅ All managers initialized including raids');
      
    } catch (error) {
      console.error('💀 Failed to initialize managers:', error);
      throw error;
    }
  }

  async setupManagerReferences() {
    console.log('🔗 Setting up manager references...');
    
    // Устанавливаем ссылки в gameState
    this.gameState.gridManager = this.gridManager;
    this.gameState.buffManager = this.managers.buff;
    this.gameState.energyManager = this.managers.energy;
    this.gameState.achievementManager = this.managers.achievement;
    this.gameState.buildingManager = this.managers.building;
    this.gameState.skillManager = this.managers.skill;
    this.gameState.marketManager = this.managers.market;
    this.gameState.featureManager = this.managers.feature;
    this.gameState.raidManager = this.managers.raid; // НОВОЕ: RaidManager
    this.gameState.managers = this.managers;
    
    console.log('✅ Manager references set up including raids');
  }

  async initializeUI() {
    console.log('🖥️ Initializing UI with raid support...');
    
    this.managers.ui = new UIManager(this.gameState);
    this.cleanupManager.registerComponent(this.managers.ui, 'UIManager');
    
    console.log('✅ UI initialized with raid support');
  }

  async startGameLoop() {
    console.log('🔄 Starting grid game loop...');
    
    // Передаем GridManager в GridGameLoop
    this.gameLoop = new GridGameLoop(this.gameState, this.gridManager);
    this.cleanupManager.registerComponent(this.gameLoop, 'GridGameLoop');
    
    this.gameLoop.start();
    console.log('✅ Grid game loop started');
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
    
    // НОВОЕ: События рейдов
    eventBus.subscribe('raid:started', (data) => {
      console.log('⚔️ Raid started:', data.raid?.name);
    });
    
    eventBus.subscribe('raid:completed', (data) => {
      console.log('⚔️ Raid completed at:', new Date(data.timestamp));
      // Автосохранение после завершения рейда
      this.autoSave();
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
    // ИСПРАВЛЕНИЕ: Сохраняем текущую целевую клетку
    if (this.gridManager) {
      this.gameState.targetZone = this.gridManager.getTargetCell();
    }
    
    // КРИТИЧЕСКИ ВАЖНО: Принудительно сохраняем состояние рейда ПЕРЕД получением saveData
    if (this.managers.raid && this.managers.raid.isRaidInProgress) {
      console.log('💾 Force saving active raid state before auto-save...');
      
      // Обновляем все поля состояния рейда в gameState
      this.gameState.raids.activeRaid = this.managers.raid.activeRaid;
      this.gameState.raids.isRaidInProgress = this.managers.raid.isRaidInProgress;
      this.gameState.raids.raidStartTime = this.managers.raid.raidStartTime;
      this.gameState.raids.raidProgress = this.managers.raid.raidProgress;
      this.gameState.raids.autoClickerWasActive = this.managers.raid.autoClickerWasActive;
      
      console.log('💾 Raid state updated in gameState:', {
        raidId: this.managers.raid.activeRaid?.id,
        progress: this.managers.raid.raidProgress,
        startTime: this.managers.raid.raidStartTime
      });
    }
    
    const saveData = this.gameState.getSaveData();
    if (!saveData) return false;
    
    // ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА: Добавляем резервные данные рейда в корень saveData
    if (this.managers.raid && this.managers.raid.isRaidInProgress) {
      saveData.activeRaidEmergencyBackup = {
        raidId: this.managers.raid.activeRaid?.id,
        name: this.managers.raid.activeRaid?.name,
        startTime: this.managers.raid.raidStartTime,
        progress: this.managers.raid.raidProgress,
        autoClickerWasActive: this.managers.raid.autoClickerWasActive,
        difficulty: this.managers.raid.activeRaid?.difficulty,
        savedAt: Date.now(),
        emergencyFlag: true
      };
      console.log('💾 Emergency raid backup added to save:', saveData.activeRaidEmergencyBackup);
    }
    
    const success = this.storageManager.safeSave({
      ...saveData,
      getSaveData: () => saveData
    });
    
    if (success) {
      console.log('💾 Auto-save completed with raid protection');
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
      
      // НОВОЕ: Отменяем активные рейды при сбросе
      if (this.managers.raid && this.managers.raid.isRaidInProgress) {
        this.managers.raid.endRaid();
      }
      
      this.destroy();
      
    } catch (error) {
      console.error('💀 Error handling game reset:', error);
    }
  }

  handleInitializationError(error) {
    const errorMessage = `Grid Game initialization failed: ${error.message}`;
    
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: #ff4444; color: white; padding: 20px; border-radius: 10px;
      z-index: 10000; text-align: center; font-family: Arial, sans-serif;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    errorDiv.innerHTML = `
      <h3>💀 Grid Game Error</h3>
      <p>${errorMessage}</p>
      <button onclick="location.reload()" style="
        background: white; color: #ff4444; border: none;
        padding: 10px 20px; border-radius: 5px; cursor: pointer;
        font-weight: bold; margin-top: 10px;
      ">🔄 Reload Page</button>
    `;
    
    document.body.appendChild(errorDiv);

    if (this.gameState && !this.gameState.isDestroyed && this.storageManager) {
  try {
    console.log('💾 Emergency save before error handling...');
    this.storageManager.autoSaveToLocalStorage(this.gameState);
  } catch (saveError) {
    console.error('❌ Emergency save failed:', saveError);
  }
  }
}

  getGameState() {
    return this.gameState;
  }

  getGridManager() {
    return this.gridManager;
  }

  getManagers() {
    return this.managers;
  }

  // НОВОЕ: Получить RaidManager
  getRaidManager() {
    return this.managers.raid;
  }

  isGameActive() {
    return this.isActive() && 
           this.gameState && 
           this.gridManager?.isManagerReady() &&
           this.gameLoop?.running === true;
  }

  // НОВОЕ: Проверить, заблокирована ли игра рейдом
  isGameBlocked() {
    return this.managers.raid?.isRaidInProgress || false;
  }

  enableDebugMode() {
    console.log('🐛 Enabling debug mode for grid game with raids...');
    
    window.gameDebug = {
      getGameState: () => this.gameState,
      getGridManager: () => this.gridManager,
      getManagers: () => this.managers,
      getRaidManager: () => this.managers.raid, // НОВОЕ
      getGameCore: () => this,
      
      // Клетки сетки
      grid: {
        getInfo: () => this.gridManager?.getDebugInfo(),
        getStats: () => this.gridManager?.getStats(),
        shuffle: () => this.gridManager?.shuffleCells(),
        setTarget: (index) => this.gridManager?.setTargetCell(index),
        isReady: () => this.gridManager?.isManagerReady()
      },
      
      // НОВОЕ: Отладка рейдов
      raids: {
        getAvailable: () => this.managers.raid?.getAvailableRaids(),
        getCurrentStatus: () => this.managers.raid?.getCurrentRaidStatus(),
        getStatistics: () => this.managers.raid?.getRaidStatistics(),
        getSpecialRewards: () => this.managers.raid?.getSpecialRewards(),
        isSystemUnlocked: () => this.managers.raid?.isRaidSystemUnlocked(),
        startRaid: (raidId) => this.managers.raid?.startRaid(raidId),
        cancelRaid: () => this.managers.raid?.cancelRaid(),
        forceCompleteRaid: () => {
          if (this.managers.raid?.activeRaid) {
            this.managers.raid.completeRaid();
          }
        }
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
        grid: this.gridManager?.getStats(),
        cleanup: this.cleanupManager.getStats(),
        gameLoop: this.gameLoop?.getRenderStats(),
        raids: this.managers.raid?.getRaidStatistics() // НОВОЕ
      })
    };
    
    console.log('✅ Debug mode enabled for grid game with raids');
    console.log('🔧 Available commands: window.gameDebug.*');
    console.log('⚔️ Raid commands: window.gameDebug.raids.*');
  }

  getGameStats() {
    if (!this.gameState) return null;
    
    return {
      totalResources: Object.values(this.gameState.resources).reduce((sum, val) => sum + val, 0),
      currentCombo: this.gameState.combo.count,
      skillPoints: this.gameState.skillPoints,
      activeBuffs: this.gameState.buffs.length,
      activeDebuffs: this.gameState.debuffs.length,
      targetCell: this.gridManager?.getTargetCell(),
      gridReady: this.gridManager?.isManagerReady(),
      // НОВОЕ: статистика рейдов
      raidsUnlocked: this.managers.raid?.isRaidSystemUnlocked() || false,
      activeRaid: this.managers.raid?.isRaidInProgress || false,
      totalRaids: this.gameState.raids?.statistics?.totalRaids || 0
    };
  }

  // НОВОЕ: Получить полную статистику игры включая рейды
  getFullGameStats() {
    const baseStats = this.getGameStats();
    if (!baseStats) return null;
    
    return {
      ...baseStats,
      buildings: this.managers.building?.getBuildingStatistics(),
      skills: this.managers.skill?.getSkillStatistics(),
      raids: this.managers.raid?.getRaidStatistics(),
      energy: this.managers.energy?.getEnergyInfo(),
      effects: this.managers.buff?.getEffectStatistics()
    };
  }

  // НОВОЕ: Экспорт данных для анализа
  exportGameData() {
    try {
      const exportData = {
        timestamp: Date.now(),
        gameStats: this.getFullGameStats(),
        gameState: {
          resources: this.gameState.resources,
          buildings: this.gameState.buildings,
          skills: this.gameState.skills,
          raids: this.gameState.raids,
          combo: this.gameState.combo,
          skillPoints: this.gameState.skillPoints
        },
        managers: {
          grid: this.gridManager?.getDebugInfo(),
          raids: this.managers.raid?.getDebugInfo?.() || null
        }
      };
      
      console.log('📊 Game data exported:', exportData);
      return exportData;
      
    } catch (error) {
      console.error('❌ Failed to export game data:', error);
      return null;
    }
  }

  // НОВОЕ: Тестирование системы рейдов
  testRaidSystem() {
    console.log('🧪 Testing raid system...');
    
    try {
      const raidManager = this.managers.raid;
      if (!raidManager) {
        console.log('❌ RaidManager not available');
        return false;
      }
      
      // Проверяем разблокировку системы
      const isUnlocked = raidManager.isRaidSystemUnlocked();
      console.log('🔓 Raid system unlocked:', isUnlocked);
      
      // Получаем доступные рейды
      const availableRaids = raidManager.getAvailableRaids();
      console.log('📋 Available raids:', availableRaids.length);
      
      // Проверяем статистику
      const stats = raidManager.getRaidStatistics();
      console.log('📊 Raid statistics:', stats);
      
      // Проверяем текущий статус
      const status = raidManager.getCurrentRaidStatus();
      console.log('⚔️ Current raid status:', status);
      
      console.log('✅ Raid system test completed');
      return true;
      
    } catch (error) {
      console.error('❌ Raid system test failed:', error);
      return false;
    }
  }

  destroy() {
    console.log('🧹 GridGameCore cleanup started');
    
    // Останавливаем игровой цикл
    if (this.gameLoop) {
      this.gameLoop.stop();
    }
    
    // НОВОЕ: Завершаем активные рейды при уничтожении
    if (this.managers.raid && this.managers.raid.isRaidInProgress) {
      console.log('⚔️ Ending active raid during cleanup...');
      this.managers.raid.endRaid();
    }
    
    super.destroy();
    
    console.log('✅ GridGameCore destroyed');
  }
}