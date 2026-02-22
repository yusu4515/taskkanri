import api from "./client";
import type { User } from "../types";

export const usersApi = {
  me: () => api.get<User>("/users/me").then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch("/users/me/password", {
      current_password: currentPassword,
      new_password: newPassword,
    }),

  deleteAccount: () => api.delete("/users/me"),
};
