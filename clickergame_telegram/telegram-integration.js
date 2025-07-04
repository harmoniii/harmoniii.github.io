// telegram-integration.js - Полная интеграция с Telegram Web App
import { TelegramWebApp } from './telegram-webapp.js';

class TelegramIntegration {
  constructor() {
    this.telegramWebApp = null;
    this.gameCore = null;
    this.isInitialized = false;
    this.loadingProgress = 0;
    
    // Элементы интерфейса
    this.loadingScreen = null;
    this.errorScreen = null;
    this.gameArea = null;
    
    console.log('📱 Initializing Telegram Integration...');
    this.initialize();
  }

  async initialize() {
    try {
      // Показываем загрузочный экран
      this.showLoadingScreen();
      
      // Инициализируем Telegram Web App
      await this.initializeTelegramWebApp();
      this.updateProgress(20);
      
      // Инициализируем игру
      await this.initializeGame();
      this.updateProgress(60);
      
      // Настраиваем интеграцию
      await this.setupIntegration();
      this.updateProgress(80);
      
      // Завершаем инициализацию
      await this.finishInitialization();
      this.updateProgress(100);
      
      this.hideLoadingScreen();
      this.isInitialized = true;
      
      console.log('✅ Telegram Integration initialized successfully');
      
    } catch (error) {
      console.error('❌ Telegram Integration failed:', error);
      this.showErrorScreen(error);
    }
  }

  showLoadingScreen() {
    this.loadingScreen = document.getElementById('telegram-loading');
    if (this.loadingScreen) {
      this.loadingScreen.classList.remove('hidden');
    }
  }

  hideLoadingScreen() {
    if (this.loadingScreen) {
      this.loadingScreen.classList.add('hidden');
    }
  }

  showErrorScreen(error) {
    this.errorScreen = document.getElementById('telegram-error');
    const errorMessage = document.getElementById('error-message');
    
    if (this.errorScreen && errorMessage) {
      errorMessage.textContent = error.message || 'Unknown error occurred';
      this.errorScreen.classList.remove('hidden');
    }
    
    if (this.loadingScreen) {
      this.loadingScreen.classList.add('hidden');
    }
  }

  updateProgress(progress) {
    this.loadingProgress = Math.min(100, Math.max(0, progress));
    
    const progressBar = document.getElementById('loading-progress');
    if (progressBar) {
      progressBar.style.width = `${this.loadingProgress}%`;
    }
  }

  async initializeTelegramWebApp() {
    console.log('📱 Initializing Telegram Web App...');
    
    // Создаем экземпляр Telegram Web App
    this.telegramWebApp = new TelegramWebApp();
    
    // Ждем инициализации
    if (!this.telegramWebApp.isInitialized) {
      throw new Error('Failed to initialize Telegram Web App');
    }
    
    // Экспортируем глобально
    window.telegramWebApp = this.telegramWebApp;
    
    console.log('✅ Telegram Web App initialized');
  }

  async initializeGame() {
    console.log('🎮 Initializing game...');
    
    // Ждем загрузки игры
    return new Promise((resolve, reject) => {
      const checkGame = () => {
        if (window.gameCore && window.gameCore.isGameActive()) {
          this.gameCore = window.gameCore;
          console.log('✅ Game initialized');
          resolve();
        } else if (window.gameCore) {
          // Игра загрузилась но не активна, ждем еще
          setTimeout(checkGame, 100);
        } else {
          // Игра еще не загрузилась
          setTimeout(checkGame, 100);
        }
      };
      
      checkGame();
      
      // Таймаут безопасности
      setTimeout(() => {
        if (!this.gameCore) {
          reject(new Error('Game initialization timeout'));
        }
      }, 10000);
    });
  }

  async setupIntegration() {
    console.log('🔗 Setting up Telegram integration...');
    
    // Настраиваем интеграцию с игрой
    if (this.telegramWebApp && this.gameCore) {
      this.telegramWebApp.setupGameIntegration();
    }
    
    // Создаем быстрые действия
    this.createTelegramControls();
    
    // Настраиваем обработчики событий
    this.setupEventHandlers();
    
    // Адаптируем UI для Telegram
    this.adaptUIForTelegram();
    
    console.log('✅ Telegram integration set up');
  }

  async finishInitialization() {
    console.log('🏁 Finishing initialization...');
    
    // Проверяем облачные сохранения
    await this.checkCloudSaves();
    
    // Отправляем начальную статистику
    this.sendInitialStats();
    
    // Настраиваем автосохранение
    this.setupAutoSave();
    
    console.log('✅ Initialization finished');
  }

