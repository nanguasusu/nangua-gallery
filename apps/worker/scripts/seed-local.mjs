#!/usr/bin/env node
/**
 * Seed LOCAL wrangler R2 only.
 *
 * This script always passes --local and refuses --remote.
 * It never writes to the production image host.
 */
import { spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync, existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { deflateSync } from "node:zlib"

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(__dirname, "..", "fixtures")

if (process.argv.includes("--remote")) {
  console.error("Refusing to seed remote / production R2. This script is local-only.")
  process.exit(1)
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let i = 0; i < 8; i += 1) {
      const mask = -(crc & 1)
      crc = (crc >>> 1) ^ (0xedb88320 & mask)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii")
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const crcBuffer = Buffer.concat([typeBuffer, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcBuffer), 0)
  return Buffer.concat([length, typeBuffer, data, crc])
}

function createPng(width, height, r, g, b) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const raw = Buffer.alloc((width * 3 + 1) * height)
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 3 + 1)
    raw[rowStart] = 0
    for (let x = 0; x < width; x += 1) {
      const i = rowStart + 1 + x * 3
      const mix = (x + y) % 24 === 0 ? 18 : 0
      raw[i] = Math.min(255, r + mix)
      raw[i + 1] = Math.min(255, g + mix)
      raw[i + 2] = Math.min(255, b + mix)
    }
  }

  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ])
}

const LOCAL_BUCKET = "gallery-demo"

const samples = [
  { key: "sunset.png", color: [232, 145, 90] },
  { key: "ocean.png", color: [72, 139, 186] },
  { key: "forest.png", color: [76, 140, 98] },
  { key: "stone.png", color: [148, 148, 152] },
  { key: "sand.png", color: [214, 188, 148] },
  { key: "notes.json", skipImage: true },
  { key: "中文 空格.png", color: [168, 112, 186] },
  { key: "nested/path/leaf.png", color: [90, 164, 164] },
]

mkdirSync(fixturesDir, { recursive: true })

for (const sample of samples) {
  if (sample.skipImage) {
    const filePath = join(fixturesDir, "notes.json")
    writeFileSync(filePath, JSON.stringify({ note: "non-image object for filter test" }))
    continue
  }

  const filePath = join(fixturesDir, sample.key.replaceAll("/", "__"))
  writeFileSync(filePath, createPng(480, 480, ...sample.color))
  sample.filePath = filePath
}

console.log("Seeding local wrangler R2 (never remote / production)...")

for (const sample of samples) {
  const filePath = sample.skipImage
    ? join(fixturesDir, "notes.json")
    : sample.filePath

  const result = spawnSync(
    "npx",
    [
      "wrangler",
      "r2",
      "object",
      "put",
      `${LOCAL_BUCKET}/${sample.key}`,
      `--file=${filePath}`,
      "--local",
      "--persist-to",
      ".wrangler/state",
    ],
    {
      cwd: join(__dirname, ".."),
      stdio: "inherit",
      env: process.env,
    },
  )

  if (result.status !== 0) {
    console.error(`Failed to put local object: ${sample.key}`)
    process.exit(result.status ?? 1)
  }
}

if (!existsSync(join(__dirname, "..", ".wrangler"))) {
  console.warn("Wrangler local state directory was not created as expected.")
}

console.log("Local R2 seed complete. Production bucket was not touched.")
