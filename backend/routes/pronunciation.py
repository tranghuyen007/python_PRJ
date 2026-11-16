from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.security import get_current_user, get_db
from models.user import User
from schemas.pronunciation import (
    PronunciationAttemptCreate,
    PronunciationAttemptResponse,
    PronunciationSummary,
)
from services.pronunciation_service import get_summary, record_attempt


router = APIRouter(prefix="/pronunciation", tags=["Pronunciation"])


@router.post(
    "/attempts",
    response_model=PronunciationAttemptResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_pronunciation_attempt(
    data: PronunciationAttemptCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Lưu một lần đọc ở trang Luyện phát âm (điểm % do trình duyệt chấm bằng Web Speech API)."""
    try:
        return record_attempt(
            db,
            user_id=user.user_id,
            word=data.word,
            mode=data.mode,
            target_text=data.target_text,
            transcript=data.transcript,
            score=data.score,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.get("/summary", response_model=PronunciationSummary)
def read_pronunciation_summary(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Tổng quan luyện phát âm của người dùng + danh sách từ điểm cao nhất dưới 70%."""
    return get_summary(db, user_id=user.user_id)