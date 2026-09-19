import { Hono } from "hono"
import type { Env } from "../types/env"
import { requireSession } from "../middleware/auth"
import { handleServiceError } from "../utils/service-error"
import { getGalleryConfig, SettingsError, updateUploadSettings } from "../services/settingsService"

export const configRoutes = new Hono<{ Bindings: Env }>()

configRoutes.use("*", requireSession)

configRoutes.get("/config", async (c) => {
  try {
    return c.json(await getGalleryConfig(c.env))
  } catch (error) {
    return handleServiceError(c, error, "无法加载配置")
  }
})

configRoutes.patch("/config", async (c) => {
  try {
    const body = await c.req.json().catch(() => null)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new SettingsError("VALIDATION_ERROR", "请求无效", 400)
    }
    const config = await updateUploadSettings(c.env, body as Record<string, unknown>)
    return c.json(config)
  } catch (error) {
    return handleServiceError(c, error, "无法保存设置")
  }
})
