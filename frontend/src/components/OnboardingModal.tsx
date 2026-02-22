import { useState } from "react";
import { Link } from "react-router-dom";

const STEPS = [
  {
    icon: "👋",
    title: "タスカンへようこそ！",
    desc: "タスカンは、業務タスクの優先順位を自動計算してくれるツールです。重要度・緊急度・依存関係を考慮して、今やるべきタスクを教えてくれます。",
  },
  {
    icon: "⭐",
    title: "Today Focus",
    desc: "毎日ダッシュボードに「今日やるべきタスク TOP3」が表示されます。朝一番に確認して承認しましょう。承認すると集中して取り組めます。",
  },
  {
    icon: "🍅",
    title: "ポモドーロタイマー",
    desc: "25分集中 → 5分休憩のサイクルで仕事の効率が上がります。画面右下の 🍅 ボタンでいつでも使えます。",
  },
  {
    icon: "🎯",
    title: "OKRで大きな目標を管理",
    desc: "四半期ごとの目標（Objective）とその達成基準（Key Results）を設定できます。日々のタスクとつなげて、大きな成果を目指しましょう。",
  },
];

interface Props {
  onClose: () => void;
}

export default function OnboardingModal({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-8 relative">
        {/* Skip */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 text-xl"
          aria-label="閉じる"
        >
          ×
        </button>

        {/* Content */}
        <div className="text-center mb-8">
          <p className="text-7xl mb-4">{STEPS[step].icon}</p>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3">
            {STEPS[step].title}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            {STEPS[step].desc}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-6 bg-blue-500"
                  : "w-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300"
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          {isLast ? (
            <Link
              to="/tasks/new"
              onClick={onClose}
              className="btn-primary flex-1 text-center"
            >
              最初のタスクを作成する
            </Link>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="btn-primary flex-1"
            >
              次へ →
            </button>
          )}
          <button onClick={onClose} className="btn-secondary px-4 text-sm">
            {isLast ? "閉じる" : "スキップ"}
          </button>
        </div>
      </div>
    </div>
  );
}
