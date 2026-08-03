// Color utilities for AI skin analysis

import { LAB, RGB, HSV } from '../lib/ai/computer-vision/colorConversion';
import { MathUtils } from './mathUtils';

export interface ColorPalette {
  name: string;
  colors: RGB[];
  description: string;
}

export interface ColorHarmony {
  type: 'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'tetradic';
  colors: RGB[];
}

export interface SkinColorProfile {
  dominantColor: RGB;
  secondaryColor: RGB;
  accentColor: RGB;
  neutralColor: RGB;
  warmth: number; // -100 (cool) to 100 (warm)
  brightness: number; // 0 to 100
  saturation: number; // 0 to 100
  contrast: number; // 0 to 100
}

export class ColorUtils {
  // Color conversion utilities
  public static labToRgb(lab: LAB): RGB {
    // Convert LAB to XYZ
    let y = (lab.l + 16) / 116;
    let x = lab.a / 500 + y;
    let z = y - lab.b / 200;

    x = x * x * x > 0.008856 ? x * x * x : (x - 16 / 116) / 7.787;
    y = y * y * y > 0.008856 ? y * y * y : (y - 16 / 116) / 7.787;
    z = z * z * z > 0.008856 ? z * z * z : (z - 16 / 116) / 7.787;

    // Convert XYZ to RGB (D65)
    x = x * 95.047;
    y = y * 100.000;
    z = z * 108.883;

    let r = x * 3.2404542 - y * 1.5371385 - z * 0.4985314;
    let g = -x * 0.9692660 + y * 1.8760108 + z * 0.0415560;
    let b = x * 0.0556434 - y * 0.2040259 + z * 1.0572252;

    // Apply gamma correction
    r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
    g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
    b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;

    return {
      r: Math.round(MathUtils.clamp(r * 255, 0, 255)),
      g: Math.round(MathUtils.clamp(g * 255, 0, 255)),
      b: Math.round(MathUtils.clamp(b * 255, 0, 255)),
    };
  }

  public static rgbToLab(rgb: RGB): LAB {
    // Immediate null-check to prevent crashes
    if (!rgb || typeof rgb.r === 'undefined' || typeof rgb.g === 'undefined' || typeof rgb.b === 'undefined') {
      console.warn("Invalid RGB input to rgbToLab:", rgb);
      return { l: 0, a: 0, b: 0 }; // Return default LAB values
    }
    
    // Validate RGB values are numbers and not NaN
    const rNorm = typeof rgb.r === 'number' && !isNaN(rgb.r) ? rgb.r : 0;
    const gNorm = typeof rgb.g === 'number' && !isNaN(rgb.g) ? rgb.g : 0;
    const bNorm = typeof rgb.b === 'number' && !isNaN(rgb.b) ? rgb.b : 0;
    
    // Convert RGB to XYZ
    let r = rNorm / 255;
    let g = gNorm / 255;
    let b = bNorm / 255;

    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    let x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
    let y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
    let z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;

    // Convert XYZ to LAB
    x = x / 95.047;
    y = y / 100.000;
    z = z / 108.883;

    x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
    y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
    z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;

    return {
      l: 116 * y - 16,
      a: 500 * (x - y),
      b: 200 * (y - z),
    };
  }

  public static rgbToHsv(rgb: RGB): HSV {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    let s = max === 0 ? 0 : diff / max;
    let v = max;

    if (diff !== 0) {
      switch (max) {
        case r:
          h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / diff + 2) / 6;
          break;
        case b:
          h = ((r - g) / diff + 4) / 6;
          break;
      }
    }

