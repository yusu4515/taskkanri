from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator

from app.models.task import TaskCategory, TaskStatus


class TaskCreate(BaseModel):
    title: str
    due_date: datetime
    importance: int = 3
    estimated_minutes: Optional[int] = None
    category: Optional[TaskCategory] = None
    memo: Optional[str] = None
    depends_on_id: Optional[int] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("タイトルを入力してください")
        if len(v) > 100:
            raise ValueError("タイトルは100文字以内で入力してください")
        return v

    @field_validator("importance")
    @classmethod
    def validate_importance(cls, v: int) -> int:
        if not (1 <= v <= 5):
            raise ValueError("重要度は1〜5で入力してください")
        return v

    @field_validator("estimated_minutes")
    @classmethod
    def validate_estimated(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError("所要時間は正の値を入力してください")
        return v


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    due_date: Optional[datetime] = None
    importance: Optional[int] = None
    estimated_minutes: Optional[int] = None
    category: Optional[TaskCategory] = None
    memo: Optional[str] = None
    depends_on_id: Optional[int] = None
    status: Optional[TaskStatus] = None


class ScoreBreakdown(BaseModel):
    urgency: float
    importance: float
    duration: float
    dependency: float
    total: float


class TaskResponse(BaseModel):
    id: int
    title: str
    due_date: datetime
    importance: int
    estimated_minutes: Optional[int]
    category: Optional[TaskCategory]
    memo: Optional[str]
    depends_on_id: Optional[int]
    status: TaskStatus
    today_focus: bool
    today_focus_approved: bool
    priority_score: float
    score_breakdown: Optional[ScoreBreakdown] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TaskListResponse(BaseModel):
    tasks: list[TaskResponse]
    total: int


class TodayFocusResponse(BaseModel):
    tasks: list[TaskResponse]
    date: str
