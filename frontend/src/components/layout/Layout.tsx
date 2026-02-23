import { useState } from "react";
import { Outlet, NavLink, Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTaskNotifications } from "../../hooks/useTaskNotifications";
import { useDarkMode } from "../../hooks/useDarkMode";
import PomodoroTimer from "../tasks/PomodoroTimer";
import OnboardingModal from "../OnboardingModal";

const NAV_ITEMS = [
  { to: "/dashboard", icon: "🏠", label: "ダッシュボード" },
  { to: "/tasks", icon: "📋", label: "タスク一覧" },
  { to: "/calendar", icon: "📅", label: "カレンダー" },
  { to: "/gantt", icon: "📊", label: "ガントチャート" },
  { to: "/okr", icon: "🎯", label: "OKR" },
  { to: "/weekly-review", icon: "📈", label: "週次レビュー" },
];

function Sidebar({ onNavClick }: { onNavClick?: () => void }) {
  const { user, logout } = useAuth();
  const { isDark, toggleDark } = useDarkMode();

  return (
    <aside className="w-56 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
        <h1 className="text-xl font-bold text-blue-600">タスカン</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">業務タスク管理</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`
            }
          >
            <span className="text-base">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-700 space-y-0.5">
        <div className="px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500 font-medium truncate">
          👤 {user?.username}
        </div>
        <Link
          to="/account"
          onClick={onNavClick}
          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          ⚙️ アカウント設定
        </Link>
        <button
          onClick={toggleDark}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          {isDark ? "☀️ ライトモード" : "🌙 ダークモード"}
        </button>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          🚪 ログアウト
        </button>
      </div>
    </aside>
  );
}

export default function Layout() {
  useTaskNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem("tasukan_onboarding_done");
  });

  const closeOnboarding = () => {
    localStorage.setItem("tasukan_onboarding_done", "1");
    setShowOnboarding(false);
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col w-56 fixed h-screen top-0 left-0 z-30">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-50 flex flex-col w-56 shadow-xl">
            <Sidebar onNavClick={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-56 min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="メニューを開く"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-base font-bold text-blue-600">タスカン</span>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      <PomodoroTimer />
      {showOnboarding && <OnboardingModal onClose={closeOnboarding} />}
    </div>
  );
}
