import { useState, useEffect, useRef, useCallback } from "react";

type Phase = "work" | "break";

const WORK_SEC = 25 * 60;
const BREAK_SEC = 5 * 60;

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
  } catch {
    // AudioContext not available
  }
}

export default function PomodoroTimer() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("work");
  const [remaining, setRemaining] = useState(WORK_SEC);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback((nextPhase: Phase) => {
    setPhase(nextPhase);
    setRemaining(nextPhase === "work" ? WORK_SEC : BREAK_SEC);
    setRunning(false);
  }, []);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          beep();
          if (phase === "work") {
            setSessions((s) => s + 1);
            if (Notification.permission === "granted") {
              new Notification("ポモドーロ完了！", {
                body: "5分間休憩しましょう",
                icon: "/favicon.ico",
              });
            }
            reset("break");
          } else {
            if (Notification.permission === "granted") {
              new Notification("休憩終了！", {
                body: "次のポモドーロを始めましょう",
                icon: "/favicon.ico",
              });
            }
            reset("work");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, phase, reset]);

  const progress =
    phase === "work"
      ? ((WORK_SEC - remaining) / WORK_SEC) * 100
      : ((BREAK_SEC - remaining) / BREAK_SEC) * 100;

  const circumference = 2 * Math.PI * 36;

  return (
    <>
      {/* フローティングボタン */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-all z-50 ${
          running
            ? "bg-red-500 text-white animate-pulse"
            : "bg-white border-2 border-gray-200 text-gray-600 hover:border-blue-400"
        }`}
        title="ポモドーロタイマー"
      >
        🍅
      </button>

      {/* パネル */}
      {open && (
        <div className="fixed bottom-24 right-6 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {/* ヘッダー */}
          <div
            className={`px-4 py-3 text-white text-sm font-semibold flex items-center justify-between ${
              phase === "work"
                ? "bg-gradient-to-r from-red-500 to-orange-400"
                : "bg-gradient-to-r from-green-500 to-teal-400"
            }`}
          >
            <span>{phase === "work" ? "🍅 作業中" : "☕ 休憩中"}</span>
            <span className="text-xs opacity-80">
              {sessions}セッション完了
            </span>
          </div>

          {/* タイマー円グラフ */}
          <div className="flex flex-col items-center py-6">
            <div className="relative w-24 h-24">
              <svg
                className="w-24 h-24 -rotate-90"
                viewBox="0 0 80 80"
              >
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="6"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  fill="none"
                  stroke={phase === "work" ? "#ef4444" : "#10b981"}
                  strokeWidth="6"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - progress / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-gray-800 tabular-nums">
                  {formatTime(remaining)}
                </span>
              </div>
            </div>

            {/* コントロール */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setRunning((r) => !r)}
                className={`px-5 py-2 rounded-lg font-semibold text-sm transition-colors ${
                  running
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    : "bg-red-500 text-white hover:bg-red-600"
                }`}
              >
                {running ? "⏸ 一時停止" : "▶ 開始"}
              </button>
              <button
                onClick={() => reset(phase)}
                className="px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors"
                title="リセット"
              >
                ↺
              </button>
            </div>

            {/* フェーズ切り替え */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => reset("work")}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  phase === "work"
                    ? "bg-red-100 text-red-600 font-semibold"
                    : "text-gray-400 hover:bg-gray-100"
                }`}
              >
                作業 25分
              </button>
              <button
                onClick={() => reset("break")}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  phase === "break"
                    ? "bg-green-100 text-green-600 font-semibold"
                    : "text-gray-400 hover:bg-gray-100"
                }`}
              >
                休憩 5分
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
