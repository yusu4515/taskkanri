export type TaskStatus = "pending" | "in_progress" | "completed" | "deleted";
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
  actual_minutes: number | null;
  category: string | null;
  memo: string | null;
  depends_on_id: number | null;
  parent_task_id: number | null;
  recurrence: string | null;
  manual_order: number | null;
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
  actual_minutes?: number | null;
  category?: string | null;
  memo?: string | null;
  depends_on_id?: number | null;
  parent_task_id?: number | null;
  recurrence?: string | null;
}

export interface TaskUpdate {
  title?: string;
  due_date?: string;
  importance?: number;
  estimated_minutes?: number | null;
  actual_minutes?: number | null;
  category?: string | null;
  memo?: string | null;
  depends_on_id?: number | null;
  parent_task_id?: number | null;
  recurrence?: string | null;
  manual_order?: number | null;
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
