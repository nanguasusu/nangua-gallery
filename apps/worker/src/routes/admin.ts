import { Hono } from "hono"
import type { Env } from "../types/env"
import { requireAdmin } from "../middleware/admin"
import { handleServiceError } from "../utils/service-error"
import { syncR2ToD1 } from "../services/syncService"

export const adminRoutes = new Hono<{ Bindings: Env }>()

adminRoutes.use("*", requireAdmin)

adminRoutes.post("/sync", async (c) => {
  let cursor: string | undefined
  let limit: number | undefined

  try {
    const body = await c.req.json().catch(() => null)
    if (body && typeof body === "object" && !Array.isArray(body)) {
      const record = body as Record<string, unknown>
      if (typeof record.cursor === "string" && record.cursor.length > 0) {
        cursor = record.cursor
      }
      if (typeof record.limit === "number" && Number.isFinite(record.limit)) {
        limit = record.limit
      }
    }
  } catch {
    cursor = undefined
  }

  try {
    const result = await syncR2ToD1(c.env, { cursor, limit })
    return c.json(result)
  } catch (error) {
    return handleServiceError(c, error, "同步失败")
  }
})
