import { describe, expect, it } from "vitest"
import { parseTransformQuery } from "../apps/worker/src/services/imageTransform"

describe("parseTransformQuery", () => {
  it("uses defaults", () => {
    expect(parseTransformQuery(new URLSearchParams())).toEqual({
      width: 400,
      height: undefined,
      fit: "cover",
      quality: 80,
    })
  })

  it("parses valid values", () => {
    const query = new URLSearchParams("w=800&h=600&fit=scale-down&quality=70")
    expect(parseTransformQuery(query)).toEqual({
      width: 800,
      height: 600,
      fit: "scale-down",
      quality: 70,
    })
  })

  it("rejects out of range sizes", () => {
    expect(parseTransformQuery(new URLSearchParams("w=8"))).toEqual({
      error: "w must be an integer between 16 and 1600",
    })
  })
})
