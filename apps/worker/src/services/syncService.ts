import { eq, inArray } from "drizzle-orm"
import { isImageKey, readExifTakenAt, readImageDimensions, type SyncResult } from "@nangua/shared"
import type { Env } from "../types/env"
import { getDb } from "../db/client"
import { images } from "../db/schema"
import { nowIso } from "../db/map"
import { metadataFromR2Object, ensureShortIds } from "./imageService"

const DEFAULT_PAGE_SIZE = 100
const DEFAULT_MAX_PAGES = 40
const HEADER_BYTES = 256 * 1024
const DIMENSION_CONCURRENCY = 6
const MAX_DIMENSION_READS = 48

interface ImageFileMeta {
  width: number | null
  height: number | null
  takenAt: string | null
}

export async function syncR2ToD1(
  env: Env,
  input: {
    cursor?: string
    limit?: number
    maxPages?: number
  } = {},
): Promise<SyncResult> {
  const pageSize = Math.min(Math.max(input.limit ?? DEFAULT_PAGE_SIZE, 1), 100)
  const maxPages = Math.min(Math.max(input.maxPages ?? DEFAULT_MAX_PAGES, 1), 80)
  const db = getDb(env)

  let scanned = 0
  let inserted = 0
  let skipped = 0
  let failed = 0
  let sized = 0
  let r2Cursor = input.cursor
  let hasMore = true
  let pages = 0
  let remainingDimensionReads = MAX_DIMENSION_READS

  while (pages < maxPages) {
    const listed = await env.BUCKET.list({
      limit: pageSize,
      cursor: r2Cursor,
      include: ["httpMetadata", "customMetadata"],
    })
    pages += 1

    const objects = listed.objects.filter((object) => isImageKey(object.key))
    scanned += objects.length

    if (objects.length > 0) {
      const keys = objects.map((object) => object.key)
      const existing = await db
        .select({
          id: images.id,
          objectKey: images.objectKey,
          width: images.width,
          height: images.height,
          shortId: images.shortId,
          takenAt: images.takenAt,
        })
        .from(images)
        .where(inArray(images.objectKey, keys))
      const existingByKey = new Map(existing.map((row) => [row.objectKey, row]))
      skipped += existingByKey.size

      const toInsert = objects.filter((object) => !existingByKey.has(object.key))
      if (toInsert.length > 0) {
        const meta = await mapPool(toInsert, DIMENSION_CONCURRENCY, async (object) => {
          if (remainingDimensionReads <= 0) {
            return null
          }
          remainingDimensionReads -= 1
          return readR2ImageMeta(env, object.key)
        })
        const rows = toInsert.map((object, index) => {
          const file = meta[index]
          const takenAt = file?.takenAt ?? null
          const base = metadataFromR2Object(object)
          return {
            ...base,
            width: file?.width ?? null,
            height: file?.height ?? null,
            takenAt,
            sortAt: takenAt || base.sortAt,
          }
        })
        sized += rows.filter((row) => row.width && row.height).length

        try {
          await db.insert(images).values(rows).onConflictDoNothing()
          inserted += rows.length
        } catch (error) {
          console.error("D1 batch insert during sync failed, retrying one by one", error)
          for (const row of rows) {
            try {
              await db.insert(images).values(row).onConflictDoNothing()
              inserted += 1
            } catch (rowError) {
              failed += 1
              console.error("D1 sync insert failed", row.objectKey, rowError)
            }
          }
        }
      }

      const missingMeta = existing.filter(
        (row) => row.width === null || row.height === null || !row.takenAt,
      )
      const toRead = missingMeta.slice(0, remainingDimensionReads)
      if (toRead.length > 0) {
        remainingDimensionReads -= toRead.length
        const updates = await mapPool(toRead, DIMENSION_CONCURRENCY, async (row) => {
          const file = await readR2ImageMeta(env, row.objectKey)
          return file ? { id: row.id, ...file } : null
        })
        const timestamp = nowIso()
        for (const update of updates) {
          if (!update) {
            continue
          }
          const patch: {
            width?: number
            height?: number
            takenAt?: string
            sortAt?: string
            updatedAt: string
          } = { updatedAt: timestamp }
          if (update.width && update.height) {
            patch.width = update.width
            patch.height = update.height
            sized += 1
          }
          if (update.takenAt) {
            patch.takenAt = update.takenAt
            patch.sortAt = update.takenAt
          }
          if (patch.width || patch.takenAt) {
            await db.update(images).set(patch).where(eq(images.id, update.id))
          }
        }
      }

      const missingShort = existing.filter((row) => !row.shortId).map((row) => row.id)
      if (missingShort.length > 0) {
        await ensureShortIds(env, missingShort.slice(0, 100))
      }
    }

    if (!listed.truncated) {
      hasMore = false
      r2Cursor = undefined
      break
    }

    r2Cursor = listed.cursor
    hasMore = true
  }

  return {
    scanned,
    inserted,
    skipped,
    failed,
    sized,
    cursor: hasMore ? r2Cursor : undefined,
    hasMore,
  }
}

async function readR2ImageMeta(env: Env, key: string): Promise<ImageFileMeta | null> {
  try {
    const object = await env.BUCKET.get(key, { range: { offset: 0, length: HEADER_BYTES } })
    if (!object) {
      return null
    }
    const bytes = new Uint8Array(await object.arrayBuffer())
    const size = readImageDimensions(bytes)
    return {
      width: size?.width ?? null,
      height: size?.height ?? null,
      takenAt: readExifTakenAt(bytes),
    }
  } catch (error) {
    console.error("Failed to read image metadata", key, error)
    return null
  }
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let index = 0

  async function worker() {
    while (index < items.length) {
      const current = index
      index += 1
      const item = items[current]
      if (item === undefined) {
        continue
      }
      results[current] = await mapper(item)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) || 0 }, () => worker()))
  return results
}
