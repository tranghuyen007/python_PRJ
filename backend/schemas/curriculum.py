from pydantic import BaseModel, ConfigDict, Field
from typing import Optional

class LevelCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    display_order: int = 0

class LevelUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    display_order: int | None = None

class LevelResponse(BaseModel):
    level_id: int
    name: str
    description: str | None
    is_active: int
    display_order: int
    model_config = ConfigDict(from_attributes=True)

class TopicCreate(BaseModel):
    level_id: int
    name: str = Field(min_length=1, max_length=150)
    description: str | None = None
    display_order: int = 0

class TopicUpdate(BaseModel):
    level_id: int | None = None
    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = None
    display_order: int | None = None

class TopicResponse(BaseModel):
    topic_id: int
    level_id: int
    name: str
    description: str | None
    is_active: int
    display_order: int
    model_config = ConfigDict(from_attributes=True)

class LessonCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: str | None = None
    display_order: int = 0

class LessonUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = None
    display_order: int | None = None

class LessonResponse(BaseModel):
    lesson_id: int
    topic_id: int
    name: str
    description: str | None
    is_active: int
    display_order: int
    model_config = ConfigDict(from_attributes=True)

class WordCreate(BaseModel):
    word: str = Field(min_length=1, max_length=200)
    meaning: str = Field(min_length=1)
    pronunciation: str | None = None
    part_of_speech: str | None = None
    example: str | None = None

class WordUpdate(BaseModel):
    word: str | None = Field(default=None, min_length=1, max_length=200)
    meaning: str | None = None
    pronunciation: str | None = None
    part_of_speech: str | None = None
    example: str | None = None

class WordResponse(BaseModel):
    word_id: int
    word: str
    meaning: str
    pronunciation: str | None
    part_of_speech: str | None
    is_active: int
    example: str | None
    model_config = ConfigDict(from_attributes=True)

class LessonWordResponse(BaseModel):
    lesson_id: int
    word_id: int
    display_order: int
    word: WordResponse
