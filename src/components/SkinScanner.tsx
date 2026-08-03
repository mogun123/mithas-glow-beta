import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaceDetection, FaceDetectionResult, FaceValidationResult } from '../lib/ai/computer-vision/faceDetection';
import { FrameStability, FrameData, FrameStabilityMetrics } from '../lib/ai/computer-vision/frameStability';
import { MultiFrameCapture, CaptureResult } from '../lib/ai/computer-vision/multiFrameCapture';
import { FrameQualityFilter, QualityMetrics } from '../lib/ai/computer-vision/frameQualityFilter';
import { SkinRegionSelection, SkinRegion, SkinMask } from '../lib/ai/computer-vision/skinRegionSelection';
import { LightingNormalization, LightingMetrics } from '../lib/ai/skin-analysis/lightingNormalization';
import { ColorConversion, LAB } from '../lib/ai/computer-vision/colorConversion';
import { LABStatistics, StatisticalResult } from '../lib/ai/computer-vision/labStatistics';
import { SkinToneAnalysis, SkinToneResult } from '../lib/ai/skin-analysis/skinToneAnalysis';
import { UndertoneDetection, UndertoneResult } from '../lib/ai/skin-analysis/undertoneDetection';
import { ConfidenceScore, ConfidenceResult } from '../lib/ai/computer-vision/confidenceScore';
import { FaceShapeAnalyzer, FaceShapeResult } from '../lib/ai/analysis/faceShapeAnalyzer';
import { SkinBeautyAnalyzer, SkinConditionResult, RegionAnalysis } from '../lib/ai/analysis/skinConditionAnalyzer';
import { SkinAgeEstimator, SkinAgeResult, RegionAgeData } from '../lib/ai/analysis/skinAgeEstimator';

interface ScanProgress {
  stage: 'initializing' | 'detecting' | 'validating' | 'capturing' | 'analyzing' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
}

interface ScanResult {
  skinTone: SkinToneResult;
  undertone: UndertoneResult;
  faceShape: FaceShapeResult;
  skinConditions: SkinConditionResult;
  skinAge: SkinAgeResult;
  confidence: ConfidenceResult;
  labValues: LAB;
  scanTimestamp: Date;
}

export interface SkinScannerProps {
  onScanComplete?: (result: ScanResult) => void;
  onScanError?: (error: string) => void;
  className?: string;
  enableMakeupPreview?: boolean;
}

