from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    username: Optional[str] = None
    phone: Optional[str] = None

class UserRegister(UserBase):
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: UUID
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    is_verified: bool
    is_artist: bool
    is_seller: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    skin_tone: Optional[str] = None
    face_shape: Optional[str] = None
    hair_type: Optional[str] = None
    hair_color: Optional[str] = None
    makeup_preference: Optional[dict] = None
    glow_mirror_data: Optional[dict] = None
    ar_measurements: Optional[dict] = None
    location: Optional[str] = None
    date_of_birth: Optional[str] = None
    preferences: Optional[dict] = None

class UserProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    skin_tone: Optional[str] = None
    face_shape: Optional[str] = None
    hair_type: Optional[str] = None
    hair_color: Optional[str] = None
    makeup_preference: dict
    glow_mirror_data: dict
    ar_measurements: dict
    location: Optional[str] = None
    date_of_birth: Optional[str] = None
    preferences: dict
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
