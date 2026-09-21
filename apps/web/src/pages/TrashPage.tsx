import { GalleryView } from "@/components/gallery/GalleryView"

export function TrashPage() {
  return (
    <GalleryView
      mode="trash"
      filter={{ deleted: true }}
      emptyTitle="回收站是空的"
      emptyDescription="移入回收站的图片会出现在这里。永久删除会从 Cloudflare R2 去掉文件，公开链接会失效，无法恢复。"
    />
  )
}
