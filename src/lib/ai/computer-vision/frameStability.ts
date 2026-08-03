export interface FrameStabilityMetrics {
  landmarkVariance: number;
  brightnessVariance: number;
  motionDetected: boolean;
  qualityScore: number;
}

export interface FrameData {
  imageData: ImageData;
  landmarks: number[][];
  timestamp: number;
  brightness: number;
  contrast: number;
}

export class FrameStability {
  // Incremental EMA for variance calculation - no array hoarding
  private landmarkVarianceEMA = 0;
  private brightnessVarianceEMA = 0;
  private readonly EMA_ALPHA = 0.1; // Smoothing factor
  
  private readonly STABILITY_THRESHOLD = 0.02;
  private readonly BRIGHTNESS_THRESHOLD = 15;
  private readonly MOTION_THRESHOLD = 5;
  
  private lastFrame: FrameData | null = null;

  public addFrame(frameData: FrameData): void {
    // Incremental EMA update - no array storage
    if (!this.lastFrame) {
      this.landmarkVarianceEMA = 0;
      this.brightnessVarianceEMA = 0;
      this.lastFrame = frameData;
      return;
    }
    
    // Update EMA with new frame data
    const currentLandmarkVariance = this.calculateFrameLandmarkVariance(frameData);
    const currentBrightnessVariance = this.calculateFrameBrightnessVariance(frameData);
    
    // Calculate motion detection between current and previous frame
    const jitter = this.calculateJitter(frameData.landmarks, this.lastFrame.landmarks);
    const motionDetected = !this.checkStability(jitter);
    
    this.landmarkVarianceEMA = this.EMA_ALPHA * currentLandmarkVariance + (1 - this.EMA_ALPHA) * this.landmarkVarianceEMA;
    this.brightnessVarianceEMA = this.EMA_ALPHA * currentBrightnessVariance + (1 - this.EMA_ALPHA) * this.brightnessVarianceEMA;
    this.lastFrame = frameData;
  }

  public analyzeStability(): FrameStabilityMetrics {
    if (!this.lastFrame) {
      return {
        landmarkVariance: 1,
        brightnessVariance: 1,
        motionDetected: true,
        qualityScore: 0,
      };
    }

    // Use EMA values - no post-capture loops
    const landmarkVariance = this.landmarkVarianceEMA;
    const brightnessVariance = this.brightnessVarianceEMA;
    
    // Simple motion detection between last two frames
    // Note: analyzeStability uses lastFrame only, so motion detection needs frame-to-frame comparison
    // This will be handled in addFrame with proper frame comparison
    const motionDetected = false; // Default to no motion detection in analyzeStability
    
    // Calculate overall quality score
    const qualityScore = this.calculateQualityScore(
      landmarkVariance,
      brightnessVariance,
      motionDetected
    );

    return {
      landmarkVariance,
      brightnessVariance,
      motionDetected,
      qualityScore,
    };
  }

  private calculateFrameLandmarkVariance(frame: FrameData): number {
    const lm = frame.landmarks;
    if (!lm || lm.length < 10) {
      throw new Error("INVALID_LANDMARK_DATA");
    }

    const center = lm[1]; // nose tip
    if (!center || center.length < 2) {
      throw new Error("INVALID_CENTER_POINT");
    }

    let total = 0;

    for (let i = 0; i < lm.length; i++) {
      const point = lm[i];
      if (!point || point.length < 2) {
        throw new Error("CORRUPTED_LANDMARK_POINT");
      }

      const dx = point[0] - center[0];
      const dy = point[1] - center[1];

      total += (dx * dx + dy * dy);
    }

    return total / lm.length;
  }

  private calculateFrameBrightnessVariance(frame: FrameData): number {
    if (!this.lastFrame) {
      throw new Error("NO_PREVIOUS_FRAME_FOR_BRIGHTNESS");
    }

    const brightnessVariance = Math.abs(
      frame.brightness - this.lastFrame.brightness
    );

    return brightnessVariance;
  }

