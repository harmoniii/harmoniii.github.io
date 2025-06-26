// ui/UIManager.js - ИСПРАВЛЕННЫЙ UI менеджер с правильной инициализацией комбо и энергии
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { PanelManager } from './PanelManager.js';
import { NotificationManager } from './NotificationManager.js';
import { ModalManager } from './ModalManager.js';
import { ResourceDisplay } from './ResourceDisplay.js';
import { EffectIndicators } from './EffectIndicators.js';
import { SaveLoadManager } from './SaveLoadManager.js';
import { EnergyDisplay } from './EnergyDisplay.js';
import { ComboDisplay } from './ComboDisplay.js'; // ИСПРАВЛЕНИЕ: Добавляем ComboDisplay
import { GAME_CONSTANTS } from '../config/GameConstants.js';

export default class UIManager extends CleanupMixin {
  constructor(gameState) {
    super();
    
    this.gameState = gameState;
    this.currentPanel = null;
    
    // Инициализируем компоненты UI
    this.panelManager = new PanelManager(gameState);
    this.notificationManager = new NotificationManager();
    this.modalManager = new ModalManager(gameState);
    this.resourceDisplay = new ResourceDisplay(gameState);
    this.effectIndicators = new EffectIndicators(gameState);
    this.saveLoadManager = new SaveLoadManager(gameState);
    this.energyDisplay = new EnergyDisplay(gameState);
    this.comboDisplay = new ComboDisplay(gameState); // ИСПРАВЛЕНИЕ: Добавляем ComboDisplay
    
    // Регистрируем компоненты для очистки
    this.cleanupManager.registerComponent(this.panelManager);
    this.cleanupManager.registerComponent(this.notificationManager);
    this.cleanupManager.registerComponent(this.modalManager);
    this.cleanupManager.registerComponent(this.resourceDisplay);
    this.cleanupManager.registerComponent(this.effectIndicators);
    this.cleanupManager.registerComponent(this.saveLoadManager);
    this.cleanupManager.registerComponent(this.energyDisplay);
    this.cleanupManager.registerComponent(this.comboDisplay); // ИСПРАВЛЕНИЕ: Регистрируем ComboDisplay
    
    this.initializeElements();
    this.bindControls();
    this.bindEvents();
    this.updateDisplay();
    
    console.log('🖥️ UIManager initialized with combo and energy displays');
  }

  initializeElements() {
    // Основные кнопки навигации
    this.btnBuildings = document.getElementById('toggle-buildings');
    this.btnSkills = document.getElementById('toggle-skills');
    this.btnMarket = document.getElementById('toggle-market');
    this.btnInfo = document.getElementById('info-button');
    
    // Панель контента
    this.panel = document.getElementById('panel-container');
    
    // Кнопки управления сохранением
    this.btnLoad = document.getElementById('load-button');
    this.btnSave = document.getElementById('save-button');
    this.btnReset = document.getElementById('reset-button');
    
    // Контейнеры для отображения
    this.resourcesLeft = document.getElementById('resources-left');
    this.resourcesRight = document.getElementById('resources-right');
    this.notifications = document.getElementById('notifications');
    
    // Модальные окна
    this.infoModal = document.getElementById('info-modal');
    this.mysteryModal = document.getElementById('mystery-modal');
    
    // Проверяем наличие всех элементов
    this.validateElements();
  }

  validateElements() {
    const requiredElements = [
      'btnBuildings', 'btnSkills', 'btnMarket', 'btnInfo',
      'panel', 'btnLoad', 'btnSave', 'btnReset',
      'resourcesLeft', 'resourcesRight', 'notifications'
    ];
    
    const missingElements = requiredElements.filter(elementName => !this[elementName]);
    
    if (missingElements.length > 0) {
      console.error('Missing UI elements:', missingElements);
      throw new Error(`Missing required UI elements: ${missingElements.join(', ')}`);
    }
  }

