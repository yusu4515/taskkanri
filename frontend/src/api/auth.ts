import api from "./client";
import type { TokenResponse, User } from "../types";

export const authApi = {
  register: (data: { email: string; username: string; password: string }) =>
    api.post<User>("/auth/register", data).then((r) => r.data),

  login: (data: { identifier: string; password: string; remember_me: boolean }) =>
    api.post<TokenResponse>("/auth/login", data).then((r) => r.data),

  me: () => api.get<User>("/users/me").then((r) => r.data),
};
