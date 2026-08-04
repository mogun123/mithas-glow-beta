export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface XYZ {
  x: number;
  y: number;
  z: number;
}

export interface LAB {
  l: number;
  a: number;
  b: number;
}

export interface HSV {
  h: number;
  s: number;
  v: number;
}

export class ColorConversion {
  // RGB to XYZ conversion
  public static rgbToXYZ(rgb: RGB): XYZ {
    // STRICT INPUT VALIDATION: Prevent NaN and overflow
    if (!Number.isFinite(rgb.r) || !Number.isFinite(rgb.g) || !Number.isFinite(rgb.b)) {
      throw new Error("CLINICAL_ERROR: Invalid RGB input to rgbToXYZ conversion");
    }
    
    // Clamp RGB values to valid range before processing
    rgb.r = Math.max(0, Math.min(255, rgb.r));
    rgb.g = Math.max(0, Math.min(255, rgb.g));
    rgb.b = Math.max(0, Math.min(255, rgb.b));

    // Normalize RGB values to 0-1 range
    let r = rgb.r / 255;
    let g = rgb.g / 255;
    let b = rgb.b / 255;

    // Apply gamma correction
    r = r <= 0.04045 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    g = g <= 0.04045 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    b = b <= 0.04045 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    // Convert to XYZ using sRGB transformation matrix
    const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
    const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
    const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;

    return { x, y, z };
  }

  // XYZ to RGB conversion
  public static xyzToRGB(xyz: XYZ): RGB {
    // Convert XYZ to linear RGB using inverse sRGB transformation matrix
    let r = xyz.x * 3.2404542 + xyz.y * -1.5371385 + xyz.z * -0.4985314;
    let g = xyz.x * -0.9692660 + xyz.y * 1.8760108 + xyz.z * 0.0415560;
    let b = xyz.x * 0.0556434 + xyz.y * -0.2040259 + xyz.z * 1.0572252;

    // Apply inverse gamma correction
    r = r <= 0.0031308 ? r * 12.92 : 1.055 * Math.pow(r, 1 / 2.4) - 0.055;
    g = g <= 0.0031308 ? g * 12.92 : 1.055 * Math.pow(g, 1 / 2.4) - 0.055;
    b = b <= 0.0031308 ? b * 12.92 : 1.055 * Math.pow(b, 1 / 2.4) - 0.055;

    // Convert to 0-255 range and clamp
    return {
      r: Math.max(0, Math.min(255, Math.round(r * 255))),
      g: Math.max(0, Math.min(255, Math.round(g * 255))),
      b: Math.max(0, Math.min(255, Math.round(b * 255))),
    };
  }

  // RGB to LAB conversion
  public static rgbToLAB(rgb: RGB): LAB {
    const xyz = ColorConversion.rgbToXYZ(rgb);
    return ColorConversion.xyzToLAB(xyz);
  }

  // LAB to RGB conversion
  public static labToRGB(lab: LAB): RGB {
    const xyz = ColorConversion.labToXYZ(lab);
    return ColorConversion.xyzToRGB(xyz);
  }

  // XYZ to LAB conversion
  public static xyzToLAB(xyz: XYZ): LAB {
    // Normalize XYZ values relative to D65 white point
    const x = xyz.x / 95.047;
    const y = xyz.y / 100.000;
    const z = xyz.z / 108.883;

    // Apply LAB transformation
    const fx = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
    const fy = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
    const fz = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;

    const l = 116 * fy - 16;
    const a = 500 * (fx - fy);
    const b = 200 * (fy - fz);

    return { l, a, b };
  }

  // LAB to XYZ conversion
  public static labToXYZ(lab: LAB): XYZ {
    const fy = (lab.l + 16) / 116;
    const fx = lab.a / 500 + fy;
    const fz = fy - lab.b / 200;

    const x = Math.pow(fx, 3) > 0.008856 ? Math.pow(fx, 3) : (fx - 16 / 116) / 7.787;
    const y = Math.pow(fy, 3) > 0.008856 ? Math.pow(fy, 3) : (fy - 16 / 116) / 7.787;
    const z = Math.pow(fz, 3) > 0.008856 ? Math.pow(fz, 3) : (fz - 16 / 116) / 7.787;

    return {
      x: x * 95.047,
      y: y * 100.000,
      z: z * 108.883,
    };
  }

