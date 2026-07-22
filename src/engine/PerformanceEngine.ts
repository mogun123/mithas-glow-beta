// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - Performance Engine
// Device detection, quality switching, thermal monitoring for mobile optimization
// ═══════════════════════════════════════════════════════════════════════════

import { DeviceCapabilities, PerformanceSnapshot, QualitySettings, DeviceTier } from '../types/performance.types';
import { QUALITY_PRESETS } from '../types/performance.types';

export class PerformanceEngine {
  private capabilities: DeviceCapabilities | null = null;
  private currentQuality: QualitySettings | null = null;
  private deviceTier: DeviceTier = 'mid-range';
  private isThrottling: boolean = false;
  private thermalMonitorInterval: number | null = null;
  private performanceHistory: PerformanceSnapshot[] = [];
  private maxHistorySize: number = 100;
  private pipelineReady: boolean = false;

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZE PERFORMANCE ENGINE
  // ═══════════════════════════════════════════════════════════════════════════

  async initialize(): Promise<void> {
    // Detect device capabilities
    this.capabilities = await this.detectDeviceCapabilities();
    
    // Determine device tier
    this.deviceTier = this.determineDeviceTier();
    
    // Set initial quality based on tier
    this.currentQuality = QUALITY_PRESETS[this.deviceTier];
    
    // Start thermal monitoring
    this.startThermalMonitoring();
    
    console.log(`✅ PerformanceEngine initialized: ${this.deviceTier} tier`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DETECT DEVICE CAPABILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  private async detectDeviceCapabilities(): Promise<DeviceCapabilities> {
    // WebGL capabilities
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    let webglCapabilities = {
      version: 'unknown',
      maxTextures: 0,
      maxRenderBufferSize: 0,
      supportsFloatTextures: false,
      supportsHalfFloatTextures: false,
    };

    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      webglCapabilities.version = gl.getParameter(gl.VERSION);
      webglCapabilities.maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
      webglCapabilities.maxRenderBufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
      webglCapabilities.supportsFloatTextures = gl.getExtension('OES_texture_float') !== null;
      webglCapabilities.supportsHalfFloatTextures = gl.getExtension('OES_texture_half_float') !== null;
    }

    // GPU info
    const gpu = {
      vendor: 'unknown',
      renderer: 'unknown',
      maxTextureSize: 0,
      maxVertexAttributes: 0,
    };

    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        gpu.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        gpu.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      }
      gpu.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      gpu.maxVertexAttributes = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
    }

    // CPU info (simplified)
    const cpu = {
      cores: navigator.hardwareConcurrency || 4,
      memory: (navigator as any).deviceMemory || 8, // GB
    };

    // Mobile detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    // Battery API
    let battery = {
      level: 1.0,
      charging: true,
    };

    if ('getBattery' in navigator) {
      try {
        const batteryManager = await (navigator as any).getBattery();
        battery = {
          level: batteryManager.level,
          charging: batteryManager.charging,
        };
      } catch (e) {
        // Battery API not available
      }
    }

    // Thermal status (estimated)
    const thermal = {
      status: 'normal' as 'normal' | 'elevated' | 'critical',
      temperature: 30, // Celsius (estimated)
    };