  bindControls() {
    // Кнопки навигации
    this.addEventListener(this.btnBuildings, 'click', () => {
      this.togglePanel('buildings');
    });
    
    this.addEventListener(this.btnSkills, 'click', () => {
      this.togglePanel('skills');
    });
    
    this.addEventListener(this.btnMarket, 'click', () => {
      this.togglePanel('market');
    });
    
    this.addEventListener(this.btnInfo, 'click', () => {
      this.togglePanel('info');
    });
    
    // Обработчики Save/Load/Reset
    this.addEventListener(this.btnSave, 'click', () => {
      console.log('💾 Save button clicked');
      this.saveLoadManager.performSave();
    });
    
    this.addEventListener(this.btnLoad, 'click', () => {
      console.log('🔄 Load button clicked');
      this.saveLoadManager.performLoad();
    });
    
    this.addEventListener(this.btnReset, 'click', () => {
      console.log('🔄 Reset button clicked');
      this.saveLoadManager.performReset();
    });
    
    // Закрытие модальных окон по клику
    if (this.infoModal) {
      this.addEventListener(this.infoModal, 'click', () => {
        this.infoModal.classList.add('hidden');
      });
    }
    
    if (this.mysteryModal) {
      this.addEventListener(this.mysteryModal, 'click', () => {
        this.mysteryModal.classList.add('hidden');
      });
    }
  }

