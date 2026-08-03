// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - AR Engine Orchestrator Hook
// Main coordinator for all AR engines - React hook for UI integration
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback, useState } from 'react';
import { CameraEngine } from '../engine/CameraEngine';
import { FaceValidationEngine } from '../engine/FaceValidationEngine';
import { FaceStabilizationEngine } from '../engine/FaceStabilizationEngine';
import { FaceDepthEngine } from '../engine/FaceDepthEngine';
import { DynamicAnchorEngine } from '../engine/DynamicAnchorEngine';
import { BeardAttachmentEngine } from '../engine/BeardAttachmentEngine';
import { ThreeEngine } from '../engine/ThreeEngine';
import { PerformanceEngine } from '../engine/PerformanceEngine';
import { BeardAssetManager } from '../engine/BeardAssetManager';
import { ScanFlowEngine, ScanProgress } from '../engine/ScanFlowEngine';
import { BeardStyle } from '../types/engine.types';
import { useARStore } from '../store/arStore';
import { useCameraStore } from '../store/cameraStore';
import { usePerformanceStore } from '../store/performanceStore';
import { ARPipelineController, PipelineState, PipelineStateData, PipelineCallbacks } from '../engine/ARPipelineController';
import { FaceMesh, Results } from '@mediapipe/face_mesh';
import { FaceLifecycleEngine } from '../engine/FaceLifecycleEngine';
import { globalEventBus } from '../core/EventBus';
import { AREvents, PipelineStateChangeEvent, ValidationSuccessEvent, ValidationFailedEvent, BeardLoadedEvent, FaceLostEvent } from '../core/EventTypes';

interface AREngineConfig {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onBeardStyleSelected?: (style: BeardStyle) => void;
  onError?: (error: string) => void;
}

