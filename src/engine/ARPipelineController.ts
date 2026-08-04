// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - AR Pipeline Controller (Refactored)
// Event-driven state machine - true orchestrator only
// ═══════════════════════════════════════════════════════════════════════════

import { FaceLandmark } from '../types/engine.types';
import { ValidationResult } from '../types/engine.types';
import { ScanProgress } from './ScanFlowEngine';
import { globalEventBus } from '../core/EventBus';
import { AREvents, FaceDetectedEvent, FaceLostEvent, FaceStableEvent, ValidationSuccessEvent, ValidationFailedEvent, ResetPipelineEvent, CameraReadyEvent, BeardLoadFailedEvent, ScanCompleteEvent } from '../core/EventTypes';

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE STATES
// ═══════════════════════════════════════════════════════════════════════════

export enum PipelineState {
  BOOT = 'BOOT',
  CAMERA_READY = 'CAMERA_READY',
  FACE_DETECTED = 'FACE_DETECTED',
  VALIDATING_FACE = 'VALIDATING_FACE',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  SCANNING = 'SCANNING',
  ANALYZING = 'ANALYZING',
  GENERATING_ANCHORS = 'GENERATING_ANCHORS',
  LOADING_BEARD = 'LOADING_BEARD',
  ATTACHING_BEARD = 'ATTACHING_BEARD',
  RENDERING = 'RENDERING',
  ACTIVE_AR = 'ACTIVE_AR',
}

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE STATE DATA
// ═══════════════════════════════════════════════════════════════════════════

