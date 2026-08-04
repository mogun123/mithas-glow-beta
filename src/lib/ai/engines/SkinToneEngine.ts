// Skin Tone Analysis Engine
// Extracted from MirrorScreen.tsx for modular architecture

import { LAB, rgbToLab } from '../lib/utils/colorUtils';

// Interface for pixel data
interface PixelData {
  r: number;
  g: number;
  b: number;
}

// Extract region pixels utility (needed for analyzeSkinToneLAB)
declare const extractRegionPixels: (imageData: ImageData, landmarks: any[]) => PixelData[];

/**
 * Analyzes skin tone from LAB color space using facial landmarks
 * @param imageData - Image data from canvas
 * @param landmarks - Facial landmarks from MediaPipe
 * @returns Promise<string> - Skin tone classification
 */
export const analyzeSkinToneLAB = async (imageData: ImageData, landmarks: any[]): Promise<string> => {
  try {
    // Verify landmarks are detected before starting analysis
    if (!landmarks || landmarks.length === 0) {
      console.warn("No landmarks detected for skin tone analysis");
      return "unknown";
    }

    // Extract cheek region pixels (most accurate for skin tone)
    const cheekLandmarks = landmarks.slice(50, 68) // Right cheek landmarks
    
    const pixels = extractRegionPixels(imageData, cheekLandmarks)
    
    // Validate pixel data before color conversion
    if (!pixels || pixels.length === 0) {
      console.warn("No valid pixels extracted for analysis");
      return "unknown";
    }

    // Convert RGB to LAB color space with error handling
    const labValues = pixels ? pixels.map(pixel => {
      // Validate pixel data
      if (!pixel || typeof pixel.r === 'undefined' || typeof pixel.g === 'undefined' || typeof pixel.b === 'undefined') {
        console.warn("Invalid pixel data:", pixel);
        return null; // No fallback - return null on error
      }
      
      try {
        return rgbToLab(pixel.r, pixel.g, pixel.b);
      } catch (error) {
        console.error("RGB to LAB conversion error:", error);
        return null; // No fallback - return null on error
      }
    }) : [];

    // Filter out any null/undefined LAB values
    const validLabValues = labValues.filter(lab => lab && typeof lab.L !== 'undefined' && typeof lab.a !== 'undefined' && typeof lab.b !== 'undefined');
    
    // Check if we have valid data
    if (validLabValues.length === 0) {
      console.warn("No valid LAB values for analysis");
      return "ERROR";
    }

    // Calculate average L and b values with proper fallbacks
    const avgL = validLabValues.reduce((sum, lab) => sum + (lab.L || 0), 0) / validLabValues.length
    const avgB = validLabValues.reduce((sum, lab) => sum + (lab.b || 0), 0) / validLabValues.length

    // Map to Fitzpatrick scale (optimized for Indian skin tones)
    return mapLABToFitzpatrick(avgL, avgB)

  } catch (error) {
    console.error('LAB analysis error:', error)
    return "ERROR"
  }
}

/**
 * Maps LAB color values to Fitzpatrick skin type
 * @param L - Lightness value (0-100)
 * @param b - Blue-Yellow axis value (-128 to 127)
 * @returns string - Fitzpatrick type or 'ERROR' if detection fails
 */
export const mapLABToFitzpatrick = (L: number, b: number): string => {
  // Validate input parameters
  if (typeof L !== 'number' || typeof b !== 'number' || 
      !isFinite(L) || !isFinite(b) ||
      L < 0 || L > 100 || b < -128 || b > 127) {
    return 'ERROR';
  }

  // Strict mapping with no fallbacks
  if (L > 60 && b < 15) return 'Type I'   // Very Light
  if (L > 55 && b < 20) return 'Type II'  // Light
  if (L > 50 && b < 25) return 'Type III' // Medium-Light
  if (L > 40 && b < 30) return 'Type IV'  // Medium (Most common in India)
  if (L > 30 && b < 35) return 'Type V'   // Medium-Dark
  if (L > 20 && b < 40) return 'Type VI'  // Dark
  
  return 'ERROR'; // No fallback - return error if values don't match expected ranges
};
