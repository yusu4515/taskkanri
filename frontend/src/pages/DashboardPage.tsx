import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { tasksApi } from "../api/tasks";
import { dashboardApi } from "../api/dashboard";
import { useAuth } from "../hooks/useAuth";


const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: todayFocus, isLoading: focusLoading } = useQuery({
    queryKey: ["todayFocus"],
    queryFn: tasksApi.getTodayFocus,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.summary,
  });

  const approveMutation = useMutation({
    mutationFn: tasksApi.approveTodayFocus,
    onSuccess: () => {
      toast.success("Today Focus を承認しました！");
      queryClient.invalidateQueries({ queryKey: ["todayFocus"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => toast.error("操作に失敗しました"),
  });

  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-6">
        <p className="text-sm text-gray-500">{today}</p>
        <h2 className="text-2xl font-bold text-gray-800 mt-1">
          おはようございます、{user?.username} さん
        </h2>
      </div>

      {/* Today Focus */}
      <section className="mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                ⭐ Today Focus
              </h3>
              <p className="text-blue-200 text-sm mt-0.5">
                今日はこの{todayFocus?.tasks.length ?? 3}タスクを優先してください
              </p>
            </div>
            {todayFocus?.tasks.some((t) => !t.today_focus_approved) && (
              <button
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                className="bg-white text-blue-600 font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors text-sm"
              >
                承認する ✓
              </button>
            )}
          </div>

          {focusLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-blue-500/30 rounded-lg h-16 animate-pulse" />
              ))}
            </div>
          ) : todayFocus?.tasks.length === 0 ? (
            <div className="text-center py-6 text-blue-200">
              <p>未完了のタスクがありません 🎉</p>
              <Link
                to="/tasks/new"
                className="mt-2 inline-block text-white underline text-sm"
              >
                タスクを追加する
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {todayFocus?.tasks.map((task, i) => (
                <div
                  key={task.id}
                  className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 flex items-center gap-3"
                >
                  <span className="text-2xl font-bold text-blue-200 w-6 text-center">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{task.title}</p>
                    <p className="text-xs text-blue-200 mt-0.5">
                      スコア {task.priority_score.toFixed(0)}点
                    </p>
                  </div>
                  {task.today_focus_approved && (
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">承認済み</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* サマリーカード */}
      {summaryLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card h-24 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="card text-center">
            <p className="text-3xl font-bold text-blue-600">{summary.total}</p>
            <p className="text-sm text-gray-500 mt-1">総タスク数</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-green-600">{summary.achievement_rate}%</p>
            <p className="text-sm text-gray-500 mt-1">完了率</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-orange-500">{summary.today_due}</p>
            <p className="text-sm text-gray-500 mt-1">今日期限</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-red-500">{summary.overdue}</p>
            <p className="text-sm text-gray-500 mt-1">期限超過</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-purple-600">
              {summary.weekly_actual_minutes >= 60
                ? `${Math.floor(summary.weekly_actual_minutes / 60)}h${
                    summary.weekly_actual_minutes % 60
                      ? `${summary.weekly_actual_minutes % 60}m`
                      : ""
                  }`
                : `${summary.weekly_actual_minutes}m`}
            </p>
            <p className="text-sm text-gray-500 mt-1">今週の実績</p>
          </div>
        </div>
      )}

      {/* グラフ */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* 週次完了グラフ */}
          <div className="card">
            <h4 className="font-semibold text-gray-700 mb-4">今週の完了タスク数</h4>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={summary.weekly_completed}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* カテゴリ別円グラフ */}
          <div className="card">
            <h4 className="font-semibold text-gray-700 mb-4">カテゴリ別タスク分布</h4>
            {summary.category_distribution.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-gray-400 text-sm">
                データがありません
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={summary.category_distribution.map((d) => ({
                      ...d,
                      name: d.category,
                    }))}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {summary.category_distribution.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* クイックアクション */}
      <div className="flex gap-3">
        <Link to="/tasks/new" className="btn-primary">
          + タスクを追加
        </Link>
        <Link to="/tasks" className="btn-secondary">
          タスク一覧を見る
        </Link>
      </div>
    </div>
  );
}
