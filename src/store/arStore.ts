// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - Main AR State Store (Zustand)
// ═══════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { AREngineState, ValidationResult, FaceGeometry, DepthEstimation, AnchorSystem, PerformanceMetrics } from '../types/engine.types';
import { BeardStyle } from '../types/beard.types';

interface ARStore extends AREngineState {
  landmarks: any[] | null;
  // Actions
  setInitialized: (initialized: boolean) => void;
  setActive: (active: boolean) => void;
  setCurrentBeardStyle: (style: BeardStyle | null) => void;
  setValidation: (validation: ValidationResult | null) => void;
  setGeometry: (geometry: FaceGeometry | null) => void;
  setDepth: (depth: DepthEstimation | null) => void;
  setAnchors: (anchors: AnchorSystem | null) => void;
  setPerformance: (performance: PerformanceMetrics) => void;
  setLandmarks: (landmarks: any[] | null) => void;
  reset: () => void;
}

const initialState: AREngineState = {
  isInitialized: false,
  isActive: false,
  currentBeardStyle: null,
  validation: null,
  geometry: null,
  depth: null,
  anchors: null,
  performance: {
    fps: 0,
    frameTime: 0,
    memory: 0,
    thermal: 0,
    deviceTier: 'mid-range',
    qualityLevel: 50,
  },
};

export const useARStore = create<ARStore>((set) => ({
  ...initialState,
  landmarks: null,

  setInitialized: (initialized) => set({ isInitialized: initialized }),
  setActive: (active) => set({ isActive: active }),
  setCurrentBeardStyle: (style) => set({ currentBeardStyle: style }),
  setValidation: (validation) => set({ validation }),
  setGeometry: (geometry) => set({ geometry }),
  setDepth: (depth) => set({ depth }),
  setAnchors: (anchors) => set({ anchors }),
  setPerformance: (performance) => set({ performance }),
  setLandmarks: (landmarks) => set({ landmarks }),

  reset: () => set({ ...initialState, landmarks: null }),
}));
