# AR Models Directory

This directory contains TensorFlow Lite models for AR functionality.

## Models Included:

### 1. ar-model.tflite
- **Purpose**: Product detection and classification
- **Input**: 224x224 RGB image
- **Output**: 10 product classes (lipstick, foundation, eyeshadow, blush, kurti, jeans, tshirt, dress, shoes, accessories)
- **Size**: ~15MB

### 2. face-landmark-model.tflite
- **Purpose**: Face landmark detection for makeup try-on
- **Input**: 224x224 RGB image
- **Output**: 468 face landmarks
- **Size**: ~8MB

## How to Add Your Own Models:

1. **Train your model** using TensorFlow/Keras
2. **Convert to TensorFlow Lite**:
   ```python
   converter = tf.lite.TFLiteConverter.from_keras_model(model)
   tflite_model = converter.convert()
   open('your-model.tflite', 'wb').write(tflite_model)
   ```
3. **Place in this directory**: `/public/models/your-model.tflite`
4. **Update environment variable**:
   ```env
   TFLITE_MODEL_URL=/models/your-model.tflite
   ```

## Model Training Data:

### Product Detection Classes:
- Lipstick shades (50+ varieties)
- Foundation tones (20+ shades)
- Eyeshadow palettes (30+ colors)
- Blush tones (15+ varieties)
- Fashion items (kurtis, jeans, dresses, etc.)

### Face Landmark Points:
- 468 landmarks from MediaPipe Face Mesh
- Lip contour (20 points)
- Eye region (30 points)
- Face oval (17 points)
- Nose and brow regions

## Performance Optimization:

- **Quantized models**: Use 8-bit quantization for faster inference
- **Model pruning**: Remove unnecessary weights
- **WebGL backend**: Hardware acceleration on mobile devices
- **Model caching**: Cache loaded models in localStorage

## Troubleshooting:

1. **Model not loading**: Check file path and CORS headers
2. **Slow inference**: Enable WebGL backend
3. **Poor accuracy**: Retrain with more diverse data
4. **Memory issues**: Use model quantization

## Alternative Models:

If you don't have custom models, the app will fall back to:
- Simple CNN for basic product detection
- MediaPipe Face Mesh for face tracking
- Simulated AR overlays
