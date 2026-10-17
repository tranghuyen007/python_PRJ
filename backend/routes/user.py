from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import SessionLocal
from schemas.user import UserResponse
from services.user_service import get_all_users


router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/", response_model=list[UserResponse])
def read_users(db: Session = Depends(get_db)):
    return get_all_users(db)
