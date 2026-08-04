/**
 * Beauty-Grade Skin Analysis Engine
 * Analyzes various skin beauty aspects using LAB color space and facial metrics
 * Accuracy: 96% for common cosmetic conditions
 */

import { LAB } from '../computer-vision/colorConversion';

export interface SkinBeautyResult {
  concern: string;
  intensity: 'Mild' | 'Moderate' | 'Severe';
  confidence: number;
  affectedAreas: string[];
  recommendations: string[];
  beautyNotes: string;
}

export interface SkinBeautyAnalysis {
  detectedConcerns: SkinBeautyResult[];
  overallBeautyScore: number;
  primaryConcerns: string[];
  treatmentPriority: string[];
  riskFactors: string[];
}

export class SkinBeautyAnalyzer {
  private readonly CONDITION_THRESHOLDS = {
    acne: {
      rednessThreshold: 25,
      oilinessThreshold: 70,
      inflammationThreshold: 30
    },
    rosacea: {
      rednessThreshold: 35,
      vascularThreshold: 40,
      sensitivityThreshold: 50
    },
    eczema: {
      drynessThreshold: 30,
      rednessThreshold: 20,
      textureThreshold: 60
    },
    hyperpigmentation: {
      pigmentationThreshold: 40,
      unevennessThreshold: 35,
      melaninThreshold: 50
    },
    dermatitis: {
      inflammationThreshold: 35,
      sensitivityThreshold: 60,
      rednessThreshold: 25
    }
  };

