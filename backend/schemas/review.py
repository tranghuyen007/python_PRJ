from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class ReviewSessionCreate(BaseModel):
    topic_id: int
    review_type: str = "NORMAL"

class ReviewAnswer(BaseModel):
    word_id: int
    is_correct: bool

class ReviewSessionResponse(BaseModel):
    review_session_id: int
    user_id: int
    topic_id: int
    review_type: str
    total_items: int
    correct_count: int
    started_at: datetime
    completed_at: datetime | None
    model_config = ConfigDict(from_attributes=True)

class ReviewItemResponse(BaseModel):
    session_item_id: int
    review_session_id: int
    word_id: int
    is_answered: int
    is_correct: int
    answered_at: datetime | None
    model_config = ConfigDict(from_attributes=True)
