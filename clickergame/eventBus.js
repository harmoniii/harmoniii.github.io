// eventBus.js - Исправленная версия с лучшей очисткой
export const EventBus = {
  _handlers: {},
  
  subscribe(event, fn) {
    (this._handlers[event] = this._handlers[event] || []).push(fn);
    return fn; // Возвращаем функцию для возможности отписки
  },
  
  unsubscribe(event, fn) {
    if (this._handlers[event]) {
      this._handlers[event] = this._handlers[event].filter(handler => handler !== fn);
      if (this._handlers[event].length === 0) {
        delete this._handlers[event];
      }
    }
  },
  
  emit(event, payload) {
    // ИСПРАВЛЕНИЕ 7: Нормализация обработки событий
    const normalizedPayload = this._normalizePayload(payload);
    (this._handlers[event] || []).forEach(fn => {
      try {
        fn(normalizedPayload);
      } catch (error) {
        console.warn(`Error in event handler for ${event}:`, error);
      }
    });
  },
  
  // ИСПРАВЛЕНИЕ 7: Нормализация данных событий
  _normalizePayload(payload) {
    if (payload === undefined || payload === null) {
      return {};
    }
    if (typeof payload === 'string') {
      return { message: payload };
    }
    if (typeof payload === 'object' && !Array.isArray(payload)) {
      return { ...payload };
    }
    return { data: payload };
  },
  
  // ИСПРАВЛЕНИЕ 11: Метод для полной очистки всех подписок
  clearAll() {
    this._handlers = {};
  },
  
  // ИСПРАВЛЕНИЕ 11: Получить количество подписчиков для отладки
  getSubscriberCount(event) {
    return this._handlers[event] ? this._handlers[event].length : 0;
  },
  
  // ИСПРАВЛЕНИЕ 11: Получить все события для отладки
  getAllEvents() {
    return Object.keys(this._handlers);
  }
};