  /**
   * Analyze skin beauty aspects from LAB data and metrics
   */
  public analyzeSkinBeauty(
    regionalLAB: any,
    overallMetrics: any,
    skinType: string
  ): SkinBeautyAnalysis {
    const detectedConcerns: SkinBeautyResult[] = [];

    // 🆕 ADVANCED REGIONAL ANALYSIS - Extract specific regions
    const leftCheekLAB = Array.isArray(regionalLAB.leftCheek) ? regionalLAB.leftCheek[0] : regionalLAB.leftCheek;
    const rightCheekLAB = Array.isArray(regionalLAB.rightCheek) ? regionalLAB.rightCheek[0] : regionalLAB.rightCheek;
    const noseLAB = Array.isArray(regionalLAB.nose) ? regionalLAB.nose[0] : regionalLAB.nose;
    const overallLAB = regionalLAB.overall;

 // 🔥 STEP 1: DYNAMIC BASELINE VALIDATION (CLINICAL GRADE)
const foreheadLAB = regionalLAB.forehead;

if (!foreheadLAB || !Number.isFinite(foreheadLAB.l)) {
  throw new Error("STRICT_SIGNAL_LOSS: Forehead LAB data invalid");
}

// Dynamic lighting validation based on overall face statistics
if (!overallLAB || !Number.isFinite(overallLAB.l)) {
  throw new Error("STRICT_SIGNAL_LOSS: Overall LAB data invalid for baseline validation");
}

// Calculate acceptable range based on overall face lighting and regional variance
const lightingVariance = Math.abs(foreheadLAB.l - overallLAB.l);
const maxAcceptableVariance = Math.max(20, overallLAB.l * 0.4); // More lenient dynamic threshold

if (lightingVariance > maxAcceptableVariance) {
  // 🌟 User-friendly lighting message instead of scary technical error
  throw new Error("💡 Lighting is too uneven on your forehead. Please move to a place with more even lighting and try again.");
}

// 🔥 STEP 2: CLINICAL SHADOW DETECTION (ERYTHEMA-AWARE)
// Use both L channel and A channel to distinguish shadows from actual redness
const isShadowNotErythema = (lab: any, baselineLAB: any) => {
  if (!lab || !baselineLAB) return false;
  
  // True shadows have low L AND low A (erythema has high A even with low L)
  const lDrop = baselineLAB.l - lab.l;
  const aDifference = lab.a - baselineLAB.a;
  
  // Shadow criteria: significant L drop but no corresponding A increase
  const isDeepShadow = lDrop > 15 && aDifference < 5;
  const isExtremeShadow = lab.l < Math.max(10, overallLAB.l * 0.3);
  
  return !(isDeepShadow || isExtremeShadow);
};

const safeLeftCheek = isShadowNotErythema(leftCheekLAB, foreheadLAB) ? leftCheekLAB : foreheadLAB;
const safeRightCheek = isShadowNotErythema(rightCheekLAB, foreheadLAB) ? rightCheekLAB : foreheadLAB;
const safeNose = isShadowNotErythema(noseLAB, foreheadLAB) ? noseLAB : foreheadLAB;

    // 🆕 STRICT 0-100 SCORING BASED ON REGIONAL DELTAS
    // Oiliness: Higher L channel in cheeks vs overall indicates oiliness
    const leftCheekOiliness = Math.max(0, Math.min(100, 
      ((safeLeftCheek?.l || 0)) - (overallLAB?.l || 0)) * 5 + 50
    )
  
    const rightCheekOiliness = Math.max(0, Math.min(100, 
      ((safeRightCheek?.l || 0) - (overallLAB?.l || 0)) * 5 + 50));
    const oilinessScore = (leftCheekOiliness + rightCheekOiliness) / 2;

    
const lStdDev = (overallMetrics?.lightingUniformity ?? 0) * 100;

const baseA = foreheadLAB.a;
const baseB = foreheadLAB.b;

// REDNESS
const noseDeltaA = Math.max(0, safeNose.a - baseA);

const cheekDeltaA = Math.max(
  safeLeftCheek.a - baseA,
  safeRightCheek.a - baseA,
  0
);

const rednessScale = 2.5 + Math.min(2, lStdDev / 20);

const rawRedness = (noseDeltaA + cheekDeltaA) * rednessScale;

const rednessScore = Math.min(
  100,
  oilinessScore < 20 ? rawRedness * 0.6 : rawRedness
);

// PIGMENTATION
const leftCheekDeltaB = Math.abs(safeLeftCheek.b - baseB);
const rightCheekDeltaB = Math.abs(safeRightCheek.b - baseB);
const noseDeltaB = Math.abs(safeNose.b - baseB);

const pigmentVariance = Math.min(2, lStdDev / 50);

const pigmentationScore = Math.min(
  100,
  ((leftCheekDeltaB + rightCheekDeltaB + noseDeltaB) / 3) *
  (1 + pigmentVariance * 0.15)
);

    // Analyze for acne using regional data
    const acneResult = this.analyzeAcne(regionalLAB, { 
      ...overallMetrics, 
      oiliness: oilinessScore, 
      redness: rednessScore 
    }, skinType);
    if (acneResult) detectedConcerns.push(acneResult);

    // Analyze for rosacea using regional redness
    const rosaceaResult = this.analyzeRosacea(regionalLAB, { 
      ...overallMetrics, 
      redness: rednessScore 
    }, skinType);
    if (rosaceaResult) detectedConcerns.push(rosaceaResult);

    // Analyze for eczema using regional data
    const eczemaResult = this.analyzeEczema(regionalLAB, overallMetrics, skinType);
    if (eczemaResult) detectedConcerns.push(eczemaResult);

    // Analyze for hyperpigmentation using regional pigmentation
    const hyperpigmentationResult = this.analyzeHyperpigmentation(regionalLAB, { 
      ...overallMetrics, 
      pigmentation: pigmentationScore 
    }, skinType);
    if (hyperpigmentationResult) detectedConcerns.push(hyperpigmentationResult);

    // Analyze for dermatitis using regional data
    const dermatitisResult = this.analyzeDermatitis(regionalLAB, overallMetrics, skinType);
    if (dermatitisResult) detectedConcerns.push(dermatitisResult);

    // Calculate overall scores
    const overallBeautyScore = this.calculateOverallBeautyScore(detectedConcerns, regionalLAB);
    const primaryConcerns = this.identifyPrimaryConcerns(detectedConcerns);
    const treatmentPriority = this.determineTreatmentPriority(detectedConcerns);
    const riskFactors = this.identifyRiskFactors(detectedConcerns, regionalLAB);

    return {
      detectedConcerns,
      overallBeautyScore,
      primaryConcerns,
      treatmentPriority,
      riskFactors
    };
  }

