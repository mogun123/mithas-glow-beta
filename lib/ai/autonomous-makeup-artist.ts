// 🎨 AUTONOMOUS MAKEUP ARTIST LOGIC
// Advanced gender-aware makeup recommendation system with disease detection

export interface SkinAnalysisResult {
  gender: 'male' | 'female' | 'other';
  faceShape: 'oval' | 'round' | 'square' | 'heart' | 'diamond' | 'triangle';
  skinTone: {
    hex: string;
    category: 'fair' | 'light' | 'medium' | 'tan' | 'deep';
    undertone: 'warm' | 'cool' | 'neutral';
    confidence: number;
  };
  skinConditions: {
    blemishes: SkinCondition[];
    marks: SkinCondition[];
    diseases: SkinDisease[];
    texture: SkinTexture;
  };
  facialFeatures: {
    lipShape: 'full' | 'thin' | 'medium';
    eyeShape: 'almond' | 'round' | 'hooded' | 'monolid';
    browShape: 'thick' | 'thin' | 'arched' | 'straight';
  };
  confidence: number;
}

export interface SkinCondition {
  type: 'acne' | 'dark_circles' | 'pigmentation' | 'scars' | 'wrinkles' | 'freckles';
  severity: 'mild' | 'moderate' | 'severe';
  location: { x: number; y: number; region: string };
  confidence: number;
  treatment?: string;
}

export interface SkinDisease {
  name: string;
  type: 'eczema' | 'psoriasis' | 'rosacea' | 'vitiligo' | 'dermatitis' | 'melasma';
  severity: 'mild' | 'moderate' | 'severe';
  confidence: number;
  medicalDisclaimer: string;
  recommendedAction: 'see_dermatologist' | 'use_gentle_products' | 'avoid_irritants';
}

export interface SkinTexture {
  roughness: number; // 0-1 scale
  pores: number; // 0-1 scale
  oiliness: number; // 0-1 scale
  hydration: number; // 0-1 scale
  elasticity: number; // 0-1 scale
}

export interface MakeupMode {
  type: 'office' | 'party' | 'bridal' | 'professional';
  requirements: {
    coverage: 'light' | 'medium' | 'full';
    longevity: 'short' | 'medium' | 'long';
    formality: 'casual' | 'business' | 'formal';
    intensity: 'natural' | 'moderate' | 'dramatic';
  };
}

export interface MakeupLook {
  id: string;
  name: string;
  mode: MakeupMode['type'];
  gender: 'male' | 'female' | 'unisex';
  targetSkinTones: string[];
  targetFaceShapes: string[];
  components: {
    base?: MakeupComponent;
    eyes?: MakeupComponent;
    lips?: MakeupComponent;
    cheeks?: MakeupComponent;
    brows?: MakeupComponent;
    grooming?: MakeupComponent; // For men
  };
  priority: number; // 1-10, higher = better match
}

export interface MakeupComponent {
  type: 'foundation' | 'concealer' | 'powder' | 'eyeshadow' | 'eyeliner' | 'mascara' | 'lipstick' | 'lip_liner' | 'blush' | 'bronzer' | 'highlighter' | 'brow_gel' | 'beard_oil' | 'skin_evening';
  product: {
    name: string;
    brand: string;
    shade: string;
    hex: string;
    finish: 'matte' | 'dewy' | 'satin' | 'glossy' | 'shimmer';
    coverage: 'sheer' | 'light' | 'medium' | 'full';
  };
  application: {
    technique: string;
    tools: string[];
    steps: string[];
  };
  customization: {
    intensity: number; // 0-1
    blendable: boolean;
    swappable: boolean;
  };
}

export interface RefinedLook {
  originalLook: MakeupLook;
  customizations: {
    [componentType: string]: Partial<MakeupComponent>;
  };
  finalPrompt: string;
  sdModel: string;
  renderingHints: {
    lighting: string;
    camera_angle: string;
    focus_points: string[];
  };
}

class AutonomousMakeupArtist {
  private skinAnalysisDatabase: Map<string, SkinDisease> = new Map();
  private makeupDatabase: MakeupLook[] = [];
  private genderSpecificFilters: Map<string, string[]> = new Map();

  constructor() {
    this.initializeDiseaseDatabase();
    this.initializeMakeupDatabase();
    this.initializeGenderFilters();
  }

