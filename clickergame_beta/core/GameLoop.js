// core/GameLoop.js - Упрощенная версия с прямым доступом к ZoneManager
import { CleanupMixin } from './CleanupManager.js';
import { eventBus, GameEvents } from './GameEvents.js';
import { AngleManager } from '../utils/AngleManager.js';
import { UI_CONFIG, GAME_CONSTANTS } from '../config/GameConstants.js';

export class GameLoop extends CleanupMixin {
  constructor(gameState, zoneManager) {
    super();
    
    this.gameState = gameState;
    this.zoneManager = zoneManager; // Прямая ссылка на ZoneManager
    
    this.canvas = null;
    this.ctx = null;
    this.angle = 0;
    this.running = false;
    this.animationId = null;
    
    // FPS контроль
    this.targetFPS = 60;
    this.frameTime = 1000 / this.targetFPS;
    this.lastFrameTime = 0;
    this.actualFPS = 0;
    this.frameCount = 0;
    this.fpsUpdateTime = 0;
    
    this.rotationDirection = 1;
    this.needsRedraw = true;
    
    this.initializeCanvas();
    this.bindEvents();
    this.setupVisibilityHandling();
    
    console.log('🔄 GameLoop initialized with direct ZoneManager access');
  }

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

  setupCanvasEvents() {
    const clickHandler = (e) => {
      e.preventDefault();
      const clickAngle = AngleManager.getClickAngle(e, this.canvas, this.angle);
      eventBus.emit(GameEvents.CLICK, clickAngle);
      this.needsRedraw = true;
    };
    
    const touchHandler = (e) => {
      e.preventDefault();
      if (e.touches && e.touches.length > 0) {
        const clickAngle = AngleManager.getClickAngle(e, this.canvas, this.angle);
        eventBus.emit(GameEvents.CLICK, clickAngle);
        this.needsRedraw = true;
      }
    };

    this.addEventListener(this.canvas, 'click', clickHandler);
    this.addEventListener(this.canvas, 'touchstart', touchHandler);
    this.addEventListener(this.canvas, 'contextmenu', (e) => e.preventDefault());
  }

  bindEvents() {
    // Обновляем при изменении зон
    eventBus.subscribe(GameEvents.ZONES_UPDATED, () => {
      console.log('🔄 GameLoop: Zones updated, redrawing');
      this.needsRedraw = true;
    });
    
    // Обновляем при изменении дебаффов
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
  }

  updateRotationDirection() {
    const hasReverseControls = this.gameState.debuffs && 
                              this.gameState.debuffs.includes('reverseControls');
    
    this.rotationDirection = hasReverseControls ? -1 : 1;
  }

  start() {
    if (this.running) return;
    
    console.log('🔄 Starting game loop...');
    this.running = true;
    this.lastFrameTime = performance.now();
    this.gameLoop(this.lastFrameTime);
  }

