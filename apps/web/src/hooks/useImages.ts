import { useEffect, useRef } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { fetchImages } from "@/lib/api"
import { queryKeys, type ImageListFilter } from "@/lib/query-keys"
import type { ImageItem } from "@/types/image"

const MAX_EMPTY_PAGE_SKIPS = 8

function uniqueImages(items: ImageItem[]): ImageItem[] {
  const seen = new Set<string>()
  const unique: ImageItem[] = []

  for (const item of items) {
    if (seen.has(item.id) || seen.has(item.key)) {
      continue
    }
    seen.add(item.id)
    seen.add(item.key)
    unique.push(item)
  }

  return unique
}

export function useImages(filter: ImageListFilter = {}) {
  const emptyPageSkips = useRef(0)

  const query = useInfiniteQuery({
    queryKey: queryKeys.images(filter),
    queryFn: ({ pageParam, signal }) =>
      fetchImages({
        ...filter,
        cursor: pageParam,
        limit: 50,
        signal,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || !lastPage.cursor) {
        return undefined
      }
      return lastPage.cursor
    },
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
  })

  const {
    data,
    hasNextPage,
    isFetchingNextPage,
    isError,
    fetchNextPage,
  } = query
  const lastPage = data?.pages.at(-1)

  useEffect(() => {
    emptyPageSkips.current = 0
  }, [filter.albumId, filter.deleted, filter.favorite, filter.search, filter.sort])

  useEffect(() => {
    if (!lastPage) {
      return
    }

    if (lastPage.items.length > 0) {
      emptyPageSkips.current = 0
      return
    }

    if (
      lastPage.hasMore &&
      lastPage.cursor &&
      hasNextPage &&
      !isFetchingNextPage &&
      !isError &&
      emptyPageSkips.current < MAX_EMPTY_PAGE_SKIPS
    ) {
      emptyPageSkips.current += 1
      void fetchNextPage()
    }
  }, [lastPage, hasNextPage, isFetchingNextPage, isError, fetchNextPage])

  const images: ImageItem[] = uniqueImages(data?.pages.flatMap((page) => page.items) ?? [])

  return {
    ...query,
    images,
  }
}
