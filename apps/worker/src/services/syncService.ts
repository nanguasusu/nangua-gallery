import { eq, inArray } from "drizzle-orm"
import { isImageKey, readImageDimensions, type ImageDimensions, type SyncResult } from "@nangua/shared"
import type { Env } from "../types/env"
import { getDb } from "../db/client"
import { images } from "../db/schema"
import { nowIso } from "../db/map"
import { metadataFromR2Object } from "./imageService"

const DEFAULT_PAGE_SIZE = 100
const DEFAULT_MAX_PAGES = 40
const HEADER_BYTES = 256 * 1024
const DIMENSION_CONCURRENCY = 6
const MAX_DIMENSION_READS = 48

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
        })
        .from(images)
        .where(inArray(images.objectKey, keys))
      const existingByKey = new Map(existing.map((row) => [row.objectKey, row]))
      skipped += existingByKey.size

      const toInsert = objects.filter((object) => !existingByKey.has(object.key))
      if (toInsert.length > 0) {
        const dimensions = await mapPool(toInsert, DIMENSION_CONCURRENCY, async (object) => {
          if (remainingDimensionReads <= 0) {
            return null
          }
          remainingDimensionReads -= 1
          return readR2ImageDimensions(env, object.key)
        })
        const rows = toInsert.map((object, index) => {
          const size = dimensions[index]
          return {
            ...metadataFromR2Object(object),
            width: size?.width ?? null,
            height: size?.height ?? null,
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

      const missingSize = existing.filter((row) => row.width === null || row.height === null)
      const toSize = missingSize.slice(0, remainingDimensionReads)
      if (toSize.length > 0) {
        remainingDimensionReads -= toSize.length
        const updates = await mapPool(toSize, DIMENSION_CONCURRENCY, async (row) => {
          const size = await readR2ImageDimensions(env, row.objectKey)
          return size ? { id: row.id, ...size } : null
        })
        const timestamp = nowIso()
        for (const update of updates) {
          if (!update) {
            continue
          }
          await db
            .update(images)
            .set({ width: update.width, height: update.height, updatedAt: timestamp })
            .where(eq(images.id, update.id))
          sized += 1
        }
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

async function readR2ImageDimensions(env: Env, key: string): Promise<ImageDimensions | null> {
  try {
    const object = await env.BUCKET.get(key, { range: { offset: 0, length: HEADER_BYTES } })
    if (!object) {
      return null
    }
    return readImageDimensions(new Uint8Array(await object.arrayBuffer()))
  } catch (error) {
    console.error("Failed to read image dimensions", key, error)
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
