from typing import Any

from pydantic import BaseModel, Field


class TopicProgressResponse(BaseModel):
    topic_id: int
    learned_count: int
    learned_word_ids: list[int]


class LearnedWordResponse(BaseModel):
    topic_id: int
    word_id: int
    learned: bool
    learned_count: int


class QuickReviewItemResponse(BaseModel):
    item_id: int
    word_id: int
    question_data: dict[str, Any]


class QuickReviewSessionResponse(BaseModel):
    review_session_id: int
    topic_id: int
    total_items: int
    items: list[QuickReviewItemResponse]


class QuickReviewAnswer(BaseModel):
    answer: str = Field(min_length=1, max_length=1000)


class QuickReviewAnswerResponse(BaseModel):
    item_id: int
    is_correct: bool
    correct_answer: str
    completed_items: int
    total_items: int
    session_completed: bool
