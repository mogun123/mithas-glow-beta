/**
 * Smart Feed Engine for MITHAS GLOW
 * Multi-Algorithm Content Intelligence System
 */

import { supabase } from './supabase';
import type { Database } from './database.types';
import {
  SmartFeedCard,
  FeedAlgorithmConfig,
  UserPreferences,
  UserInteraction,
  TrendingContent,
  FeedImpression,
  ContextAnalyzerResult,
  AIMixerResult,
  SmartFilterOptions
} from '../types/feed.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Product = Database['public']['Tables']['products']['Row'];
type Reel = Database['public']['Tables']['reels']['Row'];

export class SmartFeedEngine {
  private static instance: SmartFeedEngine;

  public static getInstance(): SmartFeedEngine {
    if (!SmartFeedEngine.instance) {
      SmartFeedEngine.instance = new SmartFeedEngine();
    }
    return SmartFeedEngine.instance;
  }

  /**
   * Main entry point - generates personalized feed
   */
  async generatePersonalizedFeed(config: FeedAlgorithmConfig): Promise<SmartFeedCard[]> {
    try {
      console.log('🧠 Generating personalized feed for user:', config.userId);

      // 1. Get user interaction history
      const history = await this.getUserInteractionHistory(config.userId);
      
      // 2. Calculate user preference vectors
      const preferenceVector = this.buildPreferenceVector(history, config.preferences);
      
      // 3. Get trending content in user's location
      const trending = await this.getTrendingContent(config.location);
      
      // 4. Get content from followed creators
      const following = await this.getFollowingContent(config.userId);
      
      // 5. Get personalized recommendations
      const personalized = await this.getPersonalizedContent(config.userId, preferenceVector);
      
      // 6. Apply context filters (time, weather, events)
      const contextFiltered = this.applyContextFilters(
        [...trending, ...following, ...personalized],
        config.context
      );
      
      // 7. Score and rank all content
      const scored = this.scoreContent(contextFiltered, preferenceVector, config);
      
      // 8. Apply diversity & freshness constraints
      const optimized = this.optimizeFeedDiversity(scored);
      
      // 9. Convert to SmartFeedCard format
      const feedCards = await this.convertToSmartFeedCards(optimized, config);
      
      console.log(`✅ Generated ${feedCards.length} personalized cards`);
      return feedCards;

    } catch (error) {
      console.error('❌ Error generating personalized feed:', error);
      // Fallback to basic content
      return this.getFallbackContent(config);
    }
  }

  /**
   * Context Analyzer - analyzes time, location, and events
   */
  async analyzeContext(userId: string, location: { lat: number; lng: number; city: string }): Promise<ContextAnalyzerResult> {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Time of day analysis
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour >= 6 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    // Season analysis
    const month = now.getMonth();
    let season = 'spring';
    if (month >= 2 && month <= 4) season = 'spring';
    else if (month >= 5 && month <= 7) season = 'summer';
    else if (month >= 8 && month <= 10) season = 'autumn';
    else season = 'winter';

    // Get upcoming events from user profile/calendar
    const upcomingEvents = await this.getUserUpcomingEvents(userId);

    // Location context
    const locationContext = await this.analyzeLocationContext(location);

    return {
      timeOfDay,
      dayOfWeek,
      season,
      upcomingOccasions: upcomingEvents,
      locationContext
    };
  }

  /**
   * AI Mixer - combines different content sources with intelligent weighting
   */
  async mixContent(
    trending: SmartFeedCard[],
    following: SmartFeedCard[],
    personalized: SmartFeedCard[],
    config: FeedAlgorithmConfig
  ): Promise<AIMixerResult> {
    // Dynamic weighting based on context and user behavior
    let trendingWeight = 0.25;
    let followingWeight = 0.25;
    let personalizedWeight = 0.5;

    // Adjust weights based on time of day
    if (config.context.timeOfDay === 'morning') {
      trendingWeight = 0.3;    // More trending in morning
      personalizedWeight = 0.4;
    } else if (config.context.timeOfDay === 'evening') {
      followingWeight = 0.3;    // More social in evening
      personalizedWeight = 0.4;
    }

    // Adjust weights based on user activity level
    const userActivity = await this.getUserActivityLevel(config.userId);
    if (userActivity < 0.3) {
      // New user - more trending content
      trendingWeight = 0.4;
      personalizedWeight = 0.3;
      followingWeight = 0.3;
    }

    // Select content based on weights
    const totalItems = 20; // Target feed size
    const trendingCount = Math.floor(totalItems * trendingWeight);
    const followingCount = Math.floor(totalItems * followingWeight);
    const personalizedCount = totalItems - trendingCount - followingCount;

    const selectedContent = [
      ...trending.slice(0, trendingCount),
      ...following.slice(0, followingCount),
      ...personalized.slice(0, personalizedCount)
    ];

    // Shuffle for natural feel
    const shuffled = this.shuffleArray(selectedContent);

    return {
      content: shuffled,
      algorithm: {
        trendingWeight,
        followingWeight,
        personalizedWeight,
        diversityScore: this.calculateDiversityScore(shuffled)
      },
      metadata: {
        totalItems: shuffled.length,
        avgRelevanceScore: shuffled.reduce((sum, card) => sum + card.relevanceScore, 0) / shuffled.length,
        contextOptimizations: this.getContextOptimizations(config.context)
      }
    };
  }

