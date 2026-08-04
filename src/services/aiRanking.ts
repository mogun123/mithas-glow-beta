import { FeedCard } from '../types/feed';

export interface RankingWeights {
  engagement_weight: number;
  recency_weight: number;
  user_preference_weight: number;
  location_relevance_weight: number;
}

export interface RankingScore {
  cardId: string;
  score: number;
  breakdown: {
    engagement: number;
    recency: number;
    userPreference: number;
    locationRelevance: number;
  };
}

class AIRankingService {
  private readonly defaultWeights: RankingWeights = {
    engagement_weight: 0.4,
    recency_weight: 0.25,
    user_preference_weight: 0.25,
    location_relevance_weight: 0.1,
  };

  private userPreferences: Set<string> = new Set();
  private userLocation: { lat: number; lng: number; city: string } | null = null;

  // Update user preferences based on interactions
  updateUserPreferences(preferences: string[]): void {
    this.userPreferences = new Set(preferences);
  }

  // Update user location for location-based ranking
  updateUserLocation(location: { lat: number; lng: number; city: string } | null): void {
    this.userLocation = location;
  }

  // Calculate engagement score
  private calculateEngagementScore(card: FeedCard): number {
    const likes = card.likes || 0;
    const views = card.views || 0;
    const comments = card.comments || 0;
    
    // Weighted engagement formula
    return (likes * 2) + views + (comments * 3);
  }

  // Calculate recency score (newer content gets higher score)
  private calculateRecencyScore(card: FeedCard): number {
    if (!card.createdAt) return 0.5; // Default score for unknown dates
    
    const now = new Date().getTime();
    const cardTime = new Date(card.createdAt).getTime();
    const hoursDiff = (now - cardTime) / (1000 * 60 * 60);
    
    // Exponential decay: newer content gets much higher scores
    return Math.exp(-hoursDiff / 24); // Half-life of 24 hours
  }

  // Calculate user preference score based on interaction history
  private calculateUserPreferenceScore(card: FeedCard): number {
    if (this.userPreferences.size === 0) return 0.5; // Default score
    
    let score = 0;
    let factors = 0;

    // Check category match
    if (card.category && this.userPreferences.has(card.category)) {
      score += 1;
      factors++;
    }

    // Check tags match
    if (card.tags) {
      const matchingTags = card.tags.filter(tag => this.userPreferences.has(tag));
      score += matchingTags.length;
      factors += card.tags.length;
    }

    // Check creator preference
    if (card.creator && this.userPreferences.has(card.creator)) {
      score += 2;
      factors++;
    }

    return factors > 0 ? score / factors : 0.5;
  }

  // Calculate location relevance score
  private calculateLocationRelevanceScore(card: FeedCard): number {
    if (!this.userLocation || !card.location) return 0.5;
    
    // Simple city matching for now
    if (card.location.city === this.userLocation.city) {
      return 1.0;
    }
    
    // Could add distance calculation here for more sophisticated scoring
    return 0.3;
  }

  // Calculate final ranking score for a card
  calculateCardScore(card: FeedCard, weights?: Partial<RankingWeights>): RankingScore {
    const finalWeights = { ...this.defaultWeights, ...weights };
    
    const engagement = this.calculateEngagementScore(card);
    const recency = this.calculateRecencyScore(card);
    const userPreference = this.calculateUserPreferenceScore(card);
    const locationRelevance = this.calculateLocationRelevanceScore(card);
    
    // Normalize scores to 0-1 range (simple normalization)
    const maxEngagement = 10000; // Adjust based on your data
    const normalizedEngagement = Math.min(engagement / maxEngagement, 1);
    
    // Calculate weighted final score
    const finalScore = 
      (finalWeights.engagement_weight * normalizedEngagement) +
      (finalWeights.recency_weight * recency) +
      (finalWeights.user_preference_weight * userPreference) +
      (finalWeights.location_relevance_weight * locationRelevance);

    return {
      cardId: card.id,
      score: finalScore,
      breakdown: {
        engagement: normalizedEngagement,
        recency,
        userPreference,
        locationRelevance,
      },
    };
  }

  // Sort and rank feed cards
  rankFeedCards(
    cards: FeedCard[], 
    weights?: Partial<RankingWeights>
  ): FeedCard[] {
    const cardsWithScores = cards.map(card => ({
      card,
      score: this.calculateCardScore(card, weights),
    }));

    // Sort by score (highest first)
    cardsWithScores.sort((a, b) => b.score.score - a.score.score);

    // Return sorted cards
    return cardsWithScores.map(item => item.card);
  }

  // Get ranking breakdown for debugging/analytics
  getRankingBreakdown(cards: FeedCard[]): RankingScore[] {
    return cards.map(card => this.calculateCardScore(card));
  }

  // Add user interaction to improve future rankings
  recordUserInteraction(cardId: string, interactionType: 'like' | 'view' | 'comment' | 'share'): void {
    // This would typically update a backend service
    // For now, we could update local preferences
    console.log(`User ${interactionType} on card ${cardId}`);
  }
}

export const aiRankingService = new AIRankingService();
