import {
  encodeObjectKey,
  filenameFromKey,
  type ImageItem,
  type AlbumSummary,
} from "@nangua/shared"
import { buildPublicImageUrl } from "../utils/image"
import type { images } from "../db/schema"

type ImageRow = typeof images.$inferSelect

export function nowIso() {
  return new Date().toISOString()
}

export function newId() {
  return crypto.randomUUID()
}

export function encodeListCursor(uploadedAt: string, id: string): string {
  return btoa(JSON.stringify({ t: uploadedAt, i: id }))
}

export function decodeListCursor(cursor: string | undefined): { t: string; i: string } | null {
  if (!cursor) {
    return null
  }

  try {
    const parsed = JSON.parse(atob(cursor)) as { t?: unknown; i?: unknown }
    if (typeof parsed.t === "string" && typeof parsed.i === "string") {
      return { t: parsed.t, i: parsed.i }
    }
  } catch {
    return null
  }

  return null
}

export function sortTimestamp(row: Pick<ImageRow, "uploadedAt" | "createdAt">): string {
  return row.uploadedAt || row.createdAt
}

export function toImageItem(
  row: ImageRow,
  publicBaseUrl: string,
  albumSummaries: AlbumSummary[] = [],
): ImageItem {
  return {
    id: row.id,
    key: row.objectKey,
    filename: filenameFromKey(row.objectKey),
    originalName: row.originalName ?? undefined,
    url: buildPublicImageUrl(publicBaseUrl, row.objectKey),
    thumbnailUrl: `/api/image/${encodeObjectKey(row.objectKey)}?w=400&h=400&fit=cover`,
    size: row.size,
    uploadedAt: sortTimestamp(row),
    favorite: row.favorite,
    deletedAt: row.deletedAt,
    albums: albumSummaries.length > 0 ? albumSummaries : undefined,
  }
}
