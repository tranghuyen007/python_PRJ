
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import SessionLocal
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
