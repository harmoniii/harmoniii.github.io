// ui/NotificationManager.js - ИСПРАВЛЕННАЯ версия управления уведомлениями
import { CleanupMixin } from '../core/CleanupManager.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';

export class NotificationManager extends CleanupMixin {
  constructor() {
    super();
    this.container = null;
    this.activeNotifications = new Set();
    this.initializeContainer();
  }

  initializeContainer() {
    this.container = document.getElementById('notifications');
    if (!this.container) {
      console.warn('Notifications container not found, creating one');
      this.createContainer();
    }
  }

  createContainer() {
    this.container = document.createElement('div');
    this.container.id = 'notifications';
    this.container.className = 'notifications-container';
    document.body.appendChild(this.container);
    
    // ИСПРАВЛЕНИЕ: Правильная регистрация DOM элемента для очистки
    this.registerDOMElement(this.container);
  }

  // Показать обычное уведомление
  show(message, duration = GAME_CONSTANTS.NOTIFICATION_DURATION) {
    if (!this.isActive()) return;
    
    const notification = this.createNotification(message, 'notification');
    this.displayNotification(notification, duration);
  }

  // Показать уведомление о навыке
  showSkill(title, description, duration = GAME_CONSTANTS.SKILL_NOTIFICATION_DURATION) {
    if (!this.isActive()) return;
    
    const notification = this.createSkillNotification(title, description);
    this.displayNotification(notification, duration);
  }

  // Показать уведомление с определенным типом
  showTyped(message, type = 'info', duration = GAME_CONSTANTS.NOTIFICATION_DURATION) {
    if (!this.isActive()) return;
    
    const notification = this.createNotification(message, `notification notification-${type}`);
    this.displayNotification(notification, duration);
  }

  // Создать элемент уведомления
  createNotification(message, className = 'notification') {
    const notification = document.createElement('div');
    notification.className = className;
    notification.textContent = message || 'Unknown notification';
    
    // Добавляем анимацию появления
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    
    return notification;
  }

  // Создать уведомление о навыке
  createSkillNotification(title, description) {
    const notification = document.createElement('div');
    notification.className = 'notification skill-notification';
    
    notification.innerHTML = `
      <div class="skill-notification-title">${title}</div>
      <div class="skill-notification-desc">${description}</div>
    `;
    
    // Добавляем анимацию появления
    notification.style.transform = 'translateX(100%) scale(0.8)';
    notification.style.opacity = '0';
    
    return notification;
  }

  // Отобразить уведомление
  displayNotification(notification, duration) {
    if (!this.container) return;
    
    // Добавляем в контейнер
    this.container.appendChild(notification);
    this.activeNotifications.add(notification);
    
    // Анимация появления
    this.createTimeout(() => {
      if (notification.parentNode) {
        notification.style.transform = 'translateX(0) scale(1)';
        notification.style.opacity = '1';
        notification.style.transition = 'all 0.3s ease-out';
      }
    }, 50);
    
    // Удаление через заданное время
    this.createTimeout(() => {
      this.removeNotification(notification);
    }, duration);
    
    // Ограничиваем количество одновременных уведомлений
    this.limitNotifications();
  }

  // Удалить уведомление
  removeNotification(notification) {
    if (!notification || !this.activeNotifications.has(notification)) return;
    
    // Анимация исчезновения
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    notification.style.transition = 'all 0.3s ease-in';
    
    // Удаляем из DOM после анимации
    this.createTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      this.activeNotifications.delete(notification);
    }, 300);
  }

  // Ограничить количество уведомлений
  limitNotifications(maxNotifications = 5) {
    if (this.activeNotifications.size <= maxNotifications) return;
    
    // Удаляем самые старые уведомления
    const notificationsArray = Array.from(this.activeNotifications);
    const toRemove = notificationsArray.slice(0, notificationsArray.length - maxNotifications);
    
    toRemove.forEach(notification => {
      this.removeNotification(notification);
    });
  }

  // Очистить все уведомления
  clearAll() {
    const notifications = Array.from(this.activeNotifications);
    notifications.forEach(notification => {
      this.removeNotification(notification);
    });
  }

  // Показать уведомление об успехе
  showSuccess(message, duration) {
    this.showTyped(message, 'success', duration);
  }

  // Показать уведомление об ошибке
  showError(message, duration) {
    this.showTyped(message, 'error', duration);
  }

  // Показать предупреждение
  showWarning(message, duration) {
    this.showTyped(message, 'warning', duration);
  }

  // Показать информационное уведомление
  showInfo(message, duration) {
    this.showTyped(message, 'info', duration);
  }

  // Получить количество активных уведомлений
  getActiveCount() {
    return this.activeNotifications.size;
  }

  // Проверить, есть ли активные уведомления
  hasActiveNotifications() {
    return this.activeNotifications.size > 0;
  }

  // Деструктор
  destroy() {
    console.log('🧹 NotificationManager cleanup started');
    
    this.clearAll();
    super.destroy();
    
    console.log('✅ NotificationManager destroyed');
  }
}