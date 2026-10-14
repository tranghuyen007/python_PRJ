from pathlib import Path
import sqlite3


BASE_DIR = Path(__file__).resolve().parent.parent.parent

DATABASE_FILE = BASE_DIR / "backend" / "database.db"
SQL_FILE = BASE_DIR / "database" / "database.sql"


connection = sqlite3.connect(DATABASE_FILE)

with open(SQL_FILE, "r", encoding="utf-8") as file:
    sql_script = file.read()

connection.executescript(sql_script)

connection.close()

print("Database created successfully.")