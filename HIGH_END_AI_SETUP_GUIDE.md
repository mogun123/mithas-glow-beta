# 🎨 High-End AI Backend Setup Guide
## Unity AR Foundation + Stable Diffusion + ControlNet Integration

### 📋 Overview
This guide walks through setting up the upgraded Personalized Makeup Artist system with:
- **Unity AR Foundation** for high-precision 3D face tracking
- **Stable Diffusion** (Automatic1111/ComfyUI) for hyper-realistic makeup rendering
- **ControlNet** for precise facial structure preservation
- **WebSocket** communication for real-time updates

---

## 🎯 Phase 1: Unity AR Foundation Setup

### 1.1 Unity Project Configuration
```bash
# Install required Unity packages
- AR Foundation (4.2+)
- ARKit XR Plugin (for iOS)
- ARCore XR Plugin (for Android)
- WebSocket Sharp
- Newtonsoft JSON
```

### 1.2 Unity Scene Setup
1. Create new Unity scene: `MakeupMirrorScene`
2. Add AR Session component
3. Add AR Camera Manager
4. Add AR Face Manager
5. Add `UnityARBridge.cs` script to main camera

### 1.3 Build Settings
- **Target Platform**: WebGL
- **Compression**: Disabled for development
- **Scripting Backend**: IL2CPP
- **API Compatibility Level**: .NET Standard 2.1

### 1.4 WebGL Build
```bash
# Build to: Assets/WebGL/
# Serve with local server (Python 3 recommended)
python -m http.server 8080
```

---

## 🎨 Phase 2: Stable Diffusion Backend Setup

### 2.1 Automatic1111 Installation
```bash
# Clone Automatic1111
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui

# Install dependencies
pip install -r requirements.txt

# Download required models
# ControlNet models:
wget -O models/control_v11p_sd15_hashed.safetensors \
  https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11p_sd15_hashed.safetensors

# Depth ControlNet:
wget -O models/control_depth-fp16.safetensors \
  https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_depth-fp16.safetensors
```

### 2.2 Python Dependencies
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install transformers diffusers accelerate
pip install opencv-python pillow aiohttp websockets
pip install numpy mediapipe
```

### 2.3 Start Stable Diffusion Server
```bash
# Start Automatic1111 with API
python launch.py --api --listen --xformers --enable-insecure-extension-access

# Start our custom server (in separate terminal)
cd backend
python stable-dusion-server.py
```

---

## 🔄 Phase 3: React Frontend Integration

### 3.1 Environment Configuration
Create `.env.local`:
```env
REACT_APP_UNITY_BRIDGE_URL=ws://localhost:8080
REACT_APP_SD_SERVER_URL=ws://localhost:7860
REACT_APP_ENABLE_HIGH_END_AI=true
```

### 3.2 Package Dependencies
```bash
# Already installed in package.json
npm install @tensorflow/tfjs @tensorflow-models/face-landmarks-detection
npm install @mediapipe/face_mesh
```

### 3.3 Start Development Server
```bash
npm start
# Opens: http://localhost:3000
```

---

## 🎛️ Phase 4: Configuration & Testing

### 4.1 Connection Testing
1. Open browser to `http://localhost:3000`
2. Navigate to Mirror Screen
3. Check console for:
   - ✅ Connected to Unity AR Foundation bridge
   - ✅ Connected to Stable Diffusion GPU server
   - 🎯 Unity: ✅ SD: ✅

### 4.2 Face Tracking Test
1. Allow camera access
2. Position face in camera
3. Verify face mesh overlay appears
4. Check Unity console for face shape detection

### 4.3 Makeup Generation Test
1. Enable "Live Sync Mode"
2. Adjust makeup intensity sliders
3. Verify real-time AR updates
4. Wait for SD refinement
5. Check Before/After toggle

---

## 🔧 Advanced Configuration

### Unity AR Bridge Settings
```csharp
// In UnityARBridge.cs
[SerializeField] private string _reactBridgeUrl = "ws://localhost:8080";
[SerializeField] private float _updateRate = 30f; // FPS for face data
```

