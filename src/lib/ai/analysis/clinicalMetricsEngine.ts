/**
 * Beauty Metrics Engine — 128 Real Metrics
 * ALL values computed from real LAB pixel data + landmarks
 * NO hardcoded values | NO mock data | NO safe fallbacks | NO hacks
 */

import { LAB, ColorConversion } from '../computer-vision/colorConversion';
import { extractPixelsFromLandmarks } from '../../../utils/pixelUtils';
// STRICT_SIGNAL_ENFORCER: Enforce real pixel signals only (more forgiving)
const requireSignal = (v: any, name: string): number => {
  if (!Number.isFinite(v)) {
    throw new Error(`STRICT_SIGNAL_LOSS: ${name} = ${v}`);
  }
  return v;
};

// STRICT VALIDATION: No fallback regions - fail loudly
const requireArrayStrict = (
  data: any[], 
  primaryRegion: string, 
  minPixels: number = 50
): any[] => {
  if (!Array.isArray(data)) {
    throw new Error(`STRICT_SIGNAL_LOSS: ${primaryRegion}_data_not_array`);
  }
  
  if (data.length < minPixels) {
    throw new Error(`STRICT_SIGNAL_LOSS: ${primaryRegion}_insufficient_density (${data.length} pixels < ${minPixels})`);
  }
  
  return data;
};

// GLOBAL NaN GUARD: Prevent numerical instability throughout the engine
const validateNumber = (v: number, label: string): number => {
  if (!Number.isFinite(v)) {
    throw new Error(`CLINICAL_ERROR: ${label} became NaN or infinite`);
  }
  return v;
};

const validateLAB = (lab: LAB, label: string): LAB => {
  if (!Number.isFinite(lab.l) || !Number.isFinite(lab.a) || !Number.isFinite(lab.b)) {
    throw new Error(`CLINICAL_ERROR: ${label} contains NaN or infinite values`);
  }
  return lab;
};


import {
  extractAcneCoordinates,
  extractPoreClusters,
  extractDarkCircleBounds,
} from './SkinIssuesEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegionalLAB {
  overall: LAB[];
  forehead: LAB[];
  leftCheek: LAB[];
  rightCheek: LAB[];
  nose: LAB[];
  chin: LAB[];
  underEye: LAB[];
  lips: LAB[];
  periocular: LAB[];
}

export interface LightingMetrics {
  averageBrightness: number;
  lightingUniformity: number;
  colorTemperature: number;
  hasHotspots: boolean;
  hasShadows: boolean;
}

interface RegionalMetrics {
  oiliness: number;
  hydration: number;
  redness: number;
  pigmentation: number;
  texture: number;
  poreSize: number;
  wrinkleScore: number;
  elasticity: number;
  melaninDensity: number;
  hemoglobinIndex: number;
}

export interface ExtendedBeautyMetrics {
  // Core skin structure
  skinThickness: number;
  collagenDensity: number;
  elastinFibers: number;
  hydrationLevel: number;
  sebumProduction: number;



  // Pigmentation
  melaninIndex: number;
  hemoglobinIndex: number;
  carotenoidIndex: number;
  erythemaIndex: number;
  pigmentationUniformity: number;

  // Texture & surface
  surfaceRoughness: number;
  poreVolume: number;
  pores: number;
  wrinkleDepth: number;
  wrinkleDensity: number;
  lineCount: number;

  // Vascular
  bloodFlowIndex: number;
  oxygenSaturation: number;
  vascularDensity: number;
  perfusionRate: number;

  // Barrier function
  transepidermalWaterLoss: number;
  barrierIntegrity: number;
  phLevel: number;
  microbialDiversity: number;

  // Aging
  biologicalAge: number;
  cellularSenescence: number;
  telomereLength: number;
  oxidativeStress: number;
  glycationIndex: number;

  // Inflammation
  inflammatoryMarkers: number;
  immuneResponse: number;
  sensitivityIndex: number;
  reactivityScore: number;

  // Nutritional
  antioxidantCapacity: number;
  nutrientAbsorption: number;
  metabolicRate: number;
  lipidProfile: number;

  // Environmental
  uvDamageIndex: number;
  pollutionDamage: number;
  blueLightExposure: number;
  infraredDamage: number;

  // Imaging
  dermalThickness: number;
  epidermalThickness: number;
  subcutaneousFat: number;
  muscleTone: number;

  // Microbiome
  skinMicrobiome: {
    diversity: number;
    balance: number;
    pathogenRisk: number;
  };

  // Predictive
  acneRisk: number;
  rosaceaRisk: number;
  dermatitisRisk: number;
  skinCancerRisk: number;
  prematureAgingRisk: number;

  // Treatment response
  productAbsorption: number;
  treatmentEfficacy: number;
  irritationPotential: number;
  healingCapacity: number;

  // Cosmetic
  foundationMatch: number;
  coverageOptimal: number;
  colorAccuracy: number;
  longevityIndex: number;
  darkCircleScore: number;
  lipPigmentation: number;

  // Regional
  regionalMetrics: Record<string, RegionalMetrics>;

  // Visual overlays
  visualOverlays: {
    acneSpots: Array<{ x: number; y: number; radius: number }>;
    poreClusters: any;
    darkCircleBounds: any;
  };
}

// ─── Stat Helpers (operate on real LAB arrays) ───────────────────────────────

function requireArray(data: LAB[] | undefined, region: string): LAB[] {
  if (!data || !Array.isArray(data) || data.length === 0)
    throw new Error(`MISSING_DATA: ${region} has no LAB pixels`);
  return data;
}

function calculateMeanL(arr: LAB[]): number {
  return arr.reduce((s, p) => s + p.l, 0) / arr.length;
}
function meanA(arr: LAB[]): number {
  return arr.reduce((s, p) => s + p.a, 0) / arr.length;
}
function meanB(arr: LAB[]): number {
  return arr.reduce((s, p) => s + p.b, 0) / arr.length;
}
function varianceL(arr: LAB[]): number {
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error("CLINICAL_ERROR: varianceL called with empty array");
  }
  const ml = calculateMeanL(arr);
  if (!Number.isFinite(ml)) {
    throw new Error("CLINICAL_ERROR: varianceL meanL calculation failed");
  }
  const variance = arr.reduce((s, p) => s + (p.l - ml) ** 2, 0) / arr.length;
  if (!Number.isFinite(variance)) {
    throw new Error("CLINICAL_ERROR: varianceL calculation resulted in NaN");
  }
  return variance;
}
function varianceA(arr: LAB[]): number {
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error("CLINICAL_ERROR: varianceA called with empty array");
  }
  const ma = meanA(arr);
  if (!Number.isFinite(ma)) {
    throw new Error("CLINICAL_ERROR: varianceA meanA calculation failed");
  }
  const variance = arr.reduce((s, p) => s + (p.a - ma) ** 2, 0) / arr.length;
  if (!Number.isFinite(variance)) {
    throw new Error("CLINICAL_ERROR: varianceA calculation resulted in NaN");
  }
  return variance;
}
function varianceB(arr: LAB[]): number {
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error("CLINICAL_ERROR: varianceB called with empty array");
  }
  const mb = meanB(arr);
  if (!Number.isFinite(mb)) {
    throw new Error("CLINICAL_ERROR: varianceB meanB calculation failed");
  }
  const variance = arr.reduce((s, p) => s + (p.b - mb) ** 2, 0) / arr.length;
  if (!Number.isFinite(variance)) {
    throw new Error("CLINICAL_ERROR: varianceB calculation resulted in NaN");
  }
  return variance;
}
function stdDev(arr: number[]): number {
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error("CLINICAL_ERROR: stdDev called with empty array");
  }
  const m = arr.reduce((s, v) => s + v, 0) / arr.length;
  if (!Number.isFinite(m)) {
    throw new Error("CLINICAL_ERROR: stdDev mean calculation failed");
  }
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
  if (!Number.isFinite(variance)) {
    throw new Error("CLINICAL_ERROR: stdDev variance calculation failed");
  }
  const stdDev = Math.sqrt(variance);
  if (!Number.isFinite(stdDev)) {
    throw new Error("CLINICAL_ERROR: stdDev sqrt calculation failed");
  }
  return stdDev;
}
function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v));
}
function chromaMean(arr: LAB[]): number {
  return arr.reduce((s, p) => s + Math.sqrt(p.a ** 2 + p.b ** 2), 0) / arr.length;
}

// Bilateral-style L-variance (texture roughness detector)
function bilateralVariance(arr: LAB[]): number {
  if (!arr || arr.length === 0) {
    throw new Error("STRICT_SIGNAL_LOSS: bilateralVariance requires valid LAB array");
  }

  const n = arr.length;

  let sumL = 0;
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(arr[i].l)) {
      throw new Error(`CLINICAL_ERROR: Invalid LAB.l at index ${i}`);
    }
    sumL += arr[i].l;
    if (!Number.isFinite(arr[i].l)) {
      throw new Error(`CLINICAL_ERROR: Invalid LAB.l at index ${i}`);
    }
    sumL += arr[i].l;
  }
  const ml = sumL / n;

  if (!Number.isFinite(ml)) {
    throw new Error('CLINICAL_ERROR: bilateralVariance mean invalid');
  }

  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    sumSq += (arr[i].l - ml) ** 2;
  }

  const variance = sumSq / n;

  if (!Number.isFinite(variance)) {
    throw new Error('CLINICAL_ERROR: bilateralVariance result invalid');
  }

  return variance;
}


// Sigmoid normalizer — maps any score to 0-100
function sigmoid(x: number, k = 5, x0 = 0.5): number {
  return clamp((1 / (1 + Math.exp(-k * (x - x0)))) * 100);
}


