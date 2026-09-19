import { useEffect, useRef } from "react"
import type { ImageItem } from "@/types/image"
import { GalleryCard } from "@/components/gallery/GalleryCard"
import { GallerySkeleton } from "@/components/gallery/GallerySkeleton"
import { cn } from "@/lib/utils"

type GalleryLayout = "square"

interface GalleryGridProps {
  images: ImageItem[]
  selectedKeys: string[]
  selectionMode: boolean
  showFavorite?: boolean
  showDeletedAt?: boolean
  onOpen: (key: string) => void
  onSelect: (key: string, shiftKey: boolean) => void
  onFavorite?: (image: ImageItem) => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
  canLoadMore: boolean
}

const layoutClassName: Record<GalleryLayout, string> = {
  square:
    "grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6",
}

export function GalleryGrid({
  images,
  selectedKeys,
  selectionMode,
  showFavorite = true,
  showDeletedAt = false,
  onOpen,
  onSelect,
  onFavorite,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  canLoadMore,
}: GalleryGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const layout: GalleryLayout = "square"
  const selected = new Set(selectedKeys)

  useEffect(() => {
    const node = sentinelRef.current
    if (!node) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && canLoadMore) {
          onLoadMore()
        }
      },
      { rootMargin: "480px 0px" },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [canLoadMore, onLoadMore])

  return (
    <div>
      <div className={cn(layoutClassName[layout])}>
        {images.map((image) => (
          <GalleryCard
            key={image.id || image.key}
            image={image}
            selected={selected.has(image.key)}
            selectionMode={selectionMode}
            showFavorite={showFavorite}
            showDeletedAt={showDeletedAt}
            onOpen={onOpen}
            onSelect={(key, event) => onSelect(key, event.shiftKey)}
            onFavorite={onFavorite}
          />
        ))}
      </div>
      <div ref={sentinelRef} className="h-8" />
      {isFetchingNextPage ? (
        <div className="mt-3">
          <GallerySkeleton count={6} />
        </div>
      ) : null}
      {!hasNextPage && images.length > 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          已经到底了
        </p>
      ) : null}
    </div>
  )
}
