// core/GameLoop.js - ИСПРАВЛЕННАЯ версия с правильными fallback зонами
import { CleanupMixin } from './CleanupManager.js';
import { eventBus, GameEvents } from './GameEvents.js';
import { UI_CONFIG, GAME_CONSTANTS } from '../config/GameConstants.js';
import { ZONE_COUNT } from '../config/ResourceConfig.js';

export class GameLoop extends CleanupMixin {
  constructor(gameState, managers) {
    super();
    
    this.gameState = gameState;
    this.managers = managers;
    
    this.canvas = null;
    this.ctx = null;
    this.angle = 0;
    this.running = false;
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
    this.running = true;
    this.lastFrameTime = performance.now();
    this.gameLoop(this.lastFrameTime);
  }

  // Остановка игрового цикла
  stop() {
    if (!this.running) return;
    
    console.log('⏹️ Stopping game loop...');
    this.running = false;
    
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

  // ИСПРАВЛЕНИЕ: Рендеринг с безопасным получением зон
  render() {
    this.clearCanvas();
    this.drawZones();
    this.drawReverseIndicator();
  }

  // ИСПРАВЛЕНИЕ: Безопасное рисование зон с правильным fallback
  drawZones() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = this.canvas.width / 2 - 10;
    
    // ИСПРАВЛЕНИЕ: Безопасное получение зон с проверками
    let zonesData = [];
    
    try {
      // Пытаемся получить зоны из FeatureManager/ZoneManager
      if (this.managers.feature && 
          typeof this.managers.feature.getZonesForRendering === 'function') {
        
        zonesData = this.managers.feature.getZonesForRendering();
        
        // ИСПРАВЛЕНИЕ: Проверяем валидность полученных зон
        if (!Array.isArray(zonesData) || zonesData.length === 0) {
          console.warn('⚠️ Invalid zones data from FeatureManager, using fallback');
          zonesData = this.createFallbackZones();
        }
      } else {
        console.warn('⚠️ FeatureManager not available, using fallback rendering');
        zonesData = this.createFallbackZones();
      }
    } catch (error) {
      console.error('❌ Error getting zones for rendering:', error);
      zonesData = this.createFallbackZones();
    }
    
    // ИСПРАВЛЕНИЕ: Дополнительная валидация зон перед рендерингом
    if (!Array.isArray(zonesData) || zonesData.length === 0) {
      console.error('❌ No valid zones available for rendering');
      return;
    }
    
    // Рисуем каждую зону
    zonesData.forEach((zoneData, index) => {
      try {
        const { isTarget, color, startAngle, endAngle } = zoneData;
        
        // ИСПРАВЛЕНИЕ: Валидируем данные зоны
        if (typeof startAngle !== 'number' || typeof endAngle !== 'number') {
          console.warn(`⚠️ Invalid zone angles for zone ${index}:`, zoneData);
          return;
        }
        
        const adjustedStartAngle = startAngle + this.angle;
        const adjustedEndAngle = endAngle + this.angle;
        
        // Основная заливка зоны
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY);
        this.ctx.arc(centerX, centerY, radius, adjustedStartAngle, adjustedEndAngle);
        this.ctx.closePath();
        
        // ИСПРАВЛЕНИЕ: Используем цвет из ZoneManager с fallback
        this.ctx.fillStyle = color || '#E5E5E5';
        this.ctx.fill();
        
        // Обводка зоны
        this.ctx.strokeStyle = isTarget ? '#FF0000' : '#333333';
        this.ctx.lineWidth = isTarget ? 4 : 1;
        this.ctx.stroke();
        
        // Подпись зоны
        this.drawZoneLabel(centerX, centerY, radius, adjustedStartAngle, adjustedEndAngle, 
                          index, zoneData.type, isTarget);
        
      } catch (error) {
        console.warn(`⚠️ Error rendering zone ${index}:`, error);
      }
    });
  }

  // ИСПРАВЛЕНИЕ: Правильное создание fallback зон с использованием ZONE_COUNT
  createFallbackZones() {
    console.log('🎯 Creating fallback zones...');
    
    // ИСПРАВЛЕНИЕ: Используем ZONE_COUNT вместо жестко заданного значения
    const zoneCount = ZONE_COUNT;
    const stepAngle = (2 * Math.PI) / zoneCount;
    const targetZone = this.gameState.targetZone || 0;
    
    // ИСПРАВЛЕНИЕ: Валидируем targetZone
    const validTargetZone = (targetZone >= 0 && targetZone < zoneCount) ? targetZone : 0;
    
    const fallbackZones = Array.from({ length: zoneCount }, (_, i) => {
      const isTarget = (i === validTargetZone);
      let color = '#E5E5E5'; // Серый по умолчанию
      let type = { id: 'inactive' };
      
      if (isTarget) {
        color = '#C41E3A'; // Красный для целевой
        type = { id: 'target' };
      }
      
      return {
        index: i,
        type,
        isTarget,
        color,
        startAngle: i * stepAngle,
        endAngle: (i + 1) * stepAngle
      };
    });
    
    console.log(`✅ Created ${zoneCount} fallback zones with target at ${validTargetZone}`);
    return fallbackZones;
  }

  // ИСПРАВЛЕНИЕ: Безопасное рисование подписей зон
  drawZoneLabel(centerX, centerY, radius, startAngle, endAngle, zoneIndex, zoneType, isTarget) {
    try {
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
      
      // ИСПРАВЛЕНИЕ: Безопасное получение иконки зоны
      let label = this.getZoneIcon(zoneType, isTarget);
      
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
      
    } catch (error) {
      console.warn(`⚠️ Error drawing zone label for zone ${zoneIndex}:`, error);
    }
  }

  // ИСПРАВЛЕНИЕ: Безопасное получение иконки зоны
  getZoneIcon(zoneType, isTarget) {
    try {
      if (isTarget || (zoneType && zoneType.id === 'target')) {
        return '🎯';
      }
      
      if (!zoneType || !zoneType.id) {
        return '';
      }
      
      switch (zoneType.id) {
        case 'energy':
          return '⚡';
        case 'bonus':
          return '💰';
        case 'inactive':
        default:
          return '';
      }
    } catch (error) {
      console.warn('⚠️ Error getting zone icon:', error);
      return '';
    }
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

  // Метод isRunning для совместимости
  isRunning() {
    return this.running;
  }

  // Получить реальный FPS
  getFPS() {
    return this.actualFPS;
  }

  // ИСПРАВЛЕНИЕ: Безопасная статистика рендеринга
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
      targetZone: this.gameState.targetZone,
      zonesAvailable: !!(this.managers.feature && 
                        typeof this.managers.feature.getZonesForRendering === 'function'),
      zoneCount: ZONE_COUNT
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

  // Проверить наличие ZoneManager
  hasZoneManager() {
    return !!(this.managers.feature && 
             typeof this.managers.feature.getZonesForRendering === 'function');
  }

  // ИСПРАВЛЕНИЕ: Безопасная информация о зонах для отладки
  getZoneRenderInfo() {
    try {
      if (this.hasZoneManager()) {
        const zones = this.managers.feature.getZonesForRendering();
        return {
          available: true,
          zones: zones,
          debugInfo: this.managers.feature.getZonesDebugInfo ? 
                    this.managers.feature.getZonesDebugInfo() : 'No debug info',
          zoneCount: zones ? zones.length : 0
        };
      } else {
        return {
          available: false,
          fallbackUsed: true,
          targetZone: this.gameState.targetZone,
          zoneCount: ZONE_COUNT
        };
      }
    } catch (error) {
      console.error('❌ Error getting zone render info:', error);
      return {
        available: false,
        error: error.message,
        fallbackUsed: true,
        targetZone: this.gameState.targetZone,
        zoneCount: ZONE_COUNT
      };
    }
  }

  // ИСПРАВЛЕНИЕ: Безопасная валидация рендеринга
  validateRendering() {
    const validation = {
      canvasReady: !!(this.canvas && this.ctx),
      zonesAvailable: this.hasZoneManager(),
      gameStateReady: !!(this.gameState && typeof this.gameState.targetZone === 'number'),
      managersReady: !!(this.managers && this.managers.feature),
      errors: []
    };
    
    if (!validation.canvasReady) {
      validation.errors.push('Canvas or context not initialized');
    }
    
    if (!validation.gameStateReady) {
      validation.errors.push('Game state not ready');
    }
    
    if (!validation.managersReady) {
      validation.errors.push('Managers not ready');
    }
    
    return validation;
  }

  // Получить информацию о производительности
  getPerformanceInfo() {
    return {
      fps: this.actualFPS,
      targetFPS: this.targetFPS,
      frameTime: this.frameTime,
      deltaTime: this.deltaTime,
      running: this.running,
      redrawsPerformed: this.forceRedrawCounter,
      lastFrameTime: this.lastFrameTime,
      animationId: this.animationId
    };
  }

  // Деструктор
  destroy() {
    console.log('🧹 Destroying GameLoop...');
    
    this.stop();
    super.destroy();
    
    console.log('✅ GameLoop destroyed');
  }
}