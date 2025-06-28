// game.js - Главный файл для системы сетки 3x3
import { GridGameCore } from './core/GridGameCore.js';
import { eventBus, GameEvents } from './core/GameEvents.js';

// Глобальные переменные для отладки
let gameCore = null;

// Основная функция инициализации
async function main() {
  try {
    console.log('🚀 Starting Grid Clicker Game...');
    
    // Устанавливаем обработчики ошибок
    setupErrorHandlers();
    
    // Устанавливаем современные обработчики закрытия страницы
    setupModernPageHandlers();
    
    // Создаем и запускаем игровое ядро с сеткой
    gameCore = new GridGameCore();
    
    // Экспортируем для отладки
    window.gameCore = gameCore;
    window.eventBus = eventBus;
    window.GameEvents = GameEvents;
    
    // Автоматически включаем режим отладки в консоли
    if (gameCore && typeof gameCore.enableDebugMode === 'function') {
      gameCore.enableDebugMode();
    }
    
    console.log('✅ Grid Clicker Game started successfully');
    console.log('🐛 Debug mode enabled! Use window.gameDebug for debugging');
    console.log('🎯 Game now uses 3x3 grid instead of rotating wheel');
    
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

  const errorMessage = `Grid Game initialization failed: ${error.message}`;
  
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
    max-width: 500px;
    width: 90%;
  `;
  
  errorDiv.innerHTML = `
    <h2>💀 Grid Game Error</h2>
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
      The game now uses a 3x3 grid system instead of a rotating wheel.<br>
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
    return 'Grid game not initialized';
  }
  
  try {
    return {
      gameState: gameCore.getGameState(),
      gridManager: gameCore.getGridManager(),
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
  return 'GridGameCore not available';
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
  return 'GridGameCore not available';
}

// Функция для тестирования сетки (для отладки)
function testGrid() {
  if (gameCore && gameCore.gridManager) {
    try {
      const stats = gameCore.gridManager.getStats();
      const debugInfo = gameCore.gridManager.getDebugInfo();
      console.log('🎯 Grid Stats:', stats);
      console.log('🎯 Grid Debug Info:', debugInfo);
      
      // Тестируем перемешивание
      console.log('🔄 Testing grid shuffle...');
      gameCore.gridManager.shuffleCells();
      
      return { stats, debugInfo, shuffled: true };
    } catch (error) {
      console.error('🔧 Grid test error:', error);
      return false;
    }
  }
  return 'GridManager not available';
}

// Экспортируем функции для глобального доступа
window.getGameDebugInfo = getGameDebugInfo;
window.forceSave = forceSave;
window.forceCleanup = forceCleanup;
window.testGrid = testGrid;

// Дополнительные отладочные функции для сетки
window.gridDebug = {
  shuffle: () => gameCore?.gridManager?.shuffleCells(),
  setTarget: (cellIndex) => gameCore?.gridManager?.setTargetCell(cellIndex),
  getStats: () => gameCore?.gridManager?.getStats(),
  getDebugInfo: () => gameCore?.gridManager?.getDebugInfo(),
  isReady: () => gameCore?.gridManager?.isManagerReady(),
  testClick: (cellIndex) => {
    if (gameCore?.gridManager) {
      const cellSize = 400 / 3; // canvas 400px / 3 cells
      const row = Math.floor(cellIndex / 3);
      const col = cellIndex % 3;
      const x = col * cellSize + cellSize / 2;
      const y = row * cellSize + cellSize / 2;
      
      console.log(`🧪 Testing click on cell ${cellIndex} at (${x}, ${y})`);
      
      eventBus.emit(GameEvents.CLICK, {
        x: x,
        y: y,
        canvasWidth: 400,
        canvasHeight: 400
      });
      
      return { cellIndex, x, y };
    }
    return 'GridManager not available';
  }
};

// Запускаем игру после загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  // DOM уже загружен
  main();
}

// Экспортируем основные функции (если используется как модуль)
export { main, getGameDebugInfo, forceSave, forceCleanup, testGrid };