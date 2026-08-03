export interface NormalizationResult {
  normalizedRGB: [number, number, number];
  referenceRGB: [number, number, number];
  normalizationFactors: [number, number, number];
}

export interface LightingMetrics {
  averageBrightness: number;
  lightingUniformity: number;
  colorTemperature: number;
  hasHotspots: boolean;
  hasShadows: boolean;
}

export class LightingNormalization {
  private readonly NOSE_BRIDGE_LANDMARKS = [6, 168, 8, 10, 151]; // Nose tip and bridge points
  private readonly REFERENCE_REGION_SIZE = 16; // 16px radius for statistical stability

  // Analyze lighting context for clinical analysis
  public async analyzeLightingContext(
    averagedLAB: { l: number; a: number; b: number },
    lightingMetrics: any
  ): Promise<any> {
    if (!averagedLAB || !lightingMetrics) {
      throw new Error('CLINICAL_ERROR: Missing data for lighting context analysis');
    }
    
    const meanL = averagedLAB.l;
    const lStdDev = lightingMetrics.lightingUniformity || 0;
    
    return {
      isSunlight: lStdDev > 18,
      isIndoor: lStdDev < 10,
      isMixed: lStdDev >= 10 && lStdDev <= 18,
      isHarsh: lStdDev > 25,
      meanL,
      lStdDev,
      globalOffset: lightingMetrics.globalOffset || 0
    };
  }

  public normalizeLighting(
    pixelRGB: [number, number, number],
    referenceRGB: [number, number, number]
  ): NormalizationResult {
    // 🛡️ STRICT PIXEL GUARD: No mock values. If light is physically zero, reject frame.
    if (referenceRGB[0] <= 0 || referenceRGB[1] <= 0 || referenceRGB[2] <= 0) {
      throw new Error("STRICT_SIGNAL_LOSS: Absolute black frame detected. Insufficient photons for clinical analysis.");
    }

    // STRICT MATH VALIDATION: Check for NaN/Infinity in calculations
    const normalizationFactors: [number, number, number] = [
      255 / referenceRGB[0],
      255 / referenceRGB[1],
      255 / referenceRGB[2],
    ];

    if (!Number.isFinite(normalizationFactors[0]) || !Number.isFinite(normalizationFactors[1]) || !Number.isFinite(normalizationFactors[2])) {
      throw new Error("CLINICAL_ERROR: LIGHTING_MATH_BREAKDOWN - Normalization factors are not finite");
    }

    const normalizedRGB: [number, number, number] = [
      Math.min(255, pixelRGB[0] * normalizationFactors[0]),
      Math.min(255, pixelRGB[1] * normalizationFactors[1]),
      Math.min(255, pixelRGB[2] * normalizationFactors[2]),
    ];

    if (!Number.isFinite(normalizedRGB[0]) || !Number.isFinite(normalizedRGB[1]) || !Number.isFinite(normalizedRGB[2])) {
      throw new Error("CLINICAL_ERROR: LIGHTING_MATH_BREAKDOWN - Normalized RGB values are not finite");
    }

    return {
      normalizedRGB,
      referenceRGB,
      normalizationFactors,
    };
  }


  public extractReferenceLighting(
    imageData: ImageData,
    landmarks: any[],
    imageWidth: number,
    imageHeight: number
  ): [number, number, number] {
    // Use nose bridge as lighting reference
    const referenceLandmarks = this.NOSE_BRIDGE_LANDMARKS.map(idx => landmarks[idx]);

    let totalR = 0;
    let totalG = 0;
    let totalB = 0;
    let pixelCount = 0;

    for (const landmark of referenceLandmarks) {
      // STRICT VALIDATION: Check landmark object has .x and .y properties
      if (!landmark || 
          typeof landmark.x !== 'number' || 
          typeof landmark.y !== 'number' ||
          !Number.isFinite(landmark.x) || 
          !Number.isFinite(landmark.y)) {
        continue; // Skip invalid landmarks
      }

      const x = Math.floor(landmark.x * imageWidth);
      const y = Math.floor(landmark.y * imageHeight);

      const regionPixels = this.extractCircularRegion(
        imageData,
        x,
        y,
        this.REFERENCE_REGION_SIZE,
        imageWidth,
        imageHeight
      );

      for (const pixel of regionPixels) {
        totalR += pixel[0];
        totalG += pixel[1];
        totalB += pixel[2];
        pixelCount++;
      }
    }

    if (pixelCount === 0) {
      // No Mocking! Drop the frame entirely if no valid pixels exist.
      throw new Error("STRICT_SIGNAL_LOSS: frame_unknown - Zero pixels extracted from reference region.");
    }


    return [
      Math.round(totalR / pixelCount),
      Math.round(totalG / pixelCount),
      Math.round(totalB / pixelCount),
    ];
  }

