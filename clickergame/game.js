// game.js - Полная исправленная версия с улучшенной инициализацией и управлением ресурсами
import { GameCore } from './core/GameCore.js';
import { eventBus, GameEvents } from './core/GameEvents.js';

// Глобальные переменные для отладки
let gameCore = null;
let gameState = null;
let managers = {
  feature: null,
  building: null,
  skill: null,
  market: null,
  ui: null
};

let gameLoopId = null;
let achievementTimeouts = {
  combo: 0,
  resource: 0
};

// ИСПРАВЛЕНИЕ 2: Функция инициализации игры
function initializeGame() {
  try {
    console.log('🎮 Initializing game...');
    
    // Загружаем состояние
    gameState = loadState();
    
    // ИСПРАВЛЕНИЕ 9: Проверяем состояние перед инициализацией менеджеров
    if (!gameState) {
      throw new Error('Failed to load game state');
    }
    
    // Инициализируем менеджеры в правильном порядке
    managers.feature = new FeatureManager(gameState);
    managers.building = new BuildingManager(gameState);
    managers.skill = new SkillManager(gameState);
    managers.market = new MarketManager(gameState);
    
    // Добавляем менеджеры в состояние
    gameState.featureMgr = managers.feature;
    gameState.buildingManager = managers.building;
    gameState.skillManager = managers.skill;
    gameState.marketManager = managers.market;
    gameState.CONFIG = CONFIG;

    // Инициализируем UI
    managers.ui = new UIManager(gameState);
    
    // Инициализируем canvas и игровой цикл
    initializeCanvas();
    startGameLoop();
    
    console.log('✅ Game initialized successfully');
    
  } catch (error) {
    console.error('💀 Critical error during game initialization:', error);
    handleInitializationError(error);
  }
}

// ИСПРАВЛЕНИЕ 2: Обработка ошибок инициализации
function handleInitializationError(error) {
  const errorMessage = `Game initialization failed: ${error.message}`;
  
  // Показываем ошибку пользователю
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '50%';
  errorDiv.style.left = '50%';
  errorDiv.style.transform = 'translate(-50%, -50%)';
  errorDiv.style.background = '#ff4444';
  errorDiv.style.color = 'white';
  errorDiv.style.padding = '20px';
  errorDiv.style.borderRadius = '10px';
  errorDiv.style.zIndex = '10000';
  errorDiv.style.textAlign = 'center';
  errorDiv.innerHTML = `
    <h3>💀 Game Initialization Error</h3>
    <p>${errorMessage}</p>
    <button onclick="location.reload()">🔄 Reload Page</button>
  `;
  
  document.body.appendChild(errorDiv);
}

// Canvas и игровой цикл
let canvas, ctx, angle = 0;

function initializeCanvas() {
  canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    throw new Error('Game canvas not found');
  }
  
  canvas.width = CONFIG.canvasSize;
  canvas.height = CONFIG.canvasSize;
  ctx = canvas.getContext('2d');
  
  // ИСПРАВЛЕНИЕ 12: Улучшенная система кликов
  setupCanvasEventHandlers();
  
  // ИСПРАВЛЕНИЕ 4: Инициализация угла поворота
  angle = 0;
  gameState.currentRotation = 0;
}

