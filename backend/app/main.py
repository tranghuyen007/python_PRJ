from fastapi import FastAPI
from routes.user import router as user_router

app = FastAPI(
    title="Learning Application API",
    version="1.0.0",
)

@app.get("/")
def root():
    return {"message": "API is running"}


app.include_router(user_router)