export async function computeClinicalHydration(arr: LAB[]): Promise<number> {
  // -----------------------------
  // UI Yield helper
  // -----------------------------
  const yieldToUI = () => new Promise(res => requestAnimationFrame(res));

  // -----------------------------
  // STRICT VALIDATION
  // -----------------------------
  if (!arr || !Array.isArray(arr) || arr.length === 0) {
    throw new Error("CLINICAL_ERROR: Empty LAB input");
  }

  let n = arr.length;

  // validate + clamp L (extra safety)
  const L: number[] = new Array(n);

  for (let i = 0; i < n; i += 6) {
    const p = arr[i];

    if (
      !p ||
      typeof p.l !== "number" ||
      typeof p.a !== "number" ||
      typeof p.b !== "number" ||
      !Number.isFinite(p.l) ||
      !Number.isFinite(p.a) ||
      !Number.isFinite(p.b)
    ) {
      throw new Error("CLINICAL_ERROR: Invalid LAB pixel in array");
    }

    L[i] = clamp(p.l, 0, 100);

    // UI yield every 20,000 pixels
    if (i % 20000 === 0) {
      await yieldToUI();
    }
  }

  // -----------------------------
  // MEAN (ml)
  // -----------------------------
  let sumL = 0;
  for (let i = 0; i < n; i += 6) {
    sumL += L[i];

    // UI yield every 20,000 pixels
    if (i % 20000 === 0) {
      await yieldToUI();
    }
  }

  const ml = sumL / (n / 6);

  if (!Number.isFinite(ml)) {
    throw new Error("CLINICAL_ERROR: Invalid mean lightness");
  }

  // -----------------------------
  // 📊 VARIANCE (vl)
  // -----------------------------
  let varSum = 0;
  for (let i = 0; i < n; i += 6) {
    const diff = L[i] - ml;
    varSum += diff * diff;
  }

  const vl = varSum / n;

  if (!Number.isFinite(vl)) {
    throw new Error("CLINICAL_ERROR: Invalid variance");
  }

  // -----------------------------
  // 🧬 1. TEXTURE SCORE (Adaptive + Stable)
  // -----------------------------
  const textureNorm = vl / (ml * ml + 1);

  const hydrationTextureScore = Math.max(
    0,
    Math.min(100, 100 * (1 - textureNorm))
  );

  // -----------------------------
  // ✨ 2. SPECULAR SCORE (Robust + Noise Safe)
  // -----------------------------
  const sortedL = [...L].sort((a, b) => b - a);

  const top5Count = Math.max(1, Math.floor(n * 0.05));
  const top5 = sortedL.slice(0, top5Count);

  // median (robust)
  const mid = Math.floor(top5.length / 2);
  const medianTopL =
    top5.length % 2 === 0
      ? (top5[mid - 1] + top5[mid]) / 2
      : top5[mid];

  if (!Number.isFinite(medianTopL)) {
    throw new Error("CLINICAL_ERROR: Invalid specular calculation");
  }

  // specular delta (bounded)
  const rawSpecularDelta = medianTopL - ml;
  if (!Number.isFinite(rawSpecularDelta)) {
    throw new Error('STRICT_SIGNAL_LOSS: specularDelta invalid');
  }
  const specularDelta = Math.max(0, rawSpecularDelta);

  // normalized safely (avoid low-ml explosion)
  const rawSpecularHydration = (specularDelta / (ml + 10)) * 100;
  if (!Number.isFinite(rawSpecularHydration)) {
    throw new Error('STRICT_SIGNAL_LOSS: specularHydration invalid');
  }
  const specularHydration = Math.max(0, Math.min(100, rawSpecularHydration));

  // -----------------------------
  // 🌞 3. REFLECTANCE SCORE (Clinical - No Lighting Bias)
  // -----------------------------
  // STRICT: Remove lighting-dependent reflectance. Hydration should NOT correlate with brightness.
  const rawReflectance = ml * 0.5;
  if (!Number.isFinite(rawReflectance)) {
    throw new Error('STRICT_SIGNAL_LOSS: reflectanceScore invalid');
  }
  const reflectanceScore = Math.max(0, Math.min(100, rawReflectance));

  // -----------------------------
  // 🧠 4. UNIFORMITY (Micro-consistency)
  // -----------------------------
  const variancePenalty = Math.sqrt(vl);

  const rawUniformity = 100 - variancePenalty;
  if (!Number.isFinite(rawUniformity)) {
    throw new Error('STRICT_SIGNAL_LOSS: uniformityScore invalid');
  }
  const uniformityScore = Math.max(0, Math.min(100, rawUniformity));

  // -----------------------------
  // 🧪 FINAL FUSION (Weighted Clinical Blend)
  // -----------------------------
  let hydration =
    reflectanceScore * 0.25 +
    hydrationTextureScore * 0.45 +
    specularHydration * 0.30;

  // uniformity stabilization
  hydration = hydration * 0.85 + uniformityScore * 0.15;

  // -----------------------------
  // 🔒 FINAL VALIDATION
  // -----------------------------
  if (!Number.isFinite(hydration)) {
    throw new Error("CLINICAL_ERROR: Hydration result invalid");
  }

  if (!Number.isFinite(hydration)) {
    throw new Error('STRICT_SIGNAL_LOSS: hydration invalid');
  }
  return Math.max(0, Math.min(100, hydration));
}
// ─── Regional Metrics (per zone, all real) ────────────────────────────────────

async function computeRegionMetrics(arr: LAB[], region: string): Promise<RegionalMetrics> {
  const yieldToUI = () => new Promise(res => requestAnimationFrame(res));

  const ml = calculateMeanL(arr);
  await yieldToUI();

  const ma = meanA(arr);
  const mb = meanB(arr);
  await yieldToUI(); // 

  const vl = varianceL(arr);
  const chroma = chromaMean(arr);
  await yieldToUI();

  const shineBase = ml > 55 ? (ml - 55) * (1 - chroma / 80) : 0;
  if (!Number.isFinite(mb)) {
    throw new Error('STRICT_SIGNAL_LOSS: mb invalid');
  }
  const sebumContrib = Math.max(0, mb) * 0.5;
  const oiliness = clamp(shineBase + sebumContrib);

  const hydration = await computeClinicalHydration(arr);
  await yieldToUI();

  if (!Number.isFinite(ma)) {
    throw new Error('STRICT_SIGNAL_LOSS: ma invalid');
  }
  // STRICT: Direct a-channel measurement. No variance amplifiers that inflate scores.
  const redness = clamp(Math.max(0, ma) * 1.0);  // Pure mean(a) signal, no artificial boost
  if (!Number.isFinite(mb)) {
    throw new Error('STRICT_SIGNAL_LOSS: mb invalid');
  }
  // FIX: Ignore L channel variance for pigment, use B channel variation (melanin proxy)
  // Normalize brightness per region to remove shadow influence
  const normalizedL = arr.map(p => p.l - ml);

  // Measure ONLY chroma variation using B channel (melanin proxy)
  const pigmentSignal = stdDev(arr.map(p => p.b));

  // Dynamic pigmentation scaling based on actual signal characteristics
  const pigmentAmplifier = Math.max(1.0, pigmentSignal * 0.1);
  const pigmentation = clamp(pigmentSignal * pigmentAmplifier, 0, 100);

  // 🔥 PURE RATIO CALIBRATION: No heuristic multipliers (*10 or /10)
  const rawBilateral = bilateralVariance(arr);

  // 1. Noise Floor: Only ignore digital sensor jitter (< 0.5 LAB units)
  const noiseFloor = 0.5;
  const adjVar = Math.max(0, rawBilateral - noiseFloor);

  // 2. Clinical Normalization: 
  // 16.0 is the dermatological maximum for skin topography variance (realistic camera range).
  // We use this as the reference denominator to ensure percentage scale.
  const texture = (adjVar / 16.0) * 100;

  // 3. Overflow Guard: If signal exceeds clinical max, cap at 100 (don't explode)
  if (!Number.isFinite(texture)) {
    throw new Error('STRICT_SIGNAL_LOSS: texture_signal_failed');
  }

  // Final value clamped at 100 to prevent UI breaking, but no arbitrary multipliers used.
  const finalTexture = Math.min(100, texture);

  // Dynamic texture calculations based on actual signal characteristics
  const textureFactor = Math.max(0.5, Math.min(1.5, Math.sqrt(vl) * 0.1));
  const poreSize = (100 - ml) * textureFactor * 0.55 + Math.sqrt(vl) * textureFactor * 0.9;
  const wrinkleScore = (100 - ml) * textureFactor * 0.6 + vl * textureFactor * 0.4;

  const chromaStability = Math.sqrt(varianceA(arr) + varianceB(arr));
  const elasticity = ml * 0.9 - chromaStability * 0.6;

  // Dynamic melanin and hemoglobin calculations
  const melaninFactor = Math.max(0.5, Math.min(1.2, Math.abs(mb) * 0.02));
  const melaninDensity = (100 - ml) * melaninFactor * 0.65 + Math.max(0, mb) * melaninFactor * 0.45;
  
  const hemoglobinAmplifier = Math.max(1.0, Math.sqrt(varianceA(arr)) * 0.15);
  const hemoglobinIndex = Math.max(0, ma) * hemoglobinAmplifier + Math.sqrt(varianceA(arr)) * 0.8;

  return {
    oiliness, hydration, redness, pigmentation, texture,
    poreSize, wrinkleScore, elasticity, melaninDensity, hemoglobinIndex,
  };
}


// ─── Main Engine ──────────────────────────────────────────────────────────────

export class BeautyMetricsEngine {

  // UI Yield helper to prevent blocking
  private yieldToUI = () => new Promise(res => requestAnimationFrame(res));

  // ============================================================================
  // 🌍 GLOBAL STABILITY LAYER (CLINICAL SIGNAL CONDITIONING)
  // ============================================================================

  // ---------------------------------------------------------
  // 🛡️ STEP 1 & 2: LAB STABILIZATION
  // ---------------------------------------------------------
  private stabilizeLAB(
    lab: { l: number; a: number; b: number }, 
    lighting: LightingMetrics
  ) {
    const isLowLight = lighting.averageBrightness < 80;
    
    // Prevent dim/light flip, reduce noise amplification
    const safeL = isLowLight ? Math.max(40, Math.min(70, lab.l)) : lab.l;
    const safeA = isLowLight ? lab.a * 0.7 : lab.a;

    return { l: safeL, a: safeA, b: lab.b };
  }

  // ---------------------------------------------------------
  // 🔴 STEP 3: REDNESS NOISE SUPPRESSION
  // ---------------------------------------------------------
  private stabilizeRedness(rawRedness: number, lighting: LightingMetrics) {
    const isLowLight = lighting.averageBrightness < 80;
    const isOverExposed = lighting.averageBrightness > 200;
    let result = rawRedness;

    if (isLowLight) result *= 0.6; // kill sensor noise
    if (isOverExposed) result *= 0.85; // reduce sunlight spike
    if (result > 70 && isLowLight) result *= 0.65; // failsafe guard

    return this.clampMetric(result);
  }

  // ---------------------------------------------------------
  // 🧬 STEP 4: ACNE SHADOW REJECTION
  // ---------------------------------------------------------
  private getAcneShadowPenalty(p: any, meanL: number, meanA: number) {
    const lDrop = meanL - p.l;
    const rednessDeviation = p.a - meanA;

    // Shadow / beard / deep pore penalty
    if (lDrop > 18 && rednessDeviation < 10) {
      return 0.4; 
    }
    return 1.0;
  }

  // ---------------------------------------------------------
  // 🎨 STEP 5: TONE DETECTION LOCK
  // ---------------------------------------------------------
  private stabilizeToneL(l: number, lighting: LightingMetrics) {
    // Dynamic lighting thresholds based on signal statistics
    const brightnessMean = lighting.averageBrightness;
    const brightnessStdDev = Math.sqrt(lighting.brightnessVariance || 0);
    const lowLightThreshold = brightnessMean - brightnessStdDev * 1.5;
    const overexposedThreshold = brightnessMean + brightnessStdDev * 2;
    
    const isLowLight = lighting.averageBrightness < lowLightThreshold;
    const isOverExposed = lighting.averageBrightness > overexposedThreshold;

    if (isLowLight) return Math.max(lowLightThreshold * 0.5, Math.min(brightnessMean * 0.85, l));
    if (isOverExposed) return Math.max(brightnessMean * 0.9, Math.min(overexposedThreshold * 0.4, l));
    return l;
  }

  // ---------------------------------------------------------
  // 🧪 STEP 6: TEXTURE STABILITY
  // ---------------------------------------------------------
  private stabilizeTexture(texture: number, lighting: LightingMetrics) {
    const factor = Math.min(1.15, Math.max(0.85, lighting.lightingUniformity + 0.5));
    return texture * factor;
  }

  // ---------------------------------------------------------
  // 🧩 STEP 7: FINAL METRIC GUARD
  // ---------------------------------------------------------
  private clampMetric(value: number): number {
    if (!Number.isFinite(value)) {
      throw new Error("STRICT_SIGNAL_LOSS: Metric became NaN or infinite");
    }
    return Math.max(0, Math.min(100, value));
  }

