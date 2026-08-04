/**
 * Clinical-Grade Digital Dermatology State Management
 * Consolidated state structure for performance and maintainability
 */

import { SkinAnalysisReport } from '../types/skinAnalysis';

// UI State - Interface and navigation
export interface UIState {
  currentView: 'home' | 'mirror' | 'diy' | 'reelCreator' | 'shop';
  currentMode: 'makeup' | 'skincare' | 'party' | 'bridal' | 'professional';
  activeTab: 'tryon' | 'analysis';
  cameraOn: boolean;
  cameraActive: boolean;
  isAnalyzing: boolean;
  loading: boolean;
}

// Analysis State - Core skin analysis data
export interface AnalysisState {
  skinAnalysisReport: SkinAnalysisReport | null;
  advancedAnalysis: any | null;
  faceAnalysis: any | null;
  realTimeSkinAnalysis: any | null;
  skinAnalysisActive: boolean;
  analysisProgress: number;
  isAnalyzingAdvanced: boolean;
  capturedFrames: any[];
  lightingMetrics: any | null;
  extendedClinicalMetrics: ExtendedClinicalMetrics | null;
}

// Camera State - Camera and capture functionality
export interface CameraState {
  cameraDevices: MediaDeviceInfo[];
  currentDeviceId: string | null;
  currentStream: MediaStream | null;
  currentFacingMode: 'user' | 'environment';
  ringLightOn: boolean;
  capturedImage: string | null;
  faceDetected: boolean;
  landmarks: any[];
  imageData: ImageData | null;
  smoothedLandmarks: any[];
  stableFaceDetectionTime: number;
  scannerPosition: number;
}

// Virtual Try-On State - Makeup and AR functionality
export interface VirtualTryOnState {
  currentLookIndex: number;
  selectedLook: any | null;
  refinedLook: any | null;
  componentSwaps: { [key: string]: any };
  showShadeSelector: boolean;
  selectedComponentType: string;
  makeupAdjustments: {
    lipstickIntensity: number;
    eyeShadowIntensity: number;
    blushIntensity: number;
  };
  virtualTryOnResults: any[];
  isGeneratingTryOn: boolean;
  selectedMakeupStyle: string;
  refinedPreview: string | null;
  sdProgress: number;
  aiAutoApplied: boolean;
  aiStatus: 'idle' | 'analyzing' | 'applying';
}

// User State - User data and preferences
export interface UserState {
  userProfile: any | null;
  analysisHistory: any[];
  userPreferences: any | null;
  sessionId: string | null;
  userGender: 'male' | 'female' | 'other' | '';
  occasion: 'work' | 'party' | 'function' | 'bridal' | '';
  onboardingComplete: boolean;
  language: 'en' | 'es' | 'fr' | 'de' | 'ja';
}

// Modal State - UI modals and overlays
export interface ModalState {
  showOptionsModal: boolean;
  showARView: boolean;
  showARTrialModal: boolean;
  arTrialProduct: any | null;
  showCommunityModal: boolean;
}

// HUD State - Real-time metrics display
export interface HUDState {
  dataParticles: { x: number; y: number; size: number; value: number; type: string }[];
  hudMetrics: {
    hydration: number;
    oiliness: number;
    elasticity: number;
    temperature: number;
    ph: string;
  };
  liveSyncMode: boolean;
  beforeAfterToggle: 'before' | 'after' | 'split';
}

// AI Engine State - AI and ML components
export interface AIEngineState {
  aiEngine: any;
  profileStabilization: any;
  supabaseService: any;
  unityConnected: boolean;
  sdConnected: boolean;
  faceMeshData: any;
  unityFaceData: any;
  currentMakeupLook: any | null;
  autonomousAnalysis: any | null;
  recommendedLooks: any[];
}

// Extended Clinical Metrics - 128 advanced metrics
export interface ExtendedClinicalMetrics {
  // Core Skin Metrics
  skinThickness: number;
  collagenDensity: number;
  elastinFibers: number;
  hydrationLevel: number;
  sebumProduction: number;
  
