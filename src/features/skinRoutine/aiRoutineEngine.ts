import { supabase } from '../../lib/supabase';

export interface SkinMetrics {
  final_redness_score: number;
  final_texture_score: number;
  melanin_index: number;
  overall_skin_health_score: number;
  skin_conditions: {
    acne: { severity: number; confidence: number };
    redness: { severity: number; confidence: number };
    'uneven-tone': { severity: number; confidence: number };
    dullness: { severity: number; confidence: number };
    wrinkles: { severity: number; confidence: number };
  };
  skin_tone: string;
  undertone: string;
  skin_age: number;
}

export interface RoutineStep {
  id: string;
  name: string;
  category: 'cleanse' | 'treat' | 'moisturize' | 'protect' | 'special';
  time_of_day: 'morning' | 'evening' | 'weekly';
  product_type: string;
  ingredients: string[];
  instructions: string[];
  duration_minutes: number;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

export interface SkinRoutine {
  id: string;
  routine_type: 'morning' | 'evening' | 'weekly';
  primary_concern: string;
  skin_type: string;
  steps: RoutineStep[];
  total_time_minutes: number;
  estimated_cost_range: string;
  key_benefits: string[];
  adherence_tips: string[];
  ai_reasoning: {
    condition_detected: string;
    trend_analysis: string;
    product_rationale: string;
    urgency_level: 'low' | 'medium' | 'high';
  };
  generated_at: string;
  valid_until: string;
}

export interface RoutineGenerationOptions {
  user_id?: string;
  journey_id?: string;
  budget_tier?: 'low' | 'medium' | 'high';
  lifestyle_factors?: {
    time_available: number; // minutes per routine
    preference_natural: boolean;
    sensitivity_level: 'low' | 'medium' | 'high';
    climate: 'dry' | 'humid' | 'temperate' | 'cold';
  };
  product_availability?: string[]; // brands user prefers
}

class AIRoutineEngine {
  private readonly INGREDIENT_DATABASE = {
    acne: {
      high: ['salicylic acid', 'benzoyl peroxide', 'retinol', 'niacinamide', 'tea tree oil'],
      medium: ['azelaic acid', 'mandelic acid', 'zinc', 'green tea extract'],
      low: ['witch hazel', 'clay', 'charcoal', 'aloe vera']
    },
    redness: {
      high: ['niacinamide', 'centella asiatica', 'green tea', 'chamomile', 'licorice root'],
      medium: ['vitamin C', 'peptides', 'ceramides', 'oatmeal'],
      low: ['aloe vera', 'cucumber', 'rose water', 'calendula']
    },
    anti_aging: {
      high: ['retinol', 'peptides', 'vitamin C', 'hyaluronic acid', 'glycolic acid'],
      medium: ['niacinamide', 'ceramides', 'coenzyme Q10', 'green tea'],
      low: ['vitamin E', 'aloe vera', 'rosehip oil', 'jojoba oil']
    },
    hydration: {
      high: ['hyaluronic acid', 'glycerin', 'ceramides', 'squalane', 'shea butter'],
      medium: ['niacinamide', 'panthenol', 'aloe vera', 'oatmeal'],
      low: ['glycerin', 'aloe vera', 'rose water', 'cucumber']
    },
    brightening: {
      high: ['vitamin C', 'niacinamide', 'azelaic acid', 'kojic acid', 'arbutin'],
      medium: ['licorice root', 'green tea', 'vitamin E', 'papaya enzyme'],
      low: ['rosehip oil', 'aloe vera', 'chamomile', 'calendula']
    }
  };

  private readonly PRODUCT_CATEGORIES = {
    cleanse: ['gel cleanser', 'foam cleanser', 'oil cleanser', 'cream cleanser', 'micellar water'],
    treat: ['serum', 'ampoule', 'essence', 'spot treatment', 'mask'],
    moisturize: ['moisturizer', 'cream', 'lotion', 'gel cream', 'balm'],
    protect: ['sunscreen', 'SPF moisturizer', 'mineral sunscreen', 'sun protection'],
    special: ['exfoliant', 'mask', 'peel', 'treatment pad', 'overnight treatment']
  };

