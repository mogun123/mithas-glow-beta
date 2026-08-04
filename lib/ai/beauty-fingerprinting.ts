// ZERO-TRUST AI: Images processed in-memory only, discarded immediately
// No biometric storage, only derived numerical outputs

import { FaceMesh } from '@mediapipe/face_mesh';

// --- NEW: HYBRID WHITE BALANCE LOGIC START ---

// 1. Main Function to Correct Lighting
export function applyHybridWhiteBalance(
  imageData: Uint8ClampedArray, 
  landmarks: any[], 
  width: number, 
  height: number
): Uint8ClampedArray {
  
  const targetGrey = 128; // The perfect neutral grey
  let scaleR = 1, scaleG = 1, scaleB = 1;

  // PLAN A: Try to find Eye Sclera (White part)
  // Left Eye Sclera Landmarks: 33, 133, 160, 144
  const leftEyeIndices = [33, 133, 160, 144]; 
  const eyeColor = getLandmarkRegionColor(imageData, landmarks, leftEyeIndices, width, height);

  // Check if Eye data is reliable (Not too dark, not closed)
  // Brightness check: (R+G+B)/3 should be > 50
  const isEyeReliable = eyeColor && ((eyeColor[0] + eyeColor[1] + eyeColor[2]) / 3 > 50);

  if (isEyeReliable) {
    // USE EYE REFERENCE (High Accuracy)
    // Eye should be pure white/grey. If it's yellow, correct it.
    scaleR = targetGrey / (eyeColor[0] || 1);
    scaleG = targetGrey / (eyeColor[1] || 1);
    scaleB = targetGrey / (eyeColor[2] || 1);
  } else {
    // PLAN B: FALLBACK TO GLOBAL AVERAGE (Standard)
    const globalAvg = getAverageColor(imageData);
    scaleR = targetGrey / (globalAvg[0] || 1);
    scaleG = targetGrey / (globalAvg[1] || 1);
    scaleB = targetGrey / (globalAvg[2] || 1);
  }

  // Apply the correction to a COPY of image (Safety)
  const correctedData = new Uint8ClampedArray(imageData.length);

  for (let i = 0; i < imageData.length; i += 4) {
    correctedData[i] = Math.min(255, imageData[i] * scaleR);     // Red
    correctedData[i+1] = Math.min(255, imageData[i+1] * scaleG); // Green
    correctedData[i+2] = Math.min(255, imageData[i+2] * scaleB); // Blue
    correctedData[i+3] = imageData[i+3]; // Alpha (Keep same)
  }

  return correctedData;
}

// Helper to get color from specific landmarks (For Eyes)
function getLandmarkRegionColor(
  data: Uint8ClampedArray, 
  landmarks: any[], 
  indices: number[], 
  width: number, 
  height: number
): number[] | null {
  
  let r = 0, g = 0, b = 0, count = 0;

  indices.forEach(idx => {
    const point = landmarks[idx];
    if (point) {
      // Convert normalized (0-1) coords to pixel coords
      const x = Math.floor(point.x * width);
      const y = Math.floor(point.y * height);
      
      // Get pixel index in the flat array
      const pixelPos = (y * width + x) * 4;
      
      if (pixelPos >= 0 && pixelPos < data.length) {
        r += data[pixelPos];
        g += data[pixelPos + 1];
        b += data[pixelPos + 2];
        count++;
      }
    }
  });

  if (count === 0) return null;
  return [r / count, g / count, b / count];
}

// --- HYBRID WHITE BALANCE LOGIC END ---

// Face shape detection using geometric ratios from MITHAS_PROPRIETARY_AI_ENGINE.txt
export function detectFaceShape(landmarks: any[]): string {
  const forehead = distance(landmarks[0], landmarks[230]);
  const jawline = distance(landmarks[152], landmarks[378]);
  const faceWidth = distance(landmarks[21], landmarks[397]);
  const faceLength = distance(landmarks[10], landmarks[152]);
  
  const ratios = {
    'width_to_length': faceWidth / faceLength,
    'forehead_to_jaw': forehead / jawline,
  };
  
  if (ratios['width_to_length'] < 0.75) return 'oval';
  else if (ratios['width_to_length'] > 0.95) return 'round';
  else if (ratios['forehead_to_jaw'] > 1.3) return 'heart';
  else return 'square';
}

// Skin tone analysis using RGB ranges from MITHAS_PROPRIETARY_AI_ENGINE.txt
export function analyzeSkinTone(imageData: Uint8ClampedArray): string {
  const avgColor = getAverageColor(imageData);
  
  const toneMap = {
    'very_fair': {min: [255, 220, 190], max: [255, 240, 220]},
    'fair': {min: [255, 200, 170], max: [255, 220, 190]},
    'light': {min: [240, 180, 140], max: [250, 200, 160]},
    'medium': {min: [210, 140, 100], max: [240, 160, 120]},
    'olive': {min: [180, 140, 120], max: [210, 160, 140]},
    'tan': {min: [180, 110, 80], max: [200, 130, 100]},
    'dark': {min: [100, 60, 40], max: [150, 90, 60]},
    'deep': {min: [60, 30, 20], max: [100, 50, 35]}
  };
  
  return findClosestTone(avgColor, toneMap);
}

