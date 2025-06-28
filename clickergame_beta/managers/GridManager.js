// managers/GridManager.js - Новая система с квадратом 3x3
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';

// Типы клеток
const CELL_TYPES = {
  TARGET: { id: 'target', color: '#C41E3A', icon: '🎯', name: 'Target' },
  ENERGY: { id: 'energy', color: '#228B22', icon: '⚡', name: 'Energy' },
  BONUS: { id: 'bonus', color: '#FFB347', icon: '💰', name: 'Bonus' },
  INACTIVE: { id: 'inactive', color: '#E5E5E5', icon: '', name: 'Empty' }
};

export class GridManager extends CleanupMixin {
  constructor() {
    super();
    
    // Квадрат 3x3 = 9 клеток
    this.gridSize = 3;
    this.totalCells = this.gridSize * this.gridSize;
    this.cells = [];
    this.targetCell = 0; // Индекс целевой клетки (0-8)
    this.isReady = false;
    
    this.initializeGrid();
    console.log('🎯 GridManager: 3x3 grid initialized');
  }

  // Инициализация сетки
  initializeGrid() {
    console.log('🎯 Creating 3x3 grid...');
    
    // Создаем 9 клеток (0-8)
    for (let i = 0; i < this.totalCells; i++) {
      this.cells[i] = {
        index: i,
        row: Math.floor(i / this.gridSize),
        col: i % this.gridSize,
        type: CELL_TYPES.INACTIVE,
        isTarget: false
      };
    }
    
    // Генерируем типы клеток
    this.generateCellTypes();
    
    this.isReady = true;
    console.log(`✅ ${this.totalCells} cells created and ready`);
  }

  // Генерация типов клеток
  generateCellTypes() {
    // Сбрасываем все клетки на неактивные
    this.cells.forEach(cell => {
      cell.type = CELL_TYPES.INACTIVE;
      cell.isTarget = false;
    });
    
    // Устанавливаем целевую клетку
    this.cells[this.targetCell].type = CELL_TYPES.TARGET;
    this.cells[this.targetCell].isTarget = true;
    
    // Добавляем 2-3 энергетические клетки
    this.addSpecialCells(CELL_TYPES.ENERGY, 2);
    
    // Добавляем 1 бонусную клетку
    this.addSpecialCells(CELL_TYPES.BONUS, 1);
  }

  // Добавить специальные клетки
  addSpecialCells(cellType, count) {
    const availableIndices = [];
    
    // Собираем доступные индексы (не целевые)
    for (let i = 0; i < this.totalCells; i++) {
      if (i !== this.targetCell && this.cells[i].type === CELL_TYPES.INACTIVE) {
        availableIndices.push(i);
      }
    }
    
    // Добавляем клетки случайно
    for (let i = 0; i < count && availableIndices.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableIndices.length);
      const cellIndex = availableIndices.splice(randomIndex, 1)[0];
      this.cells[cellIndex].type = cellType;
    }
  }

  // Установить новую целевую клетку
  setTargetCell(newTargetIndex) {
    if (newTargetIndex < 0 || newTargetIndex >= this.totalCells) {
      console.warn(`Invalid target cell: ${newTargetIndex}`);
      return false;
    }
    
    if (this.targetCell === newTargetIndex) {
      return true; // Уже установлена
    }
    
    console.log(`🎯 Moving target: ${this.targetCell} -> ${newTargetIndex}`);
    
    this.targetCell = newTargetIndex;
    this.generateCellTypes();
    
    // Уведомляем об обновлении
    eventBus.emit(GameEvents.ZONES_UPDATED, {
      targetCell: this.targetCell,
      cells: this.getCellsForRendering()
    });
    
    return true;
  }

  // Перемешать клетки (выбрать новую цель)
  shuffleCells() {
    let newTarget;
    let attempts = 0;
    
    do {
      newTarget = Math.floor(Math.random() * this.totalCells);
      attempts++;
    } while (newTarget === this.targetCell && attempts < 10);
    
    return this.setTargetCell(newTarget);
  }

  // Найти клетку по координатам клика
  findCellByClick(clickX, clickY, canvasWidth, canvasHeight) {
    // Размер одной клетки
    const cellWidth = canvasWidth / this.gridSize;
    const cellHeight = canvasHeight / this.gridSize;
    
    // Определяем клетку по координатам
    const col = Math.floor(clickX / cellWidth);
    const row = Math.floor(clickY / cellHeight);
    
    // Проверяем границы
    if (col < 0 || col >= this.gridSize || row < 0 || row >= this.gridSize) {
      return null;
    }
    
    const cellIndex = row * this.gridSize + col;
    return this.cells[cellIndex];
  }

  // Получить клетки для рендеринга
  getCellsForRendering() {
    if (!this.isReady) {
      console.warn('🎯 GridManager not ready for rendering');
      return [];
    }
    
    return this.cells.map(cell => ({
      index: cell.index,
      row: cell.row,
      col: cell.col,
      type: cell.type,
      isTarget: cell.isTarget,
      color: cell.type.color,
      icon: cell.type.icon,
      name: cell.type.name
    }));
  }

  // Обработать клик по клетке
  handleCellClick(clickX, clickY, canvasWidth, canvasHeight) {
    const clickedCell = this.findCellByClick(clickX, clickY, canvasWidth, canvasHeight);
    
    if (!clickedCell) {
      return null;
    }
    
    // Вычисляем точность (всегда высокая для клеток)
    const accuracy = 0.8 + Math.random() * 0.2; // 80-100%
    
    return {
      cellIndex: clickedCell.index,
      cellType: clickedCell.type,
      isTarget: clickedCell.isTarget,
      row: clickedCell.row,
      col: clickedCell.col,
      accuracy: accuracy,
      effects: this.getCellEffects(clickedCell)
    };
  }

  // Получить эффекты клетки
  getCellEffects(cell) {
    switch (cell.type.id) {
      case 'target':
        return { givesGold: true, givesCombo: true, energyCost: 1 };
      case 'energy':
        return { energyRestore: 3, energyCost: 0 };
      case 'bonus':
        return { energyRestore: 2, resourceBonus: true, energyCost: 0 };
      default:
        return { energyCost: 0 };
    }
  }

  // Получить текущую целевую клетку
  getTargetCell() {
    return this.targetCell;
  }

  // Получить клетку по индексу
  getCell(index) {
    return this.cells[index] || null;
  }

  // Проверить готовность
  isManagerReady() {
    return this.isReady && this.cells.length === this.totalCells;
  }

  // Получить статистику
  getStats() {
    return {
      isReady: this.isReady,
      cellCount: this.cells.length,
      targetCell: this.targetCell,
      gridSize: this.gridSize,
      cellTypes: this.cells.reduce((acc, cell) => {
        acc[cell.type.id] = (acc[cell.type.id] || 0) + 1;
        return acc;
      }, {})
    };
  }

  // Получить отладочную информацию
  getDebugInfo() {
    return {
      isReady: this.isReady,
      targetCell: this.targetCell,
      gridSize: this.gridSize,
      cells: this.cells.map(cell => ({
        index: cell.index,
        row: cell.row,
        col: cell.col,
        type: cell.type.id,
        isTarget: cell.isTarget
      }))
    };
  }

  // Деструктор
  destroy() {
    console.log('🧹 GridManager cleanup');
    this.isReady = false;
    this.cells = [];
    super.destroy();
  }
}