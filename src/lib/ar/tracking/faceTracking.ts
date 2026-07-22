// Face Tracking - Handles MediaPipe FaceMesh integration and landmark detection

import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

export interface FaceLandmark {
  x: number;
  y: number;
  z: number;
}

export interface FaceTrackingCallbacks {
  onFaceDetected?: (landmarks: FaceLandmark[]) => void;
  onFaceLost?: () => void;
  onError?: (error: Error) => void;
}

export interface FaceTrackingConfig {
  maxNumFaces: number;
  refineLandmarks: boolean;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
  selfieMode: boolean;
}

export class FaceTracking {
  private faceMesh: FaceMesh | null = null;
  private camera: Camera | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private callbacks: FaceTrackingCallbacks;
  private isActive: boolean = false;
  private animationFrameId: number | null = null;

  constructor(callbacks: FaceTrackingCallbacks = {}) {
    this.callbacks = callbacks;
  }

  async initialize(
    videoElement: HTMLVideoElement, 
    canvasElement: HTMLCanvasElement,
    config: Partial<FaceTrackingConfig> = {}
  ): Promise<void> {
    try {
      this.videoElement = videoElement;
      this.canvasElement = canvasElement;

      // Default configuration
      const defaultConfig: FaceTrackingConfig = {
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
        selfieMode: false,
        ...config
      };

      // Initialize FaceMesh
      this.faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      // Set FaceMesh options
      this.faceMesh.setOptions({
        maxNumFaces: defaultConfig.maxNumFaces,
        refineLandmarks: defaultConfig.refineLandmarks,
        minDetectionConfidence: defaultConfig.minDetectionConfidence,
        minTrackingConfidence: defaultConfig.minTrackingConfidence,
        selfieMode: defaultConfig.selfieMode,
      });

      // Set up results handler
      this.faceMesh.onResults(this.onResults.bind(this));

    } catch (error) {
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  start(): void {
    if (!this.faceMesh || !this.videoElement || !this.canvasElement) {
      throw new Error('Face tracking not initialized');
    }

    try {
      this.isActive = true;

      // Initialize MediaPipe Camera
      this.camera = new Camera(this.videoElement, {
        onFrame: async () => {
          if (this.videoElement && 
              this.videoElement.readyState === 4 && 
              this.isActive &&
              this.faceMesh) {
            await this.faceMesh.send({ image: this.videoElement });
          }
        },
        width: 640,
        height: 480,
      });

      this.camera.start();
      
      // Start animation loop for canvas drawing
      this.startAnimationLoop();

    } catch (error) {
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  stop(): void {
    this.isActive = false;

    // Stop camera
    if (this.camera) {
      this.camera.stop();
      this.camera = null;
    }

    // Stop animation loop
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Close FaceMesh
    if (this.faceMesh) {
      this.faceMesh.close();
      this.faceMesh = null;
    }
  }

  private onResults(results: any): void {
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      this.callbacks.onFaceDetected?.(landmarks);
    } else {
      this.callbacks.onFaceLost?.();
    }
  }

  private startAnimationLoop(): void {
    if (!this.canvasElement || !this.videoElement) return;

    const canvas = this.canvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!this.isActive) return;

      // Set canvas dimensions to match video
      if (canvas.width !== this.videoElement!.videoWidth || 
          canvas.height !== this.videoElement!.videoHeight) {
        canvas.width = this.videoElement!.videoWidth;
        canvas.height = this.videoElement!.videoHeight;
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Request next frame
      this.animationFrameId = requestAnimationFrame(draw);
    };

    draw();
  }

  isTracking(): boolean {
    return this.isActive && this.camera !== null;
  }

  getFaceMesh(): FaceMesh | null {
    return this.faceMesh;
  }
}
