import { useState, useCallback, useRef } from 'react';
import { Gender, Occasion, MakeupLook, CustomTweaks } from '../components/ARLiveTryOn';

export interface UseARState {
  phase: 'analysis' | 'tryon';
  isAnalyzing: boolean;
  selectedLook: MakeupLook | null;
  customTweaks: CustomTweaks;
  landmarks: any[];
  cameraActive: boolean;
  recommendedLooks: MakeupLook[];
  isPremium: boolean;
}

export const useARState = (gender: Gender, occasion: Occasion, allLooks: MakeupLook[]) => {
  const [state, setState] = useState<UseARState>({
    phase: 'analysis',
    isAnalyzing: false,
    selectedLook: null,
    customTweaks: {},
    landmarks: [],
    cameraActive: false,
    recommendedLooks: [],
    isPremium: false
  });

  const analysisTimeoutRef = useRef<NodeJS.Timeout>();

  // Filter and recommend looks based on gender and occasion
  const updateRecommendedLooks = useCallback(() => {
    const filtered = allLooks.filter(look => 
      look.gender === gender && look.occasion === occasion
    );
    
    setState(prev => ({ ...prev, recommendedLooks: filtered }));
    
    // Auto-select first free look after analysis
    if (filtered.length > 0 && state.phase === 'tryon') {
      const firstFreeLook = filtered.find(look => look.isFree);
      if (firstFreeLook && !state.selectedLook) {
        setState(prev => ({ ...prev, selectedLook: firstFreeLook }));
      }
    }
  }, [gender, occasion, allLooks, state.phase, state.selectedLook]);

  // Start analysis phase
  const startAnalysis = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      phase: 'analysis', 
      isAnalyzing: true,
      selectedLook: null,
      customTweaks: {}
    }));

    // Auto-transition to try-on after 3 seconds
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }
    
    analysisTimeoutRef.current = setTimeout(() => {
      setState(prev => ({ 
        ...prev, 
        phase: 'tryon', 
        isAnalyzing: false 
      }));
      updateRecommendedLooks();
    }, 3000);
  }, [updateRecommendedLooks]);

  // Handle look selection
  const selectLook = useCallback((look: MakeupLook) => {
    if (!look.isFree && !state.isPremium) {
      // Show premium upgrade modal
      setState(prev => ({ ...prev, selectedLook: look }));
      return;
    }
    
    setState(prev => ({ 
      ...prev, 
      selectedLook: look, 
      customTweaks: {} // Reset tweaks when selecting new look
    }));
  }, [state.isPremium]);

  // Handle custom tweaks
  const updateCustomTweak = useCallback((component: keyof CustomTweaks, color: string) => {
    setState(prev => ({
      ...prev,
      customTweaks: {
        ...prev.customTweaks,
        [component]: color
      }
    }));
  }, []);

  // Update landmarks
  const updateLandmarks = useCallback((landmarks: any[]) => {
    setState(prev => ({ ...prev, landmarks }));
  }, []);

  // Set camera active state
  const setCameraActive = useCallback((active: boolean) => {
    setState(prev => ({ ...prev, cameraActive: active }));
  }, []);

  // Handle premium upgrade
  const upgradeToPremium = useCallback(() => {
    setState(prev => ({ ...prev, isPremium: true }));
  }, []);

  // Reset state
  const resetState = useCallback(() => {
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }
    setState({
      phase: 'analysis',
      isAnalyzing: false,
      selectedLook: null,
      customTweaks: {},
      landmarks: [],
      cameraActive: false,
      recommendedLooks: [],
      isPremium: false
    });
  }, []);

  return {
    ...state,
    startAnalysis,
    selectLook,
    updateCustomTweak,
    updateLandmarks,
    setCameraActive,
    upgradeToPremium,
    resetState,
    updateRecommendedLooks
  };
};
