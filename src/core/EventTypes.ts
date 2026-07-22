// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - Event Type Definitions
// Type-safe event system for engine communication
// ═══════════════════════════════════════════════════════════════════════════

import { FaceLandmark } from '../types/engine.types';
import { ValidationResult } from '../types/engine.types';
import { AnchorSystem } from '../types/engine.types';
import { BeardTransform } from '../types/engine.types';
import { BeardStyle } from '../types/engine.types';
import { DepthMap } from '../types/engine.types';
import { PipelineState } from '../engine/ARPipelineController';

// ═══════════════════════════════════════════════════════════════════════════
// EVENT NAMES
// ═══════════════════════════════════════════════════════════════════════════

export const AREvents = {
  // Camera Events
  VIDEO_FRAME: 'VIDEO_FRAME',
  CAMERA_READY: 'CAMERA_READY',
  CAMERA_ERROR: 'CAMERA_ERROR',

  // FaceMesh Events
  FACE_RESULTS: 'FACE_RESULTS',
  FACE_LOST: 'FACE_LOST',
  FACE_DETECTED: 'FACE_DETECTED',

  // Face Lifecycle Events
  FACE_TRACKING: 'FACE_TRACKING',
  FACE_STABLE: 'FACE_STABLE',
  FACE_UNSTABLE: 'FACE_UNSTABLE',
  STABILIZED_LANDMARKS: 'STABILIZED_LANDMARKS',
  DEPTH_MAP_GENERATED: 'DEPTH_MAP_GENERATED',

  // Validation Events
  VALIDATION_STARTED: 'VALIDATION_STARTED',
  VALIDATION_SUCCESS: 'VALIDATION_SUCCESS',
  VALIDATION_FAILED: 'VALIDATION_FAILED',

  // Pipeline Events
  PIPELINE_STATE_CHANGE: 'PIPELINE_STATE_CHANGE',
  ANALYSIS_COMPLETE: 'ANALYSIS_COMPLETE',
  RESET_PIPELINE: 'RESET_PIPELINE',

  // Anchor Events
  ANCHORS_GENERATED: 'ANCHORS_GENERATED',
  ANCHORS_UPDATED: 'ANCHORS_UPDATED',

  // Beard Events
  BEARD_LOADED: 'BEARD_LOADED',
  BEARD_LOAD_FAILED: 'BEARD_LOAD_FAILED',
  ATTACHMENT_READY: 'ATTACHMENT_READY',
  ATTACHMENT_UPDATED: 'ATTACHMENT_UPDATED',

  // Render Events
  AR_READY: 'AR_READY',
  RENDER_FRAME: 'RENDER_FRAME',
  RENDER_ERROR: 'RENDER_ERROR',

  // Scan Events
  SCAN_STARTED: 'SCAN_STARTED',
  SCAN_STATE_CHANGE: 'SCAN_STATE_CHANGE',
  SCAN_PHASE_COMPLETE: 'SCAN_PHASE_COMPLETE',
  SCAN_COMPLETE: 'SCAN_COMPLETE',
  SCAN_FAILED: 'SCAN_FAILED',

  // Performance Events
  PERFORMANCE_UPDATE: 'PERFORMANCE_UPDATE',
  FRAME_DROPPED: 'FRAME_DROPPED',
} as const;

export type AREventName = typeof AREvents[keyof typeof AREvents];

// ═══════════════════════════════════════════════════════════════════════════
// EVENT DATA INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface VideoFrameEvent {
  timestamp: number;
  frameId: number;
  width: number;
  height: number;
}

export interface CameraReadyEvent {
  timestamp: number;
  width: number;
  height: number;
  frameRate: number;
}

export interface CameraErrorEvent {
  error: string;
  timestamp: number;
}

export interface FaceResultsEvent {
  landmarks: FaceLandmark[];
  timestamp: number;
  confidence: number;
  headRotation: { pitch: number; yaw: number; roll: number };
  mouthOpen: number;
  expression: 'neutral' | 'smile' | 'talking' | 'surprised';
}

export interface FaceLostEvent {
  timestamp: number;
  reason: 'no_detection' | 'low_confidence' | 'tracking_lost';
}

export interface FaceDetectedEvent {
  timestamp: number;
  confidence: number;
  landmarkCount: number;
}

export interface FaceTrackingEvent {
  timestamp: number;
  isTracking: boolean;
  confidence: number;
}

export interface FaceStableEvent {
  timestamp: number;
  stabilityScore: number;
  duration: number;
}

export interface FaceUnstableEvent {
  timestamp: number;
  reason: 'movement' | 'blur' | 'occlusion';
  stabilityScore: number;
}

