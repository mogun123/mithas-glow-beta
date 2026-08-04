import { FaceDetectionResult } from './faceDetection';
import { FrameStabilityMetrics } from './frameStability';
import { QualityMetrics } from './frameQualityFilter';
import { LABStatistics, StatisticalResult } from './labStatistics';
import { LightingMetrics } from '../skin-analysis/lightingNormalization';

export interface ConfidenceFactors {
  faceDetection: {
    confidence: number;
    stability: number;
    completeness: number;
  };
  frameQuality: {
    blurScore: number;
    brightnessScore: number;
    contrastScore: number;
    noiseScore: number;
  };
  lighting: {
    uniformity: number;
    brightness: number;
    colorTemperature: number;
  };
  dataConsistency: {
    sampleSize: number;
    variance: number;
    outlierRatio: number;
  };
}

export interface ConfidenceResult {
  overallScore: number;
  factors: ConfidenceFactors;
  breakdown: {
    faceDetectionWeight: number;
    frameQualityWeight: number;
    lightingWeight: number;
    dataConsistencyWeight: number;
  };
  reliability: 'High' | 'Medium' | 'Low';
  recommendations: string[];
}

export class ConfidenceScore {
  private readonly WEIGHTS = {
    faceDetection: 0.25,
    frameQuality: 0.25,
    lighting: 0.25,
    dataConsistency: 0.25,
  };

  public calculate(
    faceDetection: FaceDetectionResult,
    frameStability: FrameStabilityMetrics,
    frameQuality: QualityMetrics,
    lighting: LightingMetrics,
    regionStats: Record<string, StatisticalResult>
  ): ConfidenceResult {
    // Calculate individual factor scores
    const faceDetectionScore = this.calculateFaceDetectionScore(faceDetection);
    const frameQualityScore = this.calculateFrameQualityScore(frameQuality);
    const lightingScore = this.calculateLightingScore(lighting);
    const dataConsistencyScore = this.calculateDataConsistencyScore(regionStats);

    // Build confidence factors
    const factors: ConfidenceFactors = {
      faceDetection: faceDetectionScore,
      frameQuality: {
        blurScore: frameQuality.blurScore,
        brightnessScore: frameQuality.brightnessScore,
        contrastScore: frameQuality.contrastScore,
        noiseScore: 100 - frameQuality.noiseScore, // Invert noise score
      },
      lighting: {
        uniformity: lighting.lightingUniformity * 100,
        brightness: this.calculateBrightnessScore(lighting.averageBrightness),
        colorTemperature: this.calculateColorTemperatureScore(lighting.colorTemperature),
      },
      dataConsistency: dataConsistencyScore,
    };

    // Calculate weighted overall score
    const overallScore = this.calculateOverallScore(factors);

    // Determine reliability level
    const reliability = this.determineReliability(overallScore);

    // Generate recommendations
    const recommendations = this.generateRecommendations(factors, overallScore);

    return {
      overallScore,
      factors,
      breakdown: {
        faceDetectionWeight: this.WEIGHTS.faceDetection * 100,
        frameQualityWeight: this.WEIGHTS.frameQuality * 100,
        lightingWeight: this.WEIGHTS.lighting * 100,
        dataConsistencyWeight: this.WEIGHTS.dataConsistency * 100,
      },
      reliability,
      recommendations,
    };
  }

  public getConfidence(
    faceDetection: FaceDetectionResult,
    frameStability: FrameStabilityMetrics,
    frameQuality: QualityMetrics,
    lighting: LightingMetrics,
    regionStats: Record<string, StatisticalResult>
  ): number {
    // Extract L-channel standard deviation from region statistics
    const regions = Object.values(regionStats);
    if (regions.length === 0) return 0;

    // Calculate average L-channel standard deviation across all regions
    const totalLStdDev = regions.reduce((sum, stats) => {
      return sum + Math.sqrt(stats.variance.l);
    }, 0);
    
    const avgLStdDev = totalLStdDev / regions.length;
    
    // Apply formula: Math.max(0, Math.min(100, 100 - (l_std_dev * 2)))
    const confidence = Math.max(0, Math.min(100, 100 - (avgLStdDev * 2)));
    
    return confidence;
  }

  private calculateFaceDetectionScore(detection: FaceDetectionResult): {
    confidence: number;
    stability: number;
    completeness: number;
  } {
    // Face detection confidence
    const confidence = detection.confidence * 100;

    // Face stability (based on bounding box aspect ratio and position)
    const aspectRatio = detection.boundingBox.width / detection.boundingBox.height;
    const idealAspectRatio = 0.8; // Typical face aspect ratio
    const aspectRatioScore = Math.max(0, 100 - Math.abs(aspectRatio - idealAspectRatio) * 100);

    // Face completeness (check if face is well-centered and complete)
    const centerX = detection.boundingBox.x + detection.boundingBox.width / 2;
    const centerY = detection.boundingBox.y + detection.boundingBox.height / 2;
    const distanceFromCenter = Math.sqrt(
      Math.pow(centerX - 0.5, 2) + Math.pow(centerY - 0.5, 2)
    );
    const completeness = Math.max(0, 100 - distanceFromCenter * 200);

    return {
      confidence,
      stability: (aspectRatioScore + completeness) / 2,
      completeness,
    };
  }

