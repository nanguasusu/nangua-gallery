import { and, desc, eq, inArray, isNull } from "drizzle-orm"
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

  const members = await db
    .select({
      albumId: albumImages.albumId,
      addedAt: albumImages.createdAt,
      image: images,
    })
    .from(albumImages)
    .innerJoin(images, eq(images.id, albumImages.imageId))
    .where(isNull(images.deletedAt))

  const grouped = new Map<string, typeof members>()
  for (const member of members) {
    const current = grouped.get(member.albumId) ?? []
    current.push(member)
    grouped.set(member.albumId, current)
  }

  return albumRows.map((album) => toAlbum(env, album, grouped.get(album.id) ?? []))
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
    .where(and(eq(albumImages.albumId, id), isNull(images.deletedAt)))

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
    .where(and(inArray(images.id, ids), isNull(images.deletedAt)))
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
