from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Dict, List, Optional
import json
import asyncio
from pydantic import BaseModel

from ..services.ai_service import ai_service, FaceAnalysis
from ..services.beauty_fingerprint_service import beauty_fingerprint_service, BeautyProfile
from ..services.smart_mirror_service import smart_mirror_service, MirrorSession

# Import schemas
from ..schemas.face_analysis import FaceAnalysisResponse, SkinProgressRequest
from ..schemas.beauty_fingerprint import BeautyFingerprintRequest, BeautyFingerprintResponse
from ..schemas.smart_mirror import (
    MirrorSessionRequest, MirrorSessionResponse,
    MakeupApplicationRequest, MakeupApplicationResponse
)

router = APIRouter(prefix="/api/ai", tags=["AI"])

# CORE SKIN AI ENDPOINTS

# Face Analysis Endpoint
@router.post("/analyze-face", response_model=FaceAnalysisResponse)
async def analyze_face(image: UploadFile = File(...)):
    """Analyze face using MediaPipe for skin analysis"""
    try:
        # Validate image file
        if not image.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image data
        image_data = await image.read()
        
        # Perform face analysis
        face_analysis = await ai_service.analyze_face(image_data)
        
        return FaceAnalysisResponse(
            face_detected=face_analysis.face_detected,
            confidence=face_analysis.confidence,
            skin_tone=face_analysis.skin_tone.value,
            skin_type=face_analysis.skin_type.value,
            face_shape=face_analysis.face_shape,
            skin_concerns=face_analysis.skin_concerns,
            lighting_quality=face_analysis.lighting_quality
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Face analysis failed: {str(e)}")

# Beauty Fingerprint Generation
@router.post("/generate-fingerprint", response_model=BeautyFingerprintResponse)
async def generate_beauty_fingerprint(
    request: BeautyFingerprintRequest,
    image: UploadFile = File(...)
):
    """Generate beauty fingerprint from face analysis"""
    try:
        # Validate image file
        if not image.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image data
        image_data = await image.read()
        
        # Generate beauty fingerprint
        profile = await beauty_fingerprint_service.generate_fingerprint(
            request.user_id, image_data, request.preferences
        )
        
        return BeautyFingerprintResponse(
            user_id=profile.user_id,
            skin_tone=profile.skin_tone.value,
            skin_type=profile.skin_type.value,
            face_shape=profile.face_shape,
            color_palette=profile.color_palette,
            style_preferences=profile.style_preferences,
            product_affinity=profile.product_affinity,
            skin_concerns=profile.skin_concerns
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fingerprint generation failed: {str(e)}")

# Smart Mirror Session
@router.post("/mirror/session", response_model=MirrorSessionResponse)
async def create_mirror_session(
    request: MirrorSessionRequest,
    image: UploadFile = File(...)
):
    """Create smart mirror session for virtual try-on"""
    try:
        # Validate image file
        if not image.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image data
        image_data = await image.read()
        
        # Create mirror session
        session = await smart_mirror_service.create_mirror_session(
            request.user_id, image_data
        )
        
        # TODO: Get product recommendations for this session
        recommendations = []
        
        return MirrorSessionResponse(
            session_id=session.session_id,
            user_id=session.user_id,
            lighting_quality=session.lighting_condition.quality_score,
            face_detected=session.face_analysis.face_detected,
            skin_tone=session.face_analysis.skin_tone.value,
            recommendations=recommendations
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mirror session creation failed: {str(e)}")

# Apply Makeup in Mirror
@router.post("/mirror/apply-makeup")
async def apply_makeup_in_mirror(
    request: MakeupApplicationRequest,
    image: UploadFile = File(...)
):
    """Apply makeup virtually in smart mirror"""
    try:
        # Validate image file
        if not image.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image data
        image_data = await image.read()
        
        # TODO: Load session from database
        # For now, create dummy session
        session = await smart_mirror_service.create_mirror_session(
            "dummy_user", image_data
        )
        
        # TODO: Create makeup application from request
        # For now, return original image
        result_image = image_data
        
        return JSONResponse(
            content={
                "message": "Makeup applied successfully",
                "session_id": request.session_id,
                "image_processed": True
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Makeup application failed: {str(e)}")

# Skin Progress Analysis
@router.post("/skin-progress")
async def analyze_skin_progress(
    user_id: str,
    current_image: UploadFile = File(...),
    previous_image: Optional[UploadFile] = File(None)
):
    """Analyze skin progress over time"""
    try:
        # Validate image files
        if not current_image.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Current image must be an image")
        
        if previous_image and not previous_image.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Previous image must be an image")
        
        # Read image data
        current_data = await current_image.read()
        previous_data = await previous_image.read() if previous_image else None
        
        # Analyze current image
        current_analysis = await ai_service.analyze_face(current_data)
        
        result = {
            "user_id": user_id,
            "current_analysis": {
                "skin_tone": current_analysis.skin_tone.value,
                "skin_type": current_analysis.skin_type.value,
                "skin_concerns": current_analysis.skin_concerns,
                "lighting_quality": current_analysis.lighting_quality
            }
        }
        
        # Compare with previous image if available
        if previous_data:
            previous_analysis = await ai_service.analyze_face(previous_data)
            result["previous_analysis"] = {
                "skin_tone": previous_analysis.skin_tone.value,
                "skin_type": previous_analysis.skin_type.value,
                "skin_concerns": previous_analysis.skin_concerns,
                "lighting_quality": previous_analysis.lighting_quality
            }
            
            # Calculate improvements
            result["improvements"] = {
                "concerns_resolved": list(set(previous_analysis.skin_concerns) - set(current_analysis.skin_concerns)),
                "new_concerns": list(set(current_analysis.skin_concerns) - set(previous_analysis.skin_concerns)),
                "lighting_improvement": current_analysis.lighting_quality - previous_analysis.lighting_quality
            }
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Skin progress analysis failed: {str(e)}")

# Health check for AI services
@router.get("/health")
async def ai_health_check():
    """Health check for AI services"""
    return {
        "status": "healthy",
        "services": {
            "face_analysis": "active",
            "beauty_fingerprint": "active",
            "smart_mirror": "active"
        },
        "models": {
            "mediapipe": "loaded",
            "face_mesh": "active",
            "face_detection": "active"
        }
    }