  private calculateFrameQualityScore(quality: QualityMetrics): {
    blurScore: number;
    brightnessScore: number;
    contrastScore: number;
    noiseScore: number;
  } {
    return {
      blurScore: quality.blurScore,
      brightnessScore: quality.brightnessScore,
      contrastScore: quality.contrastScore,
      noiseScore: quality.noiseScore,
    };
  }

  private calculateLightingScore(lighting: LightingMetrics): {
    uniformity: number;
    brightness: number;
    colorTemperature: number;
  } {
    const uniformity = lighting.lightingUniformity * 100;
    const brightness = this.calculateBrightnessScore(lighting.averageBrightness);
    const colorTemperature = this.calculateColorTemperatureScore(lighting.colorTemperature);

    return {
      uniformity,
      brightness,
      colorTemperature,
    };
  }

  private calculateBrightnessScore(brightness: number): number {
    // Optimal brightness is 100-150
    if (brightness >= 100 && brightness <= 150) return 100;
    if (brightness < 100) return (brightness / 100) * 100;
    return Math.max(0, 100 - ((brightness - 150) / 100) * 100);
  }

  private calculateColorTemperatureScore(colorTemp: number): number {
    // Optimal color temperature is 4500-6500K (neutral daylight)
    if (colorTemp >= 4500 && colorTemp <= 6500) return 100;
    if (colorTemp < 4500) return (colorTemp / 4500) * 100;
    return Math.max(0, 100 - ((colorTemp - 6500) / 3500) * 100);
  }

  private calculateDataConsistencyScore(regionStats: Record<string, StatisticalResult>): {
    sampleSize: number;
    variance: number;
    outlierRatio: number;
  } {
    const regions = Object.values(regionStats);
    
    // Calculate average sample size
    const avgSampleSize = regions.reduce((sum, stats) => sum + stats.sampleSize, 0) / regions.length;
    const sampleSizeScore = Math.min(100, (avgSampleSize / 20) * 100); // Assuming 20 is ideal

    // Calculate average variance across regions using L-channel standard deviation
    const avgLStdDev = regions.reduce((sum, stats) => {
      return sum + Math.sqrt(stats.variance.l);
    }, 0) / regions.length;
    const varianceScore = Math.max(0, Math.min(100, 100 - (avgLStdDev * 2)));

    // Calculate outlier ratio
    const totalOutliers = regions.reduce((sum, stats) => sum + stats.outliers.length, 0);
    const totalSamples = regions.reduce((sum, stats) => sum + stats.sampleSize, 0);
    const outlierRatio = totalSamples > 0 ? totalOutliers / totalSamples : 0;
    const outlierScore = Math.max(0, 100 - outlierRatio * 100);

    return {
      sampleSize: sampleSizeScore,
      variance: varianceScore,
      outlierRatio: outlierScore,
    };
  }

  private calculateOverallScore(factors: ConfidenceFactors): number {
    // Calculate sub-scores
    const faceDetectionScore = (
      factors.faceDetection.confidence * 0.4 +
      factors.faceDetection.stability * 0.3 +
      factors.faceDetection.completeness * 0.3
    );

    const frameQualityScore = (
      factors.frameQuality.blurScore * 0.3 +
      factors.frameQuality.brightnessScore * 0.25 +
      factors.frameQuality.contrastScore * 0.25 +
      factors.frameQuality.noiseScore * 0.2
    );

    const lightingScore = (
      factors.lighting.uniformity * 0.4 +
      factors.lighting.brightness * 0.3 +
      factors.lighting.colorTemperature * 0.3
    );

    const dataConsistencyScore = (
      factors.dataConsistency.sampleSize * 0.4 +
      factors.dataConsistency.variance * 0.4 +
      factors.dataConsistency.outlierRatio * 0.2
    );

    // Calculate weighted overall score
    const overallScore = (
      faceDetectionScore * this.WEIGHTS.faceDetection +
      frameQualityScore * this.WEIGHTS.frameQuality +
      lightingScore * this.WEIGHTS.lighting +
      dataConsistencyScore * this.WEIGHTS.dataConsistency
    );

    return Math.max(0, Math.min(100, overallScore));
  }

  private determineReliability(score: number): 'High' | 'Medium' | 'Low' {
    if (score >= 80) return 'High';
    if (score >= 60) return 'Medium';
    return 'Low';
  }