  stop() {
    if (!this.running) return;
    
    console.log('⏹️ Stopping game loop...');
    this.running = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  gameLoop(currentTime) {
    if (!this.running) return;
    
    try {
      const elapsed = currentTime - this.lastFrameTime;
      
      if (elapsed < this.frameTime) {
        this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
        return;
      }
      
      this.lastFrameTime = currentTime;
      this.updateFPSCounter(currentTime);
      
      this.updateRotationDirection();
      
      const angleChanged = this.updateRotation();
      
      if (this.needsRedraw || angleChanged) {
        this.render();
        this.needsRedraw = false;
      }
      
      this.gameState.currentRotation = this.angle;
      
    } catch (error) {
      console.warn('⚠️ Error in game loop:', error);
    }
    
    this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
  }

  updateFPSCounter(currentTime) {
    this.frameCount++;
    
    if (currentTime - this.fpsUpdateTime >= 1000) {
      this.actualFPS = this.frameCount;
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
    }
  }

  updateRotation() {
    let rotationSpeed = UI_CONFIG.ROTATION_SPEED;
    
    if (this.gameState.debuffs && this.gameState.debuffs.includes('rapid')) {
      rotationSpeed *= GAME_CONSTANTS.RAPID_SPEED_MULTIPLIER;
    }
    
    if (this.gameState.buffs && this.gameState.buffs.includes('speedBoost')) {
      rotationSpeed *= GAME_CONSTANTS.SPEED_BOOST_MULTIPLIER;
    }
    
    const rotationDelta = rotationSpeed * this.rotationDirection;
    const newAngle = this.angle + rotationDelta;
    
    const angleChanged = Math.abs(newAngle - this.angle) > 0.001;
    this.angle = AngleManager.normalize(newAngle);
    
    return angleChanged;
  }

  render() {
    this.clearCanvas();
    this.drawZones();
    this.drawReverseIndicator();
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // ОСНОВНОЕ ИСПРАВЛЕНИЕ: Простое получение зон
  drawZones() {
    // Проверяем готовность ZoneManager
    if (!this.zoneManager || !this.zoneManager.isManagerReady()) {
      console.warn('🔄 ZoneManager not ready, skipping render');
      return;
    }
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = this.canvas.width / 2 - 10;
    
    // Получаем зоны напрямую от ZoneManager
    const zones = this.zoneManager.getZonesForRendering();
    
    if (!zones || zones.length === 0) {
      console.warn('🔄 No zones available for rendering');
      return;
    }
    
    // Рисуем каждую зону
    zones.forEach(zoneData => {
      this.drawSingleZone(zoneData, centerX, centerY, radius);
    });
  }

  drawSingleZone(zoneData, centerX, centerY, radius) {
    try {
      const { isTarget, color, startAngle, endAngle, index, icon } = zoneData;
      
      const adjustedStartAngle = startAngle + this.angle;
      const adjustedEndAngle = endAngle + this.angle;
      
      // Основная заливка зоны
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.arc(centerX, centerY, radius, adjustedStartAngle, adjustedEndAngle);
      this.ctx.closePath();
      
      this.ctx.fillStyle = color || '#E5E5E5';
      this.ctx.fill();
      
      // Обводка зоны
      this.ctx.strokeStyle = isTarget ? '#FF0000' : '#333333';
      this.ctx.lineWidth = isTarget ? 4 : 1;
      this.ctx.stroke();
      
      // Подпись зоны
      this.drawZoneLabel(centerX, centerY, radius, adjustedStartAngle, adjustedEndAngle, 
                        index, icon, isTarget);
      
    } catch (error) {
      console.warn(`⚠️ Error rendering zone ${zoneData.index}:`, error);
    }
  }

  drawZoneLabel(centerX, centerY, radius, startAngle, endAngle, zoneIndex, icon, isTarget) {
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
      
      // Рисуем иконку зоны
      if (icon) {
        this.ctx.strokeText(icon, labelX, labelY);
        this.ctx.fillText(icon, labelX, labelY);
      }
      
      // Показываем номер зоны для отладки (только для целевой зоны)
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
    
    if (this.running) {
      this.render();
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

  // Проверить, запущен ли цикл
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
      canvasSize: {
        width: this.canvas?.width || 0,
        height: this.canvas?.height || 0
      },
      zoneManagerReady: this.zoneManager?.isManagerReady() || false,
      zonesAvailable: this.zoneManager?.getZonesForRendering()?.length || 0
    };
  }

  // Изменить размер canvas
  resize(width, height) {
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.needsRedraw = true;
      console.log(`🖼️ Canvas resized to ${width}x${height}`);
    }
  }

  // Получить информацию о зонах для отладки
  getZoneRenderInfo() {
    if (!this.zoneManager || !this.zoneManager.isManagerReady()) {
      return {
        available: false,
        error: 'ZoneManager not ready'
      };
    }
    
    try {
      const zones = this.zoneManager.getZonesForRendering();
      return {
        available: true,
        zones: zones,
        zoneCount: zones ? zones.length : 0,
        targetZone: this.zoneManager.getTargetZone(),
        debugInfo: this.zoneManager.getDebugInfo()
      };
    } catch (error) {
      return {
        available: false,
        error: error.message
      };
    }
  }

  // Валидация рендеринга
  validateRendering() {
    const validation = {
      canvasReady: !!(this.canvas && this.ctx),
      zoneManagerReady: this.zoneManager?.isManagerReady() || false,
      gameStateReady: !!(this.gameState && !this.gameState.isDestroyed),
      zonesAvailable: (this.zoneManager?.getZonesForRendering()?.length || 0) > 0,
      errors: []
    };
    
    if (!validation.canvasReady) {
      validation.errors.push('Canvas or context not initialized');
    }
    
    if (!validation.zoneManagerReady) {
      validation.errors.push('ZoneManager not ready');
    }
    
    if (!validation.gameStateReady) {
      validation.errors.push('Game state not ready');
    }
    
    if (!validation.zonesAvailable) {
      validation.errors.push('No zones available for rendering');
    }
    
    return validation;
  }

  // Получить информацию о производительности
  getPerformanceInfo() {
    return {
      fps: this.actualFPS,
      targetFPS: this.targetFPS,
      frameTime: this.frameTime,
      running: this.running,
      lastFrameTime: this.lastFrameTime,
      animationId: this.animationId,
      redrawsRequested: this.needsRedraw ? 1 : 0
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