// ui/EnergyDisplay.js - UI компонент для отображения энергии
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { ENERGY_CONSTANTS } from '../managers/EnergyManager.js';

export class EnergyDisplay extends CleanupMixin {
  constructor(gameState) {
    super();
    
    this.gameState = gameState;
    this.container = null;
    this.energyBar = null;
    this.energyText = null;
    this.energyStatus = null;
    this.warningElement = null;
    
    this.initializeEnergyDisplay();
    this.bindEvents();
    
    console.log('⚡ EnergyDisplay initialized');
  }

  // Инициализация UI энергии
  initializeEnergyDisplay() {
    this.createEnergyContainer();
    this.createEnergyBar();
    this.createEnergyText();
    this.createWarningIndicator();
    
    // Добавляем CSS стили если их нет
    this.addEnergyStyles();
  }

  // Создание контейнера энергии
  createEnergyContainer() {
    // Ищем существующий контейнер или создаем новый
    this.container = document.getElementById('energy-display');
    
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'energy-display';
      this.container.className = 'energy-display-container';
      
      // Размещаем под индикатором комбо
      const comboIndicator = document.getElementById('combo-indicator');
      if (comboIndicator && comboIndicator.parentNode) {
        comboIndicator.parentNode.insertBefore(this.container, comboIndicator.nextSibling);
      } else {
        // Fallback: добавляем в game-area
        const gameArea = document.getElementById('game-area');
        if (gameArea) {
          gameArea.appendChild(this.container);
        }
      }
    }
    
