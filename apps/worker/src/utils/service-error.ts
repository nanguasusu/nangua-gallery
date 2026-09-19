import type { Context } from "hono"
import { jsonError } from "./response"
import { ImageServiceError } from "../services/imageService"
import { AlbumServiceError } from "../services/albumService"

export function handleServiceError(c: Context, error: unknown, fallbackMessage: string) {
  if (error instanceof ImageServiceError || error instanceof AlbumServiceError) {
    return jsonError(c, error.status, error.code, error.message)
  }

  console.error(fallbackMessage, error)
  return jsonError(c, 500, "INTERNAL_ERROR", fallbackMessage)
}
