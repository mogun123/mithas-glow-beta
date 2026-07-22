from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import IdeaSubmission, IdeaVote, User
from app.schemas.community import IdeaSubmitCreate, IdeaVoteCreate, IdeaResponse, IdeaListResponse
from app.core.dependencies import get_current_user
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/v1/community", tags=["community"])

@router.post("/ideas/submit")
async def submit_idea(
    idea: IdeaSubmitCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a new feature idea to community voting"""
    db_idea = IdeaSubmission(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        title=idea.title,
        description=idea.description,
        category=idea.category,
        is_nda_secure=idea.is_nda_secure,
        status="pending",
        votes=0,
        innovation_score=75,  # Placeholder - will be calculated by AI
        market_fit=80,
        novelty_score=70,
        scalability_score=78,
        feasibility_score=85,
    )
    db.add(db_idea)
    db.commit()
    db.refresh(db_idea)
    return {
        "message": "Idea submitted successfully",
        "idea_id": db_idea.id,
        "status": "pending_ai_analysis"
    }

@router.get("/ideas")
async def get_ideas(
    category: str = Query(None),
    sort_by: str = Query("votes", enum=["votes", "trending", "new"]),
    skip: int = Query(0),
    limit: int = Query(10),
    db: Session = Depends(get_db)
):
    """Fetch community ideas with filtering and sorting"""
    query = db.query(IdeaSubmission).filter(IdeaSubmission.status == "approved")
    
    if category and category != "all":
        query = query.filter(IdeaSubmission.category == category)
    
    if sort_by == "votes":
        query = query.order_by(IdeaSubmission.votes.desc())
    elif sort_by == "trending":
        query = query.order_by(IdeaSubmission.updated_at.desc())
    elif sort_by == "new":
        query = query.order_by(IdeaSubmission.created_at.desc())
    
    total = query.count()
    ideas = query.offset(skip).limit(limit).all()
    
    return IdeaListResponse(
        ideas=[IdeaResponse.from_orm(idea) for idea in ideas],
        total_count=total
    )

@router.post("/ideas/{idea_id}/vote")
async def vote_idea(
    idea_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Vote for a community idea"""
    idea = db.query(IdeaSubmission).filter(IdeaSubmission.id == idea_id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    
    # Check if already voted
    existing_vote = db.query(IdeaVote).filter(
        IdeaVote.idea_id == idea_id,
        IdeaVote.user_id == current_user.id
    ).first()
    
    if existing_vote:
        raise HTTPException(status_code=400, detail="Already voted for this idea")
    
    vote = IdeaVote(
        id=str(uuid.uuid4()),
        idea_id=idea_id,
        user_id=current_user.id
    )
    idea.votes += 1
    db.add(vote)
    db.commit()
    
    return {"message": "Vote recorded", "total_votes": idea.votes}

@router.delete("/ideas/{idea_id}/vote")
async def unvote_idea(
    idea_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove vote from an idea"""
    vote = db.query(IdeaVote).filter(
        IdeaVote.idea_id == idea_id,
        IdeaVote.user_id == current_user.id
    ).first()
    
    if not vote:
        raise HTTPException(status_code=404, detail="Vote not found")
    
    idea = db.query(IdeaSubmission).filter(IdeaSubmission.id == idea_id).first()
    idea.votes = max(0, idea.votes - 1)
    db.delete(vote)
    db.commit()
    
    return {"message": "Vote removed", "total_votes": idea.votes}
