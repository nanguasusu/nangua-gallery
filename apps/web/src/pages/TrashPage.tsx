import { GalleryView } from "@/components/gallery/GalleryView"

export function TrashPage() {
  return (
    <GalleryView
      mode="trash"
      filter={{ deleted: true }}
      emptyTitle="回收站是空的"
      emptyDescription="移入回收站的图片会出现在这里。Phase 3 不会自动清空回收站。"
    />
  )
}
