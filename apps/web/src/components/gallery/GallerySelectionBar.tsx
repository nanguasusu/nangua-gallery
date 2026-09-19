import { Code2, Copy, FileCode2, FolderPlus, Heart, ImageIcon, Link2, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { formatHtml, formatMarkdown, formatPlainUrls } from "@nangua/shared"
import type { ImageItem } from "@/types/image"
import { Button } from "@/components/ui/button"
import { copyShortLinks } from "@/lib/copy-short-links"

export type GalleryMode = "photos" | "favorites" | "album" | "trash"

interface GallerySelectionBarProps {
  images: ImageItem[]
  selectedKeys: string[]
  mode: GalleryMode
  enablePermanentDelete?: boolean
  onTrash: (images: ImageItem[]) => void
  onFavorite: (images: ImageItem[], favorite: boolean) => void
  onAddToAlbum?: (images: ImageItem[]) => void
  onRemoveFromAlbum?: (images: ImageItem[]) => void
  onRestore?: (images: ImageItem[]) => void
  onPermanentDelete?: (images: ImageItem[]) => void
  onSetCover?: (image: ImageItem) => void
}

async function copyText(value: string, success: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(success)
  } catch {
    toast.error("复制失败")
  }
}

export function GallerySelectionBar({
  images,
  selectedKeys,
  mode,
  enablePermanentDelete = false,
  onTrash,
  onFavorite,
  onAddToAlbum,
  onRemoveFromAlbum,
  onRestore,
  onPermanentDelete,
  onSetCover,
}: GallerySelectionBarProps) {
  if (selectedKeys.length === 0) {
    return null
  }

  const selected = images.filter((image) => selectedKeys.includes(image.key))
  const coverCandidate = selected.length === 1 ? selected[0] : undefined
  const urls = selected.map((image) => image.url)
  const countLabel =
    selectedKeys.length === 1 ? "已选择 1 张" : `已选择 ${selectedKeys.length} 张`
  const allFavorite = selected.length > 0 && selected.every((image) => image.favorite)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[4.5rem] z-30 px-3 md:bottom-6 md:left-[220px] md:px-8">
      <div className="pointer-events-auto mx-auto flex max-w-3xl flex-col gap-3 rounded-[20px] bg-card/95 px-4 py-3 shadow-[var(--shadow-card)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium">{countLabel}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void copyText(formatPlainUrls(urls), "已复制")}
          >
            <Copy />
            链接
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void copyText(formatMarkdown(urls), "已复制")}
          >
            <FileCode2 />
            Markdown
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void copyText(formatHtml(urls), "已复制")}
          >
            <Code2 />
            HTML
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void copyShortLinks(selected)}
          >
            <Link2 />
            短链接
          </Button>
          {mode !== "trash" ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onFavorite(selected, !allFavorite)}
              >
                <Heart className={allFavorite ? "fill-current" : undefined} />
                {allFavorite ? "取消收藏" : "收藏"}
              </Button>
              {onAddToAlbum ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onAddToAlbum(selected)}
                >
                  <FolderPlus />
                  加入相册
                </Button>
              ) : null}
              {mode === "album" && onSetCover && coverCandidate ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onSetCover(coverCandidate)}
                >
                  <ImageIcon />
                  设为封面
                </Button>
              ) : null}
              {mode === "album" && onRemoveFromAlbum ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onRemoveFromAlbum(selected)}
                >
                  移出相册
                </Button>
              ) : null}
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => onTrash(selected)}
              >
                <Trash2 />
                移入回收站
              </Button>
            </>
          ) : (
            <>
              {onRestore ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onRestore(selected)}
                >
                  <RotateCcw />
                  恢复
                </Button>
              ) : null}
              {enablePermanentDelete && onPermanentDelete ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => onPermanentDelete(selected)}
                >
                  <Trash2 />
                  永久删除
                </Button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
