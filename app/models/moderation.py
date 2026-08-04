from sqlalchemy import Column, String, DateTime, UUID, ForeignKey
from sqlalchemy.dialects.postgresql import JSON
from datetime import datetime
import uuid

from app.database import Base

class ModerationLog(Base):
    __tablename__ = "moderation_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_type = Column(String(50), nullable=True)
    content_id = Column(UUID(as_uuid=True), nullable=True)
    reason = Column(String(255), nullable=True)
    severity = Column(String(50), nullable=True)
    status = Column(String(50), default="pending")
    moderator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(String(255), nullable=True)
    entity_type = Column(String(100), nullable=True)
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