  /**
   * Generate personalized skin routine based on latest metrics and history
   */
  async generateSkinRoutine(
    latestMetrics: SkinMetrics,
    historicalData?: SkinMetrics[],
    options: RoutineGenerationOptions = {}
  ): Promise<SkinRoutine> {
    try {
      // Analyze current condition and trends
      const conditionAnalysis = this.analyzeSkinCondition(latestMetrics, historicalData);
      
      // Determine primary concerns
      const primaryConcerns = this.identifyPrimaryConcerns(latestMetrics, conditionAnalysis);
      
      // Generate routine steps
      const steps = this.generateRoutineSteps(latestMetrics, primaryConcerns, conditionAnalysis, options);
      
      // Create complete routine
      const routine: SkinRoutine = {
        id: `routine_${Date.now()}`,
        routine_type: 'morning', // Default, can be customized
        primary_concern: primaryConcerns[0] || 'general_maintenance',
        skin_type: this.determineSkinType(latestMetrics),
        steps,
        total_time_minutes: steps.reduce((total, step) => total + step.duration_minutes, 0),
        estimated_cost_range: this.estimateCostRange(steps, options.budget_tier),
        key_benefits: this.extractKeyBenefits(steps, primaryConcerns),
        adherence_tips: this.generateAdherenceTips(steps, options.lifestyle_factors),
        ai_reasoning: {
          condition_detected: conditionAnalysis.summary,
          trend_analysis: conditionAnalysis.trend,
          product_rationale: this.explainProductRationale(steps, latestMetrics),
          urgency_level: this.determineUrgency(latestMetrics, conditionAnalysis)
        },
        generated_at: new Date().toISOString(),
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      };

      // Save routine to database if user_id provided
      if (options.user_id) {
        await this.saveRoutineToDatabase(routine, options);
      }

      return routine;
    } catch (error) {
      console.error('Error generating skin routine:', error);
      throw new Error('Failed to generate AI skin routine');
    }
  }

  /**
   * Analyze current skin condition and trends from historical data
   */
  private analyzeSkinCondition(
    current: SkinMetrics,
    historical?: SkinMetrics[]
  ): {
    severity: 'mild' | 'moderate' | 'severe';
    trend: 'improving' | 'stable' | 'worsening';
    summary: string;
    confidence: number;
  } {
    const conditions = current.skin_conditions;
    const maxSeverity = Math.max(
      conditions.acne.severity,
      conditions.redness.severity,
      conditions['uneven-tone'].severity,
      conditions.dullness.severity,
      conditions.wrinkles.severity
    );

    // Determine severity
    let severity: 'mild' | 'moderate' | 'severe';
    if (maxSeverity < 30) severity = 'mild';
    else if (maxSeverity < 60) severity = 'moderate';
    else severity = 'severe';

    // Analyze trend if historical data available
    let trend: 'improving' | 'stable' | 'worsening' = 'stable';
    let confidence = 0.7;

    if (historical && historical.length >= 2) {
      const previous = historical[historical.length - 2];
      const scoreChange = current.overall_skin_health_score - previous.overall_skin_health_score;
      
      if (scoreChange > 5) trend = 'improving';
      else if (scoreChange < -5) trend = 'worsening';
      
      confidence = Math.min(0.95, 0.7 + (historical.length * 0.05));
    }

    // Generate summary
    const primaryIssues = Object.entries(conditions)
      .filter(([_, condition]) => condition.severity > 20)
      .map(([name, condition]) => name.replace('-', ' '))
      .slice(0, 3);

    const summary = `${severity} ${primaryIssues.join(', ')} with ${trend} trend`;

    return { severity, trend, summary, confidence };
  }

  /**
   * Identify primary skin concerns based on metrics
   */
  private identifyPrimaryConcerns(
    metrics: SkinMetrics,
    analysis: { severity: string; trend: string }
  ): string[] {
    const concerns: string[] = [];
    const conditions = metrics.skin_conditions;

    // High priority concerns
    if (conditions.acne.severity > 40) concerns.push('acne');
    if (conditions.redness.severity > 40) concerns.push('redness');
    if (conditions.wrinkles.severity > 30 && metrics.skin_age > 25) concerns.push('anti_aging');
    if (conditions['uneven-tone'].severity > 30) concerns.push('pigmentation');
    if (conditions.dullness.severity > 30) concerns.push('dullness');

    // Add texture concerns
    if (metrics.final_texture_score < 50) concerns.push('texture');

    // Add hydration concerns
    if (metrics.final_redness_score > 60 && conditions.redness.severity < 30) {
      concerns.push('hydration');
    }

    // If no major concerns, focus on maintenance
    if (concerns.length === 0) {
      concerns.push('general_maintenance');
    }

    return concerns;
  }

