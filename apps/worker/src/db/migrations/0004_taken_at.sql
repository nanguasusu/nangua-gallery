-- Migration number: 0004 	 2026-09-19T15:30:00.000Z

ALTER TABLE `images` ADD `taken_at` text;
CREATE INDEX `images_taken_at_idx` ON `images` (`taken_at`);
