import { encodeObjectKey } from "@nangua/shared"

export function thumbnailUrl(key: string, width = 400): string {
  return `/api/image/${encodeObjectKey(key)}?w=${width}&fit=scale-down`
}

export function thumbnailSrcSet(key: string, width = 400): string {
  const retina = Math.min(1600, Math.round(width * 1.5))
  return `${thumbnailUrl(key, width)} 1x, ${thumbnailUrl(key, retina)} 2x`
}
