from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class SessionBase(BaseModel):
    user_id: Optional[str] = None
    title_auto: Optional[str] = None
    title_custom: Optional[str] = None


class SessionCreate(SessionBase):
    id: Optional[str] = None  # Allow client to provide ID


class SessionUpdate(BaseModel):
    title_auto: Optional[str] = None
    title_custom: Optional[str] = None
    last_message_at: Optional[datetime] = None
    is_archived: Optional[bool] = None


class Session(SessionBase):
    id: str
    created_at: datetime
    updated_at: datetime
    last_message_at: Optional[datetime] = None
    is_archived: bool = False
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SessionSummary(BaseModel):
    id: str
    session_id: str
    summary: str
    message_count: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SessionWithPreview(Session):
    """Session enriched with preview text and message count."""
    preview: Optional[str] = None
    message_count: int = 0
    time: Optional[str] = None  # Human-readable relative time
