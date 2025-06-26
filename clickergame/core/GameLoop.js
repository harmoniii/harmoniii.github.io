// core/GameLoop.js - ИСПРАВЛЕННАЯ версия с правильным отображением типов зон
import { CleanupMixin } from './CleanupManager.js';
import { eventBus, GameEvents } from './GameEvents.js';
import { UI_CONFIG, GAME_CONSTANTS } from '../config/GameConstants.js';
import { ZONE_TYPES } from '../config/ZoneTypes.js';

export class GameLoop extends CleanupMixin {
  constructor(gameState, managers) {
    super();
    
    this.gameState = gameState;
    this.managers = managers;
    
    this.canvas = null;
    this.ctx = null;
    this.angle = 0;
    this.isRunning = false;
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
        this.targetFPS = 30; // Снижаем FPS когда вкладка неактивна
      } else {
        this.targetFPS = 60; // Восстанавливаем полный FPS
        this.needsRedraw = true; // Принудительная перерисовка при возврате
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

    // Обработчик кликов мыши
    const clickHandler = (e) => {
      e.preventDefault();
      const clickAngle = getClickAngle(e);
      eventBus.emit(GameEvents.CLICK, clickAngle);
      this.needsRedraw = true; // Перерисовываем после клика
    };
    
    // Обработчик касаний
    const touchHandler = (e) => {
      e.preventDefault();
      if (e.touches && e.touches.length > 0) {
        const clickAngle = getClickAngle(e.touches[0]);
        eventBus.emit(GameEvents.CLICK, clickAngle);
        this.needsRedraw = true; // Перерисовываем после касания
      }
    };

    this.addEventListener(this.canvas, 'click', clickHandler);
    this.addEventListener(this.canvas, 'touchstart', touchHandler);
    this.addEventListener(this.canvas, 'contextmenu', (e) => e.preventDefault());
  }

