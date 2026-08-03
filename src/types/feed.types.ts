/**
 * Smart Feed Types for MITHAS GLOW
 * Next-Gen Home Screen Intelligence System
 */

export interface SmartFeedCard {
  // Core Content
  id: string;
  type: 'reel' | 'product' | 'look' | 'tutorial' | 'event';
  category: string;
  
  // Media
  imageUrl: string;
  videoUrl?: string;
  thumbnailUrl: string;
  
  // Creator/Seller Info
  creator: {
    id: string;
    name: string;
    avatar: string;
    verified: boolean;
    isFollowed: boolean;
    distance?: number; // km from user
  };
  
  // Engagement Metrics
  metrics: {
    views: number;
    likes: number;
    saves: number;
    shares: number;
    purchaseConversions: number;
  };
  
  // AI Scoring
  relevanceScore: number; // 0-100
  trendingScore: number;
  qualityScore: number;
  
  // Smart Tags
  tags: {
    occasion?: string[]; // 'wedding', 'office', 'party'
    season?: string;
    skinTone?: string[];
    bodyType?: string[];
    priceRange?: string;
    difficulty?: 'easy' | 'medium' | 'pro';
  };
  
  // Shoppable Products
  products: Array<{
    id: string;
    name: string;
    price: number;
    inStock: boolean;
    arEnabled: boolean;
  }>;
  
  // Quick Actions
  actions: {
    canTryOn: boolean;
    canBook: boolean;
    canBuy: boolean;
    canSave: boolean;
    canShare: boolean;
  };
  
  // Context Signals
  context: {
    isNew: boolean; // Posted in last 24h
    isNearby: boolean;
    isMatchingEvent?: string; // User has wedding in calendar
    weatherMatch?: boolean;
    urgency?: 'limited_stock' | 'flash_sale' | 'ending_soon';
  };
  
  // Basic Info (for backward compatibility)
  title: string;
  description: string;
  tag: string;
}

export interface FeedAlgorithmConfig {
  userId: string;
  location: {
    lat: number;
    lng: number;
    city: string;
  };
  context: {
    timeOfDay: string;
    dayOfWeek: string;
    weather?: string;
    upcomingEvents?: Array<{
      type: string;
      date: string;
    }>;
  };
  preferences: UserPreferences;
}

export interface UserPreferences {
  userId: string;
  styleCategories: string[];
  favoriteColors: string[];
  preferredOccasions: string[];
  priceSensitivity: 'budget' | 'moderate' | 'premium';
  skinTone?: string;
  bodyMeasurements?: Record<string, any>;
  followedCreators: string[];
  interactionHistory: UserInteraction[];
}

export interface UserInteraction {
  id: string;
  userId: string;
  itemId: string;
  itemType: 'reel' | 'product' | 'look' | 'tutorial' | 'event';
  interactionType: 'view' | 'like' | 'save' | 'share' | 'purchase';
  durationSeconds?: number;
  context?: {
    timeOfDay: string;
    location?: string;
    feedPosition?: number;
  };
  createdAt: string;
}

export interface TrendingContent {
  id: string;
  itemId: string;
  itemType: 'reel' | 'product' | 'look' | 'tutorial' | 'event';
  trendScore: number;
  geographicScope: 'city' | 'state' | 'national';
  location: string;
  category: string;
  createdAt: string;
  expiresAt: string;
}

export interface FeedImpression {
  id: string;
  userId: string;
  itemId: string;
  position: number; // feed position
  wasClicked: boolean;
  timeViewedSeconds: number;
  relevanceScore: number;
  createdAt: string;
}

export interface SmartFilterOptions {
  priceRange?: [number, number];
  distance?: number; // km
  category?: string;
  occasion?: string;
  sortBy?: 'trending' | 'new' | 'top_rated' | 'price_low' | 'price_high';
  searchQuery?: string;
}

export interface SmartTabType {
  id: string;
  label: string;
  type: 'for_you' | 'following' | 'nearby' | 'events' | 'custom';
  icon?: string;
}

export interface ContextAnalyzerResult {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  season: string;
  weatherContext?: string;
  upcomingOccasions: Array<{
    type: string;
    urgency: 'high' | 'medium' | 'low';
    daysUntil: number;
  }>;
  locationContext: {
    isUrban: boolean;
    nearbyEvents: string[];
    localTrends: string[];
  };
}

export interface AIMixerResult {
  content: SmartFeedCard[];
  algorithm: {
    trendingWeight: number;
    followingWeight: number;
    personalizedWeight: number;
    diversityScore: number;
  };
  metadata: {
    totalItems: number;
    avgRelevanceScore: number;
    contextOptimizations: string[];
  };
}
