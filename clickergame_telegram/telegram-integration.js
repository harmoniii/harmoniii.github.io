class TelegramIntegration {
  constructor() {
    this.tg = null;
    this.user = null;
    this.isReady = false;
    this.isExpanded = false;
    this.themeParams = {};
    this.viewportHeight = window.innerHeight;
    this.gameInstance = null;
    this.isInitialized = false;
    this.initPromise = null;
    this.dataQueue = []; // Очередь для отправки данных
    this.sendingInProgress = false;
    
    console.log('🤖 TelegramIntegration initializing...');
    this.initPromise = this.safeInitialize();
  }

  async safeInitialize() {
    try {
      await this.waitForDOM();
      await this.initialize();
      this.hideLoadingScreen();
    } catch (error) {
      console.error('❌ Telegram Integration failed:', error);
      this.setupFallbackMode();
      this.hideLoadingScreen();
    }
  }

  hideLoadingScreen() {
    try {
      const loadingScreen = document.getElementById('telegram-loading');
      const errorScreen = document.getElementById('telegram-error');
      
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
      }
      if (errorScreen) {
        errorScreen.classList.add('hidden');
      }

      const gameArea = document.getElementById('game-area');
      const uiTop = document.getElementById('ui-top');
      const controlsBottom = document.getElementById('controls-bottom');
      
      if (gameArea) gameArea.style.display = 'flex';
      if (uiTop) uiTop.style.display = 'flex';
      if (controlsBottom) controlsBottom.style.display = 'flex';
      
      console.log('✅ Loading screen hidden, game interface shown');
    } catch (error) {
      console.warn('⚠️ Error hiding loading screen:', error);
    }
  }

  showErrorScreen(message) {
    try {
      const loadingScreen = document.getElementById('telegram-loading');
      const errorScreen = document.getElementById('telegram-error');
      const errorMessage = document.getElementById('error-message');
      
      if (loadingScreen) loadingScreen.classList.add('hidden');
      if (errorScreen) errorScreen.classList.remove('hidden');
      if (errorMessage) errorMessage.textContent = message;
      
      console.error('❌ Showing error screen:', message);
    } catch (error) {
      console.warn('⚠️ Error showing error screen:', error);
    }
  }

  waitForDOM() {
    return new Promise((resolve) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve);
      } else {
        resolve();
      }
    });
  }

  async initialize() {
    try {
      console.log('🔄 Starting Telegram integration...');
      
      const initTimeout = setTimeout(() => {
        console.log('⏰ Telegram initialization timeout, falling back');
        this.setupFallbackMode();
      }, 5000);

      if (this.checkTelegramAvailability()) {
        await this.initializeTelegramWebApp();
        clearTimeout(initTimeout);
      } else {
        clearTimeout(initTimeout);
        console.log('⚠️ Telegram WebApp API not available - using fallback');
        this.setupFallbackMode();
      }

      this.setupGameIntegration();
      this.isInitialized = true;
      
      console.log('✅ Telegram integration completed successfully');
    } catch (error) {
      console.error('❌ Integration initialization failed:', error);
      this.setupFallbackMode();
    }
  }

  checkTelegramAvailability() {
    try {
      const hasTelegramGlobal = typeof window.Telegram !== 'undefined';
      const hasTelegramWebApp = hasTelegramGlobal && window.Telegram.WebApp;
      const isInTelegram = hasTelegramWebApp && window.Telegram.WebApp.initData;
      
      console.log('📱 Telegram availability check:', {
        hasTelegramGlobal,
        hasTelegramWebApp,
        isInTelegram,
        userAgent: navigator.userAgent.includes('Telegram'),
        initData: window.Telegram?.WebApp?.initData ? 'Present' : 'Missing'
      });
      
      return hasTelegramWebApp;
    } catch (error) {
      console.warn('⚠️ Error checking Telegram availability:', error);
      return false;
    }
  }

  async initializeTelegramWebApp() {
    try {
      this.tg = window.Telegram.WebApp;
      
      if (!this.tg) {
        throw new Error('Telegram.WebApp is not available');
      }

      console.log('📱 Telegram WebApp found, initializing...');
      
      // Инициализация WebApp
      this.tg.ready();
      this.isReady = true;

      // Загрузка данных пользователя
      await this.loadUserData();
      
      // Настройка внешнего вида
      this.loadThemeParams();
      this.setupAppearance();
      this.setupEventHandlers();
      this.expandViewport();
      this.applyTheme();
      this.setupButtons();

      console.log('✅ Telegram WebApp initialized successfully');
      console.log('👤 User data:', this.user);
      console.log('🎨 Theme params:', this.themeParams);
    } catch (error) {
      console.error('❌ Failed to initialize Telegram WebApp:', error);
      throw error;
    }
  }

  async loadUserData() {
    try {
      // Получаем данные пользователя из initDataUnsafe
      const initDataUnsafe = this.tg.initDataUnsafe || {};
      this.user = initDataUnsafe.user || null;
      
      console.log('🔍 Raw init data:', {
        hasInitData: !!this.tg.initData,
        hasInitDataUnsafe: !!this.tg.initDataUnsafe,
        hasUser: !!this.user,
        initDataLength: this.tg.initData?.length || 0
      });

      if (!this.user && this.tg.initData) {
        // Попытка парсинга initData вручную
        try {
          const urlParams = new URLSearchParams(this.tg.initData);
          const userParam = urlParams.get('user');
          if (userParam) {
            this.user = JSON.parse(decodeURIComponent(userParam));
            console.log('✅ User data parsed from initData:', this.user);
          }
        } catch (parseError) {
          console.warn('⚠️ Failed to parse user from initData:', parseError);
        }
      }

      if (!this.user) {
        console.log('⚠️ No user data from Telegram, creating fallback');
        this.user = {
          id: Date.now(),
          first_name: 'Telegram User',
          username: 'telegram_user',
          language_code: navigator.language?.substr(0, 2) || 'en',
          is_bot: false,
          is_premium: false
        };
      }

      console.log('👤 User data loaded:', {
        id: this.user.id,
        first_name: this.user.first_name,
        username: this.user.username,
        language_code: this.user.language_code
      });
    } catch (error) {
      console.warn('⚠️ Error loading user data:', error);
      this.user = this.createFallbackUser();
    }
  }

  setupFallbackMode() {
    console.log('🔄 Setting up fallback mode...');
    this.isReady = true;
    this.user = this.createFallbackUser();
    this.themeParams = this.createFallbackTheme();
    this.isInitialized = true;
    this.applyTheme();
    this.setupGameIntegration();
    console.log('✅ Fallback mode initialized');
  }

  createFallbackTheme() {
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDarkMode ? {
      bg_color: '#1a1a1a',
      text_color: '#ffffff',
      hint_color: '#888888',
      link_color: '#64b5f6',
      button_color: '#2481cc',
      button_text_color: '#ffffff',
      secondary_bg_color: '#2a2a2a'
    } : {
      bg_color: '#ffffff',
      text_color: '#000000',
      hint_color: '#999999',
      link_color: '#2481cc',
      button_color: '#2481cc',
      button_text_color: '#ffffff',
      secondary_bg_color: '#f1f1f1'
    };
  }

  async sendDataToBot(data) {
    try {
      if (!this.isReady) {
        console.warn('🤖 Telegram not ready, queueing data');
        this.dataQueue.push(data);
        return false;
      }

      if (!this.tg || !this.tg.sendData) {
        console.warn('🤖 Telegram WebApp sendData not available');
        return false;
      }

      // Добавляем пользователя в данные если его нет
      if (!data.userId && this.user) {
        data.userId = this.user.id;
      }

      // Добавляем метаданные
      data.timestamp = data.timestamp || Date.now();
      data.platform = 'telegram_webapp';

      const jsonData = JSON.stringify(data);
      const maxSize = 4000;

      console.log(`📤 Sending data to bot: ${data.type}, size: ${jsonData.length} bytes`);

      if (jsonData.length > maxSize) {
        console.warn('📦 Data too large for Telegram, splitting...');
        const chunks = this.splitData(jsonData, 3500);
        
        for (let i = 0; i < chunks.length; i++) {
          const chunkData = {
            type: 'data_chunk',
            userId: this.user?.id,
            chunk_index: i,
            total_chunks: chunks.length,
            chunk_id: `${Date.now()}_${i}`,
            data: chunks[i],
            original_type: data.type,
            timestamp: Date.now()
          };
          
          this.tg.sendData(JSON.stringify(chunkData));
          
          // Небольшая задержка между чанками
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      } else {
        this.tg.sendData(jsonData);
      }

      console.log('📤 Data sent to bot successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to send data to bot:', error);
      return false;
    }
  }

  async processDataQueue() {
    if (this.sendingInProgress || this.dataQueue.length === 0) return;

    this.sendingInProgress = true;
    console.log(`📤 Processing ${this.dataQueue.length} queued data items`);

    while (this.dataQueue.length > 0) {
      const data = this.dataQueue.shift();
      try {
        await this.sendDataToBot(data);
        await new Promise(resolve => setTimeout(resolve, 200)); // Задержка между отправками
      } catch (error) {
        console.error('❌ Error processing queued data:', error);
      }
    }

    this.sendingInProgress = false;
  }

  splitData(jsonString, chunkSize) {
    const chunks = [];
    for (let i = 0; i < jsonString.length; i += chunkSize) {
      chunks.push(jsonString.substring(i, i + chunkSize));
    }
    return chunks;
  }

  async sendGameStatistics(gameData) {
    if (!gameData && this.gameInstance?.gameState) {
      gameData = this.gameInstance.gameState.getSaveData();
    }

    if (!gameData) {
      console.warn('📊 No game data available for statistics');
      return false;
    }

    const statsData = {
      type: 'game_statistics',
      userId: this.user?.id,
      timestamp: Date.now(),
      stats: this.calculateDetailedStats(gameData)
    };

    return await this.sendDataToBot(statsData);
  }

  calculateDetailedStats(gameData) {
    try {
      const resources = gameData.resources || {};
      const buildings = gameData.buildings || {};
      const skills = gameData.skills || {};
      const achievements = gameData.achievements || {};
      const raids = gameData.raids || {};
      const energy = gameData.energy || {};
      const market = gameData.market || {};

      // Подсчитываем общие значения
      const totalResources = Object.values(resources).reduce((sum, val) => sum + (val || 0), 0);
      const buildingLevels = Object.values(buildings).reduce((sum, building) => sum + (building.level || 0), 0);
      const skillLevels = Object.values(skills).reduce((sum, skill) => sum + (skill.level || 0), 0);
      const achievementsCount = achievements.completed ? 
        (Array.isArray(achievements.completed) ? achievements.completed.length : 
         (achievements.completed.size || Object.keys(achievements.completed).length)) : 0;

      return {
        // Основные ресурсы
        totalResources,
        gold: resources.gold || 0,
        wood: resources.wood || 0,
        stone: resources.stone || 0,
        food: resources.food || 0,
        water: resources.water || 0,
        iron: resources.iron || 0,
        people: resources.people || 0,
        science: resources.science || 0,
        faith: resources.faith || 0,
        chaos: resources.chaos || 0,
        
        // Игровой прогресс
        skillPoints: gameData.skillPoints || 0,
        maxCombo: gameData.combo?.count || 0,
        totalClicks: achievements.statistics?.totalClicks || 0,
        
        // Здания и навыки
        buildingLevels,
        skillLevels,
        totalBuildings: Object.values(buildings).filter(b => (b.level || 0) > 0).length,
        totalSkills: Object.values(skills).filter(s => (s.level || 0) > 0).length,
        
        // Рейды
        raidsCompleted: raids.statistics?.totalRaids || 0,
        successfulRaids: raids.statistics?.successfulRaids || 0,
        peopleLost: raids.statistics?.peopleLost || 0,
        raidSystemUnlocked: !!(buildings.watchTower?.level),
        
        // Достижения
        achievementsCount,
        
        // Энергия
        currentEnergy: energy.current || 0,
        maxEnergy: energy.max || 100,
        totalEnergyConsumed: energy.totalConsumed || 0,
        totalEnergyRegenerated: energy.totalRegenerated || 0,
        
        // Рынок
        marketReputation: market.reputation || 0,
        marketPurchases: market.purchaseHistory?.length || 0,
        
        // Эффекты
        activeBuffs: (gameData.buffs || []).length,
        activeDebuffs: (gameData.debuffs || []).length,
        
        // Время игры (приблизительная оценка на основе прогресса)
        playtimeEstimate: Math.max(1, Math.floor((totalResources + buildingLevels * 100 + skillLevels * 200) / 100)),
        
        // Метаданные
        lastPlayTime: Date.now(),
        gameVersion: gameData.gameVersion || gameData.saveVersion || '1.0.10',
        saveCount: (gameData._saveCount || 0) + 1
      };
    } catch (error) {
      console.error('📊 Error calculating stats:', error);
      return {
        error: 'Failed to calculate statistics',
        timestamp: Date.now()
      };
    }
  }

  async sendSaveData(saveData) {
    const cloudSaveData = {
      type: 'cloud_save',
      userId: this.user?.id,
      userInfo: {
        firstName: this.user?.first_name || 'Unknown',
        username: this.user?.username || null,
        languageCode: this.user?.language_code || 'en',
        isPremium: this.user?.is_premium || false
      },
      saveData: saveData,
      gameStatistics: this.calculateDetailedStats(saveData),
      timestamp: Date.now(),
      version: saveData.saveVersion || saveData.gameVersion || '1.0.10',
      platform: 'telegram_webapp',
      cloudSaveVersion: '1.2'
    };

    return await this.sendDataToBot(cloudSaveData);
  }

  async requestLeaderboard(category = 'total_resources') {
    const requestData = {
      type: 'leaderboard_request',
      userId: this.user?.id,
      category: category,
      timestamp: Date.now()
    };
    
    return await this.sendDataToBot(requestData);
  }

  loadThemeParams() {
    try {
      this.themeParams = this.tg?.themeParams || {};
      
      if (Object.keys(this.themeParams).length === 0) {
        this.themeParams = this.createFallbackTheme();
      }
      
      console.log('🎨 Theme params loaded:', this.themeParams);
    } catch (error) {
      console.warn('⚠️ Error loading theme params:', error);
      this.themeParams = this.createFallbackTheme();
    }
  }

  setupAppearance() {
    if (!this.tg) return;
    
    try {
      if (this.tg.setHeaderColor) {
        this.tg.setHeaderColor('secondary_bg_color');
      }
      
      if (this.tg.setBackgroundColor) {
        this.tg.setBackgroundColor(this.themeParams.bg_color || '#ffffff');
      }
      
      console.log('🎨 Appearance configured');
    } catch (error) {
      console.warn('⚠️ Error configuring appearance:', error);
    }
  }

  setupEventHandlers() {
    if (!this.tg || !this.tg.onEvent) return;
    
    try {
      this.tg.onEvent('viewportChanged', () => {
        this.handleViewportChange();
      });

      this.tg.onEvent('themeChanged', () => {
        this.handleThemeChange();
      });

      this.tg.onEvent('backButtonClicked', () => {
        this.handleBackButton();
      });

      this.tg.onEvent('mainButtonClicked', () => {
        this.handleMainButton();
      });

      console.log('📡 Event handlers configured');
    } catch (error) {
      console.warn('⚠️ Error setting up event handlers:', error);
    }
  }

  expandViewport() {
    if (!this.tg) return;
    
    try {
      if (this.tg.expand) {
        this.tg.expand();
        this.isExpanded = true;
        console.log('📱 Viewport expanded');
      }
      
      if (this.tg.enableClosingConfirmation) {
        this.tg.enableClosingConfirmation();
        console.log('🔒 Closing confirmation enabled');
      }
    } catch (error) {
      console.warn('⚠️ Error expanding viewport:', error);
    }
  }

  applyTheme() {
    try {
      const root = document.documentElement;
      
      Object.entries(this.themeParams).forEach(([key, value]) => {
        if (value) {
          root.style.setProperty(`--tg-theme-${key.replace(/_/g, '-')}`, value);
        }
      });
      
      root.style.setProperty('--tg-viewport-height', `${this.viewportHeight}px`);
      
      console.log('🎨 Theme applied to CSS variables');
    } catch (error) {
      console.warn('⚠️ Error applying theme:', error);
    }
  }

  setupGameIntegration() {
    try {
      this.waitForGame().then(() => {
        this.integrateWithGame();
        this.processDataQueue(); // Обрабатываем очередь после готовности
      });
      
      this.dispatchReadyEvent();
      
      // Глобальные переменные
      window.telegramIntegration = this;
      window.telegramWebApp = this;
      
      console.log('🎮 Game integration setup completed');
    } catch (error) {
      console.warn('⚠️ Error setting up game integration:', error);
    }
  }

  async waitForGame() {
    return new Promise((resolve) => {
      const checkGame = () => {
        if (window.gameCore) {
          this.gameInstance = window.gameCore;
          resolve();
        } else {
          setTimeout(checkGame, 100);
        }
      };
      checkGame();
    });
  }

  integrateWithGame() {
    try {
      if (!this.gameInstance) return;
      
      console.log('🔗 Integrating with game instance...');

      // Подписываемся на события игры
      if (window.eventBus) {
        window.eventBus.subscribe('game:save', () => {
          this.onGameSave();
        });

        window.eventBus.subscribe('achievement:unlocked', (data) => {
          this.onAchievementUnlocked(data);
        });

        window.eventBus.subscribe('raid:completed', (data) => {
          this.onRaidCompleted(data);
        });

        window.eventBus.subscribe('building:bought', () => {
          this.sendGameStatisticsIfNeeded();
        });

        window.eventBus.subscribe('skill:bought', () => {
          this.sendGameStatisticsIfNeeded();
        });

        window.eventBus.subscribe('item:purchased', () => {
          this.sendGameStatisticsIfNeeded();
        });
      }

      this.setupAutoStatsSending();
      
      console.log('✅ Game integration completed');
    } catch (error) {
      console.warn('⚠️ Error integrating with game:', error);
    }
  }

  setupAutoStatsSending() {
    // Отправляем статистику каждые 5 минут
    setInterval(() => {
      this.sendGameStatisticsIfNeeded();
    }, 5 * 60 * 1000);

    // Отправляем при закрытии страницы
    window.addEventListener('beforeunload', () => {
      this.sendGameStatisticsIfNeeded();
    });

    // Отправляем при потере фокуса (переключение вкладок)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.sendGameStatisticsIfNeeded();
      }
    });
  }

  async sendGameStatisticsIfNeeded() {
    try {
      if (!this.gameInstance?.gameState) return;
      
      const gameData = this.gameInstance.gameState.getSaveData();
      if (gameData) {
        await this.sendGameStatistics(gameData);
      }
    } catch (error) {
      console.warn('⚠️ Error sending game statistics:', error);
    }
  }

  onGameSave() {
    try {
      if (this.tg?.HapticFeedback) {
        this.tg.HapticFeedback.notificationOccurred('success');
      }
      this.sendGameStatisticsIfNeeded();
    } catch (error) {
      console.warn('⚠️ Error handling game save:', error);
    }
  }

  async onAchievementUnlocked(data) {
    try {
      const achievementData = {
        type: 'achievement_unlocked',
        userId: this.user?.id,
        achievementId: data.achievement?.id,
        achievementName: data.achievement?.name,
        achievementDescription: data.achievement?.description,
        timestamp: Date.now()
      };

      await this.sendDataToBot(achievementData);
      
      if (this.tg?.HapticFeedback) {
        this.tg.HapticFeedback.notificationOccurred('success');
      }
    } catch (error) {
      console.error('❌ Error sending achievement data:', error);
    }
  }

  async onRaidCompleted(data) {
    try {
      const raidData = {
        type: 'raid_completed',
        userId: this.user?.id,
        raid: data.raid,
        result: data.result,
        startTime: data.startTime,
        timestamp: Date.now()
      };

      await this.sendDataToBot(raidData);
    } catch (error) {
      console.error('❌ Error sending raid completion data:', error);
    }
  }

  dispatchReadyEvent() {
    try {
      const event = new CustomEvent('telegramWebAppReady', {
        detail: {
          user: this.user,
          themeParams: this.themeParams,
          isExpanded: this.isExpanded,
          isInTelegram: !!this.tg
        }
      });
      
      window.dispatchEvent(event);
      console.log('📡 Ready event dispatched');
    } catch (error) {
      console.warn('⚠️ Error dispatching ready event:', error);
    }
  }

  handleViewportChange() {
    try {
      if (!this.tg) return;
      
      const newHeight = this.tg.viewportHeight || window.innerHeight;
      const heightChanged = Math.abs(newHeight - this.viewportHeight) > 50;
      
      if (heightChanged) {
        this.viewportHeight = newHeight;
        console.log('📱 Viewport changed:', newHeight);
        
        document.documentElement.style.setProperty('--tg-viewport-height', `${newHeight}px`);
        
        if (this.gameInstance && typeof this.gameInstance.handleViewportChange === 'function') {
          this.gameInstance.handleViewportChange(newHeight);
        }
      }
    } catch (error) {
      console.warn('⚠️ Error handling viewport change:', error);
    }
  }

  handleThemeChange() {
    try {
      if (!this.tg) return;
      
      this.themeParams = this.tg.themeParams || this.themeParams;
      this.applyTheme();
      
      console.log('🎨 Theme changed and applied');
    } catch (error) {
      console.warn('⚠️ Error handling theme change:', error);
    }
  }

  setupButtons() {
    if (!this.tg) return;
    
    try {
      if (this.tg.MainButton) {
        this.tg.MainButton.setText('💾 Save Game');
        this.tg.MainButton.hide();
      }
      
      if (this.tg.BackButton) {
        this.tg.BackButton.hide();
      }
      
      console.log('🔵 Buttons configured');
    } catch (error) {
      console.warn('⚠️ Error setting up buttons:', error);
    }
  }

  handleBackButton() {
    try {
      console.log('🔙 Back button pressed');
      
      if (this.gameInstance?.managers?.ui) {
        const uiManager = this.gameInstance.managers.ui;
        if (uiManager.isPanelOpen && uiManager.isPanelOpen()) {
          uiManager.hidePanel();
          this.hideBackButton();
          return;
        }
      }
      
      this.showExitConfirmation();
    } catch (error) {
      console.warn('⚠️ Error handling back button:', error);
    }
  }

  handleMainButton() {
    try {
      console.log('⚡ Main button pressed');
      
      if (this.gameInstance && typeof this.gameInstance.autoSave === 'function') {
        const saveResult = this.gameInstance.autoSave();
        if (saveResult) {
          this.showAlert('💾 Game saved successfully!');
          this.sendGameStatisticsIfNeeded();
        } else {
          this.showAlert('❌ Save failed. Try again.');
        }
      }
    } catch (error) {
      console.warn('⚠️ Error handling main button:', error);
    }
  }

  // Методы для управления кнопками
  setMainButton(text, color = null) {
    try {
      if (!this.tg?.MainButton) return;
      
      this.tg.MainButton.setText(text);
      if (color) {
        this.tg.MainButton.setParams({ color: color });
      }
      this.tg.MainButton.show();
      
      console.log('🔵 Main button updated:', text);
    } catch (error) {
      console.warn('⚠️ Error setting main button:', error);
    }
  }

  hideMainButton() {
    try {
      if (this.tg?.MainButton) {
        this.tg.MainButton.hide();
      }
    } catch (error) {
      console.warn('⚠️ Error hiding main button:', error);
    }
  }

  showBackButton() {
    try {
      if (this.tg?.BackButton) {
        this.tg.BackButton.show();
      }
    } catch (error) {
      console.warn('⚠️ Error showing back button:', error);
    }
  }

  hideBackButton() {
    try {
      if (this.tg?.BackButton) {
        this.tg.BackButton.hide();
      }
    } catch (error) {
      console.warn('⚠️ Error hiding back button:', error);
    }
  }

  // Методы для отображения диалогов
  showAlert(message) {
    try {
      if (this.tg?.showAlert) {
        this.tg.showAlert(message);
      } else {
        alert(message);
      }
    } catch (error) {
      console.warn('⚠️ Error showing alert:', error);
    }
  }

  showConfirm(message, callback) {
    try {
      if (this.tg?.showConfirm) {
        this.tg.showConfirm(message, callback);
      } else {
        const result = confirm(message);
        if (callback) callback(result);
      }
    } catch (error) {
      console.warn('⚠️ Error showing confirm:', error);
      if (callback) callback(false);
    }
  }

  showExitConfirmation() {
    this.showConfirm('Exit the game? 🎮', (confirmed) => {
      if (confirmed) {
        this.close();
      }
    });
  }

  close() {
    try {
      if (this.tg?.close) {
        this.tg.close();
      } else {
        window.close();
      }
    } catch (error) {
      console.warn('⚠️ Error closing app:', error);
    }
  }

  // Геттеры для удобного доступа
  get isInTelegram() {
    return !!this.tg;
  }

  get userId() {
    return this.user?.id || null;
  }

  get userName() {
    return this.user?.first_name || 'Player';
  }

  get userLanguage() {
    return this.user?.language_code || 'en';
  }

  get initData() {
    return this.tg?.initData || '';
  }

  // Отладочная информация
  getDebugInfo() {
    return {
      isReady: this.isReady,
      isInitialized: this.isInitialized,
      isInTelegram: this.isInTelegram,
      isExpanded: this.isExpanded,
      user: this.user,
      themeParams: this.themeParams,
      viewportHeight: this.viewportHeight,
      gameInstance: !!this.gameInstance,
      telegramVersion: this.tg?.version || 'N/A',
      hasInitData: !!this.tg?.initData,
      initDataLength: this.tg?.initData?.length || 0,
      queuedItems: this.dataQueue.length,
      sendingInProgress: this.sendingInProgress
    };
  }
}