  // Pigmentation & Tone
  melaninIndex: number;
  hemoglobinIndex: number;
  carotenoidIndex: number;
  erythemaIndex: number;
  pigmentationUniformity: number;
  
  // Texture & Surface
  surfaceRoughness: number;
  poreVolume: number;
  wrinkleDepth: number;
  wrinkleDensity: number;
  lineCount: number;
  
  // Vascular & Circulation
  bloodFlowIndex: number;
  oxygenSaturation: number;
  vascularDensity: number;
  perfusionRate: number;
  
  // Barrier Function
  transepidermalWaterLoss: number;
  barrierIntegrity: number;
  phLevel: number;
  microbialDiversity: number;
  
  // Aging Metrics
  biologicalAge: number;
  cellularSenescence: number;
  telomereLength: number;
  oxidativeStress: number;
  glycationIndex: number;
  
  // Inflammation & Immune
  inflammatoryMarkers: number;
  immuneResponse: number;
  sensitivityIndex: number;
  reactivityScore: number;
  
  // Nutritional & Metabolic
  antioxidantCapacity: number;
  nutrientAbsorption: number;
  metabolicRate: number;
  lipidProfile: number;
  
  // Environmental Damage
  uvDamageIndex: number;
  pollutionDamage: number;
  blueLightExposure: number;
  infraredDamage: number;
  
  // Advanced Imaging
  dermalThickness: number;
  epidermalThickness: number;
  subcutaneousFat: number;
  muscleTone: number;
  
  // Microbiome
  skinMicrobiome: {
    diversity: number;
    balance: number;
    pathogenRisk: number;
  };
  
  // Predictive Analytics
  acneRisk: number;
  rosaceaRisk: number;
  dermatitisRisk: number;
  skinCancerRisk: number;
  prematureAgingRisk: number;
  
  // Treatment Response
  productAbsorption: number;
  treatmentEfficacy: number;
  irritationPotential: number;
  healingCapacity: number;
  
  // Cosmetic Metrics
  foundationMatch: number;
  coverageOptimal: number;
  colorAccuracy: number;
  longevityIndex: number;
  
  // Visual Overlays for UI
  visualOverlays: {
    acneSpots: Array<{x: number, y: number, radius: number}>;
    poreClusters: Array<{x: number, y: number}>;
    darkCircleBounds: Array<{x: number, y: number}>;
  };
  
  // Regional Analysis (Forehead, Cheeks, Nose, Chin, Under-eye)
  regionalMetrics: {
    forehead: RegionalMetrics;
    leftCheek: RegionalMetrics;
    rightCheek: RegionalMetrics;
    nose: RegionalMetrics;
    chin: RegionalMetrics;
    underEye: RegionalMetrics;
  };
}

export interface RegionalMetrics {
  oiliness: number;
  hydration: number;
  redness: number;
  pigmentation: number;
  texture: number;
  poreSize: number;
  wrinkleCount: number;
  elasticity: number;
}

// Main Application State
export interface MirrorScreenState {
  ui: UIState;
  analysis: AnalysisState;
  camera: CameraState;
  virtualTryOn: VirtualTryOnState;
  user: UserState;
  modal: ModalState;
  hud: HUDState;
  aiEngine: AIEngineState;
}

// State Actions
export type MirrorScreenAction = 
  | { type: 'SET_UI_STATE'; payload: Partial<UIState> }
  | { type: 'SET_ANALYSIS_STATE'; payload: Partial<AnalysisState> }
  | { type: 'SET_CAMERA_STATE'; payload: Partial<CameraState> }
  | { type: 'SET_VIRTUAL_TRY_ON_STATE'; payload: Partial<VirtualTryOnState> }
  | { type: 'SET_USER_STATE'; payload: Partial<UserState> }
  | { type: 'SET_MODAL_STATE'; payload: Partial<ModalState> }
  | { type: 'SET_HUD_STATE'; payload: Partial<HUDState> }
  | { type: 'SET_AI_ENGINE_STATE'; payload: Partial<AIEngineState> }
  | { type: 'RESET_STATE' }
  | { type: 'SET_EXTENDED_CLINICAL_METRICS'; payload: ExtendedClinicalMetrics };