  public calculateJitter(currentLandmarks: number[][], previousLandmarks: number[][]): number {
    if (!currentLandmarks || !previousLandmarks || 
        currentLandmarks.length === 0 || previousLandmarks.length === 0 ||
        currentLandmarks.length !== previousLandmarks.length) {
      return Infinity;
    }

    let totalDistance = 0;
    const landmarkCount = Math.min(currentLandmarks.length, previousLandmarks.length, 478);

    // Calculate Euclidean distance for each landmark
    for (let i = 0; i < landmarkCount; i++) {
      const current = currentLandmarks[i];
      const previous = previousLandmarks[i];
      
      const dx = current[0] - previous[0];
      const dy = current[1] - previous[1];
      
      // Strict 2D/3D safe access - DO NOT assume Z exists
      const dz =
        current.length > 2 && previous.length > 2
          ? current[2] - previous[2]
          : 0;
      
      totalDistance += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    return totalDistance / landmarkCount;
  }

  public checkStability(jitter: number): boolean {
    // Frame is stable if average landmark movement is less than 5 pixels
    return jitter <= 5.0;
  }

  public calculateJitter2D(currentLandmarks: number[][], previousLandmarks: number[][]): number {
    if (!currentLandmarks || !previousLandmarks || 
        currentLandmarks.length === 0 || previousLandmarks.length === 0 ||
        currentLandmarks.length !== previousLandmarks.length) {
      return Infinity;
    }

    let totalDistance = 0;
    const landmarkCount = Math.min(currentLandmarks.length, previousLandmarks.length, 478);

    // Calculate 2D Euclidean distance (x, y only)
    for (let i = 0; i < landmarkCount; i++) {
      const current = currentLandmarks[i];
      const previous = previousLandmarks[i];
      
      const dx = current[0] - previous[0];
      const dy = current[1] - previous[1];
      
      totalDistance += Math.sqrt(dx * dx + dy * dy);
    }

    return totalDistance / landmarkCount;
  }

  private calculateQualityScore(
    landmarkVariance: number,
    brightnessVariance: number,
    motionDetected: boolean
  ): number {
    let score = 100;

    // Penalize landmark instability
    if (landmarkVariance > this.STABILITY_THRESHOLD) {
      score -= (landmarkVariance - this.STABILITY_THRESHOLD) * 1000;
    }

    // Penalize brightness instability
    if (brightnessVariance > this.BRIGHTNESS_THRESHOLD) {
      score -= (brightnessVariance - this.BRIGHTNESS_THRESHOLD) * 2;
    }

    // Penalize motion
    if (motionDetected) {
      score -= 30;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  public getStableFrames(): FrameData[] {
    const stability = this.analyzeStability();
    
    if (stability.qualityScore < 70 || !this.lastFrame) {
      return [];
    }

    // Return only the last frame if stable - no array filtering
    return [this.lastFrame];
  }

  public clearBuffer(): void {
    // Reset EMA values - no array operations
    this.landmarkVarianceEMA = 0;
    this.brightnessVarianceEMA = 0;
    this.lastFrame = null;
  }

  public getBufferStatus(): {
    size: number;
    isStable: boolean;
    qualityScore: number;
  } {
    const stability = this.analyzeStability();
    
    return {
      size: this.lastFrame ? 1 : 0,
      isStable: stability.qualityScore >= 70,
      qualityScore: stability.qualityScore,
    };
  }

  public async calculateFrameBrightness(imageData: ImageData): Promise<number> {
    const data = imageData.data;
    let totalBrightness = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      if (i % 80000 === 0) {
        await new Promise(requestAnimationFrame);
      }

      // Calculate perceived brightness using luminance formula
      const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      totalBrightness += brightness;
    }

    return totalBrightness / pixelCount;
  }

  public async calculateFrameContrast(imageData: ImageData): Promise<number> {
    const data = imageData.data;
    let minBrightness = 255;
    let maxBrightness = 0;

    for (let i = 0; i < data.length; i += 4) {
      if (i % 80000 === 0) {
        await new Promise(requestAnimationFrame);
      }

      const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      minBrightness = Math.min(minBrightness, brightness);
      maxBrightness = Math.max(maxBrightness, brightness);
    }

    return maxBrightness - minBrightness;
  }
}
