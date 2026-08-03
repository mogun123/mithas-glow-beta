// Camera Engine - Handles camera initialization and stream management

export interface CameraConfig {
  facingMode: 'user' | 'environment';
  width: number;
  height: number;
}

export interface CameraEngineCallbacks {
  onStreamReady?: (stream: MediaStream) => void;
  onError?: (error: Error) => void;
}

export class CameraEngine {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private callbacks: CameraEngineCallbacks;

  constructor(callbacks: CameraEngineCallbacks = {}) {
    this.callbacks = callbacks;
  }

  async initializeCamera(videoElement: HTMLVideoElement, config: CameraConfig): Promise<MediaStream> {
    try {
      this.videoElement = videoElement;

      const constraints = {
        video: {
          facingMode: config.facingMode,
          width: { ideal: config.width },
          height: { ideal: config.height }
        },
        audio: false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Set video source and wait for metadata
      videoElement.srcObject = this.stream;
      
      return new Promise((resolve, reject) => {
        videoElement.onloadedmetadata = () => {
          videoElement.play().then(() => {
            this.callbacks.onStreamReady?.(this.stream!);
            resolve(this.stream!);
          }).catch(reject);
        };
        
        videoElement.onerror = () => {
          reject(new Error('Video loading failed'));
        };
      });

    } catch (error) {
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  async switchCamera(facingMode: 'user' | 'environment'): Promise<MediaStream> {
    if (!this.videoElement) {
      throw new Error('Camera not initialized');
    }

    // Stop current stream
    this.stop();

    // Re-initialize with new facing mode
    const config: CameraConfig = {
      facingMode,
      width: this.videoElement.videoWidth || 640,
      height: this.videoElement.videoHeight || 480
    };

    return this.initializeCamera(this.videoElement, config);
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  isActive(): boolean {
    return this.stream !== null && this.stream.active;
  }
}
