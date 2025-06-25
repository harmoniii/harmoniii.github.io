// game.js - Исправленная версия с полным сбросом и современными API
import { GameCore } from './core/GameCore.js';
import { eventBus, GameEvents } from './core/GameEvents.js';

// Глобальные переменные для отладки
let gameCore = null;

// Основная функция инициализации
async function main() {
  try {
    console.log('🚀 Starting Advanced Clicker v0.8.1...');
    
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

// ИСПРАВЛЕНИЕ: Современные обработчики закрытия страницы
function setupModernPageHandlers() {
  // Основной обработчик сохранения
  const handlePageUnload = () => {
    console.log('👋 Page unloading, saving...');
    
    if (gameCore && gameCore.isActive()) {
      try {
        gameCore.autoSave();
        console.log('✅ Final save completed');
      } catch (error) {
        console.warn('⚠️ Error during final save:', error);
      }
    }
  };
  
  // ИСПРАВЛЕНИЕ: Убираем deprecated unload, используем только beforeunload
  window.addEventListener('beforeunload', (e) => {
    handlePageUnload();
    
    // Стандартное предупреждение о закрытии (опционально)
    // e.preventDefault();
    // e.returnValue = '';
  });
  
  // ИСПРАВЛЕНИЕ: Современный API для скрытия страницы
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameCore && gameCore.isActive()) {
      try {
        gameCore.autoSave();
        console.log('💾 Auto-save on page hide');
      } catch (error) {
        console.warn('⚠️ Error saving on visibility change:', error);
      }
    }
  });
  
  // ИСПРАВЛЕНИЕ: Page Lifecycle API для современных браузеров
  if ('onfreeze' in window) {
    window.addEventListener('freeze', handlePageUnload);
  }
  
  if ('onpagehide' in window) {
    window.addEventListener('pagehide', handlePageUnload);
  }
}