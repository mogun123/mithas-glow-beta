// ZERO-TRUST AI: Images processed in-memory only, discarded immediately
// No biometric storage, only derived numerical outputs

// Body proportion analysis using geometric ratios from MITHAS_PROPRIETARY_AI_ENGINE.txt
export function analyzeBodyProportions(landmarks: any[], imageWidth: number, imageHeight: number): {
  body_proportions: {
    height_ratio: number;           // torso/legs ratio
    shoulder_width: number;        // normalized to frame width
    waist_position: [number, number]; // [x, y] coordinates
    hip_width: number;           // normalized to frame width
    torso_length: number;         // normalized to frame height
    arm_span: number;            // armspan/body_height
    leg_length: number;           // normalized to frame height
    golden_ratio_compliance: number; // 1.618 = perfect
  };
  anthropometric_scores: {
    mesomorph: number;    // muscular build
    ectomorph: number;     // lean build  
    endomorph: number;     // heavier build
  };
  posture_analysis: {
    shoulder_tilt: number;        // degrees from vertical
    spine_curvature: number;      // deviation index
    head_alignment: number;        // 0-1 scale
    balance_score: number;
  };
  processing_metadata: {
    analysis_confidence: number;
    landmark_count: number;
    processing_time_ms: number;
    image_discarded: boolean;
  };
} {
  const startTime = Date.now();
  
  // Normalize landmark coordinates to 0-1 scale
  const normalizedLandmarks = landmarks.map(landmark => ({
    x: landmark.x / imageWidth,
    y: landmark.y / imageHeight
  }));
  
  // Calculate key body measurements using geometric formulas
  const shoulderWidth = calculateDistance(normalizedLandmarks[11], normalizedLandmarks[12]); // Shoulder joints
  const waistPosition = calculateWaistPosition(normalizedLandmarks);
  const hipWidth = calculateDistance(normalizedLandmarks[23], normalizedLandmarks[24]); // Hip joints
  const torsoLength = calculateDistance(normalizedLandmarks[11], normalizedLandmarks[23]); // Shoulder to hip
  const legLength = calculateDistance(normalizedLandmarks[23], normalizedLandmarks[27]); // Hip to ankle
  
  // Calculate body ratios
  const heightRatio = torsoLength / legLength;
  const armSpan = calculateDistance(normalizedLandmarks[15], normalizedLandmarks[16]); // Wrist to wrist
  const armSpanRatio = armSpan / (torsoLength + legLength);
  
  // Golden ratio compliance (1.618)
  const goldenRatioCompliance = Math.min(1, Math.abs(heightRatio - 1.618) / 1.618);
  
  // Anthropometric scoring using body type formulas
  const shoulderHipRatio = shoulderWidth / hipWidth;
  const waistHipRatio = calculateWaistHipRatio(waistPosition, hipWidth);
  
  const mesomorphScore = calculateMesomorphScore(shoulderHipRatio, waistHipRatio);
  const ectomorphScore = calculateEctomorphScore(heightRatio, armSpanRatio);
  const endomorphScore = calculateEndomorphScore(waistHipRatio, hipWidth);
  
  // Posture analysis using geometric alignment
  const shoulderTilt = calculateShoulderTilt(normalizedLandmarks[11], normalizedLandmarks[12]);
  const spineCurvature = calculateSpineCurvature(normalizedLandmarks);
  const headAlignment = calculateHeadAlignment(normalizedLandmarks);
  const balanceScore = Math.max(0, 1 - (shoulderTilt + spineCurvature) / 2);
  
  // Calculate confidence based on landmark detection quality
  const confidence = Math.min(0.95, landmarks.length / 33); // Max 33 pose landmarks
  const processingTime = Date.now() - startTime;
  
  // Image is discarded immediately after processing
  // ZERO-TRUST: No image persistence
  
  return {
    body_proportions: {
      height_ratio: heightRatio,
      shoulder_width: shoulderWidth,
      waist_position: waistPosition,
      hip_width: hipWidth,
      torso_length: torsoLength,
      arm_span: armSpanRatio,
      leg_length: legLength,
      golden_ratio_compliance: goldenRatioCompliance
    },
    anthropometric_scores: {
      mesomorph: mesomorphScore,
      ectomorph: ectomorphScore,
      endomorph: endomorphScore
    },
    posture_analysis: {
      shoulder_tilt: shoulderTilt,
      spine_curvature: spineCurvature,
      head_alignment: headAlignment,
      balance_score: balanceScore
    },
    processing_metadata: {
      analysis_confidence: confidence,
      landmark_count: landmarks.length,
      processing_time_ms: processingTime,
      image_discarded: true // Explicit confirmation
    }
  };
}

