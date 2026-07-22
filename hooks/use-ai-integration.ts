// ZERO-TRUST AI: React hook for AI integration
// Connects AI logic to UI components
// No new logic - only existing AI module wiring

import { useState, useEffect, useCallback } from 'react';
import { aiIntegrationService } from '../lib/ai/ai-integration-service';

// Hook interface for AI integration
export interface UseAIIntegrationReturn {
  // Home Screen AI
  getPersonalizedFeed: (products: any[]) => Promise<any[]>;
  
  // Mirror Screen AI
  analyzeFace: (imageData: Uint8ClampedArray, landmarks: any[]) => Promise<any>;
  
  // Shop Screen AI
  performVisualSearch: (imageData: Uint8ClampedArray, landmarks: any[]) => Promise<any>;
  
  // Behavior Tracking
  trackEvent: (eventType: any, entityType: any, entityId: string, context?: any, metadata?: any) => void;
  
  // User Profile
  getUserProfile: () => any;
  getMLData: () => any;
}

// AI Integration Hook - wires existing AI logic to React components
export function useAIIntegration(userId: string): UseAIIntegrationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Personalized feed for Home Screen
  const getPersonalizedFeed = useCallback(async (products: any[]) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const rankedProducts = await aiIntegrationService.getPersonalizedFeed(products, userId);
      setIsLoading(false);
      return rankedProducts;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI integration failed');
      setIsLoading(false);
      return products; // Fallback to original products
    }
  }, [userId]);

  // Face analysis for Mirror Screen
  const analyzeFace = useCallback(async (imageData: Uint8ClampedArray, landmarks: any[]) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const analysis = await aiIntegrationService.analyzeFaceForMirror(imageData, landmarks);
      setIsLoading(false);
      return analysis;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Face analysis failed');
      setIsLoading(false);
      return null;
    }
  }, [userId]);

  // Visual search for Shop Screen
  const performVisualSearch = useCallback(async (imageData: Uint8ClampedArray, landmarks: any[]) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const searchResult = await aiIntegrationService.performVisualSearch(imageData, landmarks);
      setIsLoading(false);
      return searchResult;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Visual search failed');
      setIsLoading(false);
      return null;
    }
  }, [userId]);

  // Behavior tracking
  const trackEvent = useCallback((eventType: any, entityType: any, entityId: string, context: any = {}, metadata: any = {}) => {
    try {
      aiIntegrationService.trackUserEvent(eventType, entityType, entityId, context, metadata);
    } catch (err) {
      console.error('Behavior tracking failed:', err);
    }
  }, [userId]);

  // Get user profile
  const getUserProfile = useCallback(() => {
    try {
      return aiIntegrationService.getUserProfile(userId);
    } catch (err) {
      console.error('Failed to get user profile:', err);
      return null;
    }
  }, [userId]);

  // Get ML training data
  const getMLData = useCallback(() => {
    try {
      return aiIntegrationService.getMLTrainingData(userId);
    } catch (err) {
      console.error('Failed to get ML data:', err);
      return null;
    }
  }, [userId]);

  return {
    getPersonalizedFeed,
    analyzeFace,
    performVisualSearch,
    trackEvent,
    getUserProfile,
    getMLData
  };
}
