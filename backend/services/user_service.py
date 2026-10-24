from pwdlib import PasswordHash
from sqlalchemy.orm import Session
from models.user import User

password_hasher = PasswordHash.recommended()

def get_all_users(db: Session) -> list[User]:
    return db.query(User).order_by(User.user_id).all()

def create_user(
    db: Session,
    username: str,
    email: str,
    password: str,
) -> User:
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
    )

    db.add(new_user)

    try:
        db.commit()
        db.refresh(new_user)
    except Exception:
        db.rollback()
        raise

    return new_user
