export interface FaceShapeResult {
  faceShape: string;
  confidence: number;
  measurements: {
    faceWidth: number;
    faceHeight: number;
    jawlineWidth: number;
    foreheadWidth: number;
    cheekboneWidth: number;
  };
  ratios: {
    widthToHeight: number;
    jawlineToForehead: number;
    cheekboneToJawline: number;
  };
}

export class FaceShapeAnalyzer {

  public analyzeFaceShape(landmarks: number[][]): FaceShapeResult {

    if (!landmarks || landmarks.length < 455) {
      throw new Error("DATA_INTEGRITY_FAILURE");
    }

    const measurements = this.extractMeasurements(landmarks);
    const ratios = this.calculateRatios(measurements);
    const scores = this.scoreShapes(ratios);

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [top1, top2] = sorted;

    let faceShape = top1[0];
    let confidence = Math.round((top1[1] - (top2 ? top2[1] : 0)) * 100);

    // PURE HYBRID (no hardcode)
    if (top2) {
      const diff = top1[1] - top2[1];
      if (diff < 0.15) {
        faceShape = `${top1[0]}-${top2[0]} Hybrid`;
        confidence = Math.round(((top1[1] + top2[1]) / 2) * 100);
      }
    }

    return {
      faceShape,
      confidence,
      measurements,
      ratios
    };
  }

  /**
   * 🧬 NEW: Calculates facial symmetry based on color/light distribution between cheeks.
   * Moved from MirrorScreen.tsx for Clean Architecture.
   */
  public calculateSymmetryScore(leftCheekL: number = 50, rightCheekL: number = 50): number {
    const difference = Math.abs(leftCheekL - rightCheekL);
    const maxVal = Math.max((leftCheekL + rightCheekL) / 2, 1);

    // Normalize difference to 0-1 range and invert (1.0 = Perfect Symmetry)
    return Math.max(0, 1 - (difference / maxVal));
  }

  private extractMeasurements(landmarks: number[][]) {

    const dist = (i: number, j: number, axis: 0 | 1) => {
      const a = landmarks[i][axis];
      const b = landmarks[j][axis];

      if (a === undefined || b === undefined) {
        throw new Error("LANDMARK_MISSING");
      }

      return Math.abs(a - b);
    };

    const faceHeight = dist(10, 152, 1);
    const jawlineWidth = dist(172, 400, 0);
    const foreheadWidth = dist(69, 299, 0);
    const cheekboneWidth = dist(234, 454, 0);

    const faceWidth = Math.max(jawlineWidth, foreheadWidth, cheekboneWidth);

    if (
      faceHeight === 0 ||
      faceWidth === 0 ||
      jawlineWidth === 0 ||
      foreheadWidth === 0 ||
      cheekboneWidth === 0
    ) {
      throw new Error("INVALID_GEOMETRY");
    }

    return {
      faceWidth,
      faceHeight,
      jawlineWidth,
      foreheadWidth,
      cheekboneWidth
    };
  }

  private calculateRatios(m: FaceShapeResult["measurements"]) {

    if (m.foreheadWidth === 0 || m.jawlineWidth === 0) {
      throw new Error("INVALID_RATIO");
    }

    return {
      widthToHeight: m.faceWidth / m.faceHeight,
      jawlineToForehead: m.jawlineWidth / m.foreheadWidth,
      cheekboneToJawline: m.cheekboneWidth / m.jawlineWidth
    };
  }

  private scoreShapes(r: FaceShapeResult["ratios"]) {

    return {
      Oval:
        this.score(r.widthToHeight, 0.8, 0.08) * 0.4 +
        this.score(r.jawlineToForehead, 0.95, 0.08) * 0.4 +
        this.score(r.cheekboneToJawline, 1.1, 0.2) * 0.2,

      Round:
        this.score(r.widthToHeight, 1.0, 0.1) * 0.5 +
        this.score(r.jawlineToForehead, 1.0, 0.1) * 0.5,

      Square:
        this.score(r.widthToHeight, 0.9, 0.1) * 0.4 +
        this.score(r.jawlineToForehead, 1.0, 0.08) * 0.4 +
        this.score(r.cheekboneToJawline, 1.0, 0.15) * 0.2,

      Heart:
        this.score(r.widthToHeight, 0.78, 0.1) * 0.3 +
        this.score(r.jawlineToForehead, 0.7, 0.15) * 0.5 +
        this.score(r.cheekboneToJawline, 1.2, 0.2) * 0.2,

      Diamond:
        this.score(r.widthToHeight, 0.82, 0.1) * 0.3 +
        this.score(r.jawlineToForehead, 0.85, 0.1) * 0.3 +
        this.score(r.cheekboneToJawline, 1.3, 0.2) * 0.4,

      Rectangle:
        this.score(r.widthToHeight, 0.65, 0.1) * 0.6 +
        this.score(r.jawlineToForehead, 0.95, 0.1) * 0.4,

      Triangle:
        this.score(r.widthToHeight, 0.85, 0.12) * 0.3 +
        this.score(r.jawlineToForehead, 1.25, 0.2) * 0.5 +
        this.score(r.cheekboneToJawline, 0.9, 0.2) * 0.2,
    };
  }

  private score(value: number, target: number, tolerance: number): number {
    const distance = Math.abs(value - target);
    return Math.max(0, 1 - distance / tolerance);
  }
}

