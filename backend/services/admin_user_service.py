
from sqlalchemy.orm import Session
from sqlalchemy import or_

from models.user import User


def get_admin_users(
    db: Session,
    q: str | None = None,
    status: str | None = None,
    role: str | None = None,
    page: int = 1,
    page_size: int = 20,
):
    query = db.query(User)

    if q and q.strip():
        keyword = f"%{q.strip()}%"

        query = query.filter(
            or_(
                User.username.ilike(keyword),
                User.email.ilike(keyword),
                User.full_name.ilike(keyword),
            )
        )

    if status:
        query = query.filter(User.status == status)

    if role:
        query = query.filter(User.role == role)

    total = query.count()

    users = (
        query
        .order_by(User.user_id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "items": users,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def get_admin_user_detail(
    db: Session,
    user_id: int,
) -> User | None:

    return (
        db.query(User)
        .filter(User.user_id == user_id)
        .first()
    )


def update_admin_user(
    db: Session,
    user: User,
    update_data: dict,
) -> User:

    if "username" in update_data:
        username = update_data["username"]

        if username is None or not username.strip():
            raise ValueError("Username cannot be empty")

        existing_username = (
            db.query(User)
            .filter(
                User.username == username,
                User.user_id != user.user_id,
            )
            .first()
        )

        if existing_username:
            raise ValueError("Username already exists")

    if "email" in update_data:
        email = update_data["email"]

        if email is None or not email.strip():
            raise ValueError("Email cannot be empty")

        existing_email = (
            db.query(User)
            .filter(
                User.email == email,
                User.user_id != user.user_id,
            )
            .first()
        )

        if existing_email:
            raise ValueError("Email already exists")

    allowed_fields = {
        "username",
        "email",
        "full_name",
    }

    for field, value in update_data.items():
        if field in allowed_fields:
            if isinstance(value, str):
                value = value.strip()

            setattr(user, field, value)

    try:
        db.commit()
        db.refresh(user)

    except Exception:
        db.rollback()
        raise

    return user


def update_admin_user_status(
    db: Session,
    user: User,
    new_status: str,
    current_admin_id: int,
) -> User:

    if new_status not in {"ACTIVE", "LOCKED"}:
        raise ValueError("Invalid user status")

    if user.user_id == current_admin_id and new_status == "LOCKED":
        raise ValueError("Admin cannot lock their own account")

    user.status = new_status

    try:
        db.commit()
        db.refresh(user)

    except Exception:
        db.rollback()
        raise

    return user