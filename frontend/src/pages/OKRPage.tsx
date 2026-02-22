import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { okrApi } from "../api/okr";
import type { Objective, KeyResult } from "../types";

const now = new Date();
const CURRENT_QUARTER = `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;

const QUARTER_OPTIONS = Array.from({ length: 8 }, (_, i) => {
  const date = new Date(now.getFullYear(), now.getMonth() - 6 + i * 3);
  const q = Math.ceil((date.getMonth() + 1) / 3);
  return `${date.getFullYear()}-Q${q}`;
}).filter((v, i, a) => a.indexOf(v) === i);

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

type ObjForm = { title: string; description: string; quarter: string; color: string };
type KrForm = { title: string; target_value: string; current_value: string; unit: string };

const emptyObjForm = (): ObjForm => ({
  title: "",
  description: "",
  quarter: CURRENT_QUARTER,
  color: COLORS[0],
});
const emptyKrForm = (): KrForm => ({ title: "", target_value: "", current_value: "", unit: "" });

function krProgress(kr: KeyResult) {
  if (!kr.target_value) return 0;
  return Math.min(100, Math.round(((kr.current_value ?? 0) / kr.target_value) * 100));
}

function objProgress(obj: Objective) {
  if (!obj.key_results.length) return 0;
  return Math.round(
    obj.key_results.reduce((s, kr) => s + krProgress(kr), 0) / obj.key_results.length
  );
}

export default function OKRPage() {
  const queryClient = useQueryClient();

  const [showObjForm, setShowObjForm] = useState(false);
  const [editingObj, setEditingObj] = useState<Objective | null>(null);
  const [objForm, setObjForm] = useState<ObjForm>(emptyObjForm);

  const [addingKrForId, setAddingKrForId] = useState<number | null>(null);
  const [editingKr, setEditingKr] = useState<KeyResult | null>(null);
  const [krForm, setKrForm] = useState<KrForm>(emptyKrForm);

  const [filterQuarter, setFilterQuarter] = useState(CURRENT_QUARTER);

  const { data: objectives = [], isLoading } = useQuery({
    queryKey: ["objectives"],
    queryFn: okrApi.listObjectives,
  });

  const filtered = objectives.filter((o) => o.quarter === filterQuarter);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["objectives"] });

  const createObj = useMutation({
    mutationFn: () => okrApi.createObjective(objForm),
    onSuccess: () => {
      invalidate();
      setShowObjForm(false);
      setObjForm(emptyObjForm());
      toast.success("目標を追加しました");
    },
    onError: () => toast.error("追加に失敗しました"),
  });

  const updateObj = useMutation({
    mutationFn: () => okrApi.updateObjective(editingObj!.id, objForm),
    onSuccess: () => {
      invalidate();
      setShowObjForm(false);
      setEditingObj(null);
      toast.success("目標を更新しました");
    },
  });

  const deleteObj = useMutation({
    mutationFn: (id: number) => okrApi.deleteObjective(id),
    onSuccess: () => { invalidate(); toast.success("削除しました"); },
  });

  const createKr = useMutation({
    mutationFn: (objectiveId: number) =>
      okrApi.createKeyResult(objectiveId, {
        title: krForm.title,
        target_value: krForm.target_value ? Number(krForm.target_value) : undefined,
        current_value: krForm.current_value ? Number(krForm.current_value) : undefined,
        unit: krForm.unit || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setAddingKrForId(null);
      setKrForm(emptyKrForm());
      toast.success("KRを追加しました");
    },
  });

  const updateKr = useMutation({
    mutationFn: () =>
      okrApi.updateKeyResult(editingKr!.id, {
        title: krForm.title,
        target_value: krForm.target_value ? Number(krForm.target_value) : undefined,
        current_value: krForm.current_value ? Number(krForm.current_value) : undefined,
        unit: krForm.unit || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setEditingKr(null);
      setKrForm(emptyKrForm());
      toast.success("KRを更新しました");
    },
  });

  const deleteKr = useMutation({
    mutationFn: (id: number) => okrApi.deleteKeyResult(id),
    onSuccess: () => { invalidate(); toast.success("削除しました"); },
  });

  const openAddObj = () => {
    setEditingObj(null);
    setObjForm(emptyObjForm());
    setShowObjForm(true);
  };

  const openEditObj = (obj: Objective) => {
    setEditingObj(obj);
    setObjForm({
      title: obj.title,
      description: obj.description ?? "",
      quarter: obj.quarter,
      color: obj.color ?? COLORS[0],
    });
    setShowObjForm(true);
  };

  const openAddKr = (objectiveId: number) => {
    setAddingKrForId(objectiveId);
    setEditingKr(null);
    setKrForm(emptyKrForm());
  };

  const openEditKr = (kr: KeyResult) => {
    setEditingKr(kr);
    setAddingKrForId(null);
    setKrForm({
      title: kr.title,
      target_value: kr.target_value?.toString() ?? "",
      current_value: kr.current_value?.toString() ?? "",
      unit: kr.unit ?? "",
    });
  };

  const handleObjSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!objForm.title.trim()) return;
    if (editingObj) updateObj.mutate();
    else createObj.mutate();
  };

  const handleKrSubmit = (e: React.FormEvent, objectiveId: number) => {
    e.preventDefault();
    if (!krForm.title.trim()) return;
    if (editingKr) updateKr.mutate();
    else createKr.mutate(objectiveId);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ← 戻る
          </Link>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            🎯 OKR 目標管理
          </h2>
        </div>
        <button onClick={openAddObj} className="btn-primary text-sm">
          + 目標を追加
        </button>
      </div>

      {/* Quarter filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {QUARTER_OPTIONS.map((q) => (
          <button
            key={q}
            onClick={() => setFilterQuarter(q)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterQuarter === q
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            {q}
            {q === CURRENT_QUARTER && " (現在)"}
          </button>
        ))}
      </div>

      {/* Add/Edit Objective Form */}
      {showObjForm && (
        <div className="card mb-6 border-blue-100 dark:border-blue-900/50">
          <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-4">
            {editingObj ? "目標を編集" : "新しい目標 (Objective)"}
          </h3>
          <form onSubmit={handleObjSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                目標タイトル <span className="text-red-500">*</span>
              </label>
              <input
                value={objForm.title}
                onChange={(e) => setObjForm((f) => ({ ...f, title: e.target.value }))}
                className="input"
                required
                placeholder="例：顧客満足度をチーム最高水準にする"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  四半期
                </label>
                <select
                  value={objForm.quarter}
                  onChange={(e) => setObjForm((f) => ({ ...f, quarter: e.target.value }))}
                  className="input"
                >
                  {QUARTER_OPTIONS.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  カラー
                </label>
                <div className="flex gap-2 mt-1.5">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setObjForm((f) => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                        objForm.color === c
                          ? "border-gray-700 dark:border-gray-200 scale-110"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                説明（任意）
              </label>
              <textarea
                value={objForm.description}
                onChange={(e) => setObjForm((f) => ({ ...f, description: e.target.value }))}
                className="input resize-none"
                rows={2}
                placeholder="目標の詳細・背景など"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="btn-primary text-sm"
                disabled={createObj.isPending || updateObj.isPending}
              >
                {editingObj ? "更新する" : "追加する"}
              </button>
              <button
                type="button"
                onClick={() => { setShowObjForm(false); setEditingObj(null); }}
                className="btn-secondary text-sm"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="card h-40 animate-pulse bg-gray-100 dark:bg-gray-700" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-gray-400 dark:text-gray-500">
          <p className="text-5xl mb-3">🎯</p>
          <p className="font-medium">{filterQuarter} の目標がまだありません</p>
          <p className="text-sm mt-1">「+ 目標を追加」から OKR を設定しましょう</p>
          <button onClick={openAddObj} className="mt-4 btn-primary text-sm">
            + 目標を追加
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((obj) => {
            const progress = objProgress(obj);
            const color = obj.color ?? COLORS[0];
            return (
              <div
                key={obj.id}
                className="card"
                style={{ borderLeftColor: color, borderLeftWidth: 4 }}
              >
                {/* Objective header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base">
                      {obj.title}
                    </h3>
                    {obj.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {obj.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    <span className="text-lg font-bold" style={{ color }}>
                      {progress}%
                    </span>
                    <button
                      onClick={() => openEditObj(obj)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                      title="編集"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`目標「${obj.title}」とそのKRをすべて削除しますか？`))
                          deleteObj.mutate(obj.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      title="削除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full mb-4 overflow-hidden">
                  <div
                    className="h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%`, backgroundColor: color }}
                  />
                </div>

                {/* Key Results */}
                <div className="space-y-3 pl-1">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Key Results
                  </p>
                  {obj.key_results.map((kr) => {
                    const krProg = krProgress(kr);

                    if (editingKr?.id === kr.id) {
                      return (
                        <form
                          key={kr.id}
                          onSubmit={(e) => handleKrSubmit(e, obj.id)}
                          className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 space-y-2 border border-blue-100 dark:border-blue-800"
                        >
                          <input
                            value={krForm.title}
                            onChange={(e) => setKrForm((f) => ({ ...f, title: e.target.value }))}
                            className="input text-sm"
                            placeholder="KRのタイトル"
                            required
                            autoFocus
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-xs text-gray-500 block mb-0.5">現在値</label>
                              <input
                                value={krForm.current_value}
                                onChange={(e) => setKrForm((f) => ({ ...f, current_value: e.target.value }))}
                                type="number"
                                className="input text-sm"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-0.5">目標値</label>
                              <input
                                value={krForm.target_value}
                                onChange={(e) => setKrForm((f) => ({ ...f, target_value: e.target.value }))}
                                type="number"
                                className="input text-sm"
                                placeholder="100"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-0.5">単位</label>
                              <input
                                value={krForm.unit}
                                onChange={(e) => setKrForm((f) => ({ ...f, unit: e.target.value }))}
                                className="input text-sm"
                                placeholder="例: 件, %"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              className="btn-primary text-xs px-3 py-1.5"
                              disabled={updateKr.isPending}
                            >
                              更新
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingKr(null)}
                              className="btn-secondary text-xs px-3 py-1.5"
                            >
                              キャンセル
                            </button>
                          </div>
                        </form>
                      );
                    }

                    return (
                      <div
                        key={kr.id}
                        className="pl-3 border-l-2 border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                            {kr.title}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            {kr.target_value ? (
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {kr.current_value ?? 0}{kr.unit ?? ""} /{" "}
                                {kr.target_value}{kr.unit ?? ""}
                              </span>
                            ) : null}
                            <span
                              className="text-xs font-bold"
                              style={{ color }}
                            >
                              {krProg}%
                            </span>
                            <button
                              onClick={() => openEditKr(kr)}
                              className="text-gray-300 hover:text-blue-500 dark:text-gray-600 dark:hover:text-blue-400 text-xs"
                              title="編集"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => {
                                if (confirm("このKRを削除しますか？"))
                                  deleteKr.mutate(kr.id);
                              }}
                              className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 text-sm leading-none"
                              title="削除"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                        {kr.target_value ? (
                          <div className="mt-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-1.5 rounded-full transition-all"
                              style={{
                                width: `${krProg}%`,
                                backgroundColor: color,
                              }}
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  {/* Add KR form */}
                  {addingKrForId === obj.id ? (
                    <form
                      onSubmit={(e) => handleKrSubmit(e, obj.id)}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-2 border border-gray-200 dark:border-gray-600"
                    >
                      <input
                        value={krForm.title}
                        onChange={(e) => setKrForm((f) => ({ ...f, title: e.target.value }))}
                        className="input text-sm"
                        placeholder="例：NPS スコアを 60 以上にする"
                        required
                        autoFocus
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-gray-500 block mb-0.5">現在値</label>
                          <input
                            value={krForm.current_value}
                            onChange={(e) => setKrForm((f) => ({ ...f, current_value: e.target.value }))}
                            type="number"
                            className="input text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-0.5">目標値</label>
                          <input
                            value={krForm.target_value}
                            onChange={(e) => setKrForm((f) => ({ ...f, target_value: e.target.value }))}
                            type="number"
                            className="input text-sm"
                            placeholder="100"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-0.5">単位</label>
                          <input
                            value={krForm.unit}
                            onChange={(e) => setKrForm((f) => ({ ...f, unit: e.target.value }))}
                            className="input text-sm"
                            placeholder="例: 件, %"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="btn-primary text-xs px-3 py-1.5"
                          disabled={createKr.isPending}
                        >
                          追加
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAddingKrForId(null); setKrForm(emptyKrForm()); }}
                          className="btn-secondary text-xs px-3 py-1.5"
                        >
                          キャンセル
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => openAddKr(obj.id)}
                      className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 mt-2"
                    >
                      + KRを追加
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
