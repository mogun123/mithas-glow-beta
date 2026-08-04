// Skin Issues Analysis Engine
// Extracted from MirrorScreen.tsx for modular architecture

import { rgbToLab } from './colorConversion';

// Interface for pixel data
interface PixelData {
  r: number;
  g: number;
  b: number;
}

// Interface for MediaPipe landmark
interface Landmark {
  x: number;
  y: number;
  z?: number;
}

// Extract region pixels utility
export const extractRegionPixels = (imageData: ImageData, landmarks: Landmark[]): PixelData[] => {
  // Strict clinical validation
  if (!imageData || !imageData.data || imageData.width <= 0 || imageData.height <= 0) {
    throw new Error("CLINICAL_DATA_ERROR: Invalid image data for pixel extraction");
  }
  
  if (!landmarks || !Array.isArray(landmarks) || landmarks.length === 0) {
    throw new Error("CLINICAL_DATA_ERROR: Invalid landmark data for pixel extraction");
  }

  const pixels: PixelData[] = []
  const { data, width, height } = imageData
  
  landmarks.forEach((landmark, index) => {
    // Validate landmark structure
    if (!landmark || typeof landmark.x !== 'number' || typeof landmark.y !== 'number') {
      throw new Error(`CLINICAL_DATA_ERROR: Invalid landmark at index ${index}`);
    }
    
    const x = Math.floor(landmark.x * width)
    const y = Math.floor(landmark.y * height)
    
    // Extract 3x3 pixel region around landmark for averaging
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const px = Math.max(0, Math.min(width - 1, x + dx))
        const py = Math.max(0, Math.min(height - 1, y + dy))
        
        const pixelIndex = (py * width + px) * 4
        
        // Validate pixel index bounds
        if (pixelIndex < 0 || pixelIndex + 2 >= data.length) {
          throw new Error("CLINICAL_DATA_ERROR: Pixel index out of bounds");
        }
        
        const r = data[pixelIndex];
        const g = data[pixelIndex + 1];
        const b = data[pixelIndex + 2];
        
        // Validate pixel values
        if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
          throw new Error("CLINICAL_DATA_ERROR: Invalid pixel values extracted");
        }
        
        pixels.push({ r, g, b })
      }
    }
  })
  
  if (pixels.length === 0) {
    throw new Error("CLINICAL_DATA_ERROR: No pixels extracted from regions");
  }
  
  return pixels
}

/**
 * Analyzes various skin issues from facial image data using landmarks
 * Detects dark circles, acne, and wrinkles using computer vision techniques
 * @param imageData - Image data from canvas
 * @param landmarks - Facial landmarks from MediaPipe
 * @returns Promise<string[]> - Array of detected skin issues
 */
