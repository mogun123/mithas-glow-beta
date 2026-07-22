# 🎨 Free Hugging Face AI Makeup Setup Guide
## Unity WebGL + Hugging Face Inference API (No Local GPU Required)

### 📋 Overview
This guide walks through setting up the **free** Personalized Makeup Artist system using:
- **Unity WebGL** for web-based AR Foundation (no local Unity server needed)
- **Hugging Face Inference API** for free GPU-powered Stable Diffusion
- **Canvas fallback** for when API limits are reached
- **Browser window communication** (no WebSocket server costs)

---

## 🎯 Phase 1: Unity WebGL Setup

### 1.1 Unity Project Configuration
```bash
# Install required Unity packages (via Package Manager)
- AR Foundation (4.2+)
- ARKit XR Plugin (for iOS)
- ARCore XR Plugin (for Android)
- Newtonsoft JSON
```

### 1.2 Unity Scene Setup
1. Create new Unity scene: `MakeupMirrorScene`
2. Add AR Session component
3. Add AR Camera Manager
4. Add AR Face Manager
5. Add `UnityWebGLBridge.cs` script to main camera

### 1.3 WebGL Build Settings
- **Target Platform**: WebGL
- **Compression**: Disabled for development
- **Scripting Backend**: IL2CPP
- **API Compatibility Level**: .NET Standard 2.1

### 1.4 WebGL Build
```bash
# Build to: Assets/WebGL/
# Files will be in: Build/mithas-glow-ar.json
```

---

## 🎨 Phase 2: Hugging Face API Setup

