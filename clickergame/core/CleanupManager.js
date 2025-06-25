// core/CleanupManager.js - Централизованное управление очисткой ресурсов
export class CleanupManager {
    constructor() {
      this.components = new Set();
      this.timeouts = new Map(); // id -> {timeoutId, callback, delay, createdAt}
      this.intervals = new Map(); // id -> {intervalId, callback, delay, createdAt}
      this.eventListeners = new Map(); // element -> [{event, handler, options}, ...]
      this.cleanupFunctions = new Set();
      this.domElements = new Set(); // Отслеживание созданных DOM элементов
      this.animationFrames = new Set(); // Отслеживание requestAnimationFrame
      this.observers = new Set(); // Отслеживание MutationObserver, IntersectionObserver и т.д.
      this.isDestroyed = false;
      this.debugMode = false;
      this.nextId = 1;
      
      // Статистика для отладки
      this.stats = {
        componentsCreated: 0,
        componentsDestroyed: 0,
        timeoutsCreated: 0,
        timeoutsCleared: 0,
        intervalsCreated: 0,
        intervalsCleared: 0,
        listenersAdded: 0,
        listenersRemoved: 0
      };
      
      this.log('CleanupManager initialized');
    }
  
    // ===== УПРАВЛЕНИЕ КОМПОНЕНТАМИ =====
    
    /**
     * Регистрация компонента для автоматической очистки
     * @param {Object} component - Компонент с методом destroy()
     * @param {string} [name] - Имя компонента для отладки
     */
    registerComponent(component, name = 'Unknown') {
      if (this.isDestroyed) {
        this.warn('Cannot register component - CleanupManager is destroyed');
        return false;
      }
      
      if (!component) {
        this.warn('Cannot register null/undefined component');
        return false;
      }
      
      if (typeof component.destroy !== 'function') {
        this.warn(`Component ${name} must have destroy() method`);
        return false;
      }
      
      // Добавляем метаданные к компоненту
      component._cleanupMeta = {
        name,
        registeredAt: Date.now(),
        id: this.nextId++
      };
      
      this.components.add(component);
      this.stats.componentsCreated++;
      this.log(`Registered component: ${name} (ID: ${component._cleanupMeta.id})`);
      
      return true;
    }
  
    /**
     * Отмена регистрации компонента
     */
    unregisterComponent(component) {
      if (this.components.has(component)) {
        const name = component._cleanupMeta?.name || 'Unknown';
        this.components.delete(component);
        this.stats.componentsDestroyed++;
        this.log(`Unregistered component: ${name}`);
        return true;
      }
      return false;
    }
  
    // ===== УПРАВЛЕНИЕ ТАЙМЕРАМИ =====
    
    /**
     * Создание отслеживаемого таймаута
     * @param {Function} callback - Функция для выполнения
     * @param {number} delay - Задержка в миллисекундах
     * @param {string} [name] - Имя таймаута для отладки
     * @returns {string|null} ID таймаута для отслеживания
     */
    createTimeout(callback, delay, name = 'anonymous') {
      if (this.isDestroyed) {
        this.warn('Cannot create timeout - CleanupManager is destroyed');
        return null;
      }
      
      if (typeof callback !== 'function') {
        this.warn('Timeout callback must be a function');
        return null;
      }
      
      const id = `timeout_${this.nextId++}`;
      const createdAt = Date.now();
      
      const timeoutId = setTimeout(() => {
        // Удаляем из отслеживания при выполнении
        this.timeouts.delete(id);
        this.stats.timeoutsCleared++;
        
        if (!this.isDestroyed) {
          try {
            callback();
          } catch (error) {
            this.error(`Error in timeout ${name}:`, error);
          }
        }
      }, delay);
      
      this.timeouts.set(id, {
        timeoutId,
        callback,
        delay,
        name,
        createdAt
      });
      
      this.stats.timeoutsCreated++;
      this.log(`Created timeout: ${name} (${delay}ms)`);
      
      return id;
    }
  
