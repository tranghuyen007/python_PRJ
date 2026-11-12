from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field

class ReviewSessionCreate(BaseModel):
    topic_id: int
    review_type: Literal["QUICK", "NORMAL", "FULL_TOPIC"] = "QUICK"

class ReviewAnswer(BaseModel):
    word_id: int
    answer: str = Field(min_length=1, max_length=1000)

class ReviewSessionResponse(BaseModel):
    review_session_id: int
    user_id: int
    topic_id: int
    review_type: str
    total_items: int
    correct_count: int
    review_mode: Literal["QUICK", "FULL_TOPIC"]
    accuracy_percent: float
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
    question_data: dict[str, Any] | None = None
    model_config = ConfigDict(from_attributes=True)
