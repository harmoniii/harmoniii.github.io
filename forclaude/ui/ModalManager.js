// ui/ModalManager.js - ИСПРАВЛЕННАЯ версия управления модальными окнами
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { getResourceEmoji } from '../config/ResourceConfig.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';

export class ModalManager extends CleanupMixin {
  constructor(gameState) {
    super();
    
    this.gameState = gameState;
    this.activeModals = new Set();
    
    this.initializeModals();
    this.bindEvents();
    
    console.log('🪟 ModalManager initialized');
  }

  // ИСПРАВЛЕННАЯ инициализация модальных окон
  initializeModals() {
    // Проверяем наличие базовых модальных окон
    this.mysteryModal = document.getElementById('mystery-modal');
    this.infoModal = document.getElementById('info-modal');
    
    if (!this.mysteryModal) {
      this.mysteryModal = this.createModal('mystery-modal');
    }
    
    if (!this.infoModal) {
      this.infoModal = this.createModal('info-modal');
    }
    
    // ИСПРАВЛЕНИЕ: Правильная регистрация DOM элементов
    if (this.mysteryModal) {
      this.registerDOMElement(this.mysteryModal);
    }
    if (this.infoModal) {
      this.registerDOMElement(this.infoModal);
    }
  }

  // Создать модальное окно
  createModal(id) {
    const modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal hidden';
    document.body.appendChild(modal);
    return modal;
  }