    return {
      tier: this.deviceTier,
      gpu,
      cpu,
      webgl: webglCapabilities,
      mobile: {
        isMobile,
        platform: isMobile ? 'mobile' : 'desktop',
        battery,
        thermal,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DETERMINE DEVICE TIER
  // ═══════════════════════════════════════════════════════════════════════════

  private determineDeviceTier(): DeviceTier {
    if (!this.capabilities) return 'mid-range';

    const { cpu, gpu, webgl, mobile } = this.capabilities;

    // High-end criteria
    if (
      cpu.cores >= 8 &&
      cpu.memory >= 8 &&
      webgl.maxTextures >= 16 &&
      webgl.supportsFloatTextures &&
      !mobile.isMobile
    ) {
      return 'high-end';
    }

    // Low-end criteria
    if (
      cpu.cores <= 4 ||
      cpu.memory <= 4 ||
      webgl.maxTextures <= 8 ||
      !webgl.supportsHalfFloatTextures ||
      mobile.isMobile
    ) {
      return 'low-end';
    }

    return 'mid-range';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // START THERMAL MONITORING
  // ═══════════════════════════════════════════════════════════════════════════

  private startThermalMonitoring(): void {
    this.thermalMonitorInterval = window.setInterval(() => {
      this.checkThermalStatus();
    }, 5000); // Check every 5 seconds
  }

  private checkThermalStatus(): void {
    if (!this.capabilities) return;

    // Estimate thermal status from performance metrics
    const recentSnapshots = this.performanceHistory.slice(-10);
    if (recentSnapshots.length < 5) return;

    const avgFPS = recentSnapshots.reduce((sum, s) => sum + s.averageFPS, 0) / recentSnapshots.length;
    const targetFPS = (this.currentQuality && this.currentQuality.resolution.width >= 1280) ? 60 : 30;
    const fpsRatio = avgFPS / targetFPS;

    if (fpsRatio < 0.5) {
      this.capabilities.mobile.thermal.status = 'critical';
      this.isThrottling = true;
      this.applyThermalThrottling();
    } else if (fpsRatio < 0.7) {
      this.capabilities.mobile.thermal.status = 'elevated';
      this.isThrottling = true;
      this.applyThermalThrottling();
    } else {
      this.capabilities.mobile.thermal.status = 'normal';
      this.isThrottling = false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APPLY THERMAL THROTTLING
  // ═══════════════════════════════════════════════════════════════════════════

  private applyThermalThrottling(): void {
    if (!this.currentQuality) return;

    const thermalStatus = this.capabilities?.mobile.thermal.status || 'normal';

    if (thermalStatus === 'critical') {
      // Significant quality reduction
      this.currentQuality = {
        ...this.currentQuality,
        resolution: { width: 640, height: 480 },
        renderQuality: {
          antialias: false,
          shadows: false,
          reflections: false,
          postProcessing: false,
        },
        shaderQuality: 'simplified',
        textureQuality: 'low',
        particleCount: 50,
        lodBias: 1.5,
      };
    } else if (thermalStatus === 'elevated') {
      // Moderate quality reduction
      this.currentQuality = {
        ...this.currentQuality,
        renderQuality: {
          antialias: true,
          shadows: false,
          reflections: false,
          postProcessing: true,
        },
        shaderQuality: 'optimized',
        textureQuality: 'medium',
        particleCount: 200,
        lodBias: 1.0,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RECORD PERFORMANCE SNAPSHOT
  // ═══════════════════════════════════════════════════════════════════════════

  recordSnapshot(fps: number, frameTime: number, memory: number): void {
    const snapshot: PerformanceSnapshot = {
      averageFPS: fps,
      minFPS: fps, // Would need tracking over time
      maxFPS: fps, // Would need tracking over time
      averageFrameTime: frameTime,
      memoryUsage: memory,
      thermalStatus: this.capabilities?.mobile.thermal.status || 'normal',
      droppedFrameRate: Math.max(0, 60 - fps),
      timestamp: performance.now(),
    };

    this.performanceHistory.push(snapshot);

    // Limit history size
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADAPTIVE QUALITY SWITCHING
  // ═══════════════════════════════════════════════════════════════════════════

  adjustQualityBasedOnPerformance(): void {
    if (!this.currentQuality || this.performanceHistory.length < 10) return;

    const recentSnapshots = this.performanceHistory.slice(-10);
    const avgFPS = recentSnapshots.reduce((sum, s) => sum + s.averageFPS, 0) / recentSnapshots.length;
    const targetFPS = this.currentQuality.resolution.width >= 1280 ? 60 : 30;

    if (avgFPS < targetFPS * 0.6) {
      // Performance is poor, reduce quality
      this.reduceQuality();
    } else if (avgFPS > targetFPS * 1.2 && !this.isThrottling) {
      // Performance is good, can increase quality
      this.increaseQuality();
    }
  }

  private reduceQuality(): void {
    if (!this.currentQuality) return;

    const newResolution = {
      width: Math.max(640, this.currentQuality.resolution.width * 0.9),
      height: Math.max(480, this.currentQuality.resolution.height * 0.9),
    };

    this.currentQuality = {
      ...this.currentQuality,
      resolution: newResolution,
      lodBias: Math.min(2.0, this.currentQuality.lodBias + 0.2),
    };

    console.log(`📉 Reducing quality to ${Math.floor(newResolution.width)}x${Math.floor(newResolution.height)}`);
  }

  private increaseQuality(): void {
    // Guard: Do not adjust quality until pipeline is ready (FaceMesh initialized)
    if (!this.pipelineReady) {
      return;
    }

    if (!this.currentQuality) return;

    const maxResolution = QUALITY_PRESETS[this.deviceTier].resolution;
    const newResolution = {
      width: Math.min(maxResolution.width, this.currentQuality.resolution.width * 1.1),
      height: Math.min(maxResolution.height, this.currentQuality.resolution.height * 1.1),
    };

    this.currentQuality = {
      ...this.currentQuality,
      resolution: newResolution,
      lodBias: Math.max(0, this.currentQuality.lodBias - 0.1),
    };

    console.log(`📈 Increasing quality to ${Math.floor(newResolution.width)}x${Math.floor(newResolution.height)}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  getCapabilities(): DeviceCapabilities | null {
    return this.capabilities;
  }

  getCurrentQuality(): QualitySettings | null {
    return this.currentQuality;
  }

  getDeviceTier(): DeviceTier {
    return this.deviceTier;
  }

  isThrottlingActive(): boolean {
    return this.isThrottling;
  }

  getPerformanceHistory(): PerformanceSnapshot[] {
    return [...this.performanceHistory];
  }

  setPipelineReady(ready: boolean): void {
    this.pipelineReady = ready;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPOSE
  // ═══════════════════════════════════════════════════════════════════════════

  dispose(): void {
    if (this.thermalMonitorInterval) {
      clearInterval(this.thermalMonitorInterval);
      this.thermalMonitorInterval = null;
    }

    this.performanceHistory = [];
    this.isThrottling = false;

    console.log('✅ PerformanceEngine disposed');
  }
}
