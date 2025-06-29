// ui/EnergyDisplay.js - ИСПРАВЛЕННАЯ версия с простой инициализацией
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';

export class EnergyDisplay extends CleanupMixin {
  constructor(gameState) {
    super();
    
    this.gameState = gameState;
    this.container = null;
    this.energyBar = null;
    this.energyText = null;
    this.energyStatus = null;
    this.warningElement = null;
    
    // Ограничение частоты уведомлений
    this.lastNotificationTime = 0;
    this.notificationCooldown = 2000; // 2 секунды между уведомлениями
    
    this.initializeEnergyDisplay();
    this.bindEvents();
    
    console.log('⚡ EnergyDisplay initialized');
  }

  // ИСПРАВЛЕНИЕ: Простая инициализация с поиском существующего элемента
  initializeEnergyDisplay() {
    this.findEnergyContainer();
    this.findEnergyElements();
    
    // Если элементы не найдены, обновляем из состояния игры
    if (!this.energyBar || !this.energyText || !this.energyStatus) {
      console.log('⚡ Energy display elements not found, will update from game state');
    }
  }

  // ИСПРАВЛЕНИЕ: Поиск существующего контейнера
  findEnergyContainer() {
    this.container = document.getElementById('energy-display');
    
    if (this.container) {
      console.log('⚡ Found existing energy display container');
    } else {
      // Ищем контейнер по классу
      this.container = document.querySelector('.energy-display-container');
      if (this.container) {
        this.container.id = 'energy-display';
        console.log('⚡ Found energy container by class, added ID');
      }
    }
    
    if (this.container) {
      this.registerDOMElement(this.container);
    }
  }

  // Поиск элементов энергии
  findEnergyElements() {
    if (!this.container) return;
    
    this.energyBar = this.container.querySelector('.energy-bar');
    this.energyText = this.container.querySelector('.energy-text');
    this.energyStatus = this.container.querySelector('.energy-status');
    this.warningElement = this.container.querySelector('.energy-warning');
  }

  // Привязка событий
  bindEvents() {
    // Обновляем при изменении энергии
    eventBus.subscribe(GameEvents.ENERGY_CHANGED, (data) => {
      this.updateDisplay(data);
    });

    // Показываем предупреждения с ограничением частоты
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

  // ИСПРАВЛЕНИЕ: Обновление отображения
  updateDisplay(energyData) {
    if (!this.isActive()) return;
    
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
    
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    this.energyBar.style.width = `${clampedPercentage}%`;
    
    // Изменяем цвет в зависимости от уровня
    this.energyBar.className = 'energy-bar';
    
    if (percentage <= GAME_CONSTANTS.CRITICAL_THRESHOLD) {
      this.energyBar.classList.add('energy-critical');
    } else if (percentage <= GAME_CONSTANTS.WARNING_THRESHOLD) {
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
    
    // Показываем время перезарядки если нужно
    if (!canClick && timeToNext > 0) {
      const seconds = Math.ceil(timeToNext / 1000);
      this.energyText.textContent += ` (${seconds}s)`;
    }
  }

  // Обновление статуса энергии
  updateEnergyStatus(energyData) {
    if (!this.energyStatus) return;
    
    const { canClick, timeToNext } = energyData;
    
    if (canClick) {
      this.energyStatus.textContent = `Ready!`;
      this.energyStatus.className = 'energy-status ready';
    } else {
      const secondsToNext = Math.ceil(timeToNext / 1000);
      this.energyStatus.textContent = `${secondsToNext}s`;
      this.energyStatus.className = 'energy-status recharging';
    }
  }

  // Обновление предупреждений
  updateWarnings(percentage) {
    if (!this.warningElement) return;
    
    if (percentage <= GAME_CONSTANTS.PULSE_THRESHOLD) {
      this.warningElement.classList.remove('hidden');
      this.warningElement.classList.add('pulsing');
      this.warningElement.textContent = '⚡ Low!';
    } else {
      this.warningElement.classList.add('hidden');
      this.warningElement.classList.remove('pulsing', 'warning-flash', 'critical-pulse');
    }
  }

  // Показать предупреждение с ограничением частоты
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
    
    this.warningElement.textContent = `⚡ ${seconds}s`;
    this.warningElement.classList.remove('hidden');
    this.warningElement.classList.add('warning-flash');
    
    // Убираем анимацию через время
    this.createTimeout(() => {
      if (this.warningElement) {
        this.warningElement.classList.remove('warning-flash');
      }
    }, 2000);
  }

  // Показать критическое предупреждение с ограничением
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