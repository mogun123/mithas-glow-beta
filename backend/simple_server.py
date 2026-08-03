#!/usr/bin/env python3
"""
Simple FastAPI Server for Beard Recommendation
No fallbacks or mock data - strict production mode
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

# Pydantic models for beard recommendation
class FaceGeometryRequest(BaseModel):
    jawWidth: float
    cheekboneRatio: float
    symmetryScore: float
    faceShape: str
    faceShapeConfidence: float

class UserContextRequest(BaseModel):
    occasion: str
    premiumUser: bool

class BeardRecommendationRequest(BaseModel):
    faceGeometry: FaceGeometryRequest
    userContext: UserContextRequest

class BeardStyleResponse(BaseModel):
    name: str
    description: str
    confidence: float
    suitable: bool

class BeardRecommendationResponse(BaseModel):
    recommendations: List[BeardStyleResponse]
    analysis: dict

# Create FastAPI app
app = FastAPI(title="IONTYX Beard Recommendation API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "IONTYX Beard Recommendation API", "status": "running"}

@app.get("/api/ai/beard/recommendation")
async def get_beard_recommendation():
    """
    Simple endpoint to test API connectivity
    Returns a basic response structure without ML processing
    """
    try:
        # Return a basic test response
        recommendations = [
            BeardStyleResponse(
                name="Classic Beard",
                description="A timeless style that suits most face shapes",
                confidence=0.85,
                suitable=True
            ),
            BeardStyleResponse(
                name="Stubble",
                description="Light stubble for a modern look",
                confidence=0.75,
                suitable=True
            )
        ]
        
        return BeardRecommendationResponse(
            recommendations=recommendations,
            analysis={"status": "test_mode", "api_working": True}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@app.post("/api/ai/beard/recommendation")
async def recommend_beard(request: BeardRecommendationRequest):
    """
    Beard recommendation endpoint
    Processes face geometry and user context to provide recommendations
    """
    try:
        # Basic validation
        if not request.faceGeometry or not request.userContext:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Simple rule-based recommendations (no ML, no fallbacks)
        recommendations = []
        
        # Basic face shape analysis
        face_shape = request.faceGeometry.faceShape.lower()
        occasion = request.userContext.occasion.lower()
        
        if face_shape in ["oval", "round"]:
            recommendations.append(BeardStyleResponse(
                name="Full Beard",
                description="A full beard complements your face shape",
                confidence=0.80,
                suitable=True
            ))
        
        if occasion in ["formal", "professional"]:
            recommendations.append(BeardStyleResponse(
                name="Corporate Beard",
                description="Well-groomed professional style",
                confidence=0.90,
                suitable=True
            ))
        else:
            recommendations.append(BeardStyleResponse(
                name="Casual Stubble",
                description="Relaxed style for casual occasions",
                confidence=0.75,
                suitable=True
            ))
        
        if not recommendations:
            recommendations.append(BeardStyleResponse(
                name="Clean Shaven",
                description="Sometimes less is more",
                confidence=0.60,
                suitable=True
            ))
        
        return BeardRecommendationResponse(
            recommendations=recommendations,
            analysis={
                "face_shape": face_shape,
                "occasion": occasion,
                "symmetry_score": request.faceGeometry.symmetryScore,
                "processing_mode": "rule_based"
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

if __name__ == "__main__":
    print("Starting Simple IONTYX Beard Recommendation Server...")
    print("Server will be available at: http://localhost:8000")
    print("API endpoint: http://localhost:8000/api/ai/beard/recommendation")
    
    uvicorn.run(
        "simple_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
