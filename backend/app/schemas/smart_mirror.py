from pydantic import BaseModel, Field
from typing import List, Optional, Dict

class MirrorSessionRequest(BaseModel):
    """Request model for creating mirror session"""
    user_id: str = Field(..., min_length=1, description="User identifier")

class MirrorSessionResponse(BaseModel):
    """Response model for mirror session"""
    session_id: str
    user_id: str
    lighting_quality: float = Field(..., ge=0.0, le=1.0, description="Lighting quality score")
    face_detected: bool
    skin_tone: str
    recommendations: List[dict]
    created_at: str

class MakeupApplicationRequest(BaseModel):
    """Request model for applying makeup in mirror"""
    session_id: str = Field(..., min_length=1, description="Session identifier")
    product_id: str = Field(..., min_length=1, description="Product identifier")
    category: str = Field(..., description="Makeup category")
    color: str = Field(..., description="Makeup color (hex)")
    intensity: float = Field(..., ge=0.0, le=1.0, description="Application intensity")
    placement: Optional[Dict[str, float]] = Field(None, description="Placement coordinates")

class MakeupApplicationResponse(BaseModel):
    """Response model for makeup application"""
    success: bool
    session_id: str
    image_processed: bool
    applied_makeup: List[dict]
    processing_time: float

class LightingAnalysisRequest(BaseModel):
    """Request model for lighting analysis"""
    session_id: str = Field(..., min_length=1, description="Session identifier")

class LightingAnalysisResponse(BaseModel):
    """Response model for lighting analysis"""
    brightness: float = Field(..., ge=0.0, le=1.0)
    color_temperature: float = Field(..., ge=0.0, le=1.0)
    shadows: float = Field(..., ge=0.0, le=1.0)
    quality_score: float = Field(..., ge=0.0, le=1.0)
    recommendations: List[str]
