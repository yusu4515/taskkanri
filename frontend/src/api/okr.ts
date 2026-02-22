import api from "./client";
import type { Objective, KeyResult } from "../types";

export const okrApi = {
  listObjectives: () =>
    api.get<Objective[]>("/okr/objectives").then((r) => r.data),

  createObjective: (data: {
    title: string;
    description?: string;
    quarter: string;
    color?: string;
  }) => api.post<Objective>("/okr/objectives", data).then((r) => r.data),

  updateObjective: (
    id: number,
    data: Partial<{ title: string; description: string; quarter: string; color: string }>
  ) => api.patch<Objective>(`/okr/objectives/${id}`, data).then((r) => r.data),

  deleteObjective: (id: number) => api.delete(`/okr/objectives/${id}`),

  createKeyResult: (
    objectiveId: number,
    data: { title: string; target_value?: number; current_value?: number; unit?: string }
  ) =>
    api
      .post<KeyResult>(`/okr/objectives/${objectiveId}/key-results`, data)
      .then((r) => r.data),

  updateKeyResult: (
    id: number,
    data: Partial<{ title: string; target_value: number; current_value: number; unit: string }>
  ) => api.patch<KeyResult>(`/okr/key-results/${id}`, data).then((r) => r.data),

  deleteKeyResult: (id: number) => api.delete(`/okr/key-results/${id}`),
};
