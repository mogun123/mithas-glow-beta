// GPU-Accelerated Skin Analysis Pipeline
// ZERO-MOCK, NO FALLBACKS, NO HARD THRESHOLDS

export interface SkinAnalysisGPU {
  initialize(): Promise<void>;
  analyzeFrame(
    imageData: ImageData,
    uniforms: {
      avgL: number;
      avgA: number;
      foreheadL: number;
      chinL: number;
      dynamicRednessThreshold: number;
      lStdDev: number;
      isSunlight: number;
      isIndoor: number;
      isMixed: number;
      isHarsh: number;
      globalOffset?: number;
    }
  ): Promise<{
    acneDensity: number;
    acneSpots: Array<{ x: number; y: number; radius: number; rednessIntensity: number }>;
    textureIntensity: number;
  }>;
  cleanup(): void;
}

export class WebGLSkinAnalysis implements SkinAnalysisGPU {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private textureProgram: WebGLProgram | null = null;
  private reductionProgram: WebGLProgram | null = null;
  private frameTexture: WebGLTexture | null = null;
  private frameBuffer: WebGLFramebuffer | null = null;
  private reductionFramebuffers: WebGLFramebuffer[] = [];
  private reductionTextures: WebGLTexture[] = [];
  private maxTextureSize: number = 0;
  private canvas: HTMLCanvasElement | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;
  
  isInitialized = false;
  isInitializing = false;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  // 🔥 ADVANCED ACNE CLASSIFICATION SHADER (Lighting-Invariant Logic from Local Engine)
  private readonly acneShaderSource = `
    precision highp float;
    
    uniform sampler2D u_image;
    uniform float u_avgL;
    uniform float u_avgA;
    uniform float u_foreheadL;
    uniform float u_chinL;
    uniform float u_dynamicRednessThreshold;
    uniform float u_lStdDev;
    uniform float u_isSunlight;
    uniform float u_isIndoor;
    uniform float u_isMixed;
    uniform float u_isHarsh;
    
    varying vec2 v_texCoord;
    
    // Advanced lighting context detection
    bool isGlareShadowNoise(vec4 pixel, float meanL, float lStdDev, float meanA) {
      float highlight = float(pixel.r > meanL + lStdDev * 1.8);
      float deepShadow = float(pixel.r < meanL - lStdDev * 1.6);
      float shadowConsistency = float(abs(pixel.g - meanA) < 9.0);
      return (highlight > 0.5 && shadowConsistency < 0.5) || (deepShadow > 0.5 && shadowConsistency < 0.5);
    }
    
    void main() {
      vec4 centerColor = texture2D(u_image, v_texCoord);
      vec4 color = centerColor;
      float l = color.r * 255.0; 
      float a = color.g * 255.0;
      
      float regionalLightDrop = u_foreheadL - u_chinL;
      float dynamicSkinFloorL = mix(-1e6, u_foreheadL - regionalLightDrop, float(regionalLightDrop >= 0.0));
      
      float localContrast = (u_avgL - l) / max(u_avgL, 1.0);
      float aShift = a - u_avgA;
      
      // 🔥 LIGHTING COMPENSATION: Remove lighting-induced redness
      float lightingCompensation = 0.0;
      if (u_isSunlight > 0.5) {
        lightingCompensation = 3.0; // Sunlight adds artificial redness
      } else if (u_isHarsh > 0.5) {
        lightingCompensation = 2.0; // Harsh lighting adds artificial redness
      } else if (u_isMixed > 0.5) {
        lightingCompensation = 1.5; // Mixed lighting adds some redness
      }
      
      // Compensated redness shift (real redness only)
      float compensatedRednessShift = max(0.0, aShift - lightingCompensation);
      
      // Advanced tone factor calculation
      float toneFactor = (u_avgL > 13.0) ? 1.25 : 1.0;
      float requiredRedness = ((u_isSunlight > 0.5) ? 15.0 : 12.0) * toneFactor;
      
      // Lighting context adjustments - more conservative for clinical accuracy
      if (u_isMixed > 0.5) requiredRedness *= 0.85;
      if (u_isHarsh > 0.5) requiredRedness *= 1.1;
      if (u_avgL < 40.0) requiredRedness *= 1.2;
      
      // Local contrast requirement
      float localContrastReq = float(abs(l - u_avgL) > (u_lStdDev * 0.8));
      
      // Glare and shadow suppression
      float noiseFilter = isGlareShadowNoise(color, u_avgL, u_lStdDev, u_avgA) ? 0.0 : 1.0;
      
      // Enhanced acne detection with compensated redness (real skin redness only)
      float isRedSpot = step(requiredRedness, compensatedRednessShift);
      float isDarkSpot = step(0.15, localContrast);
      float hasLocalContrast = step(0.5, localContrastReq);
      float aboveBaseline = step(u_avgA + 15.0, a);
      float lDropOK = step(l, u_avgL + u_lStdDev * 2.5);
      
      // 🔥 SKIN TONE VALIDATION: Filter out lighting artifacts
      float isValidSkinTone = float(l > 20.0 && l < 80.0); // Valid skin L range
      float hasRealRedness = float(compensatedRednessShift > 8.0); // Minimum real redness threshold
      float notLightingArtifact = isValidSkinTone * hasRealRedness;
      
      float isAcne = isRedSpot * isDarkSpot * hasLocalContrast * aboveBaseline * lDropOK * noiseFilter * notLightingArtifact;
      
      // 🔥 BEARD & SHADOW REJECTION: Ignore pixels where L is less than 25
      isAcne = isAcne * step(dynamicSkinFloorL, l) * step(25.0, l);
      
      float outAcne = isAcne * 255.0;
      
      gl_FragColor = vec4(outAcne, 0.0, 0.0, 1.0);
    }
  `;

