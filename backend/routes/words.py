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

    # Chỉ xoá file audio sau khi database xoá thành công
    if audio_url:
        audio_dir = DATABASE_FILE.parent / "uploads" / "audio"
        filename = Path(audio_url).name
        audio_file = audio_dir / filename

        if audio_file.parent == audio_dir and audio_file.exists():
            audio_file.unlink()

    return None