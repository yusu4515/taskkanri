import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { isPast, isToday, addDays } from "date-fns";
import { tasksApi } from "../api/tasks";

const NOTIF_KEY = "taskkanri_notified_at";

export function useTaskNotifications() {
  const { data } = useQuery({
    queryKey: ["tasks", "", "", "score"],
    queryFn: () => tasksApi.list(),
  });

  useEffect(() => {
    if (!("Notification" in window)) return;
    if (!data?.tasks) return;

    // 1セッション中に1回だけ通知する（今日すでに通知済みならスキップ）
    const today = new Date().toDateString();
    if (sessionStorage.getItem(NOTIF_KEY) === today) return;

    const fire = (title: string, body: string) => {
      new Notification(title, { body, icon: "/favicon.ico" });
      sessionStorage.setItem(NOTIF_KEY, today);
    };

    const pending = data.tasks.filter(
      (t) => t.status !== "completed" && t.status !== "deleted"
    );

    const overdue = pending.filter(
      (t) => isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))
    );
    const dueToday = pending.filter((t) => isToday(new Date(t.due_date)));
    const dueTomorrow = pending.filter((t) => {
      const d = new Date(t.due_date);
      const tomorrow = addDays(new Date(), 1);
      return d.toDateString() === tomorrow.toDateString();
    });

    if (Notification.permission === "granted") {
      if (overdue.length > 0) {
        fire(
          "⚠ 期限超過のタスクがあります",
          `${overdue.length}件のタスクが期限を過ぎています`
        );
      } else if (dueToday.length > 0) {
        fire(
          "📅 今日期限のタスクがあります",
          `${dueToday.length}件のタスクが今日期限です`
        );
      } else if (dueTomorrow.length > 0) {
        fire(
          "🔔 明日期限のタスクがあります",
          `${dueTomorrow.length}件のタスクが明日期限です`
        );
      }
    } else if (Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        if (perm !== "granted") return;
        if (overdue.length > 0) {
          fire(
            "⚠ 期限超過のタスクがあります",
            `${overdue.length}件のタスクが期限を過ぎています`
          );
        } else if (dueToday.length > 0) {
          fire(
            "📅 今日期限のタスクがあります",
            `${dueToday.length}件のタスクが今日期限です`
          );
        }
      });
    }
  }, [data]);
}
