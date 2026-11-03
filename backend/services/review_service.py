from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from models.curriculum import Topic, Lesson, LessonWord, Word
from models.review import ReviewSession, ReviewSessionItem
from models.progress import UserWordProgress, UserDailyActivity
from services.progress_service import get_or_create_daily

def start_review(db: Session, user_id: int, topic_id: int, review_type: str):
    if review_type not in ("NORMAL", "FULL_TOPIC"):
        raise ValueError("review_type must be NORMAL or FULL_TOPIC")
    topic = db.query(Topic).filter_by(topic_id=topic_id, is_active=1).first()
    if not topic:
        raise LookupError("Topic not found or inactive")
    lesson_ids = [x[0] for x in db.query(Lesson.lesson_id).filter_by(topic_id=topic_id, is_active=1).all()]
    word_ids = []
    if lesson_ids:
        word_ids = [x[0] for x in db.query(LessonWord.word_id).join(Word, Word.word_id == LessonWord.word_id)
                    .filter(LessonWord.lesson_id.in_(lesson_ids), Word.is_active == 1).distinct().all()]
    if not word_ids:
        raise ValueError("This topic has no active vocabulary assigned to its lessons")
    session = ReviewSession(user_id=user_id, topic_id=topic_id, review_type=review_type, total_items=len(word_ids))
    db.add(session)
    db.flush()
    for word_id in word_ids:
        db.add(ReviewSessionItem(review_session_id=session.review_session_id, word_id=word_id))
    try:
        db.commit()
        db.refresh(session)
        return session
    except Exception:
        db.rollback()
        raise

def submit_answer(db: Session, user_id: int, session_id: int, word_id: int, is_correct: bool):
    session = db.query(ReviewSession).filter_by(review_session_id=session_id, user_id=user_id).first()
    if not session:
        raise LookupError("Review session not found")
    if session.completed_at:
        raise ValueError("Review session is already completed")
    item = db.query(ReviewSessionItem).filter_by(review_session_id=session_id, word_id=word_id).first()
    if not item:
        raise LookupError("Word does not belong to this review session")
    if item.is_answered:
        raise ValueError("This word has already been answered")
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    item.is_answered = 1
    item.is_correct = int(is_correct)
    item.answered_at = now
    if is_correct:
        session.correct_count += 1
    progress = db.query(UserWordProgress).filter_by(user_id=user_id, word_id=word_id).first()
    if progress is None:
        progress = UserWordProgress(user_id=user_id, word_id=word_id, learned=1)
        db.add(progress)
    progress.learned = 1
    progress.review_count += 1
    progress.correct_count += int(is_correct)
    progress.wrong_count += int(not is_correct)
    progress.last_reviewed_at = now
    # Simple starter scheduling; replace with a real spaced-repetition policy later.
    progress.next_review_at = now + timedelta(days=2 if is_correct else 1)
    try:
        db.commit()
        db.refresh(item)
        return item
    except Exception:
        db.rollback()
        raise

def complete_review(db: Session, user_id: int, session_id: int):
    session = db.query(ReviewSession).filter_by(review_session_id=session_id, user_id=user_id).first()
    if not session:
        raise LookupError("Review session not found")
    unanswered = db.query(ReviewSessionItem).filter_by(review_session_id=session_id, is_answered=0).count()
    if unanswered:
        raise ValueError(f"{unanswered} item(s) have not been answered")
    session.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    activity = get_or_create_daily(db, user_id)
    activity.review_count += session.total_items
    try:
        db.commit()
        db.refresh(session)
        return session
    except Exception:
        db.rollback()
        raise
