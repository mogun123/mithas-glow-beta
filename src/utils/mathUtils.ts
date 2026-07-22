// Mathematical utilities for AI skin analysis

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Vector2D {
  dx: number;
  dy: number;
}

export interface Vector3D {
  dx: number;
  dy: number;
  dz: number;
}

export class MathUtils {
  // Basic mathematical operations
  public static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  public static lerp(start: number, end: number, t: number): number {
    return start + (end - start) * this.clamp(t, 0, 1);
  }

  public static smoothstep(edge0: number, edge1: number, x: number): number {
    const t = this.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  public static normalize(value: number, min: number, max: number): number {
    return (value - min) / (max - min);
  }

  public static map(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    return this.lerp(outMin, outMax, this.normalize(value, inMin, inMax));
  }

  // Distance calculations
  public static distance2D(p1: Point2D, p2: Point2D): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public static distance3D(p1: Point3D, p2: Point3D): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  public static manhattanDistance2D(p1: Point2D, p2: Point2D): number {
    return Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y);
  }

  public static chebyshevDistance2D(p1: Point2D, p2: Point2D): number {
    return Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
  }

  // Vector operations
  public static vector2D(from: Point2D, to: Point2D): Vector2D {
    return {
      dx: to.x - from.x,
      dy: to.y - from.y,
    };
  }

  public static vector3D(from: Point3D, to: Point3D): Vector3D {
    return {
      dx: to.x - from.x,
      dy: to.y - from.y,
      dz: to.z - from.z,
    };
  }

  public static vectorMagnitude2D(vector: Vector2D): number {
    return Math.sqrt(vector.dx * vector.dx + vector.dy * vector.dy);
  }

  public static vectorMagnitude3D(vector: Vector3D): number {
    return Math.sqrt(vector.dx * vector.dx + vector.dy * vector.dy + vector.dz * vector.dz);
  }

  public static normalizeVector2D(vector: Vector2D): Vector2D {
    const magnitude = this.vectorMagnitude2D(vector);
    if (magnitude === 0) return { dx: 0, dy: 0 };
    
    return {
      dx: vector.dx / magnitude,
      dy: vector.dy / magnitude,
    };
  }

  public static normalizeVector3D(vector: Vector3D): Vector3D {
    const magnitude = this.vectorMagnitude3D(vector);
    if (magnitude === 0) return { dx: 0, dy: 0, dz: 0 };
    
    return {
      dx: vector.dx / magnitude,
      dy: vector.dy / magnitude,
      dz: vector.dz / magnitude,
    };
  }

  public static dotProduct2D(v1: Vector2D, v2: Vector2D): number {
    return v1.dx * v2.dx + v1.dy * v2.dy;
  }

  public static dotProduct3D(v1: Vector3D, v2: Vector3D): number {
    return v1.dx * v2.dx + v1.dy * v2.dy + v1.dz * v2.dz;
  }

  public static crossProduct2D(v1: Vector2D, v2: Vector2D): number {
    return v1.dx * v2.dy - v1.dy * v2.dx;
  }

  public static crossProduct3D(v1: Vector3D, v2: Vector3D): Vector3D {
    return {
      dx: v1.dy * v2.dz - v1.dz * v2.dy,
      dy: v1.dz * v2.dx - v1.dx * v2.dz,
      dz: v1.dx * v2.dy - v1.dy * v2.dx,
    };
  }

  // Angle calculations
  public static angleBetweenVectors2D(v1: Vector2D, v2: Vector2D): number {
    const dot = this.dotProduct2D(v1, v2);
    const mag1 = this.vectorMagnitude2D(v1);
    const mag2 = this.vectorMagnitude2D(v2);
    
    if (mag1 === 0 || mag2 === 0) return 0;
    
    return Math.acos(this.clamp(dot / (mag1 * mag2), -1, 1));
  }

  public static angleBetweenPoints2D(p1: Point2D, p2: Point2D, p3: Point2D): number {
    const v1 = this.vector2D(p2, p1);
    const v2 = this.vector2D(p2, p3);
    return this.angleBetweenVectors2D(v1, v2);
  }