### Stable Diffusion Parameters
```python
# In stable-dusion-server.py
"steps": 20,                    # Higher = better quality, slower
"cfg_scale": 7.5,              # Lower = more creative
"denoising_strength": 0.8,      # Higher = more change
"sampler_name": "DPM++ 2M Karras"  # Best for faces
```

### ControlNet Models
- **Canny**: Best for precise edge preservation
- **Depth**: Best for 3D structure
- **Pose**: Best for facial angles
- **Scribble**: Best for artistic styles

---

## 📊 Performance Optimization

### GPU Requirements
- **Minimum**: RTX 3060 (6GB VRAM)
- **Recommended**: RTX 4070 (12GB VRAM)
- **Optimal**: RTX 4090 (24GB VRAM)

### Memory Settings
```python
# Automatic1111 launch args
--medvram --opt-split-attention  # For 8-12GB VRAM
--lowvram                     # For <8GB VRAM
```

### WebSocket Optimization
```javascript
// In unity-ar.service.ts
const updateRate = 30; // FPS for face data
const batchSize = 1;     // One face at a time
```

---

## 🐛 Troubleshooting

### Common Issues

#### Unity WebGL Not Loading
```bash
# Check Unity console for errors
# Verify WebGL build compatibility
# Test with different browsers (Chrome recommended)
```

#### Stable Diffusion Connection Failed
```bash
# Check if Automatic1111 API is running
curl http://127.0.0.1:7860/sdapi/v1/samplers

# Verify WebSocket server
python -c "import websockets; print('WebSocket OK')"
```

#### Face Tracking Not Working
```csharp
// Unity console debugging
Debug.Log($"Face tracking status: {_isTracking}");
Debug.Log($"Faces detected: {_faceManager.trackables.count}");
```

#### Makeup Generation Slow
```python
# Reduce steps or resolution
"steps": 15,           # Faster generation
"width": 384,           # Lower resolution
"height": 576,
```

---

## 🚀 Production Deployment

### Docker Configuration
```dockerfile
# Dockerfile for Stable Diffusion
FROM nvidia/cuda:11.8-devel-ubuntu20.04

# Install Python and dependencies
RUN apt-get update && apt-get install -y python3 python3-pip
COPY requirements.txt .
RUN pip3 install -r requirements.txt

# Copy server code
COPY stable-dusion-server.py .
EXPOSE 7860

CMD ["python3", "stable-dusion-server.py"]
```

### Cloud Deployment
- **Unity WebGL**: Deploy to Vercel/Netlify
- **SD Server**: Deploy to GPU cloud (RunPod, Lambda Labs)
- **WebSocket**: Use secure WSS:// protocol

---

## 📚 API Reference

### Unity → React Messages
```json
{
  "type": "faceData",
  "payload": {
    "faceShape": "oval",
    "skinMetrics": {...},
    "confidence": 0.95
  }
}
```

### React → Unity Commands
```json
{
  "type": "updateMakeup",
  "data": {
    "type": "lipstick",
    "intensity": 0.8,
    "look": {...}
  }
}
```

### Stable Diffusion Requests
```json
{
  "type": "inpaint",
  "input": {
    "image": "base64...",
    "controlnet": {
      "type": "canny",
      "image": "base64..."
    },
    "prompt": "professional makeup, 8k"
  }
}
```

---

## 🎯 Next Steps

1. **Enhanced Face Analysis**: Integrate skin condition detection
2. **Real-time Style Transfer**: Add live makeup style changes
3. **3D Makeup Visualization**: Use Unity shaders for realistic rendering
4. **Mobile Optimization**: Reduce model sizes for mobile deployment
5. **Multi-face Support**: Handle group makeup sessions

---

## 📞 Support

For issues with:
- **Unity AR Foundation**: Check Unity console logs
- **Stable Diffusion**: Check Automatic1111 logs
- **WebSocket**: Use browser DevTools Network tab
- **React Integration**: Check React component console

---

🎉 **Setup Complete!** Your high-end AI makeup system is ready for production use.
