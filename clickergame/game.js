// game.js - Исправленная версия с правильной инициализацией
import { GameCore } from './core/GameCore.js';
import { eventBus, GameEvents } from './core/GameEvents.js';

// Глобальные переменные для отладки
let gameCore = null;

// Основная функция инициализации
async function main() {
  try {
    console.log('🚀 Starting Advanced Clicker v1.0.8...');
    
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

// Современные обработчики закрытия страницы
function setupModernPageHandlers() {
  const handlePageUnload = () => {
    console.log('👋 Page unloading, saving...');
    
    if (gameCore && typeof gameCore.autoSave === 'function') {
      try {
        gameCore.autoSave();
        console.log('✅ Final save completed');
      } catch (error) {
        console.warn('⚠️ Error during final save:', error);
      }
    }
  };
  
  window.addEventListener('beforeunload', (e) => {
    handlePageUnload();
  });
  
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameCore && typeof gameCore.autoSave === 'function') {
      try {
        gameCore.autoSave();
        console.log('💾 Auto-save on page hide');
      } catch (error) {
        console.warn('⚠️ Error saving on visibility change:', error);
      }
    }
  });
  
  if ('onfreeze' in window) {
    window.addEventListener('freeze', handlePageUnload);
  }
  
  if ('onpagehide' in window) {
    window.addEventListener('pagehide', handlePageUnload);
  }
}

function handleCriticalError(error) {
  const errorMessage = `Game initialization failed: ${error.message}`;
  
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #ff4444;
    color: white;
    padding: 20px;
    border-radius: 10px;
    z-index: 10000;
    text-align: center;
    font-family: Arial, sans-serif;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;
  
  errorDiv.innerHTML = `
    <h3>💀 Game Initialization Error</h3>
    <p>${errorMessage}</p>
    <button onclick="location.reload()" style="
      background: white;
      color: #ff4444;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      font-weight: bold;
      margin-top: 10px;
    ">🔄 Reload Page</button>
  `;
  
  document.body.appendChild(errorDiv);
}

// КРИТИЧЕСКИ ВАЖНО: Запуск игры!
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}