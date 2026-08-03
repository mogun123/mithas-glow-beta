import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Loader2, RotateCcw, Camera, Sparkles, Lock } from 'lucide-react';
import { toast } from 'sonner';

// MediaPipe imports
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera as MediaPipeCamera } from '@mediapipe/camera_utils';

// Types
export type Gender = 'men' | 'women';
export type Occasion = 'office' | 'party' | 'bridal' | 'professional';

export interface MakeupLook {
  id: string;
  name: string;
  occasion: Occasion;
  gender: Gender;
  isFree: boolean;
  components: {
    foundation?: string;
    lipstick?: string;
    eyeliner?: string;
    eyeshadow?: string;
    blush?: string;
    bronzer?: string;
    beard?: string;
  };
  blendMode: GlobalCompositeOperation;
  opacity: number;
  compatibleSkinTones?: string[];
  suitableFaceShapes?: string[];
}

export interface FacialAnalysis {
  skinTone: string;
  faceShape: string;
  skinConcerns: {
    acne: boolean;
    dryness: boolean;
    oiliness: boolean;
    pigmentation: boolean;
  };
  lightingQuality: number;
  confidence: number;
}

export interface ARTryOnProps {
  gender: Gender;
  occasion: Occasion;
  onClose: () => void;
  initialCamera?: 'user' | 'environment';
}

// Enhanced Makeup Looks Dataset with skin tone compatibility
const MAKEUP_LOOKS: MakeupLook[] = [
  // Women Office Looks
  {
    id: 'office-natural-1',
    name: 'Office Natural',
    occasion: 'office',
    gender: 'women',
    isFree: true,
    blendMode: 'multiply',
    opacity: 0.3,
    components: {
      foundation: '#F5DEB3',
      lipstick: '#E74C3C',
      blush: '#FFB6C1',
      eyeshadow: '#D4A574'
    },
    compatibleSkinTones: ['Light', 'Medium', 'Wheatish'],
    suitableFaceShapes: ['Oval', 'Round', 'Heart']
  },
  {
    id: 'office-professional-1',
    name: 'Professional Chic',
    occasion: 'office',
    gender: 'women',
    isFree: false,
    blendMode: 'multiply',
    opacity: 0.35,
    components: {
      foundation: '#F5DEB3',
      lipstick: '#8B4513',
      blush: '#FFB6C1',
      eyeshadow: '#8B7355',
      eyeliner: '#2C3E50'
    },
    compatibleSkinTones: ['Medium', 'Wheatish', 'Deep'],
    suitableFaceShapes: ['Oval', 'Square', 'Diamond']
  },
  // Women Party Looks
  {
    id: 'party-glam-1',
    name: 'Party Glam',
    occasion: 'party',
    gender: 'women',
    isFree: true,
    blendMode: 'multiply',
    opacity: 0.4,
    components: {
      foundation: '#F5DEB3',
      lipstick: '#FF1493',
      blush: '#FF69B4',
      eyeshadow: '#FFD700',
      eyeliner: '#000000'
    },
    compatibleSkinTones: ['Light', 'Medium', 'Wheatish', 'Deep'],
    suitableFaceShapes: ['Oval', 'Heart', 'Diamond']
  },
  // Men Looks
  {
    id: 'men-natural-1',
    name: 'Natural Look',
    occasion: 'office',
    gender: 'men',
    isFree: true,
    blendMode: 'multiply',
    opacity: 0.2,
    components: {
      foundation: '#F5DEB3',
      bronzer: '#D2691E',
      beard: '#8B4513'
    },
    compatibleSkinTones: ['Light', 'Medium', 'Wheatish'],
    suitableFaceShapes: ['Oval', 'Square', 'Round']
  }
];

