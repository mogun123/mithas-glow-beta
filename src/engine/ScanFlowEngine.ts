// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - Scan Flow Engine (Refactored)
// Event-driven scan flow management
// ═══════════════════════════════════════════════════════════════════════════

import { FaceLandmark } from '../types/engine.types';
import { EventBus } from '../core/EventBus';
import { globalEventBus } from '../core/EventBus';
import { AREvents, FaceLostEvent, ScanPhaseCompleteEvent, ScanCompleteEvent, ScanStateChangeEvent, StabilizedLandmarksEvent, Spatial3DBoundaries } from '../core/EventTypes';

export type ScanPhase = 'front' | 'left' | 'right' | 'complete';

export interface ScanPhaseConfig {
  name: string;
  instruction: string;
  state: 'LOOK_STRAIGHT' | 'TURN_LEFT' | 'TURN_RIGHT' | 'SCAN_COMPLETE';
  targetYaw: number; // degrees
  tolerance: number; // degrees
  minDuration: number; // ms
}

export interface ScanProgress {
  currentPhase: ScanPhase;
  phaseIndex: number;
  totalPhases: number;
  progress: number; // 0-100
  isPhaseComplete: boolean;
  capturedFrames: FaceLandmark[][];
  phaseStartTime: number;
  totalElapsedTime: number;
  absoluteJawScale?: number; // Absolute scale from 3D bounding box
}

export class ScanFlowEngine {
  private eventBus: EventBus;
  private phases: ScanPhaseConfig[];
  private currentPhaseIndex: number = 0;
  private phaseStartTime: number = 0;
  private capturedFrames: Map<ScanPhase, FaceLandmark[][]> = new Map();
  private isScanning: boolean = false;
  private isComplete: boolean = false;
  private pipelineState: string = 'BOOT';
  private lastFrameTimestamp: number = 0;
  private stallDetectionTimeout: number | null = null;

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus || globalEventBus;
    console.log('[ScanFlowEngine] Engine Wired and waiting for head rotation...');

    this.phases = [
      {
        name: 'front',
        instruction: 'Keep steady, looking front...',
        state: 'LOOK_STRAIGHT',
        targetYaw: 0,
        tolerance: 15,
        minDuration: 1500,
      },
      {
        name: 'left',
        instruction: 'Now, turn your face slightly LEFT 📲',
        state: 'TURN_LEFT',
        targetYaw: -30,
        tolerance: 15,
        minDuration: 1200,
      },
      {
        name: 'right',
        instruction: 'Now, turn your face slightly RIGHT 📲',
        state: 'TURN_RIGHT',
        targetYaw: 30,
        tolerance: 15,
        minDuration: 1200,
      },
    ];

    // Initialize captured frames for each phase
    this.phases.forEach(phase => {
      this.capturedFrames.set(phase.name as ScanPhase, []);
    });

    this.setupEventListeners();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════

