// core/GameEvents.js - Обновленная система событий с новым событием ZONES_UPDATED
export class GameEvents {
  // Игровые события
  static CLICK = 'game:click';
  static COMBO_CHANGED = 'game:combo_changed';
  
  // События ресурсов
  static RESOURCE_CHANGED = 'resource:changed';
  static RESOURCE_GAINED = 'resource:gained';
  static RESOURCE_SPENT = 'resource:spent';
  
  // События энергии
  static ENERGY_CHANGED = 'energy:changed';
  static ENERGY_INSUFFICIENT = 'energy:insufficient';
  static ENERGY_CRITICAL = 'energy:critical';
  static ENERGY_ZONE_HIT = 'energy:zone_hit';
  
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
  
  // НОВЫЕ СОБЫТИЯ АВТОКЛИКЕРА
  static AUTO_CLICKER_STARTED = 'skill:auto_clicker_started';
  static AUTO_CLICKER_STOPPED = 'skill:auto_clicker_stopped';
  static AUTO_CLICKER_PAUSED = 'skill:auto_clicker_paused';
  static AUTO_CLICKER_RESUMED = 'skill:auto_clicker_resumed';
  
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
  
  // События зон
  static ZONES_UPDATED = 'game:zones_updated';
  static ZONE_HIT = 'zone:hit';
  static ZONE_MISS = 'zone:miss';
  
  // ОБНОВЛЕННЫЕ СОБЫТИЯ РЕЙДОВ
  static RAID_STARTED = 'raid:started';
  static RAID_COMPLETED = 'raid:completed';
  static RAID_CANCELLED = 'raid:cancelled';
  static RAID_PROGRESS_UPDATE = 'raid:progress_update';
  
  // НОВЫЕ СОБЫТИЯ для интеграции с автокликером
  static RAID_AUTOCLICKER_PAUSE = 'raid:autoclicker_pause';
  static RAID_AUTOCLICKER_RESUME = 'raid:autoclicker_resume';
  
  // Системные события
  static GAME_RESET = 'system:reset';
  static SAVE_COMPLETED = 'system:save_completed';
  static LOAD_COMPLETED = 'system:load_completed';
  
  // События достижений
  static ACHIEVEMENT_UNLOCKED = 'achievement:unlocked';
}

// Добавляем новые события в конец файла
export const RAID_AUTOCLICKER_EVENTS = {
  PAUSE_REQUEST: 'raid:autoclicker_pause_request',
  RESUME_REQUEST: 'raid:autoclicker_resume_request',
  STATUS_QUERY: 'raid:autoclicker_status_query',
  STATUS_RESPONSE: 'raid:autoclicker_status_response'
};
  
  export class EventBus {
    constructor() {
        this._handlers = new Map();
        this._eventHistory = []; // Для отладки
        this._maxHistorySize = 100;
    }
    
    subscribe(event, handler) {
        if (typeof handler !== 'function') {
            throw new Error('Event handler must be a function');
        }
        
        if (!this._handlers.has(event)) {
            this._handlers.set(event, new Set());
        }
        
        this._handlers.get(event).add(handler);
        return handler;
    }
    
    unsubscribe(event, handler) {
        if (this._handlers.has(event)) {
            const handlers = this._handlers.get(event);
            handlers.delete(handler);
            
            if (handlers.size === 0) {
                this._handlers.delete(event);
            }
        }
    }
    
    emit(event, payload = {}) {
        // Записываем в историю для отладки
        this._recordEvent(event, payload);
        
        if (this._handlers.has(event)) {
            const handlers = this._handlers.get(event);
            const normalizedPayload = this._normalizePayload(payload);
            
            handlers.forEach(handler => {
                try {
                    handler(normalizedPayload);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
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
    
    _recordEvent(event, payload) {
        this._eventHistory.push({
            event,
            payload,
            timestamp: Date.now()
        });
        
        // Ограничиваем размер истории
        if (this._eventHistory.length > this._maxHistorySize) {
            this._eventHistory = this._eventHistory.slice(-this._maxHistorySize);
        }
    }
    
    once(event, handler) {
        const onceHandler = (payload) => {
            handler(payload);
            this.unsubscribe(event, onceHandler);
        };
        
        return this.subscribe(event, onceHandler);
    }
    
    clearAll() {
        this._handlers.clear();
        this._eventHistory = [];
    }
    
    hasSubscribers(event) {
        return this._handlers.has(event) && this._handlers.get(event).size > 0;
    }
    
    // Получить статистику событий
    getEventStats() {
        const stats = {
            totalEvents: this._handlers.size,
            totalSubscribers: 0,
            eventTypes: {},
            recentEvents: this._eventHistory.slice(-10)
        };
        
        this._handlers.forEach((handlers, event) => {
            stats.totalSubscribers += handlers.size;
            stats.eventTypes[event] = handlers.size;
        });
        
        return stats;
    }
    
    // Получить историю событий
    getEventHistory(limit = 50) {
        return this._eventHistory.slice(-limit);
    }
    
    // Получить события определенного типа из истории
    getEventsByType(eventType, limit = 20) {
        return this._eventHistory
            .filter(record => record.event === eventType)
            .slice(-limit);
    }
    
    // Очистить историю событий
    clearHistory() {
        this._eventHistory = [];
    }
    
    // Получить подписчиков события
    getSubscribers(event) {
        const handlers = this._handlers.get(event);
        return handlers ? handlers.size : 0;
    }
    
    // Проверить, есть ли обработчики для события
    hasHandlers(event) {
        return this.hasSubscribers(event);
    }
    
    // Отладочная информация
    getDebugInfo() {
        return {
            eventsWithHandlers: Array.from(this._handlers.keys()),
            totalHandlers: Array.from(this._handlers.values()).reduce((sum, handlers) => sum + handlers.size, 0),
            historySize: this._eventHistory.length,
            recentEventTypes: [...new Set(this._eventHistory.slice(-20).map(r => r.event))],
            stats: this.getEventStats()
        };
    }
  }
  
  export const eventBus = new EventBus();
  
  // Глобальная функция для отладки событий
  if (typeof window !== 'undefined') {
    window.getEventBusDebug = () => eventBus.getDebugInfo();
    window.getEventHistory = (limit) => eventBus.getEventHistory(limit);
  }