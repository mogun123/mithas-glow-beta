from pydantic import BaseModel, Field
from typing import List, Optional

class FaceAnalysisRequest(BaseModel):
    """Request model for face analysis"""
    pass  # Only requires image file upload

class FaceAnalysisResponse(BaseModel):
    """Response model for face analysis results"""
    face_detected: bool = Field(..., description="Whether a face was detected")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection confidence")
    skin_tone: str = Field(..., description="Detected skin tone")
    skin_type: str = Field(..., description="Detected skin type")
    face_shape: str = Field(..., description="Detected face shape")
    skin_concerns: List[str] = Field(default_factory=list, description="Detected skin concerns")
    lighting_quality: float = Field(..., ge=0.0, le=1.0, description="Lighting quality score")
    landmarks_count: int = Field(..., ge=0, description="Number of facial landmarks detected")

class SkinProgressRequest(BaseModel):
    """Request model for skin progress analysis"""
    user_id: str = Field(..., min_length=1, description="User identifier")

class SkinProgressResponse(BaseModel):
    """Response model for skin progress analysis"""
    user_id: str
    current_analysis: dict
    previous_analysis: Optional[dict] = None
    improvements: Optional[dict] = None
    analysis_date: str
