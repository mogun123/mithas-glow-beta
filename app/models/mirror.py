from sqlalchemy import Column, String, DateTime, Text, UUID, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSON
from pgvector.sqlalchemy import Vector
from datetime import datetime
import uuid

from app.database import Base

class MirrorStyle(Base):
    __tablename__ = "mirror_styles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    style_mode = Column(String(100), nullable=False)  # Office/College, Party, Bridal, Professional
    face_analysis = Column(JSON, nullable=True)  # {skin_tone, face_shape, blemishes, etc}
    recommended_products = Column(JSON, default=[])  # Array of product recommendations
    makeup_guide = Column(JSON, nullable=True)  # Step-by-step guide with timestamps
    ar_overlay_data = Column(JSON, nullable=True)  # AR model overlays (lipstick, eyeliner, etc)
    embedding = Column(Vector(384), nullable=True)  # Style embedding for similarity
    is_saved = Column(String(50), default="draft")  # draft, saved, shared
    encrypted_json_url = Column(String(500), nullable=True)  # Link to encrypted profile
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", backref="mirror_styles")

class AROverlay(Base):
    __tablename__ = "ar_overlays"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mirror_style_id = Column(UUID(as_uuid=True), ForeignKey("mirror_styles.id"), nullable=False)
    overlay_type = Column(String(50), nullable=False)  # lipstick, eyeliner, blush, hairstyle, jewelry
    color_code = Column(String(7), nullable=True)  # Hex color
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True)
    intensity = Column(Integer, default=100)  # 0-100 for blending
    coordinates = Column(JSON, nullable=True)  # Face mesh coordinates
    created_at = Column(DateTime, default=datetime.utcnow)
