/**
 * 🎨 HuggingFace Stable Diffusion + ControlNet Integration
 * Virtual Try-on Pipeline with Face Landmarks Control
 */

import { NormalizedLandmarkList } from '@mediapipe/face_mesh';

export interface HuggingFaceControlNetRequest {
  prompt: string;
  controlnet_conditioning_image: string;
  num_inference_steps?: number;
  guidance_scale?: number;
  controlnet_conditioning_scale?: number;
  seed?: number;
}

export interface VirtualTryOnResult {
  success: boolean;
  image?: string;
  error?: string;
  processing_time?: number;
}

export class HuggingFaceStableDiffusionService {
  private hfToken: string;
  private modelEndpoint: string;
  private controlNetEndpoint: string;

  constructor() {
    this.hfToken = import.meta.env.VITE_HF_TOKEN;
    if (!this.hfToken) {
      throw new Error('HuggingFace token not found in environment variables');
    }

    // Stable Diffusion + ControlNet models
    this.modelEndpoint = 'https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5';
    this.controlNetEndpoint = 'https://api-inference.huggingface.co/models/lllyasviel/control_v11p_sd15_openpose';
  }

  /**
   * 🎯 Generate Virtual Try-on using ControlNet
   */
  async generateVirtualTryOn(
    prompt: string,
    faceLandmarks: NormalizedLandmarkList,
    sourceImage: string,
    makeupStyle: string = 'natural'
  ): Promise<VirtualTryOnResult> {
    const startTime = Date.now();

    try {
      console.log('🎨 Starting HuggingFace Stable Diffusion + ControlNet pipeline...');
      
      // Generate control image from face landmarks
      const controlImage = await this.generateControlImage(faceLandmarks, sourceImage);
      
      // Enhanced prompt with makeup style
      const enhancedPrompt = this.enhancePromptWithMakeup(prompt, makeupStyle);
      
      // Prepare ControlNet request
      const request: HuggingFaceControlNetRequest = {
        prompt: enhancedPrompt,
        controlnet_conditioning_image: controlImage,
        num_inference_steps: 25,
        guidance_scale: 7.5,
        controlnet_conditioning_scale: 0.8,
        seed: Math.floor(Math.random() * 1000000)
      };

      console.log('📤 Sending request to HuggingFace API...');
      
      // Call HuggingFace API
      const response = await fetch(this.controlNetEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: request,
          options: {
            wait_for_model: true,
            use_cache: false
          }
        })
      });

      const result = await response.json();
      const processingTime = Date.now() - startTime;

      console.log(`✅ Virtual try-on generated in ${processingTime}ms`);

      return {
        success: true,
        image: result[0]?.image || result.image,
        processing_time: processingTime
      };

    } catch (error) {
      console.error('❌ Virtual try-on generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processing_time: Date.now() - startTime
      };
    }
  }

  /**
   * 🎭 Generate Control Image from Face Landmarks
   */
  private async generateControlImage(
    faceLandmarks: NormalizedLandmarkList,
    sourceImage: string
  ): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      // Load source image
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw source image
        ctx.drawImage(img, 0, 0);

        // Draw face landmarks as control lines
        if (faceLandmarks && faceLandmarks.length > 0) {
          const landmarks = faceLandmarks;
          
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 3;

          // Draw face outline
          this.drawFaceOutline(ctx, landmarks);
          
          // Draw eye landmarks
          this.drawEyeLandmarks(ctx, landmarks);
          
          // Draw lip landmarks
          this.drawLipLandmarks(ctx, landmarks);
          
          // Draw eyebrow landmarks
          this.drawEyebrowLandmarks(ctx, landmarks);
        }

        // Convert to base64
        const controlImage = canvas.toDataURL('image/png');
        resolve(controlImage);
      };
      img.src = sourceImage;
    });
  }

  /**
   * 📐 Draw Face Outline
   */
  private drawFaceOutline(ctx: CanvasRenderingContext2D, landmarks: any[]) {
    if (!landmarks || landmarks.length < 468) return;

    // Face oval points (approximate)
    const faceOvalIndices = [
      10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 340, 346, 347, 348, 349, 350, 451, 452, 453, 464, 435, 410, 287, 273, 335, 406, 313, 18, 17, 18, 200, 199, 175, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
    ];

    ctx.beginPath();
    faceOvalIndices.forEach((index, i) => {
      if (index < landmarks.length) {
        const point = landmarks[index];
        const x = point.x * ctx.canvas.width;
        const y = point.y * ctx.canvas.height;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.closePath();
    ctx.stroke();
  }

  /**
   * 👁️ Draw Eye Landmarks
   */
  private drawEyeLandmarks(ctx: CanvasRenderingContext2D, landmarks: any[]) {
    if (!landmarks || landmarks.length < 468) return;

    // Left eye landmarks
    const leftEyeIndices = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
    
    // Right eye landmarks  
    const rightEyeIndices = [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382];

    // Draw left eye
    ctx.beginPath();
    leftEyeIndices.forEach((index, i) => {
      if (index < landmarks.length) {
        const point = landmarks[index];
        const x = point.x * ctx.canvas.width;
        const y = point.y * ctx.canvas.height;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.closePath();
    ctx.stroke();

    // Draw right eye
    ctx.beginPath();
    rightEyeIndices.forEach((index, i) => {
      if (index < landmarks.length) {
        const point = landmarks[index];
        const x = point.x * ctx.canvas.width;
        const y = point.y * ctx.canvas.height;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.closePath();
    ctx.stroke();
  }

  /**
   * 👄 Draw Lip Landmarks
   */
  private drawLipLandmarks(ctx: CanvasRenderingContext2D, landmarks: any[]) {
    if (!landmarks || landmarks.length < 468) return;

    // Outer lip landmarks
    const outerLipIndices = [61, 84, 17, 314, 405, 291, 375, 321, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308];

    // Inner lip landmarks
    const innerLipIndices = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318];

    // Draw outer lip
    ctx.beginPath();
    outerLipIndices.forEach((index, i) => {
      if (index < landmarks.length) {
        const point = landmarks[index];
        const x = point.x * ctx.canvas.width;
        const y = point.y * ctx.canvas.height;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.closePath();
    ctx.stroke();

    // Draw inner lip
    ctx.beginPath();
    innerLipIndices.forEach((index, i) => {
      if (index < landmarks.length) {
        const point = landmarks[index];
        const x = point.x * ctx.canvas.width;
        const y = point.y * ctx.canvas.height;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.closePath();
    ctx.stroke();
  }

  /**
   * ✏️ Draw Eyebrow Landmarks
   */
  private drawEyebrowLandmarks(ctx: CanvasRenderingContext2D, landmarks: any[]) {
    if (!landmarks || landmarks.length < 468) return;

    // Left eyebrow landmarks
    const leftEyebrowIndices = [46, 53, 52, 51, 48, 115, 131, 134, 102, 49, 220, 305];
    
    // Right eyebrow landmarks
    const rightEyebrowIndices = [276, 283, 282, 295, 285, 336, 296, 334, 293, 300, 276, 353];

    // Draw left eyebrow
    ctx.beginPath();
    leftEyebrowIndices.forEach((index, i) => {
      if (index < landmarks.length) {
        const point = landmarks[index];
        const x = point.x * ctx.canvas.width;
        const y = point.y * ctx.canvas.height;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.stroke();

    // Draw right eyebrow
    ctx.beginPath();
    rightEyebrowIndices.forEach((index, i) => {
      if (index < landmarks.length) {
        const point = landmarks[index];
        const x = point.x * ctx.canvas.width;
        const y = point.y * ctx.canvas.height;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.stroke();
  }

  /**
   * ✨ Enhance Prompt with Makeup Style
   */
  private enhancePromptWithMakeup(basePrompt: string, makeupStyle: string): string {
    const makeupEnhancements = {
      natural: "natural makeup, subtle foundation, light blush, soft lipstick, everyday look, realistic skin texture",
      glam: "glamorous makeup, bold lipstick, dramatic eyeshadow, contouring, highlighter, evening makeup, professional makeup artist",
      party: "party makeup, glitter, bold colors, dramatic eyeliner, vibrant lipstick, festival makeup, sparkly",
      bridal: "bridal makeup, soft romantic look, elegant lipstick, natural eyeshadow, wedding makeup, timeless beauty",
      professional: "professional makeup, business appropriate, subtle contour, neutral tones, office makeup, clean look"
    };

    const enhancement = makeupEnhancements[makeupStyle as keyof typeof makeupEnhancements] || makeupEnhancements.natural;
    
    return `${basePrompt}, ${enhancement}, high quality, detailed, realistic, 8k, professional photography, soft lighting`;
  }

  /**
   * 🔄 Batch Process Multiple Makeup Styles
   */
  async batchGenerateTryOn(
    basePrompt: string,
    faceLandmarks: NormalizedLandmarkList,
    sourceImage: string,
    styles: string[] = ['natural', 'glam', 'party']
  ): Promise<VirtualTryOnResult[]> {
    console.log(`🎨 Starting batch generation for ${styles.length} styles...`);
    
    const results = await Promise.allSettled(
      styles.map(style => 
        this.generateVirtualTryOn(basePrompt, faceLandmarks as any, sourceImage, style)
      )
    );

    return results.map(result => 
      result.status === 'fulfilled' ? result.value : {
        success: false,
        error: result.reason
      }
    );
  }
}

// Export singleton instance
export const huggingFaceService = new HuggingFaceStableDiffusionService();
