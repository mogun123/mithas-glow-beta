from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ReferralCode, ReferralSignup, ReferralLeaderboard, User, Wallet
from app.schemas.referral import ReferralCodeResponse, LeaderboardEntryResponse, ReferralLeaderboardResponse
from app.core.dependencies import get_current_user
import uuid
import string
import random
from datetime import datetime

router = APIRouter(prefix="/api/v1/referral", tags=["referral"])

def generate_referral_code():
    """Generate unique 8-character alphanumeric referral code"""
    characters = string.ascii_uppercase + string.digits
    return ''.join(random.choice(characters) for _ in range(8))

@router.get("/my-code")
async def get_my_referral_code(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's referral code or create one"""
    ref_code = db.query(ReferralCode).filter(ReferralCode.user_id == current_user.id).first()
    
    if not ref_code:
        # Create new referral code
        ref_code = ReferralCode(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            code=generate_referral_code(),
            points_earned=0,
            referrals_count=0
        )
        db.add(ref_code)
        db.commit()
        db.refresh(ref_code)
    
    return ReferralCodeResponse.from_orm(ref_code)

@router.post("/sign-up-with-code/{referral_code}")
async def sign_up_with_referral(
    referral_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Register new user with referral code"""
    ref_code_obj = db.query(ReferralCode).filter(ReferralCode.code == referral_code).first()
    
    if not ref_code_obj:
        raise HTTPException(status_code=404, detail="Invalid referral code")
    
    if ref_code_obj.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot use own referral code")
    
    # Check fraud: same device or IP
    existing = db.query(ReferralSignup).filter(
        ReferralSignup.referred_user_id == current_user.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already referred by another user")
    
    signup = ReferralSignup(
        id=str(uuid.uuid4()),
        referral_code_id=ref_code_obj.id,
        referred_user_id=current_user.id,
        points_awarded=500,
        is_fraud_flagged=False
    )
    
    # Award points to referrer
    ref_code_obj.points_earned += 500
    ref_code_obj.referrals_count += 1
    
    # Add points to referrer wallet
    referrer_wallet = db.query(Wallet).filter(Wallet.user_id == ref_code_obj.user_id).first()
    if referrer_wallet:
        referrer_wallet.points += 500
    
    db.add(signup)
    db.commit()
    
    return {"message": "Referral recorded", "points_awarded": 500}

@router.get("/leaderboard")
async def get_referral_leaderboard(
    month: str = Query(None),
    limit: int = Query(10),
    db: Session = Depends(get_db)
):
    """Get monthly referral leaderboard"""
    if not month:
        from datetime import datetime
        month = datetime.utcnow().strftime("%Y-%m")
    
    leaderboard = db.query(ReferralLeaderboard)\
        .filter(ReferralLeaderboard.month == month)\
        .order_by(ReferralLeaderboard.rank)\
        .limit(limit)\
        .all()
    
    entries = []
    for entry in leaderboard:
        user = db.query(User).filter(User.id == entry.referral_code_id).first()
        entries.append(LeaderboardEntryResponse(
            rank=entry.rank,
            user_name=user.full_name if user else "Anonymous",
            total_referrals=entry.total_referrals,
            total_points=entry.total_points,
            badge_level=entry.badge_level,
            total_rewards_claimed=float(entry.total_rewards_claimed)
        ))
    
    return ReferralLeaderboardResponse(month=month, entries=entries)

@router.get("/leaderboard/me")
async def get_my_referral_rank(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's referral rank"""
    ref_code = db.query(ReferralCode).filter(ReferralCode.user_id == current_user.id).first()
    
    if not ref_code:
        return {
            "rank": None,
            "total_referrals": 0,
            "total_points": 0,
            "badge_level": "none"
        }
    
    from datetime import datetime
    month = datetime.utcnow().strftime("%Y-%m")
    
    leaderboard = db.query(ReferralLeaderboard)\
        .filter(ReferralLeaderboard.referral_code_id == ref_code.id, ReferralLeaderboard.month == month)\
        .first()
    
    return {
        "rank": leaderboard.rank if leaderboard else None,
        "total_referrals": ref_code.referrals_count,
        "total_points": ref_code.points_earned,
        "badge_level": leaderboard.badge_level if leaderboard else "none"
    }
