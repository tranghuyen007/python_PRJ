import random
import re
import unicodedata
from datetime import datetime, timezone

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from models.curriculum import Lesson, LessonWord, Level, Topic, Word
from models.placement_test import PlacementTestAttempt, PlacementTestAttemptItem
from models.user import User


def _normalize(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).casefold()
    value = re.sub(r"\s+", " ", value).strip()
    return value.strip(" \t\r\n.,!?;:\"'()[]{}…")


def level_is_unlocked(db: Session, user: User, level: Level) -> bool:
    if user.role == "ADMIN" or not level.placement_test_enabled:
        return True

    passed_higher_test = (
        db.query(PlacementTestAttempt.attempt_id)
        .join(Level, Level.level_id == PlacementTestAttempt.level_id)
        .filter(
            PlacementTestAttempt.user_id == user.user_id,
            PlacementTestAttempt.passed == 1,
            or_(
                Level.display_order > level.display_order,
                and_(
                    Level.display_order == level.display_order,
                    Level.level_id >= level.level_id,
                ),
            ),
        )
        .first()
    )
    return passed_higher_test is not None


def get_level_or_raise(db: Session, level_id: int) -> Level:
    level = db.query(Level).filter_by(level_id=level_id, is_active=1).first()
    if level is None:
        raise LookupError("Level not found")
    return level


def get_level_words(db: Session, level_id: int) -> list[Word]:
    return (
        db.query(Word)
        .join(LessonWord, LessonWord.word_id == Word.word_id)
        .join(Lesson, Lesson.lesson_id == LessonWord.lesson_id)
        .join(Topic, Topic.topic_id == Lesson.topic_id)
        .filter(
            Topic.level_id == level_id,
            Topic.is_active == 1,
            Lesson.is_active == 1,
            Word.is_active == 1,
        )
        .distinct()
        .all()
    )


def create_attempt(db: Session, user_id: int, level_id: int) -> PlacementTestAttempt:
    level = get_level_or_raise(db, level_id)
    if not level.placement_test_enabled:
        raise ValueError("This level does not have an entrance test")

    words = get_level_words(db, level_id)
    if not words:
        raise ValueError("This level has no active vocabulary assigned to its lessons")

    unique_meanings = {_normalize(word.meaning) for word in words if _normalize(word.meaning)}
    if len(unique_meanings) < 4:
        raise ValueError("This level needs at least four distinct meanings to create multiple-choice questions")

    selected_words = random.sample(words, min(level.placement_test_question_count, len(words)))
    passing_score = min(level.placement_test_passing_score, len(selected_words))

    attempt = PlacementTestAttempt(
        user_id=user_id,
        level_id=level_id,
        total_questions=len(selected_words),
        passing_score=passing_score,
    )
    db.add(attempt)
    try:
        db.flush()
        for word in selected_words:
            correct_meaning = word.meaning.strip()
            distractors_by_meaning = {}
            for candidate in words:
                meaning = candidate.meaning.strip()
                normalized = _normalize(meaning)
                if candidate.word_id != word.word_id and normalized != _normalize(correct_meaning):
                    distractors_by_meaning.setdefault(normalized, meaning)
            if len(distractors_by_meaning) < 3:
                raise ValueError(
                    "This level does not have enough distinct distractor meanings for every question"
                )
            distractors = random.sample(list(distractors_by_meaning.values()), 3)
            options = [correct_meaning, *distractors]
            random.shuffle(options)
            db.add(
                PlacementTestAttemptItem(
                    attempt_id=attempt.attempt_id,
                    word_id=word.word_id,
                    question_data={
                        "word": word.word,
                        "pronunciation": word.pronunciation,
                        "options": options,
                    },
                )
            )
        db.commit()
        db.refresh(attempt)
        return attempt
    except Exception:
        db.rollback()
        raise


def submit_answer(
    db: Session,
    user_id: int,
    attempt_id: int,
    item_id: int,
    answer: str,
) -> PlacementTestAttemptItem:
    attempt = (
        db.query(PlacementTestAttempt)
        .filter_by(attempt_id=attempt_id, user_id=user_id)
        .first()
    )
    if attempt is None:
        raise LookupError("Placement test attempt not found")
    if attempt.completed_at is not None:
        raise ValueError("Placement test attempt is already completed")

    item = (
        db.query(PlacementTestAttemptItem)
        .filter_by(item_id=item_id, attempt_id=attempt_id)
        .first()
    )
    if item is None:
        raise LookupError("Question not found in this attempt")
    if item.is_answered:
        raise ValueError("This question has already been answered")

    normalized_answer = _normalize(answer)
    options = item.question_data["options"]
    if normalized_answer not in {_normalize(option) for option in options}:
        raise ValueError("Answer must match one of the provided options")

    word = db.query(Word).filter_by(word_id=item.word_id).first()
    if word is None:
        raise LookupError("Question vocabulary no longer exists")

    item.answer = answer
    item.is_answered = 1
    item.is_correct = int(normalized_answer == _normalize(word.meaning))
    item.answered_at = datetime.now(timezone.utc).replace(tzinfo=None)
    try:
        db.commit()
        db.refresh(item)
        return item
    except Exception:
        db.rollback()
        raise


def complete_attempt(
    db: Session,
    user_id: int,
    attempt_id: int,
) -> PlacementTestAttempt:
    attempt = (
        db.query(PlacementTestAttempt)
        .filter_by(attempt_id=attempt_id, user_id=user_id)
        .first()
    )
    if attempt is None:
        raise LookupError("Placement test attempt not found")
    if attempt.completed_at is not None:
        return attempt

    items = (
        db.query(PlacementTestAttemptItem)
        .filter_by(attempt_id=attempt_id)
        .all()
    )
    if len(items) != attempt.total_questions or any(not item.is_answered for item in items):
        raise ValueError("Answer every question before completing the placement test")

    correct_answers = sum(item.is_correct for item in items)
    attempt.correct_answers = correct_answers
    attempt.passed = int(correct_answers >= attempt.passing_score)
    attempt.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    try:
        db.commit()
        db.refresh(attempt)
        return attempt
    except Exception:
        db.rollback()
        raise
