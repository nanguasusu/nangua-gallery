import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Code2, Copy, FileCode2, Heart, ImageOff, RotateCcw, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { formatHtml, formatMarkdown } from "@nangua/shared"
import type { ImageItem } from "@/types/image"
import { Button } from "@/components/ui/button"
import { formatBytes, formatDeletedAt, formatUploadedAt } from "@/lib/format"
import type { GalleryMode } from "@/components/gallery/GallerySelectionBar"

interface ImageLightboxProps {
  images: ImageItem[]
  selectedKey: string | null
  open: boolean
  mode: GalleryMode
  enablePermanentDelete?: boolean
  onClose: () => void
  onSelect: (key: string) => void
  onFavorite?: (image: ImageItem) => void
  onTrash?: (image: ImageItem) => void
  onRestore?: (image: ImageItem) => void
  onPermanentDelete?: (image: ImageItem) => void
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success("已复制")
  } catch {
    toast.error("复制失败")
  }
}

export function ImageLightbox({
  images,
  selectedKey,
  open,
  mode,
  enablePermanentDelete = false,
  onClose,
  onSelect,
  onFavorite,
  onTrash,
  onRestore,
  onPermanentDelete,
}: ImageLightboxProps) {
  const index = useMemo(
    () => images.findIndex((image) => image.key === selectedKey),
    [images, selectedKey],
  )
  const image = index >= 0 ? images[index] : undefined
  const hasPrev = index > 0
  const hasNext = index >= 0 && index < images.length - 1
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [selectedKey])

  useEffect(() => {
    if (!open) {
      return
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
        return
      }
      if (event.key === "ArrowLeft" && hasPrev) {
        const prev = images[index - 1]
        if (prev) {
          onSelect(prev.key)
        }
      }
      if (event.key === "ArrowRight" && hasNext) {
        const next = images[index + 1]
        if (next) {
          onSelect(next.key)
        }
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, hasPrev, hasNext, images, index, onClose, onSelect])

  if (!open || !image) {
    return null
  }

  const goPrev = () => {
    const prev = images[index - 1]
    if (prev) {
      onSelect(prev.key)
    }
  }

  const goNext = () => {
    const next = images[index + 1]
    if (next) {
      onSelect(next.key)
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="关闭预览"
        className="absolute inset-0 bg-black/82"
        onClick={onClose}
      />
      <div className="relative flex h-full flex-col md:flex-row">
        <div
          className="relative flex min-h-0 flex-1 items-center justify-center px-3 py-14 md:px-16"
          onClick={onClose}
          role="presentation"
        >
          {failed ? (
            <div className="flex h-[40vh] w-full max-w-md flex-col items-center justify-center gap-2 rounded-[12px] bg-white/5 text-white/70">
              <ImageOff className="size-6" />
              <span className="text-sm">图片缺失</span>
            </div>
          ) : (
            <img
              src={image.url}
              alt={image.originalName || image.filename}
              decoding="async"
              className="max-h-[72vh] max-w-full rounded-[12px] object-contain md:max-h-[86vh]"
              onClick={(event) => event.stopPropagation()}
              onError={() => setFailed(true)}
            />
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="关闭"
            className="absolute right-3 top-3 text-white hover:bg-white/10"
            onClick={(event) => {
              event.stopPropagation()
              onClose()
            }}
          >
            <X />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!hasPrev}
            aria-label="上一张"
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 text-white hover:bg-white/10 md:inline-flex"
            onClick={(event) => {
              event.stopPropagation()
              goPrev()
            }}
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!hasNext}
            aria-label="下一张"
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 text-white hover:bg-white/10 md:inline-flex"
            onClick={(event) => {
              event.stopPropagation()
              goNext()
            }}
          >
            <ChevronRight />
          </Button>
        </div>
        <aside className="relative z-10 w-full shrink-0 bg-[#16324a] px-5 py-4 text-white md:w-[320px] md:py-8">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium">{image.originalName || image.filename}</p>
            <p className="mt-1 truncate text-xs text-white/50">{image.key}</p>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm md:grid-cols-1">
            <div>
              <dt className="text-xs text-white/45">原始文件名</dt>
              <dd className="mt-1 truncate">{image.originalName || image.filename}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/45">对象键</dt>
              <dd className="mt-1 break-all text-xs text-white/80">{image.key}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/45">大小</dt>
              <dd className="mt-1">{formatBytes(image.size)}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/45">上传时间</dt>
              <dd className="mt-1">{formatUploadedAt(image.uploadedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/45">收藏</dt>
              <dd className="mt-1">{image.favorite ? "已收藏" : "未收藏"}</dd>
            </div>
            {image.albums && image.albums.length > 0 ? (
              <div className="col-span-2 md:col-span-1">
                <dt className="text-xs text-white/45">相册</dt>
                <dd className="mt-1">{image.albums.map((album) => album.name).join("、")}</dd>
              </div>
            ) : null}
            {image.deletedAt ? (
              <div>
                <dt className="text-xs text-white/45">回收站</dt>
                <dd className="mt-1">{formatDeletedAt(image.deletedAt)}</dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void copyText(image.url)}
              className="bg-white/10 text-white hover:bg-white/16"
            >
              <Copy />
              复制链接
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void copyText(formatMarkdown([image.url]))}
              className="bg-white/10 text-white hover:bg-white/16"
            >
              <FileCode2 />
              Markdown
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void copyText(formatHtml([image.url]))}
              className="bg-white/10 text-white hover:bg-white/16"
            >
              <Code2 />
              HTML
            </Button>
            {mode !== "trash" && onFavorite ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onFavorite(image)}
                className="bg-white/10 text-white hover:bg-white/16"
              >
                <Heart className={image.favorite ? "fill-current" : undefined} />
                {image.favorite ? "取消收藏" : "收藏"}
              </Button>
            ) : null}
            {mode !== "trash" && onTrash ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => onTrash(image)}
              >
                <Trash2 />
                移入回收站
              </Button>
            ) : null}
            {mode === "trash" && onRestore ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onRestore(image)}
                className="bg-white/10 text-white hover:bg-white/16"
              >
                <RotateCcw />
                恢复
              </Button>
            ) : null}
            {mode === "trash" && enablePermanentDelete && onPermanentDelete ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => onPermanentDelete(image)}
              >
                <Trash2 />
                永久删除
              </Button>
            ) : null}
          </div>
          <div className="mt-4 flex justify-between md:hidden">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!hasPrev}
              className="text-white hover:bg-white/10"
              onClick={goPrev}
            >
              <ChevronLeft />
              上一张
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!hasNext}
              className="text-white hover:bg-white/10"
              onClick={goNext}
            >
              下一张
              <ChevronRight />
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
