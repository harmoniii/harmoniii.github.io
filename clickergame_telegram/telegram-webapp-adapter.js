// telegram-webapp-adapter.js - Адаптер для Telegram Web App
export class TelegramWebAppAdapter {
  constructor() {
    this.tg = window.Telegram?.WebApp;
    this.user = null;
    this.isInitialized = false;
    this.storagePrefix = 'tg_grid_game_';
    
    this.initialize();
  }

  initialize() {
    if (!this.tg) {
      console.warn('⚠️ Telegram WebApp API not available - running in standalone mode');
      this.createMockAPI();
      return;
    }

    console.log('🤖 Initializing Telegram Web App...');
    
    // Настраиваем внешний вид
    this.tg.ready();
    this.tg.expand();
    this.setupTheme();
    this.setupMainButton();
    this.setupBackButton();
    
    // Получаем данные пользователя
    this.user = this.tg.initDataUnsafe.user;
    this.isInitialized = true;
    
    console.log('✅ Telegram Web App initialized');
    console.log('👤 User:', this.user);
  }

  createMockAPI() {
    // Создаём заглушку для разработки вне Telegram
    this.tg = {
      ready: () => {},
      expand: () => {},
      close: () => window.close(),
      MainButton: {
        text: '',
        color: '#2481cc',
        textColor: '#ffffff',
        isVisible: false,
        isActive: true,
        isProgressVisible: false,
        setText: function(text) { this.text = text; },
        onClick: function(callback) { this.callback = callback; },
        offClick: function(callback) { this.callback = null; },
        show: function() { this.isVisible = true; },
        hide: function() { this.isVisible = false; },
        enable: function() { this.isActive = true; },
        disable: function() { this.isActive = false; },
        showProgress: function() { this.isProgressVisible = true; },
        hideProgress: function() { this.isProgressVisible = false; }
      },
      BackButton: {
        isVisible: false,
        onClick: function(callback) { this.callback = callback; },
        offClick: function(callback) { this.callback = null; },
        show: function() { this.isVisible = true; },
        hide: function() { this.isVisible = false; }
      },
      HapticFeedback: {
        impactOccurred: () => {},
        notificationOccurred: () => {},
        selectionChanged: () => {}
      },
      themeParams: {
        bg_color: '#ffffff',
        text_color: '#000000',
        hint_color: '#999999',
        link_color: '#2481cc',
        button_color: '#2481cc',
        button_text_color: '#ffffff'
      },
      colorScheme: 'light',
      isExpanded: true,
      viewportHeight: window.innerHeight,
      viewportStableHeight: window.innerHeight,
      initDataUnsafe: {
        user: {
          id: Date.now(), // Случайный ID для тестирования
          first_name: 'Test User',
          username: 'testuser'
        }
      }
    };
    
    this.user = this.tg.initDataUnsafe.user;
    this.isInitialized = true;
    
    console.log('🔧 Mock Telegram API created for development');
  }

  setupTheme() {
    const theme = this.tg.themeParams;
    
    // Применяем тему Telegram к игре
    document.documentElement.style.setProperty('--tg-bg-color', theme.bg_color || '#ffffff');
    document.documentElement.style.setProperty('--tg-text-color', theme.text_color || '#000000');
    document.documentElement.style.setProperty('--tg-hint-color', theme.hint_color || '#999999');
    document.documentElement.style.setProperty('--tg-link-color', theme.link_color || '#2481cc');
    document.documentElement.style.setProperty('--tg-button-color', theme.button_color || '#2481cc');
    document.documentElement.style.setProperty('--tg-button-text-color', theme.button_text_color || '#ffffff');
    
    // Устанавливаем тёмную/светлую тему
    if (this.tg.colorScheme === 'dark') {
      document.body.classList.add('tg-dark-theme');
    } else {
      document.body.classList.add('tg-light-theme');
    }
  }

  setupMainButton() {
    const mainButton = this.tg.MainButton;
    
    // Начальная настройка главной кнопки
    mainButton.setText('💾 Save Game');
    mainButton.color = this.tg.themeParams.button_color || '#2481cc';
    mainButton.textColor = this.tg.themeParams.button_text_color || '#ffffff';
    
    // Показываем кнопку только когда есть что сохранить
    this.hideMainButton();
  }