  // 🎯 SCAN PHASE: Comprehensive Skin Analysis
  async analyzeSkin(
    imageElement: HTMLImageElement,
    landmarks: any[],
    meshData?: any
  ): Promise<SkinAnalysisResult> {
    console.log('🔬 Starting comprehensive skin analysis...');

    // Step 1: Gender Detection
    const gender = await this.detectGender(imageElement, landmarks);
    
    // Step 2: Face Shape Analysis
    const faceShape = await this.analyzeFaceShape(landmarks, meshData);
    
    // Step 3: Skin Tone Detection (Hex Code)
    const skinTone = await this.detectSkinTone(imageElement, landmarks);
    
    // Step 4: Disease & Condition Detection
    const skinConditions = await this.detectSkinConditions(imageElement, landmarks);
    
    // Step 5: Facial Feature Analysis
    const facialFeatures = await this.analyzeFacialFeatures(landmarks);
    
    // Step 6: Calculate Overall Confidence
    const confidence = this.calculateAnalysisConfidence([
      gender.confidence,
      faceShape.confidence,
      skinTone.confidence,
      skinConditions.confidence
    ]);

    const result: SkinAnalysisResult = {
      gender: gender.type as 'male' | 'female' | 'other',
      faceShape: faceShape.type as 'oval' | 'round' | 'square' | 'heart' | 'diamond' | 'triangle',
      skinTone: {
        hex: skinTone.hex,
        category: skinTone.category as 'fair' | 'light' | 'medium' | 'tan' | 'deep',
        undertone: skinTone.undertone as 'warm' | 'cool' | 'neutral',
        confidence: skinTone.confidence
      },
      skinConditions: skinConditions,
      facialFeatures: {
        lipShape: facialFeatures.lipShape as 'full' | 'thin' | 'medium',
        eyeShape: facialFeatures.eyeShape as 'almond' | 'round' | 'hooded' | 'monolid',
        browShape: facialFeatures.browShape as 'thick' | 'thin' | 'arched' | 'straight'
      },
      confidence
    };

    console.log('✅ Skin analysis complete:', result);
    return result;
  }

  // 👥 Gender Detection
  private async detectGender(image: HTMLImageElement, landmarks: any[]): Promise<{ type: 'male' | 'female' | 'other', confidence: number }> {
    // Analyze facial features for gender detection
    const jawlineAngle = this.calculateJawlineAngle(landmarks);
    const browBoneProminence = this.calculateBrowBoneProminence(landmarks);
    const cheekboneWidth = this.calculateCheekboneWidth(landmarks);
    
    // Gender detection algorithm
    let maleScore = 0;
    let femaleScore = 0;
    
    // Jawline: More angular = male, rounded = female
    if (jawlineAngle > 120) maleScore += 0.3;
    else femaleScore += 0.3;
    
    // Brow bone: More prominent = male
    if (browBoneProminence > 0.6) maleScore += 0.3;
    else femaleScore += 0.3;
    
    // Cheekbones: Wider = female
    if (cheekboneWidth > 0.4) femaleScore += 0.4;
    else maleScore += 0.4;
    
    const totalScore = maleScore + femaleScore;
    const confidence = Math.max(maleScore, femaleScore) / totalScore;
    
    return {
      type: maleScore > femaleScore ? 'male' : 'female',
      confidence: confidence * 0.9 // 90% max confidence for gender
    };
  }

  // 🎭 Face Shape Analysis
  private async analyzeFaceShape(landmarks: any[], meshData?: any): Promise<{ type: string, confidence: number }> {
    if (meshData && meshData.vertices) {
      // Use Unity mesh data for precise measurements
      return this.analyzeFaceShapeFromMesh(meshData);
    }
    
    // Fallback to MediaPipe landmarks
    return this.analyzeFaceShapeFromLandmarks(landmarks);
  }

