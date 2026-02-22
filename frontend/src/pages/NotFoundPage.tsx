import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="text-center">
        <p className="text-8xl font-bold text-blue-600 mb-4">404</p>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          ページが見つかりません
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          お探しのページは存在しないか、移動した可能性があります。
        </p>
        <Link to="/dashboard" className="btn-primary">
          ダッシュボードへ戻る
        </Link>
      </div>
    </div>
  );
}
