import { format, isPast, isToday } from "date-fns";
import { ja } from "date-fns/locale";
import { Link } from "react-router-dom";
import type { Task } from "../../types";
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
  const isCompleted = task.status === "completed";
  const isInProgress = task.status === "in_progress";

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const handleToggleComplete = async () => {
    try {
      if (isCompleted) {
        await tasksApi.uncomplete(task.id);
        toast.success("未着手に戻しました");
      } else {
        await tasksApi.complete(task.id);
        toast.success("完了しました！");
      }
      invalidate();
    } catch {
      toast.error("操作に失敗しました");
    }
  };

  const handleToggleInProgress = async () => {
    try {
      if (isInProgress) {
        await tasksApi.uncomplete(task.id);
        toast.success("未着手に戻しました");
      } else {
        await tasksApi.start(task.id);
        toast.success("着手しました");
      }
      invalidate();
    } catch {
      toast.error("操作に失敗しました");
    }
  };

  const borderClass = task.today_focus_approved
    ? "border-l-4 border-l-blue-500"
    : isInProgress
    ? "border-l-4 border-l-orange-400"
    : "";

  return (
    <div className={`card flex items-start gap-3 hover:shadow-md transition-shadow ${borderClass}`}>
      {/* 完了チェックボックス */}
      <button
        onClick={handleToggleComplete}
        className="flex flex-col items-center gap-0.5 flex-shrink-0 mt-0.5 group"
        aria-label={isCompleted ? "完了を取り消す" : "完了にする"}
        title={isCompleted ? "クリックで未着手に戻す" : "クリックで完了にする"}
      >
        <span
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            isCompleted
              ? "bg-green-500 border-green-500"
              : "border-gray-300 group-hover:border-blue-500"
          }`}
        >
          {isCompleted && (
            <svg className="w-full h-full text-white p-0.5" viewBox="0 0 12 12" fill="currentColor">
              <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
          )}
        </span>
        <span className={`text-[10px] leading-none ${isCompleted ? "text-green-500" : "text-gray-400 group-hover:text-blue-500"}`}>
          完了
        </span>
      </button>

      {/* コンテンツ */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/tasks/${task.id}/edit`}
            className={`font-medium text-sm leading-5 hover:text-blue-600 transition-colors ${
              isCompleted ? "line-through text-gray-400" : "text-gray-800"
            }`}
          >
            {task.title}
            {task.today_focus_approved && (
              <span className="ml-2 text-xs text-blue-500">★ Today Focus</span>
            )}
          </Link>
          <PriorityBadge score={task.priority_score} breakdown={task.score_breakdown} />
        </div>

        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
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
              {task.category}
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

          {task.actual_minutes && (
            <span
              className={
                task.estimated_minutes && task.actual_minutes > task.estimated_minutes
                  ? "text-red-500"
                  : "text-green-600"
              }
            >
              実績 {task.actual_minutes}分
            </span>
          )}

          {task.recurrence && (
            <span className="text-blue-400">
              🔁{" "}
              {task.recurrence === "daily"
                ? "毎日"
                : task.recurrence === "weekly"
                ? "毎週"
                : "毎月"}
            </span>
          )}

          <span className="ml-auto flex items-center gap-1">
            重要度{"★".repeat(task.importance)}{"☆".repeat(5 - task.importance)}
          </span>
        </div>

        {/* 進行中ボタン */}
        {!isCompleted && (
          <div className="mt-2">
            {isInProgress ? (
              <span className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                ▶ 進行中
                <button
                  onClick={handleToggleInProgress}
                  className="ml-1 text-orange-400 hover:text-orange-600 leading-none"
                  title="未着手に戻す"
                >
                  ×
                </button>
              </span>
            ) : (
              <button
                onClick={handleToggleInProgress}
                className="text-xs text-gray-400 hover:text-orange-500 transition-colors"
                title="着手する"
              >
                ▶ 着手
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
