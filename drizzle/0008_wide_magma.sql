CREATE TABLE `advice_exchanges` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`created_at` integer NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `advice_threads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `advice_exchanges_thread_idx` ON `advice_exchanges` (`thread_id`);--> statement-breakpoint
CREATE TABLE `advice_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`snapshot` text NOT NULL,
	`created_at` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL
);
