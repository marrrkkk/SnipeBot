CREATE TABLE `attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`message_id` text NOT NULL,
	`rev_no` integer NOT NULL,
	`attachment_id` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text,
	`size_bytes` integer,
	`remote_url` text,
	`proxy_url` text,
	`local_path` text,
	`height` integer,
	`width` integer,
	`duration_secs` real,
	`waveform` text,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `attachments_message_rev_idx` ON `attachments` (`message_id`,`rev_no`);--> statement-breakpoint
CREATE TABLE `channels` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text,
	`kind` integer,
	`name` text,
	`parent_id` text,
	`archived_at` text,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `channels_guild_idx` ON `channels` (`guild_id`);--> statement-breakpoint
CREATE TABLE `deletion_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`message_id` text NOT NULL,
	`channel_id` text,
	`kind` text NOT NULL,
	`observed_at` text NOT NULL,
	`audit_entry_id` text,
	`executor_id` text
);
--> statement-breakpoint
CREATE INDEX `deletion_events_message_idx` ON `deletion_events` (`message_id`);--> statement-breakpoint
CREATE TABLE `embeds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`message_id` text NOT NULL,
	`rev_no` integer NOT NULL,
	`idx` integer NOT NULL,
	`raw_json` text NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `embeds_message_rev_idx` ON `embeds` (`message_id`,`rev_no`);--> statement-breakpoint
CREATE TABLE `forward_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`message_id` text NOT NULL,
	`raw_json` text NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `guilds` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`icon_hash` text
);
--> statement-breakpoint
CREATE TABLE `message_revisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`message_id` text NOT NULL,
	`rev_no` integer NOT NULL,
	`edited_at` text,
	`content` text DEFAULT '' NOT NULL,
	`flags` integer DEFAULT 0 NOT NULL,
	`tts` integer DEFAULT 0 NOT NULL,
	`pinned` integer DEFAULT 0 NOT NULL,
	`sticker_ids` text DEFAULT '[]' NOT NULL,
	`fingerprint` text DEFAULT '' NOT NULL,
	`captured_at` text NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `revisions_message_rev_idx` ON `message_revisions` (`message_id`,`rev_no`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text,
	`channel_id` text,
	`thread_id` text,
	`author_id` text,
	`message_type` integer,
	`created_at` text,
	`deleted_at` text,
	`delete_kind` text,
	`ref_message_id` text,
	`ref_channel_id` text,
	`ref_guild_id` text,
	`ref_type` integer,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `messages_channel_created_idx` ON `messages` (`channel_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `messages_author_created_idx` ON `messages` (`author_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `messages_deleted_idx` ON `messages` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `polls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`message_id` text NOT NULL,
	`rev_no` integer,
	`raw_json` text NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`message_id` text NOT NULL,
	`emoji_id` text,
	`emoji_name` text,
	`count` integer DEFAULT 0 NOT NULL,
	`captured_at` text NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reactions_message_idx` ON `reactions` (`message_id`);--> statement-breakpoint
CREATE TABLE `retention_policies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scope` text NOT NULL,
	`keep_days` integer,
	`keep_revisions` integer,
	`media_keep_days` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `retention_policies_scope_unique` ON `retention_policies` (`scope`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`discriminator` text,
	`bot` integer DEFAULT 0 NOT NULL,
	`avatar_hash` text,
	`webhook_id` text
);
