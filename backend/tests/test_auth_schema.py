import unittest

from pydantic import ValidationError

from schemas.auth import LoginRequest


class LoginRequestTests(unittest.TestCase):
    def test_accepts_email_at_user_schema_maximum_length(self):
        email = f"{'a' * 28}@example.com"
        self.assertEqual(len(email), 40)

        request = LoginRequest(
            identifier=email,
            password="UserDemo2026!",
        )

        self.assertEqual(request.identifier, email)

    def test_rejects_identifier_longer_than_user_email_limit(self):
        email = f"{'a' * 29}@example.com"
        self.assertEqual(len(email), 41)

        with self.assertRaises(ValidationError):
            LoginRequest(identifier=email, password="UserDemo2026!")


if __name__ == "__main__":
    unittest.main()
