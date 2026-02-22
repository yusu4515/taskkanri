import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { tasksApi } from "../api/tasks";
import TaskCard from "../components/tasks/TaskCard";
import type { Task, TaskStatus } from "../types";
import { useCategories } from "../hooks/useCategories";
import toast from "react-hot-toast";

const FILTER_STORAGE_KEY = "taskkanri_list_filters";

function loadFilters() {
  try {
    const s = localStorage.getItem(FILTER_STORAGE_KEY);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

function exportCsv(tasks: Task[]) {
  const STATUS_LABEL: Record<string, string> = {
    pending: "未着手",
    in_progress: "進行中",
    completed: "完了",
  };
  const RECURRENCE_LABEL: Record<string, string> = {
    daily: "毎日",
    weekly: "毎週",
    monthly: "毎月",
  };
  const headers = [
    "タイトル", "期日", "重要度", "ステータス", "カテゴリ", "タグ",
    "所要時間(分)", "実績時間(分)", "繰り返し", "優先度スコア", "メモ",
  ];
  const rows = tasks.map((t) => [
    `"${t.title.replace(/"/g, '""')}"`,
    format(new Date(t.due_date), "yyyy/MM/dd"),
    t.importance,
    STATUS_LABEL[t.status] ?? t.status,
    t.category ?? "",
    t.tags ?? "",
    t.estimated_minutes ?? "",
    t.actual_minutes ?? "",
    t.recurrence ? (RECURRENCE_LABEL[t.recurrence] ?? t.recurrence) : "",
    t.priority_score.toFixed(1),
    `"${(t.memo ?? "").replace(/"/g, '""')}"`,
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tasks_${format(new Date(), "yyyyMMdd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type SortKey = "score" | "due_date" | "importance" | "created_at" | "manual";
type ViewMode = "active" | "archive";

const STATUS_OPTIONS: { value: TaskStatus | ""; label: string }[] = [
  { value: "", label: "すべて" },
  { value: "pending", label: "未着手" },
  { value: "in_progress", label: "進行中" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "score", label: "優先度順" },
  { value: "due_date", label: "期日順" },
  { value: "importance", label: "重要度順" },
  { value: "created_at", label: "登録順" },
  { value: "manual", label: "手動" },
];

function SortableTaskCard({
  task,
  subTasks,
  selected,
  onSelect,
}: {
  task: Task;
  subTasks: Task[];
  selected: boolean;
  onSelect: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-stretch gap-1">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(task.id)}
          className="mt-4 ml-1 flex-shrink-0 w-4 h-4 accent-blue-500"
        />
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing px-1 flex items-center text-lg select-none"
          title="ドラッグして並び替え"
        >
          ⋮⋮
        </button>
        <div className="flex-1">
          <TaskCard task={task} />
        </div>
      </div>
      {subTasks.length > 0 && (
        <div className="ml-14 mt-1 space-y-1">
          {subTasks.map((sub) => (
            <TaskCard key={sub.id} task={sub} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TaskListPage() {
  const saved = loadFilters();
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">(saved.status ?? "");
  const [categoryFilter, setCategoryFilter] = useState(saved.category ?? "");
  const [sort, setSort] = useState<SortKey>(saved.sort ?? "score");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [orderedIds, setOrderedIds] = useState<number[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const { categories } = useCategories();
  const queryClient = useQueryClient();

  // フィルター設定を localStorage に保存
  useEffect(() => {
    localStorage.setItem(
      FILTER_STORAGE_KEY,
      JSON.stringify({ status: statusFilter, category: categoryFilter, sort })
    );
  }, [statusFilter, categoryFilter, sort]);

  // 検索デバウンス
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const effectiveStatus =
    viewMode === "archive" ? "completed" : statusFilter || undefined;

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", effectiveStatus, categoryFilter, sort, debouncedSearch, viewMode],
    queryFn: () =>
      tasksApi.list({
        status: effectiveStatus,
        category: categoryFilter || undefined,
        sort: viewMode === "archive" ? "created_at" : sort,
        search: debouncedSearch || undefined,
      }),
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: number[]) => tasksApi.reorder(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const tasks = data?.tasks ?? [];
  const todayFocusTasks = viewMode === "active" ? tasks.filter((t) => t.today_focus_approved) : [];
  const nonFocusTasks = viewMode === "active" ? tasks.filter((t) => !t.today_focus_approved) : tasks;

  const topLevelOtherTasks = nonFocusTasks.filter((t) => !t.parent_task_id);
  const subTasksMap = new Map<number, Task[]>();
  nonFocusTasks
    .filter((t) => t.parent_task_id)
    .forEach((t) => {
      const list = subTasksMap.get(t.parent_task_id!) ?? [];
      subTasksMap.set(t.parent_task_id!, [...list, t]);
    });

  const sortedOtherTasks =
    sort === "manual" && orderedIds.length > 0
      ? (orderedIds.map((id) => topLevelOtherTasks.find((t) => t.id === id)).filter(Boolean) as Task[])
      : topLevelOtherTasks;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const ids = sortedOtherTasks.map((t) => t.id);
      const newOrder = arrayMove(ids, ids.indexOf(active.id as number), ids.indexOf(over.id as number));
      setOrderedIds(newOrder);
      reorderMutation.mutate(newOrder);
    },
    [sortedOtherTasks, reorderMutation]
  );

  // 一括操作
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const ids = sortedOtherTasks.map((t) => t.id);
    setSelectedIds(new Set(ids));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const bulkComplete = async () => {
    const ids = [...selectedIds];
    await Promise.all(ids.map((id) => tasksApi.complete(id)));
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    toast.success(`${ids.length}件を完了にしました`);
    clearSelection();
  };

  const bulkDelete = async () => {
    if (!confirm(`選択した${selectedIds.size}件を削除しますか？`)) return;
    const ids = [...selectedIds];
    await Promise.all(ids.map((id) => tasksApi.delete(id)));
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    toast.success(`${ids.length}件を削除しました`);
    clearSelection();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-800">タスク一覧</h2>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            <button
              onClick={() => { setViewMode("active"); setSelectedIds(new Set()); }}
              className={`px-3 py-1.5 font-medium transition-colors ${
                viewMode === "active" ? "bg-blue-500 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              進行中
            </button>
            <button
              onClick={() => { setViewMode("archive"); setSelectedIds(new Set()); }}
              className={`px-3 py-1.5 font-medium transition-colors ${
                viewMode === "archive" ? "bg-blue-500 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              アーカイブ
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportCsv(tasks)}
            disabled={tasks.length === 0}
            className="btn-secondary text-sm disabled:opacity-40"
          >
            ⬇ CSV
          </button>
          <Link to="/tasks/new" className="btn-primary">
            + 追加
          </Link>
        </div>
      </div>

      {/* 一括操作バー */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-4">
          <span className="text-sm font-medium text-blue-700">
            {selectedIds.size}件を選択中
          </span>
          <button
            onClick={bulkComplete}
            className="text-sm text-green-600 hover:text-green-800 font-medium"
          >
            ✓ 一括完了
          </button>
          <button
            onClick={bulkDelete}
            className="text-sm text-red-500 hover:text-red-700 font-medium"
          >
            🗑 一括削除
          </button>
          <button
            onClick={clearSelection}
            className="text-sm text-gray-400 hover:text-gray-600 ml-auto"
          >
            選択を解除
          </button>
        </div>
      )}

      {/* フィルター・ソート */}
      <div className="card mb-4 flex flex-wrap gap-3">
        <div className="w-full">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="タイトル・メモを検索..."
              className="input pl-8 py-1.5 text-sm w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {viewMode === "active" && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">ステータス</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TaskStatus | "")}
              className="input py-1.5 text-sm w-28"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">カテゴリ</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input py-1.5 text-sm w-28"
          >
            <option value="">すべて</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {viewMode === "active" && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">並び順</label>
            <select
              value={sort}
              onChange={(e) => {
                const newSort = e.target.value as SortKey;
                setSort(newSort);
                if (newSort === "manual") setOrderedIds(topLevelOtherTasks.map((t) => t.id));
              }}
              className="input py-1.5 text-sm w-32"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}

        <div className="self-end flex items-center gap-3">
          <span className="text-sm text-gray-500">{data?.total ?? 0} 件</span>
          {viewMode === "active" && sortedOtherTasks.length > 0 && (
            <button onClick={selectAll} className="text-xs text-blue-500 hover:text-blue-700">
              全選択
            </button>
          )}
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

      {/* Today Focus */}
      {!isLoading && todayFocusTasks.length > 0 && viewMode === "active" && (
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-blue-600 mb-3">⭐ Today Focus（承認済み）</h3>
          <div className="space-y-2">
            {todayFocusTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}

      {/* タスクリスト */}
      {!isLoading && (
        <section>
          {!isLoading && todayFocusTasks.length > 0 && topLevelOtherTasks.length > 0 && (
            <h3 className="text-sm font-semibold text-gray-500 mb-3">
              {viewMode === "archive" ? "完了タスク" : "その他のタスク"}
            </h3>
          )}

          {topLevelOtherTasks.length === 0 && todayFocusTasks.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-5xl mb-4">{viewMode === "archive" ? "📦" : "📭"}</p>
              <p className="text-lg">
                {viewMode === "archive" ? "アーカイブはありません" : "タスクがありません"}
              </p>
              {viewMode === "active" && (
                <Link to="/tasks/new" className="mt-4 inline-block btn-primary">
                  最初のタスクを追加する
                </Link>
              )}
            </div>
          ) : sort === "manual" && viewMode === "active" ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sortedOtherTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {sortedOtherTasks.map((task) => (
                    <SortableTaskCard
                      key={task.id}
                      task={task}
                      subTasks={subTasksMap.get(task.id) ?? []}
                      selected={selectedIds.has(task.id)}
                      onSelect={toggleSelect}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="space-y-2">
              {sortedOtherTasks.map((task) => (
                <div key={task.id}>
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(task.id)}
                      onChange={() => toggleSelect(task.id)}
                      className="mt-4 flex-shrink-0 w-4 h-4 accent-blue-500"
                    />
                    <div className="flex-1">
                      <TaskCard task={task} />
                    </div>
                  </div>
                  {(subTasksMap.get(task.id) ?? []).length > 0 && (
                    <div className="ml-10 mt-1 space-y-1">
                      {(subTasksMap.get(task.id) ?? []).map((sub) => (
                        <TaskCard key={sub.id} task={sub} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