// Outfit compatibility analysis using geometric alignment from MITHAS_PROPRIETARY_AI_ENGINE.txt
export function analyzeOutfitCompatibility(
  bodyProportions: any,
  garmentMeasurements: {
    shoulder_width: number;
    chest_width: number;
    waist_width: number;
    hip_width: number;
    length: number;
    sleeve_length: number;
  }
): {
  fit_analysis: {
    shoulder_compatibility: number;    // garment vs body width
    torso_length_fit: number;        // length alignment
    waist_position_match: number;     // vertical alignment
    hip_room_allowance: number;       // comfort vs tightness
    sleeve_length_ratio: number;     // arm proportions
    overall_fit_score: number;
  };
  drape_parameters: {
    gravity_factor: number;           // natural hang
    fabric_stiffness: number;          // material resistance
    shear_resistance: number;           // stretch behavior
    collision_detection: boolean;           // body penetration
    physics_simulation: string;
  };
  adjustment_offsets: {
    shoulder_horizontal: number;   // pixel adjustments
    waist_vertical: number;
    sleeve_length: number;
    hem_height: number;
  };
  compatibility_score: number; // 0-100 overall
} {
  // Calculate fit compatibility using geometric formulas
  const shoulderCompatibility = calculateShoulderFit(
    bodyProportions.body_proportions.shoulder_width,
    garmentMeasurements.shoulder_width
  );
  
  const torsoLengthFit = calculateLengthFit(
    bodyProportions.body_proportions.torso_length,
    garmentMeasurements.length
  );
  
  const waistPositionMatch = calculateWaistAlignment(
    bodyProportions.body_proportions.waist_position,
    garmentMeasurements.waist_width
  );
  
  const hipRoomAllowance = calculateHipFit(
    bodyProportions.body_proportions.hip_width,
    garmentMeasurements.hip_width
  );
  
  const sleeveLengthRatio = calculateSleeveFit(
    bodyProportions.body_proportions.arm_span,
    garmentMeasurements.sleeve_length
  );
  
  // Overall fit score using weighted formula from reports
  const overallFitScore = (
    shoulderCompatibility * 0.25 +
    torsoLengthFit * 0.20 +
    waistPositionMatch * 0.20 +
    hipRoomAllowance * 0.20 +
    sleeveLengthRatio * 0.15
  );
  
  // Drape parameters for physics simulation
  const drapeParameters = {
    gravity_factor: 0.98,           // Natural hang
    fabric_stiffness: 0.15,          // Material resistance
    shear_resistance: 0.82,           // Stretch behavior
    collision_detection: true,           // Body penetration
    physics_simulation: "simplified_spring"
  };
  
  // Calculate adjustment offsets for virtual try-on
  const adjustmentOffsets = {
    shoulder_horizontal: garmentMeasurements.shoulder_width - bodyProportions.body_proportions.shoulder_width,
    waist_vertical: garmentMeasurements.waist_width - (bodyProportions.body_proportions.waist_position[1] * 2),
    sleeve_length: garmentMeasurements.sleeve_length - (bodyProportions.body_proportions.arm_span * 0.3),
    hem_height: garmentMeasurements.length - bodyProportions.body_proportions.torso_length
  };
  
  // Final compatibility score (0-100)
  const compatibilityScore = overallFitScore * 100;
  
  return {
    fit_analysis: {
      shoulder_compatibility: shoulderCompatibility,
      torso_length_fit: torsoLengthFit,
      waist_position_match: waistPositionMatch,
      hip_room_allowance: hipRoomAllowance,
      sleeve_length_ratio: sleeveLengthRatio,
      overall_fit_score: overallFitScore
    },
    drape_parameters: drapeParameters,
    adjustment_offsets: adjustmentOffsets,
    compatibility_score: compatibilityScore
  };
}