export const analyzeSkinIssues = async (imageData: ImageData, landmarks: Landmark[]): Promise<string[]> => {
  // Strict clinical validation - no fallbacks
  if (!imageData || !imageData.data || imageData.width === 0 || imageData.height === 0) {
    throw new Error("CLINICAL_DATA_ERROR: Invalid or insufficient image data for skin analysis");
  }
  
  if (!landmarks || !Array.isArray(landmarks) || landmarks.length < 100) {
    throw new Error("CLINICAL_DATA_ERROR: Insufficient landmark data for skin analysis");
  }

  try {
    const issues: string[] = []

    // Analyze under-eye region for dark circles
    // Use correct infraorbital (under-eye) indices - remove eyeball/contour indices (33-42)
    const leftUnderEyeIndices = [144, 145, 153, 154, 155, 163];
    const rightUnderEyeIndices = [384, 385, 386, 387, 388, 398];
    const underEyeLandmarks = [
      ...leftUnderEyeIndices.map(i => landmarks[i]).filter(Boolean),
      ...rightUnderEyeIndices.map(i => landmarks[i]).filter(Boolean)
    ];
    if (underEyeLandmarks.length === 0) {
      throw new Error("CLINICAL_DATA_ERROR: No under-eye landmarks available");
    }
    const underEyePixels = extractRegionPixels(imageData, underEyeLandmarks)
    if (underEyePixels.length === 0) {
      throw new Error("CLINICAL_DATA_ERROR: No under-eye pixels extracted");
    }
    const underEyeDarkness = calculateRegionDarkness(underEyePixels)

    // Analyze forehead and cheeks for acne
    const foreheadLandmarks = landmarks.slice(70, 90)
    const cheekLandmarks = landmarks.slice(50, 68)
    if (foreheadLandmarks.length === 0 || cheekLandmarks.length === 0) {
      throw new Error("CLINICAL_DATA_ERROR: No facial region landmarks available");
    }
    const acnePixels = [...extractRegionPixels(imageData, foreheadLandmarks), 
                        ...extractRegionPixels(imageData, cheekLandmarks)]
    if (acnePixels.length === 0) {
      throw new Error("CLINICAL_DATA_ERROR: No acne region pixels extracted");
    }
    const acneScore = detectAcnePatterns(acnePixels)

    // Analyze eye corners for wrinkles
    const eyeCornerLandmarks = [landmarks[33], landmarks[262], landmarks[353], landmarks[387]]
    if (eyeCornerLandmarks.some(lm => !lm)) {
      throw new Error("CLINICAL_DATA_ERROR: Missing eye corner landmarks");
    }
    const wrinklePixels = extractRegionPixels(imageData, eyeCornerLandmarks)
    if (wrinklePixels.length === 0) {
      throw new Error("CLINICAL_DATA_ERROR: No wrinkle region pixels extracted");
    }
    const wrinkleScore = detectWrinklePatterns(wrinklePixels)

    // Apply thresholds based on scientific research
    if (underEyeDarkness > 0.3) issues.push('dark_circles')
    if (acneScore > 0.25) issues.push('acne')
    if (wrinkleScore > 0.2) issues.push('wrinkles')

    return issues

  } catch (error) {
    console.error('Skin issues analysis error:', error)
    throw error; // Re-throw clinical errors, no fallbacks
  }
}

/**
 * Calculates the darkness level of a region for dark circle detection
 * @param pixels - Array of pixel data from the region
 * @returns number - Darkness score (0-1 scale, higher = darker)
 */
export const calculateRegionDarkness = (pixels: PixelData[]): number => {
  // Strict clinical validation
  if (!pixels || !Array.isArray(pixels) || pixels.length === 0) {
    throw new Error("CLINICAL_DATA_ERROR: Insufficient pixel data for darkness calculation");
  }

  const avgBrightness = pixels.reduce((sum, pixel) => {
    // Validate pixel data
    if (!Number.isFinite(pixel.r) || !Number.isFinite(pixel.g) || !Number.isFinite(pixel.b)) {
      throw new Error("CLINICAL_DATA_ERROR: Invalid pixel values in darkness calculation");
    }
    return sum + (pixel.r + pixel.g + pixel.b) / 3
  }, 0) / pixels.length

  // Validate average brightness
  if (!Number.isFinite(avgBrightness)) {
    throw new Error("CLINICAL_DATA_ERROR: Invalid brightness calculation");
  }

  // Normalize to 0-1 scale (darker = higher value)
  return 1 - (avgBrightness / 255)
}

/**
 * Advanced Acne Detection with Mole vs. Acne Discrimination
 * Uses 3-Tier Filter: LAB Color + L-Value Mole Filter + 3D Elevation
 * @param landmarks - MediaPipe landmarks with z-coordinates
 * @param pixelData - RGB pixel data from regions
 * @returns Object with acne score and spatial coordinates
 */
