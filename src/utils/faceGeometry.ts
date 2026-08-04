// src/lib/utils/faceGeometry.ts

export type Pose = "FRONT" | "LEFT" | "RIGHT" | "UNKNOWN";

/**
 * 📐 GEOMETRY CORE: Detects face orientation based on landmark ratios.
 * Moved from MirrorScreen.tsx for Clean Architecture.
 */
export const detectFacePose = (landmarks: any[]): Pose => {
  if (!landmarks || landmarks.length < 468) return "UNKNOWN";

  const nose = landmarks[1];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];

  if (!nose || !leftCheek || !rightCheek || !leftEye || !rightEye)
    return "UNKNOWN";

  // Check for vertical tilt/stability
  const eyeTilt = Math.abs(leftEye.y - rightEye.y);
  if (eyeTilt > 0.06) return "UNKNOWN";

  // Calculate horizontal ratios
  const leftDist = Math.abs(nose.x - leftCheek.x);
  const rightDist = Math.abs(nose.x - rightCheek.x);

  const diff = rightDist - leftDist;
  const ratio = diff / (rightDist + leftDist);

  if (ratio < -0.15) return "RIGHT";
  if (ratio > 0.15) return "LEFT";
  if (Math.abs(ratio) <= 0.1) return "FRONT";

  return "UNKNOWN";
};