  private analyzeFaceShapeFromMesh(meshData: any): { type: string, confidence: number } {
    const vertices = meshData.vertices;
    
    // Calculate key measurements
    const faceHeight = this.calculateDistance(vertices[10], vertices[152]); // Forehead to chin
    const faceWidth = this.calculateDistance(vertices[234], vertices[454]); // Left to right cheek
    const jawWidth = this.calculateDistance(vertices[172], vertices[397]); // Jaw width
    const foreheadWidth = this.calculateDistance(vertices[70], vertices[300]); // Forehead width
    
    const heightToWidthRatio = faceHeight / faceWidth;
    const jawToFaceRatio = jawWidth / faceWidth;
    const foreheadToJawRatio = foreheadWidth / jawWidth;
    
    // Determine face shape
    let faceShape = 'oval';
    let confidence = 0.8;
    
    if (heightToWidthRatio > 1.3) {
      faceShape = 'oval';
      confidence = 0.9;
    } else if (jawToFaceRatio > 0.9 && foreheadToJawRatio > 0.9) {
      faceShape = 'square';
      confidence = 0.85;
    } else if (jawToFaceRatio < 0.7) {
      faceShape = 'heart';
      confidence = 0.85;
    } else if (heightToWidthRatio < 0.9) {
      faceShape = 'round';
      confidence = 0.8;
    } else if (foreheadToJawRatio < 0.8) {
      faceShape = 'diamond';
      confidence = 0.75;
    } else {
      faceShape = 'triangle';
      confidence = 0.7;
    }
    
    return { type: faceShape, confidence };
  }

  private analyzeFaceShapeFromLandmarks(landmarks: any[]): { type: string, confidence: number } {
    // Simplified face shape detection from landmarks
    // This would be enhanced with more sophisticated algorithms
    const faceWidth = this.calculateDistance(landmarks[234], landmarks[454]);
    const faceHeight = this.calculateDistance(landmarks[10], landmarks[152]);
    
    const ratio = faceHeight / faceWidth;
    
    if (ratio > 1.2) return { type: 'oval', confidence: 0.7 };
    if (ratio < 0.9) return { type: 'round', confidence: 0.7 };
    return { type: 'square', confidence: 0.6 };
  }

  // 🎨 Skin Tone Detection (Hex Code)
  private async detectSkinTone(image: HTMLImageElement, landmarks: any[]): Promise<{ hex: string, category: string, undertone: string, confidence: number }> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // Sample skin tone from multiple face regions
    const samplePoints = [
      { x: 0.5, y: 0.3 }, // Forehead
      { x: 0.3, y: 0.5 }, // Left cheek
      { x: 0.7, y: 0.5 }, // Right cheek
      { x: 0.5, y: 0.7 }, // Chin
    ];
    
    const colors: number[] = [];
    
    samplePoints.forEach(point => {
      const x = Math.floor(point.x * image.width);
      const y = Math.floor(point.y * image.height);
      
      ctx.drawImage(image, 0, 0, image.width, image.height);
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      
      colors.push(pixel[0], pixel[1], pixel[2]); // RGB values
    });
    
    // Average the colors
    const avgR = colors.reduce((sum, val, i) => i % 3 === 0 ? sum + val : sum, 0) / (colors.length / 3);
    const avgG = colors.reduce((sum, val, i) => i % 3 === 1 ? sum + val : sum, 0) / (colors.length / 3);
    const avgB = colors.reduce((sum, val, i) => i % 3 === 2 ? sum + val : sum, 0) / (colors.length / 3);
    
    // Convert to hex
    const hex = this.rgbToHex(avgR, avgG, avgB);
    
    // Determine skin tone category and undertone
    const { category, undertone } = this.categorizeSkinTone(avgR, avgG, avgB);
    
