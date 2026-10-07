import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
export const workouts = sqliteTable(
  "workouts",
  {
    id: text("id").primaryKey(),
    dayName: text("day_name").notNull(),
    planName: text("plan_name").notNull(),
    startedAt: integer("started_at").notNull(),
    finishedAt: integer("finished_at"),
    active: integer("active").unique(),
    fatigue: integer("fatigue"),
    performance: integer("performance"),
    note: text("note"),
    timerEnd: integer("timer_end"),
    timerRemaining: integer("timer_remaining"),
    timerVersion: integer("timer_version").notNull().default(0),
  },
  (table) => [index("workouts_finishedAt_idx").on(table.finishedAt)],
);
export const workoutExercises = sqliteTable(
  "workout_exercises",
  {
    id: text("id").primaryKey(),
    workoutId: text("workout_id")
      .notNull()
      .references(() => workouts.id),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercises.id),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    minReps: integer("min_reps").notNull(),
    maxReps: integer("max_reps").notNull(),
    targetRir: integer("target_rir").notNull(),
    increment: real("increment").notNull(),
    rest: integer("rest").notNull(),
    recommendation: text("recommendation").notNull(),
  },
  (table) => [
    index("workoutExercises_workoutId_idx").on(table.workoutId),
    index("workoutExercises_exerciseId_idx").on(table.exerciseId),
  ],
);
export const workoutSets = sqliteTable(
  "workout_sets",
  {
    id: text("id").primaryKey(),
    workoutExerciseId: text("workout_exercise_id")
      .notNull()
      .references(() => workoutExercises.id),
    position: integer("position").notNull(),
    weight: real("weight").notNull(),
    reps: integer("reps"),
    rir: integer("rir"),
    completed: integer("completed", { mode: "boolean" })
      .notNull()
      .default(false),
    version: integer("version").notNull().default(0),
    updatedAt: integer("updated_at").notNull(),
    mutationId: text("mutation_id"),
  },
  (table) => [
    index("workoutSets_workoutExerciseId_idx").on(table.workoutExerciseId),
  ],
);
export const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  expires: integer("expires").notNull(),
});
export const loginAttempts = sqliteTable("login_attempts", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  reset: integer("reset").notNull(),
});
export const exercises = sqliteTable("exercises", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  muscle: text("muscle").notNull(),
  instructions: text("instructions").notNull().default(""),
});
export const plans = sqliteTable("plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});
export const days = sqliteTable(
  "days",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [index("days_planId_idx").on(table.planId)],
);
export const assignments = sqliteTable(
  "assignments",
  {
    id: text("id").primaryKey(),
    dayId: text("day_id")
      .notNull()
      .references(() => days.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercises.id),
    position: integer("position").notNull(),
    sets: integer("sets").notNull(),
    minReps: integer("min_reps").notNull(),
    maxReps: integer("max_reps").notNull(),
    targetRir: integer("target_rir").notNull(),
    weight: real("weight").notNull(),
    increment: real("increment").notNull(),
    rest: integer("rest").notNull(),
  },
  (table) => [index("assignments_dayId_idx").on(table.dayId)],
);

export const meals = sqliteTable(
  "meals",
  {
    id: text("id").primaryKey(),
    date: text("date").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    calories: integer("calories"),
    caloriesLow: integer("calories_low"),
    caloriesHigh: integer("calories_high"),
    source: text("source").notNull(),
    assumptions: text("assumptions").notNull().default(""),
    version: integer("version").notNull().default(0),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("meals_date_idx").on(table.date)],
);

export const adviceThreads = sqliteTable("advice_threads", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  snapshot: text("snapshot").notNull(),
  createdAt: integer("created_at").notNull(),
  version: integer("version").notNull().default(0),
});
export const adviceExchanges = sqliteTable(
  "advice_exchanges",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id")
      .notNull()
      .references(() => adviceThreads.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    createdAt: integer("created_at").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [index("advice_exchanges_thread_idx").on(table.threadId)],
);
