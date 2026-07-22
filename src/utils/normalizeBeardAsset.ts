// ═══════════════════════════════════════════════════════════════════════════
// MITHASGLOW - Beard Asset Normalizer
// Converts backend API responses to stable frontend BeardStyle format
// ═══════════════════════════════════════════════════════════════════════════

import { BeardStyle } from '../types/engine.types';

/**
 * Normalizes beard asset data from various backend sources
 * Handles:
 * - Flat field structures (from AIOccasionStylist API)
 * - Nested texture objects
 * - Missing optional fields
 * - URL validation
 */
export function normalizeBeardAsset(raw: any): BeardStyle | null {
  if (!raw || typeof raw !== 'object') {
    console.error('[normalizeBeardAsset] Invalid input:', raw);
    return null;
  }

  // Extract ID and name (required)
  const id = raw.id || raw.style_id || `beard-${Date.now()}`;
  const name = raw.name || raw.style_name || 'Unknown Beard';

  // Extract model path (for signed URL generation) or legacy model_3d_url
  const model_path = raw.model_path || '';
  const model_3d_url = raw.model_3d_url || raw.model_url || raw.ar_model_url || raw.url || '';
  
  // Production: model_path is required for signed URL generation
  if (!model_path && !model_3d_url) {
    console.warn(`[normalizeBeardAsset] Asset "${name}" (${id}) has no model_path or model_3d_url - AR will not render`);
  }

  // Normalize texture URLs from various possible field names
  const texture_urls = {
    // Primary albedo/color texture
    albedo: raw.texture_urls?.albedo || 
            raw.texture_url || 
            raw.beard_texture_url || 
            raw.albedo_url || 
            raw.color_url || 
            '',
    
    // Alpha/mask texture
    alpha: raw.texture_urls?.alpha || 
           raw.alpha_mask_url || 
           raw.alpha_url || 
           raw.mask_url || 
           '',
    
    // Density map
    density: raw.texture_urls?.density || 
             raw.density_map_url || 
             raw.density_url || 
             '',
    
    // Strand map
    strand: raw.texture_urls?.strand || 
            raw.strand_map_url || 
            raw.strand_url || 
            '',
    
    // Normal map
    normal: raw.texture_urls?.normal || 
            raw.normal_map_url || 
            raw.normal_url || 
            '',
    
    // Occlusion (optional)
    occlusion: raw.texture_urls?.occlusion || 
               raw.occlusion_url || 
               (raw.occlusion ? String(raw.occlusion) : undefined),
  };

  // Validate URLs (skip empty strings and null)
  const validatedTextureUrls: BeardStyle['texture_urls'] = {
    albedo: texture_urls.albedo && texture_urls.albedo.trim() !== '' ? texture_urls.albedo.trim() : '',
    alpha: texture_urls.alpha && texture_urls.alpha.trim() !== '' ? texture_urls.alpha.trim() : '',
    density: texture_urls.density && texture_urls.density.trim() !== '' ? texture_urls.density.trim() : '',
    strand: texture_urls.strand && texture_urls.strand.trim() !== '' ? texture_urls.strand.trim() : '',
    normal: texture_urls.normal && texture_urls.normal.trim() !== '' ? texture_urls.normal.trim() : '',
    occlusion: texture_urls.occlusion && texture_urls.occlusion.trim() !== '' ? texture_urls.occlusion.trim() : undefined,
  };

  // Validate that model URL is NOT being reused as ANY texture (corruption prevention)
  const textureKeys = ['albedo', 'alpha', 'density', 'strand', 'normal', 'occlusion'] as const;
  for (const key of textureKeys) {
    const textureUrl = validatedTextureUrls[key];
    if (textureUrl && textureUrl === model_3d_url) {
      console.error(`[normalizeBeardAsset] ❌ CORRUPTION: Asset "${name}" reuses model_3d_url as ${key} texture - clearing texture`);
      console.error(`[normalizeBeardAsset] - model_3d_url: ${model_3d_url}`);
      console.error(`[normalizeBeardAsset] - ${key}: ${textureUrl}`);
      (validatedTextureUrls as any)[key] = key === 'occlusion' ? undefined : '';
    }
  }
  
  // Also check if any texture URL is the same as another texture URL (likely copy-paste error)
  const urlValues = Object.values(validatedTextureUrls).filter(v => v && typeof v === 'string');
  const uniqueUrls = new Set(urlValues);
  if (urlValues.length !== uniqueUrls.size) {
    console.warn(`[normalizeBeardAsset] ⚠️ Asset "${name}" has duplicate texture URLs - possible copy-paste error`);
  }

  return {
    id,
    name,
    description: raw.description || '',
    category: raw.category || 'beard',
    model_path,  // Production: storage path for signed URL generation
    model_3d_url,  // Legacy: full URL (deprecated but kept for compatibility)
    thumbnail_url: raw.thumbnail_url || raw.image_url || raw.thumbnail || model_3d_url,
    texture_urls: validatedTextureUrls,
    shaderPresets: raw.shaderPresets || {
      density: raw.density_level ? raw.density_level / 5 : 0.8,
      length: 1.0,
      opacity: 0.9,
      edgeFeathering: 0.3,
    },
    lightingProfile: raw.lightingProfile || {
      ambientIntensity: 0.5,
      specularIntensity: 0.8,
      roughness: 0.5,
    },
    scalePresets: raw.scalePresets || {
      min: 0.8,
      max: 1.2,
      default: 1.0,
    },
    compatibility: raw.compatibility || {
      minJawWidth: 0,
      maxJawWidth: 1,
      faceShapes: ['oval', 'round', 'square', 'diamond', 'heart', 'oblong'],
    },
    active: raw.active !== undefined ? raw.active : true,  // Production flag
  };
}

/**
 * Normalizes an array of beard assets
 */
export function normalizeBeardAssets(rawAssets: any[]): BeardStyle[] {
  if (!Array.isArray(rawAssets)) {
    console.error('[normalizeBeardAssets] Input is not an array:', rawAssets);
    return [];
  }

  const normalized: BeardStyle[] = [];
  const skipped: string[] = [];

  for (const raw of rawAssets) {
    const asset = normalizeBeardAsset(raw);
    if (asset) {
      normalized.push(asset);
    } else {
      skipped.push(raw?.id || raw?.name || 'unknown');
    }
  }

  if (skipped.length > 0) {
    console.warn(`[normalizeBeardAssets] Skipped ${skipped.length} invalid assets:`, skipped);
  }

  console.log(`[normalizeBeardAssets] Normalized ${normalized.length}/${rawAssets.length} beard assets`);
  return normalized;
}

/**
 * Validates a BeardStyle for AR readiness
 */
export function validateBeardStyleForAR(style: BeardStyle): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!style.model_3d_url) {
    issues.push('Missing model_3d_url');
  }

  if (!style.texture_urls.albedo) {
    issues.push('Missing albedo texture (beard will be invisible)');
  }

  if (!style.texture_urls.alpha) {
    issues.push('Missing alpha mask (beard edges will be square)');
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}
