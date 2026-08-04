// 🎨 STABLE DIFFUSION SERVICE - HUGGING FACE INFERENCE API
// Free GPU-powered makeup generation using Hugging Face Inference API

export interface StableDiffusionRequest {
  type: 'generate' | 'inpaint' | 'refine';
  input: {
    image: string; // Base64 encoded frame
    mask?: string; // Base64 mask for inpainting
    prompt: string;
    negative_prompt?: string;
    strength?: number;
    guidance_scale?: number;
    steps?: number;
    model?: string;
  };
  metadata?: {
    sessionId: string;
    userId?: string;
    lookType: string;
  };
}

export interface StableDiffusionResponse {
  type: 'progress' | 'complete' | 'error';
  data: {
    progress?: number;
    image?: string; // Base64 encoded result
    error?: string;
  };
  metadata?: {
    processingTime: number;
    model: string;
  };
}

export interface HuggingFaceModel {
  id: string;
  name: string;
  type: 'text-to-image' | 'image-to-image' | 'inpainting';
  maxTokens?: number;
}

class StableDiffusionService {
  private hfToken: string;
  private baseUrl: string;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();
  
  // Available models on Hugging Face
  private readonly models: HuggingFaceModel[] = [
    {
      id: 'runwayml/stable-diffusion-v1-5',
      name: 'Stable Diffusion v1.5',
      type: 'text-to-image'
    },
    {
      id: 'stabilityai/stable-diffusion-2-1',
      name: 'Stable Diffusion 2.1',
      type: 'text-to-image'
    },
    {
      id: 'runwayml/stable-diffusion-inpainting',
      name: 'SD Inpainting',
      type: 'inpainting'
    },
    {
      id: 'stabilityai/stable-diffusion-xl-base-1.0',
      name: 'SDXL Base',
      type: 'text-to-image'
    }
  ];

  constructor() {
    this.hfToken = import.meta.env.VITE_HF_TOKEN || '';
    this.baseUrl = 'https://api-inference.huggingface.co/models';
    
    if (!this.hfToken) {
      console.warn('⚠️ VITE_HF_TOKEN not found. Using fallback mode.');
    }
  }

