import { Hono } from "hono"
import { cors } from "hono/cors"
import type { Env } from "./types/env"
import { imagesRoutes } from "./routes/images"
import { uploadRoutes } from "./routes/upload"
import { deleteRoutes } from "./routes/delete"
import { transformRoutes } from "./routes/transform"
import { authRoutes } from "./routes/auth"
import { configRoutes } from "./routes/config"
import { albumsRoutes } from "./routes/albums"
import { adminRoutes } from "./routes/admin"
import { shortRoutes } from "./routes/short"
import { jsonError } from "./utils/response"
import { serveApp } from "./utils/app-shell"
import { runGalleryMaintenance } from "./services/maintenance"
import {
  isMutatingMethod,
  matchAllowedOrigin,
  originFromReferer,
  resolveAllowedOrigins,
} from "./utils/origin"

const app = new Hono<{ Bindings: Env }>()

app.use(
  "/api/*",
  cors({
    origin: (origin, c) => {
      const allowed = resolveAllowedOrigins(c.req.url, c.env.GALLERY_ORIGINS)
      return matchAllowedOrigin(origin, allowed)
    },
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400,
  }),
)

app.use("/api/*", async (c, next) => {
  if (isMutatingMethod(c.req.method)) {
    const allowed = resolveAllowedOrigins(c.req.url, c.env.GALLERY_ORIGINS)
    const origin = c.req.header("Origin")
    if (origin && !matchAllowedOrigin(origin, allowed)) {
      return jsonError(c, 403, "FORBIDDEN", "来源不被允许")
    }

    if (!origin) {
      const refererOrigin = originFromReferer(c.req.header("Referer"))
      if (refererOrigin && !matchAllowedOrigin(refererOrigin, allowed)) {
        return jsonError(c, 403, "FORBIDDEN", "来源不被允许")
      }
    }
  }

  await next()
})

app.use("/api/*", async (c, next) => {
  await next()
  // Thumbnails are cached after auth. JSON APIs must never be cached.
  if (c.req.path.startsWith("/api/image/")) {
    return
  }
  c.header("Cache-Control", "private, no-store, no-cache, must-revalidate")
  c.header("CDN-Cache-Control", "no-store")
  c.header("Cloudflare-CDN-Cache-Control", "no-store")
})

app.route("/api", authRoutes)
app.route("/api", configRoutes)
app.route("/api/admin", adminRoutes)
app.route("/api/albums", albumsRoutes)
app.route("/api/images", deleteRoutes)
app.route("/api/images", uploadRoutes)
app.route("/api/images", imagesRoutes)
app.route("/api/image", transformRoutes)
app.route("/s", shortRoutes)

app.get("/api/health", (c) => c.json({ ok: true }))

app.all("/api/*", (c) => jsonError(c, 404, "NOT_FOUND", "未找到"))
app.all("*", (c) => serveApp(c))

app.onError((error, c) => {
  console.error("Unhandled worker error", error)
  return jsonError(c, 500, "INTERNAL_ERROR", "发生了意外错误")
})

export default {
  fetch: app.fetch,
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      runGalleryMaintenance(env).catch((error) => {
        console.error("Gallery maintenance failed", error)
      }),
    )
  },
}
