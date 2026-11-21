from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.security import get_current_user, get_db
from models.user import User
from schemas.progress import (
    LearnedWordResponse,
    QuickReviewAnswer,
    QuickReviewAnswerResponse,
    QuickReviewSessionResponse,
    TopicProgressResponse,
)
from services.progress_service import (
    create_quick_review,
    get_topic_progress,
    mark_word_learned,
    submit_quick_review_answer,
)


router = APIRouter(tags=["Learning progress"])


@router.get(
    "/topics/{topic_id}/progress",
    response_model=TopicProgressResponse,
)
def read_topic_progress(
    topic_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return get_topic_progress(db, user, topic_id)


@router.post(
    "/topics/{topic_id}/words/{word_id}/learn",
    response_model=LearnedWordResponse,
)
def learn_topic_word(
    topic_id: int,
    word_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return mark_word_learned(db, user, topic_id, word_id)


@router.post(
    "/topics/{topic_id}/quick-review",
    response_model=QuickReviewSessionResponse,
)
def start_quick_review(
    topic_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return create_quick_review(db, user, topic_id)


@router.post(
    "/review-sessions/{review_session_id}/items/{item_id}/answer",
    response_model=QuickReviewAnswerResponse,
)
def answer_quick_review_item(
    review_session_id: int,
    item_id: int,
    data: QuickReviewAnswer,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return submit_quick_review_answer(
        db,
        user,
        review_session_id,
        item_id,
        data.answer,
    )