### 2.1 Get Free Hugging Face Token
1. Go to [huggingface.co](https://huggingface.co)
2. Create free account
3. Go to Settings → Access Tokens
4. Create new token with `read` permissions
5. Copy `hf_YOUR_TOKEN_HERE`token (already provided: )

### 2.2 Available Free Models
- **runwayml/stable-diffusion-v1-5** - General purpose makeup
- **stabilityai/stable-diffusion-2-1** - Higher quality
- **runwayml/stable-diffusion-inpainting** - Precise makeup areas
- **stabilityai/stable-diffusion-xl-base-1.0** - Best quality (slower)

### 2.3 API Limits (Free Tier)
- **30 requests/minute** per model
- **~1GB/month** bandwidth
- **Queue times** during peak hours
- **Fallback to canvas** when limits reached

---

## 🔄 Phase 3: React Frontend Setup

### 3.1 Environment Configuration
Update `.env.local` (already configured):
```env
# 🎨 Hugging Face Inference API Configuration
VITE_HF_TOKEN=hf_YOUR_TOKEN_HERE
```

### 3.2 Start Development Server
```bash
npm start
# Opens: http://localhost:3000
```

### 3.3 File Structure
```
src/
├── components/
│   └── MirrorScreen.tsx          # Updated for HF API
├── lib/
│   ├── services/
│   │   ├── unity-ar.service.ts     # Browser window communication
│   │   └── stable-diffusion.service.ts  # Hugging Face API
│   └── ai/
│       └── makeup-prompt-generator.ts
└── .env.local                      # HF token configured
```

---

## 🌐 Phase 4: Unity WebGL Integration

### 4.1 Unity WebGL Build Files
Place Unity WebGL build in public folder:
```bash
# Copy Unity WebGL build to public/unity/
cp -r Assets/WebGL/Build public/unity/
cp Assets/WebGL/TemplateData/* public/
```

### 4.2 Browser Communication
- **No WebSocket server needed**
- Uses `window.postMessage` and custom events
- Unity instance available via `window.unityInstance`
- Automatic polling for Unity load

### 4.3 Unity-React Message Flow
```javascript
// React → Unity
window.unityInstance.SendMessage('UnityWebGLBridge', 'ProcessCommand', json);

// Unity → React
window.dispatchEvent(new CustomEvent('unityMessage', { detail: data }));
```

---

## 🎛️ Phase 5: Configuration & Testing

### 5.1 Connection Testing
1. Start React: `npm start`
2. Navigate to Mirror Screen
3. Check console for:
   - ✅ Hugging Face API configured
   - ✅ Unity WebGL bridge initialized
   - 🎯 Unity: ✅ HF: ✅

### 5.2 Face Tracking Test
1. Allow camera access
2. Position face in camera
3. Verify face mesh overlay appears
4. Check Unity console for face shape detection

### 5.3 Makeup Generation Test
1. Enable "Live Sync Mode"
2. Adjust makeup intensity sliders
3. Verify real-time AR updates
4. Wait for Hugging Face refinement
5. Check Before/After toggle

---

## 🔧 Advanced Configuration

### Hugging Face Model Selection
```typescript
// In stable-diffusion.service.ts
const models = [
  'runwayml/stable-diffusion-v1-5',     // Fast, good quality
  'stabilityai/stable-diffusion-2-1',   // Better quality
  'runwayml/stable-diffusion-inpainting', // Precise areas
  'stabilityai/stable-diffusion-xl-base-1.0' // Best quality
];
```

### Canvas Fallback Settings
```typescript
// Automatic fallback when HF API limits reached
private fallbackCanvasInpainting(base64Image: string, prompt: string) {
  // Applies makeup effects using HTML5 Canvas
  // No API calls required
  // Instant results
}
```

### Unity WebGL Optimization
```csharp
// In UnityWebGLBridge.cs
[SerializeField] private float _updateRate = 0.5f; // Send data every 0.5s
// Reduces bandwidth and improves performance
```

---

## 📊 Performance & Limits

### Free Tier Limitations
- **30 requests/minute** - Use canvas fallback during peak times
- **Queue times** - 10-30 seconds during busy periods
- **Model switching** - 1-2 seconds between different models
- **Resolution** - 512x768 recommended for speed

### Optimization Tips
```typescript
// Reduce API calls
const DEBOUNCE_TIME = 1000; // 1 second between requests
const BATCH_SIZE = 1;        // One face at a time

// Use canvas for real-time updates
// Use HF API for final refinement only
```

### Browser Compatibility
- **Chrome** - Best performance
- **Firefox** - Good performance
- **Safari** - Moderate performance
- **Mobile** - Limited performance (use canvas fallback)

---

## 🐛 Troubleshooting

### Common Issues

#### Hugging Face API Error
```bash
# Check token is valid
curl -H "Authorization: Bearer hf_YOUR_TOKEN_HERE" \
     https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5

# Check rate limits
# Wait 1 minute if getting 429 errors
```

#### Unity WebGL Not Loading
```bash
# Check Unity console for WebGL errors
# Verify build files are in public/ folder
# Test with Chrome incognito mode
```

#### Face Tracking Not Working
```csharp
// Unity console debugging
Debug.Log($"Face tracking status: {_isTracking}");
Debug.Log($"Faces detected: {_faceManager.trackables.count}");
```

#### Canvas Fallback Not Working
```javascript
// Check browser console for Canvas errors
// Verify face detection coordinates
// Test with different makeup prompts
```

---

## 🚀 Production Deployment

### Free Hosting Options
- **Vercel** - React frontend (recommended)
- **Netlify** - React frontend
- **GitHub Pages** - Static hosting
- **Unity WebGL** - Host with frontend

### Environment Variables
```bash
# Production .env
VITE_HF_TOKEN=hf_YOUR_TOKEN_HERE
VITE_APP_NAME=Mithas Glow
VITE_APP_VERSION=1.0.0
```

### CDN Configuration
```html
<!-- Unity WebGL files via CDN -->
<script src="https://cdn.your-domain.com/unity/unityloader.js"></script>
```

---

## 📚 API Reference

### Hugging Face Inference API
```json
{
  "inputs": {
    "prompt": "professional makeup, 8k",
    "image": "base64...",
    "negative_prompt": "blurry, low quality",
    "strength": 0.8,
    "guidance_scale": 7.5,
    "num_inference_steps": 20
  }
}
```

### Unity WebGL Messages
```javascript
// React → Unity
{
  "type": "updateMakeup",
  "data": {
    "type": "lipstick",
    "intensity": 0.8,
    "look": {...}
  }
}

// Unity → React
{
  "type": "faceData",
  "payload": {
    "faceShape": "oval",
    "skinMetrics": {...},
    "confidence": 0.95
  }
}
```

---

## 🎯 Next Steps

1. **Premium Upgrade** - Get higher API limits
2. **Multiple Models** - Support different makeup styles
3. **Real-time Style Transfer** - Live makeup changes
4. **Mobile Optimization** - Better mobile performance
5. **Social Sharing** - Share makeup results

---

## 📞 Support & Resources

### Hugging Face Support
- [Documentation](https://huggingface.co/docs/api-inference)
- [Community Forums](https://discuss.huggingface.co)
- [Model Hub](https://huggingface.co/models)

### Unity WebGL Support
- [Unity WebGL Documentation](https://docs.unity3d.com/Publishing/BuildingForWebGL)
- [AR Foundation](https://docs.unity3d.com/Packages/com.unity.xr.arfoundation@4.2/manual/index.html)

### Troubleshooting Help
- Check browser console for errors
- Verify Hugging Face token is valid
- Test Unity WebGL build separately

---

## 💡 Cost Summary

### **Completely FREE Setup**
- **Hugging Face API**: $0/month (30 requests/minute)
- **Unity WebGL**: $0 (browser-based)
- **React Hosting**: $0 (Vercel/Netlify)
- **WebSocket Server**: $0 (browser communication)

### **When to Upgrade**
- >100 users/day → Premium Hugging Face plan
- Need real-time generation → Local GPU setup
- Commercial use → Commercial licenses

---

🎉 **Free Setup Complete!** Your AI makeup system is ready with zero hosting costs!
