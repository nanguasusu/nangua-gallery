export interface ImageListFilter {
  favorite?: boolean
  albumId?: string
  search?: string
  deleted?: boolean
}

export const queryKeys = {
  session: ["session"] as const,
  config: ["config"] as const,
  images: (filter: ImageListFilter = {}) => ["images", filter] as const,
  albums: ["albums"] as const,
  album: (id: string) => ["albums", id] as const,
}
