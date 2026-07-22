# MITHASGLOW Phase 1 Architecture

## Modular Folder Structure

```
src/
├── engine/                          # Core AR Engines (React-free, pure logic)
│   ├── CameraEngine.ts              # Camera handling with mobile optimization
│   ├── FaceMeshWorker.ts            # Web Worker for MediaPipe FaceMesh
│   ├── FaceValidationEngine.ts      # Lighting, blur, distance validation
│   ├── FaceStabilizationEngine.ts   # Kalman filtering, temporal smoothing
│   ├── FaceDepthEngine.ts           # Pseudo-depth estimation
│   ├── DynamicAnchorEngine.ts      # Multi-point anchor system
│   ├── BeardAttachmentEngine.ts     # 3D surface attachment logic
│   ├── ThreeEngine.ts              # Three.js rendering pipeline
│   ├── PerformanceEngine.ts        # Device detection, quality switching
│   └── BeardAssetManager.ts        # GLB asset loading and caching
│
├── shaders/                         # GLSL Shaders
│   ├── BeardVertexShader.glsl       # Vertex shader for beard rendering
│   ├── BeardFragmentShader.glsl     # Fragment shader for hair realism
│   └── SkinBlendingShader.glsl      # Skin tone adaptation shader
│
├── store/                           # Zustand State Management
│   ├── arStore.ts                   # Main AR state
│   ├── cameraStore.ts               # Camera state
│   ├── beardStore.ts               # Beard selection state
│   └── performanceStore.ts         # Performance metrics state
│
├── types/                           # TypeScript Interfaces
│   ├── engine.types.ts              # Engine interfaces
│   ├── beard.types.ts               # Beard style interfaces
│   └── performance.types.ts        # Performance interfaces
│
├── components/                      # React Components (UI only)
│   ├── BeardARView.tsx              # Main AR view component
│   ├── BeardCarousel.tsx            # Beard selection carousel
│   ├── ValidationOverlay.tsx        # Face validation guidance
│   └── PerformanceMonitor.tsx       # Performance metrics display
│
└── hooks/                           # React Hooks
    ├── useAREngine.ts               # Main AR orchestrator hook
    └── useCameraEngine.ts           # Camera engine hook
```

## Architecture Principles

1. **React Responsibilities ONLY**: UI, buttons, transitions, state visualization
2. **React MUST NEVER handle**: AR math, transforms, landmarks, shaders, render calculations
3. **Engine-Driven**: All heavy logic in pure TypeScript engines
4. **Worker-Based**: MediaPipe in Web Worker, off main thread
5. **Async AI**: Background analysis, not frame-by-frame
6. **Mobile-First**: Android optimization, thermal protection, adaptive quality

## Data Flow

```
CameraEngine
  → MediaPipe FaceMesh (Worker)
    → FaceValidationEngine
      → FaceStabilizationEngine
        → FaceDepthEngine
          → DynamicAnchorEngine
            → BeardAttachmentEngine
              → ThreeEngine
                → GLSL Shaders
                  → Final AR Output
```

## Performance Targets

- 30-60 FPS on mobile
- Low memory usage
- Low battery drain
- Stable thermal performance
- Smooth Android rendering
