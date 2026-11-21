from sqlalchemy import (
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    func,
)

from app.database import Base


class UserWordProgress(Base):
    __tablename__ = "user_word_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "word_id", name="uq_user_word_progress_user_word"),
    )

    user_word_progress_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    word_id = Column(Integer, ForeignKey("words.word_id", ondelete="CASCADE"), nullable=False)
    learned = Column(Integer, nullable=False, default=0, server_default="0")
    mastered = Column(Integer, nullable=False, default=0, server_default="0")
    correct_count = Column(Integer, nullable=False, default=0, server_default="0")
    wrong_count = Column(Integer, nullable=False, default=0, server_default="0")
    review_count = Column(Integer, nullable=False, default=0, server_default="0")
    last_reviewed_at = Column(DateTime)
    next_review_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(
        DateTime,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )


class UserTopicProgress(Base):
    __tablename__ = "user_topic_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "topic_id", name="uq_user_topic_progress_user_topic"),
    )

    user_topic_progress_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    topic_id = Column(Integer, ForeignKey("topics.topic_id", ondelete="CASCADE"), nullable=False)
    learned_count = Column(Integer, nullable=False, default=0, server_default="0")
    mastered_count = Column(Integer, nullable=False, default=0, server_default="0")
    last_studied_at = Column(DateTime)
    last_reviewed_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(
        DateTime,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )


class UserDailyActivity(Base):
    __tablename__ = "user_daily_activity"
    __table_args__ = (
        UniqueConstraint("user_id", "activity_date", name="uq_user_daily_activity_user_date"),
    )

    activity_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    activity_date = Column(Date, nullable=False)
    learned_count = Column(Integer, nullable=False, default=0, server_default="0")
    review_count = Column(Integer, nullable=False, default=0, server_default="0")
    quiz_count = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(DateTime, server_default=func.current_timestamp())


class ReviewSession(Base):
    __tablename__ = "review_sessions"

    review_session_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    topic_id = Column(Integer, ForeignKey("topics.topic_id", ondelete="CASCADE"), nullable=False)
    review_type = Column(String, nullable=False)
    total_items = Column(Integer, nullable=False, default=0, server_default="0")
    completed_items = Column(Integer, nullable=False, default=0, server_default="0")
    started_at = Column(DateTime, server_default=func.current_timestamp())
    completed_at = Column(DateTime)


class ReviewSessionItem(Base):
    __tablename__ = "review_session_items"
    __table_args__ = (
        UniqueConstraint(
            "review_session_id",
            "word_id",
            name="uq_review_session_items_session_word",
        ),
    )

    session_item_id = Column(Integer, primary_key=True, autoincrement=True)
    review_session_id = Column(
        Integer,
        ForeignKey("review_sessions.review_session_id", ondelete="CASCADE"),
        nullable=False,
    )
    word_id = Column(Integer, ForeignKey("words.word_id", ondelete="CASCADE"), nullable=False)
    question_data = Column(JSON)
    correct_answer = Column(Text)
    answer = Column(Text)
    is_answered = Column(Integer, nullable=False, default=0, server_default="0")
    is_correct = Column(Integer, nullable=False, default=0, server_default="0")
    answered_at = Column(DateTime)