  // RGB to HSV conversion
  public static rgbToHSV(rgb: RGB): HSV {
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

  // HSV to RGB conversion
  public static hsvToRGB(hsv: HSV): RGB {
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

  // Calculate color difference in LAB space (Delta E)
  public static deltaE2000(lab1: LAB, lab2: LAB): number {
    const l1 = lab1.l;
    const a1 = lab1.a;
    const b1 = lab1.b;
    const l2 = lab2.l;
    const a2 = lab2.a;
    const b2 = lab2.b;

    const avgL = (l1 + l2) / 2;
    const c1 = Math.sqrt(a1 * a1 + b1 * b1);
    const c2 = Math.sqrt(a2 * a2 + b2 * b2);
    const avgC = (c1 + c2) / 2;

    const g = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));
    const a1Prime = a1 * (1 + g);
    const a2Prime = a2 * (1 + g);

    const c1Prime = Math.sqrt(a1Prime * a1Prime + b1 * b1);
    const c2Prime = Math.sqrt(a2Prime * a2Prime + b2 * b2);
    const avgCPrime = (c1Prime + c2Prime) / 2;

    const h1Prime = Math.atan2(b1, a1Prime) * (180 / Math.PI);
    const h2Prime = Math.atan2(b2, a2Prime) * (180 / Math.PI);

    const avgHPrime = Math.abs(h1Prime - h2Prime) <= 180 ? 
      (h1Prime + h2Prime) / 2 : 
      (h1Prime + h2Prime + 360) / 2;

    const t = 1 - 0.17 * Math.cos((avgHPrime - 30) * Math.PI / 180) +
              0.24 * Math.cos(2 * avgHPrime * Math.PI / 180) +
              0.32 * Math.cos((3 * avgHPrime + 6) * Math.PI / 180) -
              0.20 * Math.cos((4 * avgHPrime - 63) * Math.PI / 180);

    const deltaLPrime = l2 - l1;
    const deltaCPrime = c2Prime - c1Prime;
    const deltaHPrime = h2Prime - h1Prime;

    const deltaH = Math.abs(h2Prime - h1Prime) <= 180 ?
      deltaHPrime :
      deltaHPrime - 360 * Math.sign(deltaHPrime);

    const sl = 1 + (0.015 * Math.pow(avgL - 50, 2)) / Math.sqrt(20 + Math.pow(avgL - 50, 2));
    const sc = 1 + 0.045 * avgCPrime;
    const sh = 1 + 0.015 * avgCPrime * t;

    const deltaTheta = 30 * Math.exp(-Math.pow((avgHPrime - 275) / 25, 2));
    const rc = 2 * Math.sqrt(Math.pow(avgCPrime, 7) / (Math.pow(avgCPrime, 7) + Math.pow(25, 7)));
    const rt = -Math.sin(2 * deltaTheta * Math.PI / 180) * rc;

    const kl = 1;
    const kc = 1;
    const kh = 1;

    const deltaE = Math.sqrt(
      Math.pow(deltaLPrime / (kl * sl), 2) +
      Math.pow(deltaCPrime / (kc * sc), 2) +
      Math.pow(deltaH / (kh * sh), 2) +
      rt * (deltaCPrime / (kc * sc)) * (deltaH / (kh * sh))
    );

    return deltaE;
  }

  // Simple Delta E (CIE76) for faster calculations
  public static deltaE76(lab1: LAB, lab2: LAB): number {
    const deltaL = lab1.l - lab2.l;
    const deltaA = lab1.a - lab2.a;
    const deltaB = lab1.b - lab2.b;
    
    return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
  }

