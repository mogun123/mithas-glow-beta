# 3D Beard Models Directory

This directory contains 3D beard models (.glb format) for AR beard overlay functionality.

## Models Needed:

### 1. default-beard.glb
- **Purpose**: Default beard style for AR overlay
- **Format**: GLTF/GLB (binary)
- **Size**: ~5-10MB
- **Features**: 
  - Realistic hair texture
  - Transparent alpha channel for blending
  - Proper UV mapping for skin tone matching

## How to Add Models:

1. **Create or obtain 3D beard models** using Blender, Maya, or similar
2. **Export to GLB format**:
   - Use GLTF exporter
   - Include materials and textures
   - Optimize for web (under 10MB)
3. **Place in this directory**: `/public/models/3d/your-beard.glb`
4. **Update BeardStudio.tsx** to reference the new model

## Temporary Fallback:

If no beard models are available, the system will:
- Log appropriate error messages
- Display loading state in UI
- gracefully handle missing model files
- Continue with face tracking without AR overlay

## Model Requirements:

- **File Format**: .glb (binary GLTF)
- **Max Size**: 10MB
- **Texture Resolution**: 1024x1024 or lower
- **Alpha Channel**: Required for realistic blending
- **Normals**: Properly baked for lighting
- **Materials**: PBR materials recommended
