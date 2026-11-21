import random
import re
import unicodedata
from datetime import date, datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.curriculum import Lesson, LessonWord, Level, Topic, Word
from models.progress import (
    ReviewSession,
    ReviewSessionItem,
    UserDailyActivity,
    UserTopicProgress,
    UserWordProgress,
)
from models.user import User
from services.placement_test_service import level_is_unlocked


def _normalize(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).casefold()
    value = re.sub(r"\s+", " ", value).strip()
    return value.strip(" \t\r\n.,!?;:\"'()[]{}…")


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _accessible_topic(db: Session, user: User, topic_id: int) -> Topic:
    topic = db.query(Topic).filter_by(topic_id=topic_id, is_active=1).first()
    if topic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")
    level = (
        db.query(Level)
        .filter_by(level_id=topic.level_id, is_active=1)
        .first()
    )
    if level is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Level not found")
    if not level_is_unlocked(db, user, level):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pass this level's placement test or a higher-level test to access its content",
        )
    return topic


def _topic_words(db: Session, topic_id: int) -> list[Word]:
    return (
        db.query(Word)
        .join(LessonWord, LessonWord.word_id == Word.word_id)
        .join(Lesson, Lesson.lesson_id == LessonWord.lesson_id)
        .filter(
            Lesson.topic_id == topic_id,
            Lesson.is_active == 1,
            Word.is_active == 1,
        )
        .distinct()
        .all()
    )


def _user_available_words(db: Session, user: User) -> list[Word]:
    available_levels = db.query(Level).filter_by(is_active=1).all()
    available_level_ids = [
        level.level_id for level in available_levels if level_is_unlocked(db, user, level)
    ]
    if not available_level_ids:
        return []
    return (
        db.query(Word)
        .join(LessonWord, LessonWord.word_id == Word.word_id)
        .join(Lesson, Lesson.lesson_id == LessonWord.lesson_id)
        .join(Topic, Topic.topic_id == Lesson.topic_id)
        .filter(
            Topic.level_id.in_(available_level_ids),
            Topic.is_active == 1,
            Lesson.is_active == 1,
            Word.is_active == 1,
        )
        .distinct()
        .all()
    )


def _learned_words(db: Session, user_id: int, topic_id: int) -> list[Word]:
    return (
        db.query(Word)
        .join(LessonWord, LessonWord.word_id == Word.word_id)
        .join(Lesson, Lesson.lesson_id == LessonWord.lesson_id)
        .join(
            UserWordProgress,
            UserWordProgress.word_id == Word.word_id,
        )
        .filter(
            Lesson.topic_id == topic_id,
            Lesson.is_active == 1,
            Word.is_active == 1,
            UserWordProgress.user_id == user_id,
            UserWordProgress.learned == 1,
        )
        .distinct()
        .all()
    )


def get_topic_progress(db: Session, user: User, topic_id: int) -> dict:
    _accessible_topic(db, user, topic_id)
    learned_words = _learned_words(db, user.user_id, topic_id)
    word_ids = sorted(word.word_id for word in learned_words)
    return {
        "topic_id": topic_id,
        "learned_count": len(word_ids),
        "learned_word_ids": word_ids,
    }


def _record_daily_activity(
    db: Session,
    user_id: int,
    *,
    learned_count: int = 0,
    review_count: int = 0,
) -> None:
    activity = (
        db.query(UserDailyActivity)
        .filter_by(user_id=user_id, activity_date=date.today())
        .first()
    )
    if activity is None:
        activity = UserDailyActivity(
            user_id=user_id,
            activity_date=date.today(),
            learned_count=learned_count,
            review_count=review_count,
        )
        db.add(activity)
    else:
        activity.learned_count += learned_count
        activity.review_count += review_count


