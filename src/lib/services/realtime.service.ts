// Real-time Service - WebSocket integration for live updates
import { supabase } from '../supabase';

interface RealtimeSubscription {
  unsubscribe: () => void;
}

class RealtimeService {
  private subscriptions: Map<string, RealtimeSubscription> = new Map();

  // Subscribe to product updates
  subscribeToProductUpdates(callback: (payload: any) => void) {
    const subscription = supabase
      .channel('product_changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'products',
          filter: 'status=eq.active'
        },
        callback
      )
      .subscribe();

    this.subscriptions.set('products', subscription);
    return subscription;
  }

  // Subscribe to cart updates (for multi-device sync)
  subscribeToCartUpdates(userId: string, callback: (payload: any) => void) {
    const subscription = supabase
      .channel(`cart_changes_${userId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'cart',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();

    this.subscriptions.set(`cart_${userId}`, subscription);
    return subscription;
  }

  // Subscribe to inventory updates
  subscribeToInventoryUpdates(callback: (payload: any) => void) {
    const subscription = supabase
      .channel('inventory_changes')
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'products',
          filter: 'in_stock=eq.true'
        },
        (payload) => {
          // Only notify if stock status changed
          if (payload.eventType === 'UPDATE' && 
              payload.old?.in_stock !== payload.new?.in_stock) {
            callback(payload);
          }
        }
      )
      .subscribe();

    this.subscriptions.set('inventory', subscription);
    return subscription;
  }

  // Subscribe to new face analyses (for admin/monitoring)
  subscribeToFaceAnalyses(callback: (payload: any) => void) {
    const subscription = supabase
      .channel('face_analysis_updates')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'face_analyses'
        },
        callback
      )
      .subscribe();

    this.subscriptions.set('face_analyses', subscription);
    return subscription;
  }

  /** Live clinical analysis inserts/updates for Events screen */
  subscribeToClinicalAnalyses(userId: string, callback: (payload: any) => void) {
    const key = `clinical_analyses_${userId}`;
    this.unsubscribe(key);

    const subscription = supabase
      .channel(key)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clinical_analyses',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();

    this.subscriptions.set(key, subscription);
    return subscription;
  }

  /** Live glow journey inserts/updates for Events screen */
  subscribeToGlowJourneys(userId: string, callback: (payload: any) => void) {
    const key = `glow_journeys_${userId}`;
    this.unsubscribe(key);

    const subscription = supabase
      .channel(key)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'glow_journeys',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();

    this.subscriptions.set(key, subscription);
    return subscription;
  }

  /** Live scheduled scan inserts/updates for Events screen */
  subscribeToScheduledScans(userId: string, callback: (payload: any) => void) {
    const key = `scheduled_scans_${userId}`;
    this.unsubscribe(key);

    const subscription = supabase
      .channel(key)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_scans',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();

    this.subscriptions.set(key, subscription);
    return subscription;
  }

  // Unsubscribe from specific channel
  unsubscribe(key: string) {
    const subscription = this.subscriptions.get(key);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(key);
    }
  }

  // Unsubscribe from all channels
  unsubscribeAll() {
    this.subscriptions.forEach((subscription, key) => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();
  }

  // Broadcast user action (for real-time collaboration features)
  broadcastUserAction(action: string, data: any) {
    supabase
      .channel('user_actions')
      .send({
        type: 'broadcast',
        event: action,
        payload: {
          user_id: data.user_id,
          timestamp: new Date().toISOString(),
          action,
          ...data
        }
      });
  }

  // Listen to user actions (for collaborative features)
  onUserAction(callback: (payload: any) => void) {
    const subscription = supabase
      .channel('user_actions')
      .on('broadcast', { event: '*', callback })
      .subscribe();

    this.subscriptions.set('user_actions', subscription);
    return subscription;
  }
}

export const realtimeService = new RealtimeService();