  // Привязка событий
  bindEvents() {
    // Обновление поворота для автокликера
    eventBus.subscribe(GameEvents.CLICK, () => {
      this.gameState.currentRotation = this.angle;
    });
    
    // Слушаем изменения дебаффов для Reverse Controls
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

    // Перерисовываем при изменении эффектов
    eventBus.subscribe(GameEvents.BUFF_APPLIED, () => {
      this.needsRedraw = true;
    });
    
    eventBus.subscribe(GameEvents.BUFF_EXPIRED, () => {
      this.needsRedraw = true;
    });
    
    eventBus.subscribe(GameEvents.ZONES_SHUFFLED, () => {
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
    if (this.isRunning) return;
    
    console.log('🔄 Starting game loop...');
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.gameLoop(this.lastFrameTime);
  }

  // Остановка игрового цикла
  stop() {
    if (!this.isRunning) return;
    
    console.log('⏹️ Stopping game loop...');
    this.isRunning = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  // Основной игровой цикл с FPS контролем
  gameLoop(currentTime) {
    if (!this.isRunning) return;
    
    try {
      // FPS throttling
      const elapsed = currentTime - this.lastFrameTime;
      
      if (elapsed < this.frameTime) {
        // Слишком рано для следующего кадра
        this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
        return;
      }
      
      // Рассчитываем deltaTime и FPS
      this.deltaTime = elapsed;
      this.lastFrameTime = currentTime;
      this.updateFPSCounter(currentTime);
      
      // Обновляем направление вращения
      this.updateRotationDirection();
      
      // Обновляем угол поворота
      const angleChanged = this.updateRotation();
      
      // Рендерим только при необходимости
      if (this.needsRedraw || angleChanged) {
        this.render();
        this.needsRedraw = false;
      }
      
      // Обновляем состояние в gameState
      this.gameState.currentRotation = this.angle;
      
    } catch (error) {
      console.warn('⚠️ Error in game loop:', error);
    }
    
    // Планируем следующий кадр
    this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
  }

  // Добавляем счетчик FPS
  updateFPSCounter(currentTime) {
    this.frameCount++;
    
    if (currentTime - this.fpsUpdateTime >= 1000) {
      this.actualFPS = this.frameCount;
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
      
      // Логируем FPS только при значительных изменениях
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
    
    // Модификаторы скорости от эффектов
    if (this.gameState.debuffs && this.gameState.debuffs.includes('rapid')) {
      rotationSpeed *= GAME_CONSTANTS.RAPID_SPEED_MULTIPLIER;
    }
    
    if (this.gameState.buffs && this.gameState.buffs.includes('speedBoost')) {
      rotationSpeed *= GAME_CONSTANTS.SPEED_BOOST_MULTIPLIER;
    }
    
    // Используем deltaTime для плавной анимации
    const rotationDelta = rotationSpeed * this.rotationDirection * (this.deltaTime / 16.67); // 16.67ms = 60fps
    const newAngle = this.angle + rotationDelta;
    
    // Проверяем, изменился ли угол значительно
    const angleChanged = Math.abs(newAngle - this.lastAngle) > 0.001;
    
    this.angle = newAngle;
    this.lastAngle = this.angle;
    
    // Нормализуем угол для предотвращения переполнения
    if (this.angle > 2 * Math.PI) {
      this.angle -= 2 * Math.PI;
    } else if (this.angle < 0) {
      this.angle += 2 * Math.PI;
    }
    
    return angleChanged;
  }

  // Рендеринг игровых элементов
  render() {
    if (!this.managers.feature) return;
    
    // Очищаем canvas
    this.clearCanvas();
    
    this.drawZones();
    this.drawTargetIndicator();
    this.drawPreviewZone();
    this.drawReverseIndicator();
  }

  // ИСПРАВЛЕННОЕ рисование зон с правильными цветами
  drawZones() {
    const featureManager = this.managers.feature;
    if (!featureManager || !featureManager.zones || !featureManager.zoneTypes) return;
    
    const zones = featureManager.zones;
    const zoneTypes = featureManager.zoneTypes;
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = this.canvas.width / 2 - GAME_CONSTANTS.CANVAS_BORDER_WIDTH;
    const totalAngle = 2 * Math.PI;
    const stepAngle = totalAngle / zones.length;
    
    zones.forEach((zone, index) => {
      const startAngle = index * stepAngle + this.angle;
      const endAngle = (index + 1) * stepAngle + this.angle;
      
      // Основная заливка зоны
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      this.ctx.closePath();
      
      // ИСПРАВЛЕНИЕ: Получаем правильный цвет зоны на основе типа
      const zoneType = zoneTypes[index] || ZONE_TYPES.GOLD;
      this.ctx.fillStyle = this.getZoneColorByType(zoneType, index);
      this.ctx.fill();
      
      // Обводка зоны
      this.ctx.strokeStyle = '#333';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    });
  }

  // ИСПРАВЛЕННОЕ получение цвета зоны по типу
  getZoneColorByType(zoneType, zoneIndex) {
    // Проверяем, является ли эта зона целевой
    const isTarget = this.gameState.targetZone === zoneIndex;
    
    // Базовые цвета по типу зоны
    let baseColor;
    switch (zoneType.id) {
      case 'gold':
        baseColor = '#FFD700'; // Золотой
        break;
      case 'energy':
        baseColor = '#00FF00'; // Зеленый
        break;
      case 'bonus':
        baseColor = '#FF4500'; // Оранжево-красный
        break;
      default:
        baseColor = '#888888'; // Серый по умолчанию
    }
    
    // Если это целевая зона, делаем цвет ярче
    if (isTarget) {
      // Осветляем цвет для целевой зоны
      return this.lightenColor(baseColor, 20);
    }
    
    return baseColor;
  }

  // Функция для осветления цвета
  lightenColor(color, percent) {
    // Простая функция осветления для hex цветов
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  // Рисование индикатора целевой зоны
  drawTargetIndicator() {
    if (typeof this.gameState.targetZone !== 'number') return;
    
    const featureManager = this.managers.feature;
    if (!featureManager || !featureManager.zones) return;
    
    const zones = featureManager.zones;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = this.canvas.width / 2 - GAME_CONSTANTS.CANVAS_BORDER_WIDTH;
    const totalAngle = 2 * Math.PI;
    const stepAngle = totalAngle / zones.length;
    
    const targetIndex = this.gameState.targetZone;
    const startAngle = targetIndex * stepAngle + this.angle;
    const endAngle = (targetIndex + 1) * stepAngle + this.angle;
    
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY);
    this.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    this.ctx.closePath();
    
    this.ctx.strokeStyle = 'red';
    this.ctx.lineWidth = GAME_CONSTANTS.TARGET_ZONE_BORDER_WIDTH;
    this.ctx.stroke();
  }

  // Рисование предварительного показа следующей зоны
  drawPreviewZone() {
    if (!this.managers.skill || !this.managers.skill.getSkillLevel('zonePreview')) return;
    
    const featureManager = this.managers.feature;
    if (!featureManager || !featureManager.zones) return;
    
    const zones = featureManager.zones;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = this.canvas.width / 2 - GAME_CONSTANTS.CANVAS_BORDER_WIDTH;
    const totalAngle = 2 * Math.PI;
    const stepAngle = totalAngle / zones.length;
    
    const nextZone = (this.gameState.targetZone + 1) % zones.length;
    const startAngle = nextZone * stepAngle + this.angle;
    const endAngle = (nextZone + 1) * stepAngle + this.angle;
    
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY);
    this.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    this.ctx.closePath();
    
    this.ctx.strokeStyle = 'yellow';
    this.ctx.lineWidth = GAME_CONSTANTS.PREVIEW_ZONE_BORDER_WIDTH;
    this.ctx.setLineDash([10, 5]);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
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
    this.needsRedraw = true;
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

  // Проверить, запущен ли игровой цикл
  isRunning() {
    return this.isRunning;
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
      isRunning: this.isRunning,
      needsRedraw: this.needsRedraw,
      deltaTime: this.deltaTime,
      canvasSize: {
        width: this.canvas?.width || 0,
        height: this.canvas?.height || 0
      }
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