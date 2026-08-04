// ═══════════════════════════════════════════════════════════════════════════
// IONTYX BODY GEOMETRY - REAL POSE EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════════════

export interface BodyGeometry {
  landmarks: any[];
  measurements: {
    shoulderWidth: number;
    height: number;
    torsoWidth: number;
  };
  leftHip: { x: any; y: any; };
  rightHip: { x: any; y: any; };
  extractGeometry?(landmarks: any[]): BodyGeometry;
  validateLandmarks?(landmarks: any[]): { isValid: boolean; confidence: number };
}

export class BodyGeometry {
  /**
   * Extract real body geometry from pose landmarks
   * NO MOCKING - All measurements from actual pose data
   */
  extractGeometry(landmarks: any[]): BodyGeometry {
    if (!landmarks || landmarks.length < 20) {
      throw new Error('BODY_GEOMETRY_ERROR: Insufficient landmarks for body geometry extraction');
    }

    // Real body measurements from pose landmarks (MediaPipe Pose)
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const neck = landmarks[0]; // Nose tip approximation for neck

    return {
      landmarks,
      measurements: {
        shoulderWidth: Math.abs(leftShoulder.x - rightShoulder.x),
        height: Math.abs((leftHip.y + rightHip.y) / 2 - neck.y),
        torsoWidth: Math.abs(leftHip.x - rightHip.x)
      },
      leftHip: { x: leftHip.x, y: leftHip.y },
      rightHip: { x: rightHip.x, y: rightHip.y }
    };
  }

  /**
   * Validate pose landmarks for bridal engine
   */
  validateLandmarks(landmarks: any[]): { isValid: boolean; confidence: number } {
    if (!landmarks || landmarks.length < 15) {
      return { isValid: false, confidence: 0 };
    }

    // Check pose stability and visibility
    let totalConfidence = 0;
    let visiblePoints = 0;

    for (const landmark of landmarks) {
      if (landmark.visibility > 0.5) {
        visiblePoints++;
        totalConfidence += landmark.visibility || 0.5;
      }
    }

    const avgConfidence = visiblePoints > 0 ? totalConfidence / visiblePoints : 0;
    const stabilityScore = visiblePoints / landmarks.length;

    return {
      isValid: stabilityScore > 0.7 && avgConfidence > 0.6,
      confidence: avgConfidence
    };
  }
}
