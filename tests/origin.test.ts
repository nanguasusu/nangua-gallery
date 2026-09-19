import { describe, expect, it } from "vitest"
import {
  isMutatingMethod,
  matchAllowedOrigin,
  originFromReferer,
  parseGalleryOrigins,
  resolveAllowedOrigins,
} from "../apps/worker/src/utils/origin"

describe("origin allowlist", () => {
  it("parses extra origins and rejects junk", () => {
    expect(parseGalleryOrigins("https://gallery.example.com, not-a-url, http://localhost:3000")).toEqual([
      "https://gallery.example.com",
      "http://localhost:3000",
    ])
  })

  it("always allows the request origin and local vite", () => {
    const allowed = resolveAllowedOrigins("https://nangua-gallery.example.workers.dev/api/images")
    expect(allowed).toContain("https://nangua-gallery.example.workers.dev")
    expect(allowed).toContain("http://localhost:5173")
  })

  it("matches only listed origins", () => {
    const allowed = ["https://ok.example"]
    expect(matchAllowedOrigin("https://ok.example", allowed)).toBe("https://ok.example")
    expect(matchAllowedOrigin("https://evil.example", allowed)).toBeUndefined()
  })

  it("treats POST as mutating and reads Referer origin", () => {
    expect(isMutatingMethod("POST")).toBe(true)
    expect(isMutatingMethod("GET")).toBe(false)
    expect(originFromReferer("https://ok.example/photos?q=1")).toBe("https://ok.example")
  })
})
