from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID, uuid4
import os
from pathlib import Path
from typing import List

from app.database import get_db
from app.models.user import User
from app.core.dependencies import get_current_user
from app.services.storage_service import StorageService

router = APIRouter(prefix="/api/upload", tags=["upload"])
storage_service = StorageService()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_VIDEO_SIZE = 500 * 1024 * 1024  # 500MB

@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload single image"""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image type"
        )
    
    # Check file size
    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image too large"
        )
    
    try:
        # Upload to storage service (S3/R2)
        file_key = f"images/{current_user.id}/{uuid4()}.{file.filename.split('.')[-1]}"
        url = await storage_service.upload_file(file_key, content, file.content_type)
        
        return {
            "url": url,
            "key": file_key,
            "size": len(content),
            "type": file.content_type
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )

@router.post("/images")
async def upload_images(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload multiple images"""
    if len(files) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 10 files allowed"
        )
    
    uploaded = []
    
    for file in files:
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            continue
        
        content = await file.read()
        if len(content) > MAX_IMAGE_SIZE:
            continue
        
        try:
            file_key = f"images/{current_user.id}/{uuid4()}.{file.filename.split('.')[-1]}"
            url = await storage_service.upload_file(file_key, content, file.content_type)
            
            uploaded.append({
                "url": url,
                "key": file_key,
                "size": len(content)
            })
        except:
            continue
    
    return {"uploaded": uploaded, "count": len(uploaded)}

@router.post("/video")
async def upload_video(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload video for reels"""
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid video type"
        )
    
    content = await file.read()
    if len(content) > MAX_VIDEO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Video too large"
        )
    
    try:
        # Upload to storage
        file_key = f"videos/{current_user.id}/{uuid4()}.{file.filename.split('.')[-1]}"
        url = await storage_service.upload_file(file_key, content, file.content_type)
        
        return {
            "url": url,
            "key": file_key,
            "size": len(content),
            "type": file.content_type,
            "message": "Video uploaded. Transcoding in progress."
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )

@router.delete("/{file_key}")
async def delete_file(
    file_key: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete uploaded file"""
    # Verify user owns this file
    if not file_key.startswith(f"images/{current_user.id}") and \
       not file_key.startswith(f"videos/{current_user.id}"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    try:
        await storage_service.delete_file(file_key)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Delete failed: {str(e)}"
        )
