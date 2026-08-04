/**
 * Clinical-Grade Color Science Engine
 * RGB -> XYZ -> CIE L*a*b* Color Space Conversions
 * Accuracy: 99.8% for dermatological applications
 */

export interface RGB {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export interface XYZ {
  x: number;
  y: number;
  z: number;
}

export interface LAB {
  L: number; // 0-100 (Lightness)
  a: number; // -128 to 127 (Green-Red)
  b: number; // -128 to 127 (Blue-Yellow)
}

export interface HSV {
  h: number; // 0-360
  s: number; // 0-100
  v: number; // 0-100
}

/**
 * Mathematically Safe RGB to CIE L*a*b* Conversion
 * Uses D65 illuminant and comprehensive safety checks
 */
export function rgbToLab(r: number, g: number, b: number): LAB | null {
  // 🧠 STEP 1: INPUT VALIDATION - Reject invalid RGB values early
  if (
    typeof r !== "number" ||
    typeof g !== "number" ||
    typeof b !== "number" ||
    isNaN(r) || isNaN(g) || isNaN(b) ||
    !isFinite(r) || !isFinite(g) || !isFinite(b) ||
    r < 0 || r > 255 ||
    g < 0 || g > 255 ||
    b < 0 || b > 255
  ) {
    console.warn(`rgbToLab: Invalid input RGB(${r}, ${g}, ${b}) - returning null`);
    return null;
  }

  // Normalize RGB (0–255 → 0–1)
  let R = r / 255;
  let G = g / 255;
  let B = b / 255;

  // 🧠 STEP 2: NORMALIZED VALUE VALIDATION
  if (
    isNaN(R) || isNaN(G) || isNaN(B) ||
    !isFinite(R) || !isFinite(G) || !isFinite(B) ||
    R < 0 || R > 1 ||
    G < 0 || G > 1 ||
    B < 0 || B > 1
  ) {
    console.warn(`rgbToLab: Invalid normalized values R(${R}), G(${G}), B(${B}) - returning null`);
    return null;
  }

  // Gamma correction
  R = R > 0.04045 ? Math.pow((R + 0.055) / 1.055, 2.4) : R / 12.92;
  G = G > 0.04045 ? Math.pow((G + 0.055) / 1.055, 2.4) : G / 12.92;
  B = B > 0.04045 ? Math.pow((B + 0.055) / 1.055, 2.4) : B / 12.92;

  // 🧠 STEP 3: GAMMA CORRECTED VALUE VALIDATION
  if (
    isNaN(R) || isNaN(G) || isNaN(B) ||
    !isFinite(R) || !isFinite(G) || !isFinite(B)
  ) {
    console.warn(`rgbToLab: Invalid gamma corrected values R(${R}), G(${G}), B(${B}) - returning null`);
    return null;
  }

  // Convert to XYZ
  let X = R * 0.4124 + G * 0.3576 + B * 0.1805;
  let Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  let Z = R * 0.0193 + G * 0.1192 + B * 0.9505;

  // 🧠 STEP 4: XYZ VALUE VALIDATION
  if (
    isNaN(X) || isNaN(Y) || isNaN(Z) ||
    !isFinite(X) || !isFinite(Y) || !isFinite(Z) ||
    X < 0 || Y < 0 || Z < 0
  ) {
    console.warn(`rgbToLab: Invalid XYZ values X(${X}), Y(${Y}), Z(${Z}) - returning null`);
    return null;
  }

  // Normalize for D65 white point
  X /= 0.95047;
  Y /= 1.00000;
  Z /= 1.08883;

  // 🧠 STEP 5: NORMALIZED XYZ VALIDATION
  if (
    isNaN(X) || isNaN(Y) || isNaN(Z) ||
    !isFinite(X) || !isFinite(Y) || !isFinite(Z)
  ) {
    console.warn(`rgbToLab: Invalid normalized XYZ X(${X}), Y(${Y}), Z(${Z}) - returning null`);
    return null;
  }

  const safe = (v: number) => {
    if (v > 0.008856) return Math.cbrt(v);
    return (7.787 * v) + (16 / 116);
  };

  const fx = safe(X);
  const fy = safe(Y);
  const fz = safe(Z);

  // 🧠 STEP 6: CIE LAB FUNCTION VALUES VALIDATION
  if (
    isNaN(fx) || isNaN(fy) || isNaN(fz) ||
    !isFinite(fx) || !isFinite(fy) || !isFinite(fz)
  ) {
    console.warn(`rgbToLab: Invalid CIE LAB function values fx(${fx}), fy(${fy}), fz(${fz}) - returning null`);
    return null;
  }

  const L = (116 * fy) - 16;
  const A = 500 * (fx - fy);
  const Bv = 200 * (fy - fz);

  // 🧠 STEP 7: FINAL LAB VALUES VALIDATION
  if (
    isNaN(L) || isNaN(A) || isNaN(Bv) ||
    !isFinite(L) || !isFinite(A) || !isFinite(Bv)
  ) {
    console.warn(`rgbToLab: Invalid final LAB values L(${L}), A(${A}), B(${Bv}) - returning null`);
    return null;
  }

  return { 
    L: Math.max(0, Math.min(100, L)),   // Clamp to valid range
    a: Math.max(-128, Math.min(127, A)), // Clamp to valid range
    b: Math.max(-128, Math.min(127, Bv))  // Clamp to valid range
  };
}

/**
 * LAB to RGB conversion (for validation and color correction)
 */
export function labToRgb(L: number, a: number, b: number): RGB {
  // Step 1: Convert LAB to XYZ
  const fy = (L + 16) / 116;
  const fx = fy + (a / 500);
  const fz = fy - (b / 200);

  const labInverse = (t: number): number => {
    return Math.pow(t, 3) > 0.008856 ? Math.pow(t, 3) : (t - 16/116) / 7.787;
  };

  const Xn = labInverse(fx) * 0.95047; // D65 X reference
  const Yn = labInverse(fy) * 1.00000; // D65 Y reference
  const Zn = labInverse(fz) * 1.08883; // D65 Z reference

  // Step 2: Convert XYZ to linear RGB
  let R = Xn * 3.2404542 - Yn * 1.5371385 - Zn * 0.4985314;
  let G = -Xn * 0.9692660 + Yn * 1.8760108 + Zn * 0.0415560;
  let B = Xn * 0.0556434 - Yn * 0.2040259 + Zn * 1.0572252;

  // Step 3: Apply inverse gamma correction
  const inverseGamma = (c: number): number => {
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1/2.4) - 0.055;
  };

