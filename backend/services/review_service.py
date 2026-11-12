import random
import re
import unicodedata
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from models.curriculum import Topic, Lesson, LessonWord, Word
from models.review import ReviewSession, ReviewSessionItem
from models.progress import UserLessonProgress, UserWordProgress
from services.progress_service import get_or_create_daily


QUESTION_TYPES = (
    "MULTIPLE_CHOICE_MEANING",
    "FILL_BLANK",
    "TYPE_MEANING",
)


def _normalize_answer(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value).casefold()
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized.strip(" \t\r\n.,!?;:\"'()[]{}…")


def _meaning_variants(meaning: str) -> set[str]:
    return {
        normalized
        for part in re.split(r"[;\n|]", meaning)
        if (normalized := _normalize_answer(part))
    }


def _make_cloze_sentence(word: Word) -> str:
    if word.example and re.search(rf"\b{re.escape(word.word)}\b", word.example, re.IGNORECASE):
        return re.sub(
            rf"\b{re.escape(word.word)}\b",
            "_____",
            word.example,
            count=1,
            flags=re.IGNORECASE,
        )

    part_of_speech = (word.part_of_speech or "").casefold()
    templates = {
        "noun": "We talked about {word} in class.",
        "verb": "I like to {word} after work.",
        "adjective": "The weather is {word} today.",
        "adverb": "She spoke {word} during the meeting.",
    }
    template = templates.get(part_of_speech, "I learned the word {word} in class.")
    return template.format(word=word.word).replace(word.word, "_____", 1)


def _make_question(
    word: Word,
    topic_words: list[Word],
    all_active_words: list[Word],
) -> dict:
    method = random.choice(QUESTION_TYPES)
    common = {
        "method": method,
        "word": word.word,
        "pronunciation": word.pronunciation,
        "audio_url": word.audio_url,
    }

    if method == "MULTIPLE_CHOICE_MEANING":
        choices = [word.meaning.strip()]
        seen = {_normalize_answer(choices[0])}
        for candidate in topic_words + all_active_words:
            meaning = candidate.meaning.strip()
            normalized = _normalize_answer(meaning)
            if candidate.word_id != word.word_id and normalized and normalized not in seen:
                choices.append(meaning)
                seen.add(normalized)
            if len(choices) == 4:
                break
        if len(choices) < 4:
            raise ValueError("Not enough distinct active meanings to create four answer choices")
        random.shuffle(choices)
        return {**common, "options": choices}

    if method == "FILL_BLANK":
        options = [word.word]
        seen_words = {word.word.casefold()}
        for candidate in topic_words + all_active_words:
            normalized = candidate.word.strip().casefold()
            if candidate.word_id != word.word_id and normalized and normalized not in seen_words:
                options.append(candidate.word)
                seen_words.add(normalized)
            if len(options) == 4:
                break
        if len(options) < 4:
            raise ValueError("Not enough distinct active words to create four answer choices")
        random.shuffle(options)
        return {
            **common,
            "sentence": _make_cloze_sentence(word),
            "options": options,
        }

    return common


def _is_correct_answer(question: dict, word: Word, answer: str) -> bool:
    submitted = _normalize_answer(answer)
    if question["method"] == "MULTIPLE_CHOICE_MEANING":
        if submitted not in {_normalize_answer(option) for option in question["options"]}:
            return False
        return (
            submitted == _normalize_answer(word.meaning)
            or submitted in _meaning_variants(word.meaning)
        )
    if question["method"] == "FILL_BLANK":
        if submitted not in {_normalize_answer(option) for option in question["options"]}:
            return False
        return submitted == _normalize_answer(word.word)
    if question["method"] == "TYPE_MEANING":
        return (
            submitted == _normalize_answer(word.meaning)
            or submitted in _meaning_variants(word.meaning)
        )
    raise ValueError("Unsupported review question type")