  setupBackButton() {
    const backButton = this.tg.BackButton;
    
    backButton.onClick(() => {
      this.closeApp();
    });
  }

  // Управление главной кнопкой
  showMainButton(text = '💾 Save Game', callback = null) {
    const mainButton = this.tg.MainButton;
    
    mainButton.setText(text);
    
    if (callback) {
      mainButton.offClick(mainButton.callback);
      mainButton.onClick(callback);
    }
    
    mainButton.show();
  }

  hideMainButton() {
    this.tg.MainButton.hide();
  }

  setMainButtonLoading(loading = true) {
    if (loading) {
      this.tg.MainButton.showProgress();
      this.tg.MainButton.disable();
    } else {
      this.tg.MainButton.hideProgress();
      this.tg.MainButton.enable();
    }
  }

  // Управление задней кнопкой
  showBackButton() {
    this.tg.BackButton.show();
  }

  hideBackButton() {
    this.tg.BackButton.hide();
  }

  // Haptic Feedback
  hapticFeedback(type = 'light') {
    if (!this.tg.HapticFeedback) return;
    
    switch (type) {
      case 'light':
      case 'medium':
      case 'heavy':
        this.tg.HapticFeedback.impactOccurred(type);
        break;
      case 'success':
      case 'warning':
      case 'error':
        this.tg.HapticFeedback.notificationOccurred(type);
        break;
      case 'selection':
        this.tg.HapticFeedback.selectionChanged();
        break;
    }
  }

  // Облачное хранилище
  async cloudStorageSave(key, data) {
    if (!this.tg.CloudStorage) {
      // Fallback к localStorage
      return this.localStorageSave(key, data);
    }

    try {
      const dataString = JSON.stringify(data);
      await this.tg.CloudStorage.setItem(this.storagePrefix + key, dataString);
      return true;
    } catch (error) {
      console.error('❌ Cloud storage save failed:', error);
      return this.localStorageSave(key, data);
    }
  }

  async cloudStorageLoad(key) {
    if (!this.tg.CloudStorage) {
      // Fallback к localStorage
      return this.localStorageLoad(key);
    }

    try {
      const dataString = await this.tg.CloudStorage.getItem(this.storagePrefix + key);
      return dataString ? JSON.parse(dataString) : null;
    } catch (error) {
      console.error('❌ Cloud storage load failed:', error);
      return this.localStorageLoad(key);
    }
  }

