// 🎯 UNITY AR FOUNDATION SERVICE - WEBGL BROWSER COMMUNICATION
// High-precision 3D mesh data capture using browser window object

export interface FaceMeshData {
  vertices: Float32Array;
  triangles: Uint32Array;
  uv: Float32Array;
  normals: Float32Array;
  landmarks: {
    position: [number, number, number];
    confidence: number;
  }[];
}

export interface SkinMetrics {
  hydration: number;
  oiliness: number;
  elasticity: number;
  temperature: number;
  ph: number;
  texture: {
    roughness: number;
    pores: number;
    blemishes: number;
  };
}

export interface UnityFaceData {
  timestamp: number;
  faceShape: 'oval' | 'round' | 'square' | 'heart' | 'diamond' | 'triangle';
  skinMetrics: SkinMetrics;
  meshData: FaceMeshData;
  confidence: number;
}

export interface UnityCommand {
  type: string;
  data?: any;
}

class UnityARService {
  private listeners: Map<string, ((data: any) => void)[]> = new Map();
  private isUnityLoaded: boolean = false;
  private unityInstance: any = null;
  private messageQueue: UnityCommand[] = [];
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeUnityBridge();
  }

  // 🌐 Initialize Unity WebGL bridge via browser window
  private initializeUnityBridge(): void {
    // Check if Unity WebGL is loaded
    if (typeof window !== 'undefined') {
      // Setup Unity event handlers
      window.addEventListener('unityLoaded', this.handleUnityLoaded.bind(this));
      window.addEventListener('unityMessage', this.handleUnityMessage.bind(this));
      
      // Start polling for Unity instance
      this.startUnityPolling();
      
      console.log('🎯 Unity AR bridge initialized via browser window');
    }
  }

  // 🔄 Poll for Unity instance
  private startUnityPolling(): void {
    this.pollingInterval = setInterval(() => {
      if (typeof window !== 'undefined' && (window as any).unityInstance) {
        this.unityInstance = (window as any).unityInstance;
        this.isUnityLoaded = true;
        
        // Process queued messages
        this.processMessageQueue();
        
        clearInterval(this.pollingInterval!);
        console.log('✅ Unity WebGL instance detected');
      }
    }, 100);
  }

  // 📡 Handle Unity loaded event
  private handleUnityLoaded(event: any): void {
    this.isUnityLoaded = true;
    this.unityInstance = event.detail.unityInstance;
    this.processMessageQueue();
    
    this.emit('unityConnected', { connected: true });
    console.log('✅ Unity WebGL loaded successfully');
  }

  // 📨 Handle messages from Unity
  private handleUnityMessage(event: any): void {
    const data = event.detail;
    this.processUnityMessage(data);
  }

  // 🎯 Process Unity messages
  private processUnityMessage(data: any): void {
    switch (data.type) {
      case 'faceData':
        this.emit('faceData', data.payload as UnityFaceData);
        break;
      case 'meshUpdate':
        this.emit('meshUpdate', data.payload as FaceMeshData);
        break;
      case 'trackingStatus':
        this.emit('trackingStatus', data.payload);
        break;
      case 'lipFittingApplied':
        this.emit('lipFittingApplied', data.payload);
        break;
      default:
        console.log('Unknown Unity message type:', data.type);
    }
  }

  // 📤 Send command to Unity
  private sendToUnity(command: UnityCommand): void {
    if (this.isUnityLoaded && this.unityInstance) {
      // Send via Unity's SendMessage
      if (this.unityInstance.SendMessage) {
        this.unityInstance.SendMessage('UnityARBridge', 'ProcessCommand', JSON.stringify(command));
      } else if (this.unityInstance.send) {
        // Alternative method for different Unity builds
        this.unityInstance.send(JSON.stringify(command));
      }
    } else {
      // Queue message for when Unity loads
      this.messageQueue.push(command);
    }
  }

  // 📋 Process queued messages
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isUnityLoaded) {
      const command = this.messageQueue.shift()!;
      this.sendToUnity(command);
    }
  }

  // 🎯 Unity Control Methods
  startFaceTracking(): void {
    this.sendToUnity({ type: 'startTracking' });
  }

  stopFaceTracking(): void {
    this.sendToUnity({ type: 'stopTracking' });
  }

  requestFaceMesh(): void {
    this.sendToUnity({ type: 'requestMesh' });
  }

  // 💄 Apply smart lip fitting
  applyLipFitting(landmarks: any[], confidence: number): void {
    this.sendToUnity({
      type: 'applyLipFitting',
      data: {
        landmarks: landmarks.slice(61, 292), // Lip boundary landmarks
        confidence: confidence,
        preciseMapping: true
      }
    });
  }

  // 🎨 Update makeup in Unity
  updateMakeup(type: string, intensity: number, look: any): void {
    this.sendToUnity({
      type: 'updateMakeup',
      data: {
        type,
        intensity,
        look
      }
    });
  }

  // 📡 Event System
  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // 🔌 Connection Management
  disconnect(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    this.isUnityLoaded = false;
    this.unityInstance = null;
    this.messageQueue = [];
    
    // Remove event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('unityLoaded', this.handleUnityLoaded.bind(this));
      window.removeEventListener('unityMessage', this.handleUnityMessage.bind(this));
    }
  }

  // 📊 Connection Status
  get isConnected(): boolean {
    return this.isUnityLoaded && !!this.unityInstance;
  }

  // 🎯 Check if Unity is ready
  get isReady(): boolean {
    return this.isConnected;
  }

  // 🔄 Manual Unity instance registration (for debugging)
  registerUnityInstance(instance: any): void {
    this.unityInstance = instance;
    this.isUnityLoaded = true;
    this.processMessageQueue();
    this.emit('unityConnected', { connected: true });
  }
}

export const unityARService = new UnityARService();
