import { useCallback } from "react"
import { toast } from "sonner"
import { useGalleryStore } from "@/stores/galleryStore"
import { useUploadStore } from "@/stores/uploadStore"
import { partitionImageFiles } from "@/lib/file-validation"
import { useConfig } from "@/hooks/useConfig"
import { useUploadTargetAlbum } from "@/hooks/useUploadTargetAlbum"
import { DEFAULT_MAX_IMAGE_BYTES } from "@nangua/shared"

export function useUploadImages() {
  const enqueue = useUploadStore((state) => state.enqueue)
  const openUploadDialog = useGalleryStore((state) => state.openUploadDialog)
  const { albumId } = useUploadTargetAlbum()
  const config = useConfig()
  const maxBytes = config.data?.maxImageBytes ?? DEFAULT_MAX_IMAGE_BYTES

  const queueFiles = useCallback(async (files: File[], options?: { openDialog?: boolean }) => {
    const { accepted, rejected } = await partitionImageFiles(files, maxBytes)

    for (const item of rejected) {
      toast.error(`${item.file.name || "Image"}: ${item.message}`)
    }

    if (accepted.length === 0) {
      return
    }

    enqueue(accepted, albumId)
    if (options?.openDialog !== false) {
      openUploadDialog()
    }
  }, [enqueue, openUploadDialog, maxBytes, albumId])

  return { queueFiles }
}
