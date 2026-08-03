// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - Camera Engine
// Production-grade camera handling with mobile optimization
// ═══════════════════════════════════════════════════════════════════════════

import { CameraConfig, CameraState, CameraMetrics } from '../types/engine.types';

export class CameraEngine {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private config: CameraConfig;
  private state: CameraState;
  private metrics: CameraMetrics;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private frameTimeHistory: number[] = [];
  private thermalMonitorInterval: number | null = null;
  private adaptiveQualityInterval: number | null = null;
  private isMobile: boolean;
  private thermalThreshold: number = 45; // Celsius
  private fpsTarget: number;
  private pipelineReady: boolean = false;

  constructor(config: CameraConfig) {
    this.config = config;
    this.isMobile = this.detectMobile();
    this.fpsTarget = this.isMobile ? 30 : 60;
    
    this.state = {
      isActive: false,
      stream: null,
      config: { ...config },
      actualResolution: { width: 0, height: 0 },
      actualFrameRate: 0,
      thermalStatus: 'normal',
    };

    this.metrics = {
      fps: 0,
      droppedFrames: 0,
      averageLatency: 0,
      thermalScore: 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMERA INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  async initialize(videoElement: HTMLVideoElement): Promise<boolean> {
    try {
      console.log('[PIPELINE][CAMERA] Starting camera initialization...');
      this.videoElement = videoElement;
      
      if (!this.videoElement) {
        console.error('[PIPELINE][CAMERA] ❌ Video element is null');
        return false;
      }

      console.log('[PIPELINE][CAMERA] Video element found, current srcObject:', this.videoElement.srcObject);
      
      // Check browser compatibility
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('[PIPELINE][CAMERA] ❌ Browser does not support mediaDevices API');
        console.error('[PIPELINE][CAMERA] ❌ navigator.mediaDevices:', navigator.mediaDevices);
        console.error('[PIPELINE][CAMERA] ❌ getUserMedia available:', !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
        console.error('[PIPELINE][CAMERA] ❌ Make sure you are running in a secure context (HTTPS or localhost)');
        return false;
      }
      
      // Apply mobile optimizations
      if (this.isMobile) {
        this.config = this.applyMobileOptimizations(this.config);
      }

      console.log('[PIPELINE][CAMERA] Requesting camera stream with constraints:', this.buildConstraints());
      
      // Get camera stream with constraints
      const constraints = this.buildConstraints();
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('[PIPELINE][CAMERA] ✅ Camera stream obtained, attaching to video element');
      console.log('[PIPELINE][CAMERA] Stream tracks:', this.stream.getTracks().length);
      
      // Attach stream to video element
      this.videoElement.srcObject = this.stream;
      this.videoElement.playsInline = true;
      this.videoElement.muted = true;
      this.videoElement.autoplay = true;
      
      console.log('[PIPELINE][CAMERA] Stream attached to video element, waiting for metadata...');
      
      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('[PIPELINE][CAMERA] ❌ Video metadata timeout after 10s');
          reject(new Error('Video metadata timeout'));
        }, 10000);

        this.videoElement!.onloadedmetadata = () => {
          clearTimeout(timeout);
          console.log('[PIPELINE][CAMERA] Video metadata loaded');
          console.log('[PIPELINE][CAMERA] Video dimensions:', this.videoElement!.videoWidth, 'x', this.videoElement!.videoHeight);
          console.log('[PIPELINE][CAMERA] Calling play()...');
          this.videoElement!.play()
            .then(() => {
              console.log('[PIPELINE][CAMERA] ✅ Video playing successfully');
              console.log('[PIPELINE][CAMERA] Video paused:', this.videoElement!.paused);
              console.log('[PIPELINE][CAMERA] Video readyState:', this.videoElement!.readyState);
              resolve();
            })
            .catch((err) => {
              console.error('[PIPELINE][CAMERA] ❌ Video play failed:', err);
              reject(err);
            });
        };
        this.videoElement!.onerror = (err) => {
          clearTimeout(timeout);
          console.error('[PIPELINE][CAMERA] ❌ Video element error:', err);
          reject(err);
        };
      });

      // Update state with actual resolution
      this.state.actualResolution = {
        width: this.videoElement.videoWidth,
        height: this.videoElement.videoHeight,
      };

      this.state.stream = this.stream;
      this.state.isActive = true;

      // Start monitoring
      this.startThermalMonitoring();
      this.startAdaptiveQuality();
      this.startPerformanceMonitoring();

