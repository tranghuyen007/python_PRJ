from sqlalchemy import (
    Column, Integer, Date, DateTime, ForeignKey, UniqueConstraint, CheckConstraint, func
)
from app.database import Base

class UserLessonProgress(Base):
    __tablename__ = "user_lesson_progress"
    progress_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.lesson_id", ondelete="CASCADE"), nullable=False)
    completed_items = Column(Integer, nullable=False, default=0, server_default="0")
    total_items = Column(Integer, nullable=False, default=0, server_default="0")
    is_completed = Column(Integer, nullable=False, default=0, server_default="0")
    started_at = Column(DateTime, server_default=func.current_timestamp())
    completed_at = Column(DateTime)
    updated_at = Column(DateTime, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    __table_args__ = (
        UniqueConstraint("user_id", "lesson_id"),
        CheckConstraint("completed_items >= 0 AND total_items >= 0 AND completed_items <= total_items"),
        CheckConstraint("is_completed IN (0,1)"),
    )

class UserTopicProgress(Base):
    __tablename__ = "user_topic_progress"
    progress_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    topic_id = Column(Integer, ForeignKey("topics.topic_id", ondelete="CASCADE"), nullable=False)
    learned_count = Column(Integer, nullable=False, default=0, server_default="0")
    mastered_count = Column(Integer, nullable=False, default=0, server_default="0")
    started_at = Column(DateTime, server_default=func.current_timestamp())
    completed_at = Column(DateTime)
    updated_at = Column(DateTime, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    __table_args__ = (
        UniqueConstraint("user_id", "topic_id"),
        CheckConstraint("learned_count >= 0 AND mastered_count >= 0 AND mastered_count <= learned_count"),
    )

class UserDailyActivity(Base):
    __tablename__ = "user_daily_activity"
    activity_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    activity_date = Column(Date, nullable=False)
    learned_count = Column(Integer, nullable=False, default=0, server_default="0")
    review_count = Column(Integer, nullable=False, default=0, server_default="0")
    quiz_count = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(DateTime, nullable=False, server_default=func.current_timestamp())
    __table_args__ = (
        UniqueConstraint("user_id", "activity_date"),
        CheckConstraint("learned_count >= 0 AND review_count >= 0 AND quiz_count >= 0"),
    )

class UserWordProgress(Base):
    __tablename__ = "user_word_progress"
    progress_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    word_id = Column(Integer, ForeignKey("words.word_id", ondelete="CASCADE"), nullable=False)
    learned = Column(Integer, nullable=False, default=0, server_default="0")
    mastered = Column(Integer, nullable=False, default=0, server_default="0")
    correct_count = Column(Integer, nullable=False, default=0, server_default="0")
    wrong_count = Column(Integer, nullable=False, default=0, server_default="0")
    review_count = Column(Integer, nullable=False, default=0, server_default="0")
    last_reviewed_at = Column(DateTime)
    next_review_at = Column(DateTime)
    created_at = Column(DateTime, nullable=False, server_default=func.current_timestamp())
    updated_at = Column(DateTime, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    __table_args__ = (UniqueConstraint("user_id", "word_id"),)

