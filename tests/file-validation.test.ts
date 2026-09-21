import { describe, expect, it } from "vitest"
import { partitionImageFiles, isFileDrag } from "@/lib/file-validation"

describe("isFileDrag", () => {
  it("detects Files in dataTransfer.types", () => {
    expect(isFileDrag({ types: ["Files"] } as DataTransfer)).toBe(true)
    expect(isFileDrag({ types: ["text/plain"] } as DataTransfer)).toBe(false)
    expect(isFileDrag(null)).toBe(false)
  })
})

function jpegFile(name: string, type: string) {
  return new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])], name, { type })
}

describe("partitionImageFiles", () => {
  it("accepts .jpg files with jpeg, jpg, or empty declared types", async () => {
    const files = [
      jpegFile("a.jpg", "image/jpeg"),
      jpegFile("b.JPG", "image/jpg"),
      jpegFile("c.jpeg", ""),
    ]
    const { accepted, rejected } = await partitionImageFiles(files)
    expect(rejected).toEqual([])
    expect(accepted.map((file) => file.name)).toEqual(["a.jpg", "b.JPG", "c.jpeg"])
  })

  it("accepts jpeg bytes even when the browser labeled them as png", async () => {
    const { accepted, rejected } = await partitionImageFiles([
      jpegFile("photo.jpg", "image/png"),
    ])
    expect(rejected).toEqual([])
    expect(accepted).toHaveLength(1)
  })
})
