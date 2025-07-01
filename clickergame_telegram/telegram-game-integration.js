// telegram-game-integration.js - Интеграция игры с Telegram Web App
import { GridGameCore } from './core/GridGameCore.js';
import { eventBus, GameEvents } from './core/GameEvents.js';
// Теперь используем обновленный StorageManager с поддержкой Telegram
import { StorageManager } from './core/StorageManager.js';

// Глобальные переменные
let gameCore = null;
let telegramStorageManager = null;

// Основная функция инициализации для Telegram
export async function initializeTelegramGame() {
  try {
    console.log('🤖 Starting Grid Clicker for Telegram Web App...');
    
    // Проверяем наличие Telegram Web App API
    if (!window.telegramAdapter) {
      throw new Error('Telegram Web App adapter not initialized');
    }

    // Устанавливаем обработчики ошибок
    setupTelegramErrorHandlers();
    
    // Создаем Storage Manager с поддержкой Telegram
    telegramStorageManager = new StorageManager();
    
    // Создаем игровое ядро
    gameCore = new GridGameCore();
    
    // Заменяем стандартный StorageManager на Telegram версию
    if (gameCore.storageManager) {
      gameCore.storageManager = telegramStorageManager;
    }
    
    // Загружаем сохранённую игру из облака
    await loadGameFromCloud();
    
    // Настраиваем автосохранение в облако
    setupCloudAutoSave();
    
    // Настраиваем события Telegram
    setupTelegramEvents();
    
    // Экспортируем для отладки
    window.gameCore = gameCore;
    window.telegramStorageManager = telegramStorageManager;
    window.eventBus = eventBus;
    window.GameEvents = GameEvents;
    
    // Включаем режим отладки
    if (gameCore && typeof gameCore.enableDebugMode === 'function') {
      gameCore.enableDebugMode();
    }
    
    console.log('✅ Telegram Grid Clicker initialized successfully');
    
    // Уведомляем Telegram о готовности
    window.telegramAdapter.hapticFeedback('success');
    
    return gameCore;
    
  } catch (error) {
    console.error('💀 Critical error initializing Telegram game:', error);
    handleTelegramError(error);
    throw error;
  }
}

// Загрузка игры из облачного хранилища
async function loadGameFromCloud() {
  try {
    console.log('☁️ Loading game from Telegram cloud...');
    
    // Синхронизируем хранилища
    const saveData = await telegramStorageManager.syncStorages();
    
    if (saveData && gameCore.gameState) {
      // Проверяем, не очищено ли сохранение
      if (saveData.cleared) {
        console.log('🗑️ Cloud storage was cleared, starting fresh game');
        return;
      }
      
      gameCore.gameState.loadSaveData(saveData);
      console.log('✅ Game loaded from cloud storage');
      
      // Показываем уведомление пользователю
      eventBus.emit(GameEvents.NOTIFICATION, '☁️ Game loaded from cloud!');
      window.telegramAdapter.hapticFeedback('success');
      
      // Сохраняем статистику загрузки
      const userStats = await telegramStorageManager.loadUserStats() || {};
      userStats.lastCloudLoad = Date.now();
      userStats.totalCloudLoads = (userStats.totalCloudLoads || 0) + 1;
      await telegramStorageManager.saveUserStats(userStats);
    }
    
  } catch (error) {
    console.error('❌ Failed to load game from cloud:', error);
    eventBus.emit(GameEvents.NOTIFICATION, '⚠️ Cloud load failed, using local save');
  }
}

// Настройка автосохранения в облако
function setupCloudAutoSave() {
  // Автосохранение каждые 2 минуты
  setInterval(async () => {
    if (gameCore && gameCore.gameState && !gameCore.gameState.isDestroyed) {
      try {
        await telegramStorageManager.autoSaveToCloud(gameCore.gameState);
      } catch (error) {
        console.error('❌ Cloud auto-save failed:', error);
      }
    }
  }, 120000); // 2 минуты

  // Сохранение при важных событиях игры
  const importantEvents = [
    GameEvents.BUILDING_BOUGHT,
    GameEvents.SKILL_BOUGHT,
    'raid:completed',
    GameEvents.ACHIEVEMENT_UNLOCKED
  ];

  importantEvents.forEach(event => {
    eventBus.subscribe(event, async () => {
      try {
        await telegramStorageManager.autoSaveToCloud(gameCore.gameState);
        console.log(`☁️ Auto-saved after ${event}`);
      } catch (error) {
        console.error('❌ Event-triggered save failed:', error);
      }
    });
  });
}

