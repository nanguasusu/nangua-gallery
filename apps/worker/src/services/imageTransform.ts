import { decodeObjectKey, encodeObjectKey, isImageKey } from "@nangua/shared"
import type { Env } from "../types/env"

const FIT_VALUES = new Set(["cover", "contain", "scale-down"])
const THUMBNAIL_CACHE = "private, max-age=31536000, immutable"

export interface TransformQuery {
  width: number
  height?: number
  fit: "cover" | "contain" | "scale-down"
  quality: number
}

export function parseTransformQuery(search: URLSearchParams): TransformQuery | { error: string } {
  const width = parseDimension(search.get("w") ?? "400", 400)
  if (width === null) {
    return { error: "w must be an integer between 16 and 1600" }
  }

  const rawHeight = search.get("h")
  let height: number | undefined
  if (rawHeight) {
    const parsed = parseDimension(rawHeight, 400)
    if (parsed === null) {
      return { error: "h must be an integer between 16 and 1600" }
    }
    height = parsed
  }

  const rawFit = search.get("fit") ?? "cover"
  if (!FIT_VALUES.has(rawFit)) {
    return { error: "fit must be cover, contain, or scale-down" }
  }

  const rawQuality = search.get("quality") ?? "80"
  if (!/^\d+$/.test(rawQuality)) {
    return { error: "quality must be an integer between 1 and 100" }
  }
  const quality = Number.parseInt(rawQuality, 10)
  if (quality < 1 || quality > 100) {
    return { error: "quality must be an integer between 1 and 100" }
  }

  return {
    width,
    height,
    fit: rawFit as TransformQuery["fit"],
    quality,
  }
}

function parseDimension(raw: string, fallback: number): number | null {
  if (raw === "") {
    return fallback
  }
  if (!/^\d+$/.test(raw)) {
    return null
  }
  const value = Number.parseInt(raw, 10)
  if (value < 16 || value > 1600) {
    return null
  }
  return value
}

export function thumbnailCacheKey(objectKey: string, query: TransformQuery): Request {
  const params = new URLSearchParams({
    w: String(query.width),
    fit: query.fit,
    quality: String(query.quality),
  })
  if (query.height) {
    params.set("h", String(query.height))
  }

  return new Request(`https://thumbs.nangua.local/${encodeObjectKey(objectKey)}?${params.toString()}`, {
    method: "GET",
  })
}

export function withThumbnailHeaders(response: Response, cacheStatus: "HIT" | "MISS"): Response {
  const headers = new Headers(response.headers)
  headers.set("Cache-Control", THUMBNAIL_CACHE)
  headers.set("X-Thumbnail-Cache", cacheStatus)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export function thumbnailCacheEntry(response: Response): Response {
  const headers = new Headers(response.headers)
  // Cache API ignores or drops `private`. Auth still runs before cache.match.
  headers.set("Cache-Control", "public, max-age=31536000, immutable")
  headers.delete("X-Thumbnail-Cache")
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export function objectKeyFromTransformPath(path: string): string | null {
  const prefix = "/api/image/"
  if (!path.startsWith(prefix)) {
    return null
  }

  const encoded = path.slice(prefix.length)
  if (!encoded) {
    return null
  }

  try {
    const key = decodeObjectKey(encoded)
    if (!key || key.includes("\0") || /(^|\/)\.\.(?:\/|$)/.test(key) || !isImageKey(key)) {
      return null
    }
    return key
  } catch {
    return null
  }
}

export async function transformOrOriginal(
  env: Env,
  object: R2ObjectBody,
  query: TransformQuery,
): Promise<Response> {
  const originalType = object.httpMetadata?.contentType || "application/octet-stream"

  if (!object.body || !env.IMAGES) {
    return originalResponse(object.body, originalType)
  }

  try {
    const result = await env.IMAGES.input(object.body as ReadableStream<Uint8Array>)
      .transform({
        width: query.width,
        height: query.height,
        fit: query.fit,
      })
      .output({
        format: "image/webp",
        quality: query.quality,
        anim: false,
      })

    return result.response({
      headers: {
        "Cache-Control": THUMBNAIL_CACHE,
      },
    })
  } catch (error) {
    console.error("Image transform failed, falling back to original", error)
    const fallback = await env.BUCKET.get(object.key)
    return originalResponse(fallback?.body ?? null, fallback?.httpMetadata?.contentType || originalType)
  }
}

function originalResponse(body: ReadableStream | null, contentType: string): Response {
  if (!body) {
    return new Response("Not found", { status: 404 })
  }

  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": THUMBNAIL_CACHE,
    },
  })
}
