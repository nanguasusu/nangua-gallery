import type { ImageItem } from "@/types/image"
import { formatMonthHeading, monthGroupKey } from "@/lib/format"

export interface ImageMonthGroup {
  key: string
  label: string
  images: ImageItem[]
}

export function groupImagesByMonth(images: ImageItem[]): ImageMonthGroup[] {
  const groups: ImageMonthGroup[] = []

  for (const image of images) {
    const key = monthGroupKey(image.uploadedAt)
    const last = groups.at(-1)
    if (last && last.key === key) {
      last.images.push(image)
      continue
    }

    groups.push({
      key,
      label: formatMonthHeading(key),
      images: [image],
    })
  }

  return groups
}
