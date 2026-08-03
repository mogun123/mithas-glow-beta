from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Text, UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database import Base

class IdeaSubmission(Base):
    __tablename__ = "idea_submissions"
    
    id = Column(String, primary_key=True, default=lambda: str(__import__('uuid').uuid4()))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)  # Beauty, AI, App, Product, AR, Others
    votes = Column(Integer, default=0)
    status = Column(String(20), default="pending")  # pending, approved, rejected, implemented
    is_nda_secure = Column(Boolean, default=False)
    nda_chain_id = Column(String(255), nullable=True)
    innovation_score = Column(Integer, default=0)
    market_fit = Column(Integer, default=0)
    novelty_score = Column(Integer, default=0)
    scalability_score = Column(Integer, default=0)
    feasibility_score = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="ideas")
    votes_rel = relationship("IdeaVote", cascade="all, delete-orphan")

class IdeaVote(Base):
    __tablename__ = "idea_votes"
    
    id = Column(String, primary_key=True, default=lambda: str(__import__('uuid').uuid4()))
    idea_id = Column(String, ForeignKey("idea_submissions.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")
