import type { Context } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import type { ApiErrorBody } from "@nangua/shared"

export function jsonError(
  c: Context,
  status: ContentfulStatusCode,
  code: string,
  message: string,
) {
  const body: ApiErrorBody = {
    error: {
      code,
      message,
    },
  }

  return c.json(body, status)
}