  // Привязка событий
  bindEvents() {
    // Mystery Box событие
    eventBus.subscribe(GameEvents.MYSTERY_BOX, (data) => {
      if (Array.isArray(data)) {
        this.showMysteryBox(data);
      }
    });
    
    // Закрытие модальных окон по клику вне области
    this.addEventListener(document, 'click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.hideModal(e.target);
      }
    });
    
    // Закрытие по ESC
    this.addEventListener(document, 'keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideAllModals();
      }
    });
  }

  // Показать Mystery Box
  showMysteryBox(options) {
    if (!this.isActive() || !Array.isArray(options) || options.length < 3) {
      console.warn('Invalid mystery box options:', options);
      return;
    }
    
    this.mysteryModal.innerHTML = this.createMysteryBoxContent(options);
    this.showModal(this.mysteryModal);
    
    console.log('🎁 Mystery Box shown with options:', options);
  }

  // Создать содержимое Mystery Box
  createMysteryBoxContent(options) {
    const buttonsHtml = options.map(resource => {
      const emoji = getResourceEmoji(resource);
      return `
        <button class="mystery-option" data-resource="${resource}">
          <span class="resource-icon">${emoji}</span>
          <span class="resource-name">+5 ${resource}</span>
        </button>
      `;
    }).join('');
    
    const content = `
      <div class="modal-content mystery-box-content">
        <h3>📦 Mystery Box</h3>
        <p>Choose your reward:</p>
        <div class="mystery-options">
          ${buttonsHtml}
        </div>
        <div class="modal-footer">
          <button class="modal-close">Cancel</button>
        </div>
      </div>
    `;
    
    // Добавляем обработчики после вставки HTML
    this.createTimeout(() => {
      this.bindMysteryBoxHandlers();
    }, 10);
    
    return content;
  }

  // Привязать обработчики Mystery Box
  bindMysteryBoxHandlers() {
    if (!this.mysteryModal) return;
    
    const mysteryOptions = this.mysteryModal.querySelectorAll('.mystery-option');
    const closeButton = this.mysteryModal.querySelector('.modal-close');
    
    mysteryOptions.forEach(button => {
      this.addEventListener(button, 'click', (e) => {
        const resource = e.currentTarget.dataset.resource;
        this.handleMysteryBoxChoice(resource);
      });
    });
    
    if (closeButton) {
      this.addEventListener(closeButton, 'click', () => {
        this.hideModal(this.mysteryModal);
      });
    }
  }

  // Обработать выбор в Mystery Box
  handleMysteryBoxChoice(resource) {
    if (!resource) return;
    
    // Валидируем ресурс
    if (this.gameState.resources && this.gameState.resources.hasOwnProperty(resource)) {
      const amount = 5;
      if (typeof this.gameState.addResource === 'function') {
        this.gameState.addResource(resource, amount);
      } else {
        this.gameState.resources[resource] = (this.gameState.resources[resource] || 0) + amount;
      }
      
      eventBus.emit(GameEvents.RESOURCE_CHANGED, { 
        resource: resource, 
        amount: this.gameState.resources[resource] 
      });
      
      eventBus.emit(GameEvents.NOTIFICATION, `🎁 Received: +${amount} ${resource}`);
    } else {
      console.warn(`Invalid resource from mystery box: ${resource}`);
      eventBus.emit(GameEvents.NOTIFICATION, '❌ Invalid reward selected');
    }
    
    this.hideModal(this.mysteryModal);
  }

  // Показать информационное модальное окно
  showInfoModal(title, content, options = {}) {
    if (!this.infoModal) return;
    
    const modalContent = this.createInfoModalContent(title, content, options);
    this.infoModal.innerHTML = modalContent;
    this.showModal(this.infoModal);
    
    // Привязываем обработчики
    this.bindInfoModalHandlers(options);
  }

  // Создать содержимое информационного модального окна
  createInfoModalContent(title, content, options) {
    const buttonsHtml = options.buttons ? 
      options.buttons.map(button => 
        `<button class="modal-button ${button.class || ''}" data-action="${button.action || ''}">${button.text}</button>`
      ).join('') : 
      '<button class="modal-close">Close</button>';
    
    return `
      <div class="modal-content info-modal-content">
        <h3>${title}</h3>
        <div class="modal-body">
          ${content}
        </div>
        <div class="modal-footer">
          ${buttonsHtml}
        </div>
      </div>
    `;
  }

  // Привязать обработчики информационного модального окна
  bindInfoModalHandlers(options) {
    if (!this.infoModal) return;
    
    const buttons = this.infoModal.querySelectorAll('.modal-button, .modal-close');
    
    buttons.forEach(button => {
      this.addEventListener(button, 'click', (e) => {
        const action = e.currentTarget.dataset.action;
        
        if (action && options.onAction) {
          options.onAction(action);
        }
        
        this.hideModal(this.infoModal);
      });
    });
  }

  // Показать модальное окно подтверждения
  showConfirmModal(title, message, onConfirm, onCancel = null) {
    const content = `<p>${message}</p>`;
    const options = {
      buttons: [
        { text: 'Confirm', action: 'confirm', class: 'btn-confirm' },
        { text: 'Cancel', action: 'cancel', class: 'btn-cancel' }
      ],
      onAction: (action) => {
        if (action === 'confirm' && onConfirm) {
          onConfirm();
        } else if (action === 'cancel' && onCancel) {
          onCancel();
        }
      }
    };
    
    this.showInfoModal(title, content, options);
  }

  // Показать модальное окно достижения
  showAchievementModal(achievement) {
    const content = `
      <div class="achievement-modal">
        <div class="achievement-icon">${achievement.icon || '🏆'}</div>
        <div class="achievement-info">
          <h4>${achievement.title}</h4>
          <p>${achievement.description}</p>
          ${achievement.reward ? `<div class="achievement-reward">Reward: ${achievement.reward}</div>` : ''}
        </div>
      </div>
    `;
    
    this.showInfoModal('🎉 Achievement Unlocked!', content);
    
    // Автоматически закрываем через время
    this.createTimeout(() => {
      if (this.infoModal) {
        this.hideModal(this.infoModal);
      }
    }, GAME_CONSTANTS.SKILL_NOTIFICATION_DURATION);
  }

  // Показать модальное окно загрузки
  showLoadingModal(message = 'Loading...') {
    const content = `
      <div class="loading-modal">
        <div class="loading-spinner"></div>
        <p>${message}</p>
      </div>
    `;
    
    // Создаем специальное модальное окно загрузки
    const loadingModal = this.createModal('loading-modal');
    loadingModal.innerHTML = this.createInfoModalContent('', content);
    loadingModal.classList.add('loading-modal-container');
    
    this.registerDOMElement(loadingModal);
    this.showModal(loadingModal);
    
    return loadingModal;
  }

  // Показать модальное окно
  showModal(modal) {
    if (!modal) return;
    
    modal.classList.remove('hidden');
    this.activeModals.add(modal);
    
    // Анимация появления
    modal.style.opacity = '0';
    modal.style.transform = 'scale(0.8)';
    
    this.createTimeout(() => {
      if (modal) {
        modal.style.transition = 'all 0.3s ease-out';
        modal.style.opacity = '1';
        modal.style.transform = 'scale(1)';
      }
    }, 10);
    
    // Блокируем прокрутку страницы
    document.body.style.overflow = 'hidden';
  }

  // Скрыть модальное окно
  hideModal(modal) {
    if (!modal || !this.activeModals.has(modal)) return;
    
    // Анимация исчезновения
    modal.style.transition = 'all 0.3s ease-in';
    modal.style.opacity = '0';
    modal.style.transform = 'scale(0.8)';
    
    this.createTimeout(() => {
      if (modal) {
        modal.classList.add('hidden');
        this.activeModals.delete(modal);
        
        // Восстанавливаем прокрутку если нет активных модальных окон
        if (this.activeModals.size === 0) {
          document.body.style.overflow = '';
        }
      }
    }, 300);
  }

  // Скрыть все модальные окна
  hideAllModals() {
    const modalsToHide = Array.from(this.activeModals);
    modalsToHide.forEach(modal => this.hideModal(modal));
  }

  // Проверить, открыто ли модальное окно
  isModalOpen(modalId = null) {
    if (modalId) {
      const modal = document.getElementById(modalId);
      return modal && this.activeModals.has(modal);
    }
    return this.activeModals.size > 0;
  }

  // Получить активные модальные окна
  getActiveModals() {
    return Array.from(this.activeModals);
  }

  // Показать пользовательское модальное окно
  showCustomModal(config) {
    const {
      id = 'custom-modal',
      title = 'Modal',
      content = '',
      buttons = [{ text: 'Close', action: 'close' }],
      onAction = null,
      autoClose = null,
      className = ''
    } = config;
    
    // Создаем или получаем модальное окно
    let modal = document.getElementById(id);
    if (!modal) {
      modal = this.createModal(id);
      this.registerDOMElement(modal);
    }
    
    if (className) {
      modal.className = `modal ${className}`;
    }
    
    // Устанавливаем содержимое
    const options = { buttons, onAction };
    modal.innerHTML = this.createInfoModalContent(title, content, options);
    
    // Показываем модальное окно
    this.showModal(modal);
    
    // Привязываем обработчики
    this.bindInfoModalHandlers(options);
    
    // Автоматическое закрытие
    if (autoClose && typeof autoClose === 'number') {
      this.createTimeout(() => {
        this.hideModal(modal);
      }, autoClose);
    }
    
    return modal;
  }

  // Создать всплывающее уведомление
  showPopup(message, type = 'info', duration = 3000) {
    const popup = document.createElement('div');
    popup.className = `popup popup-${type}`;
    popup.textContent = message;
    
    // Позиционирование
    popup.style.position = 'fixed';
    popup.style.top = '20px';
    popup.style.right = '20px';
    popup.style.zIndex = '10000';
    popup.style.padding = '10px 15px';
    popup.style.borderRadius = '5px';
    popup.style.color = 'white';
    popup.style.fontWeight = 'bold';
    popup.style.opacity = '0';
    popup.style.transform = 'translateX(100%)';
    popup.style.transition = 'all 0.3s ease';
    
    // Цвета по типу
    const colors = {
      info: '#2196F3',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#f44336'
    };
    popup.style.background = colors[type] || colors.info;
    
    document.body.appendChild(popup);
    this.registerDOMElement(popup);
    
    // Анимация появления
    this.createTimeout(() => {
      if (popup) {
        popup.style.opacity = '1';
        popup.style.transform = 'translateX(0)';
      }
    }, 10);
    
    // Автоматическое удаление
    this.createTimeout(() => {
      if (popup) {
        popup.style.opacity = '0';
        popup.style.transform = 'translateX(100%)';
        
        this.createTimeout(() => {
          if (popup && document.body.contains(popup)) {
            document.body.removeChild(popup);
          }
        }, 300);
      }
    }, duration);
    
    return popup;
  }

  // Получить статистику модальных окон
  getModalStats() {
    return {
      activeModals: this.activeModals.size,
      totalModalsInDOM: document.querySelectorAll('.modal').length,
      mysteryModalVisible: this.mysteryModal && !this.mysteryModal.classList.contains('hidden'),
      infoModalVisible: this.infoModal && !this.infoModal.classList.contains('hidden')
    };
  }

  // Деструктор
  destroy() {
    console.log('🧹 ModalManager cleanup started');
    
    // Скрываем все модальные окна
    this.hideAllModals();
    
    // Восстанавливаем прокрутку страницы
    document.body.style.overflow = '';
    
    // Вызываем родительский деструктор
    super.destroy();
    
    console.log('✅ ModalManager destroyed');
  }
}