import { and, eq, isNotNull, isNull, lte } from "drizzle-orm"
import type { Env } from "../types/env"
import { getDb } from "../db/client"
import { images } from "../db/schema"
import { isDeleteEnabled } from "./delete"
import { permanentlyDeleteImages } from "./imageService"

const TRASH_TTL_MS = 30 * 24 * 60 * 60 * 1000
const MAX_PURGE_BATCH = 50

export interface GalleryMaintenanceResult {
  skipped?: boolean
  purged: number
}

export async function runGalleryMaintenance(env: Env): Promise<GalleryMaintenanceResult> {
  if (!isDeleteEnabled(env)) {
    return { skipped: true, purged: 0 }
  }

  const db = getDb(env)
  const cutoff = new Date(Date.now() - TRASH_TTL_MS).toISOString()
  const pending = await db
    .select({ id: images.id })
    .from(images)
    .where(eq(images.purgeStatus, "pending"))
    .limit(MAX_PURGE_BATCH)
  const expired = await db
    .select({ id: images.id })
    .from(images)
    .where(and(isNotNull(images.deletedAt), isNull(images.purgeStatus), lte(images.deletedAt, cutoff)))
    .limit(MAX_PURGE_BATCH)

  const ids = [...new Set([...pending, ...expired].map((row) => row.id))]
  if (ids.length === 0) {
    return { purged: 0 }
  }

  const deleted = await permanentlyDeleteImages(env, ids)
  return { purged: deleted.length }
}