    /**
     * Создание отслеживаемого интервала
     * @param {Function} callback - Функция для выполнения
     * @param {number} delay - Интервал в миллисекундах
     * @param {string} [name] - Имя интервала для отладки
     * @returns {string|null} ID интервала для отслеживания
     */
    createInterval(callback, delay, name = 'anonymous') {
      if (this.isDestroyed) {
        this.warn('Cannot create interval - CleanupManager is destroyed');
        return null;
      }
      
      if (typeof callback !== 'function') {
        this.warn('Interval callback must be a function');
        return null;
      }
      
      const id = `interval_${this.nextId++}`;
      const createdAt = Date.now();
      
      const intervalId = setInterval(() => {
        if (this.isDestroyed) {
          clearInterval(intervalId);
          this.intervals.delete(id);
          return;
        }
        
        try {
          callback();
        } catch (error) {
          this.error(`Error in interval ${name}:`, error);
        }
      }, delay);
      
      this.intervals.set(id, {
        intervalId,
        callback,
        delay,
        name,
        createdAt
      });
      
      this.stats.intervalsCreated++;
      this.log(`Created interval: ${name} (${delay}ms)`);
      
      return id;
    }
  
    /**
     * Очистка таймаута по ID
     */
    clearTimeout(id) {
      if (this.timeouts.has(id)) {
        const timeout = this.timeouts.get(id);
        clearTimeout(timeout.timeoutId);
        this.timeouts.delete(id);
        this.stats.timeoutsCleared++;
        this.log(`Cleared timeout: ${timeout.name}`);
        return true;
      }
      return false;
    }
  
    /**
     * Очистка интервала по ID
     */
    clearInterval(id) {
      if (this.intervals.has(id)) {
        const interval = this.intervals.get(id);
        clearInterval(interval.intervalId);
        this.intervals.delete(id);
        this.stats.intervalsCleared++;
        this.log(`Cleared interval: ${interval.name}`);
        return true;
      }
      return false;
    }
  
    // ===== УПРАВЛЕНИЕ СОБЫТИЯМИ =====
    
    /**
     * Регистрация обработчика событий для автоматической очистки
     * @param {EventTarget} element - Элемент для прослушивания
     * @param {string} event - Тип события
     * @param {Function} handler - Обработчик события
     * @param {Object} [options] - Опции для addEventListener
     * @returns {Function} Функция для отмены подписки
     */
    addEventListener(element, event, handler, options = {}) {
      if (this.isDestroyed) {
        this.warn('Cannot add event listener - CleanupManager is destroyed');
        return () => {};
      }
      
      if (!element || typeof element.addEventListener !== 'function') {
        this.warn('Invalid element for event listener');
        return () => {};
      }
      
      if (typeof handler !== 'function') {
        this.warn('Event handler must be a function');
        return () => {};
      }
      
      // Добавляем обработчик
      element.addEventListener(event, handler, options);
      
      // Сохраняем для очистки
      if (!this.eventListeners.has(element)) {
        this.eventListeners.set(element, []);
      }
      
      const listenerInfo = { event, handler, options };
      this.eventListeners.get(element).push(listenerInfo);
      this.stats.listenersAdded++;
      
      this.log(`Added event listener: ${event} on ${element.tagName || 'element'}`);
      
      // Возвращаем функцию для отмены подписки
      return () => this.removeEventListener(element, event, handler);
    }
  
    /**
     * Удаление конкретного обработчика событий
     */
    removeEventListener(element, event, handler) {
      if (this.eventListeners.has(element)) {
        const listeners = this.eventListeners.get(element);
        const index = listeners.findIndex(l => 
          l.event === event && l.handler === handler
        );
        
        if (index !== -1) {
          const listener = listeners[index];
          element.removeEventListener(event, handler, listener.options);
          listeners.splice(index, 1);
          this.stats.listenersRemoved++;
          
          if (listeners.length === 0) {
            this.eventListeners.delete(element);
          }
          
          this.log(`Removed event listener: ${event}`);
          return true;
        }
      }
      return false;
    }
  
    // ===== УПРАВЛЕНИЕ DOM ЭЛЕМЕНТАМИ =====
    
    /**
     * Регистрация DOM элемента для автоматического удаления
     * @param {HTMLElement} element - DOM элемент
     * @param {HTMLElement} [parent] - Родительский элемент (по умолчанию document.body)
     */
    registerDOMElement(element, parent = null) {
      if (this.isDestroyed) return;
      
      if (!element || !element.nodeType) {
        this.warn('Invalid DOM element');
        return;
      }
      
      element._cleanupParent = parent;
      this.domElements.add(element);
      this.log(`Registered DOM element: ${element.tagName}`);
    }
  
