import { randomUUID } from "node:crypto";
import { getDatabase } from "../src/db";
import { exercises } from "../src/db/schema";
import { savePlan } from "../src/lib/plans";
if (process.env.NODE_ENV === "production" || process.env.RAILWAY_ENVIRONMENT_ID)
  throw new Error("Demo seed is disabled in production and Railway.");
const { db, sqlite } = getDatabase();
if (
  sqlite.prepare("SELECT 1 FROM plans LIMIT 1").get() ||
  sqlite.prepare("SELECT 1 FROM exercises LIMIT 1").get()
)
  throw new Error(
    "Seed requires an empty training database. Existing data is never overwritten.",
  );
sqlite.transaction(() => {
  const names = [
    ["Bench Press", "Brust", 80],
    ["Lat Pulldown", "Rücken", 55],
    ["Lateral Raise", "Schultern", 10],
    ["Biceps Curl", "Arme", 12.5],
    ["Squat", "Beine", 70],
    ["Romanian Deadlift", "Beinrückseite", 60],
    ["Leg Curl", "Beinrückseite", 35],
    ["Calf Raise", "Waden", 50],
  ] as const;
  const items = names.map(([name, muscle, weight]) => {
    const id = randomUUID();
    db.insert(exercises).values({ id, name, muscle }).run();
    return {
      exerciseId: id,
      sets: 3,
      minReps: 8,
      maxReps: 10,
      targetRir: 2,
      weight,
      increment: 2.5,
      rest: 120,
    };
  });
  savePlan({
    name: "Upper / Lower",
    days: [
      { name: "Upper A", exercises: items.slice(0, 4) },
      { name: "Lower A", exercises: items.slice(4) },
    ],
  });
})();
console.log(
  "Demo plan created: Upper / Lower, 8 exercises. No production data changed.",
);
sqlite.close();