function setupCanvasEventHandlers() {
  const getClickAngle = (e) => {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left - canvas.width / 2;
    const y = e.clientY - r.top - canvas.height / 2;
    return Math.atan2(y, x) - angle;
  };

  // Обработчик кликов мыши
  const clickHandler = (e) => {
    e.preventDefault();
    const clickAngle = getClickAngle(e);
    EventBus.emit('click', clickAngle);
  };
  
  // Обработчик касаний
  const touchHandler = (e) => {
    e.preventDefault();
    if (e.touches && e.touches.length > 0) {
      const clickAngle = getClickAngle(e.touches[0]);
      EventBus.emit('click', clickAngle);
    }
  };

  canvas.addEventListener('click', clickHandler);
  canvas.addEventListener('touchstart', touchHandler);
  
  // Предотвращаем контекстное меню
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ИСПРАВЛЕНИЕ 14: Улучшенная система достижений с защитой от проблем времени
function checkAchievements() {
  if (!gameState || !managers.skill) return;
  
  const now = Date.now();
  
  // ИСПРАВЛЕНИЕ 14: Безопасная проверка достижений комбо
  if (now - achievementTimeouts.combo > GAME_CONSTANTS.COMBO_CHECK_INTERVAL) {
    achievementTimeouts.combo = now;
    
    try {
      const comboCount = gameState.combo?.count || 0;
      
      if (comboCount >= GAME_CONSTANTS.COMBO_MILESTONE_3) {
        managers.skill.addSkillPoints(5);
      } else if (comboCount >= GAME_CONSTANTS.COMBO_MILESTONE_2) {
        managers.skill.addSkillPoints(2);
      } else if (comboCount >= GAME_CONSTANTS.COMBO_MILESTONE_1) {
        managers.skill.addSkillPoints(1);
      }
    } catch (error) {
      console.warn('Error in combo achievements:', error);
    }
  }
  
  // ИСПРАВЛЕНИЕ 14: Безопасная проверка достижений ресурсов
  if (now - achievementTimeouts.resource > GAME_CONSTANTS.RESOURCE_CHECK_INTERVAL) {
    achievementTimeouts.resource = now;
    
    try {
      const totalResources = Object.values(gameState.resources || {})
        .filter(val => typeof val === 'number' && !isNaN(val))
        .reduce((sum, val) => sum + val, 0);
      
      if (totalResources >= GAME_CONSTANTS.RESOURCE_MILESTONE_3) {
        managers.skill.addSkillPoints(5);
      } else if (totalResources >= GAME_CONSTANTS.RESOURCE_MILESTONE_2) {
        managers.skill.addSkillPoints(3);
      } else if (totalResources >= GAME_CONSTANTS.RESOURCE_MILESTONE_1) {
        managers.skill.addSkillPoints(1);
      }
    } catch (error) {
      console.warn('Error in resource achievements:', error);
    }
  }
}

// Главный игровой цикл
function gameLoop() {
  if (!gameState || !managers.feature || !ctx) {
    console.warn('Game loop running without proper initialization');
    return;
  }
  
  try {
    // Очищаем canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем зоны
    drawZones();
    
    // Проверяем достижения
    checkAchievements();
    
    // Сохраняем состояние
    saveState(gameState);
    
    // Обновляем угол поворота
    updateRotation();
    
  } catch (error) {
    console.warn('Error in game loop:', error);
  }
  
  // Планируем следующий кадр
  gameLoopId = requestAnimationFrame(gameLoop);
}

function drawZones() {
  const total = 2 * Math.PI;
  const step = total / managers.feature.zones.length;
  
  managers.feature.zones.forEach(zone => {
    const start = zone.index * step + angle;
    const end = (zone.index + 1) * step + angle;
    
    // Основная заливка зоны
    ctx.beginPath();
    ctx.moveTo(CONFIG.canvasSize / 2, CONFIG.canvasSize / 2);
    ctx.arc(CONFIG.canvasSize / 2, CONFIG.canvasSize / 2, 
            CONFIG.canvasSize / 2 - GAME_CONSTANTS.CANVAS_BORDER_WIDTH, start, end);
    ctx.closePath();
    ctx.fillStyle = '#888';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Подсветка целевой зоны
    if (gameState.targetZone === zone.index) {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = GAME_CONSTANTS.TARGET_ZONE_BORDER_WIDTH;
      ctx.beginPath();
      ctx.moveTo(CONFIG.canvasSize / 2, CONFIG.canvasSize / 2);
      ctx.arc(CONFIG.canvasSize / 2, CONFIG.canvasSize / 2, 
              CONFIG.canvasSize / 2 - GAME_CONSTANTS.CANVAS_BORDER_WIDTH, start, end);
      ctx.closePath();
      ctx.stroke();
    }
    
    // Предварительный показ следующей зоны (если есть навык)
    if (managers.skill?.skills?.zonePreview?.level > 0) {
      const nextZone = (gameState.targetZone + 1) % managers.feature.zones.length;
      if (nextZone === zone.index) {
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = GAME_CONSTANTS.PREVIEW_ZONE_BORDER_WIDTH;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(CONFIG.canvasSize / 2, CONFIG.canvasSize / 2);
        ctx.arc(CONFIG.canvasSize / 2, CONFIG.canvasSize / 2, 
                CONFIG.canvasSize / 2 - GAME_CONSTANTS.CANVAS_BORDER_WIDTH, start, end);
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  });
}

function updateRotation() {
  // Применяем модификаторы скорости
  let rotationSpeed = CONFIG.rotationSpeed;
  
  // Увеличиваем скорость если есть дебафф rapid
  if (gameState.debuffs && gameState.debuffs.includes('rapid')) {
    rotationSpeed *= GAME_CONSTANTS.RAPID_SPEED_MULTIPLIER;
  }
  
  angle += rotationSpeed;
  
  // ИСПРАВЛЕНИЕ 12: Обновляем текущий угол поворота для автокликера
  gameState.currentRotation = angle;
}

function startGameLoop() {
  if (gameLoopId) {
    cancelAnimationFrame(gameLoopId);
  }
  gameLoopId = requestAnimationFrame(gameLoop);
}

// ИСПРАВЛЕНИЕ 1, 2: Улучшенная система сброса игры
function setupGameResetHandler() {
  EventBus.subscribe('gameReset', () => {
    console.log('🔄 Game reset initiated...');
    
    try {
      // Останавливаем игровой цикл
      if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
      }
      
      // Останавливаем все менеджеры
      stopAllManagers();
      
      // Очищаем состояние
      gameState = null;
      
      // Сбрасываем угол поворота
      angle = 0;
      
      // Очищаем таймауты достижений
      achievementTimeouts.combo = 0;
      achievementTimeouts.resource = 0;
      
      console.log('✅ Game reset preparation complete');
      
      // Переинициализируем игру через небольшую задержку
      setTimeout(() => {
        initializeGame();
      }, 100);
      
    } catch (error) {
      console.error('Error during game reset:', error);
      // В случае ошибки перезагружаем страницу
      window.location.reload();
    }
  });
}

// ИСПРАВЛЕНИЕ 2: Безопасная остановка всех менеджеров
function stopAllManagers() {
  try {
    if (managers.feature && typeof managers.feature.stopAllEffects === 'function') {
      managers.feature.stopAllEffects();
      managers.feature = null;
    }
  } catch (e) {
    console.warn('Error stopping FeatureManager:', e);
  }
  
  try {
    if (managers.building && typeof managers.building.stopAllProduction === 'function') {
      managers.building.stopAllProduction();
      managers.building = null;
    }
  } catch (e) {
    console.warn('Error stopping BuildingManager:', e);
  }
  
  try {
    if (managers.skill && typeof managers.skill.stopAllGeneration === 'function') {
      managers.skill.stopAllGeneration();
      managers.skill = null;
    }
  } catch (e) {
    console.warn('Error stopping SkillManager:', e);
  }
  
  try {
    if (managers.ui && typeof managers.ui.destroy === 'function') {
      managers.ui.destroy();
      managers.ui = null;
    }
  } catch (e) {
    console.warn('Error stopping UIManager:', e);
  }
  
  // Очищаем ссылки
  managers.market = null;
}

// ИСПРАВЛЕНИЕ 2: Функция очистки при закрытии страницы
function setupPageUnloadHandler() {
  const cleanup = () => {
    console.log('🧹 Page unloading, cleaning up...');
    
    try {
      // Сохраняем состояние
      if (gameState) {
        saveState(gameState);
      }
      
      // Останавливаем игровой цикл
      if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
      }
      
      // Останавливаем менеджеры
      stopAllManagers();
      
    } catch (error) {
      console.warn('Error during cleanup:', error);
    }
  };
  
  // Добавляем обработчики для различных событий закрытия
  window.addEventListener('beforeunload', cleanup);
  window.addEventListener('unload', cleanup);
  window.addEventListener('pagehide', cleanup);
  
  // Также добавляем обработчик для потери фокуса (на всякий случай)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameState) {
      try {
        saveState(gameState);
      } catch (error) {
        console.warn('Error saving on visibility change:', error);
      }
    }
  });
}

