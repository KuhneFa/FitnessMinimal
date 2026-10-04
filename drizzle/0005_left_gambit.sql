CREATE INDEX `assignments_dayId_idx` ON `assignments` (`day_id`);--> statement-breakpoint
CREATE INDEX `days_planId_idx` ON `days` (`plan_id`);--> statement-breakpoint
CREATE INDEX `workoutExercises_workoutId_idx` ON `workout_exercises` (`workout_id`);--> statement-breakpoint
CREATE INDEX `workoutExercises_exerciseId_idx` ON `workout_exercises` (`exercise_id`);--> statement-breakpoint
CREATE INDEX `workoutSets_workoutExerciseId_idx` ON `workout_sets` (`workout_exercise_id`);--> statement-breakpoint
CREATE INDEX `workouts_finishedAt_idx` ON `workouts` (`finished_at`);