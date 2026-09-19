import { useCallback } from "react"
import { toast } from "sonner"
import { useGalleryStore } from "@/stores/galleryStore"
import { useUploadStore } from "@/stores/uploadStore"
import { partitionImageFiles } from "@/lib/file-validation"

export function useUploadImages() {
  const enqueue = useUploadStore((state) => state.enqueue)
  const openUploadDialog = useGalleryStore((state) => state.openUploadDialog)

  const queueFiles = useCallback(async (files: File[], options?: { openDialog?: boolean }) => {
    const { accepted, rejected } = await partitionImageFiles(files)

    for (const item of rejected) {
      toast.error(`${item.file.name || "Image"}: ${item.message}`)
    }

    if (accepted.length === 0) {
      return
    }

    enqueue(accepted)
    if (options?.openDialog !== false) {
      openUploadDialog()
    }
  }, [enqueue, openUploadDialog])

  return { queueFiles }
}
