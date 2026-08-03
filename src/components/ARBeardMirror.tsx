// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - AR Beard Mirror Component
// Main React UI component for the beard AR experience
// ═══════════════════════════════════════════════════════════════════════════

import React, { useRef, useEffect, useState } from 'react';
import { useAREngine } from '../hooks/useAREngine';
import { useARStore } from '../store/arStore';
import { useBeardStore } from '../store/beardStore';
import { BeardStyle } from '../types/engine.types';
import { ScanProgress } from '../engine/ScanFlowEngine';
import { ScanFlowUI } from './ScanFlowUI';
import { PipelineState } from '../engine/ARPipelineController';
import { FaceGuidanceOverlay } from './FaceGuidanceOverlay';

interface ARBeardMirrorProps {
  beardStyles: BeardStyle[];
  onStyleChange?: (style: BeardStyle) => void;
  onClose?: () => void;
}

export const ARBeardMirror: React.FC<ARBeardMirrorProps> = ({
  beardStyles,
  onStyleChange,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const arEngine = useAREngine({
    videoRef,
    canvasRef,
    onBeardStyleSelected: onStyleChange,
    onError: (error) => console.error('AR Error:', error),
  });

  const arState = useARStore();
  const beardState = useBeardStore();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const isLoadingBeardRef = useRef(false); // STRICT CACHE GUARD: Prevent duplicate loadBeardStyle calls
  const currentStyleIdRef = useRef<string | null>(null); // Track current style ID to prevent reloads

  // Initialize beard styles in store
  useEffect(() => {
    beardState.setAvailableStyles(beardStyles);
  }, [beardStyles]);

  // Check if refs are ready
  useEffect(() => {
    if (videoRef.current && canvasRef.current) {
      setIsReady(true);
    }
  }, [videoRef.current, canvasRef.current]);

  // Auto-initialize (run once when refs are ready)
  useEffect(() => {
    if (isReady && !hasInitialized) {
      arEngine.initialize();
      setHasInitialized(true);
    }
  }, [isReady, hasInitialized, arEngine]);

  // Auto-start AR when initialized
  useEffect(() => {
    if (arEngine.isInitialized && !arEngine.isActive) {
      console.log('[ARBeardMirror] Auto-starting AR...');
      arEngine.startAR();
    }
  }, [arEngine.isInitialized, arEngine.isActive]);

  // Force activation when video and FaceMesh are ready (bypass normal flow)
  useEffect(() => {
    if (videoRef.current && arEngine.isInitialized && !arEngine.isActive) {
      console.log('[ARBeardMirror] Forcing engine activation - video and FaceMesh ready');
      arEngine.startAR();
    }
  }, [arEngine.isInitialized, arEngine.isActive]);

  // Load beard when pipeline reaches LOADING_BEARD state
  useEffect(() => {
    // STRICT CACHE GUARD: Only load if not already loading
    if (isLoadingBeardRef.current) {
      return;
    }

    // STRICT CACHE GUARD: Only load if style ID has changed
    const targetStyleId = beardStyles[0]?.id;
    if (targetStyleId && targetStyleId === currentStyleIdRef.current) {
      return; // Same style already loaded or loading
    }

    if (arEngine.pipelineState === PipelineState.LOADING_BEARD && beardStyles.length > 0 && !arEngine.currentBeardStyle) {
      console.log('[ARBeardMirror] 🚀 Calling loadBeardStyle for:', beardStyles[0].name);
      currentStyleIdRef.current = beardStyles[0].id; // Track style ID
      isLoadingBeardRef.current = true; // Set loading flag
      arEngine.loadBeardStyle(beardStyles[0]).finally(() => {
        isLoadingBeardRef.current = false; // Reset loading flag
      });
    }
  }, [arEngine.pipelineState, beardStyles.length, arEngine.currentBeardStyle]); // Removed arEngine from dependencies

  // Handle style selection
  const handleStyleSelect = async (index: number) => {
    // STRICT CACHE GUARD: Only load if not already loading
    if (isLoadingBeardRef.current) {
      return;
    }

    // STRICT CACHE GUARD: Only load if style ID has changed
    const style = beardStyles[index];
    if (style.id === currentStyleIdRef.current) {
      return; // Same style already loaded or loading
    }

    setSelectedIndex(index);
    currentStyleIdRef.current = style.id; // Track style ID
    isLoadingBeardRef.current = true; // Set loading flag
    await arEngine.loadBeardStyle(style).finally(() => {
      isLoadingBeardRef.current = false; // Reset loading flag
    });
    beardState.setCarouselIndex(index);
  };

  // Handle close
  const handleClose = () => {
    arEngine.stopAR();
    onClose?.();
  };

  return (
    <div className="relative w-full h-full bg-transparent">
      {/* Video element for camera feed */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
        autoPlay
        style={{
          display: 'block',
          transform: 'scaleX(-1)',
          zIndex: 1,
          visibility: 'visible'
        }}
      />

      {/* Canvas for Three.js rendering */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          pointerEvents: "none",
          zIndex: 2,
          transform: 'scaleX(-1)'
        }}
      />

      {/* Face Guidance Overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 3 }}>
        <FaceGuidanceOverlay
          faceDetected={
            arEngine.pipelineState !== PipelineState.BOOT &&
            arEngine.pipelineState !== PipelineState.CAMERA_READY
          }
          landmarks={arState.landmarks}
          pipelineState={arEngine.pipelineState}
        />
      </div>

      {/* Initializing Camera overlay */}
      {arEngine.pipelineState === PipelineState.BOOT && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80" style={{ zIndex: 4 }}>
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
            <p className="text-lg">Initializing Camera</p>
          </div>
        </div>
      )}

      {/* Face not detected overlay */}
      {arEngine.pipelineState === PipelineState.CAMERA_READY && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50" style={{ zIndex: 4 }}>
          <div className="text-white text-center">
            <div className="text-4xl mb-4">👤</div>
            <p className="text-lg">Position your face in the camera</p>
          </div>
        </div>
      )}

      {/* Face Detected / Validating overlay */}
      {arEngine.pipelineState === PipelineState.FACE_DETECTED && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50" style={{ zIndex: 4 }}>
          <div className="text-white text-center">
            <div className="text-4xl mb-4">✅</div>
            <p className="text-lg">Face Detected</p>
            <p className="text-sm text-gray-300 mt-2">Optimizing your position...</p>
          </div>
        </div>
      )}

      {/* Validating overlay */}
      {arEngine.pipelineState === PipelineState.VALIDATING_FACE && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50" style={{ zIndex: 4 }}>
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
            <p className="text-lg">Validating Position...</p>
          </div>
        </div>
      )}

      {/* Validation failed overlay */}
      {arEngine.pipelineState === PipelineState.VALIDATION_FAILED && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50" style={{ zIndex: 4 }}>
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-4 text-center">
            <div className="text-2xl mb-2">⚠️</div>
            <h3 className="text-lg font-semibold mb-2">Adjust Your Position</h3>
            <p className="text-gray-600 mb-4">{arState.validation?.guidance || 'Please adjust your position'}</p>
            <div className="space-y-1 text-sm text-gray-500">
              {arState.validation?.issues.map((issue, i) => (
                <div key={i}>• {issue}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Scan Flow UI */}
      {(arEngine.pipelineState === PipelineState.VALIDATING_FACE || arEngine.pipelineState === PipelineState.SCANNING) && (
        <div style={{ zIndex: 4 }}>
          <ScanFlowUI isActive={true} />
        </div>
      )}

      {/* Analyzing overlay */}
      {arEngine.pipelineState === PipelineState.ANALYZING && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50" style={{ zIndex: 4 }}>
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
            <p className="text-lg">Analyzing Face Data...</p>
          </div>
        </div>
      )}

      {/* Generating anchors overlay */}
      {arEngine.pipelineState === PipelineState.GENERATING_ANCHORS && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50" style={{ zIndex: 4 }}>
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
            <p className="text-lg">Generating Anchors...</p>
          </div>
        </div>
      )}

      {/* Loading beard overlay */}
      {arEngine.pipelineState === PipelineState.LOADING_BEARD && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50" style={{ zIndex: 4 }}>
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
            <p className="text-lg">Loading Beard...</p>
          </div>
        </div>
      )}

      {/* Attaching beard overlay */}
      {arEngine.pipelineState === PipelineState.ATTACHING_BEARD && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
            <p className="text-lg">Attaching Beard...</p>
          </div>
        </div>
      )}

      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors z-50"
      >
        ✕
      </button>
    </div>
  );
};
