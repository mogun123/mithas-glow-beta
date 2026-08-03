// ═════════════════════════════════════════════════════════════════════════════
// 💇 HAIR WEBGL ENGINE - IONTYX Glow Mirror (STRICT GEOMETRY)
// ═════════════════════════════════════════════════════════════════════════════

import { FaceMesh } from '@mediapipe/face_mesh';

export interface HairParameters {
  volume: number;         // 0.0 - 1.0
  length: number;         // 0.5 - 20.0 cm
  color: { r: number; g: number; b: number; a: number };
  style: "short" | "medium" | "long" | "styled" | "textured";
  density: number;        // 0.3 - 1.0
  shine: number;          // 0.0 - 1.0
}

export interface HairAnchors {
  forehead: number[];     // Forehead region
  temporalSides: number[]; // Temporal sides
  crown: number[];        // Crown area
  back: number[];         // Back of head
}

export class HairWebGLEngine {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private vertexBuffer: WebGLBuffer;
  private indexBuffer: WebGLBuffer;
  private hairStrandBuffer: WebGLBuffer;
  
  // Hair mesh vertices and strands
  private vertices: Float32Array;
  private indices: Uint16Array;
  private hairStrands: Float32Array;
  
  // Shader uniforms
  private uniformLocations: {
    modelMatrix: WebGLUniformLocation;
    viewMatrix: WebGLUniformLocation;
    projectionMatrix: WebGLUniformLocation;
    hairColor: WebGLUniformLocation;
    hairVolume: WebGLUniformLocation;
    hairLength: WebGLUniformLocation;
    hairDensity: WebGLUniformLocation;
    hairShine: WebGLUniformLocation;
    headCurvature: WebGLUniformLocation;
    windEffect: WebGLUniformLocation;
  };

  // Face landmarks for hair positioning
  private faceLandmarks: any[];
  private hairAnchors: HairAnchors;
  private meshResolution: number = 128;
  private strandCount: number = 2048;

  constructor(canvas: HTMLCanvasElement) {
    this.gl = canvas.getContext('webgl')!;
    if (!this.gl) {
      throw new Error('WEBGL_NOT_SUPPORTED: WebGL required for hair rendering');
    }

    this.initializeWebGL();
    this.createHairMesh();
    this.generateHairStrands();
    this.setupShaders();
    this.setupUniforms();
  }

  // 🎯 INITIALIZE WEBGL CONTEXT
  private initializeWebGL(): void {
    const gl = this.gl;
    
    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    
    // Enable blending for hair transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    // Enable alpha testing for hair strands
    gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
    
    // Set viewport
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    
    // Set clear color
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
  }

