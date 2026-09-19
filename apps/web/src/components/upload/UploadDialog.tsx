import { X } from "lucide-react"
import { DEFAULT_WEBP_QUALITY, WEBP_QUALITY_OPTIONS, formatMaxBytesLabel } from "@nangua/shared"
import { Button } from "@/components/ui/button"
import { OptionPills } from "@/components/shared/OptionPills"
import { UploadDropzone } from "@/components/upload/UploadDropzone"
import { useGalleryStore } from "@/stores/galleryStore"
import { useUploadStore } from "@/stores/uploadStore"
import { useUploadImages } from "@/hooks/useUploadImages"
import { useConfig } from "@/hooks/useConfig"

export function UploadDialog() {
  const open = useGalleryStore((state) => state.uploadDialogOpen)
  const closeUploadDialog = useGalleryStore((state) => state.closeUploadDialog)
  const convertWebp = useUploadStore((state) => state.convertWebp)
  const webpQuality = useUploadStore((state) => state.webpQuality)
  const setConvertWebp = useUploadStore((state) => state.setConvertWebp)
  const setWebpQuality = useUploadStore((state) => state.setWebpQuality)
  const { queueFiles } = useUploadImages()
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
        <label className="mt-4 flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={convertWebp}
            onChange={(event) => setConvertWebp(event.target.checked)}
            className="size-4 accent-primary"
          />
          转为 WebP
        </label>
        {convertWebp ? (
          <div className="mt-3">
            <p className="text-sm font-medium">画质</p>
            <OptionPills
              value={webpQuality}
              options={WEBP_QUALITY_OPTIONS}
              onChange={setWebpQuality}
              ariaLabel="WebP 画质"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              GIF 和已经是 WebP / AVIF 的文件不会转换。失败时保存原文件。
            </p>
          </div>
        ) : null}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          支持 JPEG、PNG、WebP、GIF、AVIF、BMP，单张最大 {maxLabel}。
          {convertWebp ? ` 画质 ${webpQuality || DEFAULT_WEBP_QUALITY}。` : ""}
        </p>
      </div>
    </div>
  )
}
