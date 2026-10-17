from sqlalchemy.orm import Session

from models.user import User


def get_all_users(db: Session) -> list[User]:
    return db.query(User).order_by(User.user_id).all()