  /**
   * Generate routine steps based on analysis
   */
  private generateRoutineSteps(
    metrics: SkinMetrics,
    concerns: string[],
    analysis: any,
    options: RoutineGenerationOptions
  ): RoutineStep[] {
    const steps: RoutineStep[] = [];
    const timeAvailable = options.lifestyle_factors?.time_available || 10;

    // Always include cleansing
    steps.push(this.createCleansingStep(metrics, concerns, timeAvailable));

    // Add treatment steps based on concerns
    if (concerns.includes('acne')) {
      steps.push(this.createAcneTreatmentStep(metrics, analysis));
    }

    if (concerns.includes('redness')) {
      steps.push(this.createRednessTreatmentStep(metrics, analysis));
    }

    if (concerns.includes('anti_aging')) {
      steps.push(this.createAntiAgingStep(metrics, analysis));
    }

    if (concerns.includes('pigmentation')) {
      steps.push(this.createBrighteningStep(metrics, analysis));
    }

    // Always include moisturizing
    steps.push(this.createMoisturizingStep(metrics, concerns, timeAvailable));

    // Add sunscreen for morning routine
    if (timeAvailable >= 5) {
      steps.push(this.createProtectionStep(metrics));
    }

    // Sort by priority and limit by time
    return steps
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, Math.max(2, Math.floor(timeAvailable / 3))); // Approximate 3 min per step
  }

  private createCleansingStep(metrics: SkinMetrics, concerns: string[], timeAvailable: number): RoutineStep {
    const isOily = metrics.final_redness_score > 50;
    const isSensitive = concerns.includes('redness') || metrics.final_redness_score > 60;

    let productType = 'gel cleanser';
    let ingredients = ['gentle surfactants', 'green tea'];
    
    if (isOily && !isSensitive) {
      productType = 'foam cleanser';
      ingredients = ['salicylic acid', 'tea tree oil'];
    } else if (isSensitive) {
      productType = 'cream cleanser';
      ingredients = ['ceramides', 'aloe vera', 'chamomile'];
    }

    return {
      id: 'cleanse_1',
      name: 'Gentle Cleansing',
      category: 'cleanse',
      time_of_day: 'morning',
      product_type: productType,
      ingredients,
      instructions: [
        'Wet face with lukewarm water',
        'Apply cleanser in circular motions',
        'Focus on T-zone and problem areas',
        'Rinse thoroughly and pat dry'
      ],
      duration_minutes: 2,
      priority: 'high',
      reason: 'Remove impurities and prepare skin for treatment'
    };
  }

  private createAcneTreatmentStep(metrics: SkinMetrics, analysis: any): RoutineStep {
    const severity = metrics.skin_conditions.acne.severity;
    const ingredients = severity > 60 ? 
      this.INGREDIENT_DATABASE.acne.high : 
      this.INGREDIENT_DATABASE.acne.medium;

    return {
      id: 'treat_acne',
      name: 'Acne Control Treatment',
      category: 'treat',
      time_of_day: 'evening',
      product_type: 'serum',
      ingredients: ingredients.slice(0, 3),
      instructions: [
        'Apply after cleansing',
        'Focus on affected areas',
        'Use thin layer to avoid irritation',
        'Follow with moisturizer'
      ],
      duration_minutes: 3,
      priority: severity > 50 ? 'high' : 'medium',
      reason: `Target acne-causing bacteria and reduce inflammation (${severity.toFixed(0)}% severity)`
    };
  }

  private createRednessTreatmentStep(metrics: SkinMetrics, analysis: any): RoutineStep {
    const severity = metrics.skin_conditions.redness.severity;
    const ingredients = this.INGREDIENT_DATABASE.redness.medium;

    return {
      id: 'treat_redness',
      name: 'Calming Treatment',
      category: 'treat',
      time_of_day: 'evening',
      product_type: 'serum',
      ingredients: ingredients.slice(0, 3),
      instructions: [
        'Apply to clean, slightly damp skin',
        'Gently pat, don\'t rub',
        'Allow to absorb completely',
        'Follow with barrier-repair moisturizer'
      ],
      duration_minutes: 2,
      priority: severity > 50 ? 'high' : 'medium',
      reason: `Reduce inflammation and strengthen skin barrier (${severity.toFixed(0)}% severity)`
    };
  }

