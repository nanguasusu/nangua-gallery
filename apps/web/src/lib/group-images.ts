import type { ImageItem } from "@/types/image"
import { formatMonthHeading, monthGroupKey } from "@/lib/format"

export interface ImageMonthGroup {
  key: string
  label: string
  images: ImageItem[]
}

export interface GalleryPhotoCell {
  image: ImageItem
  width: number
  height: number
}

export type GalleryVirtualRow =
  | { type: "header"; key: string; label: string; height: number }
  | { type: "photos"; key: string; cells: GalleryPhotoCell[]; height: number }

const HEADER_HEIGHT = 48
const GROUP_GAP = 16
const MIN_ASPECT = 0.45
const MAX_ASPECT = 2.8

function aspectOf(image: ImageItem): number {
  const width = image.width
  const height = image.height
  if (!width || !height || width <= 0 || height <= 0) {
    return 1
  }
  return Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, width / height))
}

export function galleryLayoutMetrics(containerWidth: number) {
  const gap = containerWidth < 640 ? 8 : 12
  const targetRowHeight = containerWidth < 640 ? 148 : containerWidth < 1024 ? 188 : 220
  return { gap, targetRowHeight }
}

function packJustifiedRows(
  images: ImageItem[],
  containerWidth: number,
  gap: number,
  targetRowHeight: number,
): Array<{ cells: GalleryPhotoCell[]; height: number }> {
  if (images.length === 0 || containerWidth <= 0) {
    return []
  }

  const rows: Array<{ cells: GalleryPhotoCell[]; height: number }> = []
  let current: ImageItem[] = []
  let aspectSum = 0

  const emit = (items: ImageItem[], aspects: number, justify: boolean) => {
    if (items.length === 0) {
      return
    }
    const gaps = gap * Math.max(0, items.length - 1)
    const available = Math.max(containerWidth - gaps, 1)
    const naturalWidth = aspects * targetRowHeight
    const height = justify ? available / aspects : Math.min(targetRowHeight, available / aspects)
    const scale = justify ? available / naturalWidth : height / targetRowHeight
    const rowHeight = Math.max(96, Math.round(targetRowHeight * scale))
    let used = 0
    const cells = items.map((image, index) => {
      const isLast = index === items.length - 1
      const width = isLast && justify
        ? Math.max(1, containerWidth - gaps - used)
        : Math.max(1, Math.round(aspectOf(image) * rowHeight))
      used += width
      return { image, width, height: rowHeight }
    })
    rows.push({ cells, height: rowHeight })
  }

  for (const image of images) {
    const aspect = aspectOf(image)
    const nextCount = current.length + 1
    const nextAspect = aspectSum + aspect
    const nextWidth = nextAspect * targetRowHeight + gap * Math.max(0, nextCount - 1)
    if (current.length > 0 && nextWidth > containerWidth) {
      emit(current, aspectSum, true)
      current = [image]
      aspectSum = aspect
    } else {
      current.push(image)
      aspectSum = nextAspect
    }
  }

  if (current.length > 0) {
    const gaps = gap * Math.max(0, current.length - 1)
    const filled = aspectSum * targetRowHeight + gaps > containerWidth * 0.72
    emit(current, aspectSum, filled)
  }

  return rows
}

export function buildGalleryRows(
  images: ImageItem[],
  containerWidth: number,
  options?: { groupByMonth?: boolean },
): GalleryVirtualRow[] {
  const { gap, targetRowHeight } = galleryLayoutMetrics(containerWidth)
  const groupByMonth = options?.groupByMonth !== false
  const groups = groupByMonth
    ? groupImagesByMonth(images)
    : [{ key: "all", label: "", images }]
  const rows: GalleryVirtualRow[] = []

  groups.forEach((group, groupIndex) => {
    if (groupByMonth) {
      rows.push({
        type: "header",
        key: `header:${group.key}`,
        label: group.label,
        height: HEADER_HEIGHT + (groupIndex === 0 ? 0 : GROUP_GAP),
      })
    }

    const packed = packJustifiedRows(group.images, containerWidth, gap, targetRowHeight)
    packed.forEach((row, index) => {
      rows.push({
        type: "photos",
        key: `photos:${group.key}:${row.cells[0]?.image.id ?? index}`,
        cells: row.cells,
        height: row.height + gap,
      })
    })
  })

  return rows
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
