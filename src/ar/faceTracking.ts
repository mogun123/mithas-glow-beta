// ═══════════════════════════════════════════════════════════════════════════
// 🧔 FACE TRACKING ENGINE - MEDIAPIPE FACEMESH IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

import { FaceMesh } from '@mediapipe/face_mesh';

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface FaceGeometry {
  jawWidth: number;
  cheekboneRatio: number;
  symmetryScore: number;
}

export interface FaceTrackingResult {
  landmarks: Landmark[];
  geometry: FaceGeometry;
  isStable: boolean;
}

export class FaceTrackingEngine {
  private faceMesh: FaceMesh | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private isRunning = false;
  private lastLandmarks: Landmark[] = [];
  private stabilityFrames = 0;
  private onResultsCallback: ((result: FaceTrackingResult) => void) | null = null;

  constructor() {
    this.initializeFaceMesh();
  }

  private initializeFaceMesh(): void {
    this.faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
      selfieMode: true,
    });

    this.faceMesh.onResults(this.onResults.bind(this));
  }

  private onResults(results: any): void {
    if (!results.multiFaceLandmarks?.[0]) {
      this.lastLandmarks = [];
      this.stabilityFrames = 0;
      return;
    }

    const landmarks = results.multiFaceLandmarks[0].map((landmark: any) => ({
      x: landmark.x,
      y: landmark.y,
      z: landmark.z,
    }));

    // Calculate face geometry
    const geometry = this.calculateFaceGeometry(landmarks);

    // Check stability (require 5 consistent frames)
    const isStable = this.checkStability(landmarks);

    const result: FaceTrackingResult = {
      landmarks,
      geometry,
      isStable,
    };

    this.lastLandmarks = landmarks;
    this.onResultsCallback?.(result);
  }

  private calculateFaceGeometry(landmarks: Landmark[]): FaceGeometry {
    // Key landmark indices for MediaPipe FaceMesh
    const LEFT_JAW = 234;
    const RIGHT_JAW = 454;
    const LEFT_CHEEK = 50;
    const RIGHT_CHEEK = 280;
    const CHIN = 152;
    const FOREHEAD = 10;
    const NOSE = 1;

    // Calculate jaw width (normalized 0-1)
    const leftJaw = landmarks[LEFT_JAW];
    const rightJaw = landmarks[RIGHT_JAW];
    const jawWidth = Math.sqrt(
      Math.pow(rightJaw.x - leftJaw.x, 2) +
      Math.pow(rightJaw.y - leftJaw.y, 2) +
      Math.pow(rightJaw.z - leftJaw.z, 2)
    );

    // Calculate cheekbone ratio
    const leftCheek = landmarks[LEFT_CHEEK];
    const rightCheek = landmarks[RIGHT_CHEEK];
    const cheekboneWidth = Math.sqrt(
      Math.pow(rightCheek.x - leftCheek.x, 2) +
      Math.pow(rightCheek.y - leftCheek.y, 2) +
      Math.pow(rightCheek.z - leftCheek.z, 2)
    );
    const cheekboneRatio = cheekboneWidth / jawWidth;

    // Calculate symmetry score (0-1, higher is more symmetrical)
    const symmetryScore = this.calculateSymmetryScore(landmarks);

    return {
      jawWidth: Math.min(1, jawWidth * 2), // Normalize to 0-1
      cheekboneRatio: Math.min(1, cheekboneRatio),
      symmetryScore,
    };
  }

  private calculateSymmetryScore(landmarks: Landmark[]): number {
    // Compare left vs right landmark pairs
    const pairs = [
      [234, 454], // Jaw
      [50, 280],  // Cheeks
      [70, 300],  // Eyebrows
      [127, 356], // Eyes
      [236, 456], // Cheekbones
    ];

    let totalSymmetry = 0;
    let validPairs = 0;

    pairs.forEach(([leftIdx, rightIdx]) => {
      if (landmarks[leftIdx] && landmarks[rightIdx]) {
        const left = landmarks[leftIdx];
        const right = landmarks[rightIdx];
        
        // Mirror right side and compare with left
        const mirroredRightX = 1 - right.x;
        const distance = Math.sqrt(
          Math.pow(left.x - mirroredRightX, 2) +
          Math.pow(left.y - right.y, 2) +
          Math.pow(left.z - right.z, 2)
        );
        
        // Convert distance to symmetry score (closer = more symmetrical)
        const pairSymmetry = Math.max(0, 1 - distance * 3);
        totalSymmetry += pairSymmetry;
        validPairs++;
      }
    });

    return validPairs > 0 ? totalSymmetry / validPairs : 0;
  }

  private checkStability(currentLandmarks: Landmark[]): boolean {
    if (this.lastLandmarks.length === 0) {
      this.stabilityFrames = 1;
      return false;
    }

    // Calculate average landmark movement
    let totalMovement = 0;
    for (let i = 0; i < currentLandmarks.length; i++) {
      const current = currentLandmarks[i];
      const last = this.lastLandmarks[i];
      
      const movement = Math.sqrt(
        Math.pow(current.x - last.x, 2) +
        Math.pow(current.y - last.y, 2) +
        Math.pow(current.z - last.z, 2)
      );
      
      totalMovement += movement;
    }

    const averageMovement = totalMovement / currentLandmarks.length;
    const movementThreshold = 0.01; // 1% movement threshold

    if (averageMovement < movementThreshold) {
      this.stabilityFrames++;
    } else {
      this.stabilityFrames = 0;
    }

    return this.stabilityFrames >= 5; // Require 5 stable frames
  }

  public async startCamera(videoElement: HTMLVideoElement): Promise<void> {
    try {
      this.videoElement = videoElement;
      
      // Request camera access
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      // Attach stream to video element
      videoElement.srcObject = this.stream;
      
      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        videoElement.onloadedmetadata = () => {
          videoElement.play();
          resolve();
        };
      });

      this.isRunning = true;
      this.processFrames();
    } catch (error) {
      console.error('Failed to start camera:', error);
      throw new Error('CAMERA_ACCESS_DENIED');
    }
  }

  private processFrames(): void {
    if (!this.isRunning || !this.videoElement || !this.faceMesh) return;

    // Send frame to MediaPipe
    this.faceMesh.send({ image: this.videoElement });

    // Continue processing
    requestAnimationFrame(() => this.processFrames());
  }

  public setResultsCallback(callback: (result: FaceTrackingResult) => void): void {
    this.onResultsCallback = callback;
  }

  public stop(): void {
    this.isRunning = false;
    
    // Stop camera stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Clear video element
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }

    // Reset state
    this.lastLandmarks = [];
    this.stabilityFrames = 0;
    this.onResultsCallback = null;
  }

  public getLandmark(index: number): Landmark | null {
    return this.lastLandmarks[index] || null;
  }

  public getImportantLandmarks(): {
    chin: Landmark | null;
    leftJaw: Landmark | null;
    rightJaw: Landmark | null;
    nose: Landmark | null;
  } {
    return {
      chin: this.getLandmark(152),
      leftJaw: this.getLandmark(234),
      rightJaw: this.getLandmark(454),
      nose: this.getLandmark(1),
    };
  }
}