    this.registerDOMElement(this.container);
  }

  // Создание полосы энергии
  createEnergyBar() {
    const barContainer = document.createElement('div');
    barContainer.className = 'energy-bar-container';
    
    this.energyBar = document.createElement('div');
    this.energyBar.className = 'energy-bar';
    
    const barBackground = document.createElement('div');
    barBackground.className = 'energy-bar-background';
    
    barBackground.appendChild(this.energyBar);
    barContainer.appendChild(barBackground);
    this.container.appendChild(barContainer);
  }

  // Создание текста энергии
  createEnergyText() {
    this.energyText = document.createElement('div');
    this.energyText.className = 'energy-text';
    this.energyText.textContent = 'Energy: 100/100';
    this.container.appendChild(this.energyText);
    
    this.energyStatus = document.createElement('div');
    this.energyStatus.className = 'energy-status';
    this.energyStatus.textContent = 'Ready to click';
    this.container.appendChild(this.energyStatus);
  }

  // Создание индикатора предупреждения
  createWarningIndicator() {
    this.warningElement = document.createElement('div');
    this.warningElement.className = 'energy-warning hidden';
    this.warningElement.innerHTML = '⚡ Low Energy!';
    this.container.appendChild(this.warningElement);
  }

  // Привязка событий
  bindEvents() {
    // Обновляем при изменении энергии
    eventBus.subscribe(GameEvents.ENERGY_CHANGED, (data) => {
      this.updateDisplay(data);
    });

    // Показываем предупреждение при недостатке энергии
    eventBus.subscribe(GameEvents.ENERGY_INSUFFICIENT, (data) => {
      this.showInsufficientEnergyWarning(data);
    });

    // Критический уровень энергии
    eventBus.subscribe(GameEvents.ENERGY_CRITICAL, () => {
      this.showCriticalEnergyWarning();
    });

    // Обновляем при изменении ресурсов (fallback)
    eventBus.subscribe(GameEvents.RESOURCE_CHANGED, () => {
      this.updateFromGameState();
    });
  }

  // Обновление отображения
  updateDisplay(energyData) {
    if (!this.isActive() || !this.container) return;
    
    const { current, max, percentage, canClick, timeToNext } = energyData;
    
    // Обновляем полосу энергии
    this.updateEnergyBar(percentage);
    
    // Обновляем текст
    this.updateEnergyText(current, max, canClick, timeToNext);
    
    // Обновляем статус
    this.updateEnergyStatus(energyData);
    
    // Обновляем предупреждения
    this.updateWarnings(percentage);
  }

  // Обновление полосы энергии
  updateEnergyBar(percentage) {
    if (!this.energyBar) return;
    
    this.energyBar.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
    
    // Изменяем цвет в зависимости от уровня
    this.energyBar.className = 'energy-bar';
    
    if (percentage <= ENERGY_CONSTANTS.CRITICAL_THRESHOLD) {
      this.energyBar.classList.add('energy-critical');
    } else if (percentage <= ENERGY_CONSTANTS.WARNING_THRESHOLD) {
      this.energyBar.classList.add('energy-warning');
    } else {
      this.energyBar.classList.add('energy-normal');
    }
  }

  // Обновление текста энергии
  updateEnergyText(current, max, canClick, timeToNext) {
    if (!this.energyText) return;
    
    const currentRounded = Math.floor(current);
    const maxRounded = Math.floor(max);
    
    this.energyText.textContent = `⚡ Energy: ${currentRounded}/${maxRounded}`;
    
    // Добавляем информацию о времени до восстановления
    if (!canClick && timeToNext > 0) {
      const seconds = Math.ceil(timeToNext / 1000);
      this.energyText.textContent += ` (${seconds}s)`;
    }
  }

  // Обновление статуса энергии
  updateEnergyStatus(energyData) {
    if (!this.energyStatus) return;
    
    const { canClick, clickCost, timeToNext, timeToFull } = energyData;
    
    if (canClick) {
      this.energyStatus.textContent = `Ready! Cost: ${clickCost.toFixed(1)} energy`;
      this.energyStatus.className = 'energy-status ready';
    } else {
      const secondsToNext = Math.ceil(timeToNext / 1000);
      this.energyStatus.textContent = `Recharging... ${secondsToNext}s`;
      this.energyStatus.className = 'energy-status recharging';
    }
  }

  // Обновление предупреждений
  updateWarnings(percentage) {
    if (!this.warningElement) return;
    
    if (percentage <= ENERGY_CONSTANTS.PULSE_THRESHOLD) {
      this.warningElement.classList.remove('hidden');
      this.warningElement.classList.add('pulsing');
    } else {
      this.warningElement.classList.add('hidden');
      this.warningElement.classList.remove('pulsing');
    }
  }

  // Показать предупреждение о недостатке энергии
  showInsufficientEnergyWarning(data) {
    if (!this.warningElement) return;
    
    const { current, required, timeToNext } = data;
    const seconds = Math.ceil(timeToNext / 1000);
    
    this.warningElement.textContent = `⚡ Need ${required.toFixed(1)} energy! Wait ${seconds}s`;
    this.warningElement.classList.remove('hidden');
    this.warningElement.classList.add('warning-flash');
    
    // Убираем анимацию через 3 секунды
    this.createTimeout(() => {
      if (this.warningElement) {
        this.warningElement.classList.remove('warning-flash');
      }
    }, 3000);
  }

  // Показать критическое предупреждение
  showCriticalEnergyWarning() {
    if (!this.warningElement) return;
    
    this.warningElement.textContent = '⚡ Critical Energy!';
    this.warningElement.classList.remove('hidden');
    this.warningElement.classList.add('critical-pulse');
  }

  // Обновление из состояния игры (fallback)
  updateFromGameState() {
    if (!this.gameState.energyManager) return;
    
    const energyInfo = this.gameState.energyManager.getEnergyInfo();
    this.updateDisplay(energyInfo);
  }

  // Добавление CSS стилей
  addEnergyStyles() {
    if (document.getElementById('energy-display-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'energy-display-styles';
    style.textContent = `
      /* Контейнер энергии */
      .energy-display-container {
        background: linear-gradient(135deg, #2C3E50 0%, #34495E 100%);
        border: 2px solid #3498DB;
        border-radius: 15px;
        padding: 15px 20px;
        margin: 1rem 0;
        box-shadow: 
          0 4px 15px rgba(52, 152, 219, 0.3),
          inset 0 2px 10px rgba(255, 255, 255, 0.1);
        text-align: center;
        min-width: 250px;
        position: relative;
        backdrop-filter: blur(5px);
      }

      /* Контейнер полосы энергии */
      .energy-bar-container {
        margin-bottom: 10px;
      }

      .energy-bar-background {
        background: #1A252F;
        border: 2px solid #34495E;
        border-radius: 10px;
        height: 20px;
        overflow: hidden;
        position: relative;
        box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.3);
      }

      /* Полоса энергии */
      .energy-bar {
        height: 100%;
        transition: all 0.3s ease;
        position: relative;
        background: linear-gradient(90deg, #27AE60 0%, #2ECC71 100%);
        box-shadow: 
          0 0 10px rgba(46, 204, 113, 0.5),
          inset 0 2px 5px rgba(255, 255, 255, 0.2);
      }

      .energy-bar.energy-normal {
        background: linear-gradient(90deg, #27AE60 0%, #2ECC71 100%);
        box-shadow: 0 0 10px rgba(46, 204, 113, 0.5);
      }

      .energy-bar.energy-warning {
        background: linear-gradient(90deg, #F39C12 0%, #E67E22 100%);
        box-shadow: 0 0 10px rgba(243, 156, 18, 0.5);
      }

      .energy-bar.energy-critical {
        background: linear-gradient(90deg, #E74C3C 0%, #C0392B 100%);
        box-shadow: 0 0 10px rgba(231, 76, 60, 0.5);
        animation: energyPulse 1s ease-in-out infinite alternate;
      }

      /* Текст энергии */
      .energy-text {
        font-size: 1.1rem;
        font-weight: bold;
        color: #ECF0F1;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        margin-bottom: 5px;
      }

      /* Статус энергии */
      .energy-status {
        font-size: 0.9rem;
        margin-bottom: 10px;
        font-weight: 500;
      }

      .energy-status.ready {
        color: #2ECC71;
        text-shadow: 0 0 5px rgba(46, 204, 113, 0.5);
      }

      .energy-status.recharging {
        color: #F39C12;
        text-shadow: 0 0 5px rgba(243, 156, 18, 0.5);
      }

      /* Предупреждения */
      .energy-warning {
        position: absolute;
        top: -10px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #E74C3C 0%, #C0392B 100%);
        color: white;
        padding: 5px 15px;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: bold;
        border: 2px solid #C0392B;
        box-shadow: 0 4px 10px rgba(231, 76, 60, 0.4);
        z-index: 10;
      }

      .energy-warning.hidden {
        display: none;
      }

      /* Анимации */
      @keyframes energyPulse {
        0% {
          box-shadow: 0 0 10px rgba(231, 76, 60, 0.5);
        }
        100% {
          box-shadow: 0 0 20px rgba(231, 76, 60, 0.8);
        }
      }

      .energy-warning.pulsing {
        animation: warningPulse 1s ease-in-out infinite alternate;
      }

      @keyframes warningPulse {
        0% {
          transform: translateX(-50%) scale(1);
          box-shadow: 0 4px 10px rgba(231, 76, 60, 0.4);
        }
        100% {
          transform: translateX(-50%) scale(1.05);
          box-shadow: 0 6px 15px rgba(231, 76, 60, 0.7);
        }
      }

      .energy-warning.warning-flash {
        animation: warningFlash 0.5s ease-in-out 3;
      }

      @keyframes warningFlash {
        0%, 100% {
          opacity: 1;
          background: linear-gradient(135deg, #E74C3C 0%, #C0392B 100%);
        }
        50% {
          opacity: 0.7;
          background: linear-gradient(135deg, #F39C12 0%, #E67E22 100%);
        }
      }

      .energy-warning.critical-pulse {
        animation: criticalPulse 0.3s ease-in-out infinite alternate;
      }

      @keyframes criticalPulse {
        0% {
          transform: translateX(-50%) scale(1);
          background: linear-gradient(135deg, #E74C3C 0%, #C0392B 100%);
        }
        100% {
          transform: translateX(-50%) scale(1.1);
          background: linear-gradient(135deg, #FF6B6B 0%, #E74C3C 100%);
          box-shadow: 0 6px 20px rgba(231, 76, 60, 0.8);
        }
      }

      /* Адаптивность */
      @media (max-width: 768px) {
        .energy-display-container {
          min-width: 200px;
          padding: 10px 15px;
        }
        
        .energy-text {
          font-size: 1rem;
        }
        
        .energy-status {
          font-size: 0.8rem;
        }
        
        .energy-warning {
          font-size: 0.7rem;
          padding: 3px 10px;
        }
      }

      /* Интеграция с темой игры */
      .energy-display-container:hover {
        transform: translateY(-2px);
        box-shadow: 
          0 6px 20px rgba(52, 152, 219, 0.4),
          inset 0 2px 10px rgba(255, 255, 255, 0.15);
      }

      /* Эффект при низкой энергии для всего контейнера */
      .energy-display-container.low-energy {
        border-color: #E74C3C;
        box-shadow: 
          0 4px 15px rgba(231, 76, 60, 0.3),
          inset 0 2px 10px rgba(255, 255, 255, 0.1);
      }

      .energy-display-container.critical-energy {
        animation: containerPulse 1.5s ease-in-out infinite alternate;
      }

      @keyframes containerPulse {
        0% {
          border-color: #E74C3C;
          box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
        }
        100% {
          border-color: #FF6B6B;
          box-shadow: 0 6px 25px rgba(231, 76, 60, 0.6);
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  // Показать подсказку энергии
  showTooltip(event) {
    if (!this.gameState.energyManager) return;
    
    const energyStats = this.gameState.energyManager.getEnergyStatistics();
    const tooltipText = this.createTooltipText(energyStats);
    
    // Создаем или обновляем подсказку
    if (!this.tooltip) {
      this.tooltip = document.createElement('div');
      this.tooltip.className = 'energy-tooltip';
      document.body.appendChild(this.tooltip);
      
      this.onDestroy(() => {
        if (this.tooltip && document.body.contains(this.tooltip)) {
          document.body.removeChild(this.tooltip);
        }
      });
    }
    
    this.tooltip.innerHTML = tooltipText;
    this.tooltip.style.display = 'block';
    this.tooltip.style.left = `${event.pageX + 10}px`;
    this.tooltip.style.top = `${event.pageY + 10}px`;
  }

  // Скрыть подсказку
  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
  }

  // Создать текст подсказки
  createTooltipText(energyStats) {
    const { 
      current, max, percentage, totalConsumed, totalRegenerated,
      clickCost, regenRate, maxEnergyBonuses, regenBonuses, costReduction
    } = energyStats;
    
    return `
      <div class="tooltip-section">
        <strong>Energy Status</strong><br>
        Current: ${current.toFixed(1)}/${max}<br>
        Percentage: ${percentage.toFixed(1)}%<br>
        Click Cost: ${clickCost.toFixed(1)} energy<br>
        Regen Rate: ${regenRate.toFixed(1)} per 15s
      </div>
      
      <div class="tooltip-section">
        <strong>Statistics</strong><br>
        Total Consumed: ${totalConsumed.toFixed(1)}<br>
        Total Regenerated: ${totalRegenerated.toFixed(1)}
      </div>
      
      <div class="tooltip-section">
        <strong>Bonuses</strong><br>
        Max Energy: +${Object.values(maxEnergyBonuses).reduce((sum, val) => sum + val, 0)}<br>
        Regen Rate: +${(Object.values(regenBonuses).reduce((sum, val) => sum + val, 0) * 100).toFixed(0)}%<br>
        Cost Reduction: ${(Object.values(costReduction).reduce((sum, val) => sum + val, 0) * 100).toFixed(0)}%
      </div>
    `;
  }

  // Принудительное обновление
  forceUpdate() {
    this.updateFromGameState();
  }

  // Получить информацию о компоненте
  getDisplayInfo() {
    return {
      container: !!this.container,
      energyBar: !!this.energyBar,
      energyText: !!this.energyText,
      energyStatus: !!this.energyStatus,
      warningElement: !!this.warningElement,
      isVisible: this.container && !this.container.classList.contains('hidden')
    };
  }

  // Скрыть/показать дисплей энергии
  setVisible(visible) {
    if (!this.container) return;
    
    if (visible) {
      this.container.classList.remove('hidden');
    } else {
      this.container.classList.add('hidden');
    }
  }

  // Деструктор
  destroy() {
    console.log('🧹 EnergyDisplay cleanup started');
    
    // Скрываем предупреждения
    if (this.warningElement) {
      this.warningElement.classList.add('hidden');
    }
    
    super.destroy();
    
    console.log('✅ EnergyDisplay destroyed');
  }
}