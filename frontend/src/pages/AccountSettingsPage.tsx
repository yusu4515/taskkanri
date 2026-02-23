import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../api/users";
import { useAuth } from "../hooks/useAuth";
import { useAiStatus } from "../hooks/useAiStatus";

const AI_PROVIDERS = [
  { value: "openai", label: "OpenAI (ChatGPT)", hint: "https://platform.openai.com/api-keys" },
  { value: "anthropic", label: "Anthropic (Claude)", hint: "https://console.anthropic.com/account/keys" },
  { value: "gemini", label: "Google (Gemini)", hint: "https://aistudio.google.com/app/apikey" },
] as const;

export default function AccountSettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasKey, provider: currentProvider } = useAiStatus();

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  // AI key state
  const [aiProvider, setAiProvider] = useState<string>("openai");
  const [aiKey, setAiKey] = useState("");
  const [savingAiKey, setSavingAiKey] = useState(false);
  const [deletingAiKey, setDeletingAiKey] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      toast.error("新しいパスワードが一致しません");
      return;
    }
    setChangingPw(true);
    try {
      await usersApi.changePassword(currentPw, newPw);
      toast.success("パスワードを変更しました");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "変更に失敗しました");
    } finally {
      setChangingPw(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== user?.username) {
      toast.error("ユーザー名が一致しません");
      return;
    }
    setDeleting(true);
    try {
      await usersApi.deleteAccount();
      toast.success("アカウントを削除しました");
      logout();
      navigate("/login");
    } catch {
      toast.error("削除に失敗しました");
      setDeleting(false);
    }
  };

  const handleSaveAiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiKey.trim()) {
      toast.error("APIキーを入力してください");
      return;
    }
    setSavingAiKey(true);
    try {
      await usersApi.setAiKey(aiProvider, aiKey.trim());
      toast.success("AIキーを登録しました");
      setAiKey("");
      queryClient.invalidateQueries({ queryKey: ["ai-key-status"] });
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "登録に失敗しました");
    } finally {
      setSavingAiKey(false);
    }
  };

  const handleDeleteAiKey = async () => {
    setDeletingAiKey(true);
    try {
      await usersApi.deleteAiKey();
      toast.success("AIキーを削除しました");
      queryClient.invalidateQueries({ queryKey: ["ai-key-status"] });
    } catch {
      toast.error("削除に失敗しました");
    } finally {
      setDeletingAiKey(false);
    }
  };

  const selectedProviderInfo = AI_PROVIDERS.find((p) => p.value === aiProvider);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/dashboard" className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
          ← 戻る
        </Link>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">アカウント設定</h2>
      </div>

      {/* ユーザー情報 */}
      <div className="card mb-6 dark:bg-gray-800 dark:border-gray-700">
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">プロフィール</h3>
        <div className="space-y-2 text-sm">
          <div className="flex gap-4">
            <span className="text-gray-500 dark:text-gray-400 w-24">ユーザー名</span>
            <span className="text-gray-800 dark:text-gray-100 font-medium">{user?.username}</span>
          </div>
          <div className="flex gap-4">
            <span className="text-gray-500 dark:text-gray-400 w-24">メール</span>
            <span className="text-gray-800 dark:text-gray-100">{user?.email}</span>
          </div>
        </div>
      </div>

      {/* AI API キー設定 */}
      <div className="card mb-6 dark:bg-gray-800 dark:border-gray-700">
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-1">AI API キー</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          自身のAI APIキーを登録するとAI機能が解放されます。キーはサーバーに安全に保存され、APIリクエストにのみ使用されます。
        </p>

        {hasKey ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-sm">
              <span className="text-green-600 dark:text-green-400 font-medium">✓ 登録済み</span>
              <span className="text-green-700 dark:text-green-300">
                ({AI_PROVIDERS.find((p) => p.value === currentProvider)?.label ?? currentProvider})
              </span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              キーを変更する場合は、下のフォームで新しいキーを上書き登録してください。
            </div>
            <button
              onClick={handleDeleteAiKey}
              disabled={deletingAiKey}
              className="text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-40"
            >
              {deletingAiKey ? "削除中..." : "APIキーを削除する"}
            </button>
          </div>
        ) : null}

        <form onSubmit={handleSaveAiKey} className="space-y-3 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              AIプロバイダ
            </label>
            <select
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value)}
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            >
              {AI_PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              APIキー
            </label>
            <input
              type="password"
              value={aiKey}
              onChange={(e) => setAiKey(e.target.value)}
              placeholder="sk-... または AIza..."
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-500"
            />
            {selectedProviderInfo && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                APIキーの取得:{" "}
                <a
                  href={selectedProviderInfo.hint}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {selectedProviderInfo.hint}
                </a>
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={savingAiKey}
            className="btn-primary"
          >
            {savingAiKey ? "登録中..." : hasKey ? "上書き登録する" : "登録する"}
          </button>
        </form>
      </div>

      {/* パスワード変更 */}
      <div className="card mb-6 dark:bg-gray-800 dark:border-gray-700">
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-4">パスワード変更</h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              現在のパスワード
            </label>
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              新しいパスワード
            </label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              required
              minLength={8}
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">8文字以上、英字と数字を含む</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              新しいパスワード（確認）
            </label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              required
            />
          </div>
          <button
            type="submit"
            disabled={changingPw}
            className="btn-primary"
          >
            {changingPw ? "変更中..." : "パスワードを変更する"}
          </button>
        </form>
      </div>

      {/* 危険ゾーン */}
      <div className="card border-red-200 dark:bg-gray-800 dark:border-red-700">
        <h3 className="font-semibold text-red-600 dark:text-red-400 mb-2">アカウント削除</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          アカウントを削除すると、すべてのタスクと設定が失われます。この操作は取り消せません。
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              確認のため、ユーザー名「<strong>{user?.username}</strong>」を入力してください
            </label>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="input border-red-200 dark:bg-gray-700 dark:border-red-700 dark:text-gray-100"
              placeholder={user?.username}
            />
          </div>
          <button
            onClick={handleDeleteAccount}
            disabled={deleting || deleteConfirm !== user?.username}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40 text-sm font-medium"
          >
            {deleting ? "削除中..." : "アカウントを完全に削除する"}
          </button>
        </div>
      </div>
    </div>
  );
}
