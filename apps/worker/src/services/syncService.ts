import { inArray } from "drizzle-orm"
import { isImageKey, type SyncResult } from "@nangua/shared"
import type { Env } from "../types/env"
import { getDb } from "../db/client"
import { images } from "../db/schema"
import { metadataFromR2Object } from "./imageService"

const DEFAULT_PAGE_SIZE = 100
const DEFAULT_MAX_PAGES = 40

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
  let r2Cursor = input.cursor
  let hasMore = true
  let pages = 0

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
        .select({ objectKey: images.objectKey })
        .from(images)
        .where(inArray(images.objectKey, keys))
      const existingSet = new Set(existing.map((row) => row.objectKey))
      skipped += existingSet.size

      const toInsert = objects.filter((object) => !existingSet.has(object.key))
      if (toInsert.length > 0) {
        const rows = toInsert.map(metadataFromR2Object)
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
    cursor: hasMore ? r2Cursor : undefined,
    hasMore,
  }
}
