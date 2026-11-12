import unittest
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base
from models.curriculum import Level, Lesson, LessonWord, Topic, Word
from models.progress import UserLessonProgress, UserWordProgress
from models.review import ReviewSessionItem
from models.user import User
from services.progress_service import record_lesson_page
from schemas.review import ReviewItemResponse, ReviewSessionResponse
from services.review_service import complete_review, start_review, submit_answer


class ReviewServiceTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)

        user = User(username="learner", email="learner@example.com", password_hash="hash")
        level = Level(name="A1")
        self.db.add_all([user, level])
        self.db.flush()
        self.user_id = user.user_id

        topic = Topic(level_id=level.level_id, name="Family", quick_review_limit=2)
        self.db.add(topic)
        self.db.flush()
        self.topic_id = topic.topic_id

        lesson = Lesson(topic_id=topic.topic_id, name="People", display_order=1)
        self.db.add(lesson)
        self.db.flush()
        self.words = [
            Word(word="mother", meaning="mẹ", part_of_speech="noun", example="My mother is kind."),
            Word(word="father", meaning="cha", part_of_speech="noun"),
            Word(word="sister", meaning="chị/em gái", part_of_speech="noun"),
            Word(word="brother", meaning="anh/em trai", part_of_speech="noun"),
        ]
        self.db.add_all(self.words)
        self.db.flush()
        self.db.add_all(
            LessonWord(lesson_id=lesson.lesson_id, word_id=word.word_id, display_order=index)
            for index, word in enumerate(self.words, start=1)
        )
        self.db.add_all(
            UserWordProgress(user_id=self.user_id, word_id=word.word_id, learned=1)
            for word in self.words[:3]
        )
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_quick_review_uses_learned_words_and_topic_limit(self):
        session = start_review(self.db, self.user_id, self.topic_id, "QUICK")
        items = (
            self.db.query(ReviewSessionItem)
            .filter_by(review_session_id=session.review_session_id)
            .all()
        )

        self.assertEqual(session.total_items, 2)
        self.assertEqual(len(items), 2)
        learned_word_ids = {word.word_id for word in self.words[:3]}
        self.assertTrue({item.word_id for item in items}.issubset(learned_word_ids))
        for item in items:
            self.assertIn(
                item.question_data["method"],
                {"MULTIPLE_CHOICE_MEANING", "FILL_BLANK", "TYPE_MEANING"},
            )

    def test_full_topic_review_includes_unlearned_words(self):
        session = start_review(self.db, self.user_id, self.topic_id, "FULL_TOPIC")
        self.assertEqual(session.total_items, 4)

    def test_question_and_answer_are_initialized_and_checked_by_backend(self):
        self.db.query(UserWordProgress).filter(
            UserWordProgress.word_id != self.words[0].word_id
        ).delete(synchronize_session=False)
        self.db.commit()
        with patch(
            "services.review_service.random.choice",
            return_value="FILL_BLANK",
        ):
            session = start_review(self.db, self.user_id, self.topic_id, "QUICK")

        item = (
            self.db.query(ReviewSessionItem)
            .filter_by(review_session_id=session.review_session_id)
            .first()
        )
        self.assertEqual(item.question_data["sentence"], "My _____ is kind.")
        self.assertEqual(len(item.question_data["options"]), 4)

        result = submit_answer(self.db, self.user_id, session.review_session_id, item.word_id, "mother")
        self.assertEqual(result.is_correct, 1)

    def test_all_question_types_are_checked_and_results_include_accuracy(self):
        question_types = [
            "MULTIPLE_CHOICE_MEANING",
            "FILL_BLANK",
            "TYPE_MEANING",
            "MULTIPLE_CHOICE_MEANING",
        ]
        with patch("services.review_service.random.choice", side_effect=question_types):
            session = start_review(self.db, self.user_id, self.topic_id, "FULL_TOPIC")

        items = (
            self.db.query(ReviewSessionItem)
            .filter_by(review_session_id=session.review_session_id)
            .all()
        )
        self.assertEqual(len(items), 4)
        for item in items:
            word = self.db.get(Word, item.word_id)
            if item.question_data["method"] == "FILL_BLANK":
                answer = word.word
            elif item.question_data["method"] == "TYPE_MEANING":
                answer = word.meaning
            else:
                answer = word.meaning
                self.assertIn(answer, item.question_data["options"])
            answered_item = submit_answer(
                self.db,
                self.user_id,
                session.review_session_id,
                item.word_id,
                answer,
            )
            self.assertEqual(answered_item.is_correct, 1)
            ReviewItemResponse.model_validate(answered_item)

        finished = complete_review(self.db, self.user_id, session.review_session_id)
        response = ReviewSessionResponse.model_validate(finished)
        self.assertEqual(response.review_mode, "FULL_TOPIC")
        self.assertEqual(response.accuracy_percent, 100)

    def test_quick_review_requires_a_learned_word(self):
        self.db.query(UserWordProgress).delete()
        self.db.commit()

        with self.assertRaisesRegex(ValueError, "at least one word"):
            start_review(self.db, self.user_id, self.topic_id, "QUICK")

    def test_existing_lesson_page_progress_is_used_for_quick_review(self):
        lesson_id = self.db.query(Lesson.lesson_id).filter_by(topic_id=self.topic_id).scalar()
        self.db.query(UserWordProgress).delete()
        self.db.add(
            UserLessonProgress(
                user_id=self.user_id,
                lesson_id=lesson_id,
                completed_items=1,
                total_items=9,
            )
        )
        self.db.commit()

        session = start_review(self.db, self.user_id, self.topic_id, "QUICK")
        items = (
            self.db.query(ReviewSessionItem)
            .filter_by(review_session_id=session.review_session_id)
            .all()
        )
        self.assertEqual({item.word_id for item in items}, {self.words[0].word_id})

    def test_vocabulary_pages_make_words_available_to_quick_review(self):
        lesson_id = (
            self.db.query(Lesson.lesson_id)
            .filter_by(topic_id=self.topic_id)
            .scalar()
        )
        self.db.query(UserWordProgress).delete()
        self.db.commit()

        record_lesson_page(self.db, self.user_id, lesson_id, "VOCABULARY", 2)
        learned_ids = {
            row[0]
            for row in self.db.query(UserWordProgress.word_id)
            .filter_by(user_id=self.user_id, learned=1)
            .all()
        }
        self.assertEqual(learned_ids, {word.word_id for word in self.words[:2]})

        session = start_review(self.db, self.user_id, self.topic_id, "QUICK")
        self.assertEqual(session.total_items, 2)


if __name__ == "__main__":
    unittest.main()
