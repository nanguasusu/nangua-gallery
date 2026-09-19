import { Hono } from "hono"
import type { Context } from "hono"
import type { Env } from "../types/env"
import { jsonError } from "../utils/response"
import { requireSession } from "../middleware/auth"
import { handleServiceError } from "../utils/service-error"
import { DeleteError, normalizeDeleteKeys } from "../services/delete"
import { trashImagesByKeys } from "../services/imageService"

interface DeleteBody {
  key?: unknown
  keys?: unknown
}

export const deleteRoutes = new Hono<{ Bindings: Env }>()

deleteRoutes.use("*", requireSession)

deleteRoutes.delete("/", async (c) => {
  let body: DeleteBody

  try {
    body = (await c.req.json()) as DeleteBody
  } catch {
    return jsonError(c, 400, "VALIDATION_ERROR", "删除请求无效")
  }

  return respondTrash(c, body.key === undefined ? [] : [body.key])
})

deleteRoutes.post("/delete", async (c) => {
  let body: DeleteBody

  try {
    body = (await c.req.json()) as DeleteBody
  } catch {
    return jsonError(c, 400, "VALIDATION_ERROR", "删除请求无效")
  }

  return respondTrash(c, body.keys)
})

async function respondTrash(c: Context<{ Bindings: Env }>, keys: unknown) {
  try {
    const normalized = normalizeDeleteKeys(keys)
    const deleted = await trashImagesByKeys(c.env, normalized)
    return c.json({ deleted })
  } catch (error) {
    if (error instanceof DeleteError) {
      return jsonError(c, error.status, error.code, error.message)
    }

    return handleServiceError(c, error, "无法移入回收站")
  }
}
