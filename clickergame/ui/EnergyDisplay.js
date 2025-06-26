// ui/EnergyDisplay.js - ИСПРАВЛЕННАЯ версия с ограничением уведомлений и правильным размещением
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
    
    // ИСПРАВЛЕНИЕ: Ограничение частоты уведомлений
    this.lastNotificationTime = 0;
    this.notificationCooldown = 2000; // 2 секунды между уведомлениями
    
    this.initializeEnergyDisplay();
    this.bindEvents();
    
    console.log('⚡ EnergyDisplay initialized');
  }

  // ИСПРАВЛЕНИЕ: Инициализация с правильным размещением справа от колеса
  initializeEnergyDisplay() {
    this.createEnergyContainer();
    this.createEnergyBar();
    this.createEnergyText();
    this.createWarningIndicator();
    
    // Добавляем CSS стили если их нет
    this.addEnergyStyles();
  }

  // ИСПРАВЛЕНИЕ: Создание контейнера с правильным размещением
  createEnergyContainer() {
    this.container = document.getElementById('energy-display');
    
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'energy-display';
      this.container.className = 'energy-display-container';
      
      // ИСПРАВЛЕНИЕ: Размещаем в game-wheel-container справа от колеса
      const gameWheelContainer = document.querySelector('.game-wheel-container');
      if (gameWheelContainer) {
        gameWheelContainer.appendChild(this.container);
        console.log('⚡ Energy display placed in game wheel container');
      } else {
        // Fallback: добавляем в game-area
        const gameArea = document.getElementById('game-area');
        if (gameArea) {
          gameArea.appendChild(this.container);
          console.log('⚡ Energy display placed in game area (fallback)');
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
    this.energyBar.className = 'energy-bar energy-normal';
    
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
    this.energyStatus.className = 'energy-status ready';
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
    // ИСПРАВЛЕНИЕ: Обновляем при изменении энергии с ограничением частоты
    eventBus.subscribe(GameEvents.ENERGY_CHANGED, (data) => {
      this.updateDisplay(data);
    });

    // ИСПРАВЛЕНИЕ: Показываем предупреждения с ограничением частоты
    eventBus.subscribe(GameEvents.ENERGY_INSUFFICIENT, (data) => {
      this.showInsufficientEnergyWarning(data);
    });

    eventBus.subscribe(GameEvents.ENERGY_CRITICAL, () => {
      this.showCriticalEnergyWarning();
    });

    // Обновляем при изменении ресурсов (fallback)
    eventBus.subscribe(GameEvents.RESOURCE_CHANGED, () => {
      this.updateFromGameState();
    });
  }

  // ИСПРАВЛЕНИЕ: Обновление отображения без избыточных уведомлений
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
    
    // ИСПРАВЛЕНИЕ: Обновляем класс контейнера для анимаций
    this.updateContainerState(percentage);
  }

  // Обновление полосы энергии
  updateEnergyBar(percentage) {
    if (!this.energyBar) return;
    
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    this.energyBar.style.width = `${clampedPercentage}%`;
    
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
    
    this.energyText.textContent = `⚡ ${currentRounded}/${maxRounded}`;
    
    // ИСПРАВЛЕНИЕ: Более компактное отображение времени
    if (!canClick && timeToNext > 0) {
      const seconds = Math.ceil(timeToNext / 1000);
      this.energyText.textContent += ` (${seconds}s)`;
    }
  }

  // Обновление статуса энергии
  updateEnergyStatus(energyData) {
    if (!this.energyStatus) return;
    
    const { canClick, clickCost, timeToNext } = energyData;
    
    if (canClick) {
      this.energyStatus.textContent = `Ready!`;
      this.energyStatus.className = 'energy-status ready';
    } else {
      const secondsToNext = Math.ceil(timeToNext / 1000);
      this.energyStatus.textContent = `Recharging... ${secondsToNext}s`;
      this.energyStatus.className = 'energy-status recharging';
    }
  }

  // ИСПРАВЛЕНИЕ: Обновление состояния контейнера
  updateContainerState(percentage) {
    if (!this.container) return;
    
    // Убираем все классы состояния
    this.container.classList.remove('low-energy', 'critical-energy');
    
    if (percentage <= ENERGY_CONSTANTS.CRITICAL_THRESHOLD) {
      this.container.classList.add('critical-energy');
    } else if (percentage <= ENERGY_CONSTANTS.WARNING_THRESHOLD) {
      this.container.classList.add('low-energy');
    }
  }

  // Обновление предупреждений
  updateWarnings(percentage) {
    if (!this.warningElement) return;
    
    if (percentage <= ENERGY_CONSTANTS.PULSE_THRESHOLD) {
      this.warningElement.classList.remove('hidden');
      this.warningElement.classList.add('pulsing');
      this.warningElement.textContent = '⚡ Low!';
    } else {
      this.warningElement.classList.add('hidden');
      this.warningElement.classList.remove('pulsing', 'warning-flash', 'critical-pulse');
    }
  }

  // ИСПРАВЛЕНИЕ: Показать предупреждение с ограничением частоты
  showInsufficientEnergyWarning(data) {
    const now = Date.now();
    
    // Проверяем cooldown для уведомлений
    if (now - this.lastNotificationTime < this.notificationCooldown) {
      return; // Пропускаем уведомление
    }
    
    this.lastNotificationTime = now;
    
    if (!this.warningElement) return;
    
    const { current, required, timeToNext } = data;
    const seconds = Math.ceil(timeToNext / 1000);
    
    this.warningElement.textContent = `⚡ Need ${required.toFixed(1)}! Wait ${seconds}s`;
    this.warningElement.classList.remove('hidden');
    this.warningElement.classList.add('warning-flash');
    
    // Убираем анимацию через время
    this.createTimeout(() => {
      if (this.warningElement) {
        this.warningElement.classList.remove('warning-flash');
      }
    }, 2000);
  }

  // ИСПРАВЛЕНИЕ: Показать критическое предупреждение с ограничением
  showCriticalEnergyWarning() {
    const now = Date.now();
    
    // Для критических предупреждений используем меньший cooldown
    if (now - this.lastNotificationTime < this.notificationCooldown / 2) {
      return;
    }
    
    this.lastNotificationTime = now;
    
    if (!this.warningElement) return;
    
    this.warningElement.textContent = '⚡ Critical!';
    this.warningElement.classList.remove('hidden');
    this.warningElement.classList.add('critical-pulse');
  }

  // Обновление из состояния игры (fallback)
  updateFromGameState() {
    if (!this.gameState.energyManager) return;
    
    try {
      const energyInfo = this.gameState.energyManager.getEnergyInfo();
      if (energyInfo) {
        this.updateDisplay(energyInfo);
      }
    } catch (error) {
      console.warn('⚠️ Error updating energy display from game state:', error);
    }
  }

  // ИСПРАВЛЕНИЕ: Упрощенные CSS стили для компактного отображения
  addEnergyStyles() {
    if (document.getElementById('energy-display-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'energy-display-styles';
    style.textContent = `
      /* ИСПРАВЛЕННЫЕ стили для компактного энергетического дисплея */
      .energy-display-container {
        background: linear-gradient(135deg, #2C3E50 0%, #34495E 100%);
        border: 2px solid #3498DB;
        border-radius: 15px;
        padding: 12px 16px;
        box-shadow: 
          0 4px 12px rgba(52, 152, 219, 0.3),
          inset 0 2px 8px rgba(255, 255, 255, 0.1);
        text-align: center;
        min-width: 120px;
        max-width: 160px;
        position: relative;
        backdrop-filter: blur(5px);
        transition: all 0.3s ease;
      }

      /* Контейнер полосы энергии */
      .energy-bar-container {
        margin-bottom: 8px;
      }

      .energy-bar-background {
        background: #1A252F;
        border: 2px solid #34495E;
        border-radius: 8px;
        height: 16px;
        overflow: hidden;
        position: relative;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
      }

      /* Полоса энергии */
      .energy-bar {
        height: 100%;
        transition: all 0.3s ease;
        position: relative;
        background: linear-gradient(90deg, #27AE60 0%, #2ECC71 100%);
        box-shadow: 
          0 0 8px rgba(46, 204, 113, 0.5),
          inset 0 2px 4px rgba(255, 255, 255, 0.2);
      }

      .energy-bar.energy-normal {
        background: linear-gradient(90deg, #27AE60 0%, #2ECC71 100%);
        box-shadow: 0 0 8px rgba(46, 204, 113, 0.5);
      }

      .energy-bar.energy-warning {
        background: linear-gradient(90deg, #F39C12 0%, #E67E22 100%);
        box-shadow: 0 0 8px rgba(243, 156, 18, 0.5);
      }

      .energy-bar.energy-critical {
        background: linear-gradient(90deg, #E74C3C 0%, #C0392B 100%);
        box-shadow: 0 0 8px rgba(231, 76, 60, 0.5);
        animation: energyPulse 1s ease-in-out infinite alternate;
      }

      /* Компактный текст энергии */
      .energy-text {
        font-size: 0.9rem;
        font-weight: bold;
        color: #ECF0F1;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        margin-bottom: 4px;
      }

      /* Компактный статус энергии */
      .energy-status {
        font-size: 0.75rem;
        margin-bottom: 8px;
        font-weight: 500;
      }

      .energy-status.ready {
        color: #2ECC71;
        text-shadow: 0 0 4px rgba(46, 204, 113, 0.5);
      }

      .energy-status.recharging {
        color: #F39C12;
        text-shadow: 0 0 4px rgba(243, 156, 18, 0.5);
      }

      /* Предупреждения */
      .energy-warning {
        position: absolute;
        top: -8px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #E74C3C 0%, #C0392B 100%);
        color: white;
        padding: 3px 10px;
        border-radius: 15px;
        font-size: 0.7rem;
        font-weight: bold;
        border: 2px solid #C0392B;
        box-shadow: 0 3px 8px rgba(231, 76, 60, 0.4);
        z-index: 10;
      }

      .energy-warning.hidden {
        display: none;
      }

      /* Анимации */
      @keyframes energyPulse {
        0% {
          box-shadow: 0 0 8px rgba(231, 76, 60, 0.5);
        }
        100% {
          box-shadow: 0 0 15px rgba(231, 76, 60, 0.8);
        }
      }

      .energy-warning.pulsing {
        animation: warningPulse 1s ease-in-out infinite alternate;
      }

      @keyframes warningPulse {
        0% {
          transform: translateX(-50%) scale(1);
          box-shadow: 0 3px 8px rgba(231, 76, 60, 0.4);
        }
        100% {
          transform: translateX(-50%) scale(1.05);
          box-shadow: 0 4px 12px rgba(231, 76, 60, 0.7);
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
          box-shadow: 0 5px 15px rgba(231, 76, 60, 0.8);
        }
      }

      /* Состояния контейнера */
      .energy-display-container:hover {
        transform: translateY(-2px);
        box-shadow: 
          0 6px 16px rgba(52, 152, 219, 0.4),
          inset 0 2px 8px rgba(255, 255, 255, 0.15);
      }

      .energy-display-container.low-energy {
        border-color: #F39C12;
        box-shadow: 
          0 4px 12px rgba(243, 156, 18, 0.3),
          inset 0 2px 8px rgba(255, 255, 255, 0.1);
      }

      .energy-display-container.critical-energy {
        border-color: #E74C3C;
        animation: containerPulse 1.5s ease-in-out infinite alternate;
      }

      @keyframes containerPulse {
        0% {
          border-color: #E74C3C;
          box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
        }
        100% {
          border-color: #FF6B6B;
          box-shadow: 0 6px 20px rgba(231, 76, 60, 0.6);
        }
      }

      /* Адаптивность */
      @media (max-width: 768px) {
        .energy-display-container {
          min-width: 100px;
          max-width: 140px;
          padding: 10px 14px;
        }
        
        .energy-text {
          font-size: 0.8rem;
        }
        
        .energy-status {
          font-size: 0.7rem;
        }
        
        .energy-warning {
          font-size: 0.65rem;
          padding: 2px 8px;
        }
      }
    `;
    
    document.head.appendChild(style);
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
      isVisible: this.container && !this.container.classList.contains('hidden'),
      lastNotificationTime: this.lastNotificationTime
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