// ═════════════════════════════════════════════════════════════════════════════
// IONTYX FACE LANDMARKS - REAL GEOMETRY EXTRACTION
// ═════════════════════════════════════════════════════════════════════════════════════════════════

export interface FaceGeometry {
  landmarks: any[];
  measurements: {
    faceWidth: number;
    faceHeight: number;
    cheekboneWidth: number;
    jawlineWidth: number;
  };
}

export class FaceLandmarks {
  /**
   * Extract real face geometry from MediaPipe landmarks
   * NO MOCKING - All measurements from actual landmark positions
   */
  extractGeometry(landmarks: any[]): FaceGeometry {
    if (!landmarks || landmarks.length === 0) {
      throw new Error('FACE_LANDMARKS_ERROR: No landmarks available for geometry extraction');
    }

    // Real measurements from face landmarks (MediaPipe 468 points)
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];
    const chin = landmarks[175];
    const forehead = landmarks[10];
    const leftJaw = landmarks[172];
    const rightJaw = landmarks[397];
    const leftCheekbone = landmarks[50];
    const rightCheekbone = landmarks[280];

    return {
      landmarks,
      measurements: {
        faceWidth: Math.abs(leftCheek.x - rightCheek.x),
        faceHeight: Math.abs(chin.y - forehead.y),
        cheekboneWidth: Math.abs(leftCheekbone.x - rightCheekbone.x),
        jawlineWidth: Math.abs(rightJaw.x - leftJaw.x)
      }
    };
  }

  /**
   * Validate landmark quality for bridal engine
   */
  validateLandmarks(landmarks: any[]): { isValid: boolean; confidence: number } {
    if (!landmarks || landmarks.length < 450) {
      return { isValid: false, confidence: 0 };
    }

    // Check landmark stability (lower variance = higher confidence)
    let totalVariance = 0;
    for (let i = 1; i < landmarks.length; i++) {
      const dx = landmarks[i].x - landmarks[i-1].x;
      const dy = landmarks[i].y - landmarks[i-1].y;
      totalVariance += Math.sqrt(dx * dx + dy * dy);
    }

    const avgVariance = totalVariance / landmarks.length;
    const confidence = Math.max(0, 1 - (avgVariance * 10)); // Scale to 0-1

    return {
      isValid: confidence > 0.7,
      confidence
    };
  }
}