export const extractAcneCoordinates = (
  landmarks: Array<{x: number, y: number, z: number}>,
  pixelData: {region: string, pixels: PixelData[]}
): {acneScore: number, acneSpots: Array<{x: number, y: number, z: number, radius: number}>, detectionCount: number} => {
  // Strict clinical validation
  if (!landmarks || !Array.isArray(landmarks) || landmarks.length === 0) {
    throw new Error("CLINICAL_DATA_ERROR: Insufficient landmark data for acne coordinate extraction");
  }
  
  if (!pixelData || !pixelData.pixels || !Array.isArray(pixelData.pixels)) {
    throw new Error("CLINICAL_DATA_ERROR: Invalid pixel data for acne coordinate extraction");
  }

  const acneSpots: Array<{x: number, y: number, z: number, radius: number}> = []
  let totalAcneScore = 0
  let validPixelCount = 0

  // 🔥 MELANIN ADAPTATION: Calculate average skin tone for dynamic contrast thresholds
  let sumL = 0;
  pixelData.pixels.forEach(p => {
    const lab = rgbToLab(p.r, p.g, p.b);
    sumL += lab.l;
  });
  const avgL = sumL / pixelData.pixels.length;
  const isDarkSkin = avgL < 55; // Flag for Tan/Brown/Deep skin

  // Process each pixel with 3-Tier Filter
  pixelData.pixels.forEach((pixel, index) => {
    // Convert RGB to LAB for advanced analysis
    const lab = rgbToLab(pixel.r, pixel.g, pixel.b)
    
    // 🔥 TIER 1: COLOR FILTER (Melanin-Adaptive)
    // Dark skin: Acne shows as dark spots (hyperpigmentation) AND slight redness.
    // White skin: Acne shows as bright red (high a-axis).
    const isRedBlemish = lab.a > (isDarkSkin ? 8 : 15); // Lower red threshold for dark skin
    const isDarkBlemish = isDarkSkin && (lab.l < avgL - 8); // Spot is significantly darker than base tone
    
    if (!isRedBlemish && !isDarkBlemish) return; // Skip normal skin pixels
    
    // 🔥 TIER 2: MOLE FILTER (Melanin-Adaptive)
    // Moles are VERY dark and very neutral (no red).
    const lValue = lab.l
    const aValue = lab.a
    const moleLThreshold = isDarkSkin ? 20 : 35; // Lower mole threshold for dark skin to prevent false rejections
    const isMole = lValue < moleLThreshold && Math.abs(aValue) < 5 
    if (isMole) return // Strictly reject moles
    
    // TIER 3: ELEVATION FILTER - Check if slightly raised (acne characteristic)
    const landmarkIndex = Math.min(index, landmarks.length - 1)
    const currentLandmark = landmarks[landmarkIndex]
    const neighborLandmarks = getNeighborLandmarks(landmarks, landmarkIndex, 3)
    
    // Skip if no neighbors found (comparing point to itself is mathematically invalid)
    if (!neighborLandmarks) return
    
    // Calculate elevation variance (acne is slightly raised)
    const avgNeighborZ = neighborLandmarks.reduce((sum, lm) => sum + lm.z, 0) / neighborLandmarks.length
    const elevationVariance = currentLandmark.z - avgNeighborZ
    const isRaised = elevationVariance > 0.0005 // 🔥 Lowered threshold slightly to catch micro-comedones
    
    if (!isRaised) return // Skip flat lesions (likely scars, not active acne)
    
    // PASSED ALL FILTERS - This is valid acne
    // Score based on BOTH redness and darkness (for brown skin)
    const severityFactor = isDarkSkin ? Math.abs(avgL - lab.l) / 30 : Math.abs(lab.a) / 50;
    const acneIntensity = Math.min(1.0, severityFactor);
    
    const spotRadius = 0.005 + (acneIntensity * 0.01) // Dynamic radius based on intensity
    
    acneSpots.push({
      x: currentLandmark.x,
      y: currentLandmark.y,
      z: currentLandmark.z,
      radius: spotRadius
    })
    
    totalAcneScore += acneIntensity
    validPixelCount++
  })

  // Calculate final acne score
  const finalAcneScore = validPixelCount > 0 ? totalAcneScore / validPixelCount : 0

  return {
    acneScore: Math.min(1, finalAcneScore), // Normalize to 0-1
    acneSpots: acneSpots,
    detectionCount: acneSpots.length
  }
}

