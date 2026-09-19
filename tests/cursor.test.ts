import { describe, expect, it } from "vitest"
import { decodeListCursor, encodeListCursor } from "../apps/worker/src/db/map"

describe("list cursor", () => {
  it("round-trips date cursor", () => {
    const encoded = encodeListCursor({ t: "2024-09-19T21:30:00", i: "abc", s: "date" })
    expect(decodeListCursor(encoded)).toEqual({
      t: "2024-09-19T21:30:00",
      i: "abc",
      s: "date",
    })
  })

  it("accepts legacy cursors without sort", () => {
    const encoded = btoa(JSON.stringify({ t: "2024-01-01T00:00:00.000Z", i: "id-1" }))
    expect(decodeListCursor(encoded)).toEqual({
      t: "2024-01-01T00:00:00.000Z",
      i: "id-1",
      s: undefined,
    })
  })

  it("returns null for junk", () => {
    expect(decodeListCursor("%%%")).toBeNull()
    expect(decodeListCursor(undefined)).toBeNull()
  })
})
