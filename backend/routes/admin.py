from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.security import require_admin
from models.curriculum import Tag, TopicTag, Topic
from schemas.common import Message
from pydantic import BaseModel, Field

router = APIRouter(prefix="/admin", tags=["Admin"])

class TagCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None

class TopicTagsUpdate(BaseModel):
    tag_ids: list[int]

@router.get("/tags")
def list_tags(db: Session = Depends(get_db), _: object = Depends(require_admin)):
    return db.query(Tag).order_by(Tag.name).all()

@router.post("/tags", status_code=201)
def create_tag(data: TagCreate, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    if db.query(Tag).filter_by(name=data.name).first():
        raise HTTPException(409, "Tag name already exists")
    obj = Tag(**data.model_dump()); db.add(obj); db.commit(); db.refresh(obj)
    return obj

@router.put("/topics/{topic_id}/tags")
def set_topic_tags(topic_id: int, data: TopicTagsUpdate, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    topic = db.query(Topic).filter_by(topic_id=topic_id).first()
    if not topic: raise HTTPException(404, "Topic not found")
    ids = list(dict.fromkeys(data.tag_ids))
    found = db.query(Tag).filter(Tag.tag_id.in_(ids)).all() if ids else []
    if len(found) != len(ids): raise HTTPException(404, "One or more tags not found")
    db.query(TopicTag).filter_by(topic_id=topic_id).delete(synchronize_session=False)
    for tag_id in ids: db.add(TopicTag(topic_id=topic_id, tag_id=tag_id))
    db.commit()
    return {"topic_id": topic_id, "tag_ids": ids}
