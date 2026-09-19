import { GalleryView } from "@/components/gallery/GalleryView"
import { useGalleryStore } from "@/stores/galleryStore"

export function PhotosPage() {
  const openUploadDialog = useGalleryStore((state) => state.openUploadDialog)

  return (
    <GalleryView
      mode="photos"
      emptyTitle="还没有照片"
      emptyDescription="如果这是第一次使用，可以先在设置里同步已有 R2 图片，或直接上传新照片。"
      emptyActionLabel="上传图片"
      onEmptyAction={openUploadDialog}
    />
  )
}
