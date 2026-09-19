import { Hono } from "hono"
import type { Env } from "../types/env"
import { jsonError } from "../utils/response"
import { isUsablePublicBaseUrl, parseLimit } from "../utils/image"
import { requireSession } from "../middleware/auth"
import { handleServiceError } from "../utils/service-error"
import { ImageServiceError, ensureShortIds, listImagesFromDb, normalizeImageIds, permanentlyDeleteImages, restoreImages, setFavorite, setFavoriteMany, trashImages } from "../services/imageService"

export const imagesRoutes = new Hono<{ Bindings: Env }>()

imagesRoutes.use("*", requireSession)

imagesRoutes.get("/", async (c) => {
  const limitResult = parseLimit(c.req.query("limit"))
  if (!limitResult.ok) {
    return jsonError(c, 400, "VALIDATION_ERROR", limitResult.message)
  }

  if (!isUsablePublicBaseUrl(c.env.PUBLIC_IMAGE_BASE_URL)) {
    return jsonError(c, 500, "CONFIG_ERROR", "PUBLIC_IMAGE_BASE_URL 未配置")
  }

  try {
    const result = await listImagesFromDb(c.env, {
      cursor: c.req.query("cursor") || undefined,
      limit: limitResult.limit,
      search: c.req.query("search") || undefined,
      favorite: parseBooleanFlag(c.req.query("favorite")),
      deleted: parseBooleanFlag(c.req.query("deleted")),
      albumId: c.req.query("album") || undefined,
    })
    return c.json(result)
  } catch (error) {
    return handleServiceError(c, error, "照片加载失败")
  }
})

imagesRoutes.post("/trash", async (c) => {
  try {
    const body = await parseObjectBody(c)
    const deleted = await trashImages(c.env, normalizeImageIds(body.imageIds))
    return c.json({ deleted })
  } catch (error) {
    return handleServiceError(c, error, "无法移入回收站")
  }
})

imagesRoutes.post("/restore", async (c) => {
  try {
    const body = await parseObjectBody(c)
    const restored = await restoreImages(c.env, normalizeImageIds(body.imageIds))
    return c.json({ restored })
  } catch (error) {
    return handleServiceError(c, error, "无法恢复图片")
  }
})

imagesRoutes.post("/permanent-delete", async (c) => {
  try {
    const body = await parseObjectBody(c)
    const deleted = await permanentlyDeleteImages(c.env, normalizeImageIds(body.imageIds))
    return c.json({ deleted })
  } catch (error) {
    return handleServiceError(c, error, "永久删除失败")
  }
})

imagesRoutes.post("/favorite", async (c) => {
  try {
    const body = await parseObjectBody(c)
    if (typeof body.favorite !== "boolean") {
      return jsonError(c, 400, "VALIDATION_ERROR", "favorite 必须是布尔值")
    }
    const updated = await setFavoriteMany(c.env, normalizeImageIds(body.imageIds), body.favorite)
    return c.json({ updated, favorite: body.favorite })
  } catch (error) {
    return handleServiceError(c, error, "无法更新收藏")
  }
})

imagesRoutes.post("/short-links", async (c) => {
  try {
    const body = await parseObjectBody(c)
    const assigned = await ensureShortIds(c.env, normalizeImageIds(body.imageIds))
    return c.json({ shortIds: assigned })
  } catch (error) {
    return handleServiceError(c, error, "无法创建短链接")
  }
})

imagesRoutes.patch("/:id", async (c) => {
  try {
    const body = await parseObjectBody(c)
    if (typeof body.favorite !== "boolean") {
      return jsonError(c, 400, "VALIDATION_ERROR", "favorite 必须是布尔值")
    }
    const item = await setFavorite(c.env, c.req.param("id"), body.favorite)
    return c.json({ item })
  } catch (error) {
    return handleServiceError(c, error, "无法更新图片")
  }
})

function parseBooleanFlag(value: string | undefined): boolean {
  return value === "true" || value === "1"
}

async function parseObjectBody(c: { req: { json: () => Promise<unknown> } }): Promise<Record<string, unknown>> {
  try {
    const body = await c.req.json()
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new ImageServiceError("VALIDATION_ERROR", "请求无效", 400)
    }
    return body as Record<string, unknown>
  } catch (error) {
    if (error instanceof ImageServiceError) {
      throw error
    }
    throw new ImageServiceError("VALIDATION_ERROR", "请求无效", 400)
  }
}
