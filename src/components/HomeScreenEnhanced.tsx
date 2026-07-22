import { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { MapPin, Sparkles, TrendingUp, Users } from 'lucide-react';
import { Header } from './Header';
import { FeedCard } from './FeedCard';
import { BottomNav } from './BottomNav';
import { StoryCircles } from './StoryCircles';
import { FeatureGridInline } from './FeatureGridInline';
import { VideoPlayer } from './VideoPlayer';
import { ErrorBoundary } from './ErrorBoundary';
import { useUserLocation } from '../hooks/useUserLocation';
import { useModal } from '../hooks/useModal';
import { reelService } from '../services/reelService';
import { aiRankingService } from '../services/aiRanking';
import { FeedCard as FeedCardType, ReelItem } from '../types/feed';
import { toast } from 'sonner';

// Enhanced CSS with premium polish
const ENHANCED_GLOBAL_CSS = `
/* ── Premium feed container ── */
.liquid-feed { 
  --card-gap: 16px; /* Reduced from 24px for tighter feed */
}

/* ── Enhanced feed slot with premium interactions ── */
.feed-slot {
  transition: 
    opacity   0.32s cubic-bezier(0.23, 1, 0.32, 1),
    transform  0.32s cubic-bezier(0.23, 1, 0.32, 1),
    filter    0.32s cubic-bezier(0.23, 1, 0.32, 1),
    box-shadow 0.32s cubic-bezier(0.23, 1, 0.32, 1);
  will-change: transform, opacity, box-shadow;
  position: relative;
  -webkit-tap-highlight-color: transparent;
  cursor: pointer;
  border-radius: 20px;
  overflow: hidden;
}

.feed-slot:hover {
  transform: scale(1.02) translateY(-2px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
  z-index: 5;
}

.feed-slot:active { 
  transform: scale(0.97) !important; 
}

/* ── Premium focus hierarchy ── */
.feed-slot.focus-active   { 
  transform: scale(1.03) translateY(-4px); 
  opacity: 1;    
  filter: none;               
  z-index: 10; 
  box-shadow: 0 20px 40px rgba(236, 72, 153, 0.3);
}

.feed-slot.focus-inactive { 
  transform: scale(0.96);  
  opacity: 0.6; 
  filter: brightness(0.85) blur(1px);   
  z-index: 1; 
}

.feed-slot.focus-neutral  { 
  transform: scale(0.99);  
  opacity: 0.85;                              
  z-index: 2; 
}

/* ── Premium reel slot ── */
.reel-feed-slot {
  margin: 0 -16px;
  position: relative;
  z-index: 2;
  height: 100vh; /* Full viewport height */
  max-height: 100vh;
  overflow: hidden;
  border-radius: 0;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  display: flex;
  align-items: stretch;
  -webkit-tap-highlight-color: transparent;
  background: #000;
}

.reel-feed-slot > * { 
  width: 100%; 
  height: 100%; 
  object-fit: cover; 
}

/* ── Premium header with scroll effects ── */
.premium-header {
  background: rgba(255,255,255,0.85) !important;
  backdrop-filter: blur(20px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
  border-bottom: 0.5px solid rgba(0,0,0,0.08) !important;
  transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
}

.premium-header.scrolled {
  background: rgba(255,255,255,0.95) !important;
  backdrop-filter: blur(25px) saturate(200%) !important;
  -webkit-backdrop-filter: blur(25px) saturate(200%) !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1) !important;
}

/* ── Enhanced skeleton with reduced layout shift ── */
@keyframes premium-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton-card {
  background: linear-gradient(90deg, #f8f9fa 0%, #e9ecef 20%, #f8f9fa 40%, #f8f9fa 100%);
  background-size: 200% 100%;
  animation: premium-shimmer 1.8s ease infinite;
  border-radius: 20px;
  min-height: 220px;
  margin-bottom: 16px;
}

/* ── Enhanced GlowOrb with pulse animation ── */
@keyframes orb-pulse {
  0%, 100% { 
    transform: scale(1);
    box-shadow: 0 8px 32px rgba(236, 72, 153, 0.4);
  }
  50% { 
    transform: scale(1.05);
    box-shadow: 0 12px 48px rgba(236, 72, 153, 0.6);
  }
}

.premium-glow-orb {
  animation: orb-pulse 3s ease-in-out infinite;
}

/* ── Location detection loading state ── */
@keyframes location-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.location-loading {
  animation: location-pulse 1.5s ease-in-out infinite;
}

/* ── Premium glass nav ── */
.glass-nav {
  background: rgba(255,255,255,0.88) !important;
  backdrop-filter: blur(25px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(25px) saturate(180%) !important;
  border-top: 0.5px solid rgba(0,0,0,0.08) !important;
}
`;

// Skeleton Card Component
const SkeletonCard = memo(() => <div className="skeleton-card" />);
SkeletonCard.displayName = 'SkeletonCard';

// Enhanced Reel Card Component
const EnhancedReelCard = memo(({ 
  reel, 
  isVisible, 
  onVisibleChange,
  preloadNext 
}: { 
  reel: ReelItem; 
  isVisible: boolean; 
  onVisibleChange: (visible: boolean) => void;
  preloadNext?: () => void;
}) => {
  return (
    <div className="reel-feed-slot">
      <VideoPlayer
        reel={reel}
        isVisible={isVisible}
        onVisibleChange={onVisibleChange}
        preloadNext={preloadNext}
      />
    </div>
  );
});
EnhancedReelCard.displayName = 'EnhancedReelCard';

interface HomeScreenEnhancedProps {
  onNavigateToMirror?: () => void;
  onNavigateToPhotoshoot?: () => void;
  onNavigateToChat?: () => void;
}

export function HomeScreenEnhanced({
  onNavigateToMirror,
  onNavigateToPhotoshoot,
  onNavigateToChat,
}: HomeScreenEnhancedProps) {
  // ─── Location System ──────────────────────────────────────
  const { location, loading: locationLoading, error: locationError } = useUserLocation();
  
  // ─── Modal System ───────────────────────────────────────
  const { openModal } = useModal();
  
  // ─── State Management ───────────────────────────────────
  const [feedCards, setFeedCards] = useState<FeedCardType[]>([]);
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Premium UI state
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  
  // Refs
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const loadingIndicatorRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const reelObserverRef = useRef<IntersectionObserver | null>(null);

  // ─── Enhanced Feed Data Loading ───────────────────────────
  const loadFeedData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load both feed cards and reels in parallel
      const [feedData, reelsData] = await Promise.all([
        // Mock feed data - replace with actual API
        fetch('/api/feed').then(res => res.json()).catch(() => []),
        reelService.getReels(undefined, 10)
      ]);
      
      // Apply AI ranking to feed cards
      const rankedFeed = aiRankingService.rankFeedCards(feedData);
      
      // Update user location for ranking
      if (location) {
        aiRankingService.updateUserLocation(location);
      }
      
      setFeedCards(rankedFeed);
      setReels(reelsData);
      setHasMore(rankedFeed.length > 0);
      
    } catch (err) {
      console.error('Failed to load feed:', err);
      setError('Failed to load feed. Please try again.');
      toast.error('Failed to load feed');
    } finally {
      setIsLoading(false);
    }
  }, [location]);

  // ─── Enhanced Feed with Reels Injection ─────────────────────
  const enrichedFeed = useMemo(() => {
    const result: Array<FeedCardType | { type: 'reel'; reel: ReelItem }> = [];
    let reelIndex = 0;
    
    // Inject reels at positions 2, 5, 8
    for (let i = 0; i < feedCards.length; i++) {
      // Add regular feed card
      result.push(feedCards[i]);
      
      // Inject reel at specific positions
      if ((i === 1 || i === 4 || i === 7) && reelIndex < reels.length) {
        result.push({
          type: 'reel',
          reel: reels[reelIndex]
        });
        reelIndex++;
      }
    }
    
    return result;
  }, [feedCards, reels]);

  // ─── Premium Scroll Effects ───────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setIsHeaderScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ─── Enhanced Intersection Observer for Performance ───────
  useEffect(() => {
    // Single observer instance for all feed cards
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Load more when reaching bottom
            if (entry.target === loadingIndicatorRef.current && hasMore && !isLoading) {
              loadFeedData();
            }
          }
        });
      },
      { 
        root: feedContainerRef.current, 
        rootMargin: '0px 0px 100px 0px', 
        threshold: 0.1 
      }
    );

    // Observe loading indicator
    if (loadingIndicatorRef.current) {
      observerRef.current.observe(loadingIndicatorRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading, loadFeedData]);

  // ─── Reel Intersection Observer ───────────────────────────
  useEffect(() => {
    reelObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const element = entry.target as HTMLElement;
          const index = parseInt(element.dataset.index || '0');
          
          // Preload next reel when current is visible
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            if (index < reels.length - 1) {
              reelService.preloadReel(reels[index + 1].videoUrl);
            }
          }
        });
      },
      { threshold: [0.5] }
    );

    return () => {
      if (reelObserverRef.current) {
        reelObserverRef.current.disconnect();
      }
    };
  }, [reels]);

  // ─── Event Handlers ───────────────────────────────────────
  const handleCardAction = useCallback((action: string, card: FeedCardType) => {
    switch (action) {
      case 'like':
        toast.success('Liked!');
        aiRankingService.recordUserInteraction(card.id, 'like');
        break;
      case 'comment':
        openModal('aiStylist', { card });
        break;
      case 'share':
        toast.success('Shared!');
        aiRankingService.recordUserInteraction(card.id, 'share');
        break;
      case 'view':
        aiRankingService.recordUserInteraction(card.id, 'view');
        break;
      case 'book':
        openModal('booking');
        break;
      case 'cart':
        openModal('cart', { card });
        break;
      default:
        console.log('Unknown action:', action);
    }
  }, [openModal]);

  const handleStoryClick = useCallback((storyId: string) => {
    if (storyId === 'add-story') {
      toast.info('Story feature coming soon!');
    } else {
      setActiveStoryIndex(parseInt(storyId));
    }
  }, []);

  const handleFeatureSelect = useCallback((feature: string) => {
    switch (feature) {
      case 'skin-analysis':
        onNavigateToMirror?.();
        break;
      case 'ai-stylist':
        openModal('aiStylist');
        break;
      case 'voice-search':
        openModal('voice');
        break;
      case 'shop':
        openModal('cart');
        break;
      default:
        console.log('Unknown feature:', feature);
    }
  }, [openModal, onNavigateToMirror]);

  // ─── Initial Load ───────────────────────────────────────
  useEffect(() => {
    loadFeedData();
  }, [loadFeedData]);

  // ─── Inject Enhanced CSS ───────────────────────────────────
  useEffect(() => {
    const id = 'enhanced-infinity-glow-css';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = ENHANCED_GLOBAL_CSS;
      document.head.appendChild(style);
    }
  }, []);

  // ─── Memoized Components ───────────────────────────────────
  const renderFeedItem = useCallback((item: FeedCardType | { type: 'reel'; reel: ReelItem }, index: number) => {
    if ('type' in item && item.type === 'reel') {
      return (
        <EnhancedReelCard
          key={`reel-${index}`}
          reel={item.reel}
          isVisible={true} // This would be managed by intersection observer
          onVisibleChange={(visible) => {
            if (visible) {
              aiRankingService.recordUserInteraction(item.reel.id, 'view');
            }
          }}
          preloadNext={() => {
            if (index < reels.length - 1) {
              reelService.preloadReel(reels[index + 1].videoUrl);
            }
          }}
        />
      );
    }

    return (
      <div key={item.id} className="feed-slot">
        <FeedCard
          card={item}
          onAction={handleCardAction}
          onImpression={(cardId, position) => {
            aiRankingService.recordUserInteraction(cardId, 'view');
          }}
          position={index}
          userId={currentUserId}
        />
      </div>
    );
  }, [handleCardAction, currentUserId, reels]);

  // ─── Loading State ───────────────────────────────────────
  if (isLoading && feedCards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50">
        {/* Header */}
        <div className={`premium-header sticky top-0 z-50 ${isHeaderScrolled ? 'scrolled' : ''}`}>
          <div className="max-w-lg mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                ✨ Mithas Glow
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {locationLoading ? (
                  <div className="flex items-center gap-1 location-loading">
                    <MapPin className="w-4 h-4" />
                    <span>Detecting location...</span>
                  </div>
                ) : locationError ? (
                  <div className="flex items-center gap-1 text-red-500">
                    <MapPin className="w-4 h-4" />
                    <span>Location unavailable</span>
                  </div>
                ) : location ? (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{location.city}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Loading Skeletons */}
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Error State ───────────────────────────────────────
  if (error) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-pink-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Feed Error
            </h2>
            <p className="text-gray-600 mb-6">
              {error}
            </p>
            <button
              onClick={loadFeedData}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // ─── Main Render ───────────────────────────────────────
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50">
        {/* Premium Header */}
        <div className={`premium-header sticky top-0 z-50 ${isHeaderScrolled ? 'scrolled' : ''}`}>
          <div className="max-w-lg mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                ✨ Mithas Glow
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {locationLoading ? (
                  <div className="flex items-center gap-1 location-loading">
                    <MapPin className="w-4 h-4" />
                    <span>Detecting location...</span>
                  </div>
                ) : locationError ? (
                  <div className="flex items-center gap-1 text-red-500">
                    <MapPin className="w-4 h-4" />
                    <span>Location unavailable</span>
                  </div>
                ) : location ? (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{location.city}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Story Circles */}
        <StoryCircles onStoryClick={handleStoryClick} />

        {/* Main Feed Container */}
        <div 
          ref={feedContainerRef}
          className="liquid-feed max-w-lg mx-auto px-4 py-4"
        >
          {/* Feature Grid */}
          <div className="mb-6">
            <FeatureGridInline
              onFeatureSelect={handleFeatureSelect}
              onSkinAnalysis={() => onNavigateToMirror?.()}
              onShop={() => openModal('cart')}
            />
          </div>

          {/* Feed Items */}
          <div className="space-y-4">
            {enrichedFeed.map((item, index) => renderFeedItem(item, index))}
          </div>

          {/* Loading Indicator */}
          {hasMore && (
            <div ref={loadingIndicatorRef} className="py-4">
              <div className="flex justify-center">
                <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <BottomNav 
          currentTab="home"
          onNavigateToMirror={onNavigateToMirror}
          onNavigateToPhotoshoot={onNavigateToPhotoshoot}
          onNavigateToChat={onNavigateToChat}
        />

        {/* Enhanced GlowOrb */}
        <div className="fixed bottom-24 right-6 premium-glow-orb">
          <button
            onClick={() => openModal('aiStylist')}
            className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform"
          >
            <Sparkles className="w-6 h-6" />
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
}
