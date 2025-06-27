// core/GameCore.js - ИСПРАВЛЕННАЯ версия с правильной синхронизацией зон
import { CleanupMixin } from './CleanupManager.js';
import { GameState } from './GameState.js';
import { StorageManager } from './StorageManager.js';
import { eventBus, GameEvents } from './GameEvents.js';
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
    this.managers = {};
    this.gameLoop = null;
    this.achievementTimers = {
      combo: 0,
      resource: 0
    };
    
    // НОВОЕ: Система мониторинга синхронизации зон
    this.zoneSyncMonitor = {
      checkInterval: null,
      lastSyncCheck: 0,
      syncErrors: 0,
      maxSyncErrors: 3
    };
    
    this.initialize();
  }

  // Инициализация игры
  async initialize() {
    try {
      console.log('🎮 Initializing Advanced Clicker v1.0.8...');
      
      await this.initializeGameState();
      await this.initializeManagers();
      await this.setupManagerReferences();
      await this.initializeUI();
      await this.startGameLoop();
      
      // КРИТИЧЕСКИ ВАЖНО: Запуск системы синхронизации зон
      this.startZoneSynchronizationSystem();
      
      // Подписываемся на системные события
      this.bindSystemEvents();
      
      // НОВОЕ: Принудительная первичная синхронизация
      this.performInitialZoneSync();
      
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
    
    // Регистрируем GameState для очистки
    this.cleanupManager.registerComponent(this.gameState, 'GameState');
  }

  // ИСПРАВЛЕННАЯ инициализация менеджеров с правильным порядком
  async initializeManagers() {
    console.log('🔧 Initializing managers...');
    
    try {
      // ШАГИ ИНИЦИАЛИЗАЦИИ МЕНЕДЖЕРОВ (порядок критически важен):
      
      // 1. Базовые менеджеры (без зависимостей)
      this.managers.energy = new EnergyManager(this.gameState);
      this.managers.achievement = new AchievementManager(this.gameState);
      this.managers.building = new BuildingManager(this.gameState);
      this.managers.skill = new SkillManager(this.gameState);
      this.managers.market = new MarketManager(this.gameState);
      
      console.log('✅ Basic managers initialized');
      
      // 2. BuffManager (зависит от gameState)
      this.managers.buff = new BuffManager(this.gameState);
      console.log('✅ BuffManager initialized');
      
      // 3. КРИТИЧЕСКИ ВАЖНО: FeatureManager создается ПОСЛЕДНИМ
      // Он управляет зонами и должен получить ссылки на все другие менеджеры
      this.managers.feature = new FeatureManager(this.gameState, this.managers.buff);
      console.log('✅ FeatureManager initialized');
      
      // Регистрируем менеджеры для очистки
      Object.entries(this.managers).forEach(([name, manager]) => {
        this.cleanupManager.registerComponent(manager, `${name}Manager`);
      });
      
      console.log('✅ All managers initialized and registered');
      
    } catch (error) {
      console.error('💀 Failed to initialize managers:', error);
      throw error;
    }
  }

  // ИСПРАВЛЕННАЯ установка правильных ссылок между менеджерами
  async setupManagerReferences() {
    console.log('🔗 Setting up manager references...');
    
    try {
      // КРИТИЧЕСКИ ВАЖНО: Устанавливаем ссылки в gameState для доступа из других компонентов
      this.gameState.buffManager = this.managers.buff;
      this.gameState.energyManager = this.managers.energy;
      this.gameState.achievementManager = this.managers.achievement;
      this.gameState.buildingManager = this.managers.building;
      this.gameState.skillManager = this.managers.skill;
      this.gameState.marketManager = this.managers.market;
      this.gameState.featureManager = this.managers.feature;
      
      // Дополнительные ссылки для совместимости
      this.gameState.managers = this.managers;
      this.gameState.featureMgr = this.managers.feature;
      
      console.log('✅ Manager references set up successfully');
      
    } catch (error) {
      console.error('💀 Failed to set up manager references:', error);
      throw error;
    }
  }

  // Инициализация UI
  async initializeUI() {
    console.log('🖥️ Initializing UI...');
    
    try {
      this.managers.ui = new UIManager(this.gameState);
      this.cleanupManager.registerComponent(this.managers.ui, 'UIManager');
      
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
      this.cleanupManager.registerComponent(this.gameLoop, 'GameLoop');
      
      this.gameLoop.start();
      console.log('✅ Game loop started');
      
    } catch (error) {
      console.error('💀 Failed to start game loop:', error);
      throw error;
    }
  }

  // НОВАЯ СИСТЕМА: Запуск системы синхронизации зон
  startZoneSynchronizationSystem() {
    console.log('🎯 Starting zone synchronization system...');
    
    // Мониторинг синхронизации зон каждые 2 секунды
    this.zoneSyncMonitor.checkInterval = this.createInterval(() => {
      this.checkZoneSynchronization();
    }, 2000, 'zone-sync-monitor');
    
    // Подписываемся на события изменения зон
    eventBus.subscribe(GameEvents.ZONES_SHUFFLED, (newTargetZone) => {
      console.log(`🎯 Zone shuffle detected: new target = ${newTargetZone}`);
      this.validateZoneSync(newTargetZone);
    });
    
    console.log('✅ Zone synchronization system started');
  }

  // НОВОЕ: Проверка синхронизации зон
  checkZoneSynchronization() {
    if (!this.isGameActive()) return;
    
    try {
      const now = Date.now();
      
      // Ограничиваем частоту проверок
      if (now - this.zoneSyncMonitor.lastSyncCheck < 1000) {
        return;
      }
      this.zoneSyncMonitor.lastSyncCheck = now;
      
      // Получаем состояние зон из разных компонентов
      const gameStateTarget = this.gameState.targetZone;
      const featureManagerInfo = this.managers.feature?.getZonesDebugInfo?.();
      const gameLoopSyncInfo = this.gameLoop?.getZoneSyncInfo?.();
      
      // Проверяем синхронизацию
      const isFeatureSynced = featureManagerInfo?.targetZone === gameStateTarget;
      const isGameLoopSynced = gameLoopSyncInfo?.gameLoopTargetZone === gameStateTarget;
      
      if (!isFeatureSynced || !isGameLoopSynced) {
        this.zoneSyncMonitor.syncErrors++;
        console.warn(`⚠️ Zone desync detected! GameState: ${gameStateTarget}, Feature: ${featureManagerInfo?.targetZone}, GameLoop: ${gameLoopSyncInfo?.gameLoopTargetZone}`);
        
        // Если слишком много ошибок, принудительно исправляем
        if (this.zoneSyncMonitor.syncErrors >= this.zoneSyncMonitor.maxSyncErrors) {
          console.log('🔧 Too many sync errors, performing emergency zone sync...');
          this.performEmergencyZoneSync();
        }
      } else {
        // Сбрасываем счетчик ошибок при успешной синхронизации
        this.zoneSyncMonitor.syncErrors = 0;
      }
      
    } catch (error) {
      console.warn('⚠️ Error in zone synchronization check:', error);
    }
  }

  // НОВОЕ: Валидация синхронизации зон после события
  validateZoneSync(expectedTargetZone) {
    this.createTimeout(() => {
      const featureManagerInfo = this.managers.feature?.getZonesDebugInfo?.();
      const gameLoopSyncInfo = this.gameLoop?.getZoneSyncInfo?.();
      
      const featureTarget = featureManagerInfo?.targetZone;
      const gameLoopTarget = gameLoopSyncInfo?.gameLoopTargetZone;
      
      if (featureTarget !== expectedTargetZone || gameLoopTarget !== expectedTargetZone) {
        console.warn(`🚨 Zone sync validation failed! Expected: ${expectedTargetZone}, Feature: ${featureTarget}, GameLoop: ${gameLoopTarget}`);
        this.performEmergencyZoneSync(expectedTargetZone);
      } else {
        console.log(`✅ Zone sync validation passed for target ${expectedTargetZone}`);
      }
    }, 100); // Даем время для обновления всех компонентов
  }

  // НОВОЕ: Экстренная синхронизация зон
  performEmergencyZoneSync(targetZone = null) {
    console.log('🚨 Performing emergency zone synchronization...');
    
    try {
      // Используем targetZone из gameState как источник истины
      const correctTargetZone = targetZone !== null ? targetZone : this.gameState.targetZone;
      
      console.log(`🔧 Setting correct target zone: ${correctTargetZone}`);
      
      // 1. Обновляем gameState (источник истины)
      this.gameState.targetZone = correctTargetZone;
      this.gameState.previousTargetZone = correctTargetZone;
      
      // 2. Принудительно синхронизируем FeatureManager
      if (this.managers.feature && typeof this.managers.feature.setTargetZone === 'function') {
        this.managers.feature.setTargetZone(correctTargetZone);
        console.log('✅ FeatureManager synchronized');
      }
      
      // 3. Принудительно синхронизируем GameLoop
      if (this.gameLoop && typeof this.gameLoop.forceSyncAll === 'function') {
        this.gameLoop.forceSyncAll();
        console.log('✅ GameLoop synchronized');
      }
      
      // 4. Обновляем UI
      if (this.managers.ui && typeof this.managers.ui.forceUpdate === 'function') {
        this.managers.ui.forceUpdate();
        console.log('✅ UI synchronized');
      }
      
      // 5. Сбрасываем счетчик ошибок
      this.zoneSyncMonitor.syncErrors = 0;
      
      console.log('✅ Emergency zone synchronization completed');
      
    } catch (error) {
      console.error('💀 Emergency zone sync failed:', error);
    }
  }

  // НОВОЕ: Первичная синхронизация зон после инициализации
  performInitialZoneSync() {
    console.log('🎯 Performing initial zone synchronization...');
    
    this.createTimeout(() => {
      try {
        // Устанавливаем targetZone на 0 для начала игры
        const initialTargetZone = 0;
        
        this.gameState.targetZone = initialTargetZone;
        this.gameState.previousTargetZone = initialTargetZone;
        
        // Принудительно синхронизируем все компоненты
        if (this.managers.feature) {
          this.managers.feature.forceZoneSync();
        }
        
        if (this.gameLoop) {
          this.gameLoop.forceSyncAll();
        }
        
        // Эмитируем событие для уведомления всех подписчиков
        eventBus.emit(GameEvents.ZONES_SHUFFLED, initialTargetZone);
        
        console.log('✅ Initial zone synchronization completed');
        
      } catch (error) {
        console.error('💀 Initial zone sync failed:', error);
      }
    }, 500); // Даем время для полной инициализации всех компонентов
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
      this.restartManagersAfterLoad();
    });
    
    // Обработка закрытия страницы
    this.addEventListener(window, 'beforeunload', (e) => {
      this.handlePageUnload(e);
    });
    
    this.addEventListener(window, 'unload', () => {
      this.destroy();
    });
    
    // Обработка потери фокуса для автосохранения
    this.addEventListener(document, 'visibilitychange', () => {
      if (document.hidden) {
        this.autoSave();
      }
    });
  }

  // Безопасное автосохранение
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
      // Создаем расширенные данные сохранения
      const saveData = this.gameState.getSaveData();
      
      // Добавляем данные энергии
      if (this.managers.energy) {
        saveData.energy = this.managers.energy.getSaveData();
      }
      
      // Добавляем данные достижений
      if (this.managers.achievement) {
        saveData.achievements = this.managers.achievement.getSaveData();
      }
      
      // Используем безопасное сохранение
      const success = this.storageManager.safeSave({
        ...saveData,
        getSaveData: () => saveData // Добавляем метод для совместимости
      });
      
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

  // ИСПРАВЛЕННЫЙ перезапуск менеджеров после загрузки с правильной синхронизацией зон
  restartManagersAfterLoad() {
    console.log('🔄 Restarting managers after load...');
    
    try {
      // Перезапускаем производство зданий
      if (this.managers.building) {
        this.managers.building.stopAllProduction();
        this.managers.building.startProduction();
        console.log('✅ Building production restarted');
      }

      // Перезапускаем генерацию навыков и автокликер
      if (this.managers.skill) {
        this.managers.skill.stopAllGeneration();
        this.managers.skill.startGeneration();
        console.log('✅ Skill generation restarted');
      }

      // Перезапускаем энергетическую систему
      if (this.managers.energy) {
        this.managers.energy.forceUpdate();
        console.log('✅ Energy system updated');
      }

      // Проверяем достижения после загрузки
      if (this.managers.achievement) {
        this.managers.achievement.forceCheckAllAchievements();
        console.log('✅ Achievements checked');
      }

      // КРИТИЧЕСКИ ВАЖНО: Принудительно переинициализируем зоны после загрузки
      this.createTimeout(() => {
        this.performEmergencyZoneSync();
        console.log('✅ Zones fully synchronized after load');
      }, 300);

      // Обновляем UI
      if (this.managers.ui) {
        this.createTimeout(() => {
          this.managers.ui.forceUpdate();
          console.log('✅ UI updated after load');
        }, 500);
      }

      // Принудительно обновляем игровой цикл
      if (this.gameLoop) {
        this.createTimeout(() => {
          this.gameLoop.forceRedraw();
          console.log('✅ Game loop refreshed after load');
        }, 600);
      }

    } catch (error) {
      console.warn('⚠️ Some managers failed to restart after load:', error);
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

  // Обработка сброса игры
  handleGameReset() {
    console.log('🔥 Handling game reset...');
    
    try {
      // Останавливаем игровой цикл
      if (this.gameLoop) {
        this.gameLoop.stop();
      }

      // Останавливаем все процессы менеджеров
      this.stopAllGameProcesses();
      
      // Выполняем полную очистку
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
      
      // Останавливаем систему мониторинга зон
      if (this.zoneSyncMonitor.checkInterval) {
        this.cleanupManager.clearInterval(this.zoneSyncMonitor.checkInterval);
        this.zoneSyncMonitor.checkInterval = null;
      }
      
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
      skillsLearned: Object.values(this.gameState.skills).filter(s => s.level > 0).length,
      // Статистики энергии
      energy: this.managers.energy ? {
        current: this.gameState.energy?.current || 0,
        max: this.managers.energy.getEffectiveMaxEnergy(),
        percentage: this.managers.energy.getEnergyPercentage()
      } : null,
      // Статистики достижений
      achievements: this.managers.achievement ? {
        completed: this.managers.achievement.getCompletedAchievements().length,
        total: this.managers.achievement.getAllAchievements().length,
        completionPercent: this.managers.achievement.getAchievementStats().completionPercent
      } : null,
      // НОВОЕ: Расширенная статистика зон
      zones: this.managers.feature ? {
        targetZone: this.gameState.targetZone,
        zoneStats: this.managers.feature.getZoneStatistics(),
        syncInfo: this.gameLoop ? this.gameLoop.getZoneSyncInfo() : null,
        syncErrors: this.zoneSyncMonitor.syncErrors,
        lastSyncCheck: this.zoneSyncMonitor.lastSyncCheck
      } : null
    };
  }

  // Проверка активности игры
  isGameActive() {
    return this.isActive() && this.gameState && this.gameLoop && this.gameLoop.isRunning();
  }

  // ИСПРАВЛЕННЫЙ enableDebugMode с новыми методами для зон
  enableDebugMode() {
    console.log('🐛 Enabling debug mode...');
    
    // Создаем глобальный объект для отладки
    window.gameDebug = {
      getGameState: () => this.gameState,
      getManagers: () => this.managers,
      getGameCore: () => this,
      
      // Энергетические функции отладки
      energy: {
        getCurrent: () => this.managers.energy?.getEnergyInfo(),
        restore: (amount) => this.managers.energy?.restoreEnergy(amount, 'debug'),
        consume: (amount) => this.managers.energy?.consumeEnergy(amount),
        reset: () => this.managers.energy?.resetEnergy(),
        getStats: () => this.managers.energy?.getEnergyStatistics(),
        useEnergyPack: () => this.managers.energy?.useEnergyPack(),
        useEnergyDrink: () => this.managers.energy?.useEnergyDrink(),
        usePowerCore: () => this.managers.energy?.usePowerCore()
      },
      
      // Функции отладки достижений
      achievements: {
        getAll: () => this.managers.achievement?.getAllAchievements(),
        getCompleted: () => this.managers.achievement?.getCompletedAchievements(),
        getStats: () => this.managers.achievement?.getAchievementStats(),
        forceCheck: () => this.managers.achievement?.forceCheckAllAchievements(),
        reset: () => this.managers.achievement?.resetAchievements(),
        addClicks: (count) => {
          for (let i = 0; i < count; i++) {
            eventBus.emit(GameEvents.CLICK, 0);
          }
        },
        setCombo: (count) => {
          this.gameState.combo.count = count;
          if (count > this.managers.achievement.statistics.maxCombo) {
            this.managers.achievement.statistics.maxCombo = count;
          }
          eventBus.emit(GameEvents.COMBO_CHANGED, this.gameState.combo);
        }
      },
      
      // ИСПРАВЛЕННЫЕ: Функции отладки зон с новыми методами
      zones: {
        // Получить текущее состояние зон
        getState: () => {
          if (!this.managers.feature) return 'FeatureManager not available';
          return this.managers.feature.getZonesDebugInfo();
        },
        
        // Получить статистику зон
        getStats: () => {
          if (!this.managers.feature) return 'FeatureManager not available';
          return this.managers.feature.getZoneStatistics();
        },
        
        // Принудительно синхронизировать зоны
        sync: () => {
          if (!this.managers.feature) return 'FeatureManager not available';
          this.managers.feature.forceZoneSync();
          return 'Zones synchronized';
        },
        
        // НОВОЕ: Полный сброс зон
        reset: () => {
          if (!this.managers.feature) return 'FeatureManager not available';
          this.managers.feature.forceZoneReset();
          return 'Zones completely reset';
        },
        
        // Установить целевую зону
        setTarget: (zoneIndex) => {
          if (!this.managers.feature) return 'FeatureManager not available';
          const result = this.managers.feature.setTargetZone(zoneIndex);
          return result ? `Target zone set to ${zoneIndex}` : 'Failed to set target zone';
        },
        
        // Получить информацию о зонах
        getInfo: () => {
          if (!this.managers.feature) return 'FeatureManager not available';
          return this.managers.feature.getZoneInfo();
        },
        
        // НОВОЕ: Сравнить состояние GameLoop и FeatureManager
        compare: () => {
          const gameLoopTarget = this.gameState.targetZone;
          const featureManagerState = this.managers.feature ? this.managers.feature.getZonesDebugInfo() : null;
          const gameLoopSyncInfo = this.gameLoop ? this.gameLoop.getZoneSyncInfo() : null;
          
          return {
            gameStateTarget: gameLoopTarget,
            featureManagerTarget: featureManagerState?.targetZone,
            gameLoopSyncInfo: gameLoopSyncInfo,
            synchronized: gameLoopTarget === featureManagerState?.targetZone,
            zoneTypes: featureManagerState?.zoneTypes || 'not available',
            allSynced: gameLoopSyncInfo?.synchronized || false,
            syncErrors: this.zoneSyncMonitor.syncErrors,
            lastSyncCheck: this.zoneSyncMonitor.lastSyncCheck
          };
        },
        
        // НОВОЕ: Исправить все проблемы с зонами (улучшенная версия)
        fixAll: () => {
          console.log('🔧 Fixing all zone issues...');
          
          try {
            // Используем новую систему экстренной синхронизации
            this.performEmergencyZoneSync();
            return 'All zone issues fixed using emergency sync system';
          } catch (error) {
            console.error('Error fixing zones:', error);
            return `Error: ${error.message}`;
          }
        },
        
        // НОВОЕ: Включить/выключить автоматическую проверку синхронизации
        toggleAutoSync: () => {
          if (this.zoneSyncMonitor.checkInterval) {
            this.cleanupManager.clearInterval(this.zoneSyncMonitor.checkInterval);
            this.zoneSyncMonitor.checkInterval = null;
            return 'Auto sync checker disabled';
          } else {
            this.startZoneSynchronizationSystem();
            return 'Auto sync checker enabled';
          }
        },
        
        // НОВОЕ: Получить статистику системы синхронизации
        getSyncStats: () => {
          return {
            syncErrors: this.zoneSyncMonitor.syncErrors,
            maxSyncErrors: this.zoneSyncMonitor.maxSyncErrors,
            lastSyncCheck: this.zoneSyncMonitor.lastSyncCheck,
            monitorActive: !!this.zoneSyncMonitor.checkInterval,
            timeSinceLastCheck: Date.now() - this.zoneSyncMonitor.lastSyncCheck
          };
        },
        
        // НОВОЕ: Принудительная проверка синхронизации
        checkSync: () => {
          this.checkZoneSynchronization();
          return 'Sync check performed';
        },
        
        // НОВОЕ: Симуляция ошибки синхронизации (для тестирования)
        simulateDesync: () => {
          this.gameState.targetZone = 7; // Устанавливаем неправильное значение
          return 'Desync simulated - target zone set to 7 without proper sync';
        },
        
        // Исправить рассинхронизацию (старый метод для совместимости)
        fix: () => {
          return window.gameDebug.zones.fixAll();
        }
      },
      
      // Существующие функции...
      forceComboReset: () => {
        if (this.managers.feature && typeof this.managers.feature.forceResetCombo === 'function') {
          this.managers.feature.forceResetCombo();
        } else {
          this.gameState.combo.count = 0;
          this.gameState.combo.deadline = 0;
        }
      },
      
      setCombo: (count) => {
        this.gameState.combo.count = Math.max(0, count);
        eventBus.emit(GameEvents.COMBO_CHANGED, this.gameState.combo);
      },
      
      clearAllEffects: () => {
        this.managers.buff?.clearAllEffects();
      },
      
      forceEffectCleanup: () => {
        this.managers.buff?.forceCleanExpiredEffects();
        this.managers.ui?.effectIndicators?.forceCleanup();
      },
      
      getAutoClickerStats: () => {
        return this.managers.skill?.getAutoClickerStats();
      },
      
      reloadAutoClicker: () => {
        this.managers.skill?.reloadAutoClicker();
      },
      
      triggerAutoSave: () => this.autoSave(),
      
      // НОВОЕ: Функции для отладки системы синхронизации
      sync: {
        getStats: () => window.gameDebug.zones.getSyncStats(),
        check: () => window.gameDebug.zones.checkSync(),
        fix: () => window.gameDebug.zones.fixAll(),
        toggle: () => window.gameDebug.zones.toggleAutoSync(),
        simulate: () => window.gameDebug.zones.simulateDesync(),
        emergency: () => this.performEmergencyZoneSync(),
        validate: (targetZone) => this.validateZoneSync(targetZone || this.gameState.targetZone)
      },
      
      getStats: () => ({
        gameState: this.getGameStats(),
        cleanup: this.cleanupManager.getStats(),
        ui: this.managers.ui?.getUIStats(),
        buffs: this.managers.buff?.getDebugInfo(),
        effects: this.managers.ui?.effectIndicators?.getDebugInfo(),
        gameLoop: this.gameLoop?.getRenderStats(),
        energy: this.managers.energy?.getEnergyStatistics(),
        achievements: this.managers.achievement?.getAchievementStats(),
        zones: {
          syncStats: this.zoneSyncMonitor,
          currentState: this.managers.feature?.getZonesDebugInfo(),
          gameLoopSync: this.gameLoop?.getZoneSyncInfo()
        }
      }),
      
      // НОВОЕ: Расширенные функции тестирования
      test: {
        zoneSync: () => {
          console.log('🧪 Testing zone synchronization...');
          
          // Тест 1: Проверка текущего состояния
          const currentState = window.gameDebug.zones.compare();
          console.log('Current sync state:', currentState);
          
          // Тест 2: Симуляция ошибки и исправление
          window.gameDebug.zones.simulateDesync();
          console.log('Desync simulated');
          
          setTimeout(() => {
            const desyncState = window.gameDebug.zones.compare();
            console.log('State after desync:', desyncState);
            
            window.gameDebug.zones.fixAll();
            console.log('Fix applied');
            
            setTimeout(() => {
              const fixedState = window.gameDebug.zones.compare();
              console.log('State after fix:', fixedState);
              
              return {
                initial: currentState,
                afterDesync: desyncState,
                afterFix: fixedState,
                success: fixedState.synchronized
              };
            }, 100);
          }, 100);
        },
        
        fullSystem: () => {
          console.log('🧪 Testing full system...');
          return {
            gameActive: this.isGameActive(),
            managers: Object.keys(this.managers),
            gameState: !!this.gameState,
            gameLoop: !!this.gameLoop,
            zoneSync: window.gameDebug.zones.getSyncStats(),
            cleanup: this.cleanupManager.getStats()
          };
        }
      }
    };
    
    console.log('✅ Debug mode enabled with advanced zone synchronization tools');
    console.log('🔧 Available commands:');
    console.log('  - window.gameDebug.zones.* - Zone management');
    console.log('  - window.gameDebug.sync.* - Sync system control');
    console.log('  - window.gameDebug.test.* - Testing functions');
  }

  // НОВОЕ: Получить расширенную информацию о состоянии игры
  getExtendedGameInfo() {
    return {
      core: {
        initialized: !!this.gameState,
        active: this.isGameActive(),
        destroyed: this.isDestroyed
      },
      managers: Object.fromEntries(
        Object.entries(this.managers).map(([name, manager]) => [
          name, 
          {
            exists: !!manager,
            active: manager && typeof manager.isActive === 'function' ? manager.isActive() : 'unknown'
          }
        ])
      ),
      gameLoop: {
        exists: !!this.gameLoop,
        running: this.gameLoop ? this.gameLoop.isRunning() : false,
        stats: this.gameLoop ? this.gameLoop.getRenderStats() : null
      },
      zoneSync: {
        monitor: this.zoneSyncMonitor,
        currentState: this.managers.feature ? this.managers.feature.getZonesDebugInfo() : null,
        gameLoopState: this.gameLoop ? this.gameLoop.getZoneSyncInfo() : null
      },
      gameState: {
        targetZone: this.gameState ? this.gameState.targetZone : null,
        combo: this.gameState ? this.gameState.combo : null,
        resources: this.gameState ? Object.keys(this.gameState.resources).length : 0
      }
    };
  }

  // Деструктор
  destroy() {
    console.log('🧹 GameCore cleanup started');
    
    // Останавливаем все процессы
    this.stopAllGameProcesses();
    
    // Вызываем родительский деструктор
    super.destroy();
    
    console.log('✅ GameCore destroyed');
  }
}