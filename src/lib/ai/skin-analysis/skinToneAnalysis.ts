import { LAB } from './colorConversion';
import { LABStatistics, StatisticalResult } from './labStatistics';

export type SkinTone = 'Fair' | 'Light' | 'Medium' | 'Tan' | 'Deep';

export interface SkinToneResult {
  skinTone: SkinTone;
  labValues: LAB;
  confidence: number;
  classification: {
    primary: SkinTone;
    secondary?: SkinTone;
    score: number;
  };
  metadata: {
    FitzpatrickType?: number;
    warmthLevel: number;
    brightness: number;
  };
}

export interface RegionWeights {
  leftCheek: number;
  rightCheek: number;
  forehead: number;
  nose: number;
  chin: number;
}

export class SkinToneAnalysis {
  private readonly defaultWeights: RegionWeights = {
    leftCheek: 0.40,
    rightCheek: 0.40,
    forehead: 0.10,
    nose: 0.05,
    chin: 0.05,
  };

  private readonly skinToneRanges = {
    Fair: { min: 75, max: 100 },
    Light: { min: 60, max: 75 },
    Medium: { min: 45, max: 60 },
    Tan: { min: 30, max: 45 },
    Deep: { min: 0, max: 30 },
  };

  public analyzeSkinTone(
    regionStats: {
      leftCheek: StatisticalResult;
      rightCheek: StatisticalResult;
      forehead: StatisticalResult;
      nose: StatisticalResult;
      chin: StatisticalResult;
    },
    weights: Partial<RegionWeights> = {}
  ): SkinToneResult {
    const finalWeights = { ...this.defaultWeights, ...weights };
    
    // Calculate weighted average of region values
    const globalLAB = this.calculateGlobalSkinColor(regionStats, finalWeights);
    
    // Classify skin tone
    const classification = this.classifySkinTone(globalLAB);
    
    // Calculate confidence based on consistency across regions
    const confidence = this.calculateToneConfidence(regionStats, globalLAB);
    
    // Estimate Fitzpatrick type
    const fitzpatrickType = this.estimateFitzpatrickType(globalLAB);
    
    // Calculate warmth level
    const warmthLevel = this.calculateWarmthLevel(globalLAB);

    return {
      skinTone: classification.primary,
      labValues: globalLAB,
      confidence,
      classification,
      metadata: {
        FitzpatrickType: fitzpatrickType,
        warmthLevel,
        brightness: globalLAB.l,
      },
    };
  }

  private calculateGlobalSkinColor(
    regionStats: {
      leftCheek: StatisticalResult;
      rightCheek: StatisticalResult;
      forehead: StatisticalResult;
      nose: StatisticalResult;
      chin: StatisticalResult;
    },
    weights: RegionWeights
  ): LAB {
    // 🛡️ BULLETPROOF: Validate all region data before processing
    const regions = ['leftCheek', 'rightCheek', 'forehead', 'nose', 'chin'] as const;
    
    for (const region of regions) {
      const regionData = regionStats[region];
      if (!regionData || !regionData.trimmedMean || 
          regionData.trimmedMean.l === undefined || 
          regionData.trimmedMean.a === undefined || 
          regionData.trimmedMean.b === undefined) {
        console.warn(`🚫 Invalid region data for ${region}, using fallback values`);
        // Return safe default values instead of crashing
        return { l: 60, a: 15, b: 15 }; // Neutral fallback
      }
    }
    
    // Use trimmed means for stability
    const weightedSum = {
      l: 0,
      a: 0,
      b: 0,
    };

    weightedSum.l += regionStats.leftCheek.trimmedMean.l * weights.leftCheek;
    weightedSum.a += regionStats.leftCheek.trimmedMean.a * weights.leftCheek;
    weightedSum.b += regionStats.leftCheek.trimmedMean.b * weights.leftCheek;

    weightedSum.l += regionStats.rightCheek.trimmedMean.l * weights.rightCheek;
    weightedSum.a += regionStats.rightCheek.trimmedMean.a * weights.rightCheek;
    weightedSum.b += regionStats.rightCheek.trimmedMean.b * weights.rightCheek;

    weightedSum.l += regionStats.forehead.trimmedMean.l * weights.forehead;
    weightedSum.a += regionStats.forehead.trimmedMean.a * weights.forehead;
    weightedSum.b += regionStats.forehead.trimmedMean.b * weights.forehead;

    weightedSum.l += regionStats.nose.trimmedMean.l * weights.nose;
    weightedSum.a += regionStats.nose.trimmedMean.a * weights.nose;
    weightedSum.b += regionStats.nose.trimmedMean.b * weights.nose;

    weightedSum.l += regionStats.chin.trimmedMean.l * weights.chin;
    weightedSum.a += regionStats.chin.trimmedMean.a * weights.chin;
    weightedSum.b += regionStats.chin.trimmedMean.b * weights.chin;

    return {
      l: weightedSum.l,
      a: weightedSum.a,
      b: weightedSum.b,
    };
  }

