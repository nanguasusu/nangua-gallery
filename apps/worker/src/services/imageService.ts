import { and, desc, eq, inArray, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm"
import {
  escapeLike,
  filenameFromKey,
  mimeFromExtension,
  newShortId,
  parseImageSort,
  type ImageItem,
  type ImageListResponse,
  type ImageSort,
} from "@nangua/shared"
import type { Env } from "../types/env"
import { getDb } from "../db/client"
import { albumImages, albums, images } from "../db/schema"
import { decodeListCursor, encodeListCursor, nameSortKey, newId, nowIso, sortTimestamp, toImageItem } from "../db/map"
import { DeleteError, assertDeleteEnabled, deleteImageKeys } from "./delete"

export class ImageServiceError extends Error {
  readonly code: string
  readonly status: 400 | 403 | 404 | 500

  constructor(code: string, message: string, status: 400 | 403 | 404 | 500) {
    super(message)
    this.name = "ImageServiceError"
    this.code = code
    this.status = status
  }
}

export interface ListImagesQuery {
  cursor?: string
  limit: number
  search?: string
  favorite?: boolean
  albumId?: string
  deleted?: boolean
  sort?: ImageSort
}

export async function listImagesFromDb(
  env: Env,
  query: ListImagesQuery,
): Promise<ImageListResponse> {
  const db = getDb(env)
  const sort = parseImageSort(query.sort)
  const parsedCursor = decodeListCursor(query.cursor)
  const cursor = parsedCursor && (parsedCursor.s ?? "date") === sort ? parsedCursor : null
  const filters: SQL[] = []

  filters.push(isNull(images.purgeStatus))

  if (query.deleted) {
    filters.push(isNotNull(images.deletedAt))
  } else {
    filters.push(isNull(images.deletedAt))
  }

  if (query.favorite) {
    filters.push(eq(images.favorite, true))
  }

  if (query.search && query.search.trim()) {
    const like = `%${escapeLike(query.search.trim())}%`
    const searchFilter = or(
      sql`${images.originalName} LIKE ${like} ESCAPE '\\'`,
      sql`${images.objectKey} LIKE ${like} ESCAPE '\\'`,
      sql`${images.takenAt} LIKE ${like} ESCAPE '\\'`,
      sql`exists (
        select 1 from ${albumImages}
        inner join ${albums} on ${albums.id} = ${albumImages.albumId}
        where ${albumImages.imageId} = ${images.id}
          and ${albums.name} LIKE ${like} ESCAPE '\\'
      )`,
    )
    if (searchFilter) {
      filters.push(searchFilter)
    }
  }

  const nameExpr = sql<string>`lower(coalesce(${images.originalName}, ${images.objectKey}))`

  if (cursor) {
    if (sort === "name") {
      filters.push(
        sql`(${nameExpr} > ${cursor.t} OR (${nameExpr} = ${cursor.t} AND ${images.id} > ${cursor.i}))`,
      )
    } else if (sort === "size") {
      const size = Number.parseInt(cursor.t, 10)
      if (Number.isFinite(size)) {
        filters.push(
          sql`(${images.size} < ${size} OR (${images.size} = ${size} AND ${images.id} < ${cursor.i}))`,
        )
      }
    } else {
      filters.push(
        sql`(${images.sortAt} < ${cursor.t} OR (${images.sortAt} = ${cursor.t} AND ${images.id} < ${cursor.i}))`,
      )
    }
  }

  const whereClause = filters.length === 1 ? filters[0] : and(...filters)
  const take = query.limit + 1
  const orderBy =
    sort === "name"
      ? [nameExpr, images.id]
      : sort === "size"
        ? [desc(images.size), desc(images.id)]
        : [desc(images.sortAt), desc(images.id)]

  const rows = query.albumId
    ? await db
        .select({ image: images })
        .from(images)
        .innerJoin(albumImages, eq(albumImages.imageId, images.id))
        .where(and(eq(albumImages.albumId, query.albumId), whereClause))
        .orderBy(...orderBy)
        .limit(take)
        .then((result) => result.map((row) => row.image))
    : await db
        .select()
        .from(images)
        .where(whereClause)
        .orderBy(...orderBy)
        .limit(take)

  const hasMore = rows.length > query.limit
  const page = hasMore ? rows.slice(0, query.limit) : rows
  const last = page.at(-1)
  const albumMap = await loadAlbumSummaries(env, page.map((row) => row.id))
  const cursorValue = last
    ? sort === "name"
      ? nameSortKey(last)
      : sort === "size"
        ? String(last.size)
        : sortTimestamp(last)
    : undefined

  return {
    items: page.map((row) => toImageItem(row, env.PUBLIC_IMAGE_BASE_URL, albumMap.get(row.id) ?? [])),
    cursor: last && hasMore && cursorValue !== undefined ? encodeListCursor({ t: cursorValue, i: last.id, s: sort }) : undefined,
    hasMore,
  }
}

async function loadAlbumSummaries(env: Env, imageIds: string[]) {
  const map = new Map<string, { id: string; name: string }[]>()
  if (imageIds.length === 0) {
    return map
  }

  const db = getDb(env)
  const rows = await db
    .select({
      imageId: albumImages.imageId,
      id: albums.id,
      name: albums.name,
    })
    .from(albumImages)
    .innerJoin(albums, eq(albums.id, albumImages.albumId))
    .where(inArray(albumImages.imageId, imageIds))

  for (const row of rows) {
    const current = map.get(row.imageId) ?? []
    current.push({ id: row.id, name: row.name })
    map.set(row.imageId, current)
  }

  return map
}

export async function insertUploadedImage(
  env: Env,
  input: {
    objectKey: string
    originalName: string
    mimeType: string
    size: number
    width?: number | null
    height?: number | null
    uploadedAt: string
    takenAt?: string | null
  },
): Promise<ImageItem> {
  const db = getDb(env)
  const timestamp = nowIso()
  const takenAt = input.takenAt || null
  const row = {
    id: newId(),
    objectKey: input.objectKey,
    originalName: input.originalName.slice(0, 200),
    mimeType: input.mimeType,
    size: input.size,
    width: input.width ?? null,
    height: input.height ?? null,
    uploadedAt: input.uploadedAt,
    createdAt: timestamp,
    updatedAt: timestamp,
    favorite: false,
    deletedAt: null,
    shortId: await allocateShortId(env),
    sortAt: takenAt || input.uploadedAt || timestamp,
    takenAt,
    purgeStatus: null,
  }

  await db.insert(images).values(row)
  return toImageItem(row, env.PUBLIC_IMAGE_BASE_URL)
}

export async function getImageById(env: Env, id: string) {
  const db = getDb(env)
  const [row] = await db.select().from(images).where(eq(images.id, id)).limit(1)
  return row ?? null
}

export async function setFavorite(env: Env, id: string, favorite: boolean): Promise<ImageItem> {
  const existing = await getImageById(env, id)
  if (!existing || existing.deletedAt) {
    throw new ImageServiceError("NOT_FOUND", "图片不存在", 404)
  }

  const db = getDb(env)
  const [updated] = await db
    .update(images)
    .set({ favorite, updatedAt: nowIso() })
    .where(eq(images.id, id))
    .returning()

  if (!updated) {
    throw new ImageServiceError("NOT_FOUND", "图片不存在", 404)
  }

  return toImageItem(updated, env.PUBLIC_IMAGE_BASE_URL)
}

export async function setFavoriteMany(
  env: Env,
  imageIds: string[],
  favorite: boolean,
): Promise<string[]> {
  const ids = normalizeImageIds(imageIds)
  const db = getDb(env)
  await db
    .update(images)
    .set({ favorite, updatedAt: nowIso() })
    .where(and(inArray(images.id, ids), isNull(images.deletedAt)))

  return ids
}

export async function trashImages(env: Env, imageIds: string[]): Promise<string[]> {
  const ids = normalizeImageIds(imageIds)
  const db = getDb(env)
  const timestamp = nowIso()
  await db
    .update(images)
    .set({ deletedAt: timestamp, updatedAt: timestamp })
    .where(and(inArray(images.id, ids), isNull(images.deletedAt)))

  return ids
}

export async function trashImagesByKeys(env: Env, keys: string[]): Promise<string[]> {
  const db = getDb(env)
  const rows = await db.select({ id: images.id, objectKey: images.objectKey }).from(images).where(inArray(images.objectKey, keys))
  if (rows.length === 0) {
    return []
  }

  await trashImages(env, rows.map((row) => row.id))
  return rows.map((row) => row.objectKey)
}

export async function restoreImages(env: Env, imageIds: string[]): Promise<string[]> {
  const ids = normalizeImageIds(imageIds)
  const db = getDb(env)
  await db
    .update(images)
    .set({ deletedAt: null, updatedAt: nowIso() })
    .where(and(inArray(images.id, ids), isNotNull(images.deletedAt), isNull(images.purgeStatus)))

  return ids
}

export async function permanentlyDeleteImages(env: Env, imageIds: string[]): Promise<string[]> {
  try {
    assertDeleteEnabled(env)
  } catch (error) {
    if (error instanceof DeleteError) {
      throw new ImageServiceError(error.code, error.message, error.status)
    }
    throw error
  }

  const ids = normalizeImageIds(imageIds)
  const db = getDb(env)
  const rows = await db
    .select()
    .from(images)
    .where(and(inArray(images.id, ids), isNotNull(images.deletedAt)))

  if (rows.length === 0) {
    throw new ImageServiceError("VALIDATION_ERROR", "只能永久删除回收站中的图片", 400)
  }

  const keys = rows.map((row) => row.objectKey)
  const deletedIds = rows.map((row) => row.id)
  const timestamp = nowIso()

  await db
    .update(images)
    .set({ purgeStatus: "pending", updatedAt: timestamp })
    .where(inArray(images.id, deletedIds))

  try {
    await deleteImageKeys(env, keys)
  } catch (error) {
    if (error instanceof DeleteError) {
      throw new ImageServiceError(error.code, error.message, error.status)
    }
    console.error("R2 permanent delete failed", error)
    throw new ImageServiceError("DELETE_FAILED", "无法从 R2 删除图片", 500)
  }

  await removePurgedImageRows(env, deletedIds)
  return deletedIds
}

async function removePurgedImageRows(env: Env, deletedIds: string[]) {
  if (deletedIds.length === 0) {
    return
  }

  const db = getDb(env)
  const timestamp = nowIso()
  await db.batch([
    db
      .update(albums)
      .set({ coverImageId: null, updatedAt: timestamp })
      .where(inArray(albums.coverImageId, deletedIds)),
    db.delete(albumImages).where(inArray(albumImages.imageId, deletedIds)),
    db.delete(images).where(inArray(images.id, deletedIds)),
  ])
}

export function metadataFromR2Object(object: R2Object) {
  const originalFromMeta = object.customMetadata?.originalFilename
  return {
    id: newId(),
    objectKey: object.key,
    originalName: originalFromMeta?.slice(0, 200) || filenameFromKey(object.key),
    mimeType: object.httpMetadata?.contentType || mimeFromExtension(object.key) || null,
    size: object.size,
    width: null,
    height: null,
    uploadedAt: object.uploaded.toISOString(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    favorite: false,
    deletedAt: null,
    shortId: newShortId(),
    sortAt: object.uploaded.toISOString(),
    takenAt: null,
    purgeStatus: null,
  }
}

export function normalizeImageIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) {
    throw new ImageServiceError("VALIDATION_ERROR", "imageIds 必须是数组", 400)
  }

  const unique = [...new Set(ids.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length < 80))]
  if (unique.length === 0) {
    throw new ImageServiceError("VALIDATION_ERROR", "请选择图片", 400)
  }
  if (unique.length > 100) {
    throw new ImageServiceError("VALIDATION_ERROR", "一次最多处理 100 张图片", 400)
  }
  return unique
}

