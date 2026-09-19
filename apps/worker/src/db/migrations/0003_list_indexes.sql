-- Migration number: 0003 	 2026-09-19T15:10:00.000Z

ALTER TABLE `images` ADD `sort_at` text;
UPDATE `images` SET `sort_at` = coalesce(`uploaded_at`, `created_at`) WHERE `sort_at` IS NULL;
ALTER TABLE `images` ADD `purge_status` text;

CREATE INDEX `images_active_sort_idx` ON `images` (`sort_at`, `id`);
CREATE INDEX `images_deleted_sort_idx` ON `images` (`deleted_at`, `sort_at`, `id`);
CREATE INDEX `images_favorite_sort_idx` ON `images` (`favorite`, `deleted_at`, `sort_at`, `id`);
CREATE INDEX `images_purge_status_idx` ON `images` (`purge_status`);
