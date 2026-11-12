from pathlib import Path
import sqlite3


# Thư mục gốc của project
PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Đường dẫn đến file SQL và database SQLite
SQL_FILE = PROJECT_ROOT / "database" / "database.sql"
DATABASE_FILE = PROJECT_ROOT / "backend" / "database.db"


def init_database():
    if not SQL_FILE.exists():
        raise FileNotFoundError(
            f"Không tìm thấy file SQL: {SQL_FILE}"
        )

    if DATABASE_FILE.exists():
        raise FileExistsError(
            f"Database đã tồn tại: {DATABASE_FILE}. "
            "Không khởi tạo lại để tránh ghi đè dữ liệu."
        )

    connection = sqlite3.connect(DATABASE_FILE)

    try:
        connection.execute("PRAGMA foreign_keys = ON")

        sql_script = SQL_FILE.read_text(encoding="utf-8")
        connection.executescript(sql_script)

        connection.commit()
        print("Khởi tạo database thành công!")

    except Exception:
        connection.rollback()
        connection.close()

        # Xóa database tạo dở khi khởi tạo thất bại
        if DATABASE_FILE.exists():
            DATABASE_FILE.unlink()

        raise

    else:
        connection.close()


if __name__ == "__main__":
    init_database()
