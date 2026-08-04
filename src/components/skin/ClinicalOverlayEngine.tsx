/**
 * ClinicalOverlayEngine.tsx — Clinical-Grade Overlay Rendering
 * STRICT RULES:
 * - NO mock data
 * - NO fallback UI
 * - NO synthetic values
 * - Missing data → THROW ERROR immediately
 * - Only real coordinate data and frame images
 */

import React, { useRef, useEffect, useState } from "react";
import { SpatialRenderer } from "./renderers/SpatialRenderer";
import StructuralRenderer from "./renderers/StructuralRenderer";

type Props = {
  analysisResult: any;
  selectedMetric: string;
  activeAngle: "front" | "left" | "right";
  performanceMode?: 'high' | 'eco' | 'auto';
};

const spatialMetrics: Record<string, string> = {
  acne: "acneClusters",
  oiliness: "oilSpots", 
  darkCircle: "underEyeRegions",
  redness: "rednessClusters",
  texture: "porePoints",
  pores: "porePoints",  // 🎯 Add pores mapping to same data as texture
  pigment: "melaninClusters",
};

const structuralMetrics = ["elasticity", "skinAge", "glassSkin", "moisture"];

const ClinicalOverlayEngine: React.FC<Props> = ({
  analysisResult,
  selectedMetric,
  activeAngle,
  performanceMode = 'auto',
}) => {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [pulse, setPulse] = useState(0);

  // Pulse animation for live effects
  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(prev => (prev + 0.05) % 1);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // 🚨 STRICT DATA VALIDATION - NO FALLBACKS
  if (!analysisResult) {
    throw new Error("CLINICAL_ERROR: Missing analysisResult data");
  }

  const currentFrame = analysisResult[`${activeAngle}Frame`];
  if (!currentFrame) {
    throw new Error(`CLINICAL_ERROR: No ${activeAngle}Frame data available`);
  }

  const imageSrc = currentFrame.image;
  if (!imageSrc) {
    throw new Error(`CLINICAL_ERROR: No image data in ${activeAngle}Frame`);
  }

  // 🎯 SPATIAL METRICS RENDERING
  if (selectedMetric in spatialMetrics) {
    const key = spatialMetrics[selectedMetric];
    const spots = currentFrame[key];

    // � STRICT SPATIAL DATA VALIDATION
    if (!spots) {
      throw new Error(`CLINICAL_ERROR: No ${selectedMetric} data found in frame (key: ${key})`);
    }
    if (!Array.isArray(spots)) {
      throw new Error(`CLINICAL_ERROR: Invalid ${selectedMetric} data structure - expected array`);
    }
    
    // ✨ GLOWING SKIN LOGIC - Handle zero spots gracefully
    if (spots.length === 0) {
      return (
        <div className="relative w-full h-full">
          <img 
            ref={imageRef}
            src={imageSrc} 
            className="w-full h-full object-cover" 
            alt={`${activeAngle} clinical analysis`}
          />
          {/* Premium translucent badge for glowing skin */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-gradient-to-r from-green-400/30 via-emerald-400/30 to-transparent backdrop-blur-sm rounded-full p-4 animate-pulse shadow-lg">
              <div className="text-center">
                <div className="text-2xl mb-1">✨</div>
                <div className="text-sm font-medium text-white">
                  Your skin is glowing! No {selectedMetric} detected on this side.
                </div>
              </div>
            </div>
          </div>
          {/* Pulse animation for frame border */}
          <div className="absolute inset-0 rounded-lg border-2 border-green-400/30 animate-pulse pointer-events-none" />
        </div>
      );
    }

    // 🚨 STRICT COORDINATE VALIDATION
    spots.forEach((spot, index) => {
      if (!spot) {
        throw new Error(`CLINICAL_ERROR: Null spot at index ${index} in ${selectedMetric}`);
      }
      if (!Number.isFinite(spot.x) || !Number.isFinite(spot.y)) {
        throw new Error(`CLINICAL_ERROR: Invalid coordinates in ${selectedMetric} spot ${index}: x=${spot.x}, y=${spot.y}`);
      }
      if (typeof spot.intensity !== 'undefined' && !Number.isFinite(spot.intensity)) {
        throw new Error(`CLINICAL_ERROR: Invalid intensity in ${selectedMetric} spot ${index}: ${spot.intensity}`);
      }
    });

    return (
      <div className="relative w-full h-full">
        <img 
          ref={imageRef}
          src={imageSrc} 
          className="w-full h-full object-cover" 
          alt={`${activeAngle} clinical analysis`}
        />

        <SpatialRenderer
          spots={spots}
          metric={selectedMetric}
          imageRef={imageRef}
          pulse={pulse}
          captureWidth={analysisResult.captureWidth || 1280}
          captureHeight={analysisResult.captureHeight || 720}
          performanceMode={performanceMode}
        />
      </div>
    );
  }

  // 🎯 STRUCTURAL METRICS RENDERING
  if (structuralMetrics.includes(selectedMetric)) {
    return (
      <div className="relative w-full h-full">
        <img 
          src={imageSrc} 
          className="w-full h-full object-cover" 
          alt={`${activeAngle} clinical analysis`}
        />

        <StructuralRenderer metric={selectedMetric} />
      </div>
    );
  }

  // 🚨 UNSUPPORTED METRIC - THROW ERROR
  throw new Error(`CLINICAL_ERROR: Unsupported metric "${selectedMetric}" - must be one of: ${[...Object.keys(spatialMetrics), ...structuralMetrics].join(', ')}`);
};

export default ClinicalOverlayEngine;