  localStorageSave(key, data) {
    try {
      localStorage.setItem(this.storagePrefix + key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('❌ Local storage save failed:', error);
      return false;
    }
  }

  localStorageLoad(key) {
    try {
      const dataString = localStorage.getItem(this.storagePrefix + key);
      return dataString ? JSON.parse(dataString) : null;
    } catch (error) {
      console.error('❌ Local storage load failed:', error);
      return null;
    }
  }

  // Отправка данных боту
  sendData(data) {
    if (!this.tg.sendData) {
      console.warn('⚠️ sendData not available');
      return false;
    }

    try {
      this.tg.sendData(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('❌ Failed to send data to bot:', error);
      return false;
    }
  }

  // Закрытие приложения
  closeApp() {
    // Сохраняем игру перед закрытием
    this.saveGameBeforeClose();
    
    // Закрываем через секунду
    setTimeout(() => {
      this.tg.close();
    }, 1000);
  }

  async saveGameBeforeClose() {
    if (window.gameCore) {
      this.setMainButtonLoading(true);
      
      try {
        const saveData = window.gameCore.getGameState()?.getSaveData();
        if (saveData) {
          await this.cloudStorageSave('gamestate', saveData);
          console.log('✅ Game saved before closing');
        }
      } catch (error) {
        console.error('❌ Failed to save before closing:', error);
      } finally {
        this.setMainButtonLoading(false);
      }
    }
  }

  // Получение информации о пользователе
  getUserInfo() {
    return {
      id: this.user?.id,
      firstName: this.user?.first_name,
      lastName: this.user?.last_name,
      username: this.user?.username,
      languageCode: this.user?.language_code || 'en',
      isPremium: this.user?.is_premium || false
    };
  }

  // Проверка возможностей
  getCapabilities() {
    return {
      hapticFeedback: !!this.tg.HapticFeedback,
      cloudStorage: !!this.tg.CloudStorage,
      mainButton: !!this.tg.MainButton,
      backButton: !!this.tg.BackButton,
      themeParams: !!this.tg.themeParams,
      sendData: !!this.tg.sendData
    };
  }

  // Настройка для игровых событий
  setupGameIntegration(gameCore) {
    if (!gameCore) return;

    // Устанавливаем автосохранение в облако каждые 2 минуты
    setInterval(async () => {
      try {
        const saveData = gameCore.getGameState()?.getSaveData();
        if (saveData) {
          await this.cloudStorageSave('gamestate', saveData);
          console.log('☁️ Auto-saved to cloud');
        }
      } catch (error) {
        console.error('❌ Cloud auto-save failed:', error);
      }
    }, 120000); // 2 минуты

    // Показываем главную кнопку для сохранения
    this.showMainButton('💾 Save to Cloud', async () => {
      this.setMainButtonLoading(true);
      this.hapticFeedback('light');
      
      try {
        const saveData = gameCore.getGameState()?.getSaveData();
        if (saveData) {
          const success = await this.cloudStorageSave('gamestate', saveData);
          if (success) {
            this.hapticFeedback('success');
            // Временно меняем текст кнопки
            this.tg.MainButton.setText('✅ Saved!');
            setTimeout(() => {
              this.tg.MainButton.setText('💾 Save to Cloud');
            }, 2000);
          } else {
            this.hapticFeedback('error');
          }
        }
      } catch (error) {
        console.error('❌ Manual save failed:', error);
        this.hapticFeedback('error');
      } finally {
        this.setMainButtonLoading(false);
      }
    });

    // Загружаем сохранённую игру при запуске
    this.loadGameOnStart(gameCore);
  }

  async loadGameOnStart(gameCore) {
    try {
      const saveData = await this.cloudStorageLoad('gamestate');
      if (saveData && gameCore.getGameState()) {
        gameCore.getGameState().loadSaveData(saveData);
        console.log('☁️ Game loaded from cloud storage');
        
        // Уведомляем игрока
        if (gameCore.managers?.ui?.notificationManager) {
          gameCore.managers.ui.notificationManager.showSuccess('☁️ Game loaded from cloud!');
        }
      }
    } catch (error) {
      console.error('❌ Failed to load game from cloud:', error);
    }
  }

  // События игры для haptic feedback
  bindGameEvents() {
    if (!window.eventBus) return;

    // Тактильная отдача для разных событий
    window.eventBus.subscribe('game:click', () => {
      this.hapticFeedback('selection');
    });

    window.eventBus.subscribe('game:combo_changed', (data) => {
      if (data.count > 0 && data.count % 10 === 0) {
        this.hapticFeedback('light');
      }
    });

    window.eventBus.subscribe('effect:buff_applied', () => {
      this.hapticFeedback('success');
    });

    window.eventBus.subscribe('effect:debuff_applied', () => {
      this.hapticFeedback('warning');
    });

    window.eventBus.subscribe('skill:critical_hit', () => {
      this.hapticFeedback('medium');
    });

    window.eventBus.subscribe('building:bought', () => {
      this.hapticFeedback('success');
    });

    window.eventBus.subscribe('skill:bought', () => {
      this.hapticFeedback('success');
    });

    window.eventBus.subscribe('raid:started', () => {
      this.hapticFeedback('heavy');
    });

    window.eventBus.subscribe('raid:completed', () => {
      this.hapticFeedback('success');
    });
  }

  // Отладочная информация
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      isTelegramAvailable: !!window.Telegram?.WebApp,
      user: this.getUserInfo(),
      capabilities: this.getCapabilities(),
      theme: this.tg.colorScheme,
      viewport: {
        height: this.tg.viewportHeight,
        stableHeight: this.tg.viewportStableHeight,
        isExpanded: this.tg.isExpanded
      }
    };
  }
}