import { X } from "lucide-react"
import { Link } from "react-router-dom"
import { DEFAULT_WEBP_QUALITY, formatMaxBytesLabel } from "@nangua/shared"
import { Button } from "@/components/ui/button"
import { UploadDropzone } from "@/components/upload/UploadDropzone"
import { useGalleryStore } from "@/stores/galleryStore"
import { useUploadStore } from "@/stores/uploadStore"
import { useUploadImages } from "@/hooks/useUploadImages"
import { useUploadTargetAlbum } from "@/hooks/useUploadTargetAlbum"
import { useConfig } from "@/hooks/useConfig"

export function UploadDialog() {
  const open = useGalleryStore((state) => state.uploadDialogOpen)
  const closeUploadDialog = useGalleryStore((state) => state.closeUploadDialog)
  const convertWebp = useUploadStore((state) => state.convertWebp)
  const webpQuality = useUploadStore((state) => state.webpQuality)
  const { queueFiles } = useUploadImages()
  const { albumName } = useUploadTargetAlbum()
  const config = useConfig()
  const maxLabel = formatMaxBytesLabel(config.data?.maxImageBytes ?? 20 * 1024 * 1024)

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
            {albumName ? (
              <p className="mt-1 text-sm text-muted-foreground">将加入相册「{albumName}」</p>
            ) : null}
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
          支持 JPG / JPEG、PNG、WebP、GIF、AVIF、BMP，单张最大 {maxLabel}。
          {convertWebp ? ` 将转为 WebP，画质 ${webpQuality || DEFAULT_WEBP_QUALITY}。` : " 按原格式保存。"}
          {" "}
          <Link to="/settings" className="underline underline-offset-2" onClick={closeUploadDialog}>
            在设置中更改
          </Link>
        </p>
      </div>
    </div>
  )
}
