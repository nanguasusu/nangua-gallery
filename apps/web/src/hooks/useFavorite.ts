import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { patchImageFavorite, patchImagesInCache, setImagesFavorite } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { ImageItem } from "@/types/image"

export function useToggleFavorite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { image: ImageItem; favorite: boolean }) =>
      patchImageFavorite(input.image.id, input.favorite),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["images"] })
      patchImagesInCache([input.image.id], { favorite: input.favorite })
    },
    onError: (error, input) => {
      patchImagesInCache([input.image.id], { favorite: input.image.favorite })
      toast.error(error instanceof Error ? error.message : "无法更新收藏")
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["images"] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.albums })
    },
  })
}

export function useSetFavorites() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { imageIds: string[]; favorite: boolean }) =>
      setImagesFavorite(input.imageIds, input.favorite),
    onSuccess: (_data, variables) => {
      patchImagesInCache(variables.imageIds, { favorite: variables.favorite })
      void queryClient.invalidateQueries({ queryKey: ["images"] })
      toast.success(variables.favorite ? "已加入收藏" : "已取消收藏")
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "无法更新收藏")
    },
  })
}
