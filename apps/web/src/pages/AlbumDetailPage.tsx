import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { GalleryView } from "@/components/gallery/GalleryView"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { GalleryError } from "@/components/gallery/GalleryError"
import { GallerySkeleton } from "@/components/gallery/GallerySkeleton"
import { Button } from "@/components/ui/button"
import { useAlbum, useDeleteAlbum } from "@/hooks/useAlbums"
import { ApiError } from "@/lib/api"

export function AlbumDetailPage() {
  const { albumId } = useParams()
  const album = useAlbum(albumId)
  const deleteAlbum = useDeleteAlbum()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!albumId) {
    return <GalleryError message="相册不存在" />
  }

  if (album.isPending) {
    return <GallerySkeleton count={8} />
  }

  if (album.isError || !album.data) {
    return (
      <GalleryError
        message={album.error instanceof ApiError ? album.error.message : "相册不存在"}
        onRetry={() => void album.refetch()}
      />
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold">{album.data.name}</h2>
          {album.data.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{album.data.description}</p>
          ) : null}
        </div>
        <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
          删除相册
        </Button>
      </div>
      <GalleryView
        mode="album"
        albumId={albumId}
        emptyTitle="这个相册还是空的"
        emptyDescription="在照片页多选图片，然后点「加入相册」。从相册移除不会删除图片本身。"
      />
      <ConfirmDialog
        open={confirmDelete}
        title={`删除相册「${album.data.name}」？`}
        description="只会删除相册和相册关系，不会删除图片或 R2 对象。"
        confirmLabel="删除相册"
        pendingLabel="删除中…"
        pending={deleteAlbum.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteAlbum.mutate(albumId, {
            onSuccess: () => {
              setConfirmDelete(false)
              void navigate("/albums")
            },
          })
        }}
      />
    </div>
  )
}
