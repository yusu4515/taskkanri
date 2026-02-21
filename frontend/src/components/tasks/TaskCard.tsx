import { format, isPast, isToday } from "date-fns";
import { ja } from "date-fns/locale";
import { Link } from "react-router-dom";
import type { Task } from "../../types";
import { CATEGORY_LABELS } from "../../types";
import PriorityBadge from "./PriorityBadge";
import { tasksApi } from "../../api/tasks";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

interface Props {
  task: Task;
}

export default function TaskCard({ task }: Props) {
  const queryClient = useQueryClient();
  const dueDate = new Date(task.due_date);
  const isOverdue = isPast(dueDate) && task.status !== "completed";
  const isDueToday = isToday(dueDate);

  const handleComplete = async () => {
    try {
      await tasksApi.complete(task.id);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("完了しました！");
    } catch {
      toast.error("操作に失敗しました");
    }
  };

  return (
    <div
      className={`card flex items-start gap-3 hover:shadow-md transition-shadow ${
        task.today_focus_approved ? "border-l-4 border-l-blue-500" : ""
      }`}
    >
      {/* 完了チェックボックス */}
      <button
        onClick={handleComplete}
        disabled={task.status === "completed"}
        className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 transition-colors ${
          task.status === "completed"
            ? "bg-green-500 border-green-500"
            : "border-gray-300 hover:border-blue-500"
        }`}
        aria-label="完了にする"
      >
        {task.status === "completed" && (
          <svg className="w-full h-full text-white p-0.5" viewBox="0 0 12 12" fill="currentColor">
            <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {/* コンテンツ */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/tasks/${task.id}/edit`}
            className={`font-medium text-sm leading-5 hover:text-blue-600 transition-colors ${
              task.status === "completed" ? "line-through text-gray-400" : "text-gray-800"
            }`}
          >
            {task.title}
            {task.today_focus_approved && (
              <span className="ml-2 text-xs text-blue-500">★ Today Focus</span>
            )}
          </Link>
          <PriorityBadge score={task.priority_score} breakdown={task.score_breakdown} />
        </div>

        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
          <span
            className={`${
              isOverdue
                ? "text-red-600 font-semibold"
                : isDueToday
                ? "text-orange-600 font-semibold"
                : ""
            }`}
          >
            {isOverdue ? "⚠ 期限超過: " : "期日: "}
            {format(dueDate, "M/d(E)", { locale: ja })}
          </span>

          {task.category && (
            <span className="bg-gray-100 px-2 py-0.5 rounded-full">
              {CATEGORY_LABELS[task.category]}
            </span>
          )}

          {task.estimated_minutes && (
            <span>
              ⏱ {task.estimated_minutes >= 60
                ? `${Math.floor(task.estimated_minutes / 60)}時間${
                    task.estimated_minutes % 60 ? `${task.estimated_minutes % 60}分` : ""
                  }`
                : `${task.estimated_minutes}分`}
            </span>
          )}

          <span className="ml-auto flex items-center gap-1">
            重要度{"★".repeat(task.importance)}{"☆".repeat(5 - task.importance)}
          </span>
        </div>
      </div>
    </div>
  );
}
