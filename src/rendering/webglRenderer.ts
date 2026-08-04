export interface MakeupLayer {
  type: 'foundation' | 'blush' | 'lipstick' | 'contour' | 'highlighter' | 'eyeshadow';
  color: [number, number, number, number]; // RGBA
  intensity: number; // 0-1
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
  landmarks: number[][]; // Face landmarks for this layer
}

export interface RenderConfig {
  width: number;
  height: number;
  enableSmoothing: boolean;
  enableBlending: boolean;
  quality: 'low' | 'medium' | 'high';
}

export class WebGLRenderer {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private canvas: HTMLCanvasElement;
  private config: RenderConfig;
  
  // Shader sources
  private readonly vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `;

  private readonly fragmentShaderSource = `
    precision mediump float;
    
    uniform sampler2D u_image;
    uniform vec4 u_makeupColor;
    uniform float u_intensity;
    uniform int u_blendMode;
    uniform vec2 u_landmarks[50]; // Up to 50 landmarks
    uniform int u_landmarkCount;
    uniform vec2 u_resolution;
    
    varying vec2 v_texCoord;
    
    // Blend mode functions
    vec3 blendNormal(vec3 base, vec3 overlay) {
      return mix(base, overlay, u_intensity);
    }
    
    vec3 blendMultiply(vec3 base, vec3 overlay) {
      return mix(base, base * overlay, u_intensity);
    }
    
    vec3 blendScreen(vec3 base, vec3 overlay) {
      return mix(base, 1.0 - (1.0 - base) * (1.0 - overlay), u_intensity);
    }
    
    vec3 blendOverlay(vec3 base, vec3 overlay) {
      vec3 result = vec3(0.0);
      for (int i = 0; i < 3; i++) {
        if (base[i] < 0.5) {
          result[i] = 2.0 * base[i] * overlay[i];
        } else {
          result[i] = 1.0 - 2.0 * (1.0 - base[i]) * (1.0 - overlay[i]);
        }
      }
      return mix(base, result, u_intensity);
    }
    
    // Check if point is near any landmark
    float isInMakeupRegion(vec2 point) {
      float minDistance = 9999.0;
      for (int i = 0; i < 50; i++) {
        if (i >= u_landmarkCount) break;
        
        vec2 landmark = u_landmarks[i];
        float distance = length(point - landmark);
        minDistance = min(minDistance, distance);
      }
      
      // Create smooth falloff around landmarks
      float radius = 0.05; // 5% of image size
      return 1.0 - smoothstep(0.0, radius, minDistance);
    }
    
