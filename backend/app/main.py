import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine
from app.routers import auth, dashboard, tasks, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    # DB接続が取れる場合のみテーブル作成（接続失敗でも起動を止めない）
    try:
        Base.metadata.create_all(bind=engine)
        print("DB: テーブル作成完了")
        # category カラムを Enum → VARCHAR(100) に移行
        with engine.connect() as conn:
            conn.execute(
                __import__("sqlalchemy").text(
                    "ALTER TABLE tasks ALTER COLUMN category TYPE VARCHAR(100)"
                )
            )
            conn.commit()
            print("DB: category カラム型変更完了")
    except Exception as e:
        print(f"DB初期化: {e}")
    yield


app = FastAPI(
    title="TaskKanri API",
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


@app.get("/health")
def health_check():
    return {"status": "ok"}
