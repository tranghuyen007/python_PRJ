from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
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

# Convenient for a starter project. For production, use migrations (e.g. Alembic).
Base.metadata.create_all(bind=engine)

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
