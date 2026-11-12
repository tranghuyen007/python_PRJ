import unittest
from unittest.mock import patch

from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool

from app.database import migrate_placement_test_schema


class PlacementTestMigrationTests(unittest.TestCase):
    def test_existing_database_gets_additive_columns_and_is_idempotent(self):
        engine = create_engine("sqlite://", poolclass=StaticPool)
        with engine.begin() as connection:
            connection.execute(
                text(
                    "CREATE TABLE users (user_id INTEGER PRIMARY KEY, username TEXT)"
                )
            )
            connection.execute(
                text(
                    "CREATE TABLE levels (level_id INTEGER PRIMARY KEY, name TEXT, "
                    "description TEXT, display_order INTEGER)"
                )
            )
            connection.execute(
                text(
                    "CREATE TABLE topics (topic_id INTEGER PRIMARY KEY, "
                    "quick_review_limit INTEGER)"
                )
            )
            connection.execute(
                text("CREATE TABLE lessons (lesson_id INTEGER PRIMARY KEY)")
            )
            connection.execute(
                text("CREATE TABLE words (word_id INTEGER PRIMARY KEY)")
            )
            connection.execute(
                text("INSERT INTO levels (level_id, name, display_order) VALUES (1, 'A1', 1)")
            )

        try:
            with patch("app.database.engine", engine):
                migrate_placement_test_schema()
                migrate_placement_test_schema()

            with engine.connect() as connection:
                level_columns = {
                    row[1] for row in connection.execute(text("PRAGMA table_info(levels)"))
                }
                user_columns = {
                    row[1] for row in connection.execute(text("PRAGMA table_info(users)"))
                }
                level = connection.execute(
                    text(
                        "SELECT placement_test_enabled, placement_test_question_count, "
                        "placement_test_passing_score FROM levels WHERE level_id = 1"
                    )
                ).one()
                integrity = connection.execute(text("PRAGMA integrity_check")).scalar_one()

            self.assertTrue(
                {
                    "placement_test_enabled",
                    "placement_test_question_count",
                    "placement_test_passing_score",
                    "is_active",
                }.issubset(level_columns)
            )
            self.assertTrue({"role", "status"}.issubset(user_columns))
            self.assertEqual(tuple(level), (0, 10, 7))
            self.assertEqual(integrity, "ok")
        finally:
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