export interface PipelineStateData {
  state: PipelineState;
  timestamp: number;
  error?: string;
  validation?: ValidationResult;
  scanProgress?: ScanProgress;
  landmarks?: FaceLandmark[];
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE TRANSITION CALLBACKS
// ═══════════════════════════════════════════════════════════════════════════

export interface PipelineCallbacks {
  onStateChange: (data: PipelineStateData) => void;
  onValidationStart: () => void;
  onScanStart: () => void;
  onScanPhaseChange: (phase: string, progress: ScanProgress) => void;
  onScanComplete: () => void;
  onAnalysisStart: () => void;
  onAnchorGenerationStart: () => void;
  onBeardLoadStart: () => void;
  onBeardLoadComplete: () => void;
  onError?: (error: { type: string; style?: any; error: string }) => void;
  onAttachmentStart: () => void;
  onAttachmentComplete: () => void;
  onRenderingStart: () => void;
  onActiveAR: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE CONTROLLER CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class ARPipelineController {
  private currentState: PipelineState = PipelineState.BOOT;
  private callbacks: PipelineCallbacks;
  private validationTimer: number | null = null;
  private scanPhaseTimer: number | null = null;
  private analysisTimer: number | null = null;
  private anchorTimer: number | null = null;
  private beardLoadTimer: number | null = null;
  private attachmentTimer: number | null = null;
  private validationExecuted: boolean = false;
  private transitionGuards: Map<string, (from: PipelineState, to: PipelineState) => boolean>;

  constructor(callbacks: PipelineCallbacks) {
    this.callbacks = callbacks;
    this.transitionGuards = new Map();
    this.setupTransitionGuards();
    this.setupEventListeners();
    this.transitionTo(PipelineState.BOOT);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP TRANSITION GUARDS
  // ═══════════════════════════════════════════════════════════════════════════

  private setupTransitionGuards(): void {
    // BOOT → CAMERA_READY
    this.transitionGuards.set('BOOT->CAMERA_READY', () => true);

    // CAMERA_READY → FACE_DETECTED
    this.transitionGuards.set('CAMERA_READY->FACE_DETECTED', () => true);

    // CAMERA_READY → VALIDATING_FACE (fast-path when FACE_STABLE arrives before FACE_DETECTED)
    this.transitionGuards.set('CAMERA_READY->VALIDATING_FACE', () => true);

    // FACE_DETECTED → VALIDATING_FACE
    this.transitionGuards.set('FACE_DETECTED->VALIDATING_FACE', () => true);

    // VALIDATING_FACE → VALIDATION_FAILED
    this.transitionGuards.set('VALIDATING_FACE->VALIDATION_FAILED', () => true);

    // VALIDATING_FACE → SCANNING
    this.transitionGuards.set('VALIDATING_FACE->SCANNING', () => true);

    // SCANNING → ANALYZING
    this.transitionGuards.set('SCANNING->ANALYZING', () => true);

    // VALIDATION_FAILED → VALIDATING_FACE (retry)
    this.transitionGuards.set('VALIDATION_FAILED->VALIDATING_FACE', () => true);

    // ANALYZING → GENERATING_ANCHORS
    this.transitionGuards.set('ANALYZING->GENERATING_ANCHORS', () => true);

    // GENERATING_ANCHORS → LOADING_BEARD
    this.transitionGuards.set('GENERATING_ANCHORS->LOADING_BEARD', () => true);

    // LOADING_BEARD → ATTACHING_BEARD
    this.transitionGuards.set('LOADING_BEARD->ATTACHING_BEARD', () => true);

    // ATTACHING_BEARD → ACTIVE_AR
    this.transitionGuards.set('ATTACHING_BEARD->ACTIVE_AR', () => true);

    // ACTIVE_AR → CAMERA_READY (face lost)
    this.transitionGuards.set('ACTIVE_AR->CAMERA_READY', () => true);

    // ANY → CAMERA_READY (reset)
    this.transitionGuards.set('ANY->CAMERA_READY', () => true);

    // ILLEGAL TRANSITIONS - REJECT THESE
    // ACTIVE_AR → VALIDATING_FACE (cannot re-validate while active)
    this.transitionGuards.set('ACTIVE_AR->VALIDATING_FACE', () => false);

    // CAMERA_READY → ATTACHING_BEARD (must detect face first)
    this.transitionGuards.set('CAMERA_READY->ATTACHING_BEARD', () => false);

    // VALIDATION_FAILED → ACTIVE_AR (must retry validation first)
    this.transitionGuards.set('VALIDATION_FAILED->ACTIVE_AR', () => false);

    // VALIDATING_FACE → ACTIVE_AR (must complete validation first)
    this.transitionGuards.set('VALIDATING_FACE->ACTIVE_AR', () => false);

    // FACE_DETECTED → ACTIVE_AR (must validate first)
    this.transitionGuards.set('FACE_DETECTED->ACTIVE_AR', () => false);

    // BOOT → ACTIVE_AR (must go through full pipeline)
    this.transitionGuards.set('BOOT->ACTIVE_AR', () => false);

    // NO_FACE → ATTACHING_BEARD (must detect face first)
    this.transitionGuards.set('NO_FACE->ATTACHING_BEARD', () => false);

    // FACE_LOST → ANALYZING (must reset to CAMERA_READY first)
    this.transitionGuards.set('FACE_LOST->ANALYZING', () => false);

    // VALIDATION_FAILED → ATTACHING_BEARD (must retry validation first)
    this.transitionGuards.set('VALIDATION_FAILED->ATTACHING_BEARD', () => false);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════

  private setupEventListeners(): void {
    // Camera ready
    globalEventBus.on<CameraReadyEvent>(AREvents.CAMERA_READY, () => {
      this.transitionTo(PipelineState.CAMERA_READY, 'camera initialized');
    });

    // Face detected
    globalEventBus.on<FaceDetectedEvent>(AREvents.FACE_DETECTED, () => {
      if (this.currentState === PipelineState.CAMERA_READY) {
        this.transitionTo(PipelineState.FACE_DETECTED, 'face detected');
      }
    });

    // Face stable - accept from CAMERA_READY, FACE_DETECTED, or VALIDATION_FAILED (retry)
    globalEventBus.on<FaceStableEvent>(AREvents.FACE_STABLE, () => {
      console.log('[PIPELINE][CONTROLLER] FACE_STABLE received, current state:', this.currentState);
      const acceptedStates = [
        PipelineState.FACE_DETECTED,
        PipelineState.CAMERA_READY,
        PipelineState.VALIDATION_FAILED,
      ];
      if (acceptedStates.includes(this.currentState)) {
        this.transitionTo(PipelineState.VALIDATING_FACE, 'face stable, starting validation');
        globalEventBus.emit(AREvents.VALIDATION_STARTED, {
          timestamp: performance.now(),
          expectedDuration: 1500,
        });
      } else {
        console.log('[PIPELINE][CONTROLLER] FACE_STABLE ignored — state:', this.currentState);
      }
    });

    // Validation success
    globalEventBus.on<ValidationSuccessEvent>(AREvents.VALIDATION_SUCCESS, (data) => {
      console.log('[PIPELINE][CONTROLLER] VALIDATION_SUCCESS received, current state:', this.currentState);
      if (this.currentState === PipelineState.VALIDATING_FACE) {
        this.transitionTo(PipelineState.SCANNING, 'validation passed, starting 3-angle scan');
        // Automatically start scan after validation success
        setTimeout(() => this.startScan(), 100);
      } else {
        console.warn('[PIPELINE][CONTROLLER] VALIDATION_SUCCESS received but not in VALIDATING_FACE state:', this.currentState);
      }
    });

    // Validation failed
    globalEventBus.on<ValidationFailedEvent>(AREvents.VALIDATION_FAILED, () => {
      if (this.currentState === PipelineState.VALIDATING_FACE) {
        this.transitionTo(PipelineState.VALIDATION_FAILED, 'validation failed');
      }
    });

    // Face lost - hard reset from any state
    globalEventBus.on<FaceLostEvent>(AREvents.FACE_LOST, () => {
      // Hard reset from any state except BOOT
      if (this.currentState !== PipelineState.BOOT) {
        this.transitionTo(PipelineState.CAMERA_READY, 'face lost, hard reset pipeline');
      }
    });

    // Reset pipeline
    globalEventBus.on<ResetPipelineEvent>(AREvents.RESET_PIPELINE, (data) => {
      this.transitionTo(PipelineState.CAMERA_READY, data.reason);
    });

    // Beard load failed - graceful recovery, keep pipeline alive
    globalEventBus.on<BeardLoadFailedEvent>(AREvents.BEARD_LOAD_FAILED, (data) => {
      console.error('[PIPELINE][CONTROLLER] Beard load failed:', data.style.name, '-', data.error);
      // Do NOT reset pipeline - keep face tracking active
      // Allow user to select another beard style
      // Pipeline stays in current state (likely LOADING_BEARD or ANALYZING)
      // UI should show error state and allow retry
      if (this.callbacks.onError) {
        this.callbacks.onError({
          type: 'beard_load_failed',
          style: data.style,
          error: data.error,
        });
      }
    });

    // Scan complete - transition to ANALYZING state
    globalEventBus.on<ScanCompleteEvent>(AREvents.SCAN_COMPLETE, (data) => {
      console.log('[PIPELINE][CONTROLLER] SCAN_COMPLETE received with 3D spatial boundaries');
      console.log('[PIPELINE][CONTROLLER] Spatial boundaries:', data.spatialBoundaries);
      if (this.currentState === PipelineState.SCANNING) {
        console.log('[PIPELINE][CONTROLLER] Transitioning from SCANNING to ANALYZING');
        this.transitionTo(PipelineState.ANALYZING, '3-angle scan complete with spatial boundaries');
        this.callbacks.onScanComplete();
        // Start analysis immediately
        setTimeout(() => this.startAnalysis(), 100);
      } else {
        console.warn('[PIPELINE][CONTROLLER] SCAN_COMPLETE received but not in SCANNING state:', this.currentState);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE TRANSITION
  // ═══════════════════════════════════════════════════════════════════════════

  private transitionTo(state: PipelineState, reason?: string): void {
    const transitionKey = `${this.currentState}->${state}`;
    const guard = this.transitionGuards.get(transitionKey) || this.transitionGuards.get('ANY->CAMERA_READY');

    // Check transition guard
    if (guard && !guard(this.currentState, state)) {
      console.warn(`[PipelineController] Transition blocked: ${this.currentState} → ${state}`);
      return;
    }

    // Prevent duplicate state transitions
    if (this.currentState === state) {
      console.log(`[PIPELINE][STATE] Skipped duplicate transition: ${state}`);
      return;
    }

    const previousState = this.currentState;
    this.currentState = state;

    // Reset validation lock when leaving VALIDATING_FACE
    if (previousState === PipelineState.VALIDATING_FACE && state !== PipelineState.VALIDATING_FACE) {
      this.validationExecuted = false;
    }


    console.log(`[PIPELINE][STATE] ${previousState} → ${state}`);
    console.log(`[PIPELINE][STATE] Reason: ${reason || 'state transition'}`);

    // Emit state change event
    globalEventBus.emit(AREvents.PIPELINE_STATE_CHANGE, {
      fromState: previousState,
      toState: state,
      reason: reason || 'state transition',
      timestamp: performance.now(),
    });

    this.callbacks.onStateChange({
      state,
      timestamp: performance.now(),
      error: reason,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GET CURRENT STATE
  // ═══════════════════════════════════════════════════════════════════════════

  getCurrentState(): PipelineState {
    return this.currentState;
  }

  // Public method to reset pipeline to CAMERA_READY
  resetPipeline(reason?: string): void {
    this.transitionTo(PipelineState.CAMERA_READY, reason || 'pipeline reset');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GUIDED SCAN FLOW (Kept for scan functionality)
  // ═══════════════════════════════════════════════════════════════════════════

  startScan(): void {
    console.log('[ARPipelineController] Starting 3-angle scan flow');
    this.transitionTo(PipelineState.SCANNING);
    this.callbacks.onScanStart();
  }

  onScanPhaseChange(phase: string, progress: ScanProgress): void {
    // Scan phase changes are now handled by SCAN_STATE_CHANGE events
    // This method is kept for backward compatibility
    console.log('[ARPipelineController] Scan phase change:', phase);
    this.callbacks.onScanPhaseChange(phase, progress);
  }

  onScanComplete(): void {
    console.log('[ARPipelineController] Scan complete, transitioning to ANALYZING');
    this.transitionTo(PipelineState.ANALYZING);
    this.callbacks.onScanComplete();
    // Start analysis after scan
    setTimeout(() => this.startAnalysis(), 500);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POST-SCAN ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  startAnalysis(): void {
    if (this.currentState !== PipelineState.ANALYZING) return;

    this.callbacks.onAnalysisStart();

    // Analysis timeout (2 seconds)
    this.analysisTimer = window.setTimeout(() => {
      this.onAnalysisComplete();
    }, 2000);
  }

  private onAnalysisComplete(): void {
    if (this.analysisTimer) {
      clearTimeout(this.analysisTimer);
      this.analysisTimer = null;
    }

    this.transitionTo(PipelineState.GENERATING_ANCHORS, 'analysis complete, generating anchors');
    this.callbacks.onAnchorGenerationStart();

    // Anchor generation timeout (2 seconds)
    this.anchorTimer = window.setTimeout(() => {
      this.onAnchorGenerationComplete();
    }, 2000);
  }

  private onAnchorGenerationComplete(): void {
    if (this.anchorTimer) {
      clearTimeout(this.anchorTimer);
      this.anchorTimer = null;
    }

    this.transitionTo(PipelineState.LOADING_BEARD, 'anchors generated, loading beard');
    this.callbacks.onBeardLoadStart();

    // Beard loading timeout (2 seconds)
    this.beardLoadTimer = window.setTimeout(() => {
      this.onBeardLoadTimeout();
    }, 2000);
  }

  private onBeardLoadTimeout(): void {
    console.warn('[PIPELINE][STATE] Beard loading timeout - auto-proceeding');
    this.onBeardLoadComplete();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BEARD LOADING
  // ═══════════════════════════════════════════════════════════════════════════

  onBeardLoadComplete(): void {
    if (this.currentState !== PipelineState.LOADING_BEARD) return;

    if (this.beardLoadTimer) {
      clearTimeout(this.beardLoadTimer);
      this.beardLoadTimer = null;
    }

    this.transitionTo(PipelineState.ATTACHING_BEARD, 'beard loaded, attaching to face');
    this.callbacks.onBeardLoadComplete();
    this.callbacks.onAttachmentStart();

    // Attachment timeout (2 seconds)
    this.attachmentTimer = window.setTimeout(() => {
      this.onAttachmentComplete();
    }, 2000);
  }

  private onAttachmentComplete(): void {
    if (this.attachmentTimer) {
      clearTimeout(this.attachmentTimer);
      this.attachmentTimer = null;
    }

    this.transitionTo(PipelineState.RENDERING, 'beard attached, starting render');
    this.callbacks.onAttachmentComplete();
    this.callbacks.onRenderingStart();

    // Transition to active AR after rendering starts (2 seconds)
    setTimeout(() => {
      this.transitionTo(PipelineState.ACTIVE_AR, 'rendering active, beard visible');
      this.callbacks.onActiveAR();
      console.log('✅ ACTIVE_AR STARTED');
      console.log('✅ BEARD VISIBLE');
      console.log('✅ RENDER LOOP ACTIVE');
    }, 2000);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET
  // ═══════════════════════════════════════════════════════════════════════════

  reset(): void {
    // Clear all timers
    if (this.validationTimer) clearTimeout(this.validationTimer);
    if (this.scanPhaseTimer) clearTimeout(this.scanPhaseTimer);
    if (this.analysisTimer) clearTimeout(this.analysisTimer);
    if (this.anchorTimer) clearTimeout(this.anchorTimer);
    if (this.beardLoadTimer) clearTimeout(this.beardLoadTimer);
    if (this.attachmentTimer) clearTimeout(this.attachmentTimer);

    this.validationTimer = null;
    this.scanPhaseTimer = null;
    this.analysisTimer = null;
    this.anchorTimer = null;
    this.beardLoadTimer = null;
    this.attachmentTimer = null;

    this.transitionTo(PipelineState.BOOT);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPOSE
  // ═══════════════════════════════════════════════════════════════════════════

  dispose(): void {
    this.reset();
    
    // Unsubscribe from all events
    globalEventBus.off(AREvents.CAMERA_READY);
    globalEventBus.off(AREvents.FACE_DETECTED);
    globalEventBus.off(AREvents.FACE_STABLE);
    globalEventBus.off(AREvents.VALIDATION_SUCCESS);
    globalEventBus.off(AREvents.VALIDATION_FAILED);
    globalEventBus.off(AREvents.FACE_LOST);
    globalEventBus.off(AREvents.RESET_PIPELINE);
    
    console.log('[ARPipelineController] Disposed');
  }
}
