import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAlbums, useAddImagesToAlbum, useCreateAlbum } from "@/hooks/useAlbums"
import { useGalleryStore } from "@/stores/galleryStore"
import type { ImageItem } from "@/types/image"

interface AddToAlbumDialogProps {
  open: boolean
  images: ImageItem[]
}

export function AddToAlbumDialog({ open, images }: AddToAlbumDialogProps) {
  const albums = useAlbums()
  const createAlbum = useCreateAlbum()
  const addImages = useAddImagesToAlbum()
  const closeAddToAlbum = useGalleryStore((state) => state.closeAddToAlbum)
  const exitSelectionMode = useGalleryStore((state) => state.exitSelectionMode)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const imageIds = images.map((image) => image.id)

  if (!open) {
    return null
  }

  const finish = () => {
    closeAddToAlbum()
    exitSelectionMode()
    setCreating(false)
    setName("")
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 md:items-center">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="取消" onClick={finish} />
      <div className="relative w-full max-w-[420px] rounded-[20px] bg-card p-6 shadow-[var(--shadow-card)]">
        <h2 className="text-[17px] font-semibold">加入相册</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {images.length === 1 ? "将 1 张图片加入相册" : `将 ${images.length} 张图片加入相册`}
        </p>
        {creating ? (
          <form
            className="mt-4"
            onSubmit={(event) => {
              event.preventDefault()
              const trimmed = name.trim()
              if (!trimmed) {
                return
              }
              createAlbum.mutate(
                { name: trimmed },
                {
                  onSuccess: (album) => {
                    addImages.mutate(
                      { albumId: album.id, imageIds },
                      { onSuccess: finish },
                    )
                  },
                },
              )
            }}
          >
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="新相册名称"
              className="h-10 w-full rounded-xl bg-accent px-3 outline-none ring-ring/30 focus:ring-2"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setCreating(false)}>
                返回
              </Button>
              <Button type="submit" disabled={createAlbum.isPending || addImages.isPending || name.trim().length === 0}>
                创建并加入
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="mt-4 max-h-64 space-y-1 overflow-y-auto">
              {(albums.data ?? []).map((album) => (
                <button
                  key={album.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-accent"
                  onClick={() => {
                    addImages.mutate(
                      { albumId: album.id, imageIds },
                      { onSuccess: finish },
                    )
                  }}
                >
                  <span>{album.name}</span>
                  <span className="text-xs text-muted-foreground">{album.imageCount}</span>
                </button>
              ))}
              {(albums.data ?? []).length === 0 ? (
                <p className="px-1 py-6 text-center text-sm text-muted-foreground">还没有相册</p>
              ) : null}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={finish}>
                取消
              </Button>
              <Button type="button" onClick={() => setCreating(true)}>
                新建相册
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
