export const IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "avif",
  "bmp",
] as const

export type ImageExtension = (typeof IMAGE_EXTENSIONS)[number]

const IMAGE_EXTENSION_SET = new Set<string>(IMAGE_EXTENSIONS)

export interface ImageItem {
  id: string
  key: string
  filename: string
  originalName?: string
  url: string
  thumbnailUrl?: string
  size: number
  width?: number
  height?: number
  uploadedAt: string
  favorite: boolean
  deletedAt?: string | null
  albums?: AlbumSummary[]
}

export interface AlbumSummary {
  id: string
  name: string
}

export interface Album {
  id: string
  name: string
  description?: string | null
  coverImage?: ImageItem | null
  imageCount: number
  createdAt: string
  updatedAt: string
}

export interface ImageListResponse {
  items: ImageItem[]
  cursor?: string
  hasMore: boolean
}

export interface ImageUploadResponse {
  item: ImageItem
}

export interface ImageDeleteResponse {
  deleted: string[]
}

export interface SyncResult {
  scanned: number
  inserted: number
  skipped: number
  failed: number
  sized: number
  cursor?: string
  hasMore: boolean
}

export interface GalleryConfig {
  enableDelete: boolean
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
  }
}

export function filenameFromKey(key: string): string {
  const segments = key.split("/")
  const last = segments[segments.length - 1]
  return last && last.length > 0 ? last : key
}

export function isImageKey(key: string): boolean {
  if (!key || key.endsWith("/")) {
    return false
  }

  const filename = filenameFromKey(key)
  const dot = filename.lastIndexOf(".")
  if (dot <= 0 || dot === filename.length - 1) {
    return false
  }

  const ext = filename.slice(dot + 1).toLowerCase()
  return IMAGE_EXTENSION_SET.has(ext)
}

export function encodeObjectKey(key: string): string {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")
}

export function decodeObjectKey(encoded: string): string {
  return encoded
    .split("/")
    .map((segment) => decodeURIComponent(segment))
    .join("/")
}

export function escapeLike(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")
}
