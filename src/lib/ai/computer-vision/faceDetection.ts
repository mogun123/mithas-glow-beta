
export interface FaceDetectionResult {
  landmarks: number[][];
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  imageWidth: number;
  imageHeight: number;
}

export interface FaceValidationResult {
  isValid: boolean;
  message: string;
  faceDistanceStatus: 'too-close' | 'too-far' | 'optimal';
  headTilt: number;
  occlusionDetected: boolean;
  blurScore: number;
}

export class FaceDetection {
  private validationHistory: FaceValidationResult[] = [];
  private readonly VALIDATION_HISTORY_SIZE = 30;

  constructor() {
    // Pure logic class - no MediaPipe initialization
  }



  public validateFace(detection: FaceDetectionResult): FaceValidationResult {
    const { boundingBox, landmarks, imageWidth, imageHeight } = detection;
    
    // Check face distance using bounding box area ratio
    const faceAreaRatio = (boundingBox.width * boundingBox.height) / (imageWidth * imageHeight);
    let faceDistanceStatus: 'too-close' | 'too-far' | 'optimal';
    let message = '';

    if (faceAreaRatio < 0.10) {
      faceDistanceStatus = 'too-far';
      message = 'Please move closer to the camera';
    } else if (faceAreaRatio > 0.70) {
      faceDistanceStatus = 'too-close';
      message = 'Please move slightly back from the camera';
    } else {
      faceDistanceStatus = 'optimal';
    }

    // Check head tilt using left eye (landmark 33) and right eye (landmark 263)
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    
    const dy = rightEye[1] - leftEye[1];
    const dx = rightEye[0] - leftEye[0];
    const headTilt = Math.atan2(dy, dx) * (180 / Math.PI);

    const headTiltValid = Math.abs(headTilt) < 15;

    // Check for occlusion using face visibility based on z-values
    const faceVisibility = this.calculateFaceVisibility(landmarks);
    const occlusionDetected = faceVisibility < 0.8;

    // Calculate blur score using landmark stability
    const blurScore = this.calculateBlurScore(landmarks);
    const blurAcceptable = blurScore > 50;

    const isValid = faceDistanceStatus === 'optimal' && 
                  headTiltValid && 
                  !occlusionDetected && 
                  blurAcceptable;

    if (isValid && message === '') {
      message = 'Face validation passed';
    }

    const validationResult: FaceValidationResult = {
      isValid,
      message,
      faceDistanceStatus,
      headTilt,
      occlusionDetected,
      blurScore,
    };

    // Add to validation history
    this.validationHistory.push(validationResult);
    if (this.validationHistory.length > this.VALIDATION_HISTORY_SIZE) {
      this.validationHistory.shift();
    }

    return validationResult;
  }

  public isFaceStable(durationMs: number = 2000): boolean {
    if (this.validationHistory.length < 10) return false;

    const recentValidations = this.validationHistory.slice(-Math.floor(durationMs / 100));
    
    // Check if face has been consistently valid
    const allValid = recentValidations.every(v => v.isValid);
    
    // Check for landmark stability (low jitter)
    const jitterScores = recentValidations.map(v => v.blurScore);
    const avgJitter = jitterScores.reduce((a, b) => a + b, 0) / jitterScores.length;
    const jitterStable = avgJitter > 50;

    return allValid && jitterStable;
  }

  private calculateFaceVisibility(landmarks: number[][]): number {
    // Simple visibility check based on landmark z-values
    const zValues = landmarks.map(l => l[2]);
    const avgZ = zValues.reduce((a, b) => a + b, 0) / zValues.length;
    return Math.max(0, Math.min(1, 1 - Math.abs(avgZ)));
  }

  private calculateBlurScore(landmarks: number[][]): number {
    // Calculate blur score based on landmark stability
    // Higher variance indicates potential blur or movement
    if (landmarks.length < 10) return 0;

    // Calculate variance in landmark positions
    let totalVariance = 0;
    const landmarkCount = landmarks.length;

    // Calculate mean positions
    const meanX = landmarks.reduce((sum, l) => sum + l[0], 0) / landmarkCount;
    const meanY = landmarks.reduce((sum, l) => sum + l[1], 0) / landmarkCount;

    // Calculate variance from mean
    for (const landmark of landmarks) {
      const dx = landmark[0] - meanX;
      const dy = landmark[1] - meanY;
      totalVariance += Math.sqrt(dx * dx + dy * dy);
    }

    const avgVariance = totalVariance / landmarkCount;
    
    // Convert to blur score (lower variance = higher blur score)
    // Invert and scale to 0-100 range
    const blurScore = Math.max(0, Math.min(100, 100 - (avgVariance * 500)));
    
    return blurScore;
  }


  public getValidationHistory(): FaceValidationResult[] {
    return [...this.validationHistory];
  }

  public clearValidationHistory(): void {
    this.validationHistory = [];
  }
}
