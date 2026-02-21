import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isPast,
} from "date-fns";
import { ja } from "date-fns/locale";
import { tasksApi } from "../api/tasks";
import type { Task } from "../types";

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-blue-100 text-blue-700",
  in_progress: "bg-orange-100 text-orange-700",
  completed: "bg-green-100 text-green-600 line-through",
};

function CalendarCell({ date, tasks }: { date: Date; tasks: Task[] }) {
  const isCurrentMonth = isSameMonth(date, date); // always true, handled by caller
  const isOverdue = isPast(date) && !isToday(date);
  const pending = tasks.filter((t) => t.status !== "completed");
  const completed = tasks.filter((t) => t.status === "completed");

  return (
    <div
      className={`min-h-[90px] p-1 border-b border-r border-gray-100 ${
        isToday(date) ? "bg-blue-50" : ""
      }`}
    >
      <span
        className={`text-xs font-semibold inline-block w-6 h-6 flex items-center justify-center rounded-full ${
          isToday(date)
            ? "bg-blue-500 text-white"
            : isOverdue && pending.length > 0
            ? "text-red-500"
            : "text-gray-600"
        }`}
      >
        {format(date, "d")}
      </span>
      <div className="mt-0.5 space-y-0.5">
        {pending.slice(0, 3).map((t) => (
          <Link
            key={t.id}
            to={`/tasks/${t.id}/edit`}
            className={`block truncate text-[10px] px-1 rounded ${
              STATUS_COLOR[t.status] ?? "bg-gray-100 text-gray-600"
            }`}
            title={t.title}
          >
            {t.title}
          </Link>
        ))}
        {completed.slice(0, 1).map((t) => (
          <Link
            key={t.id}
            to={`/tasks/${t.id}/edit`}
            className="block truncate text-[10px] px-1 rounded bg-green-50 text-green-500 line-through"
            title={t.title}
          >
            {t.title}
          </Link>
        ))}
        {tasks.length > 4 && (
          <span className="text-[10px] text-gray-400 pl-1">
            +{tasks.length - 4}件
          </span>
        )}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", "", "", "score"],
    queryFn: () => tasksApi.list(),
  });

  const tasks = data?.tasks ?? [];

  // 月の日付グリッド（日曜始まり）
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  // 日付 → タスク のマップ
  const tasksByDate = new Map<string, Task[]>();
  tasks.forEach((task) => {
    const key = format(new Date(task.due_date), "yyyy-MM-dd");
    tasksByDate.set(key, [...(tasksByDate.get(key) ?? []), task]);
  });

  const prevMonth = () =>
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const DOW = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">カレンダー</h2>
        <Link to="/tasks/new" className="btn-primary text-sm">
          + タスクを追加
        </Link>
      </div>

      {/* 月ナビゲーション */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          >
            ‹ 前月
          </button>
          <h3 className="text-lg font-bold text-gray-800">
            {format(currentMonth, "yyyy年M月", { locale: ja })}
          </h3>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          >
            翌月 ›
          </button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-t border-l border-gray-100">
          {DOW.map((d, i) => (
            <div
              key={d}
              className={`text-center text-xs font-semibold py-2 border-b border-r border-gray-100 ${
                i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-500"
              }`}
            >
              {d}
            </div>
          ))}

          {/* 日付セル */}
          {isLoading
            ? Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={i}
                  className="min-h-[90px] border-b border-r border-gray-100 animate-pulse bg-gray-50"
                />
              ))
            : days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayTasks = tasksByDate.get(key) ?? [];
                const isCurrentMonth = isSameMonth(day, currentMonth);
                return (
                  <div
                    key={key}
                    className={isCurrentMonth ? "" : "opacity-30"}
                  >
                    <CalendarCell date={day} tasks={dayTasks} />
                  </div>
                );
              })}
        </div>

        {/* 凡例 */}
        <div className="flex gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-blue-100" /> 未着手
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-orange-100" /> 進行中
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-green-100" /> 完了
          </span>
        </div>
      </div>
    </div>
  );
}
