import {
  generateObjectKey,
  isImageKey,
  MAX_IMAGE_BYTES,
  resolveUploadMime,
  sanitizeDirectory,
  type ImageItem,
} from "@nangua/shared"
import type { Env } from "../types/env"
import { insertUploadedImage } from "./imageService"

export class UploadError extends Error {
  readonly code: string
  readonly status: 400 | 409 | 413 | 500

  constructor(code: string, message: string, status: 400 | 409 | 413 | 500) {
    super(message)
    this.name = "UploadError"
    this.code = code
    this.status = status
  }
}

interface PutNewImageInput {
  bytes: ArrayBuffer
  declaredType: string
  originalName: string
  directory?: string
}

export async function putNewImage(
  env: Env,
  input: PutNewImageInput,
): Promise<ImageItem> {
  if (input.bytes.byteLength === 0) {
    throw new UploadError("INVALID_FILE_TYPE", "文件为空", 400)
  }

  if (input.bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new UploadError("FILE_TOO_LARGE", "图片超过 20 MB 限制", 413)
  }

  const mime = resolveUploadMime(input.declaredType, new Uint8Array(input.bytes))
  if (!mime) {
    throw new UploadError("INVALID_FILE_TYPE", "仅支持 JPEG、PNG、WebP、GIF、AVIF 和 BMP 图片", 400)
  }

  let directory: string | undefined
  if (input.directory) {
    const sanitized = sanitizeDirectory(input.directory)
    if (!sanitized) {
      throw new UploadError("VALIDATION_ERROR", "上传路径无效", 400)
    }
    directory = sanitized
  }

  let key = generateObjectKey(mime, directory)
  let existing = await env.BUCKET.head(key)
  if (existing) {
    key = generateObjectKey(mime, directory)
    existing = await env.BUCKET.head(key)
    if (existing) {
      throw new UploadError("UPLOAD_FAILED", "无法分配新的对象键", 500)
    }
  }

  if (!isImageKey(key)) {
    throw new UploadError("UPLOAD_FAILED", "生成的对象键不是图片", 500)
  }

  const stored = await env.BUCKET.put(key, input.bytes, {
    httpMetadata: {
      contentType: mime,
    },
    customMetadata: {
      originalFilename: input.originalName.slice(0, 200),
    },
  })

  try {
    return await insertUploadedImage(env, {
      objectKey: stored.key,
      originalName: input.originalName,
      mimeType: mime,
      size: stored.size,
      uploadedAt: stored.uploaded.toISOString(),
    })
  } catch (error) {
    console.error("D1 insert after R2 upload failed, compensating by deleting new object", stored.key, error)
    try {
      await env.BUCKET.delete(stored.key)
    } catch (compensateError) {
      console.error("Failed to compensate-delete newly uploaded object", stored.key, compensateError)
    }
    throw new UploadError("UPLOAD_FAILED", "上传成功但写入图库失败，已撤回新文件", 500)
  }
}
