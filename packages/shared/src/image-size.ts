import { sniffImageMime } from "./mime"

export interface ImageDimensions {
  width: number
  height: number
}

const MAX_DIMENSION = 80_000

export function readImageDimensions(bytes: Uint8Array): ImageDimensions | null {
  const mime = sniffImageMime(bytes)
  if (!mime) {
    return null
  }

  switch (mime) {
    case "image/png":
      return readPng(bytes)
    case "image/jpeg":
      return readJpeg(bytes)
    case "image/gif":
      return readGif(bytes)
    case "image/webp":
      return readWebp(bytes)
    case "image/bmp":
      return readBmp(bytes)
    case "image/avif":
      return readAvif(bytes)
    default:
      return null
  }
}

function readPng(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 24) {
    return null
  }
  const type = String.fromCharCode(bytes[12] ?? 0, bytes[13] ?? 0, bytes[14] ?? 0, bytes[15] ?? 0)
  if (type !== "IHDR") {
    return null
  }
  return validDimensions(u32be(bytes, 16), u32be(bytes, 20))
}

function readGif(bytes: Uint8Array): ImageDimensions | null {
  return validDimensions(u16le(bytes, 6), u16le(bytes, 8))
}

function readBmp(bytes: Uint8Array): ImageDimensions | null {
  const headerSize = u32le(bytes, 14)
  if (headerSize === null) {
    return null
  }

  if (headerSize === 12) {
    return validDimensions(u16le(bytes, 18), u16le(bytes, 20))
  }

  const width = u32le(bytes, 18)
  const rawHeight = i32le(bytes, 22)
  if (width === null || rawHeight === null) {
    return null
  }
  return validDimensions(width, Math.abs(rawHeight))
}

function readJpeg(bytes: Uint8Array): ImageDimensions | null {
  let offset = 2
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      return null
    }

    while (bytes[offset] === 0xff) {
      offset += 1
      if (offset >= bytes.length) {
        return null
      }
    }

    const marker = bytes[offset]
    if (marker === undefined) {
      return null
    }
    offset += 1

    if (marker === 0xda || marker === 0xd9) {
      return null
    }
    if (isStandaloneJpegMarker(marker)) {
      continue
    }

    const length = u16be(bytes, offset)
    if (length === null || length < 2) {
      return null
    }

    if (isSofMarker(marker) && length >= 7) {
      return validDimensions(u16be(bytes, offset + 5), u16be(bytes, offset + 3))
    }

    offset += length
  }

  return null
}

function isSofMarker(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
}

function isStandaloneJpegMarker(marker: number): boolean {
  return marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)
}