def mark_word_learned(
    db: Session,
    user: User,
    topic_id: int,
    word_id: int,
) -> dict:
    topic = _accessible_topic(db, user, topic_id)
    membership = (
        db.query(LessonWord.lesson_id)
        .join(Lesson, Lesson.lesson_id == LessonWord.lesson_id)
        .filter(
            Lesson.topic_id == topic.topic_id,
            Lesson.is_active == 1,
            LessonWord.word_id == word_id,
        )
        .first()
    )
    word = db.query(Word).filter_by(word_id=word_id, is_active=1).first()
    if membership is None or word is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Word not found in topic")

    progress = (
        db.query(UserWordProgress)
        .filter_by(user_id=user.user_id, word_id=word_id)
        .first()
    )
    newly_learned = progress is None or not progress.learned
    if progress is None:
        progress = UserWordProgress(user_id=user.user_id, word_id=word_id, learned=1)
        db.add(progress)
    elif newly_learned:
        progress.learned = 1

    topic_progress = (
        db.query(UserTopicProgress)
        .filter_by(user_id=user.user_id, topic_id=topic_id)
        .first()
    )
    if topic_progress is None:
        topic_progress = UserTopicProgress(
            user_id=user.user_id,
            topic_id=topic_id,
            learned_count=0,
        )
        db.add(topic_progress)
    topic_progress.learned_count = len(_learned_words(db, user.user_id, topic_id)) + int(
        newly_learned
    )
    topic_progress.last_studied_at = _now()
    if newly_learned:
        _record_daily_activity(db, user.user_id, learned_count=1)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "topic_id": topic_id,
        "word_id": word_id,
        "learned": True,
        "learned_count": topic_progress.learned_count,
    }


def _meaning_distractors(
    words: list[Word],
    candidates: list[Word],
) -> list[str]:
    correct_meaning = next((word.meaning for word in words if word.meaning), "")
    correct_normalized = _normalize(correct_meaning)
    unique_meanings = {}
    for word in [*words, *candidates]:
        meaning = (word.meaning or "").strip()
        normalized = _normalize(meaning)
        if normalized and normalized != correct_normalized:
            unique_meanings.setdefault(normalized, meaning)
    return list(unique_meanings.values())


def _word_distractors(words: list[Word], candidates: list[Word]) -> list[str]:
    correct_words = {_normalize(word.word) for word in words}
    unique_words = {}
    for word in [*words, *candidates]:
        value = (word.word or "").strip()
        normalized = _normalize(value)
        if normalized and normalized not in correct_words:
            unique_words.setdefault(normalized, value)
    return list(unique_words.values())


def _blank_sentence(word: Word) -> str:
    example = (word.example or "").strip()
    if example:
        pattern = re.compile(
            rf"(?<!\w){re.escape(word.word)}(?!\w)",
            flags=re.IGNORECASE,
        )
        sentence, count = pattern.subn("____", example, count=1)
        if count:
            return sentence
    return f"I learned the word ____ today."


def _build_exercise(
    word: Word,
    topic_words: list[Word],
    all_words: list[Word],
) -> tuple[dict, str]:
    meanings = _meaning_distractors([word], [*topic_words, *all_words])
    word_options = _word_distractors([word], [*topic_words, *all_words])
    available = ["meaning_input"]
    if len(meanings) >= 3:
        available.append("meaning_choice")
    if len(word_options) >= 3:
        available.append("fill_blank")
    kind = random.choice(available)

    if kind == "meaning_choice":
        options = random.sample(meanings, 3) + [word.meaning.strip()]
        random.shuffle(options)
        return (
            {
                "kind": kind,
                "word": word.word,
                "pronunciation": word.pronunciation,
                "options": options,
            },
            word.meaning.strip(),
        )
    if kind == "fill_blank":
        options = random.sample(word_options, 3) + [word.word.strip()]
        random.shuffle(options)
        return (
            {
                "kind": kind,
                "sentence": _blank_sentence(word),
                "options": options,
            },
            word.word.strip(),
        )
    return (
        {
            "kind": kind,
            "word": word.word,
            "pronunciation": word.pronunciation,
        },
        word.meaning.strip(),
    )