  private createAntiAgingStep(metrics: SkinMetrics, analysis: any): RoutineStep {
    const ingredients = this.INGREDIENT_DATABASE.anti_aging.medium;

    return {
      id: 'treat_aging',
      name: 'Anti-Aging Treatment',
      category: 'treat',
      time_of_day: 'evening',
      product_type: 'serum',
      ingredients: ingredients.slice(0, 3),
      instructions: [
        'Apply to dry skin',
        'Use upward motions',
        'Include neck and décolletage',
        'Allow 5 minutes to absorb'
      ],
      duration_minutes: 4,
      priority: 'medium',
      reason: `Stimulate collagen and reduce signs of aging (estimated age: ${metrics.skin_age})`
    };
  }

  private createBrighteningStep(metrics: SkinMetrics, analysis: any): RoutineStep {
    const ingredients = this.INGREDIENT_DATABASE.brightening.medium;

    return {
      id: 'treat_brightening',
      name: 'Brightening Treatment',
      category: 'treat',
      time_of_day: 'evening',
      product_type: 'serum',
      ingredients: ingredients.slice(0, 3),
      instructions: [
        'Apply to clean skin',
        'Focus on dark spots and uneven areas',
        'Use consistent pressure',
        'Follow with moisturizer'
      ],
      duration_minutes: 3,
      priority: 'medium',
      reason: 'Even out skin tone and reduce hyperpigmentation'
    };
  }

  private createMoisturizingStep(metrics: SkinMetrics, concerns: string[], timeAvailable: number): RoutineStep {
    const isOily = metrics.final_redness_score > 50;
    const isDry = metrics.final_texture_score < 40;
    
    let productType = 'lotion';
    let ingredients = ['hyaluronic acid', 'niacinamide'];
    
    if (isDry) {
      productType = 'cream';
      ingredients = ['ceramides', 'squalane', 'shea butter'];
    } else if (isOily) {
      productType = 'gel cream';
      ingredients = ['hyaluronic acid', 'green tea', 'aloe vera'];
    }

    return {
      id: 'moisturize_1',
      name: 'Hydration & Protection',
      category: 'moisturize',
      time_of_day: 'morning',
      product_type: productType,
      ingredients,
      instructions: [
        'Apply to slightly damp skin',
        'Use gentle upward strokes',
        'Include neck area',
        'Allow 2 minutes to absorb'
      ],
      duration_minutes: 2,
      priority: 'high',
      reason: 'Hydrate skin and lock in previous treatments'
    };
  }

  private createProtectionStep(metrics: SkinMetrics): RoutineStep {
    return {
      id: 'protect_1',
      name: 'Sun Protection',
      category: 'protect',
      time_of_day: 'morning',
      product_type: 'sunscreen',
      ingredients: ['zinc oxide', 'titanium dioxide', 'antioxidants'],
      instructions: [
        'Apply 15 minutes before sun exposure',
        'Use generous amount (2 finger lengths)',
        'Reapply every 2 hours if outdoors',
        'Don\'t forget ears and neck'
      ],
      duration_minutes: 2,
      priority: 'high',
      reason: 'Prevent UV damage and premature aging'
    };
  }

  /**
   * Determine skin type from metrics
   */
  private determineSkinType(metrics: SkinMetrics): string {
    const redness = metrics.final_redness_score;
    const texture = metrics.final_texture_score;
    const conditions = metrics.skin_conditions;

    if (redness > 60 && texture > 60) return 'normal';
    if (redness > 60 && texture < 40) return 'dry';
    if (redness < 40 && texture > 60) return 'oily';
    if (redness < 40 && texture < 40) return 'combination';
    return 'sensitive'; // High redness indicates sensitivity
  }

  /**
   * Estimate cost range for routine
   */
  private estimateCostRange(steps: RoutineStep[], budgetTier?: string): string {
    const baseCost = steps.length * 15; // $15 per product average
    const multiplier = budgetTier === 'high' ? 2 : budgetTier === 'low' ? 0.5 : 1;
    const estimated = baseCost * multiplier;
    
    if (estimated < 50) return 'Under $50';
    if (estimated < 100) return '$50-100';
    if (estimated < 200) return '$100-200';
    return 'Over $200';
  }

