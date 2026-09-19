const EXIF_HEADER = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]
const JPEG_SOI = [0xff, 0xd8]
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

const TAG_DATETIME = 0x0132
const TAG_EXIF_IFD = 0x8769
const TAG_DATETIME_ORIGINAL = 0x9003
const TAG_DATETIME_DIGITIZED = 0x9004
const TYPE_ASCII = 2
const TYPE_LONG = 4

const EXIF_DATE = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/

export function exifDateToIso(value: string): string | null {
  const match = EXIF_DATE.exec(value.trim())
  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])
  if (
    year < 1970 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null
  }

  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`
}

export function readExifTakenAt(bytes: Uint8Array): string | null {
  return readJpegExif(bytes) ?? readWebpExif(bytes) ?? readPngExif(bytes)
}

export function parseTiffTakenAt(tiff: Uint8Array): string | null {
  if (tiff.length < 8) {
    return null
  }

  const little = tiff[0] === 0x49 && tiff[1] === 0x49
  const big = tiff[0] === 0x4d && tiff[1] === 0x4d
  if (!little && !big) {
    return null
  }

  const read16 = little ? readU16le : readU16be
  const read32 = little ? readU32le : readU32be
  if (read16(tiff, 2) !== 42) {
    return null
  }

  const ifd0 = read32(tiff, 4)
  if (ifd0 === null) {
    return null
  }

  const exifIfd = findLongTag(tiff, ifd0, TAG_EXIF_IFD, read16, read32)
  return (
    (exifIfd !== null ? findAsciiTag(tiff, exifIfd, TAG_DATETIME_ORIGINAL, read16, read32) : null) ??
    (exifIfd !== null ? findAsciiTag(tiff, exifIfd, TAG_DATETIME_DIGITIZED, read16, read32) : null) ??
    findAsciiTag(tiff, ifd0, TAG_DATETIME, read16, read32)
  )
}

function readJpegExif(bytes: Uint8Array): string | null {
  if (bytes.length < 4 || bytes[0] !== JPEG_SOI[0] || bytes[1] !== JPEG_SOI[1]) {
    return null
  }

  let offset = 2
  while (offset + 4 < bytes.length) {
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
    if (marker === undefined || marker === 0xda || marker === 0xd9) {
      return null
    }
    offset += 1
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      continue
    }

    const length = readU16be(bytes, offset)
    if (length === null || length < 2 || offset + length > bytes.length) {
      return null
    }

    if (marker === 0xe1) {
      const payload = bytes.subarray(offset + 2, offset + length)
      if (hasExifHeader(payload)) {
        return parseTiffTakenAt(payload.subarray(EXIF_HEADER.length))
      }
    }

    offset += length
  }

  return null
}

function readWebpExif(bytes: Uint8Array): string | null {
  if (bytes.length < 20) {
    return null
  }
  if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") {
    return null
  }

  let offset = 12
  while (offset + 8 <= bytes.length) {
    const type = ascii(bytes, offset, 4)
    const size = readU32le(bytes, offset + 4)
    if (size === null) {
      return null
    }
    const payload = offset + 8
    const next = payload + size + (size % 2)
    if (payload > bytes.length) {
      return null
    }
    if (type === "EXIF") {
      const chunk = bytes.subarray(payload, Math.min(payload + size, bytes.length))
      return hasExifHeader(chunk) ? parseTiffTakenAt(chunk.subarray(EXIF_HEADER.length)) : parseTiffTakenAt(chunk)
    }
    offset = next
  }

  return null
}

function readPngExif(bytes: Uint8Array): string | null {
  if (bytes.length < 16 || !startsWith(bytes, PNG_SIGNATURE)) {
    return null
  }

  let offset = 8
  while (offset + 12 <= bytes.length) {
    const size = readU32be(bytes, offset)
    if (size === null) {
      return null
    }
    const type = ascii(bytes, offset + 4, 4)
    const payload = offset + 8
    const next = payload + size + 4
    if (next > bytes.length) {
      return null
    }
    if (type === "eXIf") {
      return parseTiffTakenAt(bytes.subarray(payload, payload + size))
    }
    if (type === "IEND") {
      return null
    }
    offset = next
  }

  return null
}

function findLongTag(
  tiff: Uint8Array,
  ifdOffset: number,
  tag: number,
  read16: (bytes: Uint8Array, offset: number) => number | null,
  read32: (bytes: Uint8Array, offset: number) => number | null,
): number | null {
  const count = read16(tiff, ifdOffset)
  if (count === null) {
    return null
  }

  for (let index = 0; index < count; index += 1) {
    const entry = ifdOffset + 2 + index * 12
    if (read16(tiff, entry) !== tag) {
      continue
    }
    if (read16(tiff, entry + 2) !== TYPE_LONG || read32(tiff, entry + 4) !== 1) {
      return null
    }
    return read32(tiff, entry + 8)
  }

  return null
}

function findAsciiTag(
  tiff: Uint8Array,
  ifdOffset: number,
  tag: number,
  read16: (bytes: Uint8Array, offset: number) => number | null,
  read32: (bytes: Uint8Array, offset: number) => number | null,
): string | null {
  const count = read16(tiff, ifdOffset)
  if (count === null) {
    return null
  }

  for (let index = 0; index < count; index += 1) {
    const entry = ifdOffset + 2 + index * 12
    if (read16(tiff, entry) !== tag) {
      continue
    }
    if (read16(tiff, entry + 2) !== TYPE_ASCII) {
      return null
    }
    const length = read32(tiff, entry + 4)
    if (length === null || length < 11) {
      return null
    }

    let start = entry + 8
    if (length > 4) {
      const offset = read32(tiff, entry + 8)
      if (offset === null) {
        return null
      }
      start = offset
    }

    if (start + length > tiff.length) {
      return null
    }

    let text = ""
    for (let cursor = start; cursor < start + length; cursor += 1) {
      const code = tiff[cursor]
      if (code === undefined || code === 0) {
        break
      }
      text += String.fromCharCode(code)
    }
    return exifDateToIso(text)
  }

  return null
}

function hasExifHeader(bytes: Uint8Array): boolean {
  if (bytes.length < EXIF_HEADER.length) {
    return false
  }
  return EXIF_HEADER.every((value, index) => bytes[index] === value)
}

function startsWith(bytes: Uint8Array, prefix: number[]): boolean {
  return prefix.every((value, index) => bytes[index] === value)
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let value = ""
  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(bytes[offset + index] ?? 0)
  }
  return value
}

function readU16be(bytes: Uint8Array, offset: number): number | null {
  const high = bytes[offset]
  const low = bytes[offset + 1]
  if (high === undefined || low === undefined) {
    return null
  }
  return (high << 8) | low
}

function readU16le(bytes: Uint8Array, offset: number): number | null {
  const low = bytes[offset]
  const high = bytes[offset + 1]
  if (low === undefined || high === undefined) {
    return null
  }
  return low | (high << 8)
}

function readU32be(bytes: Uint8Array, offset: number): number | null {
  const a = bytes[offset]
  const b = bytes[offset + 1]
  const c = bytes[offset + 2]
  const d = bytes[offset + 3]
  if (a === undefined || b === undefined || c === undefined || d === undefined) {
    return null
  }
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0
}

function readU32le(bytes: Uint8Array, offset: number): number | null {
  const a = bytes[offset]
  const b = bytes[offset + 1]
  const c = bytes[offset + 2]
  const d = bytes[offset + 3]
  if (a === undefined || b === undefined || c === undefined || d === undefined) {
    return null
  }
  return (a | (b << 8) | (c << 16) | (d << 24)) >>> 0
}