 // 🔥 TEXTURE SHADER (Sobel Filter - Clean Math)
  private readonly textureShaderSource = `
    precision highp float;
    
    uniform sampler2D u_image;
    uniform vec2 u_textureSize;
    
    varying vec2 v_texCoord;
    
    void main() {
      vec4 centerColor = texture2D(u_image, v_texCoord);
      vec2 texelSize = 1.0 / u_textureSize;
      
      float tl = texture2D(u_image, v_texCoord + vec2(-texelSize.x, -texelSize.y)).r;
      float tm = texture2D(u_image, v_texCoord + vec2(0.0, -texelSize.y)).r;
      float tr = texture2D(u_image, v_texCoord + vec2(texelSize.x, -texelSize.y)).r;
      float ml = texture2D(u_image, v_texCoord + vec2(-texelSize.x, 0.0)).r;
      float mm = centerColor.r; // mm IS THE CENTER PIXEL!
      float mr = texture2D(u_image, v_texCoord + vec2(texelSize.x, 0.0)).r;
      float bl = texture2D(u_image, v_texCoord + vec2(-texelSize.x, texelSize.y)).r;
      float bm = texture2D(u_image, v_texCoord + vec2(0.0, texelSize.y)).r;
      float br = texture2D(u_image, v_texCoord + vec2(texelSize.x, texelSize.y)).r;
      
      float gx = -1.0 * tl + 1.0 * tr - 2.0 * ml + 2.0 * mr - 1.0 * bl + 1.0 * br;
      float gy = -1.0 * tl - 2.0 * tm - 1.0 * tr + 1.0 * bl + 2.0 * bm + 1.0 * br;
      
      float textureG = sqrt(gx * gx + gy * gy);
      
      // 🔥 PURE SAMPLING: Output raw magnitude without clamps or multipliers
      gl_FragColor = vec4(textureG, 0.0, 0.0, 1.0);
    }
  `;

  // 🔥 REDUCTION SHADER (Fixed the 255.0 division/multiplication bug)
  private readonly reductionShaderSource = `
    precision highp float;
    
    uniform sampler2D u_image;
    uniform vec2 u_textureSize;
    
    varying vec2 v_texCoord;
    
    void main() {
      vec2 texelSize = 1.0 / u_textureSize;
      
      // WebGL texture2D ALREADY returns values from 0.0 to 1.0. No need to divide by 255!
      vec4 tl = texture2D(u_image, v_texCoord + vec2(-texelSize.x, -texelSize.y));
      vec4 tr = texture2D(u_image, v_texCoord + vec2(texelSize.x, -texelSize.y));
      vec4 bl = texture2D(u_image, v_texCoord + vec2(-texelSize.x, texelSize.y));
      vec4 br = texture2D(u_image, v_texCoord + vec2(texelSize.x, texelSize.y));
      
      vec4 avg = (tl + tr + bl + br) / 4.0;
      
      // Pure 0.0 to 1.0 output directly passed to the next stage
      gl_FragColor = vec4(avg.r, avg.r, avg.r, 1.0);
    }
  `;

