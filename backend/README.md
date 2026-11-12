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

The default DB path is `backend/database.db`. This project does **not** delete the existing DB. `create_all()` creates missing tables but does not generally migrate existing table definitions. Startup applies only the narrow, additive review-feature migration documented below. Back up your current database before using this backend with it. If the existing schema differs from these models, use Alembic migrations or a deliberate migration plan rather than deleting the DB.

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

## Topic review settings and review sessions

Admins can set `quick_review_limit` when creating a topic or update it with
`PATCH /topics/{topic_id}`, for example:

```json
{ "quick_review_limit": 15 }
```

The value defaults to 15 and must be at least 1. Quick review (`review_type:
"QUICK"`) randomly selects up to that many words the user has learned in active
lessons in the topic. It is available after learning at least one such word;
there is no minimum-lesson requirement. Full-topic review
(`review_type: "FULL_TOPIC"`) includes every active word assigned to active
lessons in the topic.

Create a session with `POST /reviews/sessions`, then fetch its randomly
initialized questions from `GET /reviews/sessions/{session_id}/items`. Each
item's `question_data.method` is one of:

- `MULTIPLE_CHOICE_MEANING`: English word, pronunciation/audio, and four
  Vietnamese meaning choices.
- `FILL_BLANK`: an English cloze sentence and four English word choices.
- `TYPE_MEANING`: English word and pronunciation/audio; the user types its
  Vietnamese meaning.

Submit the selected option or typed meaning as
`POST /reviews/sessions/{session_id}/answers` with
`{ "word_id": 1, "answer": "..." }`. The backend validates the answer instead
of trusting a client-supplied correctness flag. Distractors and question method
are randomized and saved per session, so re-fetching a session returns the same
questions. Cloze questions use the word's `example` when it contains that word;
otherwise a local sentence template is used. Supplying natural example
sentences for vocabulary is recommended.
Reaching a vocabulary page through `POST /progress/lessons/{lesson_id}/page`
also records the words through that page as learned, which supplies the quick
review pool. Existing lesson page progress is also considered when building
the quick-review pool. Session responses include `review_mode`,
`accuracy_percent`, `correct_count`, and `total_items` for the results display.

## Design notes and limitations

- Hiding content is preferred to hard deletion once users have progress/history.
- `PUT /lessons/{lesson_id}/words` replaces the lesson's assigned word list.
- Review scheduling is a simple starter rule, not a production spaced-repetition algorithm.
- Existing SQLite databases receive the two additive review columns automatically at startup; no data is deleted.
- `user_topic_progress` is defined but is not yet automatically recalculated from every word/lesson operation.
- Activity counters are starter implementations and may need to be incremented for each product-specific learning action.
- Use a strong `JWT_SECRET_KEY` from environment variables before deployment; the built-in fallback is development-only.
- Configure CORS for the actual frontend origin before deployment.
- For production, use Alembic migrations, automated tests, rate limiting, logging, and robust transaction/error handling.
