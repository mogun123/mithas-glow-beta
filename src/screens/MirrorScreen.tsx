import React, { useState, useRef, useCallback, useEffect } from "react";
import { normalizeBeardAssets } from '../utils/normalizeBeardAsset';
import {
  Home,
  Camera,
  RotateCcw,
  Sparkles,
  Bot,
  Eye,
  Sun,
  ArrowLeft,
  ShoppingBag,
  RefreshCw,
  Loader2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from '../lib/supabase';

// UI Components
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { cn } from "../components/ui/utils";

// MediaPipe
import { FaceMesh } from "@mediapipe/face_mesh";
import { Pose as MediaPipePose } from "@mediapipe/pose";

// IONTYX AI ENGINES
import AIOccasionStylist, { Gender, Occasion, FaceGeometry, BodyGeometry, BridalContext } from '../lib/ai/AIOccasionStylist';
import GlowScoreEngine, { GlowScoreResult, FaceRegionLAB } from '../lib/ai/GlowScoreEngine';
import AISuggestionEngine, { AISuggestion, SuggestionContext } from '../lib/ai/AISuggestionEngine';
import { FaceShapeAnalyzer } from '../lib/ai/analysis/faceShapeAnalyzer';
import BridalFullSetEngine, { BridalType, BridalLookResult } from '../lib/bridal/BridalFullSetEngine';

// IONTYX AR ENGINES
import HairWebGLEngine, { HairParameters } from '../lib/ar/HairWebGLEngine';
import OutfitPoseEngine, { OutfitParameters } from '../lib/ar/OutfitPoseEngine';

// IONTYX LUXURY UI COMPONENTS
import { ARCarousel } from '../components/ui/luxury/ARCarousel';
import { GlowScoreDisplay } from '../components/ui/luxury/GlowScoreDisplay';
import { AISuggestionBubble } from '../components/ui/luxury/AISuggestionBubble';
import { AIFixButton } from '../components/ui/luxury/AIFixButton';

// IONTYX STUDIO COMPONENTS
import { ARBeardMirror } from '../components/ARBeardMirror';

// MITHASGLOW AR TYPES
import { BeardStyle } from '../types/engine.types';

// SAFE REGION EXTRACTION FUNCTIONS
const FACIAL_REGIONS = {
  forehead: {
    name: 'forehead',
    landmarks: [10, 338, 297, 151, 67, 109, 10],
    minPixelCount: 50,
    fallbackRegion: 'leftCheek'
  },
  leftCheek: {
    name: 'leftCheek',
    landmarks: [234, 93, 132, 58, 172, 136, 150, 149, 148, 152],
    minPixelCount: 30,
    fallbackRegion: 'rightCheek'
  },
  rightCheek: {
    name: 'rightCheek',
    landmarks: [454, 323, 361, 288, 397, 365, 379, 378, 400, 377],
    minPixelCount: 30,
    fallbackRegion: 'leftCheek'
  }
};

const validateLandmarks = (landmarks: any[], regionName: string) => {
  const region = FACIAL_REGIONS[regionName as keyof typeof FACIAL_REGIONS];
  if (!region) return { isValid: false, missingIndices: [], invalidPoints: [] };

  const missingIndices: number[] = [];
  const invalidPoints: number[] = [];

  region.landmarks.forEach((index) => {
    const landmark = landmarks[index];
    
    if (!landmark) {
      missingIndices.push(index);
      return;
    }

    if (
      typeof landmark.x !== 'number' ||
      typeof landmark.y !== 'number' ||
      isNaN(landmark.x) ||
      isNaN(landmark.y) ||
      landmark.x < 0 ||
      landmark.y < 0 ||
      landmark.x > 1 ||
      landmark.y > 1
    ) {
      invalidPoints.push(index);
    }
  });

  return {
    isValid: missingIndices.length === 0 && invalidPoints.length === 0,
    missingIndices,
    invalidPoints
  };
};

const extractPixelsFromLandmarks = (
  imageData: ImageData,
  landmarks: any[],
  landmarkIndices: number[],
  padding: number = 4
): { pixels: any[]; area: number } => {
  const { width, height, data } = imageData;
  const pixels: any[] = [];

  const polygonPoints = landmarkIndices.map(index => {
    const landmark = landmarks[index];
    if (!landmark) return null;
    return {
      x: Math.floor(landmark.x * width),
      y: Math.floor(landmark.y * height)
    };
  }).filter(point => point !== null) as { x: number; y: number }[];

  if (polygonPoints.length < 3) {
    return { pixels: [], area: 0 };
  }

  const minX = Math.max(0, Math.min(...polygonPoints.map(p => p.x)) - padding);
  const maxX = Math.min(width - 1, Math.max(...polygonPoints.map(p => p.x)) + padding);
  const minY = Math.max(0, Math.min(...polygonPoints.map(p => p.y)) - padding);
  const maxY = Math.min(height - 1, Math.max(...polygonPoints.map(p => p.y)) + padding);

  const isPointInPolygon = (x: number, y: number, points: { x: number; y: number }[]): boolean => {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x, yi = points[i].y;
      const xj = points[j].x, yj = points[j].y;
      
      const intersect = ((yi > y) !== (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (isPointInPolygon(x, y, polygonPoints)) {
        const index = (y * width + x) * 4;
        pixels.push({
          x,
          y,
          r: data[index],
          g: data[index + 1],
          b: data[index + 2],
          a: data[index + 3]
        });
      }
    }
  }

  const area = (maxX - minX) * (maxY - minY);
  return { pixels, area };
};

const safeRegionExtraction = (
  imageData: ImageData,
  landmarks: any[],
  targetRegion: string = 'forehead',
  logger?: any
): { success: boolean; warning?: string; region: string; pixelCount: number; fallbackUsed?: boolean } => {
  let currentRegion = targetRegion;
  let fallbackUsed = false;
  let warning: string | undefined;

  logger?.debug(`Starting region extraction for ${targetRegion}`, {
    region: targetRegion,
    landmarkCount: landmarks.length
  });

  // Try primary region first
  let result = extractRegion(currentRegion, landmarks, imageData, logger);
  
  // If primary region fails, try fallback regions
  if (!result.success) {
    const fallbackChain = getFallbackChain(currentRegion);
    
    for (const fallbackRegion of fallbackChain) {
      logger?.warn(`Primary region ${currentRegion} failed, trying fallback: ${fallbackRegion}`, {
        primaryRegion: currentRegion,
        fallbackRegion,
        originalError: (result as any).warning || 'Unknown error'
      });

      result = extractRegion(fallbackRegion, landmarks, imageData, logger);
      
      if (result.success) {
        currentRegion = fallbackRegion;
        fallbackUsed = true;
        warning = `Forehead not clearly visible, using ${fallbackRegion} region`;
        break;
      }
    }
  }

  if (!result.success) {
    const errorMsg = `All region extraction attempts failed for ${targetRegion}`;
    logger?.error(errorMsg, {
      region: targetRegion,
      landmarkCount: landmarks.length,
      fallbackUsed
    });
    
    return {
      success: false,
      region: targetRegion,
      pixelCount: 0,
      fallbackUsed
    };
  }

  logger?.success(`Region extraction successful`, {
    region: currentRegion,
    pixelCount: result.pixelCount,
    fallbackUsed,
    originalRegion: targetRegion
  });

  return {
    success: true,
    warning,
    region: currentRegion,
    pixelCount: result.pixelCount,
    fallbackUsed
  };
};

const extractRegion = (
  regionName: string,
  landmarks: any[],
  imageData: ImageData,
  logger?: any
): { success: boolean; pixelCount: number } => {
  const region = FACIAL_REGIONS[regionName as keyof typeof FACIAL_REGIONS];
  
  if (!region) {
    logger?.error(`Unknown region: ${regionName}`);
    return { success: false, pixelCount: 0 };
  }

  const validation = validateLandmarks(landmarks, regionName);
  
  if (!validation.isValid) {
    let errorType = '';
    if (validation.missingIndices.length > 0) {
      errorType = 'MISSING_LANDMARKS';
      logger?.error(`${regionName}: Missing landmarks ${validation.missingIndices.join(', ')}`, {
        region: regionName,
        missingIndices: validation.missingIndices,
        errorType
      });
    } else {
      errorType = 'INVALID_LANDMARKS';
      logger?.error(`${regionName}: Invalid landmark coordinates ${validation.invalidPoints.join(', ')}`, {
        region: regionName,
        invalidPoints: validation.invalidPoints,
        errorType
      });
    }
    
    return { success: false, pixelCount: 0 };
  }

  const { pixels, area } = extractPixelsFromLandmarks(imageData, landmarks, region.landmarks);
  
  if (pixels.length === 0) {
    logger?.error(`${regionName}: Empty region - no pixels extracted`, {
      region: regionName,
      area,
      landmarkCount: region.landmarks.length,
      errorType: 'EMPTY_REGION'
    });
    
    return { success: false, pixelCount: 0 };
  }

  if (pixels.length < region.minPixelCount) {
    logger?.warn(`${regionName}: Insufficient pixels (${pixels.length} < ${region.minPixelCount})`, {
      region: regionName,
      pixelCount: pixels.length,
      minRequired: region.minPixelCount,
      area,
      errorType: 'INSUFFICIENT_PIXELS'
    });
    
    return { success: false, pixelCount: pixels.length };
  }

  return { success: true, pixelCount: pixels.length };
};

const getFallbackChain = (regionName: string): string[] => {
  const region = FACIAL_REGIONS[regionName as keyof typeof FACIAL_REGIONS];
  if (!region || !region.fallbackRegion) return [];
  
  const chain: string[] = [];
  let current = region.fallbackRegion;
  let visited = new Set<string>();
  
  while (current && !visited.has(current)) {
    visited.add(current);
    chain.push(current);
    
    const nextRegion = FACIAL_REGIONS[current as keyof typeof FACIAL_REGIONS];
    current = nextRegion?.fallbackRegion || '';
  }
  
  return chain;
};

// GEOMETRY EXTRACTION FUNCTIONS (NO MOCKING)
const extractFaceGeometry = (landmarks: any[]): FaceGeometry | null => {
  // ELITE FULL-STACK ARCHITECT: PURE MATH ONLY - no FaceShapeAnalyzer here
  if (!landmarks || landmarks.length === 0) {
    console.warn('FACE_GEOMETRY_ERROR: No landmarks available, returning null');
    return null;
  }

  try {
    // Real measurements from face landmarks
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];
    const chin = landmarks[175];
    const forehead = landmarks[10];
    const nose = landmarks[1];

    // Calculate basic geometry
    const jawWidth = Math.abs(leftCheek.x - rightCheek.x);
    const cheekboneRatio = Math.abs(landmarks[50].x - landmarks[280].x) / Math.abs(leftCheek.x - rightCheek.x);
    const faceLength = Math.abs(chin.y - forehead.y);
    const symmetryScore = Math.abs(landmarks[172].x - landmarks[397].x) / Math.abs(leftCheek.x - rightCheek.x);

    // PURE MATH ONLY - face shape will be added by singleton analyzer in sequential pipeline
    return {
      jawWidth,
      cheekboneRatio,
      faceLength,
      symmetryScore,
      faceShape: 'Unknown', // Will be updated by FaceShapeAnalyzer in sequential pipeline
      faceShapeConfidence: 0 // Will be updated by FaceShapeAnalyzer in sequential pipeline
    };
  } catch (error) {
    console.error('FACE_GEOMETRY_ERROR: Failed to extract face geometry', error);
    return null;
  }
};

const extractBodyGeometry = (landmarks: any[]): BodyGeometry | null => {
  // REAL BODY GEOMETRY EXTRACTION - NO MOCKING
  if (!landmarks || landmarks.length < 20) {
    console.warn('BODY_GEOMETRY_ERROR: Insufficient landmarks for body geometry, returning null');
    return null;
  }

  // Real body measurements from pose landmarks
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const neck = landmarks[0]; // Nose tip approximation

  return {
    shoulderWidth: Math.abs(leftShoulder.x - rightShoulder.x),
    torsoRatio: Math.abs((leftHip.y + rightHip.y) / 2 - neck.y) / Math.abs(leftShoulder.x - rightShoulder.x)
  };
};

// ═════════════════════════════════════════════════════════════════════════════
// ADAPTER LAYER - Transform categories to recommendations format
// ═════════════════════════════════════════════════════════════════════════════

interface Recommendation {
  styleId: string;
  displayName: string;
  category: string;
  parameters: any;
}

/**
 * Adapter function: Transform AIOccasionStylist categories → UI recommendations
 * 
 * INPUT: { categories: { outfits: Asset[], hair: Asset[], beard: Asset[], accessories: Asset[] } }
 * OUTPUT: { recommendations: Recommendation[] }
 */
const transformCategoriesToRecommendations = (stylistOutput: any): Recommendation[] => {
  try {
    // Validate input structure
    if (!stylistOutput || !stylistOutput.categories) {
      console.warn("⚠️ ADAPTER: Invalid stylist output structure");
      return [];
    }

    const { categories } = stylistOutput;
    const recommendations: Recommendation[] = [];

    // Transform each category into recommendation format
    Object.entries(categories).forEach(([category, items]: [string, any]) => {
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          // Asset → Recommendation transformation
          recommendations.push({
            styleId: item.id || item.name || `${category}-${Date.now()}-${Math.random()}`,
            displayName: item.name || category,
            category: category,
            parameters: item.parameters || {}
          });
        });
      }
    });

    // Ensure we have at least one recommendation
    if (recommendations.length === 0) {
      console.warn("⚠️ ADAPTER: No valid items found in categories");
      return [];
    }

    console.log(`✅ ADAPTER: Transformed ${Object.keys(categories).length} categories → ${recommendations.length} recommendations`);
    return recommendations;

  } catch (error) {
    console.error("❌ ADAPTER ERROR: Failed to transform categories to recommendations", error);
    return [];
  }
};