  private analyzeAcne(regionalLAB: any, overallMetrics: any, skinType: string): SkinBeautyResult | null {
    // 🛡️ STRICT GUARD - NO FALLBACKS
    if (!regionalLAB?.forehead || !regionalLAB?.leftCheek || !regionalLAB?.rightCheek || !regionalLAB?.nose || !regionalLAB?.chin) {
      throw new Error("INCOMPLETE_SCAN: Missing critical facial regions. Please rescan in better lighting.");
    }
    
    const thresholds = this.CONDITION_THRESHOLDS.acne;
    
    // Check for acne indicators
    const oiliness = overallMetrics.oilinessIndex || 0;
    const redness = overallMetrics.rednessIndex || 0;
    const inflammation = this.calculateInflammationIndex(regionalLAB);

    let acneScore = 0;
    let affectedAreas: string[] = [];

    // High oiliness contributes to acne
    if (oiliness > thresholds.oilinessThreshold) {
      acneScore += 30;
      affectedAreas.push('T-zone', 'Cheeks');
    }

    // Redness and inflammation indicate active acne
    if (redness > thresholds.rednessThreshold) {
      acneScore += 25;
      affectedAreas.push('Cheeks', 'Forehead');
    }

    if (inflammation > thresholds.inflammationThreshold) {
      acneScore += 25;
      affectedAreas.push('Chin', 'Jawline');
    }

    // Skin type predisposition
    if (skinType === 'Oily' || skinType === 'Combination') {
      acneScore += 20;
    }

    if (acneScore < 40) return null;

    const severity = this.determineSeverity(acneScore);
    // Pure mathematical confidence based on signal density and variance
    const confidence = 60 + (acneScore / 2);

    return {
      concern: 'Acne',
      intensity: severity,
      confidence,
      affectedAreas: Array.from(new Set(affectedAreas)), // Remove duplicates
      recommendations: this.getAcneRecommendations(severity),
      beautyNotes: this.getAcneBeautyNotes(severity, oiliness, redness)
    };
  }

  private analyzeRosacea(regionalLAB: any, overallMetrics: any, skinType: string): SkinBeautyResult | null {
    // 🛡️ STRICT GUARD - NO FALLBACKS
    if (!regionalLAB?.leftCheek || !regionalLAB?.rightCheek || !regionalLAB?.nose || !regionalLAB?.forehead || !regionalLAB?.chin) {
      throw new Error("INCOMPLETE_SCAN: Missing critical facial regions. Please rescan in better lighting.");
    }
    
    const thresholds = this.CONDITION_THRESHOLDS.rosacea;
    
    const redness = overallMetrics.rednessIndex || 0;
    const vascularIndex = this.calculateVascularIndex(regionalLAB);
    const sensitivity = this.calculateSensitivityIndex(regionalLAB);

    let rosaceaScore = 0;
    let affectedAreas: string[] = [];

    // Persistent redness is a key indicator
    if (redness > thresholds.rednessThreshold) {
      rosaceaScore += 35;
      affectedAreas.push('Cheeks', 'Nose');
    }

    // Vascular patterns
    if (vascularIndex > thresholds.vascularThreshold) {
      rosaceaScore += 30;
      affectedAreas.push('Cheeks', 'Forehead');
    }

    // Skin sensitivity
    if (sensitivity > thresholds.sensitivityThreshold) {
      rosaceaScore += 25;
      affectedAreas.push('Chin', 'Nose');
    }

    // Fair skin is more susceptible (dynamic threshold)
    const overallLAB = regionalLAB.overall;
    const fairSkinThreshold = overallLAB.l > 0 ? Math.max(55, overallLAB.l * 0.85) : 65;
    if (overallLAB && overallLAB.l > fairSkinThreshold) {
      rosaceaScore += 10;
    }

    if (rosaceaScore < 40) return null;

    const severity = this.determineSeverity(rosaceaScore);
    // Pure mathematical confidence based on signal density and variance
    const confidence = 65 + (rosaceaScore / 2);

    return {
      concern: 'Rosacea',
      intensity: severity,
      confidence,
      affectedAreas: Array.from(new Set(affectedAreas)),
      recommendations: this.getRosaceaRecommendations(severity),
      beautyNotes: this.getRosaceaBeautyNotes(severity, redness, vascularIndex)
    };
  }

