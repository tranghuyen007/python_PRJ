from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.security import get_current_user
from models.user import User
from schemas.auth import LoginRequest, TokenResponse
from services.auth_service import (
    authenticate_user,
    create_access_token,
)


router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/login", response_model=TokenResponse)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
):
    try:
        user = authenticate_user(
            db=db,
            identifier=login_data.identifier,
            password=login_data.password,
        )
    except ValueError as error:
        message = str(error)

        if message == "Account is locked or inactive":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=message,
            ) from error

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error

    access_token = create_access_token(user)

    return TokenResponse(access_token=access_token)


class ProfileUpdate(BaseModel):
    # Khớp với giới hạn của form trong profile.js (tên 40 kí tự, giới thiệu 120 kí tự)
    full_name: str = Field(min_length=1, max_length=40)
    bio: str | None = Field(default=None, max_length=120)


def _profile_dict(user: User) -> dict:
    return {
        "user_id": user.user_id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "gender": user.gender,
        "bio": user.bio or "",
        "role": user.role,
        "avatar_key": user.avatar_key or "bunny",
        "created_at": user.created_at,
    }


@router.get("/me")
def current_user_profile(user: User = Depends(get_current_user)):
    return _profile_dict(user)


@router.put("/me")
def update_current_user_profile(
    data: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    full_name = data.full_name.strip()
    if not full_name:
        raise HTTPException(
            status_code=422,
            detail="Vui lòng nhập tên của bạn",
        )

    # get_current_user dùng session riêng, nên lấy lại user trong session của request này
    db_user = db.query(User).filter(User.user_id == user.user_id).first()
    db_user.full_name = full_name
    db_user.bio = (data.bio or "").strip() or None
    db.commit()
    db.refresh(db_user)
    return _profile_dict(db_user)