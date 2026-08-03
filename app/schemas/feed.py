from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class FeedPostCreate(BaseModel):
    caption: Optional[str] = None
    images: List[str] = []
    tags: List[str] = []

class FeedPostUpdate(BaseModel):
    caption: Optional[str] = None
    images: Optional[List[str]] = None
    tags: Optional[List[str]] = None

class FeedPostResponse(BaseModel):
    id: UUID
    user_id: UUID
    caption: Optional[str] = None
    images: List[str]
    tags: List[str]
    like_count: int
    comment_count: int
    share_count: int
    is_published: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ReelCreate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    video_url: str
    thumbnail_url: Optional[str] = None
    duration: Optional[int] = None
    filters_applied: Optional[dict] = None

class ReelUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    filters_applied: Optional[dict] = None

class ReelResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: Optional[str] = None
    description: Optional[str] = None
    video_url: str
    thumbnail_url: Optional[str] = None
    duration: Optional[int] = None
    view_count: int
    like_count: int
    comment_count: int
    share_count: int
    filters_applied: dict
    trending: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)
    parent_comment_id: Optional[UUID] = None

class CommentResponse(BaseModel):
    id: UUID
    user_id: UUID
    post_id: Optional[UUID] = None
    reel_id: Optional[UUID] = None
    content: str
    parent_comment_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class LikeResponse(BaseModel):
    id: UUID
    user_id: UUID
    post_id: Optional[UUID] = None
    reel_id: Optional[UUID] = None
    created_at: datetime
    
    class Config:
        from_attributes = True
