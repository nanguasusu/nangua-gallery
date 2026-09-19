import { Hono } from "hono"
import {
  HARD_MAX_IMAGE_BYTES,
  MULTIPART_OVERHEAD_BYTES,
} from "@nangua/shared"
import type { Env } from "../types/env"
import { jsonError } from "../utils/response"
import { isUsablePublicBaseUrl } from "../utils/image"
import { putNewImage, UploadError } from "../services/upload"
import { requireSession } from "../middleware/auth"
import { getUploadSettings } from "../services/settingsService"

export const uploadRoutes = new Hono<{ Bindings: Env }>()

uploadRoutes.use("*", requireSession)

uploadRoutes.post("/", async (c) => {
  if (!isUsablePublicBaseUrl(c.env.PUBLIC_IMAGE_BASE_URL)) {
    return jsonError(c, 500, "CONFIG_ERROR", "PUBLIC_IMAGE_BASE_URL 未配置")
  }

  const contentType = c.req.header("content-type") ?? ""
  if (!contentType.includes("multipart/form-data")) {
    return jsonError(c, 400, "VALIDATION_ERROR", "请使用表单上传")
  }

  const settings = await getUploadSettings(c.env)
  const maxBytes = Math.min(settings.maxImageBytes, HARD_MAX_IMAGE_BYTES)
  const maxMb = Math.round(maxBytes / (1024 * 1024))

  const contentLength = Number(c.req.header("content-length") ?? "0")
  if (Number.isFinite(contentLength) && contentLength > maxBytes + MULTIPART_OVERHEAD_BYTES) {
    return jsonError(c, 413, "FILE_TOO_LARGE", `图片超过 ${maxMb} MB 限制`)
  }

  let file: File | undefined
  let directory: string | undefined
  let convertWebp: string | undefined
  let quality: string | undefined

  try {
    const body = await c.req.parseBody()
    if (body.file instanceof File) {
      file = body.file
    }
    if (typeof body.path === "string" && body.path.length > 0) {
      directory = body.path
    }
    if (typeof body.convertWebp === "string") {
      convertWebp = body.convertWebp
    }
    if (typeof body.quality === "string") {
      quality = body.quality
    }
  } catch (error) {
    console.error("Upload parse failed", error)
    return jsonError(c, 400, "VALIDATION_ERROR", "上传内容无效")
  }

  if (!file) {
    return jsonError(c, 400, "VALIDATION_ERROR", "请选择图片")
  }

  if (file.size > maxBytes) {
    return jsonError(c, 413, "FILE_TOO_LARGE", `图片超过 ${maxMb} MB 限制`)
  }

  try {
    const item = await putNewImage(c.env, {
      bytes: await file.arrayBuffer(),
      declaredType: file.type,
      originalName: file.name || "image",
      directory,
      convertWebp,
      quality,
    })

    return c.json({ item }, 201)
  } catch (error) {
    if (error instanceof UploadError) {
      return jsonError(c, error.status, error.code, error.message)
    }

    console.error("R2 upload failed", error)
    return jsonError(c, 500, "UPLOAD_FAILED", "上传失败")
  }
})
