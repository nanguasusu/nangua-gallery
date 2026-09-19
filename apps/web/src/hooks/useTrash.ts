import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  permanentlyDeleteImages,
  removeImagesFromCache,
  restoreImages,
  trashImages,
} from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { useGalleryStore } from "@/stores/galleryStore"
import { useUIStore } from "@/stores/ui"
import type { ImageItem } from "@/types/image"

function finishSelection(ids: string[], images: ImageItem[]) {
  removeImagesFromCache(ids)
  const selectedKey = useUIStore.getState().selectedImageKey
  if (selectedKey && images.some((image) => image.key === selectedKey || image.id === selectedKey)) {
    useUIStore.getState().closeLightbox()
  }
  useGalleryStore.getState().exitSelectionMode()
}

export function useTrashImages() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (images: ImageItem[]) => trashImages(images.map((image) => image.id)),
    onSuccess: (deleted, images) => {
      finishSelection(deleted, images)
      useGalleryStore.getState().clearPendingDelete()
      void queryClient.invalidateQueries({ queryKey: ["images"] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.albums })
      toast.success(deleted.length === 1 ? "已移入回收站" : `已将 ${deleted.length} 张图片移入回收站`)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "无法移入回收站")
    },
  })
}

export function useRestoreImages() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (images: ImageItem[]) => restoreImages(images.map((image) => image.id)),
    onSuccess: (restored, images) => {
      finishSelection(restored, images)
      void queryClient.invalidateQueries({ queryKey: ["images"] })
      toast.success(restored.length === 1 ? "已恢复 1 张图片" : `已恢复 ${restored.length} 张图片`)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "无法恢复图片")
    },
  })
}

export function usePermanentDeleteImages() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (images: ImageItem[]) => permanentlyDeleteImages(images.map((image) => image.id)),
    onSuccess: (deleted, images) => {
      finishSelection(deleted, images)
      useGalleryStore.getState().clearPendingPermanentDelete()
      void queryClient.invalidateQueries({ queryKey: ["images"] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.albums })
      toast.success(deleted.length === 1 ? "已永久删除 1 张图片" : `已永久删除 ${deleted.length} 张图片`)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "永久删除失败")
    },
  })
}
