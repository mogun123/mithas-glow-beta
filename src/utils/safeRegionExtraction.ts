import { RegionExtractionResult, LoggerContext } from '../types/debug';

// MediaPipe FaceMesh landmark indices for facial regions
export const FACIAL_REGIONS = {
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
  },
  nose: {
    name: 'nose',
    landmarks: [1, 2, 98, 327, 168, 6, 193, 417, 122, 351],
    minPixelCount: 25,
    fallbackRegion: 'leftCheek'
  },
  chin: {
    name: 'chin',
    landmarks: [152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454],
    minPixelCount: 30,
    fallbackRegion: 'leftCheek'
  }
};

export interface SafeExtractionOptions {
  imageData: ImageData;
  landmarks: any[];
  targetRegion?: keyof typeof FACIAL_REGIONS;
  enableFallback?: boolean;
  logger?: {
    debug: (msg: string, ctx?: LoggerContext) => void;
    warn: (msg: string, ctx?: LoggerContext) => void;
    error: (msg: string, ctx?: LoggerContext) => void;
    success: (msg: string, ctx?: LoggerContext) => void;
  };
}

/**
 * Validates landmarks before region extraction
 */
const validateLandmarks = (landmarks: any[], regionName: string): {
  isValid: boolean;
  missingIndices: number[];
  invalidPoints: number[];
} => {
  const region = FACIAL_REGIONS[regionName as keyof typeof FACIAL_REGIONS];
  if (!region) {
    return { isValid: false, missingIndices: [], invalidPoints: [] };
  }

  const missingIndices: number[] = [];
  const invalidPoints: number[] = [];

  region.landmarks.forEach((index, i) => {
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

/**
 * Extracts pixels from facial landmarks using polygon fill algorithm
 */
const extractPixelsFromLandmarks = (
  imageData: ImageData,
  landmarks: any[],
  landmarkIndices: number[],
  padding: number = 4
): { pixels: any[]; area: number } => {
  const { width, height, data } = imageData;
  const pixels: any[] = [];

  // Convert normalized landmarks to pixel coordinates
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

  // Find bounding box with padding
  const minX = Math.max(0, Math.min(...polygonPoints.map(p => p.x)) - padding);
  const maxX = Math.min(width - 1, Math.max(...polygonPoints.map(p => p.x)) + padding);
  const minY = Math.max(0, Math.min(...polygonPoints.map(p => p.y)) - padding);
  const maxY = Math.min(height - 1, Math.max(...polygonPoints.map(p => p.y)) + padding);

  // Point-in-polygon test
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

  // Extract pixels within polygon
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

/**
 * Safe region extraction with fallback logic
 */
export const safeRegionExtraction = (options: SafeExtractionOptions): RegionExtractionResult => {
  const {
    imageData,
    landmarks,
    targetRegion = 'forehead',
    enableFallback = true,
    logger
  } = options;

  let currentRegion = targetRegion;
  let fallbackUsed = false;
  let warning: string | undefined;

  logger?.debug(`Starting region extraction for ${targetRegion}`, {
    region: targetRegion,
    landmarkCount: landmarks.length
  });

  // Try primary region first
  let result = extractRegion(currentRegion, landmarks, imageData, logger);
  
  // If primary region fails and fallback is enabled, try fallback regions
  if (!result.success && enableFallback) {
    const fallbackChain = getFallbackChain(currentRegion);
    
    for (const fallbackRegion of fallbackChain) {
      logger?.warn(`Primary region ${currentRegion} failed, trying fallback: ${fallbackRegion}`, {
        primaryRegion: currentRegion,
        fallbackRegion,
        originalError: result.warning
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
      landmarks: [],
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
    landmarks: result.landmarks,
    fallbackUsed
  };
};

/**
 * Extract a single region
 */
const extractRegion = (
  regionName: string,
  landmarks: any[],
  imageData: ImageData,
  logger?: any
): Omit<RegionExtractionResult, 'warning'> => {
  const region = FACIAL_REGIONS[regionName as keyof typeof FACIAL_REGIONS];
  
  if (!region) {
    logger?.error(`Unknown region: ${regionName}`);
    return {
      success: false,
      region: regionName,
      pixelCount: 0,
      landmarks: []
    };
  }

  // Validate landmarks
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
    
    return {
      success: false,
      region: regionName,
      pixelCount: 0,
      landmarks: []
    };
  }

  // Extract pixels
  const { pixels, area } = extractPixelsFromLandmarks(imageData, landmarks, region.landmarks);
  
  if (pixels.length === 0) {
    logger?.error(`${regionName}: Empty region - no pixels extracted`, {
      region: regionName,
      area,
      landmarkCount: region.landmarks.length,
      errorType: 'EMPTY_REGION'
    });
    
    return {
      success: false,
      region: regionName,
      pixelCount: 0,
      landmarks: []
    };
  }

  if (pixels.length < region.minPixelCount) {
    logger?.warn(`${regionName}: Insufficient pixels (${pixels.length} < ${region.minPixelCount})`, {
      region: regionName,
      pixelCount: pixels.length,
      minRequired: region.minPixelCount,
      area,
      errorType: 'INSUFFICIENT_PIXELS'
    });
    
    return {
      success: false,
      region: regionName,
      pixelCount: pixels.length,
      landmarks: region.landmarks
    };
  }

  return {
    success: true,
    region: regionName,
    pixelCount: pixels.length,
    landmarks: region.landmarks
  };
};

/**
 * Get fallback chain for a region
 */
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
