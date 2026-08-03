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

from .ai_service import AIService, FaceAnalysis, SkinTone, SkinType
from .beauty_fingerprint_service import BeautyProfile, BeautyFingerprintService
from .product_matching_service import ProductVector, ProductMatchingService

logger = logging.getLogger(__name__)

@dataclass
class LightingCondition:
    brightness: float  # 0.0 to 1.0
    color_temperature: float  # 0.0 (cool) to 1.0 (warm)
    shadows: float  # 0.0 to 1.0 (intensity of shadows)
    quality_score: float  # 0.0 to 1.0

@dataclass
class MakeupApplication:
    product_id: str
    product_name: str
    category: str
    color: str
    intensity: float  # 0.0 to 1.0
    placement: Dict[str, float]  # Facial landmark coordinates
    blend_mode: str

@dataclass
class MirrorSession:
    session_id: str
    user_id: str
    lighting_condition: LightingCondition
    face_analysis: FaceAnalysis
    makeup_applications: List[MakeupApplication]
    created_at: str
    updated_at: str

class SmartMirrorService:
    def __init__(self):
        self.ai_service = AIService()
        self.beauty_service = BeautyFingerprintService()
        self.product_service = ProductMatchingService()
        
        # Initialize MediaPipe for face detection and tracking
        # Note: Using fallback approach due to API changes
        self.mp_face_mesh = None
        self.mp_face_detection = None
        
        # Lighting adjustment parameters
        self.lighting_adjustments = {
            "dim": {
                "brightness_boost": 0.3,
                "contrast_reduction": 0.2,
                "color_warmth": 0.1
            },
            "bright": {
                "brightness_reduction": 0.2,
                "contrast_boost": 0.1,
                "color_coolness": 0.1
            },
            "warm": {
                "color_coolness": 0.2,
                "brightness_boost": 0.1
            },
            "cool": {
                "color_warmth": 0.2,
                "contrast_boost": 0.1
            }
        }
        
        # Makeup placement mappings for facial landmarks
        self.landmark_mappings = {
            "foundation": {
                "regions": ["forehead", "cheeks", "nose", "chin", "jawline"],
                "landmark_indices": list(range(10, 17)) + list(range(234, 352))  # Simplified
            },
            "concealer": {
                "regions": ["under_eye", "corners", "blemishes"],
                "landmark_indices": [33, 133, 362, 263]  # Eye corners
            },
            "eyeshadow": {
                "regions": ["eyelid", "crease"],
                "landmark_indices": list(range(362, 398)) + list(range(33, 133))  # Eye area
            },
            "eyeliner": {
                "regions": ["upper_lashline", "lower_lashline"],
                "landmark_indices": [33, 133, 362, 263]  # lash line
            },
            "blush": {
                "regions": ["cheeks"],
                "landmark_indices": [50, 280, 431, 361]  # Cheek points
            },
            "contour": {
                "regions": ["cheekbones", "jawline"],
                "landmark_indices": [50, 280, 172, 397]  # Contour points
            },
            "lipstick": {
                "regions": ["lips"],
                "landmark_indices": list(range(61, 81))  # Lip outline
            }
        }
    
    async def analyze_lighting(self, image_data: bytes) -> LightingCondition:
        """Analyze current lighting conditions"""
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return LightingCondition(0.5, 0.5, 0.5, 0.5)
            
            # Convert to different color spaces for analysis
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            
            # Calculate brightness (using LAB L* channel)
            brightness = np.mean(lab[:, :, 0]) / 100.0  # Normalize to 0-1
            
            # Calculate color temperature (using HSV)
            mean_hue = np.mean(hsv[:, :, 0])
            color_temperature = mean_hue / 180.0  # Normalize to 0-1
            
            # Calculate shadow intensity
            # Use gradient magnitude to detect shadows
            gradients = cv2.Sobel(gray, cv2.CV_64F, 1, 1, ksize=3)
            shadow_intensity = np.std(gradients) / 255.0  # Normalize to 0-1
            
            # Calculate overall lighting quality
            # Good lighting: balanced brightness, low shadows, neutral temperature
            brightness_score = 1.0 - abs(brightness - 0.6)  # Ideal around 0.6
            shadow_score = 1.0 - shadow_intensity  # Lower shadows is better
            temperature_score = 1.0 - abs(color_temperature - 0.5)  # Neutral is better
            
            quality_score = (brightness_score * 0.4 + shadow_score * 0.4 + temperature_score * 0.2)
            
            return LightingCondition(
                brightness=brightness,
                color_temperature=color_temperature,
                shadows=shadow_intensity,
                quality_score=quality_score
            )
            
        except Exception as e:
            print(f"Error analyzing lighting: {e}")
            return LightingCondition(0.5, 0.5, 0.5, 0.5)
    
    async def adjust_makeup_for_lighting(self, makeup_applications: List[MakeupApplication],
                                      lighting: LightingCondition) -> List[MakeupApplication]:
        """Adjust makeup applications based on lighting conditions"""
        adjusted_applications = []
        
        for makeup in makeup_applications:
            adjusted_makeup = MakeupApplication(
                product_id=makeup.product_id,
                product_name=makeup.product_name,
                category=makeup.category,
                color=makeup.color,
                intensity=makeup.intensity,
                placement=makeup.placement,
                blend_mode=makeup.blend_mode
            )
            
            # Adjust intensity based on lighting
            if lighting.brightness < 0.3:  # Dim lighting
                adjusted_makeup.intensity = min(1.0, makeup.intensity * 1.3)
            elif lighting.brightness > 0.8:  # Bright lighting
                adjusted_makeup.intensity = max(0.3, makeup.intensity * 0.8)
            
            # Adjust based on color temperature
            if lighting.color_temperature < 0.3:  # Cool lighting
                # Add warmth to makeup
                adjusted_makeup.color = self._adjust_color_warmth(makeup.color, 0.1)
            elif lighting.color_temperature > 0.7:  # Warm lighting
                # Add coolness to makeup
                adjusted_makeup.color = self._adjust_color_warmth(makeup.color, -0.1)
            
            # Adjust for shadows
            if lighting.shadows > 0.6:  # Harsh shadows
                # Increase coverage in shadowed areas
                if makeup.category in ["foundation", "concealer"]:
                    adjusted_makeup.intensity = min(1.0, makeup.intensity * 1.2)
            
            adjusted_applications.append(adjusted_makeup)
        
        return adjusted_applications
    
    def _adjust_color_warmth(self, color: str, adjustment: float) -> str:
        """Adjust color warmth (simple implementation)"""
        if not color.startswith("#"):
            return color
        
        try:
            # Convert hex to RGB
            rgb = tuple(int(color[i:i+2], 16) for i in (1, 3, 5))
            r, g, b = [x/255.0 for x in rgb]
            
            # Convert to HSV
            import colorsys
            h, s, v = colorsys.rgb_to_hsv(r, g, b)
            
            # Adjust hue (warmth)
            h = (h + adjustment) % 1.0
            
            # Convert back to RGB
            r, g, b = colorsys.hsv_to_rgb(h, s, v)
            
            # Convert back to hex
            new_color = '#{:02x}{:02x}{:02x}'.format(
                int(r*255), int(g*255), int(b*255)
            )
            
            return new_color
            
        except Exception:
            return color
    
    async def apply_makeup_virtual(self, image_data: bytes, 
                                 makeup_applications: List[MakeupApplication],
                                 face_landmarks: List[Tuple[float, float]]) -> bytes:
        """Apply makeup virtually to the image"""
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return image_data
            
            # Create overlay for makeup
            overlay = image.copy()
            
            for makeup in makeup_applications:
                overlay = await self._apply_single_makeup(
                    image, overlay, makeup, face_landmarks
                )
            
            # Blend overlay with original image
            alpha = 0.7  # Transparency factor
            result = cv2.addWeighted(overlay, alpha, image, 1 - alpha, 0)
            
            # Convert back to bytes
            _, buffer = cv2.imencode('.jpg', result)
            return buffer.tobytes()
            
        except Exception as e:
            print(f"Error applying virtual makeup: {e}")
            return image_data
    
    async def _apply_single_makeup(self, original_image: np.ndarray, 
                                 overlay: np.ndarray,
                                 makeup: MakeupApplication,
                                 landmarks: List[Tuple[float, float]]) -> np.ndarray:
        """Apply a single makeup product to the overlay"""
        try:
            h, w = overlay.shape[:2]
            
            # Get landmark mapping for this makeup category
            mapping = self.landmark_mappings.get(makeup.category, {})
            landmark_indices = mapping.get("landmark_indices", [])
            
            if not landmark_indices or not landmarks:
                return overlay
            
            # Convert normalized landmarks to pixel coordinates
            pixel_landmarks = []
            for idx in landmark_indices:
                if idx < len(landmarks):
                    x, y = landmarks[idx]
                    pixel_landmarks.append((int(x * w), int(y * h)))
            
            # Apply makeup based on category
            if makeup.category == "foundation":
                overlay = self._apply_foundation(overlay, pixel_landmarks, makeup)
            elif makeup.category == "concealer":
                overlay = self._apply_concealer(overlay, pixel_landmarks, makeup)
            elif makeup.category == "eyeshadow":
                overlay = self._apply_eyeshadow(overlay, pixel_landmarks, makeup)
            elif makeup.category == "eyeliner":
                overlay = self._apply_eyeliner(overlay, pixel_landmarks, makeup)
            elif makeup.category == "blush":
                overlay = self._apply_blush(overlay, pixel_landmarks, makeup)
            elif makeup.category == "lipstick":
                overlay = self._apply_lipstick(overlay, pixel_landmarks, makeup)
            
            return overlay
            
        except Exception as e:
            print(f"Error applying {makeup.category}: {e}")
            return overlay
    
    def _apply_foundation(self, overlay: np.ndarray, landmarks: List[Tuple[int, int]], 
                         makeup: MakeupApplication) -> np.ndarray:
        """Apply foundation to the face"""
        if len(landmarks) < 4:
            return overlay
        
        # Create face mask using landmarks
        mask = np.zeros(overlay.shape[:2], dtype=np.uint8)
        
        # Create convex hull of face landmarks
        landmarks_array = np.array(landmarks)
        hull = cv2.convexHull(landmarks_array)
        cv2.fillPoly(mask, [hull], 255)
        
        # Apply color with intensity
        color = self._hex_to_bgr(makeup.color)
        overlay[mask > 0] = cv2.addWeighted(
            overlay[mask > 0], 1 - makeup.intensity,
            np.full_like(overlay[mask > 0], color), makeup.intensity, 0
        )
        
        return overlay
    
    def _apply_concealer(self, overlay: np.ndarray, landmarks: List[Tuple[int, int]], 
                        makeup: MakeupApplication) -> np.ndarray:
        """Apply concealer to specific areas"""
        color = self._hex_to_bgr(makeup.color)
        
        for landmark in landmarks:
            # Apply small circles around each landmark
            cv2.circle(overlay, landmark, 15, color, -1)
        
        return overlay
    
    def _apply_eyeshadow(self, overlay: np.ndarray, landmarks: List[Tuple[int, int]], 
                        makeup: MakeupApplication) -> np.ndarray:
        """Apply eyeshadow to eye area"""
        if len(landmarks) < 4:
            return overlay
        
        color = self._hex_to_bgr(makeup.color)
        
        # Create eye region mask
        mask = np.zeros(overlay.shape[:2], dtype=np.uint8)
        
        # Group landmarks into left and right eye
        mid_point = len(landmarks) // 2
        left_eye = landmarks[:mid_point]
        right_eye = landmarks[mid_point:]
        
        # Apply eyeshadow to each eye
        for eye_landmarks in [left_eye, right_eye]:
            if len(eye_landmarks) >= 3:
                eye_array = np.array(eye_landmarks)
                hull = cv2.convexHull(eye_array)
                cv2.fillPoly(mask, [hull], 255)
        
        # Blend color
        overlay[mask > 0] = cv2.addWeighted(
            overlay[mask > 0], 1 - makeup.intensity,
            np.full_like(overlay[mask > 0], color), makeup.intensity, 0
        )
        
        return overlay
    
    def _apply_eyeliner(self, overlay: np.ndarray, landmarks: List[Tuple[int, int]], 
                       makeup: MakeupApplication) -> np.ndarray:
        """Apply eyeliner"""
        color = self._hex_to_bgr(makeup.color)
        
        # Draw lines along eyelash line
        if len(landmarks) >= 2:
            for i in range(len(landmarks) - 1):
                cv2.line(overlay, landmarks[i], landmarks[i + 1], color, 2)
        
        return overlay
    
    def _apply_blush(self, overlay: np.ndarray, landmarks: List[Tuple[int, int]], 
                    makeup: MakeupApplication) -> np.ndarray:
        """Apply blush to cheeks"""
        color = self._hex_to_bgr(makeup.color)
        
        for landmark in landmarks:
            # Apply circular blush
            cv2.circle(overlay, landmark, 30, color, -1)
        
        return overlay
    
    def _apply_lipstick(self, overlay: np.ndarray, landmarks: List[Tuple[int, int]], 
                       makeup: MakeupApplication) -> np.ndarray:
        """Apply lipstick to lips"""
        if len(landmarks) < 3:
            return overlay
        
        color = self._hex_to_bgr(makeup.color)
        
        # Create lip mask
        mask = np.zeros(overlay.shape[:2], dtype=np.uint8)
        landmarks_array = np.array(landmarks)
        hull = cv2.convexHull(landmarks_array)
        cv2.fillPoly(mask, [hull], 255)
        
        # Apply color
        overlay[mask > 0] = cv2.addWeighted(
            overlay[mask > 0], 1 - makeup.intensity,
            np.full_like(overlay[mask > 0], color), makeup.intensity, 0
        )
        
        return overlay
    
    def _hex_to_bgr(self, hex_color: str) -> Tuple[int, int, int]:
        """Convert hex color to BGR tuple"""
        if not hex_color.startswith("#"):
            return (0, 0, 0)
        
        try:
            hex_color = hex_color.lstrip('#')
            rgb = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
            return (rgb[2], rgb[1], rgb[0])  # Convert RGB to BGR
        except Exception:
            return (0, 0, 0)
    
    async def create_mirror_session(self, user_id: str, image_data: bytes) -> MirrorSession:
        """Create a new smart mirror session"""
        # Analyze face
        face_analysis = await self.ai_service.analyze_face(image_data)
        
        # Analyze lighting
        lighting = await self.analyze_lighting(image_data)
        
        # Create session
        session = MirrorSession(
            session_id=f"session_{user_id}_{datetime.utcnow().timestamp()}",
            user_id=user_id,
            lighting_condition=lighting,
            face_analysis=face_analysis,
            makeup_applications=[],
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat()
        )
        
        return session
    
    async def update_session_with_makeup(self, session: MirrorSession,
                                       makeup_applications: List[MakeupApplication]) -> MirrorSession:
        """Update session with new makeup applications"""
        # Adjust makeup for lighting
        adjusted_applications = await self.adjust_makeup_for_lighting(
            makeup_applications, session.lighting_condition
        )
        
        # Update session
        session.makeup_applications = adjusted_applications
        session.updated_at = datetime.utcnow().isoformat()
        
        return session
    
    async def render_mirror_output(self, session: MirrorSession, 
                                  image_data: bytes) -> bytes:
        """Render final mirror output with makeup applied"""
        # Get face landmarks
        face_mesh_result = self.face_mesh.process(cv2.cvtColor(
            cv2.imdecode(np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR),
            cv2.COLOR_BGR2RGB
        ))
        
        landmarks = []
        if face_mesh_result.multi_face_landmarks:
            for face_landmarks in face_mesh_result.multi_face_landmarks:
                for landmark in face_landmarks.landmark:
                    landmarks.append((landmark.x, landmark.y))
        
        # Apply makeup
        result_image = await self.apply_makeup_virtual(
            image_data, session.makeup_applications, landmarks
        )
        
        return result_image

# Global service instance
smart_mirror_service = SmartMirrorService()
