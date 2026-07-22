// ═════════════════════════════════════════════════════════════════════════════
// 👔 OUTFIT POSE ENGINE - IONTYX Glow Mirror (STRICT GEOMETRY)
// ═════════════════════════════════════════════════════════════════════════════

import { Pose } from '@mediapipe/pose';

// TypeScript: Properties are definitely assigned in constructor through method calls
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore: Properties initialized in constructor methods

export interface OutfitParameters {
  outfitType: "shirt" | "blazer" | "sherwani" | "suit" | "traditional";
  fit: "slim" | "regular" | "tailored" | "loose";
  color: { r: number; g: number; b: number; a: number };
  material: "cotton" | "silk" | "wool" | "synthetic" | "blended";
  pattern: "solid" | "striped" | "checked" | "embroidered";
}

export interface BodyPose {
  leftShoulder: { x: number; y: number; z: number };
  rightShoulder: { x: number; y: number; z: number };
  neck: { x: number; y: number; z: number };
  hipCenter: { x: number; y: number; z: number };
  leftHip: { x: number; y: number; z: number };
  rightHip: { x: number; y: number; z: number };
  leftElbow: { x: number; y: number; z: number };
  rightElbow: { x: number; y: number; z: number };
  leftWrist: { x: number; y: number; z: number };
  rightWrist: { x: number; y: number; z: number };
}

export interface OutfitDimensions {
  shirtWidth: number;
  shirtHeight: number;
  sleeveLength: number;
  collarSize: number;
  shoulderWidth: number;
  torsoDepth: number;
}

export class OutfitPoseEngine {
  private gl!: WebGLRenderingContext;
  private program!: WebGLProgram;
  private vertexBuffer!: WebGLBuffer;
  private indexBuffer!: WebGLBuffer;
  private texture!: WebGLTexture;
  
  // Outfit mesh vertices
  private vertices!: Float32Array;
  private indices!: Uint16Array;
  
  // Shader uniforms
  private uniformLocations!: {
    modelMatrix: WebGLUniformLocation;
    viewMatrix: WebGLUniformLocation;
    projectionMatrix: WebGLUniformLocation;
    outfitColor: WebGLUniformLocation;
    outfitTexture: WebGLUniformLocation;
    lightingEnabled: WebGLUniformLocation;
    shadowEnabled: WebGLUniformLocation;
    depthRotation: WebGLUniformLocation;
  };

  // Pose landmarks for outfit deformation
  private bodyPose: BodyPose = {
    leftShoulder: { x: 0, y: 0, z: 0 },
    rightShoulder: { x: 0, y: 0, z: 0 },
    neck: { x: 0, y: 0, z: 0 },
    hipCenter: { x: 0, y: 0, z: 0 },
    leftHip: { x: 0, y: 0, z: 0 },
    rightHip: { x: 0, y: 0, z: 0 },
    leftElbow: { x: 0, y: 0, z: 0 },
    rightElbow: { x: 0, y: 0, z: 0 },
    leftWrist: { x: 0, y: 0, z: 0 },
    rightWrist: { x: 0, y: 0, z: 0 }
  };
  private outfitDimensions: OutfitDimensions = {
    shirtWidth: 1,
    shirtHeight: 1,
    sleeveLength: 1,
    collarSize: 1,
    shoulderWidth: 1,
    torsoDepth: 1
  };
  private meshResolution: number = 64;

  constructor(canvas: HTMLCanvasElement) {
    this.gl = canvas.getContext('webgl')!;
    if (!this.gl) {
      throw new Error('WEBGL_NOT_SUPPORTED: WebGL required for outfit rendering');
    }

    this.initializeWebGL();
    this.createOutfitMesh();
    this.setupShaders();
    this.setupUniforms();
    this.initializeMediaPipe();
  }

  // 🎯 INITIALIZE WEBGL CONTEXT
  private initializeWebGL(): void {
    const gl = this.gl;
    
    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    
    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    // Set viewport
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    
    // Set clear color
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
  }

  // 🧬 INITIALIZE MEDIAPIPE POSE
  private async initializeMediaPipe(): Promise<void> {
    const pose = new Pose({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });
    
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }

  // 👔 CREATE OUTFIT MESH
  private createOutfitMesh(): void {
    const resolution = this.meshResolution;
    const vertexCount = resolution * resolution;
    
    // Initialize vertices array (x, y, z, u, v, normalX, normalY, normalZ)
    this.vertices = new Float32Array(vertexCount * 8);
    
    // Generate shirt/torso mesh
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const idx = (i * resolution + j) * 8;
        
        // Create cylindrical torso shape
        const theta = (j / (resolution - 1)) * Math.PI * 2;
        const y = (i / (resolution - 1)) * 2 - 1; // -1 to 1
        
        const radius = 0.5 + 0.1 * Math.cos(y * Math.PI); // Slight tapering
        
        const x = radius * Math.cos(theta);
        const z = radius * Math.sin(theta);
        
        // UV coordinates
        const u = j / (resolution - 1);
        const v = i / (resolution - 1);
        
        // Normal (outward from cylinder)
        const normalX = Math.cos(theta);
        const normalY = 0;
        const normalZ = Math.sin(theta);
        
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
    
    // Upload vertex data
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertices, this.gl.DYNAMIC_DRAW);
    
