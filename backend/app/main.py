import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine
from app.models import okr as _okr_models  # noqa: ensure OKR tables are registered
from app.routers import auth, dashboard, tasks, users
from app.routers import okr
from app.routers import ai as ai_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
        print("DB: テーブル作成完了")
        migrations = [
            "ALTER TABLE tasks ALTER COLUMN category TYPE VARCHAR(100)",
            "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_minutes INTEGER",
            "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence VARCHAR(20)",
            "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id INTEGER REFERENCES tasks(id)",
            "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS manual_order INTEGER",
            "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags VARCHAR(500)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(20)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_api_key VARCHAR(500)",
        ]
        with engine.connect() as conn:
            for sql in migrations:
                try:
                    conn.execute(__import__("sqlalchemy").text(sql))
                except Exception as e:
                    print(f"Migration skipped: {e}")
            conn.commit()
            print("DB: マイグレーション完了")
    except Exception as e:
        print(f"DB初期化: {e}")
    yield


app = FastAPI(
    title="タスカン API",
    description="業務タスク管理ツール - 誰でも自然とタスクの優先順位をつけられるツール",
    version="1.0.0",
    lifespan=lifespan,
)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    *[o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()],
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(tasks.router)
app.include_router(dashboard.router)
app.include_router(okr.router)
app.include_router(ai_router.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
