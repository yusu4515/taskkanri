import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { addDays, format, differenceInDays, startOfDay } from "date-fns";
import { tasksApi } from "../api/tasks";

const CELL_W = 30;
const DAYS = 42;

export default function GanttPage() {
  const today = startOfDay(new Date());
  const rangeStart = addDays(today, -7);
  const dates = Array.from({ length: DAYS }, (_, i) => addDays(rangeStart, i));
  const todayOffsetPx = differenceInDays(today, rangeStart) * CELL_W;

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", "gantt"],
    queryFn: () => tasksApi.list(),
  });

  const tasks = (data?.tasks ?? [])
    .filter((t) => t.status !== "deleted" && t.status !== "completed")
    .sort(
      (a, b) =>
        new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );

  const totalWidth = DAYS * CELL_W;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/dashboard"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ← 戻る
        </Link>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          ガントチャート
        </h2>
      </div>

      <div className="text-xs text-gray-400 dark:text-gray-500 mb-4 flex items-center gap-4">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-400" />
          期限超過
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-orange-400" />
          重要度高
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-blue-400" />
          通常
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-0.5 h-3 bg-red-400" />
          今日
        </span>
      </div>

      {isLoading ? (
        <div className="card h-64 animate-pulse bg-gray-100 dark:bg-gray-700" />
      ) : tasks.length === 0 ? (
        <div className="card text-center py-12 text-gray-400 dark:text-gray-500">
          <p className="text-4xl mb-3">📊</p>
          <p>未完了タスクがありません</p>
          <Link to="/tasks/new" className="mt-4 inline-block btn-primary text-sm">
            タスクを追加
          </Link>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <div style={{ minWidth: 200 + totalWidth }}>
              {/* Header */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="w-48 shrink-0 px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
                  タスク
                </div>
                <div className="flex relative" style={{ width: totalWidth }}>
                  {/* Today highlight */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-red-400 dark:bg-red-500 z-10"
                    style={{ left: todayOffsetPx }}
                  />
                  {dates.map((d, i) => {
                    const isToday = d.getTime() === today.getTime();
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    const showLabel = d.getDate() === 1 || i === 0 || d.getDay() === 1;
                    return (
                      <div
                        key={i}
                        style={{ width: CELL_W }}
                        className={`shrink-0 text-center py-2 border-r text-xs ${
                          isToday
                            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 font-bold text-red-500"
                            : isWeekend
                            ? "bg-gray-100 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400"
                            : "border-gray-100 dark:border-gray-700 text-gray-300 dark:text-gray-600"
                        }`}
                      >
                        {showLabel ? format(d, d.getDate() === 1 ? "M/d" : "d") : ""}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Task rows */}
              {tasks.map((task) => {
                const dueDate = startOfDay(new Date(task.due_date));
                const dueOffset = differenceInDays(dueDate, rangeStart);
                const isOverdue = dueDate < today;
                const barLeft = Math.max(0, dueOffset - 1) * CELL_W;
                const barWidth = Math.min(CELL_W * 2, totalWidth - barLeft);
                const inRange = dueOffset > -3 && dueOffset < DAYS + 3;

                return (
                  <div
                    key={task.id}
                    className="flex border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors"
                  >
                    <div className="w-48 shrink-0 px-4 py-2 border-r border-gray-200 dark:border-gray-700">
                      <Link
                        to={`/tasks/${task.id}`}
                        className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 truncate block"
                        title={task.title}
                      >
                        {task.title}
                      </Link>
                      {task.category && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {task.category}
                        </span>
                      )}
                    </div>
                    <div className="relative" style={{ width: totalWidth, height: 44 }}>
                      {/* Today line */}
                      <div
                        className="absolute top-0 bottom-0 w-px bg-red-300 dark:bg-red-700 z-10 pointer-events-none"
                        style={{ left: todayOffsetPx }}
                      />
                      {/* Weekend shading */}
                      {dates.map((d, i) => {
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        if (!isWeekend) return null;
                        return (
                          <div
                            key={i}
                            className="absolute top-0 bottom-0 bg-gray-50 dark:bg-gray-800/50"
                            style={{ left: i * CELL_W, width: CELL_W }}
                          />
                        );
                      })}
                      {/* Bar */}
                      {inRange && (
                        <div
                          className={`absolute top-2 bottom-2 rounded flex items-center justify-center text-xs text-white font-medium overflow-hidden z-20 ${
                            isOverdue
                              ? "bg-red-400 dark:bg-red-600"
                              : task.importance >= 4
                              ? "bg-orange-400 dark:bg-orange-600"
                              : "bg-blue-400 dark:bg-blue-600"
                          }`}
                          style={{ left: Math.max(0, barLeft), width: barWidth }}
                          title={`${task.title} - 期日: ${format(dueDate, "M/d")}`}
                        >
                          {format(dueDate, "M/d")}
                        </div>
                      )}
                      {/* Out-of-range indicator */}
                      {!inRange && dueOffset <= -3 && (
                        <div className="absolute left-1 top-1/2 -translate-y-1/2 text-xs text-red-400">
                          ◀ {format(dueDate, "M/d")}
                        </div>
                      )}
                      {!inRange && dueOffset >= DAYS + 3 && (
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          {format(dueDate, "M/d")} ▶
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
