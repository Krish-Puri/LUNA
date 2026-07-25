from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class VoiceNoteBase(BaseModel):
    message_id: str
    file_path: str
    mime_type: Optional[str] = None
    duration_seconds: Optional[float] = None
    transcript: Optional[str] = None
    sample_rate: Optional[int] = None
    language: str = "en"


class VoiceNoteCreate(VoiceNoteBase):
    pass


class VoiceNoteUpdate(BaseModel):
    transcript: Optional[str] = None
    duration_seconds: Optional[float] = None


class VoiceNote(VoiceNoteBase):
    id: str
    created_at: datetime
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True
