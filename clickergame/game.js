// game.js - Основная точка входа в игру
import { GameCore } from './core/GameCore.js';
import { eventBus, GameEvents } from './core/GameEvents.js';

// Глобальные переменные для отладки
let gameCore = null;

// Основная функция инициализации
async function main() {
  try {
    console.log('🚀 Starting Advanced Clicker v0.8.0...');
    
    // Устанавливаем обработчики ошибок
    setupErrorHandlers();
    
    // Устанавливаем обработчик закрытия страницы
    setupPageUnloadHandler();
    
    // Создаем и запускаем игровое ядро
    gameCore = new GameCore();
    
    // Экспортируем для отладки
    window.gameCore = gameCore;
    window.eventBus = eventBus;
    window.GameEvents = GameEvents;
    
    console.log('✅ Game started successfully');
    
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
    if (gameCore && gameCore.isActive()) {
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
    event.preventDefault(); // Предотвращаем вывод в консоль браузера
  });
}

// Обработчик закрытия страницы
function setupPageUnloadHandler() {
  const cleanup = () => {
    console.log('👋 Page unloading, cleaning up...');
    
    if (gameCore && gameCore.isActive()) {
      try {
        gameCore.autoSave();
        gameCore.destroy();
        console.log('✅ Cleanup completed');
      } catch (error) {
        console.warn('⚠️ Error during cleanup:', error);
      }
    }
  };
  
  // Добавляем обработчики для различных событий закрытия
  window.addEventListener('beforeunload', cleanup);
  window.addEventListener('unload', cleanup);
  window.addEventListener('pagehide', cleanup);
  
  // Сохранение при потере фокуса
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameCore && gameCore.isActive()) {
      try {
        gameCore.autoSave();
      } catch (error) {
        console.warn('⚠️ Error saving on visibility change:', error);
      }
    }
  });
}

// Обработка критических ошибок
function handleCriticalError(error) {
  const errorMessage = `Critical game error: ${error.message}`;
  
  // Создаем элемент ошибки
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
    color: white;
    padding: 30px;
    border-radius: 15px;
    z-index: 10000;
    text-align: center;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    max-width: 400px;
    border: 2px solid #ffffff20;
  `;
  
  errorDiv.innerHTML = `
    <h2 style="margin-top: 0; font-size: 1.5em;">🚨 Critical Error</h2>
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
        margin: 0 5px;
        font-size: 14px;
        transition: all 0.3s ease;
      " onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='white'">
        🔄 Reload Game
      </button>
      <button onclick="this.parentElement.parentElement.remove()" style="
        background: transparent;
        color: white;
        border: 2px solid white;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: bold;
        margin: 0 5px;
        font-size: 14px;
        transition: all 0.3s ease;
      " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">
        ✕ Close
      </button>
    </div>
    <p style="margin-top: 15px; font-size: 12px; opacity: 0.8;">
      Your progress should be automatically saved.
    </p>
  `;
  
  document.body.appendChild(errorDiv);
}

// Функции для отладки (доступны в консоли)
window.getGameStats = function() {
  if (gameCore && gameCore.isActive()) {
    return gameCore.getGameStats();
  }
  return null;
};

window.getGameState = function() {
  if (gameCore && gameCore.isActive()) {
    return gameCore.getGameState();
  }
  return null;
};

window.getManagers = function() {
  if (gameCore && gameCore.isActive()) {
    return gameCore.getManagers();
  }
  return null;
};

window.emergencySave = function() {
  if (gameCore && gameCore.isActive()) {
    try {
      gameCore.autoSave();
      console.log('✅ Emergency save completed');
      return true;
    } catch (error) {
      console.error('❌ Emergency save failed:', error);
      return false;
    }
  }
  console.warn('⚠️ Game not active, cannot save');
  return false;
};

window.forceReload = function() {
  console.log('🔄 Forcing page reload...');
  window.location.reload(true);
};

window.clearAllData = function() {
  if (confirm('⚠️ This will delete ALL game data! Are you sure?')) {
    try {
      localStorage.clear();
      sessionStorage.clear();
      console.log('🧹 All data cleared');
      window.location.reload();
    } catch (error) {
      console.error('❌ Failed to clear data:', error);
    }
  }
};

// Запуск игры при готовности DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}