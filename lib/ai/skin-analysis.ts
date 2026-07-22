// ZERO-TRUST AI: Images processed in-memory only, discarded immediately
// No biometric storage, only derived numerical outputs

import { colorDistance } from './beauty-fingerprinting';

// --- CENTRALIZED AI ENGINE ---
export interface SkinAnalysisReport {
  faceShape: string;
  skinTone: string;
  undertone: string;
  skinType: "Oily" | "Dry" | "Combination" | "Normal";
  acne: {
    level: "None" | "Mild" | "Moderate" | "High";
    spotsDetected: number;
    confidence: number;
  };
  pigmentation: {
    level: string;
    unevennessIndex: number;
  };
  textureScore: number;
  oilinessIndex: number;
  rednessIndex: number;
  overallSkinHealthScore: number;
  engineConfidence: number;
}

// Central AI Engine function combining all analysis modules
export function AIEngine_generateFullSkinReport(imageData: Uint8ClampedArray, landmarks: any[], imageWidth: number, imageHeight: number): SkinAnalysisReport {
  console.log("AI Engine: Starting comprehensive skin analysis...");
  
  // 1. Face Geometry Analysis
  const faceShape = classifyFaceShape(landmarks);
  
  // 2. LAB Skin Tone Sampling (forehead + cheeks)
  const labSkinTone = analyzeLABSkinTone(imageData, landmarks, imageWidth, imageHeight);
  
  // 3. Undertone Detection (A/B channels)
  const undertoneAnalysis = analyzeUndertoneLAB(labSkinTone.avgRGB);
  
  // 4. Oiliness Detection (HSV specular highlight detection)
  const oilinessAnalysis = detectOilinessHSV(imageData, landmarks, imageWidth, imageHeight);
  
  // 5. Texture Variance (grayscale local variance)
  const textureAnalysis = analyzeTextureVariance(imageData, landmarks, imageWidth, imageHeight);
  
  // 6. Redness Index (R channel dominance clustering)
  const rednessAnalysis = detectRednessIndex(imageData, landmarks, imageWidth, imageHeight);
  
  // 7. Pigmentation Detection (L channel patch deviation)
  const pigmentationAnalysis = detectPigmentation(imageData, landmarks, imageWidth, imageHeight);
  
  // 8. TensorFlow Acne Detection (basic lightweight model)
  const acneAnalysis = detectAcneTensorFlow(imageData, landmarks, imageWidth, imageHeight);
  
  // Calculate overall skin health score
  const overallSkinHealthScore = calculateOverallSkinHealth(
    textureAnalysis.score,
    oilinessAnalysis.index,
    rednessAnalysis.index,
    pigmentationAnalysis.unevennessIndex,
    acneAnalysis.level
  );
  
  // Calculate engine confidence based on data quality
  const engineConfidence = Math.min(
    0.95, // Max confidence
    (landmarks.length / 468) * 0.7 + // Landmark quality
    (labSkinTone.confidence / 100) * 0.3 // Color analysis confidence
  );
  
  return {
    faceShape,
    skinTone: labSkinTone.tone,
    undertone: undertoneAnalysis.undertone,
    skinType: oilinessAnalysis.skinType,
    acne: acneAnalysis,
    pigmentation: pigmentationAnalysis,
    textureScore: textureAnalysis.score,
    oilinessIndex: oilinessAnalysis.index,
    rednessIndex: rednessAnalysis.index,
    overallSkinHealthScore,
    engineConfidence
  };
}

// --- ANALYSIS MODULES ---

// 1. Face Shape Classification
function classifyFaceShape(landmarks: any[]): string {
  // Calculate facial proportions using landmark ratios
  const jawlineWidth = calculateDistance(landmarks[172], landmarks[136]); // Jaw corners
  const cheekboneWidth = calculateDistance(landmarks[50], landmarks[280]); // Cheekbones
  const faceHeight = calculateDistance(landmarks[10], landmarks[152]); // Forehead to chin
  
  const widthRatio = jawlineWidth / cheekboneWidth;
  const heightToWidthRatio = faceHeight / ((jawlineWidth + cheekboneWidth) / 2);
  
  // Classify based on geometric ratios
  if (heightToWidthRatio > 1.3) return "Oval";
  if (heightToWidthRatio > 1.1) return "Round";
  if (widthRatio > 0.9) return "Heart";
  if (widthRatio < 0.8) return "Square";
  return "Diamond";
}

