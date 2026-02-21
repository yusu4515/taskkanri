import api from "./client";
import type {
  Task,
  TaskCreate,
  TaskListResponse,
  TaskUpdate,
  TodayFocusResponse,
} from "../types";

export const tasksApi = {
  list: (params?: { status?: string; category?: string; sort?: string; search?: string }) =>
    api.get<TaskListResponse>("/tasks", { params }).then((r) => r.data),

  create: (data: TaskCreate) =>
    api.post<Task>("/tasks", data).then((r) => r.data),

  get: (id: number) =>
    api.get<Task>(`/tasks/${id}`).then((r) => r.data),

  update: (id: number, data: TaskUpdate) =>
    api.patch<Task>(`/tasks/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    api.delete(`/tasks/${id}`),

  complete: (id: number) =>
    api.patch<Task>(`/tasks/${id}`, { status: "completed" }).then((r) => r.data),

  uncomplete: (id: number) =>
    api.patch<Task>(`/tasks/${id}`, { status: "pending" }).then((r) => r.data),

  start: (id: number) =>
    api.patch<Task>(`/tasks/${id}`, { status: "in_progress" }).then((r) => r.data),

  getTodayFocus: () =>
    api.get<TodayFocusResponse>("/tasks/today-focus").then((r) => r.data),

  approveTodayFocus: () =>
    api.post("/tasks/today-focus/approve").then((r) => r.data),

  reorder: (taskIds: number[]) =>
    api.post("/tasks/reorder", { task_ids: taskIds }).then((r) => r.data),
};
