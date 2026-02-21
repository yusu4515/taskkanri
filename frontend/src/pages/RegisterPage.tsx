import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authApi } from "../api/auth";

interface FormValues {
  email: string;
  username: string;
  password: string;
  password_confirm: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>();

  const password = watch("password");

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      await authApi.register({
        email: values.email,
        username: values.username,
        password: values.password,
      });
      toast.success("アカウントを作成しました。ログインしてください。");
      navigate("/login");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") {
        toast.error(detail);
      } else if (Array.isArray(detail)) {
        toast.error(detail[0]?.msg || "入力内容を確認してください");
      } else {
        toast.error("登録に失敗しました");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">TaskKanri</h1>
          <p className="text-gray-600 mt-2">まずはアカウントを作成しましょう</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">新規登録</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                {...register("email", {
                  required: "入力してください",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "正しいメールアドレスを入力してください",
                  },
                })}
                type="email"
                className="input"
                placeholder="example@mail.com"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ユーザー名
              </label>
              <input
                {...register("username", {
                  required: "入力してください",
                  minLength: { value: 2, message: "2文字以上で入力してください" },
                  maxLength: { value: 30, message: "30文字以内で入力してください" },
                })}
                className="input"
                placeholder="tanaka_taro"
              />
              {errors.username && (
                <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <input
                {...register("password", {
                  required: "入力してください",
                  minLength: { value: 8, message: "8文字以上で入力してください" },
                  validate: (v) =>
                    (/[a-zA-Z]/.test(v) && /\d/.test(v)) ||
                    "英字と数字を各1文字以上含めてください",
                })}
                type="password"
                className="input"
                placeholder="8文字以上・英数字を含む"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                パスワード（確認）
              </label>
              <input
                {...register("password_confirm", {
                  required: "入力してください",
                  validate: (v) => v === password || "パスワードが一致しません",
                })}
                type="password"
                className="input"
                placeholder="もう一度入力"
              />
              {errors.password_confirm && (
                <p className="text-red-500 text-xs mt-1">{errors.password_confirm.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3"
            >
              {isLoading ? "登録中..." : "アカウントを作成"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            すでにアカウントをお持ちの方は{" "}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
