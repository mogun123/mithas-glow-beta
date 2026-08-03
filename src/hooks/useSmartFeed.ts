/**
 * Smart Feed Hook for MITHAS GLOW
 * Integrates the Smart Feed Engine with React components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { smartFeedEngine } from '../lib/smart-feed-engine';
import { SmartFeedCard, FeedAlgorithmConfig, SmartFilterOptions, SmartTabType } from '../types/feed.types';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface UseSmartFeedOptions {
  userId: string;
  location?: {
    lat: number;
    lng: number;
    city: string;
  };
  initialTab?: string;
  pageSize?: number;
}

interface UseSmartFeedReturn {
  // Feed data
  feedCards: SmartFeedCard[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  
  // Tab navigation
  activeTab: string;
  tabs: SmartTabType[];
  setActiveTab: (tabId: string) => void;
  
  // Filtering
  filters: SmartFilterOptions;
  setFilters: (filters: Partial<SmartFilterOptions>) => void;
  clearFilters: () => void;
  
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Actions
  refreshFeed: () => Promise<void>;
  loadMore: () => Promise<void>;
  handleCardAction: (action: string, cardId: string, cardType: string) => void;
  handleCardImpression: (cardId: string, position: number) => void;
  
  // Analytics
  trackInteraction: (cardId: string, cardType: string, interactionType: string) => void;
}

export function useSmartFeed({
  userId,
  location = { lat: 19.0760, lng: 72.8777, city: 'Mumbai' }, // Default to Mumbai
  initialTab = 'for_you',
  pageSize = 10
}: UseSmartFeedOptions): UseSmartFeedReturn {
  // Feed state
  const [feedCards, setFeedCards] = useState<SmartFeedCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Tab navigation
  const [activeTab, setActiveTab] = useState(initialTab);
  const tabs: SmartTabType[] = [
    { id: 'for_you', label: 'For You', type: 'for_you', icon: '✨' },
    { id: 'following', label: 'Following', type: 'following', icon: '👥' },
    { id: 'nearby', label: 'Nearby', type: 'nearby', icon: '📍' },
    { id: 'events', label: 'Events', type: 'events', icon: '📅' }
  ];
  
  // Filtering
  const [filters, setFiltersState] = useState<SmartFilterOptions>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // Refs for tracking
  const impressionTracker = useRef<Map<string, number>>(new Map());
  const sessionStartTime = useRef(Date.now());

  // Get user preferences
  const getUserPreferences = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user preferences:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      return null;
    }
  }, [userId]);

  // Analyze context
  const analyzeContext = useCallback(async () => {
    try {
      const context = await smartFeedEngine.analyzeContext(userId, location);
      return context;
    } catch (error) {
      console.error('Error analyzing context:', error);
      return null;
    }
  }, [userId, location]);

  // Generate feed configuration
  const getFeedConfig = useCallback(async (): Promise<FeedAlgorithmConfig | null> => {
    try {
      const preferences = await getUserPreferences();
      const context = await analyzeContext();

      if (!preferences || !context) {
        return null;
      }

      return {
        userId,
        location,
        context: {
          timeOfDay: context.timeOfDay,
          dayOfWeek: context.dayOfWeek,
          weather: context.weatherContext,
          upcomingEvents: context.upcomingOccasions
        },
        preferences: {
          userId,
          styleCategories: preferences.style_categories || [],
          favoriteColors: preferences.favorite_colors || [],
          preferredOccasions: preferences.preferred_occasions || [],
          priceSensitivity: preferences.price_sensitivity || 'moderate',
          skinTone: preferences.skin_tone || undefined,
          bodyMeasurements: preferences.body_measurements || undefined,
          followedCreators: preferences.followed_creators || [],
          interactionHistory: []
        }
      };
    } catch (error) {
      console.error('Error creating feed config:', error);
      return null;
    }
  }, [userId, location, getUserPreferences, analyzeContext]);

  // Load feed data
  const loadFeed = useCallback(async (page: number = 0, append: boolean = false) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const config = await getFeedConfig();
      if (!config) {
        throw new Error('Failed to create feed configuration');
      }

      // Apply tab-specific logic
      let feedData: SmartFeedCard[] = [];
      
      switch (activeTab) {
        case 'for_you':
          feedData = await smartFeedEngine.generatePersonalizedFeed(config);
          break;
        case 'following':
          feedData = await smartFeedEngine.getFollowingContent(userId);
          break;
        case 'nearby':
          feedData = await smartFeedEngine.getNearbyContent(location, 25); // 25km radius
          break;
        case 'events':
          feedData = await smartFeedEngine.getEventBasedContent(config);
          break;
        default:
          feedData = await smartFeedEngine.generatePersonalizedFeed(config);
      }

      // Apply filters
      if (Object.keys(filters).length > 0) {
        feedData = applyFiltersToFeed(feedData, filters);
      }

      // Apply search
      if (searchQuery.trim()) {
        feedData = applySearchToFeed(feedData, searchQuery);
      }

      // Pagination
      const startIndex = page * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedData = feedData.slice(startIndex, endIndex);

      // Update state
      if (append) {
        setFeedCards(prev => [...prev, ...paginatedData]);
      } else {
        setFeedCards(paginatedData);
      }

      setHasMore(endIndex < feedData.length);
      setCurrentPage(page);

    } catch (error) {
      console.error('Error loading feed:', error);
      setError(error instanceof Error ? error.message : 'Failed to load feed');
      
      // Fallback to mock data
      if (!append) {
        setFeedCards(getMockFeedData());
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, activeTab, filters, searchQuery, userId, location, pageSize, getFeedConfig]);

  // Apply filters to feed
  const applyFiltersToFeed = (feed: SmartFeedCard[], filterOptions: SmartFilterOptions): SmartFeedCard[] => {
    return feed.filter(card => {
      // Price filter
      if (filterOptions.priceRange) {
        const minPrice = Math.min(...card.products.map(p => p.price));
        const maxPrice = Math.max(...card.products.map(p => p.price));
        if (minPrice > filterOptions.priceRange[1] || maxPrice < filterOptions.priceRange[0]) {
          return false;
        }
      }

      // Category filter
      if (filterOptions.category && card.category !== filterOptions.category) {
        return false;
      }

      // Occasion filter
      if (filterOptions.occasion && !card.tags.occasion?.includes(filterOptions.occasion)) {
        return false;
      }

      return true;
    });
  };

  // Apply search to feed
  const applySearchToFeed = (feed: SmartFeedCard[], query: string): SmartFeedCard[] => {
    const searchTerm = query.toLowerCase();
    return feed.filter(card => 
      card.title.toLowerCase().includes(searchTerm) ||
      card.description.toLowerCase().includes(searchTerm) ||
      card.creator.name.toLowerCase().includes(searchTerm) ||
      card.tags.occasion?.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      card.category.toLowerCase().includes(searchTerm)
    );
  };

  // Mock data for fallback
  const getMockFeedData = (): SmartFeedCard[] => {
    return [
      {
        id: 'mock-1',
        type: 'look',
        category: 'fashion',
        imageUrl: 'https://placehold.co/600x400/FFD6E8/1f2937?text=Mock+Look+1',
        thumbnailUrl: 'https://placehold.co/300x200/FFD6E8/1f2937?text=Mock+Look+1',
        title: 'Elegant Evening Look',
        description: 'Perfect for your next special occasion',
        tag: 'Trending',
        creator: {
          id: 'creator-1',
          name: 'Riya Beauty',
          avatar: 'https://placehold.co/100x100/FFD6E8/1f2937?text=Riya',
          verified: true,
          isFollowed: false,
          distance: 2.3
        },
        metrics: {
          views: 12500,
          likes: 2340,
          saves: 890,
          shares: 340,
          purchaseConversions: 45
        },
        relevanceScore: 94,
        trendingScore: 78,
        qualityScore: 0.92,
        tags: {
          occasion: ['party', 'evening'],
          season: 'winter',
          priceRange: 'premium'
        },
        products: [
          { id: 'prod-1', name: 'Evening Gown', price: 4500, inStock: true, arEnabled: true },
          { id: 'prod-2', name: 'Clutch Bag', price: 1200, inStock: true, arEnabled: false }
        ],
        actions: {
          canTryOn: true,
          canBook: true,
          canBuy: true,
          canSave: true,
          canShare: true
        },
        context: {
          isNew: true,
          isNearby: true,
          urgency: 'limited_stock'
        }
      },
      {
        id: 'mock-2',
        type: 'reel',
        category: 'makeup',
        imageUrl: 'https://placehold.co/600x400/EBD8FF/1f2937?text=Mock+Reel+1',
        thumbnailUrl: 'https://placehold.co/300x200/EBD8FF/1f2937?text=Mock+Reel+1',
        videoUrl: 'https://example.com/video.mp4',
        title: 'Quick Makeup Tutorial',
        description: '5-minute makeup for busy mornings',
        tag: 'Tutorial',
        creator: {
          id: 'creator-2',
          name: 'Makeup Pro',
          avatar: 'https://placehold.co/100x100/EBD8FF/1f2937?text=Pro',
          verified: true,
          isFollowed: true,
          distance: 5.7
        },
        metrics: {
          views: 8900,
          likes: 1560,
          saves: 670,
          shares: 230,
          purchaseConversions: 28
        },
        relevanceScore: 87,
        trendingScore: 65,
        qualityScore: 0.88,
        tags: {
          occasion: ['office', 'casual'],
          season: 'summer',
          difficulty: 'easy'
        },
        products: [
          { id: 'prod-3', name: 'Foundation', price: 800, inStock: true, arEnabled: false },
          { id: 'prod-4', name: 'Lipstick', price: 450, inStock: true, arEnabled: false }
        ],
        actions: {
          canTryOn: false,
          canBook: false,
          canBuy: true,
          canSave: true,
          canShare: true
        },
        context: {
          isNew: false,
          isNearby: false
        }
      }
    ];
  };

  // Handle card actions
  const handleCardAction = useCallback((action: string, cardId: string, cardType: string) => {
    // Track interaction
    trackInteraction(cardId, cardType, action);

    // Handle specific actions
    switch (action) {
      case 'like':
        toast.success('💖 Added to your likes!');
        break;
      case 'save':
        toast.success('🔖 Saved to your collection!');
        break;
      case 'book':
        toast.success('📅 Opening booking calendar...');
        break;
      case 'try_on':
        toast.success('👗 Opening virtual try-on...');
        break;
      case 'buy':
        toast.success('🛒 Added to cart!');
        break;
      case 'share':
        toast.success('📤 Share link copied!');
        break;
      default:
        console.log('Action:', action, 'Card:', cardId);
    }
  }, []);

  // Handle card impressions
  const handleCardImpression = useCallback((cardId: string, position: number) => {
    // Track impression only once per card per session
    if (!impressionTracker.current.has(cardId)) {
      impressionTracker.current.set(cardId, Date.now());
      
      // Track in background
      smartFeedEngine.trackImpression(
        userId,
        cardId,
        position,
        false, // was_clicked
        0 // time_viewed_seconds (will be updated on click)
      ).catch(error => {
        console.error('Error tracking impression:', error);
      });
    }
  }, [userId]);

  // Track interactions
  const trackInteraction = useCallback((cardId: string, cardType: string, interactionType: string) => {
    smartFeedEngine.trackInteraction(
      userId,
      cardId,
      cardType,
      interactionType,
      {
        timeOfDay: new Date().getHours() < 12 ? 'morning' : 'evening',
        feedPosition: feedCards.findIndex(card => card.id === cardId),
        sessionId: sessionStartTime.current.toString()
      }
    ).catch(error => {
      console.error('Error tracking interaction:', error);
    });
  }, [userId, feedCards]);

  // Refresh feed
  const refreshFeed = useCallback(async () => {
    impressionTracker.current.clear();
    await loadFeed(0, false);
  }, [loadFeed]);

  // Load more
  const loadMore = useCallback(async () => {
    if (hasMore && !isLoading) {
      await loadFeed(currentPage + 1, true);
    }
  }, [hasMore, isLoading, currentPage, loadFeed]);

  // Set filters
  const setFilters = useCallback((newFilters: Partial<SmartFilterOptions>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFiltersState({});
    setSearchQuery('');
  }, []);

  // Effects
  useEffect(() => {
    refreshFeed();
  }, [activeTab, filters, searchQuery]);

  // Initial load
  useEffect(() => {
    refreshFeed();
  }, []);

  return {
    feedCards,
    isLoading,
    error,
    hasMore,
    activeTab,
    tabs,
    setActiveTab,
    filters,
    setFilters,
    clearFilters,
    searchQuery,
    setSearchQuery,
    refreshFeed,
    loadMore,
    handleCardAction,
    handleCardImpression,
    trackInteraction
  };
}
