import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { tasksApi } from "../api/tasks";
import { aiApi } from "../api/ai";
import type { TaskCreate, AiSubTask } from "../types";
import { ESTIMATED_MINUTES_OPTIONS } from "../types";
import { useCategories } from "../hooks/useCategories";
import { useTemplates } from "../hooks/useTemplates";
import { useAiStatus } from "../hooks/useAiStatus";

const RECURRENCE_OPTIONS = [
  { value: "", label: "なし" },
  { value: "daily", label: "毎日" },
  { value: "weekly", label: "毎週" },
  { value: "monthly", label: "毎月" },
];

interface FormValues {
  title: string;
  due_date: string;
  importance: number;
  estimated_minutes: string;
  actual_minutes: string;
  category: string;
  memo: string;
  depends_on_id: string;
  parent_task_id: string;
  recurrence: string;
}

export default function TaskFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { categories, addCategory, removeCategory } = useCategories();
  const { templates, addTemplate, removeTemplate } = useTemplates();
  const { hasKey } = useAiStatus();
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const tagInputRef = useRef<HTMLInputElement>(null);

  // AI state
  const [suggesting, setSuggesting] = useState(false);
  const [decomposing, setDecomposing] = useState(false);
  const [aiSubtasks, setAiSubtasks] = useState<AiSubTask[]>([]);

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
    getValues,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: "",
      due_date: format(new Date(), "yyyy-MM-dd"),
      importance: 3,
      estimated_minutes: "",
      actual_minutes: "",
      category: "",
      memo: "",
      depends_on_id: "",
      parent_task_id: "",
      recurrence: "",
    },
  });

  useEffect(() => {
    if (existingTask) {
      reset({
        title: existingTask.title,
        due_date: format(new Date(existingTask.due_date), "yyyy-MM-dd"),
        importance: existingTask.importance,
        estimated_minutes: existingTask.estimated_minutes?.toString() ?? "",
        actual_minutes: existingTask.actual_minutes?.toString() ?? "",
        category: existingTask.category ?? "",
        memo: existingTask.memo ?? "",
        depends_on_id: existingTask.depends_on_id?.toString() ?? "",
        parent_task_id: existingTask.parent_task_id?.toString() ?? "",
        recurrence: existingTask.recurrence ?? "",
      });
      if (existingTask.tags) {
        setTags(existingTask.tags.split(",").map((t) => t.trim()).filter(Boolean));
      }
    }
  }, [existingTask, reset]);

  const handleAiSuggest = async () => {
    const title = getValues("title").trim();
    if (!title) {
      toast.error("タイトルを入力してからAI補完を実行してください");
      return;
    }
    setSuggesting(true);
    try {
      const result = await aiApi.suggest(title);
      if (result.due_date) setValue("due_date", result.due_date);
      if (result.importance) setValue("importance", result.importance);
      if (result.estimated_minutes) {
        // Find the closest option value
        const opts = ESTIMATED_MINUTES_OPTIONS.map((o) => Number(o.value));
        const closest = opts.reduce((a, b) =>
          Math.abs(b - result.estimated_minutes!) < Math.abs(a - result.estimated_minutes!) ? b : a
        );
        setValue("estimated_minutes", closest.toString());
      }
      if (result.category) setValue("category", result.category);
      if (result.memo) setValue("memo", result.memo);
      toast.success("AI補完が完了しました");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "AI補完に失敗しました");
    } finally {
      setSuggesting(false);
    }
  };

  const handleAiDecompose = async () => {
    const title = getValues("title").trim();
    const memo = getValues("memo");
    if (!title) {
      toast.error("タイトルを入力してからサブタスク分解を実行してください");
      return;
    }
    setDecomposing(true);
    try {
      const result = await aiApi.decompose(title, memo || undefined);
      setAiSubtasks(result.subtasks);
      toast.success(`${result.subtasks.length}個のサブタスクを生成しました`);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "サブタスク分解に失敗しました");
    } finally {
      setDecomposing(false);
    }
  };

  const handleAddTag = () => {
    const val = tagInput.trim().replace(/^#/, "");
    if (val && !tags.includes(val)) {
      setTags((prev) => [...prev, val]);
    }
    setTagInput("");
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: TaskCreate) => tasksApi.create(data),
    onSuccess: async (created) => {
      // If AI subtasks were generated, create them linked to the new parent
      if (aiSubtasks.length > 0) {
        const base: Partial<TaskCreate> = {
          due_date: created.due_date,
          importance: created.importance,
          parent_task_id: created.id,
        };
        await Promise.all(
          aiSubtasks.map((s) =>
            tasksApi.create({
              ...base,
              title: s.title,
              estimated_minutes: s.estimated_minutes ?? null,
              memo: s.memo ?? null,
              category: created.category,
              tags: null,
              recurrence: null,
              depends_on_id: null,
              actual_minutes: null,
            } as TaskCreate)
          )
        );
        toast.success(`タスクと${aiSubtasks.length}個のサブタスクを登録しました`);
      } else {
        toast.success("タスクを登録しました");
      }
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
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
      actual_minutes: values.actual_minutes ? Number(values.actual_minutes) : null,
      category: values.category || null,
      memo: values.memo || null,
      depends_on_id: values.depends_on_id ? Number(values.depends_on_id) : null,
      parent_task_id: values.parent_task_id ? Number(values.parent_task_id) : null,
      recurrence: values.recurrence || null,
      tags: tags.length > 0 ? tags.join(",") : null,
    };
    if (isEdit) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const handleAddCategory = () => {
    if (newCategoryInput.trim()) {
      addCategory(newCategoryInput);
      setNewCategoryInput("");
    }
  };

  const handleApplyTemplate = (tplId: string) => {
    const tpl = templates.find((t) => t.id === tplId);
    if (!tpl) return;
    reset({
      title: tpl.title,
      due_date: format(new Date(), "yyyy-MM-dd"),
      importance: tpl.importance,
      estimated_minutes: tpl.estimated_minutes?.toString() ?? "",
      actual_minutes: "",
      category: tpl.category,
      memo: tpl.memo,
      depends_on_id: "",
      parent_task_id: "",
      recurrence: tpl.recurrence,
    });
    setShowTemplates(false);
    toast.success(`テンプレート「${tpl.name}」を適用しました`);
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;
    const values = getValues();
    addTemplate({
      name: templateName.trim(),
      title: values.title,
      importance: Number(values.importance),
      estimated_minutes: values.estimated_minutes ? Number(values.estimated_minutes) : null,
      category: values.category,
      recurrence: values.recurrence,
      memo: values.memo,
    });
    setTemplateName("");
    setShowSaveTemplate(false);
    toast.success("テンプレートを保存しました");
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const availableDeps = taskList?.tasks.filter(
    (t) => t.status !== "completed" && t.status !== "deleted" && t.id !== Number(id)
  ) ?? [];

  const availableParents = taskList?.tasks.filter(
    (t) =>
      t.status !== "completed" &&
      t.status !== "deleted" &&
      t.id !== Number(id) &&
      !t.parent_task_id
  ) ?? [];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/tasks" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          ← 戻る
        </Link>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {isEdit ? "タスクを編集" : "タスクを追加"}
        </h2>
      </div>

      {!isEdit && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowTemplates((s) => !s)}
            className="text-sm text-blue-500 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
          >
            📋 {showTemplates ? "▲ テンプレートを閉じる" : "▼ テンプレートから作成"}
          </button>
          {showTemplates && (
            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              {templates.length === 0 ? (
                <p className="text-sm text-gray-400">テンプレートがありません。</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {templates.map((tpl) => (
                    <div key={tpl.id} className="flex items-center gap-1 bg-white dark:bg-gray-700 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-1.5 text-sm">
                      <button type="button" onClick={() => handleApplyTemplate(tpl.id)} className="text-blue-700 dark:text-blue-400 hover:text-blue-900 font-medium">{tpl.name}</button>
                      <button type="button" onClick={() => removeTemplate(tpl.id)} className="text-gray-300 hover:text-red-400 ml-1" title="削除">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">タイトル <span className="text-red-500">*</span></label>
            {hasKey && (
              <button
                type="button"
                onClick={handleAiSuggest}
                disabled={suggesting}
                className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 disabled:opacity-40 flex items-center gap-1"
              >
                ✨ {suggesting ? "補完中..." : "AI補完"}
              </button>
            )}
          </div>
          <input {...register("title", { required: "タイトルを入力してください" })} className="input" placeholder="例：契約書のレビュー" />
          {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">期日 <span className="text-red-500">*</span></label>
          <input {...register("due_date", { required: "期日を入力してください" })} type="date" className="input" />
          {errors.due_date && <p className="text-red-500 text-xs mt-1">{errors.due_date.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">重要度（業務への影響度）</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((v) => (
              <label key={v} className="flex-1">
                <input {...register("importance")} type="radio" value={v} className="sr-only peer" />
                <span className="block text-center py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer peer-checked:border-blue-500 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900/30 peer-checked:text-blue-700 dark:peer-checked:text-blue-400 font-medium text-sm transition-colors hover:border-gray-300">{v}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1"><span>低</span><span>高</span></div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">繰り返し</label>
          <select {...register("recurrence")} className="input">
            {RECURRENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <p className="text-xs text-gray-400 mt-1">設定すると完了時に次の期日でタスクが自動生成されます</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">所要時間（見込み）</label>
            <select {...register("estimated_minutes")} className="input">
              <option value="">未設定</option>
              {ESTIMATED_MINUTES_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">実績時間（分）</label>
              <input {...register("actual_minutes")} type="number" min={1} className="input" placeholder="例：45" />
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">カテゴリ</label>
            <button type="button" onClick={() => setShowCategoryManager(!showCategoryManager)} className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400">
              {showCategoryManager ? "▲ 閉じる" : "▼ カテゴリを管理"}
            </button>
          </div>
          <select {...register("category")} className="input">
            <option value="">未設定</option>
            {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          {showCategoryManager && (
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 space-y-2">
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <span key={cat} className="flex items-center gap-1 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-full px-3 py-1 text-xs text-gray-700 dark:text-gray-200">
                    {cat}
                    <button type="button" onClick={() => removeCategory(cat)} className="text-gray-400 hover:text-red-500 ml-1">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newCategoryInput} onChange={(e) => setNewCategoryInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCategory(); } }} placeholder="新しいカテゴリ名" className="input text-sm py-1 flex-1" maxLength={30} />
                <button type="button" onClick={handleAddCategory} className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">追加</button>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">タグ</label>
          <div
            className="flex flex-wrap gap-1.5 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent cursor-text min-h-[42px] items-center"
            onClick={() => tagInputRef.current?.focus()}
          >
            {tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full px-2.5 py-0.5 text-xs font-medium">
                #{tag}
                <button type="button" onClick={(e) => { e.stopPropagation(); setTags((p) => p.filter((t) => t !== tag)); }} className="text-blue-400 hover:text-blue-700 dark:hover:text-blue-200 leading-none">×</button>
              </span>
            ))}
            <input
              ref={tagInputRef}
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={handleAddTag}
              placeholder={tags.length === 0 ? "タグを入力（Enter で追加）" : ""}
              className="flex-1 min-w-[120px] outline-none bg-transparent text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Enter またはカンマで複数追加できます</p>
        </div>

        {availableParents.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">親タスク（サブタスクとして登録）</label>
            <select {...register("parent_task_id")} className="input">
              <option value="">なし（トップレベル）</option>
              {availableParents.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
        )}

        {availableDeps.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">依存タスク（先に完了が必要なタスク）</label>
            <select {...register("depends_on_id")} className="input">
              <option value="">なし</option>
              {availableDeps.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">メモ</label>
          <textarea {...register("memo")} className="input resize-none" rows={3} placeholder="詳細・参考情報など" />
        </div>

        {!isEdit && hasKey && (
          <div className="border border-purple-200 dark:border-purple-700 rounded-lg p-3 bg-purple-50 dark:bg-purple-900/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">AIでサブタスクに分解</span>
              <button
                type="button"
                onClick={handleAiDecompose}
                disabled={decomposing}
                className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-40 transition-colors"
              >
                {decomposing ? "分解中..." : "✨ 分解する"}
              </button>
            </div>
            {aiSubtasks.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">生成されたサブタスク（タスク登録時に一括作成）:</p>
                {aiSubtasks.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm bg-white dark:bg-gray-800 rounded px-2.5 py-1.5 border border-purple-100 dark:border-purple-800">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-800 dark:text-gray-100">{s.title}</span>
                      {s.estimated_minutes && (
                        <span className="ml-2 text-xs text-gray-400">約{s.estimated_minutes}分</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiSubtasks((prev) => prev.filter((_, j) => j !== i))}
                      className="text-gray-300 hover:text-red-400 text-xs flex-shrink-0"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
          {showSaveTemplate ? (
            <div className="flex gap-2">
              <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSaveTemplate(); } }} placeholder="テンプレート名（例：週次報告）" className="input text-sm py-1.5 flex-1" maxLength={30} autoFocus />
              <button type="button" onClick={handleSaveTemplate} className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">保存</button>
              <button type="button" onClick={() => { setShowSaveTemplate(false); setTemplateName(""); }} className="px-3 py-1.5 text-gray-400 hover:text-gray-600 text-sm">キャンセル</button>
            </div>
          ) : (
            <button type="button" onClick={() => setShowSaveTemplate(true)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              📋 このフォームの内容をテンプレートとして保存
            </button>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 py-3">
            {isSubmitting ? "保存中..." : isEdit ? "更新する" : "タスクを追加する"}
          </button>
          <Link to="/tasks" className="btn-secondary px-6">キャンセル</Link>
          {isEdit && (
            <button type="button" onClick={() => { if (confirm("このタスクを削除しますか？")) deleteMutation.mutate(); }} className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">削除</button>
          )}
        </div>
      </form>
    </div>
  );
}
