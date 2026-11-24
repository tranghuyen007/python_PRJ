
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


# Thong tin hien thi cua user trong danh sach 
class AdminUserListItem(BaseModel):
    user_id: int
    username: str
    email: str
    full_name: str | None = None
    role: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Thong tin chi tiet cua user
class AdminUserDetail(AdminUserListItem):
    gender: str | None = None
    bio: str | None = None
    avatar_key: str = "bunny"
    updated_at: datetime


# Cap nhat thong tin user
class AdminUserUpdate(BaseModel):
    username: str | None = Field(
        default=None,
        min_length=3,
        max_length=30
    )

    email: str | None = Field(
        default=None,
        min_length=5,
        max_length=40
    )

    full_name: str | None = Field(
        default=None,
        max_length=100
    )


# Locked/ Unlocked user
class AdminUserStatusUpdate(BaseModel):
    status: Literal["ACTIVE", "LOCKED"]