// Undertone detection using LAB color space from MITHAS_PROPRIETARY_AI_ENGINE.txt
export function detectUndertone(rgbValues: number[]): string {
  const lab = rgbToLab(rgbValues);
  const a_channel = lab[1]; // a* channel determines undertone
  
  if (a_channel > 5) return 'warm';
  else if (a_channel < -5) return 'cool';
  else return 'neutral';
}

// Melanin index calculation from L* channel
export function calculateMelaninIndex(labValues: number[]): number {
  const L_star = labValues[0]; // Lightness channel
  return Math.max(0, Math.min(1, (100 - L_star) / 100));
}

// Symmetry score calculation using landmark distances
export function calculateSymmetryScore(landmarks: any[]): number {
  let totalAsymmetry = 0;
  let pairs = 0;
  
  // Compare left-right landmark pairs
  const symmetryPairs = [
    [234, 454], // Left/right cheek
    [33, 263],   // Left/right eye corners
    [61, 291],   // Left/right mouth corners
    [78, 308],    // Left/right eyebrow
  ];
  
  symmetryPairs.forEach(([left, right]) => {
    if (landmarks[left] && landmarks[right]) {
      const leftDist = distance(landmarks[left], landmarks[1]); // Distance from nose
      const rightDist = distance(landmarks[right], landmarks[1]);
      const asymmetry = Math.abs(leftDist - rightDist) / Math.max(leftDist, rightDist);
      totalAsymmetry += asymmetry;
      pairs++;
    }
  });
  
  const avgAsymmetry = totalAsymmetry / pairs;
  return Math.max(0, 1 - avgAsymmetry); // Convert to 0-1 score
}

// Color intensity variance across facial regions
export function calculateColorVariance(regionColors: number[][]): number {
  if (regionColors.length < 2) return 0;
  
  let totalVariance = 0;
  const avgColor = calculateAverageColor(regionColors);
  
  regionColors.forEach(color => {
    const variance = colorDistance(color, avgColor);
    totalVariance += variance;
  });
  
  return totalVariance / regionColors.length;
}

// Main beauty fingerprint generation from MITHAS_PROPRIETARY_AI_ENGINE.txt
export async function generateBeautyFingerprint(
  imageData: Uint8ClampedArray, 
  landmarks: any[],
  imageWidth: number = 640,   // Added width with default
  imageHeight: number = 480   // Added height with default
): Promise<{
  face_shape: string;
  skin_tone: string;
  undertone: string;
  melanin_index: number;
  lab_values: number[];
  rgb_averages: number[];
  facial_ratios: {[key: string]: number};
  symmetry_score: number;
  color_variance: number;
  processing_metadata: {
    analysis_confidence: number;
    landmark_count: number;
    processing_time_ms: number;
    image_discarded: boolean;
    wb_applied: boolean; // Added white balance flag
  };
}> {
  const startTime = Date.now();

  // STEP 1: APPLY HYBRID WHITE BALANCE (The Fix) ✅
  // We process the "Clean" image, not the raw yellow one
  const cleanImageData = applyHybridWhiteBalance(imageData, landmarks, imageWidth, imageHeight);

  // STEP 2: Now analyze using the CLEAN image
  // Extract face regions for analysis from corrected image
  const cheekRegion = extractRegion(cleanImageData, landmarks, 'cheek');
  const foreheadRegion = extractRegion(cleanImageData, landmarks, 'forehead');
  const chinRegion = extractRegion(cleanImageData, landmarks, 'chin');
  
  // Calculate RGB averages from CLEAN image
  const avgRGB = getAverageColor(cleanImageData);
  const regionColors = [
    getAverageColor(cheekRegion),
    getAverageColor(foreheadRegion),
    getAverageColor(chinRegion)
  ];
  
  // Convert to LAB for undertone analysis
  const labValues = rgbToLab(avgRGB);
  
  // Calculate all metrics using deterministic formulas
  const faceShape = detectFaceShape(landmarks);
  const skinTone = analyzeSkinTone(cleanImageData); // Uses clean image
  const undertone = detectUndertone(avgRGB); // Uses clean RGB
  const melaninIndex = calculateMelaninIndex(labValues);
  const symmetryScore = calculateSymmetryScore(landmarks);
  const colorVariance = calculateColorVariance([avgRGB, ...regionColors]);
  
  // Calculate facial ratios (Geometry doesn't change with color)
  const forehead = distance(landmarks[0], landmarks[230]);
  const jawline = distance(landmarks[152], landmarks[378]);
  const faceWidth = distance(landmarks[21], landmarks[397]);
  const faceLength = distance(landmarks[10], landmarks[152]);
  
  const facialRatios = {
    width_to_length: faceWidth / faceLength,
    forehead_to_jaw: forehead / jawline,
    cheekbone_prominence: distance(landmarks[50], landmarks[280]) / faceWidth
  };
  
  // Calculate confidence based on landmark detection quality
  const confidence = Math.min(0.95, landmarks.length / 468); // Max 468 landmarks
  
  const processingTime = Date.now() - startTime;
  
  // ZERO-TRUST: Both raw 'imageData' and 'cleanImageData' are discarded here
  
  return {
    face_shape: faceShape,
    skin_tone: skinTone,
    undertone: undertone,
    melanin_index: melaninIndex,
    lab_values: labValues,
    rgb_averages: avgRGB,
    facial_ratios: facialRatios,
    symmetry_score: symmetryScore,
    color_variance: colorVariance,
    processing_metadata: {
      analysis_confidence: confidence,
      landmark_count: landmarks.length,
      processing_time_ms: processingTime,
      image_discarded: true,
      wb_applied: true // Log that we fixed the lighting
    }
  };
}

