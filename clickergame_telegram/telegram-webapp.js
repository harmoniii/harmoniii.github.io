// telegram-webapp.js - Интеграция с Telegram Web App
export class TelegramWebApp {
  constructor() {
    this.tg = null;
    this.user = null;
    this.isInitialized = false;
    this.cloudSaveInterval = null;
    this.lastCloudSave = 0;
    this.cloudSaveCooldown = 120000; // 2 минуты между сохранениями
    
    this.initialize();
  }

  // Инициализация Telegram Web App
  initialize() {
    try {
      // Проверяем доступность Telegram Web App API
      if (typeof window.Telegram?.WebApp === 'undefined') {
        console.warn('⚠️ Telegram Web App API not available');
        this.initializeMockMode();
        return;
      }

      this.tg = window.Telegram.WebApp;
      console.log('📱 Telegram Web App detected:', this.tg.version);

      // Настройка Web App
      this.setupWebApp();
      
      // Получаем данные пользователя
      this.setupUser();
      
      // Настройка UI
      this.setupUI();
      
      // Настройка автосохранения в облако
      this.setupCloudSaving();
      
      this.isInitialized = true;
      console.log('✅ Telegram Web App integration initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Telegram Web App:', error);
      this.initializeMockMode();
    }
  }

  // Настройка Web App
  setupWebApp() {
    // Расширяем на полный экран
    this.tg.expand();
    
    // Включаем закрытие по свайпу
    this.tg.enableClosingConfirmation();
    
    // Устанавливаем цвета темы
    this.tg.setHeaderColor('#667eea');
    this.tg.setBackgroundColor('#667eea');
    
    // Включаем вибрацию для обратной связи
    this.enableHapticFeedback();
    
    console.log('📱 Web App configured');
  }

  // Настройка пользователя
  setupUser() {
    if (this.tg.initDataUnsafe?.user) {
      this.user = {
        id: this.tg.initDataUnsafe.user.id,
        firstName: this.tg.initDataUnsafe.user.first_name,
        lastName: this.tg.initDataUnsafe.user.last_name,
        username: this.tg.initDataUnsafe.user.username,
        languageCode: this.tg.initDataUnsafe.user.language_code,
        isPremium: this.tg.initDataUnsafe.user.is_premium || false
      };
      
      console.log('👤 User data received:', this.user);
    } else {
      console.warn('⚠️ No user data available');
      this.user = {
        id: 'demo',
        firstName: 'Demo',
        lastName: 'User',
        username: 'demo_user',
        languageCode: 'en',
        isPremium: false
      };
    }
  }

  // Настройка UI для мобильного использования
  setupUI() {
    // Скрываем главную кнопку пока не нужна
    this.tg.MainButton.hide();
    
    // Настройка кнопки назад
    this.tg.BackButton.onClick(() => {
      this.handleBackButton();
    });
    
    // Адаптируем viewport для мобильных устройств
    this.setupMobileViewport();
    
    // Предотвращаем скролл при игре
    this.preventBodyScroll();
    
    console.log('📱 Mobile UI configured');
  }

  // Настройка viewport для мобильных
  setupMobileViewport() {
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    }
    
    // Адаптируем высоту под Telegram
    const gameArea = document.getElementById('game-area');
    if (gameArea) {
      gameArea.style.minHeight = `${this.tg.viewportHeight}px`;
      gameArea.style.paddingBottom = 'env(safe-area-inset-bottom)';
    }
    