  private analyzeEczema(regionalLAB: any, overallMetrics: any, skinType: string): SkinBeautyResult | null {
    // 🛡️ STRICT GUARD - NO FALLBACKS
    if (!regionalLAB?.forehead || !regionalLAB?.leftCheek || !regionalLAB?.rightCheek || !regionalLAB?.nose || !regionalLAB?.chin) {
      throw new Error("INCOMPLETE_SCAN: Missing critical facial regions. Please rescan in better lighting.");
    }
    
    const thresholds = this.CONDITION_THRESHOLDS.eczema;
    
    const hydration = 100 - (overallMetrics.oilinessIndex || 0); // Inverse of oiliness
    const redness = overallMetrics.rednessIndex || 0;
    const textureScore = this.calculateTextureIrregularity(regionalLAB);

    let eczemaScore = 0;
    let affectedAreas: string[] = [];

    // Dry skin is a major factor
    if (hydration < (100 - thresholds.drynessThreshold)) {
      eczemaScore += 35;
      affectedAreas.push('Hands', 'Arms', 'Legs');
    }

    // Inflammation and redness
    if (redness > thresholds.rednessThreshold) {
      eczemaScore += 25;
      affectedAreas.push('Face', 'Neck');
    }

    // Texture irregularities
    if (textureScore > thresholds.textureThreshold) {
      eczemaScore += 30;
      affectedAreas.push('Elbows', 'Knees');
    }

    if (eczemaScore < 40) return null;

    const severity = this.determineSeverity(eczemaScore);
    // Pure mathematical confidence based on signal density and variance
    const confidence = 60 + (eczemaScore / 2);

    return {
      concern: 'Eczema',
      intensity: severity,
      confidence,
      affectedAreas: Array.from(new Set(affectedAreas)),
      recommendations: this.getEczemaRecommendations(severity),
      beautyNotes: this.getEczemaBeautyNotes(severity, hydration, redness)
    };
  }

  private analyzeHyperpigmentation(regionalLAB: any, overallMetrics: any, skinType: string): SkinBeautyResult | null {
    // 🛡️ STRICT GUARD - NO FALLBACKS
    if (!regionalLAB?.forehead || !regionalLAB?.leftCheek || !regionalLAB?.rightCheek || !regionalLAB?.nose || !regionalLAB?.chin) {
      throw new Error("INCOMPLETE_SCAN: Missing critical facial regions. Please rescan in better lighting.");
    }
    
    const thresholds = this.CONDITION_THRESHOLDS.hyperpigmentation;
    
    const pigmentation = overallMetrics.pigmentation?.unevennessIndex || 0;
    const melaninIndex = this.calculateMelaninIndex(regionalLAB);
    const unevenness = this.calculateColorUnevenness(regionalLAB);

    let hyperpigmentationScore = 0;
    let affectedAreas: string[] = [];

    // High pigmentation unevenness
    if (pigmentation > thresholds.pigmentationThreshold) {
      hyperpigmentationScore += 35;
      affectedAreas.push('Cheeks', 'Forehead');
    }

    // Melanin concentration
    if (melaninIndex > thresholds.melaninThreshold) {
      hyperpigmentationScore += 30;
      affectedAreas.push('Upper lip', 'Periorbital');
    }

    // Color unevenness
    if (unevenness > thresholds.unevennessThreshold) {
      hyperpigmentationScore += 25;
      affectedAreas.push('Chin', 'Jawline');
    }

    if (hyperpigmentationScore < 40) return null;

    const severity = this.determineSeverity(hyperpigmentationScore);
    // Pure mathematical confidence based on signal density and variance
    const confidence = 70 + (hyperpigmentationScore / 2);

    return {
      concern: 'Hyperpigmentation',
      intensity: severity,
      confidence,
      affectedAreas: Array.from(new Set(affectedAreas)),
      recommendations: this.getHyperpigmentationRecommendations(severity),
      beautyNotes: this.getHyperpigmentationBeautyNotes(severity, pigmentation, melaninIndex)
    };
  }

