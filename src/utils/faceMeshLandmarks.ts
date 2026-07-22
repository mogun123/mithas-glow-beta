// MediaPipe Face Mesh Landmark Indices (478 landmarks total)
export const FACE_MESH_LANDMARKS = {
  // Face oval
  FACE_OVAL: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 340, 346, 347, 348, 349, 350, 451, 452, 453, 464, 435, 410, 287, 273, 335, 406, 313, 18, 83, 182, 106, 43, 57, 186, 92, 165, 167, 164, 393, 391, 322, 410, 287, 273, 335, 406, 313, 18, 83, 182, 106, 43, 57, 186, 92, 165, 167, 164, 393, 391, 322, 10],

  // Lips
  LIPS_OUTER: [61, 84, 17, 314, 405, 291, 375, 321, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95],
  LIPS_INNER: [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95],
  LIPS_UPPER: [13, 312, 311, 310, 415, 308],
  LIPS_LOWER: [324, 318, 402, 317, 14, 87, 178, 88, 95],

  // Left eye
  LEFT_EYE_UPPER: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
  LEFT_EYE_LOWER: [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7],
  LEFT_EYELINER: [33, 7, 163, 144, 145, 153, 154, 155, 133],
  LEFT_EYEBROW: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
  LEFT_EYE_CORNER: [33, 133], // Outer and inner corners
  LEFT_EYE_CENTER: [468], // Eye center for tracking

  // Right eye
  RIGHT_EYE_UPPER: [362, 398, 384, 385, 386, 387, 388, 466, 263, 374, 380, 381, 382, 373, 374, 398],
  RIGHT_EYE_LOWER: [362, 398, 374, 373, 382, 381, 380, 374, 263, 466, 388, 387, 386, 385, 384, 398],
  RIGHT_EYELINER: [362, 398, 384, 385, 386, 387, 388, 466, 263],
  RIGHT_EYEBROW: [300, 293, 334, 296, 336, 285, 295, 282, 283, 276],
  RIGHT_EYE_CORNER: [362, 263], // Outer and inner corners
  RIGHT_EYE_CENTER: [473], // Eye center for tracking

  // Nose
  NOSE_TIP: [1],
  NOSE_BRIDGE: [6, 197, 195, 5, 4],
  NOSE_BOTTOM: [2, 326, 358],
  NOSTRILS: [31, 35, 131, 135, 227, 52, 53, 65, 66, 105, 63, 70, 61, 84, 17, 18, 200, 199, 175, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10],

  // Cheeks (for blush)
  LEFT_CHEEK: [50, 101, 49, 220, 305, 292, 334, 296, 336],
  RIGHT_CHEEK: [280, 330, 347, 348, 349, 350, 451, 452, 453, 464],
  CHEEKBONES: [234, 127, 162, 21, 54, 103, 67, 109, 10, 151, 9, 10, 151, 9, 200, 199, 175, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10],

  // Forehead
  FOREHEAD: [69, 108, 151, 9, 10, 151, 9, 200, 199, 175, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10, 151, 9, 200, 199, 175, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10],

  // Jawline
  JAWLINE: [172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 451, 452, 350, 349, 348, 347, 346, 340],

  // Beard area (for men)
  BEARD_AREA: [172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 451, 452, 350, 349, 348, 347, 346, 340, 346, 347, 348, 349, 350, 451, 452, 453, 464, 435, 410, 287, 273, 335, 406, 313, 18, 83, 182, 106, 43, 57, 186, 92, 165, 167, 164, 393, 391, 322, 410, 287, 273, 335, 406, 313, 18, 83, 182, 106, 43, 57, 186, 92, 165, 167, 164, 393, 391, 322, 10],

  // Contour areas (for bronzer)
  CONTOUR_LEFT: [234, 127, 162, 21, 54, 103, 67, 109],
  CONTOUR_RIGHT: [354, 340, 346, 347, 348, 349, 350, 451, 452, 453, 464, 435, 410, 287, 273, 335, 406, 313, 18, 83, 182, 106, 43, 57, 186, 92, 165, 167, 164, 393, 391, 322, 323],

  // Eye sockets (for eyeshadow placement)
  LEFT_EYE_SOCKET: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
  RIGHT_EYE_SOCKET: [362, 398, 384, 385, 386, 387, 388, 466, 263, 374, 380, 381, 382, 373, 374, 398, 300, 293, 334, 296, 336, 285, 295, 282, 283, 276]
};

