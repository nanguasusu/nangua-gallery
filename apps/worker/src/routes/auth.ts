import { Hono } from "hono"
import { deleteCookie, setCookie } from "hono/cookie"
import type { Env } from "../types/env"
import { getRequestSession } from "../utils/auth-cookie"
import { jsonError } from "../utils/response"
import { secretsEqual } from "../utils/crypto"
import { renderLoginPage } from "../utils/login-page"
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "../utils/session"

interface LoginBody {
  username?: unknown
  password?: unknown
}

function cookieOptions(url: string) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "Lax" as const,
    secure: url.startsWith("https://"),
    maxAge: SESSION_MAX_AGE_SECONDS,
  }
}

function wantsHtml(accept: string | undefined, contentType: string | undefined) {
  return (
    (accept ?? "").includes("text/html") ||
    (contentType ?? "").includes("application/x-www-form-urlencoded")
  )
}

export const authRoutes = new Hono<{ Bindings: Env }>()

authRoutes.get("/session", async (c) => {
  const session = await getRequestSession(c)
  return c.json({ authenticated: Boolean(session) }, 200, {
    "Cache-Control": "private, no-store",
  })
})

authRoutes.post("/login", async (c) => {
  if (!c.env.GALLERY_USERNAME || !c.env.GALLERY_PASSWORD || !c.env.SESSION_SECRET) {
    return jsonError(c, 500, "CONFIG_ERROR", "登录未配置")
  }

  const contentType = c.req.header("content-type") ?? ""
  const html = wantsHtml(c.req.header("accept"), contentType)

  let username = ""
  let password = ""

  try {
    if (contentType.includes("application/json")) {
      const body = (await c.req.json()) as LoginBody
      username = typeof body.username === "string" ? body.username : ""
      password = typeof body.password === "string" ? body.password : ""
    } else {
      const form = await c.req.parseBody()
      username = typeof form.username === "string" ? form.username : ""
      password = typeof form.password === "string" ? form.password : ""
    }
  } catch {
    if (html) {
      return c.html(renderLoginPage({ error: "登录信息无效" }), 400)
    }
    return jsonError(c, 400, "VALIDATION_ERROR", "登录信息无效")
  }

  if (
    username.length === 0 ||
    username.length > 128 ||
    password.length === 0 ||
    password.length > 128
  ) {
    if (html) {
      return c.html(renderLoginPage({ error: "登录信息无效" }), 400)
    }
    return jsonError(c, 400, "VALIDATION_ERROR", "登录信息无效")
  }

  const [usernameOk, passwordOk] = await Promise.all([
    secretsEqual(c.env.SESSION_SECRET, username, c.env.GALLERY_USERNAME),
    secretsEqual(c.env.SESSION_SECRET, password, c.env.GALLERY_PASSWORD),
  ])

  if (!usernameOk || !passwordOk) {
    if (html) {
      return c.html(renderLoginPage({ error: "用户名或密码错误" }), 401)
    }
    return jsonError(c, 401, "INVALID_CREDENTIALS", "用户名或密码错误")
  }

  const token = await createSessionToken(c.env.SESSION_SECRET, username)
  setCookie(c, SESSION_COOKIE, token, cookieOptions(c.req.url))

  if (html) {
    return c.redirect("/", 303)
  }

  return c.json({ ok: true })
})

authRoutes.post("/logout", async (c) => {
  deleteCookie(c, SESSION_COOKIE, {
    path: "/",
    secure: c.req.url.startsWith("https://"),
  })

  if (wantsHtml(c.req.header("accept"), c.req.header("content-type"))) {
    return c.redirect("/", 303)
  }

  return c.json({ ok: true })
})