  bindEvents() {
    // События ресурсов
    eventBus.subscribe(GameEvents.RESOURCE_CHANGED, () => {
      this.updateDisplay();
    });
    
    // ИСПРАВЛЕНИЕ: События комбо теперь обрабатываются ComboDisplay
    eventBus.subscribe(GameEvents.COMBO_CHANGED, () => {
      this.comboDisplay.forceUpdate();
    });
    
    eventBus.subscribe(GameEvents.SKILL_POINTS_CHANGED, () => {
      this.updateDisplay();
    });
    
    // ИСПРАВЛЕНИЕ: События энергии с ограничением уведомлений
    eventBus.subscribe(GameEvents.ENERGY_CHANGED, () => {
      this.energyDisplay.updateFromGameState();
    });
    
    // ИСПРАВЛЕНИЕ: Ограничиваем уведомления об энергии
    let lastEnergyNotification = 0;
    const energyNotificationCooldown = 3000; // 3 секунды
    
    eventBus.subscribe(GameEvents.ENERGY_INSUFFICIENT, (data) => {
      const now = Date.now();
      if (now - lastEnergyNotification > energyNotificationCooldown) {
        this.notificationManager.showWarning(`⚡ Need ${data.required?.toFixed(1) || 'more'} energy!`);
        lastEnergyNotification = now;
      }
    });
    
    eventBus.subscribe(GameEvents.ENERGY_CRITICAL, () => {
      const now = Date.now();
      if (now - lastEnergyNotification > energyNotificationCooldown / 2) {
        this.notificationManager.showError('⚡ Critical Energy!');
        lastEnergyNotification = now;
      }
    });
    
    // События эффектов
    eventBus.subscribe(GameEvents.BUFF_APPLIED, (data) => {
      const message = data.name ? `✨ Buff: ${data.name}` : '✨ Buff applied';
      this.notificationManager.show(message);
      this.effectIndicators.update();
    });
    
    eventBus.subscribe(GameEvents.DEBUFF_APPLIED, (data) => {
      const message = data.name ? `💀 Debuff: ${data.name}` : '💀 Debuff applied';
      this.notificationManager.show(message);
      this.effectIndicators.update();
    });
    
    eventBus.subscribe(GameEvents.BUFF_EXPIRED, (data) => {
      const message = data.name ? `⏰ ${data.name} expired` : '⏰ Buff expired';
      this.notificationManager.show(message);
      this.effectIndicators.update();
    });
    
    eventBus.subscribe(GameEvents.DEBUFF_EXPIRED, (data) => {
      const message = data.name ? `⏰ ${data.name} expired` : '⏰ Debuff expired';
      this.notificationManager.show(message);
      this.effectIndicators.update();
    });
    
    // ИСПРАВЛЕНИЕ: События навыков с ограничением частоты
    let lastSkillNotification = 0;
    const skillNotificationCooldown = 1000; // 1 секунда
    
    eventBus.subscribe(GameEvents.CRITICAL_HIT, (data) => {
      const now = Date.now();
      if (now - lastSkillNotification > skillNotificationCooldown) {
        const damage = data.damage || 'Unknown';
        this.notificationManager.showSkill('💥 Critical Strike!', `Double damage: ${damage} gold`);
        lastSkillNotification = now;
      }
    });
    
    eventBus.subscribe(GameEvents.BONUS_RESOURCE_FOUND, (data) => {
      const now = Date.now();
      if (now - lastSkillNotification > skillNotificationCooldown) {
        const amount = data.amount || 'Unknown';
        const resource = data.resource || 'Unknown';
        this.notificationManager.showSkill('🔍 Resource Found!', `+${amount} ${resource}`);
        lastSkillNotification = now;
      }
    });
    
    eventBus.subscribe(GameEvents.SHIELD_BLOCK, (data) => {
      const debuff = data.debuff || 'Unknown';
      const remaining = data.remaining || 0;
      this.notificationManager.showSkill('🛡️ Shield Block!', `Blocked ${debuff} (${remaining} left)`);
    });
    
    // События зданий и маркета
    eventBus.subscribe(GameEvents.BUILDING_BOUGHT, () => {
      if (this.currentPanel === 'buildings') {
        this.showPanel('buildings');
      }
    });
    
    eventBus.subscribe(GameEvents.SKILL_BOUGHT, () => {
      if (this.currentPanel === 'skills') {
        this.showPanel('skills');
      }
    });
    
    eventBus.subscribe(GameEvents.ITEM_PURCHASED, () => {
      if (this.currentPanel === 'market') {
        this.showPanel('market');
      }
    });
    
    // UI события
    eventBus.subscribe(GameEvents.NOTIFICATION, (data) => {
      this.notificationManager.show(data.message || data);
    });
    
    eventBus.subscribe(GameEvents.TEMP_MESSAGE, (data) => {
      this.notificationManager.show(data.message || data);
    });
    
    eventBus.subscribe(GameEvents.MYSTERY_BOX, (data) => {
      if (Array.isArray(data)) {
        this.modalManager.showMysteryBox(data);
      }
    });
    
    // ИСПРАВЛЕНИЕ: Специальные события с ограничением частоты
    let lastSpecialNotification = 0;
    const specialNotificationCooldown = 500; // 0.5 секунды
    
    eventBus.subscribe(GameEvents.STAR_POWER_USED, (data) => {
      const now = Date.now();
      if (now - lastSpecialNotification > specialNotificationCooldown) {
        const resource = data.resource || 'Unknown';
        const amount = data.amount || 0;
        const remaining = data.remaining || 0;
        this.notificationManager.show(`⭐ Star Power: +${amount} ${resource} (${remaining} left)`);
        lastSpecialNotification = now;
      }
    });
    
    eventBus.subscribe(GameEvents.SLOT_MACHINE_WIN, (data) => {
      const now = Date.now();
      if (now - lastSpecialNotification > specialNotificationCooldown) {
        const resource = data.resource || 'Unknown';
        const amount = data.amount || 0;
        this.notificationManager.show(`🎰 Slot Win: +${amount} ${resource}`);
        lastSpecialNotification = now;
      }
    });
    
    eventBus.subscribe(GameEvents.TAX_COLLECTED, (data) => {
      const percent = data.percent || 'Unknown';
      this.notificationManager.show(`💸 Tax Collector: -${percent}% all resources`);
    });
    
    eventBus.subscribe(GameEvents.HEAVY_CLICK_PROGRESS, (data) => {
      const current = data.current || 0;
      const required = data.required || 0;
      const zone = data.zone !== undefined ? ` (Zone ${data.zone})` : '';
      this.notificationManager.show(`⚖️ Heavy Click: ${current}/${required}${zone}`);
    });
    
    eventBus.subscribe(GameEvents.GHOST_CLICK, () => {
      const now = Date.now();
      if (now - lastSpecialNotification > specialNotificationCooldown) {
        this.notificationManager.show('👻 Ghost Click: Ignored!');
        lastSpecialNotification = now;
      }
    });
    
    // ИСПРАВЛЕНИЕ: События энергетических зон БЕЗ дополнительных уведомлений
    // (уведомления обрабатываются в FeatureManager с ограничениями)
    eventBus.subscribe(GameEvents.ENERGY_ZONE_HIT, (data) => {
      // Не показываем дополнительные уведомления здесь
      // FeatureManager уже показывает ограниченные уведомления
    });
  }

