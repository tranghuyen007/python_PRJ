from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class UserCreate(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=30)
    email: str = Field(min_length=5, max_length=40)
    password: str = Field(min_length=9, max_length=40)
    full_name: str | None = Field(default=None, max_length=100)
    gender: str | None = Field(default=None, max_length=20)

class UserResponse(BaseModel):
    user_id: int
    username: str
    email: str
    full_name: str | None = None
    gender: str | None = None
    role: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)