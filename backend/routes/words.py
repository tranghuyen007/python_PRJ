from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.security import get_current_user, require_admin
from models.curriculum import Word
from schemas.curriculum import WordCreate, WordUpdate, WordResponse
from schemas.common import VisibilityUpdate
from services.word_service import create_word as create_word_service
from pathlib import Path
from app.database import DATABASE_FILE

from models.curriculum import (
    Word,
    LessonWord,
)
from models.progress import UserWordProgress
from models.review import ReviewSessionItem

router = APIRouter(prefix="/words", tags=["Words"])

@router.get("/", response_model=list[WordResponse])
def list_words(search: str | None = None, include_inactive: bool = False, db: Session = Depends(get_db), _: object = Depends(get_current_user)):
    q = db.query(Word)
    if search: q = q.filter(Word.word.ilike(f"%{search}%"))
    if not include_inactive: q = q.filter(Word.is_active == 1)
    return q.order_by(Word.word_id).all()

@router.get("/{word_id}", response_model=WordResponse)
def get_word(word_id: int, db: Session = Depends(get_db), _: object = Depends(get_current_user)):
    obj = db.query(Word).filter_by(word_id=word_id, is_active=1).first()
    if not obj: raise HTTPException(404, "Active word not found")
    return obj

@router.post("/", response_model=WordResponse, status_code=201)
async def create_word(
    data: WordCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin)
):
    obj = await create_word_service(db, data)
    return obj

@router.patch("/{word_id}", response_model=WordResponse)
def update_word(word_id: int, data: WordUpdate, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    obj = db.query(Word).filter_by(word_id=word_id).first()
    if not obj: raise HTTPException(404, "Word not found")
    for k,v in data.model_dump(exclude_unset=True).items():
        if v is not None: setattr(obj,k,v)
    db.commit(); db.refresh(obj)
    return obj

@router.patch("/{word_id}/visibility", response_model=WordResponse)
def set_word_visibility(word_id: int, data: VisibilityUpdate, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    obj = db.query(Word).filter_by(word_id=word_id).first()
    if not obj: raise HTTPException(404, "Word not found")
    obj.is_active = int(data.is_active); db.commit(); db.refresh(obj)
    return obj

@router.delete("/{word_id}", status_code=204)
def delete_word(
    word_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin)
):
    obj = db.query(Word).filter_by(word_id=word_id).first()

    if not obj:
        raise HTTPException(404, "Word not found")

    # Kiểm tra từ đã được gắn vào bài học chưa
    lesson_count = (
        db.query(LessonWord)
        .filter_by(word_id=word_id)
        .count()
    )

    # Kiểm tra tiến độ học của người dùng
    progress_count = (
        db.query(UserWordProgress)
        .filter_by(word_id=word_id)
        .count()
    )

    # Kiểm tra lịch sử các câu hỏi ôn tập
    review_count = (
        db.query(ReviewSessionItem)
        .filter_by(word_id=word_id)
        .count()
    )

    # Không xóa nếu từ đã có dữ liệu liên quan
    if lesson_count > 0 or progress_count > 0 or review_count > 0:
        raise HTTPException(
            status_code=409,
            detail={
                "message": (
                    "Cannot permanently delete this word "
                    "because it has related learning data. "
                    "Please hide this word instead."
                ),
                "lesson_count": lesson_count,
                "progress_count": progress_count,
                "review_count": review_count,
                "suggestion": "Set is_active = 0 to hide this word."
            }
        )

    # Lưu đường dẫn audio trước khi xoá bản ghi
    audio_url = obj.audio_url

    try:
        db.delete(obj)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Cannot delete this word because it may be referenced by other records."
        )

    # Chỉ xoá file audio NỘI BỘ sau khi database xoá thành công
    if audio_url and (
        audio_url.startswith("/uploads/audio/")
        or audio_url.startswith("uploads/audio/")
    ):
        audio_dir = (DATABASE_FILE.parent / "uploads" / "audio").resolve()
        audio_file = (audio_dir / Path(audio_url).name).resolve()

        if audio_file.parent == audio_dir and audio_file.is_file():
            try:
                audio_file.unlink()
            except OSError:
                pass

    return None