// core/GameEvents.js - Расширенная система событий с энергетическими событиями
export class GameEvents {
    // Игровые события
    static CLICK = 'game:click';
    static COMBO_CHANGED = 'game:combo_changed';
    static ZONES_SHUFFLED = 'game:zones_shuffled';
    
    // События ресурсов
    static RESOURCE_CHANGED = 'resource:changed';
    static RESOURCE_GAINED = 'resource:gained';
    static RESOURCE_SPENT = 'resource:spent';
    
    // НОВЫЕ: События энергии
    static ENERGY_CHANGED = 'energy:changed';
    static ENERGY_INSUFFICIENT = 'energy:insufficient';
    static ENERGY_CRITICAL = 'energy:critical';
    static ENERGY_ZONE_HIT = 'energy:zone_hit';
    static ENERGY_RESTORED = 'energy:restored';
    static ENERGY_CONSUMED = 'energy:consumed';
    
    // События эффектов
    static BUFF_APPLIED = 'effect:buff_applied';
    static BUFF_EXPIRED = 'effect:buff_expired';
    static DEBUFF_APPLIED = 'effect:debuff_applied';
    static DEBUFF_EXPIRED = 'effect:debuff_expired';
    static SHIELD_BLOCK = 'effect:shield_block';
    
    // События навыков
    static SKILL_BOUGHT = 'skill:bought';
    static SKILL_POINTS_CHANGED = 'skill:points_changed';
    static CRITICAL_HIT = 'skill:critical_hit';
    static BONUS_RESOURCE_FOUND = 'skill:bonus_resource';
    static MISS_PROTECTION_USED = 'skill:miss_protection';
    
    // События зданий
    static BUILDING_BOUGHT = 'building:bought';
    static BUILDING_PRODUCED = 'building:produced';
    
    // События маркета
    static ITEM_PURCHASED = 'market:item_purchased';
    
    // UI события
    static NOTIFICATION = 'ui:notification';
    static SKILL_NOTIFICATION = 'ui:skill_notification';
    static MYSTERY_BOX = 'ui:mystery_box';
    static TEMP_MESSAGE = 'ui:temp_message';
    
    // Специальные события
    static STAR_POWER_USED = 'special:star_power_used';
    static SLOT_MACHINE_WIN = 'special:slot_machine_win';
    static TAX_COLLECTED = 'special:tax_collected';
    static HEAVY_CLICK_PROGRESS = 'special:heavy_click_progress';
    static GHOST_CLICK = 'special:ghost_click';
    
    // НОВЫЕ: События зон
    static ZONE_HIT = 'zone:hit';
    static ZONE_MISS = 'zone:miss';
    static ZONE_TYPES_CHANGED = 'zone:types_changed';
    
    // Системные события
    static GAME_RESET = 'system:reset';
    static SAVE_COMPLETED = 'system:save_completed';
    static LOAD_COMPLETED = 'system:load_completed';
    
