// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - Face Lifecycle Engine
// Centralized face state management - single source of truth for face lifecycle
// ═══════════════════════════════════════════════════════════════════════════

import { EventBus } from '../core/EventBus';
import { AREvents, FaceDetectedEvent, FaceLostEvent, FaceTrackingEvent, FaceStableEvent, FaceUnstableEvent } from '../core/EventTypes';

export enum FaceLifecycleState {
  NO_FACE = 'NO_FACE',
  FACE_DETECTED = 'FACE_DETECTED',
  FACE_TRACKING = 'FACE_TRACKING',
  FACE_STABLE = 'FACE_STABLE',
  FACE_LOST = 'FACE_LOST',
}

interface FaceLifecycleConfig {
  stabilityThreshold: number;
  stabilityDuration: number; // ms
  confidenceThreshold: number;
  lostTimeout: number; // ms before declaring face lost
}

export class FaceLifecycleEngine {
  private eventBus: EventBus;
  private config: FaceLifecycleConfig;
  private currentState: FaceLifecycleState;
  private stabilityBuffer: number[];
  private stabilityStartTime: number | null;
  private lastDetectionTime: number;
  private lostTimer: number | null;
  private stableReemitTimer: number | null;
  private currentConfidence: number;

  constructor(eventBus: EventBus, config?: Partial<FaceLifecycleConfig>) {
    this.eventBus = eventBus;
    this.config = {
      stabilityThreshold: config?.stabilityThreshold ?? 0.7,
      stabilityDuration: config?.stabilityDuration ?? 800,
      confidenceThreshold: config?.confidenceThreshold ?? 0.5,
      lostTimeout: config?.lostTimeout ?? 500,
    };
    this.currentState = FaceLifecycleState.NO_FACE;
    this.stabilityBuffer = [];
    this.stabilityStartTime = null;
    this.lastDetectionTime = 0;
    this.lostTimer = null;
    this.stableReemitTimer = null;
    this.currentConfidence = 0;

    this.setupEventListeners();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════

  private setupEventListeners(): void {
    this.eventBus.on(AREvents.FACE_RESULTS, this.handleFaceResults.bind(this));

    // Sync with external FACE_LOST events (e.g. from useAREngine direct emission)
    this.eventBus.on<FaceLostEvent>(AREvents.FACE_LOST, () => {
      if (this.currentState !== FaceLifecycleState.NO_FACE) {
        console.log('[FaceLifecycle] External FACE_LOST received — resetting to NO_FACE');
        this.currentState = FaceLifecycleState.NO_FACE;
        this.stabilityBuffer = [];
        this.stabilityStartTime = null;
        if (this.lostTimer !== null) {
          clearTimeout(this.lostTimer);
          this.lostTimer = null;
        }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLE FACE RESULTS
  // ═══════════════════════════════════════════════════════════════════════════

  private handleFaceResults(data: any): void {
    const confidence = data.confidence ?? 0;
    this.currentConfidence = confidence;
    this.lastDetectionTime = performance.now();

    // Clear lost timer
    if (this.lostTimer !== null) {
      clearTimeout(this.lostTimer);
      this.lostTimer = null;
    }

    // State machine transitions
    switch (this.currentState) {
      case FaceLifecycleState.NO_FACE:
        if (confidence >= this.config.confidenceThreshold) {
          this.transitionTo(FaceLifecycleState.FACE_DETECTED);
          this.emitFaceDetected(confidence);
        }
        break;

      case FaceLifecycleState.FACE_DETECTED:
        if (confidence >= this.config.confidenceThreshold) {
          this.transitionTo(FaceLifecycleState.FACE_TRACKING);
          this.emitFaceTracking(true, confidence);
        } else {
          this.transitionTo(FaceLifecycleState.FACE_LOST);
          this.emitFaceLost('low_confidence');
        }
        break;

      case FaceLifecycleState.FACE_TRACKING:
        if (confidence >= this.config.confidenceThreshold) {
          this.updateStability(confidence);
          const stable = this.isStable();
          // Log only first time buffer fills and when stable becomes true
          if (this.stabilityBuffer.length === 10 || stable) {
            console.log(`[FaceLifecycle][TRACKING] buf=${this.stabilityBuffer.length} stable=${stable} state=${this.currentState}`);
          }
          if (stable) {
            console.log('[FaceLifecycle][TRACKING] ★ stable=true → calling transitionTo(FACE_STABLE)');
            this.transitionTo(FaceLifecycleState.FACE_STABLE);
            console.log(`[FaceLifecycle][TRACKING] ★ transitionTo done, currentState=${this.currentState}`);
            this.emitFaceStable();
            console.log('[FaceLifecycle][TRACKING] ★ emitFaceStable done');
          }
        } else {
          this.transitionTo(FaceLifecycleState.FACE_LOST);
          this.emitFaceLost('low_confidence');
        }
        break;

      case FaceLifecycleState.FACE_STABLE:
        if (confidence >= this.config.confidenceThreshold) {
          this.updateStability(confidence);
          if (!this.isStable()) {
            this.transitionTo(FaceLifecycleState.FACE_TRACKING);
            this.emitFaceUnstable('movement');
          }
        } else {
          this.transitionTo(FaceLifecycleState.FACE_LOST);
          this.emitFaceLost('low_confidence');
        }
        break;

      case FaceLifecycleState.FACE_LOST:
        if (confidence >= this.config.confidenceThreshold) {
          this.transitionTo(FaceLifecycleState.FACE_DETECTED);
          this.emitFaceDetected(confidence);
        }
        break;
    }

    // Set lost timer
    this.lostTimer = window.setTimeout(() => {
      if (performance.now() - this.lastDetectionTime > this.config.lostTimeout) {
        this.transitionTo(FaceLifecycleState.FACE_LOST);
        this.emitFaceLost('no_detection');
      }
    }, this.config.lostTimeout);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE STABILITY
  // ═══════════════════════════════════════════════════════════════════════════

  private updateStability(confidence: number): void {
    this.stabilityBuffer.push(confidence);
    if (this.stabilityBuffer.length > 20) {
      this.stabilityBuffer.shift();
    }

    if (this.stabilityStartTime === null) {
      this.stabilityStartTime = performance.now();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK IF STABLE
  // ═══════════════════════════════════════════════════════════════════════════

  private isStable(): boolean {
    if (this.stabilityBuffer.length < 10) {
      return false;
    }

    const avgStability = this.stabilityBuffer.reduce((sum, val) => sum + val, 0) / this.stabilityBuffer.length;
    const duration = performance.now() - (this.stabilityStartTime ?? 0);

    // Log only on key frame counts to avoid spam
    if (this.stabilityBuffer.length === 10 || duration >= this.config.stabilityDuration) {
      console.log(`[FaceLifecycle] Stability check: frames=${this.stabilityBuffer.length}/10 avg=${avgStability.toFixed(2)} duration=${duration.toFixed(0)}ms/${this.config.stabilityDuration}ms`);
    }

    return avgStability >= this.config.stabilityThreshold && duration >= this.config.stabilityDuration;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSITION TO STATE
  // ═══════════════════════════════════════════════════════════════════════════

  private transitionTo(newState: FaceLifecycleState): void {
    if (this.currentState === newState) {
      return;
    }

    console.log(`[FaceLifecycle] ${this.currentState} → ${newState}`);
    this.currentState = newState;

    // Reset stability when leaving FACE_STABLE
    // NOTE: NO setInterval here — side effects belong in emitFaceStable, not transitionTo
    if (newState !== FaceLifecycleState.FACE_STABLE) {
      this.stabilityBuffer = [];
      this.stabilityStartTime = null;
      if (this.stableReemitTimer !== null) {
        clearInterval(this.stableReemitTimer);
        this.stableReemitTimer = null;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EMIT EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  private emitFaceDetected(confidence: number): void {
    const event: FaceDetectedEvent = {
      timestamp: performance.now(),
      confidence,
      landmarkCount: 478,
    };
    this.eventBus.emit(AREvents.FACE_DETECTED, event);
  }

  private emitFaceLost(reason: 'no_detection' | 'low_confidence' | 'tracking_lost'): void {
    const event: FaceLostEvent = {
      timestamp: performance.now(),
      reason,
    };
    // Reset BEFORE emitting to avoid the FACE_LOST listener re-triggering reset
    this.stabilityBuffer = [];
    this.stabilityStartTime = null;
    this.currentConfidence = 0;
    if (this.lostTimer !== null) {
      clearTimeout(this.lostTimer);
      this.lostTimer = null;
    }
    // Set state directly (not via transitionTo, to avoid buffer clears running twice)
    this.currentState = FaceLifecycleState.NO_FACE;
    this.eventBus.emit(AREvents.FACE_LOST, event);
  }

  private emitFaceTracking(isTracking: boolean, confidence: number): void {
    const event: FaceTrackingEvent = {
      timestamp: performance.now(),
      isTracking,
      confidence,
    };
    this.eventBus.emit(AREvents.FACE_TRACKING, event);
  }

  private emitFaceStable(): void {
    const duration = performance.now() - (this.stabilityStartTime ?? 0);
    const stabilityScore = this.stabilityBuffer.length > 0
      ? this.stabilityBuffer.reduce((sum, val) => sum + val, 0) / this.stabilityBuffer.length
      : 0;

    const event: FaceStableEvent = {
      timestamp: performance.now(),
      stabilityScore,
      duration,
    };

    console.log(`[FaceLifecycle] ★ FACE_STABLE emit — score=${stabilityScore.toFixed(2)} duration=${duration.toFixed(0)}ms`);
    this.eventBus.emit(AREvents.FACE_STABLE, event);

    // Start periodic re-emit timer for recovery (in case receiver missed this emit)
    // Placed here (not in transitionTo) to avoid any exceptions blocking the emit above
    if (this.stableReemitTimer !== null) {
      clearInterval(this.stableReemitTimer);
    }
    this.stableReemitTimer = window.setInterval(() => {
      if (this.currentState === FaceLifecycleState.FACE_STABLE) {
        console.log('[FaceLifecycle] ★ Re-emitting FACE_STABLE (recovery)');
        const reEvent: FaceStableEvent = {
          timestamp: performance.now(),
          stabilityScore: this.stabilityBuffer.length > 0
            ? this.stabilityBuffer.reduce((s, v) => s + v, 0) / this.stabilityBuffer.length
            : 0,
          duration: performance.now() - (this.stabilityStartTime ?? 0),
        };
        this.eventBus.emit(AREvents.FACE_STABLE, reEvent);
      } else {
        clearInterval(this.stableReemitTimer!);
        this.stableReemitTimer = null;
      }
    }, 2000);
  }

  private emitFaceUnstable(reason: 'movement' | 'blur' | 'occlusion'): void {
    const stabilityScore = this.stabilityBuffer.length > 0 
      ? this.stabilityBuffer.reduce((sum, val) => sum + val, 0) / this.stabilityBuffer.length 
      : 0;
    
    const event: FaceUnstableEvent = {
      timestamp: performance.now(),
      reason,
      stabilityScore,
    };
    this.eventBus.emit(AREvents.FACE_UNSTABLE, event);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  getCurrentState(): FaceLifecycleState {
    return this.currentState;
  }

  getCurrentConfidence(): number {
    return this.currentConfidence;
  }

  isFaceStable(): boolean {
    return this.currentState === FaceLifecycleState.FACE_STABLE;
  }

  isFaceDetected(): boolean {
    return this.currentState !== FaceLifecycleState.NO_FACE && this.currentState !== FaceLifecycleState.FACE_LOST;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET
  // ═══════════════════════════════════════════════════════════════════════════

  reset(): void {
    this.currentState = FaceLifecycleState.NO_FACE;
    this.stabilityBuffer = [];
    this.stabilityStartTime = null;
    this.currentConfidence = 0;
    
    if (this.lostTimer !== null) {
      clearTimeout(this.lostTimer);
      this.lostTimer = null;
    }

    if (this.stableReemitTimer !== null) {
      clearInterval(this.stableReemitTimer);
      this.stableReemitTimer = null;
    }

    console.log('[FaceLifecycle] Reset to NO_FACE');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPOSE
  // ═══════════════════════════════════════════════════════════════════════════

  dispose(): void {
    this.eventBus.off(AREvents.FACE_RESULTS);
    this.eventBus.off(AREvents.FACE_LOST);
    this.reset();
    console.log('[FaceLifecycle] Disposed');
  }
}