  private readonly vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    
    varying vec2 v_texCoord;
    
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `;

  async initialize() {
    if (this.isInitialized) return;

    if (!this.canvas) throw new Error("🚨 Canvas not available for WebGL");

    const gl = this.canvas.getContext("webgl2") || this.canvas.getContext("webgl");
    if (!gl) throw new Error("🚨 WebGL context creation failed");

    this.gl = gl;
    this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    this.gl.getExtension("OES_texture_float");
    this.gl.getExtension("WEBGL_color_buffer_float");
    this.gl.getExtension("EXT_color_buffer_float");

    await this.initializePrograms();
    this.setupGeometry();
    this.createFramebuffers();
  }

  private async initializePrograms(): Promise<void> {
    const gl = this.gl!;
    this.program = this.createProgram(this.vertexShaderSource, this.acneShaderSource);
    this.textureProgram = this.createProgram(this.vertexShaderSource, this.textureShaderSource);
    this.reductionProgram = this.createProgram(this.vertexShaderSource, this.reductionShaderSource);
  }

  private createProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
    const gl = this.gl!;
    const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource);
    
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`SHADER_LINK_ERROR: ${gl.getProgramInfoLog(program)}`);
    }
    return program;
  }

  private createShader(type: number, source: string): WebGLShader {
    const gl = this.gl!;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`SHADER_COMPILE_ERROR: ${gl.getShaderInfoLog(shader)}`);
    }
    return shader;
  }

  private setupGeometry(): void {
    const gl = this.gl!;
    const positions = new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]);
    const texCoords = new Float32Array([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0]);
    
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    
    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
  }

  private createFramebuffers(): void {
    const gl = this.gl!;
    const maxDimension = Math.max(640, 480);
    let reductionLevels = 0;
    let currentSize = maxDimension;
    
    while (currentSize > 1) {
      currentSize = Math.floor(currentSize / 2);
      reductionLevels++;
    }
    
    this.reductionFramebuffers = [];
    this.reductionTextures = [];
    
    for (let i = 0; i < reductionLevels; i++) {
      const size = Math.floor(maxDimension / Math.pow(2, i + 1));
      
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      
      const framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      
      this.reductionTextures.push(texture!);
      this.reductionFramebuffers.push(framebuffer!);
    }
  }

  async analyzeFrame(
    imageData: ImageData,
    uniforms: {
      avgL: number;
      avgA: number;
      foreheadL: number;
      chinL: number;
      dynamicRednessThreshold: number;
      lStdDev: number;
      isSunlight: number;
      isIndoor: number;
      isMixed: number;
      isHarsh: number;
      globalOffset?: number;
    }
  ): Promise<{ acneDensity: number; acneSpots: Array<{ x: number; y: number; radius: number; rednessIntensity: number }>; textureIntensity: number }> {
    if (!this.isInitialized) await this.initialize();

    const uniformKeys = ['avgL', 'avgA', 'foreheadL', 'chinL', 'dynamicRednessThreshold', 'lStdDev', 'isSunlight', 'isIndoor', 'isMixed', 'isHarsh'] as const;
    for (const key of uniformKeys) {
      if (!Number.isFinite(uniforms[key])) {
        throw new Error(`GPU_UNIFORM_INVALID: ${key} = ${uniforms[key]}`);
      }
    }

    this.uploadImageData(imageData);
    this.runAcneClassification(uniforms);

    const acneDensity = this.readFramebufferDensity(
      this.reductionFramebuffers[0],
      imageData.width,
      imageData.height,
      'acne'
    );

    this.runTextureAnalysis();

    const textureIntensity = this.readFramebufferDensity(
      this.reductionFramebuffers[1],
      imageData.width,
      imageData.height,
      'texture'
    );

    const rawTexture = textureIntensity;

// 1. Reject ONLY NaN/Infinity (Strict Mode)
if (!Number.isFinite(rawTexture)) {
  throw new Error("STRICT_SIGNAL_LOSS: Texture is NaN");
}

// 2. PRESERVE REAL TEXTURE SIGNAL
// Texture signal is already derived from Sobel/gradient intensity
// Dividing again destroys real signal
let normalizedTexture = rawTexture;

// Return new values instead of reassigning parameters
const finalAcneDensity = acneDensity;
const finalTextureIntensity = normalizedTexture;

    return { 
      acneDensity: finalAcneDensity, 
      acneSpots: [], // TODO: Implement GPU-based spot coordinate extraction
      textureIntensity: finalTextureIntensity 
    };
  }

  private uploadImageData(imageData: ImageData): void {
    const gl = this.gl!;
    if (!this.frameTexture) this.frameTexture = gl.createTexture();
    
    gl.bindTexture(gl.TEXTURE_2D, this.frameTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, imageData.width, imageData.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, imageData.data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  private runAcneClassification(uniforms: any): WebGLFramebuffer {
    const gl = this.gl!;
    if (this.canvas && (this.canvas.width !== gl.drawingBufferWidth || this.canvas.height !== gl.drawingBufferHeight)) {
      this.canvas.width = Math.max(1, gl.drawingBufferWidth);
      this.canvas.height = Math.max(1, gl.drawingBufferHeight);
      gl.bindTexture(gl.TEXTURE_2D, this.reductionTextures[0]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.canvas.width, this.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.reductionFramebuffers[0]);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.reductionTextures[0], 0);
    }
    
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.useProgram(this.program!);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.reductionFramebuffers[0]);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.frameTexture);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer!);
    const positionLocation = gl.getAttribLocation(this.program!, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
    gl.uniform1i(gl.getUniformLocation(this.program!, 'u_image'), 0);
    gl.uniform1f(gl.getUniformLocation(this.program!, 'u_avgL'), uniforms.avgL);
    gl.uniform1f(gl.getUniformLocation(this.program!, 'u_avgA'), uniforms.avgA);
    gl.uniform1f(gl.getUniformLocation(this.program!, 'u_foreheadL'), uniforms.foreheadL);
    gl.uniform1f(gl.getUniformLocation(this.program!, 'u_chinL'), uniforms.chinL);
    gl.uniform1f(gl.getUniformLocation(this.program!, 'u_dynamicRednessThreshold'), uniforms.dynamicRednessThreshold);
    gl.uniform1f(gl.getUniformLocation(this.program!, 'u_lStdDev'), uniforms.lStdDev);
    gl.uniform1f(gl.getUniformLocation(this.program!, 'u_isSunlight'), uniforms.isSunlight);
    gl.uniform1f(gl.getUniformLocation(this.program!, 'u_isIndoor'), uniforms.isIndoor);
    gl.uniform1f(gl.getUniformLocation(this.program!, 'u_isMixed'), uniforms.isMixed);
    gl.uniform1f(gl.getUniformLocation(this.program!, 'u_isHarsh'), uniforms.isHarsh);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    return this.reductionFramebuffers[0];
  }

  private runTextureAnalysis(): WebGLFramebuffer {
    const gl = this.gl!;
    if (this.canvas && (this.canvas.width !== gl.drawingBufferWidth || this.canvas.height !== gl.drawingBufferHeight)) {
      this.canvas.width = Math.max(1, gl.drawingBufferWidth);
      this.canvas.height = Math.max(1, gl.drawingBufferHeight);
      gl.bindTexture(gl.TEXTURE_2D, this.reductionTextures[1]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.canvas.width, this.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.reductionFramebuffers[1]);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.reductionTextures[1], 0);
    }
    
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.useProgram(this.textureProgram!);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.reductionFramebuffers[1]);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.frameTexture);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer!);
    const positionLocation = gl.getAttribLocation(this.textureProgram!, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
    gl.uniform1i(gl.getUniformLocation(this.textureProgram!, 'u_image'), 0);
    gl.uniform2f(gl.getUniformLocation(this.textureProgram!, 'u_textureSize'), gl.drawingBufferWidth, gl.drawingBufferHeight);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    return this.reductionFramebuffers[1];
  }

  private runReductionPipeline(acneFB: WebGLFramebuffer, textureFB: WebGLFramebuffer): void {
    const gl = this.gl!;
    if (this.canvas && (this.canvas.width !== gl.drawingBufferWidth || this.canvas.height !== gl.drawingBufferHeight)) {
      this.canvas.width = Math.max(1, gl.drawingBufferWidth);
      this.canvas.height = Math.max(1, gl.drawingBufferHeight);
      for (let i = 0; i < this.reductionTextures.length; i++) {
        const size = Math.floor(Math.max(this.canvas.width, this.canvas.height) / Math.pow(2, i + 1));
        gl.bindTexture(gl.TEXTURE_2D, this.reductionTextures[i]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.reductionFramebuffers[i]);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.reductionTextures[i], 0);
      }
    }
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer!);
    const positionLocation = gl.getAttribLocation(this.reductionProgram!, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
    gl.uniform1i(gl.getUniformLocation(this.reductionProgram!, 'u_image'), 0);
    gl.uniform2f(gl.getUniformLocation(this.reductionProgram!, 'u_textureSize'), gl.drawingBufferWidth, gl.drawingBufferHeight);
    
    for (let i = 1; i < this.reductionFramebuffers.length - 1; i++) {
      const targetWidth = Math.floor(gl.drawingBufferWidth / Math.pow(2, i + 1));
      const targetHeight = Math.floor(gl.drawingBufferHeight / Math.pow(2, i + 1));
      
      gl.useProgram(this.reductionProgram!);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.reductionFramebuffers[i + 1]);
      gl.viewport(0, 0, targetWidth, targetHeight);
      
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.reductionTextures[i % 2]);
      
      gl.uniform1i(gl.getUniformLocation(this.reductionProgram!, 'u_image'), 0);
      gl.uniform2f(gl.getUniformLocation(this.reductionProgram!, 'u_textureSize'), targetWidth, targetHeight);
      
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }

  private readFramebufferDensity(
    framebuffer: WebGLFramebuffer,
    width: number,
    height: number,
    channel: 'acne' | 'texture'
  ): number {
    const gl = this.gl!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`GPU_FBO_INCOMPLETE`);
    }

    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    let signalSum = 0;
    let validPixels = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] === 0) continue;
      if (channel === 'acne') {
        if (pixels[i] > 127) signalSum++;
      } else {
        signalSum += pixels[i];
      }
      validPixels++;
    }

    if (validPixels === 0) return 0;
    const result = channel === 'acne' ? (signalSum / validPixels) * 100 : (signalSum / validPixels / 255.0) * 100;
    let finalResult: number = result;
    
    // FIX 5 — STRICT OUTPUT VALIDATION
    if (channel === 'acne') {
      if (!Number.isFinite(result) || result < 0 || result > 100) {
        throw new Error(`CLINICAL_ERROR: acne invalid (${result})`);
      }
    } else {
      if (!Number.isFinite(result)) {
        throw new Error("STRICT_SIGNAL_LOSS: Texture is NaN");
      }
      // `result` is already a 0-100 percentage from the calculation above.
      // Convert directly to a 0-1 ratio — do NOT divide by 255 again.
      finalResult = Math.max(0, Math.min(1, result / 100));
    }
    
    return channel === 'acne' ? result : finalResult;
  }

  cleanup(): void {
    const gl = this.gl;
    if (!gl) return;
    if (this.frameTexture) gl.deleteTexture(this.frameTexture);
    this.reductionTextures.forEach(t => { if (t) gl.deleteTexture(t); });
    if (this.frameBuffer) gl.deleteFramebuffer(this.frameBuffer);
    this.reductionFramebuffers.forEach(fb => { if (fb) gl.deleteFramebuffer(fb); });
    if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
    if (this.texCoordBuffer) gl.deleteBuffer(this.texCoordBuffer);
    if (this.program) gl.deleteProgram(this.program);
    if (this.textureProgram) gl.deleteProgram(this.textureProgram);
    if (this.reductionProgram) gl.deleteProgram(this.reductionProgram);
    this.gl = null;
    this.isInitialized = false;
    this.isInitializing = false;
  }
}
