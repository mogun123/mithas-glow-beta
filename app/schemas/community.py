from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class IdeaVoteCreate(BaseModel):
    idea_id: str

class IdeaSubmitCreate(BaseModel):
    title: str
    description: str
    category: str
    is_nda_secure: bool = False

class IdeaAnalysisResponse(BaseModel):
    innovation_score: int
    market_fit: int
    novelty_score: int
    scalability_score: int
    feasibility_score: int

class IdeaResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: str
    category: str
    votes: int
    status: str
    created_at: datetime
    innovation_score: int
    market_fit: int
    novelty_score: int
    scalability_score: int
    feasibility_score: int

class IdeaListResponse(BaseModel):
    ideas: list[IdeaResponse]
    total_count: int
