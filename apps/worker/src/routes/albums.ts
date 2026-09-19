import { Hono } from "hono"
import type { Env } from "../types/env"
import { jsonError } from "../utils/response"
import { requireSession } from "../middleware/auth"
import { handleServiceError } from "../utils/service-error"
import { AlbumServiceError } from "../services/albumService"
import {
  addImagesToAlbum,
  createAlbum,
  deleteAlbum,
  getAlbum,
  listAlbums,
  removeImagesFromAlbum,
  updateAlbum,
} from "../services/albumService"
import { listImagesFromDb } from "../services/imageService"
import { isUsablePublicBaseUrl, parseLimit } from "../utils/image"

export const albumsRoutes = new Hono<{ Bindings: Env }>()

albumsRoutes.use("*", requireSession)

albumsRoutes.get("/", async (c) => {
  try {
    const data = await listAlbums(c.env)
    return c.json({ data })
  } catch (error) {
    return handleServiceError(c, error, "无法加载相册")
  }
})

albumsRoutes.post("/", async (c) => {
  try {
    const body = await parseObjectBody(c)
    const album = await createAlbum(c.env, {
      name: body.name,
      description: body.description,
    })
    return c.json({ data: album }, 201)
  } catch (error) {
    return handleServiceError(c, error, "无法创建相册")
  }
})

albumsRoutes.get("/:id", async (c) => {
  try {
    const album = await getAlbum(c.env, c.req.param("id"))
    return c.json({ data: album })
  } catch (error) {
    return handleServiceError(c, error, "无法加载相册")
  }
})

albumsRoutes.patch("/:id", async (c) => {
  try {
    const body = await parseObjectBody(c)
    const album = await updateAlbum(c.env, c.req.param("id"), {
      name: body.name,
      description: body.description,
      coverImageId: body.coverImageId,
    })
    return c.json({ data: album })
  } catch (error) {
    return handleServiceError(c, error, "无法更新相册")
  }
})

albumsRoutes.delete("/:id", async (c) => {
  try {
    await deleteAlbum(c.env, c.req.param("id"))
    return c.json({ ok: true })
  } catch (error) {
    return handleServiceError(c, error, "无法删除相册")
  }
})

albumsRoutes.get("/:id/images", async (c) => {
  const limitResult = parseLimit(c.req.query("limit"))
  if (!limitResult.ok) {
    return jsonError(c, 400, "VALIDATION_ERROR", limitResult.message)
  }

  if (!isUsablePublicBaseUrl(c.env.PUBLIC_IMAGE_BASE_URL)) {
    return jsonError(c, 500, "CONFIG_ERROR", "PUBLIC_IMAGE_BASE_URL 未配置")
  }

  try {
    await getAlbum(c.env, c.req.param("id"))
    const result = await listImagesFromDb(c.env, {
      cursor: c.req.query("cursor") || undefined,
      limit: limitResult.limit,
      search: c.req.query("search") || undefined,
      albumId: c.req.param("id"),
    })
    return c.json(result)
  } catch (error) {
    return handleServiceError(c, error, "无法加载相册图片")
  }
})

albumsRoutes.post("/:id/images", async (c) => {
  try {
    const body = await parseObjectBody(c)
    const added = await addImagesToAlbum(c.env, c.req.param("id"), body.imageIds)
    return c.json({ added })
  } catch (error) {
    return handleServiceError(c, error, "无法加入相册")
  }
})

albumsRoutes.delete("/:id/images", async (c) => {
  try {
    const body = await parseObjectBody(c)
    const removed = await removeImagesFromAlbum(c.env, c.req.param("id"), body.imageIds)
    return c.json({ removed })
  } catch (error) {
    return handleServiceError(c, error, "无法从相册移除")
  }
})

async function parseObjectBody(c: { req: { json: () => Promise<unknown> } }): Promise<Record<string, unknown>> {
  try {
    const body = await c.req.json()
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new AlbumServiceError("VALIDATION_ERROR", "请求无效", 400)
    }
    return body as Record<string, unknown>
  } catch (error) {
    if (error instanceof AlbumServiceError) {
      throw error
    }
    throw new AlbumServiceError("VALIDATION_ERROR", "请求无效", 400)
  }
}