export const SkinScanner: React.FC<SkinScannerProps> = ({
  onScanComplete,
  onScanError,
  className = '',
  enableMakeupPreview = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress>({
    stage: 'initializing',
    progress: 0,
    message: 'Initializing camera...',
  });
  const [currentResult, setCurrentResult] = useState<ScanResult | null>(null);
  const [validationResult, setValidationResult] = useState<FaceValidationResult | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // AI Engine instances
  const faceDetectionRef = useRef<FaceDetection | null>(null);
  const frameStabilityRef = useRef<FrameStability | null>(null);
  const multiFrameCaptureRef = useRef<MultiFrameCapture | null>(null);
  const frameQualityFilterRef = useRef<FrameQualityFilter | null>(null);
  const skinRegionSelectionRef = useRef<SkinRegionSelection | null>(null);
  const lightingNormalizationRef = useRef<LightingNormalization | null>(null);
  const labStatisticsRef = useRef<LABStatistics | null>(null);
  const skinToneAnalysisRef = useRef<SkinToneAnalysis | null>(null);
  const undertoneDetectionRef = useRef<UndertoneDetection | null>(null);
  const confidenceScoreRef = useRef<ConfidenceScore | null>(null);
  const faceShapeAnalyzerRef = useRef<FaceShapeAnalyzer | null>(null);
  const skinConditionAnalyzerRef = useRef<SkinConditionAnalyzer | null>(null);
  const skinAgeEstimatorRef = useRef<SkinAgeEstimator | null>(null);

  // Initialize AI engine
  useEffect(() => {
    const initializeAI = () => {
      try {
        faceDetectionRef.current = new FaceDetection();
        frameStabilityRef.current = new FrameStability();
        multiFrameCaptureRef.current = new MultiFrameCapture();
        frameQualityFilterRef.current = new FrameQualityFilter();
        skinRegionSelectionRef.current = new SkinRegionSelection();
        lightingNormalizationRef.current = new LightingNormalization();
        labStatisticsRef.current = new LABStatistics();
        skinToneAnalysisRef.current = new SkinToneAnalysis();
        undertoneDetectionRef.current = new UndertoneDetection();
        confidenceScoreRef.current = new ConfidenceScore();
        faceShapeAnalyzerRef.current = new FaceShapeAnalyzer();
        skinConditionAnalyzerRef.current = new SkinConditionAnalyzer();
        skinAgeEstimatorRef.current = new SkinAgeEstimator();

        setScanProgress({
          stage: 'initializing',
          progress: 100,
          message: 'AI engine initialized',
        });
      } catch (error) {
        console.error('Failed to initialize AI engine:', error);
        setScanProgress({
          stage: 'error',
          progress: 0,
          message: 'Failed to initialize AI engine',
        });
        onScanError?.('Failed to initialize AI engine');
      }
    };

    initializeAI();
  }, [onScanError]);

  // Start camera
  const startCamera = useCallback(async () => {
    if (!videoRef.current || !faceDetectionRef.current) return;

    try {
      setScanProgress({
        stage: 'initializing',
        progress: 0,
        message: 'Starting camera...',
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });

      videoRef.current.srcObject = stream;
      
      await faceDetectionRef.current.initializeCamera(
        videoRef.current,
        onCameraFrame
      );

      setCameraActive(true);
      setScanProgress({
        stage: 'detecting',
        progress: 20,
        message: 'Camera ready - Position your face',
      });
    } catch (error) {
      console.error('Failed to start camera:', error);
      setScanProgress({
        stage: 'error',
        progress: 0,
        message: 'Failed to start camera',
      });
      onScanError?.('Failed to start camera');
    }
  }, [onScanError]);

  // Camera frame callback
  const onCameraFrame = useCallback(() => {
    if (!faceDetectionRef.current || !frameStabilityRef.current || !videoRef.current) return;

    const detection = faceDetectionRef.current.getCurrentFaceDetection();
    if (!detection) return;

    const validation = faceDetectionRef.current.validateFace(detection);
    setValidationResult(validation);

    // Add frame to stability buffer
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const frameData: FrameData = {
          imageData,
          landmarks: detection.landmarks,
          timestamp: Date.now(),
          brightness: frameStabilityRef.current.calculateFrameBrightness(imageData),
          contrast: frameStabilityRef.current.calculateFrameContrast(imageData),
        };

        frameStabilityRef.current.addFrame(frameData);
      }
    }

    // Draw face landmarks overlay
    drawFaceOverlay(detection.landmarks);
  }, []);

  // Draw face landmarks overlay
  const drawFaceOverlay = useCallback((landmarks: number[][]) => {
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;

    // Draw key landmarks
    const keyLandmarks = [
      10, 67, 103, 109, // Forehead
      234, 93, 132, // Left cheek
      454, 323, 361, // Right cheek
      168, 6, // Nose bridge
      152, // Chin
    ];

    for (const idx of keyLandmarks) {
      if (landmarks[idx]) {
        const x = landmarks[idx][0] * canvas.width;
        const y = landmarks[idx][1] * canvas.height;
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#00ff00';
        ctx.fill();
      }
    }
  }, []);

  // Start scanning process
  const startScan = useCallback(async () => {
    if (!faceDetectionRef.current || !frameStabilityRef.current || !multiFrameCaptureRef.current) {
      onScanError?.('AI engine not initialized');
      return;
    }

    setIsScanning(true);
    setScanProgress({
      stage: 'validating',
      progress: 30,
      message: 'Validating face position...',
    });

    try {
      // Wait for stable face detection
      const isStable = await waitForStableFace();
      if (!isStable) {
        throw new Error('Face not stable enough for scanning');
      }

      setScanProgress({
        stage: 'capturing',
        progress: 50,
        message: 'Capturing frames...',
      });

      // Capture frames
      const captureResult = await captureFrames();
      if (!captureResult) {
        throw new Error('Failed to capture sufficient frames');
      }

      setScanProgress({
        stage: 'analyzing',
        progress: 70,
        message: 'Analyzing skin data...',
      });

      // Analyze captured data
      const analysisResult = await analyzeFrames(captureResult);
      if (!analysisResult) {
        throw new Error('Failed to analyze skin data');
      }

      setScanProgress({
        stage: 'complete',
        progress: 100,
        message: 'Analysis complete!',
      });

      setCurrentResult(analysisResult);
      onScanComplete?.(analysisResult);
    } catch (error) {
      console.error('Scan failed:', error);
      setScanProgress({
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Scan failed',
      });
      onScanError?.(error instanceof Error ? error.message : 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  }, [onScanComplete, onScanError]);

  // Wait for stable face
  const waitForStableFace = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve) => {
      const checkStability = () => {
        if (faceDetectionRef.current?.isFaceStable(2000)) {
          resolve(true);
        } else {
          setTimeout(checkStability, 100);
        }
      };
      
      setTimeout(() => {
        resolve(false);
      }, 5000); // Timeout after 5 seconds
      
      checkStability();
    });
  }, []);

  // Capture frames
  const captureFrames = useCallback(async (): Promise<CaptureResult | null> => {
    if (!multiFrameCaptureRef.current || !frameStabilityRef.current || !faceDetectionRef.current) {
      return null;
    }

    try {
      const result = await multiFrameCaptureRef.current.startCapture(
        {
          frameCount: 20,
          captureDuration: 1500,
          minQualityScore: 70,
        },
        () => {
          // Add current frame to capture
          const detection = faceDetectionRef.current?.getCurrentFaceDetection();
          const stableFrames = frameStabilityRef.current?.getStableFrames();
          
          if (detection && stableFrames && stableFrames.length > 0) {
            const frame = stableFrames[stableFrames.length - 1];
            multiFrameCaptureRef.current?.addFrame(frame);
          }
        }
      );

      return result;
    } catch (error) {
      console.error('Frame capture failed:', error);
      return null;
    }
  }, []);

  // Analyze captured frames
  const analyzeFrames = useCallback(async (captureResult: CaptureResult): Promise<ScanResult | null> => {
    if (!captureResult.frames || captureResult.frames.length === 0) {
      return null;
    }

    try {
      // Get the best frame for analysis
      const bestFrame = captureResult.frames[0];
      const landmarks = bestFrame.landmarks;
      const imageData = bestFrame.imageData;
      const imageWidth = imageData.width;
      const imageHeight = imageData.height;

      // Extract skin regions
      const regions = skinRegionSelectionRef.current?.extractSkinRegions(
        imageData,
        landmarks,
        imageWidth,
        imageHeight
      ) || [];

      // Generate skin mask
      const skinMask = skinRegionSelectionRef.current?.generateDynamicSkinMask(
        imageData,
        landmarks,
        imageWidth,
        imageHeight
      );

      // Extract reference lighting
      const referenceLighting = lightingNormalizationRef.current?.extractReferenceLighting(
        imageData,
        landmarks,
        imageWidth,
        imageHeight
      ) || [128, 128, 128];

      // Analyze lighting
      const lightingMetrics = lightingNormalizationRef.current?.analyzeLighting(
        imageData,
        landmarks,
        imageWidth,
        imageHeight
      ) || {
        averageBrightness: 128,
        lightingUniformity: 0.8,
        colorTemperature: 5500,
        hasHotspots: false,
        hasShadows: false,
      };

      // Calculate statistics for each region
      const regionStats: Record<string, StatisticalResult> = {};
      for (const region of regions) {
        if (region.labValues.length > 0) {
          regionStats[region.name] = labStatisticsRef.current!.calculateStatistics(region.labValues);
        }
      }

      // Analyze skin tone
      const skinTone = skinToneAnalysisRef.current?.analyzeSkinTone(
        regionStats as any
      ) || {
        skinTone: 'Medium',
        labValues: { l: 50, a: 10, b: 10 },
        confidence: 0,
        classification: { primary: 'Medium', score: 0 },
        metadata: { warmthLevel: 0, brightness: 50 },
      };

      // Detect undertone
      const allLabValues = regions.flatMap(r => r.labValues);
      const undertone = undertoneDetectionRef.current?.detectUndertone(allLabValues) || {
        undertone: 'Neutral',
        confidence: 0,
        analysis: { baDifference: 0, warmthScore: 50, coolnessScore: 50, neutralityScore: 50 },
        indicators: { veinColor: 'Mixed', jewelryPreference: 'Both', sunReaction: 'Both' },
      };

      // Convert MediaPipe landmarks to number[][] format for FaceShapeAnalyzer
      const landmarksForAnalysis = landmarks.map((landmark: any) => [
        landmark.x || 0,
        landmark.y || 0, 
        landmark.z || 0
      ]);
      
      // Analyze face shape
      const faceShape = faceShapeAnalyzerRef.current?.analyzeFaceShape(landmarksForAnalysis) || {
        faceShape: 'Oval',
        confidence: 0,
        measurements: {
          faceLength: 0, jawWidth: 0, cheekboneWidth: 0, foreheadWidth: 0,
          jawToCheekboneRatio: 0, foreheadToJawRatio: 0, lengthToWidthRatio: 0,
        },
        characteristics: { jawline: 'Soft', forehead: 'Average', cheekbones: 'Average', faceLength: 'Average' },
        recommendations: { hairstyles: [], glasses: [], makeup: [] },
      };

      // Analyze skin conditions
      const regionAnalysis: RegionAnalysis = {
        underEyes: regions.find(r => r.name === 'underEyes')?.labValues || [],
        cheeks: regions.find(r => r.name === 'leftCheek')?.labValues || [],
        forehead: regions.find(r => r.name === 'forehead')?.labValues || [],
        nose: regions.find(r => r.name === 'nose')?.labValues || [],
        chin: regions.find(r => r.name === 'chin')?.labValues || [],
      };

      const skinConditions = skinConditionAnalyzerRef.current?.analyzeSkinConditions(
        regionAnalysis,
        skinTone.labValues
      ) || {
        conditions: {
          'dark-circles': { severity: 0, confidence: 0, affectedAreas: [] },
          'redness': { severity: 0, confidence: 0, affectedAreas: [] },
          'uneven-tone': { severity: 0, confidence: 0, affectedAreas: [] },
          'dullness': { severity: 0, confidence: 0, affectedAreas: [] },
          'acne': { severity: 0, confidence: 0, affectedAreas: [] },
          'wrinkles': { severity: 0, confidence: 0, affectedAreas: [] },
        },
        overallScore: 0,
        recommendations: { skincare: [], makeup: [], lifestyle: [] },
      };

      // Estimate skin age
      const regionAgeData: RegionAgeData = {
        forehead: regions.find(r => r.name === 'forehead')?.labValues || [],
        cheeks: regions.find(r => r.name === 'leftCheek')?.labValues || [],
        underEyes: regions.find(r => r.name === 'underEyes')?.labValues || [],
        aroundEyes: regions.find(r => r.name === 'underEyes')?.labValues || [],
        mouth: regions.find(r => r.name === 'chin')?.labValues || [],
      };

      const skinAge = skinAgeEstimatorRef.current?.estimateSkinAge(
        regionAgeData,
        skinTone.labValues
      ) || {
        estimatedAge: 30,
        confidence: 0,
        factors: {
          fineLines: 0, brightness: 0, colorUniformity: 0, textureVariance: 0,
          elasticity: 0, hydration: 0,
        },
        ageCategory: 'Adult',
        recommendations: { skincare: [], treatments: [], prevention: [] },
      };

      // Calculate confidence score
      const faceDetection = {
        landmarks,
        boundingBox: { x: 0, y: 0, width: 0, height: 0 },
        confidence: 0.9,
        imageWidth,
        imageHeight,
      };

      const frameStability = frameStabilityRef.current?.analyzeStability() || {
        landmarkVariance: 0.01,
        brightnessVariance: 5,
        motionDetected: false,
        qualityScore: 80,
      };

      const frameQuality = {
        blurScore: 80,
        brightnessScore: 80,
        contrastScore: 80,
        noiseScore: 20,
        overallScore: 80,
      };

      const confidence = confidenceScoreRef.current?.calculateConfidence(
        faceDetection,
        frameStability,
        frameQuality,
        lightingMetrics,
        regionStats
      ) || {
        overallScore: 80,
        factors: {
          faceDetection: { confidence: 90, stability: 80, completeness: 85 },
          frameQuality: { blurScore: 80, brightnessScore: 80, contrastScore: 80, noiseScore: 80 },
          lighting: { uniformity: 80, brightness: 80, colorTemperature: 80 },
          dataConsistency: { sampleSize: 80, variance: 20, outlierRatio: 10 },
        },
        breakdown: { faceDetectionWeight: 25, frameQualityWeight: 25, lightingWeight: 25, dataConsistencyWeight: 25 },
        reliability: 'High' as const,
        recommendations: [],
      };

      return {
        skinTone,
        undertone,
        faceShape,
        skinConditions,
        skinAge,
        confidence,
        labValues: skinTone.labValues,
        scanTimestamp: new Date(),
      };
    } catch (error) {
      console.error('Analysis failed:', error);
      return null;
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    faceDetectionRef.current?.stopCamera();
    setCameraActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className={`skin-scanner ${className}`}>
      <div className="scanner-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="scanner-video"
          style={{ display: cameraActive ? 'block' : 'none' }}
        />
        
        <canvas
          ref={canvasRef}
          className="scanner-canvas"
          style={{ display: 'none' }}
        />
        
        <canvas
          ref={overlayCanvasRef}
          className="scanner-overlay"
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
          }}
        />
      </div>

      <div className="scanner-controls">
        {!cameraActive ? (
          <button
            onClick={startCamera}
            className="btn btn-primary"
            disabled={scanProgress.stage === 'initializing'}
          >
            {scanProgress.stage === 'initializing' ? 'Initializing...' : 'Start Camera'}
          </button>
        ) : (
          <>
            <button
              onClick={startScan}
              className="btn btn-primary"
              disabled={isScanning || !validationResult?.isValid}
            >
              {isScanning ? 'Scanning...' : 'Start Scan'}
            </button>
            
            <button
              onClick={stopCamera}
              className="btn btn-secondary"
              disabled={isScanning}
            >
              Stop Camera
            </button>
          </>
        )}
      </div>

      <div className="scanner-status">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${scanProgress.progress}%` }}
          />
        </div>
        <p className="status-message">{scanProgress.message}</p>
        
        {validationResult && (
          <div className="validation-info">
            {!validationResult.isValid && (
              <div className="validation-errors">
                <p>Please adjust your position:</p>
                <ul>
                  {validationResult.faceDistanceStatus !== 'optimal' && (
                    <li>{validationResult.message}</li>
                  )}
                  {validationResult.occlusionDetected && (
                    <li>Ensure your face is fully visible</li>
                  )}
                  {Math.abs(validationResult.headTilt) > 15 && (
                    <li>Keep your head straight</li>
                  )}
                </ul>
              </div>
            )}
            {validationResult.isValid && (
              <p className="validation-success">✓ Face position is good</p>
            )}
          </div>
        )}
      </div>

      {currentResult && (
        <div className="scan-results">
          <h3>Analysis Results</h3>
          <div className="result-summary">
            <p>Skin Tone: {currentResult.skinTone.skinTone}</p>
            <p>Undertone: {currentResult.undertone.undertone}</p>
            <p>Face Shape: {currentResult.faceShape.faceShape}</p>
            <p>Skin Age: {currentResult.skinAge.estimatedAge} years</p>
            <p>Confidence: {currentResult.confidence.overallScore.toFixed(1)}%</p>
          </div>
        </div>
      )}
    </div>
  );
};
