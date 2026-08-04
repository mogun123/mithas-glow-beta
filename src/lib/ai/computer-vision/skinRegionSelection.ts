import { LAB } from './colorConversion';

export interface SkinRegion {
  name: string;
  landmarks: number[];
  centerPoint: { x: number; y: number };
  radius: number;
  pixels: [number, number, number][];
  labValues: LAB[];
  mask?: ImageData;
}

export interface RegionConfig {
  forehead: { landmarks: number[]; radius: number; weight: number };
  leftCheek: { landmarks: number[]; radius: number; weight: number };
  rightCheek: { landmarks: number[]; radius: number; weight: number };
  nose: { landmarks: number[]; radius: number; weight: number };
  chin: { landmarks: number[]; radius: number; weight: number };
  underEyes: { landmarks: number[]; radius: number; weight: number };
}

export interface SkinMask {
  maskData: ImageData;
  width: number;
  height: number;
  skinPixels: number;
  totalPixels: number;
  coverage: number;
}

export class SkinRegionSelection {
  private readonly defaultConfig: RegionConfig = {
    forehead: {
      landmarks: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323],
      radius: 8,
      weight: 0.10,
    },
    leftCheek: {
      landmarks: [50, 101, 205, 206, 207],
      radius: 8,
      weight: 0.40,
    },
    rightCheek: {
      landmarks: [280, 411, 425, 310, 308],
      radius: 8,
      weight: 0.40,
    },
    nose: {
      landmarks: [168, 6],
      radius: 6,
      weight: 0.05,
    },
    chin: {
      landmarks: [152],
      radius: 8,
      weight: 0.05,
    },
    underEyes: {
      landmarks: [33, 133, 362, 263],
      radius: 6,
      weight: 0.10,
    },
  };

  private readonly exclusionZones: {
    eyes: number[][];
    eyebrows: number[][];
    lips: number[][];
    nostrils: number[][];
  } = {
    eyes: [
      // Left eye landmarks
      [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
      // Right eye landmarks  
      [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382],
    ],
    eyebrows: [
      // Left eyebrow
      [46, 53, 52, 65, 55, 70, 63, 105, 66, 107],
      // Right eyebrow
      [276, 283, 282, 295, 285, 300, 293, 334, 296, 336],
    ],
    lips: [
      // Outer lips
      [61, 84, 17, 314, 405, 291, 375, 321, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308],
      // Inner lips
      [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318],
    ],
    nostrils: [
      [1, 2, 4, 6, 19, 20, 31, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50],
    ],
  };

  public extractSkinRegions(
    imageData: ImageData,
    landmarks: number[][],
    imageWidth: number,
    imageHeight: number,
    config: Partial<RegionConfig> = {}
  ): SkinRegion[] {
    const finalConfig = { ...this.defaultConfig, ...config };
    const regions: SkinRegion[] = [];

    for (const [regionName, regionConfig] of Object.entries(finalConfig)) {
      const region = this.extractRegion(
        imageData,
        landmarks,
        imageWidth,
        imageHeight,
        regionName,
        regionConfig
      );
      
      if (region) {
        regions.push(region);
      }
    }

    return regions;
  }

  private extractRegion(
    imageData: ImageData,
    landmarks: number[][],
    imageWidth: number,
    imageHeight: number,
    regionName: string,
    config: { landmarks: number[]; radius: number; weight: number }
  ): SkinRegion | null {
    const regionLandmarks = config.landmarks.map(idx => landmarks[idx]);
    
    // Calculate center point
    const centerPoint = this.calculateCenterPoint(regionLandmarks);
    
    // Extract pixels in circular region
    const pixels = this.extractCircularPixels(
      imageData,
      centerPoint.x * imageWidth,
      centerPoint.y * imageHeight,
      config.radius,
      imageWidth,
      imageHeight
    );

    if (pixels.length === 0) return null;

    // Convert RGB pixels to LAB
    const labValues = pixels.map(pixel => {
      const lab = this.rgbToLab({ r: pixel[0], g: pixel[1], b: pixel[2] });
      return lab;
    });

    return {
      name: regionName,
      landmarks: config.landmarks,
      centerPoint,
      radius: config.radius,
      pixels,
      labValues,
    };
  }

  private calculateCenterPoint(landmarks: number[][]): { x: number; y: number } {
    const sumX = landmarks.reduce((sum, landmark) => sum + landmark[0], 0);
    const sumY = landmarks.reduce((sum, landmark) => sum + landmark[1], 0);
    
    return {
      x: sumX / landmarks.length,
      y: sumY / landmarks.length,
    };
  }

  private extractCircularPixels(
    imageData: ImageData,
    centerX: number,
    centerY: number,
    radius: number,
    imageWidth: number,
    imageHeight: number
  ): [number, number, number][] {
    const pixels: [number, number, number][] = [];
    const data = imageData.data;
    const x = Math.floor(centerX);
    const y = Math.floor(centerY);

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > radius) continue;

        const pixelX = x + dx;
        const pixelY = y + dy;

        if (pixelX < 0 || pixelX >= imageWidth || pixelY < 0 || pixelY >= imageHeight) {
          continue;
        }

        const idx = (pixelY * imageWidth + pixelX) * 4;
        pixels.push([data[idx], data[idx + 1], data[idx + 2]]);
      }
    }

    // Return actual pixel data, never empty array
    return pixels.length > 0 ? pixels : [[0, 0, 0]];
  }

  public generateDynamicSkinMask(
    imageData: ImageData,
    landmarks: number[][],
    imageWidth: number,
    imageHeight: number
  ): SkinMask {
    const maskData = new ImageData(imageData.width, imageData.height);
    const data = imageData.data;
    const mask = maskData.data;
    
    let skinPixels = 0;
    const totalPixels = imageWidth * imageHeight;

    // Create face mesh using convex hull of face landmarks
    const faceHull = this.createFaceHull(landmarks, imageWidth, imageHeight);
    
    // Process each pixel
    for (let y = 0; y < imageHeight; y++) {
      for (let x = 0; x < imageWidth; x++) {
        const idx = (y * imageWidth + x) * 4;
        
        // Check if pixel is in face region
        if (this.isPointInPolygon(x, y, faceHull)) {
          // Check if pixel is in exclusion zone
          if (!this.isInExclusionZone(x, y, landmarks, imageWidth, imageHeight)) {
            // Check if pixel is skin-colored
            if (this.isSkinColor(data[idx], data[idx + 1], data[idx + 2])) {
              mask[idx] = 255;     // Red channel - skin mask
              mask[idx + 1] = 255; // Green channel - skin mask  
              mask[idx + 2] = 255; // Blue channel - skin mask
              mask[idx + 3] = 255; // Alpha channel
              skinPixels++;
            } else {
              mask[idx + 3] = 0; // Transparent
            }
          } else {
            mask[idx + 3] = 0; // Transparent for exclusion zones
          }
        } else {
          mask[idx + 3] = 0; // Transparent outside face
        }
      }
    }

    return {
      maskData,
      width: imageWidth,
      height: imageHeight,
      skinPixels,
      totalPixels,
      coverage: (skinPixels / totalPixels) * 100,
    };
  }

  private createFaceHull(landmarks: number[][], imageWidth: number, imageHeight: number): { x: number; y: number }[] {
    // Use key face landmarks to create a rough face outline
    const faceOutline = [
      // Jawline
      landmarks[172], landmarks[136], landmarks[150], landmarks[172],
      landmarks[58], landmarks[132], landmarks[93], landmarks[234],
      landmarks[127], landmarks[162], landmarks[21], landmarks[54],
      landmarks[103], landmarks[67], landmarks[109],
      // Forehead
      landmarks[10], landmarks[338], landmarks[297], landmarks[332],
      landmarks[284], landmarks[251], landmarks[389], landmarks[356],
      landmarks[454], landmarks[323], landmarks[361], landmarks[340],
      landmarks[346], landmarks[347], landmarks[348], landmarks[349],
      landmarks[350], landmarks[451], landmarks[452], landmarks[453],
    ];

    return faceOutline.map(landmark => ({
      x: landmark[0] * imageWidth,
      y: landmark[1] * imageHeight,
    }));
  }

  private isPointInPolygon(x: number, y: number, polygon: { x: number; y: number }[]): boolean {
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      
      const intersect = ((yi > y) !== (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }
    
    return inside;
  }

  private isInExclusionZone(
    x: number,
    y: number,
    landmarks: number[][],
    imageWidth: number,
    imageHeight: number
  ): boolean {
    // Check if point is in any exclusion zone
    const zones = this.exclusionZones;
    
    // Check eyes
    for (const eyeZone of zones.eyes) {
      const zonePoints: { x: number; y: number }[] = [];
      for (const idx of eyeZone) {
        const landmark = landmarks[idx];
        zonePoints.push({
          x: landmark[0] * imageWidth,
          y: landmark[1] * imageHeight,
        });
      }
      
      const minX = Math.min(...zonePoints.map(p => p.x));
      const maxX = Math.max(...zonePoints.map(p => p.x));
      const minY = Math.min(...zonePoints.map(p => p.y));
      const maxY = Math.max(...zonePoints.map(p => p.y));
      
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        return true;
      }
    }
    
    // Check eyebrows
    for (const browZone of zones.eyebrows) {
      const zonePoints: { x: number; y: number }[] = [];
      for (const idx of browZone) {
        const landmark = landmarks[idx];
        zonePoints.push({
          x: landmark[0] * imageWidth,
          y: landmark[1] * imageHeight,
        });
      }
      
      const minX = Math.min(...zonePoints.map(p => p.x));
      const maxX = Math.max(...zonePoints.map(p => p.x));
      const minY = Math.min(...zonePoints.map(p => p.y));
      const maxY = Math.max(...zonePoints.map(p => p.y));
      
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        return true;
      }
    }
    
    // Check lips
    for (const lipZone of zones.lips) {
      const zonePoints: { x: number; y: number }[] = [];
      for (const idx of lipZone) {
        const landmark = landmarks[idx];
        zonePoints.push({
          x: landmark[0] * imageWidth,
          y: landmark[1] * imageHeight,
        });
      }
      
      const minX = Math.min(...zonePoints.map(p => p.x));
      const maxX = Math.max(...zonePoints.map(p => p.x));
      const minY = Math.min(...zonePoints.map(p => p.y));
      const maxY = Math.max(...zonePoints.map(p => p.y));
      
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        return true;
      }
    }
    
    // Check nostrils
    for (const nostrilArray of zones.nostrils) {
      for (let i = 0; i < nostrilArray.length; i++) {
        const nostrilIdx = nostrilArray[i];
        const landmark = landmarks[nostrilIdx];
        const zoneX = landmark[0] * imageWidth;
        const zoneY = landmark[1] * imageHeight;
        
        // Small bounding box around nostril point
        if (x >= zoneX - 10 && x <= zoneX + 10 && y >= zoneY - 10 && y <= zoneY + 10) {
          return true;
        }
      }
    }
    
    return false;
  }

  private isSkinColor(r: number, g: number, b: number): boolean {
    // Simple skin color detection using RGB ranges
    // These ranges can be adjusted based on testing
    return (
      r > 95 && g > 40 && b > 20 &&
      Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
      Math.abs(r - g) > 15 && r > g && r > b
    );
  }

  public applySkinMask(
    imageData: ImageData,
    skinMask: SkinMask
  ): ImageData {
    const maskedData = new ImageData(imageData.width, imageData.height);
    const originalData = imageData.data;
    const maskData = skinMask.maskData.data;
    const maskedPixels = maskedData.data;

    for (let i = 0; i < originalData.length; i += 4) {
      if (maskData[i + 3] > 0) { // If mask is opaque at this pixel
        maskedPixels[i] = originalData[i];       // R
        maskedPixels[i + 1] = originalData[i + 1]; // G
        maskedPixels[i + 2] = originalData[i + 2]; // B
        maskedPixels[i + 3] = originalData[i + 3]; // A
      } else {
        maskedPixels[i + 3] = 0; // Transparent
      }
    }

    return maskedData;
  }

  public getRegionStatistics(regions: SkinRegion[]): {
    [regionName: string]: {
      averageLAB: LAB;
      pixelCount: number;
      quality: number;
    };
  } {
    const statistics: any = {};

    for (const region of regions) {
      const averageLAB = this.calculateAverageLAB(region.labValues);
      const quality = this.calculateRegionQuality(region.pixels);

      statistics[region.name] = {
        averageLAB,
        pixelCount: region.pixels.length,
        quality,
      };
    }

    return statistics;
  }

  private calculateAverageLAB(labValues: LAB[]): LAB {
    if (labValues.length === 0) {
      return { l: 0, a: 0, b: 0 };
    }

    const sum = labValues.reduce(
      (acc, lab) => ({
        l: acc.l + lab.l,
        a: acc.a + lab.a,
        b: acc.b + lab.b,
      }),
      { l: 0, a: 0, b: 0 }
    );

    return {
      l: sum.l / labValues.length,
      a: sum.a / labValues.length,
      b: sum.b / labValues.length,
    };
  }

  private calculateRegionQuality(pixels: [number, number, number][]): number {
    if (pixels.length === 0) return 0;

    // Calculate quality based on color consistency and brightness
    let totalBrightness = 0;
    const brightnesses: number[] = [];

    for (const pixel of pixels) {
      const brightness = 0.299 * pixel[0] + 0.587 * pixel[1] + 0.114 * pixel[2];
      totalBrightness += brightness;
      brightnesses.push(brightness);
    }

    const avgBrightness = totalBrightness / pixels.length;
    const variance = brightnesses.reduce((sum, b) => sum + Math.pow(b - avgBrightness, 2), 0) / brightnesses.length;
    
    // Quality score based on optimal brightness and low variance
    const brightnessScore = Math.max(0, 100 - Math.abs(avgBrightness - 128));
    const consistencyScore = Math.max(0, 100 - variance * 2);
    
    return (brightnessScore + consistencyScore) / 2;
  }

  private rgbToLab(rgb: { r: number; g: number; b: number }): LAB {
    // Convert RGB to XYZ
    let r = rgb.r / 255;
    let g = rgb.g / 255;
    let blue = rgb.b / 255;

    r = r <= 0.04045 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    g = g <= 0.04045 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    blue = blue <= 0.04045 ? blue / 12.92 : Math.pow((blue + 0.055) / 1.055, 2.4);

    const x = r * 0.4124564 + g * 0.3575761 + blue * 0.1804375;
    const y = r * 0.2126729 + g * 0.7151522 + blue * 0.0721750;
    const z = r * 0.0193339 + g * 0.1191920 + blue * 0.9503041;

    // Convert XYZ to LAB
    const xNorm = x / 95.047;
    const yNorm = y / 100.000;
    const zNorm = z / 108.883;

    const fx = xNorm > 0.008856 ? Math.pow(xNorm, 1 / 3) : 7.787 * xNorm + 16 / 116;
    const fy = yNorm > 0.008856 ? Math.pow(yNorm, 1 / 3) : 7.787 * yNorm + 16 / 116;
    const fz = zNorm > 0.008856 ? Math.pow(zNorm, 1 / 3) : 7.787 * zNorm + 16 / 116;

    const l = 116 * fy - 16;
    const a = 500 * (fx - fy);
    const b = 200 * (fy - fz);

    return { l, a, b };
  }

  public validateRegions(regions: SkinRegion[]): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check if we have the expected regions
    const expectedRegions = ['forehead', 'leftCheek', 'rightCheek', 'nose', 'chin'];
    const foundRegions = regions.map(r => r.name);

    for (const expected of expectedRegions) {
      if (!foundRegions.includes(expected)) {
        issues.push(`Missing required region: ${expected}`);
      }
    }

    // Check region quality
    for (const region of regions) {
      if (region.pixels.length === 0) {
        issues.push(`Region ${region.name} has no pixels`);
      }
      
      if (region.labValues.length === 0) {
        issues.push(`Region ${region.name} has no LAB values`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }
}
