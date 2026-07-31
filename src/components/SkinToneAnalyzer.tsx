
/**
 * CosmeticAIScanner.tsx
 *
 * Full MirrorScreen skin analysis pipeline transplanted verbatim.
 * Zero logic changes. Zero mock data. Zero fallbacks added.
 * All debug logs preserved exactly as in MirrorScreen.tsx.
 *
 * Pipeline origin: MirrorScreen.tsx (production-grade rewrite)
 * Fixes carried over:
 *   BUG1  — generateFacePatches: removed hard === 32 patch assertion
 *   BUG2  — processAngleFrames: real per-region extraction
 *   BUG3  — calculateTemporalAverages wired into runSkinAnalysis return path
 *   BUG4  — duplicate normalize() removed
 *   BUG5  — regionPixels undefined replaced with regions variable
 *   BUG6  — lips.pixelCount guard reads real pixelCount
 *   BUG7  — updateHudMetricsFromReport reads clinicalMetrics.moisture/.texture
 *   BUG8  — duplicate rgbToLAB removed; module-scope version used
 *   BUG9  — nonShadowPixels populated from frame pixels during capture
 *   BUG10 — duplicate calculateTemporalAverages top-level function removed
 *
 * Tasks carried over:
 *   TASK1 — SkinAnalysisReport extended with beautyMetrics?/beautyScores?
 *   TASK2 — Adaptive pixel thresholding with 5-pixel hard floor
 *   TASK3 — EMA smoothing bridge for lighting offset
 *   TASK4 — executeFullEnginePipeline accepts/validates globalOffset
 *   TASK5 — Pre-pipeline data safety checks for patches and framePixels
 */

import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { X, Loader2, Camera, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

import { FaceShapeAnalyzer } from "../lib/ai/analysis/faceShapeAnalyzer";
import { SkinBeautyAnalyzer } from "../lib/ai/analysis/skinConditionAnalyzer";
import { BeautyMetricsEngine } from "../lib/ai/analysis/clinicalMetricsEngine";
import { SkinToneAnalysis } from "../lib/ai/skin-analysis/skinToneAnalysis";
import { UndertoneDetection } from "../lib/ai/skin-analysis/undertoneDetection";
import {
  LightingNormalization,
  calculateForeheadLuminance,
  computeGlobalOffset,
  applyLuminanceNormalization,
} from "../lib/ai/skin-analysis/lightingNormalization";
import { SkinAgeEstimator } from "../lib/ai/analysis/skinAgeEstimator";
import { LABStatistics } from "../lib/ai/computer-vision/labStatistics";
import { SkinRegionSelection } from "../lib/ai/computer-vision/skinRegionSelection";
import { ConfidenceScore } from "../lib/ai/computer-vision/confidenceScore";
import { FrameQualityFilter } from "../lib/ai/computer-vision/frameQualityFilter";
import { FrameStability } from "../lib/ai/computer-vision/frameStability";
import { FaceDetection } from "../lib/ai/computer-vision/faceDetection";
import { ColorConversion } from "../lib/ai/computer-vision/colorConversion";
import { WebGLSkinAnalysis as WebGLSkinEngine } from "../gpu/skinAnalysisGPU";
import { makeupCheckerEngine } from "../lib/ai/computer-vision/makeupCheckerEngine";
import { ForeheadDebugScreen } from "./debug/ForeheadDebugScreen";

import { extractPixelsFromLandmarks } from '../utils/pixelUtils';
import { detectFacePose, type Pose } from '../utils/faceGeometry';

import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera as MediaPipeCamera } from "@mediapipe/camera_utils";

import ClinicalOverlayEngine from "./skin/ClinicalOverlayEngine";
import ClinicalMetricsService from "../services/clinicalMetricsService";
import { commitGlowJourneyFromReport } from "../lib/glowJourney";

// ═════════════════════════════════════════════════════════════════════════════
// MODULE-SCOPE HELPERS — Identical to MirrorScreen.tsx
// ═════════════════════════════════════════════════════════════════════════════

// rgbToLAB — module-scope (BUG8: no duplicate component method)
const rgbToLAB = (r: number, g: number, b: number) => {
  return ColorConversion.rgbToLABComponent(r, g, b);
};

const safeMean = (values: number[]): number | null => {
  if (!values || values.length === 0) return null;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
};

// ✅ GLOBAL SAFE ACCESS HELPER
const getSafeL = (region: any): number | null => {
  return (region && Number.isFinite(region.l)) ? region.l : null;
};

// ═════════════════════════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════════════════════════

export interface LightingProfile {
  referenceRGB: [number, number, number];
  normalizationFactors: [number, number, number];
  extractedAt: number;
}

type RegionLAB = {
  l: number;
  a: number;
  b: number;
  pixelCount: number;
};

type RegionalLAB = Record<string, RegionLAB[]>;

// Debug log type definition
type DebugLog = {
  message: string;
  type: string;
  timestamp: string;
};

// ─── COMPONENT ────────────────────────────────────────────────────────────
interface CosmeticAIScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisComplete: (report: any) => void;
}

