from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class PronunciationAttemptCreate(BaseModel):
    word: str = Field(min_length=1, max_length=100)
    mode: Literal["word", "sentence"]
    target_text: str = Field(min_length=1, max_length=500)
    transcript: str = Field(default="", max_length=500)
    score: int = Field(ge=0, le=100)


class PronunciationAttemptResponse(BaseModel):
    attempt_id: int
    word: str
    mode: str
    score: int
    best_score: int
    attempts: int
    blocked_words: int = 0
    created_at: datetime


class WeakWord(BaseModel):
    word: str
    mode: str
    best_score: int
    attempts: int
    last_practiced_at: datetime


class PronunciationSummary(BaseModel):
    total_attempts: int
    average_score: int
    words_practiced: int
    weak_words: list[WeakWord]