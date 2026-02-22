import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class TaskStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    deleted = "deleted"


class TaskCategory(str, enum.Enum):
    legal = "legal"
    accounting = "accounting"
    general_affairs = "general_affairs"
    hr = "hr"
    other = "other"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # 基本情報
    title = Column(String(100), nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=False)
    importance = Column(Integer, default=3, nullable=False)
    estimated_minutes = Column(Integer, nullable=True)
    actual_minutes = Column(Integer, nullable=True)       # 実績作業時間（分）
    category = Column(String(100), nullable=True)
    memo = Column(Text, nullable=True)

    # 繰り返し
    recurrence = Column(String(20), nullable=True)        # daily / weekly / monthly

    # 依存関係・階層
    depends_on_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    parent_task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)

    # ステータス
    status = Column(Enum(TaskStatus), default=TaskStatus.pending, nullable=False)
    today_focus = Column(Boolean, default=False)
    today_focus_approved = Column(Boolean, default=False)

    # 手動並び順
    manual_order = Column(Integer, nullable=True)

    # 優先度スコア（キャッシュ）
    priority_score = Column(Float, default=0.0)

    # タイムスタンプ
    completed_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # リレーション
    user = relationship("User", backref="tasks")
    depends_on = relationship(
        "Task", remote_side=[id], foreign_keys=[depends_on_id], backref="blocking_tasks"
    )
    parent = relationship(
        "Task", remote_side=[id], foreign_keys=[parent_task_id], backref="subtasks"
    )
# NOTE: tags column added via migration in main.py
