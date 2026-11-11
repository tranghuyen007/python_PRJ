
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine, migrate_review_features
from models import user, curriculum, progress, review  # register SQLAlchemy models
from routes.auth import router as auth_router
from routes.user import router as user_router
from routes.levels import router as levels_router
from routes.topics import router as topics_router
from routes.lessons import router as lessons_router
from routes.words import router as words_router
from routes.progress import router as progress_router
from routes.reviews import router as reviews_router
from routes.activity import router as activity_router
from routes.admin import router as admin_router

# Xác định thư mục backend
BASE_DIR = Path(__file__).resolve().parent.parent

# Tạo database tables nếu chưa tồn tại
Base.metadata.create_all(bind=engine)
migrate_review_features()

app = FastAPI(title="Learning Application API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", tags=["Health"])
def root():
    return {"message": "API is running"}

@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}

for router in (
    auth_router, user_router, levels_router, topics_router, lessons_router,
    words_router, progress_router, reviews_router, activity_router, admin_router,
):
    app.include_router(router)

# Tạo thư mục uploads/audio nếu chưa tồn tại
UPLOAD_DIR = BASE_DIR / "uploads"
AUDIO_DIR = UPLOAD_DIR / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# Cho phép truy cập file trong thư mục uploads
app.mount(
    "/uploads",
    StaticFiles(directory=UPLOAD_DIR),
    name="uploads"
)
