import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { ChevronLeft, ChevronRight, Code2, Copy, FileCode2, Heart, ImageIcon, ImageOff, Link2, RotateCcw, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { formatHtml, formatMarkdown } from "@nangua/shared"
import type { ImageItem } from "@/types/image"
import { Button } from "@/components/ui/button"
import { formatBytes, formatDeletedAt, formatDimensions, formatUploadedAt } from "@/lib/format"
import { copyShortLinks } from "@/lib/copy-short-links"
import { thumbnailUrl } from "@/lib/thumbnails"
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
  onSetCover?: (image: ImageItem) => void
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
  onSetCover,
}: ImageLightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const pointer = useRef<{ x: number; y: number; id: number } | null>(null)
  const index = useMemo(
    () => images.findIndex((image) => image.key === selectedKey),
    [images, selectedKey],
  )
  const image = index >= 0 ? images[index] : undefined
  const hasPrev = index > 0
  const hasNext = index >= 0 && index < images.length - 1
  const nextImage = hasNext ? images[index + 1] : undefined
  const prevImage = hasPrev ? images[index - 1] : undefined
  const [failed, setFailed] = useState(false)
  const [fullReady, setFullReady] = useState(false)

  useEffect(() => {
    setFailed(false)
    setFullReady(false)
  }, [selectedKey])

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

  const onStagePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }
    pointer.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
  }

  const onStagePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointer.current
    pointer.current = null
    if (!start || start.id !== event.pointerId) {
      return
    }

    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.35) {
      if (dx > 0) {
        goPrev()
      } else {
        goNext()
      }
      return
    }

    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  const onDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" && hasPrev) {
      event.preventDefault()
      goPrev()
    }
    if (event.key === "ArrowRight" && hasNext) {
      event.preventDefault()
      goNext()
    }
  }

  const visible = open && Boolean(image)
  const dimensions = image ? formatDimensions(image.width, image.height) : null
  const previewSrc = image ? thumbnailUrl(image.key, 1200) : ""

  return (
    <Dialog.Root
      open={visible}
      onOpenChange={(next) => {
        if (!next) {
          onClose()
        }
      }}
    >
      {visible && image ? (
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/82" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-0 z-50 flex h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col outline-none md:flex-row"
            onOpenAutoFocus={(event) => {
              event.preventDefault()
              closeRef.current?.focus()
            }}
            onKeyDown={onDialogKeyDown}
          >
            <Dialog.Title className="sr-only">
              {image.originalName || image.filename}
            </Dialog.Title>
            <div
              className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-3 py-14 md:px-16"
              onPointerDown={onStagePointerDown}
              onPointerUp={onStagePointerUp}
            >
              {failed ? (
                <div className="flex h-[40vh] w-full max-w-md flex-col items-center justify-center gap-2 rounded-[12px] bg-white/5 text-white/70">
                  <ImageOff className="size-6" />
                  <span className="text-sm">图片缺失</span>
                </div>
              ) : (
                <div className="relative max-h-[72vh] max-w-full md:max-h-[86vh]" onPointerDown={(event) => event.stopPropagation()}>
                  <img
                    src={previewSrc}
                    alt=""
                    aria-hidden="true"
                    decoding="async"
                    className="max-h-[72vh] max-w-full rounded-[12px] object-contain md:max-h-[86vh]"
                  />
                  <img
                    src={image.url}
                    alt={image.originalName || image.filename}
                    decoding="async"
                    className="absolute inset-0 mx-auto max-h-[72vh] max-w-full rounded-[12px] object-contain transition-opacity duration-200 md:max-h-[86vh]"
                    style={{ opacity: fullReady ? 1 : 0 }}
                    onLoad={() => setFullReady(true)}
                    onError={() => setFailed(true)}
                  />
                </div>
              )}
              {prevImage ? (
                <img src={thumbnailUrl(prevImage.key, 800)} alt="" className="hidden" aria-hidden="true" />
              ) : null}
              {nextImage ? (
                <>
                  <img src={thumbnailUrl(nextImage.key, 800)} alt="" className="hidden" aria-hidden="true" />
                  <img src={nextImage.url} alt="" className="hidden" aria-hidden="true" />
                </>
              ) : null}
              <Button
                ref={closeRef}
                type="button"
                variant="ghost"
                size="icon"
                aria-label="关闭预览"
                className="absolute right-3 top-3 text-white hover:bg-white/10"
                onClick={onClose}
              >
                <X />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={!hasPrev}
                aria-label="上一张"
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10"
                onClick={goPrev}
              >
                <ChevronLeft />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={!hasNext}
                aria-label="下一张"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10"
                onClick={goNext}
              >
                <ChevronRight />
              </Button>
            </div>
            <aside className="relative z-10 w-full shrink-0 overflow-y-auto bg-[#16324a] px-5 py-4 text-white md:w-[320px] md:py-8">
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
                {dimensions ? (
                  <div>
                    <dt className="text-xs text-white/45">尺寸</dt>
                    <dd className="mt-1">{dimensions}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs text-white/45">{image.takenAt ? "拍摄时间" : "上传时间"}</dt>
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
                  onClick={() => void copyShortLinks([image])}
                  className="bg-white/10 text-white hover:bg-white/16"
                >
                  <Link2 />
                  短链接
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
                {mode === "album" && onSetCover ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onSetCover(image)}
                    className="bg-white/10 text-white hover:bg-white/16"
                  >
                    <ImageIcon />
                    设为封面
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
            </aside>
          </Dialog.Content>
        </Dialog.Portal>
      ) : null}
    </Dialog.Root>
  )
}
