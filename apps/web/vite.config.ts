import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      selfDestroying: true,
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "南瓜相册",
        short_name: "南瓜相册",
        description: "基于现有 Cloudflare R2 图床的私人相册",
        theme_color: "#E8F3FB",
        background_color: "#E8F3FB",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
      "/s": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
})