// Инициализация
let telegramIntegrationInstance = null;

function initTelegramIntegration() {
  try {
    if (!telegramIntegrationInstance) {
      telegramIntegrationInstance = new TelegramIntegration();
    }
    return telegramIntegrationInstance;
  } catch (error) {
    console.error('❌ Failed to initialize Telegram integration:', error);
    return null;
  }
}

// Автоматическая инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
  initTelegramIntegration();
});

// Экспорт для глобального использования
window.TelegramIntegration = TelegramIntegration;
window.initTelegramIntegration = initTelegramIntegration;
window.getTelegramDebug = () => {
  return telegramIntegrationInstance?.getDebugInfo() || 'Not initialized';
};

console.log('📱 Telegram Integration script loaded');

// Экспорт для глобального доступа
window.telegramIntegration = telegramIntegrationInstance;

// Совместимость с существующим кодом
if (typeof module !== 'undefined' && module.exports) {
 module.exports = TelegramIntegration;
}

// Дополнительные утилиты для разработки
window.debugTelegram = () => {
 if (telegramIntegrationInstance) {
   console.log('🔍 Telegram Integration Debug Info:', telegramIntegrationInstance.getDebugInfo());
   return telegramIntegrationInstance.getDebugInfo();
 } else {
   console.log('❌ Telegram integration not initialized');
   return null;
 }
};

