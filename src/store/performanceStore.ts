// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - Performance State Store (Zustand)
// ═══════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { PerformanceHistory, DeviceCapabilities, QualitySettings } from '../types/performance.types';

interface PerformanceStore {
  // State
  history: PerformanceHistory;
  capabilities: DeviceCapabilities | null;
  currentQuality: QualitySettings | null;
  
  // Actions
  addSnapshot: (snapshot: PerformanceHistory['snapshots'][0]) => void;
  setCapabilities: (capabilities: DeviceCapabilities) => void;
  setCurrentQuality: (quality: QualitySettings) => void;
  updateCurrentFPS: (fps: number) => void;
  setThrottling: (isThrottling: boolean) => void;
  reset: () => void;
}

const initialHistory: PerformanceHistory = {
  snapshots: [],
  currentFPS: 0,
  targetFPS: 30,
  qualityLevel: 50,
  isThrottling: false,
};

export const usePerformanceStore = create<PerformanceStore>((set) => ({
  history: initialHistory,
  capabilities: null,
  currentQuality: null,

  addSnapshot: (snapshot) => set((state) => {
    const newSnapshots = [...state.history.snapshots, snapshot].slice(-100); // Keep last 100 snapshots
    
    // Calculate averages
    const avgFPS = newSnapshots.reduce((sum, s) => sum + s.averageFPS, 0) / newSnapshots.length;
    const minFPS = Math.min(...newSnapshots.map(s => s.minFPS));
    const maxFPS = Math.max(...newSnapshots.map(s => s.maxFPS));
    
    return {
      history: {
        ...state.history,
        snapshots: newSnapshots,
        currentFPS: snapshot.averageFPS,
        minFPS,
        maxFPS,
      },
    };
  }),

  setCapabilities: (capabilities) => set({ capabilities }),
  setCurrentQuality: (quality) => set({ currentQuality: quality }),
  updateCurrentFPS: (fps) => set((state) => ({
    history: { ...state.history, currentFPS: fps },
  })),
  setThrottling: (isThrottling) => set((state) => ({
    history: { ...state.history, isThrottling },
  })),

  reset: () => set({
    history: initialHistory,
    capabilities: null,
    currentQuality: null,
  }),
}));
