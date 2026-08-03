from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class BeautyFingerprintRequest(BaseModel):
    """Request model for beauty fingerprint generation"""
    user_id: str = Field(..., min_length=1, description="User identifier")
    preferences: Optional[Dict[str, float]] = Field(None, description="User style preferences")

class BeautyFingerprintResponse(BaseModel):
    """Response model for beauty fingerprint results"""
    user_id: str
    skin_tone: str
    skin_type: str
    face_shape: str
    color_palette: List[str]
    style_preferences: Dict[str, float]
    product_affinity: Dict[str, float]
    skin_concerns: List[str]
    created_at: str
    updated_at: str

class UpdateFingerprintRequest(BaseModel):
    """Request model for updating beauty fingerprint"""
    user_id: str = Field(..., min_length=1, description="User identifier")
    interaction_data: Optional[Dict] = Field(None, description="User interaction data")

class UpdateFingerprintResponse(BaseModel):
    """Response model for updated fingerprint"""
    user_id: str
    updated_at: str
    changes_made: List[str]
