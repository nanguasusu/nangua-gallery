import { useQuery } from "@tanstack/react-query"
import { fetchConfig } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"

export function useConfig() {
  return useQuery({
    queryKey: queryKeys.config,
    queryFn: ({ signal }) => fetchConfig(signal),
    staleTime: 60_000,
    retry: 1,
  })
}
