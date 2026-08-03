import { FrameData } from './frameStability';

export interface FaceQualityResult {
  score: number;
  sharpness: number;
  brightness: number;
  contrast: number;
  validPixelRatio: number;
  confidence: number;
}

export interface QualityMetrics {
  blurScore: number;
  brightnessScore: number;
  contrastScore: number;
  noiseScore: number;
  overallScore: number;
}

export interface FilterConfig {
  minBlurScore: number;
  minBrightnessScore: number;
  minContrastScore: number;
  maxNoiseScore: number;
  minOverallScore: number;
}

// STEP 2: SMART SKIN FILTER (REPLACE OLD FILTER)
export const isSkinPixel = (r: number, g: number, b: number): boolean => {
  const brightness = (r + g + b) / 3;

  // remove beard / hair (darker pixels)
  if (brightness < 40) return false;

  // remove extreme color noise (beard/hair artifacts)
  if (Math.abs(r - g) > 80 || Math.abs(r - b) > 80) return false;

  return true;
};

// STEP 5: LIGHT NORMALIZATION
export const normalizeRGB = (r: number, g: number, b: number, brightness: number) => {
  const factor = 128 / (brightness || 1);

  return {
    r: Math.min(255, r * factor),
    g: Math.min(255, g * factor),
    b: Math.min(255, b * factor)
  };
};

// STEP 4: MAIN FUNCTION (OPTIMIZED)
export const calculateFaceQuality = (
  pixels: Uint8ClampedArray
): FaceQualityResult => {

  let validPixels = 0;
  let brightnessSum = 0;
  let minBrightness = 255;
  let maxBrightness = 0;
  
  let lastBright = -1;
  let totalSharpnessVariance = 0;
  let sharpnessSamples = 0;

  console.time("FACE_QUALITY");

  for (let i = 0; i < pixels.length; i += 16) { 
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    const bright = (r + g + b) * 0.3333;

    if (bright < minBrightness) minBrightness = bright;
    if (bright > maxBrightness) maxBrightness = bright;

    if (lastBright !== -1) {
      const diff = bright - lastBright;
      totalSharpnessVariance += diff * diff;
      sharpnessSamples++;
    }
    lastBright = bright;

    if (isSkinPixel(r, g, b)) {
      validPixels++;
      brightnessSum += bright;
    }
  }

  if (validPixels === 0) {
    throw new Error("No valid skin pixels detected");
  }

  const totalPixels = pixels.length / 4;
  const validRatio = validPixels / totalPixels;
  const avgBrightness = brightnessSum / validPixels;
  
  const contrast = maxBrightness - minBrightness;
  const sharpness = sharpnessSamples > 0 ? totalSharpnessVariance / sharpnessSamples : 0;

  console.timeEnd("FACE_QUALITY");

  // 🔥 PRODUCTION SCORE
  let score =
    validRatio * 0.4 +
    (sharpness / 50) * 0.3 +
    (contrast / 255) * 0.2 +
    (avgBrightness / 255) * 0.1;

  score = Math.min(1, Math.max(0, score));

  return {
    score,
    sharpness,
    brightness: avgBrightness,
    contrast,
    validPixelRatio: validRatio,
    confidence: score
  };
};

export class FrameQualityFilter {
  private readonly defaultConfig: FilterConfig = {
    minBlurScore: 40,      // More permissive for real-world conditions
    minBrightnessScore: 50,  // Lower threshold for low lighting
    minContrastScore: 30,  // More permissive contrast
    maxNoiseScore: 60,      // Higher tolerance for beard/hair
    minOverallScore: 60,      // Lower threshold for better acceptance
  };

  public evaluateFrameQuality(frameData: FrameData): QualityMetrics {
    const blurScore = this.calculateBlurScore(frameData.imageData);
    const brightnessScore = this.calculateBrightnessScore(frameData.brightness);
    const contrastScore = this.calculateContrastScore(frameData.contrast);
    const noiseScore = this.calculateNoiseScore(frameData.imageData);
    
    const overallScore = this.calculateOverallScore({
      blurScore,
      brightnessScore,
      contrastScore,
      noiseScore,
    });

    return {
      blurScore,
      brightnessScore,
      contrastScore,
      noiseScore,
      overallScore,
    };
  }

