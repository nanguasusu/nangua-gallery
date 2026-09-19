export const DEFAULT_MAX_IMAGE_BYTES = 20 * 1024 * 1024
export const HARD_MAX_IMAGE_BYTES = 50 * 1024 * 1024
export const DEFAULT_UPLOAD_ROOT = "uploads"
export const DEFAULT_UPLOAD_CONCURRENCY = 3
export const DEFAULT_WEBP_QUALITY = 80

export const UPLOAD_SIZE_MB_OPTIONS = [10, 20, 50] as const
export const UPLOAD_CONCURRENCY_OPTIONS = [1, 3, 5] as const
export const WEBP_QUALITY_OPTIONS = [60, 75, 80, 90] as const

export type UploadSizeMb = (typeof UPLOAD_SIZE_MB_OPTIONS)[number]
export type UploadConcurrency = (typeof UPLOAD_CONCURRENCY_OPTIONS)[number]
export type WebpQuality = (typeof WEBP_QUALITY_OPTIONS)[number]

export interface UploadSettings {
  uploadRoot: string
  monthlyFolders: boolean
  maxImageBytes: number
  uploadConcurrency: UploadConcurrency
}

export const DEFAULT_UPLOAD_SETTINGS: UploadSettings = {
  uploadRoot: DEFAULT_UPLOAD_ROOT,
  monthlyFolders: true,
  maxImageBytes: DEFAULT_MAX_IMAGE_BYTES,
  uploadConcurrency: DEFAULT_UPLOAD_CONCURRENCY,
}

const ROOT_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,62}(?:\/[a-zA-Z0-9][a-zA-Z0-9._-]{0,62}){0,6}$/

export function bytesFromMb(mb: number): number {
  return mb * 1024 * 1024
}

export function mbFromBytes(bytes: number): number {
  return Math.round(bytes / (1024 * 1024))
}

export function isUploadSizeMb(value: number): value is UploadSizeMb {
  return (UPLOAD_SIZE_MB_OPTIONS as readonly number[]).includes(value)
}

export function isUploadConcurrency(value: number): value is UploadConcurrency {
  return (UPLOAD_CONCURRENCY_OPTIONS as readonly number[]).includes(value)
}

export function isWebpQuality(value: number): value is WebpQuality {
  return (WEBP_QUALITY_OPTIONS as readonly number[]).includes(value)
}

export function normalizeUploadRoot(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.replaceAll("\\", "/").replace(/^\/+/, "").replace(/\/+$/, "").trim()
  if (!ROOT_PATTERN.test(trimmed) || trimmed.includes("..")) {
    return null
  }

  return trimmed
}

export function parseMaxImageBytes(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null
  }

  const mb = mbFromBytes(value)
  if (!isUploadSizeMb(mb) || bytesFromMb(mb) !== value) {
    return null
  }

  return value
}

export function parseUploadConcurrency(value: unknown): UploadConcurrency | null {
  if (typeof value !== "number" || !Number.isInteger(value) || !isUploadConcurrency(value)) {
    return null
  }
  return value
}

export function parseWebpQuality(value: unknown): WebpQuality {
  if (typeof value === "number" && isWebpQuality(value)) {
    return value
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number.parseInt(value, 10)
    if (isWebpQuality(parsed)) {
      return parsed
    }
  }
  return DEFAULT_WEBP_QUALITY
}

export function parseConvertWebp(value: unknown): boolean {
  return value === true || value === "true" || value === "1" || value === "on"
}

export function shouldConvertToWebp(mime: string): boolean {
  return mime === "image/jpeg" || mime === "image/png" || mime === "image/bmp"
}

export function buildUploadDirectory(
  root: string,
  monthlyFolders: boolean,
  now = new Date(),
): string {
  const prefix = normalizeUploadRoot(root) ?? DEFAULT_UPLOAD_ROOT
  if (!monthlyFolders) {
    return prefix
  }

  const year = String(now.getUTCFullYear())
  const month = String(now.getUTCMonth() + 1).padStart(2, "0")
  return `${prefix}/${year}/${month}`
}

export function formatMaxBytesLabel(bytes: number): string {
  return `${mbFromBytes(bytes)} MB`
}

export function previewObjectKey(root: string, monthlyFolders: boolean, extension = "jpg"): string {
  return `${buildUploadDirectory(root, monthlyFolders)}/<uuid>.${extension}`
}
