import { useEffect, useMemo, useRef, useState } from "react"
import { useWindowVirtualizer } from "@tanstack/react-virtual"
import type { ImageItem } from "@/types/image"
import { GalleryCard } from "@/components/gallery/GalleryCard"
import { GallerySkeleton } from "@/components/gallery/GallerySkeleton"
import { buildGalleryRows, galleryLayoutMetrics } from "@/lib/group-images"

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
  groupByMonth?: boolean
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
  groupByMonth = true,
}: GalleryGridProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(() => {
    if (typeof window === "undefined") {
      return 0
    }
    const chrome = window.innerWidth >= 768 ? 284 : 24
    return Math.max(320, Math.floor(window.innerWidth - chrome))
  })
  const selected = useMemo(() => new Set(selectedKeys), [selectedKeys])
  const { gap } = galleryLayoutMetrics(width)
  const rows = useMemo(
    () => (width > 0 ? buildGalleryRows(images, width, { groupByMonth }) : []),
    [images, width, groupByMonth],
  )

  useEffect(() => {
    const node = listRef.current
    if (!node) {
      return
    }

    const updateWidth = () => {
      setWidth(Math.floor(node.getBoundingClientRect().width))
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: (index) => rows[index]?.height ?? 200,
    overscan: 8,
    scrollMargin: listRef.current?.offsetTop ?? 0,
    getItemKey: (index) => rows[index]?.key ?? index,
  })

  useEffect(() => {
    virtualizer.measure()
  }, [rows, virtualizer])

  const virtualItems = virtualizer.getVirtualItems()

  useEffect(() => {
    const last = virtualItems.at(-1)
    if (!last || rows.length === 0) {
      return
    }
    if (last.index >= rows.length - 3 && canLoadMore) {
      onLoadMore()
    }
  }, [virtualItems, rows.length, canLoadMore, onLoadMore])

  const firstVisible = virtualItems[0]
  const stickyLabel = firstVisible ? stickyMonthLabel(rows, firstVisible.index) : null
  const firstRow = firstVisible ? rows[firstVisible.index] : undefined
  const showSticky = Boolean(stickyLabel && firstRow?.type !== "header")

  return (
    <div ref={listRef} className="relative">
      {showSticky ? (
        <div className="pointer-events-none sticky top-14 z-10 -mb-12 h-12 md:top-16">
          <h3 className="-mx-1 bg-background/80 px-1 py-2 text-[15px] font-semibold backdrop-blur-xl">
            {stickyLabel}
          </h3>
        </div>
      ) : null}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((item) => {
          const row = rows[item.index]
          if (!row) {
            return null
          }

          return (
            <div
              key={item.key}
              data-index={item.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${item.size}px`,
                transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)`,
              }}
            >
              {row.type === "header" ? (
                <h3
                  className="px-1 py-2 text-[15px] font-semibold"
                  style={{ paddingTop: Math.max(8, row.height - 32) }}
                >
                  {row.label}
                </h3>
              ) : (
                <div className="flex" style={{ gap, height: row.height - gap }}>
                  {row.cells.map((cell, cellIndex) => (
                    <div
                      key={cell.image.id || cell.image.key}
                      style={{ width: cell.width, height: cell.height }}
                    >
                      <GalleryCard
                        image={cell.image}
                        selected={selected.has(cell.image.key)}
                        selectionMode={selectionMode}
                        showFavorite={showFavorite}
                        showDeletedAt={showDeletedAt}
                        fill
                        sizes={`${Math.round(cell.width)}px`}
                        priority={item.index < 2 && cellIndex < 4}
                        onOpen={onOpen}
                        onSelect={(key, event) => onSelect(key, event.shiftKey)}
                        onFavorite={onFavorite}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
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

function stickyMonthLabel(
  rows: ReturnType<typeof buildGalleryRows>,
  index: number,
): string | null {
  for (let cursor = index; cursor >= 0; cursor -= 1) {
    const row = rows[cursor]
    if (row?.type === "header") {
      return row.label
    }
  }
  return null
}