// ИСПРАВЛЕНИЕ 2: Обработчик ошибок
function setupErrorHandlers() {
  // Глобальный обработчик ошибок
  window.addEventListener('error', (event) => {
    console.error('💀 Global error:', event.error);
    
    // Если критическая ошибка в игре, пытаемся сохранить состояние
    if (gameState) {
      try {
        saveState(gameState);
        console.log('✅ State saved after error');
      } catch (saveError) {
        console.error('Failed to save state after error:', saveError);
      }
    }
  });
  
  // Обработчик необработанных промисов
  window.addEventListener('unhandledrejection', (event) => {
    console.error('💀 Unhandled promise rejection:', event.reason);
  });
}

// ИСПРАВЛЕНИЕ 18: Очистка неиспользуемых импортов и оптимизация
// Основная точка входа
function main() {
  console.log('🚀 Starting Advanced Clicker v0.7.4...');
  
  try {
    // Устанавливаем обработчики
    setupErrorHandlers();
    setupPageUnloadHandler();
    setupGameResetHandler();
    
    // Инициализируем игру
    initializeGame();
    
  } catch (error) {
    console.error('💀 Critical error in main:', error);
    handleInitializationError(error);
  }
}

// ИСПРАВЛЕНИЕ 2: Функция для экстренного сохранения (для отладки)
window.emergencySave = function() {
  if (gameState) {
    try {
      saveState(gameState);
      console.log('✅ Emergency save completed');
      return true;
    } catch (error) {
      console.error('❌ Emergency save failed:', error);
      return false;
    }
  } else {
    console.warn('⚠️ No game state to save');
    return false;
  }
};

// ИСПРАВЛЕНИЕ 2: Функция для получения состояния (для отладки)
window.getGameState = function() {
  return gameState;
};

// ИСПРАВЛЕНИЕ 2: Функция для получения менеджеров (для отладки)
window.getManagers = function() {
  return managers;
};

// Запускаем игру когда DOM готов
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}