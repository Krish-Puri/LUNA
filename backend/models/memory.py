from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MemoryBase(BaseModel):
    user_id: str
    type: str  # 'fact', 'preference', 'goal', 'pattern'
    content: str


class MemoryCreate(MemoryBase):
    confidence: float = 1.0
    source_message_id: Optional[str] = None
    context: Optional[str] = None


class MemoryUpdate(BaseModel):
    content: Optional[str] = None
    type: Optional[str] = None
    confidence: Optional[float] = None
    is_verified: Optional[bool] = None


class Memory(MemoryBase):
    id: str
    confidence: float = 1.0
    source_message_id: Optional[str] = None
    context: Optional[str] = None
    is_verified: bool = False
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True