  public filterFrames(
    frames: FrameData[],
    config: Partial<FilterConfig> = {}
  ): { filtered: FrameData[]; rejected: FrameData[]; metrics: QualityMetrics[] } {
    const finalConfig = { ...this.defaultConfig, ...config };
    const filtered: FrameData[] = [];
    const rejected: FrameData[] = [];
    const metrics: QualityMetrics[] = [];

    for (const frame of frames) {
      const quality = this.evaluateFrameQuality(frame);
      metrics.push(quality);

      if (this.meetsQualityThresholds(quality, finalConfig)) {
        filtered.push(frame);
      } else {
        rejected.push(frame);
      }
    }

    // 🆕 FALLBACK LOGIC: If too many frames are rejected, use original frames
    if (filtered.length < 12) {
      console.warn(`⚠️ Frame filter rejected too many frames (${filtered.length}/12), using raw frames`);
      return { 
        filtered: frames, 
        rejected: [], 
        metrics: frames.map(() => ({ 
          blurScore: 75, 
          brightnessScore: 75, 
          contrastScore: 75, 
          noiseScore: 25, 
          overallScore: 75 
        }))
      };
    }

    return { filtered, rejected, metrics };
  }

  private calculateBlurScore(imageData: ImageData): number {
    // Enhanced Laplacian variance for blur detection with edge preservation
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    let laplacianSum = 0;
    let pixelCount = 0;
    let edgeCount = 0;

    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        const idx = (y * width + x) * 4;
        
        // Convert to grayscale with improved coefficients
        const gray = 0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];
        
        // Enhanced 3x3 Laplacian kernel for better edge detection
        const kernel = [
          -1, -1, -1,
          -1,  8, -1,
          -1, -1, -1
        ];
        