    // Upload index data
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, this.indices, this.gl.STATIC_DRAW);
  }

  // 🔧 SETUP SHADERS
  private setupShaders(): void {
    const gl = this.gl;
    
    // Vertex shader
    const vertexShaderSource = `
      attribute vec3 aPosition;
      attribute vec2 aTexCoord;
      attribute vec3 aNormal;
      
      uniform mat4 uModelMatrix;
      uniform mat4 uViewMatrix;
      uniform mat4 uProjectionMatrix;
      uniform mat4 uDepthRotation;
      
      varying vec2 vTexCoord;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec3 vViewPos;
      
      void main() {
        vec4 worldPos = uModelMatrix * vec4(aPosition, 1.0);
        vWorldPos = worldPos.xyz;
        
        // Apply depth rotation for 3D effect
        vec4 rotatedPos = uDepthRotation * worldPos;
        
        gl_Position = uProjectionMatrix * uViewMatrix * rotatedPos;
        vTexCoord = aTexCoord;
        vNormal = (uModelMatrix * vec4(aNormal, 0.0)).xyz;
        vViewPos = (uViewMatrix * worldPos).xyz;
      }
    `;
    
    // Fragment shader
    const fragmentShaderSource = `
      precision mediump float;
      
      varying vec2 vTexCoord;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec3 vViewPos;
      
      uniform vec4 uOutfitColor;
      uniform sampler2D uOutfitTexture;
      uniform bool uLightingEnabled;
      uniform bool uShadowEnabled;
      
      void main() {
        vec4 texColor = texture2D(uOutfitTexture, vTexCoord);
        vec4 baseColor = uOutfitColor * texColor;
        
        if (uLightingEnabled) {
          // Calculate lighting
          vec3 normal = normalize(vNormal);
          vec3 lightDir = normalize(vec3(1.0, 1.0, 2.0));
          vec3 viewDir = normalize(-vViewPos);
          
          // Ambient lighting
          vec3 ambient = vec3(0.3);
          
          // Diffuse lighting
          float diffuse = max(dot(normal, lightDir), 0.0);
          
          // Specular lighting
          vec3 reflectDir = reflect(-lightDir, normal);
          float specular = pow(max(dot(viewDir, reflectDir), 0.0), 32.0) * 0.5;
          
          vec3 lighting = ambient + diffuse + specular;
          baseColor.rgb *= lighting;
        }
        
        if (uShadowEnabled) {
          // Add shadow effect
          float shadowFactor = 1.0 - smoothstep(0.5, 0.8, vTexCoord.y);
          baseColor.rgb *= shadowFactor;
        }
        
        gl_FragColor = baseColor;
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
      throw new Error('SHADER_LINK_ERROR: Failed to link outfit shader program');
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
      outfitColor: gl.getUniformLocation(this.program, 'uOutfitColor')!,
      outfitTexture: gl.getUniformLocation(this.program, 'uOutfitTexture')!,
      lightingEnabled: gl.getUniformLocation(this.program, 'uLightingEnabled')!,
      shadowEnabled: gl.getUniformLocation(this.program, 'uShadowEnabled')!,
      depthRotation: gl.getUniformLocation(this.program, 'uDepthRotation')!
    };
  }

  // 🧬 UPDATE BODY POSE
  updateBodyPose(landmarks: any[]): void {
    if (!landmarks || landmarks.length < 33) {
      throw new Error('INVALID_LANDMARKS: Expected pose landmarks');
    }

    // Extract body pose landmarks
    this.bodyPose = {
      leftShoulder: this.extractLandmark(landmarks, 11),
      rightShoulder: this.extractLandmark(landmarks, 12),
      neck: this.calculateNeckPosition(landmarks),
      hipCenter: this.calculateHipCenter(landmarks),
      leftHip: this.extractLandmark(landmarks, 23),
      rightHip: this.extractLandmark(landmarks, 24),
      leftElbow: this.extractLandmark(landmarks, 13),
      rightElbow: this.extractLandmark(landmarks, 14),
      leftWrist: this.extractLandmark(landmarks, 15),
      rightWrist: this.extractLandmark(landmarks, 16)
    };
    
    // Calculate outfit dimensions based on pose
    this.calculateOutfitDimensions();
    
    // Deform mesh to body pose
    this.deformMeshToBody();
  }

  // 📐 EXTRACT LANDMARK
  private extractLandmark(landmarks: any[], index: number): { x: number; y: number; z: number } {
    const landmark = landmarks[index];
    if (!landmark) {
      return { x: 0, y: 0, z: 0 };
    }
    
    return {
      x: landmark.x || 0,
      y: landmark.y || 0,
      z: landmark.z || 0
    };
  }

  // 📐 CALCULATE NECK POSITION
  private calculateNeckPosition(landmarks: any[]): { x: number; y: number; z: number } {
    const leftShoulder = this.extractLandmark(landmarks, 11);
    const rightShoulder = this.extractLandmark(landmarks, 12);
    
    return {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: Math.min(leftShoulder.y, rightShoulder.y) - 0.1,
      z: (leftShoulder.z + rightShoulder.z) / 2
    };
  }

  // 📐 CALCULATE HIP CENTER
  private calculateHipCenter(landmarks: any[]): { x: number; y: number; z: number } {
    const leftHip = this.extractLandmark(landmarks, 23);
    const rightHip = this.extractLandmark(landmarks, 24);
    
    return {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
      z: (leftHip.z + rightHip.z) / 2
    };
  }

  // 📏 CALCULATE OUTFIT DIMENSIONS
  private calculateOutfitDimensions(): void {
    const pose = this.bodyPose;
    
    // Calculate shirt width (shoulder to shoulder)
    const shoulderDistance = Math.sqrt(
      Math.pow(pose.rightShoulder.x - pose.leftShoulder.x, 2) +
      Math.pow(pose.rightShoulder.y - pose.leftShoulder.y, 2) +
      Math.pow(pose.rightShoulder.z - pose.leftShoulder.z, 2)
    );
    
    // Calculate shirt height (neck to hip)
    const neckToHipDistance = Math.sqrt(
      Math.pow(pose.hipCenter.x - pose.neck.x, 2) +
      Math.pow(pose.hipCenter.y - pose.neck.y, 2) +
      Math.pow(pose.hipCenter.z - pose.neck.z, 2)
    );
    
    // Calculate sleeve length (shoulder to elbow)
    const leftSleeveLength = Math.sqrt(
      Math.pow(pose.leftElbow.x - pose.leftShoulder.x, 2) +
      Math.pow(pose.leftElbow.y - pose.leftShoulder.y, 2) +
      Math.pow(pose.leftElbow.z - pose.leftShoulder.z, 2)
    );
    
    const rightSleeveLength = Math.sqrt(
      Math.pow(pose.rightElbow.x - pose.rightShoulder.x, 2) +
      Math.pow(pose.rightElbow.y - pose.rightShoulder.y, 2) +
      Math.pow(pose.rightElbow.z - pose.rightShoulder.z, 2)
    );
    
    // Store dimensions
    this.outfitDimensions = {
      shirtWidth: shoulderDistance,
      shirtHeight: neckToHipDistance,
      sleeveLength: (leftSleeveLength + rightSleeveLength) / 2,
      collarSize: shoulderDistance * 0.4,
      shoulderWidth: shoulderDistance,
      torsoDepth: Math.abs(pose.leftShoulder.z - pose.rightShoulder.z) + 0.2
    };
  }

  // 🎭 DEFORM MESH TO BODY
  private deformMeshToBody(): void {
    const resolution = this.meshResolution;
    const dimensions = this.outfitDimensions;
    const pose = this.bodyPose;
    
    // Update vertex positions based on body pose
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const idx = (i * resolution + j) * 8;
        
        // Get original cylindrical coordinates
        const x = this.vertices[idx];
        const y = this.vertices[idx + 1];
        const z = this.vertices[idx + 2];
        
        // Apply body-specific deformation
        const deformation = this.calculateBodyDeformation(x, y, z, dimensions, pose);
        
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

  // 🎯 CALCULATE BODY DEFORMATION
  private calculateBodyDeformation(
    x: number, y: number, z: number, 
    dimensions: OutfitDimensions, 
    pose: BodyPose
  ): any {
    
    // Scale based on body dimensions
    const scaleX = dimensions.shirtWidth * 0.5;
    const scaleY = dimensions.shirtHeight * 0.5;
    const scaleZ = dimensions.torsoDepth * 0.5;
    
    // Apply scaling
    let deformedX = x * scaleX;
    let deformedY = y * scaleY;
    let deformedZ = z * scaleZ;
    
    // Add shoulder-specific deformation
    if (y > 0.3) { // Upper torso/shoulder area
      const shoulderSlope = (pose.rightShoulder.y - pose.leftShoulder.y) / dimensions.shirtWidth;
      deformedY += deformedX * shoulderSlope * 0.1;
    }
    
    // Add torso curvature
    const torsoCurve = Math.sin(y * Math.PI) * 0.05;
    deformedZ += torsoCurve;
    
    // Calculate new normal
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

  // 🎨 SET OUTFIT PARAMETERS
  setOutfitParameters(parameters: OutfitParameters): void {
    const gl = this.gl;
    gl.useProgram(this.program);
    
    // Set outfit color
    gl.uniform4f(this.uniformLocations.outfitColor, 
      parameters.color.r, 
      parameters.color.g, 
      parameters.color.b, 
      parameters.color.a
    );
    
    // Enable lighting based on material
    const enableLighting = parameters.material !== "synthetic";
    gl.uniform1i(this.uniformLocations.lightingEnabled, enableLighting ? 1 : 0);
    
    // Enable shadow based on pattern
    const enableShadow = parameters.pattern !== "solid";
    gl.uniform1i(this.uniformLocations.shadowEnabled, enableShadow ? 1 : 0);
  }

  // 🎬 RENDER OUTFIT
  render(modelMatrix: number[], viewMatrix: number[], projectionMatrix: number[]): void {
    const gl = this.gl;
    
    gl.useProgram(this.program);
    
    // Calculate depth rotation matrix for 3D effect
    const depthRotation = this.calculateDepthRotationMatrix();
    
    // Set matrices
    gl.uniformMatrix4fv(this.uniformLocations.modelMatrix, false, new Float32Array(modelMatrix));
    gl.uniformMatrix4fv(this.uniformLocations.viewMatrix, false, new Float32Array(viewMatrix));
    gl.uniformMatrix4fv(this.uniformLocations.projectionMatrix, false, new Float32Array(projectionMatrix));
    gl.uniformMatrix4fv(this.uniformLocations.depthRotation, false, new Float32Array(depthRotation));
    
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
    
    // Bind index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    
    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    // Draw outfit mesh
    gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
  }

  // 🔄 CALCULATE DEPTH ROTATION MATRIX
  private calculateDepthRotationMatrix(): number[] {
    const pose = this.bodyPose;
    
    // Calculate rotation based on shoulder Z difference
    const leftZ = pose.leftShoulder.z;
    const rightZ = pose.rightShoulder.z;
    const zDifference = rightZ - leftZ;
    
    // Create rotation matrix around Y axis
    const angle = Math.atan2(zDifference, 1.0) * 0.5; // Scale down for subtle effect
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    // 4x4 rotation matrix (column-major)
    return [
      cos, 0, sin, 0,
      0, 1, 0, 0,
      -sin, 0, cos, 0,
      0, 0, 0, 1
    ];
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
    
    if (this.texture) {
      gl.deleteTexture(this.texture);
    }
  }

  // 🎨 CREATE OUTFIT TEXTURE
  createOutfitTexture(parameters: OutfitParameters): void {
    const gl = this.gl;
    
    // Create texture
    this.texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    
    // Generate texture based on pattern
    const textureData = this.generateTextureData(parameters.pattern);
    
    // Upload texture data
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, textureData);
    
    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  }

  // 🎨 GENERATE TEXTURE DATA
  private generateTextureData(pattern: string): Uint8Array {
    const size = 256 * 256 * 4; // RGBA
    const data = new Uint8Array(size);
    
    for (let i = 0; i < 256; i++) {
      for (let j = 0; j < 256; j++) {
        const idx = (i * 256 + j) * 4;
        
        let value = 255;
        
        switch (pattern) {
          case "solid":
            value = 200;
            break;
          case "striped":
            value = (j % 32 < 16) ? 200 : 150;
            break;
          case "checked":
            value = ((i % 32 < 16) === (j % 32 < 16)) ? 200 : 150;
            break;
          case "embroidered":
            value = 180 + Math.sin(i * 0.1) * Math.cos(j * 0.1) * 75;
            break;
          default:
            value = 200;
        }
        
        data[idx] = value;     // R
        data[idx + 1] = value; // G
        data[idx + 2] = value; // B
        data[idx + 3] = 255;   // A
      }
    }
    
    return data;
  }

  // 🔄 UPDATE OUTFIT FIT
  updateFit(fit: "slim" | "regular" | "tailored" | "loose"): void {
    const resolution = this.meshResolution;
    
    // Apply fit transformation to vertices
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const idx = (i * resolution + j) * 8;
        
        const x = this.vertices[idx];
        const y = this.vertices[idx + 1];
        const z = this.vertices[idx + 2];
        
        let scale = 1.0;
        
        switch (fit) {
          case "slim":
            scale = 0.9;
            break;
          case "regular":
            scale = 1.0;
            break;
          case "tailored":
            scale = 0.95;
            break;
          case "loose":
            scale = 1.1;
            break;
        }
        
        this.vertices[idx] = x * scale;
        this.vertices[idx + 2] = z * scale;
      }
    }
    
    // Update vertex buffer
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
  }
}

export default OutfitPoseEngine;