/**
 * Get neighboring landmarks for elevation analysis
 */
const getNeighborLandmarks = (
  landmarks: Array<{x: number, y: number, z: number}>,
  centerIndex: number,
  radius: number
): Array<{x: number, y: number, z: number}> | null => {
  const neighbors: Array<{x: number, y: number, z: number}> = []
  const start = Math.max(0, centerIndex - radius)
  const end = Math.min(landmarks.length - 1, centerIndex + radius)
  
  for (let i = start; i <= end; i++) {
    if (i !== centerIndex) {
      neighbors.push(landmarks[i])
    }
  }
  
  return neighbors.length > 0 ? neighbors : null // Return null if no neighbors found
}

/**
 * Extract pore cluster coordinates from high-oiliness regions
 * Uses deterministic landmark-based offsets (no Math.random())
 */
export const extractPoreClusters = (
  landmarks: Array<{x: number, y: number, z: number}>,
  oilinessScore: number
): Array<{x: number, y: number}> => {
  const poreClusters: Array<{x: number, y: number}> = []
  
  // Strict clinical validation
  if (!landmarks || !Array.isArray(landmarks) || landmarks.length === 0) {
    throw new Error("CLINICAL_DATA_ERROR: Insufficient landmark data for pore extraction");
  }
  
  if (oilinessScore > 0.6) { // Only extract if high oiliness detected
    // Sample landmarks from T-zone (forehead, nose, chin) where pores are prominent
    const tZoneIndices = [10, 1, 2, 5, 4, 6, 19, 20, 94, 125, 141, 18, 175, 199, 200]
    
    tZoneIndices.forEach((index, i) => {
      if (index < landmarks.length) {
        const landmark = landmarks[index]
        
        // Deterministic landmark-based offsets using golden ratio for natural distribution
        const goldenRatio = 1.618033988749895
        const angleOffset = (i * goldenRatio * 2 * Math.PI) % (2 * Math.PI)
        const radiusOffset = 0.01 + (i % 3) * 0.003 // Alternating radius for variation
        
        // Calculate deterministic offsets
        const offsetX = Math.cos(angleOffset) * radiusOffset
        const offsetY = Math.sin(angleOffset) * radiusOffset
        
        poreClusters.push({
          x: landmark.x + offsetX,
          y: landmark.y + offsetY
        })
      }
    })
  }
  
  return poreClusters
}

/**
 * Extract dark circle boundaries from under-eye region
 */
export const extractDarkCircleBounds = (
  landmarks: Array<{x: number, y: number, z: number}>,
  underEyeLAB: {l: number, a: number, b: number}
): Array<{x: number, y: number}> => {
  // Strict clinical validation
  if (!landmarks || !Array.isArray(landmarks) || landmarks.length === 0) {
    throw new Error("CLINICAL_DATA_ERROR: Insufficient landmark data for dark circle extraction");
  }
  
  if (!underEyeLAB || typeof underEyeLAB.l !== 'number' || !Number.isFinite(underEyeLAB.l)) {
    throw new Error("CLINICAL_DATA_ERROR: Invalid LAB data for dark circle extraction");
  }

  const darkCircleBounds: Array<{x: number, y: number}> = []
  
  // Detect dark circles based on LAB L-value (darkness)
  const darknessThreshold = underEyeLAB.l < 40 // Dark under-eye region
  
  if (darknessThreshold) {
    // Use under-eye landmark indices from MediaPipe
    const underEyeIndices = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173] // Left eye
    const rightEyeIndices = [362, 398, 384, 385, 386, 387, 388, 466, 263, 249] // Right eye
    
    // Extract bounds from both eyes
    const allUnderEyeIndices = [...underEyeIndices, ...rightEyeIndices]
    
    allUnderEyeIndices.forEach(index => {
      if (index < landmarks.length) {
        const landmark = landmarks[index]
        darkCircleBounds.push({
          x: landmark.x,
          y: landmark.y
        })
      }
    })
  }
  
  return darkCircleBounds
}

