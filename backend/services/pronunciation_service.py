from sqlalchemy import func
from sqlalchemy.orm import Session

from models.curriculum import Word
from models.pronunciation import PronunciationAttempt
from services.content_filter import clean_text

WEAK_SCORE = 70  # điểm cao nhất dưới mức này -> từ cần luyện lại


def _clean_word(word: str) -> str:
    return " ".join(word.split()).lower()


def find_word_id(db: Session, word: str) -> int | None:
    row = (
        db.query(Word.word_id)
        .filter(func.lower(Word.word) == _clean_word(word), Word.is_active == 1)
        .first()
    )
    return row[0] if row else None


def record_attempt(
    db: Session,
    user_id: int,
    word: str,
    mode: str,
    target_text: str,
    transcript: str,
    score: int,
) -> dict:
    if mode not in ("word", "sentence"):
        raise ValueError("mode must be 'word' or 'sentence'")
    if not 0 <= score <= 100:
        raise ValueError("score must be between 0 and 100")

    clean = _clean_word(word)
    # Không lưu từ tục tĩu người học lỡ nói (frontend đã lọc, backend lọc lại cho chắc)
    safe_transcript, blocked = clean_text(transcript, target_text)
    attempt = PronunciationAttempt(
        user_id=user_id,
        word_id=find_word_id(db, clean),
        word=clean,
        mode=mode,
        target_text=target_text.strip(),
        transcript=safe_transcript,
        score=score,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    best_score, attempts = (
        db.query(func.max(PronunciationAttempt.score), func.count(PronunciationAttempt.attempt_id))
        .filter(
            PronunciationAttempt.user_id == user_id,
            PronunciationAttempt.word == clean,
            PronunciationAttempt.mode == mode,
        )
        .one()
    )
    return {
        "attempt_id": attempt.attempt_id,
        "word": attempt.word,
        "mode": attempt.mode,
        "score": attempt.score,
        "best_score": best_score,
        "attempts": attempts,
        "blocked_words": blocked,
        "created_at": attempt.created_at,
    }


def get_summary(db: Session, user_id: int, limit: int = 20) -> dict:
    base = db.query(PronunciationAttempt).filter(PronunciationAttempt.user_id == user_id)
    total = base.count()
    average = (
        db.query(func.avg(PronunciationAttempt.score))
        .filter(PronunciationAttempt.user_id == user_id)
        .scalar()
    )

    per_word = (
        db.query(
            PronunciationAttempt.word,
            PronunciationAttempt.mode,
            func.max(PronunciationAttempt.score).label("best_score"),
            func.count(PronunciationAttempt.attempt_id).label("attempts"),
            func.max(PronunciationAttempt.created_at).label("last_practiced_at"),
        )
        .filter(PronunciationAttempt.user_id == user_id)
        .group_by(PronunciationAttempt.word, PronunciationAttempt.mode)
        .subquery()
    )
    words_practiced = db.query(func.count(func.distinct(per_word.c.word))).scalar() or 0
    weak_rows = (
        db.query(per_word)
        .filter(per_word.c.best_score < WEAK_SCORE)
        .order_by(per_word.c.best_score, per_word.c.last_practiced_at.desc())
        .limit(limit)
        .all()
    )

    return {
        "total_attempts": total,
        "average_score": round(average or 0),
        "words_practiced": words_practiced,
        "weak_words": [
            {
                "word": row.word,
                "mode": row.mode,
                "best_score": row.best_score,
                "attempts": row.attempts,
                "last_practiced_at": row.last_practiced_at,
            }
            for row in weak_rows
        ],
    }