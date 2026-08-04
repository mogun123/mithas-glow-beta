from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert
from typing import Dict, Any, Optional
import uuid
import logging

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.mirror import MirrorStyle, AROverlay
from app.models.user import User
from app.schemas.mirror import (
    StyleRecommendationRequest,
    MirrorStyleResponse,
    SaveLookRequest
)
from app.services.ai_mirror_service import AIMirrorService

router = APIRouter(prefix="/api/v1/mirror", tags=["mirror"])
logger = logging.getLogger(__name__)

@router.post("/style", response_model=Dict[str, Any])
async def get_ai_style_recommendation(
    request: StyleRecommendationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get AI-powered styling recommendation with AR overlays
    Uses pgVector to recommend products based on user profile
    """
    try:
        mirror_service = AIMirrorService(db)
        
        # Get recommendations using pgVector similarity search
        recommendations = await mirror_service.analyze_face_and_recommend(
            user_id=str(current_user.id),
            style_mode=request.style_mode,
            face_analysis=request.face_analysis.dict(),
            user_preferences=request.user_preferences
        )
        
        # Store mirror style in database
        mirror_style = MirrorStyle(
            id=uuid.uuid4(),
            user_id=current_user.id,
            style_mode=request.style_mode,
            face_analysis=request.face_analysis.dict(),
            recommended_products=recommendations["recommended_products"],
            makeup_guide=recommendations["makeup_guide"],
            ar_overlay_data=recommendations["ar_overlay_data"],
            is_saved="draft"
        )
        
        db.add(mirror_style)
        await db.commit()
        await db.refresh(mirror_style)
        
        return {
            "mirror_style_id": str(mirror_style.id),
            "style_mode": request.style_mode,
            "face_analysis": recommendations["face_analysis"],
            "recommended_products": recommendations["recommended_products"],
            "makeup_guide": recommendations["makeup_guide"],
            "ar_overlay_data": recommendations["ar_overlay_data"],
            "status": "draft"
        }
    except Exception as e:
        logger.error(f"Error in get_ai_style_recommendation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate style recommendation"
        )

@router.get("/styles/{user_id}")
async def get_user_styles(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all saved styles for current user
    """
    try:
        query = select(MirrorStyle).where(
            MirrorStyle.user_id == current_user.id
        ).order_by(MirrorStyle.created_at.desc())
        
        result = await db.execute(query)
        styles = result.scalars().all()
        
        return [
            {
                "id": str(s.id),
                "style_mode": s.style_mode,
                "face_analysis": s.face_analysis,
                "recommended_products": s.recommended_products,
                "makeup_guide": s.makeup_guide,
                "ar_overlay_data": s.ar_overlay_data,
                "is_saved": s.is_saved,
                "created_at": s.created_at.isoformat(),
                "encrypted_url": s.encrypted_json_url
            }
            for s in styles
        ]
    except Exception as e:
        logger.error(f"Error fetching user styles: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch styles"
        )

@router.post("/save-look")
async def save_look(
    request: SaveLookRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Save a mirror style as a shareable look
    """
    try:
        mirror_service = AIMirrorService(db)
        result = await mirror_service.save_look(
            user_id=str(current_user.id),
            mirror_style_id=request.mirror_style_id,
            name=request.name,
            description=request.description
        )
        return result
    except Exception as e:
        logger.error(f"Error saving look: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save look"
        )

@router.get("/recommendations/products")
async def get_product_recommendations(
    style_mode: str = "Office/College",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get product recommendations for a specific style using pgVector search
    """
    try:
        # Get user profile for personalization
        from app.models.user import UserProfile
        user_profile_query = select(UserProfile).where(
            UserProfile.user_id == current_user.id
        )
        
        profile_result = await db.execute(user_profile_query)
        profile = profile_result.scalar_one_or_none()
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        mirror_service = AIMirrorService(db)
        products = await mirror_service._get_product_recommendations(
            user_id=str(current_user.id),
            skin_tone=profile.skin_tone or "medium",
            style_mode=style_mode,
            limit=12
        )
        
        return {
            "style_mode": style_mode,
            "products": products
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting product recommendations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get recommendations"
        )
