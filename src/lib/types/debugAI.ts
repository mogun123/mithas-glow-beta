/**
 * ═════════════════════════════════════════════════════════════════════════════
 * 🤖 BEARD AI PIPELINE - REALTIME PIPELINE INSPECTOR TYPE DEFINITIONS
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * PRODUCTION-GRADE REALTIME AI PIPELINE MONITOR
 * 
 * - Exact pipeline stage progression
 * - Exact stage currently running
 * - Exact error location
 * - Exact failure reason
 * - Exact worker/API/render state
 * - Exact timing and latency
 * - Real async lifecycle flow
 */

// Pipeline stage states
export type PipelineStageState = 'waiting' | 'processing' | 'success' | 'failed' | 'blocked';

// All pipeline stages - Phase 1 Engine Architecture
export type PipelineStage =
  | 'camera_engine_ready'
  | 'facemesh_worker_active'
  | 'face_validation_check'
  | 'stabilization_anchoring'
  | 'threejs_render_pipeline';

// Individual stage state
export interface StageState {
  stage: PipelineStage;
  state: PipelineStageState;
  timestamp: number;
  duration?: number;
  error?: string;
}

// Pipeline event for timeline
export interface PipelineEvent {
  timestamp: number;
  stage: PipelineStage;
  type: 'stage_start' | 'stage_complete' | 'stage_failed' | 'error' | 'warning' | 'info';
  message: string;
  data?: any;
}

// API request/response tracking with full observability
export interface APIRequest {
  url: string;
  payload: any;
  timestamp: number;
  requestVersion: number;
  normalizedFaceShape: string;
  normalizedOccasion: string;
}

export interface APIResponse {
  status: number;
  statusText: string;
  body: string;
  timestamp: number;
  latency: number;
  recommendationsCount: number;
}

export interface APIError {
  status: number;
  statusText: string;
  body: string;
  errorType: 'ROUTE_NOT_FOUND' | 'BACKEND_OFFLINE' | 'API_TIMEOUT' | 'INVALID_SCHEMA' | 'SUPABASE_ERROR' | 'SQL_ERROR' | 'NETWORK_ERROR' | 'PARSE_ERROR' | 'INTERNAL_SERVER_ERROR' | 'WORKER_FAILURE' | 'WEBGL_FAILURE' | 'EMPTY_RESPONSE' | 'UNKNOWN';
  errorMessage: string;
  subsystem: 'vite_proxy_router' | 'supabase_query' | 'supabase_auth' | 'api_gateway' | 'edge_function' | 'network' | 'worker' | 'renderer' | 'unknown';
  sqlError?: string;
  stackTrace?: string;
  timestamp: number;
}

// Full request trace for observability
export interface RequestTrace {
  method: string;
  endpoint: string;
  proxyTarget: string;
  payload: any;
  headers: Record<string, string>;
  normalizedValues: {
    faceShape: string;
    occasion: string;
  };
  response: {
    status: number;
    statusText: string;
    body: string;
    timing: number;
  } | null;
  error: {
    type: string;
    subsystem: string;
    message: string;
  } | null;
  timestamp: number;
}

// Worker state tracking
export interface WorkerState {
  status: 'idle' | 'processing' | 'error' | 'aborted';
  landmarksCount: number;
  processingTime: number;
  geometry?: any;
  shapeResult?: any;
  error?: string;
}

// Renderer state tracking
export interface RendererState {
  type: string;
  status: 'idle' | 'active' | 'error';
  webglSupported: boolean;
  isLowEnd: boolean;
  fps: number;
  lastRenderTime: number;
  beardLoaded: boolean;
  beardModelName?: string;
  meshState?: string;
}

// Timing metrics
export interface PipelineTimings {
  systemInitialize: number;
  cameraReady: number;
  geometryExtraction: number;
  faceShapeAnalysis: number;
  apiRequest: number;
  apiResponse: number;
  styleMatching: number;
  beardOverlayBuild: number;
  webglRender: number;
  total: number;
}

// Error details
export interface ErrorDetails {
  stage: PipelineStage;
  subsystem: 'worker' | 'api' | 'renderer' | 'normalization' | 'camera' | 'supabase_query' | 'supabase_auth' | 'api_gateway' | 'edge_function' | 'network' | 'unknown' | 'vite_proxy_router';
  message: string;
  normalizedValues?: {
    faceShape?: string;
    occasion?: string;
  };
  requestPayload?: any;
  responsePayload?: any;
  stack?: string;
  timestamp: number;
}

// Main DEBUG_AI state interface
export interface DebugAIState {
  // Pipeline state
  currentStage: PipelineStage;
  completedStages: PipelineStage[];
  blockedStages: PipelineStage[];
  failedStage: PipelineStage | null;
  pipelineState: 'idle' | 'running' | 'completed' | 'failed' | 'blocked';
  
  // Stage states
  stages: Record<PipelineStage, StageState>;
  
  // Face data
  faceGeometry: {
    jawWidth: number;
    cheekboneRatio: number;
    symmetryScore: number;
  } | null;
  faceShape: string | null;
  normalizedFaceShape: string | null;
  
  // Occasion data
  occasion: string | null;
  normalizedOccasion: string | null;
  
  // API tracking with full observability
  apiRequest: APIRequest | null;
  apiResponse: APIResponse | null;
  apiError: APIError | null;
  requestTrace: RequestTrace | null;
  apiStatus: string | null;
  apiLatency: number | null;
  requestVersion: number | null;
  
  // Render state
  renderState: RendererState;
  
  // Worker state
  workerState: WorkerState;
  
  // WebGL state
  webglState: {
    initialized: boolean;
    contextLost: boolean;
    error?: string;
    unityRenderer?: boolean;
    trackingState?: 'tracking' | 'lost';
    trackingConfidence?: number;
    meshState?: string;
  };
  
  // FPS
  fps: number;
  
  // Timings
  timings: PipelineTimings;
  
  // Event timeline
  eventTimeline: PipelineEvent[];
  
  // Error details
  lastError: ErrorDetails | null;
  
  // Recommendations
  recommendationsCount: number;
  selectedStyleName: string | null;
  selectedStyleId: string | null;
  
  // Hybrid face shape info
  originalHybridShape?: string;
  extractedPrimaryShape?: string;
  
  // Debug flags
  debugFlags: {
    normalizationError?: string;
    workerInitError?: string;
    cleanupError?: string;
    beardModelError?: string;
  };

  // Region debug info for landmark processing
  regionDebug?: {
    landmarksCount: number;
    foreheadPointsPresent: boolean;
    regionPixelCount: number;
    currentFallbackStatus: 'INITIALIZING' | 'ERROR' | 'FALLBACK_USED' | 'SUCCESS';
    lastError: string;
    isProcessing: boolean;
    lastUpdate: string;
  };
  
  // Loading state
  isLoading: boolean;
  loadingStage: PipelineStage | null;

  // Additional debug properties
  error?: string;
  step?: string;
  face?: any;
  analysisStartTime?: number;
  status?: string;
  landmarksCount?: number;
}

// Declare global debug state on window
declare global {
  interface Window {
    DEBUG_AI: DebugAIState;
  }
}
