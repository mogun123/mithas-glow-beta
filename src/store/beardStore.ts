// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - Beard State Store (Zustand)
// ═══════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { BeardStyle } from '../types/engine.types';
import { CarouselState, GrowthMap } from '../types/beard.types';

interface BeardStore {
  // State
  availableStyles: BeardStyle[];
  carousel: CarouselState;
  growthMap: GrowthMap | null;
  currentOccasion: string;
  
  // Actions
  setAvailableStyles: (styles: BeardStyle[]) => void;
  setCarouselIndex: (index: number) => void;
  setCarouselTransition: (direction: 'left' | 'right' | null, isTransitioning: boolean) => void;
  setCarouselItemLoaded: (index: number, isLoaded: boolean) => void;
  setGrowthMap: (growthMap: GrowthMap | null) => void;
  setCurrentOccasion: (occasion: string) => void;
  reset: () => void;
}

const initialCarouselState: CarouselState = {
  items: [],
  currentIndex: 0,
  direction: null,
  isTransitioning: false,
};

export const useBeardStore = create<BeardStore>((set) => ({
  availableStyles: [],
  carousel: initialCarouselState,
  growthMap: null,
  currentOccasion: 'casual',

  setAvailableStyles: (styles) => set({ 
    availableStyles: styles,
    carousel: {
      items: styles.map((style, index) => ({
        style,
        thumbnail: style.model_3d_url,
        isLoaded: false,
        isLoading: false,
        preloadPriority: index === 0 ? 10 : Math.max(0, 10 - index),
      })),
      currentIndex: 0,
      direction: null,
      isTransitioning: false,
    },
  }),

  setCarouselIndex: (index) => set((state) => ({
    carousel: {
      ...state.carousel,
      currentIndex: index,
      direction: index > state.carousel.currentIndex ? 'right' : 'left',
    },
  })),

  setCarouselTransition: (direction, isTransitioning) => set((state) => ({
    carousel: {
      ...state.carousel,
      direction,
      isTransitioning,
    },
  })),

  setCarouselItemLoaded: (index, isLoaded) => set((state) => ({
    carousel: {
      ...state.carousel,
      items: state.carousel.items.map((item, i) =>
        i === index ? { ...item, isLoaded, isLoading: false } : item
      ),
    },
  })),

  setGrowthMap: (growthMap) => set({ growthMap }),
  setCurrentOccasion: (occasion) => set({ currentOccasion: occasion }),

  reset: () => set({
    availableStyles: [],
    carousel: initialCarouselState,
    growthMap: null,
    currentOccasion: 'casual',
  }),
}));
