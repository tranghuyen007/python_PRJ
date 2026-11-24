
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.security import get_db, require_admin
from models.user import User

from schemas.admin_user import (
    AdminUserListItem,
    AdminUserDetail,
    AdminUserUpdate,
    AdminUserStatusUpdate,
)

from services.admin_user_service import (
    get_admin_users,
    get_admin_user_detail,
    update_admin_user,
    update_admin_user_status,
)


# Router admin user
router = APIRouter(
    prefix="/admin/users",
    tags=["Admin - User Management"],
)


@router.get("/")
def list_users(
    q: str | None = Query(default=None),
    status: str | None = Query(default=None),
    role: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    result = get_admin_users(
        db=db,
        q=q,
        status=status,
        role=role,
        page=page,
        page_size=page_size,
    )

    return {
        "items": [
            AdminUserListItem.model_validate(user)
            for user in result["items"]
        ],
        "total": result["total"],
        "page": result["page"],
        "page_size": result["page_size"],
    }


@router.get("/{user_id}", response_model=AdminUserDetail)
def get_user_detail(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    user = get_admin_user_detail(
        db=db,
        user_id=user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    return user


@router.patch("/{user_id}", response_model=AdminUserDetail)
def edit_user(
    user_id: int,
    update_data: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    user = get_admin_user_detail(
        db=db,
        user_id=user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    try:
        updated_user = update_admin_user(
            db=db,
            user=user,
            update_data=update_data.model_dump(
                exclude_unset=True
            ),
        )

        return updated_user

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


@router.patch("/{user_id}/status", response_model=AdminUserDetail)
def change_user_status(
    user_id: int,
    status_data: AdminUserStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    user = get_admin_user_detail(
        db=db,
        user_id=user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    try:
        updated_user = update_admin_user_status(
            db=db,
            user=user,
            new_status=status_data.status,
            current_admin_id=current_admin.user_id,
        )

        return updated_user

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )