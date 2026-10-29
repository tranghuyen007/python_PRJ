from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field

class LessonProgressUpdate(BaseModel):
    completed_items: int = Field(ge=0)
    total_items: int = Field(ge=0)
    is_completed: bool = False

class LessonProgressResponse(BaseModel):
    progress_id: int
    user_id: int
    lesson_id: int
    completed_items: int
    total_items: int
    is_completed: int
    started_at: datetime | None
    completed_at: datetime | None
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class TopicProgressResponse(BaseModel):
    progress_id: int
    user_id: int
    topic_id: int
    learned_count: int
    mastered_count: int
    started_at: datetime | None
    completed_at: datetime | None
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class DailyActivityResponse(BaseModel):
    activity_id: int
    user_id: int
    activity_date: date
    learned_count: int
    review_count: int
    quiz_count: int
    model_config = ConfigDict(from_attributes=True)
