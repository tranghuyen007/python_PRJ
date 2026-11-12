from sqlalchemy import Column, Integer, String, DateTime, CheckConstraint, func
from app.database import Base

class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('USER','ADMIN')", name="ck_users_role"),
        CheckConstraint("status IN ('ACTIVE','LOCKED')", name="ck_users_status"),
    )
    user_id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(30), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="USER", server_default="USER")
    status = Column(String, nullable=False, default="ACTIVE", server_default="ACTIVE")
    created_at = Column(DateTime, nullable=False, server_default=func.current_timestamp())
    updated_at = Column(DateTime, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
