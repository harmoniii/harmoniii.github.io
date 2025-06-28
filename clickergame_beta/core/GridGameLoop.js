// core/GridGameLoop.js - Игровой цикл для сетки 3x3
import { CleanupMixin } from './CleanupManager.js';
import { eventBus, GameEvents } from './GameEvents.js';
import { UI_CONFIG } from '../config/GameConstants.js';

export class GridGameLoop extends CleanupMixin {
  constructor(gameState, gridManager) {
    super();
    
    this.gameState = gameState;
    this.gridManager = gridManager;
    
    this.canvas = null;
    this.ctx = null;
    this.running = false;
    this.animationId = null;
    
    this.needsRedraw = true;
    
    this.initializeCanvas();
    this.setupCanvasEvents();
    this.bindEvents();
    
    console.log('🔄 GridGameLoop initialized');
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
  }

  setupCanvasEvents() {
    const clickHandler = (e) => {
      e.preventDefault();
      this.handleCanvasClick(e);
    };
    
    const touchHandler = (e) => {
      e.preventDefault();
      if (e.touches && e.touches.length > 0) {
        this.handleCanvasClick(e);
      }
    };

    this.addEventListener(this.canvas, 'click', clickHandler);
    this.addEventListener(this.canvas, 'touchstart', touchHandler);
    this.addEventListener(this.canvas, 'contextmenu', (e) => e.preventDefault());
  }

  handleCanvasClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;
    
    // Масштабируем координаты к размеру canvas
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    const scaledX = clickX * scaleX;
    const scaledY = clickY * scaleY;
    
    console.log(`🖱️ Grid click at: ${scaledX.toFixed(1)}, ${scaledY.toFixed(1)}`);
    
    // Передаем клик в систему событий
    eventBus.emit(GameEvents.CLICK, {
      x: scaledX,
      y: scaledY,
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height
    });
    
