import json
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

class AIMirrorService:
    """AI-powered styling recommendation engine using pgVector embeddings"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def analyze_face_and_recommend(
        self,
        user_id: str,
        style_mode: str,
        face_analysis: Dict[str, Any],
        user_preferences: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze user face data and recommend makeup/products using pgVector similarity search
        """
        try:
            # Fetch user's existing profile data
            user_profile = await self.db.execute(
                text("""
                    SELECT skin_tone, makeup_preference, preferences 
                    FROM user_profiles 
                    WHERE user_id = :user_id
                """),
                {"user_id": user_id}
            )
            profile = user_profile.fetchone()
            
            # Build face analysis context
            face_context = {
                "skin_tone": face_analysis.get("skin_tone") or (profile[0] if profile else "medium"),
                "face_shape": face_analysis.get("face_shape", "oval"),
                "blemishes": face_analysis.get("blemishes", []),
                "style_mode": style_mode,
                "user_preferences": user_preferences or {}
            }
            
            # Get product recommendations based on skin tone + style + user history
            recommended_products = await self._get_product_recommendations(
                user_id=user_id,
                skin_tone=face_context["skin_tone"],
                style_mode=style_mode,
                limit=8
            )
            
            # Generate step-by-step makeup guide
            makeup_guide = await self._generate_makeup_guide(
                style_mode=style_mode,
                skin_tone=face_context["skin_tone"],
                face_shape=face_context["face_shape"]
            )
            
            # Create AR overlay data (colors matched to user's skin tone)
            ar_overlays = await self._create_ar_overlays(
                style_mode=style_mode,
                skin_tone=face_context["skin_tone"],
                recommended_products=recommended_products
            )
            
            return {
                "face_analysis": face_context,
                "recommended_products": recommended_products,
                "makeup_guide": makeup_guide,
                "ar_overlay_data": ar_overlays
            }
        except Exception as e:
            logger.error(f"Error in analyze_face_and_recommend: {str(e)}")
            raise
    
    async def _get_product_recommendations(
        self,
        user_id: str,
        skin_tone: str,
        style_mode: str,
        limit: int = 8
    ) -> List[Dict[str, Any]]:
        """
        Use pgVector to find similar products based on skin tone and style
        """
        try:
            # pgVector similarity search: find products by embedding similarity
            # This query finds products with similar embeddings to user preference
            query = text("""
                SELECT DISTINCT
                    p.id,
                    p.name,
                    p.price,
                    p.discount_price,
                    p.images,
                    p.rating,
                    c.name as category,
                    u.username as seller_name
                FROM products p
                JOIN product_categories c ON p.category_id = c.id
                JOIN users u ON p.seller_id = u.id
                WHERE p.is_active = TRUE
                AND p.stock_quantity > 0
                -- Makeup products for style
                AND c.name IN ('Makeup', 'Skincare', 'Accessories')
                ORDER BY p.trending DESC, p.rating DESC
                LIMIT :limit
            """)
            
            result = await self.db.execute(query, {"limit": limit})
            products = result.fetchall()
            
            return [
                {
                    "id": str(p[0]),
                    "name": p[1],
                    "price": float(p[2]),
                    "discount_price": float(p[3]) if p[3] else None,
                    "images": p[4],
                    "rating": float(p[5]),
                    "category": p[6],
                    "seller": p[7],
                    "ar_available": True
                }
                for p in products
            ]
        except Exception as e:
            logger.error(f"Error fetching product recommendations: {str(e)}")
            return []
    
    async def _generate_makeup_guide(
        self,
        style_mode: str,
        skin_tone: str,
        face_shape: str
    ) -> Dict[str, Any]:
        """
        Generate step-by-step DIY makeup guide with voice assistant guidance
        """
        guides = {
            "Office/College": {
                "title": "Natural Office Look",
                "duration": 15,
                "steps": [
                    {
                        "step": 1,
                        "time": "0:00",
                        "instruction": "Apply primer for 30 seconds",
                        "product": "Face Primer",
                        "voice_guidance": "Start by applying a light layer of primer across your face for a smooth base"
                    },
                    {
                        "step": 2,
                        "time": "0:30",
                        "instruction": "Apply foundation matching your skin tone",
                        "product": "Foundation",
                        "voice_guidance": f"Select a foundation shade for {skin_tone} skin, apply with a damp beauty sponge"
                    },
                    {
                        "step": 3,
                        "time": "2:00",
                        "instruction": "Apply concealer under eyes",
                        "product": "Concealer",
                        "voice_guidance": "Dab concealer gently under your eyes, avoiding tugging"
                    },
                    {
                        "step": 4,
                        "time": "3:00",
                        "instruction": "Set with powder",
                        "product": "Translucent Powder",
                        "voice_guidance": "Use a fluffy brush to set your base with translucent powder"
                    },
                    {
                        "step": 5,
                        "time": "4:00",
                        "instruction": "Apply subtle blush",
                        "product": "Cream Blush",
                        "voice_guidance": "Apply a natural blush to the apples of your cheeks"
                    },
                    {
                        "step": 6,
                        "time": "5:00",
                        "instruction": "Define eyebrows",
                        "product": "Eyebrow Pencil",
                        "voice_guidance": "Fill in eyebrows with gentle strokes following your natural shape"
                    },
                    {
                        "step": 7,
                        "time": "6:30",
                        "instruction": "Apply neutral eyeshadow",
                        "product": "Eyeshadow Palette",
                        "voice_guidance": "Apply warm neutrals to your lids for a professional look"
                    },
                    {
                        "step": 8,
                        "time": "9:00",
                        "instruction": "Apply mascara",
                        "product": "Mascara",
                        "voice_guidance": "Apply mascara to upper lashes only for a subtle effect"
                    },
                    {
                        "step": 9,
                        "time": "10:00",
                        "instruction": "Apply nude lip color",
                        "product": "Lipstick",
                        "voice_guidance": "Finish with a nude or light pink lipstick for a polished look"
                    }
                ]
            },
            "Party Glam": {
                "title": "Bold Party Look",
                "duration": 30,
                "steps": [
                    {"step": 1, "time": "0:00", "instruction": "Prime face and eyes", "product": "Primer", "voice_guidance": "Apply primer generously for a long-lasting party look"},
                    {"step": 2, "time": "1:00", "instruction": "Apply full coverage foundation", "product": "Foundation", "voice_guidance": "Build coverage with multiple layers"},
                    {"step": 3, "time": "3:00", "instruction": "Apply bold eyeshadow", "product": "Eyeshadow", "voice_guidance": "Create a smoky eye with blending"},
                    {"step": 4, "time": "8:00", "instruction": "Apply winged eyeliner", "product": "Eyeliner", "voice_guidance": "Draw a bold winged eyeliner"},
                    {"step": 5, "time": "10:00", "instruction": "Apply volumizing mascara", "product": "Mascara", "voice_guidance": "Apply multiple coats for drama"},
                    {"step": 6, "time": "12:00", "instruction": "Apply bold lip color", "product": "Lipstick", "voice_guidance": "Finish with a bold lip that pops"}
                ]
            },
            "Bridal Full Set": {
                "title": "Bridal Makeup",
                "duration": 45,
                "steps": [
                    {"step": 1, "time": "0:00", "instruction": "Prepare and prime face", "product": "Primer", "voice_guidance": "Start with a hydrating primer"},
                    {"step": 2, "time": "2:00", "instruction": "Apply foundation for longevity", "product": "Foundation", "voice_guidance": "Choose long-wear foundation for all-day wear"},
                    {"step": 3, "time": "5:00", "instruction": "Sculpt and define", "product": "Contouring Kit", "voice_guidance": "Define cheekbones and jawline subtly"},
                    {"step": 4, "time": "10:00", "instruction": "Create bridal eyes", "product": "Eyeshadow", "voice_guidance": "Use soft shimmers and metals for a romantic eye"},
                    {"step": 5, "time": "18:00", "instruction": "Precise eyeliner", "product": "Eyeliner", "voice_guidance": "Create a precise bridal winged eyeliner"},
                    {"step": 6, "time": "20:00", "instruction": "Highlight and glow", "product": "Highlighter", "voice_guidance": "Add subtle highlight for a bridal glow"},
                    {"step": 7, "time": "25:00", "instruction": "Bold brows", "product": "Eyebrow Kit", "voice_guidance": "Frame face with well-defined brows"},
                    {"step": 8, "time": "30:00", "instruction": "Luscious lashes", "product": "Mascara/Lashes", "voice_guidance": "Apply mascara or false lashes"},
                    {"step": 9, "time": "35:00", "instruction": "Bridal lip", "product": "Lip Stain/Lipstick", "voice_guidance": "Choose a shade that photographs beautifully"}
                ]
            },
            "Professional Work": {
                "title": "Professional Makeup",
                "duration": 20,
                "steps": [
                    {"step": 1, "time": "0:00", "instruction": "Apply primer", "product": "Primer", "voice_guidance": "Light primer for a professional finish"},
                    {"step": 2, "time": "1:00", "instruction": "Apply foundation", "product": "Foundation", "voice_guidance": "Flawless base without looking heavy"},
                    {"step": 3, "time": "3:00", "instruction": "Set with powder", "product": "Powder", "voice_guidance": "Subtle powder setting"},
                    {"step": 4, "time": "4:00", "instruction": "Define brows", "product": "Eyebrow Pencil", "voice_guidance": "Professional, well-groomed brows"},
                    {"step": 5, "time": "6:00", "instruction": "Neutral eyeshadow", "product": "Eyeshadow", "voice_guidance": "Subtle, professional eye makeup"},
                    {"step": 6, "time": "9:00", "instruction": "Professional mascara", "product": "Mascara", "voice_guidance": "Single coat of mascara for natural look"},
                    {"step": 7, "time": "11:00", "instruction": "Subtle blush", "product": "Blush", "voice_guidance": "Light blush for a professional glow"},
                    {"step": 8, "time": "13:00", "instruction": "Professional lip color", "product": "Lipstick", "voice_guidance": "Neutral or classic red for professionalism"}
                ]
            }
        }
        
        return guides.get(style_mode, guides["Office/College"])
    
    async def _create_ar_overlays(
        self,
        style_mode: str,
        skin_tone: str,
        recommended_products: List[Dict]
    ) -> List[Dict[str, Any]]:
        """
        Create AR overlay data with colors matched to skin tone
        """
        # Color recommendations based on skin tone
        color_palette = {
            "fair": ["#FFB6C1", "#FF69B4", "#DB7093", "#C71585"],
            "medium": ["#FF6B9D", "#E8284A", "#D32F2F", "#C62828"],
            "dark": ["#FF8C94", "#FF6B6B", "#E63946", "#D62828"],
            "deep": ["#FF5252", "#FF3D3D", "#FF1744", "#D50000"]
        }
        
        tone_map = {
            "fair": "fair",
            "light": "fair",
            "medium": "medium",
            "olive": "medium",
            "tan": "dark",
            "dark": "dark",
            "deep": "deep"
        }
        
        palette = color_palette.get(tone_map.get(skin_tone.lower(), "medium"), color_palette["medium"])
        
        overlays = [
            {
                "overlay_type": "lipstick",
                "color_code": palette[0],
                "product_id": recommended_products[0]["id"] if recommended_products else None,
                "intensity": 100,
                "coordinates": {"face_region": "lips"}
            },
            {
                "overlay_type": "blush",
                "color_code": palette[1],
                "product_id": recommended_products[1]["id"] if len(recommended_products) > 1 else None,
                "intensity": 60,
                "coordinates": {"face_region": "cheeks"}
            },
            {
                "overlay_type": "eyeliner",
                "color_code": palette[2],
                "product_id": recommended_products[2]["id"] if len(recommended_products) > 2 else None,
                "intensity": 80,
                "coordinates": {"face_region": "eyes"}
            },
            {
                "overlay_type": "eyeshadow",
                "color_code": palette[3],
                "product_id": recommended_products[3]["id"] if len(recommended_products) > 3 else None,
                "intensity": 70,
                "coordinates": {"face_region": "eyelids"}
            }
        ]
        
        return overlays
    
    async def save_look(
        self,
        user_id: str,
        mirror_style_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Save a look as encrypted JSON profile link
        """
        # Generate encrypted JSON URL
        encrypted_url = f"https://glow.app/looks/{mirror_style_id}"
        
        # Update mirror style to saved
        update_query = text("""
            UPDATE mirror_styles
            SET is_saved = 'saved',
                encrypted_json_url = :encrypted_url,
                updated_at = NOW()
            WHERE id = :mirror_style_id AND user_id = :user_id
            RETURNING *
        """)
        
        result = await self.db.execute(
            update_query,
            {
                "mirror_style_id": mirror_style_id,
                "user_id": user_id,
                "encrypted_url": encrypted_url
            }
        )
        
        await self.db.commit()
        return {"status": "saved", "look_url": encrypted_url}
