from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date


class UsageStatsBase(BaseModel):
    user_id: str
    date: date


class UsageStatsUpdate(BaseModel):
    messages_sent: Optional[int] = None
    voice_notes: Optional[int] = None
    sessions_created: Optional[int] = None
    total_minutes: Optional[float] = None


class UsageStats(UsageStatsBase):
    id: str
    messages_sent: int = 0
    voice_notes: int = 0
    sessions_created: int = 0
    total_minutes: float = 0
    last_active: Optional[datetime] = None

    class Config:
        from_attributes = True
