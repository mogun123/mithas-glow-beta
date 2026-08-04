// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - Face Validation Engine (Refactored)
// One-time validation - runs when VALIDATING_FACE state entered
// ═══════════════════════════════════════════════════════════════════════════

import { FaceLandmark, ValidationResult, ValidationMetrics } from '../types/engine.types';
import { EventBus } from '../core/EventBus';
import { AREvents, ValidationStartedEvent, ValidationSuccessEvent, ValidationFailedEvent, StabilizedLandmarksEvent, FaceLostEvent } from '../core/EventTypes';

export class FaceValidationEngine {
  private eventBus: EventBus;
  private metrics: ValidationMetrics;
  private thresholds: {
    lighting: { min: number; max: number };
    blur: { minVariance: number };
    distance: { minRatio: number; maxRatio: number };
    angle: { maxYaw: number; maxPitch: number };
    stability: { maxMovement: number };
  };
  private isRunning: boolean;
  private frameBuffer: ImageData[];
  private landmarkBuffer: FaceLandmark[][];
  private maxBufferSize: number;
  private validationTimeout: number | null;
  private lastFrameTimestamp: number;
  private stallDetectionTimeout: number | null;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.isRunning = false;
    this.frameBuffer = [];
    this.landmarkBuffer = [];
    this.maxBufferSize = 30;
    this.validationTimeout = null;
    this.lastFrameTimestamp = 0;
    this.stallDetectionTimeout = null;
    
    this.metrics = {
      lighting: { score: 0, brightness: 0, status: 'poor' },
      blur: { score: 0, variance: 0, status: 'blurry' },
      faceDistance: { score: 0, distance: 0, status: 'too_far' },
      faceVisibility: { score: 0, visible: false, status: 'hidden' },
      chinVisibility: { score: 0, visible: false },
      jawVisibility: { score: 0, visible: false },
      faceAngle: { score: 0, yaw: 0, pitch: 0, status: 'turned_left' },
      cameraStability: { score: 0, movement: 0, status: 'shaky' },
    };

    this.thresholds = {
      lighting: { min: 50, max: 200 },
      blur: { minVariance: 80 },
      distance: { minRatio: 0.3, maxRatio: 0.7 },
      angle: { maxYaw: 30, maxPitch: 20 },
      stability: { maxMovement: 0.05 },
    };

    this.setupEventListeners();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════