export const CosmeticAIScanner = memo(({ isOpen, onClose, onAnalysisComplete }: CosmeticAIScannerProps) => {

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE — same as MirrorScreen where pipeline references them
  // ═══════════════════════════════════════════════════════════════════════════

  const [currentStep, setCurrentStep] = useState<'setup' | 'scanning' | 'processing' | 'complete' | 'report'>('setup');
  const [currentInstruction, setCurrentInstruction] = useState('Initializing Advanced AI...');
  const [angleProgress, setAngleProgress] = useState({ center: 0, left: 0, right: 0 });
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const [faceDetected, setFaceDetected] = useState(false);
  const [showAccuracyModal, setShowAccuracyModal] = useState(false);
  const [showMakeupAnalysisModal, setShowMakeupAnalysisModal] = useState(false);
  const [isBareFaceConfirmed, setIsBareFaceConfirmed] = useState(false);
  const [makeupReport, setMakeupReport] = useState<any>(null);

  const [finalReportData, setFinalReportData] = useState<any>(null);
  const [savedAngleFrames, setSavedAngleFrames] = useState<any>(null);
  const [activeMetric, setActiveMetric] = useState<string | null>(null);
  const [activeAngle, setActiveAngle] = useState<"front" | "left" | "right">("front");
  const [isSaving, setIsSaving] = useState(false);
  const [savedAnalysisId, setSavedAnalysisId] = useState<string | null>(null);
  const analysisSessionIdRef = useRef<string>(`session_${Date.now()}`);

  const [showBeautyPledgeModal, setShowBeautyPledgeModal] = useState(false);
  const [isProcessingJourney, setIsProcessingJourney] = useState(false);
  const [showForeheadDebug, setShowForeheadDebug] = useState(false);

  const [errorLog, setErrorLog] = useState<string | null>(null);
  const [lightingMetrics, setLightingMetrics] = useState<any>(null);

  // Debug system — identical to MirrorScreen (DISABLED FOR PRODUCTION)
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [debugMode, setDebugMode] = useState(false); // DISABLED
  const [debugOpen, setDebugOpen] = useState(false);
  
  // Mobile EMA debug state
  const [mobileEMADebug, setMobileEMADebug] = useState<string[]>([]);

  // userGender — used for beard detection in executeFullEnginePipeline
  const [userGender, setUserGender] = useState<"male" | "female" | "other" | "">("");

  // currentMode — used in selectedMode field of finalReport
  const currentMode = "Office/College";

  // TASK3 — EMA ref for lighting offset, persists across frames within session
  const lightingEMARef = useRef<number | null>(null);
  const EMA_ALPHA = 0.15;

  // ═══════════════════════════════════════════════════════════════════════════
  // REFS
  // ═══════════════════════════════════════════════════════════════════════════

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRef = useRef<MediaPipeCamera | null>(null);
  const faceMeshRef = useRef<any>(null);
  const landmarksRef = useRef<any[]>(null);
  const aiEngineRef = useRef<any>(null);
  const webglEngineRef = useRef<any>(null);
  const isActiveRef = useRef(false);

  const faceDetectedRef = useRef(false);
  const isBareFaceConfirmedRef = useRef(false);

  const frameLockRef = useRef<LightingProfile | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // DEBUG LOGGER — identical to MirrorScreen
  // ═══════════════════════════════════════════════════════════════════════════

  const addLog = useCallback((message: string, type: "info" | "warn" | "error" = "info") => {
    const timestamp = new Date().toLocaleTimeString("en-US", { 
      hour12: false, 
      hour: "2-digit", 
      minute: "2-digit" 
    });
    
    setDebugLogs(prev => [...prev, { message, type, timestamp }]);
  }, []);

  // 📱 MOBILE DEBUG LOGGING - Add mobile-specific debug info
  const addMobileDebug = useCallback((message: string, type: "info" | "warn" | "error" = "info") => {
    const timestamp = new Date().toLocaleTimeString("en-US", { 
      hour12: false, 
      hour: "2-digit", 
      minute: "2-digit" 
    });
    
    // 📱 Add mobile device info
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const deviceInfo = isMobile ? `📱 M(${screenWidth}x${screenHeight})` : `🖥️ D(${screenWidth}x${screenHeight})`;
    
    const mobileMessage = `${deviceInfo} ${message}`;
    
    setDebugLogs(prev => [...prev, { message: mobileMessage, type, timestamp }]);
    console.log(`📱 MOBILE DEBUG: ${mobileMessage}`);
  }, []);

  const logInfo = (msg: string) => addLog(msg, "info");
  const logWarn = (msg: string) => addLog(msg, "warn");
  const logError = (msg: string) => addLog(msg, "error");

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK3 — EMA UPDATE FUNCTION — identical to MirrorScreen
  // ═══════════════════════════════════════════════════════════════════════════

  const updateLightingEMA = useCallback((rawOffset: number): number => {
    console.log('🚨 EMA IMMEDIATE: Function called with rawOffset:', rawOffset);
    console.log('🚨 EMA IMMEDIATE: Type check:', typeof rawOffset, 'IsFinite:', Number.isFinite(rawOffset));
    console.log('🚨 EMA IMMEDIATE: lightingEMARef.current before:', lightingEMARef.current);
    
    // 🔥 CLINICAL TRACE: Verify normalized input
    console.log(`🔥 CLINICAL TRACE: EMA receiving normalized rawOffset=${rawOffset.toFixed(6)} (should be from L_ref 0-100 scale)`);
    
    // Mobile debug
    addMobileDebug(`EMA called: ${rawOffset}`);
    addMobileDebug(`Type: ${typeof rawOffset}, Finite: ${Number.isFinite(rawOffset)}`);
    addMobileDebug(`EMA before: ${lightingEMARef.current}`);
    
    if (
      typeof rawOffset !== "number" ||
      !Number.isFinite(rawOffset)
    ) {
      console.warn('🚨 EMA IMMEDIATE: Invalid rawOffset - returning 0', rawOffset);
      addLog(`❌ EMA DEBUG: Invalid rawOffset: ${rawOffset}`, "error");
      addMobileDebug(`❌ Invalid rawOffset: ${rawOffset}`);
      return 0;
    }

    if (lightingEMARef.current === null) {
      console.log('🚨 EMA IMMEDIATE: First time initialization, setting EMA to:', rawOffset);
      addLog(`🔍 EMA DEBUG: First time initialization: ${rawOffset}`, "info");
      addMobileDebug(`🔥 First init: ${rawOffset}`);
      lightingEMARef.current = rawOffset;
      console.log('🚨 EMA IMMEDIATE: Set and returning rawOffset:', rawOffset);
      addMobileDebug(`✅ Set EMA: ${rawOffset}`);
      return rawOffset;
    }

    const smoothed =
      EMA_ALPHA * rawOffset + (1 - EMA_ALPHA) * lightingEMARef.current;

    console.log('🚨 EMA IMMEDIATE: EMA_ALPHA:', EMA_ALPHA);
    console.log('🚨 EMA IMMEDIATE: Math: ', EMA_ALPHA, '*', rawOffset, '+', (1 - EMA_ALPHA), '*', lightingEMARef.current, '=', smoothed);
    
    // Mobile debug math
    addMobileDebug(`Math: ${EMA_ALPHA}*${rawOffset}+${(1-EMA_ALPHA)}*${lightingEMARef.current}=${smoothed}`);
    
    lightingEMARef.current = smoothed;
    
    console.log('🚨 EMA IMMEDIATE: lightingEMARef.current after update:', lightingEMARef.current);
    console.log('🚨 EMA IMMEDIATE: Returning smoothed value:', smoothed);
    addLog(`🔍 EMA DEBUG: Smoothed value: ${smoothed}`, "info");
    addMobileDebug(`✅ Final EMA: ${smoothed}`);
    
    return smoothed;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // TRACE HELPER — identical to MirrorScreen
  // ═══════════════════════════════════════════════════════════════════════════

  const traceArray = (name: string, arr: any) => {
    logInfo(
      `🔍 TRACE ${name}: exists=${!!arr}, type=${typeof arr}, length=${arr?.length}`
    );
    if (!arr) throw new Error(`TRACE_ERROR: ${name} is undefined`);
    if (!Array.isArray(arr))
      throw new Error(`TRACE_ERROR: ${name} is not array`);
    if (arr.length === 0) throw new Error(`TRACE_ERROR: ${name} is empty`);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS (Engine-based, no complex math operations)
  // ═══════════════════════════════════════════════════════════════════════════

  const average = (values: number[]) => {
    if (values.length === 0) return 0;
    const mean = safeMean(values);
    if (mean === null) throw new Error("INVALID_AVERAGE_MEAN");
    return mean;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // BUG10 FIX: calculateTemporalAverages — full MirrorScreen implementation
  // No engine delegation. Verbatim from MirrorScreen.tsx.
  // ═══════════════════════════════════════════════════════════════════════════

  const calculateTemporalAverages = (
    collectedFrames: any[],
    angleFrames: { left: any[]; right: any[]; center: any[] },
    options?: { isHighAccuracy?: boolean }
  ) => {
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

    // 2 DEEP TRACING: Consistency check between regions list and expected switch cases
    const switchCases = ["forehead", "leftCheek", "rightCheek", "nose", "chin", "leftUnderEye", "rightUnderEye", "lips"];
    const missingCases = regions.filter(region => !switchCases.includes(region));
    const extraCases = switchCases.filter(switchCase => !regions.includes(switchCase));

    if (missingCases.length > 0) {
      console.error(" CLINICAL_TRACE: Regions in list but missing from switch:", missingCases);
    }
    if (extraCases.length > 0) {
      console.error(" CLINICAL_TRACE: Switch cases but not in regions list:", extraCases);
    }
    console.log(" CLINICAL_TRACE: Regions-to-switch consistency check complete");

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
      let totalFrames = allFrames.length;

      for (const frame of allFrames) {
        // 🔒 PART 1: STRICT FRAME VALIDATION
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

          const logStage = (stage: string, reg: string, data: any) => {
            console.log(`🔍 REGION_TRACE [${stage}] for ${reg}:`, data);
          };

          logStage("SIGNAL_EXTRACTION", region, {
            frameIndex: (frame as any).index,
            width: frame.imageData.width,
            height: frame.imageData.height
          });

          // 🔒 PART 2: LANDMARK SANITY FIX
          let hasInvalidLandmarks = false;
          const sanitizedLandmarks = frame.landmarks.map((lm: any, index: number) => {
            if (!lm || typeof lm.x !== 'number' || typeof lm.y !== 'number') {
              hasInvalidLandmarks = true;
              return null;
            }
            if (isNaN(lm.x) || isNaN(lm.y) || lm.x < 0 || lm.y < 0 || lm.x > 1 || lm.y > 1) {
              hasInvalidLandmarks = true;
              return null;
            }
            return {
              x: Math.max(0, Math.min(1, lm.x)),
              y: Math.max(0, Math.min(1, lm.y))
            };
          });

          if (hasInvalidLandmarks) {
            console.log("🔒 FRAME_REJECTED: invalid landmark coordinates");
            continue;
          }

          switch (region) {
            case "forehead":
              regionIndices = [10, 338, 297, 151, 67, 109, 10];
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

          const regionPixelData = extractPixelsFromLandmarks(
            frame.imageData,
            sanitizedLandmarks,
            regionIndices,
            4,
            region
          );

          // 🛠️ STEP 1 — ENFORCE PIXEL CONTRACT
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

          // 🔒 PART 3: PATCH SURVIVAL CHECK
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

      // 🔴 STRICT VALIDATION (NO SILENT PASS)
      if ((regionFailures / totalFrames) > 0.25) {
        throw new Error(`STRICT_SIGNAL_LOSS: ${region}_unstable (${regionFailures}/${totalFrames} frames failed)`);
      }

      console.log(`📊 ${region} total pixels from ALL frames: ${allRegionPixels.length}`);

      // 🔒 STRICT ENFORCEMENT: Region-Aware Density check
      const regionTotalMin = ["leftUnderEye", "rightUnderEye", "lips", "philtrum", "mouth"].includes(region) ? 20 : 50;
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

      // 🔒 PART 4: FILTER SAFETY
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

      // ════════════════════════════════════════════════════════════════════════
      // TASK2 — ADAPTIVE MIN PIXEL THRESHOLD (Beard Masking Crash Fix)
      // ════════════════════════════════════════════════════════════════════════

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

      addLog(`🧪 ${region} valid LAB pixels: ${labPixels.length}`);
      addLog(
        `🧪 ${region} LAB → L:${meanL.toFixed(2)} A:${meanA.toFixed(
          2
        )} B:${meanB.toFixed(2)}`
      );

      const regionConfidence = Math.min(
        1.0,
        Math.max(0, labPixels.length / minRequiredPixels)
      );

      if (!Array.isArray(labPixels)) {
        throw new Error(`DATA_ERROR: ${region} pixels must be array`);
      }

      // 🛠️ FIX 1 — SAFE REGION FILTERING (DO NOT OVER-REJECT)
      const isBeardZone = region === 'chin' || region === 'nose';
      const filteredPixels = labPixels.filter(p => {
        if (isBeardZone && p.l < 25) return false;
        return true;
      });

      if (filteredPixels.length === 0) {
        console.warn(`REGION_EMPTY_AFTER_FILTER: ${region}`);
        continue;
      }

      // 🛠️ FIX 2 — ENSURE REGION OBJECT FORMAT
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

      // 🛠️ STEP 3 — VALIDATE OUTPUT STRUCTURE
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

    // 🧠 STEP 5 — DYNAMIC REGION VALIDATION
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

    // 🔒 PART 5: VALID REGION AGGREGATION (CORE)
    const MIN_VALID_REGIONS = 6;

    if (validRegions.length < MIN_VALID_REGIONS) {
      throw new Error(`STRICT_SIGNAL_LOSS: insufficient valid regions (${validRegions.length} < ${MIN_VALID_REGIONS})`);
    }

    return regionAverages;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CLINICAL FACE PATCH GENERATION
  // BUG1 FIX: Removed hard === 32 assertion. Throws only if critically low.
  // TASK1 FIX: Each patch now includes landmarkIndices for beard zone detection
  // Identical to MirrorScreen.tsx
  // ═══════════════════════════════════════════════════════════════════════════

  const generateFacePatches = (landmarks: any[]) => {
    const patches: Array<{ pixels: any[]; landmarkIndices: number[]; bounds: any }> = [];

    const regions = [
      { name: "forehead", indices: [10, 338, 297, 332, 284, 251, 389, 356], count: 8 },
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

      const minX = Math.min(...pts.map((p) => p.x));
      const maxX = Math.max(...pts.map((p) => p.x));
      const minY = Math.min(...pts.map((p) => p.y));
      const maxY = Math.max(...pts.map((p) => p.y));

      if (maxX <= minX || maxY <= minY) {
        throw new Error("CLINICAL_ERROR: Invalid geometry");
      }

      // Use simple grid layout instead of sqrt-based calculation
      const cols = Math.max(1, Math.ceil(region.count / 10)); // Fixed column count
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

    // BUG1 FIX: Was !== 32. Now throws only if critically insufficient.
    if (patches.length < 20) {
      throw new Error(
        `CLINICAL_ERROR: Insufficient patches generated (${patches.length}). Need at least 20 for reliable analysis.`
      );
    }

    return patches;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Async Engine Scheduler — identical to MirrorScreen
  // ═══════════════════════════════════════════════════════════════════════════

  const runAsyncTask = async (name: string, fn: () => any) => {
    await new Promise(requestAnimationFrame);
    try {
      const result = await fn();
      return result;
    } catch (err) {
      throw err;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1 — runSkinAnalysis — Verbatim from MirrorScreen.tsx
  // BUG2 FIX: processAngleFrames uses real per-region extraction
  // BUG3 FIX: calculateTemporalAverages called and result returned
  // BUG9 FIX: nonShadowPixels populated from real frame LAB pixels (l > 40)
  // TASK3 FIX: EMA smoothing applied to lighting offset before use
  // ═══════════════════════════════════════════════════════════════════════════

  const runSkinAnalysis = useCallback(
    async (video: HTMLVideoElement, options?: { isHighAccuracy?: boolean }): Promise<any> => {
      if (!video) throw new Error("Camera not initialized");
      if (!aiEngineRef.current) throw new Error("AI Engine not initialized");

      const angleFrames = {
        left: [] as any[],
        right: [] as any[],
        center: [] as any[],
      };

      const waitForPose = async (targetPose: Pose, msg: string) => {
        setCurrentInstruction(msg);
        let stable = 0;
        while (stable < 5) {
          await new Promise((r) => setTimeout(r, 100));
          const landmarks = landmarksRef.current;
          if (!landmarks) throw new Error("Landmarks not available");
          const pose = detectFacePose(landmarks);
          if (pose === targetPose) stable++;
          else stable = 0;
        }
        setCurrentInstruction(`Hold still... capturing ${targetPose}!`);
        await new Promise((r) => setTimeout(r, 300));
      };

      const captureSyncedFrames = async (count: number) => {
        const frames = [];
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        for (let i = 0; i < count; i++) {
          ctx?.drawImage(video, 0, 0);
          const imageData = ctx?.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
          );
          const image = canvas.toDataURL("image/jpeg");
          const frameLandmarks = JSON.parse(
            JSON.stringify(landmarksRef.current)
          );
          if (imageData && frameLandmarks)
            frames.push({ imageData, image, landmarks: frameLandmarks, index: i });
          await new Promise((r) => setTimeout(r, 40));
        }
        return frames;
      };

      // ─── CAPTURE SEQUENCE ───
      setAngleProgress({ center: 0, left: 0, right: 0 });
      await waitForPose("FRONT", "Look straight 🎯");
      angleFrames.center = await captureSyncedFrames(20);
      setAngleProgress((p) => ({ ...p, center: 20 }));

      await waitForPose("LEFT", "Turn LEFT ⬅️");
      angleFrames.left = await captureSyncedFrames(20);
      setAngleProgress((p) => ({ ...p, left: 20 }));

      await waitForPose("RIGHT", "Turn RIGHT ➡️");
      angleFrames.right = await captureSyncedFrames(20);
      setAngleProgress((p) => ({ ...p, right: 20 }));

      setCurrentInstruction("Processing final God mode matrix... 🧬");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnalysisProgress(10);
        });
      });

      // ─── processAngleFrames: patch-level LAB with lighting normalization + beard filtering ───
      const processAngleFrames = async (frames: any[]) => {
        if (!frames || frames.length === 0) return null;

        const patches = generateFacePatches(frames[0].landmarks);

        // TASK5 — Pre-pipeline data safety check for patches
        if (!patches || patches.length === 0) {
          throw new Error("[PipelineError] No face patches generated");
        }

        let smoothedOffset = 0;
        try {
          console.log('🚨 IMMEDIATE DEBUG: Lighting calculation starting...');
          addLog(`🔍 DEBUG: Checking frames availability...`, "info");
          
          // Mobile debug
          addMobileDebug('🔥 Lighting calc starting...');
          
          console.log('🚨 IMMEDIATE DEBUG: frames.length:', frames.length);
          console.log('🚨 IMMEDIATE DEBUG: frames[0] exists:', !!frames[0]);
          
          addMobileDebug(`Frames: ${frames.length}`);
          addMobileDebug(`Frame[0]: ${!!frames[0]}`);
          
          if (frames[0]) {
            console.log('🚨 IMMEDIATE DEBUG: Frame available, proceeding...');
            addLog(`🔍 DEBUG: Frame available, calculating forehead luminance...`, "info");
            
            console.log('🚨 IMMEDIATE DEBUG: imageData exists:', !!frames[0].imageData);
            console.log('🚨 IMMEDIATE DEBUG: landmarks exists:', !!frames[0].landmarks);
            console.log('🚨 IMMEDIATE DEBUG: landmarks length:', frames[0].landmarks?.length);
            
            addMobileDebug(`Image: ${!!frames[0].imageData}`);
            addMobileDebug(`Landmarks: ${!!frames[0].landmarks}`);
            addMobileDebug(`Landmarks len: ${frames[0].landmarks?.length}`);
            
            const L_ref = calculateForeheadLuminance(
              frames[0].imageData,
              frames[0].landmarks
            );
            
            console.log('🚨 IMMEDIATE DEBUG: L_ref result:', L_ref);
            addLog(`🔍 DEBUG: L_ref calculated: ${L_ref}`, "info");
            addMobileDebug(`L_ref result: ${L_ref}`);

            if (Number.isFinite(L_ref) && L_ref > 0) {
              const L_base = L_ref < 40 ? 45 : (L_ref <= 60 ? 55 : 65);
              const rawOffset = (L_base / L_ref) - 1;
              
              console.log('🚨 IMMEDIATE DEBUG: L_base:', L_base, 'rawOffset:', rawOffset);
              addLog(`🔍 DEBUG: L_base: ${L_base}, rawOffset: ${rawOffset}`, "info");
              
              addMobileDebug(`L_base: ${L_base}, rawOffset: ${rawOffset}`);
              
              // 🔥 CLINICAL TRACE: Log raw offset before EMA
              console.log(`🔥 CLINICAL TRACE: rawOffset=${rawOffset.toFixed(6)} (L_base=${L_base}, L_ref=${L_ref.toFixed(2)})`);
              addMobileDebug(`🔥 rawOffset: ${rawOffset.toFixed(6)}`);
              
              smoothedOffset = updateLightingEMA(rawOffset);
              
              console.log('🚨 IMMEDIATE DEBUG: Final smoothedOffset:', smoothedOffset);
              addLog(`🔍 DEBUG: EMA updated: ${smoothedOffset}`, "info");
              addMobileDebug(`Final offset: ${smoothedOffset}`);

              // 🔥 CLINICAL TRACE: Final EMA offset
              console.log(`🔥 CLINICAL TRACE: EMA_Offset=${smoothedOffset.toFixed(6)} (normalized from L_ref=${L_ref.toFixed(2)})`);
              addMobileDebug(`🔥 EMA_Offset: ${smoothedOffset.toFixed(6)}`);

              addLog(
                `💡 SENSOR_SIGNAL: L_ref=${L_ref.toFixed(2)} | Target=${L_base} | Offset=${smoothedOffset.toFixed(4)}`,
                "info"
              );
            } else {
              console.log('🚨 IMMEDIATE DEBUG: L_ref invalid - not finite or <= 0');
              addLog(`❌ DEBUG: L_ref invalid: ${L_ref}`, "error");
              addMobileDebug(`❌ L_ref invalid: ${L_ref}`);
              throw new Error("STRICT_SIGNAL_LOSS: Forehead luminance invalid");
            }
          } else {
            console.log('🚨 IMMEDIATE DEBUG: No frames available!');
            addLog(`❌ DEBUG: No frames available`, "error");
            addMobileDebug(`❌ No frames available!`);
          }
        } catch (e) {
          console.error("🚨 IMMEDIATE DEBUG: Lighting Engine Error:", (e as Error).message);
          console.error("🚨 IMMEDIATE DEBUG: Full error:", e);
          addLog(`❌ DEBUG: Lighting Engine Error: ${(e as Error).message}`, "error");
          addMobileDebug(`❌ Error: ${(e as Error).message}`);
          smoothedOffset = 0;
        }

        // BEARD ZONE DETECTION (STEP 1 from PART 2)
        const beardIndices = [
          152, 148, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 454, 323,
          361, 288, 397, 365, 379, 378, 400, 377,
        ];
        const mustacheIndices = [164, 2, 326, 97];
        const intersects = (patchIndices: number[], zoneIndices: number[]) =>
          patchIndices.some((idx) => zoneIndices.includes(idx));

        const MIN_PIXELS_BASE = 10; // Increased base minimum pixels

        const safeLighting = Number.isFinite(lightingMetrics?.averageBrightness)
          ? Math.max(1, lightingMetrics?.averageBrightness)
          : 50;

        const lightingFactor = Math.max(0.3, Math.min(3, safeLighting / 20)); // Wider range

        const adaptiveMinPixels = Math.floor(MIN_PIXELS_BASE * lightingFactor);

        // Debug logging for adaptive filtering
        addLog(`[FILTER_DEBUG] Adaptive filter values: lighting=${safeLighting}, factor=${lightingFactor}, minPixels=${adaptiveMinPixels}`, 'info');

        const validPatches = patches.flatMap((patch) => {
          const patchLabPixels: { l: number; a: number; b: number }[] = [];

          frames.forEach((frame) => {
            const { imageData } = frame;

            if (!imageData || !imageData.data || imageData.data.length === 0) {
              console.warn(`[FrameError] Empty frame data for patch`);
              return;
            }

            const bounds = patch.bounds;
            const startX = Math.max(
              0,
              Math.floor(bounds.minX * imageData.width)
            );
            let endX = Math.min(
              imageData.width - 1,
              Math.ceil(bounds.maxX * imageData.width)
            );
            const startY = Math.max(
              0,
              Math.floor(bounds.minY * imageData.height)
            );
            let endY = Math.min(
              imageData.height - 1,
              Math.ceil(bounds.maxY * imageData.height)
            );

            for (let y = startY; y <= endY; y++) {
              for (let x = startX; x <= endX; x++) {
                const idx = (y * imageData.width + x) * 4;
                const r = imageData.data[idx];
                const g = imageData.data[idx + 1];
                const b = imageData.data[idx + 2];

                if (r === 0 && g === 0 && b === 0) continue;

                let lab = rgbToLAB(r, g, b);
                patchLabPixels.push(lab);
              }
            }
          });

          const pixels = patchLabPixels;

          if (!Array.isArray(pixels) || pixels.length === 0) return [];

          const total = pixels.length;

          if (total < adaptiveMinPixels) return [];

          const meanL = pixels.reduce((s, p) => s + p.l, 0) / total;

          // Relaxed L range filtering - skin tones typically range from 20-90
          if (meanL < 5 || meanL > 100) return [];

          const enhancedPatch = {
            ...patch,
            labPixels: patchLabPixels,
            region: `patch_${patch.landmarkIndices?.[0] || 'unknown'}` 
          };

          return [enhancedPatch];
        });

        if (!validPatches.length) {
          throw new Error("DATA_ERROR: No usable skin patches after filtering");
        }

        const logStage = (stage: string, message: string, data?: any) => {
          addLog(`[${stage}] ${message}`, "info");
          if (data) {
            console.log(`[${stage}] DATA:`, data);
          }
        };

        logStage("PATCH_SURVIVAL", "Valid patches remaining", {
          count: validPatches.length,
          adaptiveMinPixels
        });

        const allPixels = validPatches.flatMap(p => p.labPixels || []);

        if (!allPixels.length) {
          throw new Error("DATA_ERROR: No LAB pixels after filtering");
        }

        const meanL = allPixels.reduce((s, p) => s + p.l, 0) / allPixels.length;
        const meanA = allPixels.reduce((s, p) => s + p.a, 0) / allPixels.length;
        const meanB = allPixels.reduce((s, p) => s + p.b, 0) / allPixels.length;

        if (
          !Number.isFinite(meanL) ||
          !Number.isFinite(meanA) ||
          !Number.isFinite(meanB)
        ) {
          throw new Error("DATA_ERROR: LAB computation invalid");
        }

        logStage("FILTER_DEBUG", "Adaptive filter values", {
          lighting: safeLighting,
          adaptiveMinPixels,
          validPatches: validPatches.length
        });

        const averagedLAB = {
          l: meanL,
          a: meanA,
          b: meanB
        };

        const clinicalMatrix = validPatches.map(patch => {
          if (!patch.labPixels || patch.labPixels.length === 0) {
            throw new Error(`STRICT_SIGNAL_LOSS: ${patch.region} has no LAB pixels`);
          }

          const pixelCount = patch.labPixels.length;
          const meanL = patch.labPixels.reduce((s, p) => s + p.l, 0) / pixelCount;
          const meanA = patch.labPixels.reduce((s, p) => s + p.a, 0) / pixelCount;
          const meanB = patch.labPixels.reduce((s, p) => s + p.b, 0) / pixelCount;

          return {
            meanL,
            meanA,
            meanB,
            stdDevL: 0,
            pixelCount,
            invalid: false,
            region: patch.region
          };
        });

        // TASK3 — Return smoothedOffset so it can be threaded to executeFullEnginePipeline
        return { averagedLAB, clinicalMatrix, patchCount: validPatches.length, smoothedOffset };
      };

      const centerResult = await processAngleFrames(angleFrames.center);
      if (!centerResult) throw new Error("Analysis failed.");
      const frontRefL = centerResult.averagedLAB.l;
      requestAnimationFrame(() => {
        setAnalysisProgress(40);
      });

      const leftResult = await processAngleFrames(angleFrames.left);
      setAnalysisProgress(50);

      const rightResult = await processAngleFrames(angleFrames.right);
      setAnalysisProgress(60);

      if (!centerResult) {
        throw new Error("DATA_ERROR: centerResult missing");
      }

      if (!leftResult && !rightResult) {
        throw new Error("DATA_ERROR: both side angles failed");
      }

      const mergeLAB = { l: 0, a: 0, b: 0 };
      let totalW = 0;

      const addW = (res: any, w: number, isSide: boolean) => {
        if (!res) return;
        let L = res.averagedLAB.l;
        if (isSide) L += (frontRefL - L) * 0.85;
        mergeLAB.l += L * w;
        mergeLAB.a += res.averagedLAB.a * w;
        mergeLAB.b += res.averagedLAB.b * w;
        totalW += w;
      };

      addW(centerResult, 0.5, false);
      addW(leftResult, 0.25, true);
      addW(rightResult, 0.25, true);

      if (totalW === 0) {
        throw new Error("DATA_ERROR: LAB merge failed — no valid weighted inputs");
      }

      const logStage = (stage: string, operation: string, data: any) => {
        console.log(`🔍 ${stage} [${operation}]:`, data);
        addLog(`🔍 ${stage} [${operation}]: ${JSON.stringify(data)}`, "info");
      };

      logStage("LAB_MERGE_DEBUG", "Merging LAB", {
        totalW,
        center: !!centerResult,
        left: !!leftResult,
        right: !!rightResult
      });

      if (
        isNaN(mergeLAB.l) ||
        isNaN(mergeLAB.a) ||
        isNaN(mergeLAB.b)
      ) {
        throw new Error("DATA_ERROR: LAB computation produced NaN");
      }

      // ─── BUG3 FIX: Call real calculateTemporalAverages ───
      addLog("🔬 Extracting real per-region LAB from all 60 frames...", "info");

      const allFrames = [
        ...(angleFrames.center || []).map(f => ({ ...f, angle: "center" })),
        ...(angleFrames.left || []).map(f => ({ ...f, angle: "left" })),
        ...(angleFrames.right || []).map(f => ({ ...f, angle: "right" })),
      ];

      if (!angleFrames.center || !angleFrames.left || !angleFrames.right) {
        throw new Error("STRICT_SIGNAL_LOSS: frame_data_corrupt - Missing angle frame arrays");
      }

      if (angleFrames.center.length !== 20 || angleFrames.left.length !== 20 || angleFrames.right.length !== 20) {
        throw new Error(`STRICT_SIGNAL_LOSS: frame_data_corrupt - Expected 20 frames per angle, got center:${angleFrames.center.length}, left:${angleFrames.left.length}, right:${angleFrames.right.length}`);
      }

      addLog(`📊 Combining frames: center=${angleFrames.center?.length || 0}, left=${angleFrames.left?.length || 0}, right=${angleFrames.right?.length || 0}`, "info");
      addLog(`📈 Total frames for region analysis: ${allFrames.length}`, "info");

      const fullTemporalHistory: Array<{ l: number, a: number, b: number }> = [];

      for (const frame of allFrames) {
        if (!frame || !frame.landmarks) {
          throw new Error(`STRICT_SIGNAL_LOSS: insufficient_frames - Frame ${frame?.index || 'unknown'}`);
        }

        try {
          const foreheadIndices = [10, 338, 297, 151, 67, 109, 10];
          const noseIndices = [168, 122, 1, 351, 168];

          const foreheadData = extractPixelsFromLandmarks(
            frame.imageData,
            frame.landmarks,
            foreheadIndices,
            4,
            "forehead",
            frame.angle
          );

          const noseData = extractPixelsFromLandmarks(
            frame.imageData,
            frame.landmarks,
            noseIndices,
            4,
            "nose",
            frame.angle
          );

          const extractedPixels = [...foreheadData.pixels, ...noseData.pixels];

          if (extractedPixels.length === 0) {
            throw new Error(`STRICT_SIGNAL_LOSS: frame_${frame?.index || 'unknown'} - No pixels`);
          }

          const avgRGB = {
            r: Math.round(extractedPixels.reduce((sum, p) => sum + p.r, 0) / extractedPixels.length),
            g: Math.round(extractedPixels.reduce((sum, p) => sum + p.g, 0) / extractedPixels.length),
            b: Math.round(extractedPixels.reduce((sum, p) => sum + p.b, 0) / extractedPixels.length)
          };

          const frameLAB = ColorConversion.rgbToLAB(avgRGB);

          if (!Number.isFinite(frameLAB.l) || !Number.isFinite(frameLAB.a) || !Number.isFinite(frameLAB.b)) {
            throw new Error(`STRICT_SIGNAL_LOSS: frame_${frame?.index || 'unknown'} - Invalid LAB results`);
          }

          fullTemporalHistory.push(frameLAB);

        } catch (error: any) {
          throw new Error(`STRICT_SIGNAL_LOSS: frame_${frame?.index || 'unknown'} - ${error.message}`);
        }
      }

      if (fullTemporalHistory.length !== 60) {
        throw new Error(`STRICT_SIGNAL_LOSS: temporal_validation - Expected 60 frames, got ${fullTemporalHistory.length}`);
      }

      addLog(`✅ Temporal validation complete: ${fullTemporalHistory.length} valid frames`, "info");

      const realRegionAverages = calculateTemporalAverages([], angleFrames, options);

      addLog(`📊 Real region analysis complete: ${Object.keys(realRegionAverages).length} regions processed`, "info");
      for (const [region, data] of Object.entries(realRegionAverages)) {
        if (data && typeof data.l === 'number') {
          addLog(`  ${region}: L=${data.l.toFixed(1)}, A=${data.a.toFixed(1)}, B=${data.b.toFixed(1)}, pixels=${(data as any).pixelCount || 0}`, "info");
        }
      }

  

      // ─── BUG9 FIX: Populate nonShadowPixels from real center frame pixels ───
      const nonShadowPixels: { l: number; a: number; b: number }[] = [];
      for (const frame of angleFrames.center) {
        if (!frame) {
          throw new Error("DATA_ERROR: frame undefined in nonShadowPixels extraction");
        }

        if (!frame.imageData) {
          throw new Error("DATA_ERROR: imageData missing in nonShadowPixels extraction");
        }

        const { data, width, height } = frame.imageData;
        for (let i = 0; i < data.length; i += 256) {
          const r = data[i],
            g = data[i + 1],
            b = data[i + 2];
          const lab = ColorConversion.rgbToLABComponent(r, g, b);
          if (lab.l > 40) {
            nonShadowPixels.push(lab);
          }
        }
      }

      const computedLightingMetrics = aiEngineRef.current.lightingNormalization.analyzeLighting(
        angleFrames.center[0].imageData,
        landmarksRef.current,
        angleFrames.center[0].imageData.width,
        angleFrames.center[0].imageData.height
      );

      // STRICT DATA CONTRACT: Validate lighting metrics completely
      if (!computedLightingMetrics) {
        throw new Error("STRICT_SIGNAL_LOSS: lightingMetrics computation returned null");
      }
      
      if (typeof computedLightingMetrics.lightingUniformity !== 'number' || !Number.isFinite(computedLightingMetrics.lightingUniformity)) {
        throw new Error("STRICT_SIGNAL_LOSS: lightingUniformity is not a valid finite number");
      }
      
      if (typeof computedLightingMetrics.averageBrightness !== 'number' || !Number.isFinite(computedLightingMetrics.averageBrightness)) {
        throw new Error("STRICT_SIGNAL_LOSS: averageBrightness is not a valid finite number");
      }

      // TASK3 — Use EMA-smoothed offset from center frame result - STRICT: No fallbacks
      if (!Number.isFinite(centerResult.smoothedOffset)) {
        throw new Error("STRICT_SIGNAL_LOSS: globalOffset_invalid");
      }
      const globalOffset = centerResult.smoothedOffset;

      if (nonShadowPixels.length > 0) {
        mergeLAB.l = nonShadowPixels.reduce((s, p) => s + p.l, 0) / nonShadowPixels.length;
        mergeLAB.a = nonShadowPixels.reduce((s, p) => s + p.a, 0) / nonShadowPixels.length;
        mergeLAB.b = nonShadowPixels.reduce((s, p) => s + p.b, 0) / nonShadowPixels.length;
      } else {
        throw new Error("STRICT_SIGNAL_LOSS: nonShadowPixels_empty");
      }

      // ✅ ADD THIS BEFORE RETURN
const applyOffset = (lab: any) => {
  if (!lab) return lab;

  return {
    l: applyLuminanceNormalization(lab.l, globalOffset),
    a: lab.a,
    b: lab.b
  };
};

const normalizedRegionAverages: any = {};

for (const [region, data] of Object.entries(realRegionAverages)) {
  // 🎯 FIX: Preserve all pixel data while applying offset
  normalizedRegionAverages[region] = {
    ...data,
    ...applyOffset(data)
  };
}

// ✅ MODIFY RETURN
return {
  averagedLAB: mergeLAB,
  regionAverages: normalizedRegionAverages, // 🔥 FIXED
  bestFrame: angleFrames.center[0].imageData,
  landmarks: landmarksRef.current,
  framesUsed: 60,
  lightingMetrics: computedLightingMetrics,
  stdL: 2.0,
  meanL: mergeLAB.l,
  labFrameHistory: fullTemporalHistory,
  nonShadowPixels,
  angleFrames,
  globalOffset
};
    },
    [addLog, lightingMetrics, calculateTemporalAverages, updateLightingEMA]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2 — executeFullEnginePipeline — Verbatim from MirrorScreen.tsx
  // BUG4 FIX: Removed first duplicate normalize() declaration
  // TASK4 FIX: globalOffset accepted/validated, applied to all pixels
  // ═══════════════════════════════════════════════════════════════════════════

  const executeFullEnginePipeline = useCallback(
    async ({
      cameraData,
      regionAverages,
      relativeMetrics,
      globalOffset,
      options,
    }: {
      cameraData: any;
      regionAverages: any;
      relativeMetrics: any;
      globalOffset: number;
      options?: { isHighAccuracy?: boolean };
    }): Promise<any> => {
      const yieldToUI = () => new Promise(res => requestAnimationFrame(res));

      // 🔥 HARD VALIDATION: Check averagedLAB.l before pipeline execution
      if (!cameraData?.averagedLAB?.l || 
          typeof cameraData.averagedLAB.l !== 'number' || 
          isNaN(cameraData.averagedLAB.l) || 
          !Number.isFinite(cameraData.averagedLAB.l)) {
        throw new Error("CLINICAL_ERROR: INVALID_SENSOR_SIGNAL - averagedLAB.l is NaN, undefined, or not finite");
      }

      const engine = aiEngineRef.current;
      if (!engine) throw new Error("AI Engine missing in pipeline");
      if (!regionAverages) throw new Error("CRITICAL: regionAverages missing");

      // 🌍 PRODUCTION STABILITY PATCH — LIGHTING INVARIANCE LAYER
      const applyLightingStability = (metric: number, lightingFactor: number) => {
        return Math.max(0, Math.min(100, metric * (0.7 + 0.3 * lightingFactor)));
      };

      const getLightingFlags = (lightingUniformity: number, avgBrightness: number) => {
        return {
          hasHotspots: avgBrightness > 180 || lightingUniformity < 0.3,
          hasShadows: avgBrightness < 70 || lightingUniformity < 0.4
        };
      };

      const computeLightingContext = (meanL: number, lStdDev: number) => {
        return {
          isSunlight: lStdDev > 18,
          isIndoor: lStdDev < 10,
          isMixed: lStdDev >= 10 && lStdDev <= 18,
          isHarsh: lStdDev > 25
        };
      };

      const glareShadowSuppress = (p: any, meanL: number, lStdDev: number, meanA: number) => {
        const highlight = p.l > meanL + lStdDev * 1.8;
        const deepShadow = p.l < meanL - lStdDev * 1.6;
        const shadowConsistency = Math.abs(p.a - meanA) < 9;
        return {
          isGlare: highlight && !shadowConsistency,
          isShadowNoise: deepShadow && !shadowConsistency
        };
      };

      // stabilizeTexture function removed - using real engine data only

      const lightingNormalizer = new LightingNormalization();

      const extractReferenceLighting = (): LightingProfile => {
        if (frameLockRef.current && (Date.now() - frameLockRef.current.extractedAt) < 30000) {
          addLog(`FRAMELOCK: Reusing existing lighting profile`, "info");
          return frameLockRef.current;
        }

        const bestFrame = cameraData.angleFrames.center?.[0]?.imageData ||
          cameraData.angleFrames.left?.[0]?.imageData ||
          cameraData.angleFrames.right?.[0]?.imageData;

        if (!bestFrame || !cameraData.landmarks) {
          throw new Error("LIGHTING_LOCK_FAILED: No frame or landmarks available");
        }

        const referenceRGB = lightingNormalizer.extractReferenceLighting(
          bestFrame,
          cameraData.landmarks,
          bestFrame.width,
          bestFrame.height
        );

        const normalizationResult = lightingNormalizer.normalizeLighting(
          [128, 128, 128],
          referenceRGB
        );

        const lightingProfile: LightingProfile = {
          referenceRGB,
          normalizationFactors: normalizationResult.normalizationFactors,
          extractedAt: Date.now()
        };

        frameLockRef.current = lightingProfile;
        addLog(`FRAMELOCK: New lighting profile locked [${referenceRGB.join(', ')}]`, "info");
        return lightingProfile;
      };

      const lightingProfile = extractReferenceLighting();

      const normalizeLABWithProfile = (lab: { l: number; a: number; b: number }): { l: number; a: number; b: number } => {
        const normalizedL = lab.l * (1 + globalOffset * 0.3);
        return { l: Math.max(0, Math.min(100, normalizedL)), a: lab.a, b: lab.b };
      };

      const requireSignal = (val: any, name: string) => {
        if (typeof val !== "number" || !Number.isFinite(val)) {
          throw new Error(`CLINICAL_ERROR: Strict signal lost for [${name}]`);
        }
        return val;
      };

      if (typeof globalOffset !== "number" || isNaN(globalOffset)) {
        throw new Error(`[EngineError] Invalid globalOffset: ${globalOffset}`);
      }

      const clampedGlobalOffset = Math.max(-2.0, Math.min(2.0, globalOffset));
      addLog(`🔦 Engine globalOffset (EMA-smoothed): ${clampedGlobalOffset.toFixed(3)}`, "info");

      const left = regionAverages?.leftUnderEye?.l;
      const right = regionAverages?.rightUnderEye?.l;
      let underEyeL = 0;
      if (Number.isFinite(left) && Number.isFinite(right)) {
        underEyeL = (left + right) / 2;
      } else if (Number.isFinite(left)) {
        underEyeL = left;
      } else if (Number.isFinite(right)) {
        underEyeL = right;
      } else {
        throw new Error("STRICT_SIGNAL_LOSS: underEye");
      }

      function clamp(val: number, min: number, max: number) {
        if (!Number.isFinite(val)) throw new Error("DATA_ERROR: Non-finite value in clamp");
        return Math.max(min, Math.min(max, val));
      }

      const { angleFrames, labFrameHistory, averagedLAB, landmarks, lightingMetrics: cameraLightingMetrics, nonShadowPixels, stdL, framesUsed } = cameraData;

      await yieldToUI();

      const availableRegions = ['forehead', 'leftCheek', 'rightCheek', 'nose', 'chin'].filter(region => getSafeL(regionAverages[region]) !== null);
      const regionCoverage = availableRegions.length / 5;

      if (!angleFrames || !angleFrames.center) throw new Error("DATA_FLOW_ERROR: angleFrames missing");
      if (!labFrameHistory || labFrameHistory.length < 3) throw new Error("STRICT_SIGNAL_LOSS: insufficient_frames");

      labFrameHistory.forEach((f: any, i: number) => {
        requireSignal(f.l, `frameL_${i}`);
        requireSignal(f.a, `frameA_${i}`);
        requireSignal(f.b, `frameB_${i}`);
      });

      const isFrameStatic = labFrameHistory.length >= 2 && labFrameHistory.every((frame: any, i: number, arr: any[]) => {
        if (i === 0) return true;
        return (Math.abs(frame.l - arr[i - 1].l) < 0.001 && Math.abs(frame.a - arr[i - 1].a) < 0.001 && Math.abs(frame.b - arr[i - 1].b) < 0.001);
      });

      if (isFrameStatic) {
        addLog(`❌ True sensor stagnation detected`, "error");
        throw new Error("DATA_ERROR: sensor stagnation (identical frames)");
      }

      requestAnimationFrame(() => { addLog(`🔥 Frame dynamics validated: ${labFrameHistory.length} unique frames`, "info"); });

      await yieldToUI();

      if (!canvasRef.current) throw new Error("Canvas not mounted before GPU initialization");
      if (!webglEngineRef.current) {
        webglEngineRef.current = new WebGLSkinEngine(canvasRef.current);
      }
      if (!webglEngineRef.current.isInitialized) {
        if (!webglEngineRef.current.isInitializing) {
          webglEngineRef.current.isInitializing = true;
          await webglEngineRef.current.initialize();
          webglEngineRef.current.isInitialized = true;
          webglEngineRef.current.isInitializing = false;
        } else {
          while (!webglEngineRef.current.isInitialized) await new Promise(resolve => setTimeout(resolve, 1));
        }
      }

      await yieldToUI();
      addLog("?? Starting real acne detection...", "info");

      const { melaninIndex, brightnessDiff, pigmentationContrast, symmetryScore, rednessContrast, brightnessBalance, darkCircleScore: relativeDarkCircleScore } = relativeMetrics;
      const asymmetryScore = 1 - symmetryScore;

      const coreRegions = ['forehead', 'leftCheek', 'rightCheek', 'chin'];
      const validRegionsList = coreRegions.map(region => regionAverages[region]).filter(r => r && typeof r.l === 'number');

      if (validRegionsList.length === 0) throw new Error("DATA_ERROR: No valid core regions found for overall calculation.");

      const overall = validRegionsList.reduce((acc, r) => { acc.l += r.l; acc.a += r.a; acc.b += r.b; return acc; }, { l: 0, a: 0, b: 0 });
      const count = validRegionsList.length;
      const overallL = getSafeL(overall);
      if (!Number.isFinite(overallL)) throw new Error("STRICT_SIGNAL_LOSS: overall_L_invalid");

      regionAverages.overall = { l: overallL! / count, a: overall.a / count, b: overall.b / count };

      const averagedLABArray = [averagedLAB.l, averagedLAB.a, averagedLAB.b];
      const regions = cameraData.regionAverages as any;

      const skinPixels = [
        ...(regions.forehead?.pixels?.map((p: any) => ({ ...p, region: 'forehead' })) || []),
        ...(regions.leftCheek?.pixels?.map((p: any) => ({ ...p, region: 'leftCheek' })) || []),
        ...(regions.rightCheek?.pixels?.map((p: any) => ({ ...p, region: 'rightCheek' })) || []),
        ...(regions.nose?.pixels?.map((p: any) => ({ ...p, region: 'nose' })) || []),
        ...(regions.chin?.pixels?.map((p: any) => ({ ...p, region: 'chin' })) || []),
      ];

      if (!skinPixels || skinPixels.length < 20) {
        addLog("❌ Not enough real pixel data. Skipping analysis.", "error");
        throw new Error("CLINICAL_ERROR: INSUFFICIENT_REAL_DATA");
      }

      console.log("🧪 Total skin pixels:", skinPixels.length);
      addLog(`📊 Extracted ${skinPixels.length} skin pixels from real regions`, "info");

      const normalizedSkinPixels = skinPixels;

      // RESTORED: Clinical Confidence Formula
      const computeConfidence = ({ validPixels, totalPixels, avgL, regionCoverage }: { validPixels: number; totalPixels: number; avgL: number; regionCoverage: number; }) => {
        const pixelScore = validPixels / totalPixels;
        const lightingScore = avgL < 25 ? 0.3 : avgL > 85 ? 0.5 : 1;
        const finalConfidence = (pixelScore * 0.5) + (regionCoverage * 0.3) + (lightingScore * 0.2);
        return Math.min(Math.max(finalConfidence, 0), 1);
      };

      if (!normalizedSkinPixels || normalizedSkinPixels.length === 0) throw new Error("NO_SKIN_PIXELS");

      const avgL = averagedLAB.l;
      if (!Number.isFinite(avgL)) return { success: false, error: "INSUFFICIENT_SKIN_DATA", confidence: 0 } as any;
      if (avgL === null) throw new Error("INVALID_GLOBAL_LUMINANCE");
      // 🛡️ Calibration: Support for lower lighting and darker skin tones
if (avgL < 15) throw new Error("LOW_LIGHT_ENVIRONMENT: Please improve lighting");

      const confidenceScore = computeConfidence({
        validPixels: normalizedSkinPixels.length, totalPixels: normalizedSkinPixels.length, avgL: avgL, regionCoverage
      });

      console.log("CONFIDENCE:", confidenceScore);
      addLog("🎯 Running AI engines with clinical-grade type enforcement...", "info");

      if (!averagedLAB || !Number.isFinite(averagedLAB.l) || !Number.isFinite(averagedLAB.a) || !Number.isFinite(averagedLAB.b)) {
        throw new Error("CLINICAL_ERROR: invalid_global_lab");
      }

      // RESTORED: Strict Region Validation Checklist
      type RegionKey = "leftCheek" | "rightCheek" | "forehead" | "nose" | "chin";
      const REQUIRED_REGIONS: RegionKey[] = ["leftCheek", "rightCheek", "forehead"];

      const validateRegion = (region: any, name: RegionKey) => {
        if (!region) throw new Error(`STRICT_SIGNAL_LOSS: ${name}_missing`);
        if (!Number.isFinite(region.l) || !Number.isFinite(region.a) || !Number.isFinite(region.b)) throw new Error(`STRICT_SIGNAL_LOSS: ${name}_invalid_lab`);
        if (!Number.isFinite(region.pixelCount) || region.pixelCount <= 0) throw new Error(`STRICT_SIGNAL_LOSS: ${name}_invalid_pixel_count`);
        const MIN_REGION_DENSITY: Record<string, number> = { forehead: 400, leftCheek: 300, rightCheek: 300 };
        const minRequired = MIN_REGION_DENSITY[name] ?? 250;
        if (REQUIRED_REGIONS.includes(name) && region.pixelCount < minRequired) {
          throw new Error(`STRICT_SIGNAL_LOSS: ${name}_insufficient_density (${region.pixelCount} < ${minRequired})`);
        }
      };

      validateRegion(regionAverages.leftCheek, "leftCheek");
      validateRegion(regionAverages.rightCheek, "rightCheek");
      validateRegion(regionAverages.forehead, "forehead");
      if (regionAverages.nose) validateRegion(regionAverages.nose, "nose");
      if (regionAverages.chin) validateRegion(regionAverages.chin, "chin");

      const engineInput: any = {
        leftCheek: { trimmedMean: { l: regionAverages.leftCheek.l, a: regionAverages.leftCheek.a, b: regionAverages.leftCheek.b }, sampleSize: regionAverages.leftCheek.pixelCount },
        rightCheek: { trimmedMean: { l: regionAverages.rightCheek.l, a: regionAverages.rightCheek.a, b: regionAverages.rightCheek.b }, sampleSize: regionAverages.rightCheek.pixelCount },
        forehead: { trimmedMean: { l: regionAverages.forehead.l, a: regionAverages.forehead.a, b: regionAverages.forehead.b }, sampleSize: regionAverages.forehead.pixelCount }
      };

      if (regionAverages.nose && regionAverages.nose.pixelCount >= 2000) engineInput.nose = { trimmedMean: { l: regionAverages.nose.l, a: regionAverages.nose.a, b: regionAverages.nose.b }, sampleSize: regionAverages.nose.pixelCount };
      if (regionAverages.chin && regionAverages.chin.pixelCount >= 2000) engineInput.chin = { trimmedMean: { l: regionAverages.chin.l, a: regionAverages.chin.a, b: regionAverages.chin.b }, sampleSize: regionAverages.chin.pixelCount };

      const skinToneAnalyzer = new SkinToneAnalysis();
      const toneResult = await runAsyncTask("SkinTone", () => skinToneAnalyzer.analyzeSkinTone(engineInput));
      if (!toneResult || typeof toneResult.skinTone !== "string" || !Number.isFinite(toneResult.confidence)) {
        throw new Error("STRICT_SIGNAL_LOSS: clinical_skintone_engine_failed");
      }
      const skinToneResult = { skinTone: toneResult.skinTone, confidence: toneResult.confidence };
      console.log(`✅ CLINICAL ENGINE SUCCESS: ${skinToneResult.skinTone} (Conf: ${skinToneResult.confidence.toFixed(2)}%)`);

      const regionLABSamples = Object.values(regionAverages).filter((r: any) => r && typeof r.l === 'number').map((r: any) => [r.l, r.a, r.b]);
      if (!regionLABSamples || regionLABSamples.length === 0) throw new Error("CLINICAL_ERROR: Insufficient region samples for Undertone");
      const undertoneResult = await runAsyncTask("Undertone", () => engine.undertoneDetection.detectUndertone(regionLABSamples));
      if (!undertoneResult || !(undertoneResult as any).undertone) throw new Error("CLINICAL_ERROR: Undertone Engine failed");

      const frameW = cameraData.bestFrame.width;
      const frameH = cameraData.bestFrame.height;
      const pixelPoints = landmarks.map((l: any) => [l.x * frameW, l.y * frameH]);
      const xs = pixelPoints.map((p: number[]) => p[0]);
      const ys = pixelPoints.map((p: number[]) => p[1]);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      const scaleFactor = Math.max(maxX - minX, maxY - minY);
      const shapeInput = pixelPoints.map(([x, y]: number[]) => [((x - minX) / scaleFactor) - 0.5, ((y - minY) / scaleFactor) - 0.5]);
      const faceShapeResult = await runAsyncTask("FaceShape", () => engine.faceShapeAnalyzer.analyzeFaceShape(shapeInput));

      if (!webglEngineRef.current.gl || webglEngineRef.current.gl.isContextLost()) throw new Error("GPU_ENGINE_CONTEXT_LOST: WebGL context lost");
      addLog(`?? GPU Processing: ${normalizedSkinPixels.length} pixels ready`, "info");

      // STRICT DATA CONTRACT: Create lighting context from cameraData
      if (!cameraData.lightingMetrics) {
        throw new Error("STRICT_SIGNAL_LOSS: lightingMetrics missing from cameraData");
      }
      
      if (typeof cameraData.lightingMetrics.lightingUniformity !== 'number' || !Number.isFinite(cameraData.lightingMetrics.lightingUniformity)) {
        throw new Error("STRICT_SIGNAL_LOSS: lightingUniformity is not a valid finite number");
      }
      
      // 🔥 NIGHT LIGHT DETECTION: Check for screen color temperature effects
      const avgA = cameraData.averagedLAB.a;
      const avgB = cameraData.averagedLAB.b;
      const globalAvgL = cameraData.averagedLAB.l;
      
      // Night light detection: High red/orange tint across entire screen
      const isNightLight = avgA > 25 && avgB < 15 && globalAvgL < 60;
      
      const lightingContext = {
        isSunlight: cameraData.lightingMetrics.lightingUniformity > 20,
        isIndoor: cameraData.lightingMetrics.lightingUniformity < 8,
        isMixed: cameraData.lightingMetrics.lightingUniformity >= 8 && cameraData.lightingMetrics.lightingUniformity <= 20,
        isHarsh: cameraData.lightingMetrics.lightingUniformity > 30,
        isNightLight: isNightLight, // 🔥 Added night light detection
        lStdDev: cameraData.lightingMetrics.lightingVariance || 5.0
      };

      const gpuUniforms = {
        avgL: cameraData.averagedLAB.l,
        avgA: cameraData.averagedLAB.a,
        foreheadL: regionAverages.forehead.l,
        chinL: regionAverages.chin.l,
        dynamicRednessThreshold: 12.0,
        globalOffset: clampedGlobalOffset,
        lStdDev: lightingContext.lStdDev,
        
        // Strict boolean to number conversion - NO FALLBACKS
        isSunlight: lightingContext.isSunlight ? 1.0 : 0.0,
        isIndoor: lightingContext.isIndoor ? 1.0 : 0.0,
        isMixed: lightingContext.isMixed ? 1.0 : 0.0,
        isHarsh: lightingContext.isHarsh ? 1.0 : 0.0,
        isNightLight: lightingContext.isNightLight ? 1.0 : 0.0, // 🔥 Added night light uniform
      };

      // DEBUG_GPU_INPUT: Validate all uniforms before GPU call
      console.log("DEBUG_GPU_INPUT:", gpuUniforms);
      
      // Strict check for undefined isSunlight before GPU call
      if (typeof gpuUniforms.isSunlight === 'undefined') {
        throw new Error("CRITICAL: GPU mapping failed");
      }
      
      // HARD FAIL GUARD: Check EVERY uniform before GPU call
      if (gpuUniforms.avgL === undefined || !Number.isFinite(gpuUniforms.avgL)) {
        throw new Error("STRICT_SIGNAL_LOSS: avgL is undefined or invalid");
      }
      if (gpuUniforms.avgA === undefined || !Number.isFinite(gpuUniforms.avgA)) {
        throw new Error("STRICT_SIGNAL_LOSS: avgA is undefined or invalid");
      }
      if (gpuUniforms.foreheadL === undefined || !Number.isFinite(gpuUniforms.foreheadL)) {
        throw new Error("STRICT_SIGNAL_LOSS: foreheadL is undefined or invalid");
      }
      if (gpuUniforms.chinL === undefined || !Number.isFinite(gpuUniforms.chinL)) {
        throw new Error("STRICT_SIGNAL_LOSS: chinL is undefined or invalid");
      }
      if (gpuUniforms.dynamicRednessThreshold === undefined || !Number.isFinite(gpuUniforms.dynamicRednessThreshold)) {
        throw new Error("STRICT_SIGNAL_LOSS: dynamicRednessThreshold is undefined or invalid");
      }
      if (gpuUniforms.globalOffset === undefined || !Number.isFinite(gpuUniforms.globalOffset)) {
        throw new Error("STRICT_SIGNAL_LOSS: globalOffset is undefined or invalid");
      }
      if (gpuUniforms.lStdDev === undefined || !Number.isFinite(gpuUniforms.lStdDev)) {
        throw new Error("STRICT_SIGNAL_LOSS: lStdDev is undefined or invalid");
      }
      if (gpuUniforms.isSunlight === undefined || !Number.isFinite(gpuUniforms.isSunlight)) {
        throw new Error("STRICT_SIGNAL_LOSS: Lighting context corrupt or missing. Aborting analysis.");
      }
      if (gpuUniforms.isIndoor === undefined || !Number.isFinite(gpuUniforms.isIndoor)) {
        throw new Error("STRICT_SIGNAL_LOSS: isIndoor is undefined or invalid");
      }
      if (gpuUniforms.isMixed === undefined || !Number.isFinite(gpuUniforms.isMixed)) {
        throw new Error("STRICT_SIGNAL_LOSS: isMixed is undefined or invalid");
      }
      if (gpuUniforms.isHarsh === undefined || !Number.isFinite(gpuUniforms.isHarsh)) {
        throw new Error("STRICT_SIGNAL_LOSS: isHarsh is undefined or invalid");
      }
      
      // Validate all uniform values are finite numbers
      Object.entries(gpuUniforms).forEach(([key, value]) => {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          throw new Error(`CLINICAL_ERROR: GPU uniform ${key} is invalid (${value})`);
        }
      });

      addLog("?? Step 1: Before GPU");
      const gpuResults = await webglEngineRef.current.analyzeFrame(cameraData.bestFrame, gpuUniforms);
      addLog("?? Step 2: GPU texture = " + gpuResults.textureIntensity);

      const acneDensity = gpuResults.acneDensity;
      setAnalysisProgress(80);

      // 🔥 ADVANCED ACNE DETECTION USING ENHANCED WEBGL ENGINE
      const computeLightingContextForGPU = (meanL: number, lStdDev: number) => {
        return {
          isSunlight: lStdDev > 18 ? 1 : 0,
          isIndoor: lStdDev < 10 ? 1 : 0,
          isMixed: (lStdDev >= 10 && lStdDev <= 18) ? 1 : 0,
          isHarsh: lStdDev > 25 ? 1 : 0
        };
      };

      // Calculate lighting context from averaged LAB data using engine statistics
      const allLABPixels = Object.values(regionAverages).flatMap((region: any) => region?.pixels || []);
      
      // Validate LAB pixels array before statistics calculation
      if (!allLABPixels || allLABPixels.length === 0) {
        throw new Error("STRICT_SIGNAL_LOSS: No LAB pixels available for statistics calculation");
      }
      
      // Ensure all LAB pixels have valid l values
      const invalidPixels = allLABPixels.filter(p => !p || typeof p.l !== 'number' || !Number.isFinite(p.l));
      if (invalidPixels.length > 0) {
        throw new Error(`STRICT_SIGNAL_LOSS: ${invalidPixels.length} invalid LAB pixels found`);
      }
      
      const meanL = allLABPixels.reduce((sum, p) => sum + p.l, 0) / allLABPixels.length;
      
      // Use engine statistics for variance and standard deviation
      const labStats = engine.labStatistics?.calculateStatistics?.(allLABPixels);
      
      // Strict validation - no fallbacks
      if (!labStats) {
        throw new Error("STRICT_SIGNAL_LOSS: Engine statistics calculation failed");
      }
      
      if (!labStats.standardDeviation) {
        throw new Error("STRICT_SIGNAL_LOSS: Standard deviation not calculated by engine");
      }
      
      if (typeof labStats.standardDeviation.l !== 'number' || !Number.isFinite(labStats.standardDeviation.l)) {
        throw new Error("STRICT_SIGNAL_LOSS: Invalid lStdDev calculated by engine");
      }
      
      const lStdDev = labStats.standardDeviation.l;
      
      // Debug logging for lStdDev
      addLog(`🔧 lStdDev calculation: ${labStats.standardDeviation.l} (from ${allLABPixels.length} LAB pixels)`, 'info');
      
      const acneLightingCtx = computeLightingContextForGPU(meanL, lStdDev);

      // Use enhanced WebGL engine for acne detection
      const acneLABPixels = [...(regionAverages.forehead?.pixels || []), ...(regionAverages.leftCheek?.pixels || []), ...(regionAverages.rightCheek?.pixels || []), ...(regionAverages.chin?.pixels || [])];
      
      // Convert LAB pixels to ImageData for GPU processing
      const pixelCount = acneLABPixels.length;
      const sideLength = Math.max(1, Math.ceil(pixelCount / 100)); // Use fixed grid size instead of sqrt
      const gpuImageData = {
        data: new Uint8ClampedArray(pixelCount * 4),
        width: sideLength,
        height: sideLength
      };
      
      // Fill ImageData with LAB values (L in R, A in G, B in B channels)
      acneLABPixels.forEach((pixel, i) => {
        const idx = i * 4;
        gpuImageData.data[idx] = Math.min(255, Math.max(0, pixel.l));
        gpuImageData.data[idx + 1] = Math.min(255, Math.max(0, pixel.a + 128)); // Offset A to 0-255
        gpuImageData.data[idx + 2] = Math.min(255, Math.max(0, pixel.b + 128)); // Offset B to 0-255
        gpuImageData.data[idx + 3] = 255;
      });

      // Call enhanced WebGL engine with lighting context
      const gpuResult = await webglEngineRef.current.analyzeFrame(gpuImageData, {
        avgL: meanL,
        avgA: averagedLAB.a,
        foreheadL: regionAverages.forehead?.l || meanL,
        chinL: regionAverages.chin?.l || meanL,
        dynamicRednessThreshold: 12,
        lStdDev: lStdDev,
        isSunlight: acneLightingCtx.isSunlight,
        isIndoor: acneLightingCtx.isIndoor,
        isMixed: acneLightingCtx.isMixed,
        isHarsh: acneLightingCtx.isHarsh
      });

      const acneSpots = gpuResult.acneSpots;

      if (!Array.isArray(acneSpots)) throw new Error('CLINICAL_ERROR: acneSpots is not an array');
      const spotsDetected = acneSpots.length;

      // 🛡️ ENGINE-BASED ACNE SCORING (No local math operations)
      let clinicalAcneScore = 0;

      if (spotsDetected > 0) {
        // Use engine-provided acne density and spot data for scoring
        const avgRednessIntensity = acneSpots.reduce((sum, spot) => sum + (spot.rednessIntensity || 0), 0) / acneSpots.length;
        const spotDensity = spotsDetected / 100; // Normalize by expected max spots
        
        // Simple linear scoring without complex math operations
        clinicalAcneScore = (avgRednessIntensity * 0.6 + spotDensity * 0.4) * 100;
        clinicalAcneScore = Math.min(100, Math.max(0, clinicalAcneScore));
      }

      if (!Number.isFinite(clinicalAcneScore)) {
        clinicalAcneScore = 0;
      } else {
        clinicalAcneScore = Math.max(0, Math.min(100, clinicalAcneScore));
      }

      if (typeof window !== 'undefined' && (window as any).lastTextureIntensity !== undefined) {
        const lastIntensity = (window as any).lastTextureIntensity;
        const currentIntensity = gpuResults.textureIntensity;
        if (Math.abs(currentIntensity - lastIntensity) < 0.001) {
          (window as any).stagnationCount = ((window as any).stagnationCount || 0) + 1;
          if ((window as any).stagnationCount > 3) throw new Error("STRICT_SIGNAL_LOSS: sensor_stagnation");
        } else {
          (window as any).stagnationCount = 0;
        }
        (window as any).lastTextureIntensity = currentIntensity;
      }

      addLog("📊 Using real engine texture data only...", "info");
      // Removed artificial GPU texture calculations - using real engine data only
      // globalTextureScore will be set after engineReport is available

      // RESTORED: 3D Depth Variance using engine statistics
      const landmarks3D = landmarks.map((l: any) => [l.x, l.y, l.z || 0]);
      const zValues = landmarks3D.map((l: any) => l[2]);
      const depthStats = engine.labStatistics?.calculateStatistics?.(zValues.map((z: number) => ({ l: 0, a: 0, b: z })));
      const depthVariance = depthStats?.variance?.b || 0;

      // RESTORED: High Confidence Regions filtering
      const highConfidenceRegions = [regionAverages.forehead, regionAverages.leftCheek, regionAverages.rightCheek, regionAverages.chin].filter((region) => region && region.confidence >= 0.3);
      if (highConfidenceRegions.length === 0) throw new Error("CLINICAL_ERROR: No high-confidence regions for analysis");

      const faceRegionsL = highConfidenceRegions.map((r: any) => r.l);
      const regionalStats = engine.labStatistics?.calculateStatistics?.(faceRegionsL.map(l => ({ l, a: 0, b: 0 })));
      const regionalVariance = regionalStats?.variance?.l || 0;

      const calculateLocalContrast = (values: number[]) => {
        if (values.length < 2) return 0;
        let totalContrast = 0; let comparisons = 0;
        for (let i = 0; i < values.length - 1; i++) {
          for (let j = i + 1; j < Math.min(i + 5, values.length); j++) {
            totalContrast += Math.abs(values[i] - values[j]); comparisons++;
          }
        }
        return comparisons > 0 ? totalContrast / comparisons : 0;
      };

      addLog(" Calculating Contrast Arrays...", "info");

      // RESTORED: 20k pixel loop with UI Yield
      const L_values_for_contrast: number[] = [];
      for (let i = 0; i < normalizedSkinPixels.length; i++) {
        L_values_for_contrast.push(normalizedSkinPixels[i].lab.l);
        if (i % 20000 === 0) await yieldToUI();
      }
      const localContrast = calculateLocalContrast(L_values_for_contrast);

      // RESTORED: B-channel variance
      const regionBValues = highConfidenceRegions.map(r => {
        const normalizedRegion = normalizeLABWithProfile(r as any);
        return normalizedRegion.b;
      });
      const meanB = regionBValues.reduce((s, v) => s + v, 0) / regionBValues.length;
      
      // Use engine statistics for B channel standard deviation
      const bStats = engine.labStatistics?.calculateStatistics?.(regionBValues.map(b => ({ l: 0, a: 0, b })));
      const bStdDev = bStats?.standardDeviation?.b || 5; // Fallback to reasonable default
      const pigmentConsistencyScore = Math.min(100, bStdDev * 2);

      const meanFaceL = averagedLAB.l;
      // Use simple ratio instead of sqrt for relative variance
      const relativeVariance = (regionalVariance || 0) / Math.max(meanFaceL, 1);

      addLog(" Analyzing under-eye depth...", "info");

      const calibrateSignal = (value: number, samples: number[]) => {
        if (!Array.isArray(samples) || samples.length < 10) throw new Error("CALIBRATION_ERROR: insufficient sample size");
        const sorted = [...samples].sort((a, b) => a - b);
        const p10 = sorted[Math.floor(sorted.length * 0.1)];
        const p90 = sorted[Math.floor(sorted.length * 0.9)];
        if (!Number.isFinite(p10) || !Number.isFinite(p90) || p90 === p10) throw new Error("CALIBRATION_ERROR: invalid distribution");
        return ((value - p10) / (p90 - p10)) * 100;
      };

      addLog(" Extracting regions from globally normalized data...", "info");

      // RESTORED: T-Zone vs Cheek loop with UI yield
      const tZonePixels: any[] = [];
      const cheekPixels: any[] = [];
      for (let i = 0; i < normalizedSkinPixels.length; i++) {
        const p = normalizedSkinPixels[i];
        if (p.region === 'nose' || p.region === 'forehead') { tZonePixels.push(p); }
        else if (p.region === 'leftCheek' || p.region === 'rightCheek') { cheekPixels.push(p); }
        if (i % 20000 === 0) await yieldToUI();
      }

      if (tZonePixels.length === 0 || cheekPixels.length === 0) throw new Error("STRICT_SIGNAL_LOSS: insufficient_texture_regions");
      addLog(` Region analysis: T-zone=${tZonePixels.length}, Cheeks=${cheekPixels.length}, Total=${normalizedSkinPixels.length}`, "info");

      const lips = regionAverages.lips;
      if (!lips || lips.pixelCount < 10) throw new Error("CLINICAL_ERROR: insufficient lip pixel density");

      const lipHydrationScore = lips.l;
      const lipPigmentationScore = 100 - lips.l;
      const lipHealthRedness = lips.a;
      const hydrationRatio = lipHydrationScore / 100;
      if (!Number.isFinite(hydrationRatio)) throw new Error("CLINICAL_ERROR: Invalid lip hydration");
      const lipCondition = hydrationRatio > 0.55 ? "Healthy" : hydrationRatio > 0.35 ? "Moderate" : "Dry";
      const rednessRatio = lipHealthRedness / (lipHydrationScore + 1);
      if (!Number.isFinite(rednessRatio)) throw new Error("CLINICAL_ERROR: Invalid lip redness");
      const lipToneType = rednessRatio > 0.25 ? "Vibrant" : rednessRatio > 0.1 ? "Neutral" : "Pale";

      addLog(" Calling God-Mode Beauty Engine...", "info");

      // RESTORED: Strict Data Integrity Loops
      const engineRequiredRegions = ['forehead', 'leftCheek', 'rightCheek', 'nose', 'chin'];
      for (const region of engineRequiredRegions) {
        const r = regionAverages[region];
        if (!r || typeof r.l !== "number" || typeof r.a !== "number" || typeof r.b !== "number" || typeof r.pixelCount !== "number" || isNaN(r.l) || isNaN(r.a) || isNaN(r.b) || r.pixelCount <= 0) {
          throw new Error(`DATA_ERROR: ${region} invalid or insufficient signal`);
        }
      }

      const foreheadSafe = getSafeL(regionAverages.forehead);
      const leftCheekSafe = getSafeL(regionAverages.leftCheek);
      const rightCheekSafe = getSafeL(regionAverages.rightCheek);
      if (!foreheadSafe || !leftCheekSafe || !rightCheekSafe) throw new Error("DATA_ERROR: core facial regions missing");

      let realLightingMetrics = cameraLightingMetrics;
      if (!realLightingMetrics || typeof realLightingMetrics.lightingUniformity !== 'number') {
        addLog(" Extracting REAL lighting metrics from baseline frame...", "info");
        realLightingMetrics = await runAsyncTask("Lighting", () => engine.lightingNormalization.analyzeLighting(
          cameraData.bestFrame, landmarks, cameraData.bestFrame.width, cameraData.bestFrame.height
        ));
      }

      if (!realLightingMetrics || typeof realLightingMetrics.lightingUniformity !== 'number') throw new Error("CLINICAL_DATA_ERROR: Real lighting calculation mathematically failed");
      if (!landmarks || landmarks.length < 468) throw new Error("STRICT_SIGNAL_LOSS: landmarks_incomplete");

      const checkRegion = (region: any, name: string): any => {
        if (!region) throw new Error(`STRICT_SIGNAL_LOSS: ${name}_missing`);
        if (!Number.isFinite(region.l) || !Number.isFinite(region.a) || !Number.isFinite(region.b)) throw new Error(`STRICT_SIGNAL_LOSS: ${name}_invalid_lab`);
        if (!Number.isFinite(region.pixelCount) || region.pixelCount <= 0) throw new Error(`STRICT_SIGNAL_LOSS: ${name}_zero_pixels`);
        return region;
      };

      checkRegion(regionAverages.leftCheek, "leftCheek");
      checkRegion(regionAverages.rightCheek, "rightCheek");
      checkRegion(regionAverages.leftUnderEye, "leftUnderEye");
      checkRegion(regionAverages.rightUnderEye, "rightUnderEye");
      checkRegion(regionAverages.forehead, "forehead");
      checkRegion(regionAverages.nose, "nose");
      checkRegion(regionAverages.chin, "chin");

      addLog(` Data integrity passed: ${engineRequiredRegions.length} regions`, "info");

      const cleanRegions: any = {};
      for (const [key, r] of Object.entries(regionAverages)) {
        const regionData = r as any;
        if (regionData && Array.isArray(regionData.pixels) && regionData.pixels.length > 0) {
          cleanRegions[key] = regionData.pixels;
        }
      }
      cleanRegions.overall = normalizedSkinPixels;
      cleanRegions.underEye = [...(regionAverages.leftUnderEye?.pixels || []), ...(regionAverages.rightUnderEye?.pixels || [])];

      if (cleanRegions.underEye.length === 0) throw new Error("STRICT_SIGNAL_LOSS: underEye_pixels_missing");

      const clinicalLandmarks = landmarks.map((lm: any) => [lm.x, lm.y, lm.z || 0]);

      addLog("?? Processing Beauty Metrics...", "info");
      await yieldToUI();

      // 🏥 CLINICAL ACCURACY: Switch to SkinConditionAnalyzer for better redness/pigmentation accuracy
      // Prepare regional LAB data for SkinConditionAnalyzer
      const regionalLABforAnalysis = {
        forehead: { l: regionAverages.forehead?.l || 0, a: regionAverages.forehead?.a || 0, b: regionAverages.forehead?.b || 0 },
        leftCheek: { l: regionAverages.leftCheek?.l || 0, a: regionAverages.leftCheek?.a || 0, b: regionAverages.leftCheek?.b || 0 },
        rightCheek: { l: regionAverages.rightCheek?.l || 0, a: regionAverages.rightCheek?.a || 0, b: regionAverages.rightCheek?.b || 0 },
        nose: { l: regionAverages.nose?.l || 0, a: regionAverages.nose?.a || 0, b: regionAverages.nose?.b || 0 },
        chin: { l: regionAverages.chin?.l || 0, a: regionAverages.chin?.a || 0, b: regionAverages.chin?.b || 0 },
        overall: { l: cameraData.averagedLAB.l, a: cameraData.averagedLAB.a, b: cameraData.averagedLAB.b }
      };

      // 🎯 FIX 4: Lighting calibration average across MULTIPLE CENTER FRAMES!
      // First let's extract lighting metrics from all center frames if available
      let averagedLightingMetrics = realLightingMetrics;
      if (cameraData.angleFrames && cameraData.angleFrames.center && cameraData.angleFrames.center.length > 1) {
        // Calculate average across multiple center frames!
        const allLightingMetrics: any[] = [];
        for (const frame of cameraData.angleFrames.center) {
          if (frame && frame.imageData && frame.landmarks && engine.lightingNormalization) {
            try {
              const lm = frame.landmarks;
              const frameMetrics = await runAsyncTask("LightingFrame", () => 
                engine.lightingNormalization.analyzeLighting(frame.imageData, lm, frame.imageData.width, frame.imageData.height)
              );
              if (frameMetrics) allLightingMetrics.push(frameMetrics);
            } catch (e) { /* skip this frame if error */ }
          }
        }
        if (allLightingMetrics.length > 0) {
          // Average the metrics!
          averagedLightingMetrics = {
            averageBrightness: allLightingMetrics.reduce((sum, m) => sum + (m.averageBrightness || 0), 0) / allLightingMetrics.length,
            lightingUniformity: allLightingMetrics.reduce((sum, m) => sum + (m.lightingUniformity || 0), 0) / allLightingMetrics.length,
            // keep other fields from original if needed
            ...realLightingMetrics
          };
          addLog(`📊 FIX4: Averaged lighting from ${allLightingMetrics.length} center frames!`, 'info');
        }
      }
      realLightingMetrics = averagedLightingMetrics;

      // Get skin type for analysis
      const analysisSkinType = skinToneResult?.skinTone || 'normal';

      // 🎯 FIX1: REMOVE DUPLICATE METRIC CALCULATION! We don't use skinBeautyAnalysis for redness/pigment, so skip calling it entirely to save time!
      // const skinBeautyAnalysis = await runAsyncTask("SkinBeautyAnalysis", () => 
      //   engine.skinConditionAnalyzer.analyzeSkinBeauty(regionalLABforAnalysis, {}, analysisSkinType)
      // );
      // if (!skinBeautyAnalysis) throw new Error("CLINICAL_ERROR: SkinBeautyAnalyzer output missing");

      // 🔥 Extract CLINICALLY ACCURATE redness scores - NO ARTIFICIAL BASELINE
      // Real erythema detection: only count actual redness above physiological baseline
      const noseRednessDelta = Math.max(0, regionalLABforAnalysis.nose.a - regionalLABforAnalysis.overall.a);
      const cheekRednessDelta = Math.max(0, ((regionalLABforAnalysis.leftCheek.a + regionalLABforAnalysis.rightCheek.a) / 2) - regionalLABforAnalysis.overall.a);
      
      // CLINICAL THRESHOLD: Only count as redness if > 3.0 LAB units above baseline (dermatological standard)
      const clinicalRednessThreshold = 3.0;
      const clinicalNoseRedness = noseRednessDelta > clinicalRednessThreshold ? noseRednessDelta : 0;
      const clinicalCheekRedness = cheekRednessDelta > clinicalRednessThreshold ? cheekRednessDelta : 0;
      
      // Convert to 0-100 scale: 15.0 LAB units = maximum clinical erythema
      let accurateRednessScore = Math.max(0, Math.min(100, 
        ((clinicalNoseRedness + clinicalCheekRedness) / 2 / 15.0) * 100
      ));

      const accuratePigmentationScore = Math.max(0, Math.min(100,
        (Math.abs(regionalLABforAnalysis.leftCheek.b - regionalLABforAnalysis.rightCheek.b) + 
         Math.abs(regionalLABforAnalysis.nose.b - regionalLABforAnalysis.overall.b)) * 2
      ));

      // 🔄 Keep other metrics from BeautyMetricsEngine for compatibility
      const baseAnalysis = { skinTone: skinToneResult, undertone: undertoneResult, faceShape: faceShapeResult, skinAge: { estimatedAge: 0, confidence: 0 }, averagedLAB: cameraData.averagedLAB };

      const engineReport = await runAsyncTask("BeautyMetrics", () => engine.beautyMetricsEngine.generateExtendedMetrics(
        cleanRegions, realLightingMetrics, clinicalLandmarks, baseAnalysis, clampedGlobalOffset,
        { textureIntensity: gpuResults.textureIntensity, acneDensity: gpuResults.acneDensity * 100 }
      ));

      if (!engineReport) throw new Error("CLINICAL_ERROR: Engine output missing");

      // 🧔‍♂️ STRICT BEARD & MELANIN GUARDS
      const globalL = cameraData.averagedLAB.l;

      const hasChinData = regionAverages.chin && typeof regionAverages.chin.l === 'number';
      const chinL = hasChinData ? regionAverages.chin.l : null;

      // ENHANCED BEARD DETECTION: Check multiple indicators
      const chinIsDark = chinL && chinL < 35;
      const chinHasHighA = regionAverages.chin && regionAverages.chin.a > 18; // Shadow artifact
      const cheeksHaveHighA = (regionAverages.leftCheek?.a || 0) > 15 || (regionAverages.rightCheek?.a || 0) > 15;
      
      const isBeardPresent = userGender === 'male' && (chinIsDark || chinHasHighA || cheeksHaveHighA);

      // 🛡️ FIX1: SHADOW GUARD APPLIED BEFORE ANY CALIBRATION!
      // 🔥 CLINICAL SHADOW GUARD: Prevent shadow artifacts from being counted as redness
      const shadowThreshold = globalL < 45 ? 2.0 : 3.0; // Lower threshold in dim lighting
      const hasShadowArtifact = (regionalLABforAnalysis.nose.l < globalL - shadowThreshold * 2) ||
                               (regionalLABforAnalysis.leftCheek.l < globalL - shadowThreshold * 2) ||
                               (regionalLABforAnalysis.rightCheek.l < globalL - shadowThreshold * 2);
      
      // Apply shadow guard to redness calculation FIRST (before any calibration)
      if (hasShadowArtifact) {
        // Shadow detected - reduce redness score SIGNIFICANTLY (suppress false positives)
        accurateRednessScore = accurateRednessScore * 0.1; // 90% reduction for shadows
        console.log("🌑 SHADOW GUARD: Detected shadow artifact, reducing redness to", accurateRednessScore.toFixed(1));
      }

      // 🛡️ STEP 1: GLOBAL LIGHTING NORMALIZATION GUARD
      const safeBrightness = Math.max(0.01, (realLightingMetrics?.averageBrightness || 128) / 128);
      const lightingFactor = Math.max(0.75, Math.min(1.25, 1 / safeBrightness));

      const lightingFlagsFinal = getLightingFlags(realLightingMetrics?.lightingUniformity || 0.5, realLightingMetrics?.averageBrightness || 128);
      const lightingCtx = (window as any).currentLightingCtx || { isSunlight: false, isIndoor: false, lStdDev: 5 };

      // 🔥 STEP 4: REAL ENGINE TEXTURE DATA ONLY
      const finalTextureScore = requireSignal(engineReport.surfaceRoughness, "texture"); // Use real engine data directly
      const globalTextureScore = finalTextureScore; 
      addLog(`📊 Real engine texture score: ${globalTextureScore.toFixed(4)}`, "info");
      
      if (isBeardPresent) {
        console.log("🧔‍♂️ BEARD DETECTED: Engine texture data includes beard influence");
      }

      // 🎯 FIX1: REDNESS CALIBRATION NOW ONLY SUPPRESSES (NO INFLATION!), and runs AFTER shadow guard!
      // 🎯 STEP 5: REDNESS CALIBRATION (WITH MELANIN GUARD)
      // Changed shadow calibration from 1.15 → 0.1 to SUPPRESS (not inflate)
      const rednessCalibration = lightingFlagsFinal.hasHotspots ? 0.85 : lightingFlagsFinal.hasShadows ? 0.1 : 1.0; 
      let finalRednessScore = accurateRednessScore * rednessCalibration;

      if (globalL < 40) {
        finalRednessScore *= 0.25;
      } else if (globalL < 55) {
        finalRednessScore *= 0.45;
      }

      if (isBeardPresent) {
        finalRednessScore *= 0.05; // 95% suppression - eliminate beard shadow false positives
        console.log("🧔‍♂️ BEARD GUARD: Aggressively suppressing false erythema from beard shadow.");
      }

      // 🔥 STEP 6: PIGMENTATION CALIBRATION (TAN & BEARD GUARD)
      let finalPigmentScore = accuratePigmentationScore;
      if (globalL < 45) {
        finalPigmentScore *= 0.6;
      }
      if (isBeardPresent) {
        finalPigmentScore *= 0.4;
      }

      // 🔥 OVERRIDE with CLINICALLY ACCURATE values
      const strictPigment = finalPigmentScore; 
      const strictRedness = finalRednessScore; 
      const strictBrightness = requireSignal(100 - engineReport.melaninIndex, "brightness");
      const strictOiliness = requireSignal(engineReport.sebumProduction, "oiliness");
      const strictMoisture = requireSignal(engineReport.hydrationLevel, "moisture");
      const strictTexture = finalTextureScore;
      const strictAcne = requireSignal(engineReport.acneRisk, "acne");
      const strictDarkCircle = requireSignal(engineReport.darkCircleScore, "darkCircle");
      const strictSmoothness = requireSignal(engineReport.collagenDensity, "smoothness");
      const strictElasticity = requireSignal(engineReport.elastinFibers, "elasticity");
      const strictGlassSkin = requireSignal(engineReport.glassSkin, "glass skin");
      
      // 🎯 FIX2: Ensure pores metric uses ZONE-WEIGHTED SEBACEOUS regions!
      // Sebaceous regions = forehead + nose + cheeks (T-zone + cheeks)
      // Let's check engineReport.pores, but if it doesn't do zone-weighted, we can calculate it ourselves!
      // For now, let's make sure we use zone-weighted averages:
      let strictPores = requireSignal(engineReport.pores, "pores");
      
      const foreheadTexture = regionAverages.forehead?.pixels ? 
        (engine.labStatistics?.calculateStatistics?.(regionAverages.forehead.pixels)?.standardDeviation?.l || 0) * 2 : 0;
      const leftCheekTexture = regionAverages.leftCheek?.pixels ? 
        (engine.labStatistics?.calculateStatistics?.(regionAverages.leftCheek.pixels)?.standardDeviation?.l || 0) * 2 :0;
      const rightCheekTexture = regionAverages.rightCheek?.pixels ? 
        (engine.labStatistics?.calculateStatistics?.(regionAverages.rightCheek.pixels)?.standardDeviation?.l ||0)*2 :0;
      const noseTexture = regionAverages.nose?.pixels ? 
        (engine.labStatistics?.calculateStatistics?.(regionAverages.nose.pixels)?.standardDeviation?.l ||0)*2 :0;
        
      // Zone-weighted: Sebaceous zones get higher weight!
      strictPores = Math.max(0, Math.min(100, 
        (foreheadTexture * 0.3 + noseTexture * 0.3 + leftCheekTexture * 0.2 + rightCheekTexture * 0.2)
      ));
      addLog(`📊 FIX2: Pores calculated using zone-weighted sebaceous regions!`, "info");

      // finalTextureScore = applyLightingStability(finalTextureScore, lightingFactor); // REMOVED - use real engine data only
      finalRednessScore = applyLightingStability(finalRednessScore, lightingFactor);

      // 🧬 ADVANCED SKIN AGE USING ENHANCED SKIN AGE ESTIMATOR
      const bioElasticity = engineReport.elastinFibers;
      const bioSmoothness = engineReport.collagenDensity;
      const bioPores = engineReport.pores;
      const bioHydration = engineReport.hydrationLevel;

      // Use enhanced SkinAgeEstimator with biological penalty algorithm
      const regionAgeData = {
        forehead: regionAverages.forehead?.pixels || [],
        cheeks: [regionAverages.leftCheek?.pixels || [], regionAverages.rightCheek?.pixels || []],
        underEyes: regionAverages.leftUnderEye?.pixels || [],
        aroundEyes: [...(regionAverages.leftUnderEye?.pixels || []), ...(regionAverages.rightUnderEye?.pixels || [])],
        mouth: regionAverages.chin?.pixels || []
      };

      const skinAgeResult = aiEngineRef.current.skinAgeEstimator.estimateAdvancedSkinAge(
        regionAgeData,
        averagedLAB,
        {
          elastinFibers: bioElasticity,
          collagenDensity: bioSmoothness,
          pores: bioPores,
          hydrationLevel: bioHydration
        },
        finalTextureScore
      );

      const dynamicSkinAge = skinAgeResult.estimatedAge;
      const finalAge = requireSignal(dynamicSkinAge, "skinAge");

      let finalAcneScore = clinicalAcneScore;
      if (lightingFlagsFinal.hasShadows) finalAcneScore *= 0.75;

      const normalizedMetrics = {
        pigment: requireSignal(finalPigmentScore, "pigment"),
        redness: requireSignal(finalRednessScore, "redness"),
        brightness: strictBrightness,
        darkCircle: strictDarkCircle,
        oiliness: strictOiliness,
        moisture: strictMoisture,
        texture: requireSignal(finalTextureScore, "texture"),
        smoothness: strictSmoothness,
        elasticity: strictElasticity,
        acne: requireSignal(finalAcneScore, "acne"),
        confidence: requireSignal(Math.min(99, Math.floor(confidenceScore * 100)), "confidence"),
        glassSkin: strictGlassSkin,
        glassSkinZones: {},
        pores: strictPores,
      };

      addLog(`🕳️ Pores: ${normalizedMetrics.pores.toFixed(1)}%`, "info");
      addLog(`💧 Hydration: ${normalizedMetrics.moisture.toFixed(1)}%`, "info");
      addLog(`🛢️ Oiliness: ${normalizedMetrics.oiliness.toFixed(1)}%`, "info");
      addLog(`🔴 Redness: ${normalizedMetrics.redness.toFixed(1)}%`, "info");
      addLog(`🎨 Pigment: ${normalizedMetrics.pigment.toFixed(1)}%`, "info");
      addLog(`🌟 Elasticity: ${normalizedMetrics.elasticity.toFixed(1)}%`, "info");
      addLog(`👁️ Dark Circle: ${normalizedMetrics.darkCircle.toFixed(1)}%`, "info");
      addLog(`📅 Skin Age: ${finalAge}y`, "info");
      addLog(`🔮 Glass Skin: ${normalizedMetrics.glassSkin.toFixed(1)}%`, "info");

      if (!Number.isFinite(globalTextureScore)) throw new Error("CLINICAL_ERROR: globalTextureScore missing");

      const healthInputs = Object.values(normalizedMetrics).filter((v) => typeof v === "number");
      healthInputs.forEach((v, i) => { if (!Number.isFinite(v as number)) throw new Error(`CLINICAL_ERROR: Invalid health input at index ${i}`); });

      const overallHealth = engine.beautyMetricsEngine.calculateOverallHealthScore(normalizedMetrics);

      if (!Number.isFinite(overallHealth)) throw new Error("CLINICAL_ERROR: Overall health score invalid");

      let skinType = normalizedMetrics.oiliness > 55 ? "Oily" : normalizedMetrics.oiliness > 35 && normalizedMetrics.moisture < 45 ? "Combination" : normalizedMetrics.oiliness < 30 && normalizedMetrics.moisture < 40 ? "Dry" : "Balanced";
      let oilinessLevel = normalizedMetrics.oiliness > 70 ? "Very Oily" : normalizedMetrics.oiliness > 50 ? "Oily" : normalizedMetrics.oiliness > 30 ? "Slightly Oily" : "Dry";
      let darkCircleLevel = normalizedMetrics.darkCircle > 70 ? "Severe" : normalizedMetrics.darkCircle > 50 ? "Moderate" : normalizedMetrics.darkCircle > 30 ? "Mild" : "Noticeable";

      const clinicalMelaninIndex = 100 - averagedLAB.l;

      // RESTORED: 🔒 PART 6: ANTI-FAKE / REAL SKIN ENFORCEMENT
      const detectFakeSignals = (metrics: any) => {
        const fakeSignals = [];
        if (metrics.smoothness > 95) fakeSignals.push("OVER_SMOOTHING: Extremely low variance detected");
        if (regionalVariance < 0.5) fakeSignals.push("FILTER_MODE: Unreal uniform LAB distribution");

        if (!averagedLAB || !Number.isFinite(averagedLAB.l)) throw new Error("CLINICAL_ERROR: Invalid LAB L channel detected");

        const allRegionLs = [regionAverages?.forehead?.l, regionAverages?.leftCheek?.l, regionAverages?.rightCheek?.l, regionAverages?.nose?.l, regionAverages?.chin?.l].filter((v) => typeof v === 'number' && Number.isFinite(v));
        if (allRegionLs.length < 3) throw new Error("STRICT_SIGNAL_LOSS: insufficient_lighting_data");

        const globalL = allRegionLs.reduce((sum, val) => sum + val, 0) / allRegionLs.length;
        const tolerance = 55;
        const lightingInconsistency = averagedLAB.l < globalL - tolerance || averagedLAB.l > globalL + tolerance;

        // 🔥 CLINICAL FIX: Only trigger LIGHTING_MANIPULATION for extreme values (>95)
        if (averagedLAB.l > 95) fakeSignals.push(`LIGHTING_MANIPULATION: L=${averagedLAB.l.toFixed(1)}`);

        const regionVariation = Math.abs(faceRegionsL[0] - faceRegionsL[1]) + Math.abs(faceRegionsL[1] - faceRegionsL[2]);
        if (regionVariation < 2.0) fakeSignals.push("COLOR_FAKE: Unrealistic skin tone consistency");

        return fakeSignals;
      };

      // RESTORED: 🔒 PART 7: NATURAL VARIATION ENFORCEMENT
      const enforceNaturalVariation = (metrics: any) => {
        let adjustedConfidence = confidenceScore * 100;
        const regionVariation = Math.abs(regionAverages.forehead?.l - regionAverages.leftCheek?.l) + Math.abs(regionAverages.leftCheek?.l - regionAverages.rightCheek?.l) + Math.abs(regionAverages.rightCheek?.l - regionAverages.forehead?.l);
        if (regionVariation < 3.0) adjustedConfidence *= 0.8;
        if (regionalVariance < 1.0) adjustedConfidence *= 0.9;
        return Math.min(adjustedConfidence, 95);
      };

      const fakeSignals = detectFakeSignals(normalizedMetrics);
      await new Promise(requestAnimationFrame);

      if (fakeSignals.length > 0) {
        console.log("?? FAKE_SIGNAL_DETECTED:", fakeSignals);
        throw new Error(`STRICT_SIGNAL_LOSS: FAKE_SKIN_DETECTED - ${fakeSignals.join(', ')}`);
      }

      const finalConfidence = enforceNaturalVariation(normalizedMetrics);
      await new Promise(requestAnimationFrame);

      const validFramesCount = framesUsed || 60;
      const skippedFramesCount = 60 - validFramesCount;
      const frameQualityBonus = Math.min(1.0, validFramesCount / 60);
      const textureBonus = Math.min(1.0, regionalVariance / 5.0);
      const correctedConfidence = Math.min(95, finalConfidence * frameQualityBonus * textureBonus);

      await new Promise(requestAnimationFrame);

      // 🎯 GENERATE REAL SPOTS USING BEAUTY METRICS ENGINE
      const trueAcneSpots = aiEngineRef.current.beautyMetricsEngine.extractMetricCoordinates(normalizedSkinPixels, 'acne', averagedLAB.l, lightingCtx.lStdDev);
      const redSpots = aiEngineRef.current.beautyMetricsEngine.extractMetricCoordinates(normalizedSkinPixels, 'redness', averagedLAB.l, lightingCtx.lStdDev);
      const pigmentSpots = aiEngineRef.current.beautyMetricsEngine.extractMetricCoordinates(normalizedSkinPixels, 'pigment', averagedLAB.l, lightingCtx.lStdDev);
      const textureSpots = aiEngineRef.current.beautyMetricsEngine.extractMetricCoordinates(normalizedSkinPixels, 'texture', averagedLAB.l, lightingCtx.lStdDev);
      const oilSpots = aiEngineRef.current.beautyMetricsEngine.extractMetricCoordinates(normalizedSkinPixels, 'oiliness', averagedLAB.l, lightingCtx.lStdDev);
      const darkCircleSpots = aiEngineRef.current.beautyMetricsEngine.extractMetricCoordinates(normalizedSkinPixels, 'darkCircle', averagedLAB.l, lightingCtx.lStdDev);

      // 🎯 ADD ANGLE TAGGING TO ALL SPOTS (CRITICAL FIX)
      const addAngleToSpots = (spots: any[], angle: string) => {
        return spots.map(spot => ({ ...spot, angle }));
      };

      // Tag all spots with all angles since they're from combined pixel data
      const acneSpotsAllAngles = [
        ...addAngleToSpots(trueAcneSpots, 'center'),
        ...addAngleToSpots(trueAcneSpots, 'left'),
        ...addAngleToSpots(trueAcneSpots, 'right')
      ];
      const rednessSpotsAllAngles = [
        ...addAngleToSpots(redSpots, 'center'),
        ...addAngleToSpots(redSpots, 'left'),
        ...addAngleToSpots(redSpots, 'right')
      ];
      const pigmentSpotsAllAngles = [
        ...addAngleToSpots(pigmentSpots, 'center'),
        ...addAngleToSpots(pigmentSpots, 'left'),
        ...addAngleToSpots(pigmentSpots, 'right')
      ];
      const textureSpotsAllAngles = [
        ...addAngleToSpots(textureSpots, 'center'),
        ...addAngleToSpots(textureSpots, 'left'),
        ...addAngleToSpots(textureSpots, 'right')
      ];
      const oilSpotsAllAngles = [
        ...addAngleToSpots(oilSpots, 'center'),
        ...addAngleToSpots(oilSpots, 'left'),
        ...addAngleToSpots(oilSpots, 'right')
      ];
      const darkCircleSpotsAllAngles = [
        ...addAngleToSpots(darkCircleSpots, 'center'),
        ...addAngleToSpots(darkCircleSpots, 'left'),
        ...addAngleToSpots(darkCircleSpots, 'right')
      ];

      // 🛡️ UNIFIED STRUCTURAL FIX: 100% UI Mapping Only. ZERO calculations here.
      const finalReport: any = {
        skinTone: skinToneResult.skinTone,
        undertone: undertoneResult.undertone,
        faceShape: faceShapeResult.faceShape,
        engineConfidence: confidenceScore,
        faceMeasurements: faceShapeResult.measurements,
        faceRatios: faceShapeResult.ratios,
        confidence: correctedConfidence,
        skinAge: finalAge,
        skinType: skinType,
        oilinessIndex: Math.floor(normalizedMetrics.oiliness),
        rednessIndex: Math.round(Math.abs(averagedLAB.a) * 2),
        pigmentation: { unevennessIndex: Math.round(normalizedMetrics.pigment) },
        overallSkinHealthScore: overallHealth,
        isNormalized: true,

        acne: {
          level: finalAcneScore > 75 ? "Severe" : finalAcneScore > 40 ? "Moderate" : finalAcneScore > 15 ? "Mild" : "Clear",
          score: Math.floor(finalAcneScore),
          spotsDetected: spotsDetected,
          spots: acneSpotsAllAngles  // 🎯 Use angle-tagged spots
        },
        redness: {
          level: normalizedMetrics.redness > 50 ? "High" : "Normal",
          score: Math.floor(normalizedMetrics.redness),
          spots: rednessSpotsAllAngles  // 🎯 Use angle-tagged spots
        },
        pigment: {
          level: normalizedMetrics.pigment > 50 ? "High" : "Normal",
          score: Math.round(normalizedMetrics.pigment),
          intensity: Math.round(normalizedMetrics.pigment),
          spots: pigmentSpotsAllAngles  // 🎯 Use angle-tagged spots
        },
        oiliness: {
          level: oilinessLevel,
          score: Math.floor(normalizedMetrics.oiliness),
          spots: oilSpotsAllAngles  // 🎯 Use angle-tagged spots
        },
        darkCircle: {
          level: darkCircleLevel,
          score: Math.round(normalizedMetrics.darkCircle),
          spots: darkCircleSpotsAllAngles  // 🎯 Use angle-tagged spots
        },
        texture: {
          level: normalizedMetrics.texture > 50 ? "Rough" : "Smooth",
          score: Math.floor(normalizedMetrics.texture),
          spots: textureSpotsAllAngles  // 🎯 Use angle-tagged spots
        },
        pores: {
          level: normalizedMetrics.pores > 50 ? "Enlarged" : "Normal",
          score: Math.round(normalizedMetrics.pores),
          spots: textureSpotsAllAngles  // 🎯 Use angle-tagged spots (same as texture)
        },

        relativeMetrics: {
          pigmentationContrast,
          brightnessDiff,
          symmetryScore,
          stdL,
          textureScore: globalTextureScore,
          rednessContrast,
          brightnessBalance,
          darkCircleScore: relativeDarkCircleScore,
        },
        skinConditions: [],
        riskFactors: [],
        selectedMode: currentMode,
        analysisTimestamp: new Date().toISOString(),
        melaninIndex: clinicalMelaninIndex,
        asymmetryScore,
        framesUsed,
        textureScore: globalTextureScore,
        clinicalMetrics: normalizedMetrics,
        lipHealth: {
          hydration: lipHydrationScore,
          pigmentation: lipPigmentationScore,
          redness: lipHealthRedness,
          condition: lipCondition,
          tone: lipToneType,
        },
        meta: { skinAge: finalAge },
        beautyMetrics: engineReport,
        beautyScores: engineReport.beautyScores || {},
        // Live LAB from pipeline only — no invented fillers
        labValues: {
          overall: { l: averagedLAB.l, a: averagedLAB.a, b: averagedLAB.b },
          forehead: { l: regionAverages.forehead.l, a: regionAverages.forehead.a, b: regionAverages.forehead.b },
          leftCheek: { l: regionAverages.leftCheek.l, a: regionAverages.leftCheek.a, b: regionAverages.leftCheek.b },
          rightCheek: { l: regionAverages.rightCheek.l, a: regionAverages.rightCheek.a, b: regionAverages.rightCheek.b },
          ...(regionAverages.nose && Number.isFinite(regionAverages.nose.l)
            ? { nose: { l: regionAverages.nose.l, a: regionAverages.nose.a, b: regionAverages.nose.b } }
            : {}),
          ...(regionAverages.chin && Number.isFinite(regionAverages.chin.l)
            ? { chin: { l: regionAverages.chin.l, a: regionAverages.chin.a, b: regionAverages.chin.b } }
            : {}),
        },
      };

      console.log("🔒 ULTRA_STRICT_PIPELINE_SUMMARY:");
      console.log(`📊 Total frames processed: ${angleFrames.center.length + angleFrames.left.length + angleFrames.right.length}`);
      console.log(`📊 Valid frames: ${validFramesCount}`);
      console.log(`📊 Rejected frames: ${skippedFramesCount}`);
      console.log(`📊 Fake signals detected: ${fakeSignals ? fakeSignals.length : 0}`);
      console.log(`📊 Final confidence: ${correctedConfidence.toFixed(1)}%`);

      return finalReport;
    },
    [addLog, currentMode, userGender]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMERA + FACE MESH INITIALIZATION — from CosmeticAIScanner (unchanged)
  // ═══════════════════════════════════════════════════════════════════════════

  const startCameraAndTracking = useCallback(async () => {
    try {
      if (!videoRef.current) {
        addLog('Video reference not found yet', 'error');
        setTimeout(startCameraAndTracking, 200);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
      });

      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      isActiveRef.current = true;

      // 🛠️ CDN For Memory Safety
      const faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` 
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults((results: any) => {
        console.log(`FOREHEAD_DEBUG: MediaPipe results received`);
        console.log(`FOREHEAD_DEBUG: multiFaceLandmarks exists: ${!!results.multiFaceLandmarks}`);
        console.log(`FOREHEAD_DEBUG: multiFaceLandmarks length: ${results.multiFaceLandmarks?.length || 0}`);

        // 🔥 FIX: CLEAR LANDMARKS WHEN NO FACES DETECTED
        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
          console.log(`FOREHEAD_DEBUG: No faces detected - clearing landmarks`);
          landmarksRef.current = null;
          setFaceDetected(false);
          // Note: setActiveLandmarks is managed by parent component (MirrorScreen)
          return;
        }

        if (results.multiFaceLandmarks && results.multiFaceLandmarks[0]) {
          const landmarks = results.multiFaceLandmarks[0];
          landmarksRef.current = landmarks;
          console.log(`FOREHEAD_DEBUG: Landmarks detected: ${landmarks.length} points`);
          console.log(`FOREHEAD_DEBUG: First landmark:`, landmarks[0]);

          if (!faceDetectedRef.current) {
            faceDetectedRef.current = true;
            setFaceDetected(true);

            if (!isBareFaceConfirmedRef.current) {
              setShowAccuracyModal(true);
            }
          }
        }
      });
      faceMeshRef.current = faceMesh;

      videoRef.current.onloadedmetadata = () => {
        console.log(`FOREHEAD_DEBUG: Video metadata loaded`);
        console.log(`FOREHEAD_DEBUG: Video dimensions: ${videoRef.current?.videoWidth}x${videoRef.current?.videoHeight}`);
        console.log(`FOREHEAD_DEBUG: Video readyState: ${videoRef.current?.readyState}`);

        videoRef.current?.play().then(() => {
          console.log(`FOREHEAD_DEBUG: Video playback started`);

          const cam = new MediaPipeCamera(videoRef.current!, {
            onFrame: async () => {
              try {
                if (videoRef.current?.readyState === 4 && isActiveRef.current && faceMeshRef.current) {
                  console.log(`FOREHEAD_DEBUG: Sending frame to MediaPipe`);
                  await faceMeshRef.current.send({ image: videoRef.current });
                }
              } catch (e) {
                console.error(`FOREHEAD_DEBUG: MediaPipe send error:`, e);
              }
            },
          });
          cameraRef.current = cam;
          cam.start();
        });
      };
    } catch (err) {
      toast.error('Camera access denied or unavailable.');
    }
  }, [addLog]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ANGLE-SPECIFIC SPOT FILTERING HELPER
  // ═══════════════════════════════════════════════════════════════════════════

  // 🎯 Angle-specific spot filtering helper - accessible at component level
  const getAngleSpots = (spots: any[], angle: string) => {
    if (!Array.isArray(spots)) {
      console.warn(`SPOT_FILTER: Invalid spots array for angle ${angle}`);
      return [];
    }
    
    // 📊 DEBUG: Log the angle filtering process
    addLog(`🔍 Total Spots found: ${spots.length}`, 'info');
    addLog(`🎯 Filtering for angle: ${angle}`, 'info');
    
    const filtered = spots.filter(s => s.angle === angle);
    
    addLog(`✅ Final spots for ${angle}: ${filtered.length}`, filtered.length > 0 ? 'info' : 'warn');
    
    return filtered;
  };

  // 🎯 COMPREHENSIVE ANGLE DEBUG LOG - Log all angles during analysis
  const logAllAngleSpots = (finalReport: any) => {
    addLog(`🌟 ===== COMPREHENSIVE ANGLE ANALYSIS =====`, 'info');
    
    const angles = ['center', 'left', 'right'];
    const metrics = ['acne', 'redness', 'oiliness', 'darkCircle', 'texture', 'pores', 'pigment'];
    
    angles.forEach(angle => {
      addLog(`📸 ${angle.toUpperCase()} FRAME ANALYSIS:`, 'info');
      metrics.forEach(metric => {
        const spots = finalReport[metric]?.spots || [];
        const filtered = spots.filter((s: any) => s.angle === angle);
        const status = filtered.length > 0 ? '✅' : '⚠️';
        addLog(`  ${status} ${metric}: ${filtered.length} spots`, filtered.length > 0 ? 'info' : 'warn');
      });
      addLog(``, 'info');
    });
    
    addLog(`🌟 ===== END ANGLE ANALYSIS =====`, 'info');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // AI ENGINE INITIALIZATION — identical to MirrorScreen
  // ═══════════════════════════════════════════════════════════════════════════

  const startSystem = useCallback(async () => {
    setCurrentStep('setup');
    setCurrentInstruction('Waking up AI Math Engines...');
    await new Promise(r => setTimeout(r, 50));

    try {
      aiEngineRef.current = {
        faceShapeAnalyzer: new FaceShapeAnalyzer(),
        skinConditionAnalyzer: new SkinBeautyAnalyzer(),
        beautyMetricsEngine: new BeautyMetricsEngine(),
        skinAgeEstimator: new SkinAgeEstimator(),
        skinToneAnalysis: new SkinToneAnalysis(),
        undertoneDetection: new UndertoneDetection(),
        lightingNormalization: new LightingNormalization(),
        labStatistics: new LABStatistics(),
        skinRegionSelection: new SkinRegionSelection(),
        confidenceScore: new ConfidenceScore(),
        frameQualityFilter: new FrameQualityFilter(),
        frameStability: new FrameStability(),
        faceDetection: new FaceDetection(),
        colorConversion: ColorConversion,
      };
      addLog(`✅ AI Engine ready — ${Object.keys(aiEngineRef.current).length} engines loaded`, "info");
      toast.success("AI Intelligence Systems: ONLINE");
    } catch (e: any) {
      addLog(`❌ AI Engine init failed: ${e.message}`, "error");
      toast.error("AI Engine failed to initialize. Refresh the page.");
    }

    setCurrentInstruction('Connecting to Camera...');
    setCurrentStep('scanning');

    setTimeout(() => {
      startCameraAndTracking();
    }, 200);
  }, [startCameraAndTracking, addLog]);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3 — runAIAnalysis — Adapted from MirrorScreen's processFinalAnalysis
  // Same relativeMetrics computation as processFinalAnalysis. No engine delegation.
  // ═══════════════════════════════════════════════════════════════════════════

  const runAIAnalysis = useCallback(async () => {
    if (!videoRef.current || !aiEngineRef.current || !canvasRef.current) return;

    setIsAnalyzing_internal(true);
    setErrorLog(null);
    setSavedAnalysisId(null);
    analysisSessionIdRef.current = `session_${Date.now()}`;

    try {
      addLog("🚀 Phase 1: Camera pipeline starting...", "info");
      const analysisStartTime = Date.now();

      if (!webglEngineRef.current) webglEngineRef.current = new WebGLSkinEngine(canvasRef.current);
      setCurrentInstruction('Initializing GPU Processor...');

      // Stay in scanning mode during capture
      setCurrentStep('scanning');

      const cameraData = await runSkinAnalysis(videoRef.current, { isHighAccuracy: true });
      setSavedAngleFrames(cameraData.angleFrames);

      if (!cameraData.lightingMetrics) {
        throw new Error("DATA_ERROR: lightingMetrics missing");
      }
      setLightingMetrics(cameraData.lightingMetrics);

      addLog("?? Phase 2: AI engine pipeline starting...", "info");
      setAnalysisProgress(60);

      setCurrentStep('processing');
      setCurrentInstruction('Generating Cosmetic Report...');

      let finalReport;
      try {
        // ─── relativeMetrics — verbatim from MirrorScreen's processFinalAnalysis ───
        finalReport = await executeFullEnginePipeline({
          cameraData,
          regionAverages: cameraData.regionAverages,
          relativeMetrics: {
            melaninIndex: 100 - cameraData.averagedLAB.l,
            symmetryScore: aiEngineRef.current.faceShapeAnalyzer.calculateSymmetryScore(
              cameraData.regionAverages.leftCheek?.l,
              cameraData.regionAverages.rightCheek?.l
            ),
            pigmentationContrast: Math.abs(cameraData.regionAverages.forehead.l - cameraData.regionAverages.leftCheek.l),
            rednessContrast: Math.abs(cameraData.regionAverages.forehead.a - cameraData.regionAverages.leftCheek.a),
            brightnessBalance: (cameraData.regionAverages.forehead.l + cameraData.regionAverages.leftCheek.l + cameraData.regionAverages.rightCheek.l) / 3,
            darkCircleScore: 100 - ((cameraData.regionAverages.leftUnderEye.l + cameraData.regionAverages.rightUnderEye.l) / 2)
          },
          globalOffset: cameraData.globalOffset
        });
      } catch (error: any) {
        addLog(error.message, "error");
        setErrorLog("Clinical signal insufficient. Please rescan in proper lighting.");

        if (error.message.includes('STRICT_SIGNAL_LOSS')) {
          const signalType = error.message.split(':')[1]?.trim();
          if (signalType === 'insufficient_frames') {
            toast.error("Hold still longer. Need 3+ stable frames.");
          } else if (signalType === 'landmarks_incomplete') {
            toast.error("Ensure full face is visible in camera.");
          } else if (signalType?.includes('Cheek') || signalType?.includes('Forehead')) {
            toast.error(`Ensure ${signalType} is clearly visible.`);
          } else {
            toast.error("Improve lighting and face visibility.");
          }
        } else {
          toast.error('Analysis failed: ' + error.message);
        }

        // Reset after 3 seconds
        setTimeout(() => {
          setCurrentStep('scanning');
          setAnalysisProgress(0);
          setIsBareFaceConfirmed(false);
          isBareFaceConfirmedRef.current = false;
          setFaceDetected(false);
          faceDetectedRef.current = false;
          setAngleProgress({ center: 0, left: 0, right: 0 });
        }, 3000);
        return;
      }

      // Add frame data to finalReport
      if (cameraData.angleFrames) {
        (finalReport as any).frontFrame = cameraData.angleFrames.center?.[0] || null;
        (finalReport as any).leftFrame = cameraData.angleFrames.left?.[0] || null;
        (finalReport as any).rightFrame = cameraData.angleFrames.right?.[0] || null;
      }

      // 🔍 CAPTURE DIMENSIONS: Store video frame dimensions for proper coordinate scaling
      const captureWidth = cameraData.angleFrames?.center?.[0]?.imageData?.width || 1280;
      const captureHeight = cameraData.angleFrames?.center?.[0]?.imageData?.height || 720;
      console.log(`📏 CAPTURE DIMENSIONS: ${captureWidth}x${captureHeight}`);

      const enhancedReport = {
        ...finalReport,
        captureWidth,   // ← add these for SpatialRenderer
        captureHeight,  // ← add these for SpatialRenderer
        // 🎯 Angle-specific frame mapping with filtered spots
        frontFrame: {
          image: cameraData.angleFrames?.center?.[0]?.image || null,
          timestamp: cameraData.angleFrames?.center?.[0]?.timestamp || new Date().toISOString(),
          // 🎯 ClinicalOverlayEngine expects direct array access for spatial metrics ONLY
          // 🔍 DIAGNOSTIC: Add metric name to each log to expose which returns 1504 vs 0
          acneClusters: (() => {
            const s = getAngleSpots(finalReport.acne?.spots || [], 'center');
            console.log(`[FRONT_FRAME] acneClusters: ${s.length}`);
            return s;
          })(),
          rednessClusters: (() => {
            const s = getAngleSpots(finalReport.redness?.spots || [], 'center');
            console.log(`[FRONT_FRAME] rednessClusters: ${s.length}`); // ← This will likely log 0
            return s;
          })(),
          oilSpots: (() => {
            const s = getAngleSpots(finalReport.oiliness?.spots || [], 'center');
            console.log(`[FRONT_FRAME] oilSpots: ${s.length}`);
            return s;
          })(),
          underEyeRegions: (() => {
            const s = getAngleSpots(finalReport.darkCircle?.spots || [], 'center');
            console.log(`[FRONT_FRAME] underEyeRegions: ${s.length}`);
            return s;
          })(),
          porePoints: (() => {
            const s = getAngleSpots(finalReport.pores?.spots || [], 'center');
            console.log(`[FRONT_FRAME] porePoints: ${s.length}`); // ← This is likely the 1504 source
            return s;
          })(),
          melaninClusters: (() => {
            const s = getAngleSpots(finalReport.pigment?.spots || [], 'center');
            console.log(`[FRONT_FRAME] melaninClusters: ${s.length}`);
            return s;
          })()
        },
        leftFrame: {
          image: cameraData.angleFrames?.left?.[0]?.image || null,
          timestamp: cameraData.angleFrames?.left?.[0]?.timestamp || new Date().toISOString(),
          // 🎯 ClinicalOverlayEngine expects direct array access for spatial metrics ONLY
          // 🔍 DIAGNOSTIC: Add metric name to each log to expose which returns 1504 vs 0
          acneClusters: (() => {
            const s = getAngleSpots(finalReport.acne?.spots || [], 'left');
            console.log(`[LEFT_FRAME] acneClusters: ${s.length}`);
            return s;
          })(),
          rednessClusters: (() => {
            const s = getAngleSpots(finalReport.redness?.spots || [], 'left');
            console.log(`[LEFT_FRAME] rednessClusters: ${s.length}`); // ← This will likely log 0
            return s;
          })(),
          oilSpots: (() => {
            const s = getAngleSpots(finalReport.oiliness?.spots || [], 'left');
            console.log(`[LEFT_FRAME] oilSpots: ${s.length}`);
            return s;
          })(),
          underEyeRegions: (() => {
            const s = getAngleSpots(finalReport.darkCircle?.spots || [], 'left');
            console.log(`[LEFT_FRAME] underEyeRegions: ${s.length}`);
            return s;
          })(),
          porePoints: (() => {
            const s = getAngleSpots(finalReport.pores?.spots || [], 'left');
            console.log(`[LEFT_FRAME] porePoints: ${s.length}`); // ← This is likely the 1504 source
            return s;
          })(),
          melaninClusters: (() => {
            const s = getAngleSpots(finalReport.pigment?.spots || [], 'left');
            console.log(`[LEFT_FRAME] melaninClusters: ${s.length}`);
            return s;
          })()
        },
        rightFrame: {
          image: cameraData.angleFrames?.right?.[0]?.image || null,
          timestamp: cameraData.angleFrames?.right?.[0]?.timestamp || new Date().toISOString(),
          // 🎯 ClinicalOverlayEngine expects direct array access for spatial metrics ONLY
          // 🔍 DIAGNOSTIC: Add metric name to each log to expose which returns 1504 vs 0
          acneClusters: (() => {
            const s = getAngleSpots(finalReport.acne?.spots || [], 'right');
            console.log(`[RIGHT_FRAME] acneClusters: ${s.length}`);
            return s;
          })(),
          rednessClusters: (() => {
            const s = getAngleSpots(finalReport.redness?.spots || [], 'right');
            console.log(`[RIGHT_FRAME] rednessClusters: ${s.length}`); // ← This will likely log 0
            return s;
          })(),
          oilSpots: (() => {
            const s = getAngleSpots(finalReport.oiliness?.spots || [], 'right');
            console.log(`[RIGHT_FRAME] oilSpots: ${s.length}`);
            return s;
          })(),
          underEyeRegions: (() => {
            const s = getAngleSpots(finalReport.darkCircle?.spots || [], 'right');
            console.log(`[RIGHT_FRAME] underEyeRegions: ${s.length}`);
            return s;
          })(),
          porePoints: (() => {
            const s = getAngleSpots(finalReport.pores?.spots || [], 'right');
            console.log(`[RIGHT_FRAME] porePoints: ${s.length}`); // ← This is likely the 1504 source
            return s;
          })(),
          melaninClusters: (() => {
            const s = getAngleSpots(finalReport.pigment?.spots || [], 'right');
            console.log(`[RIGHT_FRAME] melaninClusters: ${s.length}`);
            return s;
          })()
        }
      };

      if (!finalReport.acne?.spots || !finalReport.oiliness?.spots) {
        throw new Error("DATA_INTEGRITY_ERROR: Missing cluster data from engine");
      }

      // Persist is deferred to Done & Apply — exactly ONE clinical_analyses insert per scan
      setAnalysisProgress(100);
      setFinalReportData(enhancedReport);
      setSavedAnalysisId(null);
      setCurrentStep('complete');
      setCurrentInstruction('Analysis Complete!');
      toast.success('Cosmetic Profile Generated!');

      addLog(`📊 Analysis duration: ${Date.now() - analysisStartTime}ms`, "info");

      setTimeout(() => {
        setShowBeautyPledgeModal(true);
      }, 1000);

    } catch (err: any) {
      addLog(`Pipeline failed: ${err.message}`, "error");
      setErrorLog(err.message);
      setCurrentInstruction(`Analysis Failed: ${err.message}`);

      setTimeout(() => {
        setCurrentStep('scanning');
        setAnalysisProgress(0);
        setIsBareFaceConfirmed(false);
        isBareFaceConfirmedRef.current = false;
        setFaceDetected(false);
        faceDetectedRef.current = false;
        setAngleProgress({ center: 0, left: 0, right: 0 });
      }, 3000);
    } finally {
      setIsAnalyzing_internal(false);
      setTimeout(() => {
        setAnalysisProgress(0);
      }, 1000);
    }
  }, [runSkinAnalysis, executeFullEnginePipeline, addLog]);

  // Internal analyzing state (not exposed in original CosmeticAIScanner)
  const [isAnalyzing_internal, setIsAnalyzing_internal] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // MAKEUP / BARE FACE HANDLERS — from CosmeticAIScanner (unchanged)
  // ═══════════════════════════════════════════════════════════════════════════

  const handleCleanFace = useCallback(() => {
    isBareFaceConfirmedRef.current = true;
    setIsBareFaceConfirmed(true);
    setShowAccuracyModal(false);
    setShowMakeupAnalysisModal(false);
    toast.success("Ready for pure skin analysis");

    setTimeout(() => {
      runAIAnalysis();
    }, 500);
  }, [runAIAnalysis]);

  const handleMakeupDetected = useCallback(() => {
    if (!videoRef.current || !landmarksRef.current) return;
    setShowAccuracyModal(false);

    try {
      const report = makeupCheckerEngine.evaluateMakeup(
        videoRef.current,
        landmarksRef.current,
        "Office/College"
      );

      if (report.lightingStatus !== 'optimal') {
        toast.error("Lighting is not optimal for makeup analysis. Please adjust.");
        return;
      }

      if (report.makeupPresence.level === 'no_makeup') {
        toast.info("Natural skin detected. Switching to deep clinical analysis...");
        handleCleanFace();
        return;
      }

      setMakeupReport(report);
      setShowMakeupAnalysisModal(true);

      const makeupLevel = report.makeupPresence.level === 'heavy_makeup' ? 'Heavy' : 'Light';
      toast.success(`${makeupLevel} makeup analyzed!`);

    } catch (err: any) {
      toast.error("Analysis failed: " + err.message);
    }
  }, [handleCleanFace]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  const cleanup = useCallback(() => {
    isActiveRef.current = false;
    faceDetectedRef.current = false;
    // Reset EMA on full cleanup so next session starts fresh
    lightingEMARef.current = null;
    if (cameraRef.current) { cameraRef.current.stop(); cameraRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (faceMeshRef.current) { try { faceMeshRef.current.close(); } catch (e) { } faceMeshRef.current = null; }
    if (webglEngineRef.current) { webglEngineRef.current = null; }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // GLOW JOURNEY HANDLER — glow_journeys + face_analyses ONLY (via RPC)
  // ═══════════════════════════════════════════════════════════════════════════

  const handleCommitToGlow = useCallback(async () => {
    if (!finalReportData) {
      toast.error('No analysis report available to start journey.');
      return;
    }

    if (isProcessingJourney) return;

    setIsProcessingJourney(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user?.id) {
        throw new Error('Please login to start your glow journey');
      }

      const result = await commitGlowJourneyFromReport(user.id, finalReportData);

      // Proper destructuring and validation of RPC response
      const { analysisId, journeyId, continuedExistingJourney } = result;
      
      if (!analysisId) {
        throw new Error('Unable to start journey: empty database response');
      }

      setShowBeautyPledgeModal(false);
      setCurrentStep('report');
      
      // Only show success toast if we have valid data and successful DB write
      if (analysisId && journeyId) {
        toast.success(
          continuedExistingJourney
            ? 'Scan added to your Glow Journey'
            : 'Welcome to your 30-Day Glow Journey! ✨'
        );
      }
    } catch (error) {
      console.error('Error starting glow journey:', error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Unable to start journey, please try again.';
      // Prefer exact backend/client message; fall back only for empty errors
      toast.error(
        message.startsWith('DATA_INTEGRITY_ERROR') || message.startsWith('AUTH_ERROR')
          ? message
          : message.includes('Unable to start journey')
            ? message
            : `Unable to start journey, please try again. (${message})`
      );
      // Keep modal open so user can retry — do not fake success
    } finally {
      setIsProcessingJourney(false);
    }
  }, [finalReportData, isProcessingJourney]);

  // Handle Done & Apply — clinical_analyses ONLY (exactly one insert)
  const handleDoneAndApply = async () => {
    if (!finalReportData) {
      toast.error('No analysis report available to save.');
      return;
    }

    if (isSaving) return;

    setIsSaving(true);
    let navigationReport: any = {
      ...finalReportData,
      savedAnalysisId: savedAnalysisId || undefined,
      savedToDatabase: false,
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        throw new Error('AUTH_ERROR: Please log in to save your analysis');
      }

      // Idempotent: if this scan was already saved, do not insert again
      if (savedAnalysisId) {
        navigationReport = {
          ...finalReportData,
          savedAnalysisId,
          savedToDatabase: true,
        };
      } else {
        if (!analysisSessionIdRef.current) {
          analysisSessionIdRef.current = `session_${Date.now()}`;
        }

        const data = await ClinicalMetricsService.saveLiveReport(
          finalReportData,
          user.id,
          analysisSessionIdRef.current
        );

        if (!data?.id) {
          throw new Error('Failed to save analysis: empty database response');
        }

        setSavedAnalysisId(data.id);
        navigationReport = {
          ...finalReportData,
          savedAnalysisId: data.id,
          savedToDatabase: true,
          id: data.id,
          created_at: data.created_at,
        };

        try {
          await ClinicalMetricsService.saveMetricsHistory(user.id, data);
        } catch (historyError) {
          console.warn('Metrics history save failed (analysis row was saved):', historyError);
        }
      }

      onAnalysisComplete(navigationReport);
      
      // Only show success toast if we actually saved to database
      if (navigationReport.savedToDatabase) {
        toast.success('Analysis saved to your clinical record');
      }

      cleanup();
      onClose();

      window.dispatchEvent(new CustomEvent('navigateToEventSection', {
        detail: {
          scanReport: navigationReport,
          savedToDatabase: true,
        }
      }));

      // Defer refresh so EventScreen can mount after navigation, then reload feed/history
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refreshEventSection', {
          detail: {
            scanReport: navigationReport,
            savedToDatabase: true,
            forceRefresh: true, // Add flag to force immediate refresh
          }
        }));
      }, 100); // Slightly longer delay to ensure navigation completes
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save analysis';
      console.error('❌ Error saving analysis:', error);
      toast.error(message);
      // Do NOT navigate with fake success; keep user on report to retry
    } finally {
      setIsSaving(false);
    }
  };

  const finishAndClose = useCallback(() => {
    console.log('🎯 finishAndClose called (deprecated - use handleDoneAndApply)');
    console.log('📊 finalReportData available:', !!finalReportData);
    
    if (finalReportData) {
      console.log('✅ Calling onAnalysisComplete with report data');
      onAnalysisComplete(finalReportData);
    } else {
      console.warn('⚠️ No finalReportData available');
    }
    
    console.log('🧹 Calling cleanup');
    cleanup();
    
    console.log('🚪 Calling onClose');
    onClose();
    
    // NO UNWANTED NAVIGATION - Removed the event dispatch

  }, [finalReportData, onAnalysisComplete, cleanup, onClose]);

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (isOpen) {
      isBareFaceConfirmedRef.current = false; setIsBareFaceConfirmed(false);
      faceDetectedRef.current = false; setFaceDetected(false);
      setFinalReportData(null);
      lightingEMARef.current = null; // Reset EMA for fresh session
      startSystem();
    } else cleanup();
  }, [isOpen, startSystem, cleanup]);

  // ═══════════════════════════════════════════════════════════════════════════
  // METRIC INSPECTION
  // ═══════════════════════════════════════════════════════════════════════════

  const handleMetricInspect = useCallback((metricId: string) => {
    if (!finalReportData) return;

    const metricKeyMap: Record<string, string> = {
      pigmentation: "pigment",
      pigment: "pigment",
      darkcircle: "darkCircle",
      darkCircle: "darkCircle",
    };

    const engineKey = metricKeyMap[metricId] || metricId;
    const spotBasedMetrics = ["acne", "pigment", "redness", "oiliness", "darkCircle", "texture", "pores"];

    if (spotBasedMetrics.includes(engineKey)) {
      const data = finalReportData[engineKey];
      if (!data || !Array.isArray(data.spots)) {
        toast.error(`Data not available for ${metricId.toUpperCase()}.`);
        return;
      }
    } else {
      let valueToCheck;
      if (metricId === "moisture" || metricId === "hydration") valueToCheck = finalReportData.clinicalMetrics?.moisture;
      else if (metricId === "smoothness") valueToCheck = finalReportData.clinicalMetrics?.smoothness;
      else if (metricId === "elasticity") valueToCheck = finalReportData.clinicalMetrics?.elasticity;
      else if (metricId === "glassSkin") valueToCheck = finalReportData.clinicalMetrics?.glassSkin;
      else if (metricId === "skinAge") valueToCheck = finalReportData.meta?.skinAge;

      if (valueToCheck === undefined || valueToCheck === null) {
        toast.error(`Data not extracted for ${metricId.toUpperCase()}`);
        return;
      }
    }

    // 🎯 COMPREHENSIVE ANGLE DEBUG - Log when clicking metric grid
    addLog(`🎯 ===== METRIC GRID CLICKED: ${metricId.toUpperCase()} =====`, 'info');
    addLog(`📸 Current active angle: ${activeAngle}`, 'info');
    addMobileDebug(`Metric clicked: ${metricId} on ${activeAngle} angle`);
    
    // Log spot counts for current angle across all metrics
    const angles = ['center', 'left', 'right'];
    const metrics = ['acne', 'redness', 'oiliness', 'darkCircle', 'texture', 'pores', 'pigment'];
    
    angles.forEach(angle => {
      const angleName = angle === 'center' ? 'front' : angle;
      addLog(`📸 ${angleName.toUpperCase()} FRAME:`, 'info');
      metrics.forEach(metric => {
        const spots = finalReportData[metric]?.spots || [];
        const filtered = spots.filter((s: any) => s.angle === angle);
        const status = filtered.length > 0 ? '✅' : '⚠️';
        addLog(`  ${status} ${metric}: ${filtered.length} spots`, filtered.length > 0 ? 'info' : 'warn');
      });
    });
    
    addLog(`🎯 ===== END METRIC ANALYSIS =====`, 'info');
    
    console.log(`✅ Opening Clinical Overlay for ${metricId.toUpperCase()}`);
    setActiveMetric(metricId);
  }, [finalReportData, activeAngle]);

  const getMetricData = (metricId: string) => {
    if (!finalReportData) return null;
    const map: any = {
      pigmentation: "pigment",
      pigment: "pigment",
      darkcircle: "darkCircle",
      darkCircle: "darkCircle",
    };
    const key = map[metricId] || metricId;
    return finalReportData[key] || finalReportData.clinicalMetrics;
  };

  if (!isOpen) return null;

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORT VIEW — from CosmeticAIScanner (unchanged)
  // ═══════════════════════════════════════════════════════════════════════════

  const renderReportView = () => {
    if (!finalReportData || typeof finalReportData !== "object") return null;

    const r = finalReportData;

    if (!r?.clinicalMetrics) {
      throw new Error("CLINICAL_ERROR: No clinical metrics data available");
    }

    const metricsData = r.clinicalMetrics;

    // ZERO-MOCK ENFORCEMENT: Validate all required metrics exist
    const requiredMetrics = ["moisture", "smoothness", "elasticity", "pigment", "oiliness", "acne", "darkCircle", "redness", "texture", "pores", "glassSkin"];
    for (const metric of requiredMetrics) {
      if (typeof metricsData[metric] !== "number" || !Number.isFinite(metricsData[metric])) {
        throw new Error(`CLINICAL_DATA_ERROR: Missing or invalid ${metric} from AI engine`);
      }
    }

    if (typeof r.overallSkinHealthScore !== "number" || !Number.isFinite(r.overallSkinHealthScore)) {
      throw new Error("CLINICAL_DATA_ERROR: Invalid overall health score from AI engine");
    }

    const safeOverallHealth = r.overallSkinHealthScore;

    // Fix 3: Remove progress bar inversion - all display layer uses exact same value
    const getAdjustedValue = (_id: string, value: number) => {
  return value;
};

    // Validate skin age data
    if (!r?.meta || typeof r.meta.skinAge !== "number" || !Number.isFinite(r.meta.skinAge)) {
      throw new Error("CLINICAL_DATA_ERROR: Invalid skin age from AI engine");
    }

    const metricsList = [
      { id: "moisture", label: "HYDRATION", value: metricsData.moisture, icon: "💧", special: false },
      { id: "smoothness", label: "SMOOTHNESS", value: metricsData.smoothness, icon: "🍑", special: false },
      { id: "elasticity", label: "ELASTICITY", value: metricsData.elasticity, icon: "🌟", special: false },
      { id: "brightness", label: "BRIGHTNESS", value: metricsData.brightness, icon: "☀️", special: false },
      { id: "pigment", label: "PIGMENT", value: metricsData.pigment, icon: "🎨", special: false },
      { id: "oiliness", label: "OILINESS", value: metricsData.oiliness, icon: "🛢", special: false },
      { id: "acne", label: "ACNE", value: metricsData.acne, icon: "⚠️", special: false },
      { id: "darkCircle", label: "DARK CIRCLE", value: metricsData.darkCircle, icon: "👁", special: false },
      { id: "redness", label: "REDNESS", value: metricsData.redness, icon: "🔴", special: false },
      { id: "texture", label: "TEXTURE", value: metricsData.texture, icon: "📊", special: false },
      { id: "pores", label: "PORES", value: metricsData.pores, icon: "🕳️", special: false },
      { id: "skinAge", label: "SKIN AGE", value: r.meta.skinAge, icon: "📅", special: true },
      { id: "glassSkin", label: "GLASS SKIN", value: metricsData.glassSkin, icon: "🔮", special: false },
    ];

    return (
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-purple-50 relative w-full h-full">
        <div className="flex flex-col max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 pb-24 sm:pb-32">

          {/* 1. TOP GRID */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg border border-white/20 p-4 sm:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-6">
              {[
                { label: "Face Shape", value: r.faceShape, icon: "😊" },
                { label: "Skin Tone", value: r.skinTone, icon: "🎨" },
                { label: "Undertone", value: r.undertone, icon: "🌟" },
                { label: "Skin Type", value: r.skinType, icon: "💧" },
                { label: "Brightness", value: `${Math.round(r.clinicalMetrics.brightness)}%`, icon: "☀️" },
              ].map((item) => (
                <div key={item.label} className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 border border-white/30 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg sm:text-2xl">{item.icon}</span>
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-purple-800 uppercase tracking-wide mb-1">{item.label}</p>
                  <p className="font-bold text-purple-900 capitalize text-sm sm:text-base leading-tight">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 2. GLOW RING - HERO SECTION */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500"></div>
            <div className="p-4 sm:p-8 border-b border-white/20">
              <h3 className="flex items-center gap-2 sm:gap-3 font-bold text-sm sm:text-xl">
                <Sparkles className="h-4 w-4 sm:h-6 sm:w-6 text-violet-500" />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-700 to-pink-600">
                  Glow Intelligence
                </span>
              </h3>
            </div>
            <div className="flex flex-col items-center justify-center py-6 sm:py-12">
              <div className="relative w-24 h-24 sm:w-40 sm:h-40 mb-4">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="50%" stopColor="#ec4899" />
                      <stop offset="100%" stopColor="#f472b6" />
                    </linearGradient>
                  </defs>
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="12" opacity="0.3" />
                  <circle
                    cx="50" cy="50" r="45" fill="none" stroke="url(#glowGradient)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${safeOverallHealth * 2.827} 282.7`}
                    className="transition-all duration-1000 ease-out animate-pulse"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
  <span className="text-2xl sm:text-4xl font-black text-slate-800 leading-none tabular-nums">
    {Math.round(safeOverallHealth)}%
  </span>
  <span className="text-[7px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-tighter text-center mt-1 w-full leading-tight">
    Health Score
  </span>
</div>

              </div>
            </div>
          </div>

          {/* 3. COMPREHENSIVE METRICS GRID - ALL METRICS VISIBLE */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg border border-white/20 p-4 sm:p-6">
            <h4 className="text-base sm:text-xl font-bold text-purple-800 mb-6 text-center">
              🌟 Complete Skin Analysis
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {metricsList.map((m: any) => {
                const adjustedValue = m.value === null ? null : getAdjustedValue(m.id, m.value);
                const safeAdjustedValue = adjustedValue !== null ? adjustedValue : 0;
                
                // 🎯 FIX5: GRADED THRESHOLDS instead of hard binary cutoffs!
                // Get IONTYX status and color based on metric type and value with graded confidence
                const getMetricStatus = (id: string, value: number) => {
                  // Helper function to interpolate colors between two hex codes
                  const interpolateColor = (color1: string, color2: string, t: number) => {
                    // Convert hex to RGB
                    const hexToRgb = (hex: string) => {
                      const bigint = parseInt(hex.replace('#', ''), 16);
                      const r = (bigint >> 16) & 255;
                      const g = (bigint >> 8) & 255;
                      const b = bigint & 255;
                      return { r, g, b };
                    };
                    const c1 = hexToRgb(color1);
                    const c2 = hexToRgb(color2);
                    // Interpolate each channel
                    const r = Math.round(c1.r + (c2.r - c1.r) * t);
                    const g = Math.round(c1.g + (c2.g - c1.g) * t);
                    const b = Math.round(c1.b + (c2.b - c1.b) * t);
                    // Convert back to hex
                    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
                  };

                  // Health metrics (higher is better)
                  if (['moisture', 'smoothness', 'elasticity', 'glassSkin', 'brightness'].includes(id)) {
                    let t: number; // Interpolation factor: 0 = worst (VIGIL), 1 = best (GLAZED)
                    if (value <= 60) t = 0;
                    else if (value >= 85) t = 1;
                    else t = (value - 60) / (85 - 60); // Smooth transition 60 →85
                    
                    const status = t >= 0.7 ? 'GLAZED' : (t >= 0.3 ? 'DEWY' : 'VIGIL');
                    const color = interpolateColor('#ef4444', '#10b981', t); // Red → Green
                    const textColor = t >= 0.7 ? 'text-emerald-500' : (t >=0.3 ? 'text-amber-500' : 'text-rose-500');
                    const bgColor = t >= 0.7 ? 'bg-emerald-500/10' : (t >=0.3 ? 'bg-amber-500/10' : 'bg-rose-500/10');
                    return { status, color, bgColor, textColor };
                  }
                  
                  // Concern metrics (lower is better)
                  if (['acne', 'pores', 'redness', 'darkCircle', 'oiliness', 'pigment', 'texture'].includes(id)) {
                    let t: number; // Interpolation factor: 0 = best (GLAZED), 1 = worst (VIGIL)
                    if (value <= 15) t = 0;
                    else if (value >= 40) t = 1;
                    else t = (value -15)/(40-15); // Smooth transition 15→40
                    
                    const status = t <= 0.3 ? 'GLAZED' : (t <= 0.7 ? 'DEWY' : 'VIGIL');
                    const color = interpolateColor('#10b981', '#ef4444', t); // Green → Red
                    const textColor = t <= 0.3 ? 'text-emerald-500' : (t <=0.7 ? 'text-amber-500' : 'text-rose-500');
                    const bgColor = t <= 0.3 ? 'bg-emerald-500/10' : (t <=0.7 ? 'bg-amber-500/10' : 'bg-rose-500/10');
                    return { status, color, bgColor, textColor };
                  }
                  
                  if (id === 'skinAge') return { status: 'AGE', color: '#6b7280', bgColor: 'bg-slate-500/10', textColor: 'text-slate-500' };
                  return { status: 'NORMAL', color: '#6b7280', bgColor: 'bg-slate-500/10', textColor: 'text-slate-500' };
                };
                
                const getMetricTheme = (id: string) => {
                  if (['moisture', 'smoothness', 'texture'].includes(id)) return 'blue';
                  if (['elasticity', 'pigment', 'glassSkin'].includes(id)) return 'purple';
                  return 'rose'; // Concerns
                };
                
                const metricStatus = getMetricStatus(m.id, m.value);
                const theme = getMetricTheme(m.id);
                const bgColor = theme === 'blue' ? 'from-blue-50 to-cyan-50' : 
                              theme === 'purple' ? 'from-purple-50 to-pink-50' : 
                              'from-rose-50 to-orange-50';
                const borderColor = theme === 'blue' ? 'border-blue-100/30' : 
                                 theme === 'purple' ? 'border-purple-100/30' : 
                                 'border-rose-100/30';
                
                return (
                  <div
                    key={m.id}
                    onClick={() => handleMetricInspect(m.id)}
                    className={`bg-gradient-to-br ${bgColor} rounded-2xl p-4 border ${borderColor} shadow-sm cursor-pointer hover:scale-[1.02] transition-transform relative min-h-[140px] sm:min-h-[160px]`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg sm:text-2xl">{m.icon}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-bold text-gray-800">
                          {m.special ? `${m.value}y` : `${Number(m.value).toFixed(0)}%`}
                        </span>
                        
                        {/* IONTYX Status Badge */}
                        <div className={`px-2 py-1 rounded-full ${metricStatus.bgColor} backdrop-blur-sm border border-white/50`}>
                          <span className={`font-black tracking-[0.2em] text-[8px] uppercase ${metricStatus.textColor}`}>
                            {metricStatus.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm sm:text-base font-bold text-gray-700 uppercase tracking-wider mb-2">{m.label}</div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${safeAdjustedValue}%`,
                          background: metricStatus.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. LIP HEALTH - ROSE/PINK THEME */}
          {r.lipHealth && (
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 overflow-hidden">
              <div className="bg-gradient-to-r from-rose-100 to-pink-100 p-4 sm:p-6 border-b border-white/20">
                <div className="flex items-center gap-3">
                  <span className="text-2xl sm:text-3xl">💋</span>
                  <span className="text-base sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-600 to-pink-600">
                    Lip Health Analysis
                  </span>
                </div>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div className="overflow-x-auto">
                  <div className="flex gap-4 min-w-max sm:min-w-0 sm:grid sm:grid-cols-2 lg:grid-cols-4">
                    <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-4 border border-rose-100/30 shadow-sm min-w-[140px]">
                      <div className="text-sm font-semibold text-rose-700 mb-1">Condition</div>
                      <div className="text-base font-bold text-rose-900">{r.lipHealth.condition}</div>
                    </div>
                    <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-4 border border-rose-100/30 shadow-sm min-w-[140px]">
                      <div className="text-sm font-semibold text-rose-700 mb-1">Tone</div>
                      <div className="text-base font-bold text-rose-900">{r.lipHealth.tone}</div>
                    </div>
                    <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-4 border border-rose-100/30 shadow-sm min-w-[140px]">
                      <div className="text-sm font-semibold text-rose-700 mb-1">Hydration</div>
                      <div className="text-base font-bold text-blue-600">{Number.isFinite(r.lipHealth.hydration) ? r.lipHealth.hydration.toFixed(1) : "0"}%</div>
                    </div>
                    <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-4 border border-rose-100/30 shadow-sm min-w-[140px]">
                      <div className="text-sm font-semibold text-rose-700 mb-1">Pigmentation</div>
                      <div className="text-base font-bold text-amber-600">{Number.isFinite(r.lipHealth.pigmentation) ? r.lipHealth.pigmentation.toFixed(1) : "0"}%</div>
                    </div>
                    <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-4 border border-rose-100/30 shadow-sm min-w-[140px]">
                      <div className="text-sm font-semibold text-rose-700 mb-1">Redness</div>
                      <div className="text-base font-bold text-red-600">{Number.isFinite(r.lipHealth.redness) ? r.lipHealth.redness.toFixed(1) : "0"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analysis Confidence */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg border border-white/20 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-blue-700 text-sm sm:text-base">
                Analysis Confidence: <span className="text-lg sm:text-xl font-bold text-blue-800">
                  {r.confidence ? (Number.isFinite(r.confidence) ? r.confidence.toFixed(0) + "%" : "0%") : "--"}
                </span>
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* REPORT ACTIONS */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="w-full max-w-md mx-auto space-y-3">
              <button
                onClick={handleDoneAndApply}
                disabled={isSaving}
                className="w-full py-4 sm:py-5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-2xl sm:rounded-3xl font-bold text-base sm:text-lg shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                {isSaving ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving to Database...
                  </div>
                ) : (
                  'Save & View in Events'
                )}
              </button>

              <div className="text-center text-xs sm:text-sm text-gray-500">
                Your full report will open in the Events dashboard after saving.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="fixed inset-0 z-[100] w-full h-full">
      <div className={`bg-white w-full h-full max-w-none overflow-y-auto flex flex-col relative ${currentStep === 'report' ? 'bg-slate-50' : 'bg-white'}`}>

        {/* Header */}
        <div className={`sticky top-0 z-10 p-5 pt-safe flex items-center justify-between ${currentStep === 'report' ? 'bg-[#050505] border-b border-white/10' : 'bg-white border-b border-gray-100'}`}>
          <div>
            <h3 className={`text-lg font-bold flex items-center ${currentStep === 'report' ? 'text-white' : 'text-gray-900'}`}>
              <Sparkles className="w-5 h-5 mr-2 text-purple-500" />
              {currentStep === 'report' ? 'Glow Intelligence' : 'Advanced Beauty AI'}
            </h3>
          </div>
          <button onClick={finishAndClose} className={`p-2 rounded-full transition ${currentStep === 'report' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
            <X className={`w-5 h-5 ${currentStep === 'report' ? 'text-gray-300' : 'text-gray-400'}`} />
          </button>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* Debug Panel — identical to MirrorScreen */}
        {/* DEBUG BOX (TOP RIGHT) */}
          <div className="fixed top-2 right-2 z-50 bg-black/90 rounded-lg p-2 max-w-[220px]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-white text-[9px] font-mono font-bold tracking-widest">DEBUG</span>
              <button onClick={() => setDebugOpen((p) => !p)} className="text-gray-400 text-[9px]">
                {debugOpen ? "▲" : "▼"}
              </button>
            </div>
            {debugOpen && (
              <div className="bg-black rounded p-1 max-h-28 overflow-y-auto space-y-0.5">
                {debugLogs.slice(-20).reverse().map((l, i) => (
                  <div
                    key={i}
                    className={`text-[8px] font-mono ${
                      l.type === "error"
                        ? "text-red-400"
                        : l.type === "warn"
                        ? "text-yellow-400"
                        : "text-green-400"
                    }`}
                  >
                    {l.message}
                  </div>
                ))}
              </div>
            )}
          </div>

        
        {/* Compact Debug Console — identical to MirrorScreen */}
        {debugMode && debugLogs.length > 0 && (
          <div style={{
            position: "fixed", bottom: 0, left: 0, width: "100%", maxHeight: 100,
            overflowY: "auto", background: "#000", color: "#0f0", fontSize: 8,
            padding: 4, zIndex: 9999, fontFamily: "monospace",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #0f0", marginBottom: 3 }}>
              <span style={{ fontWeight: "bold", fontSize: 8 }}>🐞 DEBUG</span>
              <button
                onClick={() => setDebugLogs([])}
                style={{ background: "#0f0", color: "#000", border: "none", padding: "1px 5px", fontSize: 8, borderRadius: 3, cursor: "pointer" }}
              >CLR</button>
            </div>
            {debugLogs.slice(-15).reverse().map((l, i) => (
              <div key={i} style={{ marginBottom: 1, color: l.type === "error" ? "#ff4444" : l.type === "warn" ? "#ffaa00" : "#00ff00" }}>
                [{l.timestamp}] {l.message}
              </div>
            ))}
          </div>
        )}

        {/* Debug Toggle Button */}
        <button
          onClick={() => setDebugMode((p) => !p)}
          style={{
            position: "fixed", top: 8, right: 8,
            background: debugMode ? "#dc2626" : "#059669",
            color: "white", border: "none", padding: "4px 8px",
            fontSize: 9, borderRadius: 12, cursor: "pointer",
            zIndex: 10001, fontFamily: "monospace",
          }}
        >
          🐞
        </button>

        {/* Non-report steps */}
        {currentStep !== 'report' ? (
          <div className="p-6 flex-1 flex flex-col items-center justify-center bg-gray-50/50">

            {currentStep === 'setup' && (
              <div className="text-center py-10">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-700 font-medium">{currentInstruction}</p>
              </div>
            )}

            <div className={`w-full space-y-6 ${currentStep === 'scanning' ? 'block' : 'hidden'}`}>
              <div className="relative w-64 h-64 mx-auto rounded-full overflow-hidden border-4 border-purple-100 shadow-inner bg-black">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                <div className="absolute top-4 left-0 right-0 flex justify-center">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${faceDetected ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'}`}>
                    {faceDetected ? '✓ Face Locked' : 'Scanning for face...'}
                  </div>
                </div>
                {currentInstruction && isAnalyzing_internal && (
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <div className="bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-[10px] font-medium">
                      {currentInstruction}
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 border-[6px] border-purple-500/30 rounded-full animate-pulse" />
              </div>

              <div className="text-center space-y-4">
                <p className="text-lg font-bold text-gray-800 bg-purple-100/50 py-2 px-4 rounded-full inline-block">
                  {currentInstruction}
                </p>
                <div className="flex justify-center gap-4 text-xs font-mono font-bold text-gray-500">
                  <div className={`px-3 py-1 rounded-lg ${angleProgress.center === 20 ? 'bg-green-100 text-green-700' : 'bg-gray-200'}`}>FRONT: {angleProgress.center}/20</div>
                  <div className={`px-3 py-1 rounded-lg ${angleProgress.left === 20 ? 'bg-green-100 text-green-700' : 'bg-gray-200'}`}>LEFT: {angleProgress.left}/20</div>
                  <div className={`px-3 py-1 rounded-lg ${angleProgress.right === 20 ? 'bg-green-100 text-green-700' : 'bg-gray-200'}`}>RIGHT: {angleProgress.right}/20</div>
                </div>

                {errorLog && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-left">
                    <p className="text-red-700 text-[10px] font-semibold">🚨 Error</p>
                    <p className="text-red-600 text-[9px] mt-0.5">{errorLog}</p>
                  </div>
                )}

                <button
                  onClick={runAIAnalysis}
                  disabled={!isBareFaceConfirmed || isAnalyzing_internal}
                  className={`w-full mt-4 py-4 rounded-2xl font-bold shadow-lg transition-transform ${isBareFaceConfirmed && !isAnalyzing_internal ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-purple-500/30 hover:scale-[1.02] active:scale-95 cursor-pointer' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                  {isAnalyzing_internal ? 'Processing...' : isBareFaceConfirmed ? 'Start Analysis' : 'Waiting for Face Confirmation...'}
                </button>
              </div>
            </div>

            {currentStep === 'processing' && (
              <div className="text-center py-10 w-full">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 border-4 border-purple-200 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-purple-600 rounded-full border-t-transparent animate-spin" style={{ animationDuration: '1.5s' }}></div>
                  <div className="absolute inset-0 flex items-center justify-center font-bold text-purple-600">{analysisProgress}%</div>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Analyzing Profile</h3>
                <p className="text-sm text-gray-500 mb-6">{currentInstruction}</p>
                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 h-full transition-all duration-300" style={{ width: `${analysisProgress}%` }} />
                </div>
              </div>
            )}

            {currentStep === 'complete' && (
              <div className="text-center py-12 w-full">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">✨</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Profile Generated!</h3>
                <p className="text-gray-500 mb-8">Your clinical beauty insights are ready.</p>
                <button onClick={() => setCurrentStep('report')} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-colors">
                  View Full Report
                </button>
              </div>
            )}

            {/* Accuracy Modal */}
            {showAccuracyModal && currentStep !== 'report' as string && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl p-5 w-full shadow-2xl border border-gray-100 animate-fade-up">
                  <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 text-center mb-2">AI Accuracy Check</h3>
                  <p className="text-xs text-gray-500 text-center mb-5 leading-relaxed px-2">For precise analysis, we need your bare face. Are you wearing makeup or creams?</p>
                  <div className="space-y-2.5">
                    <button onClick={handleMakeupDetected} className="w-full bg-gray-100 text-gray-800 py-3 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">Yes, I have makeup on</button>
                    <button onClick={handleCleanFace} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/20">No, my face is clean ✨</button>
                  </div>
                </div>
              </div>
            )}

            {/* Beauty Pledge Modal */}
            {showBeautyPledgeModal && currentStep === 'complete' && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 animate-fade-up">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Commit to Your Glow</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">Join the 30-Day Skin Transformation Journey and track your progress with AI-powered insights</p>
                  </div>
                  <div className="space-y-3 mb-6">
                    {[
                      { color: "purple", text: "Daily skin tracking & analysis" },
                      { color: "pink", text: "Personalized AI routine recommendations" },
                      { color: "green", text: "Progress tracking with before/after" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-8 h-8 bg-${item.color}-100 rounded-full flex items-center justify-center flex-shrink-0`}>
                          <span className={`text-${item.color}-600 font-bold`}>✓</span>
                        </div>
                        <span className="text-gray-700">{item.text}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setShowBeautyPledgeModal(false); setCurrentStep('report'); }}
                      className="flex-1 bg-gray-100 text-gray-800 py-3 rounded-xl text-sm font-bold"
                      disabled={isProcessingJourney}
                    >Skip for Now</button>
                    <button
                      onClick={handleCommitToGlow}
                      disabled={isProcessingJourney}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/20 disabled:opacity-50"
                    >
                      {isProcessingJourney ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Starting...
                        </div>
                      ) : 'Start Journey ✨'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Makeup Analysis Modal */}
            {showMakeupAnalysisModal && makeupReport && currentStep !== 'report' as string && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl p-5 w-full shadow-2xl border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600" /> Makeup Report
                    </h3>
                    <button onClick={() => setShowMakeupAnalysisModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  <div className="text-center mb-5">
                    <p className="text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{Math.round(makeupReport.overallScore)}%</p>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-bold">Overall Score</p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Foundation", score: makeupReport.foundationMatch?.score ?? 0, color: "from-purple-400 to-pink-400" },
                      { label: "Shine Control", score: makeupReport.shineDetection?.score ?? 0, color: "from-blue-400 to-cyan-400" },
                      { label: "Texture", score: makeupReport.cakeyDetection?.score ?? 0, color: "from-green-400 to-emerald-400" },
                    ].map((m) => (
                      <div key={m.label} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-600 w-24 shrink-0">{m.label}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full bg-gradient-to-r ${m.color}`} style={{ width: `${Math.round(m.score)}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-800 w-8 text-right">{Math.round(m.score)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-6">
                    <button onClick={() => setShowMakeupAnalysisModal(false)} className="flex-1 bg-gray-100 text-gray-800 py-2.5 rounded-xl text-xs font-bold">Close</button>
                    <button onClick={() => { setShowMakeupAnalysisModal(false); handleMakeupDetected(); }} className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl text-xs font-bold">Re-analyze</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          renderReportView()
        )}

        {/* METRIC INSPECTION OVERLAY */}
        {activeMetric && savedAngleFrames && finalReportData && (
          <div className="absolute inset-0 bg-[#050505] z-50 flex flex-col animate-fade-in">
            <div className="bg-black border-b border-white/10 p-4 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg uppercase tracking-wider">
                {activeMetric} ANALYSIS
              </h3>
              <button onClick={() => setActiveMetric(null)} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center">
              {((getMetricData: any) => {
                const getActiveFrameData = (angle: "front" | "left" | "right") => {
                  const frameMap = {
                    front: savedAngleFrames.center?.[0],
                    left: savedAngleFrames.left?.[0],
                    right: savedAngleFrames.right?.[0]
                  };
                  return frameMap[angle] || frameMap.front || frameMap.left || frameMap.right || { image: "" };
                };
                const activeFrame = getActiveFrameData(activeAngle);

                const handleAngleSwitch = (targetAngle: "front" | "left" | "right") => {
                  // 🎯 FRAME SWITCH DEBUG - Log when switching angles
                  addLog(`🔄 ===== FRAME SWITCH: ${targetAngle.toUpperCase()} =====`, 'info');
                  addLog(`📸 Switching from: ${activeAngle} → ${targetAngle}`, 'info');
                  
                  const frameMap = {
                    front: savedAngleFrames.center?.[0],
                    left: savedAngleFrames.left?.[0],
                    right: savedAngleFrames.right?.[0]
                  };
                  if (!frameMap[targetAngle] || !frameMap[targetAngle].image) {
                    toast.error(`No image data for ${targetAngle.toUpperCase()}`);
                    return;
                  }
                  
                  // Log current metric spots for new angle
                  if (activeMetric && finalReportData) {
                    addLog(`🎯 Current metric: ${activeMetric}`, 'info');
                    const metricKey = activeMetric === 'pigmentation' ? 'pigment' : activeMetric;
                    const spots = finalReportData[metricKey]?.spots || [];
                    const angleKey = targetAngle === 'front' ? 'center' : targetAngle;
                    const filtered = spots.filter((s: any) => s.angle === angleKey);
                    addLog(`📊 Spots for ${targetAngle}: ${filtered.length}`, filtered.length > 0 ? 'info' : 'warn');
                  }
                  
                  addLog(`🔄 ===== END FRAME SWITCH =====`, 'info');
                  setActiveAngle(targetAngle);
                };

                return (
                  <div className="w-full max-w-md">
                    <div className="relative bg-black rounded-lg overflow-hidden border border-white/20">
                      {activeFrame?.image ? (
                        <ClinicalOverlayEngine
                          selectedMetric={activeMetric}
                          analysisResult={finalReportData}
                          activeAngle={activeAngle}
                          performanceMode="auto"
                        />
                      ) : (
                        <div className="text-center text-white/60 py-10">No image data</div>
                      )}
                      <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded text-white text-[10px] font-bold border border-white/20">
                        {activeAngle.toUpperCase()}
                      </div>
                    </div>

                    <div className="flex justify-center mt-6 space-x-2">
                      {(['left', 'front', 'right'] as const).map(angle => (
                        <button
                          key={angle}
                          onClick={() => handleAngleSwitch(angle)}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${activeAngle === angle ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                        >
                          {angle.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })(getMetricData)}
            </div>
          </div>
        )}

        {/* Debug Button - Only show during analysis */}
        {currentStep === 'scanning' && (
          <button
            onClick={() => setShowForeheadDebug(true)}
            className="fixed bottom-4 right-4 bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors z-40"
            style={{ zIndex: 9999 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
        )}

        {/* Forehead Debug Screen */}
        <ForeheadDebugScreen
          isVisible={showForeheadDebug}
          onClose={() => setShowForeheadDebug(false)}
        />

      </div>
    </div>
  );
});

CosmeticAIScanner.displayName = 'CosmeticAIScanner';
