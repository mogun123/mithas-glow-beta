import { LAB } from './colorConversion';

export type Undertone = 'Warm' | 'Cool' | 'Neutral';

export interface UndertoneResult {
  undertone: Undertone;
  confidence: number;
  analysis: {
    baDifference: number;
    warmthScore: number;
    coolnessScore: number;
    neutralityScore: number;
  };
  indicators: {
    veinColor: 'Greenish' | 'Bluish' | 'Mixed';
    jewelryPreference: 'Gold' | 'Silver' | 'Both';
    sunReaction: 'Tans' | 'Burns' | 'Both';
  };
}

export interface UndertoneThresholds {
  warmThreshold: number;
  coolThreshold: number;
  neutralRange: number;
}

export class UndertoneDetection {
  private readonly defaultThresholds: UndertoneThresholds = {
    warmThreshold: 3,
    coolThreshold: -3,
    neutralRange: 3,
  };

  public detectUndertone(
    labValues: LAB[],
    thresholds: Partial<UndertoneThresholds> = {}
  ): UndertoneResult {
    const finalThresholds = { ...this.defaultThresholds, ...thresholds };
    
    // Calculate average LAB values
    const avgLAB = this.calculateAverageLAB(labValues);
    
    // Calculate B-A difference for undertone detection
    const baDifference = avgLAB.b - avgLAB.a;
    
    // Calculate various undertone scores
    const warmthScore = this.calculateWarmthScore(avgLAB);
    const coolnessScore = this.calculateCoolnessScore(avgLAB);
    const neutralityScore = this.calculateNeutralityScore(warmthScore, coolnessScore);
    
    // Determine primary undertone
    const undertone = this.determineUndertone(baDifference, finalThresholds);
    
    // Calculate confidence
    const confidence = this.calculateUndertoneConfidence(
      baDifference,
      warmthScore,
      coolnessScore,
      labValues.length
    );
    
    // Generate visual indicators
    const indicators = this.generateIndicators(avgLAB);

    return {
      undertone,
      confidence,
      analysis: {
        baDifference,
        warmthScore,
        coolnessScore,
        neutralityScore,
      },
      indicators,
    };
  }

  private calculateAverageLAB(labValues: LAB[]): LAB {
    if (labValues.length === 0) {
      throw new Error('LAB values array cannot be empty');
    }

    const sum = labValues.reduce(
      (acc, lab) => ({
        l: acc.l + lab.l,
        a: acc.a + lab.a,
        b: acc.b + lab.b,
      }),
      { l: 0, a: 0, b: 0 }
    );

    return {
      l: sum.l / labValues.length,
      a: sum.a / labValues.length,
      b: sum.b / labValues.length,
    };
  }

  private calculateWarmthScore(lab: LAB): number {
    // Warmth is indicated by positive B (yellow) and positive A (red)
    // Higher positive values = warmer undertone
    const warmth = (lab.b + lab.a) / 2;
    
    // Normalize to 0-100 scale
    return Math.max(0, Math.min(100, (warmth + 50) * 2));
  }

  private calculateCoolnessScore(lab: LAB): number {
    // Coolness is indicated by negative B (blue) and negative A (green)
    // Higher negative values = cooler undertone
    const coolness = -(lab.b + lab.a) / 2;
    
    // Normalize to 0-100 scale
    return Math.max(0, Math.min(100, (coolness + 50) * 2));
  }

  private calculateNeutralityScore(warmthScore: number, coolnessScore: number): number {
    // Neutrality is when warmth and coolness scores are balanced
    const difference = Math.abs(warmthScore - coolnessScore);
    const neutrality = 100 - difference;
    
    return Math.max(0, Math.min(100, neutrality));
  }

  private determineUndertone(
    baDifference: number,
    thresholds: UndertoneThresholds
  ): Undertone {
    if (baDifference > thresholds.warmThreshold) {
      return 'Warm';
    } else if (baDifference < thresholds.coolThreshold) {
      return 'Cool';
    } else {
      return 'Neutral';
    }
  }

