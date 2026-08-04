from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class ChatMessageCreate(BaseModel):
    content: str
    message_type: str = "text"
    media_url: Optional[str] = None

class ChatMessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    sender_id: UUID
    content: str
    message_type: str
    media_url: Optional[str] = None
    is_read: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ChatConversationResponse(BaseModel):
    id: UUID
    user_1_id: UUID
    user_2_id: UUID
    last_message_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class WebSocketMessage(BaseModel):
    type: str  # "message", "typing", "read", etc.
    content: Optional[str] = None
    sender_id: UUID
    conversation_id: UUID
    media_url: Optional[str] = None
