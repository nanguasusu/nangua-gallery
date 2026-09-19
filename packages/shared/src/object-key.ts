import { extensionFromMime } from "./mime"

const UNSAFE_SEGMENT = /^(?:\.|\.\.)$/

export function defaultUploadDirectory(now = new Date()): string {
  const year = String(now.getUTCFullYear())
  const month = String(now.getUTCMonth() + 1).padStart(2, "0")
  return `uploads/${year}/${month}`
}

export function sanitizeDirectory(path: string): string | null {
  const trimmed = path.replaceAll("\\", "/").replace(/^\/+/, "").replace(/\/+$/, "").trim()
  if (!trimmed || trimmed.length > 512 || trimmed.includes("\0")) {
    return null
  }

  const segments = trimmed.split("/")
  if (segments.some((segment) => !segment || UNSAFE_SEGMENT.test(segment))) {
    return null
  }

  return segments.join("/")
}

export function generateObjectKey(
  mime: string,
  directory?: string,
  now = new Date(),
  id = crypto.randomUUID(),
): string {
  const extension = extensionFromMime(mime)
  if (!extension) {
    throw new Error("Unsupported image type")
  }

  const prefix = directory && directory.length > 0 ? directory : defaultUploadDirectory(now)
  return `${prefix}/${id}.${extension}`
}
