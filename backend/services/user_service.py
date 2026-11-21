from pwdlib import PasswordHash
from sqlalchemy.orm import Session
import re
from models.user import User

password_hasher = PasswordHash.recommended()

def get_all_users(db: Session) -> list[User]:
    return db.query(User).order_by(User.user_id).all()

def create_user(
    db: Session,
    username: str | None,
    email: str,
    password: str,
    full_name: str | None = None,
    gender: str | None = None,
) -> User:
    if not username:
        base = re.sub(r"[^A-Za-z0-9_]", "", email.split("@", 1)[0])[:24] or "user"
        if len(base) < 3:
            base = f"{base}user"[:24]
        username = base
        suffix = 1
        while db.query(User.user_id).filter(User.username == username).first():
            tail = str(suffix)
            username = f"{base[:30 - len(tail)]}{tail}"
            suffix += 1

    existing_username = (
        db.query(User)
        .filter(User.username == username)
        .first()
    )

    if existing_username:
        raise ValueError("Username already exists")

    existing_email = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_email:
        raise ValueError("Email already exists")

    hashed_password = password_hasher.hash(password)

    new_user = User(
        username=username,
        email=email,
        password_hash=hashed_password,
        full_name=full_name,
        gender=gender,
    )

    db.add(new_user)

    try:
        db.commit()
        db.refresh(new_user)
    except Exception:
        db.rollback()
        raise

    return new_user
