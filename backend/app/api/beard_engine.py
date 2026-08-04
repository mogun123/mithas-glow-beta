# ═══════════════════════════════════════════════════════════════════════════
# MITHASGLOW - Beard Intelligence Engine API
# Production: Supabase Storage with Signed URLs
# ═══════════════════════════════════════════════════════════════════════════

from fastapi import APIRouter, HTTPException
from typing import Dict, List, Optional
from pydantic import BaseModel
import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import timedelta

# Environment variables are loaded by main.py before this module is imported
# We rely on os.environ which should already contain the loaded variables
print("[beard_engine] Environment variables should be loaded by main.py")

router = APIRouter(prefix="/api/ai/beard", tags=["Beard Intelligence"])

# Supabase Configuration - STRICT: No hardcoded credentials, environment variables only
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_BUCKET = "beard-assets"

# STRICT: Validate required environment variables
if not SUPABASE_URL:
    raise ValueError("FATAL: SUPABASE_URL environment variable is required")
if not SUPABASE_ANON_KEY and not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("FATAL: Either SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY environment variable is required")

# Debug logs to check environment variables with masked values
url_found = bool(SUPABASE_URL)
anon_key_found = bool(SUPABASE_ANON_KEY)
service_key_found = bool(SUPABASE_SERVICE_ROLE_KEY)
print(f"[beard_engine] URL FOUND = {url_found}")
print(f"[beard_engine] ANON KEY FOUND = {anon_key_found}")
print(f"[beard_engine] SERVICE KEY FOUND = {service_key_found}")

# Show masked values for verification
if SUPABASE_URL:
    masked_url = SUPABASE_URL[:20] + "..." + SUPABASE_URL[-10:] if len(SUPABASE_URL) > 30 else SUPABASE_URL
    print(f"[beard_engine] URL (masked): {masked_url}")
if SUPABASE_ANON_KEY:
    masked_key = SUPABASE_ANON_KEY[:10] + "..." + SUPABASE_ANON_KEY[-10:] if len(SUPABASE_ANON_KEY) > 20 else SUPABASE_ANON_KEY
    print(f"[beard_engine] ANON KEY (masked): {masked_key}")

# Initialize Supabase client with anon key for public URLs (safer than service role)
# Fall back to service role key if anon key not available
if SUPABASE_URL and SUPABASE_ANON_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    print("[beard_engine] Using anon key for Supabase client")
elif SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    print("[beard_engine] Using service role key for Supabase client (anon key not available)")
else:
    supabase = None
    print("[beard_engine] WARNING: Supabase credentials not configured")

# ═══════════════════════════════════════════════════════════════════════════
# HELPER: Generate Signed URL for Private Bucket
# ═════════════════════════════════════════════════════════════════════════

def generate_signed_url(storage_path: str, expires_in: int = 300) -> str:
    """
    Generate a signed URL for Supabase Storage access (for private buckets)
    Valid for specified seconds (default 300 seconds / 5 minutes)
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        # Create signed URL using Supabase client
        result = supabase.storage.from_(SUPABASE_BUCKET).create_signed_url(
            storage_path,
            expires_in=timedelta(seconds=expires_in)
        )
        
        if not result:
            raise HTTPException(status_code=500, detail="Failed to generate signed URL")
        
        # The signed URL is in the 'signedURL' field
        return result['signedURL']
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Signed URL generation failed: {str(e)}")

def generate_public_url(storage_path: str) -> str:
    """
    Generate a public URL for Supabase Storage access (for public buckets or textures)
    Uses public bucket pattern: https://<project-url>/storage/v1/object/public/<bucket>/<path>
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        # Get the public URL using Supabase client
        result = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(storage_path)
        
        if not result:
            raise HTTPException(status_code=500, detail="Failed to generate public URL")
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Public URL generation failed: {str(e)}")

# ═══════════════════════════════════════════════════════════════════════════
# REQUEST/RESPONSE MODELS

class FaceGeometry(BaseModel):
    faceShape: str
    jawWidth: float
    faceWidth: float
    faceHeight: float
    noseToChin: float

class UserContext(BaseModel):
    occasion: str
    premiumUser: bool

class BeardRecommendationRequest(BaseModel):
    faceGeometry: FaceGeometry
    userContext: UserContext

class BeardStyle(BaseModel):
    id: str
    name: str
    category: str
    density_level: int
    tone: str
    model_path: str  # Storage path (not full URL)
    alpha_mask_url: str
    density_map_url: str
    strand_map_url: str
    beard_texture_url: str
    normal_map_url: str
    premium: bool
    weighted_score: float
    active: bool

class BeardRecommendationResponse(BaseModel):
    styles: List[BeardStyle]
    total_candidates: int
    processing_time_ms: float
    recommendation_confidence: float

class SignedURLResponse(BaseModel):
    signed_url: str

