// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - Centralized Event Bus
// Lightweight pub/sub system for engine communication
// ═══════════════════════════════════════════════════════════════════════════

type EventCallback<T = any> = (data: T) => void;

interface EventBusConfig {
  enableLogging?: boolean;
  maxListeners?: number;
}

export class EventBus {
  private listeners: Map<string, Set<EventCallback>>;
  private config: EventBusConfig;
  private eventHistory: Map<string, number>;

  constructor(config: EventBusConfig = {}) {
    this.listeners = new Map();
    this.eventHistory = new Map();
    this.config = {
      enableLogging: config.enableLogging ?? false,
      maxListeners: config.maxListeners ?? 50,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSCRIBE TO EVENT
  // ═══════════════════════════════════════════════════════════════════════════

  on<T = any>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const eventListeners = this.listeners.get(event)!;

    if (eventListeners.size >= this.config.maxListeners) {
      console.warn(`[EventBus] Max listeners (${this.config.maxListeners}) reached for event: ${event}`);
    }

    eventListeners.add(callback);

    if (this.config.enableLogging) {
      console.log(`[EventBus] Subscribed to: ${event} (total listeners: ${eventListeners.size})`);
    }

    // Return unsubscribe function
    return () => {
      eventListeners.delete(callback);
      if (this.config.enableLogging) {
        console.log(`[EventBus] Unsubscribed from: ${event}`);
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EMIT EVENT
  // ═══════════════════════════════════════════════════════════════════════════

  emit<T = any>(event: string, data?: T): void {
    const eventListeners = this.listeners.get(event);

    if (!eventListeners || eventListeners.size === 0) {
      // Suppress no-listener warning for high-frequency internal events
      const silentEvents = ['RENDER_FRAME', 'FACE_TRACKING', 'FACE_UNSTABLE', 'FACE_RESULTS', 'STABILIZED_LANDMARKS', 'DEPTH_MAP_GENERATED'];
      if (this.config.enableLogging && !silentEvents.includes(event)) {
        console.log(`[EventBus] No listeners for: ${event}`);
      }
      return;
    }

    // Track event count
    this.eventHistory.set(event, (this.eventHistory.get(event) || 0) + 1);

    // Only log critical events (disable high-frequency render loop logs)
    const criticalEvents = ['VALIDATION_STARTED', 'VALIDATION_SUCCESS', 'VALIDATION_FAILED', 'PIPELINE_STATE_CHANGE', 'FACE_STABLE', 'BEARD_LOADED', 'BEARD_LOAD_FAILED', 'FACE_LOST'];
    if (this.config.enableLogging && criticalEvents.includes(event)) {
      console.log(`[EventBus] Emitting: ${event}`, data);
    }

    // Notify all listeners
    eventListeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[EventBus] Error in listener for ${event}:`, error);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSCRIBE ONCE
  // ═══════════════════════════════════════════════════════════════════════════

  once<T = any>(event: string, callback: EventCallback<T>): () => void {
    const wrappedCallback = (data: T) => {
      callback(data);
      unsubscribe();
    };

    const unsubscribe = this.on(event, wrappedCallback);
    return unsubscribe;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REMOVE ALL LISTENERS FOR EVENT
  // ═══════════════════════════════════════════════════════════════════════════

  off(event: string): void {
    this.listeners.delete(event);
    if (this.config.enableLogging) {
      console.log(`[EventBus] Removed all listeners for: ${event}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEAR ALL LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════

  clear(): void {
    this.listeners.clear();
    this.eventHistory.clear();
    if (this.config.enableLogging) {
      console.log('[EventBus] Cleared all listeners');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GET EVENT STATS
  // ═══════════════════════════════════════════════════════════════════════════

  getStats(): { eventCount: number; listenerCount: number; eventHistory: Record<string, number> } {
    let listenerCount = 0;
    this.listeners.forEach(set => {
      listenerCount += set.size;
    });

    const eventHistory: Record<string, number> = {};
    this.eventHistory.forEach((count, event) => {
      eventHistory[event] = count;
    });

    return {
      eventCount: this.listeners.size,
      listenerCount,
      eventHistory,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GET LISTENER COUNT FOR EVENT
  // ═══════════════════════════════════════════════════════════════════════════

  getListenerCount(event: string): number {
    return this.listeners.get(event)?.size || 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL EVENT BUS INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

export const globalEventBus = new EventBus({
  enableLogging: process.env.NODE_ENV === 'development',
  maxListeners: 50,
});
