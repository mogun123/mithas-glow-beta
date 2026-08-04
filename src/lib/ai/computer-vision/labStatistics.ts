import { LAB } from './colorConversion';

export interface StatisticalResult {
  mean: LAB;
  median: LAB;
  trimmedMean: LAB;
  standardDeviation: LAB;
  variance: LAB;
  min: LAB;
  max: LAB;
  confidenceInterval: {
    lower: LAB;
    upper: LAB;
  };
  outliers: LAB[];
  sampleSize: number;
}

export interface TrimConfig {
  trimPercent: number;
  outlierMethod: 'iqr' | 'zscore' | 'none';
  confidenceLevel: number;
}

export class LABStatistics {
  private readonly defaultConfig: TrimConfig = {
    trimPercent: 0.1,
    outlierMethod: 'iqr',
    confidenceLevel: 0.95,
  };

  public calculateStatistics(
    labValues: LAB[],
    config: Partial<TrimConfig> = {}
  ): StatisticalResult {
    if (labValues.length === 0) {
      throw new Error('LAB values array cannot be empty');
    }

    const finalConfig = { ...this.defaultConfig, ...config };

    // Remove outliers if configured
    const cleanedValues = this.removeOutliers(labValues, finalConfig.outlierMethod);

    // Calculate basic statistics
    const mean = this.calculateMean(cleanedValues);
    const median = this.calculateMedian(cleanedValues);
    const trimmedMean = this.calculateTrimmedMean(cleanedValues, finalConfig.trimPercent);
    const standardDeviation = this.calculateStandardDeviation(cleanedValues, mean);
    const variance = this.calculateVariance(cleanedValues, mean);
    const { min, max } = this.calculateMinMax(cleanedValues);
    const confidenceInterval = this.calculateConfidenceInterval(
      cleanedValues,
      mean,
      standardDeviation,
      finalConfig.confidenceLevel
    );
    const outliers = this.detectOutliers(labValues, finalConfig.outlierMethod);

    return {
      mean,
      median,
      trimmedMean,
      standardDeviation,
      variance,
      min,
      max,
      confidenceInterval,
      outliers,
      sampleSize: cleanedValues.length,
    };
  }

  private calculateMean(values: LAB[]): LAB {
    const sum = values.reduce(
      (acc, lab) => ({
        l: acc.l + lab.l,
        a: acc.a + lab.a,
        b: acc.b + lab.b,
      }),
      { l: 0, a: 0, b: 0 }
    );

    return {
      l: sum.l / values.length,
      a: sum.a / values.length,
      b: sum.b / values.length,
    };
  }

  // 🚀 FIX 1: Independent Channel Median (Marginal Median)
  private calculateMedian(values: LAB[]): LAB {
    const lValues = values.map(v => v.l).sort((a, b) => a - b);
    const aValues = values.map(v => v.a).sort((a, b) => a - b);
    const bValues = values.map(v => v.b).sort((a, b) => a - b);

    const getMedian = (arr: number[]) => {
      const mid = Math.floor(arr.length / 2);
      return arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid];
    };

