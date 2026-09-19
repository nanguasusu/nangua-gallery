import { useCallback } from "react"
import { Folder, Heart, Trash2 } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { GalleryEmpty } from "@/components/gallery/GalleryEmpty"
import { GalleryError } from "@/components/gallery/GalleryError"
import { GalleryGrid } from "@/components/gallery/GalleryGrid"
import { GallerySelectionBar, type GalleryMode } from "@/components/gallery/GallerySelectionBar"
import { GallerySkeleton } from "@/components/gallery/GallerySkeleton"
import { ImageLightbox } from "@/components/gallery/ImageLightbox"
import { AddToAlbumDialog } from "@/components/albums/AddToAlbumDialog"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { useConfig } from "@/hooks/useConfig"
import { useImages } from "@/hooks/useImages"
import { useSetFavorites, useToggleFavorite } from "@/hooks/useFavorite"
import { usePermanentDeleteImages, useRestoreImages, useTrashImages } from "@/hooks/useTrash"
import { useRemoveImagesFromAlbum, useSetAlbumCover } from "@/hooks/useAlbums"
import { ApiError } from "@/lib/api"
import type { ImageListFilter } from "@/lib/query-keys"
import { useGalleryStore } from "@/stores/galleryStore"
import { useUIStore } from "@/stores/ui"

interface GalleryViewProps {
  mode: GalleryMode
  filter?: Omit<ImageListFilter, "search">
  albumId?: string
  emptyTitle: string
  emptyDescription: string
  emptyActionLabel?: string
  onEmptyAction?: () => void
}