  // 🧬 CREATE HAIR MESH BASED ON HEAD GEOMETRY
  private createHairMesh(): void {
    const resolution = this.meshResolution;
    const vertexCount = resolution * resolution;
    
    // Initialize vertices array (x, y, z, u, v, normalX, normalY, normalZ)
    this.vertices = new Float32Array(vertexCount * 8);
    
    // Generate head mesh vertices
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const idx = (i * resolution + j) * 8;
        
        // Create spherical head shape
        const theta = (j / (resolution - 1)) * Math.PI * 2;
        const phi = (i / (resolution - 1)) * Math.PI;
        
        const x = Math.sin(phi) * Math.cos(theta);
        const y = Math.cos(phi);
        const z = Math.sin(phi) * Math.sin(theta);
        
        // UV coordinates
        const u = j / (resolution - 1);
        const v = i / (resolution - 1);
        
        // Normal (same as position for sphere)
        const normalX = x;
        const normalY = y;
        const normalZ = z;
        
        this.vertices[idx] = x;
        this.vertices[idx + 1] = y;
        this.vertices[idx + 2] = z;
        this.vertices[idx + 3] = u;
        this.vertices[idx + 4] = v;
        this.vertices[idx + 5] = normalX;
        this.vertices[idx + 6] = normalY;
        this.vertices[idx + 7] = normalZ;
      }
    }
    
    // Generate indices
    const indexCount = (resolution - 1) * (resolution - 1) * 6;
    this.indices = new Uint16Array(indexCount);
    
    let idx = 0;
    for (let i = 0; i < resolution - 1; i++) {
      for (let j = 0; j < resolution - 1; j++) {
        const topLeft = i * resolution + j;
        const topRight = topLeft + 1;
        const bottomLeft = (i + 1) * resolution + j;
        const bottomRight = bottomLeft + 1;
        
        this.indices[idx++] = topLeft;
        this.indices[idx++] = bottomLeft;
        this.indices[idx++] = topRight;
        
        this.indices[idx++] = topRight;
        this.indices[idx++] = bottomLeft;
        this.indices[idx++] = bottomRight;
      }
    }
    
    // Create WebGL buffers
    this.vertexBuffer = this.gl.createBuffer()!;
    this.indexBuffer = this.gl.createBuffer()!;
    this.hairStrandBuffer = this.gl.createBuffer()!;
    
    // Upload vertex data
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertices, this.gl.DYNAMIC_DRAW);
    
    // Upload index data
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, this.indices, this.gl.STATIC_DRAW);
  }

  // 🌟 GENERATE HAIR STRANDS
  private generateHairStrands(): void {
    const strandCount = this.strandCount;
    // Each strand: startX, startY, startZ, dirX, dirY, dirZ, length, thickness
    this.hairStrands = new Float32Array(strandCount * 8);
    
    for (let i = 0; i < strandCount; i++) {
      const idx = i * 8;
      
      // Random position on head surface
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      const startX = Math.sin(phi) * Math.cos(theta);
      const startY = Math.cos(phi);
      const startZ = Math.sin(phi) * Math.sin(theta);
      
      // Hair direction (generally outward with some variation)
      const dirX = startX + (Math.random() - 0.5) * 0.2;
      const dirY = startY - 0.1 + Math.random() * 0.1; // Slightly downward
      const dirZ = startZ + (Math.random() - 0.5) * 0.2;
      
      // Normalize direction
      const dirLength = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
      const normDirX = dirX / dirLength;
      const normDirY = dirY / dirLength;
      const normDirZ = dirZ / dirLength;
      
      // Hair properties
      const length = 0.5 + Math.random() * 2.0; // 0.5 to 2.5 units
      const thickness = 0.001 + Math.random() * 0.003; // Hair thickness
      
      this.hairStrands[idx] = startX;
      this.hairStrands[idx + 1] = startY;
      this.hairStrands[idx + 2] = startZ;
      this.hairStrands[idx + 3] = normDirX;
      this.hairStrands[idx + 4] = normDirY;
      this.hairStrands[idx + 5] = normDirZ;
      this.hairStrands[idx + 6] = length;
      this.hairStrands[idx + 7] = thickness;
    }
    
    // Upload strand data
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.hairStrandBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.hairStrands, this.gl.DYNAMIC_DRAW);
  }

  // 🔧 SETUP SHADERS
  private setupShaders(): void {
    const gl = this.gl;
    
    // Vertex shader for hair strands
    const vertexShaderSource = `
      attribute vec3 aPosition;
      attribute vec2 aTexCoord;
      attribute vec3 aNormal;
      
      // Hair strand attributes
      attribute vec3 aStrandStart;
      attribute vec3 aStrandDir;
      attribute float aStrandLength;
      attribute float aStrandThickness;
      
      uniform mat4 uModelMatrix;
      uniform mat4 uViewMatrix;
      uniform mat4 uProjectionMatrix;
      uniform float uHairVolume;
      uniform float uHairLength;
      uniform vec3 uHeadCurvature;
      uniform float uWindEffect;
      
      varying vec2 vTexCoord;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying float vHairAlpha;
      
      void main() {
        vec4 worldPos = uModelMatrix * vec4(aPosition, 1.0);
        vWorldPos = worldPos.xyz;
        
        // Apply head curvature deformation
        vec3 curvedPos = aPosition + uHeadCurvature * aNormal;
        
        // Calculate hair strand position
        vec3 strandPos = aStrandStart + aStrandDir * aStrandLength * uHairLength;
        
        // Add volume and wind effect
        float wind = sin(uWindEffect + aStrandStart.x * 10.0) * 0.1;
        strandPos.x += wind * uHairVolume;
        strandPos.z += cos(uWindEffect + aStrandStart.z * 8.0) * 0.05 * uHairVolume;
        
        // Mix between base mesh and hair strands
        float hairFactor = smoothstep(0.3, 0.7, uHairVolume);
        vec3 finalPos = mix(curvedPos, strandPos, hairFactor);
        
        worldPos = uModelMatrix * vec4(finalPos, 1.0);
        gl_Position = uProjectionMatrix * uViewMatrix * worldPos;
        
        vTexCoord = aTexCoord;
        vNormal = (uModelMatrix * vec4(aNormal, 0.0)).xyz;
        vHairAlpha = hairFactor;
      }
    `;
    
    // Fragment shader for hair
    const fragmentShaderSource = `
      precision mediump float;
      
      varying vec2 vTexCoord;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying float vHairAlpha;
      
      uniform vec4 uHairColor;
      uniform float uHairDensity;
      uniform float uHairShine;
      
      // Hair strand noise
      float hairNoise(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      void main() {
        // Calculate hair density with noise
        float density = uHairDensity * vHairAlpha;
        float noise = hairNoise(vTexCoord * 100.0);
        density *= (0.6 + 0.4 * noise);
        
        // Discard if below density threshold
        if (density < 0.1) {
          discard;
        }
        
        // Calculate lighting
        vec3 normal = normalize(vNormal);
        vec3 lightDir = normalize(vec3(0.5, 0.8, 0.3));
        float diffuse = max(dot(normal, lightDir), 0.3);
        
        // Add specular shine
        vec3 viewDir = normalize(-vWorldPos);
        vec3 reflectDir = reflect(-lightDir, normal);
        float specular = pow(max(dot(viewDir, reflectDir), 0.0), 32.0) * uHairShine;
        
        // Combine lighting
        vec3 ambient = vec3(0.2);
        vec3 finalColor = uHairColor.rgb * (ambient + diffuse) + vec3(specular);
        
        // Calculate final alpha
        float alpha = density * uHairColor.a;
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `;
    
    // Compile shaders
    const vertexShader = this.compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = this.compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
    
    // Create program
    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);
    
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      throw new Error('SHADER_LINK_ERROR: Failed to link hair shader program');
    }
    
    gl.useProgram(this.program);
  }

  // 🔧 COMPILE SHADER
  private compileShader(source: string, type: number): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`SHADER_COMPILE_ERROR: ${error}`);
    }
    
    return shader;
  }

  // 🎯 SETUP UNIFORMS
  private setupUniforms(): void {
    const gl = this.gl;
    
    this.uniformLocations = {
      modelMatrix: gl.getUniformLocation(this.program, 'uModelMatrix')!,
      viewMatrix: gl.getUniformLocation(this.program, 'uViewMatrix')!,
      projectionMatrix: gl.getUniformLocation(this.program, 'uProjectionMatrix')!,
      hairColor: gl.getUniformLocation(this.program, 'uHairColor')!,
      hairVolume: gl.getUniformLocation(this.program, 'uHairVolume')!,
      hairLength: gl.getUniformLocation(this.program, 'uHairLength')!,
      hairDensity: gl.getUniformLocation(this.program, 'uHairDensity')!,
      hairShine: gl.getUniformLocation(this.program, 'uHairShine')!,
      headCurvature: gl.getUniformLocation(this.program, 'uHeadCurvature')!,
      windEffect: gl.getUniformLocation(this.program, 'uWindEffect')!
    };
  }

  // 🧬 UPDATE FACE LANDMARKS
  updateFaceLandmarks(landmarks: any[]): void {
    if (!landmarks || landmarks.length !== 478) {
      throw new Error('INVALID_LANDMARKS: Expected 478 MediaPipe landmarks');
    }

    this.faceLandmarks = landmarks;
    
    // Extract hair anchor points
    this.hairAnchors = {
      forehead: this.extractForeheadLandmarks(landmarks),
      temporalSides: this.extractTemporalLandmarks(landmarks),
      crown: this.extractCrownLandmarks(landmarks),
      back: this.extractBackLandmarks(landmarks)
    };
    
    // Update hair mesh based on face geometry
    this.deformMeshToHead();
  }

  // 📐 EXTRACT FOREHEAD LANDMARKS
  private extractForeheadLandmarks(landmarks: any[]): number[] {
    const foreheadIndices = [10, 8, 151, 9, 107, 66, 105, 54, 103, 67, 109, 10];
    return foreheadIndices.filter(i => landmarks[i] != null);
  }

  // 📐 EXTRACT TEMPORAL LANDMARKS
  private extractTemporalLandmarks(landmarks: any[]): number[] {
    const temporalIndices = [54, 103, 67, 109, 10, 151, 9, 107, 66, 105, 54];
    return temporalIndices.filter(i => landmarks[i] != null);
  }

  // 📐 EXTRACT CROWN LANDMARKS
  private extractCrownLandmarks(landmarks: any[]): number[] {
    const crownIndices = [10, 151, 9, 8];
    return crownIndices.filter(i => landmarks[i] != null);
  }

  // 📐 EXTRACT BACK LANDMARKS
  private extractBackLandmarks(landmarks: any[]): number[] {
    const backIndices = [234, 127, 162, 21, 54, 103, 67, 109, 10];
    return backIndices.filter(i => landmarks[i] != null);
  }

  // 🎭 DEFORM MESH TO HEAD SHAPE
  private deformMeshToHead(): void {
    const resolution = this.meshResolution;
    const anchors = this.hairAnchors;
    
    // Calculate head dimensions from landmarks
    const headDimensions = this.calculateHeadDimensions();
    
    // Update vertex positions based on head geometry
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const idx = (i * resolution + j) * 8;
        
        // Get spherical coordinates
        const x = this.vertices[idx];
        const y = this.vertices[idx + 1];
        const z = this.vertices[idx + 2];
        
        // Apply head-specific deformation
        const deformation = this.calculateHeadDeformation(x, y, z, headDimensions);
        
        // Update position
        this.vertices[idx] = deformation.x;
        this.vertices[idx + 1] = deformation.y;
        this.vertices[idx + 2] = deformation.z;
        
        // Update normal
        this.vertices[idx + 5] = deformation.normalX;
        this.vertices[idx + 6] = deformation.normalY;
        this.vertices[idx + 7] = deformation.normalZ;
      }
    }
    
    // Update vertex buffer
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
  }

  // 📏 CALCULATE HEAD DIMENSIONS
  private calculateHeadDimensions(): any {
    if (!this.faceLandmarks || this.faceLandmarks.length === 0) {
      return { width: 1.0, height: 1.0, depth: 1.0 };
    }

    // Calculate head width from temple landmarks
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    for (const landmark of this.faceLandmarks) {
      if (landmark) {
        minX = Math.min(minX, landmark.x);
        maxX = Math.max(maxX, landmark.x);
        minY = Math.min(minY, landmark.y);
        maxY = Math.max(maxY, landmark.y);
        minZ = Math.min(minZ, landmark.z);
        maxZ = Math.max(maxZ, landmark.z);
      }
    }
    
    return {
      width: maxX - minX || 1.0,
      height: maxY - minY || 1.0,
      depth: maxZ - minZ || 1.0
    };
  }

  // 🎯 CALCULATE HEAD DEFORMATION
  private calculateHeadDeformation(x: number, y: number, z: number, headDimensions: any): any {
    // Apply head-specific scaling
    const scaleX = headDimensions.width * 0.5;
    const scaleY = headDimensions.height * 0.6;
    const scaleZ = headDimensions.depth * 0.5;
    
    // Deformed position
    const deformedX = x * scaleX;
    const deformedY = y * scaleY;
    const deformedZ = z * scaleZ;
    
    // Calculate new normal (for deformed sphere)
    const length = Math.sqrt(deformedX * deformedX + deformedY * deformedY + deformedZ * deformedZ);
    const normalX = deformedX / length;
    const normalY = deformedY / length;
    const normalZ = deformedZ / length;
    
    return {
      x: deformedX,
      y: deformedY,
      z: deformedZ,
      normalX,
      normalY,
      normalZ
    };
  }

  // 🎨 SET HAIR PARAMETERS
  setHairParameters(parameters: HairParameters): void {
    const gl = this.gl;
    gl.useProgram(this.program);
    
    // Set hair color
    gl.uniform4f(this.uniformLocations.hairColor, 
      parameters.color.r, 
      parameters.color.g, 
      parameters.color.b, 
      parameters.color.a
    );
    
    // Set hair properties
    gl.uniform1f(this.uniformLocations.hairVolume, parameters.volume);
    gl.uniform1f(this.uniformLocations.hairLength, parameters.length);
    gl.uniform1f(this.uniformLocations.hairDensity, parameters.density);
    gl.uniform1f(this.uniformLocations.hairShine, parameters.shine);
  }

  // 🎬 RENDER HAIR
  render(modelMatrix: number[], viewMatrix: number[], projectionMatrix: number[], time: number = 0): void {
    const gl = this.gl;
    
    gl.useProgram(this.program);
    
    // Set matrices
    gl.uniformMatrix4fv(this.uniformLocations.modelMatrix, false, new Float32Array(modelMatrix));
    gl.uniformMatrix4fv(this.uniformLocations.viewMatrix, false, new Float32Array(viewMatrix));
    gl.uniformMatrix4fv(this.uniformLocations.projectionMatrix, false, new Float32Array(projectionMatrix));
    
    // Set head curvature (based on face landmarks)
    const curvature = this.calculateHeadCurvature();
    gl.uniform3f(this.uniformLocations.headCurvature, curvature.x, curvature.y, curvature.z);
    
    // Set wind effect for animation
    gl.uniform1f(this.uniformLocations.windEffect, time * 0.001);
    
    // Bind vertex buffer and set attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    
    // Position attribute
    const positionLoc = gl.getAttribLocation(this.program, 'aPosition');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 32, 0);
    
    // Texture coordinate attribute
    const texCoordLoc = gl.getAttribLocation(this.program, 'aTexCoord');
    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 32, 12);
    
    // Normal attribute
    const normalLoc = gl.getAttribLocation(this.program, 'aNormal');
    gl.enableVertexAttribArray(normalLoc);
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 32, 20);
    
    // Bind hair strand buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.hairStrandBuffer);
    
    // Hair strand attributes
    const strandStartLoc = gl.getAttribLocation(this.program, 'aStrandStart');
    gl.enableVertexAttribArray(strandStartLoc);
    gl.vertexAttribPointer(strandStartLoc, 3, gl.FLOAT, false, 32, 0);
    
    const strandDirLoc = gl.getAttribLocation(this.program, 'aStrandDir');
    gl.enableVertexAttribArray(strandDirLoc);
    gl.vertexAttribPointer(strandDirLoc, 3, gl.FLOAT, false, 32, 12);
    
    const strandLengthLoc = gl.getAttribLocation(this.program, 'aStrandLength');
    gl.enableVertexAttribArray(strandLengthLoc);
    gl.vertexAttribPointer(strandLengthLoc, 1, gl.FLOAT, false, 32, 24);
    
    const strandThicknessLoc = gl.getAttribLocation(this.program, 'aStrandThickness');
    gl.enableVertexAttribArray(strandThicknessLoc);
    gl.vertexAttribPointer(strandThicknessLoc, 1, gl.FLOAT, false, 32, 28);
    
    // Bind index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    
    // Enable blending for hair transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    // Draw hair mesh
    gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
  }

  // 📐 CALCULATE HEAD CURVATURE
  private calculateHeadCurvature(): { x: number; y: number; z: number } {
    // Calculate average curvature from face landmarks
    if (!this.faceLandmarks || this.faceLandmarks.length === 0) {
      return { x: 0, y: 0, z: 0 };
    }
    
    let curvatureX = 0;
    let curvatureY = 0;
    let curvatureZ = 0;
    let count = 0;
    
    for (const landmark of this.faceLandmarks) {
      if (landmark) {
        // Curvature based on distance from center
        const distance = Math.sqrt(landmark.x * landmark.x + landmark.y * landmark.y);
        const curvature = Math.exp(-distance * distance / 0.5);
        
        curvatureX += landmark.x * curvature;
        curvatureY += landmark.y * curvature;
        curvatureZ += landmark.z * curvature;
        count++;
      }
    }
    
    if (count > 0) {
      curvatureX /= count;
      curvatureY /= count;
      curvatureZ /= count;
    }
    
    return { x: curvatureX, y: curvatureY, z: curvatureZ };
  }

  // 🧹 CLEANUP
  cleanup(): void {
    const gl = this.gl;
    
    if (this.program) {
      gl.deleteProgram(this.program);
    }
    
    if (this.vertexBuffer) {
      gl.deleteBuffer(this.vertexBuffer);
    }
    
    if (this.indexBuffer) {
      gl.deleteBuffer(this.indexBuffer);
    }
    
    if (this.hairStrandBuffer) {
      gl.deleteBuffer(this.hairStrandBuffer);
    }
  }

  // 🔄 UPDATE HAIR VOLUME (MAIN API)
  setVolume(volume: number): void {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.uniform1f(this.uniformLocations.hairVolume, Math.max(0.0, Math.min(1.0, volume)));
  }

  // 🎨 UPDATE HAIR COLOR
  setColor(r: number, g: number, b: number, a: number = 1.0): void {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.uniform4f(this.uniformLocations.hairColor, r, g, b, a);
  }

  // 📏 UPDATE HAIR LENGTH
  setLength(length: number): void {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.uniform1f(this.uniformLocations.hairLength, Math.max(0.5, Math.min(20.0, length)));
  }

  // ✨ UPDATE HAIR SHINE
  setShine(shine: number): void {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.uniform1f(this.uniformLocations.hairShine, Math.max(0.0, Math.min(1.0, shine)));
  }
}

export default HairWebGLEngine;
