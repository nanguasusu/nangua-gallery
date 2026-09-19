import { Hono } from "hono"
import { isShortId } from "@nangua/shared"
import type { Env } from "../types/env"
import { getImageByShortId } from "../services/imageService"
import { buildPublicImageUrl, isUsablePublicBaseUrl } from "../utils/image"

export const shortRoutes = new Hono<{ Bindings: Env }>()

shortRoutes.get("/:id", async (c) => {
  const shortId = c.req.param("id")
  if (!isShortId(shortId)) {
    return c.text("未找到", 404, { "Cache-Control": "no-store" })
  }

  if (!isUsablePublicBaseUrl(c.env.PUBLIC_IMAGE_BASE_URL)) {
    return c.text("图床域名未配置", 500, { "Cache-Control": "no-store" })
  }

  const row = await getImageByShortId(c.env, shortId)
  if (!row) {
    return c.text("未找到", 404, { "Cache-Control": "no-store" })
  }

  return c.redirect(buildPublicImageUrl(c.env.PUBLIC_IMAGE_BASE_URL, row.objectKey), 302)
})
