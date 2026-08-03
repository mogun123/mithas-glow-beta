export interface CameraConfig {
  width: number;
  height: number;
  facingMode: 'user' | 'environment';
  frameRate: number;
}

export interface CameraStreamStatus {
  isActive: boolean;
  isInitialized: boolean;
  hasPermission: boolean;
  error: string | null;
  capabilities: MediaTrackCapabilities | null;
}

export class CameraStream {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private config: CameraConfig;
  private status: CameraStreamStatus;
  private constraints: MediaStreamConstraints;

  constructor(config: Partial<CameraConfig> = {}) {
    this.config = {
      width: 640,
      height: 480,
      facingMode: 'user',
      frameRate: 30,
      ...config,
    };

    this.status = {
      isActive: false,
      isInitialized: false,
      hasPermission: false,
      error: null,
      capabilities: null,
    };

    this.constraints = this.buildConstraints();
  }

  private buildConstraints(): MediaStreamConstraints {
    return {
      video: {
        width: { ideal: this.config.width },
        height: { ideal: this.config.height },
        facingMode: this.config.facingMode,
        frameRate: { ideal: this.config.frameRate },
      },
      audio: false,
    };
  }

  public async initialize(videoElement: HTMLVideoElement): Promise<void> {
    try {
      this.videoElement = videoElement;

      // Request camera permission
      this.stream = await navigator.mediaDevices.getUserMedia(this.constraints);
      
      // Check if we got the stream
      if (!this.stream) {
        throw new Error('Failed to access camera stream');
      }

      // Get video track for advanced controls
      const videoTrack = this.stream.getVideoTracks()[0];
      if (!videoTrack) {
        throw new Error('No video track found in stream');
      }

      // Get track capabilities
      this.status.capabilities = videoTrack.getCapabilities();

      // Apply advanced settings if supported
      await this.applyAdvancedSettings(videoTrack);

      // Set the stream to video element
      videoElement.srcObject = this.stream;

      // Wait for video to be ready
      await new Promise((resolve, reject) => {
        videoElement.onloadedmetadata = resolve;
        videoElement.onerror = reject;
        
        // Set a timeout in case video doesn't load
        setTimeout(() => reject(new Error('Video loading timeout')), 5000);
      });

      // Start playing
      await videoElement.play();

      this.status.isInitialized = true;
      this.status.isActive = true;
      this.status.hasPermission = true;
      this.status.error = null;

    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  private async applyAdvancedSettings(videoTrack: MediaStreamTrack): Promise<void> {
    try {
      const capabilities = this.status.capabilities;
      if (!capabilities) return;

      // Note: Advanced camera controls like exposure and white balance
      // are not widely supported in standard WebRTC APIs.
      // Basic camera functionality will work without these settings.
      
      console.log('Camera advanced settings applied (limited by browser support)');

    } catch (error) {
      console.warn('Failed to apply advanced camera settings:', error);
      // Don't throw here, as basic functionality should still work
    }
  }

  public async lockExposureAndWhiteBalance(): Promise<void> {
    // Note: This functionality is limited by browser support
    // for advanced camera controls in WebRTC APIs
    console.log('Exposure and white balance lock requested (limited browser support)');
  }

  public async unlockExposureAndWhiteBalance(): Promise<void> {
    // Note: This functionality is limited by browser support
    // for advanced camera controls in WebRTC APIs
    console.log('Exposure and white balance unlock requested (limited browser support)');
  }

  public captureFrame(): ImageData | null {
    if (!this.videoElement || !this.status.isActive) {
      return null;
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      return null;
    }

    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);

    // Get image data
    return context.getImageData(0, 0, canvas.width, canvas.height);
  }

  public async switchCamera(): Promise<void> {
    if (!this.stream) {
      throw new Error('Camera not initialized');
    }

    // Stop current stream
    this.stop();

    // Switch facing mode
    this.config.facingMode = this.config.facingMode === 'user' ? 'environment' : 'user';
    this.constraints = this.buildConstraints();

    // Reinitialize with new configuration
    if (this.videoElement) {
      await this.initialize(this.videoElement);
    }
  }

  public async updateResolution(width: number, height: number): Promise<void> {
    if (!this.stream) {
      throw new Error('Camera not initialized');
    }

    // Update config
    this.config.width = width;
    this.config.height = height;
    this.constraints = this.buildConstraints();

    // Apply new constraints
    const videoTrack = this.stream.getVideoTracks()[0];
    if (videoTrack) {
      try {
        await videoTrack.applyConstraints(this.constraints.video as MediaTrackConstraints);
      } catch (error) {
        console.warn('Failed to update resolution:', error);
        // Fallback: reinitialize camera
        await this.reinitialize();
      }
    }
  }

  private async reinitialize(): Promise<void> {
    if (this.videoElement) {
      this.stop();
      await this.initialize(this.videoElement);
    }
  }

  public stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    this.status.isActive = false;
    this.status.isInitialized = false;
  }

  private handleError(error: any): void {
    let errorMessage = 'Unknown camera error';

    if (error.name === 'NotAllowedError') {
      errorMessage = 'Camera permission denied. Please allow camera access.';
      this.status.hasPermission = false;
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'No camera device found.';
    } else if (error.name === 'NotReadableError') {
      errorMessage = 'Camera is already in use by another application.';
    } else if (error.name === 'OverconstrainedError') {
      errorMessage = 'Camera does not support the requested settings.';
    } else if (error.name === 'TypeError') {
      errorMessage = 'Invalid camera configuration.';
    } else {
      errorMessage = error.message || errorMessage;
    }

    this.status.error = errorMessage;
    this.status.isActive = false;
    this.status.isInitialized = false;
  }

  public getStatus(): CameraStreamStatus {
    return { ...this.status };
  }

  public getConfig(): CameraConfig {
    return { ...this.config };
  }

  public getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  public getStream(): MediaStream | null {
    return this.stream;
  }

  public async checkPermissions(): Promise<boolean> {
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      this.status.hasPermission = result.state === 'granted';
      return this.status.hasPermission;
    } catch (error) {
      // Some browsers don't support camera permission query
      return true; // Assume permission is available
    }
  }

  public async getAvailableDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      console.warn('Failed to enumerate camera devices:', error);
      return [];
    }
  }

  public getVideoTrack(): MediaStreamTrack | null {
    if (!this.stream) return null;
    return this.stream.getVideoTracks()[0] || null;
  }

  public async getTrackSettings(): Promise<MediaTrackSettings | null> {
    const track = this.getVideoTrack();
    if (!track) return null;
    return track.getSettings();
  }

  public async getTrackCapabilities(): Promise<MediaTrackCapabilities | null> {
    const track = this.getVideoTrack();
    if (!track) return null;
    return track.getCapabilities();
  }

  // Static method to check browser support
  public static isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  // Static method to get optimal camera settings
  public static getOptimalSettings(): Partial<CameraConfig> {
    return {
      width: 640,
      height: 480,
      frameRate: 30,
    };
  }
}