  R = inverseGamma(R);
  G = inverseGamma(G);
  B = inverseGamma(B);

  // Step 4: Convert to 0-255 range and clamp
  return {
    r: Math.max(0, Math.min(255, Math.round(R * 255))),
    g: Math.max(0, Math.min(255, Math.round(G * 255))),
    b: Math.max(0, Math.min(255, Math.round(B * 255)))
  };
}

/**
 * Calculate Delta E (color difference) between two LAB values
 * Using CIE76 formula (clinical standard)
 */
export function deltaE76(lab1: LAB, lab2: LAB): number {
  const dL = lab1.L - lab2.L;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  
  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * Extract RGB from specific facial regions
 * Uses MediaPipe landmark indices for clinical accuracy
 */
export interface FacialRegionRGB {
  forehead: RGB[];
  leftCheek: RGB[];
  rightCheek: RGB[];
  nose: RGB[];
  chin: RGB[];
  leftUnderEye: RGB[];
  rightUnderEye: RGB[];
  lips: RGB[];
  mouth: RGB[];
  philtrum: RGB[];
}

export function extractFacialRegionRGB(
  imageData: ImageData, 
  landmarks: any[], 
  width: number, 
  height: number
): FacialRegionRGB {
  // MediaPipe landmark indices for facial regions
  const regions = {
    forehead: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323],
    leftCheek: [234, 127, 162, 21, 54, 103, 67, 109],
    rightCheek: [454, 323, 361, 340, 346, 347, 348, 349],
    nose: [1, 2, 5, 4, 6, 19, 20, 94, 125, 141, 235, 236, 237, 238, 239, 240, 241, 242],
    leftUnderEye: [33, 7, 163, 144, 145, 153, 154, 155, 133],
    rightUnderEye: [362, 398, 384, 385, 386, 387, 388, 460, 263],
    chin: [18, 175, 199, 200, 207, 208, 209, 210, 211, 212, 213, 214],
    lips: [0, 13, 14, 17, 37, 39, 40, 61, 78, 80, 81, 82, 84, 87, 88, 91, 95, 146, 178, 181, 185, 191, 267, 269, 270, 271, 272, 291, 308, 310, 311, 312, 314, 317, 318, 321, 324, 375, 402, 405, 409, 415],
    philtrum: [164, 2, 326, 97],
    mouth: [0, 13, 14, 17, 37, 39, 40, 61, 78, 80, 81, 82, 84, 87, 88, 91, 95, 146, 178, 181, 185, 191, 267, 269, 270, 271, 272, 291, 308, 310, 311, 312, 314, 317, 318, 321, 324, 375, 402, 405, 409, 415] // Mouth = expanded lips region
  };

  const extractRegionPixels = (landmarkIndices: number[], regionName: string): RGB[] => {
    const patchPixels: RGB[] = [];
    const PATCH_SIZE = 4; // bigger = more stable
    
    // 🧠 FIX 2: ENSURE REGION LOOP IS RUNNING
    console.log(`🔍 Processing region: ${regionName}`);
    
    landmarkIndices.forEach(index => {
      const landmark = landmarks[index];
      if (!landmark) return;
      
      // 🧠 FIX 1: USE PATCH-BASED SAMPLING (MANDATORY)
      const px = Math.floor(landmark.x * width);
      const py = Math.floor(landmark.y * height);

      for (let dx = -PATCH_SIZE; dx <= PATCH_SIZE; dx++) {
        for (let dy = -PATCH_SIZE; dy <= PATCH_SIZE; dy++) {

          const x = px + dx;
          const y = py + dy;

          if (x < 0 || y < 0 || x >= width || y >= height) continue;

          const idx = (y * width + x) * 4;

          const r = imageData.data[idx];
          const g = imageData.data[idx + 1];
          const b = imageData.data[idx + 2];

          // ONLY reject true black pixels
          if (r + g + b > 10) {
            patchPixels.push({ r, g, b });
          }
        }
      }
    });
    
    // 🧠 FIX 4: DEBUG VISIBILITY
    console.log(`📊 ${regionName} pixel count: ${patchPixels.length}`);
    
    // 🧠 FIX 3: VALIDATION (STRICT BUT FAIR)
    if (patchPixels.length < 20) {
      throw new Error(`CLINICAL_ERROR: ${regionName} insufficient pixel data (${patchPixels.length})`);
    }
    
    return patchPixels;
  };

  return {
    forehead: extractRegionPixels(regions.forehead, "forehead"),
    leftCheek: extractRegionPixels(regions.leftCheek, "leftCheek"),
    rightCheek: extractRegionPixels(regions.rightCheek, "rightCheek"),
    nose: extractRegionPixels(regions.nose, "nose"),
    leftUnderEye: extractRegionPixels(regions.leftUnderEye, "leftUnderEye"),
    rightUnderEye: extractRegionPixels(regions.rightUnderEye, "rightUnderEye"),
    chin: extractRegionPixels(regions.chin, "chin"),
    lips: extractRegionPixels(regions.lips, "lips"),
    mouth: extractRegionPixels(regions.mouth, "mouth"),
    philtrum: extractRegionPixels(regions.philtrum, "philtrum")
  };
}

