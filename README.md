# TaskKanri - 業務タスク管理ツール

> 登録するだけで、今日やるべきことが自然とわかる

## 起動方法

### 前提条件
- Docker Desktop がインストールされていること
- Node.js 20+ （フロントエンドのローカル開発時のみ）

### 1. Docker で全サービスを起動（推奨）

```bash
cd taskkanri
docker-compose up --build
```

- フロントエンド: http://localhost:5173
- バックエンド API: http://localhost:8000
- API ドキュメント: http://localhost:8000/docs

### 2. ローカル開発（バックエンド + フロントエンド 個別起動）

**DB のみ Docker で起動：**
```bash
docker-compose up db -d
```

**バックエンド：**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**フロントエンド：**
```bash
cd frontend
npm install
npm run dev
```

## プロジェクト構成

```
taskkanri/
├── backend/              # Python + FastAPI
│   ├── app/
│   │   ├── core/         # 設定・DB・セキュリティ
│   │   ├── models/       # SQLAlchemy モデル
│   │   ├── routers/      # API エンドポイント
│   │   ├── schemas/      # Pydantic スキーマ
│   │   ├── services/     # ビジネスロジック（優先度計算）
│   │   └── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/             # React + TypeScript + Vite
│   ├── src/
│   │   ├── api/          # API クライアント
│   │   ├── components/   # UI コンポーネント
│   │   ├── hooks/        # カスタムフック
│   │   ├── pages/        # ページコンポーネント
│   │   └── types/        # TypeScript 型定義
│   └── Dockerfile
└── docker-compose.yml
```

## 優先度スコア算出ロジック

| 要素 | 重み | 算出方法 |
|------|------|---------|
| 緊急度 | 40% | 期日が近いほど高スコア（段階的に増加） |
| 重要度 | 35% | ユーザーが 1〜5 で入力 |
| 所要時間 | 15% | 短いタスクを優遇 |
| 依存関係 | 10% | ブロッカーがある場合は大幅減点 |

**信号機カラー判定：**
- 🔴 至急 (65点以上)
- 🟡 注意 (40〜64点)
- 🟢 余裕 (39点以下)

## API エンドポイント

| Method | Path | 説明 |
|--------|------|------|
| POST | /api/auth/register | ユーザー登録 |
| POST | /api/auth/login | ログイン |
| GET | /api/tasks | タスク一覧（フィルタ・ソート対応） |
| POST | /api/tasks | タスク作成 |
| GET | /api/tasks/today-focus | Today Focus（上位3件）取得 |
| POST | /api/tasks/today-focus/approve | Today Focus 承認 |
| PATCH | /api/tasks/{id} | タスク更新・完了 |
| DELETE | /api/tasks/{id} | タスク削除（論理削除） |
| GET | /api/dashboard/summary | ダッシュボード集計 |