    // НОВЫЕ: События достижений
    static ACHIEVEMENT_UNLOCKED = 'achievement:unlocked';
    static ACHIEVEMENT_PROGRESS = 'achievement:progress';
  }
  
  export class EventBus {
    constructor() {
      this._handlers = new Map();
      this._debugMode = false;
    }
    
    subscribe(event, handler) {
      if (typeof handler !== 'function') {
        throw new Error('Event handler must be a function');
      }
      
      if (!this._handlers.has(event)) {
        this._handlers.set(event, new Set());
      }
      
      this._handlers.get(event).add(handler);
      
      if (this._debugMode) {
        console.log(`📡 Subscribed to ${event}, total handlers: ${this._handlers.get(event).size}`);
      }
      
      return handler; // Возвращаем для возможности отписки
    }
    
    unsubscribe(event, handler) {
      if (this._handlers.has(event)) {
        const handlers = this._handlers.get(event);
        handlers.delete(handler);
        
        if (handlers.size === 0) {
          this._handlers.delete(event);
        }
        
        if (this._debugMode) {
          console.log(`📡 Unsubscribed from ${event}, remaining handlers: ${handlers.size}`);
        }
      }
    }
    
    emit(event, payload = {}) {
      if (this._debugMode) {
        console.log(`📡 Emitting ${event}`, payload);
      }
      
      if (this._handlers.has(event)) {
        const handlers = this._handlers.get(event);
        const normalizedPayload = this._normalizePayload(payload);
        
        handlers.forEach(handler => {
          try {
            handler(normalizedPayload);
          } catch (error) {
            console.error(`❌ Error in event handler for ${event}:`, error);
          }
        });
      }
    }
    
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
    }
    
    // Подписка на событие с автоматической отпиской при уничтожении
    subscribeWithCleanup(event, handler, cleanupContainer) {
      this.subscribe(event, handler);
      
      if (cleanupContainer && cleanupContainer.push) {
        cleanupContainer.push(() => this.unsubscribe(event, handler));
      }
      
      return () => this.unsubscribe(event, handler);
    }
    
    // Отладочные методы
    enableDebug() {
      this._debugMode = true;
    }
    
    disableDebug() {
      this._debugMode = false;
    }
    
    getSubscriberCount(event) {
      return this._handlers.has(event) ? this._handlers.get(event).size : 0;
    }
    
    getAllEvents() {
      return Array.from(this._handlers.keys());
    }
    
    getEventStats() {
      const stats = {};
      this._handlers.forEach((handlers, event) => {
        stats[event] = handlers.size;
      });
      return stats;
    }
    
    clearAll() {
      if (this._debugMode) {
        console.log('📡 Clearing all event handlers');
      }
      this._handlers.clear();
    }
    
    // Одноразовая подписка
    once(event, handler) {
      const onceHandler = (payload) => {
        handler(payload);
        this.unsubscribe(event, onceHandler);
      };
      
      return this.subscribe(event, onceHandler);
    }
    
    // НОВЫЙ: Система приоритетов для событий
    subscribePriority(event, handler, priority = 0) {
      if (!this._handlers.has(event)) {
        this._handlers.set(event, new Map());
      }
      
      const handlers = this._handlers.get(event);
      
      if (!handlers.has(priority)) {
        handlers.set(priority, new Set());
      }
      
      handlers.get(priority).add(handler);
      
      if (this._debugMode) {
        console.log(`📡 Subscribed to ${event} with priority ${priority}`);
      }
      
      return handler;
    }
    
    // НОВЫЙ: Эмиссия с учетом приоритетов
    emitPriority(event, payload = {}) {
      if (this._debugMode) {
        console.log(`📡 Emitting ${event} with priorities`, payload);
      }
      
      if (this._handlers.has(event)) {
        const priorityMap = this._handlers.get(event);
        const normalizedPayload = this._normalizePayload(payload);
        
        // Сортируем приоритеты по убыванию
        const sortedPriorities = Array.from(priorityMap.keys()).sort((a, b) => b - a);
        
        for (const priority of sortedPriorities) {
          const handlers = priorityMap.get(priority);
          handlers.forEach(handler => {
            try {
              handler(normalizedPayload);
            } catch (error) {
              console.error(`❌ Error in priority event handler for ${event}:`, error);
            }
          });
        }
      }
    }
    
    // НОВЫЙ: Проверка наличия подписчиков
    hasSubscribers(event) {
      return this._handlers.has(event) && this._handlers.get(event).size > 0;
    }
    
    // НОВЫЙ: Получить все события определенной категории
    getEventsByCategory(category) {
      return this.getAllEvents().filter(event => event.startsWith(category + ':'));
    }
    
    // НОВЫЙ: Массовая подписка на события
    subscribeMultiple(events, handler) {
      const unsubscribeFunctions = [];
      
      events.forEach(event => {
        this.subscribe(event, handler);
        unsubscribeFunctions.push(() => this.unsubscribe(event, handler));
      });
      
      return () => {
        unsubscribeFunctions.forEach(fn => fn());
      };
    }
    
    // НОВЫЙ: Создание namespace для событий
    createNamespace(namespace) {
      return {
        emit: (event, payload) => this.emit(`${namespace}:${event}`, payload),
        subscribe: (event, handler) => this.subscribe(`${namespace}:${event}`, handler),
        unsubscribe: (event, handler) => this.unsubscribe(`${namespace}:${event}`, handler),
        once: (event, handler) => this.once(`${namespace}:${event}`, handler)
      };
    }
    
    // НОВЫЙ: Middleware система для событий
    addMiddleware(middleware) {
      if (!this._middleware) {
        this._middleware = [];
      }
      this._middleware.push(middleware);
    }
    
    _applyMiddleware(event, payload) {
      if (!this._middleware || this._middleware.length === 0) {
        return payload;
      }
      
      return this._middleware.reduce((currentPayload, middleware) => {
        return middleware(event, currentPayload) || currentPayload;
      }, payload);
    }
    
    // НОВЫЙ: Логирование событий
    enableEventLogging(filter = null) {
      this.addMiddleware((event, payload) => {
        if (!filter || filter(event)) {
          console.log(`📡 Event Log: ${event}`, payload);
        }
        return payload;
      });
    }
    
    // НОВЫЙ: Статистика производительности
    getPerformanceStats() {
      const stats = {
        totalEvents: this.getAllEvents().length,
        totalHandlers: 0,
        categorizedEvents: {},
        handlerDistribution: {}
      };
      
      this._handlers.forEach((handlers, event) => {
        const handlerCount = handlers instanceof Set ? handlers.size : 
                           handlers instanceof Map ? Array.from(handlers.values()).reduce((sum, set) => sum + set.size, 0) : 0;
        
        stats.totalHandlers += handlerCount;
        
        const category = event.split(':')[0];
        if (!stats.categorizedEvents[category]) {
          stats.categorizedEvents[category] = 0;
        }
        stats.categorizedEvents[category]++;
        
        stats.handlerDistribution[event] = handlerCount;
      });
      
      return stats;
    }
  }
  
  // Создаем единственный экземпляр EventBus
  export const eventBus = new EventBus();