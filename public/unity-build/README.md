# Unity WebGL Build Directory

This directory will contain the Unity WebGL build output.

## Build Instructions

1. Open Unity project at `unity-ar-module/`
2. Go to File > Build Settings
3. Select WebGL as platform
4. Click "Build" or "Build And Run"
5. Select this directory as build output: `public/unity-build/`
6. Wait for build to complete

## Expected Build Output

After building, this directory will contain:
- `Build/` - Unity WebGL build files
- `TemplateData/` - Unity WebGL template files
- `index.html` - Unity WebGL loader

## Integration

The UnityARBridge component will load the build from this directory automatically.

## Important

- Do not manually modify files in this directory
- Rebuild from Unity when making changes
- Ensure WebGL 2.0 is supported in target browsers