  private setupEventListeners(): void {
    // Listen for face lost to cancel scan
    this.eventBus.on<FaceLostEvent>(AREvents.FACE_LOST, () => {
      if (this.isScanning) {
        this.reset();
      }
    });

    // Listen for pipeline state changes
    this.eventBus.on(AREvents.PIPELINE_STATE_CHANGE, (data: any) => {
      this.pipelineState = data.toState;
    });

    // Listen for stabilized landmarks to process scan frames
    this.eventBus.on<StabilizedLandmarksEvent>(AREvents.STABILIZED_LANDMARKS, (data) => {
      // Log every STABILIZED_LANDMARKS event to verify stream is active
      if (this.isScanning) {
        console.log('[ScanFlowEngine] 📥 STABILIZED_LANDMARKS event received - isScanning:', this.isScanning, 'isComplete:', this.isComplete);
      }

      if (this.isScanning && !this.isComplete) {
        // Extract head rotation from landmarks (yaw calculation)
        const leftJaw = data.stabilized.landmarks[234];
        const rightJaw = data.stabilized.landmarks[454];
        const nose = data.stabilized.landmarks[1];

        if (leftJaw && rightJaw && nose) {
          // Calculate yaw from jaw positions using 3D coordinates
          // Use the horizontal offset between jaw center and nose, accounting for depth (z)
          const jawCenterX = (leftJaw.x + rightJaw.x) / 2;
          const jawCenterZ = ((leftJaw.z || 0) + (rightJaw.z || 0)) / 2;

          // Calculate yaw as the horizontal angle using both x and z coordinates
          // This provides more accurate head rotation detection
          const yaw = Math.atan2(jawCenterX - nose.x, (jawCenterZ - (nose.z || 0)) + 0.5) * (180 / Math.PI);

          console.log('[ScanFlowEngine] Head rotation - yaw:', yaw.toFixed(2), 'degrees (jawCenterX:', jawCenterX.toFixed(3), ', nose.x:', nose.x.toFixed(3), ')');

          this.processFrame(data.stabilized.landmarks, { pitch: 0, yaw, roll: 0 });
        } else {
          console.warn('[ScanFlowEngine] ⚠️ Required landmarks not available - leftJaw:', !!leftJaw, 'rightJaw:', !!rightJaw, 'nose:', !!nose);
        }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET
  // ═══════════════════════════════════════════════════════════════════════════

  private reset(): void {
    this.currentPhaseIndex = 0;
    this.phaseStartTime = 0;
    this.isScanning = false;
    this.isComplete = false;
    this.phases.forEach(phase => {
      this.capturedFrames.set(phase.name as ScanPhase, []);
    });

    if (this.stallDetectionTimeout !== null) {
      clearTimeout(this.stallDetectionTimeout);
      this.stallDetectionTimeout = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPOSE
  // ═══════════════════════════════════════════════════════════════════════════

  dispose(): void {
    this.eventBus.off(AREvents.FACE_LOST);
    this.eventBus.off(AREvents.PIPELINE_STATE_CHANGE);
    this.reset();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // START SCAN
  // ═══════════════════════════════════════════════════════════════════════════

  startScan(): void {
    this.currentPhaseIndex = 0;
    this.phaseStartTime = performance.now();
    this.isScanning = true;
    this.isComplete = false;
    this.lastFrameTimestamp = performance.now();

    // Clear previous captures
    this.phases.forEach(phase => {
      this.capturedFrames.set(phase.name as ScanPhase, []);
    });

    console.log('🔄 Scan Flow started');

    // Emit SCAN_STATE_CHANGE event for initial phase
    const firstPhase = this.phases[0];
    this.eventBus.emit<ScanStateChangeEvent>(AREvents.SCAN_STATE_CHANGE, {
      state: firstPhase.state,
      instruction: firstPhase.instruction,
      currentPhase: 0,
      totalPhases: this.phases.length,
      timestamp: performance.now(),
    });

    // Set stall detection timeout - throws error if no frame received within 2 seconds
    this.stallDetectionTimeout = window.setTimeout(() => {
      const timeSinceLastFrame = performance.now() - this.lastFrameTimestamp;
      if (timeSinceLastFrame >= 2000) {
        console.error('[ScanFlowEngine] ❌ STALL DETECTED: No frame received for 2+ seconds');
        throw new Error('[PIPELINE_STALL] Frame collection stalled. Re-render blocked.');
      }
    }, 2000);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESS FRAME
  // ═══════════════════════════════════════════════════════════════════════════

  processFrame(
    landmarks: FaceLandmark[],
    headRotation: { pitch: number; yaw: number; roll: number }
  ): ScanProgress {
    if (!this.isScanning || this.isComplete) {
      return this.getProgress();
    }

    this.lastFrameTimestamp = performance.now(); // Update last frame timestamp

    const currentPhase = this.phases[this.currentPhaseIndex];
    const phaseName = currentPhase.name as ScanPhase;

    // Check if current pose matches target
    const isPoseCorrect = this.checkPose(headRotation, currentPhase);

    // Log pose check every 10 frames
    if (this.capturedFrames.get(phaseName)!.length % 10 === 0) {
      console.log(`[ScanFlowEngine] Phase: ${phaseName}, Target Yaw: ${currentPhase.targetYaw}°, Current Yaw: ${headRotation.yaw.toFixed(2)}°, Tolerance: ${currentPhase.tolerance}°, Pose Correct: ${isPoseCorrect}`);
    }

    // Always capture frames during scanning (even if pose isn't perfect)
    // This ensures we have data to work with and prevents getting stuck
    const frames = this.capturedFrames.get(phaseName) || [];
    frames.push([...landmarks]);
    this.capturedFrames.set(phaseName, frames);

    // Check if phase is complete
    const phaseDuration = performance.now() - this.phaseStartTime;
    const requiredFrames = Math.ceil(currentPhase.minDuration / 100); // ~10fps

    console.log(`[ScanFlowEngine] Phase: ${phaseName}, Duration: ${phaseDuration.toFixed(0)}ms / ${currentPhase.minDuration}ms, Frames: ${frames.length} / ${requiredFrames}, Pose Correct: ${isPoseCorrect}`);

    // STRICT: Complete phase ONLY when physical head rotation (Yaw math) is correct
    // NO TIMEOUT FALLBACKS - rely strictly on real MediaPipe tracking data
    if (phaseDuration >= currentPhase.minDuration && frames.length >= requiredFrames && isPoseCorrect) {
      console.log(`[ScanFlowEngine] ✅ Phase "${phaseName}" complete - physical head rotation verified`);
      this.completePhase();
    }

    return this.getProgress();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK POSE
  // ═══════════════════════════════════════════════════════════════════════════

  private checkPose(
    headRotation: { pitch: number; yaw: number; roll: number },
    phase: ScanPhaseConfig
  ): boolean {
    const yawDiff = Math.abs(headRotation.yaw - phase.targetYaw);

    return yawDiff <= phase.tolerance;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLETE PHASE
  // ═══════════════════════════════════════════════════════════════════════════

  private completePhase(): void {
    const currentPhase = this.phases[this.currentPhaseIndex];
    console.log(`[ScanFlowEngine] ✅ Phase "${currentPhase.name}" completed`);

    this.currentPhaseIndex++;

    if (this.currentPhaseIndex >= this.phases.length) {
      this.isComplete = true;
      this.isScanning = false;
      console.log('[ScanFlowEngine] 🎉 Scan Flow complete - all 3 angles captured');

      // Clear stall detection timeout
      if (this.stallDetectionTimeout !== null) {
        clearTimeout(this.stallDetectionTimeout);
        this.stallDetectionTimeout = null;
      }

      // STRICT: Calculate Absolute 3D Spatial Boundaries from all 3 live captures
      // This MUST complete before the scan can transition to success state
      const spatialBoundaries = this.calculateSpatial3DBoundaries();

      // Emit SCAN_COMPLETE event with spatial boundaries
      console.log('[ScanFlowEngine] 📡 Emitting SCAN_COMPLETE event with 3D spatial boundaries');
      this.eventBus.emit<ScanCompleteEvent>(AREvents.SCAN_COMPLETE, {
        timestamp: performance.now(),
        totalDuration: performance.now() - this.phaseStartTime,
        spatialBoundaries,
      });

      // Emit SCAN_STATE_CHANGE event for SCAN_COMPLETE state
      this.eventBus.emit<ScanStateChangeEvent>(AREvents.SCAN_STATE_CHANGE, {
        state: 'SCAN_COMPLETE',
        instruction: '✅ Scan Complete! Applying Style...',
        currentPhase: this.currentPhaseIndex,
        totalPhases: this.phases.length,
        timestamp: performance.now(),
      });
    } else {
      this.phaseStartTime = performance.now();
      const nextPhase = this.phases[this.currentPhaseIndex];
      console.log(`[ScanFlowEngine] 🔄 Transitioning to next phase: "${nextPhase.name}" with target yaw: ${nextPhase.targetYaw}°`);

      // Emit SCAN_STATE_CHANGE event for next phase
      this.eventBus.emit<ScanStateChangeEvent>(AREvents.SCAN_STATE_CHANGE, {
        state: nextPhase.state,
        instruction: nextPhase.instruction,
        currentPhase: this.currentPhaseIndex,
        totalPhases: this.phases.length,
        timestamp: performance.now(),
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE ABSOLUTE 3D SPATIAL BOUNDARIES FROM FRONT/LEFT/RIGHT CAPTURES
  // ═══════════════════════════════════════════════════════════════════════════

  private calculateSpatial3DBoundaries(): Spatial3DBoundaries {
    console.log('[ScanFlowEngine] 🔍 CALCULATING ABSOLUTE 3D SPATIAL BOUNDARIES FROM LIVE CAPTURES');

    const boundaries: Spatial3DBoundaries = {
      front: { jawWidth: 0, faceHeight: 0, noseToChin: 0 },
      left: { jawWidth: 0, faceHeight: 0, noseToChin: 0 },
      right: { jawWidth: 0, faceHeight: 0, noseToChin: 0 },
      absolute: { maxJawWidth: 0, avgJawWidth: 0, maxFaceHeight: 0, avgFaceHeight: 0 },
    };

    // Process each phase (front, left, right) independently
    const phases: ('front' | 'left' | 'right')[] = ['front', 'left', 'right'];

    for (const phase of phases) {
      const frames = this.capturedFrames.get(phase);
      if (!frames || frames.length === 0) {
        throw new Error(`FATAL: No captured frames for phase "${phase}" - insufficient live data for 3D boundary calculation`);
      }

      console.log(`[ScanFlowEngine] Processing ${phase} phase: ${frames.length} frames`);

      let totalJawWidth = 0;
      let totalFaceHeight = 0;
      let totalNoseToChin = 0;
      let validMeasurements = 0;

      for (const landmarks of frames) {
        const leftJaw = landmarks[234];
        const rightJaw = landmarks[454];
        const nose = landmarks[1];
        const forehead = landmarks[10];
        const chin = landmarks[152];

        // STRICT: Require all landmarks for 3D calculation
        if (!leftJaw || !rightJaw || !nose || !forehead || !chin) {
          console.warn(`[ScanFlowEngine] Skipping frame in ${phase} phase - missing required landmarks`);
          continue;
        }

        // Calculate 3D jaw width (landmarks 234, 454)
        const jawWidth = Math.sqrt(
          Math.pow(rightJaw.x - leftJaw.x, 2) +
          Math.pow(rightJaw.y - leftJaw.y, 2) +
          Math.pow((rightJaw.z || 0) - (leftJaw.z || 0), 2)
        );

        // Calculate 3D face height (forehead to chin)
        const faceHeight = Math.sqrt(
          Math.pow(chin.x - forehead.x, 2) +
          Math.pow(chin.y - forehead.y, 2) +
          Math.pow((chin.z || 0) - (forehead.z || 0), 2)
        );

        // Calculate 3D nose-to-chin distance
        const noseToChin = Math.sqrt(
          Math.pow(chin.x - nose.x, 2) +
          Math.pow(chin.y - nose.y, 2) +
          Math.pow((chin.z || 0) - (nose.z || 0), 2)
        );

        totalJawWidth += jawWidth;
        totalFaceHeight += faceHeight;
        totalNoseToChin += noseToChin;
        validMeasurements++;
      }

      // STRICT: Throw hard error if no valid measurements
      if (validMeasurements === 0) {
        throw new Error(`FATAL: No valid landmark measurements in phase "${phase}" - live data insufficient for 3D boundary calculation`);
      }

      // Calculate averages for this phase
      const avgJawWidth = totalJawWidth / validMeasurements;
      const avgFaceHeight = totalFaceHeight / validMeasurements;
      const avgNoseToChin = totalNoseToChin / validMeasurements;

      boundaries[phase] = {
        jawWidth: avgJawWidth,
        faceHeight: avgFaceHeight,
        noseToChin: avgNoseToChin,
      };

      console.log(`[ScanFlowEngine] ${phase.toUpperCase()} BOUNDARIES (from ${validMeasurements} valid frames):`);
      console.log(`[ScanFlowEngine] - Jaw Width: ${avgJawWidth.toFixed(4)}`);
      console.log(`[ScanFlowEngine] - Face Height: ${avgFaceHeight.toFixed(4)}`);
      console.log(`[ScanFlowEngine] - Nose-to-Chin: ${avgNoseToChin.toFixed(4)}`);
    }

    // Calculate absolute boundaries across all three angles
    const allJawWidths = [boundaries.front.jawWidth, boundaries.left.jawWidth, boundaries.right.jawWidth];
    const allFaceHeights = [boundaries.front.faceHeight, boundaries.left.faceHeight, boundaries.right.faceHeight];

    boundaries.absolute.maxJawWidth = Math.max(...allJawWidths);
    boundaries.absolute.avgJawWidth = allJawWidths.reduce((sum, w) => sum + w, 0) / allJawWidths.length;
    boundaries.absolute.maxFaceHeight = Math.max(...allFaceHeights);
    boundaries.absolute.avgFaceHeight = allFaceHeights.reduce((sum, h) => sum + h, 0) / allFaceHeights.length;

    console.log('[ScanFlowEngine] ✅ ABSOLUTE 3D SPATIAL BOUNDARIES CALCULATED:');
    console.log('[ScanFlowEngine] - Max Jaw Width:', boundaries.absolute.maxJawWidth.toFixed(4));
    console.log('[ScanFlowEngine] - Avg Jaw Width:', boundaries.absolute.avgJawWidth.toFixed(4));
    console.log('[ScanFlowEngine] - Max Face Height:', boundaries.absolute.maxFaceHeight.toFixed(4));
    console.log('[ScanFlowEngine] - Avg Face Height:', boundaries.absolute.avgFaceHeight.toFixed(4));

    return boundaries;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GET PROGRESS
  // ═══════════════════════════════════════════════════════════════════════════

  getProgress(): ScanProgress {
    const currentPhase = this.phases[this.currentPhaseIndex];
    const phaseName = currentPhase.name as ScanPhase;
    const frames = this.capturedFrames.get(phaseName) || [];
    const phaseDuration = performance.now() - this.phaseStartTime;
    const progressRatio = Math.min(phaseDuration / currentPhase.minDuration, 1);

    const overallProgress = this.isComplete
      ? 100
      : ((this.currentPhaseIndex + progressRatio) / this.phases.length) * 100;

    return {
      currentPhase: this.isComplete ? 'complete' : phaseName,
      phaseIndex: this.currentPhaseIndex,
      totalPhases: this.phases.length,
      progress: overallProgress,
      isPhaseComplete: this.isComplete || progressRatio >= 1,
      capturedFrames: Array.from(this.capturedFrames.values()).flat(),
      phaseStartTime: this.phaseStartTime,
      totalElapsedTime: performance.now() - (this.phaseStartTime || performance.now()),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GET CURRENT PHASE CONFIG
  // ═══════════════════════════════════════════════════════════════════════════

  getCurrentPhaseConfig(): ScanPhaseConfig | null {
    if (this.isComplete || this.currentPhaseIndex >= this.phases.length) {
      return null;
    }
    return this.phases[this.currentPhaseIndex];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GET CAPTURED DATA
  // ═══════════════════════════════════════════════════════════════════════════

  getCapturedData(): Map<ScanPhase, FaceLandmark[][]> {
    return new Map(this.capturedFrames);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  isScanningActive(): boolean {
    return this.isScanning;
  }

  isScanComplete(): boolean {
    return this.isComplete;
  }

  getAbsoluteJawScale(): number | null {
    if (!this.isComplete) {
      return null;
    }
    // Return the average jaw width from spatial boundaries
    const boundaries = this.calculateSpatial3DBoundaries();
    return boundaries.absolute.avgJawWidth;
  }
}
