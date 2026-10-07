CREATE TABLE `meals` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`calories` integer,
	`calories_low` integer,
	`calories_high` integer,
	`source` text NOT NULL,
	`assumptions` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `meals_date_idx` ON `meals` (`date`);