  private classifySkinTone(lab: LAB): {
    primary: SkinTone;
    secondary?: SkinTone;
    score: number;
  } {
    const l = lab.l;
    
    // Find primary skin tone
    let primary: SkinTone = 'Medium';
    let primaryScore = 0;

    for (const [tone, range] of Object.entries(this.skinToneRanges)) {
      if (l >= range.min && l <= range.max) {
        primary = tone as SkinTone;
        // Calculate how centered the value is in the range
        const rangeCenter = (range.min + range.max) / 2;
        const rangeWidth = range.max - range.min;
        primaryScore = 1 - Math.abs(l - rangeCenter) / (rangeWidth / 2);
        break;
      }
    }

    // Find secondary tone (closest adjacent tone)
    let secondary: SkinTone | undefined;
    let secondaryScore = 0;

    const tones = Object.keys(this.skinToneRanges) as SkinTone[];
    const primaryIndex = tones.indexOf(primary);

    if (primaryIndex > 0) {
      const lowerTone = tones[primaryIndex - 1];
      const lowerRange = this.skinToneRanges[lowerTone];
      if (l <= lowerRange.max) {
        secondary = lowerTone;
        secondaryScore = 1 - (lowerRange.max - l) / (lowerRange.max - lowerRange.min);
      }
    }

    if (primaryIndex < tones.length - 1) {
      const upperTone = tones[primaryIndex + 1];
      const upperRange = this.skinToneRanges[upperTone];
      if (l >= upperRange.min) {
        const upperScore = 1 - (l - upperRange.min) / (upperRange.max - upperRange.min);
        if (upperScore > secondaryScore) {
          secondary = upperTone;
          secondaryScore = upperScore;
        }
      }
    }

    return {
      primary,
      secondary: secondaryScore > 0.3 ? secondary : undefined,
      score: primaryScore,
    };
  }

  private calculateToneConfidence(
    regionStats: {
      leftCheek: StatisticalResult;
      rightCheek: StatisticalResult;
      forehead: StatisticalResult;
      nose: StatisticalResult;
      chin: StatisticalResult;
    },
    globalLAB: LAB
  ): number {
    // Calculate consistency across regions
    const regions = Object.values(regionStats);
    const labValues = regions.map(stats => stats.trimmedMean);
    
    // Calculate standard deviation across regions
    const meanL = labValues.reduce((sum, lab) => sum + lab.l, 0) / labValues.length;
    const meanA = labValues.reduce((sum, lab) => sum + lab.a, 0) / labValues.length;
    const meanB = labValues.reduce((sum, lab) => sum + lab.b, 0) / labValues.length;
    
    const varianceL = labValues.reduce((sum, lab) => sum + Math.pow(lab.l - meanL, 2), 0) / labValues.length;
    const varianceA = labValues.reduce((sum, lab) => sum + Math.pow(lab.a - meanA, 2), 0) / labValues.length;
    const varianceB = labValues.reduce((sum, lab) => sum + Math.pow(lab.b - meanB, 2), 0) / labValues.length;
    
    const avgVariance = (varianceL + varianceA + varianceB) / 3;
    
    // Lower variance = higher confidence
    const consistencyScore = Math.max(0, 100 - avgVariance * 2);
    
    // Factor in sample sizes
    const minSampleSize = Math.min(...regions.map(stats => stats.sampleSize));
    const sampleScore = Math.min(100, (minSampleSize / 12) * 100); // Assuming minimum 12 samples
    
    // Combine scores
    const overallConfidence = (consistencyScore * 0.7) + (sampleScore * 0.3);
    
    return Math.max(0, Math.min(100, overallConfidence));
  }

