import { useState } from "react"
import { Plus } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { AlbumGrid } from "@/components/albums/AlbumGrid"
import { CreateAlbumDialog } from "@/components/albums/CreateAlbumDialog"
import { GalleryEmpty } from "@/components/gallery/GalleryEmpty"
import { GalleryError } from "@/components/gallery/GalleryError"
import { GallerySkeleton } from "@/components/gallery/GallerySkeleton"
import { Button } from "@/components/ui/button"
import { useAlbums, useCreateAlbum } from "@/hooks/useAlbums"
import { ApiError } from "@/lib/api"

export function AlbumsPage() {
  const albums = useAlbums()
  const createAlbum = useCreateAlbum()
  const [open, setOpen] = useState(false)
  const [params] = useSearchParams()
  const search = params.get("q")?.trim().toLowerCase() ?? ""
  const items = (albums.data ?? []).filter((album) =>
    search ? album.name.toLowerCase().includes(search) : true,
  )

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[17px] font-semibold">相册</h2>
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          <Plus />
          新建相册
        </Button>
      </div>
      {albums.isPending ? <GallerySkeleton count={8} /> : null}
      {albums.isError ? (
        <GalleryError
          message={albums.error instanceof ApiError ? albums.error.message : "相册加载失败"}
          onRetry={() => void albums.refetch()}
        />
      ) : null}
      {!albums.isPending && !albums.isError && items.length === 0 ? (
        <GalleryEmpty
          title={search ? "没有匹配的相册" : "还没有相册"}
          description={search ? `没有找到与「${search}」相关的相册。` : "可以把一组图片放进同一个相册，一张图片也可以属于多个相册。"}
          actionLabel="新建相册"
          onAction={() => setOpen(true)}
        />
      ) : null}
      {!albums.isPending && !albums.isError && items.length > 0 ? <AlbumGrid albums={items} /> : null}
      <CreateAlbumDialog
        open={open}
        pending={createAlbum.isPending}
        onClose={() => setOpen(false)}
        onCreate={(input) => {
          createAlbum.mutate(input, { onSuccess: () => setOpen(false) })
        }}
      />
    </div>
  )
}
