import { eq } from "drizzle-orm"
import {
  DEFAULT_UPLOAD_SETTINGS,
  normalizeUploadRoot,
  parseMaxImageBytes,
  parseUploadConcurrency,
  previewObjectKey,
  type GalleryConfig,
  type UploadSettings,
} from "@nangua/shared"
import type { Env } from "../types/env"
import { getDb } from "../db/client"
import { gallerySettings } from "../db/schema"
import { nowIso } from "../db/map"
import { isDeleteEnabled } from "./delete"

const SETTINGS_ID = "default"

export class SettingsError extends Error {
  readonly code: string
  readonly status: 400

  constructor(code: string, message: string, status: 400) {
    super(message)
    this.name = "SettingsError"
    this.code = code
    this.status = status
  }
}

export async function getUploadSettings(env: Env): Promise<UploadSettings> {
  const db = getDb(env)
  const [row] = await db.select().from(gallerySettings).where(eq(gallerySettings.id, SETTINGS_ID)).limit(1)
  if (!row) {
    return DEFAULT_UPLOAD_SETTINGS
  }

  return {
    uploadRoot: normalizeUploadRoot(row.uploadRoot) ?? DEFAULT_UPLOAD_SETTINGS.uploadRoot,
    monthlyFolders: row.monthlyFolders,
    maxImageBytes: parseMaxImageBytes(row.maxImageBytes) ?? DEFAULT_UPLOAD_SETTINGS.maxImageBytes,
    uploadConcurrency: parseUploadConcurrency(row.uploadConcurrency) ?? DEFAULT_UPLOAD_SETTINGS.uploadConcurrency,
  }
}

export async function getGalleryConfig(env: Env): Promise<GalleryConfig> {
  const settings = await getUploadSettings(env)
  return {
    enableDelete: isDeleteEnabled(env),
    ...settings,
    uploadDirectoryPreview: previewObjectKey(settings.uploadRoot, settings.monthlyFolders),
  }
}

export async function updateUploadSettings(
  env: Env,
  input: Record<string, unknown>,
): Promise<GalleryConfig> {
  const current = await getUploadSettings(env)
  const next: UploadSettings = { ...current }

  if (input.uploadRoot !== undefined) {
    const root = normalizeUploadRoot(input.uploadRoot)
    if (!root) {
      throw new SettingsError("VALIDATION_ERROR", "上传目录只能包含字母、数字、斜线和少量符号", 400)
    }
    next.uploadRoot = root
  }

  if (input.monthlyFolders !== undefined) {
    if (typeof input.monthlyFolders !== "boolean") {
      throw new SettingsError("VALIDATION_ERROR", "按月分目录无效", 400)
    }
    next.monthlyFolders = input.monthlyFolders
  }

  if (input.maxImageBytes !== undefined) {
    const bytes = parseMaxImageBytes(input.maxImageBytes)
    if (bytes === null) {
      throw new SettingsError("VALIDATION_ERROR", "单张上限只能是 10、20 或 50 MB", 400)
    }
    next.maxImageBytes = bytes
  }

  if (input.uploadConcurrency !== undefined) {
    const concurrency = parseUploadConcurrency(input.uploadConcurrency)
    if (concurrency === null) {
      throw new SettingsError("VALIDATION_ERROR", "同时上传数量只能是 1、3 或 5", 400)
    }
    next.uploadConcurrency = concurrency
  }

  const db = getDb(env)
  const timestamp = nowIso()
  await db
    .insert(gallerySettings)
    .values({
      id: SETTINGS_ID,
      uploadRoot: next.uploadRoot,
      monthlyFolders: next.monthlyFolders,
      maxImageBytes: next.maxImageBytes,
      uploadConcurrency: next.uploadConcurrency,
      updatedAt: timestamp,
    })
    .onConflictDoUpdate({
      target: gallerySettings.id,
      set: {
        uploadRoot: next.uploadRoot,
        monthlyFolders: next.monthlyFolders,
        maxImageBytes: next.maxImageBytes,
        uploadConcurrency: next.uploadConcurrency,
        updatedAt: timestamp,
      },
    })

  return getGalleryConfig(env)
}
