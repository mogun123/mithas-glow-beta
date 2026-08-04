# 🧔 Real-Time AR Beard Overlay System

A production-ready, Snapchat/Instagram-level AR beard overlay system built with React, TypeScript, Three.js, and MediaPipe FaceMesh.

## 🚀 Features

- **Real-time Face Tracking**: MediaPipe FaceMesh with 478 landmarks
- **3D Beard Overlay**: Three.js rendering with GLB model loading
- **Intelligent Recommendations**: AI-powered beard style suggestions
- **60 FPS Performance**: Optimized render loop with requestAnimationFrame
- **Dynamic Scaling**: Beard scales based on real face measurements
- **Memory Efficient**: Model caching and proper disposal
- **Error Resilient**: Comprehensive error handling and fallbacks

## 📁 Architecture

```
src/ar/
├── faceTracking.ts      # MediaPipe FaceMesh engine
├── beardOverlay.ts      # Three.js 3D rendering engine
├── useAR.ts            # React hook for state management
└── README.md           # This documentation
```

## 🔧 Installation

### Dependencies

```bash
npm install three @types/three @mediapipe/face_mesh
```

### Backend API

Ensure your FastAPI backend is running with the beard recommendation endpoint:

```
POST /ai/beard/recommendation
```

## 🎯 Quick Start

### Basic Usage

```tsx
import { useAR } from '../ar/useAR';

const MyComponent = () => {
  const {
    arStatus,
    currentBeardStyle,
    startAR,
    stopAR,
    videoRef,
    canvasRef,
  } = useAR({
    selectedOccasion: 'casual',
    onBeardStyleSelected: (style) => {
      console.log('Beard applied:', style);
    },
  });

  return (
    <div className="relative w-full h-full">
      <video ref={videoRef} className="absolute inset-0" />
      <canvas ref={canvasRef} className="absolute inset-0" />
      <button onClick={startAR}>Start AR</button>
    </div>
  );
};
```

### Complete Mirror Screen

```tsx
import ARMirrorScreen from './ARMirrorScreen';

const App = () => {
  return (
    <ARMirrorScreen
      selectedOccasion="casual"
      onBeardStyleSelected={(style) => {
        console.log('Selected:', style.name);
      }}
    />
  );
};
```

## 📊 System Components

### 1. Face Tracking Engine (`faceTracking.ts`)

Handles MediaPipe FaceMesh integration and face geometry calculation.

```typescript
import { FaceTrackingEngine } from '../ar/faceTracking';

const engine = new FaceTrackingEngine();
engine.setResultsCallback((result) => {
  console.log('Face detected:', result.geometry);
});
await engine.startCamera(videoElement);
```

**Key Features:**
- 478 landmark detection
- Face geometry calculation (jaw width, cheekbone ratio, symmetry)
- Stability detection (5 consistent frames)
- Real-time processing

### 2. Beard Overlay Engine (`beardOverlay.ts`)

Three.js 3D rendering engine for beard models.

```typescript
import { BeardOverlayEngine } from '../ar/beardOverlay';

const engine = new BeardOverlayEngine(canvas, video);
await engine.loadBeardStyle(beardStyle);
engine.startRenderLoop(updateCallback);
```

**Key Features:**
- GLB model loading with caching
- 3D coordinate conversion (MediaPipe → Three.js)
- Dynamic scaling based on jaw width
- Real-time position/rotation updates

### 3. React Hook (`useAR.ts`)

State management and lifecycle handling for AR system.

```typescript
const {
  arStatus,           // Current AR state
  currentBeardStyle,  // Applied beard style
  faceGeometry,       // Calculated face measurements
  isARActive,         // AR system active status
  startAR,           // Start AR system
  stopAR,            // Stop AR system
  selectBeardStyle,  // Manual style selection
  videoRef,          // Video element ref
  canvasRef,         // Canvas element ref
} = useAR(config);
```

## 🎮 3D Coordinate System

### MediaPipe → Three.js Conversion

```typescript
private convertToThreeJSCoordinates(landmark: Landmark): THREE.Vector3 {
  // MediaPipe outputs normalized coordinates (0-1)
  const x = (landmark.x - 0.5) * 2; // -1 to 1 range
  const y = -(landmark.y - 0.5) * 2; // Flip Y, -1 to 1 range
  const z = landmark.z * 0.5; // Scale Z for depth

  const vector = new THREE.Vector3(x, y, z);
  vector.unproject(this.camera); // Convert to world coordinates
  return vector;
}
```

### 3D Rotation Calculation

```typescript
// Calculate Euler angles from face orientation
const yaw = Math.atan2(
  rightJawWorld.z - leftJawWorld.z,
  rightJawWorld.x - leftJawWorld.x
);

const roll = Math.atan2(
  rightJawWorld.y - leftJawWorld.y,
  rightJawWorld.x - leftJawWorld.x
);

const pitch = Math.atan2(
  chinWorld.z - noseWorld.z,
  chinWorld.y - noseWorld.y
);

beardModel.rotation.set(pitch, yaw, roll);
```

