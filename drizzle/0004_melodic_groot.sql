ALTER TABLE `workouts` ADD `timer_end` integer;--> statement-breakpoint
ALTER TABLE `workouts` ADD `timer_remaining` integer;--> statement-breakpoint
ALTER TABLE `workouts` ADD `timer_version` integer DEFAULT 0 NOT NULL;