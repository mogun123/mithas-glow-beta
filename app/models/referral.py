from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Numeric, UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database import Base

class ReferralCode(Base):
    __tablename__ = "referral_codes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    code = Column(String(20), nullable=False, unique=True)
    points_earned = Column(Integer, default=0)
    referrals_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="referral_code")
    referrals = relationship("ReferralSignup", cascade="all, delete-orphan")
    leaderboard = relationship("ReferralLeaderboard", cascade="all, delete-orphan", uselist=False)

class ReferralSignup(Base):
    __tablename__ = "referral_signups"
    
    id = Column(String, primary_key=True, default=lambda: str(__import__('uuid').uuid4()))
    referral_code_id = Column(UUID(as_uuid=True), ForeignKey("referral_codes.id"), nullable=False)
    referred_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    device_id = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    points_awarded = Column(Integer, default=500)
    is_fraud_flagged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    referrer = relationship("User", foreign_keys=[referral_code_id])
    referred_user = relationship("User", foreign_keys=[referred_user_id])

class ReferralLeaderboard(Base):
    __tablename__ = "referral_leaderboards"
    
    id = Column(String, primary_key=True, default=lambda: str(__import__('uuid').uuid4()))
    referral_code_id = Column(UUID(as_uuid=True), ForeignKey("referral_codes.id"), nullable=False)
    rank = Column(Integer, default=0)
    total_points = Column(Integer, default=0)
    total_referrals = Column(Integer, default=0)
    total_rewards_claimed = Column(Numeric(10, 2), default=0)
    month = Column(String(7), nullable=False)  # YYYY-MM format for monthly leaderboards
    badge_level = Column(String(20), default="bronze")  # bronze, silver, gold, platinum, diamond
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
