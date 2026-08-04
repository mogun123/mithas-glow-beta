// Makeup Engine - Handles makeup analysis, recommendation, and rendering

import { FaceLandmark } from '../tracking/faceTracking';

// Enhanced Makeup Looks Dataset from original ARTryOn
export const MAKEUP_LOOKS: MakeupLook[] = [
  // Women Office Looks
  {
    id: 'office-natural-1',
    name: 'Office Natural',
    description: 'Natural everyday look for office',
    occasion: 'natural',
    components: {
      foundation: '#F5DEB3',
      lipstick: '#E74C3C',
      blush: '#FFB6C1',
      eyeshadow: '#D4A574'
    },
    intensity: {
      foundation: 0.3,
      blush: 0.4,
      lipstick: 0.6,
      eyeshadow: 0.5
    },
    gender: 'women',
    isFree: true,
    blendMode: 'multiply',
    opacity: 0.3,
    compatibleSkinTones: ['Light', 'Medium', 'Wheatish'],
    suitableFaceShapes: ['Oval', 'Round', 'Heart']
  },
  {
    id: 'office-professional-1',
    name: 'Professional Chic',
    description: 'Professional makeup for work',
    occasion: 'professional',
    components: {
      foundation: '#F5DEB3',
      lipstick: '#8B4513',
      blush: '#FFB6C1',
      eyeshadow: '#8B7355',
      eyeliner: '#2C3E50'
    },
    intensity: {
      foundation: 0.35,
      blush: 0.4,
      lipstick: 0.6,
      eyeshadow: 0.5
    },
    gender: 'women',
    isFree: false,
    blendMode: 'multiply',
    opacity: 0.35,
    compatibleSkinTones: ['Medium', 'Wheatish', 'Deep'],
    suitableFaceShapes: ['Oval', 'Square', 'Diamond']
  },
  // Women Party Looks
  {
    id: 'party-glam-1',
    name: 'Party Glam',
    description: 'Bold evening style for parties',
    occasion: 'party',
    components: {
      foundation: '#F5DEB3',
      lipstick: '#DC143C',
      blush: '#FF69B4',
      eyeshadow: '#FFD700',
      eyeliner: '#000000'
    },
    intensity: {
      foundation: 0.4,
      blush: 0.5,
      lipstick: 0.8,
      eyeshadow: 0.7
    },
    gender: 'women',
    isFree: false,
    blendMode: 'multiply',
    opacity: 0.4,
    compatibleSkinTones: ['Light', 'Medium', 'Wheatish', 'Deep'],
    suitableFaceShapes: ['Oval', 'Round', 'Heart', 'Square']
  },
  // Women Bridal Looks
  {
    id: 'bridal-elegant-1',
    name: 'Bridal Elegant',
    description: 'Complete bridal makeup look',
    occasion: 'bridal',
    components: {
      foundation: '#F5DEB3',
      lipstick: '#E91E63',
      blush: '#FFB6C1',
      eyeshadow: '#DDA0DD',
      eyeliner: '#4B0082',
      contour: '#D2691E',
      highlighter: '#FFD700'
    },
    intensity: {
      foundation: 0.5,
      blush: 0.6,
      lipstick: 0.7,
      eyeshadow: 0.6
    },
    gender: 'women',
    isFree: false,
    blendMode: 'multiply',
    opacity: 0.5,
    compatibleSkinTones: ['Light', 'Medium', 'Wheatish'],
    suitableFaceShapes: ['Oval', 'Heart', 'Round']
  },
  // Men Looks
  {
    id: 'men-natural-1',
    name: 'Natural Grooming',
    description: 'Subtle grooming for men',
    occasion: 'natural',
    components: {
      foundation: '#F5DEB3',
      beard: '#8B4513'
    },
    intensity: {
      foundation: 0.2,
      blush: 0.3,
      lipstick: 0.4,
      eyeshadow: 0.3
    },
    gender: 'men',
    isFree: true,
    blendMode: 'multiply',
    opacity: 0.2,
    compatibleSkinTones: ['Light', 'Medium', 'Wheatish', 'Deep'],
    suitableFaceShapes: ['Oval', 'Square', 'Round']
  }
];

export interface MakeupComponents {
  foundation?: string;
  blush?: string;
  lipstick?: string;
  eyeshadow?: string;
  eyeliner?: string;
  eyebrows?: string;
  contour?: string;
  highlighter?: string;
  beard?: string;
  bronzer?: string;
}

