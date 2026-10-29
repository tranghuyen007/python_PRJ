from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, CheckConstraint, func
)
from app.database import Base

class ReviewSession(Base):
    __tablename__ = "review_sessions"
    review_session_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    topic_id = Column(Integer, ForeignKey("topics.topic_id", ondelete="CASCADE"), nullable=False)
    review_type = Column(String, nullable=False, default="NORMAL")
    total_items = Column(Integer, nullable=False, default=0, server_default="0")
    correct_count = Column(Integer, nullable=False, default=0, server_default="0")
    started_at = Column(DateTime, nullable=False, server_default=func.current_timestamp())
    completed_at = Column(DateTime)
    __table_args__ = (
        CheckConstraint("review_type IN ('NORMAL','FULL_TOPIC')"),
        CheckConstraint("total_items >= 0 AND correct_count >= 0 AND correct_count <= total_items"),
    )

class ReviewSessionItem(Base):
    __tablename__ = "review_session_items"
    session_item_id = Column(Integer, primary_key=True, autoincrement=True)
    review_session_id = Column(Integer, ForeignKey("review_sessions.review_session_id", ondelete="CASCADE"), nullable=False)
    word_id = Column(Integer, ForeignKey("words.word_id", ondelete="CASCADE"), nullable=False)
    is_answered = Column(Integer, nullable=False, default=0, server_default="0")
    is_correct = Column(Integer, nullable=False, default=0, server_default="0")
    answered_at = Column(DateTime)
    __table_args__ = (
        UniqueConstraint("review_session_id", "word_id"),
        CheckConstraint("is_answered IN (0,1) AND is_correct IN (0,1)"),
    )
