from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, EmailStr

class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class UserUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=30)
    email: EmailStr | None = None

class UserResponse(BaseModel):
    user_id: int
    username: str
    email: str
    role: str
    status: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class UserStatusUpdate(BaseModel):
    status: str