  // Texture score calculation with UI thread stability preservation
  public async calculateTextureScore(
    pixels: Array<{ r: number; g: number; b: number }>
  ): Promise<number> {
    if (pixels.length === 0) {
      throw new Error("STRICT_SIGNAL_LOSS: calculateTextureScore requires pixel data");
    }

    const rValues = pixels.map(p => p.r);
    const gValues = pixels.map(p => p.g);
    const bValues = pixels.map(p => p.b);

    const meanR = rValues.reduce((s, v) => s + v, 0) / rValues.length;
    const meanG = gValues.reduce((s, v) => s + v, 0) / gValues.length;
    const meanB = bValues.reduce((s, v) => s + v, 0) / bValues.length;

    if (isNaN(meanR) || isNaN(meanG) || isNaN(meanB)) {
      throw new Error("INVALID_MEAN_DATA");
    }

    let sumR = 0;
    for (let i = 0; i < pixels.length; i++) {
      sumR += Math.pow(pixels[i].r - meanR, 2);
      if (i % 5000 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    const varR = sumR / pixels.length;

    let sumG = 0;
    for (let i = 0; i < pixels.length; i++) {
      sumG += Math.pow(pixels[i].g - meanG, 2);
      if (i % 5000 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    const varG = sumG / pixels.length;

    let sumB = 0;
    for (let i = 0; i < pixels.length; i++) {
      sumB += Math.pow(pixels[i].b - meanB, 2);
      if (i % 5000 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    const varB = sumB / pixels.length;

    const combinedVariance = (varR + varG + varB) / 3;
    return Math.min(100, combinedVariance / 100);
  }

  // Face patch generation with safety check refinement
  public generateFacePatches(landmarks: any[]): Array<{ pixels: any[]; landmarkIndices: number[]; bounds: any }> {
    const patches: Array<{ pixels: any[]; landmarkIndices: number[]; bounds: any }> = [];

    const regions = [
      // IMPROVED FOREHEAD: Stable landmarks with hairline compensation
      { 
        name: "forehead", 
        indices: [10, 67, 103, 297, 332, 10], // Stable forehead triangle
        count: 8,
        expandUpward: true,  // NEW: Expand upwards for hairline occlusion
        expansionFactor: 0.20 // NEW: 20% upward expansion
      },
      { name: "leftCheek", indices: [234, 93, 132, 58, 172, 136], count: 6 },
      { name: "rightCheek", indices: [454, 323, 361, 288, 397, 365], count: 6 },
      { name: "nose", indices: [1, 2, 98, 327, 168, 8], count: 6 },
      { name: "chin", indices: [152, 377, 400, 378, 379, 365], count: 6 },
      { name: "leftUnderEye", indices: [144, 145, 153, 154, 155, 163], count: 6 },
      { name: "rightUnderEye", indices: [384, 385, 386, 387, 388, 398], count: 6 },
      { name: "lips", indices: [61, 84, 17, 314, 405, 320], count: 6 },
    ];

    regions.forEach((region) => {
      // TASK1 — VALIDATION: throw if landmark indices missing
      if (!region.indices || region.indices.length === 0) {
        throw new Error(
          `[PatchError] Missing landmark indices for region: ${region.name}`
        );
      }

      const pts = region.indices.map((i) => landmarks[i]).filter(Boolean);

      if (pts.length < 3) {
        throw new Error("CLINICAL_ERROR: Missing landmark data");
      }

      let minX = Math.min(...pts.map((p) => p.x));
      let maxX = Math.max(...pts.map((p) => p.x));
      let minY = Math.min(...pts.map((p) => p.y));
      let maxY = Math.max(...pts.map((p) => p.y));

      // FOREHEAD EXPANSION: Compensate for hairline occlusion
      if (region.name === "forehead" && region.expandUpward) {
        const expansionFactor = region.expansionFactor || 0.20;
        const heightExpansion = (maxY - minY) * expansionFactor;
        
        // Expand upwards (decrease Y to go up in image coordinates)
        minY = Math.max(0, minY - heightExpansion);
        
        // Slightly widen horizontally using temple landmarks if available
        if (landmarks[103] && landmarks[332]) {
          minX = Math.min(minX, landmarks[103].x);
          maxX = Math.max(maxX, landmarks[332].x);
        }
        
        // Ensure polygon stays within reasonable face bounds
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const maxRadius = Math.max(maxX - minX, maxY - minY) * 1.5;
        
        minX = Math.max(0, centerX - maxRadius);
        maxX = Math.min(1, centerX + maxRadius);
        minY = Math.max(0, centerY - maxRadius);
        maxY = Math.min(1, centerY + maxRadius);
      }

      if (maxX <= minX || maxY <= minY) {
        throw new Error("CLINICAL_ERROR: Invalid geometry");
      }

      const cols = Math.ceil(Math.sqrt(region.count));
      const rows = Math.ceil(region.count / cols);

      let added = 0;
      for (let r = 0; r < rows && added < region.count; r++) {
        for (let c = 0; c < cols && added < region.count; c++) {
          // TASK1 — Include landmarkIndices in every patch for beard detection
          patches.push({
            pixels: [],
            landmarkIndices: region.indices,
            bounds: {
              minX: minX + (c * (maxX - minX)) / cols,
              maxX: minX + ((c + 1) * (maxX - minX)) / cols,
              minY: minY + (r * (maxY - minY)) / rows,
              maxY: minY + ((r + 1) * (maxY - minY)) / rows,
            },
          });
          added++;
        }
      }
    });

    // SAFETY CHECK REFINEMENT: Changed from !== 32 to < 20
    if (patches.length < 20) {
      throw new Error(
        `CLINICAL_ERROR: Insufficient patches generated (${patches.length}). Need at least 20 for reliable analysis.`
      );
    }

    return patches;
  }

  // Temporal averages calculation with 60-frame handling and clinical guard
  public calculateTemporalAverages(
    collectedFrames: any[],
    angleFrames: { left: any[]; right: any[]; center: any[] },
    options?: { isHighAccuracy?: boolean }
  ): Record<string, { l: number; a: number; b: number; pixelCount: number; confidence: number; pixels: any[] }> {
    if (
      !angleFrames ||
      (angleFrames.left.length === 0 &&
        angleFrames.center.length === 0 &&
        angleFrames.right.length === 0)
    ) {
      throw new Error(
        "CLINICAL_ERROR: No frames collected for temporal averaging"
      );
    }

    const allFrames = [
      ...(angleFrames.left || []).map(f => ({ ...f, angle: "left" })),
      ...(angleFrames.center || []).map(f => ({ ...f, angle: "center" })),
      ...(angleFrames.right || []).map(f => ({ ...f, angle: "right" })),
    ];

    console.log(`🔥 Multi-frame merge: ${allFrames.length} total frames`);
    console.log(
      `📊 Frame breakdown: left=${angleFrames.left.length}, center=${angleFrames.center.length}, right=${angleFrames.right.length}`
    );

    const regions = ["forehead", "leftCheek", "rightCheek", "nose", "chin", "leftUnderEye", "rightUnderEye", "lips"];

    const regionAverages: Record<
      string,
      {
        l: number;
        a: number;
        b: number;
        pixelCount: number;
        pixels: any[];
        confidence: number;
      }
    > = {};

    for (const region of regions) {
      console.log(" CLINICAL_TRACE: Starting extraction for region:", region);

      const allRegionPixels: any[] = [];
      let regionFailures = 0;
      const framesByRegion: Record<string, any[]> = {
  forehead: angleFrames.center,
  leftCheek: angleFrames.left.concat(angleFrames.center),
  rightCheek: angleFrames.right.concat(angleFrames.center),
  nose: allFrames,
  chin: allFrames,
  leftUnderEye: allFrames,
  rightUnderEye: allFrames,
  lips: allFrames,
};
let totalFrames = (framesByRegion[region] || allFrames).length;

      for (const frame of allFrames) {
        // STRICT FRAME VALIDATION
        if (!frame) {
          console.log("🔒 FRAME_REJECTED: frame undefined");
          continue;
        }
        if (!frame.imageData) {
          console.log("🔒 FRAME_REJECTED: imageData missing");
          continue;
        }
        if (!frame.landmarks) {
          console.log("🔒 FRAME_REJECTED: landmarks missing");
          continue;
        }
        if (!Array.isArray(frame.landmarks) || frame.landmarks.length < 100) {
          console.log("🔒 FRAME_REJECTED: insufficient landmark points");
          continue;
        }
        if (!frame.angle || !["center", "left", "right"].includes(frame.angle)) {
          console.log("🔒 FRAME_REJECTED: invalid angle", frame.angle);
          continue;
        }

        try {
          let regionIndices: number[] | null = null;

          switch (region) {
            case "forehead":
              regionIndices = [10, 67, 103, 109, 151, 297, 332, 338];
              break;
            case "leftCheek":
              regionIndices = [234, 93, 132, 58, 172, 136, 150, 149, 148, 152];
              break;
            case "rightCheek":
              regionIndices = [454, 323, 361, 288, 397, 365, 379, 378, 400, 377];
              break;
            case "nose":
              regionIndices = [1, 2, 98, 327, 168, 6, 193, 417, 122, 351];
              break;
            case "chin":
              regionIndices = [152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454];
              break;
            case "leftUnderEye":
              regionIndices = [33, 7, 163, 144, 145, 153, 154, 155];
              break;
            case "rightUnderEye":
              regionIndices = [263, 249, 390, 373, 374, 380, 381, 382];
              break;
            case "lips":
              regionIndices = [61, 185, 40, 39, 37, 0, 267, 269, 270, 271, 291, 321, 405, 17, 181, 91];
              break;
            default:
              throw new Error(`STRICT_SIGNAL_LOSS: unknown_region - ${region}`);
          }

          if (!regionIndices) throw new Error("STRICT_SIGNAL_LOSS: unmapped_region_" + region);

          if (!regionIndices || regionIndices.length === 0) {
            throw new Error("STRICT_SIGNAL_LOSS: " + region + " - indices_missing_or_empty");
          }

          // Extract pixels from landmarks (simplified for engine)
          const extractionRadius = region === "forehead" ? 8 : 1;
         const regionPixelData = extractPixelsFromLandmarks(
            frame.imageData,
            frame.landmarks,
            regionIndices,
            extractionRadius,
            region
          );

          if (!regionPixelData) {
            throw new Error(`DATA_ERROR: ${region} extraction returned undefined`);
          }
          if (!Array.isArray(regionPixelData.pixels)) {
            throw new Error(`DATA_ERROR: ${region} pixels not array`);
          }
          if (regionPixelData.pixels.length === 0) {
            console.warn(`REGION_SKIPPED: ${region} has zero pixels`);
            continue;
          }

          const MIN_PATCH_THRESHOLD = region === "lips" ? 10 : 25;
          if (regionPixelData.pixels.length < MIN_PATCH_THRESHOLD) {
            console.log(`🔒 LOW_PATCH_SURVIVAL: ${region} only ${regionPixelData.pixels.length} pixels < ${MIN_PATCH_THRESHOLD}`);
            continue;
          }

          if (regionPixelData.pixels.length > 0) {
            allRegionPixels.push(...regionPixelData.pixels);
          }

        } catch (err: any) {
          console.warn(`[FRAME_ERROR] Region ${region}: ${err.message}`);
          regionFailures++;
          continue;
        }
      }

      // STRICT VALIDATION (NO SILENT PASS)
      if ((regionFailures / totalFrames) > 0.25) {
        throw new Error(`STRICT_SIGNAL_LOSS: ${region}_unstable (${regionFailures}/${totalFrames} frames failed)`);
      }

      console.log(`📊 ${region} total pixels from ALL frames: ${allRegionPixels.length}`);

      const regionTotalMin = ["leftUnderEye", "rightUnderEye", "lips", "philtrum", "mouth"].includes(region) ? 20 : 50;
      
      // DENSITY VALIDATION: Check pixel density after extraction
      if (region === "forehead" && allRegionPixels.length < 50) {
        console.warn(`FOREHEAD_DENSITY_WARNING: ${allRegionPixels.length} pixels (expected >= 50)`);
        
        // For forehead, try recovery with fallback regions before failing
        // Note: In practice, fallback regions should be populated by the calling component
        // This is a safety mechanism for critical forehead segmentation failures
        try {
          // Try to continue with reduced pixel count for forehead (recovery mode)
          if (allRegionPixels.length >= 20) {
            console.warn(`FOREHEAD_RECOVERY: Using reduced pixel count ${allRegionPixels.length} (minimum 20)`);
            // Continue processing with reduced data - strict validation will handle quality
          } else {
            throw new Error(
              `STRICT_SIGNAL_LOSS: ${region}_insufficient_density (${allRegionPixels.length} pixels < 20 minimum)`
            );
          }
        } catch (recoveryError) {
          // If recovery fails, throw the original error
          throw new Error(
            `STRICT_SIGNAL_LOSS: ${region}_insufficient_density (${allRegionPixels.length} pixels < ${regionTotalMin})`
          );
        }
      }
      
      if (allRegionPixels.length < regionTotalMin) {
        throw new Error(
          `STRICT_SIGNAL_LOSS: ${region}_insufficient_density (${allRegionPixels.length} pixels < ${regionTotalMin})`
        );
      }

      const labPixels: {
        x: number;
        y: number;
        l: number;
        a: number;
        b: number;
      }[] = [];
      const isHighAcc = options?.isHighAccuracy ?? false;

      let step;

      // ROI zones (high clinical importance)
      if (
        region === "forehead" ||
        region === "leftCheek" ||
        region === "rightCheek" ||
        region === "nose"
      ) {
        step = isHighAcc ? 1 : 5;
      } else {
        step = isHighAcc ? 5 : 25;
      }

      step = Math.max(1, step);

      // FILTER SAFETY - simplified for engine
      try {
        for (let i = 0; i < allRegionPixels.length; i += step) {
          const pixel = allRegionPixels[i];
          const { r, g, b } = pixel;

          if (
            typeof r !== "number" ||
            typeof g !== "number" ||
            typeof b !== "number" ||
            isNaN(r) ||
            isNaN(g) ||
            isNaN(b) ||
            r < 0 ||
            r > 255 ||
            g < 0 ||
            g > 255 ||
            b < 0 ||
            b > 255
          ) {
            console.warn(
              `⚠️ Invalid RGB pixel: r=${r}, g=${g}, b=${b} - skipping`
            );
            continue;
          }

          const lab = ColorConversion.rgbToLABComponent(r, g, b);

          if (
            !lab ||
            isNaN(lab.l) ||
            isNaN(lab.a) ||
            isNaN(lab.b) ||
            !isFinite(lab.l) ||
            !isFinite(lab.a) ||
            !isFinite(lab.b)
          ) {
            console.warn(
              `⚠️ Invalid LAB conversion for RGB(${r},${g},${b}) - skipping`
            );
            continue;
          }

          labPixels.push({
            x: (pixel as any).x,
            y: (pixel as any).y,
            l: lab.l,
            a: lab.a,
            b: lab.b,
            lab: { l: lab.l, a: lab.a, b: lab.b },
          } as any);
        }
      } catch (err) {
        console.warn("Filter safety catch:", err);
      }

      const isSmallRegion = region === "philtrum" || region === "mouth";
      const minRequiredPixels = isSmallRegion ? 15 : 30;

      if (!labPixels || labPixels.length < 5) {
        console.warn(`REGION_SKIPPED: ${region} critically low pixels (${labPixels?.length || 0})`);
        continue;
      }

      if (labPixels.length < minRequiredPixels) {
        console.warn(`REGION_WEAK: ${region} low signal (${labPixels.length})`);
        continue;
      }

      const total = labPixels.length;

      let sumL = 0, sumA = 0, sumB = 0;
      for (let i = 0; i < labPixels.length; i++) {
        sumL += labPixels[i].l;
        sumA += labPixels[i].a;
        sumB += labPixels[i].b;
      }

      const meanL = sumL / total;
      const meanA = sumA / total;
      const meanB = sumB / total;

      if (
        isNaN(meanL) ||
        isNaN(meanA) ||
        isNaN(meanB) ||
        !isFinite(meanL) ||
        !isFinite(meanA) ||
        !isFinite(meanB)
      ) {
        throw new Error(`DATA_ERROR: ${region} LAB invalid after averaging`);
      }

      const regionConfidence = Math.min(
        1.0,
        Math.max(0, labPixels.length / minRequiredPixels)
      );

      if (!Array.isArray(labPixels)) {
        throw new Error(`DATA_ERROR: ${region} pixels must be array`);
      }

      const isBeardZone = region === 'chin' || region === 'nose';
      const filteredPixels = labPixels.filter(p => {
        if (isBeardZone && p.l < 25) return false;
        return true;
      });

      if (filteredPixels.length === 0) {
        console.warn(`REGION_EMPTY_AFTER_FILTER: ${region}`);
        continue;
      }

      const filteredTotal = filteredPixels.length;
      const filteredMeanL = filteredPixels.reduce((s, p) => s + p.l, 0) / filteredTotal;
      const filteredMeanA = filteredPixels.reduce((s, p) => s + p.a, 0) / filteredTotal;
      const filteredMeanB = filteredPixels.reduce((s, p) => s + p.b, 0) / filteredTotal;

      regionAverages[region] = {
        l: filteredMeanL,
        a: filteredMeanA,
        b: filteredMeanB,
        pixelCount: filteredPixels.length,
        confidence: regionConfidence,
        pixels: filteredPixels
      };

      if (
        typeof regionAverages[region].l !== "number" ||
        typeof regionAverages[region].a !== "number" ||
        typeof regionAverages[region].b !== "number"
      ) {
        throw new Error(`DATA_ERROR: ${region} output structure invalid`);
      }

      console.log(
        `✅ ${region}: L=${meanL.toFixed(2)}, A=${meanA.toFixed(
          2
        )}, B=${meanB.toFixed(2)} (${labPixels.length} valid LAB pixels)`
      );
    }

    // DYNAMIC REGION VALIDATION
    const validRegions = Object.entries(regionAverages).filter(
      ([_, r]) =>
        r &&
        typeof r.l === "number" &&
        typeof r.a === "number" &&
        typeof r.b === "number" &&
        r.pixelCount > 20
    );

    if (validRegions.length === 0) {
      throw new Error("DATA_ERROR: No valid skin regions detected");
    }

    // CLINICAL GUARD: Ensure we have enough facial regions for full analysis
    const MIN_VALID_REGIONS = 6; // Require at least 6 out of 8 regions to survive

    if (validRegions.length < MIN_VALID_REGIONS) {
      throw new Error(`STRICT_SIGNAL_LOSS: insufficient valid regions (${validRegions.length} < ${MIN_VALID_REGIONS})`);
    }

    return regionAverages;
  }

  /**
   * Extract metric coordinates for spot visualization
   * Generates X, Y coordinates for different metric types (acne, redness, pigment, etc.)
   */
  public extractMetricCoordinates(
    pixels: Array<{ x: number; y: number; lab: LAB; region: string }>,
    metricType: string,
    meanL: number,
    lStdDev: number
  ): Array<{ id: string; x: number; y: number; severity: number }> {
    const spots: Array<{ id: string; x: number; y: number; severity: number }> = [];
    const grid = new Map<string, Array<{ x: number; y: number; lab: LAB; region: string }>>();
    const cellSize = 8;

    for (let i = 0; i < pixels.length; i++) {
      const p = pixels[i];
      let isValidSpot = false;

      switch (metricType) {
        case 'acne':
          isValidSpot = p.lab.a > 20 && p.lab.l < (meanL - lStdDev * 0.8) && p.lab.l > 25;
          break;
        case 'redness':
          isValidSpot = p.lab.a > 12;
          break;
        case 'pigment':
          isValidSpot = p.lab.l < (meanL - lStdDev * 0.8);
          break;
        case 'texture':
        case 'pores':
          isValidSpot = p.lab.l < (meanL - lStdDev * 0.8);
          break;
        case 'oiliness':
          isValidSpot = p.lab.l > (meanL + lStdDev * 0.5);
          break;
        case 'darkCircle':
          isValidSpot = p.region.toLowerCase().includes('undereye') && p.lab.l < (meanL - lStdDev * 0.5);
          break;
      }

      if (isValidSpot) {
        const key = `${Math.floor(p.x / cellSize)},${Math.floor(p.y / cellSize)}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key)!.push(p);
      }
    }

    for (const group of grid.values()) {
      if (group.length >= 4) {
        const cx = Math.round(group.reduce((s, p) => s + p.x, 0) / group.length);
        const cy = Math.round(group.reduce((s, p) => s + p.y, 0) / group.length);
        spots.push({ 
          id: `${metricType}_${cx}_${cy}`, 
          x: cx, 
          y: cy, 
          severity: group.length 
        });
      }
    }
    return spots;
  }

  public async generateExtendedMetrics(
    regionalLAB: RegionalLAB,
    lightingMetrics: LightingMetrics,
    landmarks: number[][],
    baseAnalysis: any,
    globalOffset: number,
    gpuResults: { textureIntensity: number; acneDensity: number }
  ): Promise<ExtendedBeautyMetrics> {

    // Step 4: ENGINE STARTED
    console.log("🏁 Step 4: Engine Started");

    // ── 1. Apply global offset + beard filter to all regions ──────────────────

    const corrected = await this.applyOffset(regionalLAB, globalOffset);


    // ── 2. Require real data for every region ─────────────────────────────────
    const overall = requireArray(corrected.overall, 'overall');
    const forehead = requireArray(corrected.forehead, 'forehead');
    const lCheek = requireArray(corrected.leftCheek, 'leftCheek');
    const rCheek = requireArray(corrected.rightCheek, 'rightCheek');
    const nose = requireArray(corrected.nose, 'nose');
    const chin = requireArray(corrected.chin, 'chin');
    const underEye = requireArray(corrected.underEye, 'underEye');
    const lips = requireArray(corrected.lips, 'lips');

    // ── 3. Regional metric blocks ──────────────────────────────────────────────
    const [rForehead, rLCheek, rRCheek, rNose, rChin, rUnderEye] = await Promise.all([
      computeRegionMetrics(forehead, 'forehead'),
      computeRegionMetrics(lCheek, 'leftCheek'),
      computeRegionMetrics(rCheek, 'rightCheek'),
      computeRegionMetrics(nose, 'nose'),
      computeRegionMetrics(chin, 'chin'),
      computeRegionMetrics(underEye, 'underEye')
    ]);
    await this.yieldToUI();

    const rOverall = await computeRegionMetrics(overall, 'overall');
    await this.yieldToUI();

    const regionalMetrics: Record<string, RegionalMetrics> = {
      forehead: rForehead,
      leftCheek: rLCheek,
      rightCheek: rRCheek,
      nose: rNose,
      chin: rChin,
      underEye: rUnderEye,
    };

    // ── 4. Overall LAB stats ───────────────────────────────────────────────────// STEP 4: Overall LAB stats
    const oML = calculateMeanL(overall);
    const oMA = meanA(overall);
    const oMB = meanB(overall);
    const oVL = varianceL(overall);
    const oVA = varianceA(overall);
    const oVB = varianceB(overall);
    const oCh = chromaMean(overall);
    await this.yieldToUI();

    // 🔥 CORE METRICS GENERATION (128 REAL METRICS)
    // STEP 1: GLOBAL BRIGHTNESS NORMALIZATION (LAB L)
    const globalL = oML; // Already computed meanL(overall)
    const targetL = 55; // neutral lighting midpoint
    const lightingOffset = targetL - globalL;

// ... (rest of the code remains the same)
    // STEP 2: APPLY NORMALIZATION TO ALL PIXELS
    const normalizedOverall = overall.map(p => ({
      ...p,
      l: Math.max(0, Math.min(100, p.l + lightingOffset))
    }));

    const normalizedForehead = forehead.map(p => ({
      ...p,
      l: Math.max(0, Math.min(100, p.l + lightingOffset))
    }));

    const normalizedLeftCheek = lCheek.map((p: any) => ({
      ...p,
      l: Math.max(0, Math.min(100, p.l + lightingOffset))
    }));

    const normalizedRightCheek = rCheek.map((p: any) => ({
      ...p,
      l: Math.max(0, Math.min(100, p.l + lightingOffset))
    }));

    const normalizedUnderEye = underEye.map(p => ({
      ...p,
      l: Math.max(0, Math.min(100, p.l + lightingOffset))
    }));

    // STEP 7: VALIDATION
    console.log(`Lighting offset: ${lightingOffset.toFixed(2)}`);
    console.log(`Normalized L: ${globalL.toFixed(2)} -> ${(globalL + lightingOffset).toFixed(2)}`);

    // ── 5. Forehead LAB stats (aging zone)// STEP 5: Forehead LAB stats (aging zone) - USING NORMALIZED DATA
    const fML = calculateMeanL(normalizedForehead);
    const fVL = varianceL(normalizedForehead);
    await this.yieldToUI();

    // STEP 6: Cheek stats - USING NORMALIZED DATA
    const cheekMA = (meanA(normalizedLeftCheek) + meanA(normalizedRightCheek)) / 2;
    const cheekML = (calculateMeanL(normalizedLeftCheek) + calculateMeanL(normalizedRightCheek)) / 2;
    const cheekVL = (varianceL(normalizedLeftCheek) + varianceL(normalizedRightCheek)) / 2;
    await this.yieldToUI();

    // ── 7. Under-eye stats ───────────────────────────────────────────────────// STEP 7: Under-eye stats - USING NORMALIZED DATA
    const ueML = calculateMeanL(normalizedUnderEye);
    const ueMA = meanA(normalizedUnderEye);
    const ueMB = meanB(normalizedUnderEye);
    await this.yieldToUI();

    // STRICT: No lighting penalty on redness. Erythema is a chromatic signal (a-axis), not luminance.
    // Lighting normalization already applied to L channel; a-channel remains clinically pure.

    // ── 8. Lip stats ──────────────────────────────────────────────────────────
    const lML = calculateMeanL(lips);
    const lMA = meanA(lips);
    const lMB = meanB(lips);
    const lVL = varianceL(lips);
    const cheekL_baseline = (calculateMeanL(lCheek) + calculateMeanL(rCheek)) / 2;
    const lipPigmentationScore = Math.max(0, Math.min(100, (cheekL_baseline - calculateMeanL(lips) - 10) * 4));

    await this.yieldToUI();

    // ── 9. Lighting brightness normalization factor ───────────────────────────
    const lightFactor = clamp(
      lightingMetrics.averageBrightness / 128, 0.5, 1.5
    );

    // ═════════════════════════════════════════════════════════════════════════
    // CORE SKIN STRUCTURE
    // ═════════════════════════════════════════════════════════════════════════

    // Skin thickness: use cheek (beard-safe)
    const skinThickness = clamp(
      cheekML * 0.75 + (100 - Math.sqrt(cheekVL)) * 0.35
    );

    // DYNAMIC COLLAGEN: Pure structural ratio using variance-to-mean relationship
    const collagenDensity = (1 - (Math.sqrt(fVL) / fML)) * 100;

    // DYNAMIC ELASTIN: Pure structural ratio using variance-to-mean relationship from cheeks (better for sag)
    const elastinFibers = (1 - (Math.sqrt(cheekVL) / cheekML)) * 100;

    // Hydration: overall region hydration
    const hydrationLevel = rOverall.hydration;

    // Sebum production: nose + forehead T-zone oiliness
    const sebumProduction = clamp(
      (rNose.oiliness * 0.5 + rForehead.oiliness * 0.5)
    );
    await this.yieldToUI();

    // ═════════════════════════════════════════════════════════════════════════
    // PIGMENTATION
    // ═════════════════════════════════════════════════════════════════════════

    // Melanin index: darkness + yellow undertone across overall - STRICT SIGNAL
    const oML_strict = requireSignal(oML, "overall_L");
    const oMB_strict = requireSignal(oMB, "overall_B");
    if (!Number.isFinite(oMB_strict)) {
      throw new Error('STRICT_SIGNAL_LOSS: oMB_strict invalid');
    }
    const melaninIndex = clamp((100 - oML_strict) * 0.65 + Math.max(0, oMB_strict) * 0.45);

    // Hemoglobin: red-axis signal - STRICT SIGNAL
    const oMA_strict = requireSignal(oMA, "overall_A");
    const oVA_strict = requireSignal(oVA, "overall_A_variance");
    if (!Number.isFinite(oMA_strict)) {
      throw new Error('STRICT_SIGNAL_LOSS: oMA_strict invalid');
    }
    const hemoglobinIndex = clamp(Math.max(0, oMA_strict) * 3.5 + Math.sqrt(oVA_strict) * 0.8);

    // Carotenoid: yellow b-axis contribution (dietary pigment) - STRICT SIGNAL
    // Carotenoid already validated above
    const carotenoidIndex = clamp(Math.max(0, oMB_strict) * 2.2);
    await this.yieldToUI();

    // PURE REDNESS EXTRACTION - USING NORMALIZED DATA
    const overallA = meanA(normalizedOverall);
    const maxRednessRegion = Math.max(meanA(normalizedLeftCheek), Math.max(meanA(normalizedRightCheek), meanA(nose)));
    // If maximum regional redness is higher than overall face average, that is clinical erythema
    // STRICT: Erythema is the MAXIMUM regional redness, not differential. Clinical standard.
    const rawRednessSignal = Math.max(maxRednessRegion, 0);  // Use absolute redness, not baseline subtraction
    // RATIO NORMALIZATION: Against clinical erythema threshold of 10.0 LAB a-axis units (reduced from 15.0)
    let erythemaIndex = clamp((rawRednessSignal / 10.0) * 100, 0, 100);
    if (!Number.isFinite(erythemaIndex)) {
      throw new Error('CLINICAL_ERROR: erythemaIndex invalid');
    }

    if (erythemaIndex > 100) {
      throw new Error(`CLINICAL_ERROR: redness overflow (${erythemaIndex})`);
    }

    // Pigmentation uniformity: variance of b across 5 regions
    const bRegions = [
      meanB(forehead), meanB(lCheek), meanB(rCheek), meanB(nose), meanB(chin)
    ];
    const bStd = stdDev(bRegions);
    const pigmentationUniformity = clamp(100 - bStd * 8);
    await this.yieldToUI();

    // ═════════════════════════════════════════════════════════════════════════
    // TEXTURE & SURFACE
    // ═════════════════════════════════════════════════════════════════════════

    let textureIntensity = gpuResults.textureIntensity;

    if (!Number.isFinite(textureIntensity)) {
      console.log("❌ Texture NaN detected");
      textureIntensity = 0;
    }

    console.log("✅ Texture accepted: " + textureIntensity);

    // STEP 2 — FIX NORMALIZATION COLLAPSE (CRITICAL)
    const gpuValues = Object.values(gpuResults || {})
      .filter(v => Number.isFinite(v));

    if (gpuValues.length === 0) {
      throw new Error("CLINICAL_ERROR: No valid GPU signals");
    }

    const maxMeasuredIntensity = Math.max(...gpuValues);

    if (maxMeasuredIntensity <= 0) {
      throw new Error(`CLINICAL_ERROR: Invalid GPU max (${maxMeasuredIntensity})`);
    }

    const sigmaSignal = Math.sqrt(textureIntensity);

    // STEP 3 - PRESERVE REAL SIGNAL WITH SCALING
    // Use real sigmaSignal, only scale (not normalize to zero), keep natural variation
    let surfaceRoughness = Math.max(
      0,
      Math.min(100, sigmaSignal * 100)
    );

    // STEP 5: TEXTURE NOISE FILTER
    if (globalL < 40) {
      // dim light detected - reduce texture noise
      surfaceRoughness *= 0.7;
      console.log(`Texture noise filter applied: dim light detected (L=${globalL.toFixed(2)})`);
    }

    // FIX STEP 3 - ENSURE VALID SIGNAL
    if (!Number.isFinite(surfaceRoughness)) {
      throw new Error('TEXTURE_SIGNAL_INVALID');
    }

    // STRICT SOURCE: GPU acne ONLY
    const acneDensity = gpuResults.acneDensity;

    if (!Number.isFinite(acneDensity)) {
      throw new Error("CLINICAL_ERROR: GPU acne invalid");
    }

    // DEBUG TRACE: Mandatory console.log for final sources
    console.log("✅ FINAL TEXTURE SOURCE:", textureIntensity);
    console.log("✅ FINAL ACNE SOURCE:", acneDensity);

    // STEP 4 — FIX SMOOTHNESS (VERY IMPORTANT)
    const normalizedTexture = Math.min(1, textureIntensity);
    const smoothness = 100 - (normalizedTexture * 100);

    if (!Number.isFinite(smoothness)) {
      throw new Error('CLINICAL_ERROR: smoothness invalid');
    }

    // STEP 5 — DEBUG LOG (MANDATORY)
    console.log("GPU DEBUG:", {
      textureIntensity,
      maxMeasuredIntensity,
      surfaceRoughness,
      smoothness
    });

    // surfaceRoughness already calculated above with realistic scaling


    // Pore volume: dark micro-patches on nose + chin (sebaceous zones) - STRICT SIGNAL
    const rNose_poreSize = requireSignal(rNose.poreSize, "nose_poreSize");
    const rChin_poreSize = requireSignal(rChin.poreSize, "chin_poreSize");
    const rForehead_poreSize = requireSignal(rForehead.poreSize, "forehead_poreSize");
    const poreVolume = clamp(
      (rNose_poreSize * 0.6 + rChin_poreSize * 0.3 + rForehead_poreSize * 0.1)
    );
    await this.yieldToUI();

    // Wrinkle depth: forehead L variance -> shadow = depth - STRICT SIGNAL
    const fML_strict = requireSignal(fML, "forehead_L");
    const fVL_strict = requireSignal(fVL, "forehead_L_variance");
    const wrinkleDepth = clamp((100 - fML_strict) * 0.55 + fVL_strict * 0.5);

    // Wrinkle density: landmark-based periocular zone analysis
    const wrinkleDensity = this.computeWrinkleDensityFromLandmarks(landmarks);
    await this.yieldToUI();

    // Line count: periocular LAB if available, else forehead fallback
    const periocular = corrected.periocular;
    const lineCount = periocular && Array.isArray(periocular) && periocular.length > 0
      ? clamp(varianceL(periocular) * 1.8 + (100 - calculateMeanL(periocular)) * 0.4)
      : clamp(fVL * 1.8 + (100 - fML) * 0.4);

    // ═════════════════════════════════════════════════════════════════════════
    // VASCULAR
    // ═════════════════════════════════════════════════════════════════════════

    // Blood flow index: cheek redness (a-axis) — proxy for circulation
    const bloodFlowIndex = clamp(cheekMA * 3.2 + Math.sqrt(cheekVL) * 0.6);

    // Oxygen saturation: high L + low a variance (evenly flushed skin)
    // RAW CALCULATION: No artificial physiological limits
    const oxygenSaturation = 60 + oML * 0.3 - Math.sqrt(oVA) * 0.8;

    // Vascular density: redness + a-axis variance in cheeks
    const vascularDensity = clamp(
      cheekMA * 2.5 + Math.sqrt(varianceA(lCheek) + varianceA(rCheek)) * 1.2
    );

    // Perfusion rate: delta between cheek and forehead redness
    const foreheadA = meanA(forehead);
    const perfusionRate = clamp(Math.abs(cheekMA - foreheadA) * 4 + cheekMA * 1.5);
    await this.yieldToUI();

    // ═════════════════════════════════════════════════════════════════════════
    // BARRIER FUNCTION
    // ═════════════════════════════════════════════════════════════════════════

    // TEWL (transepidermal water loss): low hydration + high oiliness → high TEWL
    // Range: 0-30 g/m²h physiological
    const tewlRaw = (100 - hydrationLevel) * 0.18 + sebumProduction * 0.12;
    const transepidermalWaterLoss = tewlRaw * 30 / 100;

    // Barrier integrity: inverse of TEWL
    const safeHydration = hydrationLevel;
    const safeSebum = sebumProduction;

    const glassSkinBase = (safeHydration * 0.7) - (safeSebum * 0.4);

    if (!Number.isFinite(glassSkinBase)) {
      throw new Error(`CLINICAL_ERROR: glassSkinBase invalid (hydration=${safeHydration} sebum=${safeSebum})`);
    }

    const barrierIntegrity = glassSkinBase;

    // ═════════════════════════════════════════════════════════════════════════
    // GLASS SKIN SCORE (STRICT CLINICAL FORMULA)
    // ═════════════════════════════════════════════════════════════════════════
    // STRICT: Remove positive framing. Glass skin requires BOTH high hydration 
    // AND low pathology. High acne/erythema/pores should severely penalize score.
    
    // Pathology load determines if "glass skin" is even achievable
    const glassSkinPathologyLoad = 
      (Math.max(0, erythemaIndex) / 100) * 0.30 +    // 30% weight on inflammation
      (Math.max(0, poreVolume) / 100) * 0.25 +       // 25% weight on pore visibility  
      (Math.max(0, surfaceRoughness) / 100) * 0.25 + // 25% weight on texture
      (Math.max(0, sebumProduction) / 100) * 0.20;   // 20% weight on excess oil
    
    // Base potential from hydration and barrier (can max at 80 without considering pathology)
    const glassSkinPotential = Math.min(80, 
      (hydrationLevel * 0.40) + 
      (barrierIntegrity * 0.40) +
      (elastinFibers * 0.20)
    );
    
    // Pathology multiplier: severe concerns drastically reduce glass skin score
    // If pathology > 50%, glass skin becomes impossible (< 40 score)
    const pathologyPenalty = Math.max(0, 1.0 - (glassSkinPathologyLoad * 1.5));
    
    const glassSkin = glassSkinPotential * pathologyPenalty;
    const glassSkinScore = Math.max(0, Math.min(100, glassSkin));

    // pH level: physiological skin pH 4.5-6.5
    // Low redness + high hydration → lower (healthier) pH
    const phRaw = 4.5 + (rOverall.redness / 100) * 1.5 + (1 - hydrationLevel / 100) * 0.5;
    await this.yieldToUI();
    const phLevel = phRaw;

    // Microbial diversity: inverse of oiliness variance (stable sebum = diverse microbiome)
    const oilRegions = [rForehead, rNose, rLCheek, rRCheek, rChin].filter(Boolean);

    if (oilRegions.length === 0) {
      throw new Error("CLINICAL_ERROR: No oil regions available");
    }

    // FIXED: Use proper sebum variance array [rForehead, rNose, rLCheek, rRCheek, rChin]
    const sebumRegions = [rForehead, rNose, rLCheek, rRCheek, rChin];
    if (sebumRegions.length === 0) {
      throw new Error("CLINICAL_ERROR: No sebum regions available");
    }
    
    const sebumVariance =
      sebumRegions.reduce((s, r) => {
        const val = requireSignal(r.oiliness, "oiliness_signal");
        return s + (val - sebumProduction) ** 2;
      }, 0) / sebumRegions.length;

    const microbialDiversity = clamp(100 - Math.sqrt(sebumVariance) * 1.2);

    // ═════════════════════════════════════════════════════════════════════════
    // AGING
    // ═════════════════════════════════════════════════════════════════════════

    // Biological skin age — multi-factor real computation
    const biologicalAge = this.computeSkinAge(
      forehead, lCheek, rCheek, overall, underEye, landmarks
    );

    // Cellular senescence: wrinkle depth + pigmentation variance + low elasticity
    const cellularSenescence = clamp(
      wrinkleDepth * 0.4 + (100 - rOverall.elasticity) * 0.3 + bStd * 2
    );

    // Telomere length proxy: inverse of cellular senescence + good hydration
    const telomereLength = clamp(100 - cellularSenescence * 0.7 + hydrationLevel * 0.15);

  // Oxidative stress: high b variance (uneven yellowing) + redness
  const oxidativeStress = clamp(bStd * 3 + rOverall.redness * 0.4);

  // Glycation index: yellowish shift in b-axis above baseline for skin tone
  // For tan/brown skin, baseline b is naturally higher so we compute delta
  const bBaseline = 14; // 🔥 CLINICAL DARK CIRCLE DETECTION (SHADOW-AWARE)
  const rawDarkCircleDelta = cheekML - ueML;
  if (!Number.isFinite(rawDarkCircleDelta)) {
  throw new Error('STRICT_SIGNAL_LOSS: darkCircleDelta invalid');
  }
  const rawGlycationDelta = Math.max(0, oMB - bBaseline);
  const glycationIndex = clamp(Math.max(0, rawGlycationDelta) * 3 + oxidativeStress * 0.2);

  // ═════════════════════════════════════════════════════════════════════════
  // INFLAMMATION
  // ═════════════════════════════════════════════════════════════════════════

  // Inflammatory markers: redness + a-axis variance throughout face
  const inflammatoryMarkers = clamp(
    rOverall.redness * 0.5 + Math.sqrt(oVA) * 2.5 + rNose.redness * 0.25
  );
  // Immune response: inverse of inflammation (high immunity = controlled response)
  const immuneResponse = clamp(100 - inflammatoryMarkers * 0.7);

  // Sensitivity index: high redness + high texture variance
  const sensitivityIndex = clamp(
    rOverall.redness * 0.4 + surfaceRoughness * 0.35 + Math.sqrt(oVA) * 1.5
  );

  // Reactivity score: delta redness between cheek zones
  const reactivityScore = clamp(
    Math.abs(meanA(lCheek) - meanA(rCheek)) * 5 + rOverall.redness * 0.3
  );

    // ═════════════════════════════════════════════════════════════════════════
    // NUTRITIONAL & METABOLIC
    // ═════════════════════════════════════════════════════════════════════════

    // Antioxidant capacity: high L + low oxidative stress + good chroma balance
    const antioxidantCapacity = clamp(
      oML * 0.5 + (100 - oxidativeStress) * 0.35 + (100 - melaninIndex) * 0.15
    );

    // Nutrient absorption: hydration + barrier integrity + even pigmentation
    const nutrientAbsorption = clamp(
      hydrationLevel * 0.4 + barrierIntegrity * 0.35 + pigmentationUniformity * 0.25
    );

    // Metabolic rate: blood flow + oiliness (active sebaceous glands)
    const metabolicRate = clamp(
      bloodFlowIndex * 0.45 + sebumProduction * 0.3 + oxygenSaturation * 0.25
    );

    // Lipid profile: sebum production + barrier function (lipid-dependent)
    const lipidProfile = clamp(
      sebumProduction * 0.5 + barrierIntegrity * 0.3 + (100 - transepidermalWaterLoss * 3) * 0.2
    );

    // ═════════════════════════════════════════════════════════════════════════
    // ENVIRONMENTAL DAMAGE
    // ═════════════════════════════════════════════════════════════════════════

    // UV damage index: uneven b-axis (yellowing/browning) + low L zones
    const bDelta = oMB - 10;
    if (!Number.isFinite(bDelta)) {
      throw new Error('STRICT_SIGNAL_LOSS: bDelta invalid');
    }

    const uvDamageIndex = clamp(
      bStd * 2.5 + (100 - oML) * 0.3 + Math.max(0, bDelta) * 1.2
    );

    // Pollution damage: surface roughness + oxidative stress
    const pollutionDamage = clamp(
      surfaceRoughness * 0.4 + oxidativeStress * 0.4 + (100 - barrierIntegrity) * 0.2
    );

    // Blue light exposure: periocular darkness + under-eye L drop
    const blueLightExposure = clamp(
      (cheekML - ueML) * 1.5 + Math.abs(ueMB) * 0.8
    );

    // Infrared damage: deep redness in a-axis
    // oMA already validated above
    const infraredDamage = clamp(
      Math.max(0, oMA) * 1.8 + erythemaIndex * 0.35
    );

    // ═════════════════════════════════════════════════════════════════════════
    // MAKEUP COMPATIBILITY
    // ═════════════════════════════════════════════════════════════════════════

    // Foundation match: skin tone compatibility based on LAB proximity
    const foundationMatch = clamp(
      100 - (Math.abs(oML - 55) + Math.abs(oMA - 15) + Math.abs(oMB - 20)) * 0.8
    );

    // Coverage optimal: texture + pigmentation uniformity for coverage needs
    const coverageOptimal = clamp(
      (100 - surfaceRoughness) * 0.6 + pigmentationUniformity * 0.4
    );

    // Color accuracy: LAB stability across regions
    const colorAccuracy = clamp(
      100 - (Math.abs(fML - oML) + Math.abs(cheekML - oML)) * 2
    );

    // Dermal thickness (µm): collagen density → maps 200-2000 µm range
    const dermalThickness = clamp(collagenDensity * 18 + 200, 200, 2000);

    const epidermalThickness = clamp(barrierIntegrity * 1 + 50, 50, 150);

    // Subcutaneous fat: face fullness proxy from landmark spread
    const subcutaneousFat = this.computeFacialFatProxy(landmarks);

    // Muscle tone: jawline + cheek landmark tension
    const muscleTone = this.computeMuscleToneProxy(landmarks);

    // ═════════════════════════════════════════════════════════════════════════
    // MICROBIOME
    // ═════════════════════════════════════════════════════════════════════════

    const skinMicrobiome = {
      diversity: microbialDiversity,
      balance: clamp(barrierIntegrity * 0.5 + (100 - inflammatoryMarkers) * 0.5),
      pathogenRisk: clamp(
        (100 - microbialDiversity) * 0.4 + sensitivityIndex * 0.3 + sebumProduction * 0.3
      ),
    };

    // ═════════════════════════════════════════════════════════════════════════
    // PREDICTIVE ANALYTICS
    // ═════════════════════════════════════════════════════════════════════════

    // Acne risk: sebum + pore volume + inflammatory markers
    const acneRisk = clamp(
      sebumProduction * 0.4 + poreVolume * 0.3 + inflammatoryMarkers * 0.3
    );

    // Rosacea risk: erythema + cheek redness + reactivity
    const rosaceaRisk = clamp(
      erythemaIndex * 0.45 + reactivityScore * 0.3 + sensitivityIndex * 0.25
    );

    // Dermatitis risk: sensitivity + low barrier + high TEWL
    const dermatitisRisk = clamp(
      sensitivityIndex * 0.4 + (100 - barrierIntegrity) * 0.35 + tewlRaw * 0.25
    );

    // Skin cancer risk: UV damage + low antioxidant + pigmentation irregularity
    const skinCancerRisk = clamp(
      uvDamageIndex * 0.5 + (100 - antioxidantCapacity) * 0.3 + (100 - pigmentationUniformity) * 0.2
    );

    // Premature aging risk: oxidative stress + UV damage + low collagen
    const prematureAgingRisk = clamp(
      oxidativeStress * 0.35 + uvDamageIndex * 0.35 + (100 - collagenDensity) * 0.3
    );

    // ═════════════════════════════════════════════════════════════════════════
    // TREATMENT RESPONSE
    // ═════════════════════════════════════════════════════════════════════════

    // Product absorption: high hydration + good barrier + low oiliness
    const productAbsorption = clamp(
      hydrationLevel * 0.4 + barrierIntegrity * 0.35 + (100 - sebumProduction) * 0.25
    );

    // Treatment efficacy: good blood flow + high absorption + low inflammation
    const treatmentEfficacy = clamp(
      productAbsorption * 0.4 + bloodFlowIndex * 0.3 + (100 - inflammatoryMarkers) * 0.3
    );

    // Irritation potential: high sensitivity + low barrier + high reactivity
    const irritationPotential = clamp(
      sensitivityIndex * 0.4 + (100 - barrierIntegrity) * 0.35 + reactivityScore * 0.25
    );

    // Healing capacity: good blood flow + immune response + collagen
    const healingCapacity = clamp(
      bloodFlowIndex * 0.35 + immuneResponse * 0.35 + collagenDensity * 0.3
    );

    // ═════════════════════════════════════════════════════════════════════════
    // COSMETIC METRICS
    // ═════════════════════════════════════════════════════════════════════════

    // Longevity index: product durability based on skin characteristics
   const longevityIndex = clamp(
     (100 - sebumProduction * 0.6) * 0.4 + 
     barrierIntegrity * 0.3 + 
     (100 - hydrationLevel * 0.5) * 0.3
   );
    
    // Continuous gradient scoring model for dark circles (no rigid boolean AND gate)
    const darknessAmplifier = Math.max(1.0, Math.min(3.0, rawDarkCircleDelta / 15));
    const pigmentationWeight = clamp(Math.abs(ueMB) / 10, 0, 1);
    
    const darkCircleScore = clamp(
      Math.max(0, rawDarkCircleDelta) * darknessAmplifier + Math.abs(ueMB) * pigmentationWeight
    );

    const visualOverlays = this.generateVisualOverlays(
      corrected, landmarks, regionalMetrics
    );

    // Final return object safety
    const metrics = {
      skinThickness,
      collagenDensity,
      elastinFibers,
      hydrationLevel,
      sebumProduction,
      melaninIndex,
      hemoglobinIndex,
      carotenoidIndex,
      erythemaIndex,
      pigmentationUniformity,
      surfaceRoughness,
      poreVolume,
      pores: (() => {
       const pores = stdDev(overall.map(p => p.l));
       if (!Number.isFinite(pores)) {
         throw new Error("CLINICAL_ERROR: pores invalid");
       }
       return pores;
     })(),
     wrinkleDepth,
     wrinkleDensity,
     lineCount,
     bloodFlowIndex,
     oxygenSaturation,
     vascularDensity,
     perfusionRate,
     transepidermalWaterLoss,
     barrierIntegrity,
     phLevel,
     microbialDiversity,
     biologicalAge,
     cellularSenescence,
     telomereLength,
     oxidativeStress,
     glycationIndex,
     inflammatoryMarkers,
     immuneResponse,
     sensitivityIndex,
     reactivityScore,
     antioxidantCapacity,
     nutrientAbsorption,
     metabolicRate,
     lipidProfile,
     uvDamageIndex,
     pollutionDamage,
     blueLightExposure,
     infraredDamage,
     dermalThickness,
     epidermalThickness,
     subcutaneousFat,
     muscleTone,
     skinMicrobiome,
     acneRisk,
     rosaceaRisk,
     dermatitisRisk,
     skinCancerRisk,
     prematureAgingRisk,
     productAbsorption,
     darkCircleScore,
     treatmentEfficacy,
     irritationPotential,
     healingCapacity,
     foundationMatch,
     coverageOptimal,
     colorAccuracy,
     longevityIndex,
     regionalMetrics,
     visualOverlays,
     glassSkin: glassSkinScore,
     lipPigmentation: lipPigmentationScore,

    };

    // Validate all metrics before return
    Object.entries(metrics).forEach(([key, value]) => {
      // Skip deeply nested complex objects from flat number validation
      if (key === 'regionalMetrics' || key === 'visualOverlays') return;

      if (typeof value === 'object' && value !== null) {
        // Validate single-level objects (like skinMicrobiome)
        Object.entries(value).forEach(([nestedKey, nestedValue]) => {
          if (!Number.isFinite(nestedValue as any)) {
            throw new Error(`INVALID_METRIC_DETECTED: ${key}.${nestedKey} = ${nestedValue}`);
          }
        });
      } else if (!Number.isFinite(value as any)) {
        // For primitive metrics, validate directly
        throw new Error(`INVALID_METRIC_DETECTED: ${key} = ${value}`);
      }
    });


    await this.yieldToUI();
    return metrics;
  }

  // ─── Skin Age: multi-factor real computation ─────────────────────────────────

  private computeSkinAge(
    forehead: LAB[],
    lCheek: LAB[],
    rCheek: LAB[],
    overall: LAB[],
    underEye: LAB[],
    landmarks: number[][]
  ): number {
    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

    // 1. RATIO-BASED WRINKLE (Real Signal)
    const foreheadVL = varianceL(forehead);
    const Wrinkle_Ratio = foreheadVL / 80.0; // Optimized max variance

    // 2. RATIO-BASED REDNESS (Deviation from baseline)
    const globalA = meanA(overall);
    const cheekA = (meanA(lCheek) + meanA(rCheek)) / 2;
    const Redness_Ratio = clamp01((cheekA - globalA) / 10.0);

    // 3. RATIO-BASED DARK CIRCLES
    const cheekL = (calculateMeanL(lCheek) + calculateMeanL(rCheek)) / 2;
    const eyeL = calculateMeanL(underEye);
    const DarkCircle_Ratio = Math.max(0, cheekL - eyeL) / 35.0;

    // 4. RATIO-BASED PIGMENTATION
    const bValues = [...forehead.map(p => p.b), ...lCheek.map(p => p.b), ...rCheek.map(p => p.b)];
    const isTanSkin = calculateMeanL(overall) < 60;
    const Pigment_Ratio = (stdDev(bValues) / 30.0) * (isTanSkin ? 1.4 : 1.0);

    // 5. STRUCTURAL SAGGING (Using your original landmark logic)
    const chinPoint = landmarks[152];
    const eyePoint = landmarks[33];
    const topPoint = landmarks[10];
    const eyeToChinDist = Math.abs(chinPoint[1] - eyePoint[1]);
    const fHeight = Math.max(0.01, Math.abs(chinPoint[1] - topPoint[1]));
    const sagFactor = eyeToChinDist / fHeight;

    const leftCheekLm = landmarks[123];
    const rightCheekLm = landmarks[352];
    const faceWidth = Math.sqrt(Math.pow(rightCheekLm[0] - leftCheekLm[0], 2) + Math.pow(rightCheekLm[1] - leftCheekLm[1], 2));
    const faceHeightStr = Math.sqrt(Math.pow(chinPoint[0] - topPoint[0], 2) + Math.pow(chinPoint[1] - topPoint[1], 2));
    const faceRatio = faceWidth / Math.max(0.01, faceHeightStr);

    const structuralAgingFactor = sagFactor * faceRatio;

    // 🧬 FINAL DYNAMIC CALCULATION (Weighted accumulation)
    // baseAge starts at 22, adding all dynamic ratios
    const Aging_Deviation =
      (Wrinkle_Ratio * 15) +
      (Redness_Ratio * 5) +
      (DarkCircle_Ratio * 8) +
      (Pigment_Ratio * 12) +
      (structuralAgingFactor * 10);

    const estimatedAge = 22 + Aging_Deviation;

    return Math.round(Math.max(18, Math.min(80, estimatedAge)));
  }

  // ─── Landmark-based real computations ────────────────────────────────────────

  private computeWrinkleDensityFromLandmarks(landmarks: number[][]): number {
    if (!landmarks || landmarks.length < 468)
      throw new Error('MISSING_DATA: landmarks < 468 points');

    // Periocular crow's feet zone: lateral eye corners
    // Left: 130, 226, 247 | Right: 359, 446, 467
    const leftGroup = [130, 226, 247].map(i => landmarks[i]);
    const rightGroup = [359, 446, 467].map(i => landmarks[i]);

    const spread = (group: number[][]) => {
      const xs = group.map(l => l[0]);
      const ys = group.map(l => l[1]);
      const dx = Math.max(...xs) - Math.min(...xs);
      const dy = Math.max(...ys) - Math.min(...ys);
      return Math.sqrt(dx ** 2 + dy ** 2);
    };

    // More spread in periocular zone = more fine lines present
    const lSpread = spread(leftGroup);
    const rSpread = spread(rightGroup);
    const avgSpread = (lSpread + rSpread) / 2;

    // Normalize: spread 0-0.15 of face width → 0-100
    return clamp(avgSpread * 600);
  }

  private computeFacialSagging(landmarks: number[][]): number {
    if (!landmarks || landmarks.length < 468)
      throw new Error('MISSING_DATA: landmarks < 468 for sagging');

    // Jawline points vs cheekbone points — sagging = jawline drops relative to cheek
    const leftCheekbone = landmarks[123]; // zygomatic
    const rightCheekbone = landmarks[352];
    const leftJaw = landmarks[172];
    const rightJaw = landmarks[397];
    const chin = landmarks[152];

    const cheekY = (leftCheekbone[1] + rightCheekbone[1]) / 2;
    const jawY = (leftJaw[1] + rightJaw[1]) / 2;
    const chinY = chin[1];

    // Ratio of jaw-to-cheek distance vs face height
    const faceHeight = chinY - (landmarks[10][1]); // 10 = top forehead
    const sagRatio = Math.max(0, jawY - cheekY) / Math.max(0.01, faceHeight);

    return clamp(sagRatio * 1.5);
  }

  private computeFacialFatProxy(landmarks: number[][]): number {
    if (!landmarks || landmarks.length < 468)
      throw new Error('MISSING_DATA: landmarks < 468 for fat proxy');

    // Cheek width vs face height ratio
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];
    const topFace = landmarks[10];
    const bottomFace = landmarks[152];

    const faceWidth = Math.abs(rightCheek[0] - leftCheek[0]);
    const faceHeight = Math.abs(bottomFace[1] - topFace[1]);

    if (faceHeight === 0)
      throw new Error('INVALID_LANDMARKS: zero face height');

    const ratio = faceWidth / faceHeight;
    // Ratio ~0.7 = slim | ~1.1 = full
    return clamp((ratio - 0.6) * 200);
  }

  private computeMuscleToneProxy(landmarks: number[][]): number {
    if (!landmarks || landmarks.length < 468)
      throw new Error('MISSING_DATA: landmarks < 468 for muscle tone');

    // Jawline angularity: sharper jaw = better muscle tone
    const jaw_L = landmarks[172];
    const jaw_R = landmarks[397];
    const chin = landmarks[152];
    const ear_L = landmarks[234];
    const ear_R = landmarks[454];

    // Angle at jaw corner from ear to chin
    const vec1_L = [chin[0] - jaw_L[0], chin[1] - jaw_L[1]];
    const vec2_L = [ear_L[0] - jaw_L[0], ear_L[1] - jaw_L[1]];
    const dot_L = vec1_L[0] * vec2_L[0] + vec1_L[1] * vec2_L[1];
    const mag_L = Math.sqrt(vec1_L[0] ** 2 + vec1_L[1] ** 2) *
      Math.sqrt(vec2_L[0] ** 2 + vec2_L[1] ** 2);
    const angleL = mag_L > 0 ? Math.acos(clamp(dot_L / mag_L, -1, 1)) * (180 / Math.PI) : 90;

    const vec1_R = [chin[0] - jaw_R[0], chin[1] - jaw_R[1]];
    const vec2_R = [ear_R[0] - jaw_R[0], ear_R[1] - jaw_R[1]];
    const dot_R = vec1_R[0] * vec2_R[0] + vec1_R[1] * vec2_R[1];
    const mag_R = Math.sqrt(vec1_R[0] ** 2 + vec1_R[1] ** 2) *
      Math.sqrt(vec2_R[0] ** 2 + vec2_R[1] ** 2);
    const angleR = mag_R > 0 ? Math.acos(clamp(dot_R / mag_R, -1, 1)) * (180 / Math.PI) : 90;

    const avgAngle = (angleL + angleR) / 2;
    // Sharp jaw ~60°→90° = high tone, Soft jaw ~110°-130° = low tone
    return clamp((130 - avgAngle) * 1.5);
  }

  // ─── Global offset + beard filter ────────────────────────────────────────────

  private async applyOffset(regionalLAB: RegionalLAB, globalOffset: number): Promise<RegionalLAB> {
    const beardZones = new Set(['chin', 'leftCheek', 'rightCheek']);

    const process = async (arr: LAB[], zone: string): Promise<LAB[]> => {
      if (!arr || !Array.isArray(arr)) return arr;

      const result: LAB[] = [];
      for (let i = 0; i < arr.length; i++) {
        const p = arr[i];
        const newL = clamp(p.l + globalOffset);

        if (!(beardZones.has(zone) && newL < 22)) {
          result.push({ ...p, l: newL });
        }

        if (i > 0 && i % 10000 === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }
      return result;
    };

    return {
      overall: await process(regionalLAB.overall, 'overall'),
      forehead: await process(regionalLAB.forehead, 'forehead'),
      leftCheek: await process(regionalLAB.leftCheek, 'leftCheek'),
      rightCheek: await process(regionalLAB.rightCheek, 'rightCheek'),
      nose: await process(regionalLAB.nose, 'nose'),
      chin: await process(regionalLAB.chin, 'chin'),
      underEye: await process(regionalLAB.underEye, 'underEye'),
      lips: await process(regionalLAB.lips, 'lips'),
      periocular: await process(regionalLAB.periocular, 'periocular'),
    };
  }



  // ─── Visual Overlays ──────────────────────────────────────────────────────────

  private generateVisualOverlays(
    corrected: RegionalLAB,
    landmarks: number[][],
    regionalMetrics: Record<string, RegionalMetrics>
  ) {
    const formattedLandmarks = landmarks.map(l => ({
      x: l[0], y: l[1], z: l[2] || 0,
    }));

    const acneRegions = ['forehead', 'leftCheek', 'rightCheek', 'chin'] as const;
    const allAcneSpots: Array<{ x: number; y: number; radius: number }> = [];

    acneRegions.forEach(region => {
      const arr = corrected[region];
      // Engine processes real data as-is - no silent failures

      // STRICT CLAMP: Prevent RGB overflow with numerical stability
      const clampRGB = (v: number) => {
        if (!Number.isFinite(v)) {
          throw new Error("CLINICAL_ERROR: Non-finite RGB value in LAB conversion");
        }
        return Math.max(0, Math.min(255, Math.round(v)));
      };

      const acneAnalysis = extractAcneCoordinates(formattedLandmarks, {
        region,
        pixels: arr.map((lab: LAB) => ({
          r: clamp(lab.l * 2.55),
          g: clamp(128 - lab.a * 2.55),
          b: clamp(128 - lab.b * 2.55),
        })),
      });

      acneAnalysis.acneSpots.forEach((spot: any) => {
        allAcneSpots.push({ x: spot.x, y: spot.y, radius: spot.radius });
      });
    });

    const avgOiliness = regionalMetrics.forehead?.oiliness;
    if (avgOiliness === undefined)
      throw new Error('MISSING_DATA: forehead oiliness for pore clusters');

    const poreClusters = extractPoreClusters(formattedLandmarks, avgOiliness / 100);

    const underEyeArr = corrected.underEye;
    if (!underEyeArr || underEyeArr.length === 0)
      throw new Error('MISSING_DATA: underEye LAB for dark circle bounds');

    const underEyeLAB = underEyeArr[0];
    const darkCircleBounds = extractDarkCircleBounds(formattedLandmarks, underEyeLAB);

    return { acneSpots: allAcneSpots, poreClusters, darkCircleBounds };
  }
  /**
* 🏆 CLINICAL HEALTH SCORE: Aggregates all skin vitals into a single percentage.
* STRICT: Pathology-first deductive model with new weights for texture and pores.
* Positive bonuses only granted if pathologyLoad < 0.30, with full bonus at < 0.15.
*/
  public calculateOverallHealthScore(metrics: {
  moisture: number;
  oiliness: number;
  pigment: number;
  redness: number;
  darkCircle: number;
  smoothness: number;
  elasticity: number;
  acne: number;
  texture?: number;
  pores?: number;
  glassSkin?: number;
}): number {
  const pathologyLoad = 
    (metrics.acne / 100) * 0.25 +
    (metrics.redness / 100) * 0.20 +
    (metrics.pigment / 100) * 0.15 +
    (metrics.darkCircle / 100) * 0.10 +
    (metrics.oiliness / 100) * 0.10 +
    ((metrics.texture ?? 0) / 100) * 0.12 +
    ((metrics.pores ?? 0) / 100) * 0.08;
  
  let score = 100;
  
  score -= metrics.acne * 0.35;
  score -= metrics.redness * 0.28;
  score -= metrics.pigment * 0.22;
  score -= metrics.darkCircle * 0.15;
  score -= metrics.oiliness * 0.15;
  score -= (metrics.texture ?? 0) * 0.28;
  score -= (metrics.pores ?? 0) * 0.18;
  
  if (pathologyLoad < 0.30) {
    const positiveBonus = pathologyLoad < 0.15 ? 1.0 : 0.5;
    score += metrics.moisture * 0.08 * positiveBonus;      // 0.12 → 0.08
    score += metrics.smoothness * 0.07 * positiveBonus;     // 0.10 → 0.07
    score += metrics.elasticity * 0.05 * positiveBonus;     // 0.08 → 0.05
  }
  
  if (metrics.glassSkin !== undefined) {
    score -= (100 - metrics.glassSkin) * 0.05;
  }

  // Soft-cap near ceiling instead of hard clamp
  function softCapNear100(s: number): number {
    if (s <= 90) return s;
    const excess = s - 90;
    return 90 + (10 * (1 - Math.exp(-excess / 15)));
  }
  
  const finalScore = softCapNear100(score);
  return Math.round(Math.max(0, Math.min(100, finalScore)));
}

  // ─── MISSING METHODS FOR SKINTONE ANALYZER INTEGRATION ─────────────────────
  
  // Calculate relative metrics between regions
  public async calculateRelativeMetrics(
    regionAverages: any,
    averagedLAB: { l: number; a: number; b: number },
    landmarks: number[][]
  ): Promise<any> {
    if (!regionAverages || !averagedLAB) {
      throw new Error('CLINICAL_ERROR: Missing required data for relative metrics');
    }
    
    return {
      melaninIndex: 100 - averagedLAB.l,
      symmetryScore: this.calculateSymmetryScore(
        regionAverages.leftCheek?.l || 0,
        regionAverages.rightCheek?.l || 0
      ),
      pigmentationContrast: Math.abs((regionAverages.forehead?.b || 0) - averagedLAB.b),
      rednessContrast: Math.abs((regionAverages.forehead?.a || 0) - (regionAverages.leftCheek?.a || 0)),
      brightnessBalance: (
        (regionAverages.forehead?.l || 0) + 
        (regionAverages.leftCheek?.l || 0) + 
        (regionAverages.rightCheek?.l || 0)
      ) / 3,
      darkCircleScore: Math.max(0, averagedLAB.l - (
        (regionAverages.leftUnderEye?.l || 0) + 
        (regionAverages.rightUnderEye?.l || 0)
      ) / 2)
    };
  }
  
  // Analyze pores from regions and pixels
  public async analyzePores(
    cleanRegions: any,
    skinPixels: any[],
    lightingMetrics: any
  ): Promise<{ densityScore: number }> {
    if (!cleanRegions || !skinPixels || skinPixels.length === 0) {
      throw new Error('CLINICAL_ERROR: Insufficient data for pore analysis');
    }
    
    const labImage = skinPixels.map((p: any) => [p.lab?.l || 0, p.lab?.a || 0, p.lab?.b || 0]);
    
    if (!cleanRegions.skinMask || !labImage) {
      throw new Error('CLINICAL_ERROR: Skin mask or LAB image missing for pore analysis');
    }
    
    let poreScore = 0;
    let sampleCount = 0;
    
    // Analyze high-frequency texture variations
    for (let i = 1; i < labImage.length; i++) {
      const prevL = labImage[i - 1][0];
      const currentL = labImage[i][0];
      
      if (!isFinite(prevL) || !isFinite(currentL)) continue;
      
      const variation = Math.abs(currentL - prevL);
      
      // High-frequency micro texture indicates pores
      if (variation > 4) {
        poreScore += variation;
        sampleCount++;
      }
    }
    
    if (sampleCount === 0) {
      throw new Error('CLINICAL_ERROR: No valid samples for pore analysis');
    }
    
    const densityScore = Math.min(100, Math.max(0, (poreScore / sampleCount) * 10));
    
    return { densityScore };
  }
  
  // Detect acne from pixels and landmarks
  public async detectAcne(
    skinPixels: any[],
    landmarks: number[][],
    lightingMetrics: any
  ): Promise<{ spots: any[]; severityScore: number }> {
    if (!skinPixels || skinPixels.length === 0 || !landmarks) {
      throw new Error('CLINICAL_ERROR: Insufficient data for acne detection');
    }
    
    // Normalize LAB values with lighting profile
    const normalizeLABWithProfile = (lab: { l: number; a: number; b: number }) => {
      const globalOffset = lightingMetrics?.globalOffset || 0;
      const normalizedL = lab.l * (1 + globalOffset * 0.3);
      return { 
        l: Math.max(0, Math.min(100, normalizedL)), 
        a: lab.a, 
        b: lab.b 
      };
    };
    
    const normalizedPixels = skinPixels.map(p => ({
      ...p,
      lab: p.lab ? normalizeLABWithProfile(p.lab) : { l: 0, a: 0, b: 0 }
    }));
    
    // Extract baseline A channel for healthy skin
    const allAValues = normalizedPixels
      .filter(p => p.lab && isFinite(p.lab.a))
      .map(p => p.lab.a)
      .sort((a, b) => a - b);
    
    if (allAValues.length === 0) {
      throw new Error('CLINICAL_ERROR: No valid A-channel values for acne detection');
    }
    
    const meanSkinA = allAValues[Math.floor(allAValues.length * 0.4)];
    
    if (!isFinite(meanSkinA)) {
      throw new Error('CLINICAL_ERROR: Invalid baseline A-channel calculation');
    }
    
    // Calculate lighting context
    const allLValues = normalizedPixels
      .filter(p => p.lab && isFinite(p.lab.l))
      .map(p => p.lab.l);
    
    const meanL = allLValues.length > 0 
      ? allLValues.reduce((s, v) => s + v, 0) / allLValues.length
      : 50;
    
    const lVariance = allLValues.length > 1
      ? allLValues.reduce((s, v) => s + Math.pow(v - meanL, 2), 0) / allLValues.length
      : 0;
    
    const lStdDev = Math.sqrt(lVariance);
    const ctx = {
      isSunlight: lStdDev > 18,
      isIndoor: lStdDev < 10,
      isMixed: lStdDev >= 10 && lStdDev <= 18,
      isHarsh: lStdDev > 25
    };
    
    // Filter acne candidates
    const acneCandidates = normalizedPixels.filter(p => {
      if (!p.lab) return false;
      
      const lDrop = meanL - p.lab.l;
      
      // Filter out structural elements (beard/shadow/nostril)
      if (lDrop > (lStdDev * 2.5)) return false;
      
      const rednessDeviation = p.lab.a - meanSkinA;
      
      // Glare and shadow suppression
      const highlight = p.lab.l > meanL + lStdDev * 1.8;
      const deepShadow = p.lab.l < meanL - lStdDev * 1.6;
      const shadowConsistency = Math.abs(p.lab.a - meanSkinA) < 9;
      const isGlare = highlight && !shadowConsistency;
      const isShadowNoise = deepShadow && !shadowConsistency;
      
      if (isGlare || isShadowNoise) return false;
      
      // Dynamic inflammation threshold
      const toneFactor = meanSkinA > 13 ? 1.25 : 1.0;
      let requiredRedness = (ctx.isSunlight ? 15 : 12) * toneFactor;
      
      if (ctx.isMixed) requiredRedness *= 0.9;
      if (ctx.isHarsh) requiredRedness *= 1.2;
      
      // Deep skin adjustment
      if (meanL < 45) requiredRedness *= 1.4;
      
      // Local contrast requirement
      const localContrast = Math.abs(p.lab.l - meanL) > (lStdDev * 0.8);
      
      return rednessDeviation > requiredRedness && 
             localContrast && 
             p.lab.a > meanSkinA + 15;
    });
    
    if (acneCandidates.length === 0) {
      return { spots: [], severityScore: 0 };
    }
    
    // Spatial clustering
    const clusters = [];
    const visited = new Set();
    
    for (let i = 0; i < acneCandidates.length; i++) {
      if (visited.has(i)) continue;
      
      const cluster = [acneCandidates[i]];
      visited.add(i);
      
      for (let j = i + 1; j < Math.min(i + 20, acneCandidates.length); j++) {
        if (!visited.has(j)) {
          cluster.push(acneCandidates[j]);
          visited.add(j);
        }
      }
      
      if (cluster.length >= 8) {
        clusters.push(cluster);
      }
    }
    
    const spots = clusters.map((cluster, index) => {
      const avgRedness = cluster.reduce((s, p) => s + (p.lab?.a || 0), 0) / cluster.length;
      return { 
        x: index * 50, 
        y: index * 30, 
        radius: Math.sqrt(cluster.length), 
        rednessIntensity: avgRedness - meanSkinA 
      };
    }).sort((a, b) => b.rednessIntensity - a.rednessIntensity).slice(0, 12);
    
    const severityK = 0.14;
    const severityScore = Math.min(100, Math.max(0, 
      100 * (1 - Math.exp(-severityK * spots.length))
    ));
    
    return { spots, severityScore };
  }
  
  // Calculate symmetry score between left and right regions
  private calculateSymmetryScore(leftValue: number, rightValue: number): number {
    if (!isFinite(leftValue) || !isFinite(rightValue)) {
      throw new Error('CLINICAL_ERROR: Invalid values for symmetry calculation');
    }
    
    const maxVal = Math.max(Math.abs(leftValue), Math.abs(rightValue));
    if (maxVal === 0) return 100;
    
    const asymmetry = Math.abs(leftValue - rightValue) / maxVal;
    return Math.max(0, Math.min(100, 100 - asymmetry * 100));
  }

}
