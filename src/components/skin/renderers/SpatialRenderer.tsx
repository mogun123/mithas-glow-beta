/**
 * SpatialRenderer.tsx — Production-Grade Spatial Metric Visualization
 * Renders spatial metrics (acne, oiliness, darkCircle, redness, texture, pigment)
 * 
 * MIRROR-LIKE ACCURACY FIX:
 * - Ensures animations show exactly where real acne/spots are detected
 * - Proper coordinate mapping from AI detection to display
 * - Face-mirror positioning system
 * - Real spot coordinate validation
 */

import React, { useLayoutEffect, useState, useRef, useCallback, useMemo } from 'react';
import { detectDeviceCapabilities, getPerformanceMode, getAdaptiveSettings, type DeviceCapabilities } from '../../../utils/deviceDetection';

// 🧪 SPATIAL RENDERER INTERFACE
type Props = {
  spots: any[];
  metric: string;
  imageRef: React.RefObject<HTMLImageElement | null>;
  pulse: number;
  captureWidth: number;
  captureHeight: number;
  performanceMode?: 'high' | 'eco' | 'auto';
};

// 🎯 METRIC-BASED SIZING CONFIGURATION
const METRIC_CONFIGS = {
  acne: {
    baseSize: 12,
    maxSize: 20,
    minSize: 8,
    blurAmount: 15,
    color: { r: 255, g: 0, b: 0 },
    animation: 'pulse',
  },
  oiliness: {
    baseSize: 6,
    maxSize: 10,
    minSize: 4,
    blurAmount: 8,
    color: { r: 255, g: 215, b: 0 },
    animation: 'shimmer',
  },
  darkCircle: {
    baseSize: 18,
    maxSize: 30,
    minSize: 12,
    blurAmount: 20,
    color: { r: 128, g: 0, b: 128 },
    animation: 'pulse',
  },
  redness: {
    baseSize: 24,
    maxSize: 40,
    minSize: 16,
    blurAmount: 25,
    color: { r: 255, g: 0, b: 0 },
    animation: 'breathing',
  },
  texture: {
    baseSize: 10,
    maxSize: 16,
    minSize: 6,
    blurAmount: 10,
    color: { r: 139, g: 69, b: 19 },
    animation: 'flow',
  },
  pores: {
    baseSize: 4,
    maxSize: 8,
    minSize: 2,
    blurAmount: 6,
    color: { r: 64, g: 64, b: 64 },
    animation: 'pulse',
  },
  pigment: {
    baseSize: 12,
    maxSize: 20,
    minSize: 8,
    blurAmount: 12,
    color: { r: 255, g: 165, b: 0 },
    animation: 'pulse',
  },
};

