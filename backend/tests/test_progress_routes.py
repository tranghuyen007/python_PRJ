import unittest
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base
from models.curriculum import Lesson, LessonWord, Level, Topic, Word
from models.progress import ReviewSessionItem, UserDailyActivity, UserWordProgress
from models.user import User
from routes.progress import (
    answer_quick_review_item,
    learn_topic_word,
    read_topic_progress,
    start_quick_review,
)
from schemas.progress import (
    QuickReviewAnswer,
    QuickReviewAnswerResponse,
    QuickReviewSessionResponse,
    TopicProgressResponse,
)


class LearningProgressRouteTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine, autoflush=False)
        self.user = User(
            username="learner",
            email="learner@example.com",
            password_hash="hash",
            role="USER",
            status="ACTIVE",
        )
        self.db.add(self.user)
        level = Level(name="A1", display_order=1, placement_test_enabled=0, is_active=1)
        self.db.add(level)
        self.db.flush()
        self.level = level
        self.topic = Topic(
            level_id=level.level_id,
            name="Food",
            display_order=1,
            quick_review_limit=3,
            is_active=1,
        )
        self.db.add(self.topic)
        self.db.flush()
        lesson = Lesson(
            topic_id=self.topic.topic_id,
            name="Fruit",
            display_order=1,
            is_active=1,
        )
        self.db.add(lesson)
        self.db.flush()
        words = [
            Word(word="apple", meaning="táo", example="I ate an apple.", is_active=1),
            Word(word="pear", meaning="lê", example="She picked a pear.", is_active=1),
            Word(word="plum", meaning="mận", example="The plum is sweet.", is_active=1),
            Word(word="peach", meaning="đào", is_active=1),
            Word(word="grape", meaning="nho", is_active=1),
            Word(word="melon", meaning="dưa", is_active=1),
        ]
        self.db.add_all(words)
        self.db.flush()
        self.words = words
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

    def test_quick_review_uses_only_learned_words_and_admin_limit(self):
        for word in self.words[:5]:
            learn_topic_word(self.topic.topic_id, word.word_id, self.db, self.user)

        progress = read_topic_progress(self.topic.topic_id, self.db, self.user)
        TopicProgressResponse.model_validate(progress)
        self.assertEqual(progress["learned_count"], 5)
        self.assertEqual(set(progress["learned_word_ids"]), {word.word_id for word in self.words[:5]})

        review = start_quick_review(self.topic.topic_id, self.db, self.user)
        QuickReviewSessionResponse.model_validate(review)
        selected_ids = {item["word_id"] for item in review["items"]}
        self.assertEqual(review["total_items"], 3)
        self.assertEqual(len(selected_ids), 3)
        self.assertLessEqual(selected_ids, set(progress["learned_word_ids"]))

        for item_data in review["items"]:
            question = item_data["question_data"]
            if question["kind"] in {"meaning_choice", "fill_blank"}:
                self.assertEqual(len(question["options"]), 4)
            if question["kind"] == "fill_blank":
                self.assertIn("____", question["sentence"])

            stored_item = self.db.get(ReviewSessionItem, item_data["item_id"])
            result = answer_quick_review_item(
                review["review_session_id"],
                item_data["item_id"],
                QuickReviewAnswer(answer=stored_item.correct_answer),
                self.db,
                self.user,
            )
            QuickReviewAnswerResponse.model_validate(result)
            self.assertTrue(result["is_correct"])

        self.assertTrue(result["session_completed"])
        self.assertEqual(
            self.db.query(UserWordProgress)
            .filter_by(user_id=self.user.user_id)
            .with_entities(UserWordProgress.review_count)
            .all()
            .count((1,)),
            3,
        )

    def test_quick_review_caps_to_number_of_learned_words(self):
        learn_topic_word(self.topic.topic_id, self.words[0].word_id, self.db, self.user)
        learn_topic_word(self.topic.topic_id, self.words[0].word_id, self.db, self.user)

        review = start_quick_review(self.topic.topic_id, self.db, self.user)
        self.assertEqual(review["total_items"], 1)
        self.assertEqual(review["items"][0]["word_id"], self.words[0].word_id)

        activities = self.db.query(UserDailyActivity).filter_by(user_id=self.user.user_id).all()
        self.assertEqual(len(activities), 1)
        self.assertEqual(activities[0].learned_count, 1)

    def test_quick_review_requires_at_least_one_learned_word(self):
        with self.assertRaises(HTTPException) as error:
            start_quick_review(self.topic.topic_id, self.db, self.user)
        self.assertEqual(error.exception.status_code, 409)

    def test_choice_answers_are_validated_and_wrong_answers_are_recorded(self):
        learn_topic_word(self.topic.topic_id, self.words[0].word_id, self.db, self.user)
        with patch("services.progress_service.random.choice", return_value="meaning_choice"):
            review = start_quick_review(self.topic.topic_id, self.db, self.user)
        item_data = review["items"][0]
        item = self.db.get(ReviewSessionItem, item_data["item_id"])

        with self.assertRaises(HTTPException) as error:
            answer_quick_review_item(
                review["review_session_id"],
                item.session_item_id,
                QuickReviewAnswer(answer="not an option"),
                self.db,
                self.user,
            )
        self.assertEqual(error.exception.status_code, 422)

        wrong_option = next(
            option
            for option in item.question_data["options"]
            if option != item.correct_answer
        )
        result = answer_quick_review_item(
            review["review_session_id"],
            item.session_item_id,
            QuickReviewAnswer(answer=wrong_option),
            self.db,
            self.user,
        )
        self.assertFalse(result["is_correct"])
        progress = self.db.query(UserWordProgress).filter_by(
            user_id=self.user.user_id,
            word_id=item.word_id,
        ).one()
        self.assertEqual(progress.review_count, 1)
        self.assertEqual(progress.wrong_count, 1)

    def test_cannot_mark_a_word_from_another_topic_as_learned(self):
        other_topic = Topic(
            level_id=self.level.level_id,
            name="Other",
            display_order=2,
            quick_review_limit=5,
            is_active=1,
        )
        self.db.add(other_topic)
        self.db.commit()

        with self.assertRaises(HTTPException) as error:
            learn_topic_word(other_topic.topic_id, self.words[0].word_id, self.db, self.user)
        self.assertEqual(error.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
