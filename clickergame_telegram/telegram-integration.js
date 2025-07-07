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
    this.dataQueue = [];
    this.sendingInProgress = false;
    this.saveAttempts = new Map();
    this.maxRetries = 3;
    this.lastStatsSent = 0;
    this.statsInterval = 60000; // 1 минута между отправками статистики
    
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

  async sendDataToBot(data) {
    const attemptId = `${data.type}_${Date.now()}`;
    try {
      // Добавляем обязательные поля
      data.attemptId = attemptId;
      data.timestamp = data.timestamp || Date.now();
      data.platform = 'telegram_webapp';
      data.clientVersion = '1.0.10';
      
      // Добавляем user ID если его нет
      if (!data.userId && this.user) {
        data.userId = this.user.id;
      }

      console.log(`📤 Preparing to send data: ${data.type}`);
      console.log(`📊 Data preview:`, {
        type: data.type,
        userId: data.userId,
        hasStats: !!data.stats,
        hasSaveData: !!data.saveData,
        timestamp: data.timestamp
      });

      if (!this.validateClientData(data)) {
        console.error('❌ Client-side validation failed');
        return false;
      }

      const cleanData = this.cleanClientData(data);
      const jsonData = JSON.stringify(cleanData);
      
      console.log(`📤 Sending data: ${data.type}, size: ${jsonData.length} bytes`);

      if (!this.tg?.sendData) {
        console.warn('🤖 Telegram WebApp sendData not available, falling back to queue');
        this.dataQueue.push(data);
        return false;
      }

      // Проверяем размер данных
      if (jsonData.length > 4000) {
        console.warn('📦 Data too large for Telegram, compressing...');
        const compressedData = this.compressData(cleanData);
        const compressedJson = JSON.stringify(compressedData);
        
        if (compressedJson.length > 4000) {
          console.error('❌ Data still too large after compression');
          return false;
        }
        
        this.tg.sendData(compressedJson);
      } else {
        this.tg.sendData(jsonData);
      }

      this.saveAttempts.set(attemptId, {
        type: data.type,
        timestamp: Date.now(),
        status: 'sent'
      });

      console.log('✅ Data sent successfully to Telegram bot');
      return true;

    } catch (error) {
      console.error('❌ Failed to send data:', error);
      
      // Для критических данных пытаемся повторить отправку
      if (this.isCriticalData(data) && this.shouldRetry(attemptId)) {
        console.log('🔄 Retrying critical data send...');
        setTimeout(() => {
          this.sendDataToBot(data);
        }, 2000);
      }
      
      return false;
    }
  }

  validateClientData(data) {
    if (!data.type) {
      console.error('❌ Missing data type');
      return false;
    }

    if (!data.userId) {
      console.error('❌ Missing user ID');
      return false;
    }

    const jsonStr = JSON.stringify(data);
    if (jsonStr.length > 4000) {
      console.warn('⚠️ Data too large for single send');
      // Не блокируем отправку, попробуем сжать
    }

    switch (data.type) {
      case 'cloud_save':
        return this.validateSaveData(data.saveData);
      case 'game_statistics':
        return this.validateStatsData(data.stats);
      default:
        return true;
    }
  }

  validateSaveData(saveData) {
    if (!saveData || typeof saveData !== 'object') {
      console.error('❌ Invalid saveData structure');
      return false;
    }

    const requiredFields = ['resources', 'combo', 'skillPoints'];
    for (const field of requiredFields) {
      if (!(field in saveData)) {
        console.error(`❌ Missing required field: ${field}`);
        return false;
      }
    }

    console.log('✅ Save data validation passed');
    return true;
  }

  validateStatsData(stats) {
    if (!stats || typeof stats !== 'object') {
      console.error('❌ Invalid stats structure');
      return false;
    }

    // Проверяем основные поля статистики
    const numericFields = ['totalResources', 'maxCombo', 'totalClicks'];
    for (const field of numericFields) {
      if (field in stats) {
        const value = stats[field];
        if (typeof value !== 'number' || isNaN(value) || value < 0) {
          console.error(`❌ Invalid ${field}: ${value}`);
          return false;
        }
      }
    }

    console.log('✅ Stats data validation passed');
    return true;
  }

  cleanClientData(data) {
    function clean(obj) {
      if (obj === null || obj === undefined) {
        return null;
      }
      if (typeof obj === 'function') {
        return null;
      }
      if (obj instanceof Set) {
        return Array.from(obj);
      }
      if (obj instanceof Map) {
        return Object.fromEntries(obj);
      }
      if (Array.isArray(obj)) {
        return obj.map(clean).filter(item => item !== null);
      }
      if (typeof obj === 'object') {
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
          const cleanedValue = clean(value);
          if (cleanedValue !== null && key !== 'undefined') {
            cleaned[key] = cleanedValue;
          }
        }
        return cleaned;
      }
      return obj;
    }

    return clean(data);
  }

  compressData(data) {
    const compressed = { ...data };
    
    if (compressed.saveData) {
      // Удаляем неважные поля для экономии места
      if (compressed.saveData.market?.purchaseHistory) {
        compressed.saveData.market.purchaseHistory = compressed.saveData.market.purchaseHistory.slice(-5);
      }
      if (compressed.saveData.raids?.completed) {
        compressed.saveData.raids.completed = compressed.saveData.raids.completed.slice(-3);
      }
      // Сбрасываем временные эффекты
      compressed.saveData.buffs = [];
      compressed.saveData.debuffs = [];
      compressed.saveData.blockedUntil = 0;
    }
    
    compressed.compressed = true;
    return compressed;
  }

  isCriticalData(data) {
    return ['cloud_save', 'achievement_unlocked', 'raid_completed'].includes(data.type);
  }

  shouldRetry(attemptId) {
    const attempt = this.saveAttempts.get(attemptId);
    if (!attempt) return true;
    
    attempt.retries = (attempt.retries || 0) + 1;
    return attempt.retries < this.maxRetries;
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

      // Показываем игровой интерфейс
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
      
      this.tg.ready();
      this.isReady = true;
      
      await this.loadUserData();
      this.loadThemeParams();
      this.setupAppearance();
      this.setupEventHandlers();
      this.expandViewport();
      this.applyTheme();
      
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
      const initDataUnsafe = this.tg.initDataUnsafe || {};
      this.user = initDataUnsafe.user || null;
      
      console.log('🔍 Raw init data:', {
        hasInitData: !!this.tg.initData,
        hasInitDataUnsafe: !!this.tg.initDataUnsafe,
        hasUser: !!this.user,
        initDataLength: this.tg.initData?.length || 0
      });

      // Если пользователь не найден, пытаемся парсить из initData
      if (!this.user && this.tg.initData) {
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

      // Создаем fallback пользователя если необходимо
      if (!this.user) {
        console.log('⚠️ No user data from Telegram, creating fallback');
        this.user = this.createFallbackUser();
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

  createFallbackUser() {
    return {
      id: Date.now(), // Используем timestamp как ID
      first_name: 'Telegram User',
      username: 'telegram_user',
      language_code: navigator.language?.substr(0, 2) || 'en',
      is_bot: false,
      is_premium: false
    };
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
    const isDarkMode = window.matchMedia && 
                      window.matchMedia('(prefers-color-scheme: dark)').matches;
    
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
        this.processDataQueue();
      });
      
      this.dispatchReadyEvent();
      
      // Регистрируем глобальные объекты
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
        
        // События для отправки статистики
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
    }, this.statsInterval);
    
    // Отправляем при скрытии/закрытии страницы
    window.addEventListener('beforeunload', () => {
      this.sendGameStatisticsIfNeeded();
    });
    
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.sendGameStatisticsIfNeeded();
      }
    });
  }

  async sendGameStatisticsIfNeeded() {
    try {
      const now = Date.now();
      
      // Не отправляем слишком часто
      if (now - this.lastStatsSent < 30000) { // 30 секунд минимум
        return;
      }
      
      if (!this.gameInstance?.gameState) return;
      
      const gameData = this.gameInstance.gameState.getSaveData();
      if (gameData) {
        const success = await this.sendGameStatistics(gameData);
        if (success) {
          this.lastStatsSent = now;
        }
      }
    } catch (error) {
      console.warn('⚠️ Error sending game statistics:', error);
    }
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

    console.log('📊 Sending game statistics:', {
      type: statsData.type,
      userId: statsData.userId,
      totalResources: statsData.stats.totalResources,
      maxCombo: statsData.stats.maxCombo
    });

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

      // Подсчитываем общие ресурсы
      const totalResources = Object.values(resources).reduce((sum, val) => sum + (val || 0), 0);
      
      // Подсчитываем уровни зданий
      const buildingLevels = Object.values(buildings).reduce((sum, building) => 
        sum + (building.level || 0), 0);
      
      // Подсчитываем уровни навыков
      const skillLevels = Object.values(skills).reduce((sum, skill) => 
        sum + (skill.level || 0), 0);
      
      // Подсчитываем достижения
      const achievementsCount = achievements.completed ? 
        (Array.isArray(achievements.completed) ? achievements.completed.length :
         (achievements.completed.size || Object.keys(achievements.completed).length)) : 0;

      const stats = {
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
        skillPoints: gameData.skillPoints || 0,
        maxCombo: gameData.combo?.count || 0,
        totalClicks: achievements.statistics?.totalClicks || 0,
        buildingLevels,
        skillLevels,
        totalBuildings: Object.values(buildings).filter(b => (b.level || 0) > 0).length,
        totalSkills: Object.values(skills).filter(s => (s.level || 0) > 0).length,
        raidsCompleted: raids.statistics?.totalRaids || 0,
        successfulRaids: raids.statistics?.successfulRaids || 0,
        peopleLost: raids.statistics?.peopleLost || 0,
        raidSystemUnlocked: !!(buildings.watchTower?.level),
        achievementsCount,
        currentEnergy: energy.current || 0,
        maxEnergy: energy.max || 100,
        totalEnergyConsumed: energy.totalConsumed || 0,
        totalEnergyRegenerated: energy.totalRegenerated || 0,
        marketReputation: market.reputation || 0,
        marketPurchases: market.purchaseHistory?.length || 0,
        activeBuffs: (gameData.buffs || []).length,
        activeDebuffs: (gameData.debuffs || []).length,
        playtimeEstimate: Math.max(1, Math.floor((totalResources + buildingLevels * 100 + skillLevels * 200) / 100)),
        lastPlayTime: Date.now(),
        gameVersion: gameData.gameVersion || gameData.saveVersion || '1.0.10',
        saveCount: (gameData._saveCount || 0) + 1
      };

      console.log('📊 Calculated stats:', {
        totalResources: stats.totalResources,
        maxCombo: stats.maxCombo,
        totalClicks: stats.totalClicks,
        buildingLevels: stats.buildingLevels,
        skillLevels: stats.skillLevels
      });

      return stats;
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

    console.log('💾 Sending save data:', {
      type: cloudSaveData.type,
      userId: cloudSaveData.userId,
      version: cloudSaveData.version,
      saveDataSize: JSON.stringify(saveData).length
    });

    return await this.sendDataToBot(cloudSaveData);
  }

  async processDataQueue() {
    if (this.sendingInProgress || this.dataQueue.length === 0) return;
    
    this.sendingInProgress = true;
    console.log(`📤 Processing ${this.dataQueue.length} queued data items`);
    
    while (this.dataQueue.length > 0) {
      const data = this.dataQueue.shift();
      try {
        await this.sendDataToBot(data);
        await new Promise(resolve => setTimeout(resolve, 200)); // Небольшая задержка
      } catch (error) {
        console.error('❌ Error processing queued data:', error);
      }
    }
    
    this.sendingInProgress = false;
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

      console.log('🏆 Achievement unlocked:', achievementData);
      
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

      console.log('⚔️ Raid completed:', raidData);
      
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
      
      // Также отправляем событие для совместимости
      const completeEvent = new CustomEvent('telegramIntegrationComplete', {
        detail: {
          integration: this,
          isReady: this.isReady,
          user: this.user
        }
      });
      
      window.dispatchEvent(completeEvent);
      
      console.log('📡 Ready events dispatched');
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

  // Геттеры для удобного доступа к данным
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
      sendingInProgress: this.sendingInProgress,
      lastStatsSent: this.lastStatsSent,
      saveAttempts: this.saveAttempts.size
    };
  }

  // Методы для тестирования
  async testSend() {
    const testData = {
      type: 'test_message',
      message: 'Test from game client',
      timestamp: Date.now()
    };
    
    console.log('🧪 Sending test data...');
    return await this.sendDataToBot(testData);
  }

  async forceSendStats() {
    console.log('🔄 Force sending statistics...');
    this.lastStatsSent = 0; // Сбрасываем ограничение
    return await this.sendGameStatisticsIfNeeded();
  }
}

