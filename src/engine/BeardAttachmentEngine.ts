// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - Beard Attachment Engine (Refactored)
// Event-driven attachment calculation
// ═══════════════════════════════════════════════════════════════════════════

import { FaceLandmark, AnchorSystem, BeardTransform, AttachmentConfig } from '../types/engine.types';
import { EventBus } from '../core/EventBus';
import { globalEventBus } from '../core/EventBus';
import { AREvents, AnchorsGeneratedEvent, FaceLostEvent, AttachmentUpdatedEvent, ScanCompleteEvent, StabilizedLandmarksEvent, Spatial3DBoundaries } from '../core/EventTypes';
import * as THREE from 'three';

export class BeardAttachmentEngine {
  private eventBus: EventBus;
  private config: AttachmentConfig;
  private currentTransform: BeardTransform | null = null;
  private previousTransform: BeardTransform | null = null;
  private baseScale: number = 1.0;
  private currentAnchorSystem: AnchorSystem | null = null;
  private currentHeadRotation: { pitch: number; yaw: number; roll: number } = { pitch: 0, yaw: 0, roll: 0 };
  private currentMouthOpen: number = 0;
  private currentExpression: 'neutral' | 'smile' | 'talking' | 'surprised' = 'neutral';
  private pipelineState: string = 'BOOT';
  private beardModel: THREE.Group | null = null;
  private scanComplete: boolean = false;
  private spatialBoundaries: Spatial3DBoundaries | null = null;
  private camera: THREE.PerspectiveCamera | null = null;

