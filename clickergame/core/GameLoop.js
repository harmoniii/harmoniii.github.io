// core/GameLoop.js - ИСПРАВЛЕННАЯ версия с упрощенной механикой зон
import { CleanupMixin } from './CleanupManager.js';
import { eventBus, GameEvents } from './GameEvents.js';
import { UI_CONFIG, GAME_CONSTANTS } from '../config/GameConstants.js';

export class GameLoop extends CleanupMixin {
  constructor(gameState, managers) {
    super();
    
    this.gameState = gameState;
    this.managers = managers;
    
    this.canvas = null;
    this.ctx = null;
    this.angle = 0;
    this.running = false; // ИСПРАВЛЕНИЕ: Используем свойство running вместо isRunning
    this.animationId = null;
    
    // FPS контроль
    this.targetFPS = 60;
    this.frameTime = 1000 / this.targetFPS;
    this.lastFrameTime = 0;
    this.deltaTime = 0;
    this.actualFPS = 0;
    this.frameCount = 0;
    this.fpsUpdateTime = 0;
    
    // Переменная для направления вращения
    this.rotationDirection = 1; // 1 = обычное, -1 = обратное
    
    // Оптимизация рендеринга
    this.needsRedraw = true;
    this.lastAngle = 0;
    
    // Принудительная перерисовка каждые несколько кадров
    this.forceRedrawCounter = 0;
    this.forceRedrawInterval = 30; // Каждые 30 кадров
    
    this.initializeCanvas();
    this.bindEvents();
    this.setupVisibilityHandling();
  }

  // Инициализация canvas
  initializeCanvas() {
    this.canvas = document.getElementById('gameCanvas');
    if (!this.canvas) {
      throw new Error('Game canvas not found');
    }
    
    this.canvas.width = UI_CONFIG.CANVAS_SIZE;
    this.canvas.height = UI_CONFIG.CANVAS_SIZE;
    this.ctx = this.canvas.getContext('2d');
    
    if (!this.ctx) {
      throw new Error('Failed to get 2D context');
    }
    
    this.setupCanvasEvents();
  }

  // Обработка видимости вкладки для оптимизации
  setupVisibilityHandling() {
    this.addEventListener(document, 'visibilitychange', () => {
      if (document.hidden) {
        this.targetFPS = 30;
      } else {
        this.targetFPS = 60;
        this.needsRedraw = true;
      }
      this.frameTime = 1000 / this.targetFPS;
    });
  }

  // Настройка событий canvas
  setupCanvasEvents() {
    const getClickAngle = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - this.canvas.width / 2;
      const y = e.clientY - rect.top - this.canvas.height / 2;
      return Math.atan2(y, x) - this.angle;
    };

    const clickHandler = (e) => {
      e.preventDefault();
      const clickAngle = getClickAngle(e);
      eventBus.emit(GameEvents.CLICK, clickAngle);
      this.needsRedraw = true;
    };
    
    const touchHandler = (e) => {
      e.preventDefault();
      if (e.touches && e.touches.length > 0) {
        const clickAngle = getClickAngle(e.touches[0]);
        eventBus.emit(GameEvents.CLICK, clickAngle);
        this.needsRedraw = true;
      }
    };