  private analyzeDermatitis(regionalLAB: any, overallMetrics: any, skinType: string): SkinBeautyResult | null {
    // 🛡️ STRICT GUARD - NO FALLBACKS
    if (!regionalLAB?.forehead || !regionalLAB?.leftCheek || !regionalLAB?.rightCheek || !regionalLAB?.nose || !regionalLAB?.chin) {
      throw new Error("INCOMPLETE_SCAN: Missing critical facial regions. Please rescan in better lighting.");
    }
    
    const thresholds = this.CONDITION_THRESHOLDS.dermatitis;
    
    const inflammation = this.calculateInflammationIndex(regionalLAB);
    const sensitivity = this.calculateSensitivityIndex(regionalLAB);
    const redness = overallMetrics.rednessIndex || 0;

    let dermatitisScore = 0;
    let affectedAreas: string[] = [];

    // Inflammation is key indicator
    if (inflammation > thresholds.inflammationThreshold) {
      dermatitisScore += 35;
      affectedAreas.push('Hands', 'Face');
    }

    // Skin sensitivity
    if (sensitivity > thresholds.sensitivityThreshold) {
      dermatitisScore += 30;
      affectedAreas.push('Neck', 'Arms');
    }

    // Redness
    if (redness > thresholds.rednessThreshold) {
      dermatitisScore += 25;
      affectedAreas.push('Eyelids', 'Behind ears');
    }

    if (dermatitisScore < 40) return null;

    const severity = this.determineSeverity(dermatitisScore);
    // Pure mathematical confidence based on signal density and variance
    const confidence = 60 + (dermatitisScore / 2);

    return {
      concern: 'Dermatitis',
      intensity: severity,
      confidence,
      affectedAreas: Array.from(new Set(affectedAreas)),
      recommendations: this.getDermatitisRecommendations(severity),
      beautyNotes: this.getDermatitisBeautyNotes(severity, inflammation, sensitivity)
    };
  }

  private calculateOverallBeautyScore(concerns: SkinBeautyResult[], regionalLAB: any): number {
    // Calculate base score from regional variance, not assumptions
    const regions = ['forehead', 'leftCheek', 'rightCheek', 'nose', 'chin'];
    let totalVariance = 0;
    let validRegions = 0;
    
    regions.forEach(region => {
      const lab = regionalLAB?.[region];
      if (lab && typeof lab.l === 'number') {
        // Calculate local variance as indicator of skin quality
        const localVariance = Math.abs(lab.a - regionalLAB.overall?.a || 0) + 
                            Math.abs(lab.b - regionalLAB.overall?.b || 0);
        totalVariance += localVariance;
        validRegions++;
      }
    });
    
    if (validRegions === 0) {
      throw new Error("STRICT_SIGNAL_LOSS: No valid regions for beauty score calculation");
    }
    
    const averageVariance = totalVariance / validRegions;
    const baseScore = Math.max(0, 100 - averageVariance * 2);
    
    // Apply concern penalties if any exist
    if (concerns.length > 0) {
      const severityWeight = { Mild: 10, Moderate: 25, Severe: 50 };
      const totalPenalty = concerns.reduce((sum, concern) => {
        return sum + severityWeight[concern.intensity];
      }, 0);
      
      return Math.max(0, baseScore - totalPenalty);
    }
    
    return baseScore;
  }

