const LOCAL_DEV_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8787",
  "http://127.0.0.1:8787",
] as const

export function parseGalleryOrigins(value: string | undefined): string[] {
  if (!value) {
    return []
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => {
      try {
        return new URL(item).origin === item
      } catch {
        return false
      }
    })
}

export function resolveAllowedOrigins(requestUrl: string, extraOrigins?: string): string[] {
  const allowed = new Set<string>([...LOCAL_DEV_ORIGINS, ...parseGalleryOrigins(extraOrigins)])
  try {
    allowed.add(new URL(requestUrl).origin)
  } catch {
    // ignore invalid request URLs
  }
  return [...allowed]
}

export function matchAllowedOrigin(origin: string | undefined, allowed: readonly string[]): string | undefined {
  if (!origin) {
    return undefined
  }
  return allowed.includes(origin) ? origin : undefined
}

export function isMutatingMethod(method: string): boolean {
  return method !== "GET" && method !== "HEAD" && method !== "OPTIONS"
}

export function originFromReferer(referer: string | undefined): string | null {
  if (!referer) {
    return null
  }

  try {
    return new URL(referer).origin
  } catch {
    return null
  }
}
