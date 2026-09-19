import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  addImagesToAlbum,
  createAlbum,
  deleteAlbum,
  fetchAlbum,
  fetchAlbums,
  removeImagesFromAlbum,
} from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"

export function useAlbums() {
  return useQuery({
    queryKey: queryKeys.albums,
    queryFn: ({ signal }) => fetchAlbums(signal),
    staleTime: 15_000,
  })
}

export function useAlbum(id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.album(id) : ["albums", "missing"],
    queryFn: ({ signal }) => fetchAlbum(id!, signal),
    enabled: Boolean(id),
    staleTime: 15_000,
  })
}

export function useCreateAlbum() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; description?: string }) => createAlbum(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.albums })
      toast.success("已创建相册")
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "无法创建相册")
    },
  })
}

export function useDeleteAlbum() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAlbum(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.albums })
      toast.success("已删除相册")
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "无法删除相册")
    },
  })
}

export function useAddImagesToAlbum() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { albumId: string; imageIds: string[] }) =>
      addImagesToAlbum(input.albumId, input.imageIds),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.albums })
      void queryClient.invalidateQueries({ queryKey: queryKeys.album(variables.albumId) })
      void queryClient.invalidateQueries({ queryKey: ["images"] })
      toast.success("已加入相册")
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "无法加入相册")
    },
  })
}

export function useRemoveImagesFromAlbum(albumId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (imageIds: string[]) => removeImagesFromAlbum(albumId, imageIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.albums })
      void queryClient.invalidateQueries({ queryKey: queryKeys.album(albumId) })
      void queryClient.invalidateQueries({ queryKey: ["images"] })
      toast.success("已从相册移除")
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "无法从相册移除")
    },
  })
}
