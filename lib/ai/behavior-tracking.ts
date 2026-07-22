// ZERO-TRUST AI: Passive data collection only
// No learning, no prediction, no personalization
// Data collected for future ML training only

// Event logging schema from MITHAS_PROPRIETARY_AI_ENGINE.txt
export interface BehaviorEvent {
  event_id: string;
  user_id: string;
  timestamp: string;
  session_id: string;
  event_type: 'view' | 'click' | 'try_on' | 'add_to_cart' | 'purchase' | 'like' | 'save' | 'share' | 'search' | 'filter_apply';
  entity_type: 'product' | 'look' | 'vendor' | 'category' | 'search_query';
  entity_id: string;
  context: {
    screen: 'home' | 'mirror' | 'shop' | 'reels' | 'chat' | 'photoshoot' | 'profile';
    occasion: 'work' | 'party' | 'casual' | 'date' | 'wedding';
    lighting: 'bright' | 'dim' | 'natural' | 'artificial';
    time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
    location: 'home' | 'office' | 'store' | 'outdoor';
  };
  metadata: {
    duration_ms: number;
    scroll_depth: number;
    price_range: 'budget' | 'mid_range' | 'premium';
    category_path: string[];
    filter_values: string[];
    ar_session_length: number;
    items_viewed_in_session: number;
    confidence_score?: number;
    match_score?: number;
  };
  device_info: {
    platform: 'ios' | 'android' | 'web';
    app_version: string;
    screen_size: [number, number];
  };
}

// Weight accumulation matrix from MITHAS_PROPRIETARY_AI_ENGINE.txt
export const WEIGHT_MATRIX = {
  // High-value actions (indicating strong interest)
  'purchase': { base: 10, decay_days: 365 },
  'try_on': { base: 8, decay_days: 90 },
  'add_to_cart': { base: 5, decay_days: 30 },
  'save': { base: 3, decay_days: 60 },
  'share': { base: 4, decay_days: 45 },
  
  // Medium-value actions (consideration phase)
  'view': { base: 1, decay_days: 7 },
  'filter_apply': { base: 2, decay_days: 14 },
  'search': { base: 2, decay_days: 14 },
  
  // Low-value actions (passive engagement)
  'like': { base: 1.5, decay_days: 21 },
  'click': { base: 0.5, decay_days: 3 }
};

// Event logging function - passive data collection only
export function logBehaviorEvent(
  eventType: BehaviorEvent['event_type'],
  entityType: BehaviorEvent['entity_type'],
  entityId: string,
  context: Partial<BehaviorEvent['context']> = {},
  metadata: Partial<BehaviorEvent['metadata']> = {},
  userId: string,
  sessionId: string
): BehaviorEvent {
  const event: BehaviorEvent = {
    event_id: generateEventId(),
    user_id: userId,
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    event_type: eventType,
    entity_type: entityType,
    entity_id: entityId,
    context: {
      screen: 'home', // Default
      occasion: 'casual',
      lighting: 'natural',
      time_of_day: getCurrentTimeOfDay(),
      location: 'home',
      ...context
    },
    metadata: {
      duration_ms: 0,
      scroll_depth: 0,
      price_range: 'mid_range',
      category_path: [],
      filter_values: [],
      ar_session_length: 0,
      items_viewed_in_session: 0,
      ...metadata
    },
    device_info: {
      platform: getPlatform(),
      app_version: '2.1.0',
      screen_size: getScreenSize()
    }
  };
  
  return event;
}

// Weight decay calculation from reports
export function calculateDecayedWeight(
  event: BehaviorEvent,
  currentTime: Date = new Date()
): number {
  const weightConfig = WEIGHT_MATRIX[event.event_type];
  if (!weightConfig) return 0;
  
  const daysSinceEvent = (currentTime.getTime() - new Date(event.timestamp).getTime()) / (1000 * 60 * 60 * 24);
  const decayFactor = Math.max(0, 1 - (daysSinceEvent / weightConfig.decay_days));
  
  return weightConfig.base * decayFactor;
}

// Accumulated user profile - numeric data only
export interface AccumulatedUserProfile {
  user_id: string;
  created_at: string;
  last_active: string;
  total_sessions: number;
  total_interactions: number;
  
