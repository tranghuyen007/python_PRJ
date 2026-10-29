from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.security import get_current_user
from models.user import User
from schemas.auth import LoginRequest, TokenResponse, ChangePasswordRequest
from services.auth_service import authenticate_user, create_access_token, change_password

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    try:
        user = authenticate_user(db, data.identifier, data.password)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e), headers={"WWW-Authenticate": "Bearer"}) from e
    return TokenResponse(access_token=create_access_token(user))

@router.post("/change-password", status_code=204)
def change_my_password(data: ChangePasswordRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        change_password(db, current_user, data.current_password, data.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return None
