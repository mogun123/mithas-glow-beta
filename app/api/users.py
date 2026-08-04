from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.models import User
from app.schemas.user import UserResponse
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("/search", response_model=list[UserResponse])
async def search_users(
    query: str = Query(..., min_length=1, max_length=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search users by username or email"""
    result = await db.execute(
        select(User).where(
            (User.username.ilike(f"%{query}%")) |
            (User.name.ilike(f"%{query}%"))
        ).limit(20)
    )
    users = result.scalars().all()
    return [UserResponse.from_orm(user) for user in users]

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get user by ID"""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse.from_orm(user)

@router.get("/{user_id}/profile", response_model=dict)
async def get_user_public_profile(
    user_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get user public profile"""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {
        "id": user.id,
        "username": user.username,
        "name": user.name,
        "avatar_url": user.avatar_url,
        "bio": user.bio,
        "is_artist": user.is_artist,
        "is_seller": user.is_seller,
    }
