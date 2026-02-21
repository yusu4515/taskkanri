import { Outlet, NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTaskNotifications } from "../../hooks/useTaskNotifications";

export default function Layout() {
  const { user, logout } = useAuth();
  useTaskNotifications();

  return (
    <div className="min-h-screen flex">
      {/* サイドバー */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100">
          <h1 className="text-xl font-bold text-blue-600">TaskKanri</h1>
          <p className="text-xs text-gray-500 mt-0.5">業務タスク管理</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`
            }
          >
            <span className="text-lg">🏠</span>
            ダッシュボード
          </NavLink>
          <NavLink
            to="/tasks"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`
            }
          >
            <span className="text-lg">📋</span>
            タスク一覧
          </NavLink>
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <div className="px-3 py-2 text-xs text-gray-500">
            {user?.username}
          </div>
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            ログアウト
          </button>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
