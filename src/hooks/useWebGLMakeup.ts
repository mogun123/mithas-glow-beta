import { useRef, useEffect, useCallback } from 'react';
import { FACEMESH_LIPS, FACEMESH_LEFT_EYE, FACEMESH_RIGHT_EYE, FACEMESH_FACE_OVAL } from '@mediapipe/face_mesh';

interface MakeupLayer {
  color: [number, number, number];
  alpha: number;
  lightIntensity: number;
  meshTypes: string[];
}

interface WebGLMakeupProps {
  canvas: HTMLCanvasElement | null;
  landmarks: number[][];
  makeupLayers: MakeupLayer[];
}

export const useWebGLMakeup = ({ canvas, landmarks, makeupLayers }: WebGLMakeupProps) => {
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const positionBufferRef = useRef<WebGLBuffer | null>(null);
  const indexBufferRef = useRef<WebGLBuffer | null>(null);

  // Vertex shader for landmark positioning
  const vertexShaderSource = `#version 300 es
    in vec2 a_position;
    
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  // Fragment shader for PBR makeup rendering
  const fragmentShaderSource = `#version 300 es
    precision highp float;
    
    uniform vec3 u_makeupColor;
    uniform float u_alpha;
    uniform float u_lightIntensity;
    
    out vec4 fragColor;
    
    void main() {
      // PBR base color with metallic/sheen effect
      vec3 baseColor = u_makeupColor * u_lightIntensity;
      
      // Add subtle specular highlight for realism
      float specular = pow(u_lightIntensity, 2.0) * 0.3;
      vec3 finalColor = baseColor + vec3(specular);
      
      fragColor = vec4(finalColor, u_alpha);
    }
  `;

  const createShader = useCallback((gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }, []);

  const createProgram = useCallback((gl: WebGL2RenderingContext): WebGLProgram | null => {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    if (!vertexShader || !fragmentShader) return null;
    
    const program = gl.createProgram();
    if (!program) return null;
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    
    return program;
  }, [createShader]);

  const getTriangulationIndices = useCallback((meshType: string): number[] => {
    let connections: number[][] = [];
    switch (meshType) {
      case 'lips':
        connections = FACEMESH_LIPS;
        break;
      case 'leftEye':
        connections = FACEMESH_LEFT_EYE;
        break;
      case 'rightEye':
        connections = FACEMESH_RIGHT_EYE;
        break;
      case 'face':
        connections = FACEMESH_FACE_OVAL;
        break;
      default:
        connections = FACEMESH_FACE_OVAL;
    }
    
    const flatIndices: number[] = [];
    connections.forEach(([start, end]) => {
      flatIndices.push(start, end);
    });
    return flatIndices;
  }, []);

  const initializeWebGL = useCallback(() => {
    if (!canvas) return false;

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true
    });

    if (!gl) {
      console.error('WebGL2 not supported');
      return false;
    }

    glRef.current = gl;

    // Enable blending for natural makeup overlay
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // Standard alpha blending
    // For multiply effect: gl.blendFunc(gl.DST_COLOR, gl.ZERO);
    // For soft light effect: gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    // Create and compile shader program
    const program = createProgram(gl);
    if (!program) return false;

    programRef.current = program;
    gl.useProgram(program);

    // Create buffers
    const positionBuffer = gl.createBuffer();
    const indexBuffer = gl.createBuffer();
    
    if (!positionBuffer || !indexBuffer) return false;

    positionBufferRef.current = positionBuffer;
    indexBufferRef.current = indexBuffer;

    return true;
  }, [canvas, createProgram]);

  const renderMakeup = useCallback(() => {
    const gl = glRef.current;
    const program = programRef.current;
    const positionBuffer = positionBufferRef.current;
    const indexBuffer = indexBufferRef.current;

    if (!gl || !program || !positionBuffer || !indexBuffer || landmarks.length === 0) {
      return;
    }

    // Clear canvas
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Set viewport
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Use shader program
    gl.useProgram(program);

    // Get uniform locations
    const makeupColorLoc = gl.getUniformLocation(program, 'u_makeupColor');
    const alphaLoc = gl.getUniformLocation(program, 'u_alpha');
    const lightIntensityLoc = gl.getUniformLocation(program, 'u_lightIntensity');
    const positionLoc = gl.getAttribLocation(program, 'a_position');

    // Enable vertex attribute
    gl.enableVertexAttribArray(positionLoc);

    // Render each makeup layer
    makeupLayers.forEach(layer => {
      // Convert landmarks to normalized coordinates (-1 to 1)
      const positions: number[] = [];
      landmarks.forEach(landmark => {
        // landmark should be [x, y] coordinates
        if (Array.isArray(landmark) && landmark.length >= 2) {
          positions.push(landmark[0] * 2 - 1, 1 - landmark[1] * 2); // Flip Y for WebGL
        }
      });

      // Update position buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

      // Render each mesh type in this layer
      layer.meshTypes.forEach(meshType => {
        // Get triangulation indices for this mesh type
        const indices = getTriangulationIndices(meshType);

        // Update index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.DYNAMIC_DRAW);

        // Set uniforms
        gl.uniform3fv(makeupColorLoc, layer.color);
        gl.uniform1f(alphaLoc, layer.alpha);
        gl.uniform1f(lightIntensityLoc, layer.lightIntensity);

        // Draw the mesh
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
      });
    });

    // Cleanup
    gl.disableVertexAttribArray(positionLoc);
  }, [landmarks, makeupLayers, getTriangulationIndices]);

  const cleanup = useCallback(() => {
    const gl = glRef.current;
    const program = programRef.current;
    const positionBuffer = positionBufferRef.current;
    const indexBuffer = indexBufferRef.current;

    if (gl) {
      if (program) {
        gl.deleteProgram(program);
      }
      if (positionBuffer) {
        gl.deleteBuffer(positionBuffer);
      }
      if (indexBuffer) {
        gl.deleteBuffer(indexBuffer);
      }
    }

    glRef.current = null;
    programRef.current = null;
    positionBufferRef.current = null;
    indexBufferRef.current = null;
  }, []);

  useEffect(() => {
    if (canvas) {
      const success = initializeWebGL();
      if (!success) {
        console.error('Failed to initialize WebGL makeup renderer');
      }
    }

    return cleanup;
  }, [canvas, initializeWebGL, cleanup]);

  useEffect(() => {
    if (glRef.current && landmarks.length > 0) {
      renderMakeup();
    }
  }, [landmarks, renderMakeup]);

  return {
    renderMakeup,
    cleanup
  };
};