export interface MakeupLook {
  id: string;
  name: string;
  description: string;
  occasion: 'natural' | 'party' | 'bridal' | 'professional';
  components: MakeupComponents;
  intensity: {
    foundation: number;
    blush: number;
    lipstick: number;
    eyeshadow: number;
  };
  gender: 'men' | 'women';
  isFree: boolean;
  blendMode: GlobalCompositeOperation;
  opacity: number;
  compatibleSkinTones?: string[];
  suitableFaceShapes?: string[];
}

export interface FacialAnalysis {
  skinTone: string;
  faceShape: string;
  skinConcerns: {
    acne: boolean;
    dryness: boolean;
    oiliness: boolean;
    pigmentation: boolean;
  };
  lightingQuality: number;
  confidence: number;
}

export interface SkinAnalysis {
  skinTone: string;
  faceShape: string;
  undertone: string;
  skinType: string;
  concerns: string[];
  textureScore: number;
  oilinessIndex: number;
  rednessIndex: number;
  pigmentation: {
    unevennessIndex: number;
    darkSpots: number[];
  };
  acne: {
    level: string;
    spotsDetected: number;
  };
  overallSkinHealthScore: number;
  engineConfidence: number;
}

export interface MakeupEngineCallbacks {
  onAnalysisComplete?: (analysis: FacialAnalysis) => void;
  onLookSelected?: (look: MakeupLook) => void;
  onMakeupApplied?: () => void;
  onError?: (error: Error) => void;
}

export class MakeupEngine {
  private canvas: HTMLCanvasElement | null = null;
  private callbacks: MakeupEngineCallbacks;
  private currentLook: MakeupLook | null = null;
  private isAnalyzing: boolean = false;

