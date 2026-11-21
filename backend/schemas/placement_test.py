from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


class LevelCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    display_order: int = Field(ge=0)
    placement_test_enabled: bool = False
    placement_test_question_count: int = Field(default=10, ge=1)
    placement_test_passing_score: int = Field(default=7, ge=1)
    is_active: bool = True

    @model_validator(mode="after")
    def validate_passing_score(self):
        if self.placement_test_passing_score > self.placement_test_question_count:
            raise ValueError("passing score cannot exceed the configured question count")
        return self


class LevelUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    display_order: int | None = Field(default=None, ge=0)
    placement_test_enabled: bool | None = None
    placement_test_question_count: int | None = Field(default=None, ge=1)
    placement_test_passing_score: int | None = Field(default=None, ge=1)
    is_active: bool | None = None

    @model_validator(mode="after")
    def validate_passing_score(self):
        if (
            self.placement_test_passing_score is not None
            and self.placement_test_question_count is not None
            and self.placement_test_passing_score > self.placement_test_question_count
        ):
            raise ValueError("passing score cannot exceed the configured question count")
        return self


class PlacementTestSettingsUpdate(BaseModel):
    enabled: bool
    question_count: int = Field(ge=1)
    passing_score: int = Field(ge=1)

    @model_validator(mode="after")
    def validate_passing_score(self):
        if self.passing_score > self.question_count:
            raise ValueError("passing score cannot exceed the configured question count")
        return self


class TopicCreate(BaseModel):
    level_id: int
    name: str = Field(min_length=1, max_length=150)
    description: str | None = None
    display_order: int = Field(default=1, ge=1)
    quick_review_limit: int = Field(default=15, ge=1)
    is_active: bool = True


class TopicUpdate(BaseModel):
    level_id: int | None = None
    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = None
    display_order: int | None = Field(default=None, ge=1)
    quick_review_limit: int | None = Field(default=None, ge=1)
    is_active: bool | None = None


class LessonCreate(BaseModel):
    topic_id: int
    name: str = Field(min_length=1, max_length=150)
    description: str | None = None
    display_order: int = Field(default=1, ge=1)
    is_active: bool = True


class LessonUpdate(BaseModel):
    topic_id: int | None = None
    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = None
    display_order: int | None = Field(default=None, ge=1)
    is_active: bool | None = None


class WordCreate(BaseModel):
    lesson_id: int
    word: str = Field(min_length=1, max_length=200)
    meaning: str = Field(min_length=1)
    pronunciation: str | None = None
    part_of_speech: str | None = None
    example: str | None = None


class WordUpdate(BaseModel):
    lesson_id: int | None = None
    word: str | None = Field(default=None, min_length=1, max_length=200)
    meaning: str | None = Field(default=None, min_length=1)
    pronunciation: str | None = None
    part_of_speech: str | None = None
    example: str | None = None


class LevelResponse(BaseModel):
    level_id: int
    name: str
    description: str | None
    display_order: int
    placement_test_enabled: bool
    placement_test_question_count: int
    placement_test_passing_score: int
    is_unlocked: bool
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class LevelAccessResponse(BaseModel):
    level_id: int
    is_unlocked: bool
    placement_test_enabled: bool
    question_count: int | None
    required_passing_score: int | None


class TopicResponse(BaseModel):
    topic_id: int
    level_id: int
    name: str
    description: str | None
    display_order: int
    quick_review_limit: int
    is_active: int

    model_config = ConfigDict(from_attributes=True)


class LessonResponse(BaseModel):
    lesson_id: int
    topic_id: int
    name: str
    description: str | None
    display_order: int
    is_active: int

    model_config = ConfigDict(from_attributes=True)


class WordResponse(BaseModel):
    word_id: int
    word: str
    meaning: str
    pronunciation: str | None
    part_of_speech: str | None
    example: str | None

    model_config = ConfigDict(from_attributes=True)


class AdminWordResponse(WordResponse):
    lesson_id: int


class PlacementTestAttemptResponse(BaseModel):
    attempt_id: int
    user_id: int
    level_id: int
    total_questions: int
    passing_score: int
    correct_answers: int
    passed: bool
    started_at: datetime
    completed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class PlacementTestQuestionResponse(BaseModel):
    item_id: int
    attempt_id: int
    word_id: int
    question_data: dict[str, Any]
    is_answered: bool

    model_config = ConfigDict(from_attributes=True)


class PlacementTestAnswerResponse(BaseModel):
    item_id: int
    is_correct: bool


class PlacementTestAnswer(BaseModel):
    answer: str = Field(min_length=1, max_length=1000)