  private extractCircularRegion(
    imageData: ImageData,
    centerX: number,
    centerY: number,
    radius: number,
    imageWidth: number,
    imageHeight: number
  ): [number, number, number][] {
    const pixels: [number, number, number][] = [];
    const data = imageData.data;

    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        const distance = Math.sqrt(x * x + y * y);
        if (distance > radius) continue;

        const pixelX = centerX + x;
        const pixelY = centerY + y;

        if (pixelX < 0 || pixelX >= imageWidth || pixelY < 0 || pixelY >= imageHeight) {
          continue;
        }

        const idx = (pixelY * imageWidth + pixelX) * 4;
        pixels.push([data[idx], data[idx + 1], data[idx + 2]]);
      }
    }

    return pixels;
  }

  public analyzeLighting(
    imageData: ImageData,
    landmarks: any[],
    imageWidth: number,
    imageHeight: number
  ): LightingMetrics {
    // Sample lighting across different face regions
    const regions = this.getLightingSampleRegions(landmarks);

    let totalBrightness = 0;
    const brightnesses: number[] = [];
    let hotspots = 0;
    let shadows = 0;

    for (const region of regions) {
      const regionBrightness = this.getRegionBrightness(
        imageData,
        region,
        imageWidth,
        imageHeight
      );

      brightnesses.push(regionBrightness);
      totalBrightness += regionBrightness;

      if (regionBrightness > 210) hotspots++; // Increased from 200
      if (regionBrightness < 40) shadows++; // Decreased from 50
    }

    // STRICT DIVISION: No fallbacks - throw on division by zero
    if (regions.length === 0) {
      throw new Error("STRICT_SIGNAL_LOSS: No lighting regions available for analysis");
    }

    const averageBrightness = totalBrightness / regions.length;
    const lightingUniformity = this.calculateLightingUniformity(brightnesses);
    const colorTemperature = this.estimateColorTemperature(imageData, landmarks, imageWidth, imageHeight);

    return {
      averageBrightness,
      lightingUniformity,
      colorTemperature,
      hasHotspots: hotspots > regions.length * 0.4, // Increased from 0.2
      hasShadows: shadows > regions.length * 0.4, // Increased from 0.2
    };
  }

  private getLightingSampleRegions(landmarks: any[]): { x: number; y: number }[] {
    // Validate landmarks array and required indices
    if (!landmarks || landmarks.length < 300) {
      throw new Error("STRICT_SIGNAL_LOSS: Insufficient landmarks for lighting region sampling");
    }

    const requiredLandmarks = [
      { index: 10, name: 'forehead' },
      { index: 50, name: 'leftCheek' },
      { index: 280, name: 'rightCheek' },
      { index: 152, name: 'chin' },
      { index: 6, name: 'noseBridge' }
    ];

    const regions: { x: number; y: number }[] = [];

    for (const landmark of requiredLandmarks) {
      if (landmarks[landmark.index] &&
        typeof landmarks[landmark.index].x === 'number' &&
        typeof landmarks[landmark.index].y === 'number' &&
        Number.isFinite(landmarks[landmark.index].x) &&
        Number.isFinite(landmarks[landmark.index].y)) {
        regions.push({
          x: landmarks[landmark.index].x,
          y: landmarks[landmark.index].y
        });
      }
    }

    if (regions.length === 0) {
      throw new Error("STRICT_SIGNAL_LOSS: No valid lighting regions extracted from landmarks");
    }

    return regions;
  }

  private getRegionBrightness(
    imageData: ImageData,
    region: { x: number; y: number },
    imageWidth: number,
    imageHeight: number
  ): number {
    const x = Math.floor(region.x * imageWidth);
    const y = Math.floor(region.y * imageHeight);

    const pixels = this.extractCircularRegion(
      imageData,
      x,
      y,
      5, // Small sample region
      imageWidth,
      imageHeight
    );

    if (pixels.length === 0) {
      throw new Error("STRICT_SIGNAL_LOSS: Zero pixels sampled for region brightness");
    }

    const avgR = pixels.reduce((sum, p) => sum + p[0], 0) / pixels.length;
    const avgG = pixels.reduce((sum, p) => sum + p[1], 0) / pixels.length;
    const avgB = pixels.reduce((sum, p) => sum + p[2], 0) / pixels.length;

    // Convert to perceived brightness
    return 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;
  }

  private calculateLightingUniformity(brightnesses: number[]): number {
    if (brightnesses.length < 2) {
      throw new Error("STRICT_SIGNAL_LOSS: Insufficient brightness samples for uniformity calculation");
    }

    const mean = brightnesses.reduce((a, b) => a + b, 0) / brightnesses.length;
    
    // STRICT MATH VALIDATION: Check for NaN in mean calculation
    if (!Number.isFinite(mean)) {
      throw new Error("CLINICAL_ERROR: LIGHTING_MATH_BREAKDOWN - Mean brightness calculation failed");
    }

    const variance = brightnesses.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / brightnesses.length;
    const stdDev = Math.sqrt(variance);

    // STRICT MATH VALIDATION: Check for NaN in variance/stdDev calculations
    if (!Number.isFinite(variance) || !Number.isFinite(stdDev)) {
      throw new Error("CLINICAL_ERROR: LIGHTING_MATH_BREAKDOWN - Variance/standard deviation calculation failed");
    }

    // Normalize to 0-1 scale (lower stdDev = more uniform)
    // No fallback for zero mean - throw strict error instead
    if (mean === 0) {
      throw new Error("STRICT_SIGNAL_LOSS: Zero mean brightness - cannot calculate uniformity");
    }
    
    const uniformity = Math.max(0, Math.min(1, 1 - (stdDev / mean)));
    
    // STRICT MATH VALIDATION: Check for NaN in final uniformity calculation
    if (!Number.isFinite(uniformity)) {
      throw new Error("CLINICAL_ERROR: LIGHTING_MATH_BREAKDOWN - Uniformity calculation failed");
    }

    return uniformity;
  }

  private estimateColorTemperature(
    imageData: ImageData,
    landmarks: any[],
    imageWidth: number,
    imageHeight: number
  ): number {
    // Sample from forehead region for color temperature estimation
    const foreheadLandmark = landmarks[10];
    
    // STRICT VALIDATION: Check forehead landmark has .x and .y properties
    if (!foreheadLandmark || 
        typeof foreheadLandmark.x !== 'number' || 
        typeof foreheadLandmark.y !== 'number' ||
        !Number.isFinite(foreheadLandmark.x) || 
        !Number.isFinite(foreheadLandmark.y)) {
      throw new Error("STRICT_SIGNAL_LOSS: Invalid forehead landmark for color temperature estimation");
    }
    
    const x = Math.floor(foreheadLandmark.x * imageWidth);
    const y = Math.floor(foreheadLandmark.y * imageHeight);

    const pixels = this.extractCircularRegion(
      imageData,
      x,
      y,
      10,
      imageWidth,
      imageHeight
    );

    if (pixels.length === 0) {
      throw new Error("STRICT_SIGNAL_LOSS: Zero pixels sampled for color temperature estimation");
    }

    const avgR = pixels.reduce((sum, p) => sum + p[0], 0) / pixels.length;
    const avgG = pixels.reduce((sum, p) => sum + p[1], 0) / pixels.length;
    const avgB = pixels.reduce((sum, p) => sum + p[2], 0) / pixels.length;

    // Simple color temperature estimation based on R/B ratio
    const rbRatio = avgR / Math.max(1, avgB);

    // Map R/B ratio to approximate color temperature
    if (rbRatio > 1.2) return 3000; // Warm
    if (rbRatio < 0.8) return 7000; // Cool
    return 5500; // Neutral
  }

  public applyWhiteBalance(
    imageData: ImageData,
    referenceRGB: [number, number, number]
  ): ImageData {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;

    // Calculate white balance factors
    const grayLevel = 128; // Target gray level
    // STRICT GUARD: Check for absolute zero. No artificial 'Math.max(1)' fallbacks.
    if (referenceRGB[0] === 0 || referenceRGB[1] === 0 || referenceRGB[2] === 0) {
      throw new Error("STRICT_SIGNAL_LOSS: frame_unknown - Absolute black reference lighting detected.");
    }

    const wbFactors = [
      grayLevel / referenceRGB[0],
      grayLevel / referenceRGB[1],
      grayLevel / referenceRGB[2],
    ];


    // Apply white balance
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, data[i] * wbFactors[0]));     // R
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * wbFactors[1])); // G
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * wbFactors[2])); // B
      // Alpha channel remains unchanged
    }

    return new ImageData(data, width, height);
  }

  public isLightingAcceptable(metrics: LightingMetrics): boolean {
    return (
      metrics.averageBrightness >= 30 &&  // Relaxed from 50
      metrics.averageBrightness <= 220 && // Relaxed from 200
      metrics.lightingUniformity >= 0.5 && // Relaxed from 0.7
      !(metrics.hasHotspots && metrics.averageBrightness > 210) && // Only block extreme hotspots
      !(metrics.hasShadows && metrics.averageBrightness < 40) // Only block extreme shadows
    );
  }

  public normalizeLABLighting(lab: { l: number; a: number; b: number }): { l: number; a: number; b: number } {
    // Strict clinical validation
    if (!lab || typeof lab.l !== 'number' || isNaN(lab.l) || lab.l <= 0) {
      throw new Error("CLINICAL_DATA_ERROR: Invalid LAB input for lighting normalization");
    }

    const safeL = lab.l;

    // STRICT MATH VALIDATION: Check for NaN in safeL
    if (!Number.isFinite(safeL)) {
      throw new Error("CLINICAL_ERROR: LIGHTING_MATH_BREAKDOWN - LAB L channel is not finite");
    }

    // DENOMINATOR SAFETY: Prevent division by near-zero values
    if (safeL < 0.1) {
      throw new Error("STRICT_SIGNAL_LOSS: Luminance signal too low for normalization");
    }

    // Adaptive L-Target System
    let targetL: number;
    if (safeL < 40) {
      targetL = 45;
    } else if (safeL <= 60) {
      targetL = 55;
    } else {
      targetL = 65;
    }

    // Calculate raw correction factor
    const rawFactor = targetL / safeL;

    // STRICT MATH VALIDATION: Check for NaN in rawFactor
    if (!Number.isFinite(rawFactor)) {
      throw new Error("CLINICAL_ERROR: LIGHTING_MATH_BREAKDOWN - Raw correction factor is not finite");
    }

    // Apply 30% Blend Factor to prevent blowing out skin tone
    const blendedFactor = 1 + (rawFactor - 1) * 0.3;

    // STRICT MATH VALIDATION: Check for NaN in blendedFactor
    if (!Number.isFinite(blendedFactor)) {
      throw new Error("CLINICAL_ERROR: LIGHTING_MATH_BREAKDOWN - Blended factor is not finite");
    }

    // Apply blendedFactor only to L channel with strict clamping
    const normalizedL = Math.min(100, Math.max(0, safeL * blendedFactor));

    // STRICT MATH VALIDATION: Check for NaN in normalizedL
    if (!Number.isFinite(normalizedL)) {
      throw new Error("CLINICAL_ERROR: LIGHTING_MATH_BREAKDOWN - Normalized L is not finite");
    }

    // Return new LAB object (immutable)
    const normalizedLab = {
      l: normalizedL,
      a: lab.a,
      b: lab.b
    };

    // Clinical debug logging
    console.log?.(`💡 Clinical Lighting: L=${safeL.toFixed(2)} → ${normalizedL.toFixed(2)} (target: ${targetL}, rawFactor: ${rawFactor.toFixed(3)}, blendedFactor: ${blendedFactor.toFixed(3)})`);

    return normalizedLab;
  }

  public getLightingRecommendation(metrics: LightingMetrics): string {
    if (metrics.averageBrightness < 30) {
      return '⚠️ Low lighting detected - applying correction';
    }
    if (metrics.averageBrightness > 220) {
      return '⚠️ High lighting detected - applying correction';
    }
    if (metrics.lightingUniformity < 0.5) {
      return '⚠️ Uneven lighting detected - applying correction';
    }
    if (metrics.hasHotspots && metrics.averageBrightness > 210) {
      return '⚠️ Lighting hotspots detected - applying correction';
    }
    if (metrics.hasShadows && metrics.averageBrightness < 40) {
      return '⚠️ Shadows detected - applying correction';
    }
    return '💡 Lighting optimized successfully';
  }
}

