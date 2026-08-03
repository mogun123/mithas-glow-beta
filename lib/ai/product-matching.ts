// ZERO-TRUST AI: Products matched using deterministic math only
// No ML, no embeddings, no similarity search

import { classifySkinTone } from './skin-analysis';

// Product match scoring using exact formula from MITHAS_PROPRIETARY_AI_ENGINE.txt
export function calculateBeautyMatchScore(
  userProfile: {
    skin_tone: string;
    undertone: 'warm' | 'cool' | 'neutral';
    face_shape: 'oval' | 'round' | 'heart' | 'square';
    melanin_index: number;
    lab_values: number[];
  },
  product: {
    id: string;
    color: number[]; // RGB values
    undertone: 'warm' | 'cool' | 'neutral';
    face_scores: {
      oval: number;
      round: number;
      heart: number;
      square: number;
    };
    coverage: 'light' | 'medium' | 'full';
    finish: 'matte' | 'dewy' | 'glossy' | 'shimmer';
    price: number;
    trending: boolean;
    category: string;
  },
  userHistory: {
    avg_spend: number;
    past_purchases: string[];
    interaction_weights: {[product_id: string]: number};
  },
  context: {
    time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
    occasion: 'work' | 'party' | 'casual' | 'date' | 'wedding';
    lighting: 'bright' | 'dim' | 'natural' | 'artificial';
  }
): {
  match_score: number; // 0-100
  component_scores: {
    face_shape_match: number; // 0-1
    skin_tone_match: number; // 0-1
    undertone_match: number; // 0-1
    user_history_match: number; // 0-1
    trend_relevance: number; // 0-1
    price_preference: number; // 0-1
  };
  match_reasons: string[];
  weighted_breakdown: {
    face_shape_weighted: number; // 15% weight
    skin_tone_weighted: number; // 25% weight
    undertone_weighted: number; // 20% weight
    history_weighted: number; // 20% weight
    trend_weighted: number; // 10% weight
    price_weighted: number; // 10% weight
  };
} {
  // 1. FACE SHAPE MATCH (15% weight) - Exact formula from reports
  const faceShapeScore = product.face_scores[userProfile.face_shape] || 0.5;
  const faceShapeWeighted = faceShapeScore * 0.15;
  
  // 2. SKIN TONE MATCH (25% weight) - LAB color space calculation
  const skinToneMatch = calculateSkinToneMatch(product.color, userProfile.skin_tone);
  const skinToneWeighted = skinToneMatch * 0.25;
  
  // 3. UNDERTONE MATCH (20% weight) - Compatibility matrix from reports
  const undertoneMatch = calculateUndertoneMatch(product.undertone, userProfile.undertone);
  const undertoneWeighted = undertoneMatch * 0.20;
  
  // 4. USER HISTORY MATCH (20% weight) - Interaction weights
  const historyMatch = calculateHistoryMatch(product.id, userHistory);
  const historyWeighted = historyMatch * 0.20;
  
  // 5. TREND RELEVANCE (10% weight) - Contextual trending
  const trendRelevance = calculateTrendRelevance(product, context);
  const trendWeighted = trendRelevance * 0.10;
  
  // 6. PRICE PREFERENCE (10% weight) - User spending patterns
  const pricePreference = calculatePricePreference(product.price, userHistory.avg_spend);
  const priceWeighted = pricePreference * 0.10;
  
  // TOTAL MATCH SCORE - Exact weighted formula from reports
  const totalScore = (
    faceShapeWeighted +
    skinToneWeighted +
    undertoneWeighted +
    historyWeighted +
    trendWeighted +
    priceWeighted
  ) * 100; // Convert to 0-100 scale
  
  // GENERATE MATCH REASONS - Rule-based explainability
  const matchReasons = generateMatchReasons({
    faceShapeScore,
    skinToneMatch,
    undertoneMatch,
    historyMatch,
    trendRelevance,
    pricePreference
  });
  
  return {
    match_score: Math.round(totalScore),
    component_scores: {
      face_shape_match: faceShapeScore,
      skin_tone_match: skinToneMatch,
      undertone_match: undertoneMatch,
      user_history_match: historyMatch,
      trend_relevance: trendRelevance,
      price_preference: pricePreference
    },
    match_reasons: matchReasons,
    weighted_breakdown: {
      face_shape_weighted: Math.round(faceShapeWeighted * 100),
      skin_tone_weighted: Math.round(skinToneWeighted * 100),
      undertone_weighted: Math.round(undertoneWeighted * 100),
      history_weighted: Math.round(historyWeighted * 100),
      trend_weighted: Math.round(trendWeighted * 100),
      price_weighted: Math.round(priceWeighted * 100)
    }
  };
}

// Skin tone match using LAB color space from MITHAS_PROPRIETARY_AI_ENGINE.txt
function calculateSkinToneMatch(productRGB: number[], userSkinTone: string): number {
  // Convert product RGB to LAB for device-independent comparison
  const productLAB = rgbToLab(productRGB);
  const userLAB = getLabForSkinTone(userSkinTone);
  
  // Calculate CIELAB Delta E color difference formula
  const deltaE = Math.sqrt(
    Math.pow(productLAB[0] - userLAB[0], 2) + // L* difference
    Math.pow(productLAB[1] - userLAB[1], 2) + // a* difference
    Math.pow(productLAB[2] - userLAB[2], 2)    // b* difference
  );
  
  // Convert to 0-1 scale (lower delta = better match)
  const matchScore = Math.max(0, 1 - (deltaE / 100));
  
  return matchScore;
}

