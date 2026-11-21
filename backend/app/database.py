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
