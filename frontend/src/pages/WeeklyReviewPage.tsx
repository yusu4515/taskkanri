import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format, startOfWeek, endOfWeek, isWithinInterval, subWeeks } from "date-fns";
import { ja } from "date-fns/locale";
import { tasksApi } from "../api/tasks";
import { dashboardApi } from "../api/dashboard";

const MEMO_KEY = "taskkanri_weekly_memo";

function getMemoKey(weekStart: Date) {
  return `${MEMO_KEY}_${format(weekStart, "yyyy-MM-dd")}`;
}

export default function WeeklyReviewPage() {
  const [weekOffset, setWeekOffset] = useState(0); // 0=今週, -1=先週
  const [memo, setMemo] = useState("");

  const now = new Date();
  const weekStart = startOfWeek(subWeeks(now, -weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(subWeeks(now, -weekOffset), { weekStartsOn: 1 });

  // メモをlocalStorageから読み込み
  useEffect(() => {
    const key = getMemoKey(weekStart);
    setMemo(localStorage.getItem(key) ?? "");
  }, [weekStart.toISOString()]);

  const handleMemoChange = (value: string) => {
    setMemo(value);
    localStorage.setItem(getMemoKey(weekStart), value);
  };

  const { data: allTasksData } = useQuery({
    queryKey: ["tasks", "", "", "score"],
    queryFn: () => tasksApi.list(),
  });

  const { data: summary } = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.summary,
  });

  const allTasks = allTasksData?.tasks ?? [];

  // 今週/先週に完了したタスク
  const completedThisWeek = allTasks.filter((t) => {
    if (!t.completed_at) return false;
    const completedAt = new Date(t.completed_at);
    return isWithinInterval(completedAt, { start: weekStart, end: weekEnd });
  });

  // 期限超過（未完了）
  const overdueTasks = allTasks.filter(
    (t) =>
      t.status !== "completed" &&
      t.status !== "deleted" &&
      new Date(t.due_date) < now
  );

  // 来週期限（次の7日以内）
  const nextWeekStart = new Date(now);
  const nextWeekEnd = new Date(now);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
  const upcomingTasks = allTasks.filter(
    (t) =>
      t.status !== "completed" &&
      t.status !== "deleted" &&
      new Date(t.due_date) >= now &&
      new Date(t.due_date) <= nextWeekEnd
  );

  // 実績時間合計
  const totalActualMinutes = completedThisWeek.reduce(
    (sum, t) => sum + (t.actual_minutes ?? 0),
    0
  );

  const formatMinutes = (min: number) => {
    if (min === 0) return "記録なし";
    if (min < 60) return `${min}分`;
    return `${Math.floor(min / 60)}時間${min % 60 ? `${min % 60}分` : ""}`;
  };

  const isCurrentWeek = weekOffset === 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">週次レビュー</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {format(weekStart, "M月d日(E)", { locale: ja })} 〜{" "}
            {format(weekEnd, "M月d日(E)", { locale: ja })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            ‹ 前週
          </button>
          {!isCurrentWeek && (
            <button
              onClick={() => setWeekOffset(0)}
              className="px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
            >
              今週
            </button>
          )}
          {weekOffset < 0 && (
            <button
              onClick={() => setWeekOffset((o) => o + 1)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              翌週 ›
            </button>
          )}
        </div>
      </div>

      {/* 今週の実績サマリー */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-600">{completedThisWeek.length}</p>
          <p className="text-xs text-gray-500 mt-1">完了タスク</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-purple-600">{formatMinutes(totalActualMinutes)}</p>
          <p className="text-xs text-gray-500 mt-1">実績作業時間</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-red-500">{overdueTasks.length}</p>
          <p className="text-xs text-gray-500 mt-1">期限超過</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-orange-500">{upcomingTasks.length}</p>
          <p className="text-xs text-gray-500 mt-1">直近7日の期限</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 完了タスク一覧 */}
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            ✅ 完了したタスク
            <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
              {completedThisWeek.length}件
            </span>
          </h3>
          {completedThisWeek.length === 0 ? (
            <p className="text-sm text-gray-400">この週に完了したタスクはありません</p>
          ) : (
            <ul className="space-y-2">
              {completedThisWeek.map((t) => (
                <li key={t.id} className="flex items-start gap-2 text-sm">
                  <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-700 line-through truncate">{t.title}</p>
                    <div className="flex gap-2 text-xs text-gray-400 mt-0.5">
                      {t.category && <span>{t.category}</span>}
                      {t.actual_minutes && (
                        <span>実績 {t.actual_minutes}分</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 要対応タスク */}
        <div className="space-y-4">
          {/* 期限超過 */}
          {overdueTasks.length > 0 && (
            <div className="card border-l-4 border-l-red-400">
              <h3 className="font-semibold text-red-600 mb-3 text-sm flex items-center gap-2">
                ⚠ 期限超過
                <span className="text-xs bg-red-100 px-2 py-0.5 rounded-full">
                  {overdueTasks.length}件
                </span>
              </h3>
              <ul className="space-y-1">
                {overdueTasks.slice(0, 5).map((t) => (
                  <li key={t.id}>
                    <Link
                      to={`/tasks/${t.id}/edit`}
                      className="text-sm text-gray-700 hover:text-red-600 truncate block"
                    >
                      {t.title}
                    </Link>
                  </li>
                ))}
                {overdueTasks.length > 5 && (
                  <li className="text-xs text-gray-400">
                    他 {overdueTasks.length - 5} 件
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* 直近7日期限 */}
          {upcomingTasks.length > 0 && (
            <div className="card border-l-4 border-l-orange-400">
              <h3 className="font-semibold text-orange-600 mb-3 text-sm flex items-center gap-2">
                📅 直近7日の期限
                <span className="text-xs bg-orange-100 px-2 py-0.5 rounded-full">
                  {upcomingTasks.length}件
                </span>
              </h3>
              <ul className="space-y-1">
                {upcomingTasks.slice(0, 5).map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {format(new Date(t.due_date), "M/d")}
                    </span>
                    <Link
                      to={`/tasks/${t.id}/edit`}
                      className="text-sm text-gray-700 hover:text-orange-600 truncate"
                    >
                      {t.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 振り返りメモ */}
      <div className="card mt-6">
        <h3 className="font-semibold text-gray-700 mb-3">
          📝 振り返りメモ
          <span className="text-xs text-gray-400 font-normal ml-2">
            {format(weekStart, "M/d")}週（自動保存）
          </span>
        </h3>
        <textarea
          value={memo}
          onChange={(e) => handleMemoChange(e.target.value)}
          className="input resize-none w-full"
          rows={5}
          placeholder={`今週の振り返りを記録しましょう。

例：
- うまくいったこと
- 改善したいこと
- 来週の目標`}
        />
      </div>

      {/* クイックアクション */}
      <div className="flex gap-3 mt-6">
        <Link to="/tasks/new" className="btn-primary">
          + タスクを追加
        </Link>
        <Link to="/calendar" className="btn-secondary">
          カレンダーを見る
        </Link>
      </div>
    </div>
  );
}