export function ARTryOn({ gender, occasion, onClose, initialCamera = 'user' }: ARTryOnProps) {
  // State management
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [selectedLook, setSelectedLook] = useState<MakeupLook | null>(null);
  const [facialAnalysis, setFacialAnalysis] = useState<FacialAnalysis | null>(null);
  const [recommendedLooks, setRecommendedLooks] = useState<MakeupLook[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [lightingWarning, setLightingWarning] = useState<string>('');
  const [fps, setFps] = useState(0);
  const [currentCamera, setCurrentCamera] = useState<'user' | 'environment'>(initialCamera);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const cameraRef = useRef<MediaPipeCamera | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  // Performance monitoring
  const updateFPS = useCallback(() => {
    const now = performance.now();
    frameCountRef.current++;
    
    if (now - lastFrameTimeRef.current >= 1000) {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;
    }
  }, []);

  // RGB to HSV conversion for lighting normalization
  const rgbToHsv = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    let s = max === 0 ? 0 : diff / max;
    let v = max;

    if (max !== min) {
      switch (max) {
        case r: h = ((g - b) / diff + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / diff + 2) / 6; break;
        case b: h = ((r - g) / diff + 4) / 6; break;
      }
    }

    return { h: h * 360, s: s * 100, v: v * 100 };
  };

  // 1. Skin Tone Detection with HSV classification
  const detectSkinTone = useCallback((landmarks: any[], videoElement: HTMLVideoElement): string => {
    console.log("🎨 Starting skin tone detection...");
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'Medium';

    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    ctx.drawImage(videoElement, 0, 0);

    // Extract stable facial regions
    const regions = {
      leftCheek: landmarks[234],
      rightCheek: landmarks[454],
      forehead: landmarks[10]
    };

    let totalH = 0, totalS = 0, totalV = 0;
    let validSamples = 0;

    // Sample from each region
    Object.entries(regions).forEach(([regionName, point]) => {
      if (point) {
        const x = Math.floor(point.x * canvas.width);
        const y = Math.floor(point.y * canvas.height);
        
        // 10x10 sample area for better accuracy
        const sampleSize = 10;
        const imageData = ctx.getImageData(
          Math.max(0, x - sampleSize/2), 
          Math.max(0, y - sampleSize/2), 
          sampleSize, 
          sampleSize
        );

        for (let i = 0; i < imageData.data.length; i += 4) {
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          
          // Filter out non-skin pixels (basic skin color range)
          if (r > 95 && g > 40 && b > 20 && 
              r > g && r > b && 
              Math.abs(r - g) > 15) {
            const hsv = rgbToHsv(r, g, b);
            totalH += hsv.h;
            totalS += hsv.s;
            totalV += hsv.v;
            validSamples++;
          }
        }
      }
    });

    if (validSamples === 0) return 'Medium';

    const avgH = totalH / validSamples;
    const avgS = totalS / validSamples;
    const avgV = totalV / validSamples;

    console.log("🎨 HSV values:", { h: avgH.toFixed(1), s: avgS.toFixed(1), v: avgV.toFixed(1) });

    // Classify based on HSV values
    if (avgV > 70) return 'Very Light';
    if (avgV > 50) return 'Light';
    if (avgV > 35) return 'Medium';
    if (avgV > 20) return 'Wheatish';
    return 'Deep';
  }, []);

  // 2. Skin Concern Detection
  const detectSkinConcerns = useCallback((landmarks: any[], videoElement: HTMLVideoElement) => {
    console.log("🔍 Starting skin concern detection...");
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return { acne: false, dryness: false, oiliness: false, pigmentation: false };

    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    ctx.drawImage(videoElement, 0, 0);

    const concerns = {
      acne: false,
      dryness: false,
      oiliness: false,
      pigmentation: false
    };

    // Analyze cheek regions for concerns
    const cheekRegions = [
      { point: landmarks[234], name: 'left' },
      { point: landmarks[454], name: 'right' }
    ];

    cheekRegions.forEach(({ point, name }) => {
      if (point) {
        const x = Math.floor(point.x * canvas.width);
        const y = Math.floor(point.y * canvas.height);
        
        const imageData = ctx.getImageData(x - 15, y - 15, 30, 30);
        const data = imageData.data;
        
        let redness = 0;
        let brightness = 0;
        let textureVariance = 0;
        const pixels = [];
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          pixels.push({ r, g, b });
          redness += r;
          brightness += (r + g + b) / 3;
        }
        
        redness /= (data.length / 4);
        brightness /= (data.length / 4);
        
        // Calculate texture variance
        const avgBrightness = brightness;
        pixels.forEach(pixel => {
          const pixelBrightness = (pixel.r + pixel.g + pixel.b) / 3;
          textureVariance += Math.pow(pixelBrightness - avgBrightness, 2);
        });
        textureVariance /= pixels.length;
        
        // Detect concerns based on analysis
        if (redness > 150) concerns.acne = true;
        if (brightness < 80) concerns.dryness = true;
        if (brightness > 180) concerns.oiliness = true;
        if (textureVariance > 200) concerns.pigmentation = true;
        
        console.log(`🔍 ${name} cheek analysis:`, {
          redness: redness.toFixed(1),
          brightness: brightness.toFixed(1),
          textureVariance: textureVariance.toFixed(1)
        });
      }
    });

    console.log("🔍 Skin concerns detected:", concerns);
    return concerns;
  }, []);

  // 3. Face Shape Detection using landmark geometry
  const detectFaceShape = useCallback((landmarks: any[]): string => {
    console.log("📐 Starting face shape detection...");
    
    // Calculate key measurements
    const jawWidth = Math.abs(landmarks[172].x - landmarks[398].x);
    const cheekboneWidth = Math.abs(landmarks[234].x - landmarks[454].x);
    const foreheadWidth = Math.abs(landmarks[70].x - landmarks[300].x);
    const faceHeight = Math.abs(landmarks[10].y - landmarks[152].y);
    
    const jawToCheekRatio = jawWidth / cheekboneWidth;
    const cheekToForeheadRatio = cheekboneWidth / foreheadWidth;
    const widthToHeightRatio = (jawWidth + cheekboneWidth) / (2 * faceHeight);
    
    console.log("📐 Face measurements:", {
      jawWidth: jawWidth.toFixed(3),
      cheekboneWidth: cheekboneWidth.toFixed(3),
      foreheadWidth: foreheadWidth.toFixed(3),
      faceHeight: faceHeight.toFixed(3),
      jawToCheekRatio: jawToCheekRatio.toFixed(3),
      cheekToForeheadRatio: cheekToForeheadRatio.toFixed(3),
      widthToHeightRatio: widthToHeightRatio.toFixed(3)
    });
    
    // Classification logic
    if (widthToHeightRatio < 0.6) return 'Oval';
    if (widthToHeightRatio > 0.85) return 'Round';
    if (jawToCheekRatio > 0.95) return 'Square';
    if (cheekToForeheadRatio > 1.1) return 'Heart';
    if (Math.abs(jawWidth - foreheadWidth) < 0.05) return 'Diamond';
    
    return 'Oval'; // Default
  }, []);

  // 4. Lighting Quality Assessment
  const assessLightingQuality = useCallback((videoElement: HTMLVideoElement): number => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0.5;

    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    ctx.drawImage(videoElement, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let totalBrightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    
    const avgBrightness = totalBrightness / (data.length / 4);
    
    // Normalize to 0-1 scale
    const quality = Math.min(1, Math.max(0, avgBrightness / 255));
    
    console.log("💡 Lighting quality:", quality.toFixed(3));
    return quality;
  }, []);

  // 5. Smart Recommendation Engine
  const generateSmartRecommendations = useCallback((
    analysis: FacialAnalysis, 
    gender: Gender, 
    occasion: Occasion
  ): MakeupLook[] => {
    console.log("🎨 Generating smart recommendations...");
    
    const filtered = MAKEUP_LOOKS.filter(look => {
      // Filter by gender and occasion
      if (look.gender !== gender || look.occasion !== occasion) return false;
      
      // Check skin tone compatibility
      if (look.compatibleSkinTones && !look.compatibleSkinTones.includes(analysis.skinTone)) {
        return false;
      }
      
      // Check face shape suitability
      if (look.suitableFaceShapes && !look.suitableFaceShapes.includes(analysis.faceShape)) {
        return false;
      }
      
      return true;
    });
    
    // Sort by compatibility score
    const scored = filtered.map(look => {
      let score = 0;
      
      // Skin tone match
      if (look.compatibleSkinTones?.includes(analysis.skinTone)) score += 3;
      
      // Face shape match
      if (look.suitableFaceShapes?.includes(analysis.faceShape)) score += 2;
      
      // Free looks get bonus
      if (look.isFree) score += 1;
      
      return { look, score };
    });
    
    scored.sort((a, b) => b.score - a.score);
    
    const recommendations = scored.slice(0, 3).map(item => item.look);
    
    console.log("🎨 Smart recommendations generated:", recommendations.map(r => r.name));
    return recommendations;
  }, []);

  // 6. Complete Facial Analysis Pipeline
  const performFacialAnalysis = useCallback(async (landmarks: any[], videoElement: HTMLVideoElement): Promise<FacialAnalysis> => {
    console.log("🧠 Starting complete facial analysis...");
    
    try {
      // Parallel analysis for performance
      const [skinTone, skinConcerns, faceShape, lightingQuality] = await Promise.all([
        Promise.resolve(detectSkinTone(landmarks, videoElement)),
        Promise.resolve(detectSkinConcerns(landmarks, videoElement)),
        Promise.resolve(detectFaceShape(landmarks)),
        Promise.resolve(assessLightingQuality(videoElement))
      ]);
      
      const analysis: FacialAnalysis = {
        skinTone,
        faceShape,
        skinConcerns,
        lightingQuality,
        confidence: 0.85 // Base confidence
      };
      
      console.log("✅ Complete facial analysis:", analysis);
      return analysis;
    } catch (error) {
      console.error("❌ Facial analysis failed:", error);
      throw error;
    }
  }, [detectSkinTone, detectSkinConcerns, detectFaceShape, assessLightingQuality]);

  // 7. Initialize Camera Pipeline with proper camera switching
  const initializeCamera = useCallback(async () => {
    console.log("📷 Initializing camera pipeline...");
    
    if (!videoRef.current) {
      setCameraError("Video element not found");
      return;
    }

    try {
      // Get available cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(videoDevices);
      
      console.log("📷 Available cameras:", videoDevices.map(d => d.label));

      // Stop existing camera if running
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }

      // Request camera access with proper facing mode
      const constraints = {
        video: { 
          facingMode: currentCamera,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      console.log("📷 Requesting camera with constraints:", constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoRef.current.srcObject = stream;
      
      // Wait for video to be ready
      await new Promise((resolve) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = () => resolve(void 0);
        }
      });
      
      console.log("📷 Video stream loaded successfully");

      // Initialize MediaPipe FaceMesh
      const faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      // FaceMesh callback with proper camera handling
      faceMesh.onResults(async (results) => {
        updateFPS();
        
        if (results.multiFaceLandmarks?.[0]) {
          const landmarks = results.multiFaceLandmarks[0];
          
          // Check lighting quality
          const lightingQuality = assessLightingQuality(videoRef.current);
          
          if (lightingQuality < 0.3) {
            setLightingWarning("Improve lighting for better results");
            return;
          } else {
            setLightingWarning('');
          }
          
          // Perform analysis if still in analysis phase
          if (isAnalyzing && !facialAnalysis) {
            console.log("🧠 Face detected - starting analysis...");
            
            try {
              const analysis = await performFacialAnalysis(landmarks, videoRef.current);
              setFacialAnalysis(analysis);
              
              // Generate recommendations
              const recommendations = generateSmartRecommendations(analysis, gender, occasion);
              setRecommendedLooks(recommendations);
              
              // Auto-select best recommendation
              if (recommendations.length > 0) {
                const bestLook = recommendations[0];
                setSelectedLook(bestLook);
                setIsAnalyzing(false);
                console.log("🎯 Auto-selected look:", bestLook.name);
              }
            } catch (error) {
              console.error("❌ Analysis failed:", error);
              setCameraError("Analysis failed. Please try again.");
            }
          }
          
          // Render AR makeup if look is selected
          if (selectedLook && canvasRef.current && videoRef.current) {
            renderARMakeup(landmarks, selectedLook, videoRef.current, canvasRef.current);
          }
          
          // 🔥 DISABLED: Draw landmarks during analysis to prevent duplicate pipelines
          // ARPipelineController is now the single source of truth for landmark processing
          // if (isAnalyzing && overlayCanvasRef.current && videoRef.current) {
          //   drawLandmarks(landmarks, overlayCanvasRef.current, videoRef.current);
          // }
        } else {
          setLightingWarning("Face not detected");
        }
      });

      // Start camera with FaceMesh
      const camera = new MediaPipeCamera(videoRef.current, {
        onFrame: async () => {
          await faceMesh.send({ image: videoRef.current });
        },
        width: 1280,
        height: 720
      });

      await camera.start();
      cameraRef.current = camera;
      faceMeshRef.current = faceMesh;
      
      console.log("✅ Camera pipeline initialized successfully with", currentCamera, "camera");
      
    } catch (error) {
      console.error("❌ Camera initialization failed:", error);
      
      // Fallback to other camera if available
      if (currentCamera === 'environment' && availableCameras.length > 1) {
        console.log("🔄 Falling back to front camera");
        setCurrentCamera('user');
        setCameraError("Back camera not available, switched to front camera");
      } else {
        setCameraError("Camera access denied or unavailable");
      }
    }
  }, [currentCamera, isAnalyzing, facialAnalysis, selectedLook, gender, occasion, performFacialAnalysis, generateSmartRecommendations, assessLightingQuality, availableCameras]);

  // Camera switching function
  const switchCamera = useCallback(async () => {
    const newCamera = currentCamera === 'user' ? 'environment' : 'user';
    console.log("🔄 Switching camera from", currentCamera, "to", newCamera);
    
    setCurrentCamera(newCamera);
    setCameraError('');
    setLightingWarning('');
    
    // Reset analysis state
    setIsAnalyzing(true);
    setFacialAnalysis(null);
    setSelectedLook(null);
    setRecommendedLooks([]);
  }, [currentCamera]);

  // 8. AR Makeup Rendering with proper camera-aware coordinate mapping
  const renderARMakeup = useCallback((
    landmarks: any[], 
    look: MakeupLook, 
    video: HTMLVideoElement, 
    canvas: HTMLCanvasElement
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dynamic canvas sizing
    const videoRect = video.getBoundingClientRect();
    canvas.width = videoRect.width;
    canvas.height = videoRect.height;

    // Clear and draw video frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Set blending mode for realistic makeup
    ctx.globalCompositeOperation = look.blendMode;
    ctx.globalAlpha = look.opacity;

    // Foundation - Full face oval
    if (look.components.foundation) {
      ctx.fillStyle = look.components.foundation;
      drawFaceRegion(ctx, landmarks, 'foundation', canvas.width, canvas.height, currentCamera);
    }

    // Lipstick - Lip landmarks
    if (look.components.lipstick) {
      ctx.fillStyle = look.components.lipstick;
      drawFaceRegion(ctx, landmarks, 'lips', canvas.width, canvas.height, currentCamera);
    }

    // Blush - Cheek landmarks
    if (look.components.blush) {
      ctx.fillStyle = look.components.blush;
      drawFaceRegion(ctx, landmarks, 'blush', canvas.width, canvas.height, currentCamera);
    }

    // Eyeshadow - Eye landmarks
    if (look.components.eyeshadow) {
      ctx.fillStyle = look.components.eyeshadow;
      drawFaceRegion(ctx, landmarks, 'eyeshadow', canvas.width, canvas.height, currentCamera);
    }

    // Eyeliner - Eye outline
    if (look.components.eyeliner) {
      ctx.strokeStyle = look.components.eyeliner;
      ctx.lineWidth = 2;
      drawFaceRegion(ctx, landmarks, 'eyeliner', canvas.width, canvas.height, currentCamera);
    }

    // Bronzer - Contour areas
    if (look.components.bronzer) {
      ctx.fillStyle = look.components.bronzer;
      drawFaceRegion(ctx, landmarks, 'bronzer', canvas.width, canvas.height, currentCamera);
    }

    // Beard - For men
    if (look.components.beard && gender === 'men') {
      ctx.fillStyle = look.components.beard;
      drawFaceRegion(ctx, landmarks, 'beard', canvas.width, canvas.height, currentCamera);
    }

    // Reset blending
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
  }, [gender, currentCamera]);

  // 9. Face Region Drawing Functions with camera-aware coordinate mapping
  const drawFaceRegion = (
    ctx: CanvasRenderingContext2D, 
    landmarks: any[], 
    region: string, 
    canvasWidth: number, 
    canvasHeight: number,
    cameraType: 'user' | 'environment' = 'user'
  ) => {
    // Coordinate mapping based on camera type
    const mapX = (x: number) => {
      // Front camera (user) needs mirroring for selfie effect
      // Back camera (environment) doesn't need mirroring
      return cameraType === 'user' ? (1 - x) * canvasWidth : x * canvasWidth;
    };
    
    const mapY = (y: number) => y * canvasHeight;

    switch (region) {
      case 'foundation':
        // Full face oval
        const faceOval = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323];
        ctx.beginPath();
        faceOval.forEach((pointIndex, i) => {
          const point = landmarks[pointIndex];
          if (point) {
            const x = mapX(point.x);
            const y = mapY(point.y);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
        ctx.fill();
        break;

      case 'lips':
        // Lip landmarks
        const lipPoints = [61, 84, 17, 314, 405, 291, 375, 321, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308];
        ctx.beginPath();
        lipPoints.forEach((pointIndex, i) => {
          const point = landmarks[pointIndex];
          if (point) {
            const x = mapX(point.x);
            const y = mapY(point.y);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
        ctx.fill();
        break;

      case 'blush':
        // Left cheek
        const leftCheek = [234, 127, 162, 21, 54, 103, 67, 109, 10];
        ctx.beginPath();
        leftCheek.forEach((pointIndex, i) => {
          const point = landmarks[pointIndex];
          if (point) {
            const x = mapX(point.x);
            const y = mapY(point.y);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
        ctx.fill();

        // Right cheek
        const rightCheek = [454, 323, 361, 340, 346, 347, 348, 349, 350];
        ctx.beginPath();
        rightCheek.forEach((pointIndex, i) => {
          const point = landmarks[pointIndex];
          if (point) {
            const x = mapX(point.x);
            const y = mapY(point.y);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
        ctx.fill();
        break;

      case 'eyeshadow':
        // Left eye
        const leftEye = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
        ctx.beginPath();
        leftEye.forEach((pointIndex, i) => {
          const point = landmarks[pointIndex];
          if (point) {
            const x = mapX(point.x);
            const y = mapY(point.y);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
        ctx.fill();

        // Right eye
        const rightEye = [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382];
        ctx.beginPath();
        rightEye.forEach((pointIndex, i) => {
          const point = landmarks[pointIndex];
          if (point) {
            const x = mapX(point.x);
            const y = mapY(point.y);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
        ctx.fill();
        break;

      case 'eyeliner':
        // Left eye outline
        const leftEyeOutline = [33, 7, 163, 144, 145, 153, 154, 155, 133];
        ctx.beginPath();
        leftEyeOutline.forEach((pointIndex, i) => {
          const point = landmarks[pointIndex];
          if (point) {
            const x = mapX(point.x);
            const y = mapY(point.y);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
        ctx.stroke();

        // Right eye outline
        const rightEyeOutline = [362, 398, 384, 385, 386, 387, 388, 466, 263];
        ctx.beginPath();
        rightEyeOutline.forEach((pointIndex, i) => {
          const point = landmarks[pointIndex];
          if (point) {
            const x = mapX(point.x);
            const y = mapY(point.y);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
        break;

      case 'bronzer':
        // Contour areas
        const contourAreas = [
          [234, 127, 162, 21, 54, 103, 67, 109], // Left cheekbone
          [454, 323, 361, 340, 346, 347, 348, 349], // Right cheekbone
          [172, 136, 150, 149, 176, 148, 152, 377] // Jawline
        ];
        
        contourAreas.forEach(area => {
          ctx.beginPath();
          area.forEach((pointIndex, i) => {
            const point = landmarks[pointIndex];
            if (point) {
              const x = mapX(point.x);
              const y = mapY(point.y);
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
          });
          ctx.closePath();
          ctx.fill();
        });
        break;

      case 'beard':
        // Beard area for men
        const beardArea = [172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 451, 452, 350, 349, 348, 347, 346, 340];
        ctx.beginPath();
        beardArea.forEach((pointIndex, i) => {
          const point = landmarks[pointIndex];
          if (point) {
            const x = mapX(point.x);
            const y = mapY(point.y);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
        ctx.fill();
        break;
    }
  };

  // 10. Draw Landmarks during analysis with camera-aware mapping
  const drawLandmarks = useCallback((landmarks: any[], canvas: HTMLCanvasElement, video: HTMLVideoElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const videoRect = video.getBoundingClientRect();
    canvas.width = videoRect.width;
    canvas.height = videoRect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Coordinate mapping based on camera type
    const mapX = (x: number) => {
      return currentCamera === 'user' ? (1 - x) * canvas.width : x * canvas.width;
    };
    const mapY = (y: number) => y * canvas.height;

    // Draw all 478 landmarks
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.8;

    landmarks.forEach((landmark, index) => {
      const x = mapX(landmark.x);
      const y = mapY(landmark.y);
      
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fillStyle = `hsl(${(index * 360 / 478)}, 100%, 50%)`;
      ctx.fill();
      ctx.stroke();
    });

    // Highlight key regions
    const keyRegions = [
      { point: landmarks[234], color: '#FF0000FF', label: 'Left Cheek' },
      { point: landmarks[454], color: '#0000FF', label: 'Right Cheek' },
      { point: landmarks[10], color: '#FFFF00', label: 'Forehead' }
    ];

    keyRegions.forEach(({ point, color, label }) => {
      if (point) {
        const x = mapX(point.x);
        const y = mapY(point.y);
        
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.fillText(label, x + 10, y - 10);
      }
    });
  }, [currentCamera]);

  // Handle Look Selection
  const handleLookSelection = useCallback((look: MakeupLook) => {
    if (!look.isFree && !isPremium) {
      toast.error("Premium look requires subscription");
      return;
    }
    
    setSelectedLook(look);
    console.log("🎯 Selected look:", look.name);
  }, [isPremium]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Auto-start camera on mount
  useEffect(() => {
    initializeCamera();
  }, [initializeCamera]);

  return (
    <div className="relative w-full h-screen bg-black flex flex-col">
      {/* Video Element with proper camera handling */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ 
          transform: currentCamera === 'user' ? 'scaleX(-1)' : 'none' // Mirror only front camera
        }}
        autoPlay
        playsInline
        muted
      />

      {/* Makeup Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ 
          transform: currentCamera === 'user' ? 'scaleX(-1)' : 'none' // Mirror only front camera
        }}
      />

      {/* Analysis Overlay Canvas */}
      {isAnalyzing && (
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ 
            transform: currentCamera === 'user' ? 'scaleX(-1)' : 'none' // Mirror only front camera
          }}
        />
      )}

      {/* Analysis Phase UI */}
      {isAnalyzing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center text-white max-w-md mx-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
            
            <h2 className="text-2xl font-bold mb-2">
              {facialAnalysis ? 'Analysis Complete!' : 'Analyzing Your Features'}
            </h2>
            
            <p className="text-sm opacity-80 mb-4">
              {facialAnalysis 
                ? 'Generating personalized makeup recommendations...'
                : 'Mapping facial landmarks and detecting skin characteristics...'}
            </p>

            {/* Live Analysis Results */}
            {facialAnalysis && (
              <div className="bg-white/10 rounded-lg p-4 mb-4 text-left">
                <h3 className="font-semibold mb-2">Analysis Results:</h3>
                <div className="space-y-1 text-sm">
                  <div>🎨 Skin Tone: {facialAnalysis.skinTone}</div>
                  <div>📐 Face Shape: {facialAnalysis.faceShape}</div>
                  <div>🔍 Skin Concerns: 
                    {Object.entries(facialAnalysis.skinConcerns)
                      .filter(([_, has]) => has)
                      .map(([concern]) => ` ${concern}`)
                      .join(',') || ' None'}
                  </div>
                  <div>💡 Lighting Quality: {(facialAnalysis.lightingQuality * 100).toFixed(0)}%</div>
                  <div>🎯 Confidence: {(facialAnalysis.confidence * 100).toFixed(0)}%</div>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000" 
                style={{ width: facialAnalysis ? '100%' : '60%' }} 
              />
            </div>

            {/* Warnings */}
            {lightingWarning && (
              <div className="mt-4 text-yellow-400 text-sm">
                ⚠️ {lightingWarning}
              </div>
            )}

            {/* Camera Error */}
            {cameraError && (
              <div className="mt-4 text-red-400 text-sm">
                ❌ {cameraError}
              </div>
            )}

            {/* FPS Counter */}
            <div className="absolute top-4 right-4 text-xs text-white/50">
              FPS: {fps}
            </div>
          </div>
        </div>
      )}

      {/* Top Controls */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="bg-black/50 text-white hover:bg-black/70"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Back
          </Button>

          {/* Camera Switch Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={switchCamera}
            className="bg-black/50 text-white hover:bg-black/70"
            disabled={availableCameras.length <= 1}
          >
            <Camera className="w-4 h-4 mr-2" />
            {currentCamera === 'user' ? 'Back' : 'Front'} Camera
          </Button>
        </div>

        {!isAnalyzing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsAnalyzing(true);
              setFacialAnalysis(null);
              setSelectedLook(null);
              setRecommendedLooks([]);
            }}
            className="bg-black/50 text-white hover:bg-black/70"
          >
            <Camera className="w-4 h-4 mr-2" />
            Re-analyze
          </Button>
        )}
      </div>

      {/* Bottom Tray - Recommended Looks */}
      {!isAnalyzing && recommendedLooks.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md p-4">
          <div className="mb-3">
            <h3 className="text-white font-semibold flex items-center">
              <Sparkles className="w-4 h-4 mr-2" />
              Recommended Looks
            </h3>
            <p className="text-white/70 text-sm">
              Based on your {gender} {occasion} style and {facialAnalysis?.skinTone.toLowerCase()} skin tone
            </p>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {recommendedLooks.map((look) => (
              <Card
                key={look.id}
                className={`min-w-[140px] cursor-pointer transition-all ${
                  selectedLook?.id === look.id 
                    ? 'ring-2 ring-purple-500 bg-purple-500/20' 
                    : 'bg-white/10 hover:bg-white/20'
                }`}
                onClick={() => handleLookSelection(look)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm font-medium">
                      {look.name}
                    </span>
                    {!look.isFree && (
                      <Lock className="w-4 h-4 text-yellow-400" />
                    )}
                  </div>
                  
                  {/* Color swatches */}
                  <div className="flex gap-1 mb-2">
                    {Object.entries(look.components).slice(0, 3).map(([_, color]) => (
                      <div
                        key={_}
                        className="w-4 h-4 rounded-full border border-white/30"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  <Badge variant={look.isFree ? "default" : "secondary"} className="text-xs">
                    {look.isFree ? 'Free' : 'Premium'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ARTryOn;