// Face mesh connections for drawing
export const FACE_MESH_CONNECTIONS = {
  // Face oval connections
  FACE_OVAL: [
    [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389],
    [389, 356], [356, 454], [454, 323], [323, 361], [361, 340], [340, 346],
    [346, 347], [347, 348], [348, 349], [349, 350], [350, 451], [451, 452],
    [452, 453], [453, 464], [464, 435], [435, 410], [410, 287], [287, 273],
    [273, 335], [335, 406], [406, 313], [313, 18], [18, 83], [83, 182],
    [182, 106], [106, 43], [43, 57], [57, 186], [186, 92], [92, 165],
    [165, 167], [167, 164], [164, 393], [393, 391], [391, 322], [322, 10]
  ],

  // Left eye connections
  LEFT_EYE: [
    [33, 7], [7, 163], [163, 144], [144, 145], [145, 153], [153, 154],
    [154, 155], [155, 133], [133, 33]
  ],

  // Right eye connections
  RIGHT_EYE: [
    [362, 398], [398, 384], [384, 385], [385, 386], [386, 387], [387, 388],
    [388, 466], [466, 263], [263, 362]
  ],

  // Lips connections
  LIPS_OUTER: [
    [61, 84], [84, 17], [17, 314], [314, 405], [405, 291], [291, 375],
    [375, 321], [321, 308], [308, 324], [324, 318], [318, 402], [402, 317],
    [317, 14], [14, 87], [87, 178], [178, 88], [88, 95], [95, 78],
    [78, 191], [191, 80], [80, 81], [81, 82], [82, 13], [13, 312],
    [312, 311], [311, 310], [310, 415], [415, 308]
  ],

  // Eyebrow connections
  LEFT_EYEBROW: [
    [70, 63], [63, 105], [105, 66], [66, 107], [107, 55], [55, 65],
    [65, 52], [52, 53], [53, 46], [46, 70]
  ],

  RIGHT_EYEBROW: [
    [300, 293], [293, 334], [334, 296], [296, 336], [336, 285], [285, 295],
    [295, 282], [282, 283], [283, 276], [276, 300]
  ],

  // Nose bridge
  NOSE_BRIDGE: [
    [6, 197], [197, 195], [195, 5], [5, 4], [4, 1], [1, 2], [2, 326], [326, 358]
  ]
};

// Utility functions for landmark calculations
export const landmarkUtils = {
  // Calculate distance between two landmarks
  distance: (landmark1: any, landmark2: any, width: number, height: number): number => {
    const dx = (landmark1.x - landmark2.x) * width;
    const dy = (landmark1.y - landmark2.y) * height;
    return Math.sqrt(dx * dx + dy * dy);
  },

  // Calculate center point of multiple landmarks
  center: (landmarks: any[], width: number, height: number): { x: number; y: number } => {
    const sumX = landmarks.reduce((sum, lm) => sum + lm.x, 0);
    const sumY = landmarks.reduce((sum, lm) => sum + lm.y, 0);
    return {
      x: (sumX / landmarks.length) * width,
      y: (sumY / landmarks.length) * height
    };
  },

  // Calculate angle between three landmarks
  angle: (landmark1: any, landmark2: any, landmark3: any): number => {
    const a = {
      x: landmark1.x - landmark2.x,
      y: landmark1.y - landmark2.y
    };
    const b = {
      x: landmark3.x - landmark2.x,
      y: landmark3.y - landmark2.y
    };
    
    const dot = a.x * b.x + a.y * b.y;
    const det = a.x * b.y - a.y * b.x;
    
    return Math.atan2(det, dot) * (180 / Math.PI);
  },

  // Scale coordinates based on image dimensions
  scaleCoordinates: (landmarks: any[], width: number, height: number): Array<{x: number, y: number, z?: number}> => {
    return landmarks.map(lm => ({
      x: lm.x * width,
      y: lm.y * height,
      z: lm.z ? lm.z * Math.min(width, height) : undefined
    }));
  },

  // Get bounding box of landmark region
  getBoundingBox: (landmarks: any[], width: number, height: number) => {
    const scaled = landmarkUtils.scaleCoordinates(landmarks, width, height);
    const xs = scaled.map(p => p.x);
    const ys = scaled.map(p => p.y);
    
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys)
    };
  }
};
