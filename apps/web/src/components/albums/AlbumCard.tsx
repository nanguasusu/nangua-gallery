import { Link } from "react-router-dom"
import type { Album } from "@/types/image"
import { thumbnailUrl } from "@/lib/thumbnails"

interface AlbumCardProps {
  album: Album
}

export function AlbumCard({ album }: AlbumCardProps) {
  const cover = album.coverImage

  return (
    <Link
      to={`/albums/${album.id}`}
      className="block overflow-hidden rounded-[16px] bg-card shadow-[var(--shadow-card)] transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="aspect-[4/3] bg-muted">
        {cover ? (
          <img
            src={thumbnailUrl(cover.key)}
            alt={album.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            还没有封面
          </div>
        )}
      </div>
      <div className="px-4 py-3">
        <p className="truncate text-[15px] font-medium">{album.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {album.imageCount === 1 ? "1 张照片" : `${album.imageCount} 张照片`}
        </p>
      </div>
    </Link>
  )
}