  togglePanel(panelType) {
    if (this.currentPanel === panelType) {
      this.hidePanel();
    } else {
      this.showPanel(panelType);
    }
  }

  showPanel(panelType) {
    this.currentPanel = panelType;
    
    switch (panelType) {
      case 'buildings':
        this.panelManager.showBuildings(this.panel);
        break;
      case 'skills':
        this.panelManager.showSkills(this.panel);
        break;
      case 'market':
        this.panelManager.showMarket(this.panel);
        break;
      case 'info':
        this.panelManager.showInfo(this.panel);
        break;
      default:
        console.warn('Unknown panel type:', panelType);
        return;
    }
    
    this.panel.classList.remove('hidden');
  }

  hidePanel() {
    this.currentPanel = null;
    this.panel.classList.add('hidden');
    this.panel.innerHTML = '';
  }

  // ИСПРАВЛЕНИЕ: Обновление дисплея без управления комбо
  updateDisplay() {
    if (!this.isActive()) return;
    
    // Обновляем ресурсы (без комбо и энергии)
    this.resourceDisplay.update(this.resourcesLeft, this.resourcesRight);
    this.effectIndicators.update();
    
    // ComboDisplay и EnergyDisplay обновляются автоматически через события
  }

  // Показать всплывающую подсказку
  showTooltip(event, text) {
    if (!this.tooltip) {
      this.tooltip = document.createElement('div');
      this.tooltip.className = 'tooltip';
      document.body.appendChild(this.tooltip);
      
      this.onDestroy(() => {
        if (this.tooltip && document.body.contains(this.tooltip)) {
          document.body.removeChild(this.tooltip);
        }
      });
    }
    
    this.tooltip.textContent = text;
    this.tooltip.style.top = `${event.pageY + GAME_CONSTANTS.TOOLTIP_OFFSET}px`;
    this.tooltip.style.left = `${event.pageX + GAME_CONSTANTS.TOOLTIP_OFFSET}px`;
    this.tooltip.style.display = 'block';
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
  }

  // Получить текущую панель
  getCurrentPanel() {
    return this.currentPanel;
  }

  // Проверить, открыта ли панель
  isPanelOpen() {
    return this.currentPanel !== null;
  }

  // Получить статистику UI
  getUIStats() {
    return {
      currentPanel: this.currentPanel,
      activeNotifications: this.notificationManager.getActiveCount(),
      activeModals: this.modalManager.getActiveModals().length,
      hasActiveEffects: this.effectIndicators.hasActiveEffects(),
      displayStats: this.resourceDisplay.getDisplayStats(),
      energyDisplay: this.energyDisplay ? this.energyDisplay.getDisplayInfo() : null,
      comboDisplay: this.comboDisplay ? this.comboDisplay.getDisplayInfo() : null // ИСПРАВЛЕНИЕ: Добавляем ComboDisplay
    };
  }

  // ИСПРАВЛЕНИЕ: Форсировать обновление всего UI
  forceUpdate() {
    console.log('🔄 Forcing UI update...');
    
    // Обновляем основной дисплей
    this.updateDisplay();
    this.effectIndicators.update();
    
    // Принудительно обновляем отдельные компоненты
    if (this.energyDisplay) {
      this.energyDisplay.forceUpdate();
    }
    
    if (this.comboDisplay) {
      this.comboDisplay.forceUpdate();
    }
    
    // Обновляем текущую панель если открыта
    if (this.currentPanel) {
      const currentPanel = this.currentPanel;
      this.hidePanel();
      this.showPanel(currentPanel);
    }
    
    console.log('✅ UI force update completed');
  }

  // Деструктор
  destroy() {
    console.log('🧹 UIManager cleanup started');
    
    // Закрываем все панели и модальные окна
    this.hidePanel();
    this.modalManager.hideAllModals();
    
    // Очищаем все уведомления
    this.notificationManager.clearAll();
    
    // Вызываем родительский деструктор
    super.destroy();
    
    console.log('✅ UIManager destroyed');
  }
}