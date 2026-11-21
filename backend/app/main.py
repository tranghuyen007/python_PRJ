from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import initialize_database
from routes.user import router as user_router
from routes.auth import router as auth_router
from routes.levels import router as levels_router
from routes.placement_tests import router as placement_tests_router
from routes.pronunciation import router as pronunciation_router
from routes.progress import router as progress_router
from app.database import SessionLocal
from scripts.seed_demo_data import seed_demo_data

initialize_database()

with SessionLocal() as startup_db:
    seed_demo_data(startup_db)

app = FastAPI(
    title="Learning Application API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "API is running"}

app.include_router(user_router)
app.include_router(auth_router)
app.include_router(levels_router)
app.include_router(placement_tests_router)
app.include_router(pronunciation_router)
app.include_router(progress_router)
