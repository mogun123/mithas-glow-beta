import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { FeedCard } from './FeedCard';
import { VideoPlayer } from './VideoPlayer';
import { FeedCard as FeedCardType } from '../types/feed';
import { ReelItem } from '../types/reel';
import { aiRankingService } from '../services/aiRanking';
import { reelService } from '../services/reelService';

interface VirtualizedFeedProps {
  items: Array<FeedCardType | { type: 'reel'; reel: ReelItem }>;
  onCardAction: (action: string, card: FeedCardType) => void;
  userId: string | null;
  itemHeight: number;
  windowHeight?: number;
}

const Row = ({ 
  index, 
  style, 
  data 
}: { 
  index: number; 
  style: React.CSSProperties; 
  data: VirtualizedFeedProps['items'] 
}) => {
  const item = data[index];
  
  if (!item) return null;
  
  // Handle reel items
  if ('type' in item && item.type === 'reel') {
    return (
      <div style={style}>
        <div className="reel-feed-slot">
          <VideoPlayer
            reel={item.reel}
            isVisible={true} // This would be managed by intersection observer in production
            onVisibleChange={(visible) => {
              if (visible) {
                aiRankingService.recordUserInteraction(item.reel.id, 'view');
              }
            }}
            preloadNext={() => {
              // Preload next reel
              const nextItem = data[index + 1];
              if (nextItem && 'type' in nextItem && nextItem.type === 'reel') {
                reelService.preloadReel(nextItem.reel.videoUrl);
              }
            }}
          />
        </div>
      </div>
    );
  }
  
  // Handle regular feed cards
  return (
    <div style={style}>
      <div className="feed-slot">
        <FeedCard
          card={item}
          onAction={(action, card) => {
            // Record interaction for AI ranking
            aiRankingService.recordUserInteraction(card.id, action as any);
            data[0]?.onCardAction?.(action, card);
          }}
          onImpression={(cardId, position) => {
            aiRankingService.recordUserInteraction(cardId, 'view');
          }}
          position={index}
          userId={data.userId}
        />
      </div>
    </div>
  );
};

export const VirtualizedFeed: React.FC<VirtualizedFeedProps> = ({
  items,
  onCardAction,
  userId,
  itemHeight = 400,
  windowHeight = window.innerHeight,
}) => {
  const listRef = useRef<List>(null);
  const [containerHeight, setContainerHeight] = useState(windowHeight);

  // Update container height on window resize
  useEffect(() => {
    const handleResize = () => {
      setContainerHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Memoize item data to prevent unnecessary re-renders
  const itemData = useMemo(() => items, [items]);

  // Handle scroll events for analytics
  const handleScroll = useCallback(({ scrollOffset, scrollDirection }: { scrollOffset: number; scrollDirection: 'forward' | 'backward' }) => {
    // Track scroll depth for analytics
    const scrollDepth = Math.round(scrollOffset / itemHeight);
    
    // Record impression for items that come into view
    const visibleStartIndex = Math.floor(scrollOffset / itemHeight);
    const visibleEndIndex = Math.min(
      Math.ceil((scrollOffset + containerHeight) / itemHeight),
      items.length - 1
    );

    // Record impressions for newly visible items
    for (let i = visibleStartIndex; i <= visibleEndIndex; i++) {
      const item = items[i];
      if (item && !('type' in item)) {
        aiRankingService.recordUserInteraction(item.id, 'view');
      }
    }
  }, [items, itemHeight, containerHeight]);

  // Get item key for React Window
  const getItemKey = useCallback((index: number, data: VirtualizedFeedProps['items']) => {
    const item = data[index];
    if (!item) return `empty-${index}`;
    
    if ('type' in item && item.type === 'reel') {
      return `reel-${item.reel.id}`;
    }
    
    return `card-${item.id}`;
  }, []);

  return (
    <div className="virtualized-feed-container">
      <List
        ref={listRef}
        height={containerHeight}
        itemCount={items.length}
        itemSize={itemHeight}
        itemData={itemData}
        itemKey={getItemKey}
        onScroll={handleScroll}
        overscanCount={3} // Render 3 extra items above/below for smooth scrolling
      >
        {Row}
      </List>
      
      <style jsx>{`
        .virtualized-feed-container {
          height: 100vh;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        
        .virtualized-feed-container::-webkit-scrollbar {
          width: 0px;
          background: transparent;
        }
        
        .virtualized-feed-container {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
      `}</style>
    </div>
  );
};