// Initial State
export const initialState: MirrorScreenState = {
  ui: {
    currentView: 'home',
    currentMode: 'makeup',
    activeTab: 'tryon',
    cameraOn: false,
    cameraActive: false,
    isAnalyzing: false,
    loading: true
  },
  analysis: {
    skinAnalysisReport: null,
    advancedAnalysis: null,
    faceAnalysis: null,
    realTimeSkinAnalysis: null,
    skinAnalysisActive: false,
    analysisProgress: 0,
    isAnalyzingAdvanced: false,
    capturedFrames: [],
    lightingMetrics: null,
    extendedClinicalMetrics: null
  },
  camera: {
    cameraDevices: [],
    currentDeviceId: null,
    currentStream: null,
    currentFacingMode: 'user',
    ringLightOn: false,
    capturedImage: null,
    faceDetected: false,
    landmarks: [],
    imageData: null,
    smoothedLandmarks: [],
    stableFaceDetectionTime: 0,
    scannerPosition: 0
  },
  virtualTryOn: {
    currentLookIndex: 0,
    selectedLook: null,
    refinedLook: null,
    componentSwaps: {},
    showShadeSelector: false,
    selectedComponentType: '',
    makeupAdjustments: {
      lipstickIntensity: 0.5,
      eyeShadowIntensity: 0.5,
      blushIntensity: 0.5
    },
    virtualTryOnResults: [],
    isGeneratingTryOn: false,
    selectedMakeupStyle: 'natural',
    refinedPreview: null,
    sdProgress: 0,
    aiAutoApplied: false,
    aiStatus: 'idle'
  },
  user: {
    userProfile: null,
    analysisHistory: [],
    userPreferences: null,
    sessionId: null,
    userGender: '',
    occasion: '',
    onboardingComplete: false,
    language: 'en'
  },
  modal: {
    showOptionsModal: false,
    showARView: false,
    showARTrialModal: false,
    arTrialProduct: null,
    showCommunityModal: false
  },
  hud: {
    dataParticles: [],
    hudMetrics: {
      hydration: 0,
      oiliness: 0,
      elasticity: 0,
      temperature: 35,
      ph: '5.5'
    },
    liveSyncMode: false,
    beforeAfterToggle: 'before'
  },
  aiEngine: {
    aiEngine: null,
    profileStabilization: null,
    supabaseService: null,
    unityConnected: false,
    sdConnected: false,
    faceMeshData: null,
    unityFaceData: null,
    currentMakeupLook: null,
    autonomousAnalysis: null,
    recommendedLooks: []
  }
};

// State Reducer
export function mirrorScreenReducer(state: MirrorScreenState, action: MirrorScreenAction): MirrorScreenState {
  switch (action.type) {
    case 'SET_UI_STATE':
      return { ...state, ui: { ...state.ui, ...action.payload } };
    
    case 'SET_ANALYSIS_STATE':
      return { ...state, analysis: { ...state.analysis, ...action.payload } };
    
    case 'SET_CAMERA_STATE':
      return { ...state, camera: { ...state.camera, ...action.payload } };
    
    case 'SET_VIRTUAL_TRY_ON_STATE':
      return { ...state, virtualTryOn: { ...state.virtualTryOn, ...action.payload } };
    
    case 'SET_USER_STATE':
      return { ...state, user: { ...state.user, ...action.payload } };
    
    case 'SET_MODAL_STATE':
      return { ...state, modal: { ...state.modal, ...action.payload } };
    
    case 'SET_HUD_STATE':
      return { ...state, hud: { ...state.hud, ...action.payload } };
    
    case 'SET_AI_ENGINE_STATE':
      return { ...state, aiEngine: { ...state.aiEngine, ...action.payload } };
    
    case 'SET_EXTENDED_CLINICAL_METRICS':
      return { 
        ...state, 
        analysis: { 
          ...state.analysis, 
          extendedClinicalMetrics: action.payload 
        } 
      };
    
    case 'RESET_STATE':
      return initialState;
    
    default:
      return state;
  }
}
