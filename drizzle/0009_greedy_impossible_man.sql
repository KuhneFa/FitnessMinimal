CREATE TABLE `conversation_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`user_message_id` text NOT NULL,
	`assistant_message_id` text NOT NULL,
	`base_version` integer NOT NULL,
	`status` text NOT NULL,
	`input` text NOT NULL,
	`error` text,
	`reply` text,
	`lease` text,
	`lease_until` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_message_id`) REFERENCES `conversation_messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assistant_message_id`) REFERENCES `conversation_messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_jobs_user_message_idx` ON `conversation_jobs` (`user_message_id`);--> statement-breakpoint
CREATE INDEX `conversation_jobs_status_idx` ON `conversation_jobs` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `conversation_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`role` text NOT NULL,
	`status` text NOT NULL,
	`text` text NOT NULL,
	`cards` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_messages_sequence_idx` ON `conversation_messages` (`conversation_id`,`sequence`);--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
