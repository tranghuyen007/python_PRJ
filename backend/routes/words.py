from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.security import get_current_user, require_admin
from models.curriculum import Word
from schemas.curriculum import WordCreate, WordUpdate, WordResponse
from schemas.common import VisibilityUpdate

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
def create_word(data: WordCreate, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    obj = Word(**data.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
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
