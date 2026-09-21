import { describe, expect, it } from "vitest"
import {
  escapeLike,
  exifDateToIso,
  formatHtml,
  formatMarkdown,
  formatPlainUrls,
  parseImageSort,
  parseTiffTakenAt,
} from "@nangua/shared"

describe("exifDateToIso", () => {
  it("converts EXIF datetime to ISO", () => {
    expect(exifDateToIso("2024:09:19 21:30:00")).toBe("2024-09-19T21:30:00")
  })

  it("rejects unset or invalid values", () => {
    expect(exifDateToIso("0000:00:00 00:00:00")).toBeNull()
    expect(exifDateToIso("not a date")).toBeNull()
  })
})

describe("parseTiffTakenAt", () => {
  it("reads DateTime from IFD0", () => {
    expect(parseTiffTakenAt(buildDatetimeTiff())).toBe("2024-09-19T21:30:00")
  })
})

describe("escapeLike", () => {
  it("escapes wildcards", () => {
    expect(escapeLike("a%b_c\\d")).toBe("a\\%b\\_c\\\\d")
  })
})

describe("parseImageSort", () => {
  it("defaults to date", () => {
    expect(parseImageSort(undefined)).toBe("date")
    expect(parseImageSort("nope")).toBe("date")
    expect(parseImageSort("name")).toBe("name")
    expect(parseImageSort("size")).toBe("size")
  })
})

describe("copy formats", () => {
  const urls = [
    "https://img.nanguasu.cc/2026/07/example.webp",
    "https://img.nanguasu.cc/2026/07/second.webp",
  ]

  it("joins plain urls", () => {
    expect(formatPlainUrls(urls)).toBe(urls.join("\n"))
  })

  it("creates markdown images", () => {
    expect(formatMarkdown(urls)).toBe(
      `![](${urls[0]})\n\n![](${urls[1]})`,
    )
  })

  it("creates html images with a default inline width", () => {
    expect(formatHtml(urls)).toBe(
      `<img style="width:400px" src="${urls[0]}" loading="lazy" />\n<img style="width:400px" src="${urls[1]}" loading="lazy" />`,
    )
  })

  it("uses a validated inline html width", () => {
    expect(formatHtml([urls[0]], { width: 720 })).toBe(
      `<img style="width:720px" src="${urls[0]}" loading="lazy" />`,
    )
    expect(formatHtml([urls[0]], { width: 9999 })).toContain('style="width:400px"')
  })
})

function buildDatetimeTiff(): Uint8Array {
  const text = "2024:09:19 21:30:00\0"
  const bytes = new Uint8Array(46)
  bytes.set([0x49, 0x49, 0x2a, 0x00, 8, 0, 0, 0], 0)
  bytes.set([1, 0], 8)
  bytes.set([0x32, 0x01, 0x02, 0x00, 20, 0, 0, 0, 26, 0, 0, 0], 10)
  bytes.set([0, 0, 0, 0], 22)
  for (let index = 0; index < text.length; index += 1) {
    bytes[26 + index] = text.charCodeAt(index)
  }
  return bytes
}
