# Learning Application Backend

Starter backend for a vocabulary-learning application built with FastAPI, SQLAlchemy 2.x, SQLite, Pydantic v2 and JWT bearer authentication.

## Included

- User registration, login, current-user profile and password change
- JWT authentication and ADMIN-only management endpoints
- Levels, topics, lessons, vocabulary and lesson-word assignment
- Soft hide/show for levels, topics, lessons and words
- User lesson/word progress, review sessions, daily activity
- Tag management and topic-tag assignment
- SQLite foreign-key enforcement

## Project layout

```text
backend/
├── app/                 # FastAPI app, database connection, security dependencies
├── models/              # SQLAlchemy models for the 14 canonical tables
├── routes/              # API endpoints grouped by feature
├── schemas/              # Pydantic request/response models
├── services/             # Business logic
├── scripts/init_db.py    # Create missing tables without deleting existing DB
├── requirements.txt
├── .env.example
└── README.md
```

## Setup (Windows PowerShell)

Open a terminal in this `backend` folder:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m scripts.init_db
uvicorn app.main:app --reload
```

If PowerShell blocks activation, use `.\.venv\Scripts\python.exe -m pip install -r requirements.txt` and `.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload`.

Open http://127.0.0.1:8000/docs.

## Important: preserve your current database

The default DB path is `backend/database.db`. This project does **not** delete the existing DB. `create_all()` creates missing tables but does not migrate existing table definitions. Back up your current database before using this backend with it. If the existing schema differs from these models, use Alembic migrations or a deliberate migration plan rather than deleting the DB.

## Create the first ADMIN

Public registration creates a `USER` role by default. For local development, register a user first, then promote that user to ADMIN using a one-off local script or database tool. Do not expose an unauthenticated admin-creation endpoint.

Example one-off script, run from this backend folder after registering:
```python
from app.database import SessionLocal
from models.user import User

db = SessionLocal()
try:
    user = db.query(User).filter_by(username="your_username").first()
    if user is None:
        raise RuntimeError("Register this account first")
    user.role = "ADMIN"
    db.commit()
finally:
    db.close()
```
Save it as a temporary local file, run it once, then delete the temporary script.

## Main endpoint groups

- `POST /users/` — register
- `POST /auth/login` — login with JSON `{ "identifier": "username-or-email", "password": "..." }`
- `GET /users/me`, `PATCH /users/me`
- `POST /auth/change-password`
- `/levels/`, `/topics/`, `/topics/{topic_id}/lessons`
- `/lessons/{lesson_id}/words`, `/words/`
- `/progress/`, `/reviews/`, `/activity/`
- `/admin/tags`, `/admin/topics/{topic_id}/tags`

Admin operations require a valid Bearer token for a user whose role is `ADMIN`. The current `/users/` list endpoint is also admin-only.

## Design notes and limitations

- Hiding content is preferred to hard deletion once users have progress/history.
- `PUT /lessons/{lesson_id}/words` replaces the lesson's assigned word list.
- Review scheduling is a simple starter rule, not a production spaced-repetition algorithm.
- `user_topic_progress` is defined but is not yet automatically recalculated from every word/lesson operation.
- Activity counters are starter implementations and may need to be incremented for each product-specific learning action.
- Use a strong `JWT_SECRET_KEY` from environment variables before deployment; the built-in fallback is development-only.
- Configure CORS for the actual frontend origin before deployment.
- For production, use Alembic migrations, automated tests, rate limiting, logging, and robust transaction/error handling.
