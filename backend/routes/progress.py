from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.security import get_current_user
from models.user import User
from models.progress import UserLessonProgress, UserTopicProgress, UserWordProgress
from models.curriculum import Lesson, Topic
from schemas.progress import LessonProgressUpdate, LessonProgressResponse, TopicProgressResponse
from services.progress_service import update_lesson_progress

router = APIRouter(prefix="/progress", tags=["Progress"])

@router.get("/lessons", response_model=list[LessonProgressResponse])
def list_lesson_progress(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(UserLessonProgress).filter_by(user_id=user.user_id).order_by(UserLessonProgress.updated_at.desc()).all()

@router.put("/lessons/{lesson_id}", response_model=LessonProgressResponse)
def save_lesson_progress(lesson_id: int, data: LessonProgressUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        return update_lesson_progress(db, user.user_id, lesson_id, data.completed_items, data.total_items, data.is_completed)
    except ValueError as e:
        raise HTTPException(422, str(e)) from e
    except LookupError as e:
        raise HTTPException(404, str(e)) from e

@router.get("/topics", response_model=list[TopicProgressResponse])
def list_topic_progress(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(UserTopicProgress).filter_by(user_id=user.user_id).all()

@router.get("/words")
def list_word_progress(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(UserWordProgress).filter_by(user_id=user.user_id).order_by(UserWordProgress.updated_at.desc()).all()

@router.get("/overview")
def progress_overview(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lessons = db.query(UserLessonProgress).filter_by(user_id=user.user_id).all()
    topics = db.query(UserTopicProgress).filter_by(user_id=user.user_id).all()
    words = db.query(UserWordProgress).filter_by(user_id=user.user_id).all()
    return {
        "completed_lessons": sum(int(x.is_completed) for x in lessons),
        "total_lessons_started": len(lessons),
        "topics_started": len(topics),
        "words_learned": sum(int(x.learned) for x in words),
        "words_mastered": sum(int(x.mastered) for x in words),
    }
