from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
    func,
)

from app.database import Base


class PronunciationAttempt(Base):
    """Một lần người học bấm micro và đọc 1 từ / 1 câu ở trang Luyện phát âm."""

    __tablename__ = "pronunciation_attempts"
    __table_args__ = (
        CheckConstraint("mode IN ('word', 'sentence')", name="ck_pronunciation_mode"),
        CheckConstraint("score >= 0 AND score <= 100", name="ck_pronunciation_score"),
    )

    attempt_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # word_id có thể trống nếu từ trên giao diện chưa có trong bảng words
    word_id = Column(Integer, ForeignKey("words.word_id"), index=True)
    word = Column(String, nullable=False, index=True)   # từ tiếng Anh (chữ thường)
    mode = Column(String, nullable=False)               # "word" | "sentence"
    target_text = Column(Text, nullable=False)          # từ / câu phải đọc
    transcript = Column(Text, nullable=False, default="", server_default="")  # máy nghe được
    score = Column(Integer, nullable=False)             # 0 – 100 (%)
    lesson_id = Column(Integer, ForeignKey("lessons.lesson_id", ondelete="CASCADE"), index=True)
    overall_score = Column(Integer, nullable=False, default=0, server_default="0")
    character_results = Column(JSON)
    phoneme_results = Column(JSON)
    created_at = Column(DateTime, nullable=False, server_default=func.current_timestamp())