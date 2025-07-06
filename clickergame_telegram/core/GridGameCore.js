import { CleanupMixin } from './CleanupManager.js';
import { GameState } from './GameState.js';
import { StorageManager } from './StorageManager.js';
import { eventBus, GameEvents } from './GameEvents.js';
import { GridManager } from '../managers/GridManager.js';
import { GridFeatureManager } from '../managers/GridFeatureManager.js';
import { BuildingManager } from '../managers/BuildingManager.js';
import { SkillManager } from '../managers/SkillManager.js';
import { MarketManager } from '../managers/MarketManager.js';
import { RaidManager } from '../managers/RaidManager.js';
import { BuffManager } from '../effects/BuffManager.js';
import { AchievementManager } from '../managers/AchievementManager.js';
import { EnergyManager } from '../managers/EnergyManager.js';
import { TelegramCloudSaveManager } from '../managers/TelegramCloudSaveManager.js';
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
    this.cloudSaveManager = null;
    this.telegramIntegration = null;
    this.isFullyInitialized = false;
    
    this.initialize();
  }

  async initialize() {
    try {
      console.log('🎮 Initializing Grid Clicker with Telegram Integration...');
      
      await this.initializeGameState();
      await this.initializeGridManager();
      await this.initializeManagers();
      await this.setupManagerReferences();
      await this.initializeTelegramIntegration();
      await this.initializeUI();
      await this.startGameLoop();
      
      this.bindSystemEvents();
      this.isFullyInitialized = true;
      
      console.log('✅ Grid Game with Telegram integration initialized successfully');
      eventBus.emit(GameEvents.NOTIFICATION, '🎮 Grid Game with Telegram integration loaded!');
      
      // Отправляем начальную статистику
      this.sendInitialStatistics();
      
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
        current: 100,
        max: 100,
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

  async initializeGridManager() {
    console.log('🎯 Initializing GridManager...');
    this.gridManager = new GridManager();
    this.cleanupManager.registerComponent(this.gridManager, 'GridManager');

    if (this.gameState.targetZone !== undefined) {
      this.gridManager.setTargetCell(this.gameState.targetZone);
    }

    console.log('✅ GridManager initialized');
  }

  async initializeManagers() {
    console.log('🔧 Initializing managers with Telegram support...');
    try {
      this.managers.energy = new EnergyManager(this.gameState);
      this.managers.achievement = new AchievementManager(this.gameState);
      this.managers.building = new BuildingManager(this.gameState);
      this.managers.skill = new SkillManager(this.gameState);
      this.managers.market = new MarketManager(this.gameState);
      this.managers.buff = new BuffManager(this.gameState);
      this.managers.raid = new RaidManager(this.gameState);
      this.managers.feature = new GridFeatureManager(this.gameState, this.gridManager, this.managers.buff);

      Object.entries(this.managers).forEach(([name, manager]) => {
        this.cleanupManager.registerComponent(manager, `${name}Manager`);
      });

      console.log('✅ All managers initialized with Telegram support');
    } catch (error) {
      console.error('💀 Failed to initialize managers:', error);
      throw error;
    }
  }

  async setupManagerReferences() {
    console.log('🔗 Setting up manager references...');
    this.gameState.gridManager = this.gridManager;
    this.gameState.buffManager = this.managers.buff;
    this.gameState.energyManager = this.managers.energy;
    this.gameState.achievementManager = this.managers.achievement;
    this.gameState.buildingManager = this.managers.building;
    this.gameState.skillManager = this.managers.skill;
    this.gameState.marketManager = this.managers.market;
    this.gameState.featureManager = this.managers.feature;
    this.gameState.raidManager = this.managers.raid;
    this.gameState.managers = this.managers;
    console.log('✅ Manager references set up with Telegram support');
  }

async initializeTelegramIntegration() {
  console.log('📱 Initializing Telegram integration...');
  try {
    await this.waitForTelegramReady();
    
    if (window.telegramIntegration && window.telegramIntegration.isReady) {
      this.telegramIntegration = window.telegramIntegration;
      this.cloudSaveManager = new TelegramCloudSaveManager(this.gameState, this.telegramIntegration);
      this.cleanupManager.registerComponent(this.cloudSaveManager, 'TelegramCloudSaveManager');
      this.gameState.cloudSaveManager = this.cloudSaveManager;
      console.log('✅ Telegram integration initialized successfully');
    } else {
      console.warn('⚠️ Telegram integration not available, using local storage only');
    }
  } catch (error) {
    console.warn('⚠️ Telegram integration failed, falling back to local storage:', error);
  }
}

waitForTelegramReady() {
  return new Promise((resolve) => {
    if (window.telegramIntegration?.isReady) {
      resolve();
      return;
    }

    // Слушаем событие готовности
    const handleReady = () => {
      if (window.telegramIntegration?.isReady) {
        window.removeEventListener('telegramIntegrationComplete', handleReady);
        resolve();
      }
    };

    window.addEventListener('telegramIntegrationComplete', handleReady);

    // Таймаут на случай, если интеграция не загрузится
    setTimeout(() => {
      window.removeEventListener('telegramIntegrationComplete', handleReady);
      console.warn('⏰ Telegram integration timeout');
      resolve();
    }, 5000);
  });
}

  waitForTelegramReady() {
    return new Promise((resolve) => {
      if (window.telegramIntegration?.isReady) {
        resolve();
        return;
      }

      const checkTelegram = () => {
        if (window.telegramIntegration?.isReady) {
          resolve();
        } else {
          setTimeout(checkTelegram, 100);
        }
      };

      // Таймаут 5 секунд
      setTimeout(() => {
        console.warn('⏰ Telegram integration timeout');
        resolve();
      }, 5000);

      checkTelegram();
    });
  }

  async initializeUI() {
    console.log('🖥️ Initializing UI with Telegram support...');
    this.managers.ui = new UIManager(this.gameState);
    this.cleanupManager.registerComponent(this.managers.ui, 'UIManager');
    console.log('✅ UI initialized with Telegram support');
  }

  async startGameLoop() {
    console.log('🔄 Starting grid game loop...');
    this.gameLoop = new GridGameLoop(this.gameState, this.gridManager);
    this.cleanupManager.registerComponent(this.gameLoop, 'GridGameLoop');
    this.gameLoop.start();
    console.log('✅ Grid game loop started');
  }

  bindSystemEvents() {
    // Автосохранение каждые 30 секунд
    this.createInterval(() => {
      this.autoSave();
    }, 30000, 'auto-save');

    // Отправка статистики в Telegram каждые 5 минут
    this.createInterval(() => {
      this.sendTelegramStatistics();
    }, 300000, 'telegram-stats');

    // События игры
    eventBus.subscribe(GameEvents.GAME_RESET, () => {
      this.handleGameReset();
    });

    eventBus.subscribe('raid:started', (data) => {
      console.log('⚔️ Raid started:', data.raid?.name);
      this.sendTelegramStatistics(); // Отправляем обновленную статистику
    });

    eventBus.subscribe('raid:completed', (data) => {
      console.log('⚔️ Raid completed at:', new Date(data.timestamp));
      this.autoSave();
      this.sendTelegramStatistics();
    });

    eventBus.subscribe(GameEvents.ACHIEVEMENT_UNLOCKED, (data) => {
      console.log('🏆 Achievement unlocked:', data.achievement?.name);
      this.sendTelegramAchievement(data);
      this.sendTelegramStatistics();
    });

    eventBus.subscribe(GameEvents.BUILDING_BOUGHT, () => {
      this.sendTelegramStatistics();
    });

    eventBus.subscribe(GameEvents.SKILL_BOUGHT, () => {
      this.sendTelegramStatistics();
    });

    eventBus.subscribe(GameEvents.ITEM_PURCHASED, () => {
      this.sendTelegramStatistics();
    });

    // События браузера
    this.addEventListener(window, 'beforeunload', (e) => {
      this.autoSave();
      this.sendTelegramStatistics();
    });

    this.addEventListener(window, 'unload', () => {
      this.destroy();
    });

    this.addEventListener(document, 'visibilitychange', () => {
      if (document.hidden) {
        this.autoSave();
        this.sendTelegramStatistics();
      }
    });
  }

  sendInitialStatistics() {
    try {
      if (!this.isFullyInitialized) return;
      
      // Небольшая задержка для полной инициализации
      this.createTimeout(() => {
        this.sendTelegramStatistics();
      }, 2000);
    } catch (error) {
      console.warn('⚠️ Error sending initial statistics:', error);
    }
  }

  async sendTelegramStatistics() {
    try {
      if (!this.telegramIntegration || !this.gameState) return;

      const saveData = this.gameState.getSaveData();
      if (saveData) {
        await this.telegramIntegration.sendGameStatistics(saveData);
      }
    } catch (error) {
      console.warn('⚠️ Error sending Telegram statistics:', error);
    }
  }

  async sendTelegramAchievement(achievementData) {
    try {
      if (!this.telegramIntegration) return;

      await this.telegramIntegration.onAchievementUnlocked(achievementData);
    } catch (error) {
      console.warn('⚠️ Error sending Telegram achievement:', error);
    }
  }

  autoSave() {
    if (!this.gameState || this.gameState.isDestroyed || !this.storageManager) {
      return false;
    }

    try {
      if (!this.gameState._saveCount) {
        this.gameState._saveCount = 0;
      }
      this.gameState._saveCount++;

      // Сохраняем текущую зону
      if (this.gridManager) {
        this.gameState.targetZone = this.gridManager.getTargetCell();
      }

      // Сохраняем активный рейд если есть
      if (this.managers.raid && this.managers.raid.isRaidInProgress) {
        console.log('💾 Saving active raid state...');
        this.gameState.raids.activeRaid = this.managers.raid.activeRaid;
        this.gameState.raids.isRaidInProgress = this.managers.raid.isRaidInProgress;
        this.gameState.raids.raidStartTime = this.managers.raid.raidStartTime;
        this.gameState.raids.raidProgress = this.managers.raid.raidProgress;
        this.gameState.raids.autoClickerWasActive = this.managers.raid.autoClickerWasActive;
      }

      const saveData = this.gameState.getSaveData();
      if (!saveData) return false;

      // Резервное сохранение активного рейда
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
      }

      // Локальное сохранение
      const localSuccess = this.storageManager.safeSave({
        ...saveData,
        getSaveData: () => saveData
      });

      // Облачное сохранение через Telegram
      if (this.cloudSaveManager) {
        this.cloudSaveManager.scheduleSave(5000);
      }

      if (localSuccess) {
        console.log('💾 Auto-save completed successfully');
        eventBus.emit(GameEvents.SAVE_COMPLETED, { saveData, timestamp: Date.now() });
      }

      return localSuccess;
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

      if (this.managers.raid && this.managers.raid.isRaidInProgress) {
        this.managers.raid.endRaid();
      }

      // Отправляем уведомление в Telegram о сбросе
      if (this.telegramIntegration) {
        this.telegramIntegration.sendDataToBot({
          type: 'game_event',
          userId: this.telegramIntegration.userId,
          event_type: 'game_reset',
          timestamp: Date.now()
        });
      }

      this.destroy();
    } catch (error) {
      console.error('💀 Error handling game reset:', error);
    }
  }

  handleInitializationError(error) {
    const errorMessage = `Grid Game initialization failed: ${error.message}`;
    
    // Отправляем ошибку в Telegram
    if (this.telegramIntegration) {
      this.telegramIntegration.sendDataToBot({
        type: 'error_report',
        userId: this.telegramIntegration.userId,
        error: {
          message: error.message,
          stack: error.stack,
          timestamp: Date.now(),
          context: 'initialization'
        }
      });
    }

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

    // Экстренное сохранение
    if (this.gameState && !this.gameState.isDestroyed && this.storageManager) {
      try {
        console.log('💾 Emergency save before error handling...');
        this.storageManager.autoSaveToLocalStorage(this.gameState);
      } catch (saveError) {
        console.error('❌ Emergency save failed:', saveError);
      }
    }
  }

  // Геттеры для внешнего доступа
  getGameState() {
    return this.gameState;
  }

  getGridManager() {
    return this.gridManager;
  }

  getManagers() {
    return this.managers;
  }

  getRaidManager() {
    return this.managers.raid;
  }

  getTelegramIntegration() {
    return this.telegramIntegration;
  }

  getCloudSaveManager() {
    return this.cloudSaveManager;
  }

  isGameActive() {
    return this.isActive() &&
           this.gameState &&
           this.gridManager?.isManagerReady() &&
           this.gameLoop?.running === true;
  }

  isGameBlocked() {
    return this.managers.raid?.isRaidInProgress || false;
  }

  // Методы для отладки
  enableDebugMode() {
    console.log('🐛 Enabling debug mode for grid game with Telegram...');
    window.gameDebug = {
      getGameState: () => this.gameState,
      getGridManager: () => this.gridManager,
      getManagers: () => this.managers,
      getRaidManager: () => this.managers.raid,
      getTelegramIntegration: () => this.telegramIntegration,
      getCloudSaveManager: () => this.cloudSaveManager,
      getGameCore: () => this,
      
      // Grid методы
      grid: {
        getInfo: () => this.gridManager?.getDebugInfo(),
        getStats: () => this.gridManager?.getStats(),
        shuffle: () => this.gridManager?.shuffleCells(),
        setTarget: (index) => this.gridManager?.setTargetCell(index),
        isReady: () => this.gridManager?.isManagerReady()
      },
      
      // Raid методы
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
      
      // Energy методы
      energy: {
        getCurrent: () => this.managers.energy?.getEnergyInfo(),
        restore: (amount) => this.managers.energy?.restoreEnergy(amount, 'debug'),
        consume: (amount) => this.managers.energy?.consumeEnergy(amount)
      },
      
      // Achievement методы
      achievements: {
        getAll: () => this.managers.achievement?.getAllAchievements(),
        getCompleted: () => this.managers.achievement?.getCompletedAchievements()
      },
      
      // Telegram методы
      telegram: {
        getIntegration: () => this.telegramIntegration,
        getCloudSaveManager: () => this.cloudSaveManager,
        sendStats: () => this.sendTelegramStatistics(),
        getSyncStatus: () => this.cloudSaveManager?.getSyncStatus(),
        forceSyncToCloud: () => this.cloudSaveManager?.forceSyncToCloud(),
        getDebugInfo: () => this.telegramIntegration?.getDebugInfo()
      },
      
      // Общие методы
      triggerAutoSave: () => this.autoSave(),
      getStats: () => ({
        gameState: this.getGameStats(),
        grid: this.gridManager?.getStats(),
        cleanup: this.cleanupManager.getStats(),
        gameLoop: this.gameLoop?.getRenderStats(),
        raids: this.managers.raid?.getRaidStatistics(),
        telegram: this.telegramIntegration?.getDebugInfo(),
        cloudSave: this.cloudSaveManager?.getSyncStatus()
      })
    };
    
    console.log('✅ Debug mode enabled for grid game with Telegram');
    console.log('🔧 Available commands: window.gameDebug.*');
    console.log('⚔️ Raid commands: window.gameDebug.raids.*');
    console.log('📱 Telegram commands: window.gameDebug.telegram.*');
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
      raidsUnlocked: this.managers.raid?.isRaidSystemUnlocked() || false,
      activeRaid: this.managers.raid?.isRaidInProgress || false,
      totalRaids: this.gameState.raids?.statistics?.totalRaids || 0,
      telegramConnected: !!this.telegramIntegration?.isReady,
      cloudSaveEnabled: !!this.cloudSaveManager?.isEnabled
    };
  }

  getFullGameStats() {
    const baseStats = this.getGameStats();
    if (!baseStats) return null;
    
    return {
      ...baseStats,
      buildings: this.managers.building?.getBuildingStatistics(),
      skills: this.managers.skill?.getSkillStatistics(),
      raids: this.managers.raid?.getRaidStatistics(),
      energy: this.managers.energy?.getEnergyInfo(),
      effects: this.managers.buff?.getEffectStatistics(),
      telegram: this.telegramIntegration?.getDebugInfo(),
      cloudSave: this.cloudSaveManager?.getSyncStatus()
    };
  }

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
        },
        telegram: {
          integration: this.telegramIntegration?.getDebugInfo(),
          cloudSave: this.cloudSaveManager?.getSyncStatus()
        }
      };
      
      console.log('📊 Game data exported with Telegram info:', exportData);
      return exportData;
    } catch (error) {
      console.error('❌ Failed to export game data:', error);
      return null;
    }
  }

  testTelegramIntegration() {
    console.log('🧪 Testing Telegram integration...');
    try {
      if (!this.telegramIntegration) {
        console.log('❌ Telegram integration not available');
        return false;
      }

      const debugInfo = this.telegramIntegration.getDebugInfo();
      console.log('📱 Telegram integration info:', debugInfo);

      if (this.cloudSaveManager) {
        const syncStatus = this.cloudSaveManager.getSyncStatus();
        console.log('☁️ Cloud save status:', syncStatus);
      }

      console.log('✅ Telegram integration test completed');
      return true;
    } catch (error) {
      console.error('❌ Telegram integration test failed:', error);
      return false;
    }
  }

  destroy() {
    console.log('🧹 GridGameCore cleanup started');
    
    if (this.gameLoop) {
      this.gameLoop.stop();
    }
    
    if (this.managers.raid && this.managers.raid.isRaidInProgress) {
      console.log('⚔️ Ending active raid during cleanup...');
      this.managers.raid.endRaid();
    }
    
    // Финальная отправка статистики
    if (this.telegramIntegration && this.isFullyInitialized) {
      this.sendTelegramStatistics();
    }
    
    super.destroy();
    console.log('✅ GridGameCore destroyed');
  }
}