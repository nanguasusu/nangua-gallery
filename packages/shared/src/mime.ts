export const MAX_IMAGE_BYTES = 20 * 1024 * 1024
export const MAX_DELETE_KEYS = 100
export const UPLOAD_CONCURRENCY = 3
export const MULTIPART_OVERHEAD_BYTES = 1024 * 1024

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/bmp",
] as const

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number]

const ALLOWED_MIME_SET = new Set<string>(ALLOWED_IMAGE_MIME_TYPES)

const MIME_ALIASES: Record<string, AllowedImageMimeType> = {
  "image/jpg": "image/jpeg",
}

const MIME_TO_EXTENSION: Record<AllowedImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/bmp": "bmp",
}

const EXTENSION_TO_MIME: Record<string, AllowedImageMimeType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  bmp: "image/bmp",
}

export function mimeFromExtension(filenameOrKey: string): AllowedImageMimeType | null {
  const filename = filenameOrKey.split("/").at(-1) ?? filenameOrKey
  const dot = filename.lastIndexOf(".")
  if (dot <= 0 || dot === filename.length - 1) {
    return null
  }

  const ext = filename.slice(dot + 1).toLowerCase()
  return EXTENSION_TO_MIME[ext] ?? null
}

export function normalizeImageMime(value: string | undefined): AllowedImageMimeType | null {
  if (!value) {
    return null
  }

  const lowered = value.toLowerCase().trim()
  const aliased = MIME_ALIASES[lowered] ?? lowered
  if (ALLOWED_MIME_SET.has(aliased)) {
    return aliased as AllowedImageMimeType
  }

  return null
}

export function extensionFromMime(mime: string): string | null {
  const normalized = normalizeImageMime(mime)
  return normalized ? MIME_TO_EXTENSION[normalized] : null
}

export function sniffImageMime(bytes: Uint8Array): AllowedImageMimeType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg"
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png"
  }

  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return "image/gif"
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp"
  }

  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return "image/bmp"
  }

  if (bytes.length >= 12) {
    const header = String.fromCharCode(...bytes.slice(0, Math.min(bytes.length, 32)))
    if (header.includes("ftyp") && (header.includes("avif") || header.includes("avis"))) {
      return "image/avif"
    }
  }

  return null
}

export function resolveUploadMime(
  declaredType: string | undefined,
  bytes: Uint8Array,
): AllowedImageMimeType | null {
  const sniffed = sniffImageMime(bytes)
  if (!sniffed) {
    return null
  }

  const declared = normalizeImageMime(declaredType)
  if (declared && declared !== sniffed) {
    return null
  }

  return sniffed
}
