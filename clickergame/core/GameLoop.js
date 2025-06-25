// core/GameLoop.js - ИСПРАВЛЕННАЯ версия с поддержкой Reverse Controls
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
    this.isRunning = false;
    this.animationId = null;
    
    // НОВОЕ: Переменная для направления вращения
    this.rotationDirection = 1; // 1 = обычное, -1 = обратное
    
    this.initializeCanvas();
    this.bindEvents();
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
    };
    
    // Обработчик касаний
    const touchHandler = (e) => {
      e.preventDefault();
      if (e.touches && e.touches.length > 0) {
        const clickAngle = getClickAngle(e.touches[0]);
        eventBus.emit(GameEvents.CLICK, clickAngle);
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
    
    // НОВОЕ: Слушаем изменения дебаффов для Reverse Controls
    eventBus.subscribe(GameEvents.DEBUFF_APPLIED, (data) => {
      if (data.id === 'reverseControls') {
        this.updateRotationDirection();
      }
    });
    
    eventBus.subscribe(GameEvents.DEBUFF_EXPIRED, (data) => {
      if (data.id === 'reverseControls') {
        this.updateRotationDirection();
      }
    });
  }

  // НОВОЕ: Обновление направления вращения
  updateRotationDirection() {
    // Проверяем, активен ли дебафф Reverse Controls
    const hasReverseControls = this.gameState.debuffs && 
                              this.gameState.debuffs.includes('reverseControls');
    
    this.rotationDirection = hasReverseControls ? -1 : 1;
    
    //console.log(`🔄 Rotation direction: ${hasReverseControls ? 'REVERSED' : 'NORMAL'}`);
  }

  // Запуск игрового цикла
  start() {
    if (this.isRunning) return;
    
    console.log('🔄 Starting game loop...');
    this.isRunning = true;
    this.gameLoop();
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

  // Основной игровой цикл
  gameLoop() {
    if (!this.isRunning) return;
    
    try {
      // Очищаем canvas
      this.clearCanvas();
      
      // ИСПРАВЛЕНИЕ: Обновляем направление вращения
      this.updateRotationDirection();
      
      // Обновляем угол поворота
      this.updateRotation();
      
      // Рисуем игровые элементы
      this.render();
      
      // Обновляем состояние в gameState
      this.gameState.currentRotation = this.angle;
      
    } catch (error) {
      console.warn('⚠️ Error in game loop:', error);
    }
    
    // Планируем следующий кадр
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  // Очистка canvas
  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // ИСПРАВЛЕНИЕ: Обновление угла поворота с поддержкой Reverse Controls
  updateRotation() {
    let rotationSpeed = UI_CONFIG.ROTATION_SPEED;
    
    // Модификаторы скорости от эффектов
    if (this.gameState.debuffs && this.gameState.debuffs.includes('rapid')) {
      rotationSpeed *= GAME_CONSTANTS.RAPID_SPEED_MULTIPLIER;
    }
    
    if (this.gameState.buffs && this.gameState.buffs.includes('speedBoost')) {
      rotationSpeed *= GAME_CONSTANTS.SPEED_BOOST_MULTIPLIER;
    }
    
    // ИСПРАВЛЕНИЕ: Применяем направление вращения
    this.angle += rotationSpeed * this.rotationDirection;
    
    // Нормализуем угол для предотвращения переполнения
    this.angle = this.angle % (2 * Math.PI);
    if (this.angle < 0) {
      this.angle += 2 * Math.PI;
    }
  }

  // Рендеринг игровых элементов
  render() {
    if (!this.managers.feature || !this.managers.feature.zones) return;
    
    this.drawZones();
    this.drawTargetIndicator();
    this.drawPreviewZone();
    this.drawReverseIndicator(); // НОВОЕ: Индикатор обратного вращения
  }

  // Рисование зон
  drawZones() {
    const zones = this.managers.feature.zones;
    if (!zones) return;
    
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
      
      // Цвет зоны
      this.ctx.fillStyle = this.getZoneColor(index);
      this.ctx.fill();
      
      // Обводка зоны
      this.ctx.strokeStyle = '#333';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    });
  }

  // Получить цвет зоны
  getZoneColor(zoneIndex) {
    // Базовый серый цвет
    let color = '#888';
    
    // Если это целевая зона, делаем ее светлее
    if (this.gameState.targetZone === zoneIndex) {
      color = '#aaa';
    }
    
    return color;
  }

  // Рисование индикатора целевой зоны
  drawTargetIndicator() {
    if (typeof this.gameState.targetZone !== 'number') return;
    
    const zones = this.managers.feature.zones;
    if (!zones) return;
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = this.canvas.width / 2 - GAME_CONSTANTS.CANVAS_BORDER_WIDTH;
    const totalAngle = 2 * Math.PI;
    const stepAngle = totalAngle / zones.length;
    
    const targetIndex = this.gameState.targetZone;
    const startAngle = targetIndex * stepAngle + this.angle;
    const endAngle = (targetIndex + 1) * stepAngle + this.angle;
    
    // Красная обводка для целевой зоны
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
    // Проверяем, есть ли навык предварительного показа
    if (!this.managers.skill || !this.managers.skill.getSkillLevel('zonePreview')) return;
    
    const zones = this.managers.feature.zones;
    if (!zones) return;
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = this.canvas.width / 2 - GAME_CONSTANTS.CANVAS_BORDER_WIDTH;
    const totalAngle = 2 * Math.PI;
    const stepAngle = totalAngle / zones.length;
    
    // Показываем следующую зону после текущей целевой
    const nextZone = (this.gameState.targetZone + 1) % zones.length;
    const startAngle = nextZone * stepAngle + this.angle;
    const endAngle = (nextZone + 1) * stepAngle + this.angle;
    
    // Желтая пунктирная обводка для предварительного показа
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY);
    this.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    this.ctx.closePath();
    
    this.ctx.strokeStyle = 'yellow';
    this.ctx.lineWidth = GAME_CONSTANTS.PREVIEW_ZONE_BORDER_WIDTH;
    this.ctx.setLineDash([10, 5]);
    this.ctx.stroke();
    this.ctx.setLineDash([]); // Сбрасываем пунктир
  }

  // НОВОЕ: Рисование индикатора обратного вращения
  drawReverseIndicator() {
    // Показываем индикатор только если активен Reverse Controls
    if (!this.gameState.debuffs || !this.gameState.debuffs.includes('reverseControls')) {
      return;
    }
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // Рисуем стрелку указывающую направление вращения
    this.ctx.save();
    
    // Позиция стрелки (в центре колеса)
    this.ctx.translate(centerX, centerY);
    
    // Поворачиваем стрелку в зависимости от направления
    this.ctx.rotate(this.angle + (this.rotationDirection > 0 ? 0 : Math.PI));
    
    // Рисуем стрелку
    this.ctx.beginPath();
    this.ctx.moveTo(0, -50);
    this.ctx.lineTo(-15, -30);
    this.ctx.lineTo(-5, -30);
    this.ctx.lineTo(-5, -10);
    this.ctx.lineTo(5, -10);
    this.ctx.lineTo(5, -30);
    this.ctx.lineTo(15, -30);
    this.ctx.closePath();
    
    // Яркий цвет для обратного направления
    this.ctx.fillStyle = this.rotationDirection < 0 ? '#FF4444' : '#44FF44';
    this.ctx.fill();
    
    // Обводка
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    this.ctx.restore();
    
    // Добавляем текстовый индикатор
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

  // Получить текущий угол поворота
  getCurrentAngle() {
    return this.angle;
  }

  // НОВОЕ: Получить направление вращения
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

  // Получить FPS (приблизительно)
  getFPS() {
    // Простая оценка FPS на основе requestAnimationFrame
    // В реальном приложении можно добавить более точный подсчет
    return 60;
  }

  // Изменить размер canvas (для адаптивности)
  resize(width, height) {
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
      console.log(`🖼️ Canvas resized to ${width}x${height}`);
    }
  }

  // Получить статистику рендеринга
  getRenderStats() {
    return {
      fps: this.getFPS(),
      angle: this.angle,
      rotationDirection: this.rotationDirection,
      isRunning: this.isRunning,
      canvasSize: {
        width: this.canvas?.width || 0,
        height: this.canvas?.height || 0
      }
    };
  }

  // НОВОЕ: Форсированное обновление направления (для отладки)
  forceUpdateDirection() {
    this.updateRotationDirection();
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