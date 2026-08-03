// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - Face Stabilization Engine (Refactored)
// Event-driven landmark stabilization
// ═══════════════════════════════════════════════════════════════════════════

import { FaceLandmark, StabilizedLandmarks, StabilizationConfig } from '../types/engine.types';
import { EventBus } from '../core/EventBus';
import { globalEventBus } from '../core/EventBus';
import { AREvents, FaceResultsEvent, FaceLostEvent, StabilizedLandmarksEvent } from '../core/EventTypes';

export class FaceStabilizationEngine {
  private eventBus: EventBus;
  private config: StabilizationConfig;
  private previousLandmarks: FaceLandmark[] | null = null;
  private velocity: FaceLandmark[] | null = null;
  private kalmanStates: KalmanState[] | null = null;
  private jitterScore: number = 0;
  private frameCount: number = 0;
  private pipelineState: string = 'BOOT';

  constructor(config?: Partial<StabilizationConfig>, eventBus?: EventBus) {
    this.config = {
      smoothingFactor: config?.smoothingFactor || 0.12,
      kalmanGain: config?.kalmanGain || 0.1,
      jitterThreshold: config?.jitterThreshold || 0.02,
      velocityPrediction: config?.velocityPrediction !== false,
      rotationalDamping: config?.rotationalDamping || 0.8,
    };
    this.eventBus = eventBus || globalEventBus;
    this.setupEventListeners();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════

  private setupEventListeners(): void {
    // Listen for face results to stabilize
    this.eventBus.on<FaceResultsEvent>(AREvents.FACE_RESULTS, (data) => {
      if (data.landmarks && data.landmarks.length > 0) {
        const stabilized = this.stabilize(data.landmarks);
        this.eventBus.emit<StabilizedLandmarksEvent>(AREvents.STABILIZED_LANDMARKS, {
          stabilized,
          timestamp: performance.now(),
        });
      }
    });

    // Listen for face lost to reset
    this.eventBus.on<FaceLostEvent>(AREvents.FACE_LOST, () => {
      this.reset();
    });

    // Listen for pipeline state changes
    this.eventBus.on(AREvents.PIPELINE_STATE_CHANGE, (data: any) => {
      this.pipelineState = data.toState;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET
  // ═══════════════════════════════════════════════════════════════════════════

  public reset(): void {
    this.previousLandmarks = null;
    this.velocity = null;
    this.kalmanStates = null;
    this.jitterScore = 0;
    this.frameCount = 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPOSE
  // ═══════════════════════════════════════════════════════════════════════════

  dispose(): void {
    this.eventBus.off(AREvents.FACE_RESULTS);
    this.eventBus.off(AREvents.FACE_LOST);
    this.eventBus.off(AREvents.PIPELINE_STATE_CHANGE);
    this.reset();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STABILIZE LANDMARKS
  // ═══════════════════════════════════════════════════════════════════════════

  stabilize(landmarks: FaceLandmark[]): StabilizedLandmarks {
    if (!landmarks || landmarks.length === 0) {
      return {
        landmarks: [],
        velocity: [],
        confidence: 0,
        jitterScore: 0,
      };
    }

    this.frameCount++;

    // Initialize on first frame
    if (!this.previousLandmarks) {
      this.previousLandmarks = landmarks.map(lm => ({ ...lm }));
      this.velocity = landmarks.map(() => ({ x: 0, y: 0, z: 0 }));
      this.kalmanStates = landmarks.map(() => this.createKalmanState());
      
      return {
        landmarks: landmarks.map(lm => ({ ...lm })),
        velocity: landmarks.map(() => ({ x: 0, y: 0, z: 0 })),
        confidence: 1,
        jitterScore: 0,
      };
    }

    // Calculate velocity
    this.calculateVelocity(landmarks);

    // Apply Kalman filtering
    const kalmanFiltered = this.applyKalmanFilter(landmarks);

    // Apply temporal smoothing (EMA)
    const smoothed = this.applyTemporalSmoothing(kalmanFiltered);

    // Apply velocity prediction
    const predicted = this.config.velocityPrediction 
      ? this.applyVelocityPrediction(smoothed)
      : smoothed;

    // Calculate jitter score
    this.calculateJitterScore(predicted);

    // Update previous landmarks
    this.previousLandmarks = predicted.map(lm => ({ ...lm }));

    return {
      landmarks: predicted,
      velocity: this.velocity || [],
      confidence: Math.max(0, 1 - this.jitterScore),
      jitterScore: this.jitterScore,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE VELOCITY
  // ═══════════════════════════════════════════════════════════════════════════

  private calculateVelocity(landmarks: FaceLandmark[]): void {
    if (!this.previousLandmarks || !this.velocity) return;

    for (let i = 0; i < landmarks.length; i++) {
      const prevLandmark = this.previousLandmarks[i];
      if (!prevLandmark) continue;
      
      this.velocity[i] = {
        x: landmarks[i].x - prevLandmark.x,
        y: landmarks[i].y - prevLandmark.y,
        z: (landmarks[i].z || 0) - (prevLandmark.z || 0),
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // KALMAN FILTER
  // ═══════════════════════════════════════════════════════════════════════════

  private createKalmanState(): KalmanState {
    return {
      x: { estimate: 0, error: 1 },
      y: { estimate: 0, error: 1 },
      z: { estimate: 0, error: 1 },
    };
  }

  private applyKalmanFilter(landmarks: FaceLandmark[]): FaceLandmark[] {
    if (!this.kalmanStates) return landmarks;

    const filtered: FaceLandmark[] = [];

    for (let i = 0; i < landmarks.length; i++) {
      const state = this.kalmanStates[i];
      if (!state) continue;
      
      const measurement = landmarks[i];

      // Predict step
      const predictedX = state.x.estimate;
      const predictedY = state.y.estimate;
      const predictedZ = state.z.estimate;

      const predictedErrorX = state.x.error + 0.1; // Process noise
      const predictedErrorY = state.y.error + 0.1;
      const predictedErrorZ = state.z.error + 0.1;

      // Update step
      const kalmanGainX = predictedErrorX / (predictedErrorX + 0.1); // Measurement noise
      const kalmanGainY = predictedErrorY / (predictedErrorY + 0.1);
      const kalmanGainZ = predictedErrorZ / (predictedErrorZ + 0.1);

      state.x.estimate = predictedX + kalmanGainX * (measurement.x - predictedX);
      state.y.estimate = predictedY + kalmanGainY * (measurement.y - predictedY);
      state.z.estimate = predictedZ + kalmanGainZ * ((measurement.z || 0) - predictedZ);

      state.x.error = (1 - kalmanGainX) * predictedErrorX;
      state.y.error = (1 - kalmanGainY) * predictedErrorY;
      state.z.error = (1 - kalmanGainZ) * predictedErrorZ;

      filtered.push({
        x: state.x.estimate,
        y: state.y.estimate,
        z: state.z.estimate,
      });
    }

    return filtered;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEMPORAL SMOOTHING (EMA)
  // ═══════════════════════════════════════════════════════════════════════════

  private applyTemporalSmoothing(landmarks: FaceLandmark[]): FaceLandmark[] {
    if (!this.previousLandmarks) return landmarks;

    const alpha = this.config.smoothingFactor;
    const smoothed: FaceLandmark[] = [];

    for (let i = 0; i < landmarks.length; i++) {
      smoothed.push({
        x: alpha * landmarks[i].x + (1 - alpha) * this.previousLandmarks[i].x,
        y: alpha * landmarks[i].y + (1 - alpha) * this.previousLandmarks[i].y,
        z: landmarks[i].z !== undefined && this.previousLandmarks[i].z !== undefined
          ? alpha * landmarks[i].z + (1 - alpha) * this.previousLandmarks[i].z
          : landmarks[i].z,
      });
    }

    return smoothed;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VELOCITY PREDICTION
  // ═══════════════════════════════════════════════════════════════════════════

  private applyVelocityPrediction(landmarks: FaceLandmark[]): FaceLandmark[] {
    if (!this.velocity) return landmarks;

    const predictionFactor = 0.5; // How much to predict
    const predicted: FaceLandmark[] = [];

    for (let i = 0; i < landmarks.length; i++) {
      predicted.push({
        x: landmarks[i].x + this.velocity[i].x * predictionFactor,
        y: landmarks[i].y + this.velocity[i].y * predictionFactor,
        z: landmarks[i].z !== undefined
          ? landmarks[i].z + (this.velocity[i].z || 0) * predictionFactor
          : landmarks[i].z,
      });
    }

    return predicted;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE JITTER SCORE
  // ═══════════════════════════════════════════════════════════════════════════

  private calculateJitterScore(landmarks: FaceLandmark[]): void {
    if (!this.previousLandmarks) {
      this.jitterScore = 0;
      return;
    }

    let totalMovement = 0;
    const sampleCount = Math.min(landmarks.length, 50);

    for (let i = 0; i < sampleCount; i++) {
      const dx = Math.abs(landmarks[i].x - this.previousLandmarks[i].x);
      const dy = Math.abs(landmarks[i].y - this.previousLandmarks[i].y);
      totalMovement += Math.sqrt(dx * dx + dy * dy);
    }

    const averageMovement = totalMovement / sampleCount;
    
    // Normalize jitter score (0-1)
    this.jitterScore = Math.min(1, averageMovement / this.config.jitterThreshold);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ROTATIONAL DAMPING
  // ═══════════════════════════════════════════════════════════════════════════

  applyRotationalDamping(
    landmarks: FaceLandmark[],
    headRotation: { pitch: number; yaw: number; roll: number }
  ): { pitch: number; yaw: number; roll: number } {
    const damping = this.config.rotationalDamping;
    
    // Simple damping - in production, use more sophisticated approach
    return {
      pitch: headRotation.pitch * damping,
      yaw: headRotation.yaw * damping,
      roll: headRotation.roll * damping,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  getConfig(): StabilizationConfig {
    return { ...this.config };
  }

  getJitterScore(): number {
    return this.jitterScore;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// KALMAN FILTER STATE
// ═══════════════════════════════════════════════════════════════════════════

interface KalmanState {
  x: { estimate: number; error: number };
  y: { estimate: number; error: number };
  z: { estimate: number; error: number };
}
