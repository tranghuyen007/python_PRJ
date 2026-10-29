from pathlib import Path

from sqlalchemy import create_engine
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
