import { encodeObjectKey } from "@nangua/shared"

export function thumbnailUrl(key: string, size = 400): string {
  return `/api/image/${encodeObjectKey(key)}?w=${size}&h=${size}&fit=cover`
}

export function thumbnailSrcSet(key: string): string {
  return `${thumbnailUrl(key, 400)} 1x, ${thumbnailUrl(key, 600)} 2x`
}
