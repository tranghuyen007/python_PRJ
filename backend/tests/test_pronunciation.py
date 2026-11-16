import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base
from models.curriculum import Word
from models.pronunciation import PronunciationAttempt
from models.user import User
from services.content_filter import clean_text, is_banned
from services.pronunciation_service import get_summary, record_attempt


class PronunciationServiceTests(unittest.TestCase):
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
        self.other = User(
            username="other",
            email="other@example.com",
            password_hash="hash",
            role="USER",
            status="ACTIVE",
        )
        self.word = Word(word="Father", meaning="bố", is_active=1)
        self.db.add_all([self.user, self.other, self.word])
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def _record(self, word, score, mode="word", user=None):
        return record_attempt(
            self.db,
            user_id=(user or self.user).user_id,
            word=word,
            mode=mode,
            target_text=word,
            transcript=word,
            score=score,
        )

    def test_record_attempt_links_existing_word_and_tracks_best_score(self):
        first = self._record("  father ", 60)
        second = self._record("FATHER", 85)
        third = self._record("father", 70)

        saved = self.db.get(PronunciationAttempt, first["attempt_id"])
        self.assertEqual(saved.word, "father")
        self.assertEqual(saved.word_id, self.word.word_id)
        self.assertEqual(second["best_score"], 85)
        self.assertEqual(third["best_score"], 85)
        self.assertEqual(third["attempts"], 3)

    def test_unknown_word_is_saved_without_word_id(self):
        result = self._record("spaceship", 90)
        saved = self.db.get(PronunciationAttempt, result["attempt_id"])
        self.assertIsNone(saved.word_id)

    def test_word_and_sentence_modes_are_tracked_separately(self):
        self._record("father", 95, mode="word")
        result = self._record("father", 40, mode="sentence")
        self.assertEqual(result["best_score"], 40)
        self.assertEqual(result["attempts"], 1)

    def test_invalid_mode_or_score_is_rejected(self):
        with self.assertRaises(ValueError):
            self._record("father", 50, mode="phrase")
        with self.assertRaises(ValueError):
            self._record("father", 101)

    def test_summary_lists_only_weak_words_of_current_user(self):
        self._record("father", 50)
        self._record("father", 65)
        self._record("mother", 90)
        self._record("baby", 30, mode="sentence")
        self._record("sister", 10, user=self.other)

        summary = get_summary(self.db, user_id=self.user.user_id)

        self.assertEqual(summary["total_attempts"], 4)
        self.assertEqual(summary["average_score"], 59)
        self.assertEqual(summary["words_practiced"], 3)
        weak = [(w["word"], w["mode"], w["best_score"], w["attempts"]) for w in summary["weak_words"]]
        self.assertEqual(weak, [("baby", "sentence", 30, 1), ("father", "word", 65, 2)])

    def test_banned_words_are_removed_from_saved_transcript(self):
        result = record_attempt(
            self.db,
            user_id=self.user.user_id,
            word="father",
            mode="sentence",
            target_text="My father works in a bank.",
            transcript="my fucking father works in a f*** bank",
            score=90,
        )
        saved = self.db.get(PronunciationAttempt, result["attempt_id"])
        self.assertEqual(saved.transcript, "my father works in a bank")
        self.assertEqual(result["blocked_words"], 2)

    def test_summary_for_new_user_is_empty(self):
        summary = get_summary(self.db, user_id=self.other.user_id)
        self.assertEqual(summary["total_attempts"], 0)
        self.assertEqual(summary["average_score"], 0)
        self.assertEqual(summary["weak_words"], [])



class ContentFilterTests(unittest.TestCase):
    def test_blocks_english_vietnamese_and_masked_words(self):
        for token in ("Fuck", "SHIT!", "motherfuckers", "f***", "Địt", "vcl", "đm"):
            self.assertTrue(is_banned(token), token)

    def test_keeps_normal_words(self):
        for token in ("class", "glass", "assistant", "cocktail", "shirt", "father", "Dickens", "London"):
            self.assertFalse(is_banned(token), token)

    def test_word_in_lesson_target_is_not_blocked(self):
        text, removed = clean_text("that is crap", target="That film was crap.")
        self.assertEqual((text, removed), ("that is crap", 0))

    def test_clean_text_only_banned_words(self):
        self.assertEqual(clean_text("shit damn", target="apple"), ("", 2))


if __name__ == "__main__":
    unittest.main()