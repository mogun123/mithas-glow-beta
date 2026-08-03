// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - Beard Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

import { BeardStyle } from './engine.types';

// ═══════════════════════════════════════════════════════════════════════════
// BEARD GROWTH ANALYSIS TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface DensityZone {
  region: 'chin' | 'mustache' | 'left_cheek' | 'right_cheek' | 'sideburns_left' | 'sideburns_right';
  density: number; // 0-1
  patchiness: number; // 0-1
  coverage: number; // 0-1 percentage
}

export interface GrowthMap {
  overallDensity: number;
  overallPatchiness: number;
  zones: DensityZone[];
  growthPattern: 'uniform' | 'patchy' | 'sparse' | 'dense';
  recommendedStyles: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// OCCASION TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type Occasion = 'office' | 'wedding' | 'luxury' | 'casual' | 'traditional' | 'party';

export interface OccasionContext {
  occasion: Occasion;
  culturalPreference?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  indoorOutdoor?: 'indoor' | 'outdoor';
}

// ═══════════════════════════════════════════════════════════════════════════
// RECOMMENDATION TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface RecommendationScore {
  faceCompatibility: number;
  jawEnhancement: number;
  growthFeasibility: number;
  maintenanceDifficulty: number;
  professionalAppearance: number;
  overallScore: number;
}

export interface BeardRecommendation extends BeardStyle {
  score: RecommendationScore;
  rank: number;
  confidence: number;
  reasons: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// BEARD CAROUSEL TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CarouselItem {
  style: BeardStyle;
  thumbnail: string;
  isLoaded: boolean;
  isLoading: boolean;
  preloadPriority: number;
}

export interface CarouselState {
  items: CarouselItem[];
  currentIndex: number;
  direction: 'left' | 'right' | null;
  isTransitioning: boolean;
}
