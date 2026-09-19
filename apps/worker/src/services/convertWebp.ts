import { shouldConvertToWebp, type WebpQuality } from "@nangua/shared"
import type { Env } from "../types/env"

export async function convertToWebpIfRequested(
  env: Env,
  bytes: ArrayBuffer,
  mime: string,
  convertWebp: boolean,
  quality: WebpQuality,
): Promise<{ bytes: ArrayBuffer; mime: string; converted: boolean }> {
  if (!convertWebp || !shouldConvertToWebp(mime) || !env.IMAGES) {
    return { bytes, mime, converted: false }
  }

  try {
    const result = await env.IMAGES.input(uint8Stream(bytes))
      .output({
        format: "image/webp",
        quality,
        anim: false,
      })
    const response = result.response()
    const converted = await response.arrayBuffer()
    if (!converted.byteLength) {
      return { bytes, mime, converted: false }
    }
    return { bytes: converted, mime: "image/webp", converted: true }
  } catch (error) {
    console.error("Upload WebP conversion failed, keeping original", error)
    return { bytes, mime, converted: false }
  }
}

function uint8Stream(bytes: ArrayBuffer): ReadableStream<Uint8Array> {
  return new Blob([bytes]).stream() as ReadableStream<Uint8Array>
}
