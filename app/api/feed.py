from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from uuid import UUID

from app.database import get_db
from app.models import FeedPost, Like, Comment, User, Reel
from app.schemas.feed import (
    FeedPostCreate, FeedPostUpdate, FeedPostResponse,
    CommentCreate, CommentResponse, LikeResponse
)
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/feed", tags=["feed"])

@router.get("/posts", response_model=list[FeedPostResponse])
async def get_feed(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user feed (chronological + trending)"""
    result = await db.execute(
        select(FeedPost)
        .where(FeedPost.is_published == True)
        .order_by(desc(FeedPost.created_at))
        .offset(skip)
        .limit(limit)
    )
    posts = result.scalars().all()
    
    return [FeedPostResponse.from_orm(post) for post in posts]

@router.post("/posts", response_model=FeedPostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    post_data: FeedPostCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new feed post"""
    new_post = FeedPost(
        user_id=current_user.id,
        caption=post_data.caption,
        images=post_data.images,
        tags=post_data.tags,
    )
    
    db.add(new_post)
    await db.commit()
    await db.refresh(new_post)
    
    return FeedPostResponse.from_orm(new_post)

@router.get("/posts/{post_id}", response_model=FeedPostResponse)
async def get_post(
    post_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get single post"""
    result = await db.execute(
        select(FeedPost).where(FeedPost.id == post_id)
    )
    post = result.scalars().first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    return FeedPostResponse.from_orm(post)

@router.put("/posts/{post_id}", response_model=FeedPostResponse)
async def update_post(
    post_id: UUID,
    post_data: FeedPostUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update post"""
    result = await db.execute(
        select(FeedPost).where(FeedPost.id == post_id)
    )
    post = result.scalars().first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    if post.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    update_data = post_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(post, field, value)
    
    db.add(post)
    await db.commit()
    await db.refresh(post)
    
    return FeedPostResponse.from_orm(post)

@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete post"""
    result = await db.execute(
        select(FeedPost).where(FeedPost.id == post_id)
    )
    post = result.scalars().first()
    
    if not post or post.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    await db.delete(post)
    await db.commit()

@router.post("/posts/{post_id}/like")
async def like_post(
    post_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Like a post"""
    # Check post exists
    post_result = await db.execute(
        select(FeedPost).where(FeedPost.id == post_id)
    )
    post = post_result.scalars().first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    # Check if already liked
    like_result = await db.execute(
        select(Like).where(
            (Like.user_id == current_user.id) &
            (Like.post_id == post_id)
        )
    )
    existing_like = like_result.scalars().first()
    
    if existing_like:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already liked"
        )
    
    # Create like
    new_like = Like(user_id=current_user.id, post_id=post_id)
    db.add(new_like)
    
    # Update like count
    post.like_count += 1
    db.add(post)
    
    await db.commit()
    
    return {"status": "success"}

@router.post("/posts/{post_id}/unlike")
async def unlike_post(
    post_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Unlike a post"""
    # Get like
    like_result = await db.execute(
        select(Like).where(
            (Like.user_id == current_user.id) &
            (Like.post_id == post_id)
        )
    )
    like = like_result.scalars().first()
    
    if not like:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Like not found"
        )
    
    # Delete like
    await db.delete(like)
    
    # Update like count
    post_result = await db.execute(
        select(FeedPost).where(FeedPost.id == post_id)
    )
    post = post_result.scalars().first()
    if post and post.like_count > 0:
        post.like_count -= 1
        db.add(post)
    
    await db.commit()
    
    return {"status": "success"}

@router.get("/posts/{post_id}/comments", response_model=list[CommentResponse])
async def get_post_comments(
    post_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get post comments"""
    result = await db.execute(
        select(Comment)
        .where((Comment.post_id == post_id) & (Comment.parent_comment_id == None))
        .order_by(desc(Comment.created_at))
        .offset(skip)
        .limit(limit)
    )
    comments = result.scalars().all()
    
    return [CommentResponse.from_orm(comment) for comment in comments]

@router.post("/posts/{post_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_post_comment(
    post_id: UUID,
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create post comment"""
    # Verify post exists
    post_result = await db.execute(
        select(FeedPost).where(FeedPost.id == post_id)
    )
    post = post_result.scalars().first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    new_comment = Comment(
        user_id=current_user.id,
        post_id=post_id,
        content=comment_data.content,
        parent_comment_id=comment_data.parent_comment_id
    )
    
    db.add(new_comment)
    post.comment_count += 1
    db.add(post)
    
    await db.commit()
    await db.refresh(new_comment)
    
    return CommentResponse.from_orm(new_comment)
