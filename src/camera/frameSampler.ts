export interface FrameSamplerConfig {
  targetFPS: number;
  maxBufferSize: number;
  qualityThreshold: number;
  enableAutoQuality: boolean;
}

export interface SampledFrame {
  imageData: ImageData;
  timestamp: number;
  frameNumber: number;
  quality: number;
  metadata: {
    brightness: number;
    contrast: number;
    blurScore: number;
  };
}

export class FrameSampler {
  private config: FrameSamplerConfig;
  private frameBuffer: SampledFrame[] = [];
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private targetFrameInterval: number;
  private isSampling: boolean = false;

  constructor(config: Partial<FrameSamplerConfig> = {}) {
    this.config = {
      targetFPS: 30,
      maxBufferSize: 100,
      qualityThreshold: 70,
      enableAutoQuality: true,
      ...config,
    };

    this.targetFrameInterval = 1000 / this.config.targetFPS;
  }

  public startSampling(): void {
    this.isSampling = true;
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
  }

  public stopSampling(): void {
    this.isSampling = false;
  }

  public shouldSampleFrame(): boolean {
    if (!this.isSampling) return false;

    const currentTime = performance.now();
    const timeSinceLastFrame = currentTime - this.lastFrameTime;

    if (timeSinceLastFrame >= this.targetFrameInterval) {
      this.lastFrameTime = currentTime;
      return true;
    }

    return false;
  }

  public sampleFrame(imageData: ImageData): SampledFrame | null {
    if (!this.shouldSampleFrame()) return null;

    const timestamp = performance.now();
    const metadata = this.analyzeFrameQuality(imageData);
    
    // Auto quality filtering
    if (this.config.enableAutoQuality && metadata.blurScore < this.config.qualityThreshold) {
      return null;
    }

    const frame: SampledFrame = {
      imageData,
      timestamp,
      frameNumber: this.frameCount++,
      quality: this.calculateOverallQuality(metadata),
      metadata,
    };

    // Add to buffer
    this.addToBuffer(frame);

    return frame;
  }

  private analyzeFrameQuality(imageData: ImageData): {
    brightness: number;
    contrast: number;
    blurScore: number;
  } {
    const brightness = this.calculateBrightness(imageData);
    const contrast = this.calculateContrast(imageData);
    const blurScore = this.calculateBlurScore(imageData);

    return {
      brightness,
      contrast,
      blurScore,
    };
  }

  private calculateBrightness(imageData: ImageData): number {
    const data = imageData.data;
    let totalBrightness = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      // Calculate perceived brightness using luminance formula
      const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      totalBrightness += brightness;
    }

