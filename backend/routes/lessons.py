from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.security import get_current_user, require_admin
from models.curriculum import Topic, Lesson, Word, LessonWord
from schemas.curriculum import LessonCreate, LessonUpdate, LessonResponse, LessonWordResponse, WordResponse
from schemas.common import VisibilityUpdate, IdList

router = APIRouter(tags=["Lessons"])

@router.post("/topics/{topic_id}/lessons", response_model=LessonResponse, status_code=201)
def create_lesson(topic_id: int, data: LessonCreate, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    if not db.query(Topic).filter_by(topic_id=topic_id, is_active=1).first():
        raise HTTPException(404, "Active topic not found")
    if db.query(Lesson).filter_by(topic_id=topic_id, display_order=data.display_order).first():
        raise HTTPException(409, "display_order already used in this topic")
    obj = Lesson(topic_id=topic_id, **data.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.get("/topics/{topic_id}/lessons", response_model=list[LessonResponse])
def list_lessons(topic_id: int, include_inactive: bool = False, db: Session = Depends(get_db), _: object = Depends(get_current_user)):
    if not db.query(Topic).filter_by(topic_id=topic_id).first(): raise HTTPException(404, "Topic not found")
    q = db.query(Lesson).filter_by(topic_id=topic_id)
    if not include_inactive: q = q.filter(Lesson.is_active == 1)
    return q.order_by(Lesson.display_order, Lesson.lesson_id).all()

@router.get("/lessons/{lesson_id}", response_model=LessonResponse)
def get_lesson(lesson_id: int, db: Session = Depends(get_db), _: object = Depends(get_current_user)):
    obj = db.query(Lesson).filter_by(lesson_id=lesson_id).first()
    if not obj: raise HTTPException(404, "Lesson not found")
    return obj

@router.patch("/lessons/{lesson_id}", response_model=LessonResponse)
def update_lesson(lesson_id: int, data: LessonUpdate, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    obj = db.query(Lesson).filter_by(lesson_id=lesson_id).first()
    if not obj: raise HTTPException(404, "Lesson not found")
    changes = data.model_dump(exclude_unset=True)
    if changes.get("display_order") is not None and db.query(Lesson).filter(Lesson.topic_id == obj.topic_id, Lesson.display_order == changes["display_order"], Lesson.lesson_id != lesson_id).first():
        raise HTTPException(409, "display_order already used in this topic")
    for k,v in changes.items():
        if v is not None: setattr(obj,k,v)
    db.commit(); db.refresh(obj)
    return obj

@router.patch("/lessons/{lesson_id}/visibility", response_model=LessonResponse)
def set_lesson_visibility(lesson_id: int, data: VisibilityUpdate, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    obj = db.query(Lesson).filter_by(lesson_id=lesson_id).first()
    if not obj: raise HTTPException(404, "Lesson not found")
    obj.is_active = int(data.is_active); db.commit(); db.refresh(obj)
    return obj

@router.delete("/lessons/{lesson_id}", status_code=204)
def delete_lesson(lesson_id: int, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    obj = db.query(Lesson).filter_by(lesson_id=lesson_id).first()
    if not obj: raise HTTPException(404, "Lesson not found")
    db.delete(obj)
    try: db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(409, "Cannot delete lesson because dependent data exists; hide it instead")

@router.put("/lessons/{lesson_id}/words", response_model=list[LessonWordResponse])
def assign_words(lesson_id: int, data: IdList, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    lesson = db.query(Lesson).filter_by(lesson_id=lesson_id).first()
    if not lesson: raise HTTPException(404, "Lesson not found")
    ids = list(dict.fromkeys(data.word_ids))
    words = db.query(Word).filter(Word.word_id.in_(ids), Word.is_active == 1).all()
    if len(words) != len(ids): raise HTTPException(404, "One or more active words were not found")
    # PUT replaces the current assignment list; delete only relationship rows.
    db.query(LessonWord).filter_by(lesson_id=lesson_id).delete(synchronize_session=False)
    for order, word_id in enumerate(ids, start=1):
        db.add(LessonWord(lesson_id=lesson_id, word_id=word_id, display_order=order))
    db.commit()
    rows = db.query(LessonWord).options(joinedload(LessonWord.word)).filter_by(lesson_id=lesson_id).order_by(LessonWord.display_order).all()
    result = []
    for row in rows:
        word = db.query(Word).filter_by(word_id=row.word_id).first()
        result.append({"lesson_id": row.lesson_id, "word_id": row.word_id, "display_order": row.display_order, "word": word})
    return result

@router.get("/lessons/{lesson_id}/words", response_model=list[WordResponse])
def get_lesson_words(lesson_id: int, db: Session = Depends(get_db), _: object = Depends(get_current_user)):
    lesson = db.query(Lesson).filter_by(lesson_id=lesson_id, is_active=1).first()
    if not lesson: raise HTTPException(404, "Active lesson not found")
    return (db.query(Word).join(LessonWord, LessonWord.word_id == Word.word_id)
            .filter(LessonWord.lesson_id == lesson_id, Word.is_active == 1)
            .order_by(LessonWord.display_order).all())

@router.delete("/lessons/{lesson_id}/words/{word_id}", status_code=204)
def unassign_word(lesson_id: int, word_id: int, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    row = db.query(LessonWord).filter_by(lesson_id=lesson_id, word_id=word_id).first()
    if not row: raise HTTPException(404, "Word is not assigned to this lesson")
    db.delete(row); db.commit()