  private generateRecommendations(factors: ConfidenceFactors, overallScore: number): string[] {
    const recommendations: string[] = [];

    // Face detection recommendations
    if (factors.faceDetection.confidence < 70) {
      recommendations.push('Ensure your face is clearly visible and well-lit');
    }
    if (factors.faceDetection.stability < 70) {
      recommendations.push('Keep your face steady and centered in the frame');
    }
    if (factors.faceDetection.completeness < 70) {
      recommendations.push('Position your entire face within the frame');
    }

    // Frame quality recommendations
    if (factors.frameQuality.blurScore < 70) {
      recommendations.push('Ensure the camera is focused and avoid movement');
    }
    if (factors.frameQuality.brightnessScore < 70) {
      recommendations.push('Adjust lighting for optimal brightness');
    }
    if (factors.frameQuality.contrastScore < 70) {
      recommendations.push('Improve lighting contrast for better results');
    }
    if (factors.frameQuality.noiseScore < 70) {
      recommendations.push('Reduce digital noise by using better lighting');
    }

    // Lighting recommendations
    if (factors.lighting.uniformity < 70) {
      recommendations.push('Ensure even lighting across your face');
    }
    if (factors.lighting.brightness < 70) {
      recommendations.push('Adjust to optimal lighting conditions');
    }
    if (factors.lighting.colorTemperature < 70) {
      recommendations.push('Use neutral daylight lighting for best results');
    }

    // Data consistency recommendations
    if (factors.dataConsistency.sampleSize < 70) {
      recommendations.push('Hold steady longer to capture more data');
    }
    if (factors.dataConsistency.variance < 70) {
      recommendations.push('Maintain consistent lighting and position');
    }
    if (factors.dataConsistency.outlierRatio > 30) {
      recommendations.push('Avoid sudden movements during scanning');
    }

    // Overall recommendations
    if (overallScore < 60) {
      recommendations.push('Consider rescanning in better conditions for more accurate results');
    }

    return recommendations;
  }

  public getConfidenceThreshold(reliability: 'High' | 'Medium' | 'Low'): number {
    switch (reliability) {
      case 'High': return 80;
      case 'Medium': return 60;
      case 'Low': return 0;
    }
  }

  public validateConfidenceResult(result: ConfidenceResult): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check overall score range
    if (result.overallScore < 0 || result.overallScore > 100) {
      issues.push('Overall confidence score out of range');
    }

    // Check factor scores
    const factorChecks = [
      { name: 'Face detection confidence', value: result.factors.faceDetection.confidence },
      { name: 'Frame quality blur score', value: result.factors.frameQuality.blurScore },
      { name: 'Lighting uniformity', value: result.factors.lighting.uniformity },
      { name: 'Data consistency sample size', value: result.factors.dataConsistency.sampleSize },
    ];

    for (const check of factorChecks) {
      if (check.value < 0 || check.value > 100) {
        issues.push(`${check.name} out of range`);
      }
    }

    // Check weight breakdown
    const totalWeight = Object.values(result.breakdown).reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(totalWeight - 100) > 0.1) {
      issues.push('Weight breakdown does not sum to 100%');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  public compareConfidenceScores(result1: ConfidenceResult, result2: ConfidenceResult): {
    improvement: number;
    betterFactors: string[];
    worseFactors: string[];
  } {
    const improvement = result2.overallScore - result1.overallScore;
    
    const betterFactors: string[] = [];
    const worseFactors: string[] = [];

    // Compare individual factors
    const comparisons = [
      { name: 'Face detection', factor1: result1.factors.faceDetection.confidence, factor2: result2.factors.faceDetection.confidence },
      { name: 'Frame quality', factor1: result1.factors.frameQuality.blurScore, factor2: result2.factors.frameQuality.blurScore },
      { name: 'Lighting', factor1: result1.factors.lighting.uniformity, factor2: result2.factors.lighting.uniformity },
      { name: 'Data consistency', factor1: result1.factors.dataConsistency.sampleSize, factor2: result2.factors.dataConsistency.sampleSize },
    ];

    for (const comparison of comparisons) {
      if (comparison.factor2 > comparison.factor1 + 5) {
        betterFactors.push(comparison.name);
      } else if (comparison.factor1 > comparison.factor2 + 5) {
        worseFactors.push(comparison.name);
      }
    }

    return {
      improvement,
      betterFactors,
      worseFactors,
    };
  }

  // Calculate confidence score for SkinToneAnalyzer integration
  public async calculateConfidence(
    normalizedMetrics: any,
    regionAverages: any,
    lightingMetrics: any
  ): Promise<{ score: number }> {
    if (!normalizedMetrics || !regionAverages || !lightingMetrics) {
      throw new Error('CLINICAL_ERROR: Missing required data for confidence calculation');
    }
    
    // Extract L-channel standard deviation from region averages
    const regions = Object.values(regionAverages);
    if (regions.length === 0) return { score: 0 };

    // Calculate average L-channel standard deviation across all regions
    const totalLStdDev = regions.reduce((sum: number, stats: StatisticalResult) => {
      return sum + Math.sqrt(stats.variance?.l || 0);
    }, 0);
    
    const avgLStdDev = totalLStdDev / regions.length;
    
    // Apply formula: Math.max(0, Math.min(100, 100 - (l_std_dev * 2)))
    const confidence = Math.max(0, Math.min(100, 100 - (avgLStdDev * 2)));
    
    return { score: confidence };
  }

}
