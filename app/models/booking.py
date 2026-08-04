from sqlalchemy import Column, String, DateTime, Integer, UUID, ForeignKey, DECIMAL
from sqlalchemy.dialects.postgresql import JSON
from datetime import datetime
import uuid

from app.database import Base

class ArtistService(Base):
    __tablename__ = "artist_services"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    artist_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    price = Column(DECIMAL(10, 2), nullable=False)
    duration_minutes = Column(Integer, nullable=True)
    availability = Column(JSON, default={})
    rating = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    artist_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    service_id = Column(UUID(as_uuid=True), ForeignKey("artist_services.id"), nullable=True)
    booking_date = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=True)
    status = Column(String(50), default="pending")
    total_price = Column(DECIMAL(10, 2), nullable=True)
    payment_status = Column(String(50), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
