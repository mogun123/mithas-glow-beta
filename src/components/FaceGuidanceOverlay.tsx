// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - Face Guidance Overlay
// Premium face alignment guide with ghost face outline
// ═══════════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef } from 'react';

interface FaceGuidanceOverlayProps {
  faceDetected: boolean;
  landmarks?: any[] | null;
  onAligned?: () => void;
  pipelineState?: string;
}

export const FaceGuidanceOverlay: React.FC<FaceGuidanceOverlayProps> = ({
  faceDetected,
  landmarks,
  onAligned,
  pipelineState
}) => {
  const [isAligned, setIsAligned] = React.useState(false);
  const [faceMeshReady, setFaceMeshReady] = React.useState(false);

  // Oval center and dimensions in SVG coordinates
  const ovalCenter = { x: 140, y: 175 };
  const ovalRadius = { x: 100, y: 130 };

  // Calculate face bounding box using only face contour landmarks (more accurate)
  const calculateFaceBoundingBox = (lm: any[]) => {
    if (!lm || lm.length === 0) return null;

    // Use only face oval landmarks (10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109)
    // These are the main face contour points, not all 478 landmarks
    const faceContourIndices = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];

    let minX = 1, maxX = 0, minY = 1, maxY = 0;

    for (const idx of faceContourIndices) {
      if (lm[idx]) {
        const x = lm[idx].x;
        const y = lm[idx].y;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }

    // Convert to SVG coordinates
    return {
      x: minX * 280,
      y: minY * 350,
      width: (maxX - minX) * 280,
      height: (maxY - minY) * 350,
      centerX: ((minX + maxX) / 2) * 280,
      centerY: ((minY + maxY) / 2) * 350
    };
  };

  // Calculate if face is within oval area (relaxed check)
  const isFaceWithinOval = (faceBox: { x: number; y: number; width: number; height: number; centerX: number; centerY: number }) => {
    // Oval bounding box
    const ovalBox = {
      x: ovalCenter.x - ovalRadius.x,
      y: ovalCenter.y - ovalRadius.y,
      width: ovalRadius.x * 2,
      height: ovalRadius.y * 2
    };

    // Check if face center is within oval (with generous margin)
    const centerXInOval = faceBox.centerX >= ovalBox.x && faceBox.centerX <= ovalBox.x + ovalBox.width;
    const centerYInOval = faceBox.centerY >= ovalBox.y && faceBox.centerY <= ovalBox.y + ovalBox.height;

    // Check if at least 40% of face is inside oval (very relaxed)
    const xOverlap = Math.max(0, Math.min(faceBox.x + faceBox.width, ovalBox.x + ovalBox.width) - Math.max(faceBox.x, ovalBox.x));
    const yOverlap = Math.max(0, Math.min(faceBox.y + faceBox.height, ovalBox.y + ovalBox.height) - Math.max(faceBox.y, ovalBox.y));
    const intersectionArea = xOverlap * yOverlap;
    const faceArea = faceBox.width * faceBox.height;
    const overlapPercentage = faceArea > 0 ? (intersectionArea / faceArea) * 100 : 0;

    // Accept if face center is in oval OR 40% overlap (very lenient)
    return centerXInOval && centerYInOval && overlapPercentage >= 40;
  };

  // Determine if face is aligned
  const checkAlignment = () => {
    // Block alignment check until FaceMesh is ready
    if (!faceMeshReady) {
      setIsAligned(false);
      return;
    }

    // Reject if no real face detected
    if (!faceDetected || !landmarks || landmarks.length === 0) {
      setIsAligned(false);
      return;
    }

    const faceBox = calculateFaceBoundingBox(landmarks);
    if (!faceBox) {
      setIsAligned(false);
      return;
    }

    // Very relaxed alignment: just check if face is within oval area
    const aligned = isFaceWithinOval(faceBox);
    setIsAligned(aligned);

    // Phase 5: Remove timer-based auto scan - pipeline only progresses from validation results
  };

  useEffect(() => {
    // Set faceMeshReady when valid landmarks are received
    if (landmarks && landmarks.length >= 468 && !faceMeshReady) {
      console.log('[SYNC] FaceMesh READY - setting flag');
      setFaceMeshReady(true);
    }

    checkAlignment();
  }, [faceDetected, landmarks, faceMeshReady]);

  // Hide overlay when pipeline progresses beyond VALIDATING_FACE
  const shouldShowOverlay = !pipelineState || [
    'BOOT',
    'CAMERA_READY',
    'FACE_DETECTED',
    'VALIDATING_FACE',
    'VALIDATION_FAILED'
  ].includes(pipelineState);

  const outlineColor = isAligned ? '#22c55e' : 'rgba(255, 255, 255, 0.6)';
  const strokeWidth = isAligned ? '3' : '2';

  // Hide overlay if pipeline has progressed beyond validation
  if (!shouldShowOverlay) {
    return null;
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="relative">
        {/* Ghost Face SVG Outline */}
        <svg
          width="280"
          height="350"
          viewBox="0 0 280 350"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`transition-all duration-500 ${faceDetected ? 'opacity-100' : 'opacity-100'}`}
          style={{
            animation: isAligned ? 'none' : 'pulse 2s ease-in-out infinite',
          }}
        >
          {/* Face outline */}
          <ellipse
            cx="140"
            cy="175"
            rx="100"
            ry="130"
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Center crosshair */}
          <g stroke={outlineColor} strokeWidth="1.5" strokeLinecap="round">
            <line x1="130" y1="175" x2="150" y2="175" />
            <line x1="140" y1="165" x2="140" y2="185" />
          </g>

          {/* Left eye guide */}
          <ellipse
            cx="95"
            cy="140"
            rx="20"
            ry="12"
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Right eye guide */}
          <ellipse
            cx="185"
            cy="140"
            rx="20"
            ry="12"
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Nose guide */}
          <path
            d="M140 160 L140 200 L125 215"
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Mouth guide */}
          <path
            d="M110 240 Q140 260 170 240"
            stroke={outlineColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Alignment Text */}
        <div
          className={`absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-center transition-opacity duration-500 ${
            isAligned ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <p className="text-white text-sm font-medium drop-shadow-lg">
            Align your face with the guide
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.02);
          }
        }
      `}</style>
    </div>
  );
};
