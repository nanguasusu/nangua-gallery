-- Migration number: 0001 	 2026-09-19T07:30:00.000Z

CREATE TABLE `images` (
	`id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`original_name` text,
	`mime_type` text,
	`size` integer DEFAULT 0 NOT NULL,
	`width` integer,
	`height` integer,
	`uploaded_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`favorite` integer DEFAULT false NOT NULL,
	`deleted_at` text
);

CREATE UNIQUE INDEX `images_object_key_unique` ON `images` (`object_key`);
CREATE INDEX `images_created_at_idx` ON `images` (`created_at`);
CREATE INDEX `images_uploaded_at_idx` ON `images` (`uploaded_at`);
CREATE INDEX `images_favorite_idx` ON `images` (`favorite`);
CREATE INDEX `images_deleted_at_idx` ON `images` (`deleted_at`);

CREATE TABLE `albums` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`cover_image_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

CREATE TABLE `album_images` (
	`album_id` text NOT NULL,
	`image_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`album_id`, `image_id`),
	FOREIGN KEY (`album_id`) REFERENCES `albums`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`image_id`) REFERENCES `images`(`id`) ON DELETE CASCADE
);

CREATE INDEX `album_images_album_id_idx` ON `album_images` (`album_id`);
CREATE INDEX `album_images_image_id_idx` ON `album_images` (`image_id`);
