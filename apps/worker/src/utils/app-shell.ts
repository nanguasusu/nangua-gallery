import type { Context } from "hono"
import type { Env } from "../types/env"
import { getRequestSession } from "./auth-cookie"
import { renderLoginPage } from "./login-page"

const PUBLIC_FILE =
  /^\/(assets\/|favicon\.svg$|manifest\.webmanifest$|sw\.js$|registerSW\.js$|workbox-)/

export async function serveApp(c: Context<{ Bindings: Env }>) {
  const path = c.req.path

  if (PUBLIC_FILE.test(path)) {
    return c.env.ASSETS.fetch(c.req.raw)
  }

  const session = await getRequestSession(c)
  if (!session) {
    return c.html(renderLoginPage(), 200, {
      "Cache-Control": "no-store",
    })
  }

  return c.env.ASSETS.fetch(c.req.raw)
}