## 📱 Integration Examples

### With Existing Mirror Screen

```tsx
// Replace existing mirror component
import ARMirrorScreen from './ARMirrorScreen';

const MirrorView = () => {
  return (
    <ARMirrorScreen
      selectedOccasion="party"
      onBeardStyleSelected={(style) => {
        // Handle beard selection
        analytics.track('beard_style_applied', {
          name: style.name,
          score: style.weighted_score
        });
      }}
    />
  );
};
```

### Custom AR Component

```tsx
const CustomARComponent = () => {
  const { arStatus, startAR, stopAR, videoRef, canvasRef } = useAR({
    onError: (error) => {
      // Custom error handling
      showNotification(error, 'error');
    }
  });

  return (
    <div className="ar-container">
      <video ref={videoRef} className="camera-feed" />
      <canvas ref={canvasRef} className="ar-overlay" />
      
      <div className="ar-controls">
        <button onClick={startAR} disabled={arStatus.state !== 'initializing'}>
          Start AR
        </button>
        <button onClick={stopAR}>
          Stop AR
        </button>
      </div>
      
      <div className="ar-status">
        Status: {arStatus.message}
      </div>
    </div>
  );
};
```

## 🔧 Configuration

### AR Hook Options

```typescript
interface UseARConfig {
  selectedOccasion?: string;           // 'casual', 'party', 'office', 'wedding'
  onBeardStyleSelected?: (beardStyle: BeardStyle) => void;
  onError?: (error: string) => void;
}
```

### Face Tracking Options

```typescript
// MediaPipe configuration
faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
  selfieMode: true,
});
```

### Three.js Configuration

```typescript
// Renderer options
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  alpha: true,
  antialias: true,
  powerPreference: 'high-performance',
});
```

## 📊 Performance Optimization

### Target Metrics

- **Frame Rate**: 60 FPS
- **Input Lag**: <16ms
- **Memory Usage**: <100MB for models
- **CPU Usage**: <30% on mobile devices

### Optimization Techniques

1. **Model Caching**: GLB models cached after first load
2. **Geometry Disposal**: Proper cleanup of Three.js objects
3. **Frame Skipping**: Skip frames if processing is slow
4. **LOD**: Level of detail for distant objects
5. **Web Workers**: Heavy calculations off main thread

### Memory Management

```typescript
// Automatic cleanup on unmount
useEffect(() => {
  return () => {
    stopAR();
    // Dispose engines and clear caches
  };
}, [stopAR]);
```

## 🚨 Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|--------|----------|
| `CAMERA_ACCESS_DENIED` | Camera permission denied | Request permissions again |
| `BEARD_MODEL_LOAD_FAILED` | GLB model URL invalid | Check model URL and format |
| `REQUIRED_LANDMARKS_MISSING` | Face not properly detected | Improve lighting conditions |
| `BEARD_RECOMMENDATION_FAILED` | Backend API error | Check API endpoint and network |

### Error Recovery

```typescript
const { arStatus } = useAR({
  onError: (error) => {
    switch (error) {
      case 'CAMERA_ACCESS_DENIED':
        showCameraPermissionDialog();
        break;
      case 'BEARD_MODEL_LOAD_FAILED':
        retryModelLoad();
        break;
      default:
        showGenericError(error);
    }
  }
});
```

## 🎨 Styling

### CSS Structure

```css
.ar-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.camera-feed {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform: scaleX(-1); /* Mirror effect */
}

.ar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  transform: scaleX(-1); /* Mirror effect */
}
```

### Status Indicators

```typescript
const getStatusColor = (state: ARState) => {
  switch (state) {
    case 'active': return 'text-green-600';
    case 'error': return 'text-red-600';
    case 'loading': return 'text-blue-600';
    default: return 'text-gray-600';
  }
};
```

## 🔮 Future Enhancements

### Planned Features

- **Hair Overlay**: Similar system for hair styles
- **Glasses Integration**: 3D glasses positioning
- **Skin Tone Shaders**: Dynamic skin tone matching
- **Multi-Style Switching**: Quick style changes
- **Augmented Reality**: ARCore/ARKit integration
- **Social Sharing**: Export AR photos/videos

### Extension Points

```typescript
// Future: Hair overlay
import { HairOverlayEngine } from '../ar/hairOverlay';

// Future: Glasses integration
import { GlassesOverlayEngine } from '../ar/glassesOverlay';

// Future: Multi-style management
import { StyleManager } from '../ar/styleManager';
```

## 📱 Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 90+ | ✅ Full |
| Firefox | 88+ | ✅ Full |
| Safari | 14+ | ✅ Full |
| Edge | 90+ | ✅ Full |
| Mobile Chrome | 90+ | ✅ Full |
| Mobile Safari | 14+ | ✅ Full |

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [MediaPipe](https://mediapipe.dev/) - Face tracking technology
- [Three.js](https://threejs.org/) - 3D rendering library
- [React](https://reactjs.org/) - UI framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety

---

**Built with ❤️ for the future of AR grooming**
