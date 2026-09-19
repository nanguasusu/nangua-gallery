import type { MiddlewareHandler } from "hono"
import type { Env } from "../types/env"
import { getRequestSession } from "../utils/auth-cookie"
import { timingSafeEqualBytes } from "../utils/crypto"
import { jsonError } from "../utils/response"

function bearerToken(header: string | undefined): string | null {
  if (!header) {
    return null
  }

  const [scheme, token] = header.split(" ")
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null
  }

  return token
}

function tokensEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder()
  const a = encoder.encode(left)
  const b = encoder.encode(right)
  if (a.byteLength !== b.byteLength) {
    return false
  }
  return timingSafeEqualBytes(a, b)
}

export const requireAdmin: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const token = bearerToken(c.req.header("authorization"))
  if (c.env.ADMIN_TOKEN && token && tokensEqual(token, c.env.ADMIN_TOKEN)) {
    await next()
    return
  }

  if (!c.env.SESSION_SECRET) {
    return jsonError(c, 500, "CONFIG_ERROR", "会话密钥未配置")
  }

  const session = await getRequestSession(c)
  if (!session) {
    return jsonError(c, 401, "UNAUTHORIZED", "需要管理员权限")
  }

  await next()
}