    /**
     * Удаление DOM элемента
     */
    removeDOMElement(element) {
      if (this.domElements.has(element)) {
        try {
          const parent = element._cleanupParent || element.parentNode;
          if (parent && parent.contains(element)) {
            parent.removeChild(element);
          }
          this.domElements.delete(element);
          this.log(`Removed DOM element: ${element.tagName}`);
        } catch (error) {
          this.warn('Error removing DOM element:', error);
        }
      }
    }
  
    // ===== УПРАВЛЕНИЕ ANIMATION FRAMES =====
    
    /**
     * Создание отслеживаемого requestAnimationFrame
     */
    requestAnimationFrame(callback, name = 'anonymous') {
      if (this.isDestroyed) return null;
      
      const frameId = requestAnimationFrame((timestamp) => {
        this.animationFrames.delete(frameId);
        if (!this.isDestroyed) {
          try {
            callback(timestamp);
          } catch (error) {
            this.error(`Error in animation frame ${name}:`, error);
          }
        }
      });
      
      this.animationFrames.add(frameId);
      this.log(`Created animation frame: ${name}`);
      
      return frameId;
    }
  
    /**
     * Отмена animation frame
     */
    cancelAnimationFrame(frameId) {
      if (this.animationFrames.has(frameId)) {
        cancelAnimationFrame(frameId);
        this.animationFrames.delete(frameId);
        this.log('Cancelled animation frame');
        return true;
      }
      return false;
    }
  
    // ===== УПРАВЛЕНИЕ OBSERVERS =====
    
    /**
     * Регистрация Observer для автоматической очистки
     */
    registerObserver(observer, name = 'anonymous') {
      if (this.isDestroyed) return;
      
      if (!observer || typeof observer.disconnect !== 'function') {
        this.warn('Invalid observer - must have disconnect() method');
        return;
      }
      
      observer._cleanupName = name;
      this.observers.add(observer);
      this.log(`Registered observer: ${name}`);
    }
  
    // ===== ПОЛЬЗОВАТЕЛЬСКИЕ ФУНКЦИИ ОЧИСТКИ =====
    
    /**
     * Регистрация пользовательской функции очистки
     * @param {Function} cleanupFn - Функция очистки
     * @param {string} [name] - Имя для отладки
     */
    registerCleanupFunction(cleanupFn, name = 'anonymous') {
      if (this.isDestroyed) return;
      
      if (typeof cleanupFn !== 'function') {
        this.warn('Cleanup function must be a function');
        return;
      }
      
      cleanupFn._cleanupName = name;
      this.cleanupFunctions.add(cleanupFn);
      this.log(`Registered cleanup function: ${name}`);
    }
  
    /**
     * Удаление функции очистки
     */
    unregisterCleanupFunction(cleanupFn) {
      if (this.cleanupFunctions.has(cleanupFn)) {
        const name = cleanupFn._cleanupName || 'anonymous';
        this.cleanupFunctions.delete(cleanupFn);
        this.log(`Unregistered cleanup function: ${name}`);
        return true;
      }
      return false;
    }
  
    // ===== ОСНОВНАЯ ФУНКЦИЯ ОЧИСТКИ =====
    
    /**
     * Полная очистка всех зарегистрированных ресурсов
     */
    cleanup() {
      if (this.isDestroyed) {
        this.warn('CleanupManager already destroyed');
        return;
      }
      
      this.log('🧹 Starting cleanup process...');
      const startTime = Date.now();
      
      try {
        // 1. Уничтожаем все зарегистрированные компоненты
        this.cleanupComponents();
        
        // 2. Очищаем все таймеры
        this.cleanupTimers();
        
        // 3. Удаляем все обработчики событий
        this.cleanupEventListeners();
        
        // 4. Удаляем DOM элементы
        this.cleanupDOMElements();
        
        // 5. Отменяем animation frames
        this.cleanupAnimationFrames();
        
        // 6. Отключаем observers
        this.cleanupObservers();
        
        // 7. Выполняем пользовательские функции очистки
        this.cleanupCustomFunctions();
        
        const duration = Date.now() - startTime;
        this.log(`✅ Cleanup completed in ${duration}ms`);
        
      } catch (error) {
        this.error('Error during cleanup:', error);
      } finally {
        this.isDestroyed = true;
      }
    }
  
