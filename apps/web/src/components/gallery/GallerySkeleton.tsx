import { Skeleton } from "@/components/ui/skeleton"

interface GallerySkeletonProps {
  count?: number
}

export function GallerySkeleton({ count = 12 }: GallerySkeletonProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="aspect-square" />
      ))}
    </div>
  )
}