export async function getImageByShortId(env: Env, shortId: string) {
  const db = getDb(env)
  const [row] = await db
    .select()
    .from(images)
    .where(and(eq(images.shortId, shortId), isNull(images.deletedAt), isNull(images.purgeStatus)))
    .limit(1)
  return row ?? null
}

export async function ensureShortIds(env: Env, imageIds: string[]): Promise<Record<string, string>> {
  const ids = normalizeImageIds(imageIds)
  const db = getDb(env)
  const rows = await db
    .select({ id: images.id, shortId: images.shortId })
    .from(images)
    .where(inArray(images.id, ids))

  const assigned: Record<string, string> = {}
  for (const row of rows) {
    if (row.shortId) {
      assigned[row.id] = row.shortId
      continue
    }
    const shortId = await allocateShortId(env)
    await db.update(images).set({ shortId, updatedAt: nowIso() }).where(eq(images.id, row.id))
    assigned[row.id] = shortId
  }

  return assigned
}

async function allocateShortId(env: Env): Promise<string> {
  const db = getDb(env)
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = newShortId()
    const [existing] = await db.select({ id: images.id }).from(images).where(eq(images.shortId, candidate)).limit(1)
    if (!existing) {
      return candidate
    }
  }

  throw new ImageServiceError("UPLOAD_FAILED", "无法分配短链接", 500)
}