  // Preference weights (accumulated from events)
  preference_weights: {
    categories: {[category: string]: number};
    attributes: {[attribute: string]: number};
    price_sensitivity: {
      budget: number;
      mid_range: number;
      premium: number;
    };
    brands: {[brand: string]: number};
  };
  
  // Behavioral patterns (aggregated statistics)
  behavioral_patterns: {
    session_duration_avg: number;    // minutes
    products_per_session: number;
    cart_to_purchase_rate: number;
    ar_try_on_frequency: number;
    search_to_view_rate: number;
    peak_activity_hours: number[];
    preferred_screens: string[];
  };
  
  // Seasonal trends (time-based aggregation)
  seasonal_trends: {
    [season: string]: {
      top_categories: string[];
      color_preferences: string[];
      occasion_preference: string;
    };
  };
  
  // Data quality metrics
  data_quality: {
    total_events: number;
    unique_entities: number;
    recency_score: number;
    consistency_score: number;
  };
}

// Accumulate user profile from events (passive aggregation)
export function accumulateUserProfile(
  userId: string,
  events: BehaviorEvent[]
): AccumulatedUserProfile {
  const userEvents = events.filter(event => event.user_id === userId);
  
  if (userEvents.length === 0) {
    return createEmptyProfile(userId);
  }
  
  // Basic stats
  const totalSessions = new Set(userEvents.map(e => e.session_id)).size;
  const totalInteractions = userEvents.length;
  const lastActive = userEvents[userEvents.length - 1].timestamp;
  
  // Accumulate preference weights
  const preferenceWeights = accumulatePreferenceWeights(userEvents);
  
  // Calculate behavioral patterns
  const behavioralPatterns = calculateBehavioralPatterns(userEvents);
  
  // Aggregate seasonal trends
  const seasonalTrends = calculateSeasonalTrends(userEvents);
  
  // Calculate data quality
  const dataQuality = calculateDataQuality(userEvents);
  
  return {
    user_id: userId,
    created_at: userEvents[0].timestamp,
    last_active: lastActive,
    total_sessions: totalSessions,
    total_interactions: totalInteractions,
    preference_weights: preferenceWeights,
    behavioral_patterns: behavioralPatterns,
    seasonal_trends: seasonalTrends,
    data_quality: dataQuality
  };
}

// Future ML-ready format - structured numeric data only
export interface MLTrainingData {
  user_features: {
    category_preferences: number[];
    attribute_weights: number[];
    price_sensitivity: number[];
    behavioral_scores: number[];
    data_quality_score: number;
  };
  context_features: {
    time_of_day: number;    // Normalized 0-1
    season: number[];        // One-hot encoded
    occasion: number[];      // One-hot encoded
    lighting: number;         // Brightness 0-1
    location: number[];       // One-hot encoded
  };
  interaction_outcomes: {
    viewed_products: number[];
    cart_added: number[];
    purchased: number[];
    ar_sessions: number[];
    session_durations: number[];
  };
  target_labels: {
    conversion_probability: number;
    repeat_purchase_likelihood: number;
    ar_adoption_score: number;
    price_sensitivity_class: string;
  };
}

// Convert accumulated profile to ML-ready format
export function convertToMLTrainingFormat(
  userProfile: AccumulatedUserProfile
): MLTrainingData {
  // User features (numeric vectors only)
  const userFeatures = {
    category_preferences: Object.values(userProfile.preference_weights.categories),
    attribute_weights: Object.values(userProfile.preference_weights.attributes),
    price_sensitivity: [
      userProfile.preference_weights.price_sensitivity.budget,
      userProfile.preference_weights.price_sensitivity.mid_range,
      userProfile.preference_weights.price_sensitivity.premium
    ],
    behavioral_scores: [
      userProfile.behavioral_patterns.session_duration_avg / 60, // Convert to hours
      userProfile.behavioral_patterns.products_per_session,
      userProfile.behavioral_patterns.cart_to_purchase_rate,
      userProfile.behavioral_patterns.ar_try_on_frequency,
      userProfile.behavioral_patterns.search_to_view_rate
    ],
    data_quality_score: userProfile.data_quality.consistency_score
  };
  
  // Context features (normalized)
  const contextFeatures = {
    time_of_day: 0.5, // Would be calculated from actual events
    season: [0, 1, 0, 0], // Spring/Summer/Fall/Winter one-hot
    occasion: [0, 0, 1, 0, 0], // Work/Party/Casual/Date/Wedding one-hot
    lighting: 0.7, // Normalized brightness
    location: [1, 0, 0, 0] // Home/Office/Store/Outdoor one-hot
  };
  
  // Interaction outcomes (aggregated counts)
  const interactionOutcomes = {
    viewed_products: [12, 8, 15, 3], // Example aggregated data
    cart_added: [5, 2, 8, 1],
    purchased: [2, 0, 3, 0],
    ar_sessions: [1, 0, 2, 0],
    session_durations: [12.5, 6.2, 8.7, 4.1]
  };
  
  // Target labels (calculated from patterns)
  const targetLabels = {
    conversion_probability: userProfile.behavioral_patterns.cart_to_purchase_rate,
    repeat_purchase_likelihood: calculateRepeatPurchaseLikelihood(userProfile),
    ar_adoption_score: userProfile.behavioral_patterns.ar_try_on_frequency,
    price_sensitivity_class: classifyPriceSensitivity(userProfile.preference_weights.price_sensitivity)
  };
  
  return {
    user_features: userFeatures,
    context_features: contextFeatures,
    interaction_outcomes: interactionOutcomes,
    target_labels: targetLabels
  };
}

