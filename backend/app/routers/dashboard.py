from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.routers.deps import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    base_q = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status != TaskStatus.deleted,
    )

    total = base_q.count()
    completed = base_q.filter(Task.status == TaskStatus.completed).count()
    overdue = base_q.filter(
        Task.due_date < datetime.now(timezone.utc),
        Task.status != TaskStatus.completed,
    ).count()

    # 今日完了
    today_completed = base_q.filter(
        Task.status == TaskStatus.completed,
        Task.completed_at >= today_start,
        Task.completed_at < today_end,
    ).count()

    # 今日期限
    today_due = base_q.filter(
        Task.due_date >= today_start,
        Task.due_date < today_end,
        Task.status != TaskStatus.completed,
    ).count()

    achievement_rate = round(completed / total * 100, 1) if total > 0 else 0.0

    # カテゴリ別分布
    category_stats = (
        db.query(Task.category, func.count(Task.id))
        .filter(
            Task.user_id == current_user.id,
            Task.status != TaskStatus.deleted,
            Task.status != TaskStatus.completed,
        )
        .group_by(Task.category)
        .all()
    )

    # 直近7日の完了数（週次グラフ用）
    weekly = []
    for i in range(6, -1, -1):
        day_start = today_start - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        count = (
            db.query(Task)
            .filter(
                Task.user_id == current_user.id,
                Task.status == TaskStatus.completed,
                Task.completed_at >= day_start,
                Task.completed_at < day_end,
            )
            .count()
        )
        weekly.append({"date": day_start.strftime("%m/%d"), "count": count})

    return {
        "total": total,
        "completed": completed,
        "overdue": overdue,
        "today_due": today_due,
        "today_completed": today_completed,
        "achievement_rate": achievement_rate,
        "category_distribution": [
            {"category": str(cat) if cat else "other", "count": cnt}
            for cat, cnt in category_stats
        ],
        "weekly_completed": weekly,
    }