// ─── Phase 4: Named Exports for MirrorScreen Pipeline ────────────────────────

export const calculateForeheadLuminance = (imageData: ImageData, landmarks: any[]): number => {
  console.log('🔍 FOREHEAD DEBUG: landmarks.length:', landmarks.length);
  console.log('🔍 FOREHEAD DEBUG: landmarks[10]:', landmarks[10]);
  console.log('🔍 FOREHEAD DEBUG: landmarks[10] type:', typeof landmarks[10]);
  console.log('🔍 FOREHEAD DEBUG: landmarks[10] keys:', landmarks[10] ? Object.keys(landmarks[10]) : 'undefined');
  
  if (!imageData || !landmarks || landmarks.length < 468) {
    throw new Error("STRICT_SIGNAL_LOSS: Insufficient forehead landmarks for luminance reference");
  }

  // Use class instance for consistent sampling logic
  const lightingNormalizer = new LightingNormalization();
  
  // Sample from multiple forehead landmarks using class method
  const foreheadIndices = [10, 338, 297];
  let totalBrightness = 0;
  let sampleCount = 0;

  for (const idx of foreheadIndices) {
    console.log(`🔍 FOREHEAD DEBUG: Processing landmark ${idx}:`, landmarks[idx]);
    
    // Check both array format and object format
    let region = null;
    
    if (landmarks[idx] && typeof landmarks[idx] === 'object') {
      // Object format with x,y properties
      if ('x' in landmarks[idx] && 'y' in landmarks[idx]) {
        region = { 
          x: landmarks[idx].x, 
          y: landmarks[idx].y 
        };
        console.log(`🔍 FOREHEAD DEBUG: Using object format x:${region.x}, y:${region.y}`);
      }
      // Array format with [0], [1] indices
      else if (Array.isArray(landmarks[idx]) && landmarks[idx].length >= 2) {
        region = { 
          x: landmarks[idx][0], 
          y: landmarks[idx][1] 
        };
        console.log(`🔍 FOREHEAD DEBUG: Using array format x:${region.x}, y:${region.y}`);
      }
    }
    
    if (region) {
      try {
        console.log(`🔍 FOREHEAD DEBUG: Getting brightness for region:`, region);
        const rawBrightness = lightingNormalizer['getRegionBrightness'](
          imageData,
          region,
          imageData.width,
          imageData.height
        );
        console.log(`🔍 FOREHEAD DEBUG: Raw brightness (RGB 0-255): ${rawBrightness}`);
        
        // 🔥 CLINICAL FIX: Normalize RGB brightness to LAB L scale (0-100)
        const normalizedBrightness = Math.min(100, (rawBrightness / 255) * 100);
        console.log(`🔍 CLINICAL TRACE: L_raw=${rawBrightness}, L_normalized=${normalizedBrightness.toFixed(2)}`);
        
        totalBrightness += normalizedBrightness;
        sampleCount++;
      } catch (error) {
        console.log(`🔍 FOREHEAD DEBUG: Error getting brightness for landmark ${idx}:`, error);
        // Continue to next landmark if one fails
        continue;
      }
    } else {
      console.log(`🔍 FOREHEAD DEBUG: No valid region for landmark ${idx}`);
    }
  }

  console.log(`🔍 FOREHEAD DEBUG: Final sampleCount: ${sampleCount}, totalBrightness: ${totalBrightness}`);

  if (sampleCount === 0) {
    throw new Error("STRICT_SIGNAL_LOSS: No valid forehead luminance samples extracted");
  }

  const finalLRef = totalBrightness / sampleCount;
  console.log(`🔍 CLINICAL TRACE: L_ref_final=${finalLRef.toFixed(2)} (normalized to LAB scale)`);
  
  return finalLRef;
};

export const computeGlobalOffset = (L_ref: number, L_base: number): number => {
  if (!Number.isFinite(L_ref) || !Number.isFinite(L_base) || L_ref <= 0) {
    throw new Error("STRICT_SIGNAL_LOSS: Invalid reference luminance for global offset calculation");
  }
  return (L_base / L_ref) - 1;
};

export const applyLuminanceNormalization = (l: number, offsetRatio: number): number => {
  if (!Number.isFinite(l) || !Number.isFinite(offsetRatio)) {
    throw new Error("STRICT_SIGNAL_LOSS: Invalid parameters for luminance normalization");
  }
  const normalized = l * (1 + offsetRatio);
  return Math.max(0, Math.min(100, normalized));
};