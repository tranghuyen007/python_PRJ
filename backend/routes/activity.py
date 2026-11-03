from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.security import get_current_user
from models.user import User
from models.progress import UserDailyActivity

router = APIRouter(prefix="/activity", tags=["Activity"])

@router.get("/daily")
def daily_activity(limit: int = 30, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    limit = max(1, min(limit, 365))
    return (db.query(UserDailyActivity).filter_by(user_id=user.user_id)
            .order_by(UserDailyActivity.activity_date.desc()).limit(limit).all())

@router.get("/summary")
def activity_summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.query(
        func.coalesce(func.sum(UserDailyActivity.learned_count), 0),
        func.coalesce(func.sum(UserDailyActivity.review_count), 0),
        func.coalesce(func.sum(UserDailyActivity.quiz_count), 0),
    ).filter_by(user_id=user.user_id).one()
    return {"learned_count": row[0], "review_count": row[1], "quiz_count": row[2]}
