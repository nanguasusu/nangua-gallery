import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const images = sqliteTable(
  "images",
  {
    id: text("id").primaryKey(),
    objectKey: text("object_key").notNull().unique(),
    originalName: text("original_name"),
    mimeType: text("mime_type"),
    size: integer("size").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    uploadedAt: text("uploaded_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    index("images_created_at_idx").on(table.createdAt),
    index("images_uploaded_at_idx").on(table.uploadedAt),
    index("images_favorite_idx").on(table.favorite),
    index("images_deleted_at_idx").on(table.deletedAt),
  ],
)

export const albums = sqliteTable("albums", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  coverImageId: text("cover_image_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

export const albumImages = sqliteTable(
  "album_images",
  {
    albumId: text("album_id").notNull(),
    imageId: text("image_id").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.albumId, table.imageId] }),
    index("album_images_album_id_idx").on(table.albumId),
    index("album_images_image_id_idx").on(table.imageId),
  ],
)
