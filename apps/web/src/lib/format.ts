export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  const units = ["KB", "MB", "GB"] as const
  let value = bytes / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const digits = value >= 10 || unitIndex === 0 ? 0 : 1
  return `${value.toFixed(digits)} ${units[unitIndex]}`
}

export function formatUploadedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export function formatDeletedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "已删除"
  }

  const delta = Date.now() - date.getTime()
  const minutes = Math.max(1, Math.round(delta / 60_000))
  if (minutes < 60) {
    return `${minutes} 分钟前删除`
  }

  const hours = Math.round(minutes / 60)
  if (hours < 24) {
    return `${hours} 小时前删除`
  }

  const days = Math.round(hours / 24)
  return `${days} 天前删除`
}

export function monthGroupKey(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "unknown"
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

export function formatMonthHeading(key: string): string {
  if (key === "unknown") {
    return "未知时间"
  }

  const [year, month] = key.split("-")
  if (!year || !month) {
    return "未知时间"
  }

  return `${year}年${Number.parseInt(month, 10)}月`
}

export function formatDimensions(width?: number, height?: number): string | null {
  if (!width || !height) {
    return null
  }

  return `${width} × ${height}`
}
