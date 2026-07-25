from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SystemPromptBase(BaseModel):
    version: int
    prompt_text: str
    description: Optional[str] = None
    is_active: bool = False


class SystemPromptCreate(SystemPromptBase):
    pass


class SystemPromptUpdate(BaseModel):
    prompt_text: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class SystemPrompt(SystemPromptBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True
