import calendar
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.task import (
    ReorderRequest,
    ScoreBreakdown,
    TaskCreate,
    TaskListResponse,
    TaskResponse,
    TaskUpdate,
    TodayFocusResponse,
)
from app.services.priority import calculate_priority_score, get_priority_level

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _next_due(due_date: datetime, recurrence: str) -> datetime:
    """繰り返し種別に応じて次の期日を計算する"""
    if recurrence == "daily":
        return due_date + timedelta(days=1)
    if recurrence == "weekly":
        return due_date + timedelta(weeks=1)
    if recurrence == "monthly":
        year = due_date.year + (due_date.month // 12)
        month = due_date.month % 12 + 1
        day = min(due_date.day, calendar.monthrange(year, month)[1])
        return due_date.replace(year=year, month=month, day=day)
    return due_date


def _build_task_response(task: Task, db: Session) -> TaskResponse:
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

    if payload.parent_task_id:
        parent = db.query(Task).filter(
            Task.id == payload.parent_task_id,
            Task.user_id == current_user.id,
            Task.status != TaskStatus.deleted,
        ).first()
        if not parent:
            raise HTTPException(status_code=404, detail="親タスクが見つかりません")

    task = Task(user_id=current_user.id, **payload.model_dump())
    db.add(task)
    db.flush()

    task.priority_score = _recalc_score(task, db)
    db.commit()
    db.refresh(task)
    return _build_task_response(task, db)


@router.get("", response_model=TaskListResponse)
def list_tasks(
    status_filter: Optional[TaskStatus] = Query(None, alias="status"),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    sort: str = Query("score", regex="^(score|due_date|importance|created_at|manual)$"),
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
    if search:
        keyword = f"%{search.strip()}%"
        q = q.filter(Task.title.ilike(keyword) | Task.memo.ilike(keyword))
    if tag:
        q = q.filter(Task.tags.ilike(f"%{tag.strip()}%"))

    tasks = q.all()

    # スコア再計算（manual 以外）
    if sort != "manual":
        for t in tasks:
            t.priority_score = _recalc_score(t, db)
        db.commit()

    sort_key = {
        "score": lambda t: -t.priority_score,
        "due_date": lambda t: t.due_date,
        "importance": lambda t: -t.importance,
        "created_at": lambda t: -t.id,
        "manual": lambda t: (t.manual_order if t.manual_order is not None else 9999),
    }[sort]
    tasks.sort(key=sort_key)

    return TaskListResponse(
        tasks=[_build_task_response(t, db) for t in tasks],
        total=len(tasks),
    )


@router.post("/reorder", status_code=status.HTTP_200_OK)
def reorder_tasks(
    payload: ReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """手動並び順を保存する"""
    for order, task_id in enumerate(payload.task_ids):
        db.query(Task).filter(
            Task.id == task_id,
            Task.user_id == current_user.id,
        ).update({"manual_order": order})
    db.commit()
    return {"message": "順序を保存しました"}


@router.get("/today-focus", response_model=TodayFocusResponse)
def get_today_focus(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
    completing = (
        update_data.get("status") == TaskStatus.completed
        and task.status != TaskStatus.completed
    )
    if completing:
        update_data["completed_at"] = datetime.now(timezone.utc)

    for field, value in update_data.items():
        setattr(task, field, value)

    task.priority_score = _recalc_score(task, db)
    db.commit()
    db.refresh(task)

    # 繰り返しタスク：完了時に次のタスクを自動生成
    if completing and task.recurrence:
        next_due = _next_due(task.due_date, task.recurrence)
        new_task = Task(
            user_id=current_user.id,
            title=task.title,
            due_date=next_due,
            importance=task.importance,
            estimated_minutes=task.estimated_minutes,
            category=task.category,
            memo=task.memo,
            recurrence=task.recurrence,
            parent_task_id=task.parent_task_id,
        )
        db.add(new_task)
        db.flush()
        new_task.priority_score = _recalc_score(new_task, db)
        db.commit()

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

    task.status = TaskStatus.deleted
    task.deleted_at = datetime.now(timezone.utc)
    db.commit()
