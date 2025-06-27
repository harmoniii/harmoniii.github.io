// game.js - ИСПРАВЛЕННАЯ версия с правильной инициализацией
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