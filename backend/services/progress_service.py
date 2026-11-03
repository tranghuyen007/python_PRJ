from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from models.curriculum import Lesson, Topic, LessonWord
from models.progress import UserLessonProgress, UserTopicProgress, UserWordProgress, UserDailyActivity

def get_or_create_daily(db: Session, user_id: int):
    today = date.today()
    row = db.query(UserDailyActivity).filter_by(user_id=user_id, activity_date=today).first()
    if row is None:
        row = UserDailyActivity(user_id=user_id, activity_date=today)
        db.add(row)
        db.flush()
    return row

def update_lesson_progress(db: Session, user_id: int, lesson_id: int, completed_items: int, total_items: int, is_completed: bool):
    if completed_items > total_items:
        raise ValueError("completed_items cannot exceed total_items")
    lesson = db.query(Lesson).filter_by(lesson_id=lesson_id, is_active=1).first()
    if lesson is None:
        raise LookupError("Lesson not found or inactive")
    row = db.query(UserLessonProgress).filter_by(user_id=user_id, lesson_id=lesson_id).first()
    if row is None:
        row = UserLessonProgress(user_id=user_id, lesson_id=lesson_id)
        db.add(row)
    row.completed_items = completed_items
    row.total_items = total_items
    row.is_completed = int(is_completed)
    if is_completed:
        row.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    activity = get_or_create_daily(db, user_id)
    try:
        db.commit()
        db.refresh(row)
        return row
    except Exception:
        db.rollback()
        raise