  createTelegramControls() {
    // Создаем контролы для Telegram
    const controlsHtml = `
      <div id="telegram-controls" class="telegram-controls">
        <button id="cloud-save-btn" class="telegram-btn">☁️ Cloud Save</button>
        <button id="leaderboard-btn" class="telegram-btn">🏆 Leaders</button>
        <button id="share-btn" class="telegram-btn">📤 Share</button>
      </div>
    `;
    
    const existingControls = document.getElementById('telegram-controls');
    if (!existingControls) {
      document.body.insertAdjacentHTML('beforeend', controlsHtml);
    }
    
    // Привязываем обработчики
    this.bindTelegramControls();
  }

  bindTelegramControls() {
    const cloudSaveBtn = document.getElementById('cloud-save-btn');
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    const shareBtn = document.getElementById('share-btn');
    
    if (cloudSaveBtn) {
      cloudSaveBtn.addEventListener('click', () => {
        this.performCloudSave();
      });
    }
    
    if (leaderboardBtn) {
      leaderboardBtn.addEventListener('click', () => {
        this.showLeaderboard();
      });
    }
    
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        this.shareGame();
      });
    }
  }

  setupEventHandlers() {
    // Обработчики игровых событий для Telegram
    if (typeof window.eventBus !== 'undefined') {
      const eventBus = window.eventBus;
      
      // Важные события игры
      eventBus.subscribe('achievement:unlocked', (data) => {
        this.onAchievementUnlocked(data);
      });
      
      eventBus.subscribe('building:bought', () => {
        this.onGameProgress();
      });
      
      eventBus.subscribe('skill:bought', () => {
        this.onGameProgress();
      });
      
      eventBus.subscribe('raid:completed', (data) => {
        this.onRaidCompleted(data);
      });
      
      // Критические события требующие сохранения
      eventBus.subscribe('combo_changed', (data) => {
        if (data.count && data.count % 10 === 0) {
          this.performCloudSave();
        }
      });
    }
    
    // Обработчики Telegram Web App
    if (this.telegramWebApp.tg) {
      this.telegramWebApp.tg.onEvent('mainButtonClicked', () => {
        this.onMainButtonClick();
      });
      
      this.telegramWebApp.tg.onEvent('backButtonClicked', () => {
        this.onBackButtonClick();
      });
      
      this.telegramWebApp.tg.onEvent('settingsButtonClicked', () => {
        this.onSettingsButtonClick();
      });
    }
  }

  adaptUIForTelegram() {
    // Адаптируем UI специально для Telegram
    const gameArea = document.getElementById('game-area');
    if (gameArea) {
      gameArea.classList.add('telegram-webapp');
    }
    
    // Скрываем или адаптируем элементы не нужные в Telegram
    const controlsBottom = document.getElementById('controls-bottom');
    if (controlsBottom) {
      controlsBottom.style.display = 'none';
    }
    
    // Адаптируем навигацию
    const topNav = document.getElementById('ui-top');
    if (topNav) {
      topNav.classList.add('telegram-nav');
    }
    
    // Адаптируем canvas
    const gameCanvas = document.getElementById('gameCanvas');
    if (gameCanvas) {
      gameCanvas.classList.add('telegram-canvas');
    }
  }

  async checkCloudSaves() {
    console.log('☁️ Checking cloud saves...');
    
    try {
      // Отправляем запрос на загрузку облачных данных
      const loadRequest = {
        type: 'load_request',
        userId: this.telegramWebApp.user.id,
        timestamp: Date.now()
      };
      
      // Отправляем через Telegram Web App API
      this.telegramWebApp.tg.sendData(JSON.stringify(loadRequest));
      
      console.log('☁️ Cloud save request sent');
      
    } catch (error) {
      console.warn('⚠️ Cloud save check failed:', error);
    }
  }

  sendInitialStats() {
    if (this.telegramWebApp && this.gameCore) {
      try {
        this.telegramWebApp.sendGameStatistics();
        console.log('📊 Initial statistics sent');
      } catch (error) {
        console.warn('⚠️ Failed to send initial stats:', error);
      }
    }
  }

  setupAutoSave() {
    // Автосохранение каждые 2 минуты
    setInterval(() => {
      this.performCloudSave();
    }, 120000);
    
    // Сохранение при важных событиях
    window.addEventListener('beforeunload', () => {
      this.performCloudSave(true);
    });
    
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.performCloudSave();
      }
    });
  }

  async performCloudSave(force = false) {
    if (!this.telegramWebApp || !this.gameCore) return;
    
    try {
      console.log('☁️ Performing cloud save...');
      
      await this.telegramWebApp.performCloudSave(force);
      
      // Показываем уведомление об успехе
      if (window.eventBus) {
        window.eventBus.emit('notification', '☁️ Saved to cloud!');
      }
      
    } catch (error) {
      console.error('❌ Cloud save failed:', error);
      if (window.eventBus) {
        window.eventBus.emit('notification', '❌ Cloud save failed');
      }
    }
  }

  showLeaderboard() {
    if (this.telegramWebApp) {
      try {
        this.telegramWebApp.showLeaderboard();
        
        // Также показываем модальное окно в игре
        this.showLeaderboardModal();
        
      } catch (error) {
        console.error('❌ Failed to show leaderboard:', error);
      }
    }
  }

  showLeaderboardModal() {
    const modal = document.getElementById('leaderboard-modal');
    if (modal) {
      modal.classList.remove('hidden');
      
      const content = document.getElementById('leaderboard-content');
      if (content) {
        content.innerHTML = `
          <p>🏆 Loading leaderboard...</p>
          <div class="loading-spinner small"></div>
          <p><small>Data will be shown in Telegram bot chat</small></p>
        `;
      }
      
      // Автозакрытие через 3 секунды
      setTimeout(() => {
        modal.classList.add('hidden');
      }, 3000);
    }
  }

  shareGame() {
    if (this.telegramWebApp) {
      try {
        // Получаем статистику игры
        const stats = this.gatherGameStats();
        
        // Формируем сообщение для шара
        const shareMessage = this.formatShareMessage(stats);
        
        // Отправляем через Telegram
        const shareData = {
          type: 'share_game',
          userId: this.telegramWebApp.user.id,
          message: shareMessage,
          stats: stats,
          timestamp: Date.now()
        };
        
        this.telegramWebApp.tg.sendData(JSON.stringify(shareData));
        
        if (window.eventBus) {
          window.eventBus.emit('notification', '📤 Game shared!');
        }
        
      } catch (error) {
        console.error('❌ Failed to share game:', error);
      }
    }
  }

  gatherGameStats() {
    if (!this.gameCore) return {};
    
    const gameState = this.gameCore.getGameState();
    const resources = gameState.resources || {};
    
    return {
      totalResources: Object.values(resources).reduce((sum, val) => sum + (val || 0), 0),
      maxCombo: gameState.combo?.count || 0,
      skillPoints: gameState.skillPoints || 0,
      buildingCount: Object.keys(gameState.buildings || {}).length,
      skillCount: Object.keys(gameState.skills || {}).length,
      raidsCompleted: gameState.raids?.statistics?.totalRaids || 0
    };
  }

  formatShareMessage(stats) {
    return `🎮 Playing Grid Clicker in Telegram!

📊 My progress:
💰 Total Resources: ${stats.totalResources.toLocaleString()}
🔥 Max Combo: ${stats.maxCombo}
✨ Skill Points: ${stats.skillPoints}
🏗️ Buildings: ${stats.buildingCount}
🎯 Skills: ${stats.skillCount}
⚔️ Raids: ${stats.raidsCompleted}

Join me in this awesome clicking adventure!`;
  }

  // Обработчики событий
  onAchievementUnlocked(data) {
    if (this.telegramWebApp) {
      this.telegramWebApp.showHapticFeedback('success');
      
      // Отправляем обновленную статистику
      setTimeout(() => {
        this.telegramWebApp.sendGameStatistics();
      }, 1000);
    }
  }

  onGameProgress() {
    // При значительном прогрессе делаем облачное сохранение
    this.performCloudSave();
  }

  onRaidCompleted(data) {
    if (this.telegramWebApp) {
      this.telegramWebApp.showHapticFeedback('success');
      
      // Принудительное сохранение после рейда
      this.performCloudSave(true);
    }
  }

  onMainButtonClick() {
    // Обработка главной кнопки Telegram
    console.log('📱 Main button clicked');
  }

  onBackButtonClick() {
    // Обработка кнопки назад
    const gameCore = window.gameCore;
    if (gameCore && gameCore.managers && gameCore.managers.ui) {
      const currentPanel = gameCore.managers.ui.getCurrentPanel();
      
      if (currentPanel) {
        gameCore.managers.ui.hidePanel();
      } else {
        this.telegramWebApp.tg.close();
      }
    }
  }

  onSettingsButtonClick() {
    // Показываем настройки игры
    const gameCore = window.gameCore;
    if (gameCore && gameCore.managers && gameCore.managers.ui) {
      gameCore.managers.ui.showPanel('info');
    }
  }

  // Обработка данных от бота
  handleBotData(data) {
    try {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      
      switch (parsedData.type) {
        case 'cloud_save_data':
          this.loadCloudSave(parsedData.saveData);
          break;
          
        case 'leaderboard_data':
          this.displayLeaderboard(parsedData.leaderboard);
          break;
          
        case 'user_stats':
          this.displayUserStats(parsedData.stats);
          break;
          
        default:
          console.log('📱 Unknown data from bot:', parsedData.type);
      }
      
    } catch (error) {
      console.error('❌ Error handling bot data:', error);
    }
  }

  loadCloudSave(saveData) {
    if (!this.gameCore || !saveData) return;
    
    try {
      console.log('☁️ Loading cloud save data...');
      
      // Загружаем данные в игру
      if (this.gameCore.storageManager) {
        const importedData = this.gameCore.storageManager.importFromString(saveData);
        this.gameCore.gameState.loadSaveData(importedData);
        
        if (window.eventBus) {
          window.eventBus.emit('notification', '☁️ Cloud save loaded!');
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to load cloud save:', error);
      if (window.eventBus) {
        window.eventBus.emit('notification', '❌ Failed to load cloud save');
      }
    }
  }

  displayLeaderboard(leaderboard) {
    const modal = document.getElementById('leaderboard-modal');
    const content = document.getElementById('leaderboard-content');
    
    if (modal && content && leaderboard) {
      modal.classList.remove('hidden');
      
      content.innerHTML = `
        <div class="leaderboard-list">
          ${leaderboard.map((player, index) => `
            <div class="leaderboard-item">
              <span class="rank">${index + 1}.</span>
              <span class="name">${player.name}</span>
              <span class="score">${player.score.toLocaleString()}</span>
            </div>
          `).join('')}
        </div>
      `;
    }
  }

  displayUserStats(stats) {
    if (window.eventBus && stats) {
      const message = `📊 Your Rank: #${stats.rank} | Score: ${stats.score.toLocaleString()}`;
      window.eventBus.emit('notification', message);
    }
  }

  // Методы для тестирования
  getIntegrationStatus() {
    return {
      isInitialized: this.isInitialized,
      hasTelegramWebApp: !!this.telegramWebApp,
      hasGameCore: !!this.gameCore,
      telegramUser: this.telegramWebApp?.user || null,
      gameReady: this.gameCore?.isGameActive() || false,
      loadingProgress: this.loadingProgress
    };
  }

  // Экстренное восстановление
  emergencyRestore() {
    if (this.telegramWebApp && this.gameCore) {
      try {
        console.log('🚨 Emergency restore initiated...');
        
        // Принудительное облачное сохранение
        this.performCloudSave(true);
        
        // Отправка статистики
        this.telegramWebApp.sendGameStatistics();
        
        console.log('✅ Emergency restore completed');
        
      } catch (error) {
        console.error('❌ Emergency restore failed:', error);
      }
    }
  }

  // Деструктор
  destroy() {
    if (this.telegramWebApp) {
      this.telegramWebApp.destroy();
    }
    
    console.log('🧹 Telegram Integration destroyed');
  }
}

// Инициализация при загрузке
let telegramIntegration = null;

// Автоматическая инициализация
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    telegramIntegration = new TelegramIntegration();
    window.telegramIntegration = telegramIntegration;
  });
} else {
  telegramIntegration = new TelegramIntegration();
  window.telegramIntegration = telegramIntegration;
}

// Глобальные функции для отладки
window.getTelegramStatus = () => {
  return telegramIntegration?.getIntegrationStatus() || 'Not initialized';
};

window.performEmergencyRestore = () => {
  return telegramIntegration?.emergencyRestore() || 'Not available';
};

// Обработка retry кнопки
document.addEventListener('DOMContentLoaded', () => {
  const retryBtn = document.getElementById('retry-button');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      location.reload();
    });
  }
});

// Экспорт для использования в модулях
export { TelegramIntegration };
export default telegramIntegration;