    void main() {
      vec2 texCoord = v_texCoord;
      vec4 originalColor = texture2D(u_image, texCoord);
      
      // Convert to 0-1 range for landmark calculations
      vec2 point = texCoord;
      
      // Check if we're in a makeup region
      float mask = isInMakeupRegion(point);
      
      if (mask > 0.01) {
        vec3 makeupColor = u_makeupColor.rgb;
        vec3 baseColor = originalColor.rgb;
        
        // Apply blend mode
        vec3 blendedColor;
        if (u_blendMode == 0) { // normal
          blendedColor = blendNormal(baseColor, makeupColor);
        } else if (u_blendMode == 1) { // multiply
          blendedColor = blendMultiply(baseColor, makeupColor);
        } else if (u_blendMode == 2) { // screen
          blendedColor = blendScreen(baseColor, makeupColor);
        } else { // overlay
          blendedColor = blendOverlay(baseColor, makeupColor);
        }
        
        // Apply mask with smooth edges
        gl_FragColor = vec4(
          mix(baseColor, blendedColor, mask),
          originalColor.a
        );
      } else {
        gl_FragColor = originalColor;
      }
    }
  `;

  constructor(canvas: HTMLCanvasElement, config: Partial<RenderConfig> = {}) {
    this.canvas = canvas;
    this.config = {
      width: canvas.width,
      height: canvas.height,
      enableSmoothing: true,
      enableBlending: true,
      quality: 'medium',
      ...config,
    };
    
    this.initializeWebGL();
  }

  private initializeWebGL(): void {
    const gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
    
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    
    this.gl = gl as WebGLRenderingContext;
    
    // Set viewport
    this.gl.viewport(0, 0, this.config.width, this.config.height);
    
    // Create shaders
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, this.vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, this.fragmentShaderSource);
    
    if (!vertexShader || !fragmentShader) {
      throw new Error('Failed to create shaders');
    }
    
    // Create program
    this.program = this.gl.createProgram();
    if (!this.program) {
      throw new Error('Failed to create WebGL program');
    }
    
    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);
    
    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      throw new Error('Failed to link WebGL program');
    }
    
    this.gl.useProgram(this.program);
    
    // Set up geometry
    this.setupGeometry();
    
    // Enable blending
    if (this.config.enableBlending) {
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    }
  }

  private createShader(type: number, source: string): WebGLShader | null {
    const shader = this.gl?.createShader(type);
    if (!shader) return null;
    
    this.gl?.shaderSource(shader, source);
    this.gl?.compileShader(shader);
    
    if (!this.gl?.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const error = this.gl?.getShaderInfoLog(shader);
      this.gl?.deleteShader(shader);
      throw new Error(`Shader compilation error: ${error}`);
    }
    
    return shader;
  }

  private setupGeometry(): void {
    // Set up a full-screen quad
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);
    
    const texCoords = new Float32Array([
      0, 1,
      1, 1,
      0, 0,
      1, 0,
    ]);
    
    // Position buffer
    const positionBuffer = this.gl?.createBuffer();
    if (positionBuffer) {
      this.gl?.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
      this.gl?.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
      
      const positionLocation = this.gl?.getAttribLocation(this.program!, 'a_position');
      this.gl?.enableVertexAttribArray(positionLocation!);
      this.gl?.vertexAttribPointer(positionLocation!, 2, this.gl.FLOAT, false, 0, 0);
    }
    
    // Texture coordinate buffer
    const texCoordBuffer = this.gl?.createBuffer();
    if (texCoordBuffer) {
      this.gl?.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
      this.gl?.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);
      
      const texCoordLocation = this.gl?.getAttribLocation(this.program!, 'a_texCoord');
      this.gl?.enableVertexAttribArray(texCoordLocation!);
      this.gl?.vertexAttribPointer(texCoordLocation!, 2, this.gl.FLOAT, false, 0, 0);
    }
  }

  public renderMakeup(
    imageElement: HTMLImageElement | HTMLVideoElement,
    layers: MakeupLayer[],
    landmarks: number[][]
  ): void {
    if (!this.gl || !this.program) return;
    
    // Clear canvas
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    
    // Create and bind texture from image
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, imageElement);
    
    // Set texture parameters
    if (this.config.enableSmoothing) {
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    } else {
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    }
    
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    
    // Render each makeup layer
    for (const layer of layers) {
      this.renderLayer(layer, landmarks);
    }
  }

  private renderLayer(layer: MakeupLayer, landmarks: number[][]): void {
    if (!this.gl || !this.program) return;
    
    // Set uniforms for this layer
    const colorLocation = this.gl.getUniformLocation(this.program, 'u_makeupColor');
    this.gl.uniform4f(colorLocation, ...layer.color);
    
    const intensityLocation = this.gl.getUniformLocation(this.program, 'u_intensity');
    this.gl.uniform1f(intensityLocation, layer.intensity);
    
    const blendModeLocation = this.gl.getUniformLocation(this.program, 'u_blendMode');
    const blendModes = { normal: 0, multiply: 1, screen: 2, overlay: 3 };
    this.gl.uniform1i(blendModeLocation, blendModes[layer.blendMode]);
    
    // Set landmarks for this layer
    const landmarksLocation = this.gl.getUniformLocation(this.program, 'u_landmarks');
    const landmarkCountLocation = this.gl.getUniformLocation(this.program, 'u_landmarkCount');
    
    // Convert landmarks to WebGL coordinates and flatten
    const flatLandmarks: number[] = [];
    for (const landmark of layer.landmarks) {
      flatLandmarks.push(landmark[0], landmark[1]); // x, y
    }
    
    this.gl.uniform2fv(landmarksLocation, flatLandmarks);
    this.gl.uniform1i(landmarkCountLocation, layer.landmarks.length);
    
    // Set resolution
    const resolutionLocation = this.gl.getUniformLocation(this.program, 'u_resolution');
    this.gl.uniform2f(resolutionLocation, this.config.width, this.config.height);
    
    // Draw
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.config.width = width;
    this.config.height = height;
    
    if (this.gl) {
      this.gl.viewport(0, 0, width, height);
    }
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public getImageData(): ImageData | null {
    if (!this.gl) return null;
    
    const pixels = new Uint8Array(this.config.width * this.config.height * 4);
    this.gl.readPixels(0, 0, this.config.width, this.config.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
    
    return new ImageData(
      new Uint8ClampedArray(pixels),
      this.config.width,
      this.config.height
    );
  }

  public cleanup(): void {
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program);
    }
  }

  // Utility methods for creating makeup layers
  public createFoundationLayer(
    color: [number, number, number, number],
    intensity: number,
    landmarks: number[][]
  ): MakeupLayer {
    return {
      type: 'foundation',
      color,
      intensity,
      blendMode: 'normal',
      landmarks,
    };
  }

  public createBlushLayer(
    color: [number, number, number, number],
    intensity: number,
    landmarks: number[][]
  ): MakeupLayer {
    return {
      type: 'blush',
      color,
      intensity,
      blendMode: 'normal',
      landmarks,
    };
  }

  public createLipstickLayer(
    color: [number, number, number, number],
    intensity: number,
    landmarks: number[][]
  ): MakeupLayer {
    return {
      type: 'lipstick',
      color,
      intensity,
      blendMode: 'normal',
      landmarks,
    };
  }

  public createContourLayer(
    color: [number, number, number, number],
    intensity: number,
    landmarks: number[][]
  ): MakeupLayer {
    return {
      type: 'contour',
      color,
      intensity,
      blendMode: 'multiply',
      landmarks,
    };
  }

  public createHighlighterLayer(
    color: [number, number, number, number],
    intensity: number,
    landmarks: number[][]
  ): MakeupLayer {
    return {
      type: 'highlighter',
      color,
      intensity,
      blendMode: 'screen',
      landmarks,
    };
  }

  public createEyeshadowLayer(
    color: [number, number, number, number],
    intensity: number,
    landmarks: number[][]
  ): MakeupLayer {
    return {
      type: 'eyeshadow',
      color,
      intensity,
      blendMode: 'normal',
      landmarks,
    };
  }
}