export function GalleryView({
  mode,
  filter = {},
  albumId,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
}: GalleryViewProps) {
  const [params] = useSearchParams()
  const search = params.get("q")?.trim() || undefined
  const {
    images,
    isPending,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useImages({
    ...filter,
    albumId,
    search,
  })
  const config = useConfig()
  const enablePermanentDelete = config.data?.enableDelete === true
  const trashImages = useTrashImages()
  const restoreImages = useRestoreImages()
  const permanentDelete = usePermanentDeleteImages()
  const toggleFavorite = useToggleFavorite()
  const setFavorites = useSetFavorites()
  const removeFromAlbum = useRemoveImagesFromAlbum(albumId ?? "")
  const setAlbumCover = useSetAlbumCover(albumId ?? "")

  const lightboxOpen = useUIStore((state) => state.lightboxOpen)
  const selectedImageKey = useUIStore((state) => state.selectedImageKey)
  const openLightbox = useUIStore((state) => state.openLightbox)
  const closeLightbox = useUIStore((state) => state.closeLightbox)
  const setSelectedImageKey = useUIStore((state) => state.setSelectedImageKey)

  const selectionMode = useGalleryStore((state) => state.selectionMode)
  const selectedKeys = useGalleryStore((state) => state.selectedKeys)
  const pendingDeleteKeys = useGalleryStore((state) => state.pendingDeleteKeys)
  const pendingPermanentKeys = useGalleryStore((state) => state.pendingPermanentKeys)
  const addToAlbumOpen = useGalleryStore((state) => state.addToAlbumOpen)
  const requestDelete = useGalleryStore((state) => state.requestDelete)
  const requestPermanentDelete = useGalleryStore((state) => state.requestPermanentDelete)
  const clearPendingDelete = useGalleryStore((state) => state.clearPendingDelete)
  const clearPendingPermanentDelete = useGalleryStore((state) => state.clearPendingPermanentDelete)
  const openAddToAlbum = useGalleryStore((state) => state.openAddToAlbum)

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isError) {
      void fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, isError, fetchNextPage])

  const onSelect = useCallback((key: string, shiftKey: boolean) => {
    const state = useGalleryStore.getState()
    if (shiftKey && state.lastClickedKey) {
      const start = images.findIndex((image) => image.key === state.lastClickedKey)
      const end = images.findIndex((image) => image.key === key)
      if (start >= 0 && end >= 0) {
        const from = Math.min(start, end)
        const to = Math.max(start, end)
        const range = images.slice(from, to + 1).map((image) => image.key)
        state.selectRange([...state.selectedKeys, ...range])
        state.setLastClickedKey(key)
        return
      }
    }
    state.toggleSelected(key)
  }, [images])

  const selectedImages = (keys: string[] | null) =>
    images.filter((image) => keys?.includes(image.key))

  const pendingTrash = selectedImages(pendingDeleteKeys)
  const pendingPermanent = selectedImages(pendingPermanentKeys)
  const addToAlbumImages = selectedImages(selectedKeys)

  return (
    <>
      {isPending ? <GallerySkeleton count={12} /> : null}
      {isError ? (
        <GalleryError
          message={error instanceof ApiError ? error.message : "照片加载失败"}
          onRetry={() => void refetch()}
        />
      ) : null}
      {!isPending && !isError && images.length === 0 ? (
        <GalleryEmpty
          title={search ? "没有匹配的图片" : emptyTitle}
          description={search ? `没有找到与「${search}」相关的图片。` : emptyDescription}
          actionLabel={search ? undefined : emptyActionLabel}
          onAction={search ? undefined : onEmptyAction}
          icon={mode === "favorites" ? Heart : mode === "trash" ? Trash2 : mode === "album" ? Folder : undefined}
        />
      ) : null}
      {!isPending && !isError && images.length > 0 ? (
        <GalleryGrid
          images={images}
          selectedKeys={selectedKeys}
          selectionMode={selectionMode}
          showFavorite={mode !== "trash"}
          showDeletedAt={mode === "trash"}
          onOpen={openLightbox}
          onSelect={onSelect}
          onFavorite={(image) => toggleFavorite.mutate({ image, favorite: !image.favorite })}
          hasNextPage={Boolean(hasNextPage)}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={loadMore}
          canLoadMore={Boolean(hasNextPage) && !isFetchingNextPage && !isError}
        />
      ) : null}
      <GallerySelectionBar
        images={images}
        selectedKeys={selectedKeys}
        mode={mode}
        enablePermanentDelete={enablePermanentDelete}
        onTrash={(items) => requestDelete(items.map((image) => image.key))}
        onFavorite={(items, favorite) => setFavorites.mutate({ imageIds: items.map((image) => image.id), favorite })}
        onAddToAlbum={mode === "trash" ? undefined : () => openAddToAlbum()}
        onRemoveFromAlbum={
          mode === "album" && albumId
            ? (items) => removeFromAlbum.mutate(items.map((image) => image.id))
            : undefined
        }
        onRestore={(items) => restoreImages.mutate(items)}
        onPermanentDelete={(items) => requestPermanentDelete(items.map((image) => image.key))}
        onSetCover={
          mode === "album" && albumId
            ? (image) => setAlbumCover.mutate(image.id)
            : undefined
        }
      />
      <ImageLightbox
        images={images}
        selectedKey={selectedImageKey}
        open={lightboxOpen}
        mode={mode}
        enablePermanentDelete={enablePermanentDelete}
        onClose={closeLightbox}
        onSelect={setSelectedImageKey}
        onFavorite={(image) => toggleFavorite.mutate({ image, favorite: !image.favorite })}
        onTrash={(image) => requestDelete([image.key])}
        onRestore={(image) => restoreImages.mutate([image])}
        onPermanentDelete={(image) => requestPermanentDelete([image.key])}
        onSetCover={
          mode === "album" && albumId
            ? (image) => setAlbumCover.mutate(image.id)
            : undefined
        }
      />
      <AddToAlbumDialog open={addToAlbumOpen} images={addToAlbumImages} />
      <ConfirmDialog
        open={pendingDeleteKeys !== null}
        title={pendingTrash.length === 1 ? "移入回收站？" : `将 ${pendingTrash.length} 张图片移入回收站？`}
        description="图片会从照片、收藏和相册中隐藏，但不会从 Cloudflare R2 删除。之后可以恢复。"
        confirmLabel="移入回收站"
        pendingLabel="处理中…"
        pending={trashImages.isPending}
        onCancel={clearPendingDelete}
        onConfirm={() => {
          if (pendingTrash.length > 0) {
            trashImages.mutate(pendingTrash)
          }
        }}
      />
      <ConfirmDialog
        open={pendingPermanentKeys !== null}
        title={pendingPermanent.length === 1 ? "永久删除 1 张图片？" : `永久删除 ${pendingPermanent.length} 张图片？`}
        description="这些文件会从 Cloudflare R2 删除，已有链接将失效。此操作无法撤销。"
        confirmLabel="永久删除"
        pendingLabel="删除中…"
        pending={permanentDelete.isPending}
        onCancel={clearPendingPermanentDelete}
        onConfirm={() => {
          if (pendingPermanent.length > 0) {
            permanentDelete.mutate(pendingPermanent)
          }
        }}
      />
    </>
  )
}