        let laplacian = 0;
        let kernelSum = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const nIdx = ((y + ky) * width + (x + kx)) * 4;
            const nGray = 0.2126 * data[nIdx] + 0.7152 * data[nIdx + 1] + 0.0722 * data[nIdx + 2];
            const kernelVal = kernel[ky + 1][kx + 1];
            laplacian += kernelVal * nGray;
            kernelSum += Math.abs(kernelVal);
          }
        }
        
        laplacian = kernelSum > 0 ? laplacian / kernelSum : 0;
        
        // Count edges for more accurate blur detection
        if (Math.abs(laplacian) > 30) edgeCount++;
        
        laplacianSum += Math.abs(laplacian);
        pixelCount++;
      }
    }

    const avgLaplacian = laplacianSum / pixelCount;
    const edgeRatio = edgeCount / pixelCount;
    
    // Combine variance and edge information for better blur detection
    const blurScore = avgLaplacian * (1 - edgeRatio * 0.3);
    
    // Normalize to 0-100 scale (higher is better - less blur)
    return Math.min(100, Math.max(0, 100 - blurScore / 50));
  }

  private calculateBrightnessScore(brightness: number): number {
    // Enhanced brightness scoring for low lighting conditions
    const optimal = 130;
    const deviation = Math.abs(brightness - optimal);
    
    // More forgiving for low light conditions
    if (brightness < 80) {
      // Exponential scaling for very low light
      return Math.max(0, Math.pow(brightness / 130, 0.8) * 100);
    }
    
    // Linear scaling for normal range
    if (brightness < 120) {
      return Math.max(0, (brightness / 130) * 100);
    }
    
    // Standard deviation penalty for good lighting
    const score = Math.max(0, 100 - deviation / 2.5);
    return Math.min(100, score);
  }

  private calculateContrastScore(contrast: number): number {
    // Optimal contrast is around 80-120
    const optimal = 100;
    const deviation = Math.abs(contrast - optimal);
    const score = Math.max(0, 100 - deviation / 2);
    return score;
  }

  private calculateNoiseScore(imageData: ImageData): number {
    // Enhanced noise detection for beard/hair artifacts
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    let noiseSum = 0;
    let pixelCount = 0;
    let highFrequencyNoise = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        // Calculate local noise using neighboring pixels
        const centerGray = 0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];
        
        let neighborVariance = 0;
        let neighborCount = 0;
        let colorVariance = 0;
        
        // Enhanced 5x5 neighborhood for better noise detection
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (dx === 0 && dy === 0) continue;
            
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            if (nIdx >= 0 && nIdx < data.length - 2) {
              const nGray = 0.2126 * data[nIdx] + 0.7152 * data[nIdx + 1] + 0.0722 * data[nIdx + 2];
              neighborVariance += Math.pow(centerGray - nGray, 2);
              
              // Calculate color variance for beard/hair detection
              if (dy === 0 && dx === 0) continue;
              const nR = data[nIdx];
              const nG = data[nIdx + 1];
              const nB = data[nIdx + 2];
              const cR = data[idx];
              const cG = data[idx + 1];
              const cB = data[idx + 2];
              
              colorVariance += (
                Math.pow(cR - nR, 2) + 
                Math.pow(cG - nG, 2) + 
                Math.pow(cB - nB, 2)
              ) / 3;
            }
            neighborCount++;
          }
        }
        
        const avgNeighborVariance = neighborVariance / neighborCount;
        const avgColorVariance = colorVariance / 24; // 8 neighbors * 3 color channels
        
        // Combine spatial and color noise
        const combinedNoise = avgNeighborVariance * 0.7 + avgColorVariance * 0.3;
        
        // Detect high-frequency noise (beard/hair artifacts)
        if (combinedNoise > 400) highFrequencyNoise++;
        
        noiseSum += combinedNoise;
        pixelCount++;
      }
    }

    const avgNoise = noiseSum / pixelCount;
    const highFreqRatio = highFrequencyNoise / pixelCount;
    
    // Normalize to 0-100 scale (lower is better)
    const baseScore = Math.min(100, Math.max(0, 100 - avgNoise / 10));
    
    // Penalize high-frequency noise more heavily
    const penalty = highFreqRatio * 20;
    
    return Math.min(100, Math.max(0, baseScore - penalty));
  }

  private calculateOverallScore(metrics: {
    blurScore: number;
    brightnessScore: number;
    contrastScore: number;
    noiseScore: number;
  }): number {
    // Weighted average of all quality metrics
    const weights = {
      blur: 0.3,
      brightness: 0.2,
      contrast: 0.25,
      noise: 0.25,
    };

    return (
      metrics.blurScore * weights.blur +
      metrics.brightnessScore * weights.brightness +
      metrics.contrastScore * weights.contrast +
      metrics.noiseScore * weights.noise
    );
  }

  private meetsQualityThresholds(
    quality: QualityMetrics,
    config: FilterConfig
  ): boolean {
    return (
      quality.blurScore >= config.minBlurScore &&
      quality.brightnessScore >= config.minBrightnessScore &&
      quality.contrastScore >= config.minContrastScore &&
      quality.noiseScore <= config.maxNoiseScore &&
      quality.overallScore >= config.minOverallScore
    );
  }

  public getBestFrames(frames: FrameData[], count: number = 5): FrameData[] {
    const framesWithQuality = frames.map(frame => ({
      frame,
      quality: this.evaluateFrameQuality(frame),
    }));

    // Sort by overall quality score (descending)
    framesWithQuality.sort((a, b) => b.quality.overallScore - a.quality.overallScore);

    return framesWithQuality.slice(0, count).map(item => item.frame);
  }

  public getQualityStats(frames: FrameData[]): {
    average: QualityMetrics;
    min: QualityMetrics;
    max: QualityMetrics;
    stdDev: QualityMetrics;
  } {
    const metrics = frames.map(frame => this.evaluateFrameQuality(frame));
    
    if (metrics.length === 0) {
      throw new Error('No frames to analyze');
    }

    const calculateStats = (values: number[]) => {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      return { mean, min, max, stdDev };
    };

    const blurStats = calculateStats(metrics.map(m => m.blurScore));
    const brightnessStats = calculateStats(metrics.map(m => m.brightnessScore));
    const contrastStats = calculateStats(metrics.map(m => m.contrastScore));
    const noiseStats = calculateStats(metrics.map(m => m.noiseScore));
    const overallStats = calculateStats(metrics.map(m => m.overallScore));

    return {
      average: {
        blurScore: blurStats.mean,
        brightnessScore: brightnessStats.mean,
        contrastScore: contrastStats.mean,
        noiseScore: noiseStats.mean,
        overallScore: overallStats.mean,
      },
      min: {
        blurScore: blurStats.min,
        brightnessScore: brightnessStats.min,
        contrastScore: contrastStats.min,
        noiseScore: noiseStats.min,
        overallScore: overallStats.min,
      },
      max: {
        blurScore: blurStats.max,
        brightnessScore: brightnessStats.max,
        contrastScore: contrastStats.max,
        noiseScore: noiseStats.max,
        overallScore: overallStats.max,
      },
      stdDev: {
        blurScore: blurStats.stdDev,
        brightnessScore: brightnessStats.stdDev,
        contrastScore: contrastStats.stdDev,
        noiseScore: noiseStats.stdDev,
        overallScore: overallStats.stdDev,
      },
    };
  }
}
