from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import logging

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models import User

router = APIRouter(prefix="/api/ai", tags=["ai"])
logger = logging.getLogger(__name__)

# Pydantic Models for Beard Recommendation
class FaceGeometryRequest(BaseModel):
    jawWidth: float
    cheekboneRatio: float
    symmetryScore: float
    faceShape: str  # Dynamic face shape from analyzer
    faceShapeConfidence: float

class UserContextRequest(BaseModel):
    occasion: str  # "office", "party", "casual", "wedding"
    premiumUser: bool = False

class BeardRecommendationRequest(BaseModel):
    faceGeometry: FaceGeometryRequest
    userContext: UserContextRequest

class BeardStyleResponse(BaseModel):
    id: str
    name: str
    category: str
    preview_image: Optional[str]
    model_3d_url: Optional[str]
    density_level: Optional[str]
    premium: bool
    weighted_score: float

class BeardRecommendationResponse(BaseModel):
    styles: List[BeardStyleResponse]
    total_candidates: int

@router.post("/beard/recommendation", response_model=BeardRecommendationResponse)
async def get_beard_recommendations(
    request: BeardRecommendationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Production-ready Beard Recommendation Engine with Supabase filtering
    
    STRICT RULES:
    - NO MOCK DATA
    - NO FALLBACKS
    - IF DB RETURNS 0 ITEMS, RETURN 0 ITEMS
    - INTELLIGENT SCORING ENGINE (NO RANDOMNESS)
    """
    try:
        # PHASE 2: SUPABASE STRICT FILTERING
        face_geom = request.faceGeometry
        user_ctx = request.userContext
        
        logger.info(f"Beard recommendation request - Face: {face_geom.faceShape}, Occasion: {user_ctx.occasion}")
        
        # Query beard_styles table with strict filtering
        query = text("""
            SELECT 
                id, 
                name, 
                category, 
                preview_image, 
                model_3d_url, 
                density_level, 
                premium,
                jaw_width_min,
                jaw_width_max,
                supported_face_shapes,
                occasion_tags
            FROM beard_styles 
            WHERE 
                -- Jaw width tolerance filter
                :jawWidth BETWEEN jaw_width_min AND jaw_width_max
                -- Face shape compatibility filter
                AND :faceShape = ANY(supported_face_shapes)
                -- Occasion compatibility filter  
                AND :occasion = ANY(occasion_tags)
                -- Premium filter
                AND (:premiumUser = true OR premium = false)
            ORDER BY 
                -- Base ordering by face shape match priority
                CASE 
                    WHEN :faceShape = ANY(supported_face_shapes) THEN 1
                    ELSE 0
                END DESC
        """)
        
        result = await db.execute(query, {
            "jawWidth": face_geom.jawWidth,
            "faceShape": face_geom.faceShape,
            "occasion": user_ctx.occasion,
            "premiumUser": user_ctx.premiumUser
        })
        
        raw_styles = result.fetchall()
        
        if not raw_styles:
            logger.info("No beard styles found matching criteria - returning empty array")
            return BeardRecommendationResponse(
                styles=[],
                total_candidates=0
            )
        
        # PHASE 2: INTELLIGENT SCORING ENGINE (No Randomness)
        scored_styles = []
        
        for style in raw_styles:
            # Calculate weighted score based on multiple factors
            score = 0.0
            
            # Face shape match weight (40%)
            face_shapes = style.supported_face_shapes or []
            if face_geom.faceShape in face_shapes:
                score += 0.4 * face_geom.faceShapeConfidence / 100.0
            
            # Jaw fit weight (30%) - how well user's jaw fits within style range
            jaw_min = style.jaw_width_min or 0
            jaw_max = style.jaw_width_max or 1
            jaw_range = jaw_max - jaw_min
            if jaw_range > 0:
                jaw_fit_score = 1.0 - abs(face_geom.jawWidth - (jaw_min + jaw_max / 2)) / jaw_range
                score += 0.3 * max(0, jaw_fit_score)
            
            # Symmetry boost (20%) - high symmetry gets bonus
            if face_geom.symmetryScore > 0.8:
                score += 0.2 * (face_geom.symmetryScore - 0.8) / 0.2
            
            # Occasion priority boost (10%) - occasion match priority
            occasion_tags = style.occasion_tags or []
            if user_ctx.occasion in occasion_tags:
                score += 0.1
            
            # Create response object
            scored_styles.append(BeardStyleResponse(
                id=style.id,
                name=style.name,
                category=style.category or "beard",
                preview_image=style.preview_image,
                model_3d_url=style.model_3d_url,
                density_level=style.density_level,
                premium=style.premium or False,
                weighted_score=round(score, 3)
            ))
        
        # Sort by highest score and return Top 5
        scored_styles.sort(key=lambda x: x.weighted_score, reverse=True)
        top_styles = scored_styles[:5]
        
        logger.info(f"Returning {len(top_styles)} beard recommendations out of {len(scored_styles)} candidates")
        
        return BeardRecommendationResponse(
            styles=top_styles,
            total_candidates=len(scored_styles)
        )
        
    except Exception as e:
        logger.error(f"Error in beard recommendation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Beard recommendation engine failed: {str(e)}"
        )

@router.get("/beard/styles", response_model=List[BeardStyleResponse])
async def get_all_beard_styles(
    premium_only: bool = False,
    occasion: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all available beard styles with optional filtering
    """
    try:
        query_conditions = []
        params = {}
        
        if premium_only:
            query_conditions.append("premium = :premium")
            params["premium"] = True
            
        if occasion:
            query_conditions.append(":occasion = ANY(occasion_tags)")
            params["occasion"] = occasion
        
        where_clause = " WHERE " + " AND ".join(query_conditions) if query_conditions else ""
        
        query = text(f"""
            SELECT 
                id, 
                name, 
                category, 
                preview_image, 
                model_3d_url, 
                density_level, 
                premium
            FROM beard_styles 
            {where_clause}
            ORDER BY name
        """)
        
        result = await db.execute(query, params)
        styles = result.fetchall()
        
        return [
            BeardStyleResponse(
                id=style.id,
                name=style.name,
                category=style.category or "beard",
                preview_image=style.preview_image,
                model_3d_url=style.model_3d_url,
                density_level=style.density_level,
                premium=style.premium or False,
                weighted_score=0.0  # No scoring for listing
            )
            for style in styles
        ]
        
    except Exception as e:
        logger.error(f"Error getting beard styles: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve beard styles: {str(e)}"
        )
