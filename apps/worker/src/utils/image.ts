const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

export function parseLimit(raw: string | undefined): {
  ok: true
  limit: number
} | {
  ok: false
  message: string
} {
  if (raw === undefined || raw === "") {
    return { ok: true, limit: DEFAULT_LIMIT }
  }

  if (!/^\d+$/.test(raw)) {
    return { ok: false, message: "limit must be an integer between 1 and 100" }
  }

  const value = Number.parseInt(raw, 10)
  if (value < 1) {
    return { ok: false, message: "limit must be an integer between 1 and 100" }
  }

  return { ok: true, limit: Math.min(value, MAX_LIMIT) }
}

export function buildPublicImageUrl(baseUrl: string, key: string): string {
  const base = baseUrl.replace(/\/+$/, "")
  const encodedPath = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")

  return `${base}/${encodedPath}`
}

export function isUsablePublicBaseUrl(value: string | undefined): value is string {
  if (!value) {
    return false
  }

  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}
