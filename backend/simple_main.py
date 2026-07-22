"""
Simplified FastAPI Backend for Quick Testing
Runs without database dependencies
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import uuid
from datetime import datetime

# Initialize FastAPI app
app = FastAPI(
    title="MITHAS GLOW API (Simple)",
    version="1.0.0",
    description="Simplified backend for testing"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

# Mock data for testing
MOCK_FEED_DATA = [
    {
        "id": "mock-1",
        "type": "look",
        "category": "fashion",
        "imageUrl": "https://placehold.co/600x400/FFD6E8/1f2937?text=Real+Look+1",
        "thumbnailUrl": "https://placehold.co/300x200/FFD6E8/1f2937?text=Real+Look+1",
        "title": "Elegant Evening Look",
        "description": "Perfect for your next special occasion",
        "tag": "Trending",
        "creator": {
            "id": "creator-1",
            "name": "Riya Beauty",
            "avatar": "https://placehold.co/100x100/FFD6E8/1f2937?text=Riya",
            "verified": True,
            "isFollowed": False,
            "distance": 2.3
        },
        "metrics": {
            "views": 12500,
            "likes": 2340,
            "saves": 890,
            "shares": 340,
            "purchaseConversions": 45
        },
        "relevanceScore": 94,
        "trendingScore": 78,
        "qualityScore": 0.92,
        "tags": {
            "occasion": ["party", "evening"],
            "season": "winter",
            "priceRange": "premium"
        },
        "products": [
            {"id": "prod-1", "name": "Evening Gown", "price": 4500, "inStock": True, "arEnabled": True},
            {"id": "prod-2", "name": "Clutch Bag", "price": 1200, "inStock": True, "arEnabled": False}
        ],
        "actions": {
            "canTryOn": True,
            "canBook": True,
            "canBuy": True,
            "canSave": True,
            "canShare": True
        },
        "context": {
            "isNew": True,
            "isNearby": True,
            "urgency": "limited_stock"
        },
        "updated": datetime.now().isoformat()
    },
    {
        "id": "mock-2",
        "type": "product",
        "category": "accessories",
        "imageUrl": "https://placehold.co/600x400/D6E8FF/1f2937?text=Real+Product+1",
        "thumbnailUrl": "https://placehold.co/300x200/D6E8FF/1f2937?text=Real+Product+1",
        "title": "Designer Handbag Collection",
        "description": "Luxury handbags for the modern woman",
        "tag": "New Arrival",
        "creator": {
            "id": "creator-2",
            "name": "Luxury Brands",
            "avatar": "https://placehold.co/100x100/D6E8FF/1f2937?text=Luxury",
            "verified": True,
            "isFollowed": False,
            "distance": 5.1
        },
        "metrics": {
            "views": 8900,
            "likes": 1560,
            "saves": 670,
            "shares": 230,
            "purchaseConversions": 28
        },
        "relevanceScore": 87,
        "trendingScore": 72,
        "qualityScore": 0.88,
        "tags": {
            "occasion": ["casual", "business"],
            "season": "all-season",
            "priceRange": "luxury"
        },
        "products": [
            {"id": "prod-3", "name": "Designer Handbag", "price": 8900, "inStock": True, "arEnabled": True},
            {"id": "prod-4", "name": "Wallet Set", "price": 2300, "inStock": True, "arEnabled": False}
        ],
        "actions": {
            "canTryOn": False,
            "canBook": False,
            "canBuy": True,
            "canSave": True,
            "canShare": True
        },
        "context": {
            "isNew": True,
            "isNearby": False,
            "urgency": "new_collection"
        },
        "updated": datetime.now().isoformat()
    }
]

# Pydantic models
class PersonalizedFeedRequest(BaseModel):
    userId: str
    location: Dict[str, Any]
    timeContext: Dict[str, Any]
    filters: Optional[Dict[str, Any]] = None
    limit: int = 10
    offset: int = 0

class PersonalizedFeedResponse(BaseModel):
    items: List[Dict[str, Any]]
    total: int
    hasMore: bool
    nextOffset: Optional[int] = None
    metadata: Dict[str, Any]

class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str

# API Endpoints
@app.options("/{path:path}")
async def options_handler(path: str):
    """Handle OPTIONS preflight requests for all paths"""
    return {"status": "ok"}

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="ok",
        version="1.0.0",
        timestamp=datetime.now().isoformat()
    )

@app.options("/api/feed/personalized")
async def options_feed_personalized():
    """Handle OPTIONS preflight request for personalized feed"""
    return {"status": "ok"}

@app.post("/api/feed/personalized", response_model=PersonalizedFeedResponse)
async def get_personalized_feed(request: PersonalizedFeedRequest):
    """Get personalized feed - simplified version"""
    try:
        # For now, return mock data with some variation based on filters
        items = MOCK_FEED_DATA.copy()
        
        # Apply some basic filtering based on request
        if request.filters:
            if request.filters.get("category"):
                items = [item for item in items if item.get("category") == request.filters["category"]]
        
        # Apply pagination
        start_idx = request.offset
        end_idx = start_idx + request.limit
        paginated_items = items[start_idx:end_idx]
        
        return PersonalizedFeedResponse(
            items=paginated_items,
            total=len(items),
            hasMore=end_idx < len(items),
            nextOffset=end_idx if end_idx < len(items) else None,
            metadata={
                "processingTime": 0.05,
                "algorithm": "simple_mock",
                "vectorMatchScore": 0.85,
                "contextualBoost": 0.15
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/engagement/track")
async def track_engagement(data: Dict[str, Any]):
    """Track user engagement - simplified version"""
    try:
        print(f"Engagement tracked: {data}")
        return {"status": "success", "message": "Engagement tracked"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/photoshoot/trigger")
async def trigger_photoshoot(data: Dict[str, Any]):
    """Trigger virtual photoshoot - simplified version"""
    try:
        job_id = str(uuid.uuid4())
        return {
            "jobId": job_id,
            "status": "started",
            "estimatedTime": 30,
            "message": "Virtual photoshoot started successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/models/initialize")
async def initialize_ai_models():
    """Initialize AI models - simplified version"""
    try:
        return {
            "models": ["face-detection", "style-transfer", "recommendation"],
            "status": "ready",
            "message": "AI models initialized successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/trending/tags")
async def get_trending_tags():
    """Get trending tags - simplified version"""
    try:
        return {
            "tags": [
                {"name": "#BridalGlow", "count": 1250, "growth": 15.2, "category": "bridal", "isTopTrending": True},
                {"name": "#CollegeLook", "count": 980, "growth": 12.8, "category": "casual", "isTopTrending": True},
                {"name": "#PartyMode", "count": 890, "growth": 10.5, "category": "party", "isTopTrending": True},
                {"name": "#Minimalist", "count": 650, "growth": 8.3, "category": "casual", "isTopTrending": False},
                {"name": "#TraditionalWear", "count": 540, "growth": 6.7, "category": "ethnic", "isTopTrending": False}
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Beard recommendation endpoint - delegates to database-driven beard_engine
@app.post("/api/ai/beard/recommendation")
async def recommend_beard_styles(request: dict):
    """
    Generate personalized beard recommendations
    This endpoint is a placeholder - use the database-driven beard_engine for real recommendations
    """
    # This endpoint should not be used - use backend/main.py with beard_engine instead
    return {
        "styles": [],
        "total_candidates": 0,
        "processing_time_ms": 0,
        "recommendation_confidence": 0.0,
        "error": "Please use the database-driven beard_engine in backend/main.py for real beard recommendations"
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting MITHAS GLOW Simple Backend...")
    print("API will be available at: http://localhost:8000")
    print("Health check: http://localhost:8000/health")
    print("API docs: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
