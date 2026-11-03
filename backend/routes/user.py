from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.security import get_current_user, require_admin
from models.user import User
from schemas.user import UserCreate, UserResponse, UserUpdate, UserStatusUpdate
from services.user_service import get_all_users, create_user, update_user

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/", response_model=UserResponse, status_code=201)
def register_user(data: UserCreate, db: Session = Depends(get_db)):
    try:
        return create_user(db, data.username, str(data.email), data.password)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e

@router.get("/", response_model=list[UserResponse])
def read_users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return get_all_users(db)

@router.get("/me", response_model=UserResponse)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/me", response_model=UserResponse)
def update_me(data: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        return update_user(db, current_user, data.model_dump(exclude_unset=True))
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e

@router.patch("/{user_id}/status", response_model=UserResponse)
def update_user_status(user_id: int, data: UserStatusUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    if data.status not in ("ACTIVE", "LOCKED"):
        raise HTTPException(status_code=422, detail="status must be ACTIVE or LOCKED")
    user = db.query(User).filter_by(user_id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = data.status
    db.commit()
    db.refresh(user)
    return user
