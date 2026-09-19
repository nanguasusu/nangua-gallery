import { describe, expect, it } from "vitest"
import { buildGalleryRows } from "../apps/web/src/lib/group-images"
import type { ImageItem } from "../apps/web/src/types/image"

function photo(id: string, width: number, height: number, uploadedAt: string): ImageItem {
  return {
    id,
    key: `${id}.jpg`,
    filename: `${id}.jpg`,
    url: `https://img.example/${id}.jpg`,
    size: 1000,
    width,
    height,
    uploadedAt,
    favorite: false,
  }
}

describe("buildGalleryRows", () => {
  it("inserts month headers when grouping", () => {
    const rows = buildGalleryRows(
      [
        photo("a", 1200, 800, "2024-09-01T00:00:00"),
        photo("b", 800, 1200, "2024-08-01T00:00:00"),
      ],
      900,
      { groupByMonth: true },
    )
    expect(rows.some((row) => row.type === "header" && row.label.includes("2024"))).toBe(true)
    expect(rows.filter((row) => row.type === "photos").length).toBeGreaterThan(0)
  })

  it("skips headers when not grouping", () => {
    const rows = buildGalleryRows(
      [photo("a", 100, 100, "2024-09-01T00:00:00"), photo("b", 100, 100, "2024-08-01T00:00:00")],
      500,
      { groupByMonth: false },
    )
    expect(rows.every((row) => row.type === "photos")).toBe(true)
  })
})
