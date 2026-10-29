from pwdlib import PasswordHash
from sqlalchemy.orm import Session
from models.user import User

password_hasher = PasswordHash.recommended()

def get_all_users(db: Session):
    return db.query(User).order_by(User.user_id).all()

def create_user(db: Session, username: str, email: str, password: str) -> User:
    if db.query(User).filter(User.username == username).first():
        raise ValueError("Username already exists")
    if db.query(User).filter(User.email == email).first():
        raise ValueError("Email already exists")
    user = User(username=username, email=email, password_hash=password_hasher.hash(password))
    db.add(user)
    try:
        db.commit()
        db.refresh(user)
        return user
    except Exception:
        db.rollback()
        raise

def update_user(db: Session, user: User, data: dict) -> User:
    for key, value in data.items():
        if value is not None:
            if key == "username" and db.query(User).filter(User.username == value, User.user_id != user.user_id).first():
                raise ValueError("Username already exists")
            if key == "email" and db.query(User).filter(User.email == value, User.user_id != user.user_id).first():
                raise ValueError("Email already exists")
            setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user
