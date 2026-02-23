import api from "./client";
import type { AiSuggestResult, AiDecomposeResult } from "../types";

interface WeeklyReviewPayload {
  week_label: string;
  completed_tasks: { title: string; actual_minutes?: number; category?: string }[];
  overdue_tasks: { title: string; due_date?: string }[];
}

export const aiApi = {
  suggest: (title: string): Promise<AiSuggestResult> =>
    api.post<AiSuggestResult>("/ai/suggest", { title }).then((r) => r.data),

  weeklyReview: (payload: WeeklyReviewPayload): Promise<{ review_text: string }> =>
    api
      .post<{ review_text: string }>("/ai/weekly-review", payload)
      .then((r) => r.data),

  decompose: (title: string, memo?: string): Promise<AiDecomposeResult> =>
    api
      .post<AiDecomposeResult>("/ai/decompose", { title, memo })
      .then((r) => r.data),
};
