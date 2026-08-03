// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - Skin Blending Shader
// Seamless skin tone adaptation with pore-aware blending and lighting matching
// ═══════════════════════════════════════════════════════════════════════════

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

uniform sampler2D beardTexture;
uniform sampler2D skinTexture;
uniform sampler2D alphaMap;

uniform vec3 skinTone;
uniform float blendFactor;
uniform float poreVisibility;
uniform float lightingMatch;

void main() {
    // Sample textures
    vec4 beardColor = texture2D(beardTexture, vUv);
    vec4 skinColor = texture2D(skinTexture, vUv);
    float alpha = texture2D(alphaMap, vUv).r;
    
    // Calculate edge mask for blending
    float edgeMask = smoothstep(0.0, 0.3, alpha);
    float edgeInverse = 1.0 - edgeMask;
    
    // Skin tone adaptation
    vec3 adaptedSkin = skinTone * skinColor.rgb;
    
    // Pore-aware blending (add noise for realism)
    float poreNoise = fract(sin(dot(vUv * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
    vec3 poreColor = adaptedSkin * (1.0 + poreNoise * poreVisibility * 0.1);
    
    // Blend beard with skin at edges
    vec3 blendedColor = mix(poreColor, beardColor.rgb, edgeMask * blendFactor);
    
    // Lighting matching
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    float lightIntensity = max(dot(normal, lightDir), 0.0);
    
    // Apply lighting match
    blendedColor *= (1.0 - lightingMatch * 0.3) + lightIntensity * lightingMatch * 0.3;
    
    // Final alpha with edge feathering
    float finalAlpha = alpha * (0.5 + edgeMask * 0.5);
    
    gl_FragColor = vec4(blendedColor, finalAlpha);
}
