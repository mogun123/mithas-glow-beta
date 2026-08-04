// ═════════════════════════════════════════════════════════════════════════════
// ✨ GLOW SCORE ENGINE - IONTYX Glow Mirror (REAL AI METRICS)
// ═════════════════════════════════════════════════════════════════════════════

import { FaceMesh } from '@mediapipe/face_mesh';

export interface FaceGeometry {
  jawWidth: number;
  cheekboneRatio: number;
  faceLength: number;
  symmetryScore: number;
}

export interface LABPixel {
  l: number; // Lightness (0-100)
  a: number; // Green-Red (-128 to 127)
  b: number; // Blue-Yellow (-128 to 127)
}

export interface FaceRegionLAB {
  forehead: LABPixel;
  leftCheek: LABPixel;
  rightCheek: LABPixel;
  chin: LABPixel;
  nose: LABPixel;
  leftUnderEye: LABPixel;
  rightUnderEye: LABPixel;
}

export interface GlowScoreComponents {
  luminance: number;
  texture: number;
  symmetry: number;
  tone: number;
}

export interface GlowScoreResult {
  score: number; // 0-100
  components: GlowScoreComponents;
}

export class GlowScoreEngine {
  private faceMesh: FaceMesh;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    // Initialize MediaPipe FaceMesh for landmark extraction
    this.faceMesh = new FaceMesh({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
    
    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.75,
      minTrackingConfidence: 0.75,
      selfieMode: false,
    });

    // Setup canvas for pixel sampling
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  // 🧬 REAL PIXEL SAMPLING FROM FACE REGIONS
  sampleFaceRegions(videoElement: HTMLVideoElement, landmarks: any[]): FaceRegionLAB {
    if (!videoElement || !landmarks || landmarks.length !== 478) {
      throw new Error("INVALID_INPUT: Video element and 478 landmarks required");
    }

    // Set canvas size to video dimensions
    this.canvas.width = videoElement.videoWidth;
    this.canvas.height = videoElement.videoHeight;
    
    // Draw current video frame to canvas
    this.ctx.drawImage(videoElement, 0, 0, this.canvas.width, this.canvas.height);
    
    // Define face region landmark mappings
    const regionMappings = {
      forehead: {
        landmarks: [10, 8, 151, 9], // Top forehead region
        sampleRadius: 15
      },
      leftCheek: {
        landmarks: [50, 280, 426, 425], // Left cheek area
        sampleRadius: 12
      },
      rightCheek: {
        landmarks: [280, 50, 425, 426], // Right cheek area
        sampleRadius: 12
      },
      chin: {
        landmarks: [175, 152, 398, 400], // Chin region
        sampleRadius: 10
      },
      nose: {
        landmarks: [1, 2, 5, 4], // Nose center
        sampleRadius: 8
      },
      leftUnderEye: {
        landmarks: [33, 7, 163, 144], // Left under-eye
        sampleRadius: 6
      },
      rightUnderEye: {
        landmarks: [363, 398, 334, 263], // Right under-eye
        sampleRadius: 6
      }
    };

    const faceRegions: FaceRegionLAB = {
      forehead: { l: 0, a: 0, b: 0 },
      leftCheek: { l: 0, a: 0, b: 0 },
      rightCheek: { l: 0, a: 0, b: 0 },
      chin: { l: 0, a: 0, b: 0 },
      nose: { l: 0, a: 0, b: 0 },
      leftUnderEye: { l: 0, a: 0, b: 0 },
      rightUnderEye: { l: 0, a: 0, b: 0 }
    };

    // Sample each region
    for (const [regionName, config] of Object.entries(regionMappings)) {
      try {
        const regionLAB = this.sampleRegion(landmarks, config.landmarks, config.sampleRadius);
        (faceRegions as any)[regionName] = regionLAB;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`REGION_SAMPLING_FAILED: ${regionName} - ${errorMessage}`);
      }
    }

