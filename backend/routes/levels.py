from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.security import get_current_user, get_db, require_admin
from models.curriculum import Lesson, LessonWord, Level, Topic, Word
from models.user import User
from schemas.placement_test import (
    LevelAccessResponse,
    LevelCreate,
    LevelResponse,
    LevelUpdate,
    LessonCreate,
    LessonResponse,
    LessonUpdate,
    PlacementTestSettingsUpdate,
    AdminWordResponse,
    TopicCreate,
    TopicResponse,
    TopicUpdate,
    WordCreate,
    WordResponse,
    WordUpdate,
)
from services.placement_test_service import (
    get_level_words,
    level_is_unlocked,
)
from services.pronunciation_service import ensure_reference_audio


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
        "is_active": bool(level.is_active),
    }


def _require_unlocked_level(db: Session, user: User, level_id: int) -> Level:
    level = db.query(Level).filter_by(level_id=level_id, is_active=1).first()
    if level is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Level not found")
    if not level_is_unlocked(db, user, level):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pass this level's placement test or a higher-level test to access its content",
        )
    return level


def _next_lesson_word_order(db: Session, lesson_id: int) -> int:
    last_order = (
        db.query(LessonWord.display_order)
        .filter_by(lesson_id=lesson_id)
        .order_by(LessonWord.display_order.desc())
        .first()
    )
    return (last_order[0] if last_order is not None else 0) + 1


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
        is_active=int(data.is_active),
    )
    db.add(level)
    db.commit()
    db.refresh(level)
    return _level_response(db, user, level)