  private setupEventListeners(): void {
    // Listen for validation started
    this.eventBus.on<ValidationStartedEvent>(AREvents.VALIDATION_STARTED, () => {
      this.startValidation();
    });

    // Listen for stabilized landmarks to collect frames
    this.eventBus.on<StabilizedLandmarksEvent>(AREvents.STABILIZED_LANDMARKS, (data) => {
      if (this.isRunning) {
        this.collectFrame(data.stabilized);
      }
    });

    // Listen for face lost to cancel validation
    this.eventBus.on<FaceLostEvent>(AREvents.FACE_LOST, () => {
      this.cancelValidation();
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // START VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  private startValidation(): void {
    if (this.isRunning) {
      console.log('[FaceValidation] Already running, skipping');
      return;
    }

    console.log('[FaceValidation] ★ Starting validation...');
    this.isRunning = true;
    this.frameBuffer = [];
    this.landmarkBuffer = [];
    this.lastFrameTimestamp = performance.now();

    // Set timeout to complete validation after 1.5s
    this.validationTimeout = window.setTimeout(() => {
      console.log('[FaceValidation] ★ Validation timeout fired, calling completeValidation');
      this.completeValidation();
    }, 1500);

    // Set stall detection timeout - throws error if no frame received within 2 seconds
    this.stallDetectionTimeout = window.setTimeout(() => {
      const timeSinceLastFrame = performance.now() - this.lastFrameTimestamp;
      if (timeSinceLastFrame >= 2000) {
        console.error('[FaceValidation] ❌ STALL DETECTED: No frame received for 2+ seconds');
        throw new Error('[PIPELINE_STALL] Frame collection stalled. Re-render blocked.');
      }
    }, 2000);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COLLECT FRAME
  // ═══════════════════════════════════════════════════════════════════════════

  private collectFrame(stabilized: any): void {
    if (this.landmarkBuffer.length < this.maxBufferSize) {
      this.landmarkBuffer.push(stabilized.landmarks);
      this.lastFrameTimestamp = performance.now(); // Update last frame timestamp
      if (this.landmarkBuffer.length === 1 || this.landmarkBuffer.length % 10 === 0) {
        console.log(`[FaceValidation] ★ Collected landmark frame ${this.landmarkBuffer.length}/${this.maxBufferSize}`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COLLECT IMAGE DATA (called from external source with video frame)
  // ═══════════════════════════════════════════════════════════════════════════

  collectImageData(imageData: ImageData): void {
    if (!this.isRunning) {
      console.log('[FaceValidation] collectImageData called but isRunning=false');
      return;
    }
    if (this.frameBuffer.length < this.maxBufferSize) {
      this.frameBuffer.push(imageData);
      this.lastFrameTimestamp = performance.now(); // Update last frame timestamp
      if (this.frameBuffer.length === 1 || this.frameBuffer.length % 10 === 0) {
        console.log(`[FaceValidation] ★ Collected image frame ${this.frameBuffer.length}/${this.maxBufferSize}`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CANCEL VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  private cancelValidation(): void {
    if (!this.isRunning) return;

    console.log('[FaceValidation] Validation cancelled (face lost)');
    this.isRunning = false;

    if (this.validationTimeout !== null) {
      clearTimeout(this.validationTimeout);
      this.validationTimeout = null;
    }

    if (this.stallDetectionTimeout !== null) {
      clearTimeout(this.stallDetectionTimeout);
      this.stallDetectionTimeout = null;
    }

    this.frameBuffer = [];
    this.landmarkBuffer = [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLETE VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  private completeValidation(): void {
    if (!this.isRunning) {
      console.log('[FaceValidation] completeValidation called but isRunning=false');
      return;
    }

    console.log('[FaceValidation] ★ Completing validation after 1.5s collection...');
    console.log('[FaceValidation] ★ Frame buffer size:', this.frameBuffer.length, 'Landmark buffer size:', this.landmarkBuffer.length);
    this.isRunning = false;

    if (this.validationTimeout !== null) {
      clearTimeout(this.validationTimeout);
      this.validationTimeout = null;
    }

    if (this.stallDetectionTimeout !== null) {
      clearTimeout(this.stallDetectionTimeout);
      this.stallDetectionTimeout = null;
    }

    // Run validation on collected frames (use middle frame for stability)
    const frameIndex = Math.floor(this.frameBuffer.length / 2);
    const frame = this.frameBuffer.length > 0 ? this.frameBuffer[frameIndex] : null;
    const landmarks = this.landmarkBuffer.length > 0 ? this.landmarkBuffer[frameIndex] : [];
    const headRotation = { pitch: 0, yaw: 0, roll: 0 };

    console.log('[FaceValidation] ★ frame=', frame ? 'present' : 'null', 'landmarks=', landmarks.length);

    const result = frame ? this.validate(frame, landmarks, headRotation) : {
      isValid: false,
      overallScore: 0,
      metrics: this.metrics,
      issues: ['No frame data available'],
      guidance: 'Ensure camera is providing video frames',
    };

    const duration = 1500;

    if (result.isValid) {
      console.log('[FaceValidation] ★ Validation passed, emitting VALIDATION_SUCCESS');
      this.eventBus.emit<ValidationSuccessEvent>(AREvents.VALIDATION_SUCCESS, {
        result,
        timestamp: performance.now(),
        duration,
      });
    } else {
      console.log('[FaceValidation] ★ Validation failed, issues:', result.issues);
      this.eventBus.emit<ValidationFailedEvent>(AREvents.VALIDATION_FAILED, {
        result,
        timestamp: performance.now(),
        duration,
      });
    }

    this.frameBuffer = [];
    this.landmarkBuffer = [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATE ALL ASPECTS
  // ═══════════════════════════════════════════════════════════════════════════

  validate(
    imageData: ImageData,
    landmarks: FaceLandmark[],
    headRotation: { pitch: number; yaw: number; roll: number },
    previousLandmarks?: FaceLandmark[]
  ): ValidationResult {
    // STEP 6: BLUR DETECTION ONLY AFTER VALID FACE
    if (!landmarks || landmarks.length === 0) {
      return {
        isValid: false,
        overallScore: 0,
        metrics: {
          lighting: { score: 0, brightness: 0, status: 'poor' },
          blur: { score: 0, variance: 0, status: 'blurry' },
          faceDistance: { score: 0, distance: 0, status: 'too_far' },
          faceVisibility: { score: 0, visible: false, status: 'hidden' },
          chinVisibility: { score: 0, visible: false },
          jawVisibility: { score: 0, visible: false },
          faceAngle: { score: 0, yaw: 0, pitch: 0, status: 'turned_left' },
          cameraStability: { score: 0, movement: 0, status: 'shaky' },
        },
        issues: ['No face detected'],
        guidance: 'Position your face in the camera',
      };
    }

    // Validate lighting
    this.validateLighting(imageData);

    // Validate blur (only after valid face exists)
    this.validateBlur(imageData, landmarks);

    // Validate face distance
    this.validateFaceDistance(landmarks);

    // Validate face visibility
    this.validateFaceVisibility(landmarks);

    // Validate chin visibility
    this.validateChinVisibility(landmarks);

    // Validate jaw visibility
    this.validateJawVisibility(landmarks);

    // Validate face angle
    this.validateFaceAngle(headRotation);

    // Validate camera stability
    this.validateCameraStability(landmarks, previousLandmarks);

    // Calculate overall score
    const overallScore = this.calculateOverallScore();

    // Generate issues and guidance
    const issues = this.generateIssues();
    const guidance = this.generateGuidance();

    // STEP 5: Validation rules
    const hasFace = landmarks && landmarks.length > 400;
    const isBlurry = this.metrics.blur.status === 'blurry';
    const isValid = overallScore >= 0.7 && issues.length === 0;

    if (isValid) {
      console.log('[VALIDATION] PASSED - all checks passed');
    } else {
      console.log('[VALIDATION] FAILED - issues:', issues);
    }

    return {
      isValid,
      overallScore,
      metrics: { ...this.metrics },
      issues,
      guidance,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIGHTING VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  private validateLighting(imageData: ImageData): void {
    const { data, width, height } = imageData;
    let totalBrightness = 0;
    const pixelCount = width * height;

    // Sample center region for lighting analysis
    const sampleSize = Math.min(100, Math.floor(width / 4));
    const startX = Math.floor((width - sampleSize) / 2);
    const startY = Math.floor((height - sampleSize) / 2);

    for (let y = startY; y < startY + sampleSize; y++) {
      for (let x = startX; x < startX + sampleSize; x++) {
        const i = (y * width + x) * 4;
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        totalBrightness += brightness;
      }
    }

    const averageBrightness = totalBrightness / (sampleSize * sampleSize);
    this.metrics.lighting.brightness = averageBrightness;

    // Determine status
    if (averageBrightness < this.thresholds.lighting.min) {
      this.metrics.lighting.status = 'dark';
      this.metrics.lighting.score = 0.3;
    } else if (averageBrightness > this.thresholds.lighting.max) {
      this.metrics.lighting.status = 'bright';
      this.metrics.lighting.score = 0.5;
    } else {
      this.metrics.lighting.status = 'good';
      this.metrics.lighting.score = 1.0;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BLUR VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  private validateBlur(imageData: ImageData, landmarks: FaceLandmark[]): void {
    // STEP 3: Ensure blur detection only runs with valid landmarks (>400)
    if (!landmarks || landmarks.length < 400) {
      this.metrics.blur.variance = 0;
      this.metrics.blur.status = 'blurry';
      this.metrics.blur.score = 0;
      return;
    }

    const { data, width, height } = imageData;

    // STEP 2: Add face region cropping using landmarks bounding box
    // Calculate face bounding box from landmarks
    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    for (const lm of landmarks) {
      if (lm.x < minX) minX = lm.x;
      if (lm.x > maxX) maxX = lm.x;
      if (lm.y < minY) minY = lm.y;
      if (lm.y > maxY) maxY = lm.y;
    }

    // STEP 4: Clamp bounding box coordinates
    const padding = 0.1;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(1, maxX + padding);
    maxY = Math.min(1, maxY + padding);

    const boxX = Math.floor(minX * width);
    const boxY = Math.floor(minY * height);
    const boxWidth = Math.floor((maxX - minX) * width);
    const boxHeight = Math.floor((maxY - minY) * height);

    // Validate bounding box
    if (boxWidth <= 0 || boxHeight <= 0) {
      this.metrics.blur.variance = 0;
      this.metrics.blur.status = 'blurry';
      this.metrics.blur.score = 0;
      return;
    }

    // Crop face region
    const faceCropData = new Uint8ClampedArray(boxWidth * boxHeight * 4);
    for (let y = 0; y < boxHeight; y++) {
      for (let x = 0; x < boxWidth; x++) {
        const srcX = boxX + x;
        const srcY = boxY + y;
        const srcIdx = (srcY * width + srcX) * 4;
        const dstIdx = (y * boxWidth + x) * 4;

        if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
          faceCropData[dstIdx] = data[srcIdx];
          faceCropData[dstIdx + 1] = data[srcIdx + 1];
          faceCropData[dstIdx + 2] = data[srcIdx + 2];
          faceCropData[dstIdx + 3] = data[srcIdx + 3];
        }
      }
    }

    // STEP 3: Implement Laplacian variance on face crop only
    // Convert face crop to grayscale
    const grayscale = new Uint8Array(boxWidth * boxHeight);
    for (let i = 0; i < faceCropData.length; i += 4) {
      grayscale[i / 4] = (faceCropData[i] + faceCropData[i + 1] + faceCropData[i + 2]) / 3;
    }

    // Calculate Laplacian variance
    let sum = 0;
    let sumSquared = 0;
    const sampleSize = Math.min(50, Math.min(boxWidth, boxHeight));

    for (let y = 1; y < sampleSize - 1; y++) {
      for (let x = 1; x < sampleSize - 1; x++) {
        const idx = y * boxWidth + x;
        const laplacian =
          -4 * grayscale[idx] +
          grayscale[idx - 1] +
          grayscale[idx + 1] +
          grayscale[idx - boxWidth] +
          grayscale[idx + boxWidth];

        sum += laplacian;
        sumSquared += laplacian * laplacian;
      }
    }

    const count = (sampleSize - 2) * (sampleSize - 2);
    const mean = sum / count;
    const variance = (sumSquared / count) - (mean * mean);

    this.metrics.blur.variance = variance;

    // STEP 5: Validation rules - variance < threshold = blurry
    const BLUR_THRESHOLD = 80;
    const isBlurry = variance < BLUR_THRESHOLD;

    if (isBlurry) {
      this.metrics.blur.status = 'blurry';
      this.metrics.blur.score = 0.3;
    } else {
      this.metrics.blur.status = 'sharp';
      this.metrics.blur.score = 1.0;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FACE DISTANCE VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  private validateFaceDistance(landmarks: FaceLandmark[]): void {
    if (!landmarks || landmarks.length === 0) {
      this.metrics.faceDistance.score = 0;
      this.metrics.faceDistance.status = 'too_far';
      return;
    }

    // Calculate face width using cheek landmarks
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];
    const faceWidth = Math.abs(leftCheek.x - rightCheek.x);

    this.metrics.faceDistance.distance = faceWidth;

    if (faceWidth < this.thresholds.distance.minRatio) {
      this.metrics.faceDistance.status = 'too_far';
      this.metrics.faceDistance.score = 0.3;
    } else if (faceWidth > this.thresholds.distance.maxRatio) {
      this.metrics.faceDistance.status = 'too_close';
      this.metrics.faceDistance.score = 0.5;
    } else {
      this.metrics.faceDistance.status = 'optimal';
      this.metrics.faceDistance.score = 1.0;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FACE VISIBILITY VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  private validateFaceVisibility(landmarks: FaceLandmark[]): void {
    if (!landmarks || landmarks.length === 0) {
      this.metrics.faceVisibility.visible = false;
      this.metrics.faceVisibility.status = 'hidden';
      this.metrics.faceVisibility.score = 0;
      return;
    }

    // Check if key landmarks are visible
    const keyLandmarks = [10, 152, 234, 454]; // forehead, chin, left cheek, right cheek
    let visibleCount = 0;

    for (const idx of keyLandmarks) {
      if (landmarks[idx] && landmarks[idx].x >= 0 && landmarks[idx].x <= 1) {
        visibleCount++;
      }
    }

    const visibilityRatio = visibleCount / keyLandmarks.length;

    if (visibilityRatio < 0.5) {
      this.metrics.faceVisibility.visible = false;
      this.metrics.faceVisibility.status = 'hidden';
      this.metrics.faceVisibility.score = 0;
    } else if (visibilityRatio < 0.8) {
      this.metrics.faceVisibility.visible = true;
      this.metrics.faceVisibility.status = 'partial';
      this.metrics.faceVisibility.score = 0.5;
    } else {
      this.metrics.faceVisibility.visible = true;
      this.metrics.faceVisibility.status = 'visible';
      this.metrics.faceVisibility.score = 1.0;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHIN VISIBILITY VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  private validateChinVisibility(landmarks: FaceLandmark[]): void {
    if (!landmarks || landmarks.length === 0) {
      this.metrics.chinVisibility.visible = false;
      this.metrics.chinVisibility.score = 0;
      return;
    }

    const chin = landmarks[152];
    const isVisible = chin && chin.y > 0.5 && chin.y < 1;

    this.metrics.chinVisibility.visible = isVisible;
    this.metrics.chinVisibility.score = isVisible ? 1.0 : 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // JAW VISIBILITY VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  private validateJawVisibility(landmarks: FaceLandmark[]): void {
    if (!landmarks || landmarks.length === 0) {
      this.metrics.jawVisibility.visible = false;
      this.metrics.jawVisibility.score = 0;
      return;
    }

    const leftJaw = landmarks[234];
    const rightJaw = landmarks[454];
    const isVisible = leftJaw && rightJaw && leftJaw.x > 0 && rightJaw.x < 1;

    this.metrics.jawVisibility.visible = isVisible;
    this.metrics.jawVisibility.score = isVisible ? 1.0 : 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FACE ANGLE VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  private validateFaceAngle(headRotation: { pitch: number; yaw: number; roll: number }): void {
    const { pitch, yaw } = headRotation;
    this.metrics.faceAngle.yaw = yaw;
    this.metrics.faceAngle.pitch = pitch;

    const absYaw = Math.abs(yaw);
    const absPitch = Math.abs(pitch);

    if (absYaw > this.thresholds.angle.maxYaw) {
      this.metrics.faceAngle.status = yaw > 0 ? 'turned_right' : 'turned_left';
      this.metrics.faceAngle.score = 0.3;
    } else if (absPitch > this.thresholds.angle.maxPitch) {
      this.metrics.faceAngle.status = 'tilted';
      this.metrics.faceAngle.score = 0.5;
    } else {
      this.metrics.faceAngle.status = 'centered';
      this.metrics.faceAngle.score = 1.0;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMERA STABILITY VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  private validateCameraStability(
    landmarks: FaceLandmark[],
    previousLandmarks?: FaceLandmark[]
  ): void {
    if (!previousLandmarks || !landmarks || landmarks.length === 0) {
      this.metrics.cameraStability.score = 1.0;
      this.metrics.cameraStability.status = 'stable';
      this.metrics.cameraStability.movement = 0;
      return;
    }

    // Calculate average movement
    let totalMovement = 0;
    const sampleCount = Math.min(landmarks.length, 50);

    for (let i = 0; i < sampleCount; i++) {
      const dx = Math.abs(landmarks[i].x - previousLandmarks[i].x);
      const dy = Math.abs(landmarks[i].y - previousLandmarks[i].y);
      totalMovement += Math.sqrt(dx * dx + dy * dy);
    }

    const averageMovement = totalMovement / sampleCount;
    this.metrics.cameraStability.movement = averageMovement;

    if (averageMovement > this.thresholds.stability.maxMovement) {
      this.metrics.cameraStability.status = 'shaky';
      this.metrics.cameraStability.score = 0.4;
    } else {
      this.metrics.cameraStability.status = 'stable';
      this.metrics.cameraStability.score = 1.0;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE OVERALL SCORE
  // ═══════════════════════════════════════════════════════════════════════════

  private calculateOverallScore(): number {
    const weights = {
      lighting: 0.2,
      blur: 0.15,
      faceDistance: 0.15,
      faceVisibility: 0.15,
      chinVisibility: 0.1,
      jawVisibility: 0.1,
      faceAngle: 0.1,
      cameraStability: 0.05,
    };

    const score =
      this.metrics.lighting.score * weights.lighting +
      this.metrics.blur.score * weights.blur +
      this.metrics.faceDistance.score * weights.faceDistance +
      this.metrics.faceVisibility.score * weights.faceVisibility +
      this.metrics.chinVisibility.score * weights.chinVisibility +
      this.metrics.jawVisibility.score * weights.jawVisibility +
      this.metrics.faceAngle.score * weights.faceAngle +
      this.metrics.cameraStability.score * weights.cameraStability;

    return score;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE ISSUES
  // ═══════════════════════════════════════════════════════════════════════════

  private generateIssues(): string[] {
    const issues: string[] = [];

    if (this.metrics.lighting.status === 'dark') {
      issues.push('Lighting is too dark');
    } else if (this.metrics.lighting.status === 'bright') {
      issues.push('Lighting is too bright');
    }

    if (this.metrics.blur.status === 'blurry') {
      issues.push('Image is blurry');
    }

    if (this.metrics.faceDistance.status === 'too_far') {
      issues.push('Move closer to camera');
    } else if (this.metrics.faceDistance.status === 'too_close') {
      issues.push('Move back from camera');
    }

    if (this.metrics.faceVisibility.status === 'hidden') {
      issues.push('Face not visible');
    } else if (this.metrics.faceVisibility.status === 'partial') {
      issues.push('Face partially visible');
    }

    if (!this.metrics.chinVisibility.visible) {
      issues.push('Chin not visible');
    }

    if (!this.metrics.jawVisibility.visible) {
      issues.push('Jaw not visible');
    }

    if (this.metrics.faceAngle.status === 'turned_left') {
      issues.push('Turn face to center');
    } else if (this.metrics.faceAngle.status === 'turned_right') {
      issues.push('Turn face to center');
    } else if (this.metrics.faceAngle.status === 'tilted') {
      issues.push('Keep head level');
    }

    if (this.metrics.cameraStability.status === 'shaky') {
      issues.push('Hold camera steady');
    }

    return issues;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE GUIDANCE
  // ═══════════════════════════════════════════════════════════════════════════

  private generateGuidance(): string {
    const issues = this.generateIssues();

    if (issues.length === 0) {
      return 'Perfect! Your face is clearly visible.';
    }

    // Prioritize most critical issues
    const priorityIssues = issues.slice(0, 3);
    return `Please fix: ${priorityIssues.join(', ')}.`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  getMetrics(): ValidationMetrics {
    return { ...this.metrics };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPOSE
  // ═══════════════════════════════════════════════════════════════════════════

  dispose(): void {
    this.isRunning = false;
    this.frameBuffer = [];
    this.landmarkBuffer = [];

    if (this.validationTimeout !== null) {
      clearTimeout(this.validationTimeout);
      this.validationTimeout = null;
    }

    this.eventBus.off(AREvents.VALIDATION_STARTED);
    this.eventBus.off(AREvents.STABILIZED_LANDMARKS);
    this.eventBus.off(AREvents.FACE_LOST);

    console.log('[FaceValidationEngine] Disposed');
  }
}
