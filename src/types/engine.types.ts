// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - Engine Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// CAMERA ENGINE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CameraConfig {
  facingMode: 'user' | 'environment';
  width: number;
  height: number;
  frameRate: number;
}

export interface CameraState {
  isActive: boolean;
  stream: MediaStream | null;
  config: CameraConfig;
  actualResolution: { width: number; height: number };
  actualFrameRate: number;
  thermalStatus: 'normal' | 'elevated' | 'critical';
}

export interface CameraMetrics {
  fps: number;
  droppedFrames: number;
  averageLatency: number;
  thermalScore: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// FACEMESH ENGINE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface FaceLandmark {
  x: number;
  y: number;
  z?: number;
}

export interface FaceMeshResult {
  landmarks: FaceLandmark[];
  timestamp: number;
  confidence: number;
  headRotation: { pitch: number; yaw: number; roll: number };
  mouthOpen: number;
  expression: 'neutral' | 'smile' | 'talking' | 'surprised';
}

export interface FaceGeometry {
  jawWidth: number;
  cheekboneRatio: number;
  faceLength: number;
  symmetryScore: number;
  faceShape: 'oval' | 'round' | 'square' | 'diamond' | 'heart' | 'oblong';
  faceShapeConfidence: number;
  chinDepth: number;
  cheekWidth: number;
  foreheadRatio: number;
  jawSharpness: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION ENGINE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ValidationMetrics {
  lighting: { score: number; brightness: number; status: 'good' | 'poor' | 'dark' | 'bright' };
  blur: { score: number; variance: number; status: 'sharp' | 'blurry' };
  faceDistance: { score: number; distance: number; status: 'optimal' | 'too_close' | 'too_far' };
  faceVisibility: { score: number; visible: boolean; status: 'visible' | 'partial' | 'hidden' };
  chinVisibility: { score: number; visible: boolean };
  jawVisibility: { score: number; visible: boolean };
  faceAngle: { score: number; yaw: number; pitch: number; status: 'centered' | 'turned_left' | 'turned_right' | 'tilted' };
  cameraStability: { score: number; movement: number; status: 'stable' | 'shaky' };
}

export interface ValidationResult {
  isValid: boolean;
  overallScore: number;
  metrics: ValidationMetrics;
  issues: string[];
  guidance: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// STABILIZATION ENGINE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface StabilizedLandmarks {
  landmarks: FaceLandmark[];
  velocity: FaceLandmark[];
  confidence: number;
  jitterScore: number;
}

export interface StabilizationConfig {
  smoothingFactor: number;      // EMA alpha (0-1)
  kalmanGain: number;           // Kalman filter gain
  jitterThreshold: number;      // Jitter detection threshold
  velocityPrediction: boolean;  // Enable velocity prediction
  rotationalDamping: number;    // Rotational smoothing factor
}

// ═══════════════════════════════════════════════════════════════════════════
// DEPTH ENGINE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface DepthMap {
  chinProjection: number;
  cheekDepth: number;
  jawCurvature: number;
  sideContour: number;
  foreheadDepth: number;
  noseBridgeDepth: number;
}

export interface DepthEstimation {
  depthMap: DepthMap;
  confidence: number;
  pseudoDepthImage: Float32Array | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// ANCHOR ENGINE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface AnchorPoint {
  id: string;
  landmarkIndex: number;
  position: { x: number; y: number; z: number };
  weight: number;
  type: 'chin' | 'jaw' | 'cheek' | 'mustache' | 'neckline' | 'sideburn' | 'lip' | 'nose';
}

export interface AnchorSystem {
  anchors: AnchorPoint[];
  transform: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
  };
  confidence: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// BEARD ATTACHMENT ENGINE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface BeardTransform {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

export interface AttachmentConfig {
  followMouth: boolean;
  followExpression: boolean;
  depthAware: boolean;
  occlusionEnabled: boolean;
  skinBlending: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// THREE.JS ENGINE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ThreeSceneConfig {
  antialias: boolean;
  alpha: boolean;
  powerPreference: 'default' | 'high-performance' | 'low-power';
}

export interface RenderMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  memory: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// PERFORMANCE ENGINE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type DeviceTier = 'high-end' | 'mid-range' | 'low-end';

export interface PerformanceConfig {
  targetFPS: number;
  qualityTier: DeviceTier;
  adaptiveQuality: boolean;
  thermalThrottling: boolean;
  memoryLimit: number;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memory: number;
  thermal: number;
  deviceTier: DeviceTier;
  qualityLevel: number; // 0-100
}

// ═══════════════════════════════════════════════════════════════════════════
// BEARD ASSET TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface BeardStyle {
  id: string;
  name: string;
  description?: string;
  category?: string;
  model_path?: string;  // Storage path for signed URL generation
  model_3d_url: string;  // Full URL (deprecated, kept for compatibility)
  thumbnail_url?: string;
  texture_urls: {
    albedo: string;
    alpha: string;
    density: string;
    strand: string;
    normal: string;
    occlusion?: string;
  };
  anchorPresets?: AnchorSystem;
  shaderPresets: {
    density: number;
    length: number;
    opacity: number;
    edgeFeathering: number;
  };
  lightingProfile?: {
    ambientIntensity: number;
    specularIntensity: number;
    roughness: number;
  };
  scalePresets?: {
    min: number;
    max: number;
    default: number;
  };
  compatibility?: {
    minJawWidth: number;
    maxJawWidth: number;
    faceShapes: string[];
  };
  lodVersions?: {
    high: string;
    medium: string;
    low: string;
  };
  active?: boolean;  // Production flag
}

export interface LoadedBeardAsset {
  style: BeardStyle;
  glb: any; // THREE.Group
  textures: {
    albedo: any;
    alpha: any;
    density: any;
    strand: any;
    normal: any;
    occlusion?: any;
  };
  loadTime: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE ORCHESTRATOR TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface AREngineState {
  isInitialized: boolean;
  isActive: boolean;
  currentBeardStyle: BeardStyle | null;
  validation: ValidationResult | null;
  geometry: FaceGeometry | null;
  depth: DepthEstimation | null;
  anchors: AnchorSystem | null;
  performance: PerformanceMetrics;
}

export interface AREngineConfig {
  camera: CameraConfig;
  stabilization: StabilizationConfig;
  performance: PerformanceConfig;
  attachment: AttachmentConfig;
}
