import {
  DEFAULT_MAX_IMAGE_BYTES,
  formatMaxBytesLabel,
  mimeFromExtension,
  resolveUploadMime,
} from "@nangua/shared"

export interface FileRejection {
  file: File
  code: "INVALID_FILE_TYPE" | "FILE_TOO_LARGE"
  message: string
}

export async function partitionImageFiles(
  files: File[],
  maxBytes = DEFAULT_MAX_IMAGE_BYTES,
): Promise<{
  accepted: File[]
  rejected: FileRejection[]
}> {
  const accepted: File[] = []
  const rejected: FileRejection[] = []
  const maxLabel = formatMaxBytesLabel(maxBytes)

  for (const file of files) {
    if (file.size > maxBytes) {
      rejected.push({
        file,
        code: "FILE_TOO_LARGE",
        message: `图片超过 ${maxLabel} 限制`,
      })
      continue
    }

    try {
      const header = new Uint8Array(await file.slice(0, 32).arrayBuffer())
      if (!resolveUploadMime(file.type, header)) {
        rejected.push({
          file,
          code: "INVALID_FILE_TYPE",
          message: "仅支持 JPEG、PNG、WebP、GIF、AVIF 和 BMP 图片",
        })
        continue
      }
    } catch {
      rejected.push({
        file,
        code: "INVALID_FILE_TYPE",
        message: "仅支持 JPEG、PNG、WebP、GIF、AVIF 和 BMP 图片",
      })
      continue
    }

    accepted.push(file)
  }

  return { accepted, rejected }
}

export function filesFromDataTransfer(dataTransfer: DataTransfer | null): File[] {
  if (!dataTransfer) {
    return []
  }

  return [...dataTransfer.files].filter(
    (file) =>
      file.type.startsWith("image/") ||
      file.type === "" ||
      mimeFromExtension(file.name) !== null,
  )
}

export function filesFromClipboard(clipboard: DataTransfer | null): File[] {
  if (!clipboard) {
    return []
  }

  const files: File[] = []
  for (const item of clipboard.items) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile()
      if (file) {
        files.push(file)
      }
    }
  }
  return files
}
