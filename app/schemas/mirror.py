from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class FaceAnalysisRequest(BaseModel):
    skin_tone: Optional[str] = None
    face_shape: Optional[str] = None
    blemishes: Optional[List[Dict]] = None
    
class StyleRecommendationRequest(BaseModel):
    style_mode: str  # Office/College, Party, Bridal, Professional
    face_analysis: FaceAnalysisRequest
    user_preferences: Optional[Dict[str, Any]] = {}

class AROverlayData(BaseModel):
    overlay_type: str
    color_code: str
    product_id: Optional[str] = None
    intensity: int = 100

class MirrorStyleResponse(BaseModel):
    id: str
    user_id: str
    style_mode: str
    face_analysis: Dict[str, Any]
    recommended_products: List[Dict]
    makeup_guide: Dict[str, Any]
    ar_overlay_data: List[AROverlayData]
    is_saved: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class SaveLookRequest(BaseModel):
    mirror_style_id: str
    name: Optional[str] = None
    description: Optional[str] = None