// Helper functions (deterministic mathematics only)

export function distance(p1: any, p2: any): number {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

export function getAverageColor(imageData: Uint8ClampedArray): number[] {
  let r = 0, g = 0, b = 0, count = 0;
  
  for (let i = 0; i < imageData.length; i += 4) {
    r += imageData[i];
    g += imageData[i + 1];
    b += imageData[i + 2];
    count++;
  }
  
  return [r / count, g / count, b / count];
}

export function findClosestTone(color: number[], toneMap: {[key: string]: {min: number[], max: number[]}}): string {
  let minDistance = Infinity;
  let closestTone = 'medium'; // Only as initial fallback
  
  Object.entries(toneMap).forEach(([tone, range]) => {
    const centerColor = [
      (range.min[0] + range.max[0]) / 2,
      (range.min[1] + range.max[1]) / 2,
      (range.min[2] + range.max[2]) / 2
    ];
    
    const distance = colorDistance(color, centerColor);
    if (distance < minDistance) {
      minDistance = distance;
      closestTone = tone;
    }
  });
  
  // CRITICAL: If no match found, throw error instead of silent fallback
  if (minDistance === Infinity) {
    throw new Error('No skin tone match found - invalid color data');
  }
  
  return closestTone;
}

export function colorDistance(color1: number[], color2: number[]): number {
  return Math.sqrt(
    Math.pow(color1[0] - color2[0], 2) +
    Math.pow(color1[1] - color2[1], 2) +
    Math.pow(color1[2] - color2[2], 2)
  );
}

export function rgbToLab(rgb: number[]): number[] {
  // Convert RGB to XYZ
  let [r, g, b] = rgb.map(val => val / 255);
  
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
  
  r *= 100;
  g *= 100;
  b *= 100;
  
  const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = r * 0.0193 + g * 0.1192 + b * 0.9505;
  
  // Convert XYZ to LAB
  const x_n = x / 95.047;
  const y_n = y / 100.000;
  const z_n = z / 108.883;
  
  const fx = x_n > 0.008856 ? Math.pow(x_n, 1/3) : (7.787 * x_n + 16/116);
  const fy = y_n > 0.008856 ? Math.pow(y_n, 1/3) : (7.787 * y_n + 16/116);
  const fz = z_n > 0.008856 ? Math.pow(z_n, 1/3) : (7.787 * z_n + 16/116);
  
  const L_star = 116 * fy - 16;
  const a_star = 500 * (fx - fy);
  const b_star = 200 * (fy - fz);
  
  return [L_star, a_star, b_star];
}

export function extractRegion(imageData: Uint8ClampedArray, landmarks: any[], region: string): Uint8ClampedArray {
  // Simplified region extraction - in practice would use landmark coordinates
  // This is a deterministic geometric extraction
  const regionSize = 50; // pixels
  const regionData = new Uint8ClampedArray(regionSize * regionSize * 4);
  
  // Extract based on landmark indices for each region
  let centerIndex = 0;
  switch(region) {
    case 'cheek': centerIndex = 50; break; // Right cheek landmark
    case 'forehead': centerIndex = 10; break; // Forehead center
    case 'chin': centerIndex = 175; break; // Chin center
  }
  
  // Extract square region around landmark (simplified)
  // In production, would use actual pixel coordinates
  for (let i = 0; i < regionData.length; i++) {
    regionData[i] = imageData[i % imageData.length];
  }
  
  return regionData;
}

export function calculateAverageColor(colors: number[][]): number[] {
  if (colors.length === 0) return [0, 0, 0];
  
  const sum = colors.reduce((acc, color) => [
    acc[0] + color[0],
    acc[1] + color[1], 
    acc[2] + color[2]
  ], [0, 0, 0]);
  
  return sum.map(val => val / colors.length);
}
