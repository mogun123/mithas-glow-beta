// Analytics Service - Track user interactions and preferences
import { supabase } from '../supabase';

interface AnalyticsEvent {
  event_type: string;
  user_id?: string;
  session_id?: string;
  metadata: Record<string, any>;
  timestamp: string;
}

class AnalyticsService {
  private sessionId: string;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
  }

  private getOrCreateSessionId(): string {
    let sessionId = localStorage.getItem('glow_analytics_session');
    if (!sessionId) {
      sessionId = `analytics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('glow_analytics_session', sessionId);
    }
    return sessionId;
  }

  async trackEvent(eventType: string, metadata: Record<string, any> = {}) {
    try {
      const event: AnalyticsEvent = {
        event_type: eventType,
        user_id: metadata.user_id || null,
        session_id: this.sessionId,
        metadata,
        timestamp: new Date().toISOString()
      };

      await supabase
        .from('analytics_events')
        .insert(event as any);

      console.log('Analytics event tracked:', eventType, metadata);
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }

  // Mirror-specific tracking methods
  async trackFaceAnalysis(skinTone: string, faceShape: string, confidence: number, duration?: number) {
    await this.trackEvent('face_analysis_completed', {
      skin_tone: skinTone,
      face_shape: faceShape,
      confidence_score: confidence,
      analysis_duration: duration || null
    });
  }

  async trackProductView(productId: string, productName: string, category: string) {
    await this.trackEvent('product_viewed', {
      product_id: productId,
      product_name: productName,
      category,
      source: 'mirror_screen'
    });
  }

  async trackAddToCart(productId: string, productName: string, price: number) {
    await this.trackEvent('added_to_cart', {
      product_id: productId,
      product_name: productName,
      price,
      source: 'mirror_screen'
    });
  }

  async trackModeSelection(mode: string) {
    await this.trackEvent('mode_selected', {
      mode,
      screen: 'mirror_home'
    });
  }

  async trackARTrial(productId: string, productName: string) {
    await this.trackEvent('ar_trial_started', {
      product_id: productId,
      product_name: productName,
      feature: 'ar_try_on'
    });
  }

  async trackCustomization(type: string, value: string) {
    await this.trackEvent('customization_applied', {
      customization_type: type,
      customization_value: value
    });
  }

  async trackNavigation(from: string, to: string) {
    await this.trackEvent('navigation', {
      from_screen: from,
      to_screen: to,
      user_flow: 'mirror_experience'
    });
  }

  async trackCameraAction(action: 'started' | 'photo_captured' | 'stopped') {
    await this.trackEvent('camera_action', {
      action,
      feature: 'face_analysis'
    });
  }

  async trackError(errorType: string, errorMessage: string, context: string) {
    await this.trackEvent('error_occurred', {
      error_type: errorType,
      error_message: errorMessage,
      context,
      user_agent: navigator.userAgent
    });
  }
}

export const analyticsService = new AnalyticsService();