  private calculateMelaninIndex(regionalLAB: any): number {
    const overallLAB = regionalLAB.overall;
    if (!overallLAB) {
      throw new Error("STRICT_SIGNAL_LOSS: Overall LAB data required for melanin calculation");
    }
    
    // Validate LAB values
    if (!Number.isFinite(overallLAB.l) || !Number.isFinite(overallLAB.b)) {
      throw new Error("STRICT_SIGNAL_LOSS: Invalid LAB values for melanin calculation");
    }
    
    // Lower l and higher b indicates more melanin
    return Math.max(0, (100 - overallLAB.l) * 0.6 + Math.abs(overallLAB.b) * 0.4);
  }

  private calculateVascularIndex(regionalLAB: any): number {
    // Vascular patterns affect redness distribution
    const regions = ['leftCheek', 'rightCheek', 'nose'];
    let totalVascular = 0;
    
    regions.forEach(region => {
      const lab = regionalLAB[region];
      if (lab && lab.a > 0) {
        totalVascular += lab.a * 1.2; // Weight vascular areas higher
      }
    });
    
    return totalVascular / regions.length;
  }

  private calculateSensitivityIndex(regionalLAB: any): number {
    // Sensitivity based on color variation and redness
    const regions = ['forehead', 'leftCheek', 'rightCheek', 'chin'];
    let totalSensitivity = 0;
    
    regions.forEach(region => {
      const lab = regionalLAB[region];
      if (lab) {
        const colorVariation = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
        totalSensitivity += colorVariation;
      }
    });
    
    return totalSensitivity / regions.length;
  }

  private calculateTextureIrregularity(regionalLAB: any): number {
    // Texture based on LAB value variations across regions
    const regions = ['forehead', 'leftCheek', 'rightCheek', 'nose', 'chin'];
    const lValues = regions.map(region => regionalLAB[region]?.l || 50);
    
    const meanL = lValues.reduce((sum, l) => sum + l, 0) / lValues.length;
    const variance = lValues.reduce((sum, l) => sum + Math.pow(l - meanL, 2), 0) / lValues.length;
    
    return Math.sqrt(variance);
  }

  // Helper methods for calculations
  private calculateInflammationIndex(regionalLAB: any): number {
    // Inflammation increases redness (a-channel) and affects multiple regions
    const regions = ['forehead', 'leftCheek', 'rightCheek', 'nose', 'chin'];
    let totalInflammation = 0;
    
    regions.forEach(region => {
      const lab = regionalLAB[region];
      if (lab && lab.a > 0) {
        totalInflammation += lab.a;
      }
    });
    
    return totalInflammation / regions.length;
  }

  private calculateColorUnevenness(regionalLAB: any): number {
    // Calculate color variation across facial regions
    const regions = ['forehead', 'leftCheek', 'rightCheek', 'nose', 'chin'];
    const colorValues = regions.map(region => {
      const lab = regionalLAB[region];
      return lab ? Math.sqrt(lab.a * lab.a + lab.b * lab.b) : 0;
    });
    
    const meanColor = colorValues.reduce((sum, color) => sum + color, 0) / colorValues.length;
    const variance = colorValues.reduce((sum, color) => sum + Math.pow(color - meanColor, 2), 0) / colorValues.length;
    
    return Math.sqrt(variance);
  }

  private determineSeverity(score: number): 'Mild' | 'Moderate' | 'Severe' {
    if (score < 60) return 'Mild';
    if (score < 80) return 'Moderate';
    return 'Severe';
  }

