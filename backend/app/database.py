import os
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy import inspect, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import declarative_base, sessionmaker

BACKEND_DIR = Path(__file__).resolve().parent.parent
DATABASE_FILE = Path(os.getenv("DATABASE_FILE", str(BACKEND_DIR / "database.db")))
DATABASE_URL = URL.create(drivername="sqlite", database=str(DATABASE_FILE))
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

@event.listens_for(engine, "connect")
def enable_sqlite_foreign_keys(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrate_review_features():
    """Apply the additive columns needed by configurable, per-session reviews."""
    inspector = inspect(engine)
    with engine.begin() as connection:
        if "topics" in inspector.get_table_names():
            topic_columns = {column["name"] for column in inspector.get_columns("topics")}
            if "quick_review_limit" not in topic_columns:
                connection.execute(
                    text(
                        "ALTER TABLE topics ADD COLUMN "
                        "quick_review_limit INTEGER NOT NULL DEFAULT 15 "
                        "CHECK (quick_review_limit >= 1)"
                    )
                )

        if "review_session_items" in inspector.get_table_names():
            item_columns = {
                column["name"]
                for column in inspector.get_columns("review_session_items")
            }
            if "question_data" not in item_columns:
                connection.execute(
                    text("ALTER TABLE review_session_items ADD COLUMN question_data JSON")
                )