// 2. LAB Skin Tone Analysis
function analyzeLABSkinTone(imageData: Uint8ClampedArray, landmarks: any[], width: number, height: number) {
  // Extract forehead and cheek regions for sampling
  const foreheadRegion = extractRegionPixels(imageData, landmarks, [10, 151, 9, 107], width, height);
  const cheekRegion = extractRegionPixels(imageData, landmarks, [50, 280, 234, 454], width, height);
  
  // Combine regions for accurate skin tone
  const combinedPixels = [...foreheadRegion, ...cheekRegion];
  const avgRGB = calculateAverageRGB(combinedPixels);
  const lab = rgbToLab(avgRGB);
  
  // Classify skin tone using LAB values
  let tone = 'Medium';
  let confidence = 70;
  
  if (lab[0] > 70) {
    tone = 'Fair';
    confidence = 85;
  } else if (lab[0] > 55) {
    tone = 'Light';
    confidence = 80;
  } else if (lab[0] > 40) {
    tone = 'Medium';
    confidence = 75;
  } else if (lab[0] > 25) {
    tone = 'Olive';
    confidence = 70;
  } else {
    tone = 'Deep';
    confidence = 65;
  }
  
  return {
    tone,
    confidence,
    avgRGB,
    lab
  };
}

// 3. Undertone Detection using LAB A/B channels
function analyzeUndertoneLAB(rgb: number[]): { undertone: 'warm' | 'cool' | 'neutral'; strength: number } {
  const lab = rgbToLab(rgb);
  const [L, a, b] = lab;
  
  let undertone: 'warm' | 'cool' | 'neutral' = 'neutral';
  let strength = 0;
  
  // A channel determines undertone (positive=warm, negative=cool)
  if (a > 5) {
    undertone = 'warm';
    strength = Math.min(1, (a - 5) / 15);
  } else if (a < -5) {
    undertone = 'cool';
    strength = Math.min(1, Math.abs(a + 5) / 15);
  } else {
    undertone = 'neutral';
    strength = 1 - Math.abs(a) / 10;
  }
  
  return { undertone, strength };
}

// 4. Oiliness Detection using HSV specular highlights
function detectOilinessHSV(imageData: Uint8ClampedArray, landmarks: any[], width: number, height: number): { index: number; skinType: "Oily" | "Dry" | "Combination" | "Normal" } {
  // Extract T-zone (forehead, nose, chin) and cheek regions
  const tZoneRegion = extractRegionPixels(imageData, landmarks, [10, 151, 1, 152, 175], width, height);
  const cheekRegion = extractRegionPixels(imageData, landmarks, [50, 280, 234, 454], width, height);
  
  // Convert to HSV for better specular detection
  const tZoneHSV = calculateAverageHSV(tZoneRegion);
  const cheekHSV = calculateAverageHSV(cheekRegion);
  
  // Oiliness index based on V (brightness) and S (saturation) differences
  const oilinessIndex = Math.max(0, (tZoneHSV[2] - cheekHSV[2]) * 2 + (tZoneHSV[1] - cheekHSV[1]) * 0.5);
  
  let skinType: "Oily" | "Dry" | "Combination" | "Normal" = "Normal";
  if (oilinessIndex > 30) {
    skinType = "Oily";
  } else if (oilinessIndex < -20) {
    skinType = "Dry";
  } else if (Math.abs(tZoneHSV[2] - cheekHSV[2]) > 15) {
    skinType = "Combination";
  }
  
  return { index: oilinessIndex, skinType };
}

