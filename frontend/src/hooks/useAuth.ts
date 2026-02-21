import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/auth";
import type { User } from "../types";

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["me"],
    queryFn: async () => {
      const token = localStorage.getItem("access_token");
      if (!token) return null;
      return authApi.me().catch(() => null);
    },
    staleTime: 5 * 60 * 1000,
  });

  const isAuthenticated = !!user;

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    queryClient.clear();
    window.location.href = "/login";
  };

  return { user, isLoading, isAuthenticated, logout };
}