  private calculateUndertoneConfidence(
    baDifference: number,
    warmthScore: number,
    coolnessScore: number,
    sampleSize: number
  ): number {
    // Base confidence on how far from neutral threshold
    const distanceFromNeutral = Math.abs(baDifference);
    const thresholdConfidence = Math.min(100, distanceFromNeutral * 20);
    
    // Factor in the consistency of warmth/coolness scores
    const scoreConsistency = Math.abs(warmthScore - coolnessScore);
    const consistencyConfidence = scoreConsistency;
    
    // Factor in sample size
    const sampleConfidence = Math.min(100, (sampleSize / 20) * 100);
    
    // Combine all factors
    const overallConfidence = (
      thresholdConfidence * 0.5 +
      consistencyConfidence * 0.3 +
      sampleConfidence * 0.2
    );
    
    return Math.max(0, Math.min(100, overallConfidence));
  }

  private generateIndicators(lab: LAB): {
    veinColor: 'Greenish' | 'Bluish' | 'Mixed';
    jewelryPreference: 'Gold' | 'Silver' | 'Both';
    sunReaction: 'Tans' | 'Burns' | 'Both';
  } {
    // Vein color based on undertone
    const baDiff = lab.b - lab.a;
    let veinColor: 'Greenish' | 'Bluish' | 'Mixed';
    
    if (baDiff > 5) {
      veinColor = 'Greenish'; // Warm undertones
    } else if (baDiff < -5) {
      veinColor = 'Bluish'; // Cool undertones
    } else {
      veinColor = 'Mixed'; // Neutral undertones
    }

    // Jewelry preference based on undertone
    let jewelryPreference: 'Gold' | 'Silver' | 'Both';
    
    if (lab.a > lab.b + 2) {
      jewelryPreference = 'Gold'; // Warm undertones
    } else if (lab.b > lab.a + 2) {
      jewelryPreference = 'Silver'; // Cool undertones
    } else {
      jewelryPreference = 'Both'; // Neutral undertones
    }

    // Sun reaction based on overall skin characteristics
    let sunReaction: 'Tans' | 'Burns' | 'Both';
    
    if (lab.l > 60) {
      sunReaction = 'Burns'; // Lighter skin
    } else if (lab.l < 40) {
      sunReaction = 'Tans'; // Darker skin
    } else {
      sunReaction = 'Both'; // Medium skin
    }

    return {
      veinColor,
      jewelryPreference,
      sunReaction,
    };
  }

  public getUndertoneDescription(undertone: Undertone): string {
    const descriptions = {
      Warm: 'Your skin has yellow, golden, or peachy undertones. Gold jewelry and warm colors complement your skin best.',
      Cool: 'Your skin has pink, red, or blue undertones. Silver jewelry and cool colors complement your skin best.',
      Neutral: 'Your skin has a balanced mix of warm and cool undertones. Both gold and silver jewelry work well with your skin tone.',
    };

    return descriptions[undertone];
  }

