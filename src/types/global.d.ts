// Global type declarations for GPU skin analysis
declare global {
  interface Window {
    skinAnalysisGPU?: import('../gpu/skinAnalysisGPU').SkinAnalysisGPU;
  }
}

export {};