// Тестовые функции для разработки
window.testTelegramSend = async (testData = null) => {
 if (!telegramIntegrationInstance) {
   console.error('❌ Telegram integration not available');
   return false;
 }

 const data = testData || {
   type: 'test_message',
   message: 'Test from game',
   timestamp: Date.now()
 };

 try {
   const result = await telegramIntegrationInstance.sendDataToBot(data);
   console.log('📤 Test send result:', result);
   return result;
 } catch (error) {
   console.error('❌ Test send failed:', error);
   return false;
 }
};

// Проверка готовности для других модулей
window.isTelegramReady = () => {
 return telegramIntegrationInstance?.isReady || false;
};

// Событие для уведомления о готовности
window.addEventListener('load', () => {
 if (telegramIntegrationInstance && !telegramIntegrationInstance.isInitialized) {
   telegramIntegrationInstance.initPromise?.then(() => {
     console.log('✅ Telegram integration fully loaded and ready');
     
     // Отправка события готовности
     const readyEvent = new CustomEvent('telegramIntegrationComplete', {
       detail: {
         integration: telegramIntegrationInstance,
         isReady: telegramIntegrationInstance.isReady,
         user: telegramIntegrationInstance.user
       }
     });
     
     window.dispatchEvent(readyEvent);
   }).catch(error => {
     console.error('❌ Telegram integration initialization failed:', error);
   });
 }
});

// Обработка ошибок для надежности
window.addEventListener('error', (event) => {
 if (telegramIntegrationInstance && event.filename?.includes('telegram')) {
   console.error('❌ Telegram integration error:', event.error);
   
   // Попытка отправить отчет об ошибке
   if (telegramIntegrationInstance.isReady) {
     telegramIntegrationInstance.sendDataToBot({
       type: 'error_report',
       error: {
         message: event.error?.message || 'Unknown error',
         filename: event.filename,
         lineno: event.lineno,
         timestamp: Date.now()
       }
     }).catch(sendError => {
       console.error('❌ Failed to send error report:', sendError);
     });
   }
 }
});

// Graceful cleanup при закрытии
window.addEventListener('beforeunload', () => {
 if (telegramIntegrationInstance) {
   try {
     // Последняя отправка статистики
     telegramIntegrationInstance.sendGameStatisticsIfNeeded();
     
     // Очистка ресурсов
     telegramIntegrationInstance.cleanup?.();
   } catch (error) {
     console.warn('⚠️ Error during cleanup:', error);
   }
 }
});

console.log('🚀 Telegram Integration script fully initialized');