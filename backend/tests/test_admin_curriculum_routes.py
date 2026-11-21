import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base
from models.curriculum import Word
from models.user import User
from routes.levels import (
    admin_create_lesson,
    admin_create_topic,
    admin_create_word,
    admin_list_lessons,
    admin_list_levels,
    admin_list_topics,
    admin_list_words,
    admin_update_word,
    create_level,
)
from schemas.placement_test import (
    LevelCreate,
    LessonCreate,
    TopicCreate,
    WordCreate,
    WordUpdate,
    AdminWordResponse,
)


class AdminCurriculumRouteTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.admin = User(
            username="admin",
            email="admin@example.com",
            password_hash="hash",
            role="ADMIN",
            status="ACTIVE",
        )
        self.db.add(self.admin)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_admin_can_create_curriculum_and_assign_vocabulary(self):
        level = create_level(
            LevelCreate(name="A1", display_order=1),
            self.db,
            self.admin,
        )
        topic = admin_create_topic(
            TopicCreate(level_id=level["level_id"], name="Food", quick_review_limit=12),
            self.db,
            self.admin,
        )
        lesson = admin_create_lesson(
            LessonCreate(topic_id=topic.topic_id, name="Fruit"),
            self.db,
            self.admin,
        )
        word = admin_create_word(
            WordCreate(
                lesson_id=lesson.lesson_id,
                word="apple",
                meaning="quả táo",
                example="I ate an apple.",
            ),
            self.db,
            self.admin,
        )

        self.assertEqual(AdminWordResponse.model_validate(word).lesson_id, lesson.lesson_id)
        self.assertEqual(admin_list_levels(self.db, self.admin)[0]["name"], "A1")
        self.assertEqual(admin_list_topics(self.db, self.admin)[0].quick_review_limit, 12)
        self.assertEqual(admin_list_lessons(self.db, self.admin)[0].name, "Fruit")
        self.assertEqual(admin_list_words(self.db, self.admin)[0]["word"], "apple")

        changed = admin_update_word(
            word["word_id"],
            WordUpdate(meaning="táo"),
            self.db,
            self.admin,
        )
        self.assertEqual(changed["meaning"], "táo")
        self.assertEqual(self.db.get(Word, word["word_id"]).meaning, "táo")


if __name__ == "__main__":
    unittest.main()