def create_quick_review(db: Session, user: User, topic_id: int) -> dict:
    topic = _accessible_topic(db, user, topic_id)
    learned_words = _learned_words(db, user.user_id, topic_id)
    if not learned_words:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Learn at least one word in this topic before starting a quick review",
        )

    selected_words = random.sample(
        learned_words,
        min(topic.quick_review_limit, len(learned_words)),
    )
    topic_words = _topic_words(db, topic_id)
    all_words = _user_available_words(db, user)

    session = ReviewSession(
        user_id=user.user_id,
        topic_id=topic_id,
        review_type="NORMAL",
        total_items=len(selected_words),
        completed_items=0,
    )
    db.add(session)
    try:
        db.flush()
        response_items = []
        for word in selected_words:
            question_data, correct_answer = _build_exercise(word, topic_words, all_words)
            item = ReviewSessionItem(
                review_session_id=session.review_session_id,
                word_id=word.word_id,
                question_data=question_data,
                correct_answer=correct_answer,
            )
            db.add(item)
            db.flush()
            response_items.append(
                {
                    "item_id": item.session_item_id,
                    "word_id": word.word_id,
                    "question_data": question_data,
                }
            )
        db.commit()
        db.refresh(session)
    except Exception:
        db.rollback()
        raise

    return {
        "review_session_id": session.review_session_id,
        "topic_id": topic_id,
        "total_items": len(response_items),
        "items": response_items,
    }


def submit_quick_review_answer(
    db: Session,
    user: User,
    review_session_id: int,
    item_id: int,
    answer: str,
) -> dict:
    review_session = (
        db.query(ReviewSession)
        .filter_by(review_session_id=review_session_id, user_id=user.user_id)
        .first()
    )
    if review_session is None:
        raise HTTPException(status_code=404, detail="Review session not found")

    item = (
        db.query(ReviewSessionItem)
        .filter_by(session_item_id=item_id, review_session_id=review_session_id)
        .first()
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Review question not found")

    if item.is_answered:
        correct_answer = item.correct_answer or ""
        return {
            "item_id": item.session_item_id,
            "is_correct": bool(item.is_correct),
            "correct_answer": correct_answer,
            "completed_items": review_session.completed_items,
            "total_items": review_session.total_items,
            "session_completed": review_session.completed_at is not None,
        }

    question_data = item.question_data or {}
    normalized_answer = _normalize(answer)
    if question_data.get("kind") in {"meaning_choice", "fill_blank"}:
        options = question_data.get("options", [])
        if normalized_answer not in {_normalize(option) for option in options}:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Answer must match one of the provided options",
            )

    is_correct = normalized_answer == _normalize(item.correct_answer or "")
    now = _now()
    item.answer = answer
    item.is_answered = 1
    item.is_correct = int(is_correct)
    item.answered_at = now

    word_progress = (
        db.query(UserWordProgress)
        .filter_by(user_id=user.user_id, word_id=item.word_id)
        .first()
    )
    if word_progress is None:
        raise HTTPException(status_code=409, detail="Learned-word progress no longer exists")
    word_progress.review_count += 1
    word_progress.correct_count += int(is_correct)
    word_progress.wrong_count += int(not is_correct)
    word_progress.last_reviewed_at = now

    topic_progress = (
        db.query(UserTopicProgress)
        .filter_by(user_id=user.user_id, topic_id=review_session.topic_id)
        .first()
    )
    if topic_progress is None:
        topic_progress = UserTopicProgress(
            user_id=user.user_id,
            topic_id=review_session.topic_id,
            learned_count=len(_learned_words(db, user.user_id, review_session.topic_id)),
        )
        db.add(topic_progress)
    topic_progress.last_reviewed_at = now
    _record_daily_activity(db, user.user_id, review_count=1)

    review_session.completed_items += 1
    if review_session.completed_items == review_session.total_items:
        review_session.completed_at = now

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "item_id": item.session_item_id,
        "is_correct": is_correct,
        "correct_answer": item.correct_answer or "",
        "completed_items": review_session.completed_items,
        "total_items": review_session.total_items,
        "session_completed": review_session.completed_at is not None,
    }