/**
 * Adapter function: Transform ARAsset[] → BeardStyle[]
 * 
 * INPUT: ARAsset[] (from iontyxState.currentARAssets)
 * OUTPUT: BeardStyle[] (for new ARBeardMirror component)
 */
const transformARAssetsToBeardStyles = (assets: ARAsset[]): BeardStyle[] => {
  if (!Array.isArray(assets) || assets.length === 0) {
    return [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DEBUG: Log raw ARAsset before transformation
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('[MirrorScreen] 🔍 ARAsset Transformation Debug:');
  console.log('[MirrorScreen] - Input assets count:', assets.length);
  assets.forEach((asset, idx) => {
    console.log(`[MirrorScreen] - Asset ${idx}:`, JSON.stringify(asset, null, 2));
  });

  // Use the normalizer to convert backend assets to BeardStyle format
  const beardStyles = normalizeBeardAssets(assets);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DEBUG: Log normalized BeardStyle after transformation
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('[MirrorScreen] 🔍 Normalized BeardStyle Debug:');
  console.log('[MirrorScreen] - Output beardStyles count:', beardStyles.length);
  beardStyles.forEach((style, idx) => {
    console.log(`[MirrorScreen] - BeardStyle ${idx}:`, JSON.stringify({
      id: style.id,
      name: style.name,
      model_3d_url: style.model_3d_url,
      texture_urls: style.texture_urls,
    }, null, 2));
  });
  
  console.log(`✅ BEARD ADAPTER: Transformed ${assets.length} AR assets → ${beardStyles.length} beard styles`);
  return beardStyles;
};

// ═════════════════════════════════════════════════════════════════════════════
// IONTYX GLOW MIRROR - COMPLETE TYPE DEFINITIONS
// ═════════════════════════════════════════════════════════════════════════════

export type Mode = "Office/College" | "Party Glam" | "Bridal Full Set" | "Professional Work" | "Reception" | "Casual" | "Wedding";
export type Phase = "home" | "category" | "ar_studio" | "result";
export type CameraMode = "user" | "environment";


interface Category {
  id: string;
  name: string;
  icon: string;
  requiredCamera: CameraMode;
}

interface ARAsset {
  id: string;
  name: string;
  type: "outfit" | "hair" | "beard" | "accessory";
  thumbnail?: string;
  model_path?: string;
  model_3d_url?: string;
  url?: string;
  texture_url?: string;
  alpha_mask_url?: string;
  density_map_url?: string;
  strand_map_url?: string;
  normal_map_url?: string;
  occlusion_url?: string;
  parameters?: any;
  isPerfectMatch?: boolean;
  culturalType?: string;
}

export type MirrorViewType = "home" | "categories" | "mirror" | "bridal_selection";

interface MirrorScreenProps {
  onNavigateHome?: () => void;
}

// ═════════════════════════════════════════════════════════════════════════════
// IONTYX STATE INTERFACES
// ═════════════════════════════════════════════════════════════════════════════

interface IONTYXState {
  // AI Engines State
  aiStylist: AIOccasionStylist | null;
  glowScoreEngine: GlowScoreEngine | null;
  suggestionEngine: AISuggestionEngine | null;
  bridalEngine: BridalFullSetEngine | null;

  // AR Engines State
  hairEngine: HairWebGLEngine | null;
  outfitEngine: OutfitPoseEngine | null;

  // AI Results State
  currentGlowScore: GlowScoreResult | null;
  previousGlowScore: GlowScoreResult | null;
  currentSuggestions: AISuggestion[];
  currentARAssets: ARAsset[];
  selectedAsset: ARAsset | null;

  // Geometry State
  faceGeometry: FaceGeometry | null;
  bodyGeometry: BodyGeometry | null;
  faceLandmarks: any[] | null;

  // Bridal State
  bridalContext: BridalContext | null;
  bridalLook: BridalLookResult | null;

  // Processing State
  isAIProcessing: boolean;
  isARActive: boolean;
  lastFixTime: number;
}

// ═════════════════════════════════════════════════════════════════════════════
// HOME SELECTION VIEW (ORIGINAL UI)
// ═════════════════════════════════════════════════════════════════════════════
function HomeSelectionView({ onModeSelect, onShowCommunity }: { onModeSelect: (m: Mode) => void; onShowCommunity: () => void }) {
  const modes: { name: Mode; emoji: string; desc: string }[] = [
    { name: "Office/College", emoji: "📚", desc: "Natural everyday" },
    { name: "Party Glam", emoji: "🎉", desc: "Bold evening" },
    { name: "Bridal Full Set", emoji: "👰", desc: "Complete bridal" },
    { name: "Professional Work", emoji: "💼", desc: "Business formal" },
    { name: "Reception", emoji: "🎂", desc: "Elegant reception" },
    { name: "Casual", emoji: "😊", desc: "Relaxed casual" },
  ];

  return (
    <div className="flex flex-col w-full p-3 flex-grow pb-20">
      <div className="mb-3">
        <h1 className="text-lg font-semibold tracking-tight text-gray-800">✨ Glow Mirror</h1>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">Select style mode</p>
      </div>
      <div className="flex gap-2 mb-3">
        <button onClick={() => onModeSelect("Party Glam")} className="flex-1 bg-purple-600 p-2.5 rounded-xl flex items-center gap-2 active:scale-[0.98] transition-transform">
          <span className="text-base">🔥</span>
          <div className="text-left">
            <p className="text-[11px] font-semibold text-white leading-tight">Daily Glow</p>
            <p className="text-[9px] text-purple-200">AI Reel · Trending</p>
          </div>
        </button>
        <button onClick={onShowCommunity} className="flex-1 bg-amber-500 p-2.5 rounded-xl flex items-center gap-2 active:scale-[0.98] transition-transform">
          <span className="text-base">📍</span>
          <div className="text-left">
            <p className="text-[11px] font-semibold text-white leading-tight">Local Trends</p>
            <p className="text-[9px] text-amber-100">Best Reels near you</p>
          </div>
        </button>
      </div>
      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mb-2">Mode</p>
      <div className="grid grid-cols-2 gap-2">
        {modes.map((m) => (
          <button key={m.name} onClick={() => onModeSelect(m.name)} className="flex flex-col items-center justify-center p-3 bg-white/70 rounded-xl border border-[0.5px] border-gray-200 hover:bg-white transition-all active:scale-95">
            <span className="text-xl mb-1">{m.emoji}</span>
            <span className="text-[11px] font-medium text-gray-800 text-center leading-tight">{m.name}</span>
            <span className="text-[9px] text-gray-400 text-center mt-0.5">{m.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CATEGORY SELECTION VIEW
// ═════════════════════════════════════════════════════════════════════════════
function CategorySelectionView({
  userGender,
  onCategorySelect,
  onBack
}: {
  userGender: "male" | "female" | "other";
  onCategorySelect: (category: string) => void;
  onBack: () => void;
}) {
  const getCategories = () => {
    switch (userGender) {
      case "male":
        return [
          { id: "outfits", name: "Outfits", icon: "👕", desc: "Style your wardrobe" },
          { id: "beard", name: "Beard", icon: "🧔", desc: "Perfect your look" },
          { id: "hairstyles", name: "Hairstyles", icon: "💇‍♂️", desc: "Fresh cuts & styles" },
          { id: "accessories", name: "Accessories", icon: "🕶️", desc: "Complete your outfit" }
        ];
      case "female":
        return [
          { id: "makeup", name: "Makeup", icon: "💄", desc: "Beauty & glam" },
          { id: "outfits", name: "Outfits", icon: "👗", desc: "Fashion & style" },
          { id: "hairstyles", name: "Hairstyles", icon: "💇‍♀️", desc: "Trendy looks" },
          { id: "jewelry", name: "Jewelry", icon: "💎", desc: "Elegant details" }
        ];
      case "other":
        return [
          { id: "fluid", name: "Fluid Fashion", icon: "🌈", desc: "Express yourself" },
          { id: "creative", name: "Creative Makeup", icon: "🎨", desc: "Artistic expression" },
          { id: "hairstyles", name: "Hairstyles", icon: "💇‍♂️", desc: "Versatile styles" },
          { id: "statement", name: "Statement", icon: "💥", desc: "Bold pieces" }
        ];
      default:
        return [];
    }
  };

  const categories = getCategories();

  return (
    <div className="flex flex-col w-full p-3 flex-grow pb-20 bg-gradient-to-br from-purple-50 via-lavender-50 to-purple-100">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="p-2 bg-white/70 rounded-full shadow-sm border border-purple-200 hover:bg-white transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-purple-700" />
        </button>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-purple-900">Choose Category</h1>
          <p className="text-[9px] text-purple-600 uppercase tracking-widest mt-0.5">
            {userGender.toUpperCase()} · Select your style focus
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 flex-1">
        {categories.map((category) => (
          <motion.button
            key={category.id}
            onClick={() => onCategorySelect(category.name)}
            className="flex flex-col items-center justify-center p-3 bg-gradient-to-br from-purple-100/80 to-lavender-100/80 rounded-xl border-2 border-purple-300 hover:border-purple-400 hover:from-purple-200/90 hover:to-lavender-200/90 transition-all active:scale-95 shadow-lg hover:shadow-xl relative overflow-hidden"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            style={{
              boxShadow: '0 0 0 0 rgba(212, 175, 55, 0.7)',
              animation: 'goldPulse 2s infinite'
            }}
          >
            {/* Gold border pulse effect */}
            <div className="absolute inset-0 rounded-xl border-2 border-yellow-400 opacity-0"
              style={{
                animation: 'goldBorderPulse 2s infinite',
                boxShadow: '0 0 15px rgba(212, 175, 55, 0.5)'
              }} />

            <span className="text-2xl mb-1 filter drop-shadow-sm">{category.icon}</span>
            <span className="text-[10px] font-bold text-purple-900 text-center leading-tight">
              {category.name}
            </span>
            <span className="text-[8px] text-purple-700 text-center mt-0.5">
              {category.desc}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Custom styles for animations - React compatible */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes goldPulse {
              0% {
                box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.7);
              }
              70% {
                box-shadow: 0 0 0 10px rgba(212, 175, 55, 0);
              }
              100% {
                box-shadow: 0 0 0 0 rgba(212, 175, 55, 0);
              }
            }

            @keyframes goldBorderPulse {
              0% {
                opacity: 0;
                transform: scale(0.95);
              }
              50% {
                opacity: 1;
                transform: scale(1);
              }
              100% {
                opacity: 0;
                transform: scale(1.05);
              }
            }

            @keyframes greenPulse {
              0% {
                box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
              }
              70% {
                box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
              }
              100% {
                box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
              }
            }
          `
        }}
      />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MIRROR SCREEN
// ═════════════════════════════════════════════════════════════════════════════
const MirrorScreen = ({ onNavigateHome }: MirrorScreenProps) => {
  // ═════════════════════════════════════════════════════════════════════════════
  // IONTYX STATE MANAGEMENT
  // ═════════════════════════════════════════════════════════════════════════════

  // Navigation State
  const [currentView, setCurrentView] = useState<MirrorViewType>("home");
  const [currentMode, setCurrentMode] = useState<Mode>("Office/College");
  const [userGender, setUserGender] = useState<"male" | "female" | "other">("male");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // Camera State
  const [cameraOn, setCameraOn] = useState(false);
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [currentFacingMode, setCurrentFacingMode] = useState<CameraMode>("user");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [activeLandmarks, setActiveLandmarks] = useState<any[] | null>(null);
  const [selectedBridalType, setSelectedBridalType] = useState<BridalType | null>(null);
  const [activeTab, setActiveTab] = useState<"tryon" | "analysis">("tryon");
  const [showReelsMode, setShowReelsMode] = useState(false);
  const [ringLightOn, setRingLightOn] = useState(false);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showGlowScore, setShowGlowScore] = useState(true);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Custom Logger with Debug Panel Integration
const createLogger = () => {
  const logs: any[] = [];
  const maxLogs = 50;

  const addLog = (message: string, level: 'error' | 'warn' | 'info' | 'success' | 'debug' = 'info', context?: any) => {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, level, context };
    
    logs.push(logEntry);
    if (logs.length > maxLogs) logs.shift();

    // Console output with styling
    const consoleMessage = `[${timestamp}] ${message}`;
    switch (level) {
      case 'error':
        console.error(`🔴 ${consoleMessage}`, context);
        break;
      case 'warn':
        console.warn(`🟡 ${consoleMessage}`, context);
        break;
      case 'success':
        console.log(`🟢 ${consoleMessage}`, context);
        break;
      case 'debug':
        console.log(`🔵 ${consoleMessage}`, context);
        break;
      default:
        console.log(`⚪ ${consoleMessage}`, context);
    }

    // Update global debug state
    if (typeof window !== 'undefined' && window.DEBUG_AI) {
      const debugState = window.DEBUG_AI;
      if (!debugState.regionDebug) {
        debugState.regionDebug = {
          landmarksCount: 0,
          foreheadPointsPresent: false,
          regionPixelCount: 0,
          currentFallbackStatus: 'INITIALIZING',
          lastError: '',
          isProcessing: false,
          lastUpdate: new Date().toISOString()
        };
      }

      debugState.regionDebug.lastUpdate = timestamp;
      debugState.regionDebug.isProcessing = level === 'debug' || level === 'info';
      
      if (level === 'error') {
        debugState.regionDebug.lastError = message;
        debugState.regionDebug.currentFallbackStatus = 'ERROR';
      } else if (level === 'warn' && message.includes('fallback')) {
        debugState.regionDebug.currentFallbackStatus = 'FALLBACK_USED';
      } else if (level === 'success') {
        debugState.regionDebug.currentFallbackStatus = 'SUCCESS';
      }

      // Update specific debug info from context
      if (context) {
        if (context.landmarkCount !== undefined) {
          debugState.regionDebug.landmarksCount = context.landmarkCount;
        }
        if (context.region === 'forehead') {
          debugState.regionDebug.foreheadPointsPresent = context.pixelCount > 0;
        }
        if (context.pixelCount !== undefined) {
          debugState.regionDebug.regionPixelCount = context.pixelCount;
        }
      }
    }
  };

  return {
    error: (msg: string, ctx?: any) => addLog(msg, 'error', ctx),
    warn: (msg: string, ctx?: any) => addLog(msg, 'warn', ctx),
    success: (msg: string, ctx?: any) => addLog(msg, 'success', ctx),
    debug: (msg: string, ctx?: any) => addLog(msg, 'debug', ctx),
    info: (msg: string, ctx?: any) => addLog(msg, 'info', ctx),
    getLogs: () => [...logs],
    clearLogs: () => logs.length = 0
  };
};

const logger = createLogger();

// Simple console logging function (replaces removed debug logging)
  const addLog = useCallback((message: string) => {
    console.log(`[IONTYX] ${message}`);
  }, []);

  // IONTYX AI State
  const [iontyxState, setIontyxState] = useState<IONTYXState>({
    aiStylist: null,
    glowScoreEngine: null,
    suggestionEngine: null,
    bridalEngine: null,
    hairEngine: null,
    outfitEngine: null,

    currentGlowScore: null,
    previousGlowScore: null,
    currentSuggestions: [],
    currentARAssets: [],
    selectedAsset: null,

    faceGeometry: null,
    bodyGeometry: null,
    faceLandmarks: null,

    bridalContext: null,
    bridalLook: null,

    isAIProcessing: false,
    isARActive: false,
    lastFixTime: 0,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceMeshCanvasRef = useRef<HTMLCanvasElement | null>(null); // NEW: Dedicated MediaPipe canvas
  const webglCanvasRef = useRef<HTMLCanvasElement | null>(null); // NEW: Dedicated WebGL canvas
  const faceMeshRef = useRef<any>(null);
  const poseRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isActiveRef = useRef<boolean>(false);
  const faceDetectedRef = useRef<boolean>(false);
  const landmarksRef = useRef<any>(null);
  const poseLandmarksRef = useRef<any>(null);
  const activeAssetRef = useRef<ARAsset | null>(null);

  const isInitializingRef = useRef<boolean>(false);
  const initializationLockRef = useRef<boolean>(false);
  const lastFrameTimeRef = useRef<number>(0);
  const aiFixDebounceRef = useRef<number>(0);
  const videoReadyPromiseRef = useRef<Promise<void> | null>(null);
  
  // NEW: WebGL context safety guards
  const webglInitializedRef = useRef<boolean>(false);
  const arDisabledRef = useRef<boolean>(false);
  const retryCountRef = useRef<number>(0);

  // Fetch AR assets from Supabase
  const fetchARAssets = useCallback(async (category?: string) => {
    try {
      console.log('🔄 Fetching AR assets from Supabase...', category);
      
      let data: any[] | null = null;
      let error: any = null;

      // Dynamic table routing based on category
      if (category === 'beard') {
        // Fetch beard styles from backend API (returns full URLs)
        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const response = await fetch(`${apiUrl}/api/ai/beard/styles`);
          
          if (!response.ok) {
            throw new Error(`Backend API returned ${response.status}`);
          }
          
          const result = await response.json();
          data = result.styles || [];
          error = null;
          
          console.log(`✅ Fetched ${data.length} beard styles from backend API`);
        } catch (backendError) {
          console.error('❌ Backend API fetch failed, falling back to Supabase:', backendError);
          
          // Fallback to Supabase direct query
          const result = await supabase
            .from('active_beard_styles')
            .select('*');
          
          data = result.data;
          error = result.error;
        }
      } else {
        // Query other categories from products table
        let query = supabase
          .from('products')
          .select('*')
          .eq('has_ar_model', true)
          .eq('is_active', true);

        if (category) {
          query = query.eq('category', category);
        }

        const result = await query;
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('❌ Error fetching AR assets:', error);
        return;
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No AR assets found in database');
        return;
      }

      // Transform data to ARAsset format based on source
      const transformedAssets: ARAsset[] = data.map((item: any) => {
        if (category === 'beard') {
          // Map from beard_styles table structure
          return {
            id: item.id,
            name: item.name || item.style_name || 'Unnamed Beard',
            type: 'beard',
            thumbnail: item.thumbnail_url || item.image_url || item.thumbnail,
            model_path: item.model_path || (item.name === 'Original Goatee' ? 'beard_3d_model_free.glb' : ''),
            model_3d_url: item.model_3d_url || item.model_url || item.ar_model_url,
            url: item.model_3d_url || item.model_url || item.ar_model_url,
            texture_url: item.texture_url || item.albedo_url || '',
            alpha_mask_url: item.alpha_mask_url || item.alpha_url || '',
            density_map_url: item.density_map_url || item.density_url || '',
            strand_map_url: item.strand_map_url || item.strand_url || '',
            normal_map_url: item.normal_map_url || item.normal_url || '',
            occlusion_url: item.occlusion_url || '',
            parameters: {
              description: item.description,
              tags: item.tags,
              style_type: item.style_type,
            },
            isPerfectMatch: false,
            culturalType: item.category || item.style_category,
          };
        } else {
          // Map from products table structure
          return {
            id: item.id,
            name: item.name,
            type: item.category === 'hair' ? 'hair' : 
                  item.category === 'accessory' ? 'accessory' : 'outfit',
            thumbnail: item.images?.[0] || item.image_url,
            model_3d_url: item.ar_model_url,
            url: item.ar_model_url,
            parameters: {
              price: item.price,
              description: item.description,
              tags: item.tags,
            },
            isPerfectMatch: false,
            culturalType: item.subcategory,
          };
        }
      });

      console.log(`✅ Fetched ${transformedAssets.length} AR assets from Supabase (${category || 'all categories'})`);
      setIontyxState(prev => ({ ...prev, currentARAssets: transformedAssets }));
    } catch (error) {
      console.error('❌ Failed to fetch AR assets:', error);
    }
  }, []);

  // ELITE FULL-STACK ARCHITECT: Singleton FaceShapeAnalyzer instance
  const faceShapeAnalyzerRef = useRef(new FaceShapeAnalyzer());
  const isProcessingRef = useRef<boolean>(false);
  const analysisCompleteRef = useRef<boolean>(false);

  // ═════════════════════════════════════════════════════════════════════════════
  // IONTYX BRIDAL ENGINE (MALE ONLY)
  // ═══════════════════════════════════════════════════════════════════════════════════
  const bridalEngine = useRef<BridalFullSetEngine | null>(null);

  // Initialize bridal engine when bridal mode is selected
  useEffect(() => {
  }, [currentMode, userGender, selectedBridalType, iontyxState.faceGeometry, iontyxState.bodyGeometry]);

  // 🚨 BRIDAL ASSET BINDING: Bind bridal assets to AR engines
  const bindBridalAssetsToEngines = useCallback((assets: ARAsset[], culturalType: BridalType) => {
    if (currentMode !== "Bridal Full Set" || userGender !== "male") return;

    console.log('🚨 BINDING BRIDAL ASSETS TO AR ENGINES:', culturalType, assets);

    assets.forEach((asset, index) => {
      try {
        // AR BINDING: Ensure engines are successfully initialized and canvas is ready
        if (!canvasRef.current || !overlayCanvasRef.current) {
          console.warn('Canvas not ready for AR binding - skipping asset:', asset.name);
          return;
        }

        // Bind outfit asset to OutfitPoseEngine with real pose data
        if (asset.type === 'outfit' && iontyxState.bodyGeometry && poseLandmarksRef.current) {
          console.log('👔 Binding outfit:', asset.name);

          // AR BINDING: Check if engine is successfully initialized before binding
          if (!iontyxState.outfitEngine) {
            console.log('Creating new OutfitPoseEngine for outfit binding');
            const outfitEngine = new OutfitPoseEngine(canvasRef.current);

            // Verify engine initialization
            if ((outfitEngine as any).isReady?.()) {
              setIontyxState(prev => ({ ...prev, outfitEngine }));

              // Update body pose with real landmarks
              outfitEngine.updateBodyPose(poseLandmarksRef.current);
              
              const outfitParams: any = {
                outfitType: 'traditional',
                fit: 'regular',
                color: culturalType === 'hindu' ? 'red' : 'white',
                material: 'silk',
                pattern: culturalType === 'hindu' ? 'embroidered' : 'solid'
              };

              outfitEngine.setOutfitParameters(outfitParams);
              outfitEngine.createOutfitTexture(outfitParams);
            } else {
              console.error('OutfitPoseEngine initialization failed');
            }
          }
        }

        // Bind hair asset to HairWebGLEngine with real face geometry
        if (asset.type === 'hair' && iontyxState.faceGeometry && !iontyxState.hairEngine) {
          console.log('💇 Binding hair:', asset.name);

          // Initialize HairWebGLEngine with face geometry
          const hairEngine = new HairWebGLEngine(canvasRef.current);
          setIontyxState(prev => ({ ...prev, hairEngine }));

          // Apply hair style based on cultural type
          const hairParams: HairParameters = {
            style: culturalType === 'muslim' ? 'short' :
              culturalType === 'hindu' ? 'styled' :
                culturalType === 'christian' ? 'medium' : 'textured',
            color: { r: 0.1, g: 0.05, b: 0.0, a: 1.0 }, // Dark brown/black
            density: 0.8,
            length: culturalType === 'muslim' ? 0.3 : 0.5,
            volume: 0.7,
            shine: 0.5
          };

          // Hair parameters are set during initialization
          // hairEngine will use default styling
        }


        // Bind accessories (cultural-specific)
        if (asset.type === 'accessory') {
          console.log('💎 Binding accessory:', asset.name, 'Cultural:', culturalType);

          // 🚨 CULTURAL ROUTING: Implement cultural-specific accessory binding
          switch (culturalType) {
            case 'hindu':
              console.log('🕉️ Hindu Accessories: safa, mala, gold');
              // TODO: Implement Hindu accessories - safa (turban), mala (necklace), gold jewelry
              break;
            case 'muslim':
              console.log('🌙 Muslim Accessories: topi/sehra, clean');
              // TODO: Implement Muslim accessories - topi/sehra (headwear), clean accessories
              break;
            case 'christian':
              console.log('✝️ Christian Accessories: minimal, watch');
              // TODO: Implement Christian accessories - minimal accessories, luxury watch
              break;
            case 'modern':
              console.log('✨ Modern Accessories: luxury watch, designer');
              // TODO: Implement Modern accessories - luxury watch, designer accessories
              break;
          }
        }
      } catch (error) {
        console.error(`Failed to bind asset ${asset.name}:`, error);
      }
    });
  }, [currentMode, userGender, iontyxState.faceGeometry, iontyxState.outfitEngine, iontyxState.hairEngine]);

  // 🚨 PRODUCTION HARDENING - VIDEO READINESS POLLING
  const waitForVideoReady = useCallback(async (): Promise<void> => {
    if (!videoRef.current) {
      throw new Error('CRITICAL: Video ref is null during initialization');
    }

    const video = videoRef.current;
    const maxWaitTime = 10000; // 10 seconds max wait
    const startTime = Date.now();
    const pollInterval = 50; // 50ms polling

    return new Promise((resolve, reject) => {
      const checkReady = () => {
        const elapsed = Date.now() - startTime;

        // Timeout check
        if (elapsed > maxWaitTime) {
          reject(new Error(`VIDEO_READY_TIMEOUT: Video not ready after ${maxWaitTime}ms`));
          return;
        }

        // Check video ready state and dimensions
        if (video.readyState === 4 && video.videoWidth > 0 && video.videoHeight > 0) {
          console.log(`✅ Video ready: ${video.videoWidth}x${video.videoHeight}`);
          resolve();
          return;
        }

        // Continue polling
        setTimeout(checkReady, pollInterval);
      };

      checkReady();
    });
  }, []);

  // 🚨 BULLETPROOF MEMORY CLEANUP - ENHANCED WITH PERFORMANCE METRICS
  const performSingletonCleanup = useCallback(() => {
    const cleanupStartTime = performance.now();
    console.log('🧹 Performing bulletproof singleton cleanup...');

    // Update DEBUG_AI with cleanup start
    if (typeof window !== 'undefined' && window.DEBUG_AI) {
      (window.DEBUG_AI as any).cleanupStartTime = cleanupStartTime;
    }

    // Cancel ALL animation frames first
    if (animationFrameRef.current) {
      try {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
        console.log('✅ Animation frame cancelled');
      } catch (error) {
        console.error('❌ Animation frame cancel error:', error);
      }
    }

    // Stop camera first (prevents new frames from processing)
    if (cameraRef.current) {
      try {
        cameraRef.current.stop();
        cameraRef.current = null;
        console.log('✅ Camera stopped');
      } catch (error) {
        console.error('❌ Camera stop error:', error);
      }
    }

    // Close FaceMesh with enhanced error handling
    if (faceMeshRef.current) {
      try {
        // Ensure FaceMesh is fully closed
        faceMeshRef.current.close();
        faceMeshRef.current = null;
        console.log('✅ FaceMesh closed');
      } catch (error) {
        console.error('❌ FaceMesh close error:', error);
        // Force null assignment even if close fails
        faceMeshRef.current = null;
      }
    }

    // Close Pose with enhanced error handling
    if (poseRef.current) {
      try {
        // Ensure Pose is fully closed
        poseRef.current.close();
        poseRef.current = null;
        console.log('✅ Pose closed');
      } catch (error) {
        console.error('❌ Pose close error:', error);
        // Force null assignment even if close fails
        poseRef.current = null;
      }
    }

    // Stop ALL media tracks with enhanced error handling
    if (streamRef.current) {
      try {
        const tracks = streamRef.current.getTracks();
        tracks.forEach(track => {
          try {
            track.stop();
          } catch (trackError) {
            console.error('❌ Individual track stop error:', trackError);
          }
        });
        streamRef.current = null;
        console.log(`✅ ${tracks.length} media tracks stopped`);
      } catch (error) {
        console.error('❌ Media tracks stop error:', error);
        streamRef.current = null;
      }
    }

    // Reset ALL state refs
    isActiveRef.current = false;
    faceDetectedRef.current = false;
    landmarksRef.current = null;
    poseLandmarksRef.current = null;
    activeAssetRef.current = null;
    console.log('✅ All state refs reset');

    // Update DEBUG_AI with cleanup metrics
    const cleanupEndTime = performance.now();
    const cleanupDuration = cleanupEndTime - cleanupStartTime;
    
    if (typeof window !== 'undefined' && window.DEBUG_AI) {
      (window.DEBUG_AI as any).cleanupDuration = cleanupDuration;
      (window.DEBUG_AI as any).lastCleanupTime = cleanupEndTime;
    }

    console.log(`✅ Bulletproof cleanup completed in ${cleanupDuration.toFixed(2)}ms`);
  }, []);
  const drawFaceMesh = useCallback((lm: any[]) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use solid colors for better visibility on high-res mobile screens
    ctx.fillStyle = (currentMode === "Wedding" || currentMode === "Bridal Full Set")
      ? "#D4AF37" // Luxury Gold for Bridal
      : "#A855F7"; // Purple for normal tracking
    
    // Increase dot radius to 1.5 for better visibility
    const dotRadius = 1.5;
    
    lm.forEach((l) => {
      if (l?.x !== undefined && l?.y !== undefined) {
        ctx.beginPath();
        ctx.arc(l.x * canvas.width, l.y * canvas.height, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }, []);

  // 🚨 PURE NATIVE FRAME LOOP - ELITE FULL-STACK ARCHITECT: RUTHLESS DECOUPLING
  const processVideoFrame = useCallback(async () => {
    if (!isActiveRef.current || !videoRef.current || videoRef.current.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(processVideoFrame);
      return;
    }

    try {

      // ELITE FULL-STACK ARCHITECT: FACE-ONLY CATEGORY DETECTION
      const isFaceOnly = ['hair', 'makeup', 'hairstyles', 'jewelry'].some(c => selectedCategory.toLowerCase().includes(c));

      // 🚨 SEQUENTIAL AWAIT: MediaPipe-ஆல Promise.all தாங்க முடியாது. தனித்தனியா await பண்ணனும்.
      if (faceMeshRef.current) {
        await faceMeshRef.current.send({ image: videoRef.current });
      }

      // ELITE FULL-STACK ARCHITECT: RUTHLESS DECOUPLING OF POSE TRACKING
      // ONLY call pose.send() IF NOT face-only category
      if (!isFaceOnly && poseRef.current) {
        await poseRef.current.send({ image: videoRef.current });
      }
    } catch (error) {
      console.error("Frame processing error:", error);
    }

    animationFrameRef.current = requestAnimationFrame(processVideoFrame);
  }, [selectedCategory]);

  // ...

  const drawFaceMeshOverlay = useCallback(() => {
    const frameStartTime = performance.now();
    
    // Pre-flight checks
    if (!overlayCanvasRef.current) {
      console.warn('⚠️ [OVERLAY-PIPELINE] overlayCanvasRef not available - stopping loop');
      // 🔥 FIX: Stop the loop when canvas is not available
      animationFrameRef.current = null;
      return;
    }
    
    if (!videoRef.current) {
      console.warn('⚠️ [OVERLAY-PIPELINE] videoRef not available - stopping loop');
      // 🔥 FIX: Stop the loop when video is not available
      animationFrameRef.current = null;
      return;
    }
    
    if (!isActiveRef.current) {
      console.warn('⚠️ [OVERLAY-PIPELINE] FaceMesh not active - stopping loop');
      // 🔥 FIX: Stop the loop when FaceMesh is not active
      animationFrameRef.current = null;
      return;
    }
    
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;

    // 🔥 FIX: Check canvas exists before getting context
    if (!canvas) {
      console.error('❌ [OVERLAY-PIPELINE] Canvas not available - stopping loop');
      // 🔥 FIX: Stop the loop when canvas is not available
      animationFrameRef.current = null;
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error('❌ [OVERLAY-PIPELINE] Canvas context not available - stopping loop');
      // 🔥 FIX: Stop the loop when context is not available
      animationFrameRef.current = null;
      return;
    }

    if (video.readyState < 2) {
      console.log(`⏳ [OVERLAY-PIPELINE] Video not ready (readyState: ${video.readyState})`);
      animationFrameRef.current = requestAnimationFrame(drawFaceMeshOverlay);
      return;
    }

    if (video.videoWidth === 0) {
      console.log(`⏳ [OVERLAY-PIPELINE] Video dimensions not available yet`);
      animationFrameRef.current = requestAnimationFrame(drawFaceMeshOverlay);
      return;
    }

    // Ensure 1:1 pixel mapping between Video and Canvas
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      console.log(`📐 [OVERLAY-PIPELINE] Canvas resized to ${canvas.width}x${canvas.height} for 1:1 mapping`);
      
      // Also resize webglCanvas if exists
      if (webglCanvasRef.current) {
        webglCanvasRef.current.width = video.videoWidth;
        webglCanvasRef.current.height = video.videoHeight;
      }
    }

    // Disable image smoothing for sharper tracking dot rendering
    ctx.imageSmoothingEnabled = false;
    
    // 🚨 CRITICAL: CLEAR CANVAS BUT DO NOT DRAW VIDEO FEED!
    // The video is now visible as a background layer (zIndex 1)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Always draw tracking dots for face detection visibility on TOP of video
    // The mesh should always be visible if landmarks exist for tracking verification
    if (landmarksRef.current?.length) {
      const drawingStartTime = performance.now();
      console.log(`🎯 [OVERLAY-PIPELINE] Drawing ${landmarksRef.current.length} landmarks...`);
      
      drawFaceMesh(landmarksRef.current);
      
      const drawingEndTime = performance.now();
      console.log(`🎨 [OVERLAY-PIPELINE] Landmark drawing completed in ${(drawingEndTime - drawingStartTime).toFixed(2)}ms`);
    } else {
      console.log(`⚠️ [OVERLAY-PIPELINE] No landmarks available for drawing - landmarksRef.current:`, landmarksRef.current);
    }

    const frameEndTime = performance.now();
    const frameDuration = frameEndTime - frameStartTime;
    
    // Log frame performance every 60 frames (approximately every 1 second at 60fps)
    if (typeof window !== 'undefined' && window.DEBUG_AI) {
      if (!(window.DEBUG_AI as any).overlayFrameCount) (window.DEBUG_AI as any).overlayFrameCount = 0;
      (window.DEBUG_AI as any).overlayFrameCount++;
      
      if ((window.DEBUG_AI as any).overlayFrameCount % 60 === 0) {
        console.log(`📊 [OVERLAY-PIPELINE] Frame performance: ${frameDuration.toFixed(2)}ms (Frame #${(window.DEBUG_AI as any).overlayFrameCount})`);
      }
    }

    animationFrameRef.current = requestAnimationFrame(drawFaceMeshOverlay);
  }, [drawFaceMesh]);

  // ...
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, c = canvasRef.current;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    ctx.drawImage(v, 0, 0);
    
    setCapturedImage(c.toDataURL("image/jpeg"));
    if (cameraRef.current) cameraRef.current.stop();
    toast.success("Photo captured!");
  }, []);

  // 2. MISSING CLEANUP FUNCTION
  const cleanupFaceMesh = useCallback(() => {
    isActiveRef.current = false;
    faceDetectedRef.current = false;
    landmarksRef.current = null;
    poseLandmarksRef.current = null;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (faceMeshRef.current) {
      faceMeshRef.current.close();
      faceMeshRef.current = null;
    }
    if (poseRef.current) {
      poseRef.current.close();
      poseRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // ENHANCED: Initialize FaceMesh with comprehensive debug logging
  const initializeFaceMesh = useCallback(() => {

    console.log('🚀 [MIRROR-PIPELINE] Starting FaceMesh initialization...');

    if (!videoRef.current) {
      console.error('❌ [MIRROR-PIPELINE] Video element not available');
      return;
    }

    if (isActiveRef.current) {
      console.warn('⚠️ [MIRROR-PIPELINE] FaceMesh already active, skipping initialization');
      return;
    }

    const initStartTime = performance.now();
    isActiveRef.current = true;

    console.log('📊 [MIRROR-PIPELINE] Initialization metrics started at:', initStartTime);

    // Update DEBUG_AI with initialization start
    if (typeof window !== 'undefined' && window.DEBUG_AI) {
      (window.DEBUG_AI as any).faceMeshInitStartTime = initStartTime;
      (window.DEBUG_AI as any).pipelineStage = 'initialization';
    }

    try {
      const faceMesh = new FaceMesh({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        selfieMode: false,
      });

      faceMeshRef.current = faceMesh;

      faceMesh.onResults((results: any) => {
        try {
          // 🔥 FIX: CLEAR LANDMARKS WHEN NO FACES DETECTED
          if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            landmarksRef.current = null;
            setActiveLandmarks(null);
            setFaceDetected(false);

            // Update DEBUG_AI with no face detection
            if (typeof window !== 'undefined' && window.DEBUG_AI) {
              (window.DEBUG_AI as any).faceDetected = false;
              (window.DEBUG_AI as any).landmarksCount = 0;
              (window.DEBUG_AI as any).landmarksValid = false;
              (window.DEBUG_AI as any).pipelineStage = 'no_face';
            }
            return;
          }

          if (results.multiFaceLandmarks?.[0]) {
            const lm = results.multiFaceLandmarks[0];

            // Validate landmarks have proper coordinates
            const validLandmarks = lm.every((point: any) =>
              point &&
              typeof point.x === 'number' &&
              typeof point.y === 'number' &&
              point.x >= 0 && point.x <= 1 &&
              point.y >= 0 && point.y <= 1
            );

            if (lm.length === 478 && validLandmarks) {
              landmarksRef.current = lm;
              setActiveLandmarks(lm);

              // Update faceDetected state
              if (!faceDetectedRef.current) {
                faceDetectedRef.current = true;
                setFaceDetected(true);
                const detectionTime = performance.now();
                console.log(`✅ [MIRROR-PIPELINE] FIRST FACE DETECTED at ${detectionTime.toFixed(2)}ms`);

                // Update DEBUG_AI with face detection
                if (typeof window !== 'undefined' && window.DEBUG_AI) {
                  (window.DEBUG_AI as any).faceDetected = true;
                  (window.DEBUG_AI as any).faceDetectionTime = detectionTime;
                  (window.DEBUG_AI as any).landmarksCount = lm.length;
                  (window.DEBUG_AI as any).landmarksValid = true;
                  (window.DEBUG_AI as any).pipelineStage = 'tracking';
                }
              }
            } else {
              // Update DEBUG_AI with invalid landmarks
              if (typeof window !== 'undefined' && window.DEBUG_AI) {
                (window.DEBUG_AI as any).landmarksValid = false;
                (window.DEBUG_AI as any).lastInvalidLandmarks = {
                  count: lm.length,
                  valid: validLandmarks,
                  timestamp: performance.now()
                };
              }
            }
          }
        } catch (e: any) {
          console.error("🚨 [MIRROR-PIPELINE] FaceMesh result processing error:", e);

          // Update debug state with error
          if (typeof window !== 'undefined' && window.DEBUG_AI) {
            (window.DEBUG_AI as any).error = `FaceMesh result error: ${e.message}`;
            (window.DEBUG_AI as any).landmarksValid = false;
            (window.DEBUG_AI as any).lastError = {
              message: e.message,
              timestamp: performance.now(),
              pipeline: 'facemesh_processing'
            };
          }
        }
      });

      // Initialize Pose for body tracking (only if not face-only category)
      const isFaceOnly = ['beard', 'hair', 'makeup', 'hairstyles', 'jewelry'].some(c => selectedCategory.toLowerCase().includes(c));
      
      if (!isFaceOnly) {
        const pose = new MediaPipePose({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        poseRef.current = pose;

        pose.onResults((results: any) => {
          try {
            if (results.poseLandmarks) {
              poseLandmarksRef.current = results.poseLandmarks;

              // Update DEBUG_AI with pose detection
              if (typeof window !== 'undefined' && window.DEBUG_AI) {
                (window.DEBUG_AI as any).poseDetected = true;
                (window.DEBUG_AI as any).poseDetectionTime = performance.now();
              }
            }
          } catch (e: any) {
            console.error("🚨 Pose result error:", e);

            // Update debug state with error
            if (typeof window !== 'undefined' && window.DEBUG_AI) {
              (window.DEBUG_AI as any).error = `Pose result error: ${e.message}`;
            }
          }
        });
      }

      // Update DEBUG_AI with initialization metrics
      const initEndTime = performance.now();
      const initDuration = initEndTime - initStartTime;
      
      if (typeof window !== 'undefined' && window.DEBUG_AI) {
        (window.DEBUG_AI as any).faceMeshInitDuration = initDuration;
        (window.DEBUG_AI as any).faceMeshInitTime = initEndTime;
      }

      console.log(`✅ FaceMesh initialized in ${initDuration.toFixed(2)}ms`);

      // Start frame processing loop (ONLY ONE pipeline)
      if (!animationFrameRef.current) {
        processVideoFrame();
      }
      
      // 🔥 DISABLED: Overlay landmark rendering to prevent duplicate pipelines
      // The ARPipelineController in useAREngine is now the single source of truth
      // if (overlayCanvasRef.current && videoRef.current && !animationFrameRef.current) {
      //   drawFaceMeshOverlay();
      //   console.log("🎬 FaceMesh overlay loop started with canvas and video ready");
      // } else {
      //   console.log("⏳ FaceMesh initialized, but canvas or video not ready - will start overlay when available");
      // }
      
    } catch (error) {
      console.error('❌ FaceMesh initialization failed:', error);
      
      // Update DEBUG_AI with initialization error
      if (typeof window !== 'undefined' && window.DEBUG_AI) {
        (window.DEBUG_AI as any).error = `FaceMesh init failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
      
      // Perform cleanup on initialization failure
      performSingletonCleanup();
    }
  }, [selectedCategory, performSingletonCleanup]);

  const openCamera = useCallback(async (targetMode?: "user" | "environment") => {
    try {
      // 1. Stop only the previous stream if it exists
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const modeToUse = targetMode || currentFacingMode;
      setCurrentFacingMode(modeToUse);
      setCameraOn(true);

      // 2. Direct Camera Access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: modeToUse,
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false,
      });

      // 3. Attach to video ref
      const attachStream = () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play()
              .then(() => {
                initializeFaceMesh();
                toast.success(`${modeToUse === "user" ? "Front" : "Back"} Camera ON`);
              })
              .catch(console.error);
          };
          setCurrentStream(stream);
          streamRef.current = stream;
        } else {
          // Retry if React hasn't mounted the video tag yet
          requestAnimationFrame(attachStream);
        }
      };

      attachStream();

    } catch (err: any) {
      console.error("Camera access error:", err);
      toast.error("Camera access denied.");
      setCameraOn(false);
    }
  }, [currentFacingMode, initializeFaceMesh, performSingletonCleanup]);

  // Simple reset function
  const handleReset = useCallback(() => {
    setCapturedImage(null);
    setFaceDetected(false);
    landmarksRef.current = null;
    setActiveLandmarks(null);
  }, []);

  // Asset selection handler
  const handleAssetSelect = useCallback((asset: ARAsset) => {
    activeAssetRef.current = asset;
    console.log('Asset selected:', asset.name);
  }, []);

  // Navigation handler
  const navigate = useCallback((view: MirrorViewType) => {
    setCurrentView(view);
  }, []);

  // Start camera function
  const startCamera = useCallback(() => {
    // Camera is started in openCamera function
    console.log('Camera start called');
  }, []);

  // Show community handler
  const onShowCommunity = useCallback(() => {
    console.log('Community feature coming soon');
    toast.info('Community feature coming soon');
  }, []);


  useEffect(() => {
    // Only cleanup when the component is destroyed
    return () => {
      cleanupFaceMesh();
    };
  }, [cleanupFaceMesh]);

  // 🔥 DISABLED: Monitor canvas availability and restart overlay loop when ready
  // This would create a duplicate pipeline. ARPipelineController is now the single source of truth.
  // useEffect(() => {
  //   if (overlayCanvasRef.current && videoRef.current && isActiveRef.current && !animationFrameRef.current) {
  //     console.log('🔄 Canvas and video now available - restarting overlay loop');
  //     drawFaceMeshOverlay();
  //   }
  // }, [overlayCanvasRef, videoRef.current, isActiveRef.current]);

  // 🔥 FIX: Resize webglCanvas when video metadata loads
  useEffect(() => {
    const handleVideoMetadata = () => {
      if (videoRef.current && webglCanvasRef.current) {
        const video = videoRef.current;
        const webglCanvas = webglCanvasRef.current;
        webglCanvas.width = video.videoWidth;
        webglCanvas.height = video.videoHeight;
      }
    };

    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.addEventListener('loadedmetadata', handleVideoMetadata);
    }

    return () => {
      if (videoElement) {
        videoElement.removeEventListener('loadedmetadata', handleVideoMetadata);
      }
    };
  }, []);

  if (!onboardingComplete) {
    return (
      <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-gradient-to-b from-[#EBD8FF] to-[#FFD6E8] p-4 pb-24 space-y-4">
        <div className="text-center pt-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">✨ Glow Mirror</h1>
          <p className="text-gray-500">Personalize your AI makeup experience</p>
        </div>
        <Card className="rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle>Who are you?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { v: "female", label: "Woman", icon: "👩", grad: "from-pink-500 to-rose-500" },
              { v: "male", label: "Man", icon: "👨", grad: "from-blue-500 to-blue-600" },
              { v: "other", label: "Non-Binary", icon: "⚧", grad: "from-purple-500 to-purple-600" },
            ].map((g) => (
              <div
                key={g.v}
                onClick={() => setUserGender(g.v as any)}
                className={cn(
                  "relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300",
                  userGender === g.v
                    ? `border-transparent bg-gradient-to-r ${g.grad} text-white shadow-lg scale-105`
                    : "border-gray-200 bg-white hover:shadow-md"
                )}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{g.icon}</span>
                  <span className={cn("font-semibold text-lg", userGender === g.v ? "text-white" : "text-gray-800")}>
                    {g.label}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Button
          onClick={() => setOnboardingComplete(true)}
          disabled={!userGender}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-6 rounded-2xl font-bold text-lg shadow-lg hover:scale-105 transition-all duration-300 relative overflow-hidden group"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Start My Glow Journey ✨
        </Button>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // MAIN RENDER (HOME & MIRROR)
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen flex flex-col max-w-sm mx-auto bg-gradient-to-br from-[#6B46C1] via-[#9333EA] to-[#E6E6FA] relative overflow-hidden">

      {/* Background Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#9333EA]/30 via-[#E6E6FA]/40 to-transparent pointer-events-none animate-pulse"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-[#6B46C1]/20 via-[#4C1D95]/10 to-transparent pointer-events-none"></div>

      {onNavigateHome && (
        <button onClick={onNavigateHome} className="fixed top-2 left-2 z-50 p-1.5 bg-white/80 rounded-full shadow">
          <Home className="w-4 h-4 text-purple-600" />
        </button>
      )}

      {currentView === "home" && (
        <HomeSelectionView
          onModeSelect={(m) => {
            setCurrentMode(m);
            // 🚨 IONTYX STRICT ROUTING: If Bridal, go to Cultural Gate first!
            if (m === "Bridal Full Set" || m === "Wedding") {
              navigate("bridal_selection");
            } else {
              navigate("categories");
            }
          }}
          onShowCommunity={onShowCommunity}
        />
      )}

      {currentView === "categories" && (
        <CategorySelectionView
          userGender={userGender as "male" | "female" | "other"}
          onCategorySelect={(category) => {
            setSelectedCategory(category);
            const catLower = category.toLowerCase();

            // FORCE FRONT CAMERA for beard and all face-only categories
            const isBeardOrFaceOnly = catLower.includes("beard") || catLower.includes("hair") || catLower.includes("makeup") || catLower.includes("hairstyles") || catLower.includes("jewelry");
            const isBackCamera = !isBeardOrFaceOnly && (catLower.includes("outfit") || catLower.includes("fashion") || catLower.includes("dress"));
            const neededCamera = isBackCamera ? "environment" : "user";

            console.log(`📷 CAMERA SELECTION: ${category} -> ${neededCamera} (beard/face-only always uses front camera)`);

            // Fetch AR assets for the selected category
            if (catLower.includes("beard")) {
              fetchARAssets("beard");
            } else if (catLower.includes("hair")) {
              fetchARAssets("hair");
            } else if (catLower.includes("outfit")) {
              fetchARAssets("fashion");
            }

            navigate("mirror");

            // 🚨 OPTION A: Bypass legacy camera for beard category
            // ARBeardMirror will handle camera via its own CameraEngine
            if (!catLower.includes("beard")) {
              openCamera(neededCamera);
            } else {
              console.log('🚀 Beard category: Camera managed by ARBeardMirror (CameraEngine)');
              setCameraOn(true); // Set cameraOn so ARBeardMirror renders
            }
          }}
          onBack={() => navigate("home")}
        />
      )}

      {currentView === "bridal_selection" && (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-black/40 backdrop-blur-xl z-50 absolute inset-0">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm space-y-4">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black text-white tracking-tight">Bridal Heritage</h2>
              <p className="text-lavender-200 text-sm mt-2">Select your cultural style to load specific AR assets</p>
            </div>

            {[
              { id: "hindu", label: "Hindu Traditional", icon: "🕉️", color: "from-orange-500 to-red-600" },
              { id: "muslim", label: "Muslim Royal", icon: "🌙", color: "from-emerald-500 to-green-700" },
              { id: "christian", label: "Christian Elegant", icon: "✝️", color: "from-blue-200 to-slate-400" },
              { id: "modern", label: "Modern Fusion", icon: "✨", color: "from-purple-500 to-pink-600" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setSelectedBridalType(opt.id as BridalType);
                  setIontyxState(prev => ({ ...prev, bridalContext: { bridalType: opt.id as BridalType } }));
                  // BRIDAL FLOW: Direct to mirror, skip categories
                  navigate("mirror");
                  openCamera("environment"); // Full body view for bridal
                }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r ${opt.color} text-white shadow-xl hover:scale-105 active:scale-95 transition-all`}
              >
                <span className="text-3xl bg-white/20 p-2 rounded-xl">{opt.icon}</span>
                <span className="text-xl font-bold">{opt.label}</span>
              </button>
            ))}
            <button onClick={() => navigate("categories")} className="w-full mt-4 p-3 text-white/70 font-medium">← Back to Categories</button>
          </motion.div>
        </div>
      )}
      {currentView === "mirror" && (
        <div className="flex-1 p-3 pb-20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="bg-white/60 backdrop-blur-sm px-3 py-2 rounded-xl border-[0.5px] border-white/20 shadow-sm">
              <h1 className="text-base font-bold tracking-tight text-purple-900 flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Glow Mirror
              </h1>
              <p className="text-[9px] text-purple-600/70 uppercase tracking-widest font-medium">
                {userGender} · {currentMode} · {selectedCategory}
              </p>
            </div>
            {capturedImage && (
              <button onClick={handleReset} className="p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md border border-purple-200 hover:bg-white transition-all hover:scale-105">
                <RotateCcw className="w-4 h-4 text-purple-600" />
              </button>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "tryon" | "analysis")}>
            <TabsList className="grid w-full grid-cols-2 h-7">
              <TabsTrigger value="tryon" className="text-[10px]">Virtual Try-On</TabsTrigger>
              <TabsTrigger value="analysis" className="text-[10px]">Skin Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="tryon" className="space-y-2 mt-2">
              <div className="bg-white/70 rounded-xl border-[0.5px] border-gray-200 overflow-hidden shadow-sm">
                <div className="relative aspect-[3/4] bg-transparent">
                  {cameraOn ? (
                    <>
                      {/* 🚀 NEW ARCHITECTURE: ARBeardMirror for beard category */}
                      {selectedCategory.toLowerCase().includes('beard') ? (
                        (() => {
                          const beardStyles = transformARAssetsToBeardStyles(iontyxState.currentARAssets);
                          if (beardStyles.length === 0) {
                            // Loading state while waiting for assets from database
                            return (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4" />
                                <p className="text-purple-900 font-medium">Fetching Premium Assets...</p>
                                <p className="text-purple-600/70 text-sm mt-1">Loading beard models from database</p>
                              </div>
                            );
                          }
                          return (
                            <ARBeardMirror
                              beardStyles={beardStyles}
                              onStyleChange={(style) => {
                                console.log('Beard style selected:', style.name);
                                // Update selected asset in store
                                const asset = iontyxState.currentARAssets.find(a => a.id === style.id);
                                if (asset) {
                                  setIontyxState(prev => ({ ...prev, selectedAsset: asset }));
                                }
                              }}
                              onClose={() => console.log('Beard closed')}
                            />
                          );
                        })()
                      ) : (
                        <>
                          {/* LEGACY ARCHITECTURE: For non-beard categories */}
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                            style={{
                              display: 'block',
                              transform: currentFacingMode === "user" ? "scaleX(-1)" : "none",
                              zIndex: 1,
                              visibility: 'visible'
                            }}
                          />

                          <canvas
                            ref={overlayCanvasRef}
                            className="absolute inset-0 w-full h-full object-cover"
                            style={{
                              pointerEvents: "none",
                              zIndex: 20,
                              transform: currentFacingMode === "user" ? "scaleX(-1)" : "none"
                            }}
                          />
                        </>
                      )}

                      {/* Hide legacy UI controls when using ARBeardMirror */}
                      {!selectedCategory.toLowerCase().includes('beard') && (
                        <>
                          <div className="absolute top-3 right-3 flex flex-col gap-2 z-40">
                            {/* Camera Flip Button */}
                            <button
                              onMouseDown={(e) => {
                                e.preventDefault();
                                const newMode = currentFacingMode === "user" ? "environment" : "user";
                                setCurrentFacingMode(newMode);
                                openCamera(newMode);
                              }}
                              className="p-2.5 bg-white/20 backdrop-blur-md rounded-full text-white border border-white/30 hover:bg-white/30 transition-all hover:scale-105"
                              title={`Switch to ${currentFacingMode === "user" ? "Back" : "Front"} Camera`}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>

                            {/* Camera Start/Stop Button */}
                            <button
                              onMouseDown={(e) => {
                                e.preventDefault();
                                if (cameraOn) {
                                  // Stop camera
                                  if (streamRef.current) {
                                    streamRef.current.getTracks().forEach((t) => t.stop());
                                  }
                                  setCameraOn(false);
                                  toast.success("Camera stopped");
                                } else {
                                  // Start camera
                                  openCamera(currentFacingMode);
                                }
                              }}
                              className={cn(
                                "p-2.5 backdrop-blur-md rounded-full transition-all border border-white/30 hover:scale-105",
                                cameraOn ? "bg-red-500/90 text-white border-red-400" : "bg-white/20 text-white"
                              )}
                              title={cameraOn ? "Stop Camera" : "Start Camera"}
                            >
                              <Camera className="w-4 h-4" />
                            </button>

                            {/* Ring Light Toggle */}
                            <button
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setRingLightOn((p) => !p);
                              }}
                              className={cn(
                                "p-2.5 backdrop-blur-md rounded-full transition-all border border-white/30 hover:scale-105",
                                ringLightOn ? "bg-yellow-400/90 text-black border-yellow-300" : "bg-white/20 text-white"
                              )}
                              title="Toggle Ring Light"
                            >
                              <Sun className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="absolute top-3 left-3 z-30">
                            <div className="px-3 py-1.5 rounded-full text-[10px] font-semibold backdrop-blur-sm border transition-all bg-amber-500/20 text-amber-700 border-amber-300/50">
                              <div className="flex items-center gap-1.5">
                                <div className="relative w-4 h-4">
                                  <div className="absolute inset-0 flex items-center justify-center text-amber-500">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  </div>
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    Face Detection Active
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 🚨 BRIDAL MODE: Disable GlowScoreDisplay to prevent conflicts */}
                          {showGlowScore && iontyxState.currentGlowScore && currentMode !== "Bridal Full Set" && (
                            <div className="absolute top-2 left-2 z-30">
                              <GlowScoreDisplay
                                glowScore={iontyxState.currentGlowScore}
                                previousScore={iontyxState.previousGlowScore as any || undefined}
                                size="small"
                                showComponents={false}
                              />
                            </div>
                          )}

                          {/* IONTYX AI Fix Button */}
                          <div className="absolute bottom-2 left-2 z-30">
                            <AIFixButton
                              isProcessing={iontyxState.isAIProcessing}
                              disabled={iontyxState.isAIProcessing || selectedCategory.toLowerCase().includes('beard')}
                              onFix={async () => {
                                toast.info('AI analysis feature coming soon');
                              }}
                              size="small"
                              variant="glow"
                            >
                              {iontyxState.isAIProcessing ? (
                                <div>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>AI Processing...</span>
                                </div>
                              ) : (
                                <div>
                                  <Zap className="w-4 h-4" />
                                  <span>✨ Fix My Look</span>
                                </div>
                              )}
                            </AIFixButton>
                          </div>

                          {/* IONTYX AI Suggestions Bubble */}
                          {showSuggestions && iontyxState.currentSuggestions.length > 0 && (
                            <AISuggestionBubble
                              suggestions={iontyxState.currentSuggestions}
                              onDismiss={() => setShowSuggestions(false)}
                              autoDismiss={true}
                            />
                          )}
                        </>
                      )}
                    </>
                  ) : capturedImage ? (
                    <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <Camera className="h-8 w-8 text-gray-300" />
                      <p className="text-gray-400 text-[10px]">Open camera to start</p>
                    </div>
                  )}
                </div>
              </div>

            </TabsContent>
          </Tabs>
        </div>
      )}
      {currentView === "mirror" && (
        <div>
          {/* Existing AR Assets */}
          {iontyxState.currentARAssets.length > 0 && (
            <div className="mt-3 w-full">
              <ARCarousel
                assets={iontyxState.currentARAssets}
                onAssetSelect={handleAssetSelect}
                selectedAsset={iontyxState.selectedAsset || undefined}
                showAIIndicator={true}
                className="mx-2 mb-2"
              />
            </div>
          )}


        </div>
      )}

      {/* Enhanced AR Carousel with IONTYX Integration */}
      <AnimatePresence>
        {showReelsMode && (
          <motion.div
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 rounded-t-3xl shadow-2xl z-40"
          >
            <div className="p-4">
              {/* Enhanced Header with IONTYX Branding */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-semibold text-gray-800">✨ IONTYX AR Studio</h3>
                </div>
                <button
                  onClick={() => setShowReelsMode(false)}
                  className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-gray-600 rotate-180" />
                </button>
              </div>

              {/* AI Status Indicator */}
              {iontyxState.currentGlowScore && (
                <div className="mb-3 p-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-purple-700">AI Glow Score</span>
                    <span className="text-xs font-bold text-purple-900">
                      {iontyxState.currentGlowScore.score}/100
                    </span>
                  </div>
                </div>
              )}

              {/* AR Filters Carousel */}
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {[
                  { id: "glam", name: "Glam", emoji: "??", color: "from-pink-400 to-purple-400" },
                  { id: "vintage", name: "Vintage", emoji: "??", color: "from-amber-400 to-orange-400" },
                  { id: "neon", name: "Neon", emoji: "??", color: "from-cyan-400 to-blue-400" },
                  { id: "soft", name: "Soft", emoji: "??", color: "from-rose-300 to-pink-300" },
                  { id: "bold", name: "Bold", emoji: "??", color: "from-red-400 to-pink-400" },
                  { id: "natural", name: "Natural", emoji: "??", color: "from-green-400 to-emerald-400" },
                  { id: "party", name: "Party", emoji: "??", color: "from-purple-400 to-indigo-400" },
                  { id: "elegant", name: "Elegant", emoji: "??", color: "from-gray-400 to-slate-400" },
                ].map((filter) => (
                  <motion.button
                    key={filter.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-gray-200 hover:shadow-lg transition-all min-w-[80px]"
                  >
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${filter.color} flex items-center justify-center text-2xl shadow-md`}>
                      {filter.emoji}
                    </div>
                    <span className="text-xs font-medium text-gray-700">{filter.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default MirrorScreen;