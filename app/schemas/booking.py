from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from decimal import Decimal
from typing import Optional

class ArtistServiceCreate(BaseModel):
    title: str
    description: Optional[str] = None
    price: Decimal
    duration_minutes: Optional[int] = None
    availability: Optional[dict] = None

class ArtistServiceResponse(BaseModel):
    id: UUID
    artist_id: UUID
    title: str
    description: Optional[str]
    price: Decimal
    duration_minutes: Optional[int]
    rating: int
    created_at: datetime

    class Config:
        from_attributes = True

class BookingCreate(BaseModel):
    artist_id: UUID
    service_id: Optional[UUID] = None
    booking_date: str  # ISO format datetime
    duration_minutes: Optional[int] = None
    total_price: Optional[Decimal] = None

class BookingUpdate(BaseModel):
    status: Optional[str] = None
    payment_status: Optional[str] = None

class BookingResponse(BaseModel):
    id: UUID
    user_id: UUID
    artist_id: UUID
    service_id: Optional[UUID]
    booking_date: datetime
    duration_minutes: Optional[int]
    status: str
    payment_status: str
    total_price: Optional[Decimal]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
