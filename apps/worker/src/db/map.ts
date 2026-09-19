import {
  encodeObjectKey,
  filenameFromKey,
  type ImageItem,
  type AlbumSummary,
  type ImageSort,
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

export function encodeListCursor(payload: { t: string; i: string; s?: ImageSort }): string {
  return btoa(JSON.stringify(payload))
}

export function decodeListCursor(cursor: string | undefined): { t: string; i: string; s?: ImageSort } | null {
  if (!cursor) {
    return null
  }

  try {
    const parsed = JSON.parse(atob(cursor)) as { t?: unknown; i?: unknown; s?: unknown }
    if (typeof parsed.t === "string" && typeof parsed.i === "string") {
      const sort = parsed.s === "name" || parsed.s === "size" || parsed.s === "date" ? parsed.s : undefined
      return { t: parsed.t, i: parsed.i, s: sort }
    }
  } catch {
    return null
  }

  return null
}

export function sortTimestamp(row: Pick<ImageRow, "sortAt" | "takenAt" | "uploadedAt" | "createdAt">): string {
  return row.sortAt || row.takenAt || row.uploadedAt || row.createdAt
}

export function nameSortKey(row: Pick<ImageRow, "originalName" | "objectKey">): string {
  return (row.originalName || row.objectKey).toLowerCase()
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
    thumbnailUrl: `/api/image/${encodeObjectKey(row.objectKey)}?w=400&fit=scale-down`,
    size: row.size,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    uploadedAt: sortTimestamp(row),
    takenAt: row.takenAt,
    favorite: row.favorite,
    deletedAt: row.deletedAt,
    albums: albumSummaries.length > 0 ? albumSummaries : undefined,
    shortId: row.shortId ?? undefined,
  }
}
