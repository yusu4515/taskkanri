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
    pending = "pending"       # 未着手
    in_progress = "in_progress"  # 進行中
    completed = "completed"   # 完了
    deleted = "deleted"       # 論理削除


class TaskCategory(str, enum.Enum):
    legal = "legal"           # 法務
    accounting = "accounting" # 経理
    general_affairs = "general_affairs"  # 総務
    hr = "hr"                 # 人事
    other = "other"           # その他


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # 基本情報
    title = Column(String(100), nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=False)
    importance = Column(Integer, default=3, nullable=False)  # 1-5
    estimated_minutes = Column(Integer, nullable=True)       # 見込み作業時間（分）
    category = Column(Enum(TaskCategory), nullable=True)
    memo = Column(Text, nullable=True)

    # 依存関係
    depends_on_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)

    # ステータス
    status = Column(Enum(TaskStatus), default=TaskStatus.pending, nullable=False)
    today_focus = Column(Boolean, default=False)             # Today Focus に選定済み
    today_focus_approved = Column(Boolean, default=False)    # ユーザーが承認済み

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
    depends_on = relationship("Task", remote_side=[id], backref="blocking_tasks")
