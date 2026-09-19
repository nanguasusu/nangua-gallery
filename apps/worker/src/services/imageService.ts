import { and, desc, eq, inArray, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm"
import {
  escapeLike,
  filenameFromKey,
  mimeFromExtension,
  newShortId,
  type ImageItem,
  type ImageListResponse,
} from "@nangua/shared"
import type { Env } from "../types/env"
import { getDb } from "../db/client"
import { albumImages, albums, images } from "../db/schema"
import { decodeListCursor, encodeListCursor, newId, nowIso, sortTimestamp, toImageItem } from "../db/map"
import { DeleteError, deleteImageKeys } from "./delete"

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
}

export async function listImagesFromDb(
  env: Env,
  query: ListImagesQuery,
): Promise<ImageListResponse> {
  const db = getDb(env)
  const parsedCursor = decodeListCursor(query.cursor)
  const filters: SQL[] = []

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
    )
    if (searchFilter) {
      filters.push(searchFilter)
    }
  }

  if (parsedCursor) {
    filters.push(
      sql`(coalesce(${images.uploadedAt}, ${images.createdAt}) < ${parsedCursor.t} OR (coalesce(${images.uploadedAt}, ${images.createdAt}) = ${parsedCursor.t} AND ${images.id} < ${parsedCursor.i}))`,
    )
  }

  const whereClause = filters.length === 1 ? filters[0] : and(...filters)
  const take = query.limit + 1

  const rows = query.albumId
    ? await db
        .select({ image: images })
        .from(images)
        .innerJoin(albumImages, eq(albumImages.imageId, images.id))
        .where(and(eq(albumImages.albumId, query.albumId), whereClause))
        .orderBy(sql`coalesce(${images.uploadedAt}, ${images.createdAt}) DESC`, desc(images.id))
        .limit(take)
        .then((result) => result.map((row) => row.image))
    : await db
        .select()
        .from(images)
        .where(whereClause)
        .orderBy(sql`coalesce(${images.uploadedAt}, ${images.createdAt}) DESC`, desc(images.id))
        .limit(take)

  const hasMore = rows.length > query.limit
  const page = hasMore ? rows.slice(0, query.limit) : rows
  const last = page.at(-1)
  const albumMap = await loadAlbumSummaries(env, page.map((row) => row.id))

  return {
    items: page.map((row) => toImageItem(row, env.PUBLIC_IMAGE_BASE_URL, albumMap.get(row.id) ?? [])),
    cursor: last && hasMore ? encodeListCursor(sortTimestamp(last), last.id) : undefined,
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
  },
): Promise<ImageItem> {
  const db = getDb(env)
  const timestamp = nowIso()
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
    .where(and(inArray(images.id, ids), isNotNull(images.deletedAt)))

  return ids
}

export async function permanentlyDeleteImages(env: Env, imageIds: string[]): Promise<string[]> {
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

  try {
    await deleteImageKeys(env, keys)
  } catch (error) {
    if (error instanceof DeleteError) {
      throw new ImageServiceError(error.code, error.message, error.status)
    }
    console.error("R2 permanent delete failed", error)
    throw new ImageServiceError("DELETE_FAILED", "无法从 R2 删除图片", 500)
  }

  await db
    .update(albums)
    .set({ coverImageId: null, updatedAt: nowIso() })
    .where(inArray(albums.coverImageId, deletedIds))
  await db.delete(albumImages).where(inArray(albumImages.imageId, deletedIds))
  await db.delete(images).where(inArray(images.id, deletedIds))
  return deletedIds
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
  const [row] = await db.select().from(images).where(eq(images.shortId, shortId)).limit(1)
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
