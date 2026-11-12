from fastapi import FastAPI
from app.database import initialize_database
from routes.user import router as user_router
from routes.auth import router as auth_router
from routes.levels import router as levels_router
from routes.placement_tests import router as placement_tests_router

initialize_database()

app = FastAPI(
    title="Learning Application API",
    version="1.0.0",
)

@app.get("/")
def root():
    return {"message": "API is running"}

app.include_router(user_router)
app.include_router(auth_router)
app.include_router(levels_router)
app.include_router(placement_tests_router)