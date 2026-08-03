# ==============================================================================
# ZERO-TRUST AI:
# This service processes user media strictly in-memory.
# No raw biometric data is stored or persisted.
# ==============================================================================

import cv2
import mediapipe as mp
import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import logging
import asyncio
from PIL import Image
import io
import base64

logger = logging.getLogger(__name__)

class SkinTone(Enum):
    VERY_FAIR = "very_fair"
    FAIR = "fair"
    MEDIUM = "medium"
    TAN = "tan"
    DARK = "dark"
    VERY_DARK = "very_dark"

class SkinType(Enum):
    NORMAL = "normal"
    DRY = "dry"
    OILY = "oily"
    COMBINATION = "combination"
    SENSITIVE = "sensitive"

@dataclass
class FaceAnalysis:
    face_detected: bool
    confidence: float
    landmarks: List[Tuple[float, float]]
    skin_tone: SkinTone
    skin_type: SkinType
    face_shape: str
    skin_concerns: List[str]
    lighting_quality: float

@dataclass
class BeautyFingerprint:
    user_id: str
    skin_tone: SkinTone
    skin_type: SkinType
    face_shape: str
    color_palette: List[str]
    style_preferences: Dict[str, float]
    product_affinity: Dict[str, float]
    created_at: str

class AIService:
    def __init__(self):
        # Initialize MediaPipe models using new API
        # Note: FaceLandmarker requires model file, using placeholder
        self.face_landmarker = None  # Will be initialized on demand
        
        # Initialize basic OpenCV face detection as fallback
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    async def analyze_face(self, image_data: bytes) -> FaceAnalysis:
        """Analyze face using MediaPipe for landmarks and features"""
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return FaceAnalysis(
                    face_detected=False,
                    confidence=0.0,
                    landmarks=[],
                    skin_tone=SkinTone.MEDIUM,
                    skin_type=SkinType.NORMAL,
                    face_shape="unknown",
                    skin_concerns=[],
                    lighting_quality=0.0
                )
            
            # Convert to RGB for MediaPipe
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Face detection
            results_detection = self.face_detection.process(rgb_image)
            
            if not results_detection.detections:
                return FaceAnalysis(
                    face_detected=False,
                    confidence=0.0,
                    landmarks=[],
                    skin_tone=SkinTone.MEDIUM,
                    skin_type=SkinType.NORMAL,
                    face_shape="unknown",
                    skin_concerns=[],
                    lighting_quality=0.0
                )
            
            # Get face mesh for detailed analysis
            results_mesh = self.face_mesh.process(rgb_image)
            
            # Extract landmarks
            landmarks = []
            if results_mesh.multi_face_landmarks:
                for face_landmarks in results_mesh.multi_face_landmarks:
                    for landmark in face_landmarks.landmark:
                        landmarks.append((landmark.x, landmark.y))
            
            # Analyze skin tone from face region
            skin_tone = await self._analyze_skin_tone(image, results_detection.detections[0])
            
            # Analyze skin type based on texture and oiliness indicators
            skin_type = await self._analyze_skin_type(image, landmarks)
            
            # Determine face shape
            face_shape = await self._determine_face_shape(landmarks)
            
            # Detect skin concerns
            skin_concerns = await self._detect_skin_concerns(image, landmarks)
            
            # Assess lighting quality
            lighting_quality = await self._assess_lighting_quality(image)
            
            confidence = results_detection.detections[0].score[0]
            
            return FaceAnalysis(
                face_detected=True,
                confidence=confidence,
                landmarks=landmarks,
                skin_tone=skin_tone,
                skin_type=skin_type,
                face_shape=face_shape,
                skin_concerns=skin_concerns,
                lighting_quality=lighting_quality
            )
            
        except Exception as e:
            print(f"Error in face analysis: {e}")
            return FaceAnalysis(
                face_detected=False,
                confidence=0.0,
                landmarks=[],
                skin_tone=SkinTone.MEDIUM,
                skin_type=SkinType.NORMAL,
                face_shape="unknown",
                skin_concerns=[],
                lighting_quality=0.0
            )
    
    async def _analyze_skin_tone(self, image: np.ndarray, detection) -> SkinTone:
        """Analyze skin tone from face region"""
        try:
            h, w = image.shape[:2]
            
            # Get face bounding box
            bbox = detection.location_data.relative_bounding_box
            x1 = int(bbox.xmin * w)
            y1 = int(bbox.ymin * h)
            x2 = int((bbox.xmin + bbox.width) * w)
            y2 = int((bbox.ymin + bbox.height) * h)
            
            # Extract face region (avoid eyes and mouth for better skin analysis)
            face_region = image[y1+int((y2-y1)*0.2):y2-int((y2-y1)*0.3), 
                               x1+int((x2-x1)*0.1):x2-int((x2-x1)*0.1)]
            
            # Convert to different color spaces
            hsv = cv2.cvtColor(face_region, cv2.COLOR_BGR2HSV)
            lab = cv2.cvtColor(face_region, cv2.COLOR_BGR2LAB)
            
            # Calculate average values
            avg_hsv = np.mean(hsv, axis=(0, 1))
            avg_lab = np.mean(lab, axis=(0, 1))
            
            # Skin tone classification based on color values
            # Using LAB L* channel for lightness
            lightness = avg_lab[0]
            
            if lightness < 30:
                return SkinTone.VERY_DARK
            elif lightness < 45:
                return SkinTone.DARK
            elif lightness < 60:
                return SkinTone.TAN
            elif lightness < 75:
                return SkinTone.MEDIUM
            elif lightness < 85:
                return SkinTone.FAIR
            else:
                return SkinTone.VERY_FAIR
                
        except Exception as e:
            print(f"Error analyzing skin tone: {e}")
            return SkinTone.MEDIUM
    
    async def _analyze_skin_type(self, image: np.ndarray, landmarks: List[Tuple[float, float]]) -> SkinType:
        """Analyze skin type based on texture and other indicators"""
        try:
            if not landmarks:
                return SkinType.NORMAL
            
            # Convert to grayscale for texture analysis
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Calculate texture variance in different face regions
            h, w = gray.shape
            
            # T-zone (forehead, nose, chin) - typically oily for combination skin
            forehead_x1, forehead_y1 = int(w * 0.3), int(h * 0.1)
            forehead_x2, forehead_y2 = int(w * 0.7), int(h * 0.3)
            
            nose_x1, nose_y1 = int(w * 0.45), int(h * 0.3)
            nose_x2, nose_y2 = int(w * 0.55), int(h * 0.6)
            
            cheek_x1, cheek_y1 = int(w * 0.1), int(h * 0.4)
            cheek_x2, cheek_y2 = int(w * 0.3), int(h * 0.6)
            
            # Calculate variance in each region
            forehead_var = np.var(gray[forehead_y1:forehead_y2, forehead_x1:forehead_x2])
            nose_var = np.var(gray[nose_y1:nose_y2, nose_x1:nose_x2])
            cheek_var = np.var(gray[cheek_y1:cheek_y2, cheek_x1:cheek_x2])
            
            # Analyze skin type based on texture patterns
            t_zone_avg = (forehead_var + nose_var) / 2
            cheek_avg = cheek_var
            
            # Simple heuristic for skin type
            if t_zone_avg > cheek_avg * 1.5:
                return SkinType.COMBINATION
            elif t_zone_avg > 1000:
                return SkinType.OILY
            elif t_zone_avg < 200:
                return SkinType.DRY
            else:
                return SkinType.NORMAL
                
        except Exception as e:
            print(f"Error analyzing skin type: {e}")
            return SkinType.NORMAL
    
    async def _determine_face_shape(self, landmarks: List[Tuple[float, float]]) -> str:
        """Determine face shape from facial landmarks"""
        try:
            if len(landmarks) < 468:  # MediaPipe face mesh has 468 landmarks
                return "unknown"
            
            # Key landmark indices for face shape analysis
            # These are approximate indices for MediaPipe face mesh
            jawline_points = [landmarks[i] for i in range(0, 17)]  # Simplified
            cheekbone_points = [landmarks[i] for i in range(50, 70)]  # Simplified
            forehead_points = [landmarks[i] for i in range(70, 90)]  # Simplified
            
            if not jawline_points or not cheekbone_points:
                return "unknown"
            
            # Calculate face width and height ratios
            jaw_width = max([p[0] for p in jawline_points]) - min([p[0] for p in jawline_points])
            cheekbone_width = max([p[0] for p in cheekbone_points]) - min([p[0] for p in cheekbone_points])
            face_height = max([p[1] for p in landmarks]) - min([p[1] for p in landmarks])
            
            width_to_height = jaw_width / face_height if face_height > 0 else 0
            
            # Simple face shape classification
            if width_to_height > 0.8:
                if abs(jaw_width - cheekbone_width) < 0.1:
                    return "round"
                else:
                    return "square"
            elif width_to_height < 0.6:
                return "oval"
            else:
                return "heart"
                
        except Exception as e:
            print(f"Error determining face shape: {e}")
            return "unknown"
    
    async def _detect_skin_concerns(self, image: np.ndarray, landmarks: List[Tuple[float, float]]) -> List[str]:
        """Detect common skin concerns"""
        concerns = []
        
        try:
            # Convert to different color spaces for analysis
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            
            # Acne detection (red spots)
            lower_red = np.array([0, 50, 50])
            upper_red = np.array([10, 255, 255])
            red_mask = cv2.inRange(hsv, lower_red, upper_red)
            red_pixels = np.sum(red_mask > 0)
            
            if red_pixels > 1000:
                concerns.append("acne")
            
            # Dark spots detection
            # Simple thresholding for dark areas
            _, dark_mask = cv2.threshold(gray, 50, 255, cv2.THRESH_BINARY_INV)
            dark_pixels = np.sum(dark_mask > 0)
            
            if dark_pixels > 500:
                concerns.append("dark_spots")
            
            # Uneven skin tone detection
            hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
            hist_std = np.std(hist)
            
            if hist_std > 50:
                concerns.append("uneven_tone")
            
            # Fine lines/wrinkles (edge detection)
            edges = cv2.Canny(gray, 50, 150)
            edge_pixels = np.sum(edges > 0)
            
            if edge_pixels > 2000:
                concerns.append("fine_lines")
                
        except Exception as e:
            print(f"Error detecting skin concerns: {e}")
        
        return concerns
    
    async def _assess_lighting_quality(self, image: np.ndarray) -> float:
        """Assess lighting quality (0.0 to 1.0)"""
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Calculate brightness and contrast
            brightness = np.mean(gray)
            contrast = np.std(gray)
            
            # Ideal brightness around 128, good contrast > 30
            brightness_score = 1.0 - abs(brightness - 128) / 128
            contrast_score = min(contrast / 50, 1.0)
            
            # Check for harsh shadows (high gradient)
            gradients = cv2.Sobel(gray, cv2.CV_64F, 1, 1, ksize=3)
            shadow_score = 1.0 - min(np.std(gradients) / 100, 1.0)
            
            # Combined score
            overall_score = (brightness_score * 0.4 + contrast_score * 0.3 + shadow_score * 0.3)
            
            return max(0.0, min(1.0, overall_score))
            
        except Exception as e:
            print(f"Error assessing lighting: {e}")
            return 0.5

# Global AI service instance
ai_service = AIService()
