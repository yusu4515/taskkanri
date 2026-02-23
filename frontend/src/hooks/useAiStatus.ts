import { useQuery } from "@tanstack/react-query";
import { usersApi } from "../api/users";
import type { AiProvider } from "../types";

export function useAiStatus() {
  const { data, isLoading } = useQuery({
    queryKey: ["ai-key-status"],
    queryFn: () => usersApi.getAiKeyStatus(),
    staleTime: 5 * 60 * 1000,
  });

  return {
    hasKey: data?.has_key ?? false,
    provider: (data?.provider ?? null) as AiProvider | null,
    isLoading,
  };
}