    // ===== ЧАСТНЫЕ МЕТОДЫ ОЧИСТКИ =====
    
    cleanupComponents() {
      this.log(`Cleaning up ${this.components.size} components...`);
      
      this.components.forEach(component => {
        try {
          const name = component._cleanupMeta?.name || 'Unknown';
          component.destroy();
          this.stats.componentsDestroyed++;
          this.log(`Destroyed component: ${name}`);
        } catch (error) {
          this.error('Error destroying component:', error);
        }
      });
      
      this.components.clear();
    }
  
    cleanupTimers() {
      this.log(`Cleaning up ${this.timeouts.size} timeouts and ${this.intervals.size} intervals...`);
      
      // Очищаем таймауты
      this.timeouts.forEach((timeout, id) => {
        clearTimeout(timeout.timeoutId);
        this.stats.timeoutsCleared++;
      });
      this.timeouts.clear();
      
      // Очищаем интервалы
      this.intervals.forEach((interval, id) => {
        clearInterval(interval.intervalId);
        this.stats.intervalsCleared++;
      });
      this.intervals.clear();
    }
  
    cleanupEventListeners() {
      this.log(`Cleaning up event listeners on ${this.eventListeners.size} elements...`);
      
      this.eventListeners.forEach((listeners, element) => {
        listeners.forEach(({ event, handler, options }) => {
          try {
            element.removeEventListener(event, handler, options);
            this.stats.listenersRemoved++;
          } catch (error) {
            this.error('Error removing event listener:', error);
          }
        });
      });
      
      this.eventListeners.clear();
    }
  
    cleanupDOMElements() {
      this.log(`Cleaning up ${this.domElements.size} DOM elements...`);
      
      this.domElements.forEach(element => {
        this.removeDOMElement(element);
      });
      
      this.domElements.clear();
    }
  
    cleanupAnimationFrames() {
      this.log(`Cleaning up ${this.animationFrames.size} animation frames...`);
      
      this.animationFrames.forEach(frameId => {
        cancelAnimationFrame(frameId);
      });
      
      this.animationFrames.clear();
    }
  
    cleanupObservers() {
      this.log(`Cleaning up ${this.observers.size} observers...`);
      
      this.observers.forEach(observer => {
        try {
          const name = observer._cleanupName || 'anonymous';
          observer.disconnect();
          this.log(`Disconnected observer: ${name}`);
        } catch (error) {
          this.error('Error disconnecting observer:', error);
        }
      });
      
      this.observers.clear();
    }
  
    cleanupCustomFunctions() {
      this.log(`Executing ${this.cleanupFunctions.size} custom cleanup functions...`);
      
      this.cleanupFunctions.forEach(cleanupFn => {
        try {
          const name = cleanupFn._cleanupName || 'anonymous';
          cleanupFn();
          this.log(`Executed cleanup function: ${name}`);
        } catch (error) {
          this.error('Error in cleanup function:', error);
        }
      });
      
      this.cleanupFunctions.clear();
    }
  
    // ===== УТИЛИТЫ И ОТЛАДКА =====
    
