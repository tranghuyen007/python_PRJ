import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base
from models.curriculum import Lesson, LessonWord, Level, Topic, Word
from models.placement_test import PlacementTestAttemptItem
from models.user import User
from services.placement_test_service import (
    complete_attempt,
    create_attempt,
    level_is_unlocked,
    submit_answer,
)


class PlacementTestServiceTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)

        self.user = User(
            username="learner",
            email="learner@example.com",
            password_hash="hash",
            role="USER",
            status="ACTIVE",
        )
        self.db.add(self.user)
        self.db.flush()

        self.lower_level = Level(
            name="A1",
            display_order=1,
            placement_test_enabled=1,
            placement_test_question_count=10,
            placement_test_passing_score=7,
            is_active=1,
        )
        self.open_level = Level(
            name="Starter",
            display_order=0,
            placement_test_enabled=0,
            is_active=1,
        )
        self.test_level = Level(
            name="A2",
            display_order=2,
            placement_test_enabled=1,
            placement_test_question_count=10,
            placement_test_passing_score=7,
            is_active=1,
        )
        self.db.add_all([self.open_level, self.lower_level, self.test_level])
        self.db.flush()

        topic = Topic(
            level_id=self.test_level.level_id,
            name="Family",
            display_order=1,
            is_active=1,
        )
        self.db.add(topic)
        self.db.flush()
        lesson = Lesson(
            topic_id=topic.topic_id,
            name="People",
            display_order=1,
            is_active=1,
        )
        self.db.add(lesson)
        self.db.flush()

        self.words = [
            Word(word="mother", meaning="mẹ", is_active=1),
            Word(word="father", meaning="cha", is_active=1),
            Word(word="sister", meaning="chị/em gái", is_active=1),
            Word(word="brother", meaning="anh/em trai", is_active=1),
        ]
        self.db.add_all(self.words)
        self.db.flush()
        self.db.add_all(
            LessonWord(
                lesson_id=lesson.lesson_id,
                word_id=word.word_id,
                display_order=index,
            )
            for index, word in enumerate(self.words, start=1)
        )
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_question_count_is_capped_by_vocabulary_and_pass_score_is_possible(self):
        attempt = create_attempt(self.db, self.user.user_id, self.test_level.level_id)
        items = (
            self.db.query(PlacementTestAttemptItem)
            .filter_by(attempt_id=attempt.attempt_id)
            .all()
        )

        self.assertEqual(attempt.total_questions, 4)
        self.assertEqual(attempt.passing_score, 4)
        self.assertEqual(len(items), 4)
        for item in items:
            self.assertEqual(len(item.question_data["options"]), 4)
            self.assertEqual(len(set(item.question_data["options"])), 4)

    def test_passing_unlocks_this_level_and_all_lower_levels(self):
        attempt = create_attempt(self.db, self.user.user_id, self.test_level.level_id)
        items = (
            self.db.query(PlacementTestAttemptItem)
            .filter_by(attempt_id=attempt.attempt_id)
            .all()
        )
        for item in items:
            word = self.db.get(Word, item.word_id)
            submit_answer(
                self.db,
                self.user.user_id,
                attempt.attempt_id,
                item.item_id,
                word.meaning,
            )

        result = complete_attempt(self.db, self.user.user_id, attempt.attempt_id)
        self.assertEqual(result.passed, 1)
        self.assertTrue(level_is_unlocked(self.db, self.user, self.test_level))
        self.assertTrue(level_is_unlocked(self.db, self.user, self.lower_level))

    def test_not_passing_does_not_unlock_test_level(self):
        attempt = create_attempt(self.db, self.user.user_id, self.test_level.level_id)
        items = (
            self.db.query(PlacementTestAttemptItem)
            .filter_by(attempt_id=attempt.attempt_id)
            .all()
        )
        for item in items:
            word = self.db.get(Word, item.word_id)
            incorrect = next(
                option for option in item.question_data["options"]
                if option != word.meaning
            )
            submit_answer(
                self.db,
                self.user.user_id,
                attempt.attempt_id,
                item.item_id,
                incorrect,
            )

        result = complete_attempt(self.db, self.user.user_id, attempt.attempt_id)
        self.assertEqual(result.passed, 0)
        self.assertFalse(level_is_unlocked(self.db, self.user, self.test_level))
        self.assertFalse(level_is_unlocked(self.db, self.user, self.lower_level))
        self.assertTrue(level_is_unlocked(self.db, self.user, self.open_level))

    def test_disabled_exam_level_is_open_without_an_attempt(self):
        self.assertTrue(level_is_unlocked(self.db, self.user, self.open_level))


if __name__ == "__main__":
    unittest.main()
