import type { MiddlewareHandler } from "hono"
import type { Env } from "../types/env"
import { getRequestSession } from "../utils/auth-cookie"
import { jsonError } from "../utils/response"

export const requireSession: MiddlewareHandler<{ Bindings: Env }> = async (
  c,
  next,
) => {
  if (!c.env.SESSION_SECRET) {
    return jsonError(c, 500, "CONFIG_ERROR", "会话密钥未配置")
  }

  const session = await getRequestSession(c)
  if (!session) {
    return jsonError(c, 401, "UNAUTHORIZED", "请先登录")
  }

  await next()
}
