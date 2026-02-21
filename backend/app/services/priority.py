"""
優先度スコア算出サービス

優先度スコア = 緊急度スコア(40%) × 重要度スコア(35%) × 所要時間スコア(15%) × 依存関係スコア(10%)

各スコアは 0〜100 に正規化し、重み付き合計で最終スコアを算出する。
"""

import math
from datetime import datetime, timezone
from typing import Optional


def calc_urgency_score(due_date: datetime) -> float:
    """
    緊急度スコア（0〜100）
    - 期日まで14日以上 → 10〜30（余裕あり）
    - 期日まで7日以内 → 30〜70（注意）
    - 期日まで3日以内 → 70〜95（至急）
    - 期日当日または超過 → 100
    """
    now = datetime.now(timezone.utc)
    # タイムゾーン統一
    if due_date.tzinfo is None:
        due_date = due_date.replace(tzinfo=timezone.utc)

    days_left = (due_date - now).total_seconds() / 86400

    if days_left <= 0:
        return 100.0
    elif days_left <= 3:
        # 3日以内：70〜100（指数的に増加）
        score = 100 - 30 * (days_left / 3)
        return round(score, 2)
    elif days_left <= 7:
        # 7日以内：45〜70
        score = 70 - 25 * ((days_left - 3) / 4)
        return round(score, 2)
    elif days_left <= 14:
        # 14日以内：25〜45
        score = 45 - 20 * ((days_left - 7) / 7)
        return round(score, 2)
    else:
        # 14日超：指数的に減衰（最低10）
        score = max(10.0, 25 * math.exp(-0.05 * (days_left - 14)))
        return round(score, 2)


def calc_importance_score(importance: int) -> float:
    """重要度スコア（0〜100）: 1→20, 2→40, 3→60, 4→80, 5→100"""
    return float(importance * 20)


def calc_duration_score(estimated_minutes: Optional[int]) -> float:
    """
    所要時間スコア（0〜100）: 短いほど高スコア（詰まり防止）
    - 未設定 → 50（中程度として扱う）
    - 15〜30分 → 90〜100
    - 1〜2時間 → 60〜80
    - 4時間以上 → 20〜40
    """
    if estimated_minutes is None:
        return 50.0

    if estimated_minutes <= 15:
        return 100.0
    elif estimated_minutes <= 30:
        return 90.0
    elif estimated_minutes <= 60:
        return 80.0
    elif estimated_minutes <= 120:
        return 65.0
    elif estimated_minutes <= 240:
        return 45.0
    elif estimated_minutes <= 480:
        return 30.0
    else:
        return 20.0


def calc_dependency_score(has_incomplete_blocker: bool) -> float:
    """
    依存関係スコア（0〜100）
    - ブロッカーなし → 100（ペナルティなし）
    - ブロッカーあり（未完了）→ 10（実質的に下位に落とす）
    """
    return 10.0 if has_incomplete_blocker else 100.0


def calculate_priority_score(
    due_date: datetime,
    importance: int,
    estimated_minutes: Optional[int],
    has_incomplete_blocker: bool,
) -> tuple[float, dict]:
    """
    優先度スコアを算出し、(総合スコア, 内訳dict) を返す。
    重み：緊急度40% / 重要度35% / 所要時間15% / 依存関係10%
    """
    urgency = calc_urgency_score(due_date)
    importance_s = calc_importance_score(importance)
    duration = calc_duration_score(estimated_minutes)
    dependency = calc_dependency_score(has_incomplete_blocker)

    total = (
        urgency * 0.40
        + importance_s * 0.35
        + duration * 0.15
        + dependency * 0.10
    )

    breakdown = {
        "urgency": round(urgency, 2),
        "importance": round(importance_s, 2),
        "duration": round(duration, 2),
        "dependency": round(dependency, 2),
        "total": round(total, 2),
    }

    return round(total, 2), breakdown


def get_priority_level(score: float) -> str:
    """信号機カラー判定: red / yellow / green"""
    if score >= 65:
        return "red"
    elif score >= 40:
        return "yellow"
    else:
        return "green"
