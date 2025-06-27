// core/CleanupManager.js - Упрощенная версия
export class CleanupManager {
  constructor() {
    this.components = new Set();
    this.timeouts = new Map();
    this.intervals = new Map();
    this.eventListeners = new Map();
    this.cleanupFunctions = new Set();
    this.isDestroyed = false;
    this.isDestroying = false;
    this.nextId = 1;
  }

  registerComponent(component, name = 'Unknown') {
    if (this.isDestroyed || this.isDestroying || !component) return false;
    
    if (typeof component.destroy !== 'function') {
      console.warn(`Component ${name} must have destroy() method`);
      return false;
    }
    
    if (this.components.has(component)) return true;
    
    component._cleanupMeta = { name, id: this.nextId++ };
    this.components.add(component);
    return true;
  }

  unregisterComponent(component) {
    return this.components.delete(component);
  }

  createTimeout(callback, delay, name = 'anonymous') {
    if (this.isDestroyed || this.isDestroying) return null;
    if (typeof callback !== 'function') return null;
    
    const id = `timeout_${this.nextId++}`;
    
    const timeoutId = setTimeout(() => {
      this.timeouts.delete(id);
      if (!this.isDestroyed && !this.isDestroying) {
        try {
          callback();
        } catch (error) {
          console.error(`Error in timeout ${name}:`, error);
        }
      }
    }, delay);
    
    this.timeouts.set(id, { timeoutId, name });
    return id;
  }

  createInterval(callback, delay, name = 'anonymous') {
    if (this.isDestroyed || this.isDestroying) return null;
    if (typeof callback !== 'function') return null;
    
    const id = `interval_${this.nextId++}`;
    
    const intervalId = setInterval(() => {
      if (this.isDestroyed || this.isDestroying) {
        clearInterval(intervalId);
        this.intervals.delete(id);
        return;
      }
      
      try {
        callback();
      } catch (error) {
        console.error(`Error in interval ${name}:`, error);
      }
    }, delay);
    
    this.intervals.set(id, { intervalId, name });
    return id;
  }

  clearTimeout(id) {
    if (this.timeouts.has(id)) {
      const timeout = this.timeouts.get(id);
      clearTimeout(timeout.timeoutId);
      this.timeouts.delete(id);
      return true;
    }
    return false;
  }

  clearInterval(id) {
    if (this.intervals.has(id)) {
      const interval = this.intervals.get(id);
      clearInterval(interval.intervalId);
      this.intervals.delete(id);
      return true;
    }
    return false;
  }

  addEventListener(element, event, handler, options = {}) {
    if (this.isDestroyed || this.isDestroying) return () => {};
    if (!element || typeof element.addEventListener !== 'function') return () => {};
    if (typeof handler !== 'function') return () => {};
    
    element.addEventListener(event, handler, options);
    
    if (!this.eventListeners.has(element)) {
      this.eventListeners.set(element, []);
    }
    
    this.eventListeners.get(element).push({ event, handler, options });
    
    return () => this.removeEventListener(element, event, handler);
  }

  removeEventListener(element, event, handler) {
    if (this.eventListeners.has(element)) {
      const listeners = this.eventListeners.get(element);
      const index = listeners.findIndex(l => l.event === event && l.handler === handler);
      
      if (index !== -1) {
        const listener = listeners[index];
        element.removeEventListener(event, handler, listener.options);
        listeners.splice(index, 1);
        
        if (listeners.length === 0) {
          this.eventListeners.delete(element);
        }
        return true;
      }
    }
    return false;
  }

  registerCleanupFunction(cleanupFn, name = 'anonymous') {
    if (this.isDestroyed || this.isDestroying) return;
    if (typeof cleanupFn !== 'function') return;
    
    cleanupFn._cleanupName = name;
    this.cleanupFunctions.add(cleanupFn);
  }

  cleanup() {
    if (this.isDestroyed || this.isDestroying) return;
    
    this.isDestroying = true;
    
    try {
      // Уничтожаем компоненты
      const componentsArray = Array.from(this.components);
      componentsArray.forEach(component => {
        try {
          if (component.isDestroyed !== true) {
            if (typeof component.isDestroyed !== 'undefined') {
              component.isDestroyed = true;
            }
            component.destroy();
          }
          this.components.delete(component);
        } catch (error) {
          console.error('Error destroying component:', error);
          this.components.delete(component);
        }
      });
      
      // Очищаем таймеры
      this.timeouts.forEach((timeout, id) => {
        clearTimeout(timeout.timeoutId);
      });
      this.timeouts.clear();
      
      this.intervals.forEach((interval, id) => {
        clearInterval(interval.intervalId);
      });
      this.intervals.clear();
      
      // Удаляем обработчики событий
      this.eventListeners.forEach((listeners, element) => {
        listeners.forEach(({ event, handler, options }) => {
          try {
            element.removeEventListener(event, handler, options);
          } catch (error) {
            console.error('Error removing event listener:', error);
          }
        });
      });
      this.eventListeners.clear();
      
      // Выполняем функции очистки
      this.cleanupFunctions.forEach(cleanupFn => {
        try {
          cleanupFn();
        } catch (error) {
          console.error('Error in cleanup function:', error);
        }
      });
      this.cleanupFunctions.clear();
      
    } catch (error) {
      console.error('Error during cleanup:', error);
    } finally {
      this.isDestroyed = true;
      this.isDestroying = false;
    }
  }

  isActive() {
    return !this.isDestroyed && !this.isDestroying;
  }
}

export class CleanupMixin {
  constructor() {
    this.cleanupManager = new CleanupManager();
    this.isDestroyed = false;
    this.cleanupManager.registerComponent(this, this.constructor.name);
  }

  createTimeout(callback, delay, name) {
    return this.cleanupManager.createTimeout(callback, delay, name);
  }

  createInterval(callback, delay, name) {
    return this.cleanupManager.createInterval(callback, delay, name);
  }

  addEventListener(element, event, handler, options) {
    return this.cleanupManager.addEventListener(element, event, handler, options);
  }

  onDestroy(cleanupFn, name) {
    this.cleanupManager.registerCleanupFunction(cleanupFn, name);
  }

  isActive() {
    return !this.isDestroyed && this.cleanupManager.isActive();
  }

  destroy() {
    if (this.isDestroyed) return;
    
    this.isDestroyed = true;
    this.cleanupManager.cleanup();
  }
}