    return {
      l: getMedian(lValues),
      a: getMedian(aValues),
      b: getMedian(bValues),
    };
  }

  // 🚀 FIX 2: Independent Channel Trimmed Mean
  private calculateTrimmedMean(values: LAB[], trimPercent: number): LAB {
    if (trimPercent <= 0) return this.calculateMean(values);
    if (trimPercent >= 0.5) return this.calculateMedian(values);

    const lValues = values.map(v => v.l).sort((a, b) => a - b);
    const aValues = values.map(v => v.a).sort((a, b) => a - b);
    const bValues = values.map(v => v.b).sort((a, b) => a - b);

    const trimCount = Math.floor(values.length * trimPercent);

    const getTrimmedMean = (arr: number[]) => {
      const trimmed = arr.slice(trimCount, arr.length - trimCount);
      return trimmed.reduce((sum, val) => sum + val, 0) / trimmed.length;
    };

    return {
      l: getTrimmedMean(lValues),
      a: getTrimmedMean(aValues),
      b: getTrimmedMean(bValues),
    };
  }

  private calculateStandardDeviation(values: LAB[], mean: LAB): LAB {
    const variance = this.calculateVariance(values, mean);
    return {
      l: Math.sqrt(variance.l),
      a: Math.sqrt(variance.a),
      b: Math.sqrt(variance.b),
    };
  }

  private calculateVariance(values: LAB[], mean: LAB): LAB {
    const sumSquaredDiffs = values.reduce(
      (acc, lab) => ({
        l: acc.l + Math.pow(lab.l - mean.l, 2),
        a: acc.a + Math.pow(lab.a - mean.a, 2),
        b: acc.b + Math.pow(lab.b - mean.b, 2),
      }),
      { l: 0, a: 0, b: 0 }
    );

    return {
      l: sumSquaredDiffs.l / values.length,
      a: sumSquaredDiffs.a / values.length,
      b: sumSquaredDiffs.b / values.length,
    };
  }

  private calculateMinMax(values: LAB[]): { min: LAB; max: LAB } {
    const min = { l: Infinity, a: Infinity, b: Infinity };
    const max = { l: -Infinity, a: -Infinity, b: -Infinity };

    for (const lab of values) {
      min.l = Math.min(min.l, lab.l);
      min.a = Math.min(min.a, lab.a);
      min.b = Math.min(min.b, lab.b);
      max.l = Math.max(max.l, lab.l);
      max.a = Math.max(max.a, lab.a);
      max.b = Math.max(max.b, lab.b);
    }

    return { min, max };
  }

  private calculateConfidenceInterval(
    values: LAB[],
    mean: LAB,
    stdDev: LAB,
    confidenceLevel: number
  ): { lower: LAB; upper: LAB } {
    const zScore = this.getZScore(confidenceLevel);
    const marginOfError = {
      l: zScore * (stdDev.l / Math.sqrt(values.length)),
      a: zScore * (stdDev.a / Math.sqrt(values.length)),
      b: zScore * (stdDev.b / Math.sqrt(values.length)),
    };

    return {
      lower: {
        l: mean.l - marginOfError.l,
        a: mean.a - marginOfError.a,
        b: mean.b - marginOfError.b,
      },
      upper: {
        l: mean.l + marginOfError.l,
        a: mean.a + marginOfError.a,
        b: mean.b + marginOfError.b,
      },
    };
  }

  private getZScore(confidenceLevel: number): number {
    const zScores: { [key: number]: number } = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576,
    };
    return zScores[confidenceLevel] || 1.96;
  }

  private removeOutliers(values: LAB[], method: 'iqr' | 'zscore' | 'none'): LAB[] {
    if (method === 'none') return values;

    const outliers = this.detectOutliers(values, method);
    const outlierSet = new Set(outliers);

    return values.filter(lab => !outlierSet.has(lab));
  }

  // 🚀 FIX 3: Scientifically Accurate Independent Channel IQR
  private detectOutliers(values: LAB[], method: 'iqr' | 'zscore' | 'none'): LAB[] {
    if (method === 'none' || values.length < 4) return [];

    const outliers: LAB[] = [];

    if (method === 'iqr') {
      const lValues = values.map(v => v.l).sort((a, b) => a - b);
      const aValues = values.map(v => v.a).sort((a, b) => a - b);
      const bValues = values.map(v => v.b).sort((a, b) => a - b);

      const q1Index = Math.floor(values.length * 0.25);
      const q3Index = Math.floor(values.length * 0.75);

      const iqr = {
        l: lValues[q3Index] - lValues[q1Index],
        a: aValues[q3Index] - aValues[q1Index],
        b: bValues[q3Index] - bValues[q1Index],
      };

      const lowerBound = {
        l: lValues[q1Index] - 1.5 * iqr.l,
        a: aValues[q1Index] - 1.5 * iqr.a,
        b: bValues[q1Index] - 1.5 * iqr.b,
      };

      const upperBound = {
        l: lValues[q3Index] + 1.5 * iqr.l,
        a: aValues[q3Index] + 1.5 * iqr.a,
        b: bValues[q3Index] + 1.5 * iqr.b,
      };

      for (const lab of values) {
        // If a pixel is an outlier in ANY color channel, it gets flagged
        if (lab.l < lowerBound.l || lab.l > upperBound.l ||
          lab.a < lowerBound.a || lab.a > upperBound.a ||
          lab.b < lowerBound.b || lab.b > upperBound.b) {
          outliers.push(lab);
        }
      }
    } else if (method === 'zscore') {
      const mean = this.calculateMean(values);
      const stdDev = this.calculateStandardDeviation(values, mean);

      for (const lab of values) {
        const zScore = {
          l: Math.abs((lab.l - mean.l) / stdDev.l),
          a: Math.abs((lab.a - mean.a) / stdDev.a),
          b: Math.abs((lab.b - mean.b) / stdDev.b),
        };

        if (zScore.l > 3 || zScore.a > 3 || zScore.b > 3) {
          outliers.push(lab);
        }
      }
    }

    return outliers;
  }

  // 🚀 CUSTOM ARCHITECTURE: Add your UI-required functions here!
  public calculateGlobalStdL(regionAverages: any): number {
    const validLValues = [
      regionAverages.forehead?.l,
      regionAverages.leftCheek?.l,
      regionAverages.rightCheek?.l,
      regionAverages.nose?.l,
      regionAverages.chin?.l
    ].filter((v): v is number => typeof v === 'number');

    if (validLValues.length === 0) return 2.0;

    const meanL = validLValues.reduce((s, v) => s + v, 0) / validLValues.length;
    const varianceL = validLValues.reduce((s, v) => s + Math.pow(v - meanL, 2), 0) / validLValues.length;
    return Math.sqrt(varianceL);
  }

  public calculateConsistencyScore(stats: StatisticalResult): number {
    const avgVariance = (stats.variance.l + stats.variance.a + stats.variance.b) / 3;
    const normalizedVariance = Math.min(1, avgVariance / 100);
    const sampleSizeFactor = Math.min(1, stats.sampleSize / 20);
    const consistencyScore = (1 - normalizedVariance) * sampleSizeFactor * 100;
    return Math.max(0, Math.min(100, consistencyScore));
  }

  public compareLABDistributions(
    stats1: StatisticalResult,
    stats2: StatisticalResult
  ): {
    lDifference: number;
    aDifference: number;
    bDifference: number;
    overallDifference: number;
    isSignificant: boolean;
  } {
    const lDifference = Math.abs(stats1.mean.l - stats2.mean.l);
    const aDifference = Math.abs(stats1.mean.a - stats2.mean.a);
    const bDifference = Math.abs(stats1.mean.b - stats2.mean.b);

    const overallDifference = Math.sqrt(
      Math.pow(lDifference, 2) + Math.pow(aDifference, 2) + Math.pow(bDifference, 2)
    );

    const pooledStdDev = {
      l: Math.sqrt((Math.pow(stats1.standardDeviation.l, 2) + Math.pow(stats2.standardDeviation.l, 2)) / 2),
      a: Math.sqrt((Math.pow(stats1.standardDeviation.a, 2) + Math.pow(stats2.standardDeviation.a, 2)) / 2),
      b: Math.sqrt((Math.pow(stats1.standardDeviation.b, 2) + Math.pow(stats2.standardDeviation.b, 2)) / 2),
    };

    const significanceThreshold = 2;
    const isSignificant =
      lDifference > significanceThreshold * pooledStdDev.l ||
      aDifference > significanceThreshold * pooledStdDev.a ||
      bDifference > significanceThreshold * pooledStdDev.b;

    return {
      lDifference,
      aDifference,
      bDifference,
      overallDifference,
      isSignificant,
    };
  }
}

