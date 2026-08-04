from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

class ReferralCodeResponse(BaseModel):
    code: str
    points_earned: int
    referrals_count: int
    is_active: bool
    created_at: datetime

class ReferralSignupResponse(BaseModel):
    referral_code_id: str
    referred_user_id: str
    points_awarded: int
    is_fraud_flagged: bool
    created_at: datetime

class LeaderboardEntryResponse(BaseModel):
    rank: int
    user_name: str
    total_referrals: int
    total_points: int
    badge_level: str
    total_rewards_claimed: float

class ReferralLeaderboardResponse(BaseModel):
    month: str
    entries: list[LeaderboardEntryResponse]
    current_user_rank: Optional[int] = None
    current_user_points: Optional[int] = None