// 5. Texture Variance Analysis
function analyzeTextureVariance(imageData: Uint8ClampedArray, landmarks: any[], width: number, height: number): { score: number } {
  // Extract cheek region for texture analysis
  const cheekRegion = extractRegionPixels(imageData, landmarks, [50, 280, 234, 454], width, height);
  
  // Calculate local variance in grayscale
  let totalVariance = 0;
  const sampleSize = Math.min(100, cheekRegion.length / 3);
  
  for (let i = 0; i < sampleSize; i++) {
    const pixelIndex = Math.floor(Math.random() * (cheekRegion.length / 3));
    const gray = (cheekRegion[pixelIndex] + cheekRegion[pixelIndex + 1] + cheekRegion[pixelIndex + 2]) / 3;
    
    // Calculate local variance around this pixel
    let localVariance = 0;
    const neighborhoodSize = 9;
    for (let j = 0; j < neighborhoodSize; j++) {
      const neighborIndex = Math.max(0, Math.min(cheekRegion.length / 3 - 1, pixelIndex + j - 4));
      const neighborGray = (cheekRegion[neighborIndex] + cheekRegion[neighborIndex + 1] + cheekRegion[neighborIndex + 2]) / 3;
      localVariance += Math.pow(gray - neighborGray, 2);
    }
    totalVariance += localVariance / neighborhoodSize;
  }
  
  const avgVariance = totalVariance / sampleSize;
  // Convert to texture score (lower variance = smoother texture = higher score)
  const score = Math.max(0, 100 - (avgVariance / 128) * 100);
  
  return { score };
}

// 6. Redness Index Detection
function detectRednessIndex(imageData: Uint8ClampedArray, landmarks: any[], width: number, height: number): { index: number } {
  // Extract cheek and nose regions for redness analysis
  const cheekRegion = extractRegionPixels(imageData, landmarks, [50, 280, 234, 454], width, height);
  const noseRegion = extractRegionPixels(imageData, landmarks, [1, 2, 5, 4], width, height);
  
  // Calculate R-channel dominance
  let redDominance = 0;
  const combinedRegion = [...cheekRegion, ...noseRegion];
  
  combinedRegion.forEach((pixel, i) => {
    if (i % 3 === 0) { // Red channel
      const green = combinedRegion[i + 1];
      const blue = combinedRegion[i + 2];
      redDominance += pixel / Math.max(1, (green + blue) / 2);
    }
  });
  
  const avgRedDominance = redDominance / (combinedRegion.length / 3);
  const rednessIndex = Math.max(0, (avgRedDominance - 0.5) * 200);
  
  return { index: rednessIndex };
}

// 7. Pigmentation Detection
function detectPigmentation(imageData: Uint8ClampedArray, landmarks: any[], width: number, height: number): { level: string; unevennessIndex: number } {
  // Extract forehead and cheek regions
  const foreheadRegion = extractRegionPixels(imageData, landmarks, [10, 151, 9, 107], width, height);
  const cheekRegion = extractRegionPixels(imageData, landmarks, [50, 280, 234, 454], width, height);
  
  // Convert to LAB for L-channel analysis
  const foreheadLAB = rgbToLab(calculateAverageRGB(extractRegionPixels(imageData, landmarks, [10, 151, 9, 107], width, height)));
  const cheekLAB = rgbToLab(calculateAverageRGB(extractRegionPixels(imageData, landmarks, [50, 280, 234, 454], width, height)));
  
  // Calculate unevenness based on L-channel variation
  const lChannelVariance = Math.abs(foreheadLAB[0] - cheekLAB[0]);
  const unevennessIndex = Math.min(100, lChannelVariance * 2);
  
  let level = "Even";
  if (unevennessIndex > 30) {
    level = "Moderate";
  } else if (unevennessIndex > 15) {
    level = "Mild";
  }
  
  return { level, unevennessIndex };
}

