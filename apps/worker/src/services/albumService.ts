import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm"
import type { Album } from "@nangua/shared"
import type { Env } from "../types/env"
import { getDb } from "../db/client"
import { albumImages, albums, images } from "../db/schema"
import { newId, nowIso, toImageItem } from "../db/map"
import { ImageServiceError, normalizeImageIds } from "./imageService"

export class AlbumServiceError extends Error {
  readonly code: string
  readonly status: 400 | 404

  constructor(code: string, message: string, status: 400 | 404) {
    super(message)
    this.name = "AlbumServiceError"
    this.code = code
    this.status = status
  }
}

function normalizeName(value: unknown): string {
  if (typeof value !== "string") {
    throw new AlbumServiceError("VALIDATION_ERROR", "相册名称不能为空", 400)
  }

  const name = value.trim()
  if (name.length === 0 || name.length > 80) {
    throw new AlbumServiceError("VALIDATION_ERROR", "相册名称需要 1 到 80 个字符", 400)
  }

  return name
}

function normalizeDescription(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === null) {
    return null
  }
  if (typeof value !== "string") {
    throw new AlbumServiceError("VALIDATION_ERROR", "相册描述无效", 400)
  }

  const description = value.trim()
  if (description.length > 400) {
    throw new AlbumServiceError("VALIDATION_ERROR", "相册描述过长", 400)
  }

  return description.length === 0 ? null : description
}

async function getAlbumRow(env: Env, id: string) {
  const db = getDb(env)
  const [row] = await db.select().from(albums).where(eq(albums.id, id)).limit(1)
  if (!row) {
    throw new AlbumServiceError("NOT_FOUND", "相册不存在", 404)
  }
  return row
}

export async function listAlbums(env: Env): Promise<Album[]> {
  const db = getDb(env)
  const albumRows = await db.select().from(albums).orderBy(desc(albums.updatedAt))
  if (albumRows.length === 0) {
    return []
  }

  const albumIds = albumRows.map((album) => album.id)
  const countRows = await db
    .select({
      albumId: albumImages.albumId,
      imageCount: sql<number>`count(*)`,
    })
    .from(albumImages)
    .innerJoin(images, eq(images.id, albumImages.imageId))
    .where(and(inArray(albumImages.albumId, albumIds), isNull(images.deletedAt), isNull(images.purgeStatus)))
    .groupBy(albumImages.albumId)

  const countMap = new Map(countRows.map((row) => [row.albumId, Number(row.imageCount) || 0]))
  const coverIds = [...new Set(albumRows.map((album) => album.coverImageId).filter((id): id is string => Boolean(id)))]
  const coverRows = coverIds.length
    ? await db
        .select()
        .from(images)
        .where(and(inArray(images.id, coverIds), isNull(images.deletedAt), isNull(images.purgeStatus)))
    : []
  const coverById = new Map(coverRows.map((row) => [row.id, row]))

  const missingCoverAlbumIds = albumRows
    .filter((album) => !album.coverImageId || !coverById.has(album.coverImageId))
    .map((album) => album.id)
  const fallbackIds = await loadLatestAlbumImageIds(env, missingCoverAlbumIds)
  const fallbackRows = fallbackIds.length
    ? await db
        .select()
        .from(images)
        .where(and(inArray(images.id, fallbackIds.map((row) => row.imageId)), isNull(images.deletedAt), isNull(images.purgeStatus)))
    : []
  const fallbackById = new Map(fallbackRows.map((row) => [row.id, row]))
  const fallbackByAlbum = new Map(
    fallbackIds.flatMap((row) => {
      const image = fallbackById.get(row.imageId)
      return image ? [[row.albumId, image] as const] : []
    }),
  )

  return albumRows.map((album) => {
    const cover =
      (album.coverImageId ? coverById.get(album.coverImageId) : undefined) ??
      fallbackByAlbum.get(album.id) ??
      null
    return toAlbumSummary(env, album, countMap.get(album.id) ?? 0, cover ?? null)
  })
}

async function loadLatestAlbumImageIds(env: Env, albumIds: string[]): Promise<Array<{ albumId: string; imageId: string }>> {
  if (albumIds.length === 0) {
    return []
  }

  const results: Array<{ albumId: string; imageId: string }> = []
  const chunkSize = 80
  for (let offset = 0; offset < albumIds.length; offset += chunkSize) {
    const chunk = albumIds.slice(offset, offset + chunkSize)
    const placeholders = chunk.map(() => "?").join(", ")
    const query = await env.DB.prepare(
      `
      SELECT album_id, image_id FROM (
        SELECT
          album_images.album_id as album_id,
          album_images.image_id as image_id,
          ROW_NUMBER() OVER (
            PARTITION BY album_images.album_id
            ORDER BY coalesce(images.sort_at, images.uploaded_at, images.created_at) DESC, images.id DESC
          ) as rn
        FROM album_images
        INNER JOIN images ON images.id = album_images.image_id
        WHERE album_images.album_id IN (${placeholders})
          AND images.deleted_at IS NULL
          AND images.purge_status IS NULL
      )
      WHERE rn = 1
      `,
    )
      .bind(...chunk)
      .all<{ album_id: string; image_id: string }>()

    for (const row of query.results) {
      results.push({ albumId: row.album_id, imageId: row.image_id })
    }
  }

  return results
}

