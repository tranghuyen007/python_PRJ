from sqlalchemy.orm import relationship
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint,
    CheckConstraint, PrimaryKeyConstraint, func
)
from app.database import Base

class Level(Base):
    __tablename__ = "levels"
    level_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(Text)
    is_active = Column(Integer, nullable=False, default=1, server_default="1")
    display_order = Column(Integer, nullable=False, default=0, server_default="0")
    __table_args__ = (CheckConstraint("is_active IN (0,1)"),)

class Topic(Base):
    __tablename__ = "topics"
    topic_id = Column(Integer, primary_key=True, autoincrement=True)
    level_id = Column(Integer, ForeignKey("levels.level_id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    is_active = Column(Integer, nullable=False, default=1, server_default="1")
    display_order = Column(Integer, nullable=False, default=0, server_default="0")
    __table_args__ = (
        UniqueConstraint("level_id", "name", name="uq_topics_level_name"),
        CheckConstraint("is_active IN (0,1)"),
    )

class Lesson(Base):
    __tablename__ = "lessons"
    lesson_id = Column(Integer, primary_key=True, autoincrement=True)
    topic_id = Column(Integer, ForeignKey("topics.topic_id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    is_active = Column(Integer, nullable=False, default=1, server_default="1")
    display_order = Column(Integer, nullable=False, default=0, server_default="0")
    __table_args__ = (
        UniqueConstraint("topic_id", "display_order", name="uq_lessons_topic_order"),
        CheckConstraint("is_active IN (0,1)"),
    )

class Tag(Base):
    __tablename__ = "tags"
    tag_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(Text)

class TopicTag(Base):
    __tablename__ = "topic_tags"
    topic_id = Column(Integer, ForeignKey("topics.topic_id", ondelete="CASCADE"), nullable=False)
    tag_id = Column(Integer, ForeignKey("tags.tag_id", ondelete="CASCADE"), nullable=False)
    __table_args__ = (PrimaryKeyConstraint("topic_id", "tag_id"),)

class Word(Base):
    __tablename__ = "words"
    word_id = Column(Integer, primary_key=True, autoincrement=True)
    word = Column(String, nullable=False, index=True)
    meaning = Column(Text, nullable=False)
    pronunciation = Column(String)
    part_of_speech = Column(String)
    is_active = Column(Integer, nullable=False, default=1, server_default="1")
    example = Column(Text)
    created_at = Column(DateTime, nullable=False, server_default=func.current_timestamp())
    __table_args__ = (CheckConstraint("is_active IN (0,1)"),)

class LessonWord(Base):
    __tablename__ = "lesson_words"
    lesson_id = Column(Integer, ForeignKey("lessons.lesson_id"), nullable=False)
    word_id = Column(Integer, ForeignKey("words.word_id"), nullable=False)
    display_order = Column(Integer, nullable=False, default=0, server_default="0")
    word = relationship("Word")
    __table_args__ = (
        PrimaryKeyConstraint("lesson_id", "word_id"),
        UniqueConstraint("lesson_id", "display_order", name="uq_lesson_words_order"),
    )