  /**
   * Get user interaction history
   */
  private async getUserInteractionHistory(userId: string): Promise<UserInteraction[]> {
    try {
      const { data, error } = await supabase
        .from('user_interactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user interactions:', error);
      return [];
    }
  }

  /**
   * Build preference vector from interaction history
   */
  private buildPreferenceVector(history: UserInteraction[], preferences: UserPreferences): number[] {
    // Simplified preference vector - in production this would be more sophisticated
    const vector = new Array(50).fill(0); // 50-dimensional vector
    
    // Weight different interaction types
    history.forEach(interaction => {
      let weight = 1;
      if (interaction.interactionType === 'purchase') weight = 5;
      else if (interaction.interactionType === 'save') weight = 3;
      else if (interaction.interactionType === 'like') weight = 2;
      
      // Add to vector based on item type (simplified)
      const index = this.getItemTypeIndex(interaction.itemType);
      if (index !== -1) {
        vector[index] += weight;
      }
    });

    // Normalize vector
    const sum = vector.reduce((a, b) => a + b, 0);
    return sum > 0 ? vector.map(v => v / sum) : vector;
  }

  /**
   * Get trending content based on location
   */
  private async getTrendingContent(location: { lat: number; lng: number; city: string }): Promise<SmartFeedCard[]> {
    try {
      // Get trending content from database
      const { data: trending, error } = await supabase
        .from('trending_content')
        .select('*')
        .or(`location.eq.${location.city},geographic_scope.eq.national`)
        .order('trend_score', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Convert trending content to SmartFeedCard format
      const cards: SmartFeedCard[] = [];
      for (const item of trending || []) {
        const card = await this.convertTrendingToCard(item, location);
        if (card) cards.push(card);
      }

      return cards;
    } catch (error) {
      console.error('Error fetching trending content:', error);
      return [];
    }
  }

  /**
   * Get content from followed creators
   */
  private async getFollowingContent(userId: string): Promise<SmartFeedCard[]> {
    try {
      // Get user's followed creators
      const { data: follows, error: followError } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', userId);

      if (followError) throw followError;

      const followingIds = follows?.map(f => f.following_id) || [];
      if (followingIds.length === 0) return [];

      // Get content from followed creators
      const { data: content, error } = await supabase
        .from('content')
        .select('*')
        .in('creator_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) throw error;

      // Convert to SmartFeedCard format
      const cards: SmartFeedCard[] = [];
      for (const item of content || []) {
        const card = await this.convertContentToCard(item);
        if (card) cards.push(card);
      }

      return cards;
    } catch (error) {
      console.error('Error fetching following content:', error);
      return [];
    }
  }

  /**
   * Get personalized content based on user preferences
   */
  private async getPersonalizedContent(userId: string, preferenceVector: number[]): Promise<SmartFeedCard[]> {
    try {
      // Get user preferences
      const { data: preferences, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // Get content matching user preferences
      let query = supabase
        .from('content')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(25);

      // Apply preference filters
      if (preferences?.style_categories?.length) {
        query = query.contains('tags', preferences.style_categories);
      }

      const { data: content, error: contentError } = await query;
      if (contentError) throw contentError;

      // Convert and score based on preference vector
      const cards: SmartFeedCard[] = [];
      for (const item of content || []) {
        const card = await this.convertContentToCard(item);
        if (card) {
          card.relevanceScore = this.calculatePreferenceMatch(card, preferenceVector);
          cards.push(card);
        }
      }

      return cards.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      console.error('Error fetching personalized content:', error);
      return [];
    }
  }

  /**
   * Apply context filters based on time, weather, events
   */
  private applyContextFilters(
    content: SmartFeedCard[],
    context: FeedAlgorithmConfig['context']
  ): SmartFeedCard[] {
    return content.filter(card => {
      // Time-based filtering
      if (context.timeOfDay === 'morning' && card.tags.occasion?.includes('party')) {
        return false; // No party content in morning
      }
      
      // Event-based filtering
      if (context.upcomingEvents?.length) {
        const hasMatchingEvent = context.upcomingEvents.some(event =>
          card.tags.occasion?.includes(event.type.toLowerCase())
        );
        if (hasMatchingEvent) {
          card.context.isMatchingEvent = context.upcomingEvents[0].type;
        }
      }

      return true;
    });
  }

  /**
   * Score and rank content
   */
  private scoreContent(
    content: SmartFeedCard[],
    preferenceVector: number[],
    config: FeedAlgorithmConfig
  ): SmartFeedCard[] {
    return content.map(item => {
      const relevanceScore = this.calculateRelevance(item, preferenceVector);
      const trendingScore = item.metrics.views / Math.max(1, this.getDaysSinceCreated(item));
      const qualityScore = item.qualityScore || 0.5;
      const recencyBonus = this.getRecencyBonus(item);

      const finalScore = (
        relevanceScore * 0.40 +
        trendingScore * 0.25 +
        qualityScore * 0.20 +
        recencyBonus * 0.15
      );

      return {
        ...item,
        relevanceScore: Math.round(finalScore * 100)
      };
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Optimize feed diversity
   */
  private optimizeFeedDiversity(content: SmartFeedCard[]): SmartFeedCard[] {
    // Ensure content type diversity (no more than 3 of same type in a row)
    const optimized: SmartFeedCard[] = [];
    let typeCount = { reel: 0, product: 0, look: 0, tutorial: 0, event: 0 };
    let lastTypes: string[] = [];

    content.forEach(card => {
      if (lastTypes.length >= 3 && lastTypes.every(type => type === card.type)) {
        // Skip to maintain diversity
        return;
      }

      optimized.push(card);
      lastTypes.push(card.type);
      if (lastTypes.length > 3) lastTypes.shift();
      typeCount[card.type]++;
    });

    return optimized;
  }

  /**
   * Convert content items to SmartFeedCard format
   */
  private async convertToSmartFeedCards(
    content: any[],
    config: FeedAlgorithmConfig
  ): Promise<SmartFeedCard[]> {
    const cards: SmartFeedCard[] = [];

    for (const item of content) {
      try {
        const card = await this.convertContentToCard(item);
        if (card) cards.push(card);
      } catch (error) {
        console.error('Error converting content to card:', error);
      }
    }

    return cards;
  }

  /**
   * Helper methods
   */
  private getItemTypeIndex(itemType: string): number {
    const types = ['reel', 'product', 'look', 'tutorial', 'event'];
    return types.indexOf(itemType);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private calculateDiversityScore(content: SmartFeedCard[]): number {
    const types = new Set(content.map(c => c.type));
    return types.size / 5; // Max 5 types
  }

  private getContextOptimizations(context: any): string[] {
    const optimizations: string[] = [];
    
    if (context.timeOfDay === 'morning') {
      optimizations.push('Morning routine content');
    } else if (context.timeOfDay === 'evening') {
      optimizations.push('Evening social content');
    }

    if (context.upcomingEvents?.length) {
      optimizations.push('Event-based recommendations');
    }

    return optimizations;
  }

  private async getUserActivityLevel(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('user_interactions')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;
      
      const activityCount = data?.length || 0;
      return Math.min(activityCount / 50, 1); // Normalize to 0-1
    } catch (error) {
      return 0.5; // Default medium activity
    }
  }

  private async getUserUpcomingEvents(userId: string): Promise<any[]> {
    // This would integrate with calendar/user events
    // For now, return empty array
    return [];
  }

  private async analyzeLocationContext(location: { lat: number; lng: number; city: string }): Promise<any> {
    return {
      isUrban: true, // Simplified
      nearbyEvents: [],
      localTrends: []
    };
  }

  private calculatePreferenceMatch(card: SmartFeedCard, preferenceVector: number[]): number {
    // Simplified preference matching
    return Math.random() * 50 + 50; // Random between 50-100 for demo
  }

  private calculateRelevance(item: SmartFeedCard, preferenceVector: number[]): number {
    return item.relevanceScore || Math.random() * 100;
  }

  private getDaysSinceCreated(item: any): number {
    const created = new Date(item.created_at);
    const now = new Date();
    return Math.max(1, (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }

  private getRecencyBonus(item: SmartFeedCard): number {
    const daysSince = this.getDaysSinceCreated(item);
    if (daysSince <= 1) return 1.0;
    if (daysSince <= 7) return 0.8;
    if (daysSince <= 30) return 0.6;
    return 0.4;
  }

  private async convertTrendingToCard(item: any, location: any): Promise<SmartFeedCard | null> {
    // Convert trending item to SmartFeedCard
    return null; // Placeholder
  }

  private async convertContentToCard(item: any): Promise<SmartFeedCard | null> {
    // Convert content item to SmartFeedCard
    return null; // Placeholder
  }

  private async getFallbackContent(config: FeedAlgorithmConfig): Promise<SmartFeedCard[]> {
    // Return basic fallback content
    return [];
  }

  /**
   * Track user interactions for learning
   */
  async trackInteraction(
    userId: string,
    itemId: string,
    itemType: string,
    interactionType: string,
    context?: any
  ): Promise<void> {
    try {
      await supabase.from('user_interactions').insert({
        user_id: userId,
        item_id: itemId,
        item_type: itemType,
        interaction_type: interactionType,
        context: context || {},
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  }

  /**
   * Track feed impressions
   */
  async trackImpression(
    userId: string,
    itemId: string,
    position: number,
    wasClicked: boolean,
    timeViewedSeconds: number
  ): Promise<void> {
    try {
      await supabase.from('feed_impressions').insert({
        user_id: userId,
        item_id: itemId,
        position,
        was_clicked: wasClicked,
        time_viewed_seconds: timeViewedSeconds,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error tracking impression:', error);
    }
  }
}

// Export singleton instance
export const smartFeedEngine = SmartFeedEngine.getInstance();
