import type { Context } from "hono"
import { getCookie } from "hono/cookie"
import type { Env } from "../types/env"
import { readSessionToken, SESSION_COOKIE } from "./session"

export async function getRequestSession(c: Context<{ Bindings: Env }>) {
  const token = getCookie(c, SESSION_COOKIE)
  if (!token || !c.env.SESSION_SECRET) {
    return null
  }

  return readSessionToken(c.env.SESSION_SECRET, token)
}
