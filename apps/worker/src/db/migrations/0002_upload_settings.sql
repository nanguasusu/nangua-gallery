-- Migration number: 0002 	 2026-09-19T12:40:00.000Z

ALTER TABLE `images` ADD `short_id` text;
CREATE UNIQUE INDEX `images_short_id_unique` ON `images` (`short_id`);

CREATE TABLE `gallery_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`upload_root` text NOT NULL,
	`monthly_folders` integer NOT NULL,
	`max_image_bytes` integer NOT NULL,
	`upload_concurrency` integer NOT NULL,
	`updated_at` text NOT NULL
);

INSERT INTO `gallery_settings` (
	`id`,
	`upload_root`,
	`monthly_folders`,
	`max_image_bytes`,
	`upload_concurrency`,
	`updated_at`
) VALUES (
	'default',
	'uploads',
	1,
	20971520,
	3,
	'2026-09-19T12:40:00.000Z'
);
