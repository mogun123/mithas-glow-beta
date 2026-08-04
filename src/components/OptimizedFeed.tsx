import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { FeedCard } from './FeedCard';
import { VideoPlayer } from './VideoPlayer';
import { FeedCard as FeedCardType } from '../types/feed';
import { ReelItem } from '../types/reel';
import { aiRankingService } from '../services/aiRanking';
import { reelService } from '../services/reelService';

interface OptimizedFeedProps {
  items: Array<FeedCardType | { type: 'reel'; reel: ReelItem }>;
  onCardAction: (action: string, card: FeedCardType) => void;
  userId: string | null;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
}

// Memoized Reel Card Component
const MemoizedReelCard = memo(({ 
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
  const reelRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!reelRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting && entry.intersectionRatio > 0.5;
        onVisibleChange(isVisible);
        
        // Preload next reel when current is visible
        if (isVisible && preloadNext) {
          preloadNext();
        }
      },
      { threshold: [0.5] }
    );
    
    observer.observe(reelRef.current);
    
    return () => observer.disconnect();
  }, [onVisibleChange, preloadNext]);
  
  return (
    <div ref={reelRef} className="reel-feed-slot">
      <VideoPlayer
        reel={reel}
        isVisible={isVisible}
        onVisibleChange={onVisibleChange}
      />
    </div>
  );
});
MemoizedReelCard.displayName = 'MemoizedReelCard';

// Memoized Feed Card Component
const MemoizedFeedCard = memo(({ 
  card, 
  onAction, 
  onImpression, 
  position, 
  userId 
}: {
  card: FeedCardType;
  onAction: (action: string, card: FeedCardType) => void;
  onImpression: (cardId: string, position: number) => void;
  position: number;
  userId: string | null;
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!cardRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          onImpression(card.id, position);
        }
      },
      { threshold: [0.5] }
    );
    
    observer.observe(cardRef.current);
    
    return () => observer.disconnect();
  }, [card.id, onImpression, position]);
  
  return (
    <div ref={cardRef} className="feed-slot">
      <FeedCard
        card={card}
        onAction={onAction}
        onImpression={onImpression}
        position={position}
        userId={userId}
      />
    </div>
  );
});
MemoizedFeedCard.displayName = 'MemoizedFeedCard';

export const OptimizedFeed: React.FC<OptimizedFeedProps> = ({
  items,
  onCardAction,
  userId,
  hasMore,
  isLoading,
  onLoadMore,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  // Single IntersectionObserver for all items
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Load more when loading indicator is visible
            if (entry.target === loadingRef.current && hasMore && !isLoading) {
              onLoadMore();
            }
          }
        });
      },
      { 
        root: containerRef.current, 
        rootMargin: '0px 0px 100px 0px', 
        threshold: 0.1 
      }
    );

    // Observe loading indicator
    if (loadingRef.current) {
      observerRef.current.observe(loadingRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading, onLoadMore]);

  // Memoize items to prevent unnecessary re-renders
  const memoizedItems = useMemo(() => items, [items]);

  // Handle card actions with AI ranking
  const handleCardAction = useCallback((action: string, card: FeedCardType) => {
    // Record interaction for AI ranking
    aiRankingService.recordUserInteraction(card.id, action as any);
    onCardAction(action, card);
  }, [onCardAction]);

  // Handle impressions for AI ranking
  const handleImpression = useCallback((cardId: string, position: number) => {
    aiRankingService.recordUserInteraction(cardId, 'view');
  }, []);

  // Handle reel visibility changes
  const handleReelVisible = useCallback((reelId: string, visible: boolean) => {
    if (visible) {
      aiRankingService.recordUserInteraction(reelId, 'view');
    }
  }, []);

  // Preload next reel
  const preloadNextReel = useCallback((currentIndex: number) => {
    const nextItem = memoizedItems[currentIndex + 1];
    if (nextItem && 'type' in nextItem && nextItem.type === 'reel') {
      reelService.preloadReel(nextItem.reel.videoUrl);
    }
  }, [memoizedItems]);

  // Render individual items
  const renderItem = useCallback((item: FeedCardType | { type: 'reel'; reel: ReelItem }, index: number) => {
    // Handle reel items
    if ('type' in item && item.type === 'reel') {
      return (
        <MemoizedReelCard
          key={`reel-${item.reel.id}`}
          reel={item.reel}
          isVisible={true} // This would be managed by intersection observer
          onVisibleChange={(visible) => handleReelVisible(item.reel.id, visible)}
          preloadNext={() => preloadNextReel(index)}
        />
      );
    }

    // Handle regular feed cards
    return (
      <MemoizedFeedCard
        key={item.id}
        card={item}
        onAction={handleCardAction}
        onImpression={handleImpression}
        position={index}
        userId={userId}
      />
    );
  }, [handleCardAction, handleImpression, handleReelVisible, preloadNextReel, userId]);

  return (
    <div className="optimized-feed-container">
      <div 
        ref={containerRef}
        className="feed-container space-y-4"
      >
        {memoizedItems.map((item, index) => renderItem(item, index))}
      </div>
      
      {/* Loading Indicator */}
      {hasMore && (
        <div ref={loadingRef} className="py-4">
          <div className="flex justify-center">
            <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .optimized-feed-container {
          height: 100vh;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        
        .feed-container {
          max-width: 100%;
          padding: 0 16px;
        }
        
        .optimized-feed-container::-webkit-scrollbar {
          width: 0px;
          background: transparent;
        }
        
        .optimized-feed-container {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
      `}</style>
    </div>
  );
};
