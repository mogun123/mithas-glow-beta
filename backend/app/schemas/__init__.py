# Pydantic Schemas for AI API

from .face_analysis import *
from .beauty_fingerprint import *
from .product_match import *
from .smart_mirror import *
from .diffusion import *

__all__ = [
    # Face Analysis
    "FaceAnalysisRequest",
    "FaceAnalysisResponse",
    
    # Beauty Fingerprint
    "BeautyFingerprintRequest",
    "BeautyFingerprintResponse",
    
    # Product Matching
    "ProductMatchRequest",
    "ProductMatchResponse",
    
    # Smart Mirror
    "MirrorSessionRequest",
    "MirrorSessionResponse",
    "MakeupApplicationRequest",
    
    # Stable Diffusion
    "PhotoshootGenerateRequest",
    "PhotoshootGenerateResponse",
    "BackgroundReplaceRequest",
    "BackgroundReplaceResponse",
    "LightingCorrectRequest",
    "LightingCorrectResponse"
]
