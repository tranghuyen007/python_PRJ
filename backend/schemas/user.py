from datetime import datetime
from pydantic import BaseModel, ConfigDict

class UserResponse(BaseModel):
    user_id: int
    username: str
    email: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)