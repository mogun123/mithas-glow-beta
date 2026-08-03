// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - Face Depth Engine (Refactored)
// Event-driven depth estimation
// ═══════════════════════════════════════════════════════════════════════════

import { FaceLandmark, DepthMap, DepthEstimation } from '../types/engine.types';
import { EventBus } from '../core/EventBus';
import { globalEventBus } from '../core/EventBus';
import { AREvents, StabilizedLandmarksEvent, FaceLostEvent, DepthMapGeneratedEvent } from '../core/EventTypes';

export class FaceDepthEngine {
  private eventBus: EventBus;
  private depthMap: DepthMap | null = null;
  private confidence: number = 0;
  private pipelineState: string = 'BOOT';

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus || globalEventBus;
    this.setupEventListeners();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════

  private setupEventListeners(): void {
    // Listen for stabilized landmarks to estimate depth
    this.eventBus.on<StabilizedLandmarksEvent>(AREvents.STABILIZED_LANDMARKS, (data) => {
      if (data.stabilized.landmarks && data.stabilized.landmarks.length > 0) {
        const depthEstimation = this.estimateDepth(data.stabilized.landmarks);
        this.eventBus.emit<DepthMapGeneratedEvent>(AREvents.DEPTH_MAP_GENERATED, {
          depthMap: depthEstimation.depthMap,
          confidence: depthEstimation.confidence,
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

  private reset(): void {
    this.depthMap = null;
    this.confidence = 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPOSE
  // ═══════════════════════════════════════════════════════════════════════════

  dispose(): void {
    this.eventBus.off(AREvents.STABILIZED_LANDMARKS);
    this.eventBus.off(AREvents.FACE_LOST);
    this.eventBus.off(AREvents.PIPELINE_STATE_CHANGE);
    this.reset();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTIMATE DEPTH FROM LANDMARKS
  // ═══════════════════════════════════════════════════════════════════════════

  estimateDepth(landmarks: FaceLandmark[]): DepthEstimation {
    if (!landmarks || landmarks.length === 0) {
      return {
        depthMap: this.getEmptyDepthMap(),
        confidence: 0,
        pseudoDepthImage: null,
      };
    }

    // Calculate depth map
    this.depthMap = this.calculateDepthMap(landmarks);

    // Calculate confidence based on landmark quality
    this.confidence = this.calculateConfidence(landmarks);

    // Generate pseudo-depth image (optional, for visualization)
    const pseudoDepthImage = this.generatePseudoDepthImage(landmarks);

    return {
      depthMap: this.depthMap,
      confidence: this.confidence,
      pseudoDepthImage,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE DEPTH MAP
  // ═══════════════════════════════════════════════════════════════════════════

  private calculateDepthMap(landmarks: FaceLandmark[]): DepthMap {
    const chin = landmarks[152];
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];
    const forehead = landmarks[10];
    const nose = landmarks[1];
    const leftCheekbone = landmarks[50];
    const rightCheekbone = landmarks[280];

    // Chin projection - distance from nose bridge to chin
    const chinProjection = this.calculateChinProjection(chin, nose);

    // Cheek depth - using z-coordinates if available, or estimate from curvature
    const cheekDepth = this.calculateCheekDepth(leftCheek, rightCheek, nose);

    // Jaw curvature - curve of jawline
    const jawCurvature = this.calculateJawCurvature(landmarks);

    // Side contour - profile depth
    const sideContour = this.calculateSideContour(leftCheek, rightCheek, nose);

    // Forehead depth - relative to nose
    const foreheadDepth = this.calculateForeheadDepth(forehead, nose);

    // Nose bridge depth - relative to cheeks
    const noseBridgeDepth = this.calculateNoseBridgeDepth(nose, leftCheekbone, rightCheekbone);

    return {
      chinProjection,
      cheekDepth,
      jawCurvature,
      sideContour,
      foreheadDepth,
      noseBridgeDepth,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHIN PROJECTION
  // ═══════════════════════════════════════════════════════════════════════════

  private calculateChinProjection(chin: FaceLandmark, nose: FaceLandmark): number {
    // Use z-coordinate if available
    if (chin.z !== undefined && nose.z !== undefined) {
      return Math.abs(chin.z - nose.z);
    }

    // Fallback: estimate from y-distance
    const yDistance = Math.abs(chin.y - nose.y);
    return yDistance * 0.5; // Approximate depth factor
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHEEK DEPTH
  // ═══════════════════════════════════════════════════════════════════════════

  private calculateCheekDepth(
    leftCheek: FaceLandmark,
    rightCheek: FaceLandmark,
    nose: FaceLandmark
  ): number {
    // Use z-coordinates if available
    if (leftCheek.z !== undefined && rightCheek.z !== undefined && nose.z !== undefined) {
      const leftDepth = Math.abs(leftCheek.z - nose.z);
      const rightDepth = Math.abs(rightCheek.z - nose.z);
      return (leftDepth + rightDepth) / 2;
    }

    // Fallback: estimate from curvature
    const cheekWidth = Math.abs(leftCheek.x - rightCheek.x);
    const noseX = nose.x;
    const centerX = (leftCheek.x + rightCheek.x) / 2;
    const curvature = Math.abs(noseX - centerX) / cheekWidth;
    return curvature * 0.3;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // JAW CURVATURE
  // ═══════════════════════════════════════════════════════════════════════════

  private calculateJawCurvature(landmarks: FaceLandmark[]): number {
    // Jaw landmarks: 152 (chin), 377 (left jaw), 148 (right jaw)
    const chin = landmarks[152];
    const leftJaw = landmarks[377];
    const rightJaw = landmarks[148];

    if (!chin || !leftJaw || !rightJaw) {
      return 0;
    }

    // Calculate curvature using three points
    const midJawX = (leftJaw.x + rightJaw.x) / 2;
    const midJawY = (leftJaw.y + rightJaw.y) / 2;

    // Distance from chin to mid-jaw
    const dx = chin.x - midJawX;
    const dy = chin.y - midJawY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Normalize curvature
    return Math.min(1, distance * 2);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SIDE CONTOUR
  // ═══════════════════════════════════════════════════════════════════════════

  private calculateSideContour(
    leftCheek: FaceLandmark,
    rightCheek: FaceLandmark,
    nose: FaceLandmark
  ): number {
    // Use z-coordinates if available
    if (leftCheek.z !== undefined && rightCheek.z !== undefined) {
      return Math.abs(leftCheek.z - rightCheek.z);
    }

    // Fallback: estimate from x-distance
    const cheekWidth = Math.abs(leftCheek.x - rightCheek.x);
    const noseOffset = Math.abs(nose.x - (leftCheek.x + rightCheek.x) / 2);
    return (noseOffset / cheekWidth) * 0.5;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FOREHEAD DEPTH
  // ═══════════════════════════════════════════════════════════════════════════

  private calculateForeheadDepth(forehead: FaceLandmark, nose: FaceLandmark): number {
    if (forehead.z !== undefined && nose.z !== undefined) {
      return Math.abs(forehead.z - nose.z);
    }

    // Fallback: estimate from y-distance
    const yDistance = Math.abs(forehead.y - nose.y);
    return yDistance * 0.4;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NOSE BRIDGE DEPTH
  // ═══════════════════════════════════════════════════════════════════════════

  private calculateNoseBridgeDepth(
    nose: FaceLandmark,
    leftCheekbone: FaceLandmark,
    rightCheekbone: FaceLandmark
  ): number {
    if (nose.z !== undefined && leftCheekbone.z !== undefined && rightCheekbone.z !== undefined) {
      const leftDepth = Math.abs(nose.z - leftCheekbone.z);
      const rightDepth = Math.abs(nose.z - rightCheekbone.z);
      return (leftDepth + rightDepth) / 2;
    }

    // Fallback: estimate from x-distance
    const cheekboneWidth = Math.abs(leftCheekbone.x - rightCheekbone.x);
    const noseOffset = Math.abs(nose.x - (leftCheekbone.x + rightCheekbone.x) / 2);
    return (noseOffset / cheekboneWidth) * 0.6;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE CONFIDENCE
  // ═══════════════════════════════════════════════════════════════════════════

  private calculateConfidence(landmarks: FaceLandmark[]): number {
    let zCount = 0;
    const totalLandmarks = landmarks.length;

    for (const lm of landmarks) {
      if (lm.z !== undefined && lm.z !== 0) {
        zCount++;
      }
    }

    // Confidence based on z-coordinate availability
    const zRatio = zCount / totalLandmarks;
    return Math.min(1, zRatio * 2); // Boost confidence if z-coordinates available
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE PSEUDO-DEPTH IMAGE
  // ═══════════════════════════════════════════════════════════════════════════

  private generatePseudoDepthImage(landmarks: FaceLandmark[]): Float32Array | null {
    if (!this.depthMap) return null;

    // Create a simple depth map (normalized 0-1)
    const depthValues = [
      this.depthMap.chinProjection,
      this.depthMap.cheekDepth,
      this.depthMap.jawCurvature,
      this.depthMap.sideContour,
      this.depthMap.foreheadDepth,
      this.depthMap.noseBridgeDepth,
    ];

    // Normalize to 0-1 range
    const maxDepth = Math.max(...depthValues);
    const normalized = depthValues.map(v => maxDepth > 0 ? v / maxDepth : 0);

    return new Float32Array(normalized);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GET EMPTY DEPTH MAP
  // ═══════════════════════════════════════════════════════════════════════════

  private getEmptyDepthMap(): DepthMap {
    return {
      chinProjection: 0,
      cheekDepth: 0,
      jawCurvature: 0,
      sideContour: 0,
      foreheadDepth: 0,
      noseBridgeDepth: 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  getDepthMap(): DepthMap | null {
    return this.depthMap;
  }

  getConfidence(): number {
    return this.confidence;
  }
}
