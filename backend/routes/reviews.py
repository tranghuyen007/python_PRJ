from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.security import get_current_user
from models.user import User
from models.review import ReviewSession, ReviewSessionItem
from models.curriculum import Topic, Word
from models.progress import UserWordProgress
from schemas.review import ReviewSessionCreate, ReviewSessionResponse, ReviewAnswer, ReviewItemResponse
from services.review_service import start_review, submit_answer, complete_review

router = APIRouter(prefix="/reviews", tags=["Reviews"])

@router.get("/due-words")
def due_words(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from datetime import datetime
    now = datetime.utcnow()
    rows = (db.query(UserWordProgress, Word)
            .join(Word, Word.word_id == UserWordProgress.word_id)
            .filter(UserWordProgress.user_id == user.user_id, Word.is_active == 1,
                    UserWordProgress.next_review_at.is_not(None), UserWordProgress.next_review_at <= now)
            .order_by(UserWordProgress.next_review_at).all())
    return [{"progress": p, "word": w} for p, w in rows]

@router.post("/sessions", response_model=ReviewSessionResponse, status_code=201)
def create_review_session(data: ReviewSessionCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        return start_review(db, user.user_id, data.topic_id, data.review_type)
    except LookupError as e: raise HTTPException(404, str(e)) from e
    except ValueError as e: raise HTTPException(422, str(e)) from e

@router.get("/sessions/{session_id}", response_model=ReviewSessionResponse)
def get_review_session(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    obj = db.query(ReviewSession).filter_by(review_session_id=session_id, user_id=user.user_id).first()
    if not obj: raise HTTPException(404, "Review session not found")
    return obj

@router.get("/sessions/{session_id}/items", response_model=list[ReviewItemResponse])
def get_review_items(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    session = db.query(ReviewSession).filter_by(review_session_id=session_id, user_id=user.user_id).first()
    if not session: raise HTTPException(404, "Review session not found")
    return db.query(ReviewSessionItem).filter_by(review_session_id=session_id).all()

@router.post("/sessions/{session_id}/answers", response_model=ReviewItemResponse)
def answer_review_item(session_id: int, data: ReviewAnswer, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        return submit_answer(db, user.user_id, session_id, data.word_id, data.is_correct)
    except LookupError as e: raise HTTPException(404, str(e)) from e
    except ValueError as e: raise HTTPException(409, str(e)) from e

@router.post("/sessions/{session_id}/complete", response_model=ReviewSessionResponse)
def finish_review_session(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try: return complete_review(db, user.user_id, session_id)
    except LookupError as e: raise HTTPException(404, str(e)) from e
    except ValueError as e: raise HTTPException(409, str(e)) from e