// 🧪 SPATIAL METRIC RENDERER
export const SpatialRenderer: React.FC<Props> = ({
  spots,
  metric,
  imageRef,
  pulse,
  captureWidth,
  captureHeight,
  performanceMode = 'auto'
}) => {
  // 🎯 Device capabilities detection
  const deviceCapabilities = useMemo(() => {
    const base = detectDeviceCapabilities();
    const adaptive = getAdaptiveSettings(base);
    return adaptive;
  }, []);

  const resolvedPerformanceMode = useMemo(() => 
    getPerformanceMode(performanceMode, deviceCapabilities), 
    [performanceMode, deviceCapabilities]
  );

  // 🎯 Coordinate scaling state - start invisible to prevent off-screen flash
  const [scaleX, setScaleX] = useState<number | null>(null);
  const [scaleY, setScaleY] = useState<number | null>(null);
  
  // 🎯 Progressive rendering state
  const [visibleSpots, setVisibleSpots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [batchIndex, setBatchIndex] = useState(0);
  
  // 🎯 Animation throttling state
  const [throttledPulse, setThrottledPulse] = useState(pulse);
  const pulseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 🎯 METRIC-BASED SIZE CALCULATION
  const getMetricSize = useCallback((spot: any, baseSize: number) => {
    // Use intensity or severity from spot data if available
    const intensity = spot.intensity || spot.severity || 1.0;
    const sizeMultiplier = Math.max(0.5, Math.min(2.0, intensity));
    return baseSize * sizeMultiplier;
  }, []);

  // 🎯 MIRROR-LIKE ACCURACY: Enhanced data validation and coordinate analysis
  const hasValidData = useMemo(() => {
    if (!spots || !Array.isArray(spots)) {
      console.log(`🔍 MIRROR ACCURACY CHECK for ${metric.toUpperCase()}: No spots array`);
      return false;
    }
    
    console.log(`🔍 MIRROR ACCURACY CHECK for ${metric.toUpperCase()}:`);
    console.log(`  📊 Total spots: ${spots.length}`);
    
    // Log detailed spot data structure analysis
    if (spots.length > 0) {
      console.log(`  📍 Sample spot data:`, JSON.stringify(spots[0], null, 2));
      console.log(`  📍 Spot keys:`, Object.keys(spots[0] || {}));
      
      // Analyze coordinate ranges to understand the coordinate system
      const xCoords = spots.map(s => s.x).filter(x => Number.isFinite(x));
      const yCoords = spots.map(s => s.y).filter(y => Number.isFinite(y));
      
      if (xCoords.length > 0 && yCoords.length > 0) {
        console.log(`  📐 Coordinate Analysis:`);
        console.log(`    X range: ${Math.min(...xCoords).toFixed(1)} - ${Math.max(...xCoords).toFixed(1)}`);
        console.log(`    Y range: ${Math.min(...yCoords).toFixed(1)} - ${Math.max(...yCoords).toFixed(1)}`);
        console.log(`    Capture dimensions: ${captureWidth}×${captureHeight}`);
        
        // Check if coordinates seem to be in the right range
        const xRangeValid = Math.max(...xCoords) <= captureWidth && Math.min(...xCoords) >= 0;
        const yRangeValid = Math.max(...yCoords) <= captureHeight && Math.min(...yCoords) >= 0;
        console.log(`    X coordinates in range: ${xRangeValid}`);
        console.log(`    Y coordinates in range: ${yRangeValid}`);
      }
    }
    
    // Check if any spots have valid coordinates AND actual intensity/severity
    const validSpots = spots.filter(spot => {
      if (!spot) return false;
      
      const hasValidCoords = Number.isFinite(spot.x) && Number.isFinite(spot.y);
      const hasIntensity = typeof spot.intensity === 'number' && spot.intensity > 0;
      const hasSeverity = typeof spot.severity === 'number' && spot.severity > 0;
      const hasValidIntensity = hasIntensity || hasSeverity;
      
      // Log why a spot might be invalid
      if (!hasValidCoords) {
        console.log(`    ❌ Invalid coordinates: x=${spot.x}, y=${spot.y}`);
      }
      if (!hasValidIntensity) {
        console.log(`    ❌ No intensity data: intensity=${spot.intensity}, severity=${spot.severity}`);
      }
      
      return hasValidCoords && hasValidIntensity;
    });
    
    console.log(`  ✅ Valid spots: ${validSpots.length}`);
    console.log(`  📈 Has valid data: ${validSpots.length > 0}`);
    
    return validSpots.length > 0;
  }, [spots, metric, captureWidth, captureHeight]);

  // 🎯 MIRROR-LIKE ACCURACY: Enhanced spot filtering with coordinate validation
  const optimizedSpots = useMemo(() => {
    if (!hasValidData) {
      console.log(`🎯 MIRROR ACCURACY for ${metric.toUpperCase()}: No valid data - returning empty array`);
      return [];
    }
    
    // First, filter out spots with actual intensity data and valid coordinates
    const validSpots = spots.filter(spot => {
      if (!spot) return false;
      
      const hasValidCoords = Number.isFinite(spot.x) && Number.isFinite(spot.y);
      const hasIntensity = typeof spot.intensity === 'number' && spot.intensity > 0;
      const hasSeverity = typeof spot.severity === 'number' && spot.severity > 0;
      
      // Additional coordinate validation
      const xInRange = hasValidCoords && spot.x >= 0 && spot.x <= captureWidth;
      const yInRange = hasValidCoords && spot.y >= 0 && spot.y <= captureHeight;
      
      return hasValidCoords && (hasIntensity || hasSeverity) && xInRange && yInRange;
    });
    
    console.log(`🎯 MIRROR ACCURACY FILTERING for ${metric.toUpperCase()}:`);
    console.log(`  📊 Original spots: ${spots.length}`);
    console.log(`  ✅ Valid spots: ${validSpots.length}`);
    
    // Apply device-specific limits FIRST (before viewport culling)
    const limitedSpots = validSpots.slice(0, deviceCapabilities.maxConcurrentSpots);
    console.log(`  📱 Device limit (${deviceCapabilities.maxConcurrentSpots}): ${limitedSpots.length}`);
    
    // THEN apply viewport culling to the limited spots
    if (scaleX && scaleY) {
      const viewportFiltered = limitedSpots.filter(spot => {
        const scaledX = spot.x * scaleX;
        const scaledY = spot.y * scaleY;
        // Keep spots within reasonable bounds (with 100px padding)
        return scaledX >= -100 && scaledX <= (window.innerWidth + 100) &&
               scaledY >= -100 && scaledY <= (window.innerHeight + 100);
      });
      console.log(`  🖼️ Viewport filtered: ${viewportFiltered.length}`);
      return viewportFiltered;
    }
    
    console.log(`  🔄 Returning limited spots: ${limitedSpots.length}`);
    return limitedSpots;
  }, [spots, hasValidData, deviceCapabilities.maxConcurrentSpots, scaleX, scaleY, metric, captureWidth, captureHeight]);

  // 🎯 FIXED Progressive batch rendering
  const renderNextBatch = useCallback(() => {
    const batchSize = 50;
    const nextIndex = Math.min(batchIndex + batchSize, optimizedSpots.length);
    const nextBatch = optimizedSpots.slice(0, nextIndex);
    
    console.log(`📦 MIRROR ACCURACY BATCH for ${metric.toUpperCase()}:`);
    console.log(`  📊 Current batch index: ${batchIndex}`);
    console.log(`  📊 Next index: ${nextIndex}`);
    console.log(`  📊 Optimized spots total: ${optimizedSpots.length}`);
    console.log(`  📊 Batch size: ${nextBatch.length}`);
    
    setVisibleSpots(nextBatch);
    setBatchIndex(nextIndex);
    
    if (nextIndex < optimizedSpots.length) {
      console.log(`  ⏭️ Scheduling next batch in 100ms`);
      batchTimeoutRef.current = setTimeout(renderNextBatch, 100);
    } else {
      setIsLoading(false);
      console.log(`✅ MIRROR ACCURACY complete: ${nextIndex} spots rendered for ${metric.toUpperCase()}`);
    }
  }, [batchIndex, optimizedSpots, metric]);

  // 🎯 FIXED: Start progressive rendering when spots are available
  useLayoutEffect(() => {
    console.log(`🔄 MIRROR ACCURACY EFFECT for ${metric.toUpperCase()}:`);
    console.log(`  📊 Optimized spots length: ${optimizedSpots.length}`);
    console.log(`  📊 Current batch index: ${batchIndex}`);
    console.log(`  📊 Should start rendering: ${optimizedSpots.length > 0 && batchIndex === 0}`);
    
    if (optimizedSpots.length > 0 && batchIndex === 0) {
      console.log(`  🚀 Starting mirror-accurate rendering...`);
      setIsLoading(true);
      setVisibleSpots([]);
      renderNextBatch();
    }
    
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, [optimizedSpots.length, batchIndex, renderNextBatch, metric]);

  // 🎯 Animation throttling based on device capabilities
  useLayoutEffect(() => {
    // Clear existing timeout
    if (pulseTimeoutRef.current) {
      clearTimeout(pulseTimeoutRef.current);
    }
    
    // Throttle pulse updates based on device
    pulseTimeoutRef.current = setTimeout(() => {
      setThrottledPulse(pulse);
    }, deviceCapabilities.animationInterval);
    
    return () => {
      if (pulseTimeoutRef.current) {
        clearTimeout(pulseTimeoutRef.current);
      }
    };
  }, [pulse, deviceCapabilities.animationInterval]);

  // 🎯 MIRROR-LIKE ACCURACY: Enhanced coordinate scaling with validation
  useLayoutEffect(() => {
    const updateScaling = () => {
      const imageElement = imageRef.current;
      if (imageElement && imageElement.complete && imageElement.naturalWidth > 0) {
        const imageWidth = imageElement.clientWidth;
        const imageHeight = imageElement.clientHeight;
        
        // ✅ CRITICAL: Only calculate scale if image has valid dimensions
        if (imageWidth > 0 && imageHeight > 0) {
          // ✅ CORRECT: Scale from actual capture dimensions, not arbitrary 1000
          const newScaleX = imageWidth / captureWidth;
          const newScaleY = imageHeight / captureHeight;

          console.log(`📏 MIRROR ACCURACY SCALING for ${metric.toUpperCase()}:`);
          console.log(`  📸 Capture dimensions: ${captureWidth}×${captureHeight}`);
          console.log(`  🖥️ Display dimensions: ${imageWidth}×${imageHeight}`);
          console.log(`  📊 Scale factors: X=${newScaleX.toFixed(3)}, Y=${newScaleY.toFixed(3)}`);
          
          // Validate scaling makes sense
          if (newScaleX > 0 && newScaleY > 0) {
            console.log(`  ✅ Valid scaling: 1px in capture = ${newScaleX.toFixed(3)}px in display`);
          } else {
            console.error(`  ❌ Invalid scaling: X=${newScaleX}, Y=${newScaleY}`);
          }
          
          setScaleX(newScaleX);
          setScaleY(newScaleY);
        } else {
          console.warn(`⚠️ Image has zero dimensions: ${imageWidth}x${imageHeight}`);
        }
      } else {
        console.warn(`⚠️ Image not loaded or incomplete`);
      }
    };

    // Initial attempt
    updateScaling();
    
    // Wait for image to load
    const imageElement = imageRef.current;
    if (imageElement) {
      imageElement.addEventListener('load', updateScaling);
      imageElement.addEventListener('error', () => console.error('❌ Image failed to load'));
    }
    
    window.addEventListener('resize', updateScaling);
    
    return () => {
      if (imageElement) {
        imageElement.removeEventListener('load', updateScaling);
        imageElement.removeEventListener('error', () => {});
      }
      window.removeEventListener('resize', updateScaling);
    };
  }, [imageRef, captureWidth, captureHeight, metric]);

  if (!spots) {
    throw new Error(`CLINICAL_ERROR: Missing ${metric} data`);
  }

  if (!Array.isArray(spots)) {
    throw new Error("CLINICAL_ERROR: Invalid spots structure");
  }

  // 🎯 EARLY RETURN: No valid data - don't render anything
  if (!hasValidData) {
    console.log(`🚫 NO VALID DATA for ${metric.toUpperCase()} - skipping rendering`);
    return null;
  }

  // 🎯 DEBUG: Log SpatialRenderer props
  console.log(`🎯 MIRROR ACCURACY RENDERER for ${metric.toUpperCase()}:`);
  console.log(`  📊 Metric: ${metric}`);
  console.log(`  🔢 Total spots: ${spots?.length || 0}`);
  console.log(`  🔢 Optimized spots: ${optimizedSpots.length}`);
  console.log(`  🔢 Visible spots: ${visibleSpots.length}`);
  console.log(`  💫 Throttled pulse: ${throttledPulse}`);
  console.log(`  📱 Device: ${deviceCapabilities.isMobile ? 'Mobile' : 'Desktop'}`);
  console.log(`  ⚡ Performance mode: ${resolvedPerformanceMode}`);
  console.log(`  📏 Scale: X=${scaleX?.toFixed(2) || 'null'}, Y=${scaleY?.toFixed(2) || 'null'}`);
  console.log(`  📦 Batch index: ${batchIndex}/${optimizedSpots.length}`);
  console.log(`  🔄 Loading: ${isLoading ? 'Yes' : 'No'}`);

  // 🎯 MIRROR-LIKE ACCURACY: Enhanced spot rendering with coordinate validation
  const renderSpots = () => {
    console.log(`🎯 MIRROR ACCURACY RENDERING ${visibleSpots.length} SPOTS FOR ${metric.toUpperCase()}:`);
    console.log(`  📏 Scale factors: X=${scaleX?.toFixed(3) || 'null'}, Y=${scaleY?.toFixed(3) || 'null'}`);
    console.log(`  💫 Throttled pulse animation: ${throttledPulse}`);
    
    return visibleSpots.map((spot: any, index: number) => {
      // 🎯 MIRROR ACCURACY: Enhanced coordinate logging
      if (index === 0 || index === visibleSpots.length - 1 || index % 25 === 0) {
        const rawX = spot.x;
        const rawY = spot.y;
        const scaledX = scaleX ? (spot.x * scaleX).toFixed(1) : 'null';
        const scaledY = scaleY ? (spot.y * scaleY).toFixed(1) : 'null';
        
        console.log(`  📍 MIRROR SPOT ${index}:`);
        console.log(`    📐 Raw coordinates: (${rawX.toFixed(1)}, ${rawY.toFixed(1)})`);
        console.log(`    🖥️ Scaled coordinates: (${scaledX}, ${scaledY})`);
        console.log(`    📊 Intensity: ${spot.intensity}, Severity: ${spot.severity}`);
        console.log(`    🎯 Should appear at: (${scaledX}px, ${scaledY}px) from top-left`);
      }

      if (
        !spot ||
          !Number.isFinite(spot.x) ||
          !Number.isFinite(spot.y)
      ) {
        throw new Error("CLINICAL_ERROR: Invalid coordinate structure");
      }

      // Guard against positioning before scale is calculated
      const spotStyle: React.CSSProperties = {
        position: "absolute" as const,
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        // Always set positioning to avoid TypeScript errors
        left: scaleX ? `${spot.x * scaleX}px` : '-9999px',
        top: scaleY ? `${spot.y * scaleY}px` : '-9999px',
        // Performance optimization: GPU hinting
        willChange: "transform, opacity",
        // Fade-in effect for progressive rendering
        opacity: isLoading ? 0.3 : 1,
        transition: "opacity 0.3s ease-in-out",
      };

      // Get metric-specific configuration
      const metricConfig = METRIC_CONFIGS[metric as keyof typeof METRIC_CONFIGS] || METRIC_CONFIGS.acne;
      
      // Calculate metric-based size
      const baseSize = getMetricSize(spot, metricConfig.baseSize);
      const size = baseSize + (throttledPulse * metricConfig.baseSize * 0.5);
      
      // Apply device-specific blur reduction
      const blurMultiplier = deviceCapabilities.blurReduction;
      const blurAmount = metricConfig.blurAmount * blurMultiplier;

      // Apply device-specific animation complexity
      const enableComplexAnimations = deviceCapabilities.enableComplexAnimations;
      const animationType = enableComplexAnimations ? metricConfig.animation : 'pulse';

      switch (metric) {
        case 'acne':
          return (
            <div
              key={index}
              style={{
                ...spotStyle,
                filter: `drop-shadow(0 0 ${blurAmount + throttledPulse * 10}px rgba(${metricConfig.color.r}, ${metricConfig.color.g}, ${metricConfig.color.b}, 0.8))`,
                backgroundColor: `rgba(${metricConfig.color.r}, ${metricConfig.color.g}, ${metricConfig.color.b}, ${0.6 + throttledPulse * 0.4})`,
                width: `${size}px`,
                height: `${size}px`,
                animation: `${animationType} ${2 + throttledPulse}s ease-in-out infinite`
              }}
              className={`clinical-marker-acne`}
              title={`Acne spot at (${spot.x.toFixed(0)}, ${spot.y.toFixed(0)}) - Intensity: ${spot.intensity}`}
            >
              {index + 1}
            </div>
          );
          
        case 'oiliness':
          return (
            <div
              key={index}
              style={{
                ...spotStyle,
                filter: `brightness(${1.5 + Math.sin(throttledPulse * 6 + index) * 0.3})`,
                backgroundColor: `rgba(${metricConfig.color.r}, ${metricConfig.color.g}, ${metricConfig.color.b}, ${0.4 + Math.sin(throttledPulse * 6 + index) * 0.3})`,
                width: `${size + Math.sin(throttledPulse * 8 + index) * 2}px`,
                height: `${size + Math.sin(throttledPulse * 8 + index) * 2}px`,
                animation: `${animationType} ${3 + throttledPulse}s linear infinite`
              }}
              className={`clinical-marker-oiliness`}
              title={`Oiliness at (${spot.x.toFixed(0)}, ${spot.y.toFixed(0)}) - Intensity: ${spot.intensity}`}
            >
              {index + 1}
            </div>
          );
          
        case 'darkCircle':
          return (
            <div
              key={index}
              style={{
                ...spotStyle,
                background: `radial-gradient(circle, rgba(${metricConfig.color.r}, ${metricConfig.color.g}, ${metricConfig.color.b}, ${0.4 + throttledPulse * 0.2}) 0%, rgba(${metricConfig.color.r}, ${metricConfig.color.g}, ${metricConfig.color.b}, 0) 100%)`,
                filter: `blur(${blurAmount + throttledPulse * 8}px)`,
                width: `${size * 1.5}px`,
                height: `${size * 0.8}px`,
                animation: `${animationType} ${2.5 + throttledPulse}s ease-in-out infinite`
              }}
              className={`clinical-marker-darkCircle`}
              title={`Dark circle at (${spot.x.toFixed(0)}, ${spot.y.toFixed(0)}) - Intensity: ${spot.intensity}`}
            >
              {index + 1}
            </div>
          );
          
        case 'redness':
          return (
            <div
              key={index}
              style={{
                ...spotStyle,
                filter: `blur(${blurAmount}px) drop-shadow(0 0 ${blurAmount}px rgba(${metricConfig.color.r}, ${metricConfig.color.g}, ${metricConfig.color.b}, 0.6))`,
                backgroundColor: `rgba(${metricConfig.color.r}, ${metricConfig.color.g}, ${metricConfig.color.b}, ${0.2 + throttledPulse * 0.3})`,
                width: `${size * 1.5}px`,
                height: `${size * 1.5}px`,
                animation: `${animationType} ${3 + throttledPulse}s ease-in-out infinite`
              }}
              className={`clinical-marker-redness`}
              title={`Redness at (${spot.x.toFixed(0)}, ${spot.y.toFixed(0)}) - Intensity: ${spot.intensity}`}
            >
              {index + 1}
            </div>
          );
          
        case 'texture':
          return (
            <div
              key={index}
              style={{
                ...spotStyle,
                background: `radial-gradient(circle, rgba(${metricConfig.color.r}, ${metricConfig.color.g}, ${metricConfig.color.b}, ${0.3 + throttledPulse * 0.2}) 0%, rgba(${metricConfig.color.r}, ${metricConfig.color.g}, ${metricConfig.color.b}, 0) 100%)`,
                filter: `blur(${blurAmount + throttledPulse * 4}px)`,
                width: `${size}px`,
                height: `${size}px`,
                animation: `${animationType} ${4 + throttledPulse}s ease-in-out infinite`
              }}
              className={`clinical-marker-texture`}
              title={`Texture at (${spot.x.toFixed(0)}, ${spot.y.toFixed(0)}) - Intensity: ${spot.intensity}`}
            >
              {index + 1}
            </div>
          );
          
        case 'pores':
          return (
            <div
              key={index}
              style={{
                ...spotStyle,
                background: `radial-gradient(circle, rgba(${metricConfig.color.r}, ${metricConfig.color.g}, ${metricConfig.color.b}, ${0.6 + throttledPulse * 0.2}) 0%, rgba(${metricConfig.color.r}, ${metricConfig.color.g}, ${metricConfig.color.b}, 0) 100%)`,
                filter: `blur(${blurAmount + throttledPulse * 2}px)`,
                width: `${size}px`,
                height: `${size}px`,
                animation: `${animationType} ${1.5 + throttledPulse}s ease-in-out infinite`
              }}
              className={`clinical-marker-pores`}
              title={`Pores at (${spot.x.toFixed(0)}, ${spot.y.toFixed(0)}) - Intensity: ${spot.intensity}`}
            >
              {index + 1}
            </div>
          );
          
        case 'pigment':
          return (
            <div
              key={index}
              style={{
                ...spotStyle,
                background: `radial-gradient(circle, rgba(${metricConfig.color.r}, ${metricConfig.color.g}, ${metricConfig.color.b}, ${0.5 + throttledPulse * 0.3}) 0%, rgba(${metricConfig.color.r}, ${metricConfig.color.g}, ${metricConfig.color.b}, 0) 100%)`,
                filter: `blur(${blurAmount + throttledPulse * 3}px)`,
                width: `${size}px`,
                height: `${size}px`,
                animation: `${animationType} ${2.8 + throttledPulse}s ease-in-out infinite`
              }}
              className={`clinical-marker-pigment`}
              title={`Pigment at (${spot.x.toFixed(0)}, ${spot.y.toFixed(0)}) - Intensity: ${spot.intensity}`}
            >
              {index + 1}
            </div>
          );
          
        default:
          return (
            <div
              key={index}
              style={{
                ...spotStyle,
                backgroundColor: `rgba(255, 255, 255, ${0.5 + throttledPulse * 0.3})`,
                width: `${size}px`,
                height: `${size}px`,
                animation: `${animationType} ${2 + throttledPulse}s ease-in-out infinite`
              }}
              className={`clinical-marker-${metric}`}
              title={`${metric} at (${spot.x.toFixed(0)}, ${spot.y.toFixed(0)}) - Intensity: ${spot.intensity}`}
            >
              {index + 1}
            </div>
          );
      }
    });
  };

  return (
    <>
      {/* Loading indicator for progressive rendering */}
      {isLoading && (
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            textAlign: 'center',
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: '10px 20px',
            borderRadius: '8px',
          }}
        >
          <div>Loading Mirror Analysis...</div>
          <div style={{ fontSize: '12px', marginTop: '5px' }}>
            {visibleSpots.length} / {optimizedSpots.length} spots
          </div>
        </div>
      )}
      
      {renderSpots()}
      
      {/* 🎨 ANIMATION STYLES */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
        }
        
        @keyframes shimmer {
          0% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.3); }
          100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
        }
        
        @keyframes breathing {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.5; }
        }
        
        @keyframes flow {
          0% { transform: translate(-50%, -50%) translateY(0px); }
          100% { transform: translate(-50%, -50%) translateY(-4px); }
        }
        
        @keyframes swirl {
          0% { transform: translate(-50%, -50%) rotate(0deg) scale(1); }
          50% { transform: translate(-50%, -50%) rotate(180deg) scale(1.2); }
          100% { transform: translate(-50%, -50%) rotate(360deg) scale(1); }
        }
        
        .clinical-marker-acne {
          font-size: 10px;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          z-index: 100;
          will-change: transform, opacity;
        }
        
        .clinical-marker-oiliness {
          font-size: 8px;
          color: rgba(255, 255, 255, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          z-index: 100;
          mix-blend-mode: screen;
          will-change: transform, opacity;
        }
        
        .clinical-marker-darkCircle {
          font-size: 9px;
          color: rgba(255, 255, 255, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          z-index: 100;
          will-change: transform, opacity;
        }
        
        .clinical-marker-redness {
          font-size: 11px;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          z-index: 100;
          will-change: transform, opacity;
        }
        
        .clinical-marker-texture {
          font-size: 9px;
          color: rgba(255, 255, 255, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          z-index: 100;
          will-change: transform, opacity;
        }
        
        .clinical-marker-pores {
          font-size: 7px;
          color: rgba(255, 255, 255, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          z-index: 100;
          will-change: transform, opacity;
        }
        
        .clinical-marker-pigment {
          font-size: 8px;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          z-index: 100;
          will-change: transform, opacity;
        }
      `}</style>
    </>
  );
};