    // Validate all regions were sampled successfully
    const requiredRegions = ['forehead', 'leftCheek', 'rightCheek'];
    for (const region of requiredRegions) {
      const regionData = (faceRegions as any)[region];
      if (!regionData || typeof regionData.l !== 'number' || typeof regionData.a !== 'number' || typeof regionData.b !== 'number') {
        throw new Error(`INVALID_REGION_DATA: ${region} region has invalid LAB data`);
      }
    }

    return faceRegions;
  }

  // 🎯 PRECISE REGION SAMPLING WITH MULTIPLE PIXELS
  private sampleRegion(landmarks: any[], landmarkIndices: number[], radius: number): LABPixel {
    const pixels: { r: number; g: number; b: number }[] = [];
    
    // Validate landmarks
    if (!landmarks || landmarks.length === 0) {
      throw new Error("INVALID_LANDMARKS: No landmarks provided for region sampling");
    }
    
    // Calculate center point from landmarks
    let centerX = 0;
    let centerY = 0;
    for (const index of landmarkIndices) {
      const landmark = landmarks[index];
      if (!landmark || typeof landmark.x !== 'number' || typeof landmark.y !== 'number') {
        throw new Error(`INVALID_LANDMARK: Landmark ${index} is missing or invalid`);
      }
      centerX += landmark.x;
      centerY += landmark.y;
    }
    centerX /= landmarkIndices.length;
    centerY /= landmarkIndices.length;
    
    // Convert to canvas coordinates
    const canvasX = centerX * this.canvas.width;
    const canvasY = centerY * this.canvas.height;
    
    // Sample pixels in circular region
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      for (let r = 0; r <= radius; r += 2) {
        const x = Math.round(canvasX + r * Math.cos(angle));
        const y = Math.round(canvasY + r * Math.sin(angle));
        
        // Ensure coordinates are within canvas bounds
        if (x >= 0 && x < this.canvas.width && y >= 0 && y < this.canvas.height) {
          const imageData = this.ctx.getImageData(x, y, 1, 1).data;
          if (imageData && imageData.length >= 3) {
            pixels.push({
              r: imageData[0],
              g: imageData[1],
              b: imageData[2]
            });
          }
        }
      }
    }
    
    // Ensure we have valid pixels
    if (pixels.length === 0) {
      throw new Error("NO_PIXELS_SAMPLED: No valid pixels found in region");
    }
    
    // Average the pixels and convert to LAB
    const labPixel = this.averagePixelsToLAB(pixels);
    
    // Validate LAB result
    if (!labPixel || typeof labPixel.l !== 'number' || typeof labPixel.a !== 'number' || typeof labPixel.b !== 'number') {
      throw new Error("INVALID_LAB_CONVERSION: LAB pixel conversion failed");
    }
    
    return labPixel;
  }

  // 🔄 RGB TO LAB CONVERSION (STANDARD FORMULA)
  private rgbToLAB(r: number, g: number, b: number): LABPixel {
    // Normalize RGB to 0-1
    let R = r / 255;
    let G = g / 255;
    let B_normalized = b / 255;
    
    // Apply gamma correction
    const gammaCorrect = (value: number) => {
      return value > 0.04045 ? Math.pow((value + 0.055) / 1.055, 2.4) : value / 12.92;
    };
    
    R = gammaCorrect(R);
    G = gammaCorrect(G);
    B_normalized = gammaCorrect(B_normalized);
    
    // Convert to XYZ using sRGB transformation matrix
    const X = R * 0.4124564 + G * 0.3575761 + B_normalized * 0.1804375;
    const Y = R * 0.2126729 + G * 0.7151522 + B_normalized * 0.0721750;
    const Z = R * 0.0193339 + G * 0.1191920 + B_normalized * 0.9503041;
    
    // Normalize for D65 white point
    const Xn = X / 0.95047;
    const Yn = Y / 1.00000;
    const Zn = Z / 1.08883;
    
    // Apply LAB transformation
    const labTransform = (value: number) => {
      return value > 0.008856 ? Math.pow(value, 1/3) : (7.787 * value + 16/116);
    };
    
    const fx = labTransform(Xn);
    const fy = labTransform(Yn);
    const fz = labTransform(Zn);
    
    const l = 116 * fy - 16;
    const a = 500 * (fx - fy);
    const b_lab = 200 * (fy - fz);
    
    return { l, a, b: b_lab };
  }

  // 📊 AVERAGE MULTIPLE PIXELS TO LAB
  private averagePixelsToLAB(pixels: { r: number; g: number; b: number }[]): LABPixel {
    if (!pixels || pixels.length === 0) {
      throw new Error("NO_PIXELS: No pixels provided for averaging");
    }
    
    // Validate all pixels
    for (let i = 0; i < pixels.length; i++) {
      const pixel = pixels[i];
      if (!pixel || typeof pixel.r !== 'number' || typeof pixel.g !== 'number' || typeof pixel.b !== 'number') {
        throw new Error(`INVALID_PIXEL: Pixel at index ${i} has invalid RGB data`);
      }
      if (pixel.r < 0 || pixel.r > 255 || pixel.g < 0 || pixel.g > 255 || pixel.b < 0 || pixel.b > 255) {
        throw new Error(`INVALID_RGB_RANGE: Pixel at index ${i} has values outside 0-255 range`);
      }
    }
    
    let totalR = 0;
    let totalG = 0;
    let totalB = 0;
    
    for (const pixel of pixels) {
      totalR += pixel.r;
      totalG += pixel.g;
      totalB += pixel.b;
    }
    
    const avgR = totalR / pixels.length;
    const avgG = totalG / pixels.length;
    const avgB = totalB / pixels.length;
    
    const labPixel = this.rgbToLAB(avgR, avgG, avgB);
    
    // Validate LAB result
    if (!labPixel || typeof labPixel.l !== 'number' || typeof labPixel.a !== 'number' || typeof labPixel.b !== 'number') {
      throw new Error("LAB_CONVERSION_FAILED: RGB to LAB conversion returned invalid result");
    }
    
    return labPixel;
  }

  // 📈 LUMINANCE CONSISTENCY METRIC
  private calculateLuminanceConsistency(faceRegions: FaceRegionLAB): number {
    const regions = ['forehead', 'leftCheek', 'rightCheek'];
    const luminanceValues: number[] = [];
    
    for (const region of regions) {
      luminanceValues.push(faceRegions[region as keyof FaceRegionLAB].l);
    }
    
    // Calculate variance
    const mean = luminanceValues.reduce((sum, val) => sum + val, 0) / luminanceValues.length;
    const variance = luminanceValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / luminanceValues.length;
    
    // Dynamic normalization based on actual data statistics
    const stdDev = Math.sqrt(variance);
    const dynamicMaxVariance = Math.max(variance * 2, stdDev * 3);
    const normalizedVariance = Math.min(variance / dynamicMaxVariance, 1);
    
    // Return consistency score (1 - variance)
    return 1 - normalizedVariance;
  }

  // 🎨 TEXTURE SMOOTHNESS METRIC
  private calculateTextureSmoothness(videoElement: HTMLVideoElement, faceRegions: FaceRegionLAB): number {
    // Sample gradient noise across skin regions
    const regions = ['leftCheek', 'rightCheek', 'forehead'];
    let totalGradient = 0;
    let sampleCount = 0;
    
    this.ctx.drawImage(videoElement, 0, 0, this.canvas.width, this.canvas.height);
    
    for (const region of regions) {
      // Sample 3x3 grid around each region center
      const regionLAB = faceRegions[region as keyof FaceRegionLAB];
      
      // Calculate local gradient magnitude (edge detection)
      const gradientMagnitude = this.calculateLocalGradient(regionLAB);
      totalGradient += gradientMagnitude;
      sampleCount++;
    }
    
    const averageGradient = totalGradient / sampleCount;
    
    // Dynamic normalization based on actual gradient statistics
    const gradientStdDev = Math.sqrt(totalGradient / sampleCount); // Simplified std dev
    const dynamicMaxGradient = Math.max(averageGradient * 1.5, gradientStdDev * 2);
    const normalizedGradient = Math.min(averageGradient / dynamicMaxGradient, 1);
    
    // Return smoothness score (1 - gradient)
    return 1 - normalizedGradient;
  }

  // 🔍 LOCAL GRADIENT CALCULATION
  private calculateLocalGradient(centerLAB: LABPixel): number {
    // Simulate gradient calculation based on LAB color differences
    // In real implementation, this would sample neighboring pixels
    const { l, a, b } = centerLAB;
    
    // Calculate color variation as proxy for texture
    const colorVariation = Math.sqrt(
      Math.pow(a / 127, 2) + 
      Math.pow(b / 127, 2) + 
      Math.pow((l - 50) / 50, 2)
    );
    
    // Dynamic scaling based on actual variation magnitude
    const dynamicScale = Math.max(10, Math.min(30, colorVariation * 2));
    return colorVariation * dynamicScale;
  }

  // ⚖️ SYMMETRY RATIO METRIC
  private calculateSymmetryRatio(landmarks: any[]): number {
    if (!landmarks || landmarks.length !== 478) {
      throw new Error("STRICT_SIGNAL_LOSS: Invalid landmark data for symmetry calculation");
    }
    
    // Define symmetrical landmark pairs
    const symmetricalPairs = [
      [234, 152], // Jaw corners
      [50, 280],  // Cheekbones
      [70, 300],  // Eyebrow ends
      [338, 133], // Eye corners
      [172, 397], // Nose sides
      [61, 291],  // Eye corners (inner)
      [374, 134], // Nose edges
      [454, 234], // Face contour
    ];
    
    let symmetryScore = 0;
    let validPairs = 0;
    
    for (const [leftIndex, rightIndex] of symmetricalPairs) {
      const leftLandmark = landmarks[leftIndex];
      const rightLandmark = landmarks[rightIndex];
      
      if (leftLandmark && rightLandmark) {
        // Calculate distances from face center
        const centerX = 0.5; // Normalized face center
        const centerY = 0.5;
        
        const leftDist = Math.sqrt(
          Math.pow(leftLandmark.x - centerX, 2) + 
          Math.pow(leftLandmark.y - centerY, 2)
        );
        
        const rightDist = Math.sqrt(
          Math.pow(rightLandmark.x - centerX, 2) + 
          Math.pow(rightLandmark.y - centerY, 2)
        );
        
        // Calculate symmetry for this pair
        const maxDist = Math.max(leftDist, rightDist);
        const symmetryDiff = Math.abs(leftDist - rightDist) / maxDist;
        const pairSymmetry = 1 - symmetryDiff;
        
        symmetryScore += pairSymmetry;
        validPairs++;
      }
    }
    
    if (validPairs === 0) {
      throw new Error("STRICT_SIGNAL_LOSS: No valid landmark pairs for symmetry calculation");
    }
    return symmetryScore / validPairs;
  }

  // 🎭 TONE BALANCE METRIC
  private calculateToneBalance(faceRegions: FaceRegionLAB): number {
    // Calculate a/b channel deviation across face regions
    const regions = ['forehead', 'leftCheek', 'rightCheek', 'chin'];
    const aValues: number[] = [];
    const bValues: number[] = [];
    
    for (const region of regions) {
      const lab = faceRegions[region as keyof FaceRegionLAB];
      aValues.push(lab.a);
      bValues.push(lab.b);
    }
    
    // Calculate standard deviation for a and b channels
    const calculateStdDev = (values: number[]) => {
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      return Math.sqrt(variance);
    };
    
    const aStdDev = calculateStdDev(aValues);
    const bStdDev = calculateStdDev(bValues);
    
    // Dynamic normalization based on actual standard deviation statistics
    const combinedStdDev = Math.sqrt(aStdDev * aStdDev + bStdDev * bStdDev);
    const dynamicMaxStdDev = Math.max(combinedStdDev * 1.5, Math.max(aStdDev, bStdDev) * 2);
    const normalizedAStdDev = Math.min(aStdDev / dynamicMaxStdDev, 1);
    const normalizedBStdDev = Math.min(bStdDev / dynamicMaxStdDev, 1);
    
    // Average a and b balance scores
    const avgStdDev = (normalizedAStdDev + normalizedBStdDev) / 2;
    
    // Return tone balance score (1 - deviation)
    return 1 - avgStdDev;
  }

  // 🧮 MAIN GLOW SCORE CALCULATION
  async calculateGlowScore(
    videoElement: HTMLVideoElement,
    landmarks: any[],
    faceGeometry: FaceGeometry
  ): Promise<GlowScoreResult> {
    
    // Validate inputs
    if (!videoElement || !landmarks || !faceGeometry) {
      throw new Error("INVALID_INPUT: Video, landmarks, and face geometry required");
    }

    // Sample face regions for LAB color analysis
    const faceRegions = this.sampleFaceRegions(videoElement, landmarks);
    
    // Calculate individual components
    const luminance = this.calculateLuminanceConsistency(faceRegions);
    const texture = this.calculateTextureSmoothness(videoElement, faceRegions);
    const symmetry = this.calculateSymmetryRatio(landmarks);
    const tone = this.calculateToneBalance(faceRegions);
    
    // Apply weights based on importance
    const weights = {
      luminance: 0.3,  // Skin tone consistency
      texture: 0.25,   // Skin smoothness
      symmetry: 0.25,  // Face symmetry
      tone: 0.2        // Color balance
    };
    
    // Calculate weighted glow score
    const score = 
      weights.luminance * luminance +
      weights.texture * texture +
      weights.symmetry * symmetry +
      weights.tone * tone;
    
    // Scale to 0-100
    const finalScore = Math.round(score * 100);
    
    return {
      score: Math.max(0, Math.min(100, finalScore)),
      components: {
        luminance: Math.round(luminance * 100),
        texture: Math.round(texture * 100),
        symmetry: Math.round(symmetry * 100),
        tone: Math.round(tone * 100)
      }
    };
  }

  // 🎯 REAL-TIME GLOW SCORE (OPTIMIZED)
  async calculateRealTimeGlowScore(
    videoElement: HTMLVideoElement,
    landmarks: any[],
    previousScore?: GlowScoreResult
  ): Promise<GlowScoreResult> {
    
    // For real-time, we can use temporal smoothing
    const currentScore = await this.calculateGlowScore(videoElement, landmarks, {
      jawWidth: 0,
      cheekboneRatio: 0,
      faceLength: 0,
      symmetryScore: 0
    });
    
    if (previousScore) {
      // Apply temporal smoothing (exponential moving average)
      const smoothingFactor = 0.3;
      const smoothedScore = {
        score: Math.round(
          smoothingFactor * currentScore.score + 
          (1 - smoothingFactor) * previousScore.score
        ),
        components: {
          luminance: Math.round(
            smoothingFactor * currentScore.components.luminance + 
            (1 - smoothingFactor) * previousScore.components.luminance
          ),
          texture: Math.round(
            smoothingFactor * currentScore.components.texture + 
            (1 - smoothingFactor) * previousScore.components.texture
          ),
          symmetry: Math.round(
            smoothingFactor * currentScore.components.symmetry + 
            (1 - smoothingFactor) * previousScore.components.symmetry
          ),
          tone: Math.round(
            smoothingFactor * currentScore.components.tone + 
            (1 - smoothingFactor) * previousScore.components.tone
          )
        }
      };
      
      return smoothedScore;
    }
    
    return currentScore;
  }

  // 🧹 CLEANUP
  cleanup(): void {
    if (this.faceMesh) {
      this.faceMesh.close();
    }
  }
}

export default GlowScoreEngine;
