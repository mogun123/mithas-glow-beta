/**
 * VisualEffectsEngine.ts — Clinical-Grade Animation Engine
 * Provides requestAnimationFrame-based animations for clinical visualization
 * 
 * STRICT RULES:
 * - NO mock data
 * - NO fallback logic
 * - ONLY real metric data
 * - 60fps performance optimization
 */

export class VisualEffectsEngine {
  private animationFrameId: number | null = null;
  private pulse: number = 0;
  private callbacks: Set<(pulse: number) => void> = new Set();

  // 🎬 INITIALIZE ENGINE
  constructor() {
    this.start();
  }

  // 🚀 START ANIMATION LOOP
  public start(): void {
    if (this.animationFrameId !== null) return;

    const animate = () => {
      this.pulse += 0.03;
      if (this.pulse > 1) this.pulse = 0;

      // Notify all registered callbacks
      this.callbacks.forEach(callback => callback(this.pulse));
      
      this.animationFrameId = requestAnimationFrame(animate);
    };

    animate();
  }

  // 🛑 STOP ANIMATION LOOP
  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // 📊 REGISTER ANIMATION CALLBACK
  public registerCallback(callback: (pulse: number) => void): () => void {
    this.callbacks.add(callback);

    // Return unregister function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  // 🔄 GET CURRENT PULSE
  public getCurrentPulse(): number {
    return this.pulse;
  }

  // 🔢 CLEANUP
  public cleanup(): void {
    this.stop();
    this.callbacks.clear();
  }
}

// 🎨 CLINICAL ANIMATION HELPERS
export const ClinicalAnimationHelpers = {
  // 🔥 ACNE PULSE EFFECT
  createAcnePulse: (pulse: number, x: number, y: number, index: number) => ({
    filter: `drop-shadow(0 0 ${20 + pulse * 10}px rgba(255, 0, 0, 0.8))`,
    backgroundColor: `rgba(255, 0, 0, ${0.6 + pulse * 0.4})`,
    width: `${8 + pulse * 3}px`,
    height: `${8 + pulse * 3}px`,
    animation: `pulse ${2 + pulse * 0.5}s ease-in-out infinite`
  }),

  // 💧 OILINESS SHIMMER EFFECT
  createOilinessShimmer: (pulse: number, x: number, y: number, index: number) => ({
    filter: `brightness(${1.5 + Math.sin(pulse * 6 + index) * 0.3})`,
    backgroundColor: `rgba(255, 215, 0, ${0.4 + Math.sin(pulse * 6 + index) * 0.3})`,
    width: `${4 + Math.sin(pulse * 8 + index) * 2}px`,
    height: `${4 + Math.sin(pulse * 8 + index) * 2}px`,
    animation: `shimmer ${3 + pulse * 0.8}s linear infinite`,
    mixBlendMode: 'screen'
  }),

  // 👁 DARK CIRCLE PURPLE GRADIENT
  createDarkCircleGradient: (pulse: number, x: number, y: number) => ({
    background: `radial-gradient(circle at ${x}px ${y}px, rgba(128, 0, 128, ${0.4 + pulse * 0.2}) 0%, rgba(128, 0, 128, 0) 100%)`,
    filter: `blur(${15 + pulse * 8}px)`,
    width: `${24 + pulse * 6}px`,
    height: `${12 + pulse * 3}px`,
    animation: `pulse ${2.5 + pulse * 0.4}s ease-in-out infinite`
  }),

  // 🔴 REDNESS DIFFUSE GLOW
  createRednessGlow: (pulse: number, x: number, y: number) => ({
    filter: `blur(${25}px) drop-shadow(0 0 25px rgba(255, 0, 0, 0.6))`,
    backgroundColor: `rgba(255, 0, 0, ${0.2 + pulse * 0.3})`,
    width: `${36 + pulse * 8}px`,
    height: `${36 + pulse * 8}px`,
    animation: `breathing ${3 + pulse * 0.6}s ease-in-out infinite`
  }),

  // 🧬 TEXTURE CONTOUR LINES
  createTextureContour: (pulse: number, x: number, y: number) => ({
    border: `1px dashed rgba(255, 255, 255, ${0.3 + pulse * 0.2})`,
    width: `${30}px`,
    height: `${20}px`,
    animation: `flow ${4 + pulse * 0.5}s linear infinite`,
    background: `repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(255, 255, 255, ${0.3 + pulse * 0.2}) 2px,
      rgba(255, 255, 255, ${0.3 + pulse * 0.2}) 4px
    )`
  }),

  // 🎨 PIGMENT PARTICLE CLOUD
  createPigmentCloud: (pulse: number, x: number, y: number, index: number) => ({
    background: `radial-gradient(circle at ${x + Math.sin(pulse * 4 + index * 0.8) * 12}px ${y + Math.cos(pulse * 4 + index * 0.8) * 12}px, rgba(90, 50, 30, ${0.3 + Math.sin(pulse + index) * 0.2}) 0%, rgba(90, 50, 30, 0) 100%)`,
    width: `${24 + pulse * 8}px`,
    height: `${24 + pulse * 8}px`,
    animation: `swirl ${5 + pulse * 0.3}s ease-in-out infinite`
  }),

  // 💪 ELASTICITY HEX MESH
  createElasticityHex: (pulse: number, size: number = 20, row: number, col: number, index: number) => ({
    stroke: `rgba(0, 255, 0, ${0.6 + pulse * 0.4})`,
    strokeWidth: "2",
    transform: `scale(${1 + Math.sin(pulse * 6 + index) * 0.05}, ${1 + Math.cos(pulse * 6 + index) * 0.05})`,
    animation: `elasticity ${2 + pulse * 0.3}s ease-in-out infinite`,
    transformOrigin: `${col * 25}px ${row * 25}px`
  }),

  // ⏳ SKIN AGE DNA HELIX
  createSkinAgeHelix: (pulse: number, centerX: number, centerY: number) => ({
    stroke: `rgba(0, 150, 255, 0.8)`,
    strokeWidth: "3",
    filter: `drop-shadow(0 0 20px rgba(0, 150, 255, 0.8))`,
    transform: `rotate(${pulse * 360}deg)`,
    animation: `rotate ${4 + pulse * 0.2}s linear infinite`,
    transformOrigin: `${centerX}px ${centerY}px`
  }),

  // ✨ GLASS SKIN SCAN BAR
  createGlassSkinScan: (pulse: number, canvasWidth: number) => ({
    background: `linear-gradient(90deg, 
      transparent 0%, 
      rgba(255, 255, 255, 0) ${pulse * canvasWidth - 50}px, 
      rgba(255, 255, 255, 0.8) ${pulse * canvasWidth}px, 
      rgba(255, 255, 255, 0) ${pulse * canvasWidth + 50}px, 
      transparent 100%)`,
    width: '100px',
    height: '100%',
    left: `${pulse * canvasWidth - 50}px`,
    animation: `scan ${2 + pulse * 0.4}s linear infinite`
  }),

  // 🚨 CONFIDENCE VISUALIZATION
  createConfidenceAura: (pulse: number, confidenceScore: number, centerX: number, centerY: number) => {
    const radius = 150 + Math.sin(pulse * 8) * 10;
    const isHighConfidence = confidenceScore > 0.8;
    
    return {
      background: `radial-gradient(circle at ${centerX}px ${centerY}px, ${
        isHighConfidence 
          ? `rgba(0, 255, 0, ${0.3 + pulse * 0.1})` 
          : `rgba(255, 0, 0, ${Math.sin(pulse * 20) > 0 ? 0.3 : 0.1})`
      } 0%, ${
        isHighConfidence 
          ? 'rgba(0, 255, 0, 0)' 
          : 'rgba(255, 0, 0, 0)'
      } 100%)`,
      width: `${radius * 2}px`,
      height: `${radius * 2}px`,
      left: `${centerX - radius}px`,
      top: `${centerY - radius}px`,
      animation: isHighConfidence 
        ? `stable-glow ${3 + pulse * 0.2}s ease-in-out infinite`
        : `flicker ${0.1 + pulse * 0.05}s ease-in-out infinite`,
      mixBlendMode: 'screen'
    };
  }
};

// 🎨 CSS ANIMATION DEFINITIONS
export const ClinicalAnimationStyles = `
  @keyframes pulse {
    0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
    50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
  }
  
  @keyframes shimmer {
    0% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
    50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.3); }
    100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
  }
  
  @keyframes breathing {
    0%, 100% { opacity: 0.2; }
    50% { opacity: 0.5; }
  }
  
  @keyframes flow {
    0% { transform: translate(-50%, -50%) translateY(0px); }
    100% { transform: translate(-50%, -50%) translateY(-4px); }
  }
  
  @keyframes swirl {
    0% { transform: translate(-50%, -50%) rotate(0deg) scale(1); }
    50% { transform: translate(-50%, -50%) rotate(180deg) scale(1.2); }
    100% { transform: translate(-50%, -50%) rotate(360deg) scale(1); }
  }
  
  @keyframes elasticity {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  
  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes scan {
    0% { transform: translateX(-100px); }
    100% { transform: translateX(calc(100vw + 100px)); }
  }
  
  @keyframes stable-glow {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.4; }
  }
  
  @keyframes flicker {
    0%, 100% { opacity: 0.1; }
    50% { opacity: 0.3; }
  }
  
  .clinical-marker {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 10px;
    color: white;
    border-radius: 50%;
    z-index: 100;
    transform: translate(-50%, -50%);
  }
  
  .clinical-marker-acne {
    box-shadow: 0 0 20px rgba(255, 0, 0, 0.8);
  }
  
  .clinical-marker-oiliness {
    mix-blend-mode: screen;
    filter: brightness(1.5);
  }
  
  .clinical-marker-darkCircle {
    filter: blur(15px);
  }
  
  .clinical-marker-redness {
    filter: blur(25px) drop-shadow(0 0 25px rgba(255, 0, 0, 0.6));
  }
  
  .clinical-marker-texture {
    border: 1px dashed rgba(255, 255, 255, 0.3);
    width: 30px;
    height: 20px;
    border-radius: 2px;
  }
  
  .clinical-marker-pigment {
    background: radial-gradient(circle, rgba(90, 50, 30, 0.3) 0%, rgba(90, 50, 30, 0) 100%);
  }
`;