  public getColorPaletteRecommendations(undertone: Undertone): {
    bestColors: string[];
    avoidColors: string[];
    makeup: {
      foundation: string[];
      blush: string[];
      lipstick: string[];
      eyeshadow: string[];
    };
  } {
    const palettes = {
      Warm: {
        bestColors: [
          'Coral', 'Peach', 'Terracotta', 'Olive', 'Cream', 'Gold',
          'Warm Brown', 'Mustard', 'Burnt Orange', 'Khaki'
        ],
        avoidColors: [
          'Icy Blue', 'Pure White', 'Fuchsia', 'Hot Pink', 'Silver'
        ],
        makeup: {
          foundation: ['Golden Beige', 'Honey', 'Caramel', 'Warm Ivory'],
          blush: ['Peach', 'Coral', 'Warm Pink', 'Terracotta'],
          lipstick: ['Coral', 'Peach', 'Warm Red', 'Nude'],
          eyeshadow: ['Bronze', 'Gold', 'Copper', 'Warm Brown'],
        },
      },
      Cool: {
        bestColors: [
          'Royal Blue', 'Emerald', 'Purple', 'Pink', 'Silver', 'Gray',
          'Icy Blue', 'Ruby', 'Lavender', 'Navy'
        ],
        avoidColors: [
          'Orange', 'Olive', 'Mustard', 'Terracotta', 'Gold'
        ],
        makeup: {
          foundation: ['Porcelain', 'Ivory', 'Cool Beige', 'Rose'],
          blush: ['Rose', 'Pink', 'Berry', 'Cool Plum'],
          lipstick: ['Berry', 'Rose', 'Cool Red', 'Plum'],
          eyeshadow: ['Silver', 'Gray', 'Purple', 'Cool Blue'],
        },
      },
      Neutral: {
        bestColors: [
          'Navy', 'Burgundy', 'Forest Green', 'Taupe', 'White', 'Black',
          'Gray', 'Dusty Rose', 'Sage', 'Mauve'
        ],
        avoidColors: [
          'Extreme neons', 'Overly warm oranges', 'Icy pastels'
        ],
        makeup: {
          foundation: ['Neutral Beige', 'Natural', 'Buff', 'Medium'],
          blush: ['Neutral Pink', 'Mauve', 'Dusty Rose', 'Soft Peach'],
          lipstick: ['Neutral Red', 'Mauve', 'Berry', 'Nude'],
          eyeshadow: ['Taupe', 'Brown', 'Mauve', 'Soft Gray'],
        },
      },
    };

    return palettes[undertone];
  }

  public validateUndertoneResult(result: UndertoneResult): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check confidence
    if (result.confidence < 50) {
      issues.push('Low confidence in undertone detection');
    }

    // Check analysis values
    if (result.analysis.warmthScore < 0 || result.analysis.warmthScore > 100) {
      issues.push('Invalid warmth score');
    }

    if (result.analysis.coolnessScore < 0 || result.analysis.coolnessScore > 100) {
      issues.push('Invalid coolness score');
    }

    if (result.analysis.neutralityScore < 0 || result.analysis.neutralityScore > 100) {
      issues.push('Invalid neutrality score');
    }

    // Check consistency between scores
    const totalScore = result.analysis.warmthScore + result.analysis.coolnessScore;
    if (Math.abs(totalScore - 100) > 10) {
      issues.push('Inconsistent warmth/coolness scores');
    }

    // Check undertone consistency with analysis
    const expectedUndertone = this.determineUndertone(
      result.analysis.baDifference,
      this.defaultThresholds
    );

    if (expectedUndertone !== result.undertone) {
      issues.push('Undertone classification inconsistent with analysis');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  public compareUndertones(result1: UndertoneResult, result2: UndertoneResult): {
    match: boolean;
    similarity: number;
    difference: {
      baDifference: number;
      warmthScore: number;
      coolnessScore: number;
    };
  } {
    const match = result1.undertone === result2.undertone;
    
    const baDiff = Math.abs(result1.analysis.baDifference - result2.analysis.baDifference);
    const warmthDiff = Math.abs(result1.analysis.warmthScore - result2.analysis.warmthScore);
    const coolDiff = Math.abs(result1.analysis.coolnessScore - result2.analysis.coolnessScore);
    
    // Calculate overall similarity (0-100)
    const avgDifference = (baDiff + warmthDiff + coolDiff) / 3;
    const similarity = Math.max(0, 100 - avgDifference);

    return {
      match,
      similarity,
      difference: {
        baDifference: baDiff,
        warmthScore: warmthDiff,
        coolnessScore: coolDiff,
      },
    };
  }
}
