CREATE TABLE `workout_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`min_reps` integer NOT NULL,
	`max_reps` integer NOT NULL,
	`target_rir` integer NOT NULL,
	`increment` real NOT NULL,
	`rest` integer NOT NULL,
	`recommendation` text NOT NULL,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `workout_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`weight` real NOT NULL,
	`reps` integer,
	`rir` integer,
	`completed` integer DEFAULT false NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	`mutation_id` text,
	FOREIGN KEY (`workout_exercise_id`) REFERENCES `workout_exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`day_name` text NOT NULL,
	`plan_name` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`active` integer,
	`fatigue` integer,
	`performance` integer,
	`note` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workouts_active_unique` ON `workouts` (`active`);