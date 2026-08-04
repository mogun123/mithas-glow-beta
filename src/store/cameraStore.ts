// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - Camera State Store (Zustand)
// ═══════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { CameraState, CameraConfig, CameraMetrics } from '../types/engine.types';

interface CameraStore extends CameraState {
  // Actions
  setStream: (stream: MediaStream | null) => void;
  setConfig: (config: CameraConfig) => void;
  setActualResolution: (width: number, height: number) => void;
  setActualFrameRate: (fps: number) => void;
  setThermalStatus: (status: 'normal' | 'elevated' | 'critical') => void;
  setActive: (active: boolean) => void;
  updateMetrics: (metrics: Partial<CameraMetrics>) => void;
  reset: () => void;
}

const initialState: CameraState = {
  isActive: false,
  stream: null,
  config: {
    facingMode: 'user',
    width: 1280,
    height: 720,
    frameRate: 30,
  },
  actualResolution: { width: 0, height: 0 },
  actualFrameRate: 0,
  thermalStatus: 'normal',
};

export const useCameraStore = create<CameraStore>((set) => ({
  ...initialState,

  setStream: (stream) => set({ stream }),
  setConfig: (config) => set({ config }),
  setActualResolution: (width, height) => set({ actualResolution: { width, height } }),
  setActualFrameRate: (fps) => set({ actualFrameRate: fps }),
  setThermalStatus: (status) => set({ thermalStatus: status }),
  setActive: (active) => set({ isActive: active }),
  
  updateMetrics: (metrics) => set((state) => ({
    ...state,
    ...(metrics as any),
  })),

  reset: () => set(initialState),
}));
