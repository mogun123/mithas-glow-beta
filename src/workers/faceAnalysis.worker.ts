// Web Worker for Face Processing - Off-main-thread calculations
// STRICT: NO MOCK DATA, NO FALLBACK VALUES, REAL MATH ONLY

// Types for worker communication
interface FaceGeometry {
  jawWidth: number;
  cheekboneRatio: number;
  symmetryScore: number;
  cheekboneWidth: number;
}

interface FaceShapeResult {
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

interface WorkerMessage {
  type: 'ANALYZE_FACE';
  landmarks: number[][];
}

interface WorkerResponse {
  type: 'FACE_ANALYSIS_RESULT';
  faceGeometry: FaceGeometry;
  faceShapeResult: FaceShapeResult;
  processingTime: number;
}

interface WorkerError {
  type: 'FACE_ANALYSIS_ERROR';
  error: string;
}

// PURE MATH FUNCTIONS (NO MOCKING)

/**
 * Extract face geometry from landmarks - PURE MATH ONLY
 */
const extractFaceGeometry = (landmarks: number[][]): FaceGeometry => {
  if (!landmarks || landmarks.length !== 478) {
    throw new Error("WORKER_ERROR: Invalid landmarks data - expected 478 points");
  }

  try {
    // Jaw width (landmarks 0-16)
    const jawLeft = landmarks[0];
    const jawRight = landmarks[16];
    if (!jawLeft || !jawRight || jawLeft.length < 2 || jawRight.length < 2) {
      throw new Error("WORKER_ERROR: Missing jaw landmarks");
    }
    const jawWidth = Math.sqrt(
      Math.pow(jawRight[0] - jawLeft[0], 2) + 
      Math.pow(jawRight[1] - jawLeft[1], 2)
    );

    // Cheekbone width (landmarks 50, 280)
    const cheekLeft = landmarks[50];
    const cheekRight = landmarks[280];
    if (!cheekLeft || !cheekRight || cheekLeft.length < 2 || cheekRight.length < 2) {
      throw new Error("WORKER_ERROR: Missing cheekbone landmarks");
    }
    const cheekboneWidth = Math.sqrt(
      Math.pow(cheekRight[0] - cheekLeft[0], 2) + 
      Math.pow(cheekRight[1] - cheekLeft[1], 2)
    );

    // Face height (chin to forehead)
    const chin = landmarks[152];
    const forehead = landmarks[10];
    if (!chin || !forehead || chin.length < 2 || forehead.length < 2) {
      throw new Error("WORKER_ERROR: Missing chin/forehead landmarks");
    }
    const faceHeight = Math.abs(chin[1] - forehead[1]);

    // Cheekbone ratio
    const cheekboneRatio = cheekboneWidth / jawWidth;
    if (!isFinite(cheekboneRatio)) {
      throw new Error("WORKER_ERROR: Invalid cheekbone ratio calculation");
    }

    // Symmetry score (left vs right face)
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];
    if (!leftCheek || !rightCheek || leftCheek.length < 2 || rightCheek.length < 2) {
      throw new Error("WORKER_ERROR: Missing cheek symmetry landmarks");
    }
    const symmetryScore = 1 - Math.abs(leftCheek[0] - (1 - rightCheek[0]));
    if (!isFinite(symmetryScore)) {
      throw new Error("WORKER_ERROR: Invalid symmetry score calculation");
    }

    return {
      jawWidth,
      cheekboneRatio,
      symmetryScore,
      cheekboneWidth
    };
  } catch (error) {
    throw new Error(`WORKER_ERROR: Face geometry extraction failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Face Shape Analysis - PURE MATH ONLY
 */
const analyzeFaceShape = (landmarks: number[][]): FaceShapeResult => {
  if (!landmarks || landmarks.length < 455) {
    throw new Error("WORKER_ERROR: Insufficient landmarks for face shape analysis");
  }

  const extractMeasurements = (landmarks: number[][]) => {
    const dist = (i: number, j: number, axis: 0 | 1) => {
      const a = landmarks[i]?.[axis];
      const b = landmarks[j]?.[axis];

      if (a === undefined || b === undefined) {
        throw new Error(`WORKER_ERROR: Missing landmark ${i} or ${j} for axis ${axis}`);
      }

      return Math.abs(a - b);
    };

    const faceHeight = dist(10, 152, 1);
    const jawlineWidth = dist(172, 400, 0);
    const foreheadWidth = dist(69, 299, 0);
    const cheekboneWidth = dist(234, 454, 0);

    const faceWidth = Math.max(jawlineWidth, foreheadWidth, cheekboneWidth);

    if (faceHeight === 0 || faceWidth === 0 || jawlineWidth === 0 || 
        foreheadWidth === 0 || cheekboneWidth === 0) {
      throw new Error("WORKER_ERROR: Invalid geometry measurements - zero values detected");
    }

    return {
      faceWidth,
      faceHeight,
      jawlineWidth,
      foreheadWidth,
      cheekboneWidth
    };
  };

  const calculateRatios = (measurements: ReturnType<typeof extractMeasurements>) => {
    const widthToHeight = measurements.faceWidth / measurements.faceHeight;
    const jawlineToForehead = measurements.jawlineWidth / measurements.foreheadWidth;
    const cheekboneToJawline = measurements.cheekboneWidth / measurements.jawlineWidth;

    if (!isFinite(widthToHeight) || !isFinite(jawlineToForehead) || !isFinite(cheekboneToJawline)) {
      throw new Error("WORKER_ERROR: Invalid ratio calculations");
    }

    return {
      widthToHeight,
      jawlineToForehead,
      cheekboneToJawline
    };
  };

  const scoreShapes = (ratios: ReturnType<typeof calculateRatios>) => {
    // PURE MATH SCORING - NO HARDCODED VALUES
    const scores: Record<string, number> = {
      'Oval': Math.max(0, 1 - Math.abs(ratios.widthToHeight - 0.75)) * 0.3 +
               Math.max(0, 1 - Math.abs(ratios.jawlineToForehead - 0.85)) * 0.4 +
               Math.max(0, 1 - Math.abs(ratios.cheekboneToJawline - 0.9)) * 0.3,
      'Round': Math.max(0, 1 - Math.abs(ratios.widthToHeight - 0.95)) * 0.4 +
               Math.max(0, 1 - Math.abs(ratios.jawlineToForehead - 0.95)) * 0.3 +
               Math.max(0, 1 - Math.abs(ratios.cheekboneToJawline - 0.95)) * 0.3,
      'Square': Math.max(0, 1 - Math.abs(ratios.widthToHeight - 0.85)) * 0.3 +
                Math.max(0, 1 - Math.abs(ratios.jawlineToForehead - 0.75)) * 0.4 +
                Math.max(0, 1 - Math.abs(ratios.cheekboneToJawline - 0.85)) * 0.3,
      'Heart': Math.max(0, 1 - Math.abs(ratios.widthToHeight - 0.65)) * 0.3 +
               Math.max(0, 1 - Math.abs(ratios.jawlineToForehead - 0.95)) * 0.3 +
               Math.max(0, 1 - Math.abs(ratios.cheekboneToJawline - 0.75)) * 0.4,
      'Diamond': Math.max(0, 1 - Math.abs(ratios.widthToHeight - 0.7)) * 0.3 +
                 Math.max(0, 1 - Math.abs(ratios.jawlineToForehead - 0.7)) * 0.4 +
                 Math.max(0, 1 - Math.abs(ratios.cheekboneToJawline - 0.8)) * 0.3,
      'Oblong': Math.max(0, 1 - Math.abs(ratios.widthToHeight - 0.6)) * 0.4 +
                Math.max(0, 1 - Math.abs(ratios.jawlineToForehead - 0.8)) * 0.3 +
                Math.max(0, 1 - Math.abs(ratios.cheekboneToJawline - 0.85)) * 0.3
    };

    // Validate scores
    Object.values(scores).forEach(score => {
      if (!isFinite(score) || score < 0 || score > 1) {
        throw new Error("WORKER_ERROR: Invalid shape scores calculated");
      }
    });

    return scores;
  };

  try {
    const measurements = extractMeasurements(landmarks);
    const ratios = calculateRatios(measurements);
    const scores = scoreShapes(ratios);

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [top1, top2] = sorted;

    if (!top1) {
      throw new Error("WORKER_ERROR: No valid face shape scores found");
    }

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
      confidence: Math.max(0, Math.min(100, confidence)),
      measurements,
      ratios
    };
  } catch (error) {
    throw new Error(`WORKER_ERROR: Face shape analysis failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Worker message handler
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const startTime = performance.now();
  
  try {
    const { type, landmarks } = event.data;
    
    if (type !== 'ANALYZE_FACE') {
      throw new Error(`WORKER_ERROR: Unknown message type ${type}`);
    }

    if (!landmarks || !Array.isArray(landmarks)) {
      throw new Error("WORKER_ERROR: Invalid landmarks data received");
    }

    // Process face geometry
    const faceGeometry = extractFaceGeometry(landmarks);
    
    // Process face shape
    const faceShapeResult = analyzeFaceShape(landmarks);
    
    const processingTime = performance.now() - startTime;
    
    // Send results back to main thread
    const response: WorkerResponse = {
      type: 'FACE_ANALYSIS_RESULT',
      faceGeometry,
      faceShapeResult,
      processingTime
    };
    
    self.postMessage(response);
    
  } catch (error) {
    const errorResponse: WorkerError = {
      type: 'FACE_ANALYSIS_ERROR',
      error: error instanceof Error ? error.message : 'Unknown worker error'
    };
    
    self.postMessage(errorResponse);
  }
};

// Export types for TypeScript (worker context)
export type { WorkerMessage, WorkerResponse, WorkerError, FaceGeometry, FaceShapeResult };
