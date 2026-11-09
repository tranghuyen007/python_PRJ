from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from models.curriculum import Lesson, Topic, LessonWord
from models.progress import UserLessonProgress, UserTopicProgress, UserWordProgress, UserDailyActivity
from models.curriculum import Word
from schemas.progress import LessonPageProgressUpdate

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

def record_lesson_page(
    db: Session,
    user_id: int,
    lesson_id: int,
    stage: str,
    page_number: int,
):
    lesson = db.query(Lesson).filter_by(
        lesson_id=lesson_id,
        is_active=1,
    ).first()

    if lesson is None:
        raise LookupError("Lesson not found or inactive")

    word_count = (
        db.query(LessonWord.word_id)
        .join(Word, Word.word_id == LessonWord.word_id)
        .filter(
            LessonWord.lesson_id == lesson_id,
            Word.is_active == 1,
        )
        .count()
    )

    if word_count == 0:
        raise ValueError("This lesson has no active words")

    total_pages = 2 * word_count + 1

    if stage == "VOCABULARY":
        if page_number > word_count:
            raise ValueError("Invalid vocabulary page_number")
        reached_page = page_number

    elif stage == "FLASHCARD":
        if page_number > word_count:
            raise ValueError("Invalid flashcard page_number")
        reached_page = word_count + page_number

    elif stage == "MATCHING":
        if page_number != 1:
            raise ValueError("MATCHING has only one page")
        reached_page = total_pages

    else:
        raise ValueError("Invalid stage")

    row = db.query(UserLessonProgress).filter_by(
        user_id=user_id,
        lesson_id=lesson_id,
    ).first()

    if row is None:
        row = UserLessonProgress(
            user_id=user_id,
            lesson_id=lesson_id,
            completed_items=reached_page,
            total_items=total_pages,
            is_completed=int(reached_page == total_pages),
        )
        db.add(row)
    else:
        old_percent = (
            row.completed_items / row.total_items
            if row.total_items > 0
            else 0
        )
        new_percent = reached_page / total_pages

        # Chỉ cập nhật khi lần này đạt phần trăm cao hơn.
        if new_percent > old_percent:
            row.completed_items = reached_page
            row.total_items = total_pages
            row.is_completed = int(reached_page == total_pages)

    try:
        db.commit()
        db.refresh(row)
    except Exception:
        db.rollback()
        raise

    saved_percent = (
        round(row.completed_items * 100 / row.total_items, 2)
        if row.total_items > 0
        else 0
    )

    return {
        "lesson_id": lesson_id,
        "progress_percent": saved_percent,
    }