// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - Beard Vertex Shader
// Realistic hair rendering with proper UV mapping and normal handling
// ═══════════════════════════════════════════════════════════════════════════

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

void main() {
    // Pass UV coordinates to fragment shader
    vUv = uv;
    
    // Transform normal to view space
    vNormal = normalize(normalMatrix * normal);
    
    // Calculate view position for lighting calculations
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    
    // Calculate world position for depth calculations
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    
    // Final position
    gl_Position = projectionMatrix * mvPosition;
}
