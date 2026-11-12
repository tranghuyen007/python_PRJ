
from datetime import datetime, timedelta, timezone

from jose import jwt
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from models.user import User


# Khóa dùng cho môi trường phát triển.
# Trước khi triển khai thực tế, hãy chuyển khóa này
# sang biến môi trường và không đưa khóa thật lên Git.
SECRET_KEY = "dev-only-change-this-secret-key-before-deployment"

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

password_hasher = PasswordHash.recommended()


def authenticate_user(
    db: Session,
    identifier: str,
    password: str,
) -> User:
    user = (
        db.query(User)
        .filter(
            (User.username == identifier)
            | (User.email == identifier)
        )
        .first()
    )

    if user is None:
        raise ValueError("Invalid username/email or password")

    if not password_hasher.verify(password, user.password_hash):
        raise ValueError("Invalid username/email or password")

    if user.status != "ACTIVE":
        raise ValueError("Account is locked or inactive")

    return user


def create_access_token(user: User) -> str:
    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(user.user_id),
        "role": user.role,
        "iat": now,
        "exp": now + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        ),
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
