/**
 * Global Event System
 * Used for cross-component communication
 */

type EventCallback = (data?: any) => void;

class EventEmitter {
  private events: Record<string, EventCallback[]> = {};

  on(event: string, callback: EventCallback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event: string, callback: EventCallback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event: string, data?: any) {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => callback(data));
  }
}

export const eventEmitter = new EventEmitter();

// Product-related events
export const PRODUCT_EVENTS = {
  PRODUCT_ADDED: 'product:added',
  PRODUCT_UPDATED: 'product:updated',
  PRODUCT_DELETED: 'product:deleted',
  PRODUCTS_REFRESH: 'products:refresh',
} as const;
