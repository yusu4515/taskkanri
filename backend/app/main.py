from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine
from app.routers import auth, dashboard, tasks, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 起動時にテーブルを作成
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="TaskKanri API",
    description="業務タスク管理ツール - 誰でも自然とタスクの優先順位をつけられるツール",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
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
