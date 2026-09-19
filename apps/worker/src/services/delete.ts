import { isImageKey, MAX_DELETE_KEYS } from "@nangua/shared"
import type { Env } from "../types/env"

export class DeleteError extends Error {
  readonly code: string
  readonly status: 400 | 403 | 500

  constructor(code: string, message: string, status: 400 | 403 | 500) {
    super(message)
    this.name = "DeleteError"
    this.code = code
    this.status = status
  }
}

export function isDeleteEnabled(env: Env): boolean {
  return env.ENABLE_DELETE === "true"
}

export function assertDeleteEnabled(env: Env) {
  if (!isDeleteEnabled(env)) {
    throw new DeleteError(
      "DELETE_DISABLED",
      "永久删除已关闭。设置 ENABLE_DELETE=true 后才允许从 R2 删除。",
      403,
    )
  }
}

export function normalizeDeleteKeys(keys: unknown): string[] {
  if (!Array.isArray(keys)) {
    throw new DeleteError("VALIDATION_ERROR", "keys 必须是数组", 400)
  }

  if (keys.length === 0) {
    throw new DeleteError("VALIDATION_ERROR", "keys 不能为空", 400)
  }

  if (keys.length > MAX_DELETE_KEYS) {
    throw new DeleteError("VALIDATION_ERROR", "一次最多删除 100 个对象", 400)
  }

  const unique: string[] = []
  const seen = new Set<string>()

  for (const value of keys) {
    if (typeof value !== "string" || value.length === 0 || value.length > 1024) {
      throw new DeleteError("VALIDATION_ERROR", "每个 key 都必须是非空字符串", 400)
    }
    if (value.includes("\0") || value.includes("\\") || /(^|\/)\.\.(?:\/|$)/.test(value)) {
      throw new DeleteError("VALIDATION_ERROR", "对象键无效", 400)
    }
    if (!isImageKey(value)) {
      throw new DeleteError("VALIDATION_ERROR", "只能删除图片对象", 400)
    }
    if (!seen.has(value)) {
      seen.add(value)
      unique.push(value)
    }
  }

  return unique
}

export async function deleteImageKeys(env: Env, keys: string[]): Promise<string[]> {
  assertDeleteEnabled(env)

  try {
    await env.BUCKET.delete(keys)
    return keys
  } catch (error) {
    console.error("R2 permanent delete failed", error)
    throw new DeleteError("DELETE_FAILED", "永久删除失败", 500)
  }
}
