from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from schemas.user import UserResponse, UserCreate
from services.user_service import get_all_users, create_user
from app.security import get_current_user, get_db
from models.user import User

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)
class AvatarUpdate(BaseModel):
    avatar_key: str = Field(min_length=1, max_length=30)


@router.patch("/me/avatar", response_model=UserResponse)
def update_avatar(
    data: AvatarUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    allowed = {
        "bunny",
        "bunny_blue",
        "bunny_pink",
        "bunny_green",
        "bunny_purple",
        "bunny_orange",
    }
    if data.avatar_key not in allowed:
        raise HTTPException(status_code=422, detail="Invalid avatar")
    current_user.avatar_key = data.avatar_key
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/", response_model=list[UserResponse])
def read_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_all_users(db)

@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)

def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    try:
        return create_user(
            db=db,
            username=user_data.username,
            email=user_data.email,
            password=user_data.password,
            full_name=user_data.full_name,
            gender=user_data.gender,
            avatar_key=user_data.avatar_key or "bunny",
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error
