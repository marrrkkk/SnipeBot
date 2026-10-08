CREATE TABLE `guild_settings` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`snipe_role_ids` text DEFAULT '[]' NOT NULL,
	`archiving_enabled` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
