from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.security import get_current_user, get_db, require_admin
from models.curriculum import Lesson, LessonWord, Level, Topic, Word
from models.user import User
from schemas.placement_test import (
    LevelAccessResponse,
    LevelCreate,
    LevelResponse,
    LessonResponse,
    PlacementTestSettingsUpdate,
    TopicResponse,
    WordResponse,
)
from services.placement_test_service import (
    get_level_or_raise,
    get_level_words,
    level_is_unlocked,
)


router = APIRouter(tags=["Levels"])


def _level_response(db: Session, user: User, level: Level) -> dict:
    return {
        "level_id": level.level_id,
        "name": level.name,
        "description": level.description,
        "display_order": level.display_order,
        "placement_test_enabled": bool(level.placement_test_enabled),
        "placement_test_question_count": level.placement_test_question_count,
        "placement_test_passing_score": level.placement_test_passing_score,
        "is_unlocked": level_is_unlocked(db, user, level),
    }


def _require_unlocked_level(db: Session, user: User, level_id: int) -> Level:
    level = get_level_or_raise(db, level_id)
    if not level_is_unlocked(db, user, level):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pass this level's placement test or a higher-level test to access its content",
        )
    return level


@router.get("/levels", response_model=list[LevelResponse])
def list_levels(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    levels = db.query(Level).filter_by(is_active=1).order_by(Level.display_order, Level.level_id).all()
    return [_level_response(db, user, level) for level in levels]


@router.post("/levels", response_model=LevelResponse, status_code=status.HTTP_201_CREATED)
def create_level(
    data: LevelCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    if db.query(Level).filter_by(name=data.name).first():
        raise HTTPException(status_code=409, detail="Level name already exists")

    level = Level(
        name=data.name,
        description=data.description,
        display_order=data.display_order,
        placement_test_enabled=int(data.placement_test_enabled),
        placement_test_question_count=data.placement_test_question_count,
        placement_test_passing_score=data.placement_test_passing_score,
    )
    db.add(level)
    db.commit()
    db.refresh(level)
    return _level_response(db, user, level)


@router.get("/levels/{level_id}/access", response_model=LevelAccessResponse)
def get_level_access(
    level_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    level = get_level_or_raise(db, level_id)
    if level.placement_test_enabled:
        question_count = min(
            level.placement_test_question_count,
            len(get_level_words(db, level_id)),
        )
        passing_score = (
            min(level.placement_test_passing_score, question_count)
            if question_count
            else None
        )
    else:
        question_count = None
        passing_score = None
    return {
        "level_id": level.level_id,
        "is_unlocked": level_is_unlocked(db, user, level),
        "placement_test_enabled": bool(level.placement_test_enabled),
        "question_count": question_count,
        "required_passing_score": passing_score,
    }


@router.patch("/admin/levels/{level_id}/placement-test")
def update_placement_test_settings(
    level_id: int,
    data: PlacementTestSettingsUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    level = get_level_or_raise(db, level_id)
    if data.passing_score > data.question_count:
        raise HTTPException(
            status_code=422,
            detail="passing score cannot exceed the configured question count",
        )
    level.placement_test_enabled = int(data.enabled)
    level.placement_test_question_count = data.question_count
    level.placement_test_passing_score = data.passing_score
    db.commit()
    db.refresh(level)
    return {
        "level_id": level.level_id,
        "placement_test_enabled": bool(level.placement_test_enabled),
        "placement_test_question_count": level.placement_test_question_count,
        "placement_test_passing_score": level.placement_test_passing_score,
    }


@router.get(
    "/levels/{level_id}/topics",
    response_model=list[TopicResponse],
)
def list_level_topics(
    level_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    level = _require_unlocked_level(db, user, level_id)
    return (
        db.query(Topic)
        .filter_by(level_id=level.level_id, is_active=1)
        .order_by(Topic.display_order, Topic.topic_id)
        .all()
    )


@router.get("/topics/{topic_id}/lessons", response_model=list[LessonResponse])
def list_topic_lessons(
    topic_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    topic = db.query(Topic).filter_by(topic_id=topic_id, is_active=1).first()
    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    _require_unlocked_level(db, user, topic.level_id)
    return (
        db.query(Lesson)
        .filter_by(topic_id=topic_id, is_active=1)
        .order_by(Lesson.display_order, Lesson.lesson_id)
        .all()
    )


@router.get("/lessons/{lesson_id}/words", response_model=list[WordResponse])
def list_lesson_words(
    lesson_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    lesson = db.query(Lesson).filter_by(lesson_id=lesson_id, is_active=1).first()
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    topic = db.query(Topic).filter_by(topic_id=lesson.topic_id, is_active=1).first()
    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    _require_unlocked_level(db, user, topic.level_id)
    return (
        db.query(Word)
        .join(LessonWord, LessonWord.word_id == Word.word_id)
        .filter(
            LessonWord.lesson_id == lesson_id,
            Word.is_active == 1,
        )
        .order_by(LessonWord.display_order, Word.word_id)
        .all()
    )