  constructor(callbacks: MakeupEngineCallbacks = {}) {
    this.callbacks = callbacks;
  }

  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
  }

  async analyzeSkin(
    videoElement: HTMLVideoElement,
    landmarks: FaceLandmark[]
  ): Promise<FacialAnalysis> {
    if (!this.canvas) {
      throw new Error('Makeup engine not initialized');
    }

    this.isAnalyzing = true;

    try {
      const ctx = this.canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Cannot get canvas context');
      }

      // Set canvas dimensions to video dimensions
      this.canvas.width = videoElement.videoWidth;
      this.canvas.height = videoElement.videoHeight;

      // Draw current video frame to canvas
      ctx.drawImage(videoElement, 0, 0, this.canvas.width, this.canvas.height);

      // Get image data for analysis
      const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

      // Perform facial analysis using original ARTryOn logic
      const analysis = await this.performFacialAnalysis(landmarks, videoElement);

      this.callbacks.onAnalysisComplete?.(analysis);
      return analysis;

    } catch (error) {
      this.callbacks.onError?.(error as Error);
      throw error;
    } finally {
      this.isAnalyzing = false;
    }
  }

  private async performFacialAnalysis(
    landmarks: FaceLandmark[],
    videoElement: HTMLVideoElement
  ): Promise<FacialAnalysis> {
    // Parallel analysis for performance (from original ARTryOn)
    const [skinTone, skinConcerns, faceShape, lightingQuality] = await Promise.all([
      Promise.resolve(this.detectSkinTone(landmarks, videoElement)),
      Promise.resolve(this.detectSkinConcerns(landmarks, videoElement)),
      Promise.resolve(this.detectFaceShape(landmarks)),
      Promise.resolve(this.assessLightingQuality(videoElement))
    ]);

    const analysis: FacialAnalysis = {
      skinTone,
      faceShape,
      skinConcerns,
      lightingQuality,
      confidence: 0.85 // Base confidence
    };

    return analysis;
  }

  private detectSkinTone(landmarks: FaceLandmark[], videoElement: HTMLVideoElement): string {
    // Extract pixels from face region using landmarks
    const facePixels = this.extractFacePixels(landmarks, videoElement);
    
    if (facePixels.length === 0) return 'Medium';
    
    // Calculate average brightness and redness
    let totalBrightness = 0;
    let totalRedness = 0;
    
    facePixels.forEach(pixel => {
      const brightness = (pixel.r + pixel.g + pixel.b) / 3;
      totalBrightness += brightness;
      totalRedness += pixel.r;
    });
    
    const avgBrightness = totalBrightness / facePixels.length;
    const avgRedness = totalRedness / facePixels.length;
    
    // Determine skin tone based on brightness and redness
    if (avgBrightness < 80) return 'Deep';
    if (avgBrightness < 120) return 'Medium-Deep';
    if (avgBrightness < 160) return 'Medium';
    if (avgRedness > avgBrightness * 0.8) return 'Wheatish';
    return 'Light';
  }

  private detectSkinConcerns(landmarks: FaceLandmark[], videoElement: HTMLVideoElement): {
    acne: boolean;
    dryness: boolean;
    oiliness: boolean;
    pigmentation: boolean;
  } {
    const facePixels = this.extractFacePixels(landmarks, videoElement);
    
    if (facePixels.length === 0) {
      return { acne: false, dryness: false, oiliness: false, pigmentation: false };
    }
    
    // Calculate metrics
    let redness = 0;
    let brightness = 0;
    const pixelBrightness: number[] = [];
    
    facePixels.forEach(pixel => {
      redness += pixel.r;
      const pixelBright = (pixel.r + pixel.g + pixel.b) / 3;
      brightness += pixelBright;
      pixelBrightness.push(pixelBright);
    });
    
    redness /= facePixels.length;
    brightness /= facePixels.length;
    
    // Calculate texture variance
    const avgBrightness = brightness;
    let textureVariance = 0;
    pixelBrightness.forEach(pixelBright => {
      textureVariance += Math.pow(pixelBright - avgBrightness, 2);
    });
    textureVariance /= pixelBrightness.length;
    
    // Detect concerns based on analysis (from original ARTryOn)
    return {
      acne: redness > 150,
      dryness: brightness < 80,
      oiliness: brightness > 180,
      pigmentation: textureVariance > 50
    };
  }

  private detectFaceShape(landmarks: FaceLandmark[]): string {
    // Simple face shape detection based on landmark ratios
    // This is a simplified version - can be enhanced with more sophisticated analysis
    return 'oval'; // Default for now
  }

  private assessLightingQuality(videoElement: HTMLVideoElement): number {
    if (!this.canvas) return 0.5;
    
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return 0.5;
    
    // Sample center region for lighting assessment
    const sampleSize = 100;
    const x = (this.canvas.width - sampleSize) / 2;
    const y = (this.canvas.height - sampleSize) / 2;
    
    try {
      const imageData = ctx.getImageData(x, y, sampleSize, sampleSize);
      const data = imageData.data;
      
      let totalBrightness = 0;
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        totalBrightness += brightness;
      }
      
      const avgBrightness = totalBrightness / (data.length / 4);
      
      // Normalize to 0-1 scale (ideal brightness is around 128)
      const quality = Math.max(0, Math.min(1, 1 - Math.abs(avgBrightness - 128) / 128));
      return quality;
    } catch (error) {
      return 0.5;
    }
  }

  private extractFacePixels(landmarks: FaceLandmark[], videoElement: HTMLVideoElement): Array<{r: number, g: number, b: number}> {
    if (!this.canvas) return [];
    
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return [];
    
    // Extract pixels from face region using landmarks
    const facePixels: Array<{r: number, g: number, b: number}> = [];
    
    // Simple face region extraction using bounding box of landmarks
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    landmarks.forEach(landmark => {
      minX = Math.min(minX, landmark.x);
      maxX = Math.max(maxX, landmark.x);
      minY = Math.min(minY, landmark.y);
      maxY = Math.max(maxY, landmark.y);
    });
    
    // Sample pixels from face region
    const sampleWidth = Math.floor((maxX - minX) * this.canvas.width);
    const sampleHeight = Math.floor((maxY - minY) * this.canvas.height);
    const sampleX = Math.floor(minX * this.canvas.width);
    const sampleY = Math.floor(minY * this.canvas.height);
    
    if (sampleWidth > 0 && sampleHeight > 0) {
      try {
        const imageData = ctx.getImageData(sampleX, sampleY, sampleWidth, sampleHeight);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          facePixels.push({
            r: data[i],
            g: data[i + 1],
            b: data[i + 2]
          });
        }
      } catch (error) {
        // Update DEBUG_AI with error
        if (typeof window !== 'undefined' && window.DEBUG_AI) {
          (window.DEBUG_AI as any).facePixelExtractionError = error instanceof Error ? error.message : 'Unknown error';
        }
      }
    }
    
    return facePixels;
  }

  generateSmartRecommendations(
    analysis: FacialAnalysis, 
    gender: 'men' | 'women', 
    occasion: 'office' | 'party' | 'bridal' | 'professional'
  ): MakeupLook[] {
    // Generate smart recommendations
    
    const filtered = MAKEUP_LOOKS.filter(look => {
      // Filter by gender and occasion
      if (look.gender !== gender || look.occasion !== occasion) return false;
      
      // Check skin tone compatibility
      if (look.compatibleSkinTones && !look.compatibleSkinTones.includes(analysis.skinTone)) {
        return false;
      }
      
      // Check face shape suitability
      if (look.suitableFaceShapes && !look.suitableFaceShapes.includes(analysis.faceShape)) {
        return false;
      }
      
      return true;
    });
    
    // Sort by compatibility score
    const scored = filtered.map(look => {
      let score = 0;
      
      // Skin tone match
      if (look.compatibleSkinTones?.includes(analysis.skinTone)) score += 3;
      
      // Face shape match
      if (look.suitableFaceShapes?.includes(analysis.faceShape)) score += 2;
      
      // Free looks get bonus
      if (look.isFree) score += 1;
      
      return { look, score };
    });
    
    scored.sort((a, b) => b.score - a.score);
    
    const recommendations = scored.slice(0, 3).map(item => item.look);
    
    return recommendations;
  }

  selectBestMakeupLook(
    mode: string,
    analysis: FacialAnalysis,
    gender: 'men' | 'women',
    occasion: 'office' | 'party' | 'bridal' | 'professional'
  ): MakeupLook {
    // Generate smart recommendations
    const recommendations = this.generateSmartRecommendations(analysis, gender, occasion);
    
    // Return the best recommendation
    return recommendations.length > 0 ? recommendations[0] : MAKEUP_LOOKS[0];
  }

  async applyMakeup(
    look: MakeupLook,
    videoElement: HTMLVideoElement,
    landmarks: FaceLandmark[],
    overlayCanvas: HTMLCanvasElement,
    cameraType: 'user' | 'environment' = 'user'
  ): Promise<void> {
    if (!overlayCanvas) {
      throw new Error('Overlay canvas not provided');
    }

    try {
      const ctx = overlayCanvas.getContext('2d');
      if (!ctx) {
        throw new Error('Cannot get overlay canvas context');
      }

      // Dynamic canvas sizing
      const videoRect = videoElement.getBoundingClientRect();
      overlayCanvas.width = videoRect.width;
      overlayCanvas.height = videoRect.height;

      // Clear and draw video frame
      ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      ctx.drawImage(videoElement, 0, 0, overlayCanvas.width, overlayCanvas.height);

      // Set blending mode for realistic makeup
      ctx.globalCompositeOperation = look.blendMode;
      ctx.globalAlpha = look.opacity;

      // Apply makeup components using original ARTryOn logic
      if (look.components.foundation) {
        ctx.fillStyle = look.components.foundation;
        this.drawFaceRegion(ctx, landmarks, 'foundation', overlayCanvas.width, overlayCanvas.height, cameraType);
      }

      if (look.components.lipstick) {
        ctx.fillStyle = look.components.lipstick;
        this.drawFaceRegion(ctx, landmarks, 'lips', overlayCanvas.width, overlayCanvas.height, cameraType);
      }

      if (look.components.blush) {
        ctx.fillStyle = look.components.blush;
        this.drawFaceRegion(ctx, landmarks, 'blush', overlayCanvas.width, overlayCanvas.height, cameraType);
      }

      if (look.components.eyeshadow) {
        ctx.fillStyle = look.components.eyeshadow;
        this.drawFaceRegion(ctx, landmarks, 'eyeshadow', overlayCanvas.width, overlayCanvas.height, cameraType);
      }

      if (look.components.eyeliner) {
        ctx.strokeStyle = look.components.eyeliner;
        ctx.lineWidth = 2;
        this.drawFaceRegion(ctx, landmarks, 'eyeliner', overlayCanvas.width, overlayCanvas.height, cameraType);
      }

      if (look.components.bronzer) {
        ctx.fillStyle = look.components.bronzer;
        this.drawFaceRegion(ctx, landmarks, 'bronzer', overlayCanvas.width, overlayCanvas.height, cameraType);
      }

      if (look.components.beard) {
        ctx.fillStyle = look.components.beard;
        this.drawFaceRegion(ctx, landmarks, 'beard', overlayCanvas.width, overlayCanvas.height, cameraType);
      }

      // Reset blending
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;

      this.currentLook = look;
      this.callbacks.onMakeupApplied?.();

    } catch (error) {
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  private drawFaceRegion(
    ctx: CanvasRenderingContext2D, 
    landmarks: FaceLandmark[], 
    region: string, 
    canvasWidth: number, 
    canvasHeight: number,
    cameraType: 'user' | 'environment' = 'user'
  ): void {
    // Coordinate mapping based on camera type (from original ARTryOn)
    const mapX = (x: number) => {
      // Front camera (user) needs mirroring for selfie effect
      // Back camera (environment) doesn't need mirroring
      return cameraType === 'user' ? (1 - x) * canvasWidth : x * canvasWidth;
    };
    
    const mapY = (y: number) => y * canvasHeight;

    switch (region) {
      case 'foundation':
        // Full face oval
        const faceOval = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323];
        ctx.beginPath();
        faceOval.forEach((pointIndex, i) => {
          const point = landmarks[pointIndex];
          if (point) {
            const x = mapX(point.x);
            const y = mapY(point.y);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
        ctx.fill();
        break;

      case 'lips':
        // Lip landmarks
        const lipPoints = [61, 84, 17, 314, 405, 291, 375, 321, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308];
        ctx.beginPath();
        lipPoints.forEach((pointIndex, i) => {
          const point = landmarks[pointIndex];
          if (point) {
            const x = mapX(point.x);
            const y = mapY(point.y);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
        ctx.fill();
        break;

      case 'blush':
        // Left cheek
        const leftCheek = [234, 127, 162, 21, 54, 103, 67, 109, 10];
        ctx.beginPath();
        leftCheek.forEach((pointIndex, i) => {
          const point = landmarks[pointIndex];
          if (point) {
            const x = mapX(point.x);
            const y = mapY(point.y);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
        ctx.fill();

        // Right cheek
        const rightCheek = [454, 323, 361, 340, 346, 347, 348, 349, 350];
        ctx.beginPath();
        rightCheek.forEach((pointIndex, i) => {
          const point = landmarks[pointIndex];
          if (point) {
            const x = mapX(point.x);
            const y = mapY(point.y);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
        ctx.fill();
        break;

      case 'eyeshadow':
        // Left eye
        const leftEye = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
        ctx.beginPath();
        leftEye.forEach((pointIndex, i) => {
          const point = landmarks[pointIndex];
          if (point) {
            const x = mapX(point.x);
            const y = mapY(point.y);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
        ctx.fill();

        // Right eye
        const rightEye = [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382];
        ctx.beginPath();
        rightEye.forEach((pointIndex, i) => {
          const point = landmarks[pointIndex];
          if (point) {
            const x = mapX(point.x);
            const y = mapY(point.y);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
        ctx.fill();
        break;

      case 'eyeliner':
        // Left eye outline
        const leftEyeOutline = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173];
        ctx.beginPath();
        leftEyeOutline.forEach((pointIndex, i) => {
          const point = landmarks[pointIndex];
          if (point) {
            const x = mapX(point.x);
            const y = mapY(point.y);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
        ctx.stroke();

        // Right eye outline
        const rightEyeOutline = [362, 398, 384, 385, 386, 387, 388, 466, 263, 249];
        ctx.beginPath();
        rightEyeOutline.forEach((pointIndex, i) => {
          const point = landmarks[pointIndex];
          if (point) {
            const x = mapX(point.x);
            const y = mapY(point.y);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
        break;

      case 'bronzer':
        // Contour areas
        const contourAreas = [234, 127, 162, 21, 54, 103, 67, 109, 10, 338, 297, 332, 284, 251];
        ctx.beginPath();
        contourAreas.forEach((pointIndex, i) => {
          const point = landmarks[pointIndex];
          if (point) {
            const x = mapX(point.x);
            const y = mapY(point.y);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
        ctx.fill();
        break;

      case 'beard':
        // Beard area for men
        const beardArea = [172, 211, 215, 216, 209, 175, 148, 152, 176, 149, 150, 136, 172, 211];
        ctx.beginPath();
        beardArea.forEach((pointIndex, i) => {
          const point = landmarks[pointIndex];
          if (point) {
            const x = mapX(point.x);
            const y = mapY(point.y);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
        ctx.fill();
        break;
    }
  }

  getCurrentLook(): MakeupLook | null {
    return this.currentLook;
  }

  isCurrentlyAnalyzing(): boolean {
    return this.isAnalyzing;
  }

  clearMakeup(overlayCanvas: HTMLCanvasElement): void {
    const ctx = overlayCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }
    this.currentLook = null;
  }
}
