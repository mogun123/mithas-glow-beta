// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - Dynamic Anchor Engine (Refactored)
// Event-driven anchor generation
// ═══════════════════════════════════════════════════════════════════════════

import { FaceLandmark, AnchorPoint, AnchorSystem, DepthMap } from '../types/engine.types';
import { EventBus } from '../core/EventBus';
import { AREvents, FaceStableEvent, FaceLostEvent, AnchorsGeneratedEvent, StabilizedLandmarksEvent } from '../core/EventTypes';
import * as THREE from 'three';

export class DynamicAnchorEngine {
  private eventBus: EventBus;
  private anchors: AnchorPoint[] = [];
  private anchorSystem: AnchorSystem | null = null;
  private previousAnchors: AnchorPoint[] | null = null;
  private currentLandmarks: FaceLandmark[] | null = null;
  private currentDepthMap: DepthMap | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private spatialBoundaries: Spatial3DBoundaries | null = null;

  constructor(eventBus: EventBus, camera?: THREE.PerspectiveCamera) {
    this.eventBus = eventBus;
    this.camera = camera || null;
    this.setupEventListeners();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════

  private setupEventListeners(): void {
    // Listen for stabilized landmarks to generate anchors
    this.eventBus.on<StabilizedLandmarksEvent>(AREvents.STABILIZED_LANDMARKS, (data) => {
      this.currentLandmarks = data.stabilized.landmarks;
      this.generateAnchors();
    });

    // Listen for face lost to reset
    this.eventBus.on<FaceLostEvent>(AREvents.FACE_LOST, () => {
      this.reset();
    });

    // Listen for scan complete to get spatial boundaries for Z-depth calculation
    this.eventBus.on(AREvents.SCAN_COMPLETE, (data: any) => {
      console.log('[DynamicAnchorEngine] 📊 Received spatial boundaries for Z-depth calculation:', data.spatialBoundaries);
      this.spatialBoundaries = data.spatialBoundaries;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SET CAMERA
  // ═══════════════════════════════════════════════════════════════════════════

  setCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZE ANCHORS
  // ═══════════════════════════════════════════════════════════════════════════

  initialize(): void {
    this.anchors = this.createDefaultAnchors();
    this.previousAnchors = null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE ANCHORS
  // ═══════════════════════════════════════════════════════════════════════════

  private generateAnchors(): void {
    if (!this.currentLandmarks) return;

    const anchorSystem = this.updateAnchors(this.currentLandmarks, this.currentDepthMap || undefined);

    if (anchorSystem) {
      this.eventBus.emit<AnchorsGeneratedEvent>(AREvents.ANCHORS_GENERATED, {
        anchors: anchorSystem,
        timestamp: performance.now(),
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET
  // ═══════════════════════════════════════════════════════════════════════════

  private reset(): void {
    this.anchors = this.createDefaultAnchors();
    this.previousAnchors = null;
    this.anchorSystem = null;
    this.currentLandmarks = null;
    this.currentDepthMap = null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPOSE
  // ═══════════════════════════════════════════════════════════════════════════

  dispose(): void {
    this.eventBus.off(AREvents.STABILIZED_LANDMARKS);
    this.eventBus.off(AREvents.FACE_LOST);
    this.eventBus.off(AREvents.SCAN_COMPLETE);
    this.reset();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE DEFAULT ANCHORS
  // ═══════════════════════════════════════════════════════════════════════════

  private createDefaultAnchors(): AnchorPoint[] {
    return [
      // Chin anchors (primary)
      { id: 'chin_center', landmarkIndex: 152, position: { x: 0, y: 0, z: 0 }, weight: 1.0, type: 'chin' },
      { id: 'chin_left', landmarkIndex: 172, position: { x: 0, y: 0, z: 0 }, weight: 0.8, type: 'chin' },
      { id: 'chin_right', landmarkIndex: 397, position: { x: 0, y: 0, z: 0 }, weight: 0.8, type: 'chin' },

      // Nose anchors (for rotation calculation)
      { id: 'nose_tip', landmarkIndex: 4, position: { x: 0, y: 0, z: 0 }, weight: 0.9, type: 'nose' },

      // Lip anchors (for beard positioning)
      { id: 'bottom_lip', landmarkIndex: 17, position: { x: 0, y: 0, z: 0 }, weight: 0.9, type: 'lip' },

      // Jaw anchors
      { id: 'jaw_left', landmarkIndex: 234, position: { x: 0, y: 0, z: 0 }, weight: 0.9, type: 'jaw' },
      { id: 'jaw_right', landmarkIndex: 454, position: { x: 0, y: 0, z: 0 }, weight: 0.9, type: 'jaw' },
      { id: 'jaw_corner_left', landmarkIndex: 58, position: { x: 0, y: 0, z: 0 }, weight: 0.7, type: 'jaw' },
      { id: 'jaw_corner_right', landmarkIndex: 288, position: { x: 0, y: 0, z: 0 }, weight: 0.7, type: 'jaw' },

      // Cheek anchors
      { id: 'cheek_left', landmarkIndex: 50, position: { x: 0, y: 0, z: 0 }, weight: 0.6, type: 'cheek' },
      { id: 'cheek_right', landmarkIndex: 280, position: { x: 0, y: 0, z: 0 }, weight: 0.6, type: 'cheek' },

      // Mustache region anchors
      { id: 'mustache_left', landmarkIndex: 61, position: { x: 0, y: 0, z: 0 }, weight: 0.5, type: 'mustache' },
      { id: 'mustache_right', landmarkIndex: 291, position: { x: 0, y: 0, z: 0 }, weight: 0.5, type: 'mustache' },
      { id: 'mustache_center', landmarkIndex: 13, position: { x: 0, y: 0, z: 0 }, weight: 0.7, type: 'mustache' },

      // Neckline anchors
      { id: 'neckline_left', landmarkIndex: 200, position: { x: 0, y: 0, z: 0 }, weight: 0.4, type: 'neckline' },
      { id: 'neckline_right', landmarkIndex: 419, position: { x: 0, y: 0, z: 0 }, weight: 0.4, type: 'neckline' },

      // Sideburn anchors
      { id: 'sideburn_left', landmarkIndex: 116, position: { x: 0, y: 0, z: 0 }, weight: 0.5, type: 'sideburn' },
      { id: 'sideburn_right', landmarkIndex: 345, position: { x: 0, y: 0, z: 0 }, weight: 0.5, type: 'sideburn' },
    ];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE ANCHORS FROM LANDMARKS
  // ═══════════════════════════════════════════════════════════════════════════

  updateAnchors(landmarks: FaceLandmark[], depthMap?: DepthMap): AnchorSystem {
    if (!landmarks || landmarks.length === 0) {
      return this.getEmptyAnchorSystem();
    }

    // Update anchor positions from landmarks with proper coordinate mapping
    // MediaPipe landmarks are in normalized coordinates (0-1), need to convert to Three.js world space
    for (const anchor of this.anchors) {
      const landmark = landmarks[anchor.landmarkIndex];
      if (landmark) {
        if (this.camera) {
          // ═══════════════════════════════════════════════════════════════════════════
          // CORRECTED UNPROJECTION MATH: Separate X/Y from Z depth
          // MediaPipe Z is a relative metric, NOT a valid NDC for depth
          // ═══════════════════════════════════════════════════════════════════════════

          // Calculate base plane Z from camera distance
          // For a typical AR setup, the camera is at z = 0 looking down -Z axis
          // The face plane is typically at z = -cameraDistance
          const cameraDistance = this.camera.position.z; // Distance from camera to origin
          const basePlaneZ = -Math.abs(cameraDistance); // Face plane depth (negative Z)

          // Unproject X/Y using base plane Z (NOT MediaPipe's raw Z)
          // This gives us the correct world space X and Y at the face plane depth
          const vector = new THREE.Vector3(
            landmark.x * 2 - 1,  // Convert 0-1 to -1 to 1 (NDC X)
            -(landmark.y * 2 - 1), // Convert 0-1 to -1 to 1, flip Y axis (NDC Y)
            0  // Use Z = 0 for unprojection (will be overridden)
          );
          vector.unproject(this.camera);

          // Calculate final World Z using MediaPipe relative Z scaled by spatial boundaries
          // MediaPipe Z is relative, so we scale it by the absolute max jaw width from 3-angle scan
          let worldZ = basePlaneZ;
          if (this.spatialBoundaries) {
            // Scale MediaPipe relative Z by the absolute spatial scale
            // This maps relative depth to real world depth proportional to face size
            const relativeZ = landmark.z || 0;
            const depthScale = this.spatialBoundaries.absolute.maxJawWidth;
            worldZ = basePlaneZ + (relativeZ * depthScale);
          } else {
            console.warn('[DynamicAnchorEngine] ⚠️ No spatial boundaries available, using base plane Z only');
          }

          anchor.position = {
            x: vector.x,
            y: vector.y,
            z: worldZ,
          };
        } else {
          // Fallback to basic mapping if camera not available
          anchor.position = {
            x: (landmark.x - 0.5) * 2,
            y: -(landmark.y - 0.5) * 2,
            z: landmark.z || 0,
          };
        }
      }
    }

    // Apply depth adjustments if available
    if (depthMap) {
      this.applyDepthAdjustments(depthMap);
    }

    // Calculate transform from anchors
    const transform = this.calculateTransform();

    // Calculate confidence
    const confidence = this.calculateConfidence(landmarks);

    // Apply anchor interpolation for smoothness
    this.interpolateAnchors();

    this.anchorSystem = {
      anchors: [...this.anchors],
      transform,
      confidence,
    };

    this.previousAnchors = this.anchors.map(a => ({ ...a }));

    return this.anchorSystem;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APPLY DEPTH ADJUSTMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  private applyDepthAdjustments(depthMap: DepthMap): void {
    for (const anchor of this.anchors) {
      switch (anchor.type) {
        case 'chin':
          anchor.position.z += depthMap.chinProjection * 0.5;
          break;
        case 'cheek':
          anchor.position.z += depthMap.cheekDepth * 0.3;
          break;
        case 'mustache':
          anchor.position.z += depthMap.noseBridgeDepth * 0.4;
          break;
        case 'neckline':
          anchor.position.z += depthMap.jawCurvature * 0.2;
          break;
        case 'sideburn':
          anchor.position.z += depthMap.sideContour * 0.3;
          break;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE TRANSFORM FROM ANCHORS
  // ═══════════════════════════════════════════════════════════════════════════

  private calculateTransform(): AnchorSystem['transform'] {
    // Calculate weighted center position
    let totalWeight = 0;
    let weightedX = 0;
    let weightedY = 0;
    let weightedZ = 0;

    for (const anchor of this.anchors) {
      weightedX += anchor.position.x * anchor.weight;
      weightedY += anchor.position.y * anchor.weight;
      weightedZ += anchor.position.z * anchor.weight;
      totalWeight += anchor.weight;
    }

    const position = {
      x: totalWeight > 0 ? weightedX / totalWeight : 0,
      y: totalWeight > 0 ? weightedY / totalWeight : 0,
      z: totalWeight > 0 ? weightedZ / totalWeight : 0,
    };

    // Calculate rotation from jaw anchors
    const leftJaw = this.anchors.find(a => a.id === 'jaw_left');
    const rightJaw = this.anchors.find(a => a.id === 'jaw_right');
    const chin = this.anchors.find(a => a.id === 'chin_center');

    let rotation = { x: 0, y: 0, z: 0 };

    if (leftJaw && rightJaw && chin) {
      // Yaw (left-right rotation)
      const jawCenterX = (leftJaw.position.x + rightJaw.position.x) / 2;
      rotation.y = (chin.position.x - jawCenterX) * 2;

      // Pitch (up-down rotation)
      const jawCenterY = (leftJaw.position.y + rightJaw.position.y) / 2;
      rotation.x = (chin.position.y - jawCenterY) * 2;

      // Roll (tilt rotation)
      const jawYDiff = rightJaw.position.y - leftJaw.position.y;
      rotation.z = jawYDiff * 2;
    }

    // Calculate scale from jaw width
    let scale = { x: 1, y: 1, z: 1 };

    if (leftJaw && rightJaw) {
      const jawWidth = Math.abs(leftJaw.position.x - rightJaw.position.x);
      const baseJawWidth = 0.3; // Normalized reference width
      const scaleFactor = jawWidth / baseJawWidth;
      scale = {
        x: scaleFactor,
        y: scaleFactor,
        z: scaleFactor,
      };
    }

    return { position, rotation, scale };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE CONFIDENCE
  // ═══════════════════════════════════════════════════════════════════════════

  private calculateConfidence(landmarks: FaceLandmark[]): number {
    let validAnchors = 0;
    const totalAnchors = this.anchors.length;

    for (const anchor of this.anchors) {
      const landmark = landmarks[anchor.landmarkIndex];
      if (landmark && landmark.x >= 0 && landmark.x <= 1 && landmark.y >= 0 && landmark.y <= 1) {
        validAnchors++;
      }
    }

    return validAnchors / totalAnchors;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERPOLATE ANCHORS FOR SMOOTHNESS
  // ═══════════════════════════════════════════════════════════════════════════

  private interpolateAnchors(): void {
    if (!this.previousAnchors) return;

    const alpha = 0.3; // Interpolation factor

    for (let i = 0; i < this.anchors.length; i++) {
      const current = this.anchors[i];
      const previous = this.previousAnchors[i];

      current.position.x = alpha * current.position.x + (1 - alpha) * previous.position.x;
      current.position.y = alpha * current.position.y + (1 - alpha) * previous.position.y;
      current.position.z = alpha * current.position.z + (1 - alpha) * previous.position.z;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DYNAMIC SCALING BASED ON FACE WIDTH
  // ═══════════════════════════════════════════════════════════════════════════

  applyDynamicScaling(landmarks: FaceLandmark[], baseScale: number = 1.0): number {
    if (!landmarks || landmarks.length === 0) {
      return baseScale;
    }

    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];

    if (!leftCheek || !rightCheek) {
      return baseScale;
    }

    const jawWidth = Math.abs(leftCheek.x - rightCheek.x);
    const referenceWidth = 0.3; // Normalized reference
    const scaleFactor = jawWidth / referenceWidth;

    return baseScale * scaleFactor;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MULTI-POINT TRANSFORM SOLVING
  // ═══════════════════════════════════════════════════════════════════════════

  solveMultiPointTransform(targetAnchors: AnchorPoint[]): AnchorSystem['transform'] {
    // Use weighted least squares to solve for optimal transform
    // This is a simplified version - production would use full SVD
    
    let sumX = 0, sumY = 0, sumZ = 0;
    let sumWeight = 0;

    for (const anchor of targetAnchors) {
      sumX += anchor.position.x * anchor.weight;
      sumY += anchor.position.y * anchor.weight;
      sumZ += anchor.position.z * anchor.weight;
      sumWeight += anchor.weight;
    }

    const position = {
      x: sumWeight > 0 ? sumX / sumWeight : 0,
      y: sumWeight > 0 ? sumY / sumWeight : 0,
      z: sumWeight > 0 ? sumZ / sumWeight : 0,
    };

    // Calculate rotation using PCA-like approach
    const rotation = this.calculateRotationFromAnchors(targetAnchors);

    // Calculate scale
    const scale = this.calculateScaleFromAnchors(targetAnchors);

    return { position, rotation, scale };
  }

  private calculateRotationFromAnchors(anchors: AnchorPoint[]): { x: number; y: number; z: number } {
    // Simplified rotation calculation
    const weightedAnchors = anchors.filter(a => a.weight > 0.5);
    
    if (weightedAnchors.length < 3) {
      return { x: 0, y: 0, z: 0 };
    }

    // Use three highest-weight anchors for rotation
    const sorted = weightedAnchors.sort((a, b) => b.weight - a.weight).slice(0, 3);
    
    const p1 = sorted[0].position;
    const p2 = sorted[1].position;
    const p3 = sorted[2].position;

    // Calculate normal vector
    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
    const v2 = { x: p3.x - p1.x, y: p3.y - p1.y, z: p3.z - p1.z };

    const normal = {
      x: v1.y * v2.z - v1.z * v2.y,
      y: v1.z * v2.x - v1.x * v2.z,
      z: v1.x * v2.y - v1.y * v2.x,
    };

    // Convert to Euler angles (simplified)
    return {
      x: Math.atan2(normal.y, normal.z),
      y: Math.atan2(normal.x, normal.z),
      z: Math.atan2(normal.x, normal.y),
    };
  }

  private calculateScaleFromAnchors(anchors: AnchorPoint[]): { x: number; y: number; z: number } {
    let maxDistance = 0;

    for (let i = 0; i < anchors.length; i++) {
      for (let j = i + 1; j < anchors.length; j++) {
        const dx = anchors[i].position.x - anchors[j].position.x;
        const dy = anchors[i].position.y - anchors[j].position.y;
        const dz = anchors[i].position.z - anchors[j].position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        maxDistance = Math.max(maxDistance, distance);
      }
    }

    const referenceDistance = 0.5;
    const scaleFactor = maxDistance / referenceDistance;

    return {
      x: scaleFactor,
      y: scaleFactor,
      z: scaleFactor,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GET EMPTY ANCHOR SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════

  private getEmptyAnchorSystem(): AnchorSystem {
    return {
      anchors: [],
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
      confidence: 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  getAnchorSystem(): AnchorSystem | null {
    return this.anchorSystem;
  }

  getAnchors(): AnchorPoint[] {
    return [...this.anchors];
  }
}
