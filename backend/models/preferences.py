from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PreferencesBase(BaseModel):
    theme: str = "light"
    voice_enabled: bool = True
    voice_model: str = "whisper-1"
    language: str = "en"
    memory_enabled: bool = True
    notifications: bool = True


class PreferencesUpdate(BaseModel):
    theme: Optional[str] = None
    voice_enabled: Optional[bool] = None
    voice_model: Optional[str] = None
    language: Optional[str] = None
    memory_enabled: Optional[bool] = None
    notifications: Optional[bool] = None


class Preferences(PreferencesBase):
    user_id: str
    updated_at: datetime

    class Config:
        from_attributes = True
