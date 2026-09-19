export interface Env {
  BUCKET: R2Bucket
  DB: D1Database
  PUBLIC_IMAGE_BASE_URL: string
  GALLERY_USERNAME: string
  GALLERY_PASSWORD: string
  SESSION_SECRET: string
  ENABLE_DELETE?: string
  ADMIN_TOKEN?: string
  ASSETS: Fetcher
  IMAGES?: ImagesBinding
}