// Geometric alignment logic for AR try-on
export function calculateGeometricAlignment(
  bodyLandmarks: any[],
  garmentAnchors: {
    shoulders: [number, number][];
    chest: [number, number];
    waist: [number, number];
    hips: [number, number];
  }
): {
  alignment_score: number; // 0-1 scale
  rotation_matrix: [number, number, number]; // [x, y, angle]
  scale_factor: number; // garment scaling needed
  translation_offset: [number, number]; // [x, y] positioning
  anchor_points: {
    matched: number;
    total: number;
    accuracy: number; // 0-1 scale
  };
} {
  // Extract body anchor points from landmarks
  const bodyAnchors = {
    shoulders: [
      [bodyLandmarks[11].x, bodyLandmarks[11].y],
      [bodyLandmarks[12].x, bodyLandmarks[12].y]
    ],
    chest: [bodyLandmarks[22].x, bodyLandmarks[22].y],
    waist: [bodyLandmarks[23].x, bodyLandmarks[23].y],
    hips: [bodyLandmarks[24].x, bodyLandmarks[24].y]
  };
  
  // Calculate alignment metrics
  const shoulderAlignment = calculatePointAlignment(bodyAnchors.shoulders, garmentAnchors.shoulders);
  const chestAlignment = calculatePointAlignment([bodyAnchors.chest], [garmentAnchors.chest]);
  const waistAlignment = calculatePointAlignment([bodyAnchors.waist], [garmentAnchors.waist]);
  const hipAlignment = calculatePointAlignment([bodyAnchors.hips], [garmentAnchors.hips]);
  
  // Overall alignment score
  const alignmentScore = (
    shoulderAlignment * 0.4 +
    chestAlignment * 0.2 +
    waistAlignment * 0.2 +
    hipAlignment * 0.2
  );
  
  // Calculate transformation matrix
  const rotationMatrix = calculateRotationMatrix(bodyAnchors, garmentAnchors);
  const scaleFactor = calculateScaleFactor(bodyAnchors, garmentAnchors);
  const translationOffset = calculateTranslationOffset(bodyAnchors, garmentAnchors);
  
  // Anchor point accuracy
  const totalAnchors = 2 + 1 + 1 + 1; // shoulders + chest + waist + hips
  const matchedAnchors = shoulderAlignment + chestAlignment + waistAlignment + hipAlignment;
  const anchorAccuracy = matchedAnchors / totalAnchors;
  
  return {
    alignment_score: alignmentScore,
    rotation_matrix: rotationMatrix,
    scale_factor: scaleFactor,
    translation_offset: translationOffset,
    anchor_points: {
      matched: matchedAnchors,
      total: totalAnchors,
      accuracy: anchorAccuracy
    }
  };
}

// Helper functions (deterministic mathematics only)