      console.log('[PIPELINE][CAMERA] ✅ CameraEngine initialized:', `${this.state.actualResolution.width}x${this.state.actualResolution.height}`);
      return true;
    } catch (error) {
      console.error('[PIPELINE][CAMERA] ❌ CameraEngine initialization failed:', error);
      if (error instanceof Error) {
        console.error('[PIPELINE][CAMERA] ❌ Error name:', error.name);
        console.error('[PIPELINE][CAMERA] ❌ Error message:', error.message);
        if (error.stack) {
          console.error('[PIPELINE][CAMERA] ❌ Error stack:', error.stack);
        }
      }
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMERA CONSTRAINTS
  // ═══════════════════════════════════════════════════════════════════════════

  private buildConstraints(): MediaStreamConstraints {
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: this.config.facingMode,
        width: { ideal: this.config.width },
        height: { ideal: this.config.height },
        frameRate: { ideal: this.config.frameRate },
      },
      audio: false,
    };

    // Mobile-specific constraints
    if (this.isMobile) {
      const videoConstraints = constraints.video as MediaTrackConstraintSet;
      if (videoConstraints) {
        constraints.video = {
          facingMode: this.config.facingMode,
          // Prefer lower resolution on mobile for performance
          width: { ideal: Math.min(this.config.width, 1280) },
          height: { ideal: Math.min(this.config.height, 720) },
          frameRate: { ideal: Math.min(this.config.frameRate, 30) },
        };
      }
    }

    return constraints;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MOBILE OPTIMIZATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  private detectMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  private applyMobileOptimizations(config: CameraConfig): CameraConfig {
    // Reduce resolution for mobile
    const optimizedConfig = { ...config };
    
    if (this.isMobile) {
      optimizedConfig.width = Math.min(config.width, 1280);
      optimizedConfig.height = Math.min(config.height, 720);
      optimizedConfig.frameRate = Math.min(config.frameRate, 30);
    }

    return optimizedConfig;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // THERMAL MONITORING
  // ═══════════════════════════════════════════════════════════════════════════

  private startThermalMonitoring(): void {
    this.thermalMonitorInterval = window.setInterval(() => {
      this.checkThermalStatus();
    }, 5000); // Check every 5 seconds
  }

  private checkThermalStatus(): void {
    // Estimate thermal status from performance metrics
    const fps = this.metrics.fps;
    const targetFps = this.fpsTarget;
    const fpsRatio = fps / targetFps;

    if (fpsRatio < 0.5) {
      this.state.thermalStatus = 'critical';
      this.applyThermalThrottling();
    } else if (fpsRatio < 0.7) {
      this.state.thermalStatus = 'elevated';
      this.applyThermalThrottling();
    } else {
      this.state.thermalStatus = 'normal';
    }

    this.metrics.thermalScore = fpsRatio;
  }

  private applyThermalThrottling(): void {
    if (this.state.thermalStatus === 'critical') {
      // Reduce FPS target significantly
      this.fpsTarget = Math.max(15, this.fpsTarget - 10);
      console.warn(`⚠️ Thermal throttling: Reducing FPS to ${this.fpsTarget}`);
    } else if (this.state.thermalStatus === 'elevated') {
      // Moderate reduction
      this.fpsTarget = Math.max(20, this.fpsTarget - 5);
      console.warn(`⚠️ Thermal throttling: Reducing FPS to ${this.fpsTarget}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADAPTIVE QUALITY
  // ═══════════════════════════════════════════════════════════════════════════

  private startAdaptiveQuality(): void {
    this.adaptiveQualityInterval = window.setInterval(() => {
      this.adjustQuality();
    }, 10000); // Check every 10 seconds
  }

  private adjustQuality(): void {
    const fps = this.metrics.fps;
    const targetFps = this.fpsTarget;

    if (fps < targetFps * 0.8) {
      // Performance is poor, reduce quality
      this.reduceQuality();
    } else if (fps > targetFps * 1.2) {
      // Performance is good, can increase quality
      this.increaseQuality();
    }
  }

  private reduceQuality(): void {
    // Reduce resolution
    const newWidth = Math.max(640, this.state.actualResolution.width * 0.9);
    const newHeight = Math.max(480, this.state.actualResolution.height * 0.9);
    
    console.log(`📉 Reducing quality: ${this.state.actualResolution.width}x${this.state.actualResolution.height} → ${Math.floor(newWidth)}x${Math.floor(newHeight)}`);
    
    // Note: Actual resolution change requires re-initializing camera
    // This is a placeholder for the logic
  }

  private increaseQuality(): void {
    // Guard: Do not adjust quality until pipeline is ready (FaceMesh initialized)
    if (!this.pipelineReady) {
      return;
    }

    // Increase resolution if below target
    if (this.state.actualResolution.width < this.config.width) {
      const newWidth = Math.min(this.config.width, this.state.actualResolution.width * 1.1);
      const newHeight = Math.min(this.config.height, this.state.actualResolution.height * 1.1);
      
      console.log(`📈 Increasing quality: ${this.state.actualResolution.width}x${this.state.actualResolution.height} → ${Math.floor(newWidth)}x${Math.floor(newHeight)}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERFORMANCE MONITORING
  // ═══════════════════════════════════════════════════════════════════════════

  private startPerformanceMonitoring(): void {
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    
    const monitorFrame = () => {
      if (!this.state.isActive) return;

      const now = performance.now();
      const delta = now - this.lastFrameTime;
      
      this.frameCount++;
      
      // Calculate FPS every second
      if (delta >= 1000) {
        this.metrics.fps = (this.frameCount * 1000) / delta;
        this.state.actualFrameRate = this.metrics.fps;
        
        // Track frame time history
        this.frameTimeHistory.push(delta / this.frameCount);
        if (this.frameTimeHistory.length > 60) {
          this.frameTimeHistory.shift();
        }
        
        // Calculate average latency
        this.metrics.averageLatency = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
        
        // Reset counters
        this.frameCount = 0;
        this.lastFrameTime = now;
      }

      requestAnimationFrame(monitorFrame);
    };

    requestAnimationFrame(monitorFrame);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMERA CONTROL
  // ═══════════════════════════════════════════════════════════════════════════

  async stop(): Promise<void> {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    if (this.thermalMonitorInterval) {
      clearInterval(this.thermalMonitorInterval);
      this.thermalMonitorInterval = null;
    }

    if (this.adaptiveQualityInterval) {
      clearInterval(this.adaptiveQualityInterval);
      this.adaptiveQualityInterval = null;
    }

    this.state.isActive = false;
    this.state.stream = null;

    console.log('✅ CameraEngine stopped');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  getState(): CameraState {
    return { ...this.state };
  }

  getMetrics(): CameraMetrics {
    return { ...this.metrics };
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  getFPSTarget(): number {
    return this.fpsTarget;
  }

  setPipelineReady(ready: boolean): void {
    this.pipelineReady = ready;
  }
}
