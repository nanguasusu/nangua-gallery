import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UploadDropzone } from "@/components/upload/UploadDropzone"
import { useGalleryStore } from "@/stores/galleryStore"
import { useUploadImages } from "@/hooks/useUploadImages"

export function UploadDialog() {
  const open = useGalleryStore((state) => state.uploadDialogOpen)
  const closeUploadDialog = useGalleryStore((state) => state.closeUploadDialog)
  const { queueFiles } = useUploadImages()

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="关闭上传"
        onClick={closeUploadDialog}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-title"
        className="relative w-full max-w-[480px] rounded-t-[24px] bg-card p-6 shadow-[var(--shadow-card)] md:rounded-[24px]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium tracking-wide text-muted-foreground">
              私人相册
            </p>
            <h2 id="upload-title" className="mt-1 text-[20px] font-semibold">
              上传图片
            </h2>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="关闭" onClick={closeUploadDialog}>
            <X />
          </Button>
        </div>
        <div className="mt-5">
          <UploadDropzone
            onFiles={(files) => {
              void queueFiles(files)
            }}
          />
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          支持 JPEG、PNG、WebP、GIF、AVIF、BMP，单张最大 20 MB。
        </p>
      </div>
    </div>
  )
}
