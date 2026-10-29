from sqlalchemy.orm import Session
from models.curriculum import Level, Topic, Lesson, Word, LessonWord

def save(db, obj):
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
        return obj
    except Exception:
        db.rollback()
        raise

def set_fields(obj, data):
    for key, value in data.items():
        if value is not None:
            setattr(obj, key, value)

def get_or_404(db, model, id_value, field):
    obj = db.query(model).filter(getattr(model, field) == id_value).first()
    if obj is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Resource not found")
    return obj
