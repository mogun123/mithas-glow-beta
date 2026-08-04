import { LAB } from '../lib/ai/computer-vision/colorConversion';

export interface LabScan {
  L: number;
  A: number;
  B: number;
  timestamp: number;
}

export interface StabilizedLab {
  L: number;
  A: number;
  B: number;
  stability: number; // 0-100, how stable the reading is
  sampleSize: number; // number of scans used
}

export class ProfileStabilization {
  private static instance: ProfileStabilization;
  private labScans: LabScan[] = [];
  private maxScans: number = 5;
  private stabilityThreshold: number = 10; // LAB difference threshold

  static getInstance(): ProfileStabilization {
    if (!ProfileStabilization.instance) {
      ProfileStabilization.instance = new ProfileStabilization();
    }
    return ProfileStabilization.instance;
  }

  public addLabScan(labValues: LAB): void {
    const scan: LabScan = {
      L: labValues.l,
      A: labValues.a,
      B: labValues.b,
      timestamp: Date.now(),
    };

    this.labScans.push(scan);

    // Keep only the last maxScans
    if (this.labScans.length > this.maxScans) {
      this.labScans = this.labScans.slice(-this.maxScans);
    }
  }

  public stabilizeLab(scans: LabScan[]): StabilizedLab {
    if (scans.length === 0) {
      return { L: 0, A: 0, B: 0, stability: 0, sampleSize: 0 };
    }

    if (scans.length === 1) {
      return {
        L: scans[0].L,
        A: scans[0].A,
        B: scans[0].B,
        stability: 100, // Single scan is "stable" by default
        sampleSize: 1,
      };
    }

    // Calculate weighted average (more recent scans have higher weight)
    let totalWeight = 0;
    let weightedL = 0;
    let weightedA = 0;
    let weightedB = 0;

    scans.forEach((scan, index) => {
      const weight = (index + 1) / scans.length; // Linear weight increase
      weightedL += scan.L * weight;
      weightedA += scan.A * weight;
      weightedB += scan.B * weight;
      totalWeight += weight;
    });

    const avgL = weightedL / totalWeight;
    const avgA = weightedA / totalWeight;
    const avgB = weightedB / totalWeight;

    // Calculate stability based on variance from average
    let totalVariance = 0;
    scans.forEach(scan => {
      const variance = Math.sqrt(
        Math.pow(scan.L - avgL, 2) +
        Math.pow(scan.A - avgA, 2) +
        Math.pow(scan.B - avgB, 2)
      );
      totalVariance += variance;
    });

    const avgVariance = totalVariance / scans.length;
    const stability = Math.max(0, 100 - (avgVariance / this.stabilityThreshold) * 100);

    return {
      L: avgL,
      A: avgA,
      B: avgB,
      stability: Math.min(100, stability),
      sampleSize: scans.length,
    };
  }

  public getStabilizedLab(): StabilizedLab {
    return this.stabilizeLab(this.labScans);
  }

  public getCurrentScans(): LabScan[] {
    return [...this.labScans];
  }

  public clearScans(): void {
    this.labScans = [];
  }

  public setMaxScans(maxScans: number): void {
    this.maxScans = Math.max(1, maxScans);
    if (this.labScans.length > this.maxScans) {
      this.labScans = this.labScans.slice(-this.maxScans);
    }
  }

  public setStabilityThreshold(threshold: number): void {
    this.stabilityThreshold = Math.max(1, threshold);
  }

  // Check if current reading is stable enough for use
  public isStableEnough(minStability: number = 70, minSamples: number = 3): boolean {
    const stabilized = this.getStabilizedLab();
    return stabilized.stability >= minStability && stabilized.sampleSize >= minSamples;
  }

  // Get the most recent scan
  public getMostRecentScan(): LabScan | null {
    return this.labScans.length > 0 ? this.labScans[this.labScans.length - 1] : null;
  }

  // Get the time difference between first and last scan
  public getScanDuration(): number {
    if (this.labScans.length < 2) return 0;
    const first = this.labScans[0];
    const last = this.labScans[this.labScans.length - 1];
    return last.timestamp - first.timestamp;
  }

  // Check if we have enough recent scans (within last 30 seconds)
  public hasRecentScans(timeWindowMs: number = 30000): boolean {
    if (this.labScans.length === 0) return false;
    
    const now = Date.now();
    const recentScans = this.labScans.filter(scan => (now - scan.timestamp) <= timeWindowMs);
    return recentScans.length >= 2;
  }

  // Export current state for persistence
  public exportState(): {
    scans: LabScan[];
    maxScans: number;
    stabilityThreshold: number;
  } {
    return {
      scans: [...this.labScans],
      maxScans: this.maxScans,
      stabilityThreshold: this.stabilityThreshold,
    };
  }

  // Import state from persistence
  public importState(state: {
    scans: LabScan[];
    maxScans: number;
    stabilityThreshold: number;
  }): void {
    this.labScans = state.scans || [];
    this.maxScans = state.maxScans || 5;
    this.stabilityThreshold = state.stabilityThreshold || 10;
  }
}

// Convenience function for external use
export function stabilizeLab(scans: LabScan[]): StabilizedLab {
  const stabilization = ProfileStabilization.getInstance();
  return stabilization.stabilizeLab(scans);
}
