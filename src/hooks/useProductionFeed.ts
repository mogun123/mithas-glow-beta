/**
 * Production Smart Feed Hook
 * Integrates with FastAPI + pgVector + PostGIS + Meilisearch + Redis
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { productionFeedAPI } from '../lib/api/production-feed-api';
import { SmartFeedCard, SmartFilterOptions, SmartTabType } from '../types/feed.types';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface UseProductionFeedOptions {
  userId: string;
  location?: {
    lat: number;
    lng: number;
    city: string;
  };
  initialTab?: string;
  pageSize?: number;
  onNavigateToMirror?: () => void;
  onNavigateToShop?: () => void;
}

interface UseProductionFeedReturn {
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

export function useProductionFeed({
  userId,
  location = { lat: 19.0760, lng: 72.8777, city: 'Mumbai' }, // Default to Mumbai
  initialTab = 'for_you',
  pageSize = 10,
  onNavigateToMirror,
  onNavigateToShop
}: UseProductionFeedOptions): UseProductionFeedReturn {
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

  // Get time-based context
  const getTimeContext = useCallback(() => {
    const now = new Date();
    return {
      hour: now.getHours(),
      dayOfWeek: now.getDay(),
      isWeekend: now.getDay() === 0 || now.getDay() === 6
    };
  }, []);

  // Load personalized feed from FastAPI
  const loadPersonalizedFeed = useCallback(async (page: number = 0, append: boolean = false) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const timeContext = getTimeContext();
      
      const request = {
        userId,
        location,
        timeContext,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        limit: pageSize,
        offset: page * pageSize
      };

      const response = await productionFeedAPI.fetchPersonalizedFeed(request);
      
      // Inject trending reels every 4th item (1:3 ratio)
      const enhancedFeed = await injectTrendingReels(response.items, page * pageSize);
      
      // Apply search if needed
      const filteredFeed = searchQuery.trim() 
        ? applySearchToFeed(enhancedFeed, searchQuery)
        : enhancedFeed;

      // Update state
      if (append) {
        setFeedCards(prev => [...prev, ...filteredFeed]);
      } else {
        setFeedCards(filteredFeed);
      }

      setHasMore(response.hasMore);
      setCurrentPage(page);

    } catch (error) {
      console.error('Error loading production feed:', error);
      setError(error instanceof Error ? error.message : 'Failed to load feed');
      
      // Fallback to mock data
      if (!append) {
        setFeedCards(getMockFeedData());
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, userId, location, filters, searchQuery, pageSize, getTimeContext]);

  // Load nearby content using PostGIS
  const loadNearbyContent = useCallback(async (page: number = 0, append: boolean = false) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const request = {
        userId,
        location,
        radiusKm: filters.distance || 25,
        limit: pageSize,
        offset: page * pageSize
      };

      const response = await productionFeedAPI.fetchNearbyContent(request);
      
      // Apply search if needed
      const filteredFeed = searchQuery.trim() 
        ? applySearchToFeed(response.items, searchQuery)
        : response.items;

      // Update state
      if (append) {
        setFeedCards(prev => [...prev, ...filteredFeed]);
      } else {
        setFeedCards(filteredFeed);
      }

      setHasMore(response.hasMore);
      setCurrentPage(page);

    } catch (error) {
      console.error('Error loading nearby content:', error);
      setError(error instanceof Error ? error.message : 'Failed to load nearby content');
      
      // Fallback to mock data
      if (!append) {
        setFeedCards(getMockFeedData());
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, userId, location, filters.distance, searchQuery, pageSize]);

  // Inject trending reels from Cloudflare Stream
  const injectTrendingReels = useCallback(async (feed: SmartFeedCard[], offset: number): Promise<SmartFeedCard[]> => {
    try {
      // Get trending reels (every 4th position)
      const reelPositions: number[] = [];
      for (let i = 0; i < feed.length; i++) {
        if ((offset + i) % 4 === 3) { // Every 4th item (0-indexed)
          reelPositions.push(i);
        }
      }

      if (reelPositions.length === 0) return feed;

      // Fetch trending reels
      const reelsResponse = await productionFeedAPI.fetchPersonalizedFeed({
        userId,
        location,
        timeContext: getTimeContext(),
        filters: { category: 'reel' },
        limit: reelPositions.length,
        offset: 0
      });

      // Inject reels at calculated positions
      const enhancedFeed = [...feed];
      let reelIndex = 0;
      
      for (const position of reelPositions) {
        if (reelIndex < reelsResponse.items.length) {
          const reel = reelsResponse.items[reelIndex];
          
          // Get video manifest from Cloudflare Stream
          if (reel.videoUrl) {
            try {
              reel.videoUrl = await productionFeedAPI.getVideoManifest(reel.id);
            } catch (error) {
              console.error('Error fetching video manifest:', error);
            }
          }
          
          enhancedFeed.splice(position, 0, reel);
          reelIndex++;
        }
      }

      return enhancedFeed;
    } catch (error) {
      console.error('Error injecting trending reels:', error);
      return feed; // Return original feed if injection fails
    }
  }, [userId, location, getTimeContext]);

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
      }
    ];
  };

  // Handle card actions with real-time tracking
  const handleCardAction = useCallback((action: string, cardId: string, cardType: string) => {
    // Track interaction in Redis
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
        if (onNavigateToMirror) {
          onNavigateToMirror();
        }
        break;
      case 'buy':
        toast.success('🛒 Opening shop...');
        if (onNavigateToShop) {
          onNavigateToShop();
        }
        break;
      case 'share':
        toast.success('📤 Share link copied!');
        break;
      default:
        console.log('Action:', action, 'Card:', cardId);
    }
  }, [onNavigateToMirror, onNavigateToShop]);

  // Handle card impressions
  const handleCardImpression = useCallback((cardId: string, position: number) => {
    // Track impression only once per card per session
    if (!impressionTracker.current.has(cardId)) {
      impressionTracker.current.set(cardId, Date.now());
      
      // Track in background
      productionFeedAPI.trackInteraction({
        userId,
        itemId: cardId,
        itemType: 'feed_card',
        interactionType: 'impression',
        context: {
          position,
          sessionId: sessionStartTime.current.toString(),
          feedType: activeTab
        }
      }).catch(error => {
        console.error('Error tracking impression:', error);
      });
    }
  }, [userId, activeTab]);

  // Track interactions for real-time updates
  const trackInteraction = useCallback((cardId: string, cardType: string, interactionType: string) => {
    productionFeedAPI.trackInteraction({
      userId,
      itemId: cardId,
      itemType: cardType,
      interactionType,
      context: {
        feedPosition: feedCards.findIndex(card => card.id === cardId),
        sessionId: sessionStartTime.current.toString(),
        timeContext: getTimeContext()
      }
    }).catch(error => {
      console.error('Error tracking interaction:', error);
    });
  }, [userId, feedCards, getTimeContext]);

  // Load feed based on active tab
  const loadFeed = useCallback(async (page: number = 0, append: boolean = false) => {
    switch (activeTab) {
      case 'for_you':
        await loadPersonalizedFeed(page, append);
        break;
      case 'nearby':
        await loadNearbyContent(page, append);
        break;
      case 'following':
        // TODO: Implement following content
        await loadPersonalizedFeed(page, append);
        break;
      case 'events':
        // TODO: Implement event-based content
        await loadPersonalizedFeed(page, append);
        break;
      default:
        await loadPersonalizedFeed(page, append);
    }
  }, [activeTab, loadPersonalizedFeed, loadNearbyContent]);

  // Refresh feed
  const refreshFeed = useCallback(async () => {
    impressionTracker.current.clear();
    await loadFeed();
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
