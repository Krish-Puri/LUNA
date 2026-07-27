from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MessageBase(BaseModel):
    role: str  # 'user', 'assistant', 'system'
    content: Optional[str] = None
    message_type: str = "text"  # 'text', 'voice', 'system'


class MessageCreate(MessageBase):
    session_id: Optional[str] = None  # Provided by URL path, not body
    id: Optional[str] = None


class MessageUpdate(BaseModel):
    content: Optional[str] = None
    token_count: Optional[int] = None
    latency_ms: Optional[int] = None
    ai_model: Optional[str] = None


class Message(MessageBase):
    id: str
    session_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    token_count: Optional[int] = None
    latency_ms: Optional[int] = None
    ai_model: Optional[str] = None
    deleted_at: Optional[datetime] = None

    model_config = {"protected_namespaces": ()}


class MessageWithVoice(Message):
    """Message enriched with voice note data."""
    voice_note: Optional["VoiceNote"] = None


# Forward reference resolution
from ..models.voice_note import VoiceNote
VoiceNote.model_rebuild()