  public static degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  public static radiansToDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  // Geometry operations
  public static pointInCircle(point: Point2D, center: Point2D, radius: number): boolean {
    return this.distance2D(point, center) <= radius;
  }

  public static pointInRectangle(point: Point2D, rect: { x: number; y: number; width: number; height: number }): boolean {
    return point.x >= rect.x && 
           point.x <= rect.x + rect.width &&
           point.y >= rect.y && 
           point.y <= rect.y + rect.height;
  }

  public static pointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      
      const intersect = ((yi > point.y) !== (yj > point.y))
          && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }
    
    return inside;
  }

  public static closestPointOnLine(point: Point2D, lineStart: Point2D, lineEnd: Point2D): Point2D {
    const lineVec = this.vector2D(lineStart, lineEnd);
    const pointVec = this.vector2D(lineStart, point);
    
    const lineLengthSq = this.dotProduct2D(lineVec, lineVec);
    if (lineLengthSq === 0) return lineStart;
    
    const t = this.clamp(this.dotProduct2D(pointVec, lineVec) / lineLengthSq, 0, 1);
    
    return {
      x: lineStart.x + lineVec.dx * t,
      y: lineStart.y + lineVec.dy * t,
    };
  }

  public static distanceToLine(point: Point2D, lineStart: Point2D, lineEnd: Point2D): number {
    const closest = this.closestPointOnLine(point, lineStart, lineEnd);
    return this.distance2D(point, closest);
  }

  // Statistical operations
  public static mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  public static median(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      return sorted[mid];
    }
  }

  public static variance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = this.mean(values);
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return this.mean(squaredDiffs);
  }

  public static standardDeviation(values: number[]): number {
    return Math.sqrt(this.variance(values));
  }

  public static percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    
    if (Number.isInteger(index)) {
      return sorted[index];
    } else {
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index - lower;
      return this.lerp(sorted[lower], sorted[upper], weight);
    }
  }

  public static trimmedMean(values: number[], trimPercent: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const trimCount = Math.floor(values.length * trimPercent);
    
    const trimmed = sorted.slice(trimCount, values.length - trimCount);
    return this.mean(trimmed);
  }

  // Interpolation and smoothing
  public static interpolateArray(values: number[], targetLength: number): number[] {
    if (values.length === 0) return [];
    if (values.length === 1) return Array(targetLength).fill(values[0]);
    
    const result: number[] = [];
    const step = (values.length - 1) / (targetLength - 1);
    
    for (let i = 0; i < targetLength; i++) {
      const index = i * step;
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index - lower;
      
      if (lower === upper) {
        result.push(values[lower]);
      } else {
        result.push(this.lerp(values[lower], values[upper], weight));
      }
    }
    
    return result;
  }

  public static smoothArray(values: number[], windowSize: number): number[] {
    if (values.length === 0 || windowSize < 1) return values;
    
    const result: number[] = [];
    const halfWindow = Math.floor(windowSize / 2);
    
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - halfWindow);
      const end = Math.min(values.length - 1, i + halfWindow);
      const window = values.slice(start, end + 1);
      result.push(this.mean(window));
    }
    
    return result;
  }

  public static gaussianWeight(x: number, sigma: number): number {
    return Math.exp(-(x * x) / (2 * sigma * sigma));
  }

  public static gaussianBlur(values: number[], sigma: number): number[] {
    if (values.length === 0 || sigma <= 0) return values;
    
    const result: number[] = [];
    const kernelSize = Math.ceil(sigma * 3);
    
    for (let i = 0; i < values.length; i++) {
      let weightedSum = 0;
      let weightSum = 0;
      
      for (let j = -kernelSize; j <= kernelSize; j++) {
        const index = i + j;
        if (index >= 0 && index < values.length) {
          const weight = this.gaussianWeight(j, sigma);
          weightedSum += values[index] * weight;
          weightSum += weight;
        }
      }
      
      result.push(weightedSum / weightSum);
    }
    
    return result;
  }

  // Color space utilities
  public static rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
    r /= 255;
    g /= 255;
    b /= 255;

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

    return { h: h * 360, s: s * 100, v: v * 100 };
  }

  public static hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
    h /= 360;
    s /= 100;
    v /= 100;

    const c = v * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = v - c;

    let r = 0, g = 0, b = 0;

    if (h < 1/6) {
      r = c; g = x; b = 0;
    } else if (h < 2/6) {
      r = x; g = c; b = 0;
    } else if (h < 3/6) {
      r = 0; g = c; b = x;
    } else if (h < 4/6) {
      r = 0; g = x; b = c;
    } else if (h < 5/6) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    };
  }

  // Curve fitting and approximation
  public static linearRegression(points: Point2D[]): { slope: number; intercept: number; r2: number } {
    if (points.length < 2) {
      return { slope: 0, intercept: 0, r2: 0 };
    }

    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = points.reduce((sum, p) => sum + p.x * p.x, 0);
    const sumY2 = points.reduce((sum, p) => sum + p.y * p.y, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R²
    const meanY = sumY / n;
    const ssTotal = points.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0);
    const ssResidual = points.reduce((sum, p) => sum + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
    const r2 = 1 - (ssResidual / ssTotal);

    return { slope, intercept, r2 };
  }

  public static polynomialFit(points: Point2D, degree: number): number[] {
    if (points.length < degree + 1) {
      return Array(degree + 1).fill(0);
    }

    // This is a simplified implementation
    // In practice, you'd use a more robust polynomial fitting algorithm
    const coefficients = new Array(degree + 1).fill(0);
    
    // For now, return linear fit as a fallback
    const linear = this.linearRegression(points);
    coefficients[0] = linear.intercept;
    coefficients[1] = linear.slope;
    
    return coefficients;
  }

  // Matrix operations (simplified 2x2 and 3x3)
  public static multiplyMatrices2x2(a: number[][], b: number[][]): number[][] {
    return [
      [
        a[0][0] * b[0][0] + a[0][1] * b[1][0],
        a[0][0] * b[0][1] + a[0][1] * b[1][1],
      ],
      [
        a[1][0] * b[0][0] + a[1][1] * b[1][0],
        a[1][0] * b[0][1] + a[1][1] * b[1][1],
      ],
    ];
  }

  public static multiplyMatrices3x3(a: number[][], b: number[][]): number[][] {
    const result: number[][] = Array(3).fill(null).map(() => Array(3).fill(0));
    
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < 3; k++) {
          result[i][j] += a[i][k] * b[k][j];
        }
      }
    }
    
    return result;
  }

  public static determinant2x2(matrix: number[][]): number {
    return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
  }

  public static determinant3x3(matrix: number[][]): number {
    return matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
           matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
           matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);
  }

  // Utility functions for specific AI calculations
  public static calculateCurvature(points: Point2D[]): number[] {
    if (points.length < 3) return Array(points.length).fill(0);
    
    const curvatures: number[] = [0]; // First point has no curvature
    
    for (let i = 1; i < points.length - 1; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      const p3 = points[i + 1];
      
      const v1 = this.vector2D(p1, p2);
      const v2 = this.vector2D(p2, p3);
      
      const angle = this.angleBetweenVectors2D(v1, v2);
      const avgLength = (this.vectorMagnitude2D(v1) + this.vectorMagnitude2D(v2)) / 2;
      
      curvatures.push(angle / avgLength);
    }
    
    curvatures.push(0); // Last point has no curvature
    return curvatures;
  }

  public static calculateArea(points: Point2D[]): number {
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    
    return Math.abs(area) / 2;
  }

  public static calculateCentroid(points: Point2D[]): Point2D {
    if (points.length === 0) return { x: 0, y: 0 };
    
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    
    return {
      x: sumX / points.length,
      y: sumY / points.length,
    };
  }

  public static calculateConvexHull(points: Point2D[]): Point2D[] {
    if (points.length < 3) return [...points];
    
    // Graham scan algorithm
    const sorted = [...points].sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);
    
    const cross = (o: Point2D, a: Point2D, b: Point2D): number => {
      return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    };
    
    const lower: Point2D[] = [];
    for (const point of sorted) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
        lower.pop();
      }
      lower.push(point);
    }
    
    const upper: Point2D[] = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
      const point = sorted[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
        upper.pop();
      }
      upper.push(point);
    }
    
    upper.pop();
    lower.pop();
    
    return lower.concat(upper);
  }
}
