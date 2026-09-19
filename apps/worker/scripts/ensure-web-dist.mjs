import { mkdirSync, writeFileSync, existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const webDist = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "web", "dist")
mkdirSync(webDist, { recursive: true })

const indexPath = join(webDist, "index.html")
if (!existsSync(indexPath)) {
  writeFileSync(
    indexPath,
    "<!doctype html><title>Nangua Gallery</title><p>Build the web app with npm run build -w @nangua/web</p>\n",
  )
}
