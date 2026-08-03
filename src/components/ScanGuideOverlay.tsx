import React from 'react';
import { FaceValidationResult } from '../lib/ai/computer-vision/faceDetection';

export interface ScanGuideOverlayProps {
  validationResult: FaceValidationResult | null;
  isActive: boolean;
  className?: string;
}

export const ScanGuideOverlay: React.FC<ScanGuideOverlayProps> = ({
  validationResult,
  isActive,
  className = '',
}) => {
  if (!isActive) {
    return null;
  }

  if (!validationResult) {
    throw new Error("CLINICAL_ERROR: Missing validation result");
  }

  const getGuideColor = () => {
    if (validationResult.isValid) return '#00ff00';
    if (validationResult.faceDistanceStatus !== 'optimal') return '#ffaa00';
    return '#ff0000';
  };

  const getGuideMessage = () => {
    if (validationResult.isValid) {
      return 'Hold steady - scanning ready';
    }
    
    const messages = [];
    
    if (validationResult.faceDistanceStatus === 'too-far') {
      messages.push('Move closer');
    } else if (validationResult.faceDistanceStatus === 'too-close') {
      messages.push('Move back slightly');
    }
    
    if (validationResult.occlusionDetected) {
      messages.push('Show full face');
    }
    
    if (Math.abs(validationResult.headTilt) > 15) {
      messages.push('Keep head straight');
    }
    
    return messages.join(' • ');
  };

  return (
    <div className={`scan-guide-overlay ${className}`}>
      <svg
        className="guide-frame"
        viewBox="0 0 100 100"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80%',
          height: '80%',
          pointerEvents: 'none',
        }}
      >
        {/* Face guide oval */}
        <ellipse
          cx="50"
          cy="50"
          rx="25"
          ry="35"
          fill="none"
          stroke={getGuideColor()}
          strokeWidth="2"
          strokeDasharray={validationResult.isValid ? "0" : "5,5"}
          opacity={validationResult.isValid ? 0.3 : 0.8}
        />
        
        {/* Corner indicators */}
        {!validationResult.isValid && (
          <>
            {/* Top left */}
            <path
              d="M 25 15 L 25 25 L 35 25"
              fill="none"
              stroke={getGuideColor()}
              strokeWidth="2"
            />
            {/* Top right */}
            <path
              d="M 65 25 L 75 25 L 65 25"
              fill="none"
              stroke={getGuideColor()}
              strokeWidth="2"
            />
            {/* Bottom left */}
            <path
              d="M 35 75 L 25 85 L 35 85"
              fill="none"
              stroke={getGuideColor()}
              strokeWidth="2"
            />
            {/* Bottom right */}
            <path
              d="M 65 75 L 75 85 L 65 85"
              fill="none"
              stroke={getGuideColor()}
              strokeWidth="2"
            />
          </>
        )}
        
        {/* Center guide dots for key facial features */}
        <g opacity={validationResult.isValid ? 0.6 : 0.3}>
          {/* Forehead */}
          <circle cx="50" cy="20" r="1.5" fill={getGuideColor()} />
          {/* Left cheek */}
          <circle cx="30" cy="45" r="1.5" fill={getGuideColor()} />
          {/* Right cheek */}
          <circle cx="70" cy="45" r="1.5" fill={getGuideColor()} />
          {/* Chin */}
          <circle cx="50" cy="75" r="1.5" fill={getGuideColor()} />
        </g>
      </svg>
      
      {/* Guide message */}
      <div
        className="guide-message"
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: '500',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        {getGuideMessage()}
      </div>
      
      {/* Distance indicator */}
      {validationResult.faceDistanceStatus !== 'optimal' && (
        <div
          className="distance-indicator"
          style={{
            position: 'absolute',
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            pointerEvents: 'none',
          }}
        >
          {validationResult.faceDistanceStatus === 'too-far' ? (
            <>
              <span style={{ color: '#ffaa00', fontSize: '20px' }}>➕</span>
              <span style={{ color: 'white', fontSize: '12px' }}>Move Closer</span>
            </>
          ) : (
            <>
              <span style={{ color: '#ffaa00', fontSize: '20px' }}>➖</span>
              <span style={{ color: 'white', fontSize: '12px' }}>Move Back</span>
            </>
          )}
        </div>
      )}
      
      {/* Lighting indicator */}
      <div
        className="lighting-indicator"
        style={{
          position: 'absolute',
          top: '10%',
          right: '10%',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: validationResult.blurScore > 50 ? '#00ff00' : '#ffaa00',
            boxShadow: validationResult.blurScore > 50 ? '0 0 10px #00ff00' : '0 0 10px #ffaa00',
          }}
        />
        <span style={{ color: 'white', fontSize: '12px' }}>
          {validationResult.blurScore > 50 ? 'Good' : 'Adjust'} Lighting
        </span>
      </div>
      
      {/* Stability indicator */}
      <div
        className="stability-indicator"
        style={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        <div
          className="stability-bars"
          style={{
            display: 'flex',
            gap: '2px',
            alignItems: 'flex-end',
          }}
        >
          {[1, 2, 3, 4, 5].map((bar) => (
            <div
              key={bar}
              style={{
                width: '3px',
                height: `${bar * 4}px`,
                backgroundColor: validationResult.blurScore > 50 ? '#00ff00' : '#ffaa00',
                opacity: validationResult.blurScore > 50 ? 1 : 0.5,
                borderRadius: '1px',
              }}
            />
          ))}
        </div>
        <span style={{ color: 'white', fontSize: '12px' }}>
          {validationResult.blurScore > 50 ? 'Steady' : 'Hold Still'}
        </span>
      </div>
    </div>
  );
};