function readWebp(bytes: Uint8Array): ImageDimensions | null {
  let offset = 12
  while (offset + 8 <= bytes.length) {
    const type = String.fromCharCode(
      bytes[offset] ?? 0,
      bytes[offset + 1] ?? 0,
      bytes[offset + 2] ?? 0,
      bytes[offset + 3] ?? 0,
    )
    const size = u32le(bytes, offset + 4)
    if (size === null) {
      return null
    }

    const payload = offset + 8
    const next = payload + size + (size % 2)
    if (payload > bytes.length) {
      return null
    }

    if (type === "VP8X") {
      const width = u24le(bytes, payload + 4)
      const height = u24le(bytes, payload + 7)
      if (width === null || height === null) {
        return null
      }
      return validDimensions(width + 1, height + 1)
    }

    if (type === "VP8L" && bytes[payload] === 0x2f) {
      const bits = u32le(bytes, payload + 1)
      if (bits === null) {
        return null
      }
      return validDimensions((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1)
    }

    if (type === "VP8 " && size >= 10) {
      if (bytes[payload + 3] === 0x9d && bytes[payload + 4] === 0x01 && bytes[payload + 5] === 0x2a) {
        const width = u16le(bytes, payload + 6)
        const height = u16le(bytes, payload + 8)
        if (width === null || height === null) {
          return null
        }
        return validDimensions(width & 0x3fff, height & 0x3fff)
      }
    }

    offset = next
  }

  return null
}

function readAvif(bytes: Uint8Array): ImageDimensions | null {
  return findAvifIspe(bytes, 0, bytes.length)
}

function findAvifIspe(bytes: Uint8Array, start: number, end: number): ImageDimensions | null {
  return walkBoxes(bytes, start, end, (type, contentStart, contentEnd) => {
    if (type === "ispe") {
      return validDimensions(u32be(bytes, contentStart + 4), u32be(bytes, contentStart + 8))
    }
    if (type === "meta") {
      return findAvifIspe(bytes, contentStart + 4, contentEnd)
    }
    if (type === "moov" || type === "iprp" || type === "ipco" || type === "trak") {
      return findAvifIspe(bytes, contentStart, contentEnd)
    }
    return null
  })
}

function walkBoxes(
  bytes: Uint8Array,
  start: number,
  end: number,
  visit: (type: string, contentStart: number, contentEnd: number) => ImageDimensions | null,
): ImageDimensions | null {
  let offset = start
  while (offset + 8 <= end) {
    let size = u32be(bytes, offset)
    if (size === null) {
      return null
    }

    const type = String.fromCharCode(
      bytes[offset + 4] ?? 0,
      bytes[offset + 5] ?? 0,
      bytes[offset + 6] ?? 0,
      bytes[offset + 7] ?? 0,
    )
    let header = 8
    if (size === 1) {
      const high = u32be(bytes, offset + 8)
      const low = u32be(bytes, offset + 12)
      if (high === null || low === null || high !== 0) {
        return null
      }
      size = low
      header = 16
    } else if (size === 0) {
      size = end - offset
    }

    if (size < header || offset + size > end) {
      return null
    }

    const found = visit(type, offset + header, offset + size)
    if (found) {
      return found
    }
    offset += size
  }

  return null
}

function validDimensions(width: number | null, height: number | null): ImageDimensions | null {
  if (
    width === null ||
    height === null ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > MAX_DIMENSION ||
    height > MAX_DIMENSION
  ) {
    return null
  }

  return { width, height }
}

function u16be(bytes: Uint8Array, offset: number): number | null {
  const high = bytes[offset]
  const low = bytes[offset + 1]
  if (high === undefined || low === undefined) {
    return null
  }
  return (high << 8) | low
}

function u16le(bytes: Uint8Array, offset: number): number | null {
  const low = bytes[offset]
  const high = bytes[offset + 1]
  if (low === undefined || high === undefined) {
    return null
  }
  return low | (high << 8)
}

function u24le(bytes: Uint8Array, offset: number): number | null {
  const a = bytes[offset]
  const b = bytes[offset + 1]
  const c = bytes[offset + 2]
  if (a === undefined || b === undefined || c === undefined) {
    return null
  }
  return a | (b << 8) | (c << 16)
}

function u32be(bytes: Uint8Array, offset: number): number | null {
  const a = bytes[offset]
  const b = bytes[offset + 1]
  const c = bytes[offset + 2]
  const d = bytes[offset + 3]
  if (a === undefined || b === undefined || c === undefined || d === undefined) {
    return null
  }
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0
}

function u32le(bytes: Uint8Array, offset: number): number | null {
  const a = bytes[offset]
  const b = bytes[offset + 1]
  const c = bytes[offset + 2]
  const d = bytes[offset + 3]
  if (a === undefined || b === undefined || c === undefined || d === undefined) {
    return null
  }
  return (a | (b << 8) | (c << 16) | (d << 24)) >>> 0
}

function i32le(bytes: Uint8Array, offset: number): number | null {
  const value = u32le(bytes, offset)
  if (value === null) {
    return null
  }
  return value > 0x7fffffff ? value - 0x1_0000_0000 : value
}