export async function getAlbum(env: Env, id: string): Promise<Album> {
  const album = await getAlbumRow(env, id)
  const db = getDb(env)
  const members = await db
    .select({
      albumId: albumImages.albumId,
      addedAt: albumImages.createdAt,
      image: images,
    })
    .from(albumImages)
    .innerJoin(images, eq(images.id, albumImages.imageId))
    .where(and(eq(albumImages.albumId, id), isNull(images.deletedAt), isNull(images.purgeStatus)))

  return toAlbum(env, album, members)
}

export async function createAlbum(
  env: Env,
  input: { name: unknown; description?: unknown },
): Promise<Album> {
  const db = getDb(env)
  const timestamp = nowIso()
  const row = {
    id: newId(),
    name: normalizeName(input.name),
    description: normalizeDescription(input.description) ?? null,
    coverImageId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await db.insert(albums).values(row)
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    coverImage: null,
    imageCount: 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function updateAlbum(
  env: Env,
  id: string,
  input: { name?: unknown; description?: unknown; coverImageId?: unknown },
): Promise<Album> {
  const existing = await getAlbumRow(env, id)
  const db = getDb(env)
  const patch: {
    name?: string
    description?: string | null
    coverImageId?: string | null
    updatedAt: string
  } = { updatedAt: nowIso() }

  if (input.name !== undefined) {
    patch.name = normalizeName(input.name)
  }
  if (input.description !== undefined) {
    patch.description = normalizeDescription(input.description) ?? null
  }
  if (input.coverImageId !== undefined) {
    if (input.coverImageId === null) {
      patch.coverImageId = null
    } else if (typeof input.coverImageId === "string" && input.coverImageId.length > 0) {
      const [member] = await db
        .select({ imageId: albumImages.imageId })
        .from(albumImages)
        .where(and(eq(albumImages.albumId, id), eq(albumImages.imageId, input.coverImageId)))
        .limit(1)
      if (!member) {
        throw new AlbumServiceError("VALIDATION_ERROR", "封面必须是相册中的图片", 400)
      }
      patch.coverImageId = input.coverImageId
    } else {
      throw new AlbumServiceError("VALIDATION_ERROR", "封面无效", 400)
    }
  }

  await db.update(albums).set(patch).where(eq(albums.id, existing.id))
  return getAlbum(env, id)
}

export async function deleteAlbum(env: Env, id: string): Promise<void> {
  await getAlbumRow(env, id)
  const db = getDb(env)
  await db.delete(albumImages).where(eq(albumImages.albumId, id))
  await db.delete(albums).where(eq(albums.id, id))
}

export async function addImagesToAlbum(
  env: Env,
  albumId: string,
  imageIds: unknown,
): Promise<string[]> {
  await getAlbumRow(env, albumId)
  const ids = normalizeImageIds(imageIds)
  const db = getDb(env)
  const existingImages = await db
    .select({ id: images.id })
    .from(images)
    .where(and(inArray(images.id, ids), isNull(images.deletedAt), isNull(images.purgeStatus)))
  const validIds = existingImages.map((row) => row.id)
  if (validIds.length === 0) {
    throw new ImageServiceError("VALIDATION_ERROR", "没有可加入相册的图片", 400)
  }

  const timestamp = nowIso()
  await db
    .insert(albumImages)
    .values(validIds.map((imageId) => ({ albumId, imageId, createdAt: timestamp })))
    .onConflictDoNothing()
  await db.update(albums).set({ updatedAt: timestamp }).where(eq(albums.id, albumId))
  return validIds
}

export async function removeImagesFromAlbum(
  env: Env,
  albumId: string,
  imageIds: unknown,
): Promise<string[]> {
  await getAlbumRow(env, albumId)
  const ids = normalizeImageIds(imageIds)
  const db = getDb(env)
  await db
    .delete(albumImages)
    .where(and(eq(albumImages.albumId, albumId), inArray(albumImages.imageId, ids)))
  await db.update(albums).set({ updatedAt: nowIso() }).where(eq(albums.id, albumId))
  return ids
}

function toAlbumSummary(
  env: Env,
  album: typeof albums.$inferSelect,
  imageCount: number,
  cover: typeof images.$inferSelect | null,
): Album {
  return {
    id: album.id,
    name: album.name,
    description: album.description,
    coverImage: cover ? toImageItem(cover, env.PUBLIC_IMAGE_BASE_URL) : null,
    imageCount,
    createdAt: album.createdAt,
    updatedAt: album.updatedAt,
  }
}

function toAlbum(
  env: Env,
  album: typeof albums.$inferSelect,
  members: Array<{ addedAt: string; image: typeof images.$inferSelect }>,
): Album {
  const sorted = [...members].sort((left, right) => {
    const leftTime = left.image.uploadedAt || left.image.createdAt
    const rightTime = right.image.uploadedAt || right.image.createdAt
    return rightTime.localeCompare(leftTime) || right.image.id.localeCompare(left.image.id)
  })
  const cover =
    sorted.find((member) => member.image.id === album.coverImageId)?.image ??
    sorted[0]?.image ??
    null

  return {
    id: album.id,
    name: album.name,
    description: album.description,
    coverImage: cover ? toImageItem(cover, env.PUBLIC_IMAGE_BASE_URL) : null,
    imageCount: sorted.length,
    createdAt: album.createdAt,
    updatedAt: album.updatedAt,
  }
}
