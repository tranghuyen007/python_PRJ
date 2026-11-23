from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy import inspect, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import declarative_base, sessionmaker


# Xác định thư mục backend
BACKEND_DIR = Path(__file__).resolve().parent.parent

# Đường dẫn tới file SQLite
DATABASE_FILE = BACKEND_DIR / "database.db"

DATABASE_URL = URL.create(
    drivername="sqlite",
    database=str(DATABASE_FILE),
)

# Tạo engine kết nối database
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

# Tạo session để thao tác với database
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Base để các Model kế thừa
Base = declarative_base()


def migrate_placement_test_schema() -> None:
    """Apply additive SQLite migrations for auth, curriculum, and review sessions."""
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as connection:
        if "users" in tables:
            user_columns = {column["name"] for column in inspector.get_columns("users")}
            if "role" not in user_columns:
                connection.execute(
                    text("ALTER TABLE users ADD COLUMN role VARCHAR NOT NULL DEFAULT 'USER'")
                )
            if "status" not in user_columns:
                connection.execute(
                    text("ALTER TABLE users ADD COLUMN status VARCHAR NOT NULL DEFAULT 'ACTIVE'")
                )
            if "full_name" not in user_columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN full_name VARCHAR"))
            if "gender" not in user_columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN gender VARCHAR"))
            if "bio" not in user_columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN bio VARCHAR"))
            if "avatar_key" not in user_columns:
                connection.execute(
                    text("ALTER TABLE users ADD COLUMN avatar_key VARCHAR NOT NULL DEFAULT 'bunny'")
                )

        if "lessons" in tables:
            lesson_columns = {column["name"] for column in inspector.get_columns("lessons")}
            if "pronunciation_passing_score" not in lesson_columns:
                connection.execute(
                    text("ALTER TABLE lessons ADD COLUMN pronunciation_passing_score INTEGER NOT NULL DEFAULT 70")
                )
            if "pronunciation_max_attempts" not in lesson_columns:
                connection.execute(
                    text("ALTER TABLE lessons ADD COLUMN pronunciation_max_attempts INTEGER NOT NULL DEFAULT 7")
                )

        if "words" in tables:
            word_columns = {column["name"] for column in inspector.get_columns("words")}
            if "ipa" not in word_columns:
                connection.execute(text("ALTER TABLE words ADD COLUMN ipa VARCHAR"))
            if "reference_audio_path" not in word_columns:
                connection.execute(text("ALTER TABLE words ADD COLUMN reference_audio_path VARCHAR"))

        if "pronunciation_attempts" in tables:
            pronunciation_columns = {
                column["name"]
                for column in inspector.get_columns("pronunciation_attempts")
            }
            if "lesson_id" not in pronunciation_columns:
                connection.execute(
                    text("ALTER TABLE pronunciation_attempts ADD COLUMN lesson_id INTEGER")
                )
            if "overall_score" not in pronunciation_columns:
                connection.execute(
                    text("ALTER TABLE pronunciation_attempts ADD COLUMN overall_score INTEGER NOT NULL DEFAULT 0")
                )
            if "character_results" not in pronunciation_columns:
                connection.execute(
                    text("ALTER TABLE pronunciation_attempts ADD COLUMN character_results JSON")
                )
            if "phoneme_results" not in pronunciation_columns:
                connection.execute(
                    text("ALTER TABLE pronunciation_attempts ADD COLUMN phoneme_results JSON")
                )

        if "levels" in tables:
            level_columns = {column["name"] for column in inspector.get_columns("levels")}
            new_columns = {
                "placement_test_enabled": "INTEGER NOT NULL DEFAULT 0",
                "placement_test_question_count": "INTEGER NOT NULL DEFAULT 10",
                "placement_test_passing_score": "INTEGER NOT NULL DEFAULT 7",
                "is_active": "INTEGER NOT NULL DEFAULT 1",
            }
            for name, definition in new_columns.items():
                if name not in level_columns:
                    connection.execute(text(f"ALTER TABLE levels ADD COLUMN {name} {definition}"))

        if "topics" in tables:
            topic_columns = {column["name"] for column in inspector.get_columns("topics")}
            if "quick_review_limit" not in topic_columns:
                connection.execute(
                    text("ALTER TABLE topics ADD COLUMN quick_review_limit INTEGER NOT NULL DEFAULT 15")
                )

        if "review_session_items" in tables:
            review_item_columns = {
                column["name"]
                for column in inspector.get_columns("review_session_items")
            }
            if "question_data" not in review_item_columns:
                connection.execute(
                    text("ALTER TABLE review_session_items ADD COLUMN question_data JSON")
                )
            if "correct_answer" not in review_item_columns:
                connection.execute(
                    text("ALTER TABLE review_session_items ADD COLUMN correct_answer TEXT")
                )
            if "answer" not in review_item_columns:
                connection.execute(
                    text("ALTER TABLE review_session_items ADD COLUMN answer TEXT")
                )

        for table_name in ("topics", "lessons", "words"):
            if table_name in tables:
                columns = {
                    column["name"]
                    for column in inspector.get_columns(table_name)
                }
                if "is_active" not in columns:
                    connection.execute(
                        text(
                            f"ALTER TABLE {table_name} "
                            "ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1"
                        )
                    )


def initialize_database() -> None:
    migrate_placement_test_schema()
    Base.metadata.create_all(bind=engine)