@router.patch("/levels/{level_id}", response_model=LevelResponse)
def update_level(
    level_id: int,
    data: LevelUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    level = db.query(Level).filter_by(level_id=level_id, is_active=1).first()
    if level is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Level not found")
    changes = data.model_dump(exclude_unset=True)
    if "name" in changes and changes["name"] != level.name:
        if db.query(Level).filter_by(name=changes["name"]).first():
            raise HTTPException(status_code=409, detail="Level name already exists")
    question_count = changes.get("placement_test_question_count", level.placement_test_question_count)
    passing_score = changes.get("placement_test_passing_score", level.placement_test_passing_score)
    if passing_score > question_count:
        raise HTTPException(status_code=422, detail="passing score cannot exceed the configured question count")
    for key, value in changes.items():
        if value is not None:
            setattr(level, key, int(value) if key in {"placement_test_enabled", "is_active"} else value)
    db.commit()
    db.refresh(level)
    return _level_response(db, user, level)


@router.delete("/levels/{level_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_level(
    level_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    level = db.query(Level).filter_by(level_id=level_id).first()
    if level is None:
        raise HTTPException(status_code=404, detail="Level not found")
    level.is_active = 0
    db.commit()


@router.get("/admin/levels", response_model=list[LevelResponse])
def admin_list_levels(
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    levels = db.query(Level).order_by(Level.display_order, Level.level_id).all()
    return [_level_response(db, user, level) for level in levels]


@router.get("/levels/{level_id}/access", response_model=LevelAccessResponse)
def get_level_access(
    level_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    level = db.query(Level).filter_by(level_id=level_id, is_active=1).first()
    if level is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Level not found")
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
    level = db.query(Level).filter_by(level_id=level_id).first()
    if level is None:
        raise HTTPException(status_code=404, detail="Level not found")
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


@router.get("/topics", response_model=list[TopicResponse])
def admin_list_topics(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return db.query(Topic).order_by(Topic.level_id, Topic.display_order, Topic.topic_id).all()


@router.post("/topics", response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
def admin_create_topic(
    data: TopicCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if db.query(Level).filter_by(level_id=data.level_id, is_active=1).first() is None:
        raise HTTPException(status_code=404, detail="Active level not found")
    if db.query(Topic).filter_by(level_id=data.level_id, name=data.name).first():
        raise HTTPException(status_code=409, detail="Topic name already exists in this level")
    topic = Topic(**data.model_dump(exclude={"is_active"}), is_active=int(data.is_active))
    db.add(topic)
    try:
        db.commit()
        db.refresh(topic)
    except Exception:
        db.rollback()
        raise
    return topic


@router.patch("/topics/{topic_id}", response_model=TopicResponse)
def admin_update_topic(
    topic_id: int,
    data: TopicUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    topic = db.query(Topic).filter_by(topic_id=topic_id).first()
    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    changes = data.model_dump(exclude_unset=True)
    if (
        changes.get("level_id") is not None
        and changes["level_id"] != topic.level_id
        and db.query(Level).filter_by(level_id=changes["level_id"], is_active=1).first() is None
    ):
        raise HTTPException(status_code=404, detail="Active level not found")
    next_level_id = changes.get("level_id", topic.level_id)
    next_name = changes.get("name", topic.name)
    if db.query(Topic).filter(
        Topic.level_id == next_level_id,
        Topic.name == next_name,
        Topic.topic_id != topic_id,
    ).first():
        raise HTTPException(status_code=409, detail="Topic name already exists in this level")
    for key, value in changes.items():
        if value is not None:
            setattr(topic, key, int(value) if key == "is_active" else value)
    db.commit()
    db.refresh(topic)
    return topic


@router.delete("/topics/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_topic(
    topic_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    topic = db.query(Topic).filter_by(topic_id=topic_id).first()
    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    topic.is_active = 0
    db.commit()


@router.post("/lessons", response_model=LessonResponse, status_code=status.HTTP_201_CREATED)
def admin_create_lesson(
    data: LessonCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if db.query(Topic).filter_by(topic_id=data.topic_id, is_active=1).first() is None:
        raise HTTPException(status_code=404, detail="Active topic not found")
    if db.query(Lesson).filter_by(topic_id=data.topic_id, display_order=data.display_order).first():
        raise HTTPException(status_code=409, detail="Lesson order already exists in this topic")
    lesson = Lesson(**data.model_dump(exclude={"is_active"}), is_active=int(data.is_active))
    db.add(lesson)
    try:
        db.commit()
        db.refresh(lesson)
    except Exception:
        db.rollback()
        raise
    return lesson


@router.patch("/lessons/{lesson_id}", response_model=LessonResponse)
def admin_update_lesson(
    lesson_id: int,
    data: LessonUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    lesson = db.query(Lesson).filter_by(lesson_id=lesson_id).first()
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    changes = data.model_dump(exclude_unset=True)
    if (
        changes.get("topic_id") is not None
        and changes["topic_id"] != lesson.topic_id
        and db.query(Topic).filter_by(topic_id=changes["topic_id"], is_active=1).first() is None
    ):
        raise HTTPException(status_code=404, detail="Active topic not found")
    next_topic_id = changes.get("topic_id", lesson.topic_id)
    next_order = changes.get("display_order", lesson.display_order)
    if db.query(Lesson).filter(
        Lesson.topic_id == next_topic_id,
        Lesson.display_order == next_order,
        Lesson.lesson_id != lesson_id,
    ).first():
        raise HTTPException(status_code=409, detail="Lesson order already exists in this topic")
    for key, value in changes.items():
        if value is not None:
            setattr(lesson, key, int(value) if key == "is_active" else value)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.delete("/lessons/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    lesson = db.query(Lesson).filter_by(lesson_id=lesson_id).first()
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    lesson.is_active = 0
    db.commit()


@router.get("/admin/lessons", response_model=list[LessonResponse])
def admin_list_lessons(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return db.query(Lesson).order_by(Lesson.topic_id, Lesson.display_order, Lesson.lesson_id).all()


@router.get("/admin/words", response_model=list[AdminWordResponse])
def admin_list_words(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    rows = (
        db.query(Word, LessonWord.lesson_id)
        .join(LessonWord, LessonWord.word_id == Word.word_id)
        .filter(Word.is_active == 1)
        .order_by(Word.word_id, LessonWord.lesson_id)
        .all()
    )
    return [
        {
            "word_id": word.word_id,
            "word": word.word,
            "meaning": word.meaning,
            "pronunciation": word.pronunciation,
            "part_of_speech": word.part_of_speech,
            "example": word.example,
            "ipa": word.ipa,
            "lesson_id": lesson_id,
        }
        for word, lesson_id in rows
    ]


@router.post("/words", response_model=AdminWordResponse, status_code=status.HTTP_201_CREATED)
def admin_create_word(
    data: WordCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    lesson = db.query(Lesson).filter_by(lesson_id=data.lesson_id, is_active=1).first()
    if lesson is None:
        raise HTTPException(status_code=404, detail="Active lesson not found")
    word = Word(
        word=data.word,
        meaning=data.meaning,
        pronunciation=data.pronunciation,
        part_of_speech=data.part_of_speech,
        example=data.example,
        ipa=data.ipa,
        is_active=1,
    )
    db.add(word)
    try:
        db.flush()
        db.add(
            LessonWord(
                lesson_id=lesson.lesson_id,
                word_id=word.word_id,
                display_order=_next_lesson_word_order(db, lesson.lesson_id),
            )
        )
        db.commit()
        db.refresh(word)
        try:
            ensure_reference_audio(word)
            db.commit()
        except Exception:
            db.rollback()
    except Exception:
        db.rollback()
        raise
    return {
        "word_id": word.word_id,
        "word": word.word,
        "meaning": word.meaning,
        "pronunciation": word.pronunciation,
        "part_of_speech": word.part_of_speech,
        "example": word.example,
        "ipa": word.ipa,
        "lesson_id": lesson.lesson_id,
    }


@router.patch("/words/{word_id}", response_model=AdminWordResponse)
def admin_update_word(
    word_id: int,
    data: WordUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    word = db.query(Word).filter_by(word_id=word_id).first()
    if word is None:
        raise HTTPException(status_code=404, detail="Word not found")
    changes = data.model_dump(exclude_unset=True)
    lesson_id = changes.pop("lesson_id", None)
    if lesson_id is not None:
        lesson = db.query(Lesson).filter_by(lesson_id=lesson_id, is_active=1).first()
        if lesson is None:
            raise HTTPException(status_code=404, detail="Active lesson not found")
        db.query(LessonWord).filter_by(word_id=word_id).delete()
        db.add(
            LessonWord(
                lesson_id=lesson_id,
                word_id=word_id,
                display_order=_next_lesson_word_order(db, lesson_id),
            )
        )
    for key, value in changes.items():
        setattr(word, key, value)
    db.commit()
    db.refresh(word)
    try:
        ensure_reference_audio(word, force=bool(changes.get("word")))
        db.commit()
    except Exception:
        db.rollback()
    assigned = db.query(LessonWord.lesson_id).filter_by(word_id=word_id).first()
    return {
        "word_id": word.word_id,
        "word": word.word,
        "meaning": word.meaning,
        "pronunciation": word.pronunciation,
        "part_of_speech": word.part_of_speech,
        "example": word.example,
        "ipa": word.ipa,
        "lesson_id": assigned[0] if assigned else lesson_id,
    }


@router.delete("/words/{word_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_word(
    word_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    word = db.query(Word).filter_by(word_id=word_id).first()
    if word is None:
        raise HTTPException(status_code=404, detail="Word not found")
    word.is_active = 0
    db.commit()


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
