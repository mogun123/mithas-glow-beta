/**
 * ═════════════════════════════════════════════════════════════════════════════
 * 🧔 BEARD PIPELINE - CENTRALIZED NORMALIZATION UTILITIES
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * PRODUCTION-GRADE NORMALIZATION SYSTEM
 * 
 * - Ensures exact frontend/backend mapping consistency
 * - Prevents case-sensitivity issues
 * - Eliminates silent remapping
 * - Exposes unknown mappings in DEBUG_AI
 * 
 * NO MOCK DATA. NO FALLBACKS. NO SILENT REMAPPING.
 */

/**
 * FACE SHAPE NORMALIZATION MAP
 * 
 * Maps all possible face shape variations to canonical lowercase values.
 * 
 * Supported shapes:
 * - oval
 * - round
 * - square
 * - heart
 * - diamond
 * - oblong
 * - rectangle
 * - triangle
 * 
 * Hybrid shapes supported (extracts dominant shape):
 * - Round-Oval Hybrid
 * - Soft Square
 * - Oval-Diamond
 * - Heart-Oval
 */
export const FACE_SHAPE_MAP: Record<string, string> = {
  // Primary shapes (lowercase)
  'oval': 'oval',
  'round': 'round',
  'square': 'square',
  'heart': 'heart',
  'diamond': 'diamond',
  'oblong': 'oblong',
  'rectangle': 'rectangle',
  'triangle': 'triangle',
  
  // Title case variants
  'Oval': 'oval',
  'Round': 'round',
  'Square': 'square',
  'Heart': 'heart',
  'Diamond': 'diamond',
  'Oblong': 'oblong',
  'Rectangle': 'rectangle',
  'Triangle': 'triangle',
  
  // Uppercase variants
  'OVAL': 'oval',
  'ROUND': 'round',
  'SQUARE': 'square',
  'HEART': 'heart',
  'DIAMOND': 'diamond',
  'OBLONG': 'oblong',
  'RECTANGLE': 'rectangle',
  'TRIANGLE': 'triangle',
  
  // Hybrid shape variants (extract primary shape)
  'oval-round hybrid': 'oval',
  'round-oval hybrid': 'round',
  'round-oval': 'round',
  'oval-round': 'oval',
  'square-rectangle hybrid': 'square',
  'rectangle-square hybrid': 'rectangle',
  'heart-diamond hybrid': 'heart',
  'diamond-heart hybrid': 'diamond',
  'oval-square hybrid': 'oval',
  'round-diamond hybrid': 'round',
  
  // Additional hybrid variants with different formatting
  'soft square': 'square',
  'soft-square': 'square',
  'oval-diamond': 'oval',
  'oval-diamond hybrid': 'oval',
  'heart-oval': 'heart',
  'heart-oval hybrid': 'heart',
  
  // Semantic variants
  'rounded square': 'square',
  'angular oval': 'oval',
  'soft heart': 'heart',
};

/**
 * OCCASION NORMALIZATION MAP
 * 
 * Maps all possible occasion variations to canonical lowercase values.
 * 
 * Canonical values (must match DB occasion_tags column):
 * - office  (Office/College, Professional Work, corporate, business)
 * - casual  (Casual)
 * - party   (Party Glam, nightlife, glam)
 * - wedding (Wedding, Bridal Full Set, Reception, traditional wedding)
 * - date
 * - traditional
 * - festival
 */
export const OCCASION_MAP: Record<string, string> = {
  // Primary occasions (lowercase) — values match DB occasion_tags column
  'office': 'office',
  'casual': 'casual',
  'party': 'party',
  'wedding': 'wedding',
  'date': 'date',
  'traditional': 'traditional',
  'festival': 'festival',

  // Legacy canonical aliases (kept for backward-compat)
  'professional': 'office',

  // MirrorScreen Mode values (exact strings from Mode type)
  'office/college': 'office',
  'party glam': 'party',
  'bridal full set': 'wedding',
  'professional work': 'office',
  'reception': 'wedding',

  // Professional / office variants
  'work': 'office',
  'business': 'office',
  'corporate': 'office',
  'corporate professional': 'office',
  'business professional': 'office',
  'college': 'office',

  // Party variants
  'nightlife': 'party',
  'evening': 'party',
  'night out': 'party',
  'celebration': 'party',
  'glam': 'party',

  // Wedding variants
  'traditional wedding': 'wedding',
  'bridal': 'wedding',
  'bridal party': 'wedding',
  'wedding ceremony': 'wedding',

  // Title case variants (MirrorScreen Mode strings)
  'Office/College': 'office',
  'Party Glam': 'party',
  'Bridal Full Set': 'wedding',
  'Professional Work': 'office',
  'Reception': 'wedding',
  'Casual': 'casual',
  'Wedding': 'wedding',
  'Professional': 'office',
  'Party': 'party',
  'Date': 'date',
  'Traditional': 'traditional',
  'Festival': 'festival',
  'Office': 'office',
  'Corporate': 'office',
  'Traditional Wedding': 'wedding',
  'Bridal': 'wedding',

  // Uppercase variants
  'OFFICE': 'office',
  'PROFESSIONAL': 'office',
  'CASUAL': 'casual',
  'PARTY': 'party',
  'WEDDING': 'wedding',
  'DATE': 'date',
  'TRADITIONAL': 'traditional',
  'FESTIVAL': 'festival',
  'CORPORATE': 'office',
};

/**
 * Normalizes face shape to canonical lowercase value.
 * 
 * @param rawShape - Raw face shape string (any case, any format)
 * @returns Normalized face shape (lowercase)
 * @throws Error if shape cannot be normalized
 */
export function normalizeFaceShape(rawShape: string): string {
  if (!rawShape || typeof rawShape !== 'string') {
    throw new Error(`Invalid face shape: ${rawShape}`);
  }
  
  const normalized = rawShape.trim().toLowerCase();
  
  // Check for hybrid shapes and extract primary
  if (normalized.includes('hybrid')) {
    const parts = normalized.split('-');
    const primaryShape = parts[0];
    const mappedPrimary = FACE_SHAPE_MAP[primaryShape];
    
    if (mappedPrimary) {
      return mappedPrimary;
    }
    
    // Unknown hybrid shape - expose in DEBUG_AI
    if (typeof window !== 'undefined' && window.DEBUG_AI) {
      (window.DEBUG_AI as any).unknownFaceShape = rawShape;
      (window.DEBUG_AI as any).normalizationError = `Unknown hybrid face shape: ${rawShape}`;
    }
    
    throw new Error(`Unknown hybrid face shape: ${rawShape}`);
  }
  
  // Check direct mapping
  const mapped = FACE_SHAPE_MAP[normalized];
  if (mapped) {
    return mapped;
  }
  
  // Check case-insensitive mapping
  const caseInsensitiveKey = Object.keys(FACE_SHAPE_MAP).find(
    key => key.toLowerCase() === normalized
  );
  
  if (caseInsensitiveKey) {
    return FACE_SHAPE_MAP[caseInsensitiveKey];
  }
  
  // Unknown shape - expose in DEBUG_AI
  if (typeof window !== 'undefined' && window.DEBUG_AI) {
    (window.DEBUG_AI as any).unknownFaceShape = rawShape;
    (window.DEBUG_AI as any).normalizationError = `Unknown face shape: ${rawShape}`;
  }
  
  throw new Error(`Unknown face shape: ${rawShape}`);
}

/**
 * Normalizes occasion to canonical lowercase value.
 * 
 * @param rawOccasion - Raw occasion string (any case, any format)
 * @returns Normalized occasion (lowercase)
 * @throws Error if occasion cannot be normalized
 */
export function normalizeOccasion(rawOccasion: string): string {
  if (!rawOccasion || typeof rawOccasion !== 'string') {
    throw new Error(`Invalid occasion: ${rawOccasion}`);
  }
  
  const normalized = rawOccasion.trim().toLowerCase();
  
  // Check direct mapping
  const mapped = OCCASION_MAP[normalized];
  if (mapped) {
    return mapped;
  }
  
  // Check case-insensitive mapping
  const caseInsensitiveKey = Object.keys(OCCASION_MAP).find(
    key => key.toLowerCase() === normalized
  );
  
  if (caseInsensitiveKey) {
    return OCCASION_MAP[caseInsensitiveKey];
  }
  
  // Unknown occasion - expose in DEBUG_AI
  if (typeof window !== 'undefined' && window.DEBUG_AI) {
    (window.DEBUG_AI as any).unknownOccasion = rawOccasion;
    (window.DEBUG_AI as any).normalizationError = `Unknown occasion: ${rawOccasion}`;
  }
  
  throw new Error(`Unknown occasion: ${rawOccasion}`);
}

/**
 * Validates that a normalized face shape is supported.
 * 
 * @param normalizedShape - Normalized face shape
 * @returns true if valid
 */
export function isValidFaceShape(normalizedShape: string): boolean {
  const supportedShapes = new Set([
    'oval', 'round', 'square', 'heart', 'diamond', 'oblong', 'rectangle', 'triangle'
  ]);
  return supportedShapes.has(normalizedShape);
}

/**
 * Validates that a normalized occasion is supported.
 * 
 * @param normalizedOccasion - Normalized occasion
 * @returns true if valid
 */
export function isValidOccasion(normalizedOccasion: string): boolean {
  const supportedOccasions = new Set([
    'professional', 'casual', 'party', 'wedding', 'date', 'traditional', 'festival'
  ]);
  return supportedOccasions.has(normalizedOccasion);
}
