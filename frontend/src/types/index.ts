export type TaskStatus = "pending" | "in_progress" | "completed" | "deleted";
export type TaskCategory =
  | "legal"
  | "accounting"
  | "general_affairs"
  | "hr"
  | "other";
export type PriorityLevel = "red" | "yellow" | "green";

export interface ScoreBreakdown {
  urgency: number;
  importance: number;
  duration: number;
  dependency: number;
  total: number;
}

export interface Task {
  id: number;
  title: string;
  due_date: string;
  importance: number;
  estimated_minutes: number | null;
  category: TaskCategory | null;
  memo: string | null;
  depends_on_id: number | null;
  status: TaskStatus;
  today_focus: boolean;
  today_focus_approved: boolean;
  priority_score: number;
  score_breakdown: ScoreBreakdown | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TaskCreate {
  title: string;
  due_date: string;
  importance?: number;
  estimated_minutes?: number | null;
  category?: TaskCategory | null;
  memo?: string | null;
  depends_on_id?: number | null;
}

export interface TaskUpdate {
  title?: string;
  due_date?: string;
  importance?: number;
  estimated_minutes?: number | null;
  category?: TaskCategory | null;
  memo?: string | null;
  depends_on_id?: number | null;
  status?: TaskStatus;
}

export interface TodayFocusResponse {
  tasks: Task[];
  date: string;
}

export interface TaskListResponse {
  tasks: Task[];
  total: number;
}

export interface User {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface DashboardSummary {
  total: number;
  completed: number;
  overdue: number;
  today_due: number;
  today_completed: number;
  achievement_rate: number;
  category_distribution: { category: string; count: number }[];
  weekly_completed: { date: string; count: number }[];
}

export const CATEGORY_LABELS: Record<TaskCategory | "other", string> = {
  legal: "法務",
  accounting: "経理",
  general_affairs: "総務",
  hr: "人事",
  other: "その他",
};

export const ESTIMATED_MINUTES_OPTIONS = [
  { value: 15, label: "15分" },
  { value: 30, label: "30分" },
  { value: 60, label: "1時間" },
  { value: 90, label: "1時間30分" },
  { value: 120, label: "2時間" },
  { value: 180, label: "3時間" },
  { value: 240, label: "4時間" },
  { value: 480, label: "半日（8時間）" },
];