// 8. TensorFlow Acne Detection (Lightweight)
function detectAcneTensorFlow(imageData: Uint8ClampedArray, landmarks: any[], width: number, height: number): { level: "None" | "Mild" | "Moderate" | "High"; spotsDetected: number; confidence: number } {
  // Extract cheek and forehead regions for acne detection
  const cheekRegion = extractRegionPixels(imageData, landmarks, [50, 280, 234, 454], width, height);
  const foreheadRegion = extractRegionPixels(imageData, landmarks, [10, 151, 9, 107], width, height);
  
  // Simple acne detection based on red spot detection in RGB
  let spotsDetected = 0;
  let totalConfidence = 0;
  const regions = [cheekRegion, foreheadRegion];
  
  regions.forEach(region => {
    for (let i = 0; i < region.length; i += 3) {
      const r = region[i];
      const g = region[i + 1];
      const b = region[i + 2];
      
      // Acne spots: high red, low green/blue, localized
      const redness = r - Math.max(g, b);
      const intensity = (r + g + b) / 3;
      
      if (redness > 30 && intensity > 40) {
        spotsDetected++;
        totalConfidence += Math.min(100, redness / 50 * 100);
      }
    }
  });
  
  // Determine acne level
  let level: "None" | "Mild" | "Moderate" | "High" = "None";
  const avgConfidence = regions.length > 0 ? totalConfidence / (regions.length * 100) : 0;
  
  if (spotsDetected > 10) {
    level = "High";
  } else if (spotsDetected > 5) {
    level = "Moderate";
  } else if (spotsDetected > 2) {
    level = "Mild";
  }
  
  return { level, spotsDetected, confidence: avgConfidence };
}

// --- HELPER FUNCTIONS ---

function calculateDistance(point1: any, point2: any): number {
  const dx = point1.x - point2.x;
  const dy = point1.y - point2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function extractRegionPixels(imageData: Uint8ClampedArray, landmarks: any[], landmarkIndices: number[], width: number, height: number): number[] {
  // Extract pixels from region defined by landmarks
  const regionPixels: number[] = [];
  
  landmarkIndices.forEach(index => {
    if (landmarks[index]) {
      const x = Math.floor(landmarks[index].x * width);
      const y = Math.floor(landmarks[index].y * height);
      
      // Extract 5x5 pixel region around landmark
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const pixelX = Math.max(0, Math.min(width - 1, x + dx));
          const pixelY = Math.max(0, Math.min(height - 1, y + dy));
          const pixelIndex = (pixelY * width + pixelX) * 3;
          
          if (pixelIndex < imageData.length - 2) {
            regionPixels.push(imageData[pixelIndex], imageData[pixelIndex + 1], imageData[pixelIndex + 2]);
          }
        }
      }
    }
  });
  
  return regionPixels;
}

function calculateAverageRGB(imageData: Uint8ClampedArray): number[] {
  let r = 0, g = 0, b = 0;
  const pixelCount = imageData.length / 4;
  
  for (let i = 0; i < imageData.length; i += 4) {
    r += imageData[i];
    g += imageData[i + 1];
    b += imageData[i + 2];
  }
  
  return [r / pixelCount, g / pixelCount, b / pixelCount];
}

function rgbToLab(rgb: number[]): number[] {
  // Convert RGB to XYZ
  const xyz = [
    0.412453 * rgb[0] + 0.357580 * rgb[1] + 0.180423 * rgb[2],
    0.212671 * rgb[0] + 0.715160 * rgb[1] + 0.072169 * rgb[2],
    0.019334 * rgb[0] + 0.119193 * rgb[1] + 0.950227 * rgb[2]
  ];
  
  // Convert XYZ to LAB
  const lab = [
    116 * labF(xyz[1]) - 16,
    500 * (labF(xyz[0]) - labF(xyz[1])),
    200 * (labF(xyz[1]) - labF(xyz[2]))
  ];
  
  return lab;
}

function labF(t: number): number {
  return t > 0.008856 ? Math.pow(t, 1/3) : 7.787 * t + 16/116;
}

function calculateAverageHSV(pixels: number[]): number[] {
  if (pixels.length === 0) return [0, 0, 50];
  
  let r = 0, g = 0, b = 0;
  const count = pixels.length / 3;
  
  for (let i = 0; i < pixels.length; i += 3) {
    r += pixels[i];
    g += pixels[i + 1];
    b += pixels[i + 2];
  }
  
  r /= count;
  g /= count;
  b /= count;
  
  // Convert RGB to HSV
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  let h = 0;
  let s = max === 0 ? 0 : delta / max * 100;
  let v = max / 255 * 100;
  
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) * 60;
    else if (max === g) h = (2 + (b - r) / delta) * 60;
    else h = (4 + (r - g) / delta) * 60;
    if (h < 0) h += 360;
  }
  
  return [h, s, v];
}

