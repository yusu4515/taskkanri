import type { ScoreBreakdown } from "../../types";
import { useState } from "react";

interface Props {
  score: number;
  breakdown?: ScoreBreakdown | null;
}

export default function PriorityBadge({ score, breakdown }: Props) {
  const [showTooltip, setShowTooltip] = useState(false);

  const level =
    score >= 65 ? "red" : score >= 40 ? "yellow" : "green";

  const config = {
    red: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500", label: "至急" },
    yellow: { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500", label: "注意" },
    green: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500", label: "余裕" },
  }[level];

  return (
    <div className="relative inline-block">
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium cursor-help ${config.bg} ${config.text}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        {config.label}
        <span className="opacity-60">{score.toFixed(0)}点</span>
      </span>

      {showTooltip && breakdown && (
        <div className="absolute bottom-full left-0 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg p-3 z-50 shadow-xl">
          <p className="font-semibold mb-2">スコア内訳</p>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">緊急度 (40%)</span>
              <span>{breakdown.urgency.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">重要度 (35%)</span>
              <span>{breakdown.importance.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">所要時間 (15%)</span>
              <span>{breakdown.duration.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">依存関係 (10%)</span>
              <span>{breakdown.dependency.toFixed(1)}</span>
            </div>
            <div className="border-t border-gray-700 pt-1 mt-1 flex justify-between font-semibold">
              <span>合計</span>
              <span>{breakdown.total.toFixed(1)}</span>
            </div>
          </div>
          <div className="absolute -bottom-1.5 left-3 w-3 h-3 bg-gray-900 rotate-45" />
        </div>
      )}
    </div>
  );
}