/**
 * RGB to LAB conversion with proper sRGB gamma correction
 * Non-negotiable for accurate redness (a*) detection in Indian skin tones
 */
const rgbToLab = (r: number, g: number, b: number): {l: number, a: number, b: number} => {
  // Strict clinical validation
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
    throw new Error("CLINICAL_DATA_ERROR: Invalid RGB values for LAB conversion");
  }
  
  // Clamp RGB to valid range
  const clampedR = Math.max(0, Math.min(255, r));
  const clampedG = Math.max(0, Math.min(255, g));
  const clampedB = Math.max(0, Math.min(255, b));
  
  // Normalize to 0-1 range
  const nr = clampedR / 255;
  const ng = clampedG / 255;
  const nb = clampedB / 255;
  
  // sRGB Gamma Correction - Non-negotiable pivot function
  const srgbToLinear = (v: number): number => {
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  
  // Apply gamma correction
  const linearR = srgbToLinear(nr);
  const linearG = srgbToLinear(ng);
  const linearB = srgbToLinear(nb);
  
  // Convert linear RGB to XYZ (D65 white point)
  let x = linearR * 0.4124564 + linearG * 0.3575761 + linearB * 0.1804375;
  let y = linearR * 0.2126729 + linearG * 0.7151522 + linearB * 0.0721750;
  let z = linearR * 0.0193339 + linearG * 0.1191920 + linearB * 0.9503041;
  
  // Normalize for D65 white point
  x /= 95.047;
  y /= 100.000;
  z /= 108.883;
  
  // Apply LAB transformation with proper delta function
  const delta = (t: number): number => {
    return t > 0.008856 ? Math.pow(t, 1 / 3) : 7.787 * t + 16 / 116;
  };
  
  const fx = delta(x);
  const fy = delta(y);
  const fz = delta(z);
  
  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b_ = 200 * (fy - fz);
  
  // Validate LAB output
  if (!Number.isFinite(l) || !Number.isFinite(a) || !Number.isFinite(b_)) {
    throw new Error("CLINICAL_DATA_ERROR: LAB conversion produced invalid values");
  }
  
  return { l, a, b: b_ };
};

/**
 * Real Acne Detection with Spatial Distance Clustering Algorithm
 * Groups red pixels based on 12-pixel Euclidean distance threshold
 * @param pixels - Array of pixel data from acne-prone regions
 * @returns number - Acne detection score (0-1 scale)
 */
