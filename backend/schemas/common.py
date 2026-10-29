from pydantic import BaseModel, ConfigDict, Field
from typing import Optional

class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class Message(BaseModel):
    message: str

class VisibilityUpdate(BaseModel):
    is_active: bool

class IdList(BaseModel):
    word_ids: list[int] = Field(min_length=1)
