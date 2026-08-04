from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional

class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    message: str
    notification_type: str
    related_id: Optional[UUID]
    is_read: bool
    read_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
