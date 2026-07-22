export class ReverseMathEngine {
  /**
   * Estimate bare skin LAB values by reversing makeup influence.
   * This is an approximation, not exact reconstruction.
   */
  static calculateEstimatedBareSkinLAB(
    baseLAB: { l: number; a: number; b: number },
    makeupReport: any
  ) {
    let correctedLAB = { ...baseLAB };

    if (!makeupReport) {
      return { ...correctedLAB, confidence: 1 };
    }

    // Extract base values to avoid naming conflicts
    const baseL = baseLAB.l;
    const baseA = baseLAB.a;
    const baseB = baseLAB.b;

    // Normalize inputs safely
    const foundation = (makeupReport.foundationMatch?.score || 0) / 100;
    const blend = (makeupReport.blendQuality?.score || 0) / 100;
    const crease = (makeupReport.crease?.score || 0) / 100;
    const shine = (makeupReport.shineDetection?.score || 0) / 100;

    // Weighted coverage factor (improved accuracy)
    const coverageFactor =
      0.5 * foundation +
      0.3 * blend +
      0.2 * crease;

    // Dynamic weights based on brightness (skin adaptability)
    const brightnessFactor = baseL / 100;

    const lWeight = 12 + (brightnessFactor * 4);
    const aWeight = 10;
    const bChannelWeight = 8;

    // Reverse makeup influence
    correctedLAB.l =
      baseL -
      (coverageFactor * lWeight) -
      (shine * 8);

    correctedLAB.a =
      baseA +
      (coverageFactor * aWeight);

    correctedLAB.b =
      baseB +
      (coverageFactor * bChannelWeight);

    // Clamp values to valid LAB ranges
    correctedLAB.l = Math.max(0, Math.min(100, correctedLAB.l));
    correctedLAB.a = Math.max(-128, Math.min(128, correctedLAB.a));
    correctedLAB.b = Math.max(-128, Math.min(128, correctedLAB.b));

    // Confidence score (critical for UX)
    const confidence =
      1 - (coverageFactor + (shine * 0.5));

    return {
      lab: correctedLAB,
      confidence: Math.max(0, Math.min(1, confidence))
    };
  }
}
