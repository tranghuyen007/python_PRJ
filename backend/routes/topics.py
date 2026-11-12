from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.security import get_current_user, require_admin
from models.curriculum import Topic, Level, Tag, TopicTag
from schemas.curriculum import TopicCreate, TopicUpdate, TopicResponse
from schemas.common import VisibilityUpdate

router = APIRouter(prefix="/topics", tags=["Topics"])

@router.get("/", response_model=list[TopicResponse])
def list_topics(level_id: int | None = None, include_inactive: bool = False, db: Session = Depends(get_db), _: object = Depends(get_current_user)):
    q = db.query(Topic)
    if level_id is not None: q = q.filter(Topic.level_id == level_id)
    if not include_inactive: q = q.filter(Topic.is_active == 1)
    return q.order_by(Topic.display_order, Topic.topic_id).all()

@router.get("/{topic_id}", response_model=TopicResponse)
def get_topic(topic_id: int, db: Session = Depends(get_db), _: object = Depends(get_current_user)):
    obj = db.query(Topic).filter_by(topic_id=topic_id).first()
    if not obj: raise HTTPException(404, "Topic not found")
    return obj

@router.post("/", response_model=TopicResponse, status_code=201)
def create_topic(data: TopicCreate, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    if not db.query(Level).filter_by(level_id=data.level_id, is_active=1).first():
        raise HTTPException(404, "Active level not found")
    if db.query(Topic).filter_by(level_id=data.level_id, name=data.name).first():
        raise HTTPException(409, "Topic name already exists in this level")
    obj = Topic(**data.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.patch("/{topic_id}", response_model=TopicResponse)
def update_topic(topic_id: int, data: TopicUpdate, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    obj = db.query(Topic).filter_by(topic_id=topic_id).first()
    if not obj: raise HTTPException(404, "Topic not found")
    changes = data.model_dump(exclude_unset=True)
    if changes.get("level_id") is not None and not db.query(Level).filter_by(level_id=changes["level_id"]).first():
        raise HTTPException(404, "Level not found")
    if changes.get("level_id") is not None: obj.level_id = changes["level_id"]
    for k,v in changes.items():
        if k != "level_id" and v is not None: setattr(obj,k,v)
    db.commit(); db.refresh(obj)
    return obj

@router.patch("/{topic_id}/visibility", response_model=TopicResponse)
def set_topic_visibility(topic_id: int, data: VisibilityUpdate, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    obj = db.query(Topic).filter_by(topic_id=topic_id).first()
    if not obj: raise HTTPException(404, "Topic not found")
    obj.is_active = int(data.is_active); db.commit(); db.refresh(obj)
    return obj

@router.delete("/{topic_id}", status_code=204)
def delete_topic(topic_id: int, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    obj = db.query(Topic).filter_by(topic_id=topic_id).first()
    if not obj: raise HTTPException(404, "Topic not found")
    # Hard delete can remove dependent curriculum/progress. Prefer visibility=false in normal use.
    db.delete(obj)
    try: db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(409, "Cannot delete topic because dependent data exists; hide it instead")
