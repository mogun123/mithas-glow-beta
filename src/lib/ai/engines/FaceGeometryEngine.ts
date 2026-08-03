// Face Geometry Analysis Engine
// Extracted from MirrorScreen.tsx for modular architecture

// Interface for MediaPipe landmark
interface Landmark {
  x: number;
  y: number;
  z?: number;
}

/**
 * Classifies face shape based on geometric measurements from facial landmarks
 * Uses width-to-height ratios and landmark proportions for accurate classification
 * @param landmarks - Array of MediaPipe facial landmarks
 * @returns string - Face shape classification (Oval, Round, Square, Heart, Diamond)
 */
export const classifyFaceShape = (landmarks: Landmark[]): string => {
  try {
    // Calculate key facial measurements
    const jawline = landmarks.slice(172, 200) // Jaw landmarks
    const forehead = landmarks.slice(70, 90)   // Forehead landmarks
    const cheekbones = landmarks.slice(50, 68)  // Cheekbone landmarks

    // Jaw width (widest part of jaw)
    const jawWidth = Math.max(...jawline.map(l => l.x)) - Math.min(...jawline.map(l => l.x))

    // Forehead width
    const foreheadWidth = Math.max(...forehead.map(l => l.x)) - Math.min(...forehead.map(l => l.x))

    // Cheekbone width
    const cheekboneWidth = Math.max(...cheekbones.map(l => l.x)) - Math.min(...cheekbones.map(l => l.x))

    // Face height (forehead to chin)
    const faceHeight = landmarks[10].y - landmarks[152].y

    // Calculate ratios
    const widthToHeight = Math.max(jawWidth, foreheadWidth, cheekboneWidth) / faceHeight
    const foreheadToJaw = foreheadWidth / jawWidth
    const cheekboneToJaw = cheekboneWidth / jawWidth

    // Logic-based classification
    if (widthToHeight > 0.85) {
      if (foreheadToJaw > 1.1) return 'Heart'  // Wide forehead, narrow jaw
      return 'Round'                           // Equal width and height
    } else if (widthToHeight > 0.75) {
      if (cheekboneToJaw > 1.1) return 'Diamond' // Wide cheekbones
      return 'Oval'                            // Balanced proportions
    } else {
      return 'Square'                          // Strong jaw, equal width
    }

  } catch (error) {
    console.error('Face shape classification error:', error)
    return 'ERROR' // No fallback - return error if classification fails
  }
}