  private estimateFitzpatrickType(lab: LAB): number {
    const l = lab.l;
    const b = lab.b;
    
    // Simplified Fitzpatrick estimation based on L and B values
    if (l > 75 && b > 10) return 1; // Very fair skin, always burns
    if (l > 65 && b > 8) return 2; // Fair skin, usually burns
    if (l > 55 && b > 6) return 3; // Medium skin, sometimes burns
    if (l > 45 && b > 4) return 4; // Olive skin, rarely burns
    if (l > 30 && b > 2) return 5; // Brown skin, very rarely burns
    return 6; // Dark brown skin, never burns
  }

  private calculateWarmthLevel(lab: LAB): number {
    // Warmth based on A and B channels
    // Positive A = red, Positive B = yellow
    const warmth = (lab.a + lab.b) / 2;
    
    // Normalize to -100 to 100 scale
    // Negative = cool, Positive = warm
    return Math.max(-100, Math.min(100, warmth));
  }

  public getSkinToneDescription(skinTone: SkinTone): string {
    const descriptions = {
      Fair: 'Very light skin that burns easily in the sun',
      Light: 'Light skin that may burn with prolonged sun exposure',
      Medium: 'Medium skin tone that tans more easily than it burns',
      Tan: 'Tan or olive skin that rarely burns',
      Deep: 'Deep skin tone that very rarely burns',
    };

    return descriptions[skinTone];
  }

  public getMakeupRecommendations(skinTone: SkinTone, warmthLevel: number): {
    foundation: string[];
    blush: string[];
    lipstick: string[];
    eyeshadow: string[];
  } {
    const recommendations = {
      Fair: {
        foundation: ['Ivory', 'Porcelain', 'Alabaster'],
        blush: ['Pink', 'Rose', 'Peach'],
        lipstick: ['Pink', 'Coral', 'Nude'],
        eyeshadow: ['Taupe', 'Soft Brown', 'Champagne'],
      },
      Light: {
        foundation: ['Beige', 'Natural', 'Vanilla'],
        blush: ['Peach', 'Coral', 'Warm Pink'],
        lipstick: ['Peach', 'Rose', 'Mauve'],
        eyeshadow: ['Bronze', 'Gold', 'Warm Brown'],
      },
      Medium: {
        foundation: ['Medium Beige', 'Honey', 'Golden'],
        blush: ['Warm Peach', 'Bronze', 'Terracotta'],
        lipstick: ['Coral', 'Berry', 'Caramel'],
        eyeshadow: ['Copper', 'Bronze', 'Warm Brown'],
      },
      Tan: {
        foundation: ['Tan', 'Caramel', 'Golden Tan'],
        blush: ['Bronze', 'Terracotta', 'Warm Brown'],
        lipstick: ['Terracotta', 'Bronze', 'Spice'],
        eyeshadow: ['Bronze', 'Copper', 'Gold'],
      },
      Deep: {
        foundation: ['Deep Tan', 'Cocoa', 'Espresso'],
        blush: ['Berry', 'Plum', 'Deep Bronze'],
        lipstick: ['Berry', 'Plum', 'Chocolate'],
        eyeshadow: ['Bronze', 'Gold', 'Purple'],
      },
    };

    // Adjust recommendations based on warmth level
    const baseRecs = recommendations[skinTone];
    
    if (warmthLevel < -20) {
      // Cool undertones - add cool options
      baseRecs.blush.push('Cool Pink', 'Berry');
      baseRecs.lipstick.push('Berry', 'Plum');
    } else if (warmthLevel > 20) {
      // Warm undertones - emphasize warm options
      baseRecs.blush.push('Warm Peach', 'Bronze');
      baseRecs.lipstick.push('Coral', 'Terracotta');
    }

    return baseRecs;
  }

  public validateSkinToneResult(result: SkinToneResult): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check confidence
    if (result.confidence < 60) {
      issues.push('Low confidence in skin tone classification');
    }

    // Check LAB values
    if (result.labValues.l < 0 || result.labValues.l > 100) {
      issues.push('Invalid L value (brightness)');
    }

    if (result.labValues.a < -128 || result.labValues.a > 127) {
      issues.push('Invalid A value (red-green axis)');
    }

    if (result.labValues.b < -128 || result.labValues.b > 127) {
      issues.push('Invalid B value (yellow-blue axis)');
    }

    // Check classification consistency
    const expectedTone = this.classifySkinTone(result.labValues);
    if (expectedTone.primary !== result.skinTone) {
      issues.push('Inconsistent skin tone classification');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }
}