// Глобальная инициализация
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

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
  console.log('📱 DOM loaded, initializing Telegram integration...');
  initTelegramIntegration();
});

// Экспорт для использования
window.TelegramIntegration = TelegramIntegration;
window.initTelegramIntegration = initTelegramIntegration;

// Отладочные функции
window.getTelegramDebug = () => {
  return telegramIntegrationInstance?.getDebugInfo() || 'Not initialized';
};

window.debugTelegram = () => {
  if (telegramIntegrationInstance) {
    console.log('🔍 Telegram Integration Debug Info:', telegramIntegrationInstance.getDebugInfo());
    return telegramIntegrationInstance.getDebugInfo();
  } else {
    console.log('❌ Telegram integration not initialized');
    return null;
  }
};

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

window.forceSendTelegramStats = async () => {
  if (!telegramIntegrationInstance) {
    console.error('❌ Telegram integration not available');
    return false;
  }
  
  try {
    const result = await telegramIntegrationInstance.forceSendStats();
    console.log('📊 Force stats result:', result);
    return result;
  } catch (error) {
    console.error('❌ Force stats failed:', error);
    return false;
  }
};

window.isTelegramReady = () => {
  return telegramIntegrationInstance?.isReady || false;
};

// Обработка загрузки страницы
window.addEventListener('load', () => {
  if (telegramIntegrationInstance && !telegramIntegrationInstance.isInitialized) {
    telegramIntegrationInstance.initPromise?.then(() => {
      console.log('✅ Telegram integration fully loaded and ready');
      
      // Устанавливаем глобальную ссылку
      window.telegramIntegration = telegramIntegrationInstance;
      
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

// Обработка ошибок
window.addEventListener('error', (event) => {
  if (telegramIntegrationInstance && event.filename?.includes('telegram')) {
    console.error('❌ Telegram integration error:', event.error);
    
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

// Очистка при выгрузке страницы
window.addEventListener('beforeunload', () => {
  if (telegramIntegrationInstance) {
    try {
      telegramIntegrationInstance.sendGameStatisticsIfNeeded();
      telegramIntegrationInstance.cleanup?.();
    } catch (error) {
      console.warn('⚠️ Error during cleanup:', error);
    }
  }
});

console.log('🚀 Telegram Integration script fully initialized');

// Экспорт для модульных систем
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TelegramIntegration;
}