from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.security import get_current_user, require_admin
from models.curriculum import Level
from schemas.curriculum import LevelCreate, LevelUpdate, LevelResponse
from schemas.common import VisibilityUpdate

router = APIRouter(prefix="/levels", tags=["Levels"])

@router.get("/", response_model=list[LevelResponse])
def list_levels(include_inactive: bool = False, db: Session = Depends(get_db), _: object = Depends(get_current_user)):
    q = db.query(Level)
    if not include_inactive:
        q = q.filter(Level.is_active == 1)
    return q.order_by(Level.display_order, Level.level_id).all()

@router.get("/{level_id}", response_model=LevelResponse)
def get_level(level_id: int, db: Session = Depends(get_db), _: object = Depends(get_current_user)):
    obj = db.query(Level).filter_by(level_id=level_id).first()
    if not obj: raise HTTPException(404, "Level not found")
    return obj

@router.post("/", response_model=LevelResponse, status_code=201)
def create_level(data: LevelCreate, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    if db.query(Level).filter_by(name=data.name).first():
        raise HTTPException(409, "Level name already exists")
    obj = Level(**data.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.patch("/{level_id}", response_model=LevelResponse)
def update_level(level_id: int, data: LevelUpdate, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    obj = db.query(Level).filter_by(level_id=level_id).first()
    if not obj: raise HTTPException(404, "Level not found")
    for k,v in data.model_dump(exclude_unset=True).items():
        if v is not None: setattr(obj,k,v)
    db.commit(); db.refresh(obj)
    return obj

@router.patch("/{level_id}/visibility", response_model=LevelResponse)
def set_level_visibility(level_id: int, data: VisibilityUpdate, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    obj = db.query(Level).filter_by(level_id=level_id).first()
    if not obj: raise HTTPException(404, "Level not found")
    obj.is_active = int(data.is_active); db.commit(); db.refresh(obj)
    return obj

@router.delete("/{level_id}", status_code=204)
def delete_level(level_id: int, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    obj = db.query(Level).filter_by(level_id=level_id).first()
    if not obj: raise HTTPException(404, "Level not found")
    # Deletion may cascade to topics/lessons; hide instead if learning history must be retained.
    db.delete(obj); db.commit()
