// Unified Telegram Web App Integration for Grid Clicker Game
// Объединённая интеграция без конфликтов

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
    
    console.log('🤖 TelegramIntegration initializing...');
    
    // Безопасная инициализация
    this.safeInitialize();
  }

  async safeInitialize() {
    try {
      await this.waitForDOM();
      await this.initialize();
    } catch (error) {
      console.error('❌ Telegram Integration failed:', error);
      this.setupFallbackMode();
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
      
      // Проверяем наличие Telegram WebApp API
      if (this.checkTelegramAvailability()) {
        await this.initializeTelegramWebApp();
      } else {
        console.log('⚠️ Telegram WebApp API not available - using fallback');
        this.setupFallbackMode();
      }
      
      // Настраиваем интеграцию с игрой
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
      // Проверяем различные способы доступа к Telegram API
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
      
      // Получаем данные пользователя
      await this.loadUserData();
      
      // Получаем параметры темы
      this.loadThemeParams();
      
      // Настраиваем внешний вид
      this.setupAppearance();
      
      // Настраиваем обработчики событий
      this.setupEventHandlers();
      
      // Расширяем viewport
      this.expandViewport();
      
      // Применяем тему
      this.applyTheme();
      
      // Настраиваем кнопки
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
      this.user = this.tg.initDataUnsafe?.user || null;
      
      // Если данные не получены, создаём fallback
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

  loadThemeParams() {
    try {
      this.themeParams = this.tg.themeParams || {};
      
      // Добавляем fallback значения если параметры темы отсутствуют
      if (Object.keys(this.themeParams).length === 0) {
        this.themeParams = {
          bg_color: '#ffffff',
          text_color: '#000000',
          hint_color: '#999999',
          link_color: '#2481cc',
          button_color: '#2481cc',
          button_text_color: '#ffffff',
          secondary_bg_color: '#f1f1f1'
        };
      }
      
      console.log('🎨 Theme params loaded:', this.themeParams);
    } catch (error) {
      console.warn('⚠️ Error loading theme params:', error);
      this.themeParams = this.createFallbackTheme();
    }
  }

  setupFallbackMode() {
    console.log('🔄 Setting up fallback mode...');
    
    this.isReady = true;
    this.user = this.createFallbackUser();
    this.themeParams = this.createFallbackTheme();
    this.isInitialized = true;
    
    // Применяем fallback тему
    this.applyTheme();
    
    // Настраиваем интеграцию с игрой
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
    // Определяем тему на основе системных предпочтений
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

  setupAppearance() {
    if (!this.tg) return;
    
    try {
      // Настраиваем цвета заголовка
      if (this.tg.setHeaderColor) {
        this.tg.setHeaderColor('secondary_bg_color');
      }
      
      // Настраиваем цвет фона
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
      // Обработчик изменения viewport
      this.tg.onEvent('viewportChanged', () => {
        this.handleViewportChange();
      });
      
      // Обработчик изменения темы
      this.tg.onEvent('themeChanged', () => {
        this.handleThemeChange();
      });
      
      // Обработчик кнопки "Назад"
      this.tg.onEvent('backButtonClicked', () => {
        this.handleBackButton();
      });
      
      // Обработчик главной кнопки
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
      
      // Включаем подтверждение закрытия
      if (this.tg.enableClosingConfirmation) {
        this.tg.enableClosingConfirmation();
        console.log('🔒 Closing confirmation enabled');
      }
      
    } catch (error) {
      console.warn('⚠️ Error expanding viewport:', error);
    }
  }

  setupButtons() {
    if (!this.tg) return;
    
    try {
      // Настраиваем главную кнопку
      if (this.tg.MainButton) {
        this.tg.MainButton.setText('💾 Save Game');
        this.tg.MainButton.hide(); // Скрываем по умолчанию
      }
      
      // Настраиваем кнопку назад
      if (this.tg.BackButton) {
        this.tg.BackButton.hide(); // Скрываем по умолчанию
      }
      
      console.log('🔵 Buttons configured');
    } catch (error) {
      console.warn('⚠️ Error setting up buttons:', error);
    }
  }

  applyTheme() {
    try {
      const root = document.documentElement;
      
      // Применяем CSS переменные темы
      Object.entries(this.themeParams).forEach(([key, value]) => {
        if (value) {
          root.style.setProperty(`--tg-theme-${key.replace(/_/g, '-')}`, value);
        }
      });
      
      // Дополнительные переменные для совместимости
      root.style.setProperty('--tg-viewport-height', `${this.viewportHeight}px`);
      
      console.log('🎨 Theme applied to CSS variables');
    } catch (error) {
      console.warn('⚠️ Error applying theme:', error);
    }
  }

  setupGameIntegration() {
    try {
      // Ждём загрузки игры
      this.waitForGame().then(() => {
        this.integrateWithGame();
      });
      
      // Создаём глобальные события
      this.dispatchReadyEvent();
      
      // Устанавливаем глобальные переменные
      window.telegramIntegration = this;
      window.telegramWebApp = this; // Для совместимости
      
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
        // Событие сохранения игры
        window.eventBus.subscribe('game:save', () => {
          this.onGameSave();
        });
        
        // Событие изменения состояния панели
        window.eventBus.subscribe('ui:panel_changed', (data) => {
          this.onGameStateChange(data.isOpen ? 'in_panel' : 'playing');
        });
      }
      
      console.log('✅ Game integration completed');
    } catch (error) {
      console.warn('⚠️ Error integrating with game:', error);
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

  // Обработчики событий Telegram
  handleViewportChange() {
    try {
      if (!this.tg) return;
      
      const newHeight = this.tg.viewportHeight || window.innerHeight;
      const heightChanged = Math.abs(newHeight - this.viewportHeight) > 50;
      
      if (heightChanged) {
        this.viewportHeight = newHeight;
        console.log('📱 Viewport changed:', newHeight);
        
        // Обновляем CSS переменную
        document.documentElement.style.setProperty('--tg-viewport-height', `${newHeight}px`);
        
        // Уведомляем игру
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

  handleBackButton() {
    try {
      console.log('🔙 Back button pressed');
      
      // Проверяем состояние игры
      if (this.gameInstance?.managers?.ui) {
        const uiManager = this.gameInstance.managers.ui;
        if (uiManager.isPanelOpen && uiManager.isPanelOpen()) {
          uiManager.hidePanel();
          this.hideBackButton();
          return;
        }
      }
      
      // Если панель не открыта, показываем подтверждение выхода
      this.showExitConfirmation();
    } catch (error) {
      console.warn('⚠️ Error handling back button:', error);
    }
  }

  handleMainButton() {
    try {
      console.log('⚡ Main button pressed');
      
      // Сохраняем игру
      if (this.gameInstance && typeof this.gameInstance.autoSave === 'function') {
        const saveResult = this.gameInstance.autoSave();
        if (saveResult) {
          this.showAlert('💾 Game saved successfully!');
        } else {
          this.showAlert('❌ Save failed. Try again.');
        }
      }
    } catch (error) {
      console.warn('⚠️ Error handling main button:', error);
    }
  }

  // Методы управления UI
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

  // Обработчики событий игры
  onGameSave() {
    try {
      // Показываем уведомление о сохранении
      if (this.tg && this.tg.HapticFeedback) {
        this.tg.HapticFeedback.notificationOccurred('success');
      }
    } catch (error) {
      console.warn('⚠️ Error handling game save:', error);
    }
  }

  onGameStateChange(state) {
    try {
      switch (state) {
        case 'playing':
          this.setMainButton('💾 Save Game');
          this.hideBackButton();
          break;
          
        case 'in_panel':
          this.hideMainButton();
          this.showBackButton();
          break;
          
        case 'paused':
          this.setMainButton('▶️ Resume');
          break;
          
        case 'game_over':
          this.setMainButton('🔄 Restart', '#ff4444');
          break;
          
        default:
          this.hideMainButton();
          this.hideBackButton();
      }
    } catch (error) {
      console.warn('⚠️ Error handling game state change:', error);
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

  // Методы для отладки
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

  // Тестовые методы
  testTelegramFeatures() {
    console.log('🧪 Testing Telegram features...');
    
    const tests = [
      () => this.showAlert('✅ Alert test'),
      () => this.setMainButton('🧪 Test Button'),
      () => setTimeout(() => this.hideMainButton(), 2000),
      () => this.tg?.HapticFeedback?.impactOccurred('light')
    ];
    
    tests.forEach((test, index) => {
      setTimeout(() => {
        try {
          test();
          console.log(`✅ Test ${index + 1} passed`);
        } catch (error) {
          console.log(`❌ Test ${index + 1} failed:`, error);
        }
      }, index * 1000);
    });
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

// Автоматическая инициализация
document.addEventListener('DOMContentLoaded', () => {
  initTelegramIntegration();
});

// Глобальный доступ
window.TelegramIntegration = TelegramIntegration;
window.initTelegramIntegration = initTelegramIntegration;

// Для отладки
window.getTelegramDebug = () => {
  return telegramIntegrationInstance?.getDebugInfo() || 'Not initialized';
};

console.log('📱 Telegram Integration script loaded');