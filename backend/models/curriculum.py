from sqlalchemy import (
    CheckConstraint,
    Column,
    ForeignKey,
    Integer,
    String,
    Text,
)

from app.database import Base


class Level(Base):
    __tablename__ = "levels"
    __table_args__ = (
        CheckConstraint(
            "placement_test_enabled IN (0, 1)",
            name="ck_levels_placement_test_enabled",
        ),
        CheckConstraint(
            "placement_test_question_count >= 1",
            name="ck_levels_placement_test_question_count",
        ),
        CheckConstraint(
            "placement_test_passing_score >= 1",
            name="ck_levels_placement_test_passing_score",
        ),
        CheckConstraint(
            "placement_test_passing_score <= placement_test_question_count",
            name="ck_levels_placement_test_passing_score_max",
        ),
    )

    level_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(Text)
    display_order = Column(Integer, nullable=False)
    placement_test_enabled = Column(Integer, nullable=False, default=0, server_default="0")
    placement_test_question_count = Column(Integer, nullable=False, default=10, server_default="10")
    placement_test_passing_score = Column(Integer, nullable=False, default=7, server_default="7")
    is_active = Column(Integer, nullable=False, default=1, server_default="1")


class Topic(Base):
    __tablename__ = "topics"
    topic_id = Column(Integer, primary_key=True, autoincrement=True)
    level_id = Column(Integer, ForeignKey("levels.level_id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    display_order = Column(Integer, nullable=False)
    quick_review_limit = Column(Integer, nullable=False, default=15, server_default="15")
    is_active = Column(Integer, nullable=False, default=1, server_default="1")


class Lesson(Base):
    __tablename__ = "lessons"
    lesson_id = Column(Integer, primary_key=True, autoincrement=True)
    topic_id = Column(Integer, ForeignKey("topics.topic_id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    display_order = Column(Integer, nullable=False)
    is_active = Column(Integer, nullable=False, default=1, server_default="1")


class Word(Base):
    __tablename__ = "words"
    word_id = Column(Integer, primary_key=True, autoincrement=True)
    word = Column(String, nullable=False)
    meaning = Column(Text, nullable=False)
    pronunciation = Column(String)
    part_of_speech = Column(String)
    example = Column(Text)
    is_active = Column(Integer, nullable=False, default=1, server_default="1")


class LessonWord(Base):
    __tablename__ = "lesson_words"
    lesson_id = Column(Integer, ForeignKey("lessons.lesson_id"), primary_key=True)
    word_id = Column(Integer, ForeignKey("words.word_id"), primary_key=True)
    display_order = Column(Integer, nullable=False)
