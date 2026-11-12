import unittest

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base
from models.curriculum import Lesson, LessonWord, Level, Topic, Word
from models.user import User
from routes.levels import list_level_topics
from routes.placement_tests import (
    answer_placement_test_question,
    finish_placement_test,
    get_placement_test_questions,
    start_placement_test,
)
from schemas.placement_test import PlacementTestAnswer, PlacementTestAttemptResponse


class PlacementTestRouteTests(unittest.TestCase):
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
        level = Level(
            name="A1",
            display_order=1,
            placement_test_enabled=1,
            placement_test_question_count=4,
            placement_test_passing_score=3,
            is_active=1,
        )
        self.db.add(level)
        self.db.flush()
        self.level = level
        topic = Topic(
            level_id=level.level_id,
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
        words = [
            Word(word="mother", meaning="mẹ", is_active=1),
            Word(word="father", meaning="cha", is_active=1),
            Word(word="sister", meaning="chị/em gái", is_active=1),
            Word(word="brother", meaning="anh/em trai", is_active=1),
        ]
        self.db.add_all(words)
        self.db.flush()
        self.db.add_all(
            LessonWord(
                lesson_id=lesson.lesson_id,
                word_id=word.word_id,
                display_order=index,
            )
            for index, word in enumerate(words, start=1)
        )
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_api_routes_gate_level_content_and_unlock_after_a_pass(self):
        with self.assertRaises(HTTPException) as error:
            list_level_topics(self.level.level_id, self.db, self.user)
        self.assertEqual(error.exception.status_code, 403)

        attempt = start_placement_test(self.level.level_id, self.db, self.user)
        questions = get_placement_test_questions(
            attempt.attempt_id,
            self.db,
            self.user,
        )
        for question in questions:
            correct_meaning = self.db.get(Word, question.word_id).meaning
            answer_result = answer_placement_test_question(
                attempt.attempt_id,
                question.item_id,
                PlacementTestAnswer(answer=correct_meaning),
                self.db,
                self.user,
            )
            self.assertTrue(answer_result["is_correct"])

        result = finish_placement_test(attempt.attempt_id, self.db, self.user)
        response = PlacementTestAttemptResponse.model_validate(result)
        self.assertTrue(response.passed)
        self.assertEqual(len(list_level_topics(self.level.level_id, self.db, self.user)), 1)


if __name__ == "__main__":
    unittest.main()