  /**
   * Extract key benefits from routine steps
   */
  private extractKeyBenefits(steps: RoutineStep[], concerns: string[]): string[] {
    const benefits = new Set<string>();
    
    steps.forEach(step => {
      if (step.category === 'treat') {
        if (step.ingredients.some(i => i.includes('salicylic') || i.includes('benzoyl'))) {
          benefits.add('Reduces acne and breakouts');
        }
        if (step.ingredients.some(i => i.includes('niacinamide') || i.includes('green tea'))) {
          benefits.add('Calms redness and inflammation');
        }
        if (step.ingredients.some(i => i.includes('retinol') || i.includes('peptides'))) {
          benefits.add('Fights signs of aging');
        }
        if (step.ingredients.some(i => i.includes('vitamin C') || i.includes('azelaic'))) {
          benefits.add('Brightens and evens skin tone');
        }
      }
    });

    benefits.add('Improves overall skin health');
    benefits.add('Enhances skin barrier function');

    return Array.from(benefits).slice(0, 4);
  }

  /**
   * Generate adherence tips based on lifestyle factors
   */
  private generateAdherenceTips(steps: RoutineStep[], lifestyle?: any): string[] {
    const tips = [
      'Start with simpler routine and build up gradually',
      'Set phone reminders for morning and evening routines',
      'Keep products visible and easily accessible'
    ];

    if (lifestyle?.time_available < 10) {
      tips.push('Focus on essential steps: cleanse, treat, moisturize');
      tips.push('Use multi-purpose products to save time');
    }

    if (lifestyle?.preference_natural) {
      tips.push('Choose products with natural ingredients you enjoy');
      tips.push('Store products properly to maintain potency');
    }

    tips.push('Take progress photos weekly to stay motivated');
    tips.push('Be consistent for at least 4 weeks to see results');

    return tips.slice(0, 5);
  }

  /**
   * Explain product rationale
   */
  private explainProductRationale(steps: RoutineStep[], metrics: SkinMetrics): string {
    const concernCount = steps.filter(s => s.category === 'treat').length;
    const skinType = this.determineSkinType(metrics);
    
    return `Based on your ${skinType} skin type and ${concernCount} primary concerns, this routine targets your specific issues while maintaining skin barrier health. Products are selected for their proven efficacy and compatibility with your skin condition.`;
  }

  /**
   * Determine urgency level for treatment
   */
  private determineUrgency(metrics: SkinMetrics, analysis: any): 'low' | 'medium' | 'high' {
    const maxSeverity = Math.max(...Object.values(metrics.skin_conditions).map(c => c.severity));
    
    if (maxSeverity > 70 || analysis.trend === 'worsening') return 'high';
    if (maxSeverity > 40) return 'medium';
    return 'low';
  }

  /**
   * Save routine to database
   */
  private async saveRoutineToDatabase(routine: SkinRoutine, options: RoutineGenerationOptions): Promise<void> {
    if (!options.user_id) return;

    try {
      await supabase.from('ai_routine_history').insert({
        user_id: options.user_id,
        journey_id: options.journey_id,
        routine_type: routine.routine_type,
        routine_data: routine,
        ai_reasoning: routine.ai_reasoning,
        is_active: true
      });
    } catch (error) {
      console.error('Failed to save routine to database:', error);
      // Don't throw error - routine generation should still work
    }
  }

  /**
   * Get routine history for a user
   */
  async getRoutineHistory(userId: string, limit = 10): Promise<SkinRoutine[]> {
    try {
      const { data, error } = await supabase
        .from('ai_routine_history')
        .select('routine_data')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      return data?.map(item => item.routine_data) || [];
    } catch (error) {
      console.error('Error fetching routine history:', error);
      return [];
    }
  }

  /**
   * Update routine effectiveness based on user feedback
   */
  async updateRoutineEffectiveness(
    routineId: string,
    feedback: number,
    effectivenessScore?: number
  ): Promise<void> {
    try {
      await supabase
        .from('ai_routine_history')
        .update({
          user_feedback: feedback,
          effectiveness_score: effectivenessScore
        })
        .eq('id', routineId);
    } catch (error) {
      console.error('Error updating routine effectiveness:', error);
    }
  }
}

// Export singleton instance
export const aiRoutineEngine = new AIRoutineEngine();
export default aiRoutineEngine;
