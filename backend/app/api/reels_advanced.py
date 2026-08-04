"""
Advanced Reels API with AI Integration
FastAPI backend for Mithas Glow Reels with Cloudflare Stream, pgVector, and AI features
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text, desc, func
from typing import List, Optional, Dict, Any
import uuid
import asyncio
import aiohttp
import numpy as np
from datetime import datetime, timedelta
import json
import os
from supabase import create_client, Client

from ..database import get_db
from ..models.reels import Reel, Product, ReelProduct, UserInteraction, Profile
from ..services.ai_service import AIService
from ..services.video_service import VideoService
from ..services.content_moderation import ContentModerationService
from ..config import settings

router = APIRouter()

# Initialize Supabase client
supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_ROLE_KEY # Use service role key for backend operations
)

# Initialize services
ai_service = AIService()
video_service = VideoService(settings.CLOUDFLARE_STREAM_KEY)
content_moderation = ContentModerationService()

@router.get("/reels/personalized")
async def get_personalized_reels(
    user_id: str,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Get personalized reel recommendations using pgVector similarity search
    """
    try:
        # Get user's viewing history and preferences
        user_interactions = db.query(UserInteraction).filter(
            UserInteraction.user_id == user_id,
            UserInteraction.interaction_type.in_(['view', 'like', 'save'])
        ).order_by(desc(UserInteraction.timestamp)).limit(50).all()
        
        # Get user's preferred categories from interactions
        preferred_categories = []
        if user_interactions:
            # Extract categories from interacted reels
            reel_ids = [interaction.reel_id for interaction in user_interactions]
            preferred_reels = db.query(Reel).filter(Reel.id.in_(reel_ids)).all()
            preferred_categories = list(set([reel.category for reel in preferred_reels if reel.category]))
        
        # Vector similarity search for personalized recommendations
        if user_interactions:
            # Get user's average embedding from viewed reels
            viewed_reels = db.query(Reel).filter(Reel.id.in_(reel_ids)).all()
            if viewed_reels:
                # Calculate average embedding (simplified - in production use proper vector averaging)
                avg_embedding = np.mean([reel.ai_embedding for reel in viewed_reels if reel.ai_embedding], axis=0)
                
                # Find similar reels using pgVector
                similar_reels = db.query(Reel).filter(
                    Reel.status == 'published',
                    Reel.creator_id != user_id,
                    Reel.ai_embedding.isnot(None)
                ).order_by(
                    func.cosine_distance(Reel.ai_embedding, avg_embedding.tolist())
                ).limit(limit * 2).offset(offset).all()
            else:
                similar_reels = []
        else:
            # Fallback to trending reels for new users
            similar_reels = db.query(Reel).filter(
                Reel.status == 'published'
            ).order_by(
                desc(Reel.views_count + Reel.likes_count)
            ).limit(limit).offset(offset).all()
        
        # Filter out already viewed reels
        viewed_reel_ids = set([interaction.reel_id for interaction in user_interactions])
        recommendations = [reel for reel in similar_reels if reel.id not in viewed_reel_ids][:limit]
        
        # Enrich with creator and product data
        enriched_reels = []
        for reel in recommendations:
            creator = db.query(Profile).filter(Profile.id == reel.creator_id).first()
            products = db.query(Product).join(ReelProduct).filter(
                ReelProduct.reel_id == reel.id
            ).all()
            
            enriched_reels.append({
                "id": str(reel.id),
                "creator": {
                    "id": str(creator.id) if creator else None,
                    "username": creator.username if creator else "Unknown",
                    "avatar_url": creator.avatar_url if creator else None,
                    "is_artist": creator.is_artist if creator else False
                },
                "caption": reel.caption,
                "video_url": reel.video_url,
                "thumbnail_url": reel.thumbnail_url,
                "audio_title": reel.audio_title,
                "duration": reel.duration,
                "has_ar": reel.has_ar,
                "likes_count": reel.likes_count,
                "comments_count": reel.comments_count,
                "views_count": reel.views_count,
                "tagged_products": [
                    {
                        "id": str(product.id),
                        "name": product.name,
                        "price": float(product.price),
                        "image_url": product.image_url,
                        "description": product.description
                    }
                    for product in products
                ],
                "created_at": reel.created_at.isoformat()
            })
        
        return {
            "reels": enriched_reels,
            "has_more": len(similar_reels) > limit,
            "recommendation_type": "personalized" if user_interactions else "trending"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reels/trending")
async def get_trending_reels(
    limit: int = 20,
    offset: int = 0,
    time_range: str = "24h",  # 24h, 7d, 30d
    db: Session = Depends(get_db)
):
    """
    Get trending reels based on engagement metrics
    """
    try:
        # Calculate time threshold
        time_thresholds = {
            "24h": datetime.utcnow() - timedelta(hours=24),
            "7d": datetime.utcnow() - timedelta(days=7),
            "30d": datetime.utcnow() - timedelta(days=30)
        }
        threshold = time_thresholds.get(time_range, time_thresholds["24h"])
        
        # Get trending reels with engagement score
        trending_query = db.query(Reel).filter(
            Reel.status == 'published',
            Reel.created_at >= threshold
        ).order_by(
            desc(
                (Reel.likes_count * 3 + Reel.comments_count * 2 + Reel.shares_count * 5) / 
                func.extract('epoch', datetime.utcnow() - Reel.created_at)
            )
        ).limit(limit).offset(offset).all()
        
        # Enrich with data
        enriched_reels = []
        for reel in trending_query:
            creator = db.query(Profile).filter(Profile.id == reel.creator_id).first()
            products = db.query(Product).join(ReelProduct).filter(
                ReelProduct.reel_id == reel.id
            ).all()
            
            enriched_reels.append({
                "id": str(reel.id),
                "creator": {
                    "id": str(creator.id) if creator else None,
                    "username": creator.username if creator else "Unknown",
                    "avatar_url": creator.avatar_url if creator else None,
                    "followers_count": creator.followers_count if creator else 0
                },
                "caption": reel.caption,
                "video_url": reel.video_url,
                "thumbnail_url": reel.thumbnail_url,
                "audio_title": reel.audio_title,
                "duration": reel.duration,
                "has_ar": reel.has_ar,
                "likes_count": reel.likes_count,
                "comments_count": reel.comments_count,
                "views_count": reel.views_count,
                "engagement_score": (reel.likes_count * 3 + reel.comments_count * 2 + reel.shares_count * 5),
                "tagged_products": [
                    {
                        "id": str(product.id),
                        "name": product.name,
                        "price": float(product.price),
                        "image_url": product.image_url
                    }
                    for product in products
                ],
                "created_at": reel.created_at.isoformat()
            })
        
        return {
            "reels": enriched_reels,
            "time_range": time_range,
            "has_more": len(trending_query) > limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reels/upload")
async def upload_reel(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    caption: str = "",
    audio_title: str = "",
    has_ar: bool = False,
    creator_id: str = "",
    db: Session = Depends(get_db)
):
    """
    Upload and process a new reel with AI analysis
    """
    try:
        # Validate user
        creator = db.query(Profile).filter(Profile.id == creator_id).first()
        if not creator:
            raise HTTPException(status_code=404, detail="Creator not found")
        
        # Upload video to Cloudflare Stream
        video_result = await video_service.upload_video(video)
        
        # Create reel record
        new_reel = Reel(
            creator_id=creator_id,
            caption=caption,
            video_id=video_result["uid"],
            video_url=video_result["playback_url"],
            thumbnail_url=video_result["thumbnail_url"],
            audio_title=audio_title,
            duration=video_result.get("duration", 0),
            width=video_result.get("width", 0),
            height=video_result.get("height", 0),
            file_size=video_result.get("size", 0),
            has_ar=has_ar,
            status="processing"
        )
        
        db.add(new_reel)
        db.commit()
        db.refresh(new_reel)
        
        # Schedule background processing
        background_tasks.add_task(
            process_uploaded_reel,
            str(new_reel.id),
            video_result["playback_url"]
        )
        
        return {
            "id": str(new_reel.id),
            "status": "processing",
            "message": "Reel uploaded successfully. Processing in background."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def process_uploaded_reel(reel_id: str, video_url: str):
    """
    Background task to process uploaded reel with AI analysis
    """
    try:
        # AI Content Analysis
        ai_analysis = await ai_service.analyze_video_content(video_url)
        
        # Content Moderation
        moderation_result = await content_moderation.moderate_content(video_url)
        
        # Product Detection
        detected_products = await ai_service.detect_products_in_video(video_url)
        
        # Update reel with AI results
        update_data = {
            "ai_tags": ai_analysis.get("tags", []),
            "ai_embedding": ai_analysis.get("embedding", []),
            "status": "published" if not moderation_result["flagged"] else "flagged"
        }
        
        if moderation_result["flagged"]:
            update_data["moderation_reason"] = moderation_result["reason"]
        
        # Update in database
        supabase.table("reels").update(update_data).eq("id", reel_id).execute()
        
        # Add detected products
        for product_data in detected_products:
            # Create or find product
            product_result = supabase.table("products").upsert({
                "name": product_data["name"],
                "price": product_data.get("price", 0),
                "image_url": product_data.get("image_url"),
                "category": product_data.get("category", "fashion"),
                "ai_embedding": product_data.get("embedding", [])
            }).execute()
            
            product_id = product_result.data[0]["id"]
            
            # Link product to reel
            supabase.table("reel_products").insert({
                "reel_id": reel_id,
                "product_id": product_id,
                "timestamp_start": product_data.get("timestamp", 0),
                "confidence_score": product_data.get("confidence", 0.8),
                "position_x": product_data.get("x", 0),
                "position_y": product_data.get("y", 0)
            }).execute()
        
        print(f"Successfully processed reel {reel_id}")
        
    except Exception as e:
        print(f"Error processing reel {reel_id}: {str(e)}")
        # Mark as failed
        supabase.table("reels").update({
            "status": "failed"
        }).eq("id", reel_id).execute()

@router.post("/reels/{reel_id}/interact")
async def record_interaction(
    reel_id: str,
    interaction_type: str,  # view, like, comment, share, save, ar_try_on
    user_id: str,
    duration: Optional[int] = None,
    metadata: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db)
):
    """
    Record user interaction with a reel for AI training
    """
    try:
        # Validate interaction type
        valid_types = ["view", "like", "comment", "share", "save", "ar_try_on"]
        if interaction_type not in valid_types:
            raise HTTPException(status_code=400, detail="Invalid interaction type")
        
        # Record interaction
        interaction = UserInteraction(
            user_id=user_id,
            reel_id=reel_id,
            interaction_type=interaction_type,
            duration=duration,
            metadata=metadata or {}
        )
        
        db.add(interaction)
        
        # Update reel counts
        reel = db.query(Reel).filter(Reel.id == reel_id).first()
        if reel:
            if interaction_type == "like":
                reel.likes_count += 1
            elif interaction_type == "comment":
                reel.comments_count += 1
            elif interaction_type == "share":
                reel.shares_count += 1
            elif interaction_type == "view":
                reel.views_count += 1
        
        db.commit()
        
        # Trigger real-time recommendation update (in production, use message queue)
        if interaction_type in ["like", "save", "ar_try_on"]:
            background_tasks = BackgroundTasks()
            background_tasks.add_task(
                update_user_recommendations,
                user_id
            )
        
        return {"message": "Interaction recorded successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reels/{reel_id}/similar")
async def get_similar_reels(
    reel_id: str,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Get reels similar to a specific reel using vector similarity
    """
    try:
        target_reel = db.query(Reel).filter(Reel.id == reel_id).first()
        if not target_reel:
            raise HTTPException(status_code=404, detail="Reel not found")
        
        if not target_reel.ai_embedding:
            # Fallback to category-based recommendations
            similar_reels = db.query(Reel).filter(
                Reel.status == 'published',
                Reel.id != reel_id,
                Reel.category == target_reel.category
            ).order_by(desc(Reel.likes_count)).limit(limit).all()
        else:
            # Vector similarity search
            similar_reels = db.query(Reel).filter(
                Reel.status == 'published',
                Reel.id != reel_id,
                Reel.ai_embedding.isnot(None)
            ).order_by(
                func.cosine_distance(Reel.ai_embedding, target_reel.ai_embedding)
            ).limit(limit).all()
        
        # Enrich results
        enriched_reels = []
        for reel in similar_reels:
            creator = db.query(Profile).filter(Profile.id == reel.creator_id).first()
            enriched_reels.append({
                "id": str(reel.id),
                "creator": {
                    "username": creator.username if creator else "Unknown",
                    "avatar_url": creator.avatar_url if creator else None
                },
                "caption": reel.caption,
                "video_url": reel.video_url,
                "thumbnail_url": reel.thumbnail_url,
                "likes_count": reel.likes_count,
                "similarity_score": 1 - func.cosine_distance(reel.ai_embedding, target_reel.ai_embedding) if reel.ai_embedding and target_reel.ai_embedding else 0.5
            })
        
        return {"similar_reels": enriched_reels}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def update_user_recommendations(user_id: str):
    """
    Update user recommendations based on new interactions
    In production, this would be more sophisticated and use message queues
    """
    try:
        # This is a simplified version
        # In production, you'd recalculate user embeddings and update cache
        print(f"Updating recommendations for user {user_id}")
        
        # Clear recommendation cache for this user
        # cache.delete(f"recommendations:{user_id}")
        
    except Exception as e:
        print(f"Error updating recommendations for user {user_id}: {str(e)}")

@router.get("/reels/analytics/creator")
async def get_creator_analytics(
    creator_id: str,
    time_range: str = "30d",
    db: Session = Depends(get_db)
):
    """
    Get analytics dashboard data for creators
    """
    try:
        time_thresholds = {
            "7d": datetime.utcnow() - timedelta(days=7),
            "30d": datetime.utcnow() - timedelta(days=30),
            "90d": datetime.utcnow() - timedelta(days=90)
        }
        threshold = time_thresholds.get(time_range, time_thresholds["30d"])
        
        # Get creator's reels
        reels = db.query(Reel).filter(
            Reel.creator_id == creator_id,
            Reel.created_at >= threshold
        ).all()
        
        # Calculate metrics
        total_views = sum([reel.views_count for reel in reels])
        total_likes = sum([reel.likes_count for reel in reels])
        total_comments = sum([reel.comments_count for reel in reels])
        total_shares = sum([reel.shares_count for reel in reels])
        
        # Engagement rate
        total_interactions = total_likes + total_comments + total_shares
        engagement_rate = (total_interactions / total_views * 100) if total_views > 0 else 0
        
        # Top performing reels
        top_reels = sorted(reels, key=lambda x: x.likes_count, reverse=True)[:5]
        
        # Audience demographics (simplified)
        interactions = db.query(UserInteraction).join(Reel).filter(
            Reel.creator_id == creator_id,
            UserInteraction.timestamp >= threshold
        ).all()
        
        return {
            "time_range": time_range,
            "metrics": {
                "total_reels": len(reels),
                "total_views": total_views,
                "total_likes": total_likes,
                "total_comments": total_comments,
                "total_shares": total_shares,
                "engagement_rate": round(engagement_rate, 2),
                "avg_views_per_reel": total_views / len(reels) if reels else 0
            },
            "top_reels": [
                {
                    "id": str(reel.id),
                    "caption": reel.caption,
                    "views": reel.views_count,
                    "likes": reel.likes_count,
                    "engagement_rate": round(((reel.likes_count + reel.comments_count) / reel.views_count * 100) if reel.views_count > 0 else 0, 2)
                }
                for reel in top_reels
            ],
            "audience_insights": {
                "unique_viewers": len(set([interaction.user_id for interaction in interactions])),
                "total_interactions": len(interactions),
                "peak_activity_hour": 14  # Simplified - calculate from timestamps
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