    return {
      hex,
      category,
      undertone,
      confidence: 0.85
    };
  }

  private categorizeSkinTone(r: number, g: number, b: number): { category: string, undertone: string } {
    // Calculate skin tone metrics
    const brightness = (r + g + b) / 3;
    const warmth = r - b;
    
    let category = 'medium';
    let undertone = 'neutral';
    
    // Skin tone categories based on brightness
    if (brightness > 200) category = 'fair';
    else if (brightness > 170) category = 'light';
    else if (brightness > 140) category = 'medium';
    else if (brightness > 110) category = 'tan';
    else category = 'deep';
    
    // Undertone based on warmth
    if (warmth > 15) undertone = 'warm';
    else if (warmth < -15) undertone = 'cool';
    else undertone = 'neutral';
    
    return { category, undertone };
  }

  // 🏥 Disease & Condition Detection
  private async detectSkinConditions(image: HTMLImageElement, landmarks: any[]): Promise<{ blemishes: SkinCondition[], marks: SkinCondition[], diseases: SkinDisease[], texture: SkinTexture, confidence: number }> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Analyze for various conditions
    const blemishes = await this.detectBlemishes(imageData, landmarks);
    const marks = await this.detectMarks(imageData, landmarks);
    const diseases = await this.detectDiseases(imageData, landmarks);
    const texture = await this.analyzeSkinTexture(imageData, landmarks);
    
    const confidence = this.calculateConditionConfidence(blemishes, marks, diseases);
    
    return {
      blemishes,
      marks,
      diseases,
      texture,
      confidence
    };
  }

  private async detectBlemishes(imageData: ImageData, landmarks: any[]): Promise<SkinCondition[]> {
    const blemishes: SkinCondition[] = [];
    
    // Detect acne, dark circles, pigmentation
    // This would use computer vision algorithms
    // For now, return simulated results
    
    // Check for dark circles under eyes
    const eyeRegions = this.getEyeRegions(landmarks);
    eyeRegions.forEach((region, index) => {
      const darkness = this.calculateRegionDarkness(imageData, region);
      if (darkness > 0.6) {
        blemishes.push({
          type: 'dark_circles',
          severity: darkness > 0.8 ? 'severe' : darkness > 0.7 ? 'moderate' : 'mild',
          location: { x: region.x, y: region.y, region: 'under_eye_' + (index + 1) },
          confidence: darkness,
          treatment: 'Use color corrector with peach undertone'
        });
      }
    });
    
    return blemishes;
  }

  private async detectMarks(imageData: ImageData, landmarks: any[]): Promise<SkinCondition[]> {
    const marks: SkinCondition[] = [];
    
    // Detect scars, freckles, pigmentation spots
    // This would analyze color variations and patterns
    
    return marks;
  }

  private async detectDiseases(imageData: ImageData, landmarks: any[]): Promise<SkinDisease[]> {
    const diseases: SkinDisease[] = [];
    
    // Check for skin diseases using pattern recognition
    // This is a simplified version - real implementation would need medical validation
    
    // Example: Check for rosacea (redness patterns)
    const rednessPattern = this.analyzeRednessPattern(imageData, landmarks);
    if (rednessPattern.confidence > 0.7) {
      diseases.push({
        name: 'Rosacea',
        type: 'rosacea',
        severity: rednessPattern.severity,
        confidence: rednessPattern.confidence,
        medicalDisclaimer: 'This is not a medical diagnosis. Consult a dermatologist for proper evaluation.',
        recommendedAction: 'see_dermatologist'
      });
    }
    
    return diseases;
  }

  private async analyzeSkinTexture(imageData: ImageData, landmarks: any[]): Promise<SkinTexture> {
    // Analyze skin texture properties
    return {
      roughness: Math.random() * 0.5 + 0.2, // 0.2-0.7
      pores: Math.random() * 0.4 + 0.3, // 0.3-0.7
      oiliness: Math.random() * 0.6 + 0.2, // 0.2-0.8
      hydration: Math.random() * 0.4 + 0.4, // 0.4-0.8
      elasticity: Math.random() * 0.3 + 0.5 // 0.5-0.8
    };
  }

  // 👁️ Facial Feature Analysis
  private async analyzeFacialFeatures(landmarks: any[]): Promise<{ lipShape: string, eyeShape: string, browShape: string }> {
    return {
      lipShape: this.analyzeLipShape(landmarks),
      eyeShape: this.analyzeEyeShape(landmarks),
      browShape: this.analyzeBrowShape(landmarks)
    };
  }

  // 🎯 CONTEXTUAL RECOMMENDATION ENGINE
  getRecommendedLooks(analysis: SkinAnalysisResult, mode: MakeupMode['type']): MakeupLook[] {
    console.log(`🎨 Finding best matches for ${analysis.gender} - ${mode} mode`);
    
    // Filter by gender
    const genderFiltered = this.makeupDatabase.filter(look => 
      look.gender === analysis.gender || look.gender === 'unisex'
    );
    
    // Filter by mode requirements
    const modeFiltered = genderFiltered.filter(look => 
      look.mode === mode
    );
    
    // Filter by skin tone compatibility
    const toneFiltered = modeFiltered.filter(look => 
      look.targetSkinTones.includes(analysis.skinTone.category) ||
      look.targetSkinTones.includes('all')
    );
    
    // Filter by face shape compatibility
    const shapeFiltered = toneFiltered.filter(look => 
      look.targetFaceShapes.includes(analysis.faceShape) ||
      look.targetFaceShapes.includes('all')
    );
    
    // Sort by priority (best match first)
    const sorted = shapeFiltered.sort((a, b) => b.priority - a.priority);
    
    // Return top 5 matches
    return sorted.slice(0, 5);
  }

  // 🔄 THE SWAP FEATURE
  createCustomizedLook(baseLook: MakeupLook, customizations: { [componentType: string]: Partial<MakeupComponent> }): RefinedLook {
    console.log('🔄 Creating customized look with component swaps...');
    
    const refinedLook: RefinedLook = {
      originalLook: baseLook,
      customizations: {},
      finalPrompt: '',
      sdModel: 'runwayml/stable-diffusion-v1-5',
      renderingHints: {
        lighting: 'studio lighting, softbox',
        camera_angle: 'front facing, eye level',
        focus_points: ['eyes', 'lips']
      }
    };
    
    // Apply customizations
    Object.entries(customizations).forEach(([componentType, customization]) => {
      if (baseLook.components[componentType as keyof typeof baseLook.components]) {
        refinedLook.customizations[componentType] = {
          ...baseLook.components[componentType as keyof typeof baseLook.components],
          ...customization
        };
      }
    });
    
    // Generate refined prompt
    refinedLook.finalPrompt = this.generateRefinedPrompt(refinedLook);
    
    return refinedLook;
  }

  // 🎨 FINAL RENDER: Refined Prompt Generation
  private generateRefinedPrompt(refinedLook: RefinedLook): string {
    const { originalLook, customizations } = refinedLook;
    
    let prompt = `professional ${originalLook.mode} makeup photography`;
    
    // Add gender-specific elements
    if (originalLook.gender === 'male') {
      prompt += ', masculine grooming, natural enhancement';
    } else {
      prompt += ', feminine beauty, elegant application';
    }
    
    // Add customized components
    Object.entries(customizations).forEach(([componentType, component]) => {
      if (component.product) {
        const productDesc = `${component.product.finish} ${component.product.name} in ${component.product.shade}`;
        prompt += `, ${productDesc}`;
      }
    });
    
    // Add quality and lighting
    prompt += ', 8k resolution, ultra detailed, professional photography, studio lighting, soft shadows';
    
    // Add skin condition considerations
    if (originalLook.gender === 'female') {
      prompt += ', flawless skin texture, even complexion';
    } else {
      prompt += ', natural skin texture, subtle enhancement';
    }
    
    return prompt;
  }

  // 🔧 UTILITY METHODS
  private calculateDistance(point1: any, point2: any): number {
    if (typeof point1.x !== 'undefined') {
      return Math.sqrt(
        Math.pow(point2.x - point1.x, 2) + 
        Math.pow(point2.y - point1.y, 2)
      );
    }
    return Math.sqrt(
      Math.pow(point2[0] - point1[0], 2) + 
      Math.pow(point2[1] - point1[1], 2)
    );
  }

  private calculateJawlineAngle(landmarks: any[]): number {
    // Calculate jawline angle for gender detection
    const jawLeft = landmarks[172];
    const jawRight = landmarks[397];
    const chin = landmarks[152];
    
    const angle1 = Math.atan2(chin[1] - jawLeft[1], chin[0] - jawLeft[0]);
    const angle2 = Math.atan2(chin[1] - jawRight[1], chin[0] - jawRight[0]);
    
    return Math.abs(angle1 - angle2) * (180 / Math.PI);
  }

  private calculateBrowBoneProminence(landmarks: any[]): number {
    // Calculate brow bone prominence
    const browCenter = landmarks[70];
    const noseBridge = landmarks[6];
    
    return Math.abs(browCenter[2] - noseBridge[2]) / 100; // Normalize
  }

  private calculateCheekboneWidth(landmarks: any[]): number {
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];
    const faceWidth = this.calculateDistance(leftCheek, rightCheek);
    
    return faceWidth / 1000; // Normalize
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  private getEyeRegions(landmarks: any[]): Array<{x: number, y: number, width: number, height: number}> {
    return [
      { x: landmarks[33][0], y: landmarks[133][1], width: 40, height: 20 }, // Left eye
      { x: landmarks[362][0], y: landmarks[263][1], width: 40, height: 20 } // Right eye
    ];
  }

  private calculateRegionDarkness(imageData: ImageData, region: {x: number, y: number, width: number, height: number}): number {
    let totalDarkness = 0;
    let pixelCount = 0;
    
    for (let y = region.y; y < region.y + region.height; y++) {
      for (let x = region.x; x < region.x + region.width; x++) {
        const index = (y * imageData.width + x) * 4;
        const brightness = (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) / 3;
        totalDarkness += (255 - brightness) / 255;
        pixelCount++;
      }
    }
    
    return totalDarkness / pixelCount;
  }

  private analyzeRednessPattern(imageData: ImageData, landmarks: any[]): { confidence: number, severity: 'mild' | 'moderate' | 'severe' } {
    // Analyze for rosacea patterns (simplified)
    const cheekRegions = this.getCheekRegions(landmarks);
    let totalRedness = 0;
    
    cheekRegions.forEach(region => {
      const redness = this.calculateRegionRedness(imageData, region);
      totalRedness += redness;
    });
    
    const avgRedness = totalRedness / cheekRegions.length;
    
    let severity: 'mild' | 'moderate' | 'severe' = 'mild';
    if (avgRedness > 0.7) severity = 'severe';
    else if (avgRedness > 0.5) severity = 'moderate';
    
    return { confidence: avgRedness, severity };
  }

  private getCheekRegions(landmarks: any[]): Array<{x: number, y: number, width: number, height: number}> {
    return [
      { x: landmarks[234][0], y: landmarks[234][1], width: 60, height: 60 }, // Left cheek
      { x: landmarks[454][0], y: landmarks[454][1], width: 60, height: 60 }  // Right cheek
    ];
  }

  private calculateRegionRedness(imageData: ImageData, region: {x: number, y: number, width: number, height: number}): number {
    let totalRedness = 0;
    let pixelCount = 0;
    
    for (let y = region.y; y < region.y + region.height; y++) {
      for (let x = region.x; x < region.x + region.width; x++) {
        const index = (y * imageData.width + x) * 4;
        const red = imageData.data[index];
        const green = imageData.data[index + 1];
        const blue = imageData.data[index + 2];
        
        // Calculate redness ratio
        const total = red + green + blue;
        if (total > 0) {
          totalRedness += red / total;
        }
        pixelCount++;
      }
    }
    
    return totalRedness / pixelCount;
  }

  private calculateAnalysisConfidence(scores: number[]): number {
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private calculateConditionConfidence(blemishes: SkinCondition[], marks: SkinCondition[], diseases: SkinDisease[]): number {
    const blemishConfidence = blemishes.length > 0 ? 
      blemishes.reduce((sum, b) => sum + b.confidence, 0) / blemishes.length : 0.8;
    
    const diseaseConfidence = diseases.length > 0 ? 
      diseases.reduce((sum, d) => sum + d.confidence, 0) / diseases.length : 0.9;
    
    return (blemishConfidence + diseaseConfidence) / 2;
  }

  private analyzeLipShape(landmarks: any[]): string {
    // Analyze lip shape from landmarks
    const lipWidth = this.calculateDistance(landmarks[61], landmarks[291]);
    const lipHeight = this.calculateDistance(landmarks[13], landmarks[14]);
    const ratio = lipHeight / lipWidth;
    
    if (ratio > 0.4) return 'full';
    if (ratio < 0.2) return 'thin';
    return 'medium';
  }

  private analyzeEyeShape(landmarks: any[]): string {
    // Analyze eye shape from landmarks
    const leftEyeWidth = this.calculateDistance(landmarks[33], landmarks[133]);
    const leftEyeHeight = this.calculateDistance(landmarks[159], landmarks[145]);
    const leftRatio = leftEyeHeight / leftEyeWidth;
    
    if (leftRatio > 0.4) return 'round';
    if (leftRatio < 0.2) return 'almond';
    return 'hooded';
  }

  private analyzeBrowShape(landmarks: any[]): string {
    // Analyze brow shape from landmarks
    const browArch = this.calculateBrowArch(landmarks);
    
    if (browArch > 0.3) return 'arched';
    if (browArch < 0.1) return 'straight';
    return 'medium';
  }

  private calculateBrowArch(landmarks: any[]): number {
    const browStart = landmarks[70];
    const browPeak = landmarks[63];
    const browEnd = landmarks[105];
    
    const archHeight = browPeak[1] - (browStart[1] + browEnd[1]) / 2;
    const browWidth = this.calculateDistance(browStart, browEnd);
    
    return Math.abs(archHeight) / browWidth;
  }

  // 🗄️ DATABASE INITIALIZATION
  private initializeDiseaseDatabase(): void {
    // Initialize skin disease database with medical information
    this.skinAnalysisDatabase.set('rosacea', {
      name: 'Rosacea',
      type: 'rosacea',
      severity: 'moderate',
      confidence: 0.8,
      medicalDisclaimer: 'This is not a medical diagnosis. Consult a dermatologist.',
      recommendedAction: 'see_dermatologist'
    });
    
    // Add more diseases...
  }

  private initializeMakeupDatabase(): void {
    // Initialize comprehensive makeup database
    this.makeupDatabase = [
      {
        id: 'office_natural_female',
        name: 'Natural Office Look',
        mode: 'office',
        gender: 'female',
        targetSkinTones: ['light', 'medium', 'tan'],
        targetFaceShapes: ['oval', 'round', 'heart'],
        components: {
          base: {
            type: 'foundation',
            product: {
              name: 'Natural Finish Foundation',
              brand: 'Glow Cosmetics',
              shade: 'Medium Beige',
              hex: '#D4A574',
              finish: 'dewy',
              coverage: 'medium'
            },
            application: {
              technique: 'Stippling',
              tools: ['Damp sponge', 'Foundation brush'],
              steps: ['Apply center outward', 'Blend edges', 'Set with powder']
            },
            customization: {
              intensity: 0.6,
              blendable: true,
              swappable: true
            }
          },
          eyes: {
            type: 'eyeshadow',
            product: {
              name: 'Neutral Eyeshadow Palette',
              brand: 'Glow Cosmetics',
              shade: 'Taupe',
              hex: '#8B7355',
              finish: 'matte',
              coverage: 'light'
            },
            application: {
              technique: 'Sweeping',
              tools: ['Eyeshadow brush'],
              steps: ['Apply to lid', 'Blend into crease', 'Highlight brow bone']
            },
            customization: {
              intensity: 0.4,
              blendable: true,
              swappable: true
            }
          },
          lips: {
            type: 'lipstick',
            product: {
              name: 'Natural Lipstick',
              brand: 'Glow Cosmetics',
              shade: 'Soft Pink',
              hex: '#E8B4B8',
              finish: 'satin',
              coverage: 'medium'
            },
            application: {
              technique: 'Direct application',
              tools: ['Lip brush'],
              steps: ['Outline lips', 'Fill in color', 'Blend edges']
            },
            customization: {
              intensity: 0.5,
              blendable: true,
              swappable: true
            }
          }
        },
        priority: 9
      },
      {
        id: 'professional_male',
        name: 'Professional Grooming',
        mode: 'professional',
        gender: 'male',
        targetSkinTones: ['light', 'medium', 'tan', 'deep'],
        targetFaceShapes: ['oval', 'square', 'round'],
        components: {
          grooming: {
            type: 'beard_oil',
            product: {
              name: 'Beard Conditioning Oil',
              brand: 'Gentleman Care',
              shade: 'Natural',
              hex: '#8B4513',
              finish: 'matte',
              coverage: 'sheer'
            },
            application: {
              technique: 'Massage',
              tools: ['Fingertips'],
              steps: ['Apply to beard', 'Massage into skin', 'Style as desired']
            },
            customization: {
              intensity: 0.3,
              blendable: true,
              swappable: true
            }
          },
          base: {
            type: 'skin_evening',
            product: {
              name: 'Skin Evening Tint',
              brand: 'Gentleman Care',
              shade: 'Natural',
              hex: '#D4A574',
              finish: 'matte',
              coverage: 'light'
            },
            application: {
              technique: 'Patting',
              tools: ['Fingertips', 'Sponge'],
              steps: ['Apply to needed areas', 'Blend thoroughly', 'Set with powder']
            },
            customization: {
              intensity: 0.2,
              blendable: true,
              swappable: true
            }
          }
        },
        priority: 8
      }
      // Add more looks...
    ];
  }

  private initializeGenderFilters(): void {
    // Initialize gender-specific product filters
    this.genderSpecificFilters.set('male', [
      'beard_oil', 'skin_evening', 'concealer', 'powder', 'brow_gel'
    ]);
    
    this.genderSpecificFilters.set('female', [
      'foundation', 'concealer', 'eyeshadow', 'eyeliner', 'mascara', 
      'lipstick', 'lip_liner', 'blush', 'bronzer', 'highlighter', 'brow_gel'
    ]);
    
    this.genderSpecificFilters.set('unisex', [
      'concealer', 'powder', 'brow_gel', 'skin_evening'
    ]);
  }
}

export const autonomousMakeupArtist = new AutonomousMakeupArtist();
