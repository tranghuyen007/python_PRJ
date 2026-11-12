from fastapi import FastAPI
from routes.user import router as user_router
from routes.auth import router as auth_router

app = FastAPI(
    title="Learning Application API",
    version="1.0.0",
)

@app.get("/")
def root():
    return {"message": "API is running"}

app.include_router(user_router)
app.include_router(auth_router)