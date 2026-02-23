import api from "./client";
import type { User, AiKeyStatus } from "../types";

export const usersApi = {
  me: () => api.get<User>("/users/me").then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch("/users/me/password", {
      current_password: currentPassword,
      new_password: newPassword,
    }),

  deleteAccount: () => api.delete("/users/me"),

  getAiKeyStatus: () =>
    api.get<AiKeyStatus>("/users/me/ai-key/status").then((r) => r.data),

  setAiKey: (provider: string, api_key: string) =>
    api.put("/users/me/ai-key", { provider, api_key }),

  deleteAiKey: () => api.delete("/users/me/ai-key"),
};