export interface StabilizedLandmarksEvent {
  stabilized: {
    landmarks: FaceLandmark[];
    velocity: FaceLandmark[];
    confidence: number;
    jitterScore: number;
  };
  timestamp: number;
}

export interface DepthMapGeneratedEvent {
  depthMap: DepthMap;
  confidence: number;
  timestamp: number;
}

export interface ValidationStartedEvent {
  timestamp: number;
  expectedDuration: number;
}

export interface ValidationSuccessEvent {
  result: ValidationResult;
  timestamp: number;
  duration: number;
}

export interface ValidationFailedEvent {
  result: ValidationResult;
  timestamp: number;
  duration: number;
}

export interface PipelineStateChangeEvent {
  fromState: PipelineState;
  toState: PipelineState;
  reason: string;
  timestamp: number;
}

export interface AnalysisCompleteEvent {
  timestamp: number;
  geometry: any;
  depth: any;
}

export interface ResetPipelineEvent {
  reason: string;
  timestamp: number;
}

export interface AnchorsGeneratedEvent {
  anchors: AnchorSystem;
  timestamp: number;
}

export interface AnchorsUpdatedEvent {
  anchors: AnchorSystem;
  timestamp: number;
}

export interface BeardLoadedEvent {
  style: BeardStyle;
  timestamp: number;
  loadTime: number;
}

export interface BeardLoadFailedEvent {
  style: BeardStyle;
  error: string;
  timestamp: number;
}

export interface AttachmentReadyEvent {
  transform: BeardTransform;
  timestamp: number;
}

export interface AttachmentUpdatedEvent {
  transform: BeardTransform;
  timestamp: number;
}

export interface ARReadyEvent {
  timestamp: number;
}

export interface RenderFrameEvent {
  timestamp: number;
  frameId: number;
}

export interface RenderErrorEvent {
  error: string;
  timestamp: number;
}

export interface ScanStartedEvent {
  timestamp: number;
  totalPhases: number;
}

export interface ScanStateChangeEvent {
  state: 'LOOK_STRAIGHT' | 'TURN_LEFT' | 'TURN_RIGHT' | 'SCAN_COMPLETE';
  instruction: string;
  currentPhase: number;
  totalPhases: number;
  timestamp: number;
}

export interface ScanPhaseCompleteEvent {
  phase: string;
  phaseIndex: number;
  totalPhases: number;
  timestamp: number;
}

export interface Spatial3DBoundaries {
  front: {
    jawWidth: number;
    faceHeight: number;
    noseToChin: number;
  };
  left: {
    jawWidth: number;
    faceHeight: number;
    noseToChin: number;
  };
  right: {
    jawWidth: number;
    faceHeight: number;
    noseToChin: number;
  };
  absolute: {
    maxJawWidth: number;
    avgJawWidth: number;
    maxFaceHeight: number;
    avgFaceHeight: number;
  };
}

export interface ScanCompleteEvent {
  timestamp: number;
  totalDuration: number;
  spatialBoundaries: Spatial3DBoundaries;
}

export interface ScanFailedEvent {
  error: string;
  timestamp: number;
}

export interface PerformanceUpdateEvent {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  timestamp: number;
}

export interface FrameDroppedEvent {
  timestamp: number;
  reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT UNION TYPE
// ═══════════════════════════════════════════════════════════════════════════

export type AREventData =
  | VideoFrameEvent
  | CameraReadyEvent
  | CameraErrorEvent
  | FaceResultsEvent
  | FaceLostEvent
  | FaceDetectedEvent
  | FaceTrackingEvent
  | FaceStableEvent
  | FaceUnstableEvent
  | ValidationStartedEvent
  | ValidationSuccessEvent
  | ValidationFailedEvent
  | PipelineStateChangeEvent
  | AnalysisCompleteEvent
  | ResetPipelineEvent
  | AnchorsGeneratedEvent
  | AnchorsUpdatedEvent
  | BeardLoadedEvent
  | BeardLoadFailedEvent
  | AttachmentReadyEvent
  | AttachmentUpdatedEvent
  | ARReadyEvent
  | RenderFrameEvent
  | RenderErrorEvent
  | ScanStartedEvent
  | ScanStateChangeEvent
  | ScanPhaseCompleteEvent
  | ScanCompleteEvent
  | ScanFailedEvent
  | PerformanceUpdateEvent
  | FrameDroppedEvent;

// ═══════════════════════════════════════════════════════════════════════════
// EVENT HANDLER TYPE
// ═══════════════════════════════════════════════════════════════════════════

export type AREventHandler<T extends AREventData = AREventData> = (data: T) => void;
