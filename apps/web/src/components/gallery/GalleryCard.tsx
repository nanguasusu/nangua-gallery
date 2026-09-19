import { useState, type MouseEvent } from "react"
import { Check, Heart, ImageOff } from "lucide-react"
import type { ImageItem } from "@/types/image"
import { cn } from "@/lib/utils"
import { thumbnailSrcSet, thumbnailUrl } from "@/lib/thumbnails"
import { formatDeletedAt } from "@/lib/format"

interface GalleryCardProps {
  image: ImageItem
  selected: boolean
  selectionMode: boolean
  showFavorite?: boolean
  showDeletedAt?: boolean
  priority?: boolean
  onOpen: (key: string) => void
  onSelect: (key: string, event: MouseEvent<HTMLButtonElement>) => void
  onFavorite?: (image: ImageItem) => void
}

export function GalleryCard({
  image,
  selected,
  selectionMode,
  showFavorite = true,
  showDeletedAt = false,
  priority = false,
  onOpen,
  onSelect,
  onFavorite,
}: GalleryCardProps) {
  const [failed, setFailed] = useState(false)
  const [useOriginal, setUseOriginal] = useState(false)

  return (
    <article className="group relative">
      <button
        type="button"
        onClick={(event) => {
          if (selectionMode) {
            onSelect(image.key, event)
            return
          }
          onOpen(image.key)
        }}
        className={cn(
          "block w-full overflow-hidden rounded-[12px] bg-card shadow-[var(--shadow-card)] transition-transform duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
          selected && "ring-2 ring-ring/40",
        )}
        aria-label={
          selectionMode
            ? `${selected ? "取消选择" : "选择"} ${image.originalName || image.filename}`
            : `打开 ${image.originalName || image.filename}`
        }
        aria-pressed={selectionMode ? selected : undefined}
      >
        <div className="relative aspect-square overflow-hidden">
          {failed ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted text-muted-foreground">
              <ImageOff className="size-5" />
              <span className="px-3 text-center text-xs">图片缺失</span>
            </div>
          ) : (
            <img
              src={useOriginal ? image.url : thumbnailUrl(image.key)}
              srcSet={useOriginal ? undefined : thumbnailSrcSet(image.key)}
              sizes="(min-width: 1536px) 16vw, (min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
              alt={image.originalName || image.filename}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
              onError={() => {
                if (!useOriginal) {
                  setUseOriginal(true)
                  return
                }
                setFailed(true)
              }}
            />
          )}
          {selectionMode ? (
            <span
              className={cn(
                "absolute left-2 top-2 flex size-6 items-center justify-center rounded-full border border-white/80 text-white shadow-sm transition-colors duration-200",
                selected ? "bg-primary text-primary-foreground" : "bg-black/25",
              )}
            >
              {selected ? <Check className="size-3.5" /> : null}
            </span>
          ) : null}
          {showDeletedAt && image.deletedAt ? (
            <span className="absolute inset-x-2 bottom-2 rounded-full bg-black/55 px-2 py-1 text-[11px] text-white">
              {formatDeletedAt(image.deletedAt)}
            </span>
          ) : null}
        </div>
      </button>
      {showFavorite && onFavorite ? (
        <button
          type="button"
          className={cn(
            "absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/35 text-white opacity-100 shadow-sm transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100",
            image.favorite && "opacity-100 text-rose-300",
          )}
          aria-label={image.favorite ? "取消收藏" : "收藏"}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onFavorite(image)
          }}
        >
          <Heart className={cn("size-4", image.favorite && "fill-current")} />
        </button>
      ) : null}
    </article>
  )
}
