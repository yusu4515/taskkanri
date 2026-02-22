import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { tasksApi } from "../api/tasks";

const STATUS_LABELS: Record<string, string> = {
  pending: "未着手",
  in_progress: "進行中",
  completed: "完了",
  deleted: "削除済み",
};

const IMPORTANCE_LABELS: Record<number, string> = {
  1: "低",
  2: "低中",
  3: "中",
  4: "中高",
  5: "高",
};

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: task, isLoading } = useQuery({
    queryKey: ["task", id],
    queryFn: () => tasksApi.get(Number(id)),
  });

  const completeMutation = useMutation({
    mutationFn: () => tasksApi.complete(Number(id)),
    onSuccess: () => {
      toast.success("完了しました！");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate("/tasks");
    },
    onError: () => toast.error("操作に失敗しました"),
  });

  const startMutation = useMutation({
    mutationFn: () => tasksApi.start(Number(id)),
    onSuccess: () => {
      toast.success("進行中にしました");
      queryClient.invalidateQueries({ queryKey: ["task", id] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="card h-64 animate-pulse bg-gray-100 dark:bg-gray-700" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center py-16">
        <p className="text-4xl mb-3">🔍</p>
        <p className="text-gray-500 dark:text-gray-400">タスクが見つかりません</p>
        <Link to="/tasks" className="mt-4 inline-block btn-secondary text-sm">
          一覧へ戻る
        </Link>
      </div>
    );
  }

  const isOverdue =
    new Date(task.due_date) < new Date() && task.status !== "completed";

  const tags = task.tags
    ? task.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/tasks"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ← 戻る
        </Link>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex-1 min-w-0 break-words">
          {task.title}
        </h2>
        <Link
          to={`/tasks/${id}/edit`}
          className="btn-secondary text-sm px-3 py-1.5 shrink-0"
        >
          ✏️ 編集
        </Link>
      </div>

      <div className="card space-y-5">
        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              task.status === "completed"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : task.status === "in_progress"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            }`}
          >
            {STATUS_LABELS[task.status] ?? task.status}
          </span>
          {isOverdue && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
              ⚠️ 期限超過
            </span>
          )}
          {task.today_focus && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              ⭐ Today Focus
            </span>
          )}
          {task.recurrence && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              🔁 {task.recurrence}
            </span>
          )}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400 mb-1">期日</p>
            <p
              className={`font-medium ${
                isOverdue
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-800 dark:text-gray-100"
              }`}
            >
              {format(new Date(task.due_date), "yyyy/MM/dd (eee)", { locale: undefined })}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 mb-1">重要度</p>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((v) => (
                  <span
                    key={v}
                    className={`w-3 h-3 rounded-sm ${
                      v <= task.importance
                        ? "bg-blue-500"
                        : "bg-gray-200 dark:bg-gray-600"
                    }`}
                  />
                ))}
              </div>
              <span className="text-gray-600 dark:text-gray-400 text-xs">
                {IMPORTANCE_LABELS[task.importance]}
              </span>
            </div>
          </div>
          {task.category && (
            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-1">カテゴリ</p>
              <p className="font-medium text-gray-800 dark:text-gray-100">
                {task.category}
              </p>
            </div>
          )}
          <div>
            <p className="text-gray-500 dark:text-gray-400 mb-1">優先スコア</p>
            <p className="font-bold text-blue-600 dark:text-blue-400">
              {task.priority_score.toFixed(0)} 点
            </p>
          </div>
          {task.estimated_minutes && (
            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-1">見込み時間</p>
              <p className="font-medium text-gray-800 dark:text-gray-100">
                {task.estimated_minutes >= 60
                  ? `${Math.floor(task.estimated_minutes / 60)}h${
                      task.estimated_minutes % 60
                        ? `${task.estimated_minutes % 60}m`
                        : ""
                    }`
                  : `${task.estimated_minutes}分`}
              </p>
            </div>
          )}
          {task.actual_minutes != null && (
            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-1">実績時間</p>
              <p className="font-medium text-gray-800 dark:text-gray-100">
                {task.actual_minutes}分
              </p>
            </div>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">タグ</p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Memo */}
        {task.memo && (
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">メモ</p>
            <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              {task.memo}
            </p>
          </div>
        )}

        {/* Score breakdown */}
        {task.score_breakdown && (
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">スコア内訳</p>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {[
                { label: "緊急度", val: task.score_breakdown.urgency },
                { label: "重要度", val: task.score_breakdown.importance },
                { label: "所要時間", val: task.score_breakdown.duration },
                { label: "依存", val: task.score_breakdown.dependency },
              ].map(({ label, val }) => (
                <div
                  key={label}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2"
                >
                  <p className="font-bold text-gray-800 dark:text-gray-100">
                    {val.toFixed(0)}
                  </p>
                  <p className="text-gray-400">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {task.status !== "completed" && task.status !== "deleted" && (
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4 flex gap-3 flex-wrap">
            {task.status !== "in_progress" && (
              <button
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
                className="btn-secondary text-sm"
              >
                ▶ 進行中にする
              </button>
            )}
            <button
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              className="btn-primary"
            >
              {completeMutation.isPending ? "..." : "✓ 完了にする"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