    // Слушаем изменения размера viewport
    this.tg.onEvent('viewportChanged', () => {
      this.handleViewportChange();
    });
  }

  // Предотвращение скролла body
  preventBodyScroll() {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    // Предотвращаем pull-to-refresh
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });
    
    document.addEventListener('touchmove', (e) => {
      e.preventDefault();
    }, { passive: false });
  }

  // Настройка автосохранения в облако
  setupCloudSaving() {
    // Автосохранение каждые 2 минуты
    this.cloudSaveInterval = setInterval(() => {
      this.performCloudSave();
    }, this.cloudSaveCooldown);
    
    // Сохранение при закрытии
    this.tg.onEvent('webAppClose', () => {
      this.performCloudSave(true);
    });
    
    // Сохранение при потере фокуса
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.performCloudSave();
      }
    });
    
    console.log('☁️ Cloud saving configured');
  }

  // Выполнить сохранение в облако
  async performCloudSave(force = false) {
    const now = Date.now();
    
    if (!force && now - this.lastCloudSave < this.cloudSaveCooldown) {
      return; // Слишком рано для следующего сохранения
    }
    
    try {
      const gameCore = window.gameCore;
      if (!gameCore || !gameCore.gameState) {
        console.warn('⚠️ Game not ready for cloud save');
        return;
      }
      
      const saveData = gameCore.gameState.getSaveData();
      if (!saveData) {
        console.warn('⚠️ No save data to upload');
        return;
      }
      
      // Добавляем метаданные для облачного сохранения
      const cloudData = {
        type: 'game_save',
        userId: this.user.id,
        data: saveData,
        timestamp: now,
        gameVersion: saveData.saveVersion || '1.0',
        userInfo: {
          firstName: this.user.firstName,
          username: this.user.username
        }
      };
      
      // Отправляем данные через Telegram Web App API
      this.tg.sendData(JSON.stringify(cloudData));
      
      this.lastCloudSave = now;
      console.log('☁️ Cloud save completed');
      
      // Показываем уведомление пользователю
      this.showHapticFeedback('success');
      
    } catch (error) {
      console.error('❌ Cloud save failed:', error);
      this.showHapticFeedback('error');
    }
  }

  // Загрузить сохранение из облака
  async loadFromCloud() {
    try {
      // Запрашиваем данные через main button
      this.tg.MainButton.setText('📥 Loading from Cloud...');
      this.tg.MainButton.show();
      this.tg.MainButton.showProgress();
      
      // Отправляем запрос на загрузку
      const loadRequest = {
        type: 'load_request',
        userId: this.user.id,
        timestamp: Date.now()
      };
      
      this.tg.sendData(JSON.stringify(loadRequest));
      
      console.log('☁️ Cloud load requested');
      
    } catch (error) {
      console.error('❌ Cloud load failed:', error);
      this.hideMainButton();
      this.showHapticFeedback('error');
    }
  }

  // Отправить статистику игры
  async sendGameStatistics() {
    try {
      const gameCore = window.gameCore;
      if (!gameCore || !gameCore.gameState) return;
      
      const stats = this.gatherGameStatistics(gameCore);
      
      const statisticsData = {
        type: 'game_statistics',
        userId: this.user.id,
        stats: stats,
        timestamp: Date.now()
      };
      
      this.tg.sendData(JSON.stringify(statisticsData));
      console.log('📊 Statistics sent to bot');
      
    } catch (error) {
      console.error('❌ Failed to send statistics:', error);
    }
  }

  // Собрать статистику игры
  gatherGameStatistics(gameCore) {
    const gameState = gameCore.gameState;
    const resources = gameState.resources || {};
    
    // Подсчитываем общие ресурсы
    const totalResources = Object.values(resources).reduce((sum, val) => sum + (val || 0), 0);
    
    // Подсчитываем общие уровни зданий
    const buildingLevels = Object.values(gameState.buildings || {})
      .reduce((sum, building) => sum + (building.level || 0), 0);
    
    // Подсчитываем общие уровни навыков
    const skillLevels = Object.values(gameState.skills || {})
      .reduce((sum, skill) => sum + (skill.level || 0), 0);
    
    return {
      totalResources,
      maxCombo: gameState.combo?.count || 0,
      totalClicks: gameState.achievements?.statistics?.totalClicks || 0,
      buildingLevels,
      skillLevels,
      raidsCompleted: gameState.raids?.statistics?.totalRaids || 0,
      peopleLost: gameState.raids?.statistics?.peopleLost || 0,
      // Приблизительное время игры (основано на общем прогрессе)
      playtimeEstimate: Math.floor((totalResources + buildingLevels * 100 + skillLevels * 200) / 60)
    };
  }

  // Показать лидерборд
  showLeaderboard() {
    try {
      const leaderboardData = {
        type: 'show_leaderboard',
        userId: this.user.id,
        timestamp: Date.now()
      };
      
      this.tg.sendData(JSON.stringify(leaderboardData));
      console.log('🏆 Leaderboard requested');
      
    } catch (error) {
      console.error('❌ Failed to show leaderboard:', error);
    }
  }

  // Экспорт данных игры
  exportGameData() {
    try {
      const gameCore = window.gameCore;
      if (!gameCore || !gameCore.gameState) {
        throw new Error('Game not ready');
      }
      
      const exportData = {
        type: 'game_export',
        userId: this.user.id,
        data: gameCore.gameState.getSaveData(),
        stats: this.gatherGameStatistics(gameCore),
        timestamp: Date.now()
      };
      
      this.tg.sendData(JSON.stringify(exportData));
      console.log('📤 Game data exported');
      
    } catch (error) {
      console.error('❌ Export failed:', error);
      this.showHapticFeedback('error');
    }
  }

  // Отправить отчет об ошибке
  reportError(error) {
    try {
      const errorData = {
        type: 'error_report',
        userId: this.user.id,
        error: {
          message: error.message || 'Unknown error',
          stack: error.stack || 'No stack trace',
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent
        },
        gameState: this.getGameStateSnapshot()
      };
      
      this.tg.sendData(JSON.stringify(errorData));
      console.log('🐛 Error report sent');
      
    } catch (reportError) {
      console.error('❌ Failed to send error report:', reportError);
    }
  }

  // Получить снимок состояния игры для отчета об ошибке
  getGameStateSnapshot() {
    try {
      const gameCore = window.gameCore;
      if (!gameCore || !gameCore.gameState) return null;
      
      return {
        hasResources: !!gameCore.gameState.resources,
        resourceCount: Object.keys(gameCore.gameState.resources || {}).length,
        skillPoints: gameCore.gameState.skillPoints || 0,
        combo: gameCore.gameState.combo?.count || 0,
        buildingCount: Object.keys(gameCore.gameState.buildings || {}).length,
        skillCount: Object.keys(gameCore.gameState.skills || {}).length,
        activeBuffs: (gameCore.gameState.buffs || []).length,
        activeDebuffs: (gameCore.gameState.debuffs || []).length
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  // Вибрация для обратной связи
  showHapticFeedback(type = 'selection') {
    try {
      if (this.tg.HapticFeedback) {
        switch (type) {
          case 'success':
            this.tg.HapticFeedback.notificationOccurred('success');
            break;
          case 'error':
            this.tg.HapticFeedback.notificationOccurred('error');
            break;
          case 'warning':
            this.tg.HapticFeedback.notificationOccurred('warning');
            break;
          case 'impact':
            this.tg.HapticFeedback.impactOccurred('medium');
            break;
          default:
            this.tg.HapticFeedback.selectionChanged();
        }
      }
    } catch (error) {
      console.warn('⚠️ Haptic feedback not available:', error);
    }
  }

  // Включить вибрацию для всех кликов
  enableHapticFeedback() {
    document.addEventListener('click', (e) => {
      // Вибрация для кнопок и интерактивных элементов
      if (e.target.matches('button, .buy-button, .item-card, .resource-display')) {
        this.showHapticFeedback('selection');
      }
    });
    
    // Особая вибрация для попаданий в цель
    if (typeof window.eventBus !== 'undefined') {
      window.eventBus.subscribe('zone:hit', (data) => {
        if (data.isTarget) {
          this.showHapticFeedback('impact');
        }
      });
    }
  }

  // Обработка кнопки назад
  handleBackButton() {
    const gameCore = window.gameCore;
    if (gameCore && gameCore.managers && gameCore.managers.ui) {
      const currentPanel = gameCore.managers.ui.getCurrentPanel();
      
      if (currentPanel) {
        // Закрываем текущую панель
        gameCore.managers.ui.hidePanel();
        this.tg.BackButton.hide();
      } else {
        // Закрываем Web App
        this.tg.close();
      }
    } else {
      this.tg.close();
    }
  }

  // Обработка изменения размера viewport
  handleViewportChange() {
    const gameArea = document.getElementById('game-area');
    if (gameArea) {
      gameArea.style.minHeight = `${this.tg.viewportHeight}px`;
    }
    
    // Перерисовываем canvas если нужно
    const gameCore = window.gameCore;
    if (gameCore && gameCore.gameLoop) {
      gameCore.gameLoop.forceRedraw();
    }
  }

  // Показать главную кнопку с текстом
  showMainButton(text, callback) {
    this.tg.MainButton.setText(text);
    this.tg.MainButton.show();
    
    this.tg.MainButton.onClick(() => {
      if (callback) callback();
    });
  }

  // Скрыть главную кнопку
  hideMainButton() {
    this.tg.MainButton.hide();
    this.tg.MainButton.hideProgress();
  }

  // Mock режим для тестирования вне Telegram
  initializeMockMode() {
    console.log('🧪 Initializing mock mode for testing');
    
    this.tg = {
      version: '6.0-mock',
      expand: () => console.log('Mock: expand()'),
      close: () => console.log('Mock: close()'),
      sendData: (data) => console.log('Mock: sendData', data),
      MainButton: {
        show: () => console.log('Mock: MainButton.show()'),
        hide: () => console.log('Mock: MainButton.hide()'),
        setText: (text) => console.log('Mock: MainButton.setText', text),
        showProgress: () => console.log('Mock: MainButton.showProgress()'),
        hideProgress: () => console.log('Mock: MainButton.hideProgress()'),
        onClick: (callback) => console.log('Mock: MainButton.onClick', callback)
      },
      BackButton: {
        show: () => console.log('Mock: BackButton.show()'),
        hide: () => console.log('Mock: BackButton.hide()'),
        onClick: (callback) => console.log('Mock: BackButton.onClick', callback)
      },
      HapticFeedback: {
        selectionChanged: () => console.log('Mock: haptic selection'),
        impactOccurred: (style) => console.log('Mock: haptic impact', style),
        notificationOccurred: (type) => console.log('Mock: haptic notification', type)
      },
      viewportHeight: window.innerHeight,
      onEvent: (event, callback) => console.log('Mock: onEvent', event, callback),
      enableClosingConfirmation: () => console.log('Mock: enableClosingConfirmation()'),
      setHeaderColor: (color) => console.log('Mock: setHeaderColor', color),
      setBackgroundColor: (color) => console.log('Mock: setBackgroundColor', color)
    };
    
    this.user = {
      id: 'mock_user_123',
      firstName: 'Mock',
      lastName: 'User',
      username: 'mock_user',
      languageCode: 'en',
      isPremium: false
    };
    
    this.isInitialized = true;
  }

  // Интеграция с игровыми событиями
  setupGameIntegration() {
    if (typeof window.eventBus === 'undefined') {
      console.warn('⚠️ EventBus not available for integration');
      return;
    }
    
    const eventBus = window.eventBus;
    
    // Отправляем статистику при достижениях
    eventBus.subscribe('achievement:unlocked', () => {
      this.sendGameStatistics();
    });
    
    // Автосохранение при важных событиях
    eventBus.subscribe('building:bought', () => {
      this.performCloudSave();
    });
    
    eventBus.subscribe('skill:bought', () => {
      this.performCloudSave();
    });
    
    eventBus.subscribe('raid:completed', () => {
      this.performCloudSave();
      this.sendGameStatistics();
    });
    
    // Вибрация для специальных событий
    eventBus.subscribe('critical_hit', () => {
      this.showHapticFeedback('impact');
    });
    
    eventBus.subscribe('buff_applied', () => {
      this.showHapticFeedback('success');
    });
    
    eventBus.subscribe('debuff_applied', () => {
      this.showHapticFeedback('warning');
    });
    
    console.log('🎮 Game integration set up');
  }

  // Создать быстрые действия в интерфейсе
  createQuickActions() {
    const quickActionsContainer = document.createElement('div');
    quickActionsContainer.id = 'telegram-quick-actions';
    quickActionsContainer.innerHTML = `
      <div class="quick-actions-panel">
        <button id="cloud-save-btn" class="quick-action-btn">☁️ Save</button>
        <button id="cloud-load-btn" class="quick-action-btn">📥 Load</button>
        <button id="leaderboard-btn" class="quick-action-btn">🏆 Top</button>
        <button id="export-btn" class="quick-action-btn">📤 Export</button>
      </div>
    `;
    
    quickActionsContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      background: rgba(0,0,0,0.1);
      padding: 8px;
      border-radius: 20px;
      backdrop-filter: blur(10px);
    `;
    
    document.body.appendChild(quickActionsContainer);
    
    // Привязываем обработчики
    document.getElementById('cloud-save-btn').onclick = () => {
      this.performCloudSave(true);
      this.showHapticFeedback('success');
    };
    
    document.getElementById('cloud-load-btn').onclick = () => {
      this.loadFromCloud();
    };
    
    document.getElementById('leaderboard-btn').onclick = () => {
      this.showLeaderboard();
    };
    
    document.getElementById('export-btn').onclick = () => {
      this.exportGameData();
    };
  }

  // Получить информацию об интеграции
  getIntegrationInfo() {
    return {
      isInitialized: this.isInitialized,
      isTelegram: typeof window.Telegram?.WebApp !== 'undefined',
      user: this.user,
      viewportHeight: this.tg?.viewportHeight || window.innerHeight,
      version: this.tg?.version || 'unknown',
      lastCloudSave: this.lastCloudSave,
      cloudSaveInterval: !!this.cloudSaveInterval
    };
  }

  // Очистка ресурсов
  destroy() {
    if (this.cloudSaveInterval) {
      clearInterval(this.cloudSaveInterval);
      this.cloudSaveInterval = null;
    }
    
    if (this.tg?.MainButton) {
      this.tg.MainButton.hide();
    }
    
    if (this.tg?.BackButton) {
      this.tg.BackButton.hide();
    }
    
    console.log('🧹 Telegram Web App integration destroyed');
  }
}

// Глобальная инициализация
let telegramWebApp = null;

// Инициализация при загрузке
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    telegramWebApp = new TelegramWebApp();
    window.telegramWebApp = telegramWebApp;
  });
} else {
  telegramWebApp = new TelegramWebApp();
  window.telegramWebApp = telegramWebApp;
}

// Экспорт для использования в модулях
export { TelegramWebApp };
export default telegramWebApp;