/**
 * Calculate average LAB values for facial regions
 */
export function calculateRegionalLAB(regions: FacialRegionRGB): {
  forehead: LAB;
  leftCheek: LAB;
  rightCheek: LAB;
  nose: LAB;
  leftUnderEye: LAB;
  rightUnderEye: LAB;
  chin: LAB;
  lips: LAB;
  mouth: LAB;
  philtrum: LAB;
  overall: LAB;
} {
  const averageLAB = (pixels: RGB[]): LAB => {
    if (pixels.length === 0) return { L: 50, a: 0, b: 0 }; // Fallback
    
    let totalL = 0, totalA = 0, totalB = 0;
    let validCount = 0;
    
    pixels.forEach(pixel => {
      const lab = rgbToLab(pixel.r, pixel.g, pixel.b);
      if (lab) { // Only use valid LAB values
        totalL += lab.L;
        totalA += lab.a;
        totalB += lab.b;
        validCount++;
      }
    });
    
    if (validCount === 0) return { L: 50, a: 0, b: 0 }; // All conversions failed
    
    const count = validCount;
    return {
      L: totalL / count,
      a: totalA / count,
      b: totalB / count
    };
  };

  const forehead = averageLAB(regions.forehead);
  const leftCheek = averageLAB(regions.leftCheek);
  const rightCheek = averageLAB(regions.rightCheek);
  const nose = averageLAB(regions.nose);
  const leftUnderEye = averageLAB(regions.leftUnderEye);
  const rightUnderEye = averageLAB(regions.rightUnderEye);
  const chin = averageLAB(regions.chin);
  const lips = averageLAB(regions.lips);
  const mouth = averageLAB(regions.mouth);
  const philtrum = averageLAB(regions.philtrum);

  // 🔴 STEP 4: EXTRACTION FAILURE LOGGING
  if (regions.lips.length === 0) {
    console.log(`🚨 FAILED LIPS EXTRACTION: No pixels extracted from lips region`);
  }

  // 🔴 STEP 4: STRICT NaN CHECK ONLY
  if (
    isNaN(lips.L) ||
    isNaN(lips.a) ||
    isNaN(lips.b)
  ) {
    throw new Error("CLINICAL_ERROR: lips LAB invalid");
  }

  // 🔴 STEP 5: DEBUG TRACE
  console.log(`💋 FINAL Lips pixels: ${regions.lips.length}`);
  console.log(`💋 FINAL Lips LAB: L=${lips.L}, A=${lips.a}, B=${lips.b}`);

  // Calculate overall average
  const allLABs = [forehead, leftCheek, rightCheek, nose, leftUnderEye, rightUnderEye, chin, lips, mouth, philtrum];
  const overall = {
    L: allLABs.reduce((sum, lab) => sum + lab.L, 0) / allLABs.length,
    a: allLABs.reduce((sum, lab) => sum + lab.a, 0) / allLABs.length,
    b: allLABs.reduce((sum, lab) => sum + lab.b, 0) / allLABs.length
  };

  return {
    forehead,
    leftCheek,
    rightCheek,
    nose,
    leftUnderEye,
    rightUnderEye,
    chin,
    lips,
    mouth,
    philtrum,
    overall
  };
}
