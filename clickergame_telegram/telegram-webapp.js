// Telegram Web App Integration for Grid Clicker Game
// Исправлен дублированный экспорт

class TelegramWebApp {
  constructor() {
    this.tg = null;
    this.user = null;
    this.isReady = false;
    this.isExpanded = false;
    this.themeParams = {};
    this.viewportHeight = window.innerHeight;
    this.isClosingConfirmationEnabled = false;
    
    console.log('🤖 TelegramWebApp initializing...');
    this.init();
  }

  init() {
    try {
      // Проверяем доступность Telegram WebApp
      if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
        this.tg = window.Telegram.WebApp;
        console.log('✅ Telegram WebApp API found');
        this.setupTelegramWebApp();
      } else {
        console.log('⚠️ Running outside Telegram WebApp - using fallback mode');
        this.setupFallbackMode();
      }
    } catch (error) {
      console.error('❌ Error initializing TelegramWebApp:', error);
      this.setupFallbackMode();
    }
  }

  setupTelegramWebApp() {
    try {
      // Инициализация Telegram WebApp
      this.tg.ready();
      this.isReady = true;
      
      // Получаем данные пользователя
      this.user = this.tg.initDataUnsafe?.user || null;
      
      // Получаем параметры темы
      this.themeParams = this.tg.themeParams || {};
      
      // Настраиваем внешний вид
      this.setupAppearance();
      
      // Настраиваем обработчики событий
      this.setupEventHandlers();
      
      // Расширяем окно на весь экран
      this.expandViewport();
      
      // Включаем подтверждение закрытия
      this.enableClosingConfirmation();
      
      // Применяем тему
      this.applyTheme();
      
      console.log('🎉 Telegram WebApp initialized successfully');
      console.log('👤 User:', this.user);
      console.log('🎨 Theme:', this.themeParams);
      
      // Уведомляем игру о готовности
      this.notifyGameReady();
      
    } catch (error) {
      console.error('❌ Error setting up Telegram WebApp:', error);
      this.setupFallbackMode();
    }
  }

  setupFallbackMode() {
    console.log('🔄 Setting up fallback mode...');
    this.isReady = true;
    this.user = {
      id: Date.now(),
      first_name: 'Player',
      username: 'player_' + Math.random().toString(36).substr(2, 5),
      language_code: 'en',
      is_bot: false
    };
    this.themeParams = {
      bg_color: '#ffffff',
      text_color: '#000000',
      hint_color: '#999999',
      link_color: '#2481cc',
      button_color: '#2481cc',
      button_text_color: '#ffffff'
    };
    this.applyTheme();
    this.notifyGameReady();
  }

  setupAppearance() {
    if (!this.tg) return;
    
    try {
      // Настраиваем цвета заголовка
      this.tg.setHeaderColor('secondary_bg_color');
      
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
    if (!this.tg) return;
    
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
    } catch (error) {
      console.warn('⚠️ Error expanding viewport:', error);
    }
  }

  enableClosingConfirmation() {
    if (!this.tg) return;
    
    try {
      if (this.tg.enableClosingConfirmation) {
        this.tg.enableClosingConfirmation();
        this.isClosingConfirmationEnabled = true;
        console.log('🔒 Closing confirmation enabled');
      }
    } catch (error) {
      console.warn('⚠️ Error enabling closing confirmation:', error);
    }
  }

  applyTheme() {
    try {
      const root = document.documentElement;
      
      // Применяем CSS переменные темы
      if (this.themeParams.bg_color) {
        root.style.setProperty('--tg-theme-bg-color', this.themeParams.bg_color);
      }
      if (this.themeParams.text_color) {
        root.style.setProperty('--tg-theme-text-color', this.themeParams.text_color);
      }
      if (this.themeParams.hint_color) {
        root.style.setProperty('--tg-theme-hint-color', this.themeParams.hint_color);
      }
      if (this.themeParams.link_color) {
        root.style.setProperty('--tg-theme-link-color', this.themeParams.link_color);
      }
      if (this.themeParams.button_color) {
        root.style.setProperty('--tg-theme-button-color', this.themeParams.button_color);
      }
      if (this.themeParams.button_text_color) {
        root.style.setProperty('--tg-theme-button-text-color', this.themeParams.button_text_color);
      }
      if (this.themeParams.secondary_bg_color) {
        root.style.setProperty('--tg-theme-secondary-bg-color', this.themeParams.secondary_bg_color);
      }
      
      console.log('🎨 Theme applied:', this.themeParams);
    } catch (error) {
      console.warn('⚠️ Error applying theme:', error);
    }
  }

  handleViewportChange() {
    try {
      const newHeight = this.tg?.viewportHeight || window.innerHeight;
      const heightChanged = Math.abs(newHeight - this.viewportHeight) > 50;
      
      if (heightChanged) {
        this.viewportHeight = newHeight;
        console.log('📱 Viewport changed:', newHeight);
        
        // Обновляем высоту CSS
        document.documentElement.style.setProperty('--tg-viewport-height', `${newHeight}px`);
        
        // Уведомляем игру об изменении
        if (window.gameCore && typeof window.gameCore.handleViewportChange === 'function') {
          window.gameCore.handleViewportChange(newHeight);
        }
      }
    } catch (error) {
      console.warn('⚠️ Error handling viewport change:', error);
    }
  }

  handleThemeChange() {
    try {
      this.themeParams = this.tg?.themeParams || {};
      this.applyTheme();
      console.log('🎨 Theme changed:', this.themeParams);
    } catch (error) {
      console.warn('⚠️ Error handling theme change:', error);
    }
  }

  handleBackButton() {
    try {
      console.log('🔙 Back button clicked');
      
      // Проверяем, открыта ли панель в игре
      if (window.gameCore?.managers?.ui) {
        const uiManager = window.gameCore.managers.ui;
        if (uiManager.isPanelOpen && uiManager.isPanelOpen()) {
          uiManager.hidePanel();
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
      console.log('⚡ Main button clicked');
      
      // Логика для главной кнопки (например, сохранение игры)
      if (window.gameCore && typeof window.gameCore.autoSave === 'function') {
        window.gameCore.autoSave();
        this.showAlert('💾 Game saved!');
      }
    } catch (error) {
      console.warn('⚠️ Error handling main button:', error);
    }
  }

  showExitConfirmation() {
    try {
      if (this.tg && this.tg.showConfirm) {
        this.tg.showConfirm('Exit the game?', (confirmed) => {
          if (confirmed) {
            this.close();
          }
        });
      } else {
        // Fallback для браузера
        if (confirm('Exit the game?')) {
          window.close();
        }
      }
    } catch (error) {
      console.warn('⚠️ Error showing exit confirmation:', error);
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

  setMainButton(text, color = null) {
    try {
      if (!this.tg || !this.tg.MainButton) return;
      
      this.tg.MainButton.setText(text);
      if (color) {
        this.tg.MainButton.setParams({ color: color });
      }
      this.tg.MainButton.show();
      
      console.log('🔵 Main button set:', text);
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

  sendData(data) {
    try {
      if (this.tg && this.tg.sendData) {
        const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
        this.tg.sendData(jsonData);
        console.log('📤 Data sent to Telegram:', jsonData);
      } else {
        console.log('📤 Would send data:', data);
      }
    } catch (error) {
      console.warn('⚠️ Error sending data:', error);
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

  notifyGameReady() {
    try {
      // Создаём кастомное событие для уведомления игры
      const event = new CustomEvent('telegramWebAppReady', {
        detail: {
          user: this.user,
          themeParams: this.themeParams,
          isExpanded: this.isExpanded
        }
      });
      
      window.dispatchEvent(event);
      
      // Также устанавливаем глобальную переменную
      window.telegramWebApp = this;
      
      console.log('🎮 Game notified about Telegram WebApp readiness');
    } catch (error) {
      console.warn('⚠️ Error notifying game:', error);
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

  get colorScheme() {
    return this.tg?.colorScheme || 'light';
  }

  // Методы для работы с сохранениями
  saveToTelegram(gameData) {
    try {
      const saveData = {
        type: 'game_save',
        userId: this.userId,
        timestamp: Date.now(),
        data: gameData
      };
      
      this.sendData(saveData);
      console.log('💾 Game data saved to Telegram');
    } catch (error) {
      console.warn('⚠️ Error saving to Telegram:', error);
    }
  }

  // Методы для аналитики
  trackEvent(eventName, eventData = {}) {
    try {
      const analyticsData = {
        type: 'analytics',
        event: eventName,
        data: eventData,
        userId: this.userId,
        timestamp: Date.now()
      };
      
      console.log('📊 Analytics event:', analyticsData);
      
      // Отправляем в Telegram (опционально)
      if (this.tg && eventName === 'game_completed') {
        this.sendData(analyticsData);
      }
    } catch (error) {
      console.warn('⚠️ Error tracking event:', error);
    }
  }

  // Управление игровыми состояниями
  onGameStateChange(state) {
    try {
      switch (state) {
        case 'playing':
          this.hideMainButton();
          break;
          
        case 'paused':
          this.setMainButton('Resume Game', this.themeParams.button_color);
          break;
          
        case 'game_over':
          this.setMainButton('Restart Game', '#ff4444');
          break;
          
        case 'menu':
          this.hideMainButton();
          this.hideBackButton();
          break;
          
        case 'in_panel':
          this.showBackButton();
          break;
          
        default:
          this.hideMainButton();
          this.hideBackButton();
      }
    } catch (error) {
      console.warn('⚠️ Error handling game state change:', error);
    }
  }

  // Метод для отладки
  getDebugInfo() {
    return {
      isReady: this.isReady,
      isInTelegram: this.isInTelegram,
      isExpanded: this.isExpanded,
      user: this.user,
      themeParams: this.themeParams,
      viewportHeight: this.viewportHeight,
      colorScheme: this.colorScheme,
      version: this.tg?.version || 'fallback'
    };
  }
}

// Инициализация при загрузке
let telegramWebAppInstance = null;

function initTelegramWebApp() {
  try {
    if (!telegramWebAppInstance) {
      telegramWebAppInstance = new TelegramWebApp();
    }
    return telegramWebAppInstance;
  } catch (error) {
    console.error('❌ Failed to initialize TelegramWebApp:', error);
    return null;
  }
}

// Автоматическая инициализация
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTelegramWebApp);
} else {
  initTelegramWebApp();
}

// Экспорт для использования в других модулях
export { TelegramWebApp, initTelegramWebApp };

// Глобальный доступ (для совместимости)
window.TelegramWebApp = TelegramWebApp;
window.initTelegramWebApp = initTelegramWebApp;

// Добавляем интеграцию с игрой
window.addEventListener('telegramWebAppReady', (event) => {
  console.log('🎉 Telegram WebApp integration ready!', event.detail);
  
  // Интеграция с игрой
  if (window.gameCore) {
    try {
      // Применяем тему к игре
      const { themeParams } = event.detail;
      if (themeParams) {
        // Дополнительные настройки темы для игры
        console.log('🎨 Applying Telegram theme to game');
      }
    } catch (error) {
      console.warn('⚠️ Error integrating with game:', error);
    }
  }
});

console.log('📱 Telegram WebApp integration script loaded');