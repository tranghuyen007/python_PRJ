import os
from datetime import datetime, timedelta, timezone
from jose import jwt
from pwdlib import PasswordHash
from sqlalchemy import or_
from sqlalchemy.orm import Session
from models.user import User

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-only-change-this-secret-key-before-deployment")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
password_hasher = PasswordHash.recommended()

def authenticate_user(db: Session, identifier: str, password: str) -> User:
    user = db.query(User).filter(or_(User.username == identifier, User.email == identifier)).first()
    if user is None or not password_hasher.verify(password, user.password_hash):
        raise ValueError("Invalid username/email or password")
    if user.status != "ACTIVE":
        raise PermissionError("Account is locked or inactive")
    return user

def create_access_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.user_id),
        "role": user.role,
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def change_password(db: Session, user: User, current_password: str, new_password: str):
    if not password_hasher.verify(current_password, user.password_hash):
        raise ValueError("Current password is incorrect")
    user.password_hash = password_hasher.hash(new_password)
    db.commit()
