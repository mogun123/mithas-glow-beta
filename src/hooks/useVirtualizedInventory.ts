/**
 * Virtualized Inventory Hook for Performance
 * Handles large inventories efficiently with lazy loading
 * Provides optimistic UI updates and retry queue functionality
 */

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';

interface VirtualizedItem {
  id: string;
  index: number;
  visible: boolean;
  item: any;
}

interface RetryItem {
  id: string;
  action: () => Promise<void>;
  retryCount: number;
  lastAttempt: number;
}

export function useVirtualizedInventory(
  items: any[],
  itemHeight: number = 80,
  containerHeight: number = 400,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);
  const [retryQueue, setRetryQueue] = useState<RetryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Virtualized items
  const virtualizedItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      id: item.id,
      index: startIndex + index,
      visible: true,
      item
    }));
  }, [items, visibleRange]);

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
  }, []);

  // Optimistic update function
  const optimisticUpdate = useCallback((
    id: string,
    updateFn: (item: any) => any
  ) => {
    // Update local state immediately
    const updatedItems = items.map(item =>
      item.id === id ? updateFn(item) : item
    );
    
    // Add to retry queue for server sync
    const retryItem: RetryItem = {
      id,
      action: async () => {
        try {
          // Server update logic here
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error('Optimistic update failed:', error);
          throw error;
        }
      },
      retryCount: 0,
      lastAttempt: Date.now()
    };
    
    setRetryQueue(prev => [...prev, retryItem]);
    setLoadingItems(prev => new Set(prev).add(id));
    
    return updatedItems;
  }, [items]);

  // Process retry queue
  useEffect(() => {
    const processRetries = async () => {
      if (retryQueue.length === 0) return;
      
      const now = Date.now();
      const itemsToRetry = retryQueue.filter(
        item => now - item.lastAttempt > 5000 // Retry after 5 seconds
      );
      
      if (itemsToRetry.length === 0) return;
      
      setRetryQueue(prev => 
        prev.filter(item => !itemsToRetry.includes(item))
      );
      
      for (const retryItem of itemsToRetry) {
        try {
          setLoadingItems(prev => new Set(prev).add(retryItem.id));
          await retryItem.action();
          setLoadingItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(retryItem.id);
            return newSet;
          });
        } catch (error) {
          console.error('Retry failed for item:', retryItem.id, error);
          
          // Update retry count
          setRetryQueue(prev => 
            prev.map(item => 
              item.id === retryItem.id 
                ? { ...item, retryCount: item.retryCount + 1, lastAttempt: now }
                : item
            )
          );
        }
      }
    };
    
    const interval = setInterval(processRetries, 1000);
    return () => clearInterval(interval);
  }, [retryQueue]);

  // Skeleton loader component data
  const skeletonItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    const skeletonCount = Math.min(10, endIndex - startIndex + 1);
    
    return Array.from({ length: skeletonCount }, (_, index) => ({
      id: `skeleton-${startIndex + index}`,
      index: startIndex + index,
      visible: true,
      item: null // Skeleton item
    }));
  }, [visibleRange]);

  // Memoized total height
  const totalHeight = useMemo(() => items.length * itemHeight, [items.length, itemHeight]);

  return {
    virtualizedItems,
    skeletonItems,
    totalHeight,
    visibleRange,
    optimisticUpdate,
    loadingItems,
    retryQueue,
    containerRef,
    handleScroll,
    scrollTop,
    setScrollTop
  };
}

export function useLazyImageLoading() {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());

  const loadImage = useCallback((src: string, id: string) => {
    if (loadedImages.has(id) || loadingImages.has(id)) {
      return Promise.resolve();
    }

    setLoadingImages(prev => new Set(prev).add(id));
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        setLoadedImages(prev => new Set(prev).add(id));
        setLoadingImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        resolve();
      };
      
      img.onerror = () => {
        setLoadingImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        reject(new Error(`Failed to load image: ${src}`));
      };
      
      img.src = src;
    });
  }, [loadedImages, loadingImages]);

  return {
    loadedImages,
    loadingImages,
    loadImage
  };
}