    /**
     * Включить/выключить режим отладки
     */
    setDebugMode(enabled) {
      this.debugMode = enabled;
      this.log(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
  
    /**
     * Получить статистику использования ресурсов
     */
    getStats() {
      return {
        ...this.stats,
        activeComponents: this.components.size,
        activeTimeouts: this.timeouts.size,
        activeIntervals: this.intervals.size,
        activeListeners: Array.from(this.eventListeners.values())
          .reduce((sum, listeners) => sum + listeners.length, 0),
        activeDOMElements: this.domElements.size,
        activeAnimationFrames: this.animationFrames.size,
        activeObservers: this.observers.size,
        activeCleanupFunctions: this.cleanupFunctions.size,
        isDestroyed: this.isDestroyed
      };
    }
  
    /**
     * Получить детальную информацию для отладки
     */
    getDebugInfo() {
      return {
        stats: this.getStats(),
        components: Array.from(this.components).map(c => c._cleanupMeta),
        timeouts: Array.from(this.timeouts.values()).map(t => ({
          name: t.name,
          delay: t.delay,
          age: Date.now() - t.createdAt
        })),
        intervals: Array.from(this.intervals.values()).map(i => ({
          name: i.name,
          delay: i.delay,
          age: Date.now() - i.createdAt
        })),
        elements: Array.from(this.eventListeners.keys()).map(el => ({
          tagName: el.tagName,
          listeners: this.eventListeners.get(el).length
        }))
      };
    }
  
    /**
     * Проверить состояние менеджера
     */
    isActive() {
      return !this.isDestroyed;
    }
  
    /**
     * Найти потенциальные утечки памяти
     */
    detectLeaks() {
      const leaks = [];
      const now = Date.now();
      const oldThreshold = 60000; // 1 минута
      
      // Проверяем старые таймауты
      this.timeouts.forEach((timeout, id) => {
        if (now - timeout.createdAt > oldThreshold) {
          leaks.push(`Old timeout: ${timeout.name} (${now - timeout.createdAt}ms old)`);
        }
      });
      
      // Проверяем старые интервалы
      this.intervals.forEach((interval, id) => {
        if (now - interval.createdAt > oldThreshold) {
          leaks.push(`Old interval: ${interval.name} (${now - interval.createdAt}ms old)`);
        }
      });
      
      // Проверяем большое количество обработчиков на одном элементе
      this.eventListeners.forEach((listeners, element) => {
        if (listeners.length > 10) {
          leaks.push(`Too many listeners on ${element.tagName}: ${listeners.length}`);
        }
      });
      
      return leaks;
    }
  
    // ===== ЛОГИРОВАНИЕ =====
    
    log(message) {
      if (this.debugMode) {
        console.log(`🧹 CleanupManager: ${message}`);
      }
    }
  
    warn(message) {
      console.warn(`⚠️ CleanupManager: ${message}`);
    }
  
    error(message, error = null) {
      console.error(`❌ CleanupManager: ${message}`, error || '');
    }
  }
  
  // ===== МИКСИН ДЛЯ ДОБАВЛЕНИЯ ВОЗМОЖНОСТЕЙ ОЧИСТКИ =====
  
  /**
   * Миксин для добавления возможностей автоматической очистки к классам
   */
  export class CleanupMixin {
    constructor() {
      this.cleanupManager = new CleanupManager();
      
      // Автоматически регистрируем себя как компонент
      this.cleanupManager.registerComponent(this, this.constructor.name);
    }
  
    /**
     * Создать отслеживаемый таймаут
     */
    createTimeout(callback, delay, name) {
      return this.cleanupManager.createTimeout(callback, delay, name);
    }
  
    /**
     * Создать отслеживаемый интервал
     */
    createInterval(callback, delay, name) {
      return this.cleanupManager.createInterval(callback, delay, name);
    }
  
    /**
     * Зарегистрировать обработчик события с автоматической очисткой
     */
    addEventListener(element, event, handler, options) {
      return this.cleanupManager.addEventListener(element, event, handler, options);
    }
  
    /**
     * Зарегистрировать DOM элемент для автоматического удаления
     */
    registerDOMElement(element, parent) {
      this.cleanupManager.registerDOMElement(element, parent);
    }
  
    /**
     * Зарегистрировать функцию очистки
     */
    onDestroy(cleanupFn, name) {
      this.cleanupManager.registerCleanupFunction(cleanupFn, name);
    }
  
    /**
     * Зарегистрировать observer
     */
    registerObserver(observer, name) {
      this.cleanupManager.registerObserver(observer, name);
    }
  
    /**
     * Создать отслеживаемый animation frame
     */
    requestAnimationFrame(callback, name) {
      return this.cleanupManager.requestAnimationFrame(callback, name);
    }
  
    /**
     * Проверить активность объекта
     */
    isActive() {
      return this.cleanupManager.isActive();
    }
  
    /**
     * Получить статистику очистки
     */
    getCleanupStats() {
      return this.cleanupManager.getStats();
    }
  
    /**
     * Включить отладочный режим
     */
    enableCleanupDebug() {
      this.cleanupManager.setDebugMode(true);
    }
  
    /**
     * Уничтожить объект и все его ресурсы
     */
    destroy() {
      this.cleanupManager.cleanup();
    }
  }