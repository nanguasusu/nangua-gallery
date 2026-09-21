import { copyTitleFromFilename, formatHtml } from "@nangua/shared"
import type { ImageItem } from "@/types/image"
import { useCopyStore } from "@/stores/copyStore"

export function htmlFromImages(images: ImageItem[]): string {
  const includeTitle = useCopyStore.getState().htmlIncludeTitle
  return formatHtml(
    images.map((image) => image.url),
    {
      titles: includeTitle
        ? images.map((image) => copyTitleFromFilename(image.originalName || image.filename))
        : undefined,
    },
  )
}
