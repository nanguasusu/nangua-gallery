import { GalleryView } from "@/components/gallery/GalleryView"

export function FavoritesPage() {
  return (
    <GalleryView
      mode="favorites"
      filter={{ favorite: true }}
      emptyTitle="还没有收藏"
      emptyDescription="点照片右上角的心形，即可加入收藏。"
    />
  )
}
