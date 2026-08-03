/**
 * Production Feed API Integration
 * FastAPI + pgVector + TensorFlow + PostGIS + Meilisearch + Redis
 */

import { SmartFeedCard, FeedAlgorithmConfig, SmartFilterOptions } from '../../types/feed.types';

// Environment variables with VITE_ prefix for React Vite
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface PersonalizedFeedRequest {
  userId: string;
  location: {
    lat: number;
    lng: number;
    city: string;
  };
  timeContext: {
    hour: number;
    dayOfWeek: number;
    isWeekend: boolean;
  };
  filters?: SmartFilterOptions;
  limit?: number;
  offset?: number;
}

interface PersonalizedFeedResponse {
  items: SmartFeedCard[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
  metadata: {
    processingTime: number;
    algorithm: string;
    vectorMatchScore: number;
    contextualBoost: number;
  };
}

interface TrendingTagsResponse {
  tags: Array<{
    name: string;
    count: number;
    growth: number;
    category: string;
    isTopTrending: boolean;
  }>;
  updated: string;
}

interface NearbyContentRequest {
  userId: string;
  location: {
    lat: number;
    lng: number;
  };
  radiusKm: number;
  limit?: number;
}

interface EngagementMetricsRequest {
  itemIds: string[];
  type: 'view' | 'like' | 'save' | 'share';
}

interface EngagementMetricsResponse {
  metrics: Record<string, {
    views: number;
    likes: number;
    saves: number;
    shares: number;
    lastUpdated: string;
  }>;
}

export class ProductionFeedAPI {
  private baseURL: string;
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.supabaseUrl = SUPABASE_URL;
    this.supabaseKey = SUPABASE_ANON_KEY;
  }

  /**
   * Fetch personalized feed from FastAPI with pgVector matching
   */
  async fetchPersonalizedFeed(request: PersonalizedFeedRequest): Promise<PersonalizedFeedResponse> {
    try {
      const response = await fetch(`${this.baseURL}/feed/personalized`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Feed API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching personalized feed:', error);
      throw error;
    }
  }

  /**
   * Fetch trending tags from Meilisearch
   */
  async fetchTrendingTags(): Promise<TrendingTagsResponse> {
    try {
      const response = await fetch(`${this.baseURL}/trending/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Trending tags API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching trending tags:', error);
      throw error;
    }
  }

  /**
   * Fetch nearby content using PostGIS ST_DWithin queries
   */
  async fetchNearbyContent(request: NearbyContentRequest): Promise<PersonalizedFeedResponse> {
    try {
      const response = await fetch(`${this.baseURL}/feed/nearby`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Nearby content API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching nearby content:', error);
      throw error;
    }
  }

  /**
   * Fetch engagement metrics from Redis
   */
  async fetchEngagementMetrics(request: EngagementMetricsRequest): Promise<EngagementMetricsResponse> {
    try {
      const response = await fetch(`${this.baseURL}/engagement/metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Engagement metrics API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching engagement metrics:', error);
      throw error;
    }
  }

  /**
   * Track user interaction for real-time updates
   */
  async trackInteraction(data: {
    userId: string;
    itemId: string;
    itemType: string;
    interactionType: string;
    context?: any;
  }): Promise<void> {
    // For now, just log locally to avoid errors
    // This prevents the "Failed to fetch" error while backend is not running
    console.log('Interaction tracked locally:', {
      userId: data.userId,
      itemId: data.itemId,
      interactionType: data.interactionType,
      timestamp: new Date().toISOString()
    });
    
    // TODO: Implement proper tracking when backend is deployed
    // For now, this prevents user experience issues
    return;
  }

  /**
   * Get user profile with wallet balance from Supabase
   */
  async getUserProfile(userId: string): Promise<any> {
    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
          'apikey': this.supabaseKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Profile API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data[0] || null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  /**
   * Get Cloudflare Stream video manifest for reels
   */
  async getVideoManifest(videoId: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/video/manifest/${videoId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Video manifest API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.manifestUrl;
    } catch (error) {
      console.error('Error fetching video manifest:', error);
      throw error;
    }
  }

  /**
   * Trigger Virtual Photoshoot pipeline on AWS GPU
   */
  async triggerVirtualPhotoshoot(data: {
    userId: string;
    prompt: string;
    style: string;
  }): Promise<{ jobId: string; estimatedTime: number }> {
    try {
      const response = await fetch(`${this.baseURL}/ai/photoshoot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Photoshoot API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error triggering photoshoot:', error);
      throw error;
    }
  }

  /**
   * Initialize MediaPipe models for Innovators Hub
   */
  async initializeAIModels(): Promise<{ models: string[]; status: string }> {
    try {
      const response = await fetch(`${this.baseURL}/ai/models/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`AI Models API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error initializing AI models:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const productionFeedAPI = new ProductionFeedAPI();