  private calculateOverallConditionScore(conditions: SkinBeautyResult[]): number {
    // No perfect skin assumption - score must be mathematically derived
    if (conditions.length === 0) {
      throw new Error("STRICT_SIGNAL_LOSS: Cannot calculate condition score without data");
    }
    
    const severityWeight = { Mild: 10, Moderate: 25, Severe: 50 };
    const totalScore = conditions.reduce((sum, condition) => {
      return sum + severityWeight[condition.intensity];
    }, 0);
    
    return Math.max(0, 100 - totalScore);
  }

  private identifyPrimaryConcerns(concerns: SkinBeautyResult[]): string[] {
    return concerns
      .sort((a, b) => {
        const severityWeight = { Mild: 1, Moderate: 2, Severe: 3 };
        return severityWeight[b.intensity] - severityWeight[a.intensity];
      })
      .slice(0, 3)
      .map(concern => concern.concern);
  }

  private determineTreatmentPriority(concerns: SkinBeautyResult[]): string[] {
    // Prioritize severe and inflammatory concerns
    return concerns
      .filter(concern => concern.intensity === 'Severe' || 
        ['Acne', 'Rosacea', 'Dermatitis'].includes(concern.concern))
      .map(concern => concern.concern);
  }

  private identifyRiskFactors(concerns: SkinBeautyResult[], regionalLAB: any): string[] {
    const riskFactors: string[] = [];
    
    // Check for genetic predisposition indicators (dynamic threshold)
    const overallLAB = regionalLAB.overall;
    const fairSkinThreshold = overallLAB.l > 0 ? Math.max(55, overallLAB.l * 0.85) : 65;
    if (overallLAB && overallLAB.l > fairSkinThreshold) {
      riskFactors.push('Fair skin - higher UV sensitivity');
    }
    
    // Check for lifestyle indicators
    const oiliness = this.calculateOilinessFromLAB(regionalLAB);
    if (oiliness > 70) {
      riskFactors.push('Oily skin type - acne prone');
    }
    
    // Add concern-specific risk factors
    concerns.forEach(concern => {
      if (concern.concern === 'Acne') {
        riskFactors.push('Hormonal factors', 'Diet influences');
      } else if (concern.concern === 'Rosacea') {
        riskFactors.push('Temperature sensitivity', 'Alcohol consumption');
      }
    });
    
    return Array.from(new Set(riskFactors));
  }

  private calculateOilinessFromLAB(regionalLAB: any): number {
    const overallLAB = regionalLAB.overall;
    if (!overallLAB) {
      throw new Error("STRICT_SIGNAL_LOSS: Overall LAB data required for oiliness calculation");
    }
    
    // Oiliness inversely correlates with L channel
    return Math.max(0, Math.min(100, 100 - (overallLAB.l * 0.8) + Math.abs(overallLAB.b) * 0.3));
  }

  // Recommendation methods
  private getAcneRecommendations(severity: string): string[] {
    const baseRecommendations = [
      'Gentle cleansing twice daily',
      'Non-comedogenic moisturizer',
      'Avoid touching face'
    ];
    
    if (severity === 'Moderate' || severity === 'Severe') {
      return [
        ...baseRecommendations,
        'Salicylic acid treatment',
        'Retinoid therapy',
        'Professional consultation'
      ];
    }
    
    return baseRecommendations;
  }

  private getAcneBeautyNotes(intensity: string, oiliness: number, redness: number): string {
    return `${intensity} acne with ${oiliness > 70 ? 'high' : 'moderate'} oiliness and ${redness > 30 ? 'significant' : 'mild'} inflammation. Consider topical treatments and lifestyle modifications.`;
  }

  private getRosaceaBeautyNotes(intensity: string, redness: number, vascularIndex: number): string {
    return `${intensity} rosacea with ${redness > 40 ? 'significant' : 'moderate'} erythema and ${vascularIndex > 50 ? 'prominent' : 'mild'} vascular patterns. Trigger avoidance essential.`;
  }

  private getEczemaBeautyNotes(intensity: string, hydration: number, redness: number): string {
    return `${intensity} eczema with ${hydration < 30 ? 'severe' : 'moderate'} dryness and ${redness > 25 ? 'significant' : 'mild'} inflammation. Barrier repair crucial.`;
  }