def start_review(db: Session, user_id: int, topic_id: int, review_type: str):
    if review_type not in ("QUICK", "NORMAL", "FULL_TOPIC"):
        raise ValueError("review_type must be QUICK or FULL_TOPIC")
    topic = db.query(Topic).filter_by(topic_id=topic_id, is_active=1).first()
    if not topic:
        raise LookupError("Topic not found or inactive")
    topic_words = (
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
    if not topic_words:
        raise ValueError("This topic has no active vocabulary assigned to its lessons")

    quick_review = review_type in ("QUICK", "NORMAL")
    if quick_review:
        learned_ids = {
            row[0]
            for row in (
                db.query(UserWordProgress.word_id)
                .filter(
                    UserWordProgress.user_id == user_id,
                    UserWordProgress.learned == 1,
                )
                .all()
            )
        }
        lesson_words = (
            db.query(Lesson.lesson_id, LessonWord.word_id)
            .join(LessonWord, LessonWord.lesson_id == Lesson.lesson_id)
            .join(Word, Word.word_id == LessonWord.word_id)
            .filter(
                Lesson.topic_id == topic_id,
                Lesson.is_active == 1,
                Word.is_active == 1,
            )
            .order_by(Lesson.lesson_id, LessonWord.display_order, LessonWord.word_id)
            .all()
        )
        word_ids_by_lesson: dict[int, list[int]] = {}
        for lesson_id, word_id in lesson_words:
            word_ids_by_lesson.setdefault(lesson_id, []).append(word_id)
        lesson_progress = (
            db.query(UserLessonProgress.lesson_id, UserLessonProgress.completed_items)
            .join(Lesson, Lesson.lesson_id == UserLessonProgress.lesson_id)
            .filter(
                UserLessonProgress.user_id == user_id,
                UserLessonProgress.completed_items > 0,
                Lesson.topic_id == topic_id,
                Lesson.is_active == 1,
            )
            .all()
        )
        for lesson_id, completed_items in lesson_progress:
            learned_ids.update(word_ids_by_lesson.get(lesson_id, [])[:completed_items])

        selected_words = [word for word in topic_words if word.word_id in learned_ids]
        if not selected_words:
            raise ValueError("Learn at least one word in this topic before starting quick review")
        random.shuffle(selected_words)
        selected_words = selected_words[:topic.quick_review_limit]
        stored_review_type = "NORMAL"
    else:
        selected_words = topic_words
        stored_review_type = "FULL_TOPIC"

    all_active_words = db.query(Word).filter_by(is_active=1).all()
    questions = [
        (word, _make_question(word, topic_words, all_active_words))
        for word in selected_words
    ]

    session = ReviewSession(
        user_id=user_id,
        topic_id=topic_id,
        review_type=stored_review_type,
        total_items=len(questions),
    )
    db.add(session)
    db.flush()
    for word, question_data in questions:
        db.add(
            ReviewSessionItem(
                review_session_id=session.review_session_id,
                word_id=word.word_id,
                question_data=question_data,
            )
        )
    try:
        db.commit()
        db.refresh(session)
        return session
    except Exception:
        db.rollback()
        raise

def submit_answer(db: Session, user_id: int, session_id: int, word_id: int, answer: str):
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
    if item.question_data is None:
        raise ValueError("This review item has no question data; start a new review session")
    word = db.query(Word).filter_by(word_id=word_id).first()
    if word is None:
        raise LookupError("Word not found")
    is_correct = _is_correct_answer(item.question_data, word, answer)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    item.is_answered = 1
    item.is_correct = int(is_correct)
    item.answered_at = now
    if is_correct:
        session.correct_count += 1
    progress = db.query(UserWordProgress).filter_by(user_id=user_id, word_id=word_id).first()
    if progress is None:
        progress = UserWordProgress(
            user_id=user_id,
            word_id=word_id,
            learned=1,
            correct_count=0,
            wrong_count=0,
            review_count=0,
        )
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
    if session.completed_at:
        return session
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
