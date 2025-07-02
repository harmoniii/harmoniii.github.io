// telegram-integration.js - Обновленная интеграция с облачными сохранениями
import { TelegramWebApp } from './telegram-webapp.js';
import { TelegramCloudSaveManager } from './ui/TelegramCloudSaveManager.js';

class TelegramGameIntegration {
  constructor() {
    this.telegramWebApp = null;
    this.cloudSaveManager = null;
    this.gameCore = null;
    this.isInitialized = false;
    this.leaderboardData = null;
    
    this.initialize();
  }

  async initialize() {
    try {
      console.log('📱 Initializing Telegram Game Integration...');
      
      // Инициализируем Telegram Web App
      this.telegramWebApp = new TelegramWebApp();
      
      // Ждем инициализации игры
      await this.waitForGameCore();
      
      // Инициализируем облачные сохранения
      this.initializeCloudSaves();
      
      // Настраиваем UI для Telegram
      this.setupTelegramUI();
      
      // Настраиваем события
      this.bindEvents();
      
      // Настраиваем лидерборд
      this.setupLeaderboard();
      
      this.isInitialized = true;
      console.log('✅ Telegram Game Integration initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Telegram integration:', error);
    }
  }

  async waitForGameCore() {
    return new Promise((resolve) => {
      const checkGameCore = () => {
        if (window.gameCore && window.gameCore.gameState) {
          this.gameCore = window.gameCore;
          console.log('🎮 Game core found');
          resolve();
        } else {
          setTimeout(checkGameCore, 100);
        }
      };
      checkGameCore();
    });
  }

  initializeCloudSaves() {
    if (!this.gameCore || !this.telegramWebApp) {
      console.warn('⚠️ Cannot initialize cloud saves - missing dependencies');
      return;
    }
    
    // Создаем менеджер облачных сохранений
    this.cloudSaveManager = new TelegramCloudSaveManager(
      this.gameCore.gameState, 
      this.telegramWebApp
    );
    
    // Добавляем в gameCore для доступа
    this.gameCore.cloudSaveManager = this.cloudSaveManager;
    
    // Регистрируем для очистки
    if (this.gameCore.cleanupManager) {
      this.gameCore.cleanupManager.registerComponent(this.cloudSaveManager, 'CloudSaveManager');
    }
    
    console.log('☁️ Cloud save manager initialized');
  }

  setupTelegramUI() {
    // Настраиваем Telegram кнопки
    this.setupMainButton();
    this.setupBackButton();
    
    // Создаем быстрые действия
    this.createQuickActions();
    
    // Настраиваем меню Telegram
    this.setupTelegramMenu();
    
    // Адаптируем для мобильных
    this.adaptForMobile();
  }

  setupMainButton() {
    if (!this.telegramWebApp.tg) return;
    
    const mainButton = this.telegramWebApp.tg.MainButton;
    
    // Показываем кнопку облачного сохранения
    mainButton.setText('☁️ Save to Cloud');
    mainButton.onClick(() => {
      if (this.cloudSaveManager) {
        this.cloudSaveManager.forceSyncToCloud();
      }
    });
    
    // Показываем кнопку только когда есть изменения для сохранения
    this.showMainButtonOnChanges();
  }

  setupBackButton() {
    if (!this.telegramWebApp.tg) return;
    
    const backButton = this.telegramWebApp.tg.BackButton;
    
    backButton.onClick(() => {
      // Закрываем открытые панели
      if (this.gameCore.managers?.ui?.isPanelOpen()) {
        this.gameCore.managers.ui.hidePanel();
        backButton.hide();
      } else {
        // Закрываем приложение
        this.telegramWebApp.tg.close();
      }
    });
  }

  createQuickActions() {
    // Создаем панель быстрых действий в UI
    const quickActionsHTML = `
      <div id="telegram-quick-actions" class="telegram-quick-actions">
        <button id="cloud-save-btn" class="quick-action-btn" title="Save to Cloud">
          ☁️
        </button>
        <button id="cloud-load-btn" class="quick-action-btn" title="Load from Cloud">
          📥
        </button>
        <button id="leaderboard-btn" class="quick-action-btn" title="Show Leaderboard">
          🏆
        </button>
        <button id="share-btn" class="quick-action-btn" title="Share Achievement">
          📤
        </button>
      </div>
    `;
    
    // Добавляем в DOM
    const quickActionsContainer = document.createElement('div');
    quickActionsContainer.innerHTML = quickActionsHTML;
    document.body.appendChild(quickActionsContainer.firstElementChild);
    
    // Привязываем обработчики
    this.bindQuickActionHandlers();
  }

  bindQuickActionHandlers() {
    const cloudSaveBtn = document.getElementById('cloud-save-btn');
    const cloudLoadBtn = document.getElementById('cloud-load-btn');
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    const shareBtn = document.getElementById('share-btn');
    
    if (cloudSaveBtn) {
      cloudSaveBtn.onclick = () => {
        this.cloudSaveManager?.forceSyncToCloud();
        this.telegramWebApp.showHapticFeedback('selection');
      };
    }
    
    if (cloudLoadBtn) {
      cloudLoadBtn.onclick = () => {
        this.cloudSaveManager?.forceLoadFromCloud();
        this.telegramWebApp.showHapticFeedback('selection');
      };
    }
    
    if (leaderboardBtn) {
      leaderboardBtn.onclick = () => {
        this.showLeaderboard();
        this.telegramWebApp.showHapticFeedback('selection');
      };
    }
    
    if (shareBtn) {
      shareBtn.onclick = () => {
        this.shareProgress();
        this.telegramWebApp.showHapticFeedback('selection');
      };
    }
  }

  setupTelegramMenu() {
    // Создаем меню Telegram
    const menuHTML = `
      <div id="telegram-menu" class="telegram-menu hidden">
        <div class="menu-content">
          <h3>⚙️ Grid Clicker Menu</h3>
          <button id="cloud-sync-btn" class="menu-btn">
            ☁️ Cloud Sync Status
          </button>
          <button id="export-data-btn" class="menu-btn">
            📤 Export Game Data
          </button>
          <button id="view-stats-btn" class="menu-btn">
            📊 View Statistics
          </button>
          <button id="telegram-help-btn" class="menu-btn">
            ❓ Help & Rules
          </button>
          <button id="close-menu-btn" class="menu-btn close-btn">
            ✖️ Close
          </button>
        </div>
      </div>
    `;
    
    const menuContainer = document.createElement('div');
    menuContainer.innerHTML = menuHTML;
    document.body.appendChild(menuContainer.firstElementChild);
    
    // Привязываем обработчики меню
    this.bindMenuHandlers();
  }

  bindMenuHandlers() {
    const menu = document.getElementById('telegram-menu');
    const closeBtn = document.getElementById('close-menu-btn');
    const cloudSyncBtn = document.getElementById('cloud-sync-btn');
    const exportBtn = document.getElementById('export-data-btn');
    const statsBtn = document.getElementById('view-stats-btn');
    const helpBtn = document.getElementById('telegram-help-btn');
    
    // Создаем кнопку открытия меню
    const menuTog