// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - Beard Fragment Shader
// Kajiya-Kay hair rendering with anisotropic highlights, edge feathering, and skin blending
// ═══════════════════════════════════════════════════════════════════════════

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

// Texture uniforms
uniform sampler2D albedoMap;
uniform sampler2D alphaMap;
uniform sampler2D densityMap;
uniform sampler2D strandMap;
uniform sampler2D normalMap;
uniform sampler2D occlusionMap;

// Shader presets
uniform float density;
uniform float length;
uniform float opacity;
uniform float edgeFeathering;

// Lighting profile
uniform float ambientIntensity;
uniform float specularIntensity;
uniform float roughness;

// Animation
uniform float time;

// Skin blending
uniform vec3 skinTone;
uniform float skinBlendFactor;

void main() {
    // Sample all textures
    vec4 albedo = texture2D(albedoMap, vUv);
    float alpha = texture2D(alphaMap, vUv).r;
    float densityValue = texture2D(densityMap, vUv).r;
    float strandValue = texture2D(strandMap, vUv).r;
    vec3 normalMapValue = texture2D(normalMap, vUv).rgb * 2.0 - 1.0;
    float occlusion = texture2D(occlusionMap, vUv).r;

    // Apply density modifier
    alpha *= density * densityValue;
    
    // Apply strand length modifier
    alpha *= smoothstep(0.0, length, strandValue);
    
    // Apply edge feathering for realistic hair edges
    float edgeFactor = smoothstep(0.0, edgeFeathering, alpha);
    alpha *= edgeFactor;
    
    // Discard if fully transparent
    if (alpha < 0.01) {
        discard;
    }

    // Calculate normal from normal map
    vec3 normal = normalize(vNormal + normalMapValue * 0.5);
    
    // Lighting setup
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    vec3 viewDir = normalize(vViewPosition);
    vec3 halfDir = normalize(lightDir + viewDir);
    
    // Tangent direction for anisotropic hair (simplified)
    vec3 tangent = normalize(vec3(1.0, 0.0, 0.0));
    vec3 bitangent = normalize(cross(normal, tangent));
    
    // Kajiya-Kay hair lighting model
    // Diffuse component (Marschner)
    float NdotL = max(dot(normal, lightDir), 0.0);
    float TdotL = dot(tangent, lightDir);
    float diffuse = sqrt(1.0 - TdotL * TdotL) * NdotL;
    
    // Specular component (R - primary reflection)
    float RdotL = dot(reflect(-viewDir, normal), lightDir);
    float specularR = pow(max(RdotL, 0.0), 1.0 / roughness);
    
    // Specular component (TR - secondary reflection, anisotropic)
    float TRdotL = dot(reflect(-viewDir, tangent), lightDir);
    float specularTR = pow(max(TRdotL, 0.0), 1.0 / (roughness * 0.5));
    
    // Combine specular components
    float specular = specularR * 0.7 + specularTR * 0.3;
    specular *= specularIntensity;
    
    // Ambient lighting
    vec3 ambient = albedo.rgb * ambientIntensity;
    
    // Diffuse lighting
    vec3 diffuseColor = albedo.rgb * diffuse;
    
    // Specular lighting (hair color)
    vec3 specularColor = albedo.rgb * specular;
    
    // Apply occlusion
    diffuseColor *= (1.0 - occlusion * 0.5);
    specularColor *= (1.0 - occlusion * 0.3);
    
    // Combine lighting
    vec3 finalColor = ambient + diffuseColor + specularColor;
    
    // Skin blending at edges
    if (skinBlendFactor > 0.0) {
        float edgeMask = 1.0 - edgeFactor;
        finalColor = mix(finalColor, skinTone * albedo.rgb, edgeMask * skinBlendFactor);
    }
    
    // Apply opacity
    gl_FragColor = vec4(finalColor, alpha * opacity);
}
