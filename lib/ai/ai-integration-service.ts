// ZERO-TRUST AI: Integration service for deterministic AI logic
// Connects existing AI modules to UI screens
// No new logic - only wiring existing implementations
import { performCompleteSkinAnalysis } from './skin-analysis';
import { analyzeBodyProportions } from './body-proportions';
import { calculateBeautyMatchScore } from './product-matching';
import { logBehaviorEvent, accumulateUserProfile, convertToMLTrainingFormat } from './behavior-tracking';

// AI Integration Service - wires existing logic to screens
export class AIIntegrationService {
  private static instance: AIIntegrationService;
  private userProfile: any = null;
  private behaviorEvents: any[] = [];

  static getInstance(): AIIntegrationService {
    if (!AIIntegrationService.instance) {
      AIIntegrationService.instance = new AIIntegrationService();
    }
    return AIIntegrationService.instance;
  }

  // HOME SCREEN INTEGRATION - from AI_AR_INTEGRATION_AUDIT.md
  async getPersonalizedFeed(products: any[], userId: string): Promise<any[]> {
    // 1. Get accumulated user profile
    const userProfile = accumulateUserProfile(userId, this.behaviorEvents);
    
    // 2. Rank products using existing deterministic logic
    const rankedProducts = products.map(product => {
      const matchScore = calculateBeautyMatchScore(
        {
          skin_tone: String(userProfile.preference_weights.categories['skin_tone']) || 'medium',
          undertone: 'neutral', // Default
          face_shape: 'oval', // Default
          melanin_index: 0.5,
          lab_values: [55, 15, 25]
        },
        {
          id: product.id,
          color: product.color || [200, 150, 100],
          undertone: product.undertone || 'neutral',
          face_scores: { oval: 0.8, round: 0.6, heart: 0.7, square: 0.5 },
          coverage: product.coverage || 'medium',
          finish: product.finish || 'matte',
          price: product.price || 1000,
          trending: product.trending || false,
          category: product.category || 'makeup'
        },
        {
          avg_spend: userProfile.behavioral_patterns.products_per_session * 1000 || 1500,
          past_purchases: [], // Would come from purchase history
          interaction_weights: userProfile.preference_weights.brands
        },
        {
          time_of_day: this.getCurrentTimeOfDay(),
          occasion: 'casual',
          lighting: 'natural',
        }
      );

      return {
        ...product,
        ai_score: matchScore.match_score,
        ai_reasons: matchScore.match_reasons,
        ai_breakdown: matchScore.weighted_breakdown
      };
    });

    // 3. Sort by AI score (deterministic)
    return rankedProducts.sort((a, b) => b.ai_score - a.ai_score);
  }

  // MIRROR SCREEN INTEGRATION - from AI_AR_INTEGRATION_AUDIT.md
  async analyzeFaceForMirror(imageData: Uint8ClampedArray, landmarks: any[]): Promise<any> {
    // 1. Perform complete skin analysis (TRUSTED SINGLE SOURCE)
    // NO LONGER CALLS generateBeautyFingerprint - prevents double analysis
    const skinAnalysis = performCompleteSkinAnalysis(imageData, landmarks);
    
    // 3. Log behavior event
    const event = logBehaviorEvent(
      'view',
      'product',
      'mirror_analysis',
      { screen: 'mirror', occasion: 'casual' },
      { confidence_score: skinAnalysis.processing_metadata.analysis_confidence },
      'user_session_id',
      this.userProfile?.session_id || null
    );
    this.behaviorEvents.push(event);

    return {
      beauty_fingerprint: skinAnalysis,
      skin_analysis: skinAnalysis,
      recommendations: await this.generateMirrorRecommendations(skinAnalysis, skinAnalysis)
    };
  }

  // SHOP SCREEN INTEGRATION - from AI_AR_INTEGRATION_AUDIT.md
  async performVisualSearch(imageData: Uint8ClampedArray, landmarks: any[]): Promise<any> {
    // 1. Analyze image using existing logic
    const skinAnalysis = performCompleteSkinAnalysis(imageData, landmarks);
    
    // 2. Generate search query (deterministic)
    const searchQuery = this.generateSearchQuery(skinAnalysis);
    
    // 3. Log visual search event
    const event = logBehaviorEvent(
      'search',
      'product',
      'visual_search',
      { screen: 'shop' },
      { confidence_score: skinAnalysis.analysis_confidence },
      'user_session_id',
      'session_' + Date.now()
    );
    this.behaviorEvents.push(event);

    return {
      query: searchQuery,
      skin_profile: skinAnalysis,
      search_filters: this.generateSearchFilters(skinAnalysis)
    };
  }

  // BEHAVIOR TRACKING INTEGRATION
  trackUserEvent(eventType: any, entityType: any, entityId: string, context: any = {}, metadata: any = {}) {
    const event = logBehaviorEvent(
      eventType,
      entityType,
      entityId,
      context,
      metadata,
      'user_session_id',
      'session_' + Date.now()
    );
    this.behaviorEvents.push(event);
  }

  // Get accumulated user profile
  getUserProfile(userId: string): any {
    return accumulateUserProfile(userId, this.behaviorEvents);
  }

  // Get ML-ready data format (future training)
  getMLTrainingData(userId: string): any {
    const userProfile = this.getUserProfile(userId);
    return convertToMLTrainingFormat(userProfile);
  }

  // PRIVATE HELPER METHODS (deterministic only)

  private getCurrentTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  private async generateMirrorRecommendations(beautyFingerprint: any, skinAnalysis: any): Promise<any[]> {
    // Generate deterministic recommendations based on analysis
    const recommendations = [];
    
    // Face shape-based recommendations
    if (beautyFingerprint.face_shape === 'oval') {
      recommendations.push({
        type: 'face_shape',
        recommendation: 'oval_face_products',
        confidence: 0.8,
        reason: 'excellent_face_shape'
      });
    }
    
    // Skin tone-based recommendations
    if (skinAnalysis.skin_tone === 'medium') {
      recommendations.push({
        type: 'skin_tone',
        recommendation: 'medium_tone_products',
        confidence: 0.9,
        reason: 'perfect_skin_tone'
      });
    }
    
    // Undertone-based recommendations
    if (skinAnalysis.undertone === 'warm') {
      recommendations.push({
        type: 'undertone',
        recommendation: 'warm_undertone_products',
        confidence: 0.85,
        reason: 'great_undertone'
      });
    }
    
    return recommendations;
  }

  private generateSearchQuery(skinAnalysis: any): string {
    // Generate deterministic search query from skin analysis
    const parts = [
      skinAnalysis.skin_tone,
      skinAnalysis.undertone,
      skinAnalysis.texture_scores.smoothness > 0.7 ? 'smooth' : 'textured',
      skinAnalysis.texture_scores.radiance > 0.6 ? 'radiant' : 'matte'
    ].filter(Boolean);
    
    return parts.join(',');
  }

  private generateSearchFilters(skinAnalysis: any): any {
    // Generate deterministic search filters
    return {
      skin_tone: skinAnalysis.skin_tone,
      undertone: skinAnalysis.undertone,
      texture: skinAnalysis.texture_scores.smoothness > 0.7 ? 'smooth' : 'textured',
      finish: skinAnalysis.texture_scores.radiance > 0.6 ? 'radiant' : 'matte',
      coverage: 'medium' // Default
    };
  }
}

// Export singleton instance
export const aiIntegrationService = AIIntegrationService.getInstance();
