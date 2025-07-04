// telegram-integration.js - исправленная версия
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
    
    console.log('🤖 TelegramIntegration initializing...');
    this.initPromise = this.safeInitialize();
  }

  async safeInitialize() {
    try {
      await this.waitForDOM();
      await this.initialize();
      this.hideLoadingScreen(); // Убираем экран загрузки
    } catch (error) {
      console.error('❌ Telegram Integration failed:', error);
      this.setupFallbackMode();
      this.hideLoadingScreen(); // Убираем экран загрузки даже при ошибке
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
      
      // Показываем основной интерфейс игры
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
      
      // Устанавливаем таймаут для инициализации
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
        userAgent: navigator.userAgent.includes('Telegram')
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
      
      // Инициализируем WebApp
      this.tg.ready();
      this.isReady = true;

      await this.loadUserData();
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
      this.user = this.tg.initDataUnsafe?.user || null;
      
      if (!this.user) {
        console.log('⚠️ No user data from Telegram, creating fallback');
        this.user = {
          id: Date.now(),
          first_name: 'Telegram User',
          username: 'telegram_user',
          language_code: this.tg.initDataUnsafe?.user?.language_code || 'en',
          is_bot: false
        };
      }
      
      console.log('👤 User data loaded:', this.user);
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

  createFallbackUser() {
    return {
      id: Date.now(),
      first_name: 'Player',
      username: 'player_' + Math.random().toString(36).substr(2, 5),
      language_code: navigator.language?.substr(0, 2) || 'en',
      is_bot: false
    };
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

  // Новый метод для отправки данных на сервер
  async sendDataToBot(data) {
    try {
      if (!this.tg || !this.tg.sendData) {
        console.warn('🤖 Telegram WebApp sendData not available');
        return false;
      }

      const jsonData = JSON.stringify(data);
      
      // Проверяем размер данных (Telegram имеет ограничение 4096 байт)
      if (jsonData.length > 4000) {
        console.warn('📦 Data too large for Telegram, splitting...');
        // Разбиваем данные на части если нужно
        const chunks = this.splitData(jsonData, 3500);
        for (let i = 0; i < chunks.length; i++) {
          const chunkData = {
            type: 'data_chunk',
            chunk_index: i,
            total_chunks: chunks.length,
            data: chunks[i],
            timestamp: Date.now()
          };
          this.tg.sendData(JSON.stringify(chunkData));
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

  splitData(jsonString, chunkSize) {
    const chunks = [];
    for (let i = 0; i < jsonString.length; i += chunkSize) {
      chunks.push(jsonString.substring(i, i + chunkSize));
    }
    return chunks;
  }

  // Метод для отправки статистики игры
  async sendGameStatistics(gameData) {
    const statsData = {
      type: 'game_statistics',
      user_id: this.user?.id,
      timestamp: Date.now(),
      stats: {
        totalResources: Object.values(gameData.resources || {}).reduce((sum, val) => sum + (val || 0), 0),
        maxCombo: gameData.combo?.count || 0,
        totalClicks: gameData.achievements?.statistics?.totalClicks || 0,
        buildingLevels: Object.values(gameData.buildings || {}).reduce((sum, building) => sum + (building.level || 0), 0),
        skillLevels: Object.values(gameData.skills || {}).reduce((sum, skill) => sum + (skill.level || 0), 0),
        raidsCompleted: gameData.raids?.statistics?.totalRaids || 0,
        peopleLost: gameData.raids?.statistics?.peopleLost || 0,
        achievementsCount: gameData.achievements?.completed?.size || gameData.achievements?.completed?.length || 0,
        playtimeEstimate: Math.floor((Object.values(gameData.resources || {}).reduce((sum, val) => sum + (val || 0), 0) / 100) || 1)
      }
    };

    return await this.sendDataToBot(statsData);
  }

  // Метод для отправки данных сохранения
  async sendSaveData(saveData) {
    const cloudSaveData = {
      type: 'cloud_save',
      user_id: this.user?.id,
      timestamp: Date.now(),
      save_data: saveData,
      version: saveData.saveVersion || '1.0'
    };

    return await this.sendDataToBot(cloudSaveData);
  }

  // Метод для запроса лидерборда
  async requestLeaderboard(category = 'total_resources') {
    const requestData = {
      type: 'leaderboard_request',
      user_id: this.user?.id,
      category: category,
      timestamp: Date.now()
    };

    return await this.sendDataToBot(requestData);
  }

  // Остальные методы остаются без изменений...
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
      });
      
      this.dispatchReadyEvent();
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
        // Автоматическая отправка статистики при значимых событиях
        window.eventBus.subscribe('game:save', () => {
          this.onGameSave();
        });
        
        window.eventBus.subscribe('achievement:unlocked', () => {
          this.sendGameStatisticsIfNeeded();
        });
        
        window.eventBus.subscribe('raid:completed', () => {
          this.sendGameStatisticsIfNeeded();
        });
        
        window.eventBus.subscribe('building:bought', () => {
          this.sendGameStatisticsIfNeeded();
        });
      }
      
      // Настраиваем автоматическую отправку статистики
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
  }

  async sendGameStatisticsIfNeeded() {
    try {
      if (!this.gameInstance || !this.gameInstance.gameState) return;
      
      const gameData = this.gameInstance.gameState.getSaveData();
      if (gameData) {
        await this.sendGameStatistics(gameData);
      }
    } catch (error) {
      console.warn('⚠️ Error sending game statistics:', error);
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

  // Остальные методы обработки событий...
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

  // Методы для управления кнопками
  setMainButton(text, color = null) {
    try {
      if (!this.tg || !this.tg.MainButton) return;
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
      if (this.tg && this.tg.MainButton) {
        this.tg.MainButton.hide();
      }
    } catch (error) {
      console.warn('⚠️ Error hiding main button:', error);
    }
  }

  showBackButton() {
    try {
      if (this.tg && this.tg.BackButton) {
        this.tg.BackButton.show();
      }
    } catch (error) {
      console.warn('⚠️ Error showing back button:', error);
    }
  }

  hideBackButton() {
    try {
      if (this.tg && this.tg.BackButton) {
        this.tg.BackButton.hide();
      }
    } catch (error) {
      console.warn('⚠️ Error hiding back button:', error);
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
          // Отправляем данные на сервер
          this.sendGameStatisticsIfNeeded();
        } else {
          this.showAlert('❌ Save failed. Try again.');
        }
      }
    } catch (error) {
      console.warn('⚠️ Error handling main button:', error);
    }
  }

  onGameSave() {
    try {
      if (this.tg && this.tg.HapticFeedback) {
        this.tg.HapticFeedback.notificationOccurred('success');
      }
      // Отправляем обновленную статистику
      this.sendGameStatisticsIfNeeded();
    } catch (error) {
      console.warn('⚠️ Error handling game save:', error);
    }
  }

  showAlert(message) {
    try {
      if (this.tg && this.tg.showAlert) {
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
      if (this.tg && this.tg.showConfirm) {
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
      if (this.tg && this.tg.close) {
        this.tg.close();
      } else {
        window.close();
      }
    } catch (error) {
      console.warn('⚠️ Error closing app:', error);
    }
  }

  // Геттеры
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
      telegramVersion: this.tg?.version || 'N/A'
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

// Инициализируем сразу при загрузке скрипта
document.addEventListener('DOMContentLoaded', () => {
  initTelegramIntegration();
});

// Экспорт в глобальную область
window.TelegramIntegration = TelegramIntegration;
window.initTelegramIntegration = initTelegramIntegration;
window.getTelegramDebug = () => {
  return telegramIntegrationInstance?.getDebugInfo() || 'Not initialized';
};

console.log('📱 Telegram Integration script loaded');