  // 🎨 Generate makeup look using Hugging Face
  async generateMakeupLook(
    base64Image: string,
    prompt: string,
    modelId: string = 'runwayml/stable-diffusion-v1-5'
  ): Promise<string> {
    try {
      this.emit('sdProgress', { progress: 10 });
      
      // Prepare request for image-to-image
      const requestBody = {
        inputs: {
          prompt: prompt,
          image: this.base64ToBytes(base64Image),
          negative_prompt: 'blurry, low quality, distorted, bad anatomy',
          strength: 0.8,
          guidance_scale: 7.5,
          num_inference_steps: 20
        }
      };

      this.emit('sdProgress', { progress: 30 });

      const response = await fetch(`${this.baseUrl}/${modelId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      this.emit('sdProgress', { progress: 70 });

      if (!response.ok) {
        throw new Error(`Hugging Face API error: ${response.status}`);
      }

      // Convert response to base64
      const blob = await response.blob();
      const base64Result = await this.blobToBase64(blob);

      this.emit('sdProgress', { progress: 90 });
      this.emit('sdComplete', { 
        image: base64Result,
        metadata: {
          processingTime: Date.now(),
          model: modelId
        }
      });

      return base64Result;

    } catch (error) {
      console.error('Hugging Face generation failed:', error);
      this.emit('sdError', { error: error.message });
      
      // Fallback to canvas inpainting
      return this.fallbackCanvasInpainting(base64Image, prompt);
    }
  }

  // 🎨 Inpainting using Hugging Face
  async inpaintMakeup(
    base64Image: string,
    mask: string,
    prompt: string,
    modelId: string = 'runwayml/stable-diffusion-inpainting'
  ): Promise<string> {
    try {
      this.emit('sdProgress', { progress: 10 });

      const requestBody = {
        inputs: {
          prompt: prompt,
          image: this.base64ToBytes(base64Image),
          mask_image: this.base64ToBytes(mask),
          negative_prompt: 'blurry, bad makeup, smudged',
          strength: 0.8,
          guidance_scale: 7.5,
          num_inference_steps: 20
        }
      };

      this.emit('sdProgress', { progress: 30 });

      const response = await fetch(`${this.baseUrl}/${modelId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      this.emit('sdProgress', { progress: 70 });

      if (!response.ok) {
        throw new Error(`Inpainting API error: ${response.status}`);
      }

      const blob = await response.blob();
      const base64Result = await this.blobToBase64(blob);

      this.emit('sdProgress', { progress: 90 });
      this.emit('sdComplete', { 
        image: base64Result,
        metadata: {
          processingTime: Date.now(),
          model: modelId
        }
      });

      return base64Result;

    } catch (error) {
      console.error('Inpainting failed:', error);
      this.emit('sdError', { error: error.message });
      
      // Fallback to canvas inpainting
      return this.fallbackCanvasInpainting(base64Image, prompt, mask);
    }
  }

  // 🔄 Fallback Canvas Inpainting (when HF API unavailable)
  private async fallbackCanvasInpainting(
    base64Image: string,
    prompt: string,
    mask?: string
  ): Promise<string> {
    console.log('🎨 Using fallback canvas inpainting...');
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw original image
        ctx?.drawImage(img, 0, 0);
        
        // Apply makeup effects based on prompt
        if (prompt.includes('lipstick')) {
          this.applyLipstickEffect(canvas, ctx!);
        }
        
        if (prompt.includes('eyeshadow')) {
          this.applyEyeshadowEffect(canvas, ctx!);
        }
        
        if (prompt.includes('blush')) {
          this.applyBlushEffect(canvas, ctx!);
        }
        
        // Convert to base64
        const result = canvas.toDataURL('image/jpeg', 0.9);
        resolve(result);
      };
      
      img.src = base64Image;
    });
  }

  // 💄 Apply lipstick effect using canvas
  private applyLipstickEffect(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    // Simple lipstick effect - would be enhanced with actual face detection
    const lipHeight = canvas.height * 0.1;
    const lipY = canvas.height * 0.75;
    
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#d63384'; // Pink/red lipstick color
    ctx.fillRect(canvas.width * 0.3, lipY, canvas.width * 0.4, lipHeight);
    ctx.globalAlpha = 1.0;
  }

  // 👁️ Apply eyeshadow effect using canvas
  private applyEyeshadowEffect(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    const eyeY = canvas.height * 0.4;
    const eyeHeight = canvas.height * 0.05;
    
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#8b5cf6'; // Purple eyeshadow
    
    // Left eye
    ctx.fillRect(canvas.width * 0.15, eyeY, canvas.width * 0.2, eyeHeight);
    
    // Right eye
    ctx.fillRect(canvas.width * 0.65, eyeY, canvas.width * 0.2, eyeHeight);
    
    ctx.globalAlpha = 1.0;
  }

  // 🌸 Apply blush effect using canvas
  private applyBlushEffect(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    const blushY = canvas.height * 0.55;
    const blushSize = canvas.width * 0.1;
    
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#f472b6'; // Pink blush
    
    // Left cheek
    ctx.beginPath();
    ctx.arc(canvas.width * 0.2, blushY, blushSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Right cheek
    ctx.beginPath();
    ctx.arc(canvas.width * 0.8, blushY, blushSize, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.globalAlpha = 1.0;
  }

  // 🔧 Utility functions
  private base64ToBytes(base64: string): Uint8Array {
    const binaryString = atob(base64.split(',')[1]);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // 📡 Event system
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

  // 🎯 Model management
  getAvailableModels(): HuggingFaceModel[] {
    return this.models;
  }

  isConfigured(): boolean {
    return !!this.hfToken;
  }

  // 🎨 Refine makeup look
  async refineMakeup(
    originalImage: string,
    currentResult: string,
    adjustments: {
      lipstickIntensity: number;
      eyeShadowIntensity: number;
      blushIntensity: number;
    }
  ): Promise<string> {
    const prompt = `refined professional makeup, ${adjustments.lipstickIntensity > 0.5 ? 'bold lipstick' : 'natural lipstick'}, ${adjustments.eyeShadowIntensity > 0.5 ? 'dramatic eyeshadow' : 'subtle eyeshadow'}, ${adjustments.blushIntensity > 0.5 ? 'rosy blush' : 'light blush'}, 8k, high detail`;
    
    return this.generateMakeupLook(currentResult, prompt);
  }
}

export const stableDiffusionService = new StableDiffusionService();
