import { toast } from "sonner"
import type { ImageItem } from "@/types/image"
import { ensureShortIds, patchImagesInCache } from "@/lib/api"
import { shortLink } from "@/lib/short-url"

export async function copyShortLinks(images: ImageItem[]) {
  if (images.length === 0) {
    return
  }

  const missing = images.filter((image) => !image.shortId).map((image) => image.id)
  const shortIds: Record<string, string> = {}
  for (const image of images) {
    if (image.shortId) {
      shortIds[image.id] = image.shortId
    }
  }

  if (missing.length > 0) {
    const assigned = await ensureShortIds(missing)
    Object.assign(shortIds, assigned)
    for (const [id, shortId] of Object.entries(assigned)) {
      patchImagesInCache([id], { shortId })
    }
  }

  const urls = images
    .map((image) => shortIds[image.id])
    .filter((id): id is string => Boolean(id))
    .map(shortLink)

  if (urls.length === 0) {
    toast.error("无法创建短链接")
    return
  }

  try {
    await navigator.clipboard.writeText(urls.join("\n"))
    toast.success("已复制短链接")
  } catch {
    toast.error("复制失败")
  }
}
