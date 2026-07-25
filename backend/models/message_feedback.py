from pydantic import BaseModel
from datetime import datetime


class MessageFeedbackBase(BaseModel):
    message_id: str
    feedback_type: str  # 'thumbs_up', 'thumbs_down', 'report'


class MessageFeedbackCreate(MessageFeedbackBase):
    pass


class MessageFeedback(MessageFeedbackBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True