    return {
      h: h * 360,
      s: s * 100,
      v: v * 100,
    };
  }

  public static hsvToRgb(hsv: HSV): RGB {
    const h = hsv.h / 360;
    const s = hsv.s / 100;
    const v = hsv.v / 100;

    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    let r = 0, g = 0, b = 0;

    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }

  // Color analysis utilities
  public static analyzeColorProfile(colors: RGB[]): SkinColorProfile {
    if (colors.length === 0) {
      return {
        dominantColor: { r: 128, g: 128, b: 128 },
        secondaryColor: { r: 128, g: 128, b: 128 },
        accentColor: { r: 128, g: 128, b: 128 },
        neutralColor: { r: 128, g: 128, b: 128 },
        warmth: 0,
        brightness: 50,
        saturation: 50,
        contrast: 50,
      };
    }

    // Convert to LAB for better analysis
    const labColors = colors.map(color => this.rgbToLab(color));

    // Find dominant color (most common)
    const dominantLab = this.findDominantColor(labColors);
    const dominantRgb = this.labToRgb(dominantLab);

    // Find secondary color (second most common)
    const secondaryLab = this.findSecondaryColor(labColors, dominantLab);
    const secondaryRgb = this.labToRgb(secondaryLab);

    // Find accent color (most different from dominant)
    const accentLab = this.findAccentColor(labColors, dominantLab);
    const accentRgb = this.labToRgb(accentLab);

    // Calculate neutral color (average)
    const neutralLab = this.calculateAverageLab(labColors);
    const neutralRgb = this.labToRgb(neutralLab);

    // Calculate color properties
    const warmth = this.calculateWarmness(neutralLab);
    const brightness = neutralLab.l;
    const saturation = Math.sqrt(neutralLab.a * neutralLab.a + neutralLab.b * neutralLab.b);
    const contrast = this.calculateContrast(labColors);

    return {
      dominantColor: dominantRgb,
      secondaryColor: secondaryRgb,
      accentColor: accentRgb,
      neutralColor: neutralRgb,
      warmth,
      brightness,
      saturation,
      contrast,
    };
  }

  private static findDominantColor(colors: LAB[]): LAB {
    // Simple clustering to find the most common color
    const clusters = this.clusterColors(colors, 5);
    return clusters.reduce((largest, cluster) => 
      cluster.colors.length > largest.colors.length ? cluster : largest
    ).center;
  }

  private static findSecondaryColor(colors: LAB[], dominant: LAB): LAB {
    const clusters = this.clusterColors(colors, 5);
    const dominantCluster = clusters.find(cluster => 
      this.colorDistance(cluster.center, dominant) < 10
    );
    
    const otherClusters = clusters.filter(cluster => cluster !== dominantCluster);
    if (otherClusters.length === 0) return dominant;
    
    return otherClusters.reduce((largest, cluster) => 
      cluster.colors.length > largest.colors.length ? cluster : largest
    ).center;
  }

  private static findAccentColor(colors: LAB[], dominant: LAB): LAB {
    return colors.reduce((mostDifferent, color) => {
      const currentDistance = this.colorDistance(color, dominant);
      const maxDistance = this.colorDistance(mostDifferent, dominant);
      return currentDistance > maxDistance ? color : mostDifferent;
    });
  }

  private static calculateAverageLab(colors: LAB[]): LAB {
    const sum = colors.reduce((acc, color) => ({
      l: acc.l + color.l,
      a: acc.a + color.a,
      b: acc.b + color.b,
    }), { l: 0, a: 0, b: 0 });

    return {
      l: sum.l / colors.length,
      a: sum.a / colors.length,
      b: sum.b / colors.length,
    };
  }

  private static calculateWarmness(lab: LAB): number {
    // Warmness based on A and B channels
    // Positive A = red, Positive B = yellow
    return MathUtils.clamp((lab.a + lab.b) / 2, -100, 100);
  }

  private static calculateContrast(colors: LAB[]): number {
    if (colors.length < 2) return 0;

    let maxDistance = 0;
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const distance = this.colorDistance(colors[i], colors[j]);
        maxDistance = Math.max(maxDistance, distance);
      }
    }

    return MathUtils.clamp(maxDistance / 100 * 100, 0, 100);
  }

  private static colorDistance(color1: LAB, color2: LAB): number {
    const dl = color1.l - color2.l;
    const da = color1.a - color2.a;
    const db = color1.b - color2.b;
    return Math.sqrt(dl * dl + da * da + db * db);
  }

  private static clusterColors(colors: LAB[], numClusters: number): Array<{ center: LAB; colors: LAB[] }> {
    // Simple k-means clustering
    if (colors.length <= numClusters) {
      return colors.map(color => ({ center: color, colors: [color] }));
    }

    // Initialize centroids
    const centroids: LAB[] = [];
    for (let i = 0; i < numClusters; i++) {
      centroids.push(colors[Math.floor(Math.random() * colors.length)]);
    }

    // K-means iterations
    for (let iteration = 0; iteration < 10; iteration++) {
      const clusters: Array<{ center: LAB; colors: LAB[] }> = centroids.map(center => ({
        center,
        colors: [],
      }));

      // Assign colors to nearest centroid
      for (const color of colors) {
        let minDistance = Infinity;
        let nearestCluster = 0;

        for (let i = 0; i < centroids.length; i++) {
          const distance = this.colorDistance(color, centroids[i]);
          if (distance < minDistance) {
            minDistance = distance;
            nearestCluster = i;
          }
        }

        clusters[nearestCluster].colors.push(color);
      }

      // Update centroids
      for (let i = 0; i < clusters.length; i++) {
        if (clusters[i].colors.length > 0) {
          centroids[i] = this.calculateAverageLab(clusters[i].colors);
        }
      }
    }

    // Final assignment
    const finalClusters: Array<{ center: LAB; colors: LAB[] }> = centroids.map(center => ({
      center,
      colors: [],
    }));

    for (const color of colors) {
      let minDistance = Infinity;
      let nearestCluster = 0;

      for (let i = 0; i < centroids.length; i++) {
        const distance = this.colorDistance(color, centroids[i]);
        if (distance < minDistance) {
          minDistance = distance;
          nearestCluster = i;
        }
      }

      finalClusters[nearestCluster].colors.push(color);
    }

    return finalClusters;
  }

  // Color harmony utilities
  public static getColorHarmony(baseColor: RGB, type: ColorHarmony['type']): ColorHarmony {
    const hsv = this.rgbToHsv(baseColor);
    const colors: RGB[] = [];

    switch (type) {
      case 'complementary':
        colors.push(baseColor);
        colors.push(this.hsvToRgb({ h: (hsv.h + 180) % 360, s: hsv.s, v: hsv.v }));
        break;

      case 'analogous':
        colors.push(baseColor);
        colors.push(this.hsvToRgb({ h: (hsv.h + 30) % 360, s: hsv.s, v: hsv.v }));
        colors.push(this.hsvToRgb({ h: (hsv.h - 30 + 360) % 360, s: hsv.s, v: hsv.v }));
        break;

      case 'triadic':
        colors.push(baseColor);
        colors.push(this.hsvToRgb({ h: (hsv.h + 120) % 360, s: hsv.s, v: hsv.v }));
        colors.push(this.hsvToRgb({ h: (hsv.h + 240) % 360, s: hsv.s, v: hsv.v }));
        break;

      case 'split-complementary':
        colors.push(baseColor);
        colors.push(this.hsvToRgb({ h: (hsv.h + 150) % 360, s: hsv.s, v: hsv.v }));
        colors.push(this.hsvToRgb({ h: (hsv.h + 210) % 360, s: hsv.s, v: hsv.v }));
        break;

      case 'tetradic':
        colors.push(baseColor);
        colors.push(this.hsvToRgb({ h: (hsv.h + 90) % 360, s: hsv.s, v: hsv.v }));
        colors.push(this.hsvToRgb({ h: (hsv.h + 180) % 360, s: hsv.s, v: hsv.v }));
        colors.push(this.hsvToRgb({ h: (hsv.h + 270) % 360, s: hsv.s, v: hsv.v }));
        break;
    }

    return { type, colors };
  }

  // Makeup color recommendations
  public static getMakeupRecommendations(skinProfile: SkinColorProfile): {
    foundation: RGB[];
    blush: RGB[];
    lipstick: RGB[];
    eyeshadow: RGB[];
  } {
    const recommendations = {
      foundation: this.getFoundationColors(skinProfile),
      blush: this.getBlushColors(skinProfile),
      lipstick: this.getLipstickColors(skinProfile),
      eyeshadow: this.getEyeshadowColors(skinProfile),
    };

    return recommendations;
  }

  private static getFoundationColors(profile: SkinColorProfile): RGB[] {
    const baseColor = profile.neutralColor;
    const colors: RGB[] = [];

    // Create foundation shades that match the skin tone
    for (let i = -2; i <= 2; i++) {
      const lab = this.rgbToLab(baseColor);
      const adjustedLab = {
        l: MathUtils.clamp(lab.l + i * 2, 0, 100),
        a: lab.a,
        b: lab.b,
      };
      colors.push(this.labToRgb(adjustedLab));
    }

    return colors;
  }

  private static getBlushColors(profile: SkinColorProfile): RGB[] {
    const colors: RGB[] = [];
    const warmth = profile.warmth;

    if (warmth > 20) {
      // Warm undertones - peach, coral colors
      colors.push({ r: 255, g: 182, b: 193 }); // Light peach
      colors.push({ r: 255, g: 160, b: 122 }); // Coral
      colors.push({ r: 255, g: 140, b: 90 });  // Deep coral
    } else if (warmth < -20) {
      // Cool undertones - pink, rose colors
      colors.push({ r: 255, g: 182, b: 193 }); // Light pink
      colors.push({ r: 255, g: 160, b: 180 }); // Rose
      colors.push({ r: 255, g: 140, b: 170 }); // Deep rose
    } else {
      // Neutral undertones - mix of warm and cool
      colors.push({ r: 255, g: 182, b: 193 }); // Neutral pink
      colors.push({ r: 255, g: 170, b: 150 }); // Muted peach
      colors.push({ r: 255, g: 150, b: 160 }); // Muted rose
    }

    return colors;
  }

  private static getLipstickColors(profile: SkinColorProfile): RGB[] {
    const colors: RGB[] = [];
    const warmth = profile.warmth;
    const brightness = profile.brightness;

    if (warmth > 20) {
      // Warm undertones
      colors.push({ r: 255, g: 100, b: 100 });  // Warm red
      colors.push({ r: 255, g: 120, b: 100 }); // Coral
      colors.push({ r: 200, g: 100, b: 80 });  // Terracotta
    } else if (warmth < -20) {
      // Cool undertones
      colors.push({ r: 200, g: 60, b: 120 });  // Cool red
      colors.push({ r: 180, g: 80, b: 140 });  // Berry
      colors.push({ r: 160, g: 60, b: 120 });  // Deep berry
    } else {
      // Neutral undertones
      colors.push({ r: 210, g: 70, b: 110 });  // Classic red
      colors.push({ r: 190, g: 90, b: 120 });  // Rose
      colors.push({ r: 180, g: 80, b: 100 });  // Muted red
    }

    return colors;
  }

  private static getEyeshadowColors(profile: SkinColorProfile): RGB[] {
    const colors: RGB[] = [];
    const warmth = profile.warmth;

    if (warmth > 20) {
      // Warm undertones - bronze, gold, copper
      colors.push({ r: 205, g: 133, b: 63 });  // Bronze
      colors.push({ r: 255, g: 215, b: 0 });  // Gold
      colors.push({ r: 184, g: 115, b: 51 });  // Copper
    } else if (warmth < -20) {
      // Cool undertones - silver, blue, purple
      colors.push({ r: 192, g: 192, b: 192 }); // Silver
      colors.push({ r: 147, g: 112, b: 219 }); // Purple
      colors.push({ r: 100, g: 149, b: 237 }); // Blue
    } else {
      // Neutral undertones - taupe, brown, gray
      colors.push({ r: 188, g: 170, b: 152 }); // Taupe
      colors.push({ r: 139, g: 90, b: 43 });   // Brown
      colors.push({ r: 128, g: 128, b: 128 }); // Gray
    }

    return colors;
  }

  // Color validation and correction
  public static isValidRGB(color: RGB): boolean {
    return color.r >= 0 && color.r <= 255 &&
           color.g >= 0 && color.g <= 255 &&
           color.b >= 0 && color.b <= 255;
  }

  public static isValidLAB(color: LAB): boolean {
    return color.l >= 0 && color.l <= 100 &&
           color.a >= -128 && color.a <= 127 &&
           color.b >= -128 && color.b <= 127;
  }

  public static correctColor(color: RGB): RGB {
    return {
      r: MathUtils.clamp(color.r, 0, 255),
      g: MathUtils.clamp(color.g, 0, 255),
      b: MathUtils.clamp(color.b, 0, 255),
    };
  }

  public static enhanceColor(color: RGB, options: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
  } = {}): RGB {
    const { brightness = 0, contrast = 0, saturation = 0 } = options;
    
    let hsv = this.rgbToHsv(color);
    
    // Adjust brightness
    hsv.v = MathUtils.clamp(hsv.v + brightness, 0, 100);
    
    // Adjust saturation
    hsv.s = MathUtils.clamp(hsv.s + saturation, 0, 100);
    
    let rgb = this.hsvToRgb(hsv);
    
    // Adjust contrast
    if (contrast !== 0) {
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      rgb = {
        r: MathUtils.clamp(factor * (rgb.r - 128) + 128, 0, 255),
        g: MathUtils.clamp(factor * (rgb.g - 128) + 128, 0, 255),
        b: MathUtils.clamp(factor * (rgb.b - 128) + 128, 0, 255),
      };
    }
    
    return rgb;
  }

  // Color difference and similarity
  public static colorDifference(color1: RGB, color2: RGB): number {
    const lab1 = this.rgbToLab(color1);
    const lab2 = this.rgbToLab(color2);
    return this.colorDistance(lab1, lab2);
  }

  public static areColorsSimilar(color1: RGB, color2: RGB, threshold: number = 10): boolean {
    return this.colorDifference(color1, color2) < threshold;
  }

  public static findClosestColor(target: RGB, palette: RGB[]): RGB {
    if (palette.length === 0) return target;
    
    return palette.reduce((closest, color) => {
      const currentDistance = this.colorDifference(target, color);
      const closestDistance = this.colorDifference(target, closest);
      return currentDistance < closestDistance ? color : closest;
    });
  }

  // Color palette generation
  public static generateColorPalette(baseColor: RGB, numColors: number): ColorPalette {
    const colors: RGB[] = [];
    const baseHsv = this.rgbToHsv(baseColor);
    
    for (let i = 0; i < numColors; i++) {
      const hueShift = (i * 360) / numColors;
      const newHsv = {
        h: (baseHsv.h + hueShift) % 360,
        s: baseHsv.s,
        v: baseHsv.v,
      };
      colors.push(this.hsvToRgb(newHsv));
    }
    
    return {
      name: `Generated Palette (${numColors} colors)`,
      colors,
      description: `Color palette based on RGB(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`,
    };
  }

  public static getSeasonalPalette(season: 'spring' | 'summer' | 'autumn' | 'winter'): ColorPalette {
    const palettes: Record<string, ColorPalette> = {
      spring: {
        name: 'Spring Palette',
        colors: [
          { r: 255, g: 182, b: 193 }, // Light pink
          { r: 255, g: 218, b: 185 }, // Peach
          { r: 144, g: 238, b: 144 }, // Light green
          { r: 255, g: 255, b: 224 }, // Light yellow
        ],
        description: 'Fresh, bright colors inspired by spring',
      },
      summer: {
        name: 'Summer Palette',
        colors: [
          { r: 135, g: 206, b: 235 }, // Sky blue
          { r: 255, g: 182, b: 193 }, // Light pink
          { r: 176, g: 224, b: 230 }, // Powder blue
          { r: 221, g: 160, b: 221 }, // Plum
        ],
        description: 'Cool, soft colors inspired by summer',
      },
      autumn: {
        name: 'Autumn Palette',
        colors: [
          { r: 255, g: 140, b: 0 },   // Dark orange
          { r: 184, g: 134, b: 11 },  // Dark yellow
          { r: 139, g: 69, b: 19 },    // Saddle brown
          { r: 205, g: 92, b: 92 },    // Indian red
        ],
        description: 'Warm, earthy colors inspired by autumn',
      },
      winter: {
        name: 'Winter Palette',
        colors: [
          { r: 70, g: 130, b: 180 },   // Steel blue
          { r: 128, g: 0, b: 128 },    // Purple
          { r: 0, g: 0, b: 139 },      // Dark blue
          { r: 255, g: 255, b: 255 },  // White
        ],
        description: 'Cool, dramatic colors inspired by winter',
      },
    };
    
    return palettes[season];
  }
}