export function useAREngine(config: AREngineConfig) {
  const { videoRef, canvasRef, onBeardStyleSelected, onError } = config;

  // Engine instances
  const cameraEngineRef = useRef<CameraEngine | null>(null);
  const validationEngineRef = useRef<FaceValidationEngine | null>(null);
  const stabilizationEngineRef = useRef<FaceStabilizationEngine | null>(null);
  const depthEngineRef = useRef<FaceDepthEngine | null>(null);
  const anchorEngineRef = useRef<DynamicAnchorEngine | null>(null);
  const attachmentEngineRef = useRef<BeardAttachmentEngine | null>(null);
  const threeEngineRef = useRef<ThreeEngine | null>(null);
  const performanceEngineRef = useRef<PerformanceEngine | null>(null);
  const assetManagerRef = useRef<BeardAssetManager | null>(null);
  const scanFlowEngineRef = useRef<ScanFlowEngine | null>(null);
  const faceLifecycleEngineRef = useRef<FaceLifecycleEngine | null>(null);

  // Pipeline Controller
  const pipelineControllerRef = useRef<ARPipelineController | null>(null);

  // MediaPipe FaceMesh (Main Thread)
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isLoopRunningRef = useRef(false);
  const isProcessingFrameRef = useRef(false);
  const faceMeshReadyRef = useRef(false);
  const validationExecutedRef = useRef(false); // Phase 3: Validation executes only once

  // Hidden processing canvas for FaceMesh input
  const processingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const processingCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Persistent validation canvas for image data collection (memory leak fix)
  const validationCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const validationCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [currentBeardStyle, setCurrentBeardStyle] = useState<BeardStyle | null>(null);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [pipelineState, setPipelineState] = useState<PipelineState>(PipelineState.BOOT);

  // Ref for pipelineState — avoids stale closure in faceMesh.onResults callback
  const pipelineStateRef = useRef<PipelineState>(PipelineState.BOOT);

  // Store updates
  const setARInitialized = useARStore(state => state.setInitialized);
  const setARActive = useARStore(state => state.setActive);
  const setCameraActive = useCameraStore(state => state.setActive);
  const updatePerformanceMetrics = usePerformanceStore(state => state.addSnapshot);

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZE ALL ENGINES
  // ═══════════════════════════════════════════════════════════════════════════

  const initialize = useCallback(async () => {
    try {
      console.log('[PIPELINE][INIT] 🚀 Initializing MITHASGLOW AR Engine...');

      // Check if video element is available
      if (!videoRef.current) {
        throw new Error('Video element not available. Ensure the component is mounted before initializing.');
      }

      // Check if canvas element is available
      if (!canvasRef.current) {
        throw new Error('Canvas element not available. Ensure the component is mounted before initializing.');
      }

      console.log('[PIPELINE][INIT] ⏳ Initializing Performance Engine...');
      performanceEngineRef.current = new PerformanceEngine();
      await performanceEngineRef.current.initialize();
      console.log('[PIPELINE][INIT] ✅ Performance Engine initialized');

      console.log('[PIPELINE][INIT] ⏳ Initializing Camera Engine...');
      cameraEngineRef.current = new CameraEngine({
        facingMode: 'user',
        width: 640,
        height: 480,
        frameRate: 30,
      });

      const cameraInitialized = await cameraEngineRef.current.initialize(videoRef.current);
      if (!cameraInitialized) {
        throw new Error('Camera initialization failed. Please check camera permissions.');
      }

      console.log('[PIPELINE][INIT] Camera initialized');
      console.log('[PIPELINE][INIT] ⏳ Initializing Three.js Engine...');

      threeEngineRef.current = new ThreeEngine({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      }, globalEventBus);

      try {
        const threeInitialized = await threeEngineRef.current.initialize(canvasRef.current);
        if (!threeInitialized) {
          throw new Error('Three.js initialization failed');
        }
        console.log('[THREE] INIT SUCCESS');
      } catch (err) {
        console.error('[THREE] INIT FAILED', err);
        // Continue initialization even if Three.js fails
      }

      console.log('[PIPELINE][INIT] ⏳ Initializing Face Validation Engine...');
      validationEngineRef.current = new FaceValidationEngine(globalEventBus);
      console.log('[PIPELINE][INIT] ⏳ Initializing Face Stabilization Engine...');
      stabilizationEngineRef.current = new FaceStabilizationEngine({
        smoothingFactor: 0.12,
        kalmanGain: 0.1,
        jitterThreshold: 0.02,
        velocityPrediction: true,
        rotationalDamping: 0.8,
      }, globalEventBus);
      console.log('[PIPELINE][INIT] ⏳ Initializing Face Depth Engine...');
      depthEngineRef.current = new FaceDepthEngine(globalEventBus);
      console.log('[PIPELINE][INIT] ⏳ Initializing Dynamic Anchor Engine...');
      anchorEngineRef.current = new DynamicAnchorEngine(globalEventBus);
      anchorEngineRef.current.initialize();
      console.log('[PIPELINE][INIT] ⏳ Initializing Beard Attachment Engine...');
      attachmentEngineRef.current = new BeardAttachmentEngine({
        followMouth: true,
        followExpression: true,
        depthAware: true,
        occlusionEnabled: true,
        skinBlending: true,
      }, globalEventBus);
      console.log('[PIPELINE][INIT] ⏳ Initializing Beard Asset Manager...');
      assetManagerRef.current = new BeardAssetManager(globalEventBus);
      console.log('[PIPELINE][INIT] ⏳ Initializing Scan Flow Engine...');
      scanFlowEngineRef.current = new ScanFlowEngine(globalEventBus);
      console.log('[PIPELINE][INIT] ⏳ Initializing Face Lifecycle Engine...');
      faceLifecycleEngineRef.current = new FaceLifecycleEngine(globalEventBus);

      console.log('[PIPELINE][INIT] ⏳ Initializing MediaPipe FaceMesh (Main Thread)...');

      faceMeshRef.current = new FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        },
      });

      await faceMeshRef.current.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        selfieMode: true,
      });

      // Pass camera to DynamicAnchorEngine after ThreeEngine is initialized
      if (threeEngineRef.current && anchorEngineRef.current) {
        const camera = threeEngineRef.current.getCamera();
        if (camera) {
          anchorEngineRef.current.setCamera(camera);
          console.log('[PIPELINE][INIT] ✅ Camera passed to DynamicAnchorEngine');
        }
      }

      if (threeEngineRef.current && attachmentEngineRef.current) {
        const camera = threeEngineRef.current.getCamera();
        if (camera) {
          attachmentEngineRef.current.setCamera(camera);
          console.log('[PIPELINE][INIT] ✅ Camera passed to BeardAttachmentEngine');
        }
      }

      // Set up result callback - emit events through EventBus
      faceMeshRef.current.onResults((results: Results) => {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
          const landmarks = results.multiFaceLandmarks[0];

          // Only process when landmarks > 400
          if (landmarks.length > 400) {
            useARStore.getState().setLandmarks(landmarks);

            // Collect image data for validation if in VALIDATING_FACE state
            // NOTE: pipelineStateRef used here (not pipelineState) to avoid stale closure
            // MEMORY LEAK FIX: Reuse persistent canvas instead of creating new one every frame
            if (pipelineStateRef.current === PipelineState.VALIDATING_FACE && validationEngineRef.current && videoRef.current && validationCanvasRef.current && validationCtxRef.current) {
              // Resize canvas if video dimensions changed
              if (validationCanvasRef.current.width !== videoRef.current.videoWidth || validationCanvasRef.current.height !== videoRef.current.videoHeight) {
                validationCanvasRef.current.width = videoRef.current.videoWidth;
                validationCanvasRef.current.height = videoRef.current.videoHeight;
              }
              validationCtxRef.current.drawImage(videoRef.current, 0, 0);
              const imageData = validationCtxRef.current.getImageData(0, 0, validationCanvasRef.current.width, validationCanvasRef.current.height);
              validationEngineRef.current.collectImageData(imageData);
            }

            // Emit FACE_RESULTS event - FaceLifecycleEngine will handle
            globalEventBus.emit(AREvents.FACE_RESULTS, {
              landmarks: landmarks.map((lm: any) => ({ x: lm.x, y: lm.y, z: lm.z })),
              timestamp: performance.now(),
              confidence: 1,
              headRotation: { pitch: 0, yaw: 0, roll: 0 },
              mouthOpen: 0,
              expression: 'neutral' as const,
            });
          } else {
            useARStore.getState().setLandmarks(null);
          }
        } else {
          useARStore.getState().setLandmarks(null);

          // Emit FACE_LOST event - FaceLifecycleEngine will handle
          globalEventBus.emit<FaceLostEvent>(AREvents.FACE_LOST, {
            timestamp: performance.now(),
            reason: 'no_detection',
          });
        }
      });

      console.log('[PIPELINE][INIT] ⏳ Initializing FaceMesh...');
      await faceMeshRef.current.initialize();
      console.log('[PIPELINE][INIT] ✅ FaceMesh initialized successfully');

      // Mark FaceMesh as ready
      faceMeshReadyRef.current = true;

      // Initialize persistent validation canvas for image data collection (memory leak fix)
      validationCanvasRef.current = document.createElement('canvas');
      validationCtxRef.current = validationCanvasRef.current.getContext('2d');

      setIsInitialized(true);
      setARInitialized(true);
      setCameraActive(true);

      // Initialize Pipeline Controller
      const pipelineCallbacks: PipelineCallbacks = {
        onStateChange: (data: PipelineStateData) => {
          setPipelineState(data.state);
          pipelineStateRef.current = data.state;
          console.log('[PIPELINE][CONTROLLER] State changed to:', data.state);

          // Set pipeline ready flag when FaceMesh is initialized (CAMERA_READY state)
          if (data.state === PipelineState.CAMERA_READY) {
            if (cameraEngineRef.current) {
              cameraEngineRef.current.setPipelineReady(true);
            }
            if (performanceEngineRef.current) {
              performanceEngineRef.current.setPipelineReady(true);
            }
          }
        },
        onValidationStart: () => {
          console.log('[PIPELINE][CONTROLLER] Validation started');
        },
        onScanStart: () => {
          console.log('[PIPELINE][CONTROLLER] Scan started');
          setIsScanning(true);
          if (scanFlowEngineRef.current) {
            scanFlowEngineRef.current.startScan();
            setScanProgress(scanFlowEngineRef.current.getProgress());
          }
        },
        onScanPhaseChange: (phase, progress) => {
          setScanProgress(progress);
        },
        onScanComplete: () => {
          console.log('[PIPELINE][CONTROLLER] Scan complete');
          setIsScanning(false);
          if (stabilizationEngineRef.current) {
            stabilizationEngineRef.current.reset();
          }
          if (anchorEngineRef.current) {
            anchorEngineRef.current.initialize();
          }
        },
        onAnalysisStart: () => {
          console.log('[PIPELINE][CONTROLLER] Analysis started');
        },
        onAnchorGenerationStart: () => {
          console.log('[PIPELINE][CONTROLLER] Anchor generation started');
        },
        onBeardLoadStart: () => {
          console.log('[PIPELINE][CONTROLLER] Beard load started');
        },
        onBeardLoadComplete: () => {
          console.log('[PIPELINE][CONTROLLER] Beard load complete');
        },
        onAttachmentStart: () => {
          console.log('[PIPELINE][CONTROLLER] Attachment started');
        },
        onAttachmentComplete: () => {
          console.log('[PIPELINE][CONTROLLER] Attachment complete');
        },
        onRenderingStart: () => {
          console.log('[PIPELINE][CONTROLLER] Rendering started');
        },
        onActiveAR: () => {
          console.log('[PIPELINE][CONTROLLER] Active AR mode');
        },
      };

      pipelineControllerRef.current = new ARPipelineController(pipelineCallbacks);
      // ARPipelineController subscribes to CAMERA_READY event internally.
      // The actual CAMERA_READY emission happens in startAR() after initialize() returns.

      console.log('[PIPELINE][INIT] ✅ MITHASGLOW AR Engine initialized successfully');
    } catch (error) {
      console.error('[PIPELINE][INIT] ❌ AR Engine initialization failed:', error);
      onError?.(error instanceof Error ? error.message : 'Initialization failed');
    }
  }, [videoRef, canvasRef, onError, setARInitialized, setCameraActive]);

  // ═══════════════════════════════════════════════════════════════════════════
  // START AR
  // ═══════════════════════════════════════════════════════════════════════════

  const startAR = useCallback(async () => {
    console.log('[PIPELINE][AR] 🎬 Starting AR...');

    if (!isInitialized) {
      await initialize();
    }

    if (threeEngineRef.current) {
      threeEngineRef.current.startRendering();
    }

    setARActive(true);

    // Emit CAMERA_READY event
    globalEventBus.emit(AREvents.CAMERA_READY, {
      timestamp: performance.now(),
      width: videoRef.current?.videoWidth || 640,
      height: videoRef.current?.videoHeight || 480,
      frameRate: 30,
    });

    // Start FaceMesh processing loop
    startProcessingLoop();
  }, [isInitialized, initialize, setARActive]);

  // ═══════════════════════════════════════════════════════════════════════════
  // START PROCESSING LOOP (FaceMesh only - no render loop)
  // ═══════════════════════════════════════════════════════════════════════════

  const startProcessingLoop = useCallback(() => {
    if (isLoopRunningRef.current) {
      return;
    }

    isLoopRunningRef.current = true;

    const loop = async () => {
      if (
        videoRef.current &&
        videoRef.current.readyState === 4 &&
        faceMeshRef.current &&
        faceMeshReadyRef.current
      ) {
        try {
          await faceMeshRef.current.send({ image: videoRef.current });
        } catch (err) {
          console.error('[FACEMESH SEND ERROR]', err);
        }
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
  }, [videoRef]);

  // ═══════════════════════════════════════════════════════════════════════════
  // STOP AR
  // ═══════════════════════════════════════════════════════════════════════════

  const stopAR = useCallback(() => {
    if (threeEngineRef.current) {
      threeEngineRef.current.stopRendering();
    }

    if (cameraEngineRef.current) {
      cameraEngineRef.current.stop();
    }

    if (faceMeshRef.current) {
      faceMeshRef.current.close();
      faceMeshRef.current = null;
    }

    // Stop the animation loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    isLoopRunningRef.current = false;

    // REMOVED setIsActive(false) - engine should always run when video and FaceMesh are ready
    setARActive(false);
    setCameraActive(false);
  }, [setARActive, setCameraActive]);

  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD BEARD STYLE
  // ═══════════════════════════════════════════════════════════════════════════

  const loadBeardStyle = useCallback(async (style: BeardStyle) => {
    if (!assetManagerRef.current || !threeEngineRef.current) {
      return;
    }

    try {
      console.log('[PIPELINE][LOAD] Loading beard style:', style.name);
      const asset = await assetManagerRef.current.loadBeardAsset(style);
      if (!asset) {
        throw new Error('Failed to load beard asset');
      }

      console.log('[PIPELINE][LOAD] ✅ Beard asset loaded, loading to Three.js...');
      console.log('[PIPELINE][LOAD] 📦 Asset contains GLB:', !!asset.glb);
      console.log('[PIPELINE][LOAD] 📦 Asset contains textures:', !!asset.textures);
      const loaded = await threeEngineRef.current.loadBeardModel(asset);
      if (!loaded) {
        throw new Error('Failed to load beard model');
      }

      // Pass beard model to BeardAttachmentEngine for bounding box calculation
      if (threeEngineRef.current && attachmentEngineRef.current) {
        const beardModel = threeEngineRef.current.getBeardModel();
        console.log('[PIPELINE][LOAD] 🔍 Retrieved beardModel from ThreeEngine:', beardModel ? 'PRESENT' : 'NULL');
        console.log('[PIPELINE][LOAD] - Model type:', beardModel?.constructor.name);
        console.log('[PIPELINE][LOAD] - Model name:', beardModel?.name);
        if (beardModel) {
          attachmentEngineRef.current.setBeardModel(beardModel);
          console.log('[PIPELINE][LOAD] ✅ Beard model passed to BeardAttachmentEngine');
        } else {
          console.error('[PIPELINE][LOAD] ❌ beardModel from ThreeEngine is NULL - cannot pass to BeardAttachmentEngine');
        }
      } else {
        console.error('[PIPELINE][LOAD] ❌ ThreeEngine or AttachmentEngine ref is null');
      }

      setCurrentBeardStyle(style);
      useARStore.getState().setCurrentBeardStyle(style);
      onBeardStyleSelected?.(style);

      console.log('[PIPELINE][LOAD] ✅ Beard style loaded successfully:', style.name);
    } catch (error) {
      console.error('[PIPELINE][LOAD] ❌ Failed to load beard style:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to load beard style');
    }
  }, [onBeardStyleSelected, onError]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    return () => {
      stopAR();

      if (faceMeshRef.current) {
        faceMeshRef.current.close();
        faceMeshRef.current = null;
      }

      if (threeEngineRef.current) {
        threeEngineRef.current.dispose();
      }

      if (assetManagerRef.current) {
        assetManagerRef.current.dispose();
      }

      if (performanceEngineRef.current) {
        performanceEngineRef.current.dispose();
      }

      if (pipelineControllerRef.current) {
        pipelineControllerRef.current.dispose();
      }

      // Cleanup persistent validation canvas (memory leak fix)
      if (validationCanvasRef.current) {
        validationCtxRef.current = null;
        validationCanvasRef.current = null;
      }
    };
  }, [stopAR]);

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT SUBSCRIPTIONS (UI sync only)
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    // Subscribe to pipeline state changes
    const unsubscribeState = globalEventBus.on<PipelineStateChangeEvent>(
      AREvents.PIPELINE_STATE_CHANGE,
      (data) => {
        setPipelineState(data.toState);
      }
    );

    // Subscribe to validation results
    const unsubscribeValidation = globalEventBus.on<ValidationSuccessEvent | ValidationFailedEvent>(
      AREvents.VALIDATION_SUCCESS,
      (data) => {
        useARStore.getState().setValidation(data.result);
      }
    );

    // Subscribe to beard loaded
    const unsubscribeBeard = globalEventBus.on<BeardLoadedEvent>(
      AREvents.BEARD_LOADED,
      (data) => {
        useARStore.getState().setCurrentBeardStyle(data.style);
      }
    );

    return () => {
      unsubscribeState();
      unsubscribeValidation();
      unsubscribeBeard();
    };
  }, [setPipelineState]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    return () => {
      stopAR();
      if (faceLifecycleEngineRef.current) {
        faceLifecycleEngineRef.current.dispose();
      }
    };
  }, [stopAR]);

  return {
    isInitialized,
    isActive,
    currentBeardStyle,
    scanProgress,
    isScanning,
    pipelineState,
    initialize,
    startAR,
    stopAR,
    loadBeardStyle,
  };
}