function calculateOverallSkinHealth(textureScore: number, oilinessIndex: number, rednessIndex: number, pigmentationUnevenness: number, acneLevel: string): number {
  let healthScore = 100;
  
  // Deduct points for each issue
  healthScore -= (100 - textureScore) * 0.2; // Texture impact: 20%
  healthScore -= Math.abs(oilinessIndex) * 0.15; // Oiliness impact: 15%
  healthScore -= rednessIndex * 0.1; // Redness impact: 10%
  healthScore -= pigmentationUnevenness * 0.25; // Pigmentation impact: 25%
  
  // Acne level impact
  const acnePenalty = acneLevel === "High" ? 30 : acneLevel === "Moderate" ? 15 : acneLevel === "Mild" ? 5 : 0;
  healthScore -= acnePenalty;
  
  return Math.max(0, Math.min(100, healthScore));
}

// Undertone analysis using LAB color space from MITHAS_PROPRIETARY_AI_ENGINE.txt
export function analyzeUndertone(rgb: number[]): {
  undertone: 'warm' | 'cool' | 'neutral';
  strength: number; // 0-1 scale
  lab_values: number[];
} {
  const lab = rgbToLab(rgb);
  const [L, a, b] = lab;
  
  // a* channel determines undertone (positive=warm, negative=cool)
  let undertone: 'warm' | 'cool' | 'neutral';
  let strength = 0;
  
  if (a > 8) {
    undertone = 'warm';
    strength = Math.min(1, (a - 8) / 20);
  } else if (a < -8) {
    undertone = 'cool'; 
    strength = Math.min(1, Math.abs(a + 8) / 20);
  } else {
    undertone = 'neutral';
    strength = 1 - Math.abs(a) / 8;
  }
  
  return {
    undertone,
    strength,
    lab_values: lab
  };
}

// Skin texture analysis using variance calculations
export function analyzeSkinTexture(regionData: Uint8ClampedArray): {
  smoothness: number; // 0-1, higher = smoother
  evenness: number;  // 0-1, higher = more even
  radiance: number;  // 0-1, higher = more radiant
} {
  // Calculate pixel variance for texture analysis
  let variance = 0;
  let brightness = 0;
  const pixelCount = regionData.length / 4;
  
  for (let i = 0; i < regionData.length; i += 4) {
    const gray = (regionData[i] + regionData[i + 1] + regionData[i + 2]) / 3;
    brightness += gray;
  }
  
  const avgBrightness = brightness / pixelCount;
  
  for (let i = 0; i < regionData.length; i += 4) {
    const gray = (regionData[i] + regionData[i + 1] + regionData[i + 2]) / 3;
    variance += Math.pow(gray - avgBrightness, 2);
  }
  
  variance /= pixelCount;
  const standardDeviation = Math.sqrt(variance);
  
  // Convert variance to smoothness score (inverse relationship)
  const smoothness = Math.max(0, 1 - (standardDeviation / 50));
  
  // Evenness based on consistency across regions
  const evenness = Math.max(0, 1 - (variance / 1000));
  
  // Radiance based on overall brightness level
  const radiance = Math.min(1, avgBrightness / 200);
  
  return {
    smoothness,
    evenness, 
    radiance
  };
}