# ═══════════════════════════════════════════════════════════════════════════
# ENDPOINT: Beard Recommendation
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/recommendation", response_model=BeardRecommendationResponse)
async def recommend_beard_styles(request: BeardRecommendationRequest):
    """
    Generate personalized beard recommendations from Supabase database
    """
    import time
    start_time = time.time()
    
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        # Query active beard styles from Supabase
        response = supabase.table('beard_styles').select('*').eq('active', True).execute()
        
        if not response.data:
            return {
                "styles": [],
                "total_candidates": 0,
                "processing_time_ms": 0,
                "recommendation_confidence": 0.0
            }
        
        # Extract face geometry and user context (now validated by Pydantic)
        face_geometry = request.faceGeometry
        user_context = request.userContext
        face_shape = face_geometry.faceShape
        occasion = user_context.occasion
        
        # Score and filter beard styles
        scored_styles = []
        for style in response.data:
            score = style.get("weighted_score", 0.5)
            
            # Adjust score based on face shape
            if face_shape == "round" and style["category"] in ["goatee", "stubble"]:
                score += 0.1
            elif face_shape == "square" and style["category"] in ["full", "stubble"]:
                score += 0.1
            elif face_shape == "oval" and style["category"] in ["full", "goatee"]:
                score += 0.1
            
            # Adjust score based on occasion
            if occasion == "office" and style["category"] in ["stubble", "trimmed"]:
                score += 0.15
            elif occasion == "party" and style["category"] in ["full", "goatee"]:
                score += 0.15
            
            # Premium user bonus
            if user_context.premiumUser and style.get("premium"):
                score += 0.2
            
            scored_styles.append({**style, "weighted_score": min(score, 1.0)})
        
        # Sort by weighted score (descending)
        scored_styles.sort(key=lambda x: x["weighted_score"], reverse=True)
        top_styles = scored_styles[:5]
        
        processing_time = (time.time() - start_time) * 1000
        
        return {
            "styles": top_styles,
            "total_candidates": len(response.data),
            "processing_time_ms": processing_time,
            "recommendation_confidence": top_styles[0]["weighted_score"] if top_styles else 0.0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Beard recommendation failed: {str(e)}")

# ═══════════════════════════════════════════════════════════════════════════
# ENDPOINT: Get All Beard Styles (for carousel)
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/styles")
async def get_all_beard_styles():
    """
    Get all active beard styles from Supabase for carousel
    Returns full URLs for models and textures
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        response = supabase.table('beard_styles').select('*').eq('active', True).execute()
        
        if not response.data:
            return {
                "styles": [],
                "total": 0
            }
        
        # Transform storage paths to full public URLs
        styles_with_urls = []
        for style in response.data:
            style_copy = style.copy()
            
            # If model_3d_url exists, use it. Otherwise generate signed URL from model_path
            if not style_copy.get('model_3d_url') and style_copy.get('model_path'):
                try:
                    style_copy['model_3d_url'] = generate_signed_url(style_copy['model_path'])
                except:
                    # If signed URL generation fails, keep original
                    pass
            
            # Generate public URLs for textures if they have storage paths
            texture_fields = ['alpha_mask_url', 'density_map_url', 'strand_map_url', 
                            'beard_texture_url', 'normal_map_url', 'occlusion_url']
            for field in texture_fields:
                if style_copy.get(field) and not style_copy[field].startswith('http'):
                    try:
                        style_copy[field] = generate_public_url(style_copy[field])
                    except:
                        pass
            
            styles_with_urls.append(style_copy)
        
        return {
            "styles": styles_with_urls,
            "total": len(styles_with_urls)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch beard styles: {str(e)}")

# ═══════════════════════════════════════════════════════════════════════════
# ENDPOINT: Get Signed URL for Beard Model
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/signed-url/{style_id}", response_model=SignedURLResponse)
async def get_beard_signed_url(style_id: str):
    """
    Generate a public URL for a beard style's GLB model
    Frontend calls this to get access to the beard asset
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        # Get the beard style to find its storage path
        response = supabase.table('beard_styles').select('*').eq('id', style_id).eq('active', True).single().execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail=f"Beard style {style_id} not found")
        
        style_data = response.data
        
        # Check if model_3d_url exists (full URL) - use it directly
        if style_data.get('model_3d_url'):
            return {
                "signed_url": style_data['model_3d_url']
            }
        
        # Otherwise, generate signed URL from model_path
        model_path = style_data.get('model_path')
        if not model_path:
            raise HTTPException(status_code=400, detail=f"Beard style {style_id} has no model_path or model_3d_url")
        
        # Generate signed URL (valid for 60 seconds)
        signed_url = generate_signed_url(model_path)
        
        return {
            "signed_url": signed_url
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate signed URL: {str(e)}")

# ═══════════════════════════════════════════════════════════════════════════
# ENDPOINT: Get Beard Style by ID
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/styles/{style_id}")
async def get_beard_style(style_id: str):
    """
    Get a specific beard style by ID (returns storage path, not signed URL)
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        response = supabase.table('beard_styles').select('*').eq('id', style_id).eq('active', True).single().execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail=f"Beard style {style_id} not found")
        
        return response.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch beard style: {str(e)}")