  constructor(config?: Partial<AttachmentConfig>, eventBus?: EventBus) {
    this.config = {
      followMouth: config?.followMouth !== false,
      followExpression: config?.followExpression !== false,
      depthAware: config?.depthAware !== false,
      occlusionEnabled: config?.occlusionEnabled !== false,
      skinBlending: config?.skinBlending !== false,
    };
    this.eventBus = eventBus || globalEventBus;
    this.setupEventListeners();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SET BEARD MODEL
  // ═══════════════════════════════════════════════════════════════════════════

  setBeardModel(model: THREE.Group): void {
    console.log('[BeardAttachmentEngine] 🔧 setBeardModel called with model:', model ? 'PRESENT' : 'NULL');
    console.log('[BeardAttachmentEngine] - Model type:', model?.constructor.name);
    console.log('[BeardAttachmentEngine] - Model name:', model?.name);
    this.beardModel = model;
    console.log('[BeardAttachmentEngine] - this.beardModel after assignment:', this.beardModel ? 'SET' : 'NULL');
  }

  setCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════

  private setupEventListeners(): void {
    // Listen for anchors generated
    this.eventBus.on<AnchorsGeneratedEvent>(AREvents.ANCHORS_GENERATED, (data) => {
      try {
        console.log('[BeardAttachmentEngine] 📥 ANCHORS_GENERATED received');
        this.currentAnchorSystem = data.anchors;
        this.calculateAndEmit();
      } catch (error) {
        console.error('[BeardAttachmentEngine] ❌ ERROR in ANCHORS_GENERATED listener:', error instanceof Error ? error.message : String(error));
      }
    });

    // Listen for stabilized landmarks for continuous updates during ACTIVE_AR
    this.eventBus.on<StabilizedLandmarksEvent>(AREvents.STABILIZED_LANDMARKS, (data) => {
      try {
        if (this.pipelineState === 'ACTIVE_AR' && this.scanComplete) {
          console.log('[BeardAttachmentEngine] 📥 STABILIZED_LANDMARKS received in ACTIVE_AR - triggering transform update');
          // Trigger anchor generation from stabilized landmarks
          // This ensures continuous updates even if ANCHORS_GENERATED stops firing
          this.calculateAndEmit();
        }
      } catch (error) {
        console.error('[BeardAttachmentEngine] ❌ ERROR in STABILIZED_LANDMARKS listener:', error instanceof Error ? error.message : String(error));
      }
    });

    // Listen for face lost to reset
    this.eventBus.on<FaceLostEvent>(AREvents.FACE_LOST, () => {
      try {
        console.log('[BeardAttachmentEngine] ❌ FACE_LOST - resetting');
        this.reset();
      } catch (error) {
        console.error('[BeardAttachmentEngine] ❌ ERROR in FACE_LOST listener:', error instanceof Error ? error.message : String(error));
      }
    });

    // Listen for pipeline state changes
    this.eventBus.on(AREvents.PIPELINE_STATE_CHANGE, (data: any) => {
      try {
        console.log('[BeardAttachmentEngine] 🔄 PIPELINE_STATE_CHANGE:', data.fromState, '->', data.toState);
        this.pipelineState = data.toState;
        // When entering ACTIVE_AR, trigger immediate transform calculation
        if (data.toState === 'ACTIVE_AR' && this.scanComplete && this.currentAnchorSystem) {
          console.log('[BeardAttachmentEngine] 🚀 Entering ACTIVE_AR - triggering immediate transform calculation');
          this.calculateAndEmit();
        }
      } catch (error) {
        console.error('[BeardAttachmentEngine] ❌ ERROR in PIPELINE_STATE_CHANGE listener:', error instanceof Error ? error.message : String(error));
      }
    });

    // Listen for scan complete to enable rendering
    this.eventBus.on<ScanCompleteEvent>(AREvents.SCAN_COMPLETE, (data) => {
      try {
        console.log('[BeardAttachmentEngine] ✅ Scan complete, enabling beard rendering');
        console.log('[BeardAttachmentEngine] 📊 Received 3D spatial boundaries:', data.spatialBoundaries);
        this.scanComplete = true;
        this.spatialBoundaries = data.spatialBoundaries;
      } catch (error) {
        console.error('[BeardAttachmentEngine] ❌ ERROR in SCAN_COMPLETE listener:', error instanceof Error ? error.message : String(error));
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE AND EMIT
  // ═══════════════════════════════════════════════════════════════════════════

  private calculateAndEmit(): void {
    try {
      console.log('[BeardAttachmentEngine] 🔍 calculateAndEmit called - pipelineState:', this.pipelineState, 'scanComplete:', this.scanComplete);

      if (!this.currentAnchorSystem) {
        console.error('[BeardAttachmentEngine] ❌ FATAL: calculateAndEmit called but no anchor system - cannot calculate transform');
        throw new Error('FATAL: No anchor system available for transform calculation');
      }

      // Block rendering until scan is complete
      if (!this.scanComplete) {
        console.log('[BeardAttachmentEngine] ⏸️ Transform update blocked - scan not complete yet');
        return;
      }

      // Only update transform in ACTIVE_AR state
      // This freezes attachment during VALIDATING_FACE and other non-active states
      if (this.pipelineState !== 'ACTIVE_AR') {
        console.log('[BeardAttachmentEngine] ⏸️ Transform update blocked - pipeline state:', this.pipelineState);
        return;
      }

      if (!this.beardModel) {
        console.log('[BeardAttachmentEngine] ⏸️ Transform update skipped - no beard model loaded yet (user must select a beard style)');
        return;
      }

      console.log('[BeardAttachmentEngine] ✅ All checks passed - calculating transform from anchor system');

      const transform = this.calculateTransform(
        this.currentAnchorSystem,
        this.currentHeadRotation,
        this.currentMouthOpen,
        this.currentExpression
      );

      console.log('[BeardAttachmentEngine] 🔄 Applying Transform - Pos:', transform.position.x.toFixed(4), transform.position.y.toFixed(4), transform.position.z.toFixed(4), 'Scale:', transform.scale.x.toFixed(4), transform.scale.y.toFixed(4), transform.scale.z.toFixed(4));

      this.eventBus.emit<AttachmentUpdatedEvent>(AREvents.ATTACHMENT_UPDATED, {
        transform,
        timestamp: performance.now(),
      });
    } catch (error) {
      console.error('[BeardAttachmentEngine] ❌ ERROR in calculateAndEmit:', error instanceof Error ? error.message : String(error));
      throw error; // Re-throw to prevent silent failures
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET
  // ═══════════════════════════════════════════════════════════════════════════

  private reset(): void {
    this.currentTransform = null;
    this.previousTransform = null;
    this.currentAnchorSystem = null;
    this.currentHeadRotation = { pitch: 0, yaw: 0, roll: 0 };
    this.currentMouthOpen = 0;
    this.currentExpression = 'neutral';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPOSE
  // ═══════════════════════════════════════════════════════════════════════════

  dispose(): void {
    this.eventBus.off(AREvents.ANCHORS_GENERATED);
    this.eventBus.off(AREvents.STABILIZED_LANDMARKS);
    this.eventBus.off(AREvents.FACE_LOST);
    this.eventBus.off(AREvents.PIPELINE_STATE_CHANGE);
    this.eventBus.off(AREvents.SCAN_COMPLETE);
    this.reset();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE BEARD TRANSFORM
  // ═══════════════════════════════════════════════════════════════════════════

  calculateTransform(
    anchorSystem: AnchorSystem,
    headRotation: { pitch: number; yaw: number; roll: number },
    mouthOpen: number,
    expression: 'neutral' | 'smile' | 'talking' | 'surprised'
  ): BeardTransform {
    if (!anchorSystem) {
      console.error('[BeardAttachmentEngine] ❌ FATAL: anchorSystem is null in calculateTransform');
      throw new Error('FATAL: anchorSystem is null - cannot calculate transform');
    }

    if (anchorSystem.confidence < 0.5) {
      console.error('[BeardAttachmentEngine] ❌ FATAL: anchorSystem confidence too low:', anchorSystem.confidence.toFixed(4));
      throw new Error(`FATAL: anchorSystem confidence too low (${anchorSystem.confidence.toFixed(4)}) - cannot calculate transform`);
    }

    console.log('[BeardAttachmentEngine] ✅ anchorSystem confidence:', anchorSystem.confidence.toFixed(4), '- proceeding with transform calculation');

    // Start with anchor system transform
    let transform = { ...anchorSystem.transform };

    // Apply dynamic scaling based on face width
    transform = this.applyDynamicScaling(transform, anchorSystem);

    // Apply jaw adaptation
    transform = this.applyJawAdaptation(transform, anchorSystem);

    // Apply mouth-open adaptation if enabled
    if (this.config.followMouth) {
      transform = this.applyMouthAdaptation(transform, mouthOpen);
    }

    // Apply expression adaptation if enabled
    if (this.config.followExpression) {
      transform = this.applyExpressionAdaptation(transform, expression);
    }

    // Apply depth-aware positioning if enabled
    if (this.config.depthAware) {
      transform = this.applyDepthAwarePositioning(transform, anchorSystem);
    }

    // Smooth the transform
    transform = this.smoothTransform(transform);

    this.currentTransform = transform;
    this.previousTransform = { ...transform };

    return transform;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APPLY DYNAMIC SCALING
  // ═══════════════════════════════════════════════════════════════════════════

  private applyDynamicScaling(
    transform: BeardTransform,
    anchorSystem: AnchorSystem
  ): BeardTransform {
    // Use the scale from anchor system, but apply base scale
    const dynamicScale = this.baseScale * anchorSystem.transform.scale.x;

    return {
      ...transform,
      scale: {
        x: dynamicScale,
        y: dynamicScale,
        z: dynamicScale,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APPLY JAW ADAPTATION
  // ═══════════════════════════════════════════════════════════════════════════

  private applyJawAdaptation(
    transform: BeardTransform,
    anchorSystem: AnchorSystem
  ): BeardTransform {
    try {
      // STRICT ANCHORING: Use ONLY chin_center anchor (landmark 152) for positioning
      const chin = anchorSystem.anchors.find(a => a.id === 'chin_center');

      // Jaw anchors used for true face width calculation (LM 234 and LM 454)
      const leftJaw = anchorSystem.anchors.find(a => a.id === 'jaw_left');
      const rightJaw = anchorSystem.anchors.find(a => a.id === 'jaw_right');

      // Get nose tip anchor (landmark 4) for rotation calculation
      const noseTip = anchorSystem.anchors.find(a => a.id === 'nose_tip');

      if (!chin) {
        throw new Error('FATAL: chin_center anchor (landmark 152) not available for positioning');
      }

      if (!leftJaw || !rightJaw || !noseTip) {
        throw new Error('FATAL: Required anchors (jaw_left, jaw_right, nose_tip) not available for rotation/scale calculation');
      }

      // STRICT POSITIONING: Anchor EXACTLY to chin_center (landmark 152)
      transform.position = {
        x: chin.position.x,
        y: chin.position.y,
        z: chin.position.z,
      };

      // FIX MIRRORING: Invert X-axis position for front-facing camera
      transform.position.x *= -1;

      console.log('[BeardAttachmentEngine] 📍 CHIN ANCHOR POSITION (landmark 152):');
      console.log('[BeardAttachmentEngine] - X:', transform.position.x.toFixed(4));
      console.log('[BeardAttachmentEngine] - Y:', transform.position.y.toFixed(4));
      console.log('[BeardAttachmentEngine] - Z:', transform.position.z.toFixed(4));

      // ═══════════════════════════════════════════════════════════════════════════
      // Z-DEPTH CORRECTION: Use chin anchor's actual projected Z-coordinate
      // The DynamicAnchorEngine already converts MediaPipe normalized coordinates to
      // Three.js world space using camera.unproject(), so chin.position.z is the
      // correct depth value. Do NOT recalculate Z from distances.
      // ═══════════════════════════════════════════════════════════════════════════

      // Keep the chin anchor's Z-coordinate as-is (already properly projected)
      // No additional Z-depth calculation needed

      // ═══════════════════════════════════════════════════════════════════════════
      // DYNAMIC SCALING: Calculate scale based on actual face width vs model width
      // ═══════════════════════════════════════════════════════════════════════════

      // STRICT: Require spatial boundaries from 3-angle scan (no fallbacks)
      if (!this.spatialBoundaries) {
        throw new Error('FATAL: spatialBoundaries not available - 3-angle scan must complete first');
      }

      // STRICT: Require beard model to exist (no fallbacks)
      if (!this.beardModel) {
        throw new Error('FATAL: Beard model is null, cannot calculate scaling');
      }

      // STRICT: Update world matrix before bounding box calculation
      this.beardModel.updateMatrixWorld(true);

      // Calculate precise bounding box of beard model
      const boundingBox = new THREE.Box3().setFromObject(this.beardModel);
      const size = new THREE.Vector3();
      boundingBox.getSize(size);
      const modelWidth3D = size.x;
      const modelHeight3D = size.y;

      console.log('[BeardAttachmentEngine] 📏 BEARD MODEL DIMENSIONS:');
      console.log('[BeardAttachmentEngine] - Model Width:', modelWidth3D.toFixed(4));
      console.log('[BeardAttachmentEngine] - Model Height:', modelHeight3D.toFixed(4));

      // ═══════════════════════════════════════════════════════════════════════════
      // TRUE WIDTH SCALING: Calculate face width from LM 234 and LM 454 distance
      // ═══════════════════════════════════════════════════════════════════════════

      // Calculate true face width using 3D distance between left cheek (LM 234) and right cheek (LM 454)
      const leftJawPos = new THREE.Vector3(leftJaw.position.x, leftJaw.position.y, leftJaw.position.z);
      const rightJawPos = new THREE.Vector3(rightJaw.position.x, rightJaw.position.y, rightJaw.position.z);
      const faceWidth3D = leftJawPos.distanceTo(rightJawPos);

      console.log('[BeardAttachmentEngine] 📊 TRUE FACE WIDTH CALCULATION:');
      console.log('[BeardAttachmentEngine] - Left Jaw (LM 234):', leftJaw.position.x.toFixed(4), leftJaw.position.y.toFixed(4), leftJaw.position.z.toFixed(4));
      console.log('[BeardAttachmentEngine] - Right Jaw (LM 454):', rightJaw.position.x.toFixed(4), rightJaw.position.y.toFixed(4), rightJaw.position.z.toFixed(4));
      console.log('[BeardAttachmentEngine] - Face Width 3D:', faceWidth3D.toFixed(4));

      // Compute Base Scale: faceWidth3D / modelWidth3D (PURE MATH FROM LANDMARK DISTANCE)
      const baseScale = faceWidth3D / modelWidth3D;

      console.log('[BeardAttachmentEngine] 📐 BASE SCALE CALCULATION:');
      console.log('[BeardAttachmentEngine] - Face Width 3D (landmarks):', faceWidth3D.toFixed(4));
      console.log('[BeardAttachmentEngine] - Model Width 3D (bounding box):', modelWidth3D.toFixed(4));
      console.log('[BeardAttachmentEngine] - Base scale factor:', baseScale.toFixed(4));

      // ═══════════════════════════════════════════════════════════════════════════
      // PERSPECTIVE COMPENSATION: Use focal length formula for correct depth scaling
      // Formula: perspectiveScale = focalLength / faceZ
      // focalLength = (0.5 * screenHeight) / tan(FOV/2)
      // ═══════════════════════════════════════════════════════════════════════════

      let finalScale = baseScale;

      if (this.camera && this.camera.fov) {
        const fov = THREE.MathUtils.degToRad(this.camera.fov);

        // Get canvas dimensions for proper focal length calculation
        const renderer = this.camera.userData?.renderer;
        const canvasHeight = renderer ? renderer.domElement.height : 1080; // Default to 1080p
        const canvasWidth = renderer ? renderer.domElement.width : 1920;

        // Focal length formula: focalLength = (0.5 * height) / tan(FOV/2)
        const focalLength = (0.5 * canvasHeight) / Math.tan(fov / 2);

        // Use chin Z for depth estimation
        const faceZ = Math.abs(chin.position.z);

        // Avoid division by zero
        const safeFaceZ = faceZ > 0.001 ? faceZ : 0.001;

        // Perspective scale: objects further away appear smaller
        // Scale factor = focalLength / distance
        const perspectiveScale = focalLength / safeFaceZ;

        console.log('[BeardAttachmentEngine] 🔭 PERSPECTIVE COMPENSATION:');
        console.log('[BeardAttachmentEngine] - Camera FOV:', this.camera.fov.toFixed(2), 'degrees');
        console.log('[BeardAttachmentEngine] - FOV (radians):', fov.toFixed(4));
        console.log('[BeardAttachmentEngine] - Canvas dimensions:', canvasWidth, 'x', canvasHeight);
        console.log('[BeardAttachmentEngine] - Focal Length:', focalLength.toFixed(4));
        console.log('[BeardAttachmentEngine] - Face Z (chin):', faceZ.toFixed(4));
        console.log('[BeardAttachmentEngine] - Perspective scale:', perspectiveScale.toFixed(4));

        // Apply perspective compensation
        finalScale = baseScale * perspectiveScale;

        console.log('[BeardAttachmentEngine] - Final scale (with perspective):', finalScale.toFixed(4));
      } else {
        console.warn('[BeardAttachmentEngine] ⚠️ No camera available for perspective compensation, using base scale only');
      }

      transform.scale = {
        x: finalScale,
        y: finalScale,
        z: finalScale,
      };

      console.log('[BeardAttachmentEngine] ✅ FINAL SCALE APPLIED:', finalScale.toFixed(4));

      // ═══════════════════════════════════════════════════════════════════════════
      // DYNAMIC PIVOT CORRECTION: Align mesh bottom with chin anchor
      // The Group origin is at the geometric center, so we need to shift the mesh
      // so that its BOTTOM edge aligns with the chin landmark position.
      // ═══════════════════════════════════════════════════════════════════════════

      // Fine-tuning constant for manual Y adjustment
      // Adjust this value to shift the beard up/down without changing the math
      // Negative values shift DOWN, positive values shift UP
      const FINE_TUNE_Y = 0.5;

      // Z-offset to prevent z-fighting with face
      // Minimal offset to place beard slightly in front of chin surface
      const Z_OFFSET = 0.05;

      // Calculate the offset needed to align mesh bottom with anchor
      // In Three.js Y-up: if mesh is centered, bottom is at -height/2 in local space
      // To place bottom at chin position, we shift the mesh DOWN by height/2
      const yOffset = modelHeight3D * 0.5;

      console.log('[BeardAttachmentEngine] 📐 DYNAMIC PIVOT CORRECTION:');
      console.log('[BeardAttachmentEngine] - Model height:', modelHeight3D.toFixed(4));
      console.log('[BeardAttachmentEngine] - Y-offset (half height):', yOffset.toFixed(4));
      console.log('[BeardAttachmentEngine] - Fine-tune Y:', FINE_TUNE_Y.toFixed(4));
      console.log('[BeardAttachmentEngine] - Z-offset (minimal):', Z_OFFSET.toFixed(4));
      console.log('[BeardAttachmentEngine] - Original Y (chin anchor):', transform.position.y.toFixed(4));
      console.log('[BeardAttachmentEngine] - Original Z (chin anchor):', transform.position.z.toFixed(4));

      // Apply the offset to position the mesh bottom at the chin
      // Formula: adjustedY = chinAnchorY - (modelHeight * 0.5) + FINE_TUNE_Y
      // Since Three.js is Y-up, negative Y moves the mesh downward
      transform.position.y = transform.position.y - yOffset + FINE_TUNE_Y;

      // Apply minimal Z-offset to prevent z-fighting
      // Z position is already set to chin.anchor.z from the initial position assignment
      transform.position.z = chin.position.z + Z_OFFSET;

      console.log('[BeardAttachmentEngine] - Adjusted Y (bottom aligned + fine-tune):', transform.position.y.toFixed(4));
      console.log('[BeardAttachmentEngine] - Adjusted Z (chin anchor + offset):', transform.position.z.toFixed(4));

      // Console log for pure math verification
      console.log('[BeardAttachmentEngine] 🔍 FINAL SCALING MATH:');
      console.log('[BeardAttachmentEngine] - Face Width 3D (LM 234-454):', faceWidth3D.toFixed(4));
      console.log('[BeardAttachmentEngine] - Model Width (bounding box):', modelWidth3D.toFixed(4));
      console.log('[BeardAttachmentEngine] - Base scale:', baseScale.toFixed(4));
      console.log('[BeardAttachmentEngine] - Final scale:', finalScale.toFixed(4));

      return transform;
    } catch (error) {
      console.error('[BeardAttachmentEngine] ❌ ERROR in applyJawAdaptation:', error instanceof Error ? error.message : String(error));
      throw error; // Re-throw to prevent silent failures
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APPLY MOUTH ADAPTATION
  // ═══════════════════════════════════════════════════════════════════════════

  private applyMouthAdaptation(
    transform: BeardTransform,
    mouthOpen: number
  ): BeardTransform {
    // When mouth opens, move beard slightly down to prevent clipping
    const mouthOffset = mouthOpen * 0.02; // Small offset

    return {
      ...transform,
      position: {
        x: transform.position.x,
        y: transform.position.y + mouthOffset,
        z: transform.position.z,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APPLY EXPRESSION ADAPTATION
  // ═══════════════════════════════════════════════════════════════════════════

  private applyExpressionAdaptation(
    transform: BeardTransform,
    expression: 'neutral' | 'smile' | 'talking' | 'surprised'
  ): BeardTransform {
    switch (expression) {
      case 'smile':
        // Smile: slight upward movement
        return {
          ...transform,
          position: {
            x: transform.position.x,
            y: transform.position.y - 0.005,
            z: transform.position.z,
          },
        };
      case 'talking':
        // Talking: slight oscillation (handled in real-time)
        return transform;
      case 'surprised':
        // Surprised: more upward movement
        return {
          ...transform,
          position: {
            x: transform.position.x,
            y: transform.position.y - 0.01,
            z: transform.position.z,
          },
        };
      default:
        return transform;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APPLY DEPTH-AWARE POSITIONING
  // ═══════════════════════════════════════════════════════════════════════════

  private applyDepthAwarePositioning(
    transform: BeardTransform,
    anchorSystem: AnchorSystem
  ): BeardTransform {
    // Adjust z-position based on chin projection
    const chinAnchor = anchorSystem.anchors.find(a => a.id === 'chin_center');
    
    if (chinAnchor) {
      const depthOffset = chinAnchor.position.z * 0.5;
      
      return {
        ...transform,
        position: {
          x: transform.position.x,
          y: transform.position.y,
          z: transform.position.z + depthOffset,
        },
      };
    }

    return transform;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SMOOTH TRANSFORM
  // ═══════════════════════════════════════════════════════════════════════════

  private smoothTransform(transform: BeardTransform): BeardTransform {
    if (!this.previousTransform) {
      return transform;
    }

    const alpha = 0.3; // Smoothing factor

    return {
      position: {
        x: alpha * transform.position.x + (1 - alpha) * this.previousTransform.position.x,
        y: alpha * transform.position.y + (1 - alpha) * this.previousTransform.position.y,
        z: alpha * transform.position.z + (1 - alpha) * this.previousTransform.position.z,
      },
      rotation: {
        x: alpha * transform.rotation.x + (1 - alpha) * this.previousTransform.rotation.x,
        y: alpha * transform.rotation.y + (1 - alpha) * this.previousTransform.rotation.y,
        z: alpha * transform.rotation.z + (1 - alpha) * this.previousTransform.rotation.z,
      },
      scale: {
        x: alpha * transform.scale.x + (1 - alpha) * this.previousTransform.scale.x,
        y: alpha * transform.scale.y + (1 - alpha) * this.previousTransform.scale.y,
        z: alpha * transform.scale.z + (1 - alpha) * this.previousTransform.scale.z,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OCCLUSION HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  calculateOcclusion(landmarks: FaceLandmark[]): { lipOcclusion: number; cheekBlending: number } {
    if (!landmarks || landmarks.length === 0) {
      return { lipOcclusion: 0, cheekBlending: 0 };
    }

    // Calculate lip occlusion based on mouth landmarks
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];
    const mouthOpen = Math.abs(upperLip.y - lowerLip.y);

    const lipOcclusion = Math.min(1, mouthOpen * 5);

    // Calculate cheek blending based on cheek landmarks
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];
    const nose = landmarks[1];

    const leftDistance = Math.abs(leftCheek.x - nose.x);
    const rightDistance = Math.abs(rightCheek.x - nose.x);
    const avgDistance = (leftDistance + rightDistance) / 2;

    const cheekBlending = Math.min(1, avgDistance * 2);

    return { lipOcclusion, cheekBlending };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SKIN BLENDING CALCULATION
  // ═══════════════════════════════════════════════════════════════════════════

  calculateSkinBlending(imageData: ImageData, landmarks: FaceLandmark[]): number {
    if (!this.config.skinBlending || !imageData || !landmarks) {
      return 0.5; // Default blending
    }

    // Sample skin tone from cheek region
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];

    if (!leftCheek || !rightCheek) {
      return 0.5;
    }

    const { data, width, height } = imageData;
    const sampleX = Math.floor(((leftCheek.x + rightCheek.x) / 2) * width);
    const sampleY = Math.floor(((leftCheek.y + rightCheek.y) / 2) * height);

    const idx = (sampleY * width + sampleX) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    // Calculate skin tone (simplified)
    const brightness = (r + g + b) / 3;
    const skinTone = brightness / 255;

    // Adjust blending based on skin tone
    return Math.max(0.3, Math.min(0.7, skinTone));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GET DEFAULT TRANSFORM
  // ═══════════════════════════════════════════════════════════════════════════

  private getDefaultTransform(): BeardTransform {
    return {
      position: { x: 0.5, y: 0.6, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SET BASE SCALE
  // ═══════════════════════════════════════════════════════════════════════════

  setBaseScale(scale: number): void {
    this.baseScale = Math.max(0.5, Math.min(2.0, scale));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  getCurrentTransform(): BeardTransform | null {
    return this.currentTransform;
  }

  getConfig(): AttachmentConfig {
    return { ...this.config };
  }
}