// Undertone compatibility using exact matrix from reports
function calculateUndertoneMatch(productUndertone: 'warm' | 'cool' | 'neutral', userUndertone: 'warm' | 'cool' | 'neutral'): number {
  const compatibilityMatrix: {[key: string]: number} = {
    'warm_warm': 1.0, 'warm_cool': 0.3, 'warm_neutral': 0.7,
    'cool_warm': 0.2, 'cool_cool': 1.0, 'cool_neutral': 0.6,
    'neutral_warm': 0.8, 'neutral_cool': 0.8, 'neutral_neutral': 1.0
  };
  
  const key = `${userUndertone}_${productUndertone}`;
  return compatibilityMatrix[key] || 0.5;
}

// User history match using interaction weights
function calculateHistoryMatch(productId: string, userHistory: any): number {
  const productInteractions = userHistory.interaction_weights[productId] || 0;
  const hasPurchased = userHistory.past_purchases.includes(productId);
  
  // Calculate engagement strength using weights from reports
  const engagementScore = productInteractions;
  const purchaseBonus = hasPurchased ? 0.5 : 0;
  
  // Normalize to 0-1 scale
  const totalScore = Math.min(1, engagementScore + purchaseBonus);
  
  return totalScore;
}

// Trend relevance based on context flags
function calculateTrendRelevance(product: any, context: any): number {
  let trendScore = 0;
  
  // Base trending score
  if (product.trending) {
    trendScore += 0.5;
  }
  
  // Contextual relevance
  if (context.occasion === 'party' && product.category.includes('party')) {
    trendScore += 0.3;
  }
  if (context.occasion === 'work' && product.category.includes('office')) {
    trendScore += 0.3;
  }
  if (context.time_of_day === 'evening' && product.finish === 'shimmer') {
    trendScore += 0.2;
  }
  
  return Math.min(1, trendScore);
}

// Price preference using user spending patterns
function calculatePricePreference(productPrice: number, userAvgSpend: number): number {
  // Ideal range: user average ± 30% (from reports)
  const minPreferred = userAvgSpend * 0.7;
  const maxPreferred = userAvgSpend * 1.3;
  
  if (productPrice < minPreferred) return 0.5; // Too cheap = suspicious
  if (productPrice > maxPreferred) return 0.2; // Too expensive = unlikely
  
  // Sweet spot gets highest score - parabolic curve from reports
  const priceRange = maxPreferred - minPreferred;
  const pricePosition = (productPrice - minPreferred) / priceRange;
  const priceScore = 1 - Math.pow(2 * pricePosition - 1, 2);
  
  return Math.max(0, priceScore);
}

// Generate explainable match reasons using rule triggers
function generateMatchReasons(scores: {
  faceShapeScore: number;
  skinToneMatch: number;
  undertoneMatch: number;
  historyMatch: number;
  trendRelevance: number;
  pricePreference: number;
}): string[] {
  const reasons = [];
  
  // Rule-based reason generation from reports
  if (scores.faceShapeScore > 0.8) reasons.push("excellent_face_shape");
  if (scores.skinToneMatch > 0.85) reasons.push("perfect_skin_tone");
  if (scores.undertoneMatch > 0.8) reasons.push("great_undertone");
  if (scores.historyMatch > 0.7) reasons.push("you_love_this_brand");
  if (scores.trendRelevance > 0.6) reasons.push("trending_now");
  if (scores.pricePreference > 0.8) reasons.push("great_value");
  
  // Negative reasons for explainability
  if (scores.faceShapeScore < 0.5) reasons.push("face_shape_mismatch");
  if (scores.skinToneMatch < 0.6) reasons.push("skin_tone_off");
  if (scores.pricePreference < 0.4) reasons.push("price_out_of_range");
  
  return reasons;
}

// Helper functions (deterministic mathematics only)

function rgbToLab(rgb: number[]): number[] {
  // Convert RGB to XYZ
  let [r, g, b] = rgb.map(val => val / 255);
  
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
  
  r *= 100;
  g *= 100;
  b *= 100;
  
  const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = r * 0.0193 + g * 0.1192 + b * 0.9505;
  
  // Convert XYZ to LAB
  const x_n = x / 95.047;
  const y_n = y / 100.000;
  const z_n = z / 108.883;
  
  const fx = x_n > 0.008856 ? Math.pow(x_n, 1/3) : (7.787 * x_n + 16/116);
  const fy = y_n > 0.008856 ? Math.pow(y_n, 1/3) : (7.787 * y_n + 16/116);
  const fz = z_n > 0.008856 ? Math.pow(z_n, 1/3) : (7.787 * z_n + 16/116);
  
  const L_star = 116 * fy - 16;
  const a_star = 500 * (fx - fy);
  const b_star = 200 * (fy - fz);
  
  return [L_star, a_star, b_star];
}

function getLabForSkinTone(skinTone: string): number[] {
  // LAB values for different skin tones (from reports)
  const toneLabMap: {[key: string]: number[]} = {
    'very_fair': [85, 5, 15],
    'fair': [75, 8, 18],
    'light': [65, 12, 22],
    'medium': [55, 15, 25],
    'olive': [50, 18, 28],
    'tan': [45, 20, 30],
    'dark': [35, 25, 35],
    'deep': [25, 30, 40]
  };
  
  return toneLabMap[skinTone] || [55, 15, 25]; // Default to medium
}
