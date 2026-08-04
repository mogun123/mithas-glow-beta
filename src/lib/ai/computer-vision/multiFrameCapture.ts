import { FrameData } from './frameStability';

export interface CaptureConfig {
  frameCount: number;
  captureDuration: number;
  minQualityScore: number;
  maxBlurScore: number;
  stabilityThreshold: number;
}

export interface CaptureResult {
  frames: FrameData[];
  averageQuality: number;
  captureDuration: number;
  framesAccepted: number;
  framesRejected: number;
}

export class MultiFrameCapture {
  private capturedFrames: FrameData[] = [];
  private captureStartTime: number = 0;
  private isCapturing: boolean = false;
  private captureTimer: number | null = null;

  private readonly defaultConfig: CaptureConfig = {
    frameCount: 20,
    captureDuration: 1500, // 1.5 seconds
    minQualityScore: 70,
    maxBlurScore: 100,
    stabilityThreshold: 0.02,
  };

  public async startCapture(
    config: Partial<CaptureConfig> = {},
    onFrame?: (frame: FrameData) => void
  ): Promise<CaptureResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    if (this.isCapturing) {
      throw new Error('Capture already in progress');
    }

    this.isCapturing = true;
    this.capturedFrames = [];
    this.captureStartTime = Date.now();

    return new Promise((resolve, reject) => {
      const frameInterval = finalConfig.captureDuration / finalConfig.frameCount;
      let frameCount = 0;

      const captureFrame = () => {
        if (!this.isCapturing) {
          reject(new Error('Capture was stopped'));
          return;
        }

        if (frameCount >= finalConfig.frameCount) {
          this.finalizeCapture(finalConfig, resolve, reject);
          return;
        }

        // Request frame from callback
        if (onFrame) {
          // This would be called from the camera loop
          setTimeout(() => {
            if (this.isCapturing) {
              frameCount++;
              captureFrame();
            }
          }, frameInterval);
        }
      };

      captureFrame();
    });
  }

  public addFrame(frameData: FrameData, config: Partial<CaptureConfig> = {}): boolean {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    if (!this.isCapturing) {
      return false;
    }

    // Check if we've exceeded capture duration
    const elapsed = Date.now() - this.captureStartTime;
    if (elapsed > finalConfig.captureDuration) {
      return false;
    }

    // Quality checks
    if (!this.validateFrame(frameData, finalConfig)) {
      return false;
    }

    this.capturedFrames.push(frameData);
    return true;
  }

  private validateFrame(frame: FrameData, config: CaptureConfig): boolean {
    // Check brightness quality
    if (frame.brightness < 20 || frame.brightness > 240) {
      return false;
    }

    // Check contrast
    if (frame.contrast < 30) {
      return false;
    }

    // Additional quality checks can be added here
    return true;
  }

  private finalizeCapture(
    config: CaptureConfig,
    resolve: (result: CaptureResult) => void,
    reject: (error: Error) => void
  ): void {
    this.isCapturing = false;

    if (this.capturedFrames.length < 12) {
      reject(new Error(`Insufficient frames captured: ${this.capturedFrames.length}/12 minimum`));
      return;
    }

    const averageQuality = this.calculateAverageQuality();
    const captureDuration = Date.now() - this.captureStartTime;

    const result: CaptureResult = {
      frames: [...this.capturedFrames],
      averageQuality,
      captureDuration,
      framesAccepted: this.capturedFrames.length,
      framesRejected: config.frameCount - this.capturedFrames.length,
    };

    resolve(result);
  }

  private calculateAverageQuality(): number {
    if (this.capturedFrames.length === 0) return 0;

    const totalQuality = this.capturedFrames.reduce((sum, frame) => {
      // Simple quality calculation based on brightness and contrast
      const brightnessScore = 100 - Math.abs(frame.brightness - 128);
      const contrastScore = Math.min(100, frame.contrast * 2);
      return sum + (brightnessScore + contrastScore) / 2;
    }, 0);

    return totalQuality / this.capturedFrames.length;
  }

  public stopCapture(): void {
    this.isCapturing = false;
    if (this.captureTimer) {
      clearTimeout(this.captureTimer);
      this.captureTimer = null;
    }
  }

  public reset(): void {
    this.stopCapture();
    this.capturedFrames = [];
    this.captureStartTime = 0;
  }

  public getStatus(): {
    isCapturing: boolean;
    framesCollected: number;
    elapsed: number;
    progress: number;
  } {
    const elapsed = this.captureStartTime ? Date.now() - this.captureStartTime : 0;
    const progress = this.isCapturing ? Math.min(100, (elapsed / this.defaultConfig.captureDuration) * 100) : 0;

    return {
      isCapturing: this.isCapturing,
      framesCollected: this.capturedFrames.length,
      elapsed,
      progress,
    };
  }

  public getCapturedFrames(): FrameData[] {
    return [...this.capturedFrames];
  }

  public async waitForFrames(targetCount: number, timeoutMs: number = 2000): Promise<FrameData[]> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (this.capturedFrames.length >= targetCount) {
          clearInterval(checkInterval);
          resolve([...this.capturedFrames.slice(0, targetCount)]);
        } else if (Date.now() - startTime > timeoutMs) {
          clearInterval(checkInterval);
          reject(new Error(`Timeout waiting for frames: got ${this.capturedFrames.length}/${targetCount}`));
        }
      }, 50);
    });
  }
}

// 🆕 SAFE FRAME CAPTURE FUNCTION
export async function captureFrames(video: HTMLVideoElement, totalFrames = 20): Promise<ImageData[]> {
  console.log("📸 Starting safe frame capture...");
  console.log("Video dimensions:", video.videoWidth, "x", video.videoHeight);
  console.log("Video readyState:", video.readyState);

  // Wait for video to be ready
  if (video.readyState < 2) {
    console.log("⏳ Waiting for video to load...");
    await new Promise((resolve) => {
      const checkReady = () => {
        if (video.readyState >= 2) {
          resolve(true);
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
  }

  const frames: ImageData[] = [];
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to create canvas context");
  }

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;

  console.log("Canvas dimensions:", canvas.width, "x", canvas.height);

  for (let i = 0; i < totalFrames; i++) {
    try {
      // Wait for video to be ready
      if (video.readyState < 2) {
        console.log(`Frame ${i + 1}: Video not ready, waiting...`);
        await new Promise(r => setTimeout(r, 100));
        continue;
      }

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Capture frame data
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      frames.push(frame);

      console.log(`✅ Captured frame ${i + 1}/${totalFrames}`);

      // Small delay between frames
      await new Promise(r => setTimeout(r, 70));

    } catch (error) {
      console.error(`❌ Error capturing frame ${i + 1}:`, error);
      continue;
    }
  }

  console.log(`📸 Frame capture complete: ${frames.length}/${totalFrames} frames captured`);
  
  if (frames.length === 0) {
    throw new Error("No frames were captured from the video");
  }

  return frames;
}