// Helper functions (data processing only)

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getCurrentTimeOfDay(): BehaviorEvent['context']['time_of_day'] {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function getPlatform(): BehaviorEvent['device_info']['platform'] {
  if (typeof window !== 'undefined' && window.navigator) {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
    if (userAgent.includes('android')) return 'android';
  }
  return 'web';
}

function getScreenSize(): [number, number] {
  if (typeof window !== 'undefined') {
    return [window.screen.width, window.screen.height];
  }
  return [390, 844]; // Default
}

function createEmptyProfile(userId: string): AccumulatedUserProfile {
  return {
    user_id: userId,
    created_at: new Date().toISOString(),
    last_active: new Date().toISOString(),
    total_sessions: 0,
    total_interactions: 0,
    preference_weights: {
      categories: {},
      attributes: {},
      price_sensitivity: { budget: 0, mid_range: 0, premium: 0 },
      brands: {}
    },
    behavioral_patterns: {
      session_duration_avg: 0,
      products_per_session: 0,
      cart_to_purchase_rate: 0,
      ar_try_on_frequency: 0,
      search_to_view_rate: 0,
      peak_activity_hours: [],
      preferred_screens: []
    },
    seasonal_trends: {},
    data_quality: {
      total_events: 0,
      unique_entities: 0,
      recency_score: 0,
      consistency_score: 0
    }
  };
}

function accumulatePreferenceWeights(events: BehaviorEvent[]): AccumulatedUserProfile['preference_weights'] {
  const categories: {[category: string]: number} = {};
  const attributes: {[attribute: string]: number} = {};
  const priceSensitivity = { budget: 0, mid_range: 0, premium: 0 };
  const brands: {[brand: string]: number} = {};
  
  events.forEach(event => {
    // Accumulate category preferences
    if (event.metadata.category_path) {
      event.metadata.category_path.forEach(category => {
        categories[category] = (categories[category] || 0) + 1;
      });
    }
    
    // Accumulate attribute preferences
    if (event.metadata.filter_values) {
      event.metadata.filter_values.forEach(attribute => {
        attributes[attribute] = (attributes[attribute] || 0) + 1;
      });
    }
    
    // Accumulate price sensitivity
    if (event.metadata.price_range) {
      priceSensitivity[event.metadata.price_range] += 1;
    }
    
    // Accumulate brand preferences (would need entity data)
    // brands[brand] += 1; // Implementation depends on entity lookup
  });
  
  return { categories, attributes, price_sensitivity: priceSensitivity, brands };
}

function calculateBehavioralPatterns(events: BehaviorEvent[]): AccumulatedUserProfile['behavioral_patterns'] {
  const sessionDurations: number[] = [];
  const sessionProductCounts: {[sessionId: string]: number} = {};
  const cartAdds = events.filter(e => e.event_type === 'add_to_cart').length;
  const purchases = events.filter(e => e.event_type === 'purchase').length;
  const arSessions = events.filter(e => e.event_type === 'try_on').length;
  const searches = events.filter(e => e.event_type === 'search').length;
  const views = events.filter(e => e.event_type === 'view').length;
  
  // Calculate session metrics
  events.forEach(event => {
    if (event.metadata.duration_ms) {
      sessionDurations.push(event.metadata.duration_ms / 60000); // Convert to minutes
    }
    sessionProductCounts[event.session_id] = (sessionProductCounts[event.session_id] || 0) + 1;
  });
  
  const avgSessionDuration = sessionDurations.length > 0 
    ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length 
    : 0;
  
  const avgProductsPerSession = Object.values(sessionProductCounts).length > 0
    ? Object.values(sessionProductCounts).reduce((a, b) => a + b, 0) / Object.values(sessionProductCounts).length
    : 0;
  
  return {
    session_duration_avg: avgSessionDuration,
    products_per_session: avgProductsPerSession,
    cart_to_purchase_rate: purchases > 0 ? cartAdds / purchases : 0,
    ar_try_on_frequency: arSessions / events.length,
    search_to_view_rate: searches > 0 ? views / searches : 0,
    peak_activity_hours: [19, 20, 21], // Would be calculated from actual timestamps
    preferred_screens: ['shop', 'mirror'] // Would be calculated from actual screen usage
  };
}

function calculateSeasonalTrends(events: BehaviorEvent[]): AccumulatedUserProfile['seasonal_trends'] {
  const seasonalData: {[season: string]: any} = {
    winter: { top_categories: [], color_preferences: [], occasion_preference: 'casual' },
    spring: { top_categories: [], color_preferences: [], occasion_preference: 'party' },
    summer: { top_categories: [], color_preferences: [], occasion_preference: 'casual' },
    fall: { top_categories: [], color_preferences: [], occasion_preference: 'work' }
  };
  
  // Simplified seasonal aggregation - in practice would use date-based grouping
  events.forEach(event => {
    const season = getSeasonFromTimestamp(event.timestamp);
    if (event.metadata.category_path) {
      event.metadata.category_path.forEach(category => {
        if (!seasonalData[season].top_categories.includes(category)) {
          seasonalData[season].top_categories.push(category);
        }
      });
    }
  });
  
  return seasonalData;
}

function calculateDataQuality(events: BehaviorEvent[]): AccumulatedUserProfile['data_quality'] {
  const totalEvents = events.length;
  const uniqueEntities = new Set(events.map(e => e.entity_id)).size;
  
  // Recency score (how recent are the events?)
  const now = new Date();
  const avgEventAge = events.reduce((sum, event) => {
    const age = (now.getTime() - new Date(event.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    return sum + age;
  }, 0) / events.length;
  const recencyScore = Math.max(0, 1 - (avgEventAge / 30)); // 30-day window
  
  // Consistency score (how regular is the activity?)
  const dailyEventCounts: {[day: string]: number} = {};
  events.forEach(event => {
    const day = event.timestamp.split('T')[0]; // YYYY-MM-DD
    dailyEventCounts[day] = (dailyEventCounts[day] || 0) + 1;
  });
  
  const dailyCounts = Object.values(dailyEventCounts);
  const avgDailyEvents = dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length;
  const variance = dailyCounts.reduce((sum, count) => sum + Math.pow(count - avgDailyEvents, 2), 0) / dailyCounts.length;
  const consistencyScore = Math.max(0, 1 - (variance / Math.pow(avgDailyEvents, 2)));
  
  return {
    total_events: totalEvents,
    unique_entities: uniqueEntities,
    recency_score: recencyScore,
    consistency_score: consistencyScore
  };
}

function getSeasonFromTimestamp(timestamp: string): string {
  const month = new Date(timestamp).getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

function calculateRepeatPurchaseLikelihood(profile: AccumulatedUserProfile): number {
  // Simple heuristic based on purchase frequency and recency
  const daysSinceLastActive = (new Date().getTime() - new Date(profile.last_active).getTime()) / (1000 * 60 * 60 * 24);
  const purchaseFrequency = profile.behavioral_patterns.cart_to_purchase_rate;
  
  return Math.max(0, Math.min(1, purchaseFrequency * (1 - daysSinceLastActive / 365)));
}

function classifyPriceSensitivity(priceSensitivity: AccumulatedUserProfile['preference_weights']['price_sensitivity']): string {
  const { budget, mid_range, premium } = priceSensitivity;
  const total = budget + mid_range + premium;
  
  if (budget / total > 0.6) return 'budget';
  if (premium / total > 0.4) return 'premium';
  return 'mid_range';
}