    this.addEventListener(this.canvas, 'click', clickHandler);
    this.addEventListener(this.canvas, 'touchstart', touchHandler);
    this.addEventListener(this.canvas, 'contextmenu', (e) => e.preventDefault());
  }

  // Привязка событий
  bindEvents() {
    eventBus.subscribe(GameEvents.CLICK, () => {
      this.gameState.currentRotation = this.angle;
    });
    
    eventBus.subscribe(GameEvents.DEBUFF_APPLIED, (data) => {
      if (data.id === 'reverseControls') {
        this.updateRotationDirection();
        this.needsRedraw = true;
      }
    });
    
    eventBus.subscribe(GameEvents.DEBUFF_EXPIRED, (data) => {
      if (data.id === 'reverseControls') {
        this.updateRotationDirection();
        this.needsRedraw = true;
      }
    });

    eventBus.subscribe(GameEvents.BUFF_APPLIED, () => {
      this.needsRedraw = true;
    });
    
    eventBus.subscribe(GameEvents.BUFF_EXPIRED, () => {
      this.needsRedraw = true;
    });
    
    // Принудительная перерисовка при изменении зон
    eventBus.subscribe(GameEvents.ZONES_SHUFFLED, (newTargetZone) => {
      console.log(`🎯 GameLoop: Zones shuffled, new target: ${newTargetZone}`);
      this.gameState.targetZone = newTargetZone;
      this.needsRedraw = true;
      
      // Принудительная перерисовка в следующих нескольких кадрах
      this.forceRedrawCounter = 0; // Сбрасываем счетчик
      
      // Дополнительные принудительные перерисовки
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          this.needsRedraw = true;
        }, i * 50);
      }
    });
    
    // Принудительная перерисовка при изменении комбо
    eventBus.subscribe(GameEvents.COMBO_CHANGED, () => {
      this.needsRedraw = true;
    });
  }

  // Обновление направления вращения
  updateRotationDirection() {
    const hasReverseControls = this.gameState.debuffs && 
                              this.gameState.debuffs.includes('reverseControls');
    
    this.rotationDirection = hasReverseControls ? -1 : 1;
  }

  // Запуск игрового цикла
  start() {
    if (this.running) return;
    
    console.log('🔄 Starting game loop...');
    this.running = true; // ИСПРАВЛЕНИЕ: Используем свойство running
    this.lastFrameTime = performance.now();
    this.gameLoop(this.lastFrameTime);
  }

  // Остановка игрового цикла
  stop() {
    if (!this.running) return;
    
    console.log('⏹️ Stopping game loop...');
    this.running = false; // ИСПРАВЛЕНИЕ: Используем свойство running
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  // Основной игровой цикл с FPS контролем
  gameLoop(currentTime) {
    if (!this.running) return;
    
    try {
      const elapsed = currentTime - this.lastFrameTime;
      
      if (elapsed < this.frameTime) {
        this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
        return;
      }
      
      this.deltaTime = elapsed;
      this.lastFrameTime = currentTime;
      this.updateFPSCounter(currentTime);
      
      this.updateRotationDirection();
      
      const angleChanged = this.updateRotation();
      
      // Принудительная перерисовка для синхронизации зон
      this.forceRedrawCounter++;
      const shouldForceRedraw = this.forceRedrawCounter >= this.forceRedrawInterval;
      
      if (shouldForceRedraw) {
        this.forceRedrawCounter = 0;
        this.needsRedraw = true;
      }
      
      if (this.needsRedraw || angleChanged || shouldForceRedraw) {
        this.render();
        this.needsRedraw = false;
      }
      
      this.gameState.currentRotation = this.angle;
      
    } catch (error) {
      console.warn('⚠️ Error in game loop:', error);
    }
    
    this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
  }

  // Счетчик FPS
  updateFPSCounter(currentTime) {
    this.frameCount++;
    
    if (currentTime - this.fpsUpdateTime >= 1000) {
      this.actualFPS = this.frameCount;
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
      
      if (this.actualFPS < 50) {
        console.warn(`⚠️ Low FPS detected: ${this.actualFPS}`);
      }
    }
  }

  // Очистка canvas
  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Обновление угла поворота с плавной анимацией
  updateRotation() {
    let rotationSpeed = UI_CONFIG.ROTATION_SPEED;
    
    if (this.gameState.debuffs && this.gameState.debuffs.includes('rapid')) {
      rotationSpeed *= GAME_CONSTANTS.RAPID_SPEED_MULTIPLIER;
    }
    
    if (this.gameState.buffs && this.gameState.buffs.includes('speedBoost')) {
      rotationSpeed *= GAME_CONSTANTS.SPEED_BOOST_MULTIPLIER;
    }
    
    const rotationDelta = rotationSpeed * this.rotationDirection * (this.deltaTime / 16.67);
    const newAngle = this.angle + rotationDelta;
    
    const angleChanged = Math.abs(newAngle - this.lastAngle) > 0.001;
    
    this.angle = newAngle;
    this.lastAngle = this.angle;
    
    if (this.angle > 2 * Math.PI) {
      this.angle -= 2 * Math.PI;
    } else if (this.angle < 0) {
      this.angle += 2 * Math.PI;
    }
    
    return angleChanged;
  }

  // ИСПРАВЛЕНИЕ: Упрощенное рисование с базовой логикой зон
  render() {
    this.clearCanvas();
    this.drawZones();
    this.drawReverseIndicator();
  }

  // УПРОЩЕННОЕ: Рисование зон с базовой логикой
  drawZones() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = this.canvas.width / 2 - 10;
    const zoneCount = 8; // Фиксированное количество зон
    const stepAngle = (2 * Math.PI) / zoneCount;
    
    // Получаем целевую зону
    const targetZone = this.gameState.targetZone || 0;
    
    // Рисуем каждую зону
    for (let i = 0; i < zoneCount; i++) {
      const startAngle = i * stepAngle + this.angle;
      const endAngle = (i + 1) * stepAngle + this.angle;
      
      // Основная заливка зоны
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      this.ctx.closePath();
      
      // УПРОЩЕННАЯ ЛОГИКА: Определение цвета зоны
      let zoneColor;
      let isTarget = (i === targetZone);
      
      if (isTarget) {
        // Целевая зона ВСЕГДА красная
        zoneColor = '#C41E3A';
      } else {
        // Случайно генерируем специальные зоны
        const random = Math.random();
        if (random < 0.2) {
          zoneColor = '#228B22'; // Зеленый (энергия)
        } else if (random < 0.35) {
          zoneColor = '#FFB347'; // Золотистый (бонус)
        } else {
          zoneColor = '#E5E5E5'; // Серый (неактивная)
        }
      }
      
      this.ctx.fillStyle = zoneColor;
      this.ctx.fill();
      
      // Обводка зоны
      this.ctx.strokeStyle = isTarget ? '#FF0000' : '#333333';
      this.ctx.lineWidth = isTarget ? 4 : 1;
      this.ctx.stroke();
      
      // Подпись зоны
      this.drawZoneLabel(centerX, centerY, radius, startAngle, endAngle, i, isTarget, zoneColor);
    }
  }

  // Рисование подписей зон
  drawZoneLabel(centerX, centerY, radius, startAngle, endAngle, zoneIndex, isTarget, zoneColor) {
    const midAngle = (startAngle + endAngle) / 2;
    const labelRadius = radius * 0.7;
    const labelX = centerX + Math.cos(midAngle) * labelRadius;
    const labelY = centerY + Math.sin(midAngle) * labelRadius;
    
    this.ctx.save();
    this.ctx.font = 'bold 18px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 3;
    
    let label = '';
    if (isTarget) {
      label = '🎯'; // Целевая зона ВСЕГДА получает иконку цели
    } else {
      // Определяем тип зоны для иконки по цвету
      if (zoneColor === '#228B22') {
        label = '⚡'; // Энергия
      } else if (zoneColor === '#FFB347') {
        label = '💰'; // Бонус
      }
      // Серые зоны остаются без иконки
    }
    
    if (label) {
      this.ctx.strokeText(label, labelX, labelY);
      this.ctx.fillText(label, labelX, labelY);
    }
    
    // Показываем номер зоны только для целевой (для отладки)
    if (isTarget && window.gameDebug) {
      this.ctx.font = 'bold 12px Arial';
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 2;
      const debugLabel = `${zoneIndex}`;
      this.ctx.strokeText(debugLabel, labelX, labelY + 25);
      this.ctx.fillText(debugLabel, labelX, labelY + 25);
    }
    
    this.ctx.restore();
  }

  // Рисование индикатора обратного вращения
  drawReverseIndicator() {
    if (!this.gameState.debuffs || !this.gameState.debuffs.includes('reverseControls')) {
      return;
    }
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(this.angle + (this.rotationDirection > 0 ? 0 : Math.PI));
    
    this.ctx.beginPath();
    this.ctx.moveTo(0, -50);
    this.ctx.lineTo(-15, -30);
    this.ctx.lineTo(-5, -30);
    this.ctx.lineTo(-5, -10);
    this.ctx.lineTo(5, -10);
    this.ctx.lineTo(5, -30);
    this.ctx.lineTo(15, -30);
    this.ctx.closePath();
    
    this.ctx.fillStyle = this.rotationDirection < 0 ? '#FF4444' : '#44FF44';
    this.ctx.fill();
    
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    this.ctx.restore();
    
    if (this.rotationDirection < 0) {
      this.ctx.save();
      this.ctx.font = 'bold 16px Arial';
      this.ctx.fillStyle = '#FF4444';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('🙃 REVERSE', centerX, centerY + 80);
      this.ctx.restore();
    }
  }

  // Принудительная перерисовка
  forceRedraw() {
    console.log('🔄 GameLoop: Force redraw requested');
    
    this.needsRedraw = true;
    
    // Принудительно рендерим несколько раз для гарантии
    if (this.running) {
      this.render();
      
      setTimeout(() => {
        if (this.running) {
          this.needsRedraw = true;
          this.render();
        }
      }, 16); // Один кадр при 60 FPS
      
      setTimeout(() => {
        if (this.running) {
          this.needsRedraw = true;
          this.render();
        }
      }, 32); // Два кадра при 60 FPS
    }
  }

  // Получить текущий угол поворота
  getCurrentAngle() {
    return this.angle;
  }

  // Получить направление вращения
  getRotationDirection() {
    return this.rotationDirection;
  }

  // Получить canvas
  getCanvas() {
    return this.canvas;
  }

  // Получить контекст рендеринга
  getContext() {
    return this.ctx;
  }

  // ИСПРАВЛЕНИЕ: Добавляем метод isRunning для совместимости
  isRunning() {
    return this.running;
  }

  // Получить реальный FPS
  getFPS() {
    return this.actualFPS;
  }

  // Получить статистику рендеринга
  getRenderStats() {
    return {
      fps: this.actualFPS,
      targetFPS: this.targetFPS,
      angle: this.angle,
      rotationDirection: this.rotationDirection,
      running: this.running,
      needsRedraw: this.needsRedraw,
      deltaTime: this.deltaTime,
      canvasSize: {
        width: this.canvas?.width || 0,
        height: this.canvas?.height || 0
      },
      forceRedrawCounter: this.forceRedrawCounter,
      targetZone: this.gameState.targetZone
    };
  }

  // Изменить размер canvas (для адаптивности)
  resize(width, height) {
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.needsRedraw = true;
      console.log(`🖼️ Canvas resized to ${width}x${height}`);
    }
  }

  // Форсированное обновление направления (для отладки)
  forceUpdateDirection() {
    this.updateRotationDirection();
    this.needsRedraw = true;
    console.log(`🔄 Force updated rotation direction: ${this.rotationDirection}`);
  }

  // Деструктор
  destroy() {
    console.log('🧹 Destroying GameLoop...');
    
    this.stop();
    super.destroy();
    
    console.log('✅ GameLoop destroyed');
  }
}