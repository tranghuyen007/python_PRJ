from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.security import get_current_user, get_db
from models.placement_test import PlacementTestAttempt, PlacementTestAttemptItem
from models.user import User
from schemas.placement_test import (
    PlacementTestAnswer,
    PlacementTestAnswerResponse,
    PlacementTestAttemptResponse,
    PlacementTestQuestionResponse,
)
from services.placement_test_service import (
    complete_attempt,
    create_attempt,
    submit_answer,
)


router = APIRouter(tags=["Placement tests"])


@router.post(
    "/levels/{level_id}/placement-test/attempts",
    response_model=PlacementTestAttemptResponse,
    status_code=status.HTTP_201_CREATED,
)
def start_placement_test(
    level_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        return create_attempt(db, user.user_id, level_id)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.get(
    "/placement-test/attempts/{attempt_id}",
    response_model=PlacementTestAttemptResponse,
)
def get_placement_test_attempt(
    attempt_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    attempt = (
        db.query(PlacementTestAttempt)
        .filter_by(attempt_id=attempt_id, user_id=user.user_id)
        .first()
    )
    if attempt is None:
        raise HTTPException(status_code=404, detail="Placement test attempt not found")
    return attempt


@router.get(
    "/placement-test/attempts/{attempt_id}/questions",
    response_model=list[PlacementTestQuestionResponse],
)
def get_placement_test_questions(
    attempt_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    attempt = (
        db.query(PlacementTestAttempt)
        .filter_by(attempt_id=attempt_id, user_id=user.user_id)
        .first()
    )
    if attempt is None:
        raise HTTPException(status_code=404, detail="Placement test attempt not found")
    return (
        db.query(PlacementTestAttemptItem)
        .filter_by(attempt_id=attempt_id)
        .order_by(PlacementTestAttemptItem.item_id)
        .all()
    )


@router.post(
    "/placement-test/attempts/{attempt_id}/questions/{item_id}/answer",
    response_model=PlacementTestAnswerResponse,
)
def answer_placement_test_question(
    attempt_id: int,
    item_id: int,
    data: PlacementTestAnswer,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        item = submit_answer(db, user.user_id, attempt_id, item_id, data.answer)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    return {"item_id": item.item_id, "is_correct": bool(item.is_correct)}


@router.post(
    "/placement-test/attempts/{attempt_id}/complete",
    response_model=PlacementTestAttemptResponse,
)
def finish_placement_test(
    attempt_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        return complete_attempt(db, user.user_id, attempt_id)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
