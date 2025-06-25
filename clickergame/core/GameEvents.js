// core/GameEvents.js - Типизированная система событий
export class GameEvents {
    // Игровые события
    static CLICK = 'game:click';
    static COMBO_CHANGED = 'game:combo_changed';
    static ZONES_SHUFFLED = 'game:zones_shuffled';
    
    // События ресурсов
    static RESOURCE_CHANGED = 'resource:changed';
    static RESOURCE_GAINED = 'resource:gained';
    static RESOURCE_SPENT = 'resource:spent';
    
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
    
    // Системные события
    static GAME_RESET = 'system:reset';
    static SAVE_COMPLETED = 'system:save_completed';
    static LOAD_COMPLETED = 'system:load_completed';
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
  }
  
  // Создаем единственный экземпляр EventBus
  export const eventBus = new EventBus();