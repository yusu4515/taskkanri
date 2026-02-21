from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.task import Task, TaskCategory, TaskStatus
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.task import (
    ScoreBreakdown,
    TaskCreate,
    TaskListResponse,
    TaskResponse,
    TaskUpdate,
    TodayFocusResponse,
)
from app.services.priority import calculate_priority_score, get_priority_level

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _build_task_response(task: Task, db: Session) -> TaskResponse:
    """Task モデルを TaskResponse に変換し、スコア内訳を添付"""
    has_blocker = False
    if task.depends_on_id:
        blocker = db.query(Task).filter(Task.id == task.depends_on_id).first()
        has_blocker = blocker is not None and blocker.status != TaskStatus.completed

    _, breakdown = calculate_priority_score(
        due_date=task.due_date,
        importance=task.importance,
        estimated_minutes=task.estimated_minutes,
        has_incomplete_blocker=has_blocker,
    )

    return TaskResponse(
        **{c.name: getattr(task, c.name) for c in task.__table__.columns},
        score_breakdown=ScoreBreakdown(**breakdown),
    )


def _recalc_score(task: Task, db: Session) -> float:
    has_blocker = False
    if task.depends_on_id:
        blocker = db.query(Task).filter(Task.id == task.depends_on_id).first()
        has_blocker = blocker is not None and blocker.status != TaskStatus.completed

    score, _ = calculate_priority_score(
        due_date=task.due_date,
        importance=task.importance,
        estimated_minutes=task.estimated_minutes,
        has_incomplete_blocker=has_blocker,
    )
    return score


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.depends_on_id:
        dep = db.query(Task).filter(
            Task.id == payload.depends_on_id,
            Task.user_id == current_user.id,
        ).first()
        if not dep:
            raise HTTPException(status_code=404, detail="依存タスクが見つかりません")

    task = Task(user_id=current_user.id, **payload.model_dump())
    db.add(task)
    db.flush()  # IDを取得するために先にflush

    task.priority_score = _recalc_score(task, db)
    db.commit()
    db.refresh(task)
    return _build_task_response(task, db)


@router.get("", response_model=TaskListResponse)
def list_tasks(
    status_filter: Optional[TaskStatus] = Query(None, alias="status"),
    category: Optional[TaskCategory] = Query(None),
    sort: str = Query("score", regex="^(score|due_date|importance|created_at)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status != TaskStatus.deleted,
    )

    if status_filter:
        q = q.filter(Task.status == status_filter)
    if category:
        q = q.filter(Task.category == category)

    tasks = q.all()

    # スコア再計算（全タスク）
    for t in tasks:
        t.priority_score = _recalc_score(t, db)
    db.commit()

    # ソート
    sort_key = {
        "score": lambda t: -t.priority_score,
        "due_date": lambda t: t.due_date,
        "importance": lambda t: -t.importance,
        "created_at": lambda t: -t.id,
    }[sort]
    tasks.sort(key=sort_key)

    return TaskListResponse(
        tasks=[_build_task_response(t, db) for t in tasks],
        total=len(tasks),
    )


@router.get("/today-focus", response_model=TodayFocusResponse)
def get_today_focus(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """未完了タスクの中からスコア上位3件を Today Focus として返す"""
    tasks = (
        db.query(Task)
        .filter(
            Task.user_id == current_user.id,
            Task.status.in_([TaskStatus.pending, TaskStatus.in_progress]),
        )
        .all()
    )

    for t in tasks:
        t.priority_score = _recalc_score(t, db)
    db.commit()

    tasks.sort(key=lambda t: -t.priority_score)
    top3 = tasks[:3]

    # Today Focus フラグを立てる
    db.query(Task).filter(Task.user_id == current_user.id).update({"today_focus": False})
    for t in top3:
        t.today_focus = True
    db.commit()

    return TodayFocusResponse(
        tasks=[_build_task_response(t, db) for t in top3],
        date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    )


@router.post("/today-focus/approve")
def approve_today_focus(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Today Focus タスクを一括承認する"""
    db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.today_focus == True,
    ).update({"today_focus_approved": True})
    db.commit()
    return {"message": "Today Focus を承認しました"}


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id,
        Task.status != TaskStatus.deleted,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")
    return _build_task_response(task, db)


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id,
        Task.status != TaskStatus.deleted,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")

    update_data = payload.model_dump(exclude_none=True)

    # 完了処理
    if update_data.get("status") == TaskStatus.completed and task.status != TaskStatus.completed:
        update_data["completed_at"] = datetime.now(timezone.utc)

    for field, value in update_data.items():
        setattr(task, field, value)

    task.priority_score = _recalc_score(task, db)
    db.commit()
    db.refresh(task)
    return _build_task_response(task, db)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id,
        Task.status != TaskStatus.deleted,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")

    # 論理削除
    task.status = TaskStatus.deleted
    task.deleted_at = datetime.now(timezone.utc)
    db.commit()
