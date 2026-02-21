import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { tasksApi } from "../api/tasks";
import TaskCard from "../components/tasks/TaskCard";
import type { TaskStatus } from "../types";
import { useCategories } from "../hooks/useCategories";

type SortKey = "score" | "due_date" | "importance" | "created_at";

const STATUS_OPTIONS: { value: TaskStatus | ""; label: string }[] = [
  { value: "", label: "すべて" },
  { value: "pending", label: "未着手" },
  { value: "in_progress", label: "進行中" },
  { value: "completed", label: "完了" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "score", label: "優先度順" },
  { value: "due_date", label: "期日順" },
  { value: "importance", label: "重要度順" },
  { value: "created_at", label: "登録順" },
];

export default function TaskListPage() {
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sort, setSort] = useState<SortKey>("score");
  const { categories } = useCategories();

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", statusFilter, categoryFilter, sort],
    queryFn: () =>
      tasksApi.list({
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        sort,
      }),
  });

  const tasks = data?.tasks ?? [];
  const todayFocusTasks = tasks.filter((t) => t.today_focus_approved);
  const otherTasks = tasks.filter((t) => !t.today_focus_approved);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">タスク一覧</h2>
        <Link to="/tasks/new" className="btn-primary">
          + タスクを追加
        </Link>
      </div>

      {/* フィルター・ソート */}
      <div className="card mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">ステータス</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | "")}
            className="input py-1.5 text-sm w-32"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">カテゴリ</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input py-1.5 text-sm w-32"
          >
            <option value="">すべて</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">並び順</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="input py-1.5 text-sm w-36"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="self-end">
          <span className="text-sm text-gray-500">
            {data?.total ?? 0} 件
          </span>
        </div>
      </div>

      {/* ローディング */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card h-16 animate-pulse bg-gray-100" />
          ))}
        </div>
      )}

      {/* Today Focus セクション */}
      {!isLoading && todayFocusTasks.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-blue-600 flex items-center gap-1 mb-3">
            ⭐ Today Focus（承認済み）
          </h3>
          <div className="space-y-2">
            {todayFocusTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}

      {/* その他のタスク */}
      {!isLoading && (
        <section>
          {todayFocusTasks.length > 0 && otherTasks.length > 0 && (
            <h3 className="text-sm font-semibold text-gray-500 mb-3">その他のタスク</h3>
          )}
          {otherTasks.length === 0 && todayFocusTasks.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-5xl mb-4">📭</p>
              <p className="text-lg">タスクがありません</p>
              <Link to="/tasks/new" className="mt-4 inline-block btn-primary">
                最初のタスクを追加する
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {otherTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
