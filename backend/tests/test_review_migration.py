import unittest
from unittest.mock import patch

from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool

from app.database import migrate_review_features


class ReviewMigrationTests(unittest.TestCase):
    def test_additive_migration_is_safe_to_run_more_than_once(self):
        engine = create_engine("sqlite://", poolclass=StaticPool)
        with engine.begin() as connection:
            connection.execute(
                text("CREATE TABLE topics (topic_id INTEGER PRIMARY KEY, name TEXT)")
            )
            connection.execute(
                text(
                    "CREATE TABLE review_session_items "
                    "(session_item_id INTEGER PRIMARY KEY)"
                )
            )
            connection.execute(
                text("INSERT INTO topics (topic_id, name) VALUES (1, 'Family')")
            )

        try:
            with patch("app.database.engine", engine):
                migrate_review_features()
                migrate_review_features()

            with engine.connect() as connection:
                topic = connection.execute(
                    text("SELECT quick_review_limit FROM topics WHERE topic_id = 1")
                ).scalar_one()
                item_columns = {
                    row[1]
                    for row in connection.execute(
                        text("PRAGMA table_info(review_session_items)")
                    )
                }

            self.assertEqual(topic, 15)
            self.assertIn("question_data", item_columns)
        finally:
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