    return totalBrightness / pixelCount;
  }

  private calculateContrast(imageData: ImageData): number {
    const data = imageData.data;
    let minBrightness = 255;
    let maxBrightness = 0;

    for (let i = 0; i < data.length; i += 4) {
      const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      minBrightness = Math.min(minBrightness, brightness);
      maxBrightness = Math.max(maxBrightness, brightness);
    }

    return maxBrightness - minBrightness;
  }

  private calculateBlurScore(imageData: ImageData): number {
    // Simplified Laplacian variance for blur detection
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    let laplacianSum = 0;
    let pixelCount = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        // Convert to grayscale
        const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        
        // Calculate Laplacian (simplified)
        const center = gray;
        const top = 0.299 * data[((y - 1) * width + x) * 4] + 
                   0.587 * data[((y - 1) * width + x) * 4 + 1] + 
                   0.114 * data[((y - 1) * width + x) * 4 + 2];
        const bottom = 0.299 * data[((y + 1) * width + x) * 4] + 
                      0.587 * data[((y + 1) * width + x) * 4 + 1] + 
                      0.114 * data[((y + 1) * width + x) * 4 + 2];

        const laplacian = (top + bottom - 2 * center);
        laplacianSum += laplacian * laplacian;
        pixelCount++;
      }
    }

    const variance = laplacianSum / pixelCount;
    // Normalize to 0-100 scale
    return Math.min(100, Math.max(0, variance / 50));
  }

  private calculateOverallQuality(metadata: {
    brightness: number;
    contrast: number;
    blurScore: number;
  }): number {
    // Optimal brightness is 100-150
    const brightnessScore = metadata.brightness >= 100 && metadata.brightness <= 150 ? 100 : 
                           Math.max(0, 100 - Math.abs(metadata.brightness - 125) * 2);
    
    // Optimal contrast is 50-100
    const contrastScore = metadata.contrast >= 50 && metadata.contrast <= 100 ? 100 :
                         Math.max(0, 100 - Math.abs(metadata.contrast - 75) * 2);
    
    // Blur score is already normalized
    const blurScore = metadata.blurScore;

    // Weighted average
    return (brightnessScore * 0.3 + contrastScore * 0.3 + blurScore * 0.4);
  }

  private addToBuffer(frame: SampledFrame): void {
    this.frameBuffer.push(frame);

    // Remove old frames if buffer is full
    if (this.frameBuffer.length > this.config.maxBufferSize) {
      this.frameBuffer.shift();
    }
  }

  public getBestFrames(count: number = 5): SampledFrame[] {
    // Sort frames by quality score (descending)
    const sortedFrames = [...this.frameBuffer].sort((a, b) => b.quality - a.quality);
    return sortedFrames.slice(0, count);
  }

  public getRecentFrames(timeWindowMs: number = 1000): SampledFrame[] {
    const cutoffTime = performance.now() - timeWindowMs;
    return this.frameBuffer.filter(frame => frame.timestamp >= cutoffTime);
  }

  public getFramesByQuality(minQuality: number): SampledFrame[] {
    return this.frameBuffer.filter(frame => frame.quality >= minQuality);
  }

  public getAverageQuality(): number {
    if (this.frameBuffer.length === 0) return 0;
    
    const totalQuality = this.frameBuffer.reduce((sum, frame) => sum + frame.quality, 0);
    return totalQuality / this.frameBuffer.length;
  }

  public getQualityStats(): {
    average: number;
    min: number;
    max: number;
    standardDeviation: number;
  } {
    if (this.frameBuffer.length === 0) {
      return { average: 0, min: 0, max: 0, standardDeviation: 0 };
    }

    const qualities = this.frameBuffer.map(frame => frame.quality);
    const average = qualities.reduce((sum, q) => sum + q, 0) / qualities.length;
    const min = Math.min(...qualities);
    const max = Math.max(...qualities);
    
    const variance = qualities.reduce((sum, q) => sum + Math.pow(q - average, 2), 0) / qualities.length;
    const standardDeviation = Math.sqrt(variance);

    return { average, min, max, standardDeviation };
  }

  public clearBuffer(): void {
    this.frameBuffer = [];
  }

  public getBufferStatus(): {
    size: number;
    maxSize: number;
    isFull: boolean;
    averageQuality: number;
  } {
    return {
      size: this.frameBuffer.length,
      maxSize: this.config.maxBufferSize,
      isFull: this.frameBuffer.length >= this.config.maxBufferSize,
      averageQuality: this.getAverageQuality(),
    };
  }

  public updateConfig(newConfig: Partial<FrameSamplerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.targetFrameInterval = 1000 / this.config.targetFPS;
  }

  public getConfig(): FrameSamplerConfig {
    return { ...this.config };
  }

  public getFrameCount(): number {
    return this.frameCount;
  }

  public isActivelySampling(): boolean {
    return this.isSampling;
  }

  public exportFrames(): SampledFrame[] {
    return [...this.frameBuffer];
  }

  public importFrames(frames: SampledFrame[]): void {
    this.frameBuffer = [...frames];
    
    // Trim buffer if it exceeds max size
    if (this.frameBuffer.length > this.config.maxBufferSize) {
      this.frameBuffer = this.frameBuffer.slice(-this.config.maxBufferSize);
    }
  }

  public getFrameAtTime(timestamp: number): SampledFrame | null {
    // Find the frame closest to the specified timestamp
    let closestFrame: SampledFrame | null = null;
    let minTimeDiff = Infinity;

    for (const frame of this.frameBuffer) {
      const timeDiff = Math.abs(frame.timestamp - timestamp);
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        closestFrame = frame;
      }
    }

    return closestFrame;
  }

  public getFramesInRange(startTime: number, endTime: number): SampledFrame[] {
    return this.frameBuffer.filter(frame => 
      frame.timestamp >= startTime && frame.timestamp <= endTime
    );
  }

  // Static utility methods
  public static createOptimalConfig(): FrameSamplerConfig {
    return {
      targetFPS: 30,
      maxBufferSize: 100,
      qualityThreshold: 70,
      enableAutoQuality: true,
    };
  }

  public static createHighQualityConfig(): FrameSamplerConfig {
    return {
      targetFPS: 15,
      maxBufferSize: 50,
      qualityThreshold: 85,
      enableAutoQuality: true,
    };
  }

  public static createLowLatencyConfig(): FrameSamplerConfig {
    return {
      targetFPS: 60,
      maxBufferSize: 30,
      qualityThreshold: 60,
      enableAutoQuality: false,
    };
  }
}
