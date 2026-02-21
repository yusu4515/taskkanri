import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { tasksApi } from "../api/tasks";
import type { TaskCreate } from "../types";
import { ESTIMATED_MINUTES_OPTIONS } from "../types";
import { useCategories } from "../hooks/useCategories";

interface FormValues {
  title: string;
  due_date: string;
  importance: number;
  estimated_minutes: string;
  category: string;
  memo: string;
  depends_on_id: string;
}

export default function TaskFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { categories, addCategory, removeCategory } = useCategories();
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");

  const { data: existingTask } = useQuery({
    queryKey: ["task", id],
    queryFn: () => tasksApi.get(Number(id)),
    enabled: isEdit,
  });

  const { data: taskList } = useQuery({
    queryKey: ["tasks", "", "", "score"],
    queryFn: () => tasksApi.list(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: "",
      due_date: format(new Date(), "yyyy-MM-dd"),
      importance: 3,
      estimated_minutes: "",
      category: "",
      memo: "",
      depends_on_id: "",
    },
  });

  useEffect(() => {
    if (existingTask) {
      reset({
        title: existingTask.title,
        due_date: format(new Date(existingTask.due_date), "yyyy-MM-dd"),
        importance: existingTask.importance,
        estimated_minutes: existingTask.estimated_minutes?.toString() ?? "",
        category: existingTask.category ?? "",
        memo: existingTask.memo ?? "",
        depends_on_id: existingTask.depends_on_id?.toString() ?? "",
      });
    }
  }, [existingTask, reset]);

  const createMutation = useMutation({
    mutationFn: (data: TaskCreate) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("タスクを登録しました");
      navigate("/tasks");
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "登録に失敗しました");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: TaskCreate) => tasksApi.update(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("タスクを更新しました");
      navigate("/tasks");
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "更新に失敗しました");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => tasksApi.delete(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("タスクを削除しました");
      navigate("/tasks");
    },
  });

  const onSubmit = (values: FormValues) => {
    const payload: TaskCreate = {
      title: values.title,
      due_date: new Date(values.due_date).toISOString(),
      importance: Number(values.importance),
      estimated_minutes: values.estimated_minutes ? Number(values.estimated_minutes) : null,
      category: values.category || null,
      memo: values.memo || null,
      depends_on_id: values.depends_on_id ? Number(values.depends_on_id) : null,
    };

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleAddCategory = () => {
    if (newCategoryInput.trim()) {
      addCategory(newCategoryInput);
      setNewCategoryInput("");
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const availableDeps = taskList?.tasks.filter(
    (t) => t.status !== "completed" && t.status !== "deleted" && t.id !== Number(id)
  ) ?? [];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/tasks" className="text-gray-400 hover:text-gray-600">
          ← 戻る
        </Link>
        <h2 className="text-2xl font-bold text-gray-800">
          {isEdit ? "タスクを編集" : "タスクを追加"}
        </h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
        {/* タイトル */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            {...register("title", { required: "タイトルを入力してください" })}
            className="input"
            placeholder="例：契約書のレビュー"
          />
          {errors.title && (
            <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>
          )}
        </div>

        {/* 期日 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            期日 <span className="text-red-500">*</span>
          </label>
          <input
            {...register("due_date", { required: "期日を入力してください" })}
            type="date"
            className="input"
          />
          {errors.due_date && (
            <p className="text-red-500 text-xs mt-1">{errors.due_date.message}</p>
          )}
        </div>

        {/* 重要度 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            重要度（業務への影響度）
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((v) => (
              <label key={v} className="flex-1">
                <input
                  {...register("importance")}
                  type="radio"
                  value={v}
                  className="sr-only peer"
                />
                <span className="block text-center py-2 border-2 border-gray-200 rounded-lg cursor-pointer peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700 font-medium text-sm transition-colors hover:border-gray-300">
                  {v}
                </span>
              </label>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>低</span>
            <span>高</span>
          </div>
        </div>

        {/* 所要時間 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            所要時間（見込み）
          </label>
          <select {...register("estimated_minutes")} className="input">
            <option value="">未設定</option>
            {ESTIMATED_MINUTES_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* カテゴリ */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              カテゴリ
            </label>
            <button
              type="button"
              onClick={() => setShowCategoryManager(!showCategoryManager)}
              className="text-xs text-blue-500 hover:text-blue-700"
            >
              {showCategoryManager ? "▲ 閉じる" : "▼ カテゴリを管理"}
            </button>
          </div>
          <select {...register("category")} className="input">
            <option value="">未設定</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* カテゴリ管理パネル */}
          {showCategoryManager && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
              <p className="text-xs text-gray-500 font-medium">カテゴリ一覧</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <span
                    key={cat}
                    className="flex items-center gap-1 bg-white border border-gray-200 rounded-full px-3 py-1 text-xs"
                  >
                    {cat}
                    <button
                      type="button"
                      onClick={() => removeCategory(cat)}
                      className="text-gray-400 hover:text-red-500 ml-1 leading-none"
                      title="削除"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCategory(); } }}
                  placeholder="新しいカテゴリ名"
                  className="input text-sm py-1 flex-1"
                  maxLength={30}
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
                >
                  追加
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 依存タスク */}
        {availableDeps.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              依存タスク（先に完了が必要なタスク）
            </label>
            <select {...register("depends_on_id")} className="input">
              <option value="">なし</option>
              {availableDeps.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* メモ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            メモ
          </label>
          <textarea
            {...register("memo")}
            className="input resize-none"
            rows={3}
            placeholder="詳細・参考情報など"
          />
        </div>

        {/* アクションボタン */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary flex-1 py-3"
          >
            {isSubmitting
              ? "保存中..."
              : isEdit
              ? "更新する"
              : "タスクを追加する"}
          </button>
          <Link to="/tasks" className="btn-secondary px-6">
            キャンセル
          </Link>
          {isEdit && (
            <button
              type="button"
              onClick={() => {
                if (confirm("このタスクを削除しますか？")) {
                  deleteMutation.mutate();
                }
              }}
              className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              削除
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
