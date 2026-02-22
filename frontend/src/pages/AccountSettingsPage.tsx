import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { usersApi } from "../api/users";
import { useAuth } from "../hooks/useAuth";

export default function AccountSettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

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

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/dashboard" className="text-gray-400 hover:text-gray-600">
          ← 戻る
        </Link>
        <h2 className="text-2xl font-bold text-gray-800">アカウント設定</h2>
      </div>

      {/* ユーザー情報 */}
      <div className="card mb-6">
        <h3 className="font-semibold text-gray-700 mb-3">プロフィール</h3>
        <div className="space-y-2 text-sm">
          <div className="flex gap-4">
            <span className="text-gray-500 w-24">ユーザー名</span>
            <span className="text-gray-800 font-medium">{user?.username}</span>
          </div>
          <div className="flex gap-4">
            <span className="text-gray-500 w-24">メール</span>
            <span className="text-gray-800">{user?.email}</span>
          </div>
        </div>
      </div>

      {/* パスワード変更 */}
      <div className="card mb-6">
        <h3 className="font-semibold text-gray-700 mb-4">パスワード変更</h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              現在のパスワード
            </label>
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              新しいパスワード
            </label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="input"
              required
              minLength={8}
            />
            <p className="text-xs text-gray-400 mt-1">8文字以上、英字と数字を含む</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              新しいパスワード（確認）
            </label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="input"
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
      <div className="card border-red-200">
        <h3 className="font-semibold text-red-600 mb-2">アカウント削除</h3>
        <p className="text-sm text-gray-500 mb-4">
          アカウントを削除すると、すべてのタスクと設定が失われます。この操作は取り消せません。
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              確認のため、ユーザー名「<strong>{user?.username}</strong>」を入力してください
            </label>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="input border-red-200"
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
