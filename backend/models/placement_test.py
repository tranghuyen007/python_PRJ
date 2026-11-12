from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    Text,
    UniqueConstraint,
    func,
)

from app.database import Base


class PlacementTestAttempt(Base):
    __tablename__ = "placement_test_attempts"
    __table_args__ = (
        CheckConstraint("total_questions >= 1"),
        CheckConstraint("passing_score >= 1"),
        CheckConstraint("passing_score <= total_questions"),
        CheckConstraint("correct_answers >= 0 AND correct_answers <= total_questions"),
        CheckConstraint("passed IN (0, 1)"),
    )

    attempt_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    level_id = Column(Integer, ForeignKey("levels.level_id", ondelete="CASCADE"), nullable=False, index=True)
    total_questions = Column(Integer, nullable=False)
    passing_score = Column(Integer, nullable=False)
    correct_answers = Column(Integer, nullable=False, default=0, server_default="0")
    passed = Column(Integer, nullable=False, default=0, server_default="0")
    started_at = Column(DateTime, nullable=False, server_default=func.current_timestamp())
    completed_at = Column(DateTime)


class PlacementTestAttemptItem(Base):
    __tablename__ = "placement_test_attempt_items"
    __table_args__ = (
        UniqueConstraint("attempt_id", "word_id", name="uq_placement_attempt_word"),
        CheckConstraint("is_answered IN (0, 1)"),
        CheckConstraint("is_correct IN (0, 1)"),
    )

    item_id = Column(Integer, primary_key=True, autoincrement=True)
    attempt_id = Column(
        Integer,
        ForeignKey("placement_test_attempts.attempt_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    word_id = Column(Integer, ForeignKey("words.word_id"), nullable=False)
    question_data = Column(JSON, nullable=False)
    answer = Column(Text)
    is_answered = Column(Integer, nullable=False, default=0, server_default="0")
    is_correct = Column(Integer, nullable=False, default=0, server_default="0")
    answered_at = Column(DateTime)
