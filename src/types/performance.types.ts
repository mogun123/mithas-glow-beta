// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - Performance Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// DEVICE CAPABILITY DETECTION
// ═══════════════════════════════════════════════════════════════════════════

export interface DeviceCapabilities {
  tier: DeviceTier;
  gpu: {
    vendor: string;
    renderer: string;
    maxTextureSize: number;
    maxVertexAttributes: number;
  };
  cpu: {
    cores: number;
    memory: number;
  };
  webgl: {
    version: string;
    maxTextures: number;
    maxRenderBufferSize: number;
    supportsFloatTextures: boolean;
    supportsHalfFloatTextures: boolean;
  };
  mobile: {
    isMobile: boolean;
    platform: string;
    battery: {
      level: number;
      charging: boolean;
    };
    thermal: {
      status: 'normal' | 'elevated' | 'critical';
      temperature: number;
    };
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PERFORMANCE MONITORING
// ═══════════════════════════════════════════════════════════════════════════

export interface FrameMetrics {
  timestamp: number;
  frameTime: number;
  fps: number;
  memory: number;
  thermal: number;
  droppedFrames: number;
}

export interface PerformanceSnapshot {
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  averageFrameTime: number;
  memoryUsage: number;
  thermalStatus: string;
  droppedFrameRate: number;
  timestamp: number;
}

export interface PerformanceHistory {
  snapshots: PerformanceSnapshot[];
  currentFPS: number;
  targetFPS: number;
  qualityLevel: number;
  isThrottling: boolean;
}

export type DeviceTier = 'high-end' | 'mid-range' | 'low-end';

// ═══════════════════════════════════════════════════════════════════════════
// QUALITY TIERS
// ═══════════════════════════════════════════════════════════════════════════

export interface QualitySettings {
  tier: DeviceTier;
  resolution: {
    width: number;
    height: number;
  };
  renderQuality: {
    antialias: boolean;
    shadows: boolean;
    reflections: boolean;
    postProcessing: boolean;
  };
  shaderQuality: 'full' | 'optimized' | 'simplified';
  textureQuality: 'high' | 'medium' | 'low';
  particleCount: number;
  lodBias: number;
}

export const QUALITY_PRESETS: Record<DeviceTier, QualitySettings> = {
  'high-end': {
    tier: 'high-end',
    resolution: { width: 1920, height: 1080 },
    renderQuality: {
      antialias: true,
      shadows: true,
      reflections: true,
      postProcessing: true,
    },
    shaderQuality: 'full',
    textureQuality: 'high',
    particleCount: 1000,
    lodBias: 0,
  },
  'mid-range': {
    tier: 'mid-range',
    resolution: { width: 1280, height: 720 },
    renderQuality: {
      antialias: true,
      shadows: true,
      reflections: false,
      postProcessing: true,
    },
    shaderQuality: 'optimized',
    textureQuality: 'medium',
    particleCount: 500,
    lodBias: 0.5,
  },
  'low-end': {
    tier: 'low-end',
    resolution: { width: 854, height: 480 },
    renderQuality: {
      antialias: false,
      shadows: false,
      reflections: false,
      postProcessing: false,
    },
    shaderQuality: 'simplified',
    textureQuality: 'low',
    particleCount: 100,
    lodBias: 1.0,
  },
};
