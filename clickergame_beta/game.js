// game.js - ИСПРАВЛЕННАЯ версия с правильной инициализацией
import { GameCore } from './core/GameCore.js';
import { eventBus, GameEvents } from './core/GameEvents.js';

// Глобальные переменные для отладки
let gameCore = null;

// Основная функция инициализации
async function main() {
  try {
    console.log('🚀 Starting Clicker...');
    
    // Устанавливаем обработчики ошибок
    setupErrorHandlers();
    
    // Устанавливаем современные обработчики закрытия страницы
    setupModernPageHandlers();
    
    // Создаем и запускаем игровое ядро
    gameCore = new GameCore();
    
    // Экспортируем для отладки
    window.gameCore = gameCore;
    window.eventBus = eventBus;
    window.GameEvents = GameEvents;
    
    // НОВОЕ: Автоматически включаем режим отладки в консоли
    if (gameCore && typeof gameCore.enableDebugMode === 'function') {
      gameCore.enableDebugMode();
    }
    
    console.log('✅ Game started successfully');
    console.log('🐛 Debug mode enabled! Use window.gameDebug for debugging');
    
  } catch (error) {
    console.error('💀 Critical error in main:', error);
    handleCriticalError(error);
  }
}

// Обработчики ошибок
function setupErrorHandlers() {
  // Глобальный обработчик ошибок
  window.addEventListener('error', (event) => {
    console.error('💀 Global error:', event.error);
    
    // Пытаемся сохранить состояние при критической ошибке
    if (gameCore && typeof gameCore.autoSave === 'function') {
      try {
        gameCore.autoSave();
        console.log('✅ Emergency save completed');
      } catch (saveError) {
        console.error('❌ Emergency save failed:', saveError);
      }
    }
  });
  
  // Обработчик необработанных промисов
  window.addEventListener('unhandledrejection', (event) => {
    console.error('💀 Unhandled promise rejection:', event.reason);
    event.preventDefault();
  });
}

function setupModernPageHandlers() {
  const handlePageUnload = () => {
    console.log('👋 Page unloading, attempting save...');
    
    // БЕЗОПАСНАЯ проверка перед сохранением
    if (gameCore && 
        typeof gameCore.autoSave === 'function' && 
        gameCore.isDestroyed !== true) {
      try {
        const saveResult = gameCore.autoSave();
        if (saveResult) {
          console.log('✅ Final save completed successfully');
        } else {
          console.log('⚠️ Final save completed with warnings');
        }
      } catch (error) {
        console.warn('⚠️ Error during final save:', error);
      }
    } else {
      console.log('⚠️ GameCore not available or destroyed, skipping final save');
    }
  };

  // Обработчик beforeunload для автосохранения
  window.addEventListener('beforeunload', handlePageUnload);
  
  // Обработчик unload для очистки
  window.addEventListener('unload', () => {
    if (gameCore && typeof gameCore.destroy === 'function') {
      try {
        gameCore.destroy();
        console.log('🧹 GameCore destroyed on page unload');
      } catch (error) {
        console.error('💀 Error destroying GameCore:', error);
      }
    }
  });

  // Обработчик потери фокуса для автосохранения
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      handlePageUnload();
    }
  });
}

// Обработка критических ошибок
function handleCriticalError(error) {
  console.error('💀 Critical error details:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  const errorMessage = `Game initialization failed: ${error.message}`;
  
  // Показываем ошибку пользователю
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #ff4444, #cc0000);
    color: white;
    padding: 30px;
    border-radius: 15px;
    z-index: 10000;
    text-align: center;
    font-family: 'Segoe UI', Arial, sans-serif;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    max-width: 400px;
    width: 90%;
  `;
  
  errorDiv.innerHTML = `
    <h2>💀 Critical Error</h2>
    <p style="margin: 15px 0; line-height: 1.4;">${errorMessage}</p>
    <div style="margin-top: 20px;">
      <button onclick="location.reload()" style="
        background: white;
        color: #ff4444;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: bold;
        margin: 5px;
        font-size: 16px;
      ">🔄 Reload Game</button>
      <button onclick="this.parentElement.parentElement.remove()" style="
        background: transparent;
        color: white;
        border: 2px solid white;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: bold;
        margin: 5px;
        font-size: 16px;
      ">✖️ Close</button>
    </div>
    <p style="font-size: 12px; opacity: 0.8; margin-top: 15px;">
      If this error persists, try clearing your browser cache.
    </p>
  `;
  
  document.body.appendChild(errorDiv);
  
  // Автоматически удаляем через 30 секунд
  setTimeout(() => {
    if (document.body.contains(errorDiv)) {
      document.body.removeChild(errorDiv);
    }
  }, 30000);
}

// Функция для отладки состояния игры
function getGameDebugInfo() {
  if (!gameCore) {
    return 'Game not initialized';
  }
  
  try {
    return {
      gameState: gameCore.getGameState(),
      managers: gameCore.getManagers(),
      stats: gameCore.getGameStats(),
      isActive: gameCore.isGameActive(),
      cleanupStats: gameCore.cleanupManager ? gameCore.cleanupManager.getStats() : null
    };
  } catch (error) {
    return `Debug info error: ${error.message}`;
  }
}

// Функция для принудительного сохранения (для отладки)
function forceSave() {
  if (gameCore && typeof gameCore.autoSave === 'function') {
    try {
      const result = gameCore.autoSave();
      console.log('🔧 Force save result:', result);
      return result;
    } catch (error) {
      console.error('🔧 Force save error:', error);
      return false;
    }
  }
  return 'GameCore not available';
}

// Функция для принудительной очистки (для отладки)
function forceCleanup() {
  if (gameCore && typeof gameCore.destroy === 'function') {
    try {
      gameCore.destroy();
      console.log('🔧 Force cleanup completed');
      return true;
    } catch (error) {
      console.error('🔧 Force cleanup error:', error);
      return false;
    }
  }
  return 'GameCore not available';
}

// Экспортируем функции для глобального доступа
window.getGameDebugInfo = getGameDebugInfo;
window.forceSave = forceSave;
window.forceCleanup = forceCleanup;

// Запускаем игру после загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  // DOM уже загружен
  main();
}

// Экспортируем основные функции (если используется как модуль)
export { main, getGameDebugInfo, forceSave, forceCleanup };