  // Convert RGB array to LAB array
  public static batchRGBToLAB(rgbValues: RGB[]): LAB[] {
    return rgbValues.map(rgb => ColorConversion.rgbToLAB(rgb));
  }

  // Convert LAB array to RGB array
  public static batchLABToRGB(labValues: LAB[]): RGB[] {
    return labValues.map(lab => ColorConversion.labToRGB(lab));
  }

  // Clamp LAB values to valid ranges
  public static clampLAB(lab: LAB): LAB {
    return {
      l: Math.max(0, Math.min(100, lab.l)),
      a: Math.max(-128, Math.min(127, lab.a)),
      b: Math.max(-128, Math.min(127, lab.b)),
    };
  }

  // Check if LAB values are valid
  public static isValidLAB(lab: LAB): boolean {
    return lab.l >= 0 && lab.l <= 100 &&
           lab.a >= -128 && lab.a <= 127 &&
           lab.b >= -128 && lab.b <= 127;
  }

  // Static method from MirrorScreen component scope - preserves D65 illuminant constants and pivot math
  public static labToRgb(
    l: number,
    a: number,
    bValue: number
  ): { r: number; g: number; b: number } {
    if (isNaN(l) || isNaN(a) || isNaN(bValue))
      throw new Error(`labToRgb: invalid input l=${l} a=${a} b=${bValue}`);

    const fy = (l + 16) / 116;
    const fx = fy + a / 500;
    const fz = fy - bValue / 200;

    const f = (t: number) => {
      const t3 = t * t * t;
      return t3 > 0.008856 ? t3 : (t - 16 / 116) / 7.787;
    };

    let X = f(fx) * 0.95047;
    let Y = f(fy) * 1.0;
    let Z = f(fz) * 1.08883;

    const pivot = (c: number) =>
      c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;

    const r = 255 * pivot(3.2406 * X - 1.5372 * Y - 0.4986 * Z);
    const g = 255 * pivot(-0.9689 * X + 1.8758 * Y + 0.0415 * Z);
    const b = 255 * pivot(0.0557 * X - 0.204 * Y + 1.057 * Z);

    return {
      r: Math.max(0, Math.min(255, r)),
      g: Math.max(0, Math.min(255, g)),
      b: Math.max(0, Math.min(255, b)),
    };
  }

  // Static method from MirrorScreen component scope - preserves component version logic
  public static rgbToLABComponent(
    r: number,
    g: number,
    b: number
  ): { l: number; a: number; b: number } {
    if (isNaN(r) || isNaN(g) || isNaN(b))
      throw new Error(`rgbToLAB: invalid input r=${r} g=${g} b=${b}`);

    const pivot = (c: number) =>
      c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
    const R = pivot(r / 255);
    const G = pivot(g / 255);
    const B = pivot(b / 255);

    let X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
    let Y = (R * 0.2126 + G * 0.7152 + B * 0.0722) / 1.0;
    let Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;

    const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const fx = f(X),
      fy = f(Y),
      fz = f(Z);

    return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
  }

  // Static method from MirrorScreen component scope - computes average LAB from pixel array
  public static computeAvgLAB(
    pixels: Array<{ r: number; g: number; b: number }>
  ): { l: number; a: number; b: number } | null {
    const valid = pixels.filter(
      (p) =>
        p &&
        typeof p.r === "number" &&
        typeof p.g === "number" &&
        typeof p.b === "number" &&
        !isNaN(p.r) &&
        !isNaN(p.g) &&
        !isNaN(p.b) &&
        p.r >= 0 &&
        p.r <= 255
    );
    if (valid.length < 10) return null;

    const sum = valid.reduce(
      (acc, p) => ({ r: acc.r + p.r, g: acc.g + p.g, b: acc.b + p.b }),
      { r: 0, g: 0, b: 0 }
    );
    return ColorConversion.rgbToLABComponent(
      sum.r / valid.length,
      sum.g / valid.length,
      sum.b / valid.length
    );
  }
}
