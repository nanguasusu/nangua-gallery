import { useQuery } from "@tanstack/react-query"
import { fetchSession } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"

export function useSession() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: ({ signal }) => fetchSession(signal),
    retry: false,
    staleTime: 30_000,
  })
}
