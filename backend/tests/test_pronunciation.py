import unittest

from services.pronunciation_service import _character_results, decode_audio


class PronunciationAssessmentTests(unittest.TestCase):
    def test_character_results_mark_mispronounced_positions(self):
        characters = _character_results(
            "hello",
            [
                {"position": 0, "label": "correct"},
                {"position": 2, "label": "mispronounced"},
            ],
        )
        self.assertEqual([item["character"] for item in characters], list("hello"))
        self.assertIn(
            "wrong",
            [item["status"] for item in characters],
        )

    def test_character_results_default_to_correct(self):
        characters = _character_results(
            "cat",
            [{"position": 0, "label": "correct"}],
        )
        self.assertEqual(
            [item["status"] for item in characters],
            ["correct", "correct", "correct"],
        )

    def test_invalid_audio_is_rejected(self):
        with self.assertRaises(ValueError):
            decode_audio(b"not an audio stream", "webm")


if __name__ == "__main__":
    unittest.main()
