# ==============================================================================
# ZERO-TRUST AI:
# This service processes user media strictly in-memory.
# No raw biometric data is stored or persisted.
# ==============================================================================

import asyncio
import json
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass
import numpy as np
import logging

from .ai_service import AIService, FaceAnalysis, SkinTone, SkinType

logger = logging.getLogger(__name__)

@dataclass
class BeautyProfile:
    user_id: str
    skin_tone: SkinTone
    skin_type: SkinType
    face_shape: str
    color_palette: List[str]
    style_preferences: Dict[str, float]
    product_affinity: Dict[str, float]
    skin_concerns: List[str]
    melanin_index: float
    symmetry_score: float
    color_variance: float
    created_at: str
    updated_at: str

class BeautyFingerprintService:
    def __init__(self):
        self.ai_service = AIService()
        
        # Color mapping for different skin tones
        self.skin_tone_colors = {
            SkinTone.VERY_FAIR: ["#FDBCB4", "#F5DEB3", "#FFE4C4", "#FFDAB9"],
            SkinTone.FAIR: ["#F0E68C", "#E6E6FA", "#DDA0DD", "#D8BFD8"],
            SkinTone.MEDIUM: ["#DEB887", "#D2691E", "#BC8F8F", "#F4A460"],
            SkinTone.TAN: ["#CD853F", "#D2691E", "#A0522D", "#8B4513"],
            SkinTone.DARK: ["#8B4513", "#654321", "#5D4E37", "#3E2723"],
            SkinTone.VERY_DARK: ["#3E2723", "#2E1A17", "#1A0E0A", "#0D0502"]
        }
        
        # Product category weights for different skin types
        self.skin_type_preferences = {
            "normal": {
                "foundation": 0.9,
                "lipstick": 0.8,
                "eyeshadow": 0.7,
                "blush": 0.6,
                "mascara": 0.8
            },
            "dry": {
                "foundation": 0.8,
                "lipstick": 0.7,
                "eyeshadow": 0.6,
                "blush": 0.5,
                "mascara": 0.7,
                "moisturizer": 0.9,
                "primer": 0.8
            },
            "oily": {
                "foundation": 0.7,
                "lipstick": 0.8,
                "eyeshadow": 0.7,
                "blush": 0.6,
                "mascara": 0.8,
                "powder": 0.9,
                "primer": 0.8
            },
            "combination": {
                "foundation": 0.8,
                "lipstick": 0.8,
                "eyeshadow": 0.7,
                "blush": 0.6,
                "mascara": 0.8,
                "primer": 0.7
            },
            "sensitive": {
                "foundation": 0.6,
                "lipstick": 0.7,
                "eyeshadow": 0.5,
                "blush": 0.5,
                "mascara": 0.7,
                "moisturizer": 0.9,
                "primer": 0.8
            }
        }
    
    async def generate_fingerprint(self, user_id: str, image_data: bytes, 
                                 preferences: Optional[Dict] = None) -> BeautyProfile:
        """Generate beauty fingerprint from face analysis"""
        
        # Analyze face using AI service
        face_analysis = await self.ai_service.analyze_face(image_data)
        
        if not face_analysis.face_detected:
            raise ValueError("No face detected in the provided image")
        
        # Generate color palette based on skin tone
        color_palette = self._generate_color_palette(face_analysis.skin_tone)
        
        # Generate style preferences
        style_preferences = self._generate_style_preferences(face_analysis, preferences)
        
        # Generate product affinity scores
        product_affinity = self._generate_product_affinity(face_analysis)
        
        # Create beauty profile
        profile = BeautyProfile(
            user_id=user_id,
            skin_tone=face_analysis.skin_tone,
            skin_type=face_analysis.skin_type,
            face_shape=face_analysis.face_shape,
            color_palette=color_palette,
            style_preferences=style_preferences,
            product_affinity=product_affinity,
            skin_concerns=face_analysis.skin_concerns,
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat()
        )
        
        return profile
    
    def _generate_color_palette(self, skin_tone: SkinTone) -> List[str]:
        """Generate color palette based on skin tone"""
        base_colors = self.skin_tone_colors.get(skin_tone, self.skin_tone_colors[SkinTone.MEDIUM])
        
        # Add complementary colors
        complementary_colors = []
        for color in base_colors[:2]:  # Take first 2 base colors
            # Simple complementary color generation (invert hue)
            if color.startswith('#'):
                rgb = tuple(int(color[i:i+2], 16) for i in (1, 3, 5))
                # Convert to HSV, invert hue, convert back
                import colorsys
                r, g, b = [x/255.0 for x in rgb]
                h, s, v = colorsys.rgb_to_hsv(r, g, b)
                h = (h + 0.5) % 1.0  # Invert hue
                r, g, b = colorsys.hsv_to_rgb(h, s, v)
                comp_color = '#{:02x}{:02x}{:02x}'.format(int(r*255), int(g*255), int(b*255))
                complementary_colors.append(comp_color)
        
        return base_colors + complementary_colors
    
    def _generate_style_preferences(self, face_analysis: FaceAnalysis, 
                                  user_preferences: Optional[Dict] = None) -> Dict[str, float]:
        """Generate style preferences based on face analysis and user input"""
        preferences = {}
        
        # Face shape based preferences
        face_shape_preferences = {
            "round": {
                "contouring": 0.8,
                "highlighting": 0.7,
                "bold_lips": 0.6,
                "winged_eyeliner": 0.7
            },
            "square": {
                "softening": 0.9,
                "contouring": 0.8,
                "rounded_eyebrows": 0.7,
                "soft_lips": 0.6
            },
            "oval": {
                "balanced": 0.9,
                "natural": 0.8,
                "versatile": 0.9,
                "classic": 0.7
            },
            "heart": {
                "softening_jawline": 0.8,
                "bold_eyes": 0.7,
                "natural_lips": 0.6,
                "highlighting": 0.8
            }
        }
        
        shape_prefs = face_shape_preferences.get(face_analysis.face_shape, {})
        preferences.update(shape_prefs)
        
        # Skin type based preferences
        skin_type_key = face_analysis.skin_type.value
        type_prefs = self.skin_type_preferences.get(skin_type_key, {})
        
        for category, weight in type_prefs.items():
            preferences[f"product_{category}"] = weight
        
        # Skin concerns based preferences
        concern_preferences = {
            "acne": {
                "full_coverage": 0.8,
                "matte_finish": 0.7,
                "non_comedogenic": 0.9
            },
            "dark_spots": {
                "full_coverage": 0.7,
                "concealer": 0.9,
                "brightening": 0.8
            },
            "uneven_tone": {
                "primer": 0.8,
                "color_corrector": 0.7,
                "full_coverage": 0.6
            },
            "fine_lines": {
                "hydrating": 0.9,
                "luminous": 0.7,
                "primer": 0.8
            }
        }
        
        for concern in face_analysis.skin_concerns:
            concern_prefs = concern_preferences.get(concern, {})
            for pref, weight in concern_prefs.items():
                preferences[f"concern_{pref}"] = weight
        
        # Override with user preferences if provided
        if user_preferences:
            for key, value in user_preferences.items():
                if isinstance(value, (int, float)) and 0 <= value <= 1:
                    preferences[key] = value
        
        return preferences
    
    def _generate_product_affinity(self, face_analysis: FaceAnalysis) -> Dict[str, float]:
        """Generate product affinity scores based on face analysis"""
        affinity = {}
        
        # Base affinity by skin type
        skin_type_key = face_analysis.skin_type.value
        base_affinity = self.skin_type_preferences.get(skin_type_key, {})
        
        # Adjust based on skin tone
        tone_adjustments = {
            SkinTone.VERY_FAIR: {"foundation": 0.9, "blush": 0.8, "bronzer": 0.3},
            SkinTone.FAIR: {"foundation": 0.9, "blush": 0.8, "bronzer": 0.4},
            SkinTone.MEDIUM: {"foundation": 0.8, "blush": 0.7, "bronzer": 0.7},
            SkinTone.TAN: {"foundation": 0.8, "blush": 0.6, "bronzer": 0.9},
            SkinTone.DARK: {"foundation": 0.7, "blush": 0.5, "bronzer": 0.9},
            SkinTone.VERY_DARK: {"foundation": 0.7, "blush": 0.4, "bronzer": 0.8}
        }
        
        tone_adj = tone_adjustments.get(face_analysis.skin_tone, {})
        
        # Combine base affinity with tone adjustments
        for category, base_score in base_affinity.items():
            tone_score = tone_adj.get(category, 0.5)
            affinity[category] = (base_score + tone_score) / 2
        
        # Add concern-specific product affinity
        concern_products = {
            "acne": {"spot_treatment": 0.9, "salicylic_acid": 0.8, "oil_free": 0.8},
            "dark_spots": {"vitamin_c": 0.9, "brightening": 0.8, "spf": 0.7},
            "uneven_tone": {"primer": 0.8, "color_corrector": 0.7, "foundation": 0.6},
            "fine_lines": {"retinol": 0.9, "hyaluronic_acid": 0.8, "moisturizer": 0.7}
        }
        
        for concern in face_analysis.skin_concerns:
            concern_prod = concern_products.get(concern, {})
            for product, score in concern_prod.items():
                if product in affinity:
                    affinity[product] = (affinity[product] + score) / 2
                else:
                    affinity[product] = score
        
        return affinity
    
    async def update_fingerprint(self, user_id: str, new_image_data: bytes, 
                               interaction_data: Optional[Dict] = None) -> BeautyProfile:
        """Update existing fingerprint with new analysis and interaction data"""
        
        # Generate new fingerprint
        new_profile = await self.generate_fingerprint(user_id, new_image_data)
        
        # TODO: Load existing profile from database and merge with interaction data
        # For now, return the new profile
        return new_profile
    
    async def get_user_profile(self, user_id: str) -> BeautyProfile:
        """Get user profile from database or return default"""
        # TODO: Load from database
        # For now, return a default profile
        return BeautyProfile(
            user_id=user_id,
            face_shape="oval",
            skin_tone=SkinTone.MEDIUM,
            skin_type=SkinType.NORMAL,
            melanin_index=0.5,
            symmetry_score=0.8,
            color_variance=0.3,
            skin_concerns=[],
            color_palette=["#FF6B6B", "#4ECDC4", "#45B7D1"],
            style_preferences={"natural": 0.8, "bold": 0.2},
            product_affinity={"foundation": 0.7, "lipstick": 0.6},
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        )
    
    def calculate_match_score(self, profile: BeautyProfile, product_data: Dict) -> float:
        """Calculate match score between user profile and product"""
        score = 0.0
        max_score = 0.0
        
        # Product category match
        product_category = product_data.get("category", "").lower()
        if f"product_{product_category}" in profile.product_affinity:
            score += profile.product_affinity[f"product_{product_category}"] * 0.3
        max_score += 0.3
        
        # Skin tone compatibility
        product_tones = product_data.get("skin_tones", [])
        if profile.skin_tone.value in product_tones or not product_tones:
            score += 0.2
        max_score += 0.2
        
        # Skin type compatibility
        product_types = product_data.get("skin_types", [])
        if profile.skin_type.value in product_types or not product_types:
            score += 0.2
        max_score += 0.2
        
        # Concern matching
        product_concerns = product_data.get("addresses_concerns", [])
        concern_matches = len(set(profile.skin_concerns) & set(product_concerns))
        if profile.skin_concerns:
            score += (concern_matches / len(profile.skin_concerns)) * 0.2
        max_score += 0.2
        
        # Color compatibility
        product_colors = product_data.get("color_palette", [])
        color_matches = len(set(profile.color_palette) & set(product_colors))
        if product_colors:
            score += (color_matches / len(product_colors)) * 0.1
        max_score += 0.1
        
        return score / max_score if max_score > 0 else 0.0

    async def log_behavior_event(self, user_id: str, event_type: str, entity_type: str, entity_id: str, context: Dict = None, metadata: Dict = None) -> str:
        """Log user behavior event for ML training data collection"""
        import uuid
        event_id = str(uuid.uuid4())
        
        # TODO: Store in database
        # For now, just log the event
        logger.info(f"Behavior event: {event_id} - {event_type} on {entity_type}:{entity_id} by {user_id}")
        
        return event_id

# Global service instance
beauty_fingerprint_service = BeautyFingerprintService()
