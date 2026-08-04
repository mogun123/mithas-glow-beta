from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from uuid import UUID

from app.database import get_db
from app.models import Reel, Like, Comment, User
from app.schemas.feed import (
    ReelCreate, ReelUpdate, ReelResponse,
    CommentCreate, CommentResponse
)
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/reels", tags=["reels"])

@router.get("/", response_model=list[ReelResponse])
async def get_reels(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    trending: bool = Query(False),
    db: AsyncSession = Depends(get_db)
):
    """Get reels feed"""
    query = select(Reel)
    
    if trending:
        query = query.where(Reel.trending == True)
    
    query = query.order_by(desc(Reel.created_at)).offset(skip).limit(limit)
    
    result = await db.execute(query)
    reels = result.scalars().all()
    
    return [ReelResponse.from_orm(reel) for reel in reels]

@router.post("/", response_model=ReelResponse, status_code=status.HTTP_201_CREATED)
async def create_reel(
    reel_data: ReelCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new reel"""
    new_reel = Reel(
        user_id=current_user.id,
        title=reel_data.title,
        description=reel_data.description,
        video_url=reel_data.video_url,
        thumbnail_url=reel_data.thumbnail_url,
        duration=reel_data.duration,
        filters_applied=reel_data.filters_applied or {}
    )
    
    db.add(new_reel)
    await db.commit()
    await db.refresh(new_reel)
    
    return ReelResponse.from_orm(new_reel)

@router.get("/{reel_id}", response_model=ReelResponse)
async def get_reel(
    reel_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get single reel"""
    result = await db.execute(
        select(Reel).where(Reel.id == reel_id)
    )
    reel = result.scalars().first()
    
    if not reel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reel not found"
        )
    
    # Increment view count
    reel.view_count += 1
    db.add(reel)
    await db.commit()
    
    return ReelResponse.from_orm(reel)

@router.put("/{reel_id}", response_model=ReelResponse)
async def update_reel(
    reel_id: UUID,
    reel_data: ReelUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update reel"""
    result = await db.execute(
        select(Reel).where(Reel.id == reel_id)
    )
    reel = result.scalars().first()
    
    if not reel or reel.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    update_data = reel_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(reel, field, value)
    
    db.add(reel)
    await db.commit()
    await db.refresh(reel)
    
    return ReelResponse.from_orm(reel)

@router.delete("/{reel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reel(
    reel_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete reel"""
    result = await db.execute(
        select(Reel).where(Reel.id == reel_id)
    )
    reel = result.scalars().first()
    
    if not reel or reel.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    await db.delete(reel)
    await db.commit()

@router.post("/{reel_id}/like")
async def like_reel(
    reel_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Like a reel"""
    reel_result = await db.execute(
        select(Reel).where(Reel.id == reel_id)
    )
    reel = reel_result.scalars().first()
    
    if not reel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reel not found"
        )
    
    like_result = await db.execute(
        select(Like).where(
            (Like.user_id == current_user.id) &
            (Like.reel_id == reel_id)
        )
    )
    existing_like = like_result.scalars().first()
    
    if existing_like:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already liked"
        )
    
    new_like = Like(user_id=current_user.id, reel_id=reel_id)
    db.add(new_like)
    
    reel.like_count += 1
    db.add(reel)
    
    await db.commit()
    
    return {"status": "success"}

@router.post("/{reel_id}/unlike")
async def unlike_reel(
    reel_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Unlike a reel"""
    like_result = await db.execute(
        select(Like).where(
            (Like.user_id == current_user.id) &
            (Like.reel_id == reel_id)
        )
    )
    like = like_result.scalars().first()
    
    if not like:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Like not found"
        )
    
    await db.delete(like)
    
    reel_result = await db.execute(
        select(Reel).where(Reel.id == reel_id)
    )
    reel = reel_result.scalars().first()
    if reel and reel.like_count > 0:
        reel.like_count -= 1
        db.add(reel)
    
    await db.commit()
    
    return {"status": "success"}

@router.get("/{reel_id}/comments", response_model=list[CommentResponse])
async def get_reel_comments(
    reel_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get reel comments"""
    result = await db.execute(
        select(Comment)
        .where((Comment.reel_id == reel_id) & (Comment.parent_comment_id == None))
        .order_by(desc(Comment.created_at))
        .offset(skip)
        .limit(limit)
    )
    comments = result.scalars().all()
    
    return [CommentResponse.from_orm(comment) for comment in comments]

@router.post("/{reel_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_reel_comment(
    reel_id: UUID,
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create reel comment"""
    reel_result = await db.execute(
        select(Reel).where(Reel.id == reel_id)
    )
    reel = reel_result.scalars().first()
    
    if not reel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reel not found"
        )
    
    new_comment = Comment(
        user_id=current_user.id,
        reel_id=reel_id,
        content=comment_data.content,
        parent_comment_id=comment_data.parent_comment_id
    )
    
    db.add(new_comment)
    reel.comment_count += 1
    db.add(reel)
    
    await db.commit()
    await db.refresh(new_comment)
    
    return CommentResponse.from_orm(new_comment)