// Настройка событий Telegram
function setupTelegramEvents() {
  const telegramAdapter = window.telegramAdapter;
  
  // Сохранение по главной кнопке Telegram
  telegramAdapter.showMainButton('💾 Save to Cloud', async () => {
    telegramAdapter.setMainButtonLoading(true);
    telegramAdapter.hapticFeedback('light');
    
    try {
      const success = await telegramStorageManager.saveToCloud(gameCore.gameState);
      
      if (success) {
        telegramAdapter.hapticFeedback('success');
        telegramAdapter.tg.MainButton.setText('✅ Saved!');
        
        // Показываем статистику игры
        await showGameStatistics();
        
        setTimeout(() => {
          telegramAdapter.tg.MainButton.setText('💾 Save to Cloud');
        }, 2000);
      } else {
        telegramAdapter.hapticFeedback('error');
        telegramAdapter.tg.MainButton.setText('❌ Save Failed');
        setTimeout(() => {
          telegramAdapter.tg.MainButton.setText('💾 Save to Cloud');
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Manual save failed:', error);
      telegramAdapter.hapticFeedback('error');
    } finally {
      telegramAdapter.setMainButtonLoading(false);
    }
  });

  // Haptic feedback для игровых событий
  eventBus.subscribe(GameEvents.CLICK, () => {
    telegramAdapter.hapticFeedback('selection');
  });

  eventBus.subscribe(GameEvents.COMBO_CHANGED, (data) => {
    if (data.count > 0 && data.count % 10 === 0) {
      telegramAdapter.hapticFeedback('light');
    }
    if (data.count >= 50) {
      telegramAdapter.hapticFeedback('heavy');
    }
  });

  eventBus.subscribe(GameEvents.BUFF_APPLIED, () => {
    telegramAdapter.hapticFeedback('success');
  });

  eventBus.subscribe(GameEvents.DEBUFF_APPLIED, () => {
    telegramAdapter.hapticFeedback('warning');
  });

  eventBus.subscribe(GameEvents.CRITICAL_HIT, () => {
    telegramAdapter.hapticFeedback('medium');
  });

  eventBus.subscribe(GameEvents.ENERGY_CRITICAL, () => {
    telegramAdapter.hapticFeedback('error');
  });

  // События покупок
  eventBus.subscribe(GameEvents.BUILDING_BOUGHT, () => {
    telegramAdapter.hapticFeedback('success');
  });

  eventBus.subscribe(GameEvents.SKILL_BOUGHT, () => {
    telegramAdapter.hapticFeedback('success');
  });

  // События рейдов
  eventBus.subscribe('raid:started', () => {
    telegramAdapter.hapticFeedback('heavy');
  });

  eventBus.subscribe('raid:completed', () => {
    telegramAdapter.hapticFeedback('success');
  });

  // Обработка закрытия приложения
  telegramAdapter.tg.BackButton.onClick(async () => {
    await saveBeforeExit();
    telegramAdapter.closeApp();
  });
}

// Показ статистики игры
async function showGameStatistics() {
  try {
    const stats = telegramStorageManager.generateGameStats(gameCore.gameState.getSaveData());
    const userInfo = window.telegramAdapter.getUserInfo();
    
    const statsMessage = {
      type: 'game_statistics',
      user: userInfo,
      stats: stats,
      timestamp: Date.now()
    };

    // Отправляем статистику боту
    window.telegramAdapter.sendData(statsMessage);
    
    // Сохраняем статистику в облако
    await telegramStorageManager.saveUserStats(stats);
    
    console.log('📊 Game statistics sent to bot');
    
  } catch (error) {
    console.error('❌ Failed to show statistics:', error);
  }
}

// Сохранение перед выходом
async function saveBeforeExit() {
  try {
    window.telegramAdapter.setMainButtonLoading(true);
    
    await telegramStorageManager.saveToCloud(gameCore.gameState);
    await telegramStorageManager.exportForBot(gameCore.gameState);
    
    console.log('✅ Game saved before exit');
    
  } catch (error) {
    console.error('❌ Failed to save before exit:', error);
  } finally {
    window.telegramAdapter.setMainButtonLoading(false);
  }
}

// Обработчики ошибок для Telegram
function setupTelegramErrorHandlers() {
  window.addEventListener('error', (event) => {
    console.error('💀 Telegram WebApp error:', event.error);
    
    if (window.telegramAdapter) {
      window.telegramAdapter.hapticFeedback('error');
      
      // Отправляем отчёт об ошибке боту
      const errorReport = {
        type: 'error_report',
        error: {
          message: event.error?.message || 'Unknown error',
          stack: event.error?.stack,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        },
        user: window.telegramAdapter.getUserInfo(),
        timestamp: Date.now(),
        gameState: gameCore ? 'initialized' : 'not_initialized'
      };
      
      try {
        window.telegramAdapter.sendData(errorReport);
      } catch (e) {
        console.error('Failed to send error report:', e);
      }
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('💀 Unhandled promise rejection:', event.reason);
    
    if (window.telegramAdapter) {
      window.telegramAdapter.hapticFeedback('error');
    }
    
    event.preventDefault();
  });
}

// Обработка критических ошибок Telegram
function handleTelegramError(error) {
  console.error('💀 Critical Telegram error:', error);
  
  const errorMessage = `Telegram Game Error: ${error.message}`;
  
  // Создаем простое сообщение об ошибке
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--tg-secondary-bg-color, #f7f7f7);
    color: var(--tg-text-color, #000);
    padding: 2rem;
    border-radius: 12px;
    z-index: 10000;
    text-align: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    max-width: 90%;
    word-wrap: break-word;
  `;
  
  errorDiv.innerHTML = `
    <h3>💀 Game Error</h3>
    <p>${errorMessage}</p>
    <div style="margin-top: 1rem;">
      <button onclick="location.reload()" style="
        background: var(--tg-button-color, #007aff);
        color: var(--tg-button-text-color, white);
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        cursor: pointer;
        font-weight: bold;
        margin: 0.25rem;
      ">🔄 Reload Game</button>
      <button onclick="window.telegramAdapter?.closeApp()" style="
        background: #ff3b30;
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        cursor: pointer;
        font-weight: bold;
        margin: 0.25rem;
      ">❌ Close App</button>
    </div>
    <p style="font-size: 0.8rem; opacity: 0.7; margin-top: 1rem;">
      Error will be automatically reported to the developer.
    </p>
  `;
  
  document.body.appendChild(errorDiv);

  // Попытка аварийного сохранения
  if (gameCore && gameCore.gameState && !gameCore.gameState.isDestroyed) {
    try {
      console.log('💾 Attempting emergency save...');
      telegramStorageManager?.autoSaveToCloud(gameCore.gameState);
    } catch (saveError) {
      console.error('❌ Emergency save failed:', saveError);
    }
  }
}

// Экспорт игровых данных для отправки боту
export async function exportGameForBot() {
  try {
    if (!gameCore || !gameCore.gameState) {
      throw new Error('Game not initialized');
    }

    const success = await telegramStorageManager.exportForBot(gameCore.gameState);
    
    if (success) {
      window.telegramAdapter.hapticFeedback('success');
      eventBus.emit(GameEvents.NOTIFICATION, '📤 Data sent to bot!');
    } else {
      throw new Error('Export failed');
    }
    
    return success;
    
  } catch (error) {
    console.error('❌ Failed to export game for bot:', error);
    window.telegramAdapter.hapticFeedback('error');
    eventBus.emit(GameEvents.NOTIFICATION, '❌ Failed to send data');
    return false;
  }
}

// Получение отладочной информации для Telegram
export function getTelegramDebugInfo() {
  return {
    telegramAdapter: window.telegramAdapter?.getDebugInfo(),
    gameCore: gameCore?.getGameStats(),
    storageManager: {
      hasTelegramStorage: !!telegramStorageManager,
      cloudCapabilities: window.telegramAdapter?.getCapabilities()
    },
    user: window.telegramAdapter?.getUserInfo(),
    viewport: {
      height: window.telegramAdapter?.tg?.viewportHeight,
      stableHeight: window.telegramAdapter?.tg?.viewportStableHeight,
      isExpanded: window.telegramAdapter?.tg?.isExpanded
    }
  };
}

// Проверка готовности системы
export function checkTelegramReadiness() {
  const checks = {
    telegramAPI: !!window.Telegram?.WebApp,
    telegramAdapter: !!window.telegramAdapter,
    gameCore: !!gameCore,
    storageManager: !!telegramStorageManager,
    cloudStorage: !!window.telegramAdapter?.tg?.CloudStorage,
    hapticFeedback: !!window.telegramAdapter?.tg?.HapticFeedback
  };
  
  const allReady = Object.values(checks).every(check => check);
  
  console.log('🔍 Telegram readiness check:', checks);
  
  return {
    ready: allReady,
    checks: checks,
    issues: Object.entries(checks)
      .filter(([key, value]) => !value)
      .map(([key]) => key)
  };
}

// Функции для глобального доступа
window.exportGameForBot = exportGameForBot;
window.getTelegramDebugInfo = getTelegramDebugInfo;
window.checkTelegramReadiness = checkTelegramReadiness;

// Основная точка входа
export { initializeTelegramGame as main };