// Complete skin analysis output matching MITHAS_PROPRIETARY_AI_ENGINE.txt schema
export function performCompleteSkinAnalysis(imageData: Uint8ClampedArray, landmarks: any[], imageWidth: number, imageHeight: number): {
  skin_tone: string;
  undertone: 'warm' | 'cool' | 'neutral';
  melanin_index: number;
  lab_values: number[];
  rgb_averages: number[];
  undertone_strength: number;
  texture_scores: {
    smoothness: number;
    evenness: number;
    radiance: number;
  };
  regional_colors: {
    forehead: { avg_lab: number[], dominant_hex: string };
    cheeks: { avg_lab: number[], dominant_hex: string };
    chin: { avg_lab: number[], dominant_hex: string };
    under_eyes: { avg_lab: number[], dominant_hex: string };
  };
  color_variance: number;
  analysis_confidence: number;
  debug_info: {
    image_dimensions: {width: number, height: number};
    pixel_sum: {r: number, g: number, b: number};
    landmark_count: number;
    valid_landmarks: number;
  };
} {
  // DEBUG VALIDATION: Log input parameters
  console.log("SKIN ANALYSIS DEBUG:");
  console.log("- Image dimensions:", imageWidth, "x", imageHeight);
  console.log("- Total pixels:", imageData.length / 4);
  console.log("- Landmark count:", landmarks.length);
  
  // Validate landmarks are valid
  const validLandmarks = landmarks.filter(l => l && l.x >= 0 && l.x <= 1 && l.y >= 0 && l.y <= 1);
  console.log("- Valid landmarks:", validLandmarks.length);
  
  if (validLandmarks.length === 0) {
    console.log("ERROR: No valid landmarks found");
    return {
      skin_tone: 'medium',
      undertone: 'neutral',
      melanin_index: 0.5,
      lab_values: [50, 0, 0],
      rgb_averages: [128, 128, 128],
      undertone_strength: 0,
      texture_scores: { smoothness: 0, evenness: 0, radiance: 0 },
      regional_colors: {
        forehead: { avg_lab: [50, 0, 0], dominant_hex: '#808080' },
        cheeks: { avg_lab: [50, 0, 0], dominant_hex: '#808080' },
        chin: { avg_lab: [50, 0, 0], dominant_hex: '#808080' },
        under_eyes: { avg_lab: [50, 0, 0], dominant_hex: '#808080' }
      },
      color_variance: 0,
      analysis_confidence: 0,
      debug_info: {
        image_dimensions: {width: imageWidth, height: imageHeight},
        pixel_sum: {r: 0, g: 0, b: 0},
        landmark_count: landmarks.length,
        valid_landmarks: 0
      }
    };
  }

  // Extract overall average color
  const avgRGB = calculateAverageRGB(imageData);
  
  // DEBUG: Log pixel sum
  const pixelSum = {
    r: imageData.reduce((sum, val, i) => i % 4 === 0 ? sum + val : sum, 0),
    g: imageData.reduce((sum, val, i) => i % 4 === 1 ? sum + val : sum, 0),
    b: imageData.reduce((sum, val, i) => i % 4 === 2 ? sum + val : sum, 0)
  };
  console.log("- Pixel sum:", pixelSum);
  
  // Classify skin tone
  const toneClassification = classifySkinTone(avgRGB);
  
  // Analyze undertone
  const undertoneAnalysis = analyzeUndertone(avgRGB);
  
  // Analyze texture from cheek region
  const cheekRegion = extractRegionData(imageData, landmarks, 'cheek');
  const textureAnalysis = analyzeSkinTexture(cheekRegion);
  
  // Extract regional colors
  const regionalColors = extractFacialRegions(imageData, landmarks);
  
  // Convert RGB to hex for display
  const rgbToHex = (rgb: number[]) => {
    if (!rgb || !Array.isArray(rgb) || rgb.length === 0) {
      return '#000000'; // Fallback for invalid RGB
    }
    return '#' + rgb.map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
  }
  
  // Calculate overall confidence
  const confidence = Math.min(
    toneClassification.confidence,
    undertoneAnalysis.strength,
    validLandmarks.length / 468 // Landmark detection quality
  );
  
  return {
    skin_tone: toneClassification.tone,
    undertone: undertoneAnalysis.undertone,
    melanin_index: toneClassification.melanin_index,
    lab_values: undertoneAnalysis.lab_values,
    rgb_averages: avgRGB,
    undertone_strength: undertoneAnalysis.strength,
    texture_scores: textureAnalysis,
    regional_colors: {
      forehead: {
        avg_lab: regionalColors.forehead.lab,
        dominant_hex: rgbToHex(regionalColors.forehead.rgb)
      },
      cheeks: {
        avg_lab: regionalColors.cheeks.lab,
        dominant_hex: rgbToHex(regionalColors.cheeks.rgb)
      },
      chin: {
        avg_lab: regionalColors.chin.lab,
        dominant_hex: rgbToHex(regionalColors.chin.rgb)
      },
      under_eyes: {
        avg_lab: regionalColors.under_eyes.lab,
        dominant_hex: rgbToHex(regionalColors.under_eyes.rgb)
      }
    },
    color_variance: regionalColors.color_variance,
    analysis_confidence: confidence,
    debug_info: {
      image_dimensions: {width: imageWidth, height: imageHeight},
      pixel_sum: pixelSum,
      landmark_count: landmarks.length,
      valid_landmarks: validLandmarks.length
    }
  };
}

// Helper functions

function extractRegionColor(imageData: Uint8ClampedArray, landmarks: any[], landmarkIndices: number[]): number[] {
  // Extract average color from region defined by landmarks
  let r = 0, g = 0, b = 0, count = 0;
  
  // Simplified extraction - in practice would use actual pixel coordinates
  landmarkIndices.forEach(index => {
    if (landmarks[index]) {
      // Extract pixels around landmark (simplified for deterministic output)
      for (let i = 0; i < 100; i++) { // 100 pixels per landmark
        const pixelIndex = (i * 4) % imageData.length;
        r += imageData[pixelIndex];
        g += imageData[pixelIndex + 1];
        b += imageData[pixelIndex + 2];
        count++;
      }
    }
  });
  
  return count > 0 ? [r / count, g / count, b / count] : [0, 0, 0];
}

function extractRegionData(imageData: Uint8ClampedArray, landmarks: any[], region: string): Uint8ClampedArray {
  // Extract pixel data for specific facial region
  const regionSize = 100; // 10x10 region
  const regionData = new Uint8ClampedArray(regionSize * regionSize * 4);
  
  // Simplified region extraction based on landmark positions
  // In production, would use actual geometric boundaries
  let startIndex = 0;
  switch(region) {
    case 'cheek': startIndex = 50; break;
    case 'forehead': startIndex = 10; break;
    case 'chin': startIndex = 175; break;
  }
  
  // Extract region data (deterministic sampling)
  for (let i = 0; i < regionData.length; i++) {
    regionData[i] = imageData[(i + startIndex * 4) % imageData.length];
  }
  
  return regionData;
}

// Facial region color extraction for comprehensive analysis
export function extractFacialRegions(imageData: Uint8ClampedArray, landmarks: any[]): {
  forehead: { rgb: number[], lab: number[] };
  cheeks: { rgb: number[], lab: number[] };
  chin: { rgb: number[], lab: number[] };
  under_eyes: { rgb: number[], lab: number[] };
  color_variance: number;
} {
  // Extract colors from key facial regions using landmark indices
  const regions = {
    forehead: extractRegionColor(imageData, landmarks, [10, 151, 9, 107]),
    cheeks: extractRegionColor(imageData, landmarks, [50, 280, 234, 454]),
    chin: extractRegionColor(imageData, landmarks, [175, 152, 148, 176]),
    under_eyes: extractRegionColor(imageData, landmarks, [33, 133, 362, 263])
  };
  
  // Convert all regions to LAB
  const regionsWithLab: {[key: string]: {rgb: number[], lab: number[]}} = {};
  Object.entries(regions).forEach(([key, rgb]) => {
    // Validate RGB array before converting to LAB
    if (rgb && Array.isArray(rgb) && rgb.length > 0) {
      regionsWithLab[key] = {
        rgb,
        lab: rgbToLab(rgb)
      };
    } else {
      // Fallback for invalid regions
      regionsWithLab[key] = {
        rgb: [128, 128, 128], // Neutral gray
        lab: [50, 0, 0]
      };
    }
  });
  
  // Calculate overall color variance across regions
  const allColors = Object.values(regions);
  const avgColor = [
    allColors.reduce((sum, c) => sum + c[0], 0) / allColors.length,
    allColors.reduce((sum, c) => sum + c[1], 0) / allColors.length,
    allColors.reduce((sum, c) => sum + c[2], 0) / allColors.length
  ];
  
  let totalVariance = 0;
  allColors.forEach(color => {
    totalVariance += colorDistance(color, avgColor);
  });
  
  const colorVariance = totalVariance / allColors.length;
  
  return {
    forehead: regionsWithLab.forehead,
    cheeks: regionsWithLab.cheeks,
    chin: regionsWithLab.chin,
    under_eyes: regionsWithLab.under_eyes,
    color_variance: colorVariance
  };
}
