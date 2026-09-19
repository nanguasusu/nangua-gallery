import { Hono } from "hono"
import type { Env } from "../types/env"
import { jsonError } from "../utils/response"
import { requireSession } from "../middleware/auth"
import {
  objectKeyFromTransformPath,
  parseTransformQuery,
  transformOrOriginal,
} from "../services/imageTransform"

export const transformRoutes = new Hono<{ Bindings: Env }>()

transformRoutes.use("*", requireSession)

transformRoutes.get("/*", async (c) => {
  const key = objectKeyFromTransformPath(c.req.path)
  if (!key) {
    return jsonError(c, 400, "VALIDATION_ERROR", "图片键无效")
  }

  const parsed = parseTransformQuery(new URL(c.req.url).searchParams)
  if ("error" in parsed) {
    return jsonError(c, 400, "VALIDATION_ERROR", parsed.error)
  }

  const cache = caches.default
  const cacheKey = new Request(c.req.url, { method: "GET" })

  try {
    const cached = await cache.match(cacheKey)
    if (cached) {
      return cached
    }
  } catch (error) {
    console.error("Thumbnail cache match failed", error)
  }

  try {
    const object = await c.env.BUCKET.get(key)
    if (!object) {
      return jsonError(c, 404, "NOT_FOUND", "图片不存在")
    }

    const response = await transformOrOriginal(c.env, object, parsed)
    if (response.ok) {
      c.executionCtx.waitUntil(
        cache.put(cacheKey, response.clone()).catch((error) => {
          console.error("Thumbnail cache put failed", error)
        }),
      )
    }
    return response
  } catch (error) {
    console.error("Image proxy failed", error)
    return jsonError(c, 500, "TRANSFORM_FAILED", "图片加载失败")
  }
})