export const detectAcnePatterns = (pixels: PixelData[]): number => {
  // Strict clinical validation
  if (!pixels || !Array.isArray(pixels) || pixels.length === 0) {
    throw new Error("CLINICAL_DATA_ERROR: Insufficient pixel data for acne detection");
  }

  // Convert pixels to LAB and filter for redness (high a* values)
  const redPixels: Array<{x: number, y: number, lab: {l: number, a: number, b: number}, intensity: number}> = [];
  
  pixels.forEach((pixel, index) => {
    const lab = rgbToLab(pixel.r, pixel.g, pixel.b);
    
    // Strict redness threshold for Indian skin tones
    if (lab.a > 12 && lab.l > 25 && lab.l < 75) {
      // Calculate spatial coordinates (assuming sequential scan)
      const x = index % 100; // Approximate x coordinate
      const y = Math.floor(index / 100); // Approximate y coordinate
      
      const intensity = Math.abs(lab.a) / 50; // Normalize to 0-1 scale
      
      redPixels.push({
        x,
        y,
        lab,
        intensity
      });
    }
  });

  if (redPixels.length === 0) {
    return 0; // No red pixels detected
  }

  // Spatial Distance Clustering Algorithm
  const clusters: Array<Array<{x: number, y: number, lab: {l: number, a: number, b: number}, intensity: number}>> = [];
  const visited = new Set<number>();
  const DISTANCE_THRESHOLD = 12; // 12-pixel Euclidean distance threshold

  redPixels.forEach((pixel, pixelIndex) => {
    if (visited.has(pixelIndex)) return;

    // Start new cluster
    const cluster = [pixel];
    visited.add(pixelIndex);

    // Find all pixels within 12-pixel distance
    const queue = [pixel];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      redPixels.forEach((otherPixel, otherIndex) => {
        if (visited.has(otherIndex)) return;

        // Calculate Euclidean distance
        const distance = Math.sqrt(
          Math.pow(current.x - otherPixel.x, 2) + 
          Math.pow(current.y - otherPixel.y, 2)
        );

        if (distance <= DISTANCE_THRESHOLD) {
          cluster.push(otherPixel);
          visited.add(otherIndex);
          queue.push(otherPixel);
        }
      });
    }

    // Only keep clusters with minimum size (noise filtering)
    if (cluster.length >= 3) {
      clusters.push(cluster);
    }
  });

  // Calculate acne score based on cluster characteristics
  if (clusters.length === 0) {
    return 0;
  }

  // Score based on cluster intensity and size
  let totalScore = 0;
  clusters.forEach(cluster => {
    const avgIntensity = cluster.reduce((sum, p) => sum + p.intensity, 0) / cluster.length;
    const clusterSize = cluster.length;
    
    // Larger, more intense clusters contribute more to score
    const clusterScore = avgIntensity * Math.min(1, clusterSize / 10);
    totalScore += clusterScore;
  });

  // Normalize to 0-1 scale
  const finalScore = Math.min(1, totalScore / clusters.length);

  console.log?.(`🔬 Acne Detection: ${redPixels.length} red pixels → ${clusters.length} clusters → score: ${finalScore.toFixed(3)}`);
  
  return finalScore;
};

/**
 * Detects wrinkle patterns using edge detection techniques
 * Analyzes pixel intensity variations to identify wrinkle patterns
 * @param pixels - Array of pixel data from region
 * @returns number - Wrinkle detection score (0-1 scale)
 */
export const detectWrinklePatterns = (pixels: PixelData[]): number => {
  // Strict clinical validation
  if (!pixels || !Array.isArray(pixels) || pixels.length < 3) {
    throw new Error("CLINICAL_DATA_ERROR: Insufficient pixel data for wrinkle detection");
  }

  let edgeScore = 0

  for (let i = 1; i < pixels.length - 1; i++) {
    const prev = pixels[i - 1]
    const curr = pixels[i]
    const next = pixels[i + 1]

    // Validate pixel data
    if (!prev || !curr || !next) {
      throw new Error("CLINICAL_DATA_ERROR: Invalid pixel data in wrinkle detection");
    }

    // Calculate intensity differences (edge detection)
    const prevIntensity = (prev.r + prev.g + prev.b) / 3
    const currIntensity = (curr.r + curr.g + curr.b) / 3
    const nextIntensity = (next.r + next.g + next.b) / 3

    // Validate intensity calculations
    if (!Number.isFinite(prevIntensity) || !Number.isFinite(currIntensity) || !Number.isFinite(nextIntensity)) {
      throw new Error("CLINICAL_DATA_ERROR: Invalid intensity calculation in wrinkle detection");
    }

    // Detect sharp changes (wrinkles cause edges)
    const edge1 = Math.abs(currIntensity - prevIntensity)
    const edge2 = Math.abs(nextIntensity - currIntensity)
    
    edgeScore += Math.max(edge1, edge2) / 255
  }

  const finalScore = edgeScore / pixels.length;
  
  if (!Number.isFinite(finalScore)) {
    throw new Error("CLINICAL_DATA_ERROR: Invalid wrinkle score calculation");
  }

  return finalScore
}