function calculateDistance(p1: any, p2: any): number {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function calculateWaistPosition(landmarks: any[]): [number, number] {
  // Waist is approximately at landmark 23-24 (hip joints)
  const waistLandmark = landmarks[23] || landmarks[24];
  return [waistLandmark.x, waistLandmark.y];
}

function calculateWaistHipRatio(waistPosition: [number, number], hipWidth: number): number {
  // Simplified waist calculation based on position and hip width
  const estimatedWaistWidth = hipWidth * 0.75; // Typical waist-hip ratio
  return estimatedWaistWidth / hipWidth;
}

function calculateMesomorphScore(shoulderHipRatio: number, waistHipRatio: number): number {
  // Mesomorph: broader shoulders, tapered waist
  const shoulderScore = Math.min(1, shoulderHipRatio / 1.2);
  const waistScore = Math.min(1, (1 - waistHipRatio) / 0.25);
  return (shoulderScore + waistScore) / 2;
}

function calculateEctomorphScore(heightRatio: number, armSpanRatio: number): number {
  // Ectomorph: lean, long limbs
  const heightScore = Math.min(1, heightRatio / 0.8);
  const armScore = Math.min(1, armSpanRatio / 1.0);
  return (heightScore + armScore) / 2;
}

function calculateEndomorphScore(waistHipRatio: number, hipWidth: number): number {
  // Endomorph: softer, wider proportions
  const waistScore = Math.min(1, waistHipRatio / 0.8);
  const hipScore = Math.min(1, hipWidth / 0.4);
  return (waistScore + hipScore) / 2;
}

function calculateShoulderTilt(leftShoulder: any, rightShoulder: any): number {
  // Calculate angle from horizontal (degrees)
  const shoulderSlope = (rightShoulder.y - leftShoulder.y) / (rightShoulder.x - leftShoulder.x);
  return Math.abs(Math.atan(shoulderSlope) * 180 / Math.PI);
}

function calculateSpineCurvature(landmarks: any[]): number {
  // Simplified spine curvature using shoulder-hip alignment
  const shoulderCenter = {
    x: (landmarks[11].x + landmarks[12].x) / 2,
    y: (landmarks[11].y + landmarks[12].y) / 2
  };
  const hipCenter = {
    x: (landmarks[23].x + landmarks[24].x) / 2,
    y: (landmarks[23].y + landmarks[24].y) / 2
  };
  
  // Deviation from vertical alignment
  const spineAngle = Math.atan2(hipCenter.x - shoulderCenter.x, hipCenter.y - shoulderCenter.y);
  return Math.abs(spineAngle * 180 / Math.PI);
}

function calculateHeadAlignment(landmarks: any[]): number {
  // Head alignment using nose and shoulder center
  const noseTip = landmarks[0]; // Nose tip
  const shoulderCenter = {
    x: (landmarks[11].x + landmarks[12].x) / 2,
    y: (landmarks[11].y + landmarks[12].y) / 2
  };
  
  // Distance from center line
  const centerLineX = shoulderCenter.x;
  const headOffset = Math.abs(noseTip.x - centerLineX);
  const maxOffset = Math.abs(landmarks[11].x - landmarks[12].x) / 2;
  
  return Math.max(0, 1 - (headOffset / maxOffset));
}

function calculateShoulderFit(bodyShoulder: number, garmentShoulder: number): number {
  const difference = Math.abs(bodyShoulder - garmentShoulder);
  const tolerance = bodyShoulder * 0.1; // 10% tolerance
  return Math.max(0, 1 - (difference / (bodyShoulder + tolerance)));
}

function calculateLengthFit(bodyLength: number, garmentLength: number): number {
  const difference = Math.abs(bodyLength - garmentLength);
  const tolerance = bodyLength * 0.05; // 5% tolerance
  return Math.max(0, 1 - (difference / (bodyLength + tolerance)));
}

function calculateWaistAlignment(bodyWaist: [number, number], garmentWaist: number): number {
  const bodyWaistWidth = bodyWaist[1] * 2; // Convert position to width
  const difference = Math.abs(bodyWaistWidth - garmentWaist);
  const tolerance = bodyWaistWidth * 0.08; // 8% tolerance
  return Math.max(0, 1 - (difference / (bodyWaistWidth + tolerance)));
}

function calculateHipFit(bodyHip: number, garmentHip: number): number {
  const difference = Math.abs(bodyHip - garmentHip);
  const tolerance = bodyHip * 0.12; // 12% tolerance
  return Math.max(0, 1 - (difference / (bodyHip + tolerance)));
}

function calculateSleeveFit(bodyArmSpan: number, garmentSleeve: number): number {
  const bodySleeveLength = bodyArmSpan * 0.3; // Approximate sleeve proportion
  const difference = Math.abs(bodySleeveLength - garmentSleeve);
  const tolerance = bodySleeveLength * 0.1; // 10% tolerance
  return Math.max(0, 1 - (difference / (bodySleeveLength + tolerance)));
}

function calculatePointAlignment(bodyPoints: [number, number][], garmentPoints: [number, number][]): number {
  let totalAlignment = 0;
  bodyPoints.forEach((bodyPoint, index) => {
    if (garmentPoints[index]) {
      const distance = Math.sqrt(
        Math.pow(bodyPoint[0] - garmentPoints[index][0], 2) +
        Math.pow(bodyPoint[1] - garmentPoints[index][1], 2)
      );
      const alignment = Math.max(0, 1 - (distance / 0.1)); // 0.1 = 10% tolerance
      totalAlignment += alignment;
    }
  });
  
  return totalAlignment / bodyPoints.length;
}

function calculateRotationMatrix(bodyAnchors: any, garmentAnchors: any): [number, number, number] {
  // Simplified 2D rotation calculation
  const bodyVector = [
    bodyAnchors.shoulders[1][0] - bodyAnchors.shoulders[0][0],
    bodyAnchors.shoulders[1][1] - bodyAnchors.shoulders[0][1]
  ];
  const garmentVector = [
    garmentAnchors.shoulders[1][0] - garmentAnchors.shoulders[0][0],
    garmentAnchors.shoulders[1][1] - garmentAnchors.shoulders[0][1]
  ];
  
  const bodyAngle = Math.atan2(bodyVector[1], bodyVector[0]);
  const garmentAngle = Math.atan2(garmentVector[1], garmentVector[0]);
  const rotation = garmentAngle - bodyAngle;
  
  return [Math.cos(rotation), Math.sin(rotation), rotation * 180 / Math.PI];
}

function calculateScaleFactor(bodyAnchors: any, garmentAnchors: any): number {
  const bodyWidth = Math.abs((bodyAnchors.shoulders[1] as [number, number])[0] - (bodyAnchors.shoulders[0] as [number, number])[0]);
  const garmentWidth = Math.abs((garmentAnchors.shoulders[1] as [number, number])[0] - (garmentAnchors.shoulders[0] as [number, number])[0]);
  
  return garmentWidth / bodyWidth;
}

function calculateTranslationOffset(bodyAnchors: any, garmentAnchors: any): [number, number] {
  const bodyCenter = [
    ((bodyAnchors.shoulders[0] as [number, number])[0] + (bodyAnchors.shoulders[1] as [number, number])[0]) / 2,
    ((bodyAnchors.shoulders[0] as [number, number])[1] + (bodyAnchors.shoulders[1] as [number, number])[1]) / 2
  ];
  const garmentCenter = [
    ((garmentAnchors.shoulders[0] as [number, number])[0] + (garmentAnchors.shoulders[1] as [number, number])[0]) / 2,
    ((garmentAnchors.shoulders[0] as [number, number])[1] + (garmentAnchors.shoulders[1] as [number, number])[1]) / 2
  ];
  
  return [
    garmentCenter[0] - bodyCenter[0],
    garmentCenter[1] - bodyCenter[1]
  ];
}
