from pydantic import BaseModel, Field

class LoginRequest(BaseModel):
    identifier: str = Field(min_length=3, max_length=30)
    password: str = Field(min_length=9, max_length=40)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
