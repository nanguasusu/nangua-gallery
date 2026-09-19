import { Hono } from "hono"
import type { Env } from "../types/env"
import { requireSession } from "../middleware/auth"
import { isDeleteEnabled } from "../services/delete"

export const configRoutes = new Hono<{ Bindings: Env }>()

configRoutes.use("*", requireSession)

configRoutes.get("/config", (c) => {
  return c.json({
    enableDelete: isDeleteEnabled(c.env),
  })
})