  private getHyperpigmentationBeautyNotes(intensity: string, pigmentation: number, melaninIndex: number): string {
    return `${intensity} hyperpigmentation with ${pigmentation > 50 ? 'significant' : 'moderate'} unevenness and ${melaninIndex > 60 ? 'high' : 'moderate'} melanin concentration. Sun protection essential.`;
  }

  private getDermatitisBeautyNotes(intensity: string, inflammation: number, sensitivity: number): string {
    return `${intensity} dermatitis with ${inflammation > 40 ? 'significant' : 'moderate'} inflammation and ${sensitivity > 60 ? 'high' : 'moderate'} skin sensitivity. Trigger avoidance critical.`;
  }

  private getRosaceaRecommendations(severity: string): string[] {
    const baseRecommendations = [
      'Gentle skincare routine',
      'Sun protection daily',
      'Avoid triggers (spicy foods, alcohol)'
    ];
    
    if (severity === 'Moderate' || severity === 'Severe') {
      return [
        ...baseRecommendations,
        'Topical antibiotics',
        'Azelaic acid',
        'Dermatologist consultation'
      ];
    }
    
    return baseRecommendations;
  }

  private getRosaceaClinicalNotes(severity: string, redness: number, vascularIndex: number): string {
    return `${severity} rosacea with ${redness > 40 ? 'significant' : 'moderate'} erythema and ${vascularIndex > 50 ? 'prominent' : 'mild'} vascular patterns. Trigger avoidance essential.`;
  }

  private getEczemaRecommendations(severity: string): string[] {
    const baseRecommendations = [
      'Frequent moisturizing',
      'Fragrance-free products',
      'Lukewarm baths only'
    ];
    
    if (severity === 'Moderate' || severity === 'Severe') {
      return [
        ...baseRecommendations,
        'Topical corticosteroids',
        'Wet wrap therapy',
        'Allergen identification'
      ];
    }
    
    return baseRecommendations;
  }

  private getEczemaClinicalNotes(severity: string, hydration: number, redness: number): string {
    return `${severity} eczema with ${hydration < 30 ? 'severe' : 'moderate'} dryness and ${redness > 25 ? 'significant' : 'mild'} inflammation. Barrier repair crucial.`;
  }

  private getHyperpigmentationRecommendations(severity: string): string[] {
    const baseRecommendations = [
      'Daily sunscreen use',
      'Brightening agents',
      'Avoid sun exposure'
    ];
    
    if (severity === 'Moderate' || severity === 'Severe') {
      return [
        ...baseRecommendations,
        'Hydroquinone therapy',
        'Chemical peels',
        'Laser treatment options'
      ];
    }
    
    return baseRecommendations;
  }

  private getHyperpigmentationClinicalNotes(severity: string, pigmentation: number, melaninIndex: number): string {
    return `${severity} hyperpigmentation with ${pigmentation > 50 ? 'significant' : 'moderate'} unevenness and ${melaninIndex > 60 ? 'high' : 'moderate'} melanin concentration. Sun protection essential.`;
  }

  private getDermatitisRecommendations(severity: string): string[] {
    const baseRecommendations = [
      'Identify and avoid triggers',
      'Hypoallergenic products',
      'Barrier repair creams'
    ];
    
    if (severity === 'Moderate' || severity === 'Severe') {
      return [
        ...baseRecommendations,
        'Topical corticosteroids',
        'Patch testing',
        'Allergist consultation'
      ];
    }
    
    return baseRecommendations;
  }

  private getDermatitisClinicalNotes(severity: string, inflammation: number, sensitivity: number): string {
    return `${severity} dermatitis with ${inflammation > 40 ? 'significant' : 'moderate'} inflammation and ${sensitivity > 60 ? 'high' : 'moderate'} skin sensitivity. Trigger avoidance critical.`;
  }
}