    this.needsRedraw = true;
  }

  bindEvents() {
    // Обновляем при изменении клеток
    eventBus.subscribe(GameEvents.ZONES_UPDATED, () => {
      console.log('🔄 GridGameLoop: Cells updated, redrawing');
      this.needsRedraw = true;
    });
    
    // Обновляем при изменении эффектов
    eventBus.subscribe(GameEvents.BUFF_APPLIED, () => {
      this.needsRedraw = true;
    });
    
    eventBus.subscribe(GameEvents.BUFF_EXPIRED, () => {
      this.needsRedraw = true;
    });
    
    eventBus.subscribe(GameEvents.DEBUFF_APPLIED, () => {
      this.needsRedraw = true;
    });
    
    eventBus.subscribe(GameEvents.DEBUFF_EXPIRED, () => {
      this.needsRedraw = true;
    });
  }

  start() {
    if (this.running) return;
    
    console.log('🔄 Starting grid game loop...');
    this.running = true;
    this.gameLoop();
  }

  stop() {
    if (!this.running) return;
    
    console.log('⏹️ Stopping grid game loop...');
    this.running = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  gameLoop() {
    if (!this.running) return;
    
    try {
      if (this.needsRedraw) {
        this.render();
        this.needsRedraw = false;
      }
      
    } catch (error) {
      console.warn('⚠️ Error in grid game loop:', error);
    }
    
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  render() {
    this.clearCanvas();
    this.drawGrid();
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Рисуем фон
    this.ctx.fillStyle = '#f8f9fa';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawGrid() {
    // Проверяем готовность GridManager
    if (!this.gridManager || !this.gridManager.isManagerReady()) {
      console.warn('🔄 GridManager not ready, skipping render');
      return;
    }
    
    const cells = this.gridManager.getCellsForRendering();
    
    if (!cells || cells.length === 0) {
      console.warn('🔄 No cells available for rendering');
      return;
    }
    
    const cellWidth = this.canvas.width / this.gridManager.gridSize;
    const cellHeight = this.canvas.height / this.gridManager.gridSize;
    
    // Рисуем каждую клетку
    cells.forEach(cell => {
      this.drawCell(cell, cellWidth, cellHeight);
    });
    
    // Рисуем сетку
    this.drawGridLines(cellWidth, cellHeight);
  }

  drawCell(cell, cellWidth, cellHeight) {
    const x = cell.col * cellWidth;
    const y = cell.row * cellHeight;
    
    // Основная заливка клетки
    this.ctx.fillStyle = cell.color;
    this.ctx.fillRect(x, y, cellWidth, cellHeight);
    
    // Обводка клетки
    this.ctx.strokeStyle = cell.isTarget ? '#FF0000' : '#333333';
    this.ctx.lineWidth = cell.isTarget ? 4 : 2;
    this.ctx.strokeRect(x, y, cellWidth, cellHeight);
    
    // Иконка в центре клетки
    if (cell.icon) {
      this.drawCellIcon(cell, x, y, cellWidth, cellHeight);
    }
    
    // Номер клетки для отладки
    if (window.gameDebug) {
      this.drawCellDebugInfo(cell, x, y, cellWidth, cellHeight);
    }
  }

  drawCellIcon(cell, x, y, cellWidth, cellHeight) {
    const centerX = x + cellWidth / 2;
    const centerY = y + cellHeight / 2;
    
    this.ctx.save();
    this.ctx.font = 'bold 32px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 3;
    
    // Рисуем иконку с обводкой
    this.ctx.strokeText(cell.icon, centerX, centerY);
    this.ctx.fillText(cell.icon, centerX, centerY);
    
    this.ctx.restore();
  }

  drawCellDebugInfo(cell, x, y, cellWidth, cellHeight) {
    // Номер клетки в левом верхнем углу
    this.ctx.save();
    this.ctx.font = 'bold 16px Arial';
    this.ctx.fillStyle = '#000000';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(cell.index.toString(), x + 5, y + 5);
    
    // Тип клетки в правом верхнем углу
    this.ctx.textAlign = 'right';
    this.ctx.fillText(cell.type.id, x + cellWidth - 5, y + 5);
    
    this.ctx.restore();
  }

  drawGridLines(cellWidth, cellHeight) {
    this.ctx.strokeStyle = '#666666';
    this.ctx.lineWidth = 1;
    
    // Вертикальные линии
    for (let i = 1; i < this.gridManager.gridSize; i++) {
      const x = i * cellWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    
    // Горизонтальные линии
    for (let i = 1; i < this.gridManager.gridSize; i++) {
      const y = i * cellHeight;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  // Принудительная перерисовка
  forceRedraw() {
    console.log('🔄 GridGameLoop: Force redraw requested');
    this.needsRedraw = true;
    
    if (this.running) {
      this.render();
    }
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

  // Получить статистику рендеринга
  getRenderStats() {
    return {
      running: this.running,
      needsRedraw: this.needsRedraw,
      canvasSize: {
        width: this.canvas?.width || 0,
        height: this.canvas?.height || 0
      },
      gridManagerReady: this.gridManager?.isManagerReady() || false,
      cellsAvailable: this.gridManager?.getCellsForRendering()?.length || 0
    };
  }

  // Изменить размер canvas
  resize(width, height) {
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.needsRedraw = true;
      console.log(`🖼️ Grid canvas resized to ${width}x${height}`);
    }
  }

  // Получить информацию о клетках для отладки
  getGridRenderInfo() {
    if (!this.gridManager || !this.gridManager.isManagerReady()) {
      return {
        available: false,
        error: 'GridManager not ready'
      };
    }
    
    try {
      const cells = this.gridManager.getCellsForRendering();
      return {
        available: true,
        cells: cells,
        cellCount: cells ? cells.length : 0,
        targetCell: this.gridManager.getTargetCell(),
        debugInfo: this.gridManager.getDebugInfo()
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
      gridManagerReady: this.gridManager?.isManagerReady() || false,
      gameStateReady: !!(this.gameState && !this.gameState.isDestroyed),
      cellsAvailable: (this.gridManager?.getCellsForRendering()?.length || 0) > 0,
      errors: []
    };
    
    if (!validation.canvasReady) {
      validation.errors.push('Canvas or context not initialized');
    }
    
    if (!validation.gridManagerReady) {
      validation.errors.push('GridManager not ready');
    }
    
    if (!validation.gameStateReady) {
      validation.errors.push('Game state not ready');
    }
    
    if (!validation.cellsAvailable) {
      validation.errors.push('No cells available for rendering');
    }
    
    return validation;
  }

  // Деструктор
  destroy() {
    console.log('🧹 Destroying GridGameLoop...');
    
    this.stop();
    super.destroy();
    
    console.log('✅ GridGameLoop destroyed');
  }
}