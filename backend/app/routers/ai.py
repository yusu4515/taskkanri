import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.models.user import User
from app.routers.deps import get_current_user

router = APIRouter(prefix="/api/ai", tags=["ai"])


# ── リクエスト/レスポンス スキーマ ──────────────────────────────────────────

class SuggestRequest(BaseModel):
    title: str


class SuggestResponse(BaseModel):
    due_date: Optional[str] = None        # "YYYY-MM-DD"
    importance: Optional[int] = None      # 1-5
    estimated_minutes: Optional[int] = None
    category: Optional[str] = None
    memo: Optional[str] = None


class WeeklyReviewRequest(BaseModel):
    week_label: str
    completed_tasks: list[dict]
    overdue_tasks: list[dict]


class WeeklyReviewResponse(BaseModel):
    review_text: str


class DecomposeRequest(BaseModel):
    title: str
    memo: Optional[str] = None


class SubTask(BaseModel):
    title: str
    estimated_minutes: Optional[int] = None
    memo: Optional[str] = None


class DecomposeResponse(BaseModel):
    subtasks: list[SubTask]


# ── AIプロバイダ共通呼び出しヘルパー ──────────────────────────────────────────

def call_ai(provider: str, api_key: str, system_prompt: str, user_prompt: str) -> str:
    """各AIプロバイダにリクエストして応答テキストを返す"""
    try:
        if provider == "openai":
            import openai
            client = openai.OpenAI(api_key=api_key)
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
                max_tokens=1024,
            )
            return resp.choices[0].message.content or ""

        elif provider == "anthropic":
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            resp = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=1024,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
            return resp.content[0].text if resp.content else ""

        elif provider == "gemini":
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                system_instruction=system_prompt,
            )
            resp = model.generate_content(user_prompt)
            return resp.text or ""

        else:
            raise ValueError(f"未対応のプロバイダ: {provider}")

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI APIエラー: {str(e)}",
        )


def require_ai_key(current_user: User) -> tuple[str, str]:
    """APIキー未設定なら403を返す"""
    if not current_user.ai_api_key or not current_user.ai_provider:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI APIキーが設定されていません。アカウント設定から登録してください。",
        )
    return current_user.ai_provider, current_user.ai_api_key


def extract_json(text: str) -> dict:
    """AIの応答からJSONを抽出する（```json ... ``` ブロックにも対応）"""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        inner = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])
        text = inner.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # JSONブロックを探して抽出
        start = text.find("{")
        end = text.rfind("}") + 1
        if start != -1 and end > start:
            return json.loads(text[start:end])
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AIの応答をJSONとして解析できませんでした",
        )


# ── エンドポイント ──────────────────────────────────────────────────────────

@router.post("/suggest", response_model=SuggestResponse)
def suggest_task_details(
    payload: SuggestRequest,
    current_user: User = Depends(get_current_user),
):
    """タイトルからタスク詳細（期日・重要度・見積時間・カテゴリ・メモ）を提案する"""
    provider, api_key = require_ai_key(current_user)

    system_prompt = (
        "あなたは業務タスク管理の専門家です。"
        "与えられたタスクタイトルから、適切なタスク詳細を推定してください。"
        "必ずJSON形式のみで回答してください。"
    )
    from datetime import datetime, timezone, timedelta
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    user_prompt = (
        f"今日の日付: {today}\n"
        f"タスクタイトル: {payload.title}\n\n"
        "以下のJSON形式で回答してください：\n"
        '{"due_date": "YYYY-MM-DD形式（今日から適切な期日）", '
        '"importance": 1〜5の整数（5が最重要）, '
        '"estimated_minutes": 見積もり作業時間（分・整数）, '
        '"category": "カテゴリ名（法務/経理/総務/人事/その他など）", '
        '"memo": "タスクに関する補足メモ（1〜2文）"}'
    )

    raw = call_ai(provider, api_key, system_prompt, user_prompt)
    data = extract_json(raw)

    return SuggestResponse(
        due_date=data.get("due_date"),
        importance=data.get("importance"),
        estimated_minutes=data.get("estimated_minutes"),
        category=data.get("category"),
        memo=data.get("memo"),
    )


@router.post("/weekly-review", response_model=WeeklyReviewResponse)
def generate_weekly_review(
    payload: WeeklyReviewRequest,
    current_user: User = Depends(get_current_user),
):
    """週次レビューの振り返りコメントを生成する"""
    provider, api_key = require_ai_key(current_user)

    completed_list = "\n".join(
        f"- {t.get('title', '')}（カテゴリ: {t.get('category', 'なし')}, 実績: {t.get('actual_minutes', '記録なし')}分）"
        for t in payload.completed_tasks
    ) or "なし"

    overdue_list = "\n".join(
        f"- {t.get('title', '')}（期限: {t.get('due_date', '不明')}）"
        for t in payload.overdue_tasks
    ) or "なし"

    system_prompt = (
        "あなたは業務振り返りのコーチです。"
        "与えられたタスクの実績データをもとに、具体的で建設的な週次レビューコメントを生成してください。"
        "200〜400文字程度の日本語で、箇条書きを交えながら記述してください。"
    )
    user_prompt = (
        f"対象週: {payload.week_label}\n\n"
        f"【完了したタスク】\n{completed_list}\n\n"
        f"【期限超過タスク】\n{overdue_list}\n\n"
        "この週の振り返りコメントを生成してください。"
        "うまくいったこと、改善点、来週への提言を含めてください。"
    )

    review_text = call_ai(provider, api_key, system_prompt, user_prompt)
    return WeeklyReviewResponse(review_text=review_text.strip())


@router.post("/decompose", response_model=DecomposeResponse)
def decompose_task(
    payload: DecomposeRequest,
    current_user: User = Depends(get_current_user),
):
    """タスクを3〜6個のサブタスクに分解する"""
    provider, api_key = require_ai_key(current_user)

    system_prompt = (
        "あなたは業務タスク管理の専門家です。"
        "与えられたタスクを実行可能なサブタスクに分解してください。"
        "必ずJSON形式のみで回答してください。"
    )
    memo_text = f"\n補足情報: {payload.memo}" if payload.memo else ""
    user_prompt = (
        f"タスク: {payload.title}{memo_text}\n\n"
        "このタスクを3〜6個の具体的なサブタスクに分解してください。\n"
        "以下のJSON形式で回答してください：\n"
        '{"subtasks": ['
        '{"title": "サブタスク名", "estimated_minutes": 見積時間（分・整数）, "memo": "補足（省略可）"}'
        ", ...]}"
    )

    raw = call_ai(provider, api_key, system_prompt, user_prompt)
    data = extract_json(raw)

    subtasks = [
        SubTask(
            title=s.get("title", ""),
            estimated_minutes=s.get("estimated_minutes"),
            memo=s.get("memo"),
        )
        for s in data.get("subtasks", [])
        if s.get("title")
    ]

    if not subtasks:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="サブタスクを生成できませんでした",
        )

    return DecomposeResponse(